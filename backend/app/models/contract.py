from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class PartyInfo(BaseModel):
    name: str
    type: str  # customer, vendor, third_party
    legal_entity: Optional[str] = None
    registration_number: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    confidence_score: float = Field(ge=0, le=1)


class AccountInfo(BaseModel):
    account_number: Optional[str] = None
    billing_address: Optional[str] = None
    billing_contact: Optional[str] = None
    billing_email: Optional[str] = None
    billing_phone: Optional[str] = None
    technical_contact: Optional[str] = None
    technical_email: Optional[str] = None
    confidence_score: float = Field(ge=0, le=1)


class LineItem(BaseModel):
    description: str
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    currency: Optional[str] = None
    confidence_score: float = Field(ge=0, le=1)


class FinancialDetails(BaseModel):
    total_contract_value: Optional[float] = None
    currency: Optional[str] = None
    tax_amount: Optional[float] = None
    tax_rate: Optional[float] = None
    additional_fees: Optional[float] = None
    line_items: List[LineItem] = []
    confidence_score: float = Field(ge=0, le=1)


class PaymentTerms(BaseModel):
    payment_terms: Optional[str] = None  # Net 30, Net 60, etc.
    payment_schedule: Optional[str] = None
    due_dates: List[str] = []
    payment_method: Optional[str] = None
    banking_details: Optional[str] = None
    confidence_score: float = Field(ge=0, le=1)


class RevenueClassification(BaseModel):
    payment_type: Optional[str] = None  # recurring, one_time, mixed
    billing_cycle: Optional[str] = None  # monthly, quarterly, annually
    renewal_terms: Optional[str] = None
    auto_renewal: Optional[bool] = None
    contract_duration: Optional[str] = None
    confidence_score: float = Field(ge=0, le=1)


class SLAInfo(BaseModel):
    performance_metrics: List[str] = []
    benchmarks: Dict[str, Any] = {}
    penalty_clauses: List[str] = []
    remedies: List[str] = []
    support_terms: Optional[str] = None
    maintenance_terms: Optional[str] = None
    confidence_score: float = Field(ge=0, le=1)


class GapAnalysis(BaseModel):
    missing_fields: List[str] = []
    critical_gaps: List[str] = []
    recommendations: List[str] = []


class ContractData(BaseModel):
    parties: List[PartyInfo] = []
    account_info: AccountInfo = Field(default_factory=lambda: AccountInfo(confidence_score=0.0))
    financial_details: FinancialDetails = Field(default_factory=lambda: FinancialDetails(confidence_score=0.0))
    payment_terms: PaymentTerms = Field(default_factory=lambda: PaymentTerms(confidence_score=0.0))
    revenue_classification: RevenueClassification = Field(default_factory=lambda: RevenueClassification(confidence_score=0.0))
    sla_info: SLAInfo = Field(default_factory=lambda: SLAInfo(confidence_score=0.0))
    overall_confidence_score: float = Field(default=0.0, ge=0, le=100)
    gap_analysis: GapAnalysis = Field(default_factory=GapAnalysis)


class ContractStatus(BaseModel):
    contract_id: str
    status: ProcessingStatus
    progress_percentage: float = Field(ge=0, le=100)
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None


class Contract(BaseModel):
    contract_id: str
    filename: str
    file_size: int
    status: ProcessingStatus
    data: Optional[ContractData] = None
    created_at: datetime
    updated_at: datetime
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None


class ContractListResponse(BaseModel):
    contracts: List[Contract]
    total: int
    page: int
    page_size: int
    total_pages: int


class ContractUploadResponse(BaseModel):
    contract_id: str
    message: str
    status: ProcessingStatus
