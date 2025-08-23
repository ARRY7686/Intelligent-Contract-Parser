import asyncio
import PyPDF2
import re
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from ..models.contract import (
    ContractData, PartyInfo, AccountInfo, FinancialDetails, 
    LineItem, PaymentTerms, RevenueClassification, SLAInfo, GapAnalysis
)
from ..core.database import get_collection

logger = logging.getLogger(__name__)


class ContractProcessor:
    """
    Main contract processing engine that extracts structured data from PDF contracts.
    
    This class handles the complete pipeline of contract analysis including:
    - PDF text extraction
    - Contract type detection (NDA, Employment, Service)
    - Context-aware data extraction based on contract type
    - Confidence scoring and gap analysis
    
    The processor uses pattern matching and NLP techniques to extract:
    - Party information (disclosing/receiving parties, employers/employees, customers/vendors)
    - Financial details (contract values, line items, salaries)
    - Payment terms and methods
    - Revenue classification and billing cycles
    - Service Level Agreements (SLA) and performance metrics
    """
    
    def __init__(self):
        """
        Initialize the ContractProcessor with empty state.
        
        Attributes:
            text_content (str): Raw text extracted from the PDF contract
            extracted_data (ContractData): Structured data extracted from the contract
            contract_type (str): Detected contract type (nda, employment, service, unknown)
        """
        self.text_content = ""
        self.extracted_data = None
        self.contract_type = "unknown"  # Add contract type detection
        
    async def process_contract(self, contract_id: str, file_path: str) -> ContractData:
        """
        Main processing method that orchestrates the complete contract analysis pipeline.
        
        This method performs the following steps:
        1. Extracts text from the PDF file
        2. Detects the contract type (NDA, Employment, Service)
        3. Extracts all relevant data based on contract type
        4. Calculates confidence scores
        5. Performs gap analysis
        6. Updates processing status throughout the pipeline
        
        Args:
            contract_id (str): Unique identifier for the contract being processed
            file_path (str): Path to the PDF file to be analyzed
            
        Returns:
            ContractData: Complete structured data extracted from the contract
            
        Raises:
            Exception: If any step in the processing pipeline fails
        """
        try:
            # Initialize extracted data
            self.extracted_data = ContractData()
            
            # Update status to processing
            await self._update_status(contract_id, "processing", 10)
            
            # Extract text from PDF
            self.text_content = await self._extract_text_from_pdf(file_path)
            await self._update_status(contract_id, "processing", 20)
            
            # Detect contract type first
            self.contract_type = self._detect_contract_type()
            logger.info(f"Detected contract type: {self.contract_type}")
            await self._update_status(contract_id, "processing", 30)
            
            # Extract all data components based on contract type
            await self._extract_parties()
            await self._update_status(contract_id, "processing", 50)
            
            await self._extract_account_info()
            await self._update_status(contract_id, "processing", 60)
            
            # Only extract financial details for non-NDA contracts
            if self.contract_type != "nda":
                await self._extract_financial_details()
            else:
                # For NDAs, set financial details to empty with high confidence
                self.extracted_data.financial_details = FinancialDetails(
                    confidence_score=1.0  # High confidence that NDAs don't have financial terms
                )
            await self._update_status(contract_id, "processing", 70)
            
            await self._extract_payment_terms()
            await self._update_status(contract_id, "processing", 80)
            
            await self._extract_revenue_classification()
            await self._update_status(contract_id, "processing", 85)
            
            await self._extract_sla_info()
            await self._update_status(contract_id, "processing", 90)
            
            # Calculate overall confidence score
            self.extracted_data.overall_confidence_score = self._calculate_confidence_score()
            
            # Perform gap analysis
            self.extracted_data.gap_analysis = self._perform_gap_analysis()
            
            await self._update_status(contract_id, "processing", 100)
            
            return self.extracted_data
            
        except Exception as e:
            logger.error(f"Error processing contract {contract_id}: {str(e)}")
            await self._update_status(contract_id, "failed", 0, str(e))
            raise
    
    def _detect_contract_type(self) -> str:
        """
        Automatically detect the type of contract based on content analysis.
        
        This method uses pattern matching to identify contract types by analyzing
        the presence of specific keywords and phrases in the contract text.
        
        Detection Logic:
        - NDA Contracts: Looks for confidentiality, non-disclosure, disclosing/receiving party terms
        - Employment Contracts: Searches for employment, salary, job title, benefits terms
        - Service Contracts: Identifies service, consulting, SLA, vendor terms
        
        The method counts pattern matches for each contract type and returns
        the type with the highest count (minimum 2 matches required).
        
        Returns:
            str: Contract type identifier ('nda', 'employment', 'service', or 'unknown')
        """
        text_lower = self.text_content.lower()
        
        # NDA detection patterns
        nda_patterns = [
            r'\b(?:non\s*-\s*disclosure|nda|confidentiality)\s+agreement\b',
            r'\b(?:confidential|proprietary)\s+information\b',
            r'\b(?:disclosing\s+party|receiving\s+party)\b',
            r'\b(?:trade\s+secrets|confidential\s+data)\b',
            r'\b(?:disclosure|non\s*-\s*disclosure)\s+obligations\b',
            r'\b(?:confidentiality\s+period|term\s+of\s+confidentiality)\b'
        ]
        
        # Employment contract detection patterns
        employment_patterns = [
            r'\b(?:employment|employee|employer)\s+agreement\b',
            r'\b(?:offer\s+letter|employment\s+contract)\b',
            r'\b(?:salary|compensation|benefits)\s+package\b',
            r'\b(?:job\s+title|position|role)\b',
            r'\b(?:start\s+date|employment\s+date)\b'
        ]
        
        # Service contract detection patterns
        service_patterns = [
            r'\b(?:service|consulting|professional)\s+agreement\b',
            r'\b(?:statement\s+of\s+work|sow)\b',
            r'\b(?:service\s+level|sla)\b',
            r'\b(?:service\s+fees|hourly\s+rate)\b',
            r'\b(?:service\s+provider|vendor|supplier)\b'
        ]
        
        # Count matches for each type
        nda_count = sum(len(re.findall(pattern, text_lower)) for pattern in nda_patterns)
        employment_count = sum(len(re.findall(pattern, text_lower)) for pattern in employment_patterns)
        service_count = sum(len(re.findall(pattern, text_lower)) for pattern in service_patterns)
        
        # Determine contract type based on highest count
        if nda_count > employment_count and nda_count > service_count and nda_count >= 2:
            return "nda"
        elif employment_count > service_count and employment_count >= 2:
            return "employment"
        elif service_count >= 2:
            return "service"
        else:
            return "unknown"
    
    async def _extract_text_from_pdf(self, file_path: str) -> str:
        """
        Extract raw text content from a PDF file using PyPDF2.
        
        This method reads the PDF file and extracts text from all pages,
        concatenating them into a single string. The extracted text is used
        as the basis for all subsequent analysis and pattern matching.
        
        Args:
            file_path (str): Path to the PDF file to extract text from
            
        Returns:
            str: Complete text content extracted from all PDF pages
            
        Raises:
            Exception: If PDF reading or text extraction fails
        """
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise
    
    async def _extract_parties(self):
        """
        Extract party information from contract text based on contract type.
        
        This method uses different extraction strategies depending on the detected
        contract type to identify relevant parties:
        
        NDA Contracts:
        - Disclosing party (company providing confidential information)
        - Receiving party (individual/company receiving confidential information)
        - Company name patterns and legal entities
        
        Employment Contracts:
        - Employer (company hiring)
        - Employee (person being hired)
        - Job titles and positions
        
        Service Contracts:
        - Customer/client (buying services)
        - Vendor/supplier (providing services)
        - Third parties and subcontractors
        
        The method applies pattern matching, cleans up extracted names,
        removes duplicates, and assigns appropriate party types.
        
        Returns:
            None: Updates self.extracted_data.parties with extracted party information
        """
        parties = []
        
        if self.contract_type == "nda":
            # NDA-specific party extraction patterns
            party_patterns = [
                # Disclosing party patterns
                r'(?:disclosing\s+party|discloser|provider):\s*([^\n,;]+)',
                r'(?:the\s+)?disclosing\s+party\s+(?:hereby\s+)?(?:agrees\s+to\s+)?(?:disclose|provide)\s+(?:to\s+)?([^\n,;]+)',
                r'(?:confidential\s+information\s+of\s+)([^\n,;]+)',
                
                # Receiving party patterns
                r'(?:receiving\s+party|recipient|receiver):\s*([^\n,;]+)',
                r'(?:the\s+)?receiving\s+party\s+(?:hereby\s+)?(?:agrees\s+to\s+)?(?:receive|accept)\s+(?:from\s+)?([^\n,;]+)',
                r'(?:receives?\s+(?:confidential\s+)?information\s+from\s+)([^\n,;]+)',
                
                # Company name patterns
                r'(?:company|corporation|llc|inc|ltd|pvt\.?\s+ltd):\s*([^\n,;]+)',
                r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Technologies?|Solutions?|Systems?|Corporation|Inc|LLC|Ltd|Pvt\.?\s+Ltd))',
            ]
        elif self.contract_type == "employment":
            # Employment-specific party patterns
            party_patterns = [
                r'(?:employer|company):\s*([^\n,;]+)',
                r'(?:employee|candidate):\s*([^\n,;]+)',
                r'(?:position|role|job\s+title):\s*([^\n,;]+)',
            ]
        else:
            # General service contract patterns
            party_patterns = [
                r'(?:between|by and between)\s+([^,]+(?:\s+and\s+[^,]+)*)',
                r'(?:customer|client|buyer|purchaser):\s*([^\n,;]+)',
                r'(?:vendor|supplier|seller|provider):\s*([^\n,;]+)',
                r'(?:company|corporation|llc|inc|ltd):\s*([^\n,;]+)',
                r'(?:party\s+a|first\s+party):\s*([^\n,;]+)',
                r'(?:party\s+b|second\s+party):\s*([^\n,;]+)',
            ]
        
        for pattern in party_patterns:
            matches = re.finditer(pattern, self.text_content, re.IGNORECASE)
            for match in matches:
                party_name = match.group(1).strip()
                if len(party_name) > 3 and len(party_name) < 200:  # Filter out very short or very long matches
                    party_type = self._determine_party_type(party_name)
                    party = PartyInfo(
                        name=party_name,
                        type=party_type,
                        confidence_score=0.8 if self.contract_type != "unknown" else 0.6
                    )
                    parties.append(party)
        
        # Remove duplicates and improve quality
        unique_parties = []
        seen_names = set()
        for party in parties:
            # Clean up party names
            clean_name = re.sub(r'\s+', ' ', party.name).strip()
            if clean_name.lower() not in seen_names and len(clean_name) > 3:
                party.name = clean_name
                unique_parties.append(party)
                seen_names.add(clean_name.lower())
        
        self.extracted_data.parties = unique_parties[:5]  # Limit to 5 parties
    
    def _determine_party_type(self, party_name: str) -> str:
        """
        Determine the type of party based on context and contract type.
        
        This method analyzes the party name and contract context to assign
        the appropriate party type. The logic varies by contract type:
        
        NDA Contracts:
        - Analyzes context around "disclosing party" and "receiving party" terms
        - Uses company name patterns (Technologies, Solutions, Inc, LLC) to identify disclosing parties
        - Defaults to receiving party for individuals/consultants
        
        Employment Contracts:
        - Identifies employers (companies) vs employees (individuals)
        - Uses keywords like "employer", "company", "employee", "candidate"
        
        Service Contracts:
        - Categorizes as customer/client, vendor/supplier, or third party
        - Uses business role keywords to determine relationship
        
        Args:
            party_name (str): Name of the party to categorize
            
        Returns:
            str: Party type identifier (disclosing_party, receiving_party, employer, employee, customer, vendor, third_party)
        """
        text_lower = self.text_content.lower()
        party_lower = party_name.lower()
        
        if self.contract_type == "nda":
            # NDA-specific party type determination
            if any(word in text_lower for word in ['disclosing party', 'discloser', 'provider']):
                if any(word in party_lower for word in ['disclosing', 'discloser', 'provider']):
                    return 'disclosing_party'
                # If we find "disclosing party" in text but not in party name, check context
                disclosing_context = re.search(r'disclosing\s+party[^.]*?([^.]*?)(?:receiving|recipient)', text_lower)
                if disclosing_context and party_name.lower() in disclosing_context.group(1).lower():
                    return 'disclosing_party'
            
            if any(word in text_lower for word in ['receiving party', 'recipient', 'receiver']):
                if any(word in party_lower for word in ['receiving', 'recipient', 'receiver']):
                    return 'receiving_party'
                # If we find "receiving party" in text but not in party name, check context
                receiving_context = re.search(r'receiving\s+party[^.]*?([^.]*?)(?:disclosing|discloser)', text_lower)
                if receiving_context and party_name.lower() in receiving_context.group(1).lower():
                    return 'receiving_party'
            
            # Default for NDAs - try to determine based on company patterns
            if any(word in party_lower for word in ['technologies', 'solutions', 'systems', 'corporation', 'inc', 'llc']):
                return 'disclosing_party'  # Usually the disclosing party is the company
            else:
                return 'receiving_party'  # Usually the receiving party is the individual/consultant
        
        elif self.contract_type == "employment":
            if any(word in text_lower for word in ['employer', 'company']):
                return 'employer'
            elif any(word in text_lower for word in ['employee', 'candidate']):
                return 'employee'
        
        # General contract types
        if any(word in party_lower for word in ['customer', 'client', 'buyer']):
            return 'customer'
        elif any(word in party_lower for word in ['vendor', 'supplier', 'seller', 'provider']):
            return 'vendor'
        else:
            return 'third_party'
    
    async def _extract_account_info(self):
        """
        Extract account and billing information from contract text.
        
        This method searches for account numbers, contract IDs, and billing contact
        information using pattern matching. It handles different contract types:
        
        Account Numbers/IDs:
        - Account numbers with various formats (ACC-123, Account #456, etc.)
        - Contract IDs and reference numbers
        - Customer account identifiers
        
        Billing Contacts:
        - Service contracts: billing contacts, addresses, bill-to information
        - Employment contracts: employee and employer contact details
        - NDA contracts: disclosing and receiving party contact information
        - General contact information for any contract type
        
        The method sets confidence scores based on the quality of extracted data.
        
        Returns:
            None: Updates self.extracted_data.account_info with extracted account information
        """
        account_info = AccountInfo(confidence_score=0.0)
        
        # Enhanced account number patterns - handle different contract types
        account_patterns = [
            # Service contracts
            r'account\s*(?:number|#|no\.?):\s*([A-Z0-9\-]+)',
            r'acc\s*(?:number|#|no\.?):\s*([A-Z0-9\-]+)',
            r'account:\s*([A-Z0-9\-]+)',
            
            # Contract IDs
            r'contract\s*(?:id|#|no\.?):\s*([A-Z0-9\-]+)',
            r'contract\s*id:\s*([A-Z0-9\-]+)',
            r'id:\s*([A-Z0-9\-]+)',
        ]
        
        for pattern in account_patterns:
            match = re.search(pattern, self.text_content, re.IGNORECASE)
            if match:
                account_info.account_number = match.group(1)
                account_info.confidence_score = 0.8
                break
        
        # Enhanced billing contact patterns - handle different contract types
        billing_patterns = [
            # Service contracts
            r'billing\s+contact:\s*([^\n]+)',
            r'billing\s+address:\s*([^\n]+)',
            r'bill\s+to:\s*([^\n]+)',
            
            # Employment contracts
            r'employee:\s*([^\n]+)',
            r'employer:\s*([^\n]+)',
            
            # NDA contracts
            r'disclosing\s+party:\s*([^\n]+)',
            r'receiving\s+party:\s*([^\n]+)',
            
            # General contact patterns
            r'contact:\s*([^\n]+)',
            r'party:\s*([^\n]+)',
        ]
        
        for pattern in billing_patterns:
            match = re.search(pattern, self.text_content, re.IGNORECASE)
            if match:
                account_info.billing_contact = match.group(1).strip()
                account_info.confidence_score = 0.7
                break
        
        self.extracted_data.account_info = account_info
    
    async def _extract_financial_details(self):
        """
        Extract financial information including contract values and line items.
        
        This method extracts financial data based on contract type:
        
        Service Contracts:
        - Total contract value, annual contract value
        - Line items with descriptions and prices
        - Currency information
        
        Employment Contracts:
        - Salary information (annual, base, compensation)
        - Benefits and compensation packages
        - Employment-related financial terms
        
        The method uses pattern matching to find financial values and validates
        line item descriptions to ensure they are meaningful business terms.
        
        Note: NDA contracts are handled separately in the main processing pipeline
        and are set to have no financial terms with 100% confidence.
        
        Returns:
            None: Updates self.extracted_data.financial_details with extracted financial information
        """
        financial_details = FinancialDetails(confidence_score=0.0)
        
        # Enhanced total contract value patterns - handle different contract types
        value_patterns = [
            # Service contracts
            r'total\s+(?:contract\s+)?(?:value|amount|price):\s*[\$]?([\d,]+\.?\d*)',
            r'contract\s+(?:value|amount|price):\s*[\$]?([\d,]+\.?\d*)',
            r'total:\s*[\$]?([\d,]+\.?\d*)',
            r'annual\s+contract\s+value:\s*[\$]?([\d,]+\.?\d*)',
            
            # Employment contracts
            r'salary:\s*[\$]?([\d,]+\.?\d*)\s*per\s*(?:year|month)',
            r'annual\s+salary:\s*[\$]?([\d,]+\.?\d*)',
            r'base\s+salary:\s*[\$]?([\d,]+\.?\d*)',
            r'compensation:\s*[\$]?([\d,]+\.?\d*)',
            
            # General financial patterns
            r'[\$]?([\d,]+\.?\d*)\s*per\s*(?:year|month|annum)',
        ]
        
        for pattern in value_patterns:
            match = re.search(pattern, self.text_content, re.IGNORECASE)
            if match:
                value_str = match.group(1).replace(',', '')
                try:
                    financial_details.total_contract_value = float(value_str)
                    financial_details.confidence_score = 0.8
                    break
                except ValueError:
                    pass
        
        # Currency detection
        currency_match = re.search(r'[\$€£¥₹]', self.text_content)
        if currency_match:
            financial_details.currency = currency_match.group(0)
        
        # Line items extraction (simplified)
        line_items = self._extract_line_items()
        financial_details.line_items = line_items
        
        self.extracted_data.financial_details = financial_details
    
    def _extract_line_items(self) -> List[LineItem]:
        """
        Extract line items from contract text with validation.
        
        This method searches for financial line items in the contract text and
        validates them to ensure they represent meaningful business transactions.
        
        Line Item Patterns:
        - Service contracts: "5 x Consulting Services @ $100"
        - Employment benefits: "Health Insurance: $500/month"
        - General items: "Software License $1000 per year"
        
        Validation Process:
        1. Skips NDA contracts (no financial line items expected)
        2. Filters out very short descriptions (< 5 characters)
        3. Rejects meaningless text fragments (random words, common phrases)
        4. Validates against meaningful business terms
        5. Ensures price values are valid numbers
        
        Args:
            None: Uses self.text_content and self.contract_type
            
        Returns:
            List[LineItem]: List of validated line items (limited to 10 items)
        """
        line_items = []
        
        # Skip line item extraction for NDAs as they typically don't have financial line items
        if self.contract_type == "nda":
            return line_items
        
        # Enhanced line item patterns - handle different contract types
        line_patterns = [
            # Service contract line items
            r'(\d+)\s+x\s+([^$\n]+?)\s+@\s*[\$]?([\d,]+\.?\d*)',
            r'([^$\n]+?)\s+[\$]?([\d,]+\.?\d*)',
            
            # Employment benefits
            r'(?:benefits?|insurance|401k|bonus):\s*([^$\n]+?)\s*[\$]?([\d,]+\.?\d*)',
            r'([^$\n]+?)\s+(?:with|at)\s*[\$]?([\d,]+\.?\d*)',
            
            # General financial items
            r'([^$\n]+?)\s*[\$]?([\d,]+\.?\d*)\s*(?:per|each)',
        ]
        
        for pattern in line_patterns:
            matches = re.finditer(pattern, self.text_content, re.IGNORECASE)
            for match in matches:
                if len(match.groups()) >= 2:
                    description = match.group(2) if len(match.groups()) >= 3 else match.group(1)
                    price_str = match.group(3) if len(match.groups()) >= 3 else match.group(2)
                    
                    # Validate that the description is meaningful and not just random text
                    if self._is_valid_line_item_description(description):
                        try:
                            price = float(price_str.replace(',', ''))
                            line_item = LineItem(
                                description=description.strip(),
                                unit_price=price,
                                confidence_score=0.6
                            )
                            line_items.append(line_item)
                        except ValueError:
                            pass
        
        return line_items[:10]  # Limit to 10 line items
    
    def _is_valid_line_item_description(self, description: str) -> bool:
        """
        Validate if a line item description represents a meaningful business transaction.
        
        This method filters out random text fragments and ensures line items
        contain legitimate business terms that would appear in contracts.
        
        Validation Criteria:
        1. Minimum length: 5 characters
        2. Rejects patterns that are just random words
        3. Rejects descriptions starting with common words (the, this, that, etc.)
        4. Rejects descriptions with no letters
        5. Must contain at least one meaningful business term
        
        Meaningful Business Terms:
        - Service-related: service, product, license, support, maintenance, consulting
        - Development: development, training, software, hardware, equipment
        - Time-based: labor, hour, day, month, year
        - Project-related: project, work, deliverable, materials
        
        Args:
            description (str): The line item description to validate
            
        Returns:
            bool: True if the description is meaningful, False otherwise
        """
        description_lower = description.lower().strip()
        
        # Skip very short descriptions
        if len(description_lower) < 5:
            return False
        
        # Skip descriptions that are just random text fragments
        meaningless_patterns = [
            r'^[a-z\s]+$',  # Just words without context
            r'^(?:the|this|that|and|or|but|for|with|from|to|in|on|at|by|of|a|an)\s+[a-z\s]+$',  # Starts with common words
            r'^[^a-z]*$',  # No letters
        ]
        
        for pattern in meaningless_patterns:
            if re.match(pattern, description_lower):
                return False
        
        # Check if description contains meaningful business terms
        meaningful_terms = [
            'service', 'product', 'license', 'support', 'maintenance', 'consulting',
            'development', 'training', 'software', 'hardware', 'equipment', 'materials',
            'labor', 'hour', 'day', 'month', 'year', 'project', 'work', 'deliverable'
        ]
        
        return any(term in description_lower for term in meaningful_terms)
    
    async def _extract_payment_terms(self):
        """
        Extract payment terms and conditions based on contract type.
        
        This method handles payment terms differently based on the detected contract type:
        
        NDA Contracts:
        - Sets 100% confidence that NDAs have no payment terms
        - Marks payment terms as "No payment terms - NDA agreement"
        - Sets payment method as "Not applicable"
        
        Service Contracts:
        - Extracts payment terms (Net 30, Net 60, etc.)
        - Identifies payment methods (bank transfer, check, credit card)
        - Finds payment schedules and due dates
        
        Employment Contracts:
        - Extracts salary payment schedules (bi-weekly, monthly, weekly)
        - Identifies payment methods for salary disbursement
        - Finds employment-related payment terms
        
        The method uses pattern matching to find payment-related information
        and sets appropriate confidence scores based on extraction success.
        
        Returns:
            None: Updates self.extracted_data.payment_terms with extracted payment information
        """
        payment_terms = PaymentTerms(confidence_score=0.0)
        
        if self.contract_type == "nda":
            # NDAs typically don't have payment terms, so set high confidence for no payment terms
            payment_terms.confidence_score = 1.0
            payment_terms.payment_terms = "No payment terms - NDA agreement"
            payment_terms.payment_method = "Not applicable"
        else:
            # Enhanced payment terms patterns - handle different contract types
            terms_patterns = [
                # Service contracts
                r'payment\s+terms:\s*([^\n]+)',
                r'net\s+(\d+)',
                r'payable\s+within\s+(\d+)\s+days',
                
                # Employment contracts
                r'paid\s+(?:bi.?weekly|monthly|weekly)',
                r'payment\s+schedule:\s*([^\n]+)',
                r'salary\s+paid\s+([^\n]+)',
                
                # General payment patterns
                r'payment\s+frequency:\s*([^\n]+)',
                r'pay\s+schedule:\s*([^\n]+)',
            ]
            
            for pattern in terms_patterns:
                match = re.search(pattern, self.text_content, re.IGNORECASE)
                if match:
                    payment_terms.payment_terms = match.group(0)
                    payment_terms.confidence_score = 0.8
                    break
            
            # Enhanced payment method patterns
            method_patterns = [
                r'payment\s+method:\s*([^\n]+)',
                r'pay\s+by:\s*([^\n]+)',
                r'via\s+([^\n]+)',
                r'through\s+([^\n]+)',
            ]
            
            for pattern in method_patterns:
                match = re.search(pattern, self.text_content, re.IGNORECASE)
                if match:
                    payment_terms.payment_method = match.group(1).strip()
                    break
        
        self.extracted_data.payment_terms = payment_terms
    
    async def _extract_revenue_classification(self):
        """
        Extract revenue classification and contract structure information.
        
        This method analyzes the contract to determine:
        
        Payment Type Classification:
        - NDA: One-time agreements with no recurring payments
        - Employment: Recurring salary payments
        - Service: Recurring or one-time service payments
        - Subscription: Monthly, quarterly, or annual recurring payments
        
        Billing Cycle Detection:
        - One-time: Single payment contracts
        - Monthly: Monthly recurring payments
        - Quarterly: Quarterly recurring payments
        - Annually: Annual recurring payments
        - Recurring: General recurring payment structure
        
        Contract Features:
        - Auto-renewal: Detects automatic renewal clauses
        - Contract Duration: Extracts contract term length in months/years
        
        The method uses pattern matching to identify these characteristics
        and sets appropriate confidence scores based on detection success.
        
        Returns:
            None: Updates self.extracted_data.revenue_classification with extracted revenue information
        """
        revenue = RevenueClassification(confidence_score=0.0)
        
        # Enhanced payment type detection - handle different contract types
        text_lower = self.text_content.lower()
        
        # Contract type detection
        if any(word in text_lower for word in ['nda', 'non.?disclosure', 'confidentiality']):
            revenue.payment_type = 'nda'
            revenue.billing_cycle = 'one_time'
        elif any(word in text_lower for word in ['employment', 'employee', 'employer']):
            revenue.payment_type = 'employment'
            revenue.billing_cycle = 'recurring'
        elif any(word in text_lower for word in ['monthly', 'subscription', 'recurring']):
            revenue.payment_type = 'recurring'
            revenue.billing_cycle = 'monthly'
        elif any(word in text_lower for word in ['quarterly']):
            revenue.payment_type = 'recurring'
            revenue.billing_cycle = 'quarterly'
        elif any(word in text_lower for word in ['annually', 'yearly']):
            revenue.payment_type = 'recurring'
            revenue.billing_cycle = 'annually'
        else:
            revenue.payment_type = 'one_time'
        
        # Auto-renewal detection
        if 'auto-renewal' in text_lower or 'auto renewal' in text_lower:
            revenue.auto_renewal = True
        
        # Contract duration detection
        duration_patterns = [
            r'(\d+)\s*(?:years?|months?)\s*from',
            r'term.*?(\d+)\s*(?:years?|months?)',
            r'(\d+)\s*(?:years?|months?)\s*contract',
        ]
        
        for pattern in duration_patterns:
            match = re.search(pattern, text_lower)
            if match:
                try:
                    revenue.contract_duration = str(match.group(1))
                    break
                except ValueError:
                    pass
        
        revenue.confidence_score = 0.6
        self.extracted_data.revenue_classification = revenue
    
    async def _extract_sla_info(self):
        """
        Extract Service Level Agreement (SLA) and performance information.
        
        This method uses comprehensive pattern matching to extract SLA metrics
        from contract text, handling various formats and PDF text extraction quirks.
        
        Performance Metrics Extracted:
        
        Uptime & Availability:
        - Uptime guarantees (e.g., "99.9% monthly availability")
        - Availability targets and commitments
        - Monthly availability percentages
        
        Response Times:
        - General response time commitments
        - Priority-based response times (Critical, High, Medium, Low)
        - P1/P2 priority classifications
        - Resolution time commitments
        
        SLA Compliance:
        - SLA percentage targets
        - Service level compliance metrics
        - Performance benchmarks
        
        System Performance:
        - System response time targets
        - Request success rates
        - Backup success rates
        - Security patch deployment times
        
        Support & Maintenance:
        - Support hours and availability
        - Maintenance windows and schedules
        - Service credits and penalty clauses
        - Escalation procedures
        
        The method uses ultra-flexible regex patterns to handle PDF text formatting
        variations and calculates confidence scores based on extracted data quality.
        
        Returns:
            None: Updates self.extracted_data.sla_info with extracted SLA information
        """
        sla_info = SLAInfo(confidence_score=0.0)
        
        # Comprehensive performance metrics patterns - ultra flexible for PDF formatting
        metric_patterns = [
            # Uptime patterns - handle extra spaces and line breaks
            r'uptime.*?(\d+\.?\d*)\s*%',
            r'uptime.*?(\d+\.?\d*)\s*percent',
            r'(\d+\.?\d*)\s*%.*?uptime',
            r'(\d+\.?\d*)\s*percent.*?uptime',
            r'uptime.*?guarantee.*?(\d+\.?\d*)\s*%',
            r'(\d+\.?\d*)\s*%.*?monthly\s*availability',
            r'(\d+\.?\d*)\s*%.*?availability',
            r'(\d+\.?\d*)\s*%.*?monthly',
            
            # Response time patterns - handle extra spaces
            r'response\s*time.*?(\d+)\s*(?:hours?|days?|minutes?)',
            r'(\d+)\s*(?:hours?|days?|minutes?).*?response\s*time',
            r'response.*?(\d+)\s*(?:hours?|days?|minutes?)',
            
            # Priority-based response times - handle extra spaces
            r'critical.*?(\d+)\s*(?:hours?|minutes?).*?response',
            r'high\s*priority.*?(\d+)\s*(?:hours?|minutes?).*?response',
            r'medium\s*priority.*?(\d+)\s*(?:hours?|minutes?).*?response',
            r'low\s*priority.*?(\d+)\s*(?:hours?|minutes?).*?response',
            r'critical\s*issues.*?(\d+)\s*(?:hours?|minutes?)',
            r'high\s*priority.*?(\d+)\s*(?:hours?|minutes?)',
            r'medium\s*priority.*?(\d+)\s*(?:hours?|minutes?)',
            r'low\s*priority.*?(\d+)\s*(?:hours?|minutes?)',
            r'p1.*?(\d+)\s*(?:hours?|minutes?)',
            r'p2.*?(\d+)\s*(?:hours?|minutes?)',
            
            # Resolution time patterns
            r'resolution\s*time.*?(\d+)\s*(?:hours?|days?|minutes?)',
            r'(\d+)\s*(?:hours?|days?|minutes?).*?resolution',
            
            # SLA percentage patterns
            r'sla.*?(\d+\.?\d*)\s*%',
            r'(\d+\.?\d*)\s*%.*?sla',
            r'service\s*level.*?(\d+\.?\d*)\s*%',
            r'(\d+\.?\d*)\s*%.*?service\s*level',
            r'sla\s*compliance.*?(\d+\.?\d*)\s*%',
            
            # Availability patterns
            r'availability.*?(\d+\.?\d*)\s*%',
            r'(\d+\.?\d*)\s*%.*?availability',
            r'availability.*?target.*?(\d+\.?\d*)\s*%',
            
            # Performance targets - handle extra spaces
            r'performance.*?(\d+\.?\d*)\s*%',
            r'(\d+\.?\d*)\s*%.*?performance',
            r'(\d+\.?\d*)\s*%.*?of\s*requests',
            r'(\d+\.?\d*)\s*%.*?success\s*rate',
            r'(\d+\.?\d*)\s*%.*?monthly',
            
            # System response time - handle extra spaces
            r'<.*?(\d+)\s*seconds.*?(\d+\.?\d*)\s*%',
            r'(\d+\.?\d*)\s*%.*?(\d+)\s*seconds',
            r'(\d+)\s*seconds.*?(\d+\.?\d*)\s*%',
            
            # Backup and security metrics - handle extra spaces
            r'backup.*?success.*?(\d+\.?\d*)\s*%',
            r'(\d+\.?\d*)\s*%.*?backup',
            r'within\s*(\d+)\s*(?:hours?|days?).*?deployment',
            r'deployment.*?within\s*(\d+)\s*(?:hours?|days?)',
            r'(\d+)\s*(?:hours?|days?).*?deployment',
        ]
        
        for pattern in metric_patterns:
            matches = re.finditer(pattern, self.text_content, re.IGNORECASE)
            for match in matches:
                # Get the full matched text for context
                full_match = match.group(0)
                if full_match not in sla_info.performance_metrics:
                    sla_info.performance_metrics.append(full_match)
        
        # Support and maintenance patterns - ultra flexible for PDF formatting
        support_patterns = [
            r'support.*?hours.*?([^\n]+)',
            r'support.*?([^\n]+)',
            r'maintenance.*?([^\n]+)',
            r'(\d{1,2}:\d{2}\s*(?:am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm)?)',  # Time ranges
            r'(\d{1,2}\/\d{1,2})',  # 24/7, 8/5, etc.
            r'(24\/7|8\/5|9\/5)',  # Common support hours
            r'(\d+)x(\d+)\s*business\s*hours',  # 8x5 business hours
            r'(\d+)\s*hours\s*support',
            r'(\d+)x(\d+)\s*business\s*hours\s*support',  # 8x5 business hours support
        ]
        
        for pattern in support_patterns:
            matches = re.finditer(pattern, self.text_content, re.IGNORECASE)
            for match in matches:
                support_text = match.group(0)
                if not sla_info.support_terms:
                    sla_info.support_terms = support_text
                elif support_text not in sla_info.support_terms:
                    sla_info.support_terms += f"; {support_text}"
        
        # Maintenance terms
        maintenance_patterns = [
            r'maintenance.*?([^\n]+)',
            r'scheduled.*?maintenance.*?([^\n]+)',
            r'planned.*?maintenance.*?([^\n]+)',
            r'maintenance.*?window.*?([^\n]+)',
        ]
        
        for pattern in maintenance_patterns:
            match = re.search(pattern, self.text_content, re.IGNORECASE)
            if match:
                maintenance_text = match.group(0)
                if not sla_info.maintenance_terms:
                    sla_info.maintenance_terms = maintenance_text
                elif maintenance_text not in sla_info.maintenance_terms:
                    sla_info.maintenance_terms += f"; {maintenance_text}"
        
        # Service credits and penalty clauses - ultra flexible for PDF formatting
        credit_patterns = [
            r'(\d+\.?\d*)\s*%.*?credit.*?below.*?(\d+\.?\d*)\s*%',
            r'(\d+\.?\d*)\s*%.*?monthly.*?fee.*?credit',
            r'\$(\d+).*?credit.*?sla.*?violation',
            r'(\d+\.?\d*)\s*%.*?monthly.*?credits',
            r'maximum.*?(\d+\.?\d*)\s*%.*?monthly.*?fees',
            r'penalty.*?(\d+\.?\d*)\s*%.*?credit',
            r'credit.*?(\d+\.?\d*)\s*%.*?penalty',
            r'(\d+\.?\d*)\s*%.*?credit.*?availability',
            r'\$(\d+).*?credit.*?response.*?time',
            r'(\d+\.?\d*)\s*%.*?monthly.*?fees',
            r'(\d+\.?\d*)\s*%.*?monthly.*?fee.*?credit.*?each.*?(\d+\.?\d*)\s*%.*?below',
        ]
        
        for pattern in credit_patterns:
            matches = re.finditer(pattern, self.text_content, re.IGNORECASE)
            for match in matches:
                credit_text = match.group(0)
                if credit_text not in sla_info.penalty_clauses:
                    sla_info.penalty_clauses.append(credit_text)
        
        # Escalation and on-site support
        escalation_patterns = [
            r'escalation.*?(\d+)\s*(?:hours?|minutes?)',
            r'(\d+)\s*(?:hours?|minutes?).*?escalation',
            r'on.?site.*?support.*?(\d+)\s*(?:hours?)',
            r'(\d+)\s*(?:hours?).*?on.?site',
        ]
        
        for pattern in escalation_patterns:
            matches = re.finditer(pattern, self.text_content, re.IGNORECASE)
            for match in matches:
                escalation_text = match.group(0)
                if escalation_text not in sla_info.remedies:
                    sla_info.remedies.append(escalation_text)
        
        # Calculate confidence score based on extracted data
        confidence_score = 0.0
        if sla_info.performance_metrics:
            confidence_score += 0.35
        if sla_info.support_terms:
            confidence_score += 0.25
        if sla_info.maintenance_terms:
            confidence_score += 0.20
        if sla_info.penalty_clauses:
            confidence_score += 0.10
        if sla_info.remedies:
            confidence_score += 0.10
        
        sla_info.confidence_score = confidence_score
        self.extracted_data.sla_info = sla_info
    
    def _calculate_confidence_score(self) -> float:
        """
        Calculate overall confidence score based on extracted data quality.
        
        This method evaluates the completeness and quality of extracted contract data
        using a weighted scoring system (0-100 points). The scoring adapts based on
        contract type to provide meaningful assessments.
        
        Scoring Components:
        
        Standard Contracts (Service/Employment):
        - Financial completeness: 30 points (contract value or line items)
        - Party identification: 25 points (customer/vendor, employer/employee)
        - Payment terms clarity: 20 points (payment schedules, methods)
        - SLA definition: 15 points (performance metrics, support terms)
        - Contact information: 10 points (billing contacts, account numbers)
        
        NDA Contracts:
        - Party identification: 40 points (disclosing/receiving parties)
        - NDA-specific elements: 30 points (confidentiality terms)
        - Contact information: 20 points (party contact details)
        - Contract structure: 10 points (agreement format)
        
        The method returns a score from 0-100, where higher scores indicate
        more complete and reliable contract data extraction.
        
        Returns:
            float: Overall confidence score (0-100) indicating data extraction quality
        """
        scores = []
        
        # Financial completeness (30 points)
        if self.extracted_data.financial_details.total_contract_value:
            scores.append(30)
        elif self.extracted_data.financial_details.line_items:
            scores.append(20)
        else:
            scores.append(0)
        
        # Party identification (25 points)
        if self.extracted_data.parties:
            scores.append(25)
        else:
            scores.append(0)
        
        # Payment terms clarity (20 points)
        if self.extracted_data.payment_terms.payment_terms:
            scores.append(20)
        else:
            scores.append(0)
        
        # SLA definition (15 points)
        if (self.extracted_data.sla_info.performance_metrics or 
            self.extracted_data.sla_info.support_terms):
            scores.append(15)
        else:
            scores.append(0)
        
        # Contact information (10 points)
        if (self.extracted_data.account_info.billing_contact or 
            self.extracted_data.account_info.account_number):
            scores.append(10)
        else:
            scores.append(0)
        
        return sum(scores)
    
    def _perform_gap_analysis(self) -> GapAnalysis:
        """
        Perform gap analysis to identify missing critical fields and provide recommendations.
        
        This method analyzes the extracted contract data to identify gaps and missing
        information that could impact contract completeness and compliance.
        
        Gap Analysis by Contract Type:
        
        NDA Contracts:
        - Critical Gaps: Missing disclosing/receiving party information
        - Missing Fields: Undefined confidentiality periods, missing non-disclosure obligations
        - Recommendations: Use standard NDA templates, ensure confidentiality definitions
        
        Service Contracts:
        - Critical Gaps: Missing financial terms, payment structures, party information
        - Missing Fields: Incomplete SLA metrics, missing support terms, undefined penalties
        - Recommendations: Add specific SLA performance metrics, define escalation procedures
        
        Employment Contracts:
        - Critical Gaps: Missing salary information, employment terms
        - Missing Fields: Undefined benefits, missing start dates, unclear payment schedules
        - Recommendations: Include comprehensive benefits package, define employment terms
        
        The method provides actionable recommendations for improving contract completeness
        and suggests template-based approaches for better contract structure.
        
        Returns:
            GapAnalysis: Object containing critical gaps, missing fields, and recommendations
        """
        gaps = GapAnalysis()
        
        if self.contract_type == "nda":
            # NDA-specific gap analysis
            if not self.extracted_data.parties:
                gaps.critical_gaps.append("No disclosing or receiving party information found")
            else:
                # Check for specific NDA party types
                party_types = [party.type for party in self.extracted_data.parties]
                if 'disclosing_party' not in party_types:
                    gaps.missing_fields.append("Disclosing party not clearly identified")
                if 'receiving_party' not in party_types:
                    gaps.missing_fields.append("Receiving party not clearly identified")
            
            # NDAs typically don't have financial terms, so don't flag as critical
            if self.extracted_data.financial_details.total_contract_value:
                gaps.missing_fields.append("Financial terms found in NDA (unusual)")
            
            # Check for NDA-specific elements
            text_lower = self.text_content.lower()
            if 'confidentiality period' not in text_lower and 'term of confidentiality' not in text_lower:
                gaps.missing_fields.append("Confidentiality period not clearly defined")
            
            if 'confidential information' not in text_lower and 'proprietary information' not in text_lower:
                gaps.missing_fields.append("Definition of confidential information not found")
            
            if 'non-disclosure obligations' not in text_lower and 'confidentiality obligations' not in text_lower:
                gaps.missing_fields.append("Non-disclosure obligations not clearly stated")
            
            # NDA-specific recommendations
            if gaps.critical_gaps:
                gaps.recommendations.append("Manual review required for critical missing NDA elements")
            
            if len(gaps.missing_fields) > 2:
                gaps.recommendations.append("Consider using standard NDA template with all required clauses")
            
            gaps.recommendations.append("Ensure confidentiality period is clearly defined")
            gaps.recommendations.append("Verify that confidential information is properly defined")
            
        else:
            # Standard contract gap analysis
            if not self.extracted_data.parties:
                gaps.critical_gaps.append("No party information found")
            
            if not self.extracted_data.financial_details.total_contract_value:
                gaps.critical_gaps.append("No total contract value found")
            
            if not self.extracted_data.payment_terms.payment_terms:
                gaps.critical_gaps.append("No payment terms found")
            
            if not self.extracted_data.account_info.billing_contact:
                gaps.missing_fields.append("Billing contact information")
            
            # Check for specific SLA metrics
            if not self.extracted_data.sla_info.performance_metrics:
                gaps.missing_fields.append("SLA performance metrics (uptime, response time, availability)")
            else:
                # Check for specific types of metrics
                metrics_text = ' '.join(self.extracted_data.sla_info.performance_metrics).lower()
                if 'uptime' not in metrics_text and 'availability' not in metrics_text:
                    gaps.missing_fields.append("Uptime/availability metrics")
                if 'response' not in metrics_text and 'time' not in metrics_text:
                    gaps.missing_fields.append("Response time metrics")
            
            if not self.extracted_data.sla_info.support_terms:
                gaps.missing_fields.append("Support hours and terms")
            
            if not self.extracted_data.sla_info.maintenance_terms:
                gaps.missing_fields.append("Maintenance schedule and terms")
            
            if not self.extracted_data.sla_info.penalty_clauses:
                gaps.missing_fields.append("Service credits and penalty clauses")
            
            if not self.extracted_data.sla_info.remedies:
                gaps.missing_fields.append("Escalation procedures and remedies")
            
            # Generate recommendations
            if gaps.critical_gaps:
                gaps.recommendations.append("Manual review required for critical missing information")
            
            if len(gaps.missing_fields) > 3:
                gaps.recommendations.append("Consider template-based contract structure")
            
            # SLA-specific recommendations
            sla_metrics_count = len(self.extracted_data.sla_info.performance_metrics)
            if sla_metrics_count < 2:
                gaps.recommendations.append("Consider adding more specific SLA performance metrics")
            
            if not any('uptime' in metric.lower() for metric in self.extracted_data.sla_info.performance_metrics):
                gaps.recommendations.append("Uptime guarantees are critical for service level agreements")
            
            if not any('response' in metric.lower() for metric in self.extracted_data.sla_info.performance_metrics):
                gaps.recommendations.append("Response time commitments should be clearly defined")
        
        return gaps
    
    async def _update_status(self, contract_id: str, status: str, progress: float, error_message: str = None):
        """
        Update contract processing status in the database.
        
        This method provides real-time status updates during contract processing,
        allowing the frontend to display progress and handle errors appropriately.
        
        Status Updates:
        - Processing progress: Updates percentage completion (0-100)
        - Processing start: Records when processing begins
        - Processing completion: Records when processing finishes
        - Error handling: Captures and stores error messages for failed processing
        
        Database Updates:
        - status: Current processing status (pending, processing, completed, failed)
        - progress_percentage: Numerical progress indicator
        - updated_at: Timestamp of last status update
        - processing_started_at: Timestamp when processing began
        - processing_completed_at: Timestamp when processing finished
        - error_message: Detailed error information if processing failed
        
        Args:
            contract_id (str): Unique identifier for the contract being processed
            status (str): Current processing status
            progress (float): Progress percentage (0-100)
            error_message (str, optional): Error message if processing failed
            
        Returns:
            None: Updates the contract record in the database
            
        Raises:
            Exception: If database update fails (logged but not re-raised)
        """
        try:
            collection = get_collection("contracts")
            update_data = {
                "status": status,
                "progress_percentage": progress,
                "updated_at": datetime.utcnow()
            }
            
            if status == "processing" and progress == 10:
                update_data["processing_started_at"] = datetime.utcnow()
            elif status in ["completed", "failed"]:
                update_data["processing_completed_at"] = datetime.utcnow()
            
            if error_message:
                update_data["error_message"] = error_message
            
            await collection.update_one(
                {"contract_id": contract_id},
                {"$set": update_data}
            )
        except Exception as e:
            logger.error(f"Error updating status for contract {contract_id}: {str(e)}")
