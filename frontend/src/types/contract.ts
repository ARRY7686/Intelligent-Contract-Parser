export enum ProcessingStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed"
}

export interface PartyInfo {
  name: string;
  type: string;
  legal_entity?: string;
  registration_number?: string;
  address?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  confidence_score: number;
}

export interface AccountInfo {
  account_number?: string;
  billing_address?: string;
  billing_contact?: string;
  billing_email?: string;
  billing_phone?: string;
  technical_contact?: string;
  technical_email?: string;
  confidence_score: number;
}

export interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  currency?: string;
  confidence_score: number;
}

export interface FinancialDetails {
  total_contract_value?: number;
  currency?: string;
  tax_amount?: number;
  tax_rate?: number;
  additional_fees?: number;
  line_items: LineItem[];
  confidence_score: number;
}

export interface PaymentTerms {
  payment_terms?: string;
  payment_schedule?: string;
  due_dates: string[];
  payment_method?: string;
  banking_details?: string;
  confidence_score: number;
}

export interface RevenueClassification {
  payment_type?: string;
  billing_cycle?: string;
  renewal_terms?: string;
  auto_renewal?: boolean;
  contract_duration?: string;
  confidence_score: number;
}

export interface SLAInfo {
  performance_metrics: string[];
  benchmarks: Record<string, any>;
  penalty_clauses: string[];
  remedies: string[];
  support_terms?: string;
  maintenance_terms?: string;
  confidence_score: number;
}

export interface GapAnalysis {
  missing_fields: string[];
  critical_gaps: string[];
  recommendations: string[];
}

export interface ContractData {
  parties: PartyInfo[];
  account_info: AccountInfo;
  financial_details: FinancialDetails;
  payment_terms: PaymentTerms;
  revenue_classification: RevenueClassification;
  sla_info: SLAInfo;
  overall_confidence_score: number;
  gap_analysis: GapAnalysis;
}

export interface ContractStatus {
  contract_id: string;
  status: ProcessingStatus;
  progress_percentage: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  processing_started_at?: string;
  processing_completed_at?: string;
}

export interface Contract {
  contract_id: string;
  filename: string;
  file_size: number;
  status: ProcessingStatus;
  data?: ContractData;
  created_at: string;
  updated_at: string;
  processing_started_at?: string;
  processing_completed_at?: string;
}

export interface ContractListResponse {
  contracts: Contract[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ContractUploadResponse {
  contract_id: string;
  message: string;
  status: ProcessingStatus;
}
