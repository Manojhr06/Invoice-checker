export type RoleName = 'ADMIN' | 'FINANCE_MANAGER' | 'FINANCE_EMPLOYEE' | 'AUDITOR';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: {
    id: string;
    name: RoleName;
    description?: string;
  };
  department?: string;
  organization_id: string;
  organization_name?: string;
  currency?: string;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  currency: string;
  country: string;
  risk_tolerance_threshold: number;
}

export interface InvoiceItem {
  id?: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  tax_amount: number;
  total_price: number;
}

export interface InvoiceVerification {
  vendor_matched: boolean;
  bank_details_matched: boolean;
  bank_recently_changed: boolean;
  gstin_verified: boolean;
  po_matched: boolean;
  po_amount_exceeded: boolean;
  duplicate_detected: boolean;
  duplicate_match_reason?: string;
  flags?: string[];
}

export interface FraudPrediction {
  supervised_fraud_probability: number;
  isolation_forest_anomaly_score: number;
  composite_risk_score: number;
  feature_importance_shap?: Record<string, number>;
  natural_language_explanation?: string;
  recommended_action: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  vendor_id?: string;
  vendor_name?: string;
  vendor_gstin?: string;
  purchase_order_id?: string;
  po_number?: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: 'DRAFT' | 'PENDING_VERIFICATION' | 'UNDER_INVESTIGATION' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  document_hash: string;
  items?: InvoiceItem[];
  verification?: InvoiceVerification;
  fraud_prediction?: FraudPrediction;
  created_at: string;
}

export interface VendorBankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  ifsc_swift_code: string;
  account_holder_name: string;
  is_primary: boolean;
  is_verified: boolean;
  requires_manager_approval: boolean;
  verified_at?: string;
}

export interface Vendor {
  id: string;
  vendor_code: string;
  name: string;
  gstin?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  is_verified: boolean;
  created_at: string;
  bank_accounts?: VendorBankAccount[];
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor_name?: string;
  issue_date: string;
  expected_delivery_date?: string;
  total_amount: number;
  utilized_amount: number;
  status: 'ACTIVE' | 'FULFILLED' | 'CANCELLED';
  notes?: string;
  items?: {
    id: string;
    item_description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

export interface FraudAlert {
  id: string;
  invoice_id: string;
  invoice_number?: string;
  vendor_name?: string;
  total_amount?: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alert_title: string;
  alert_description: string;
  investigation_status: 'NEW' | 'UNDER_INVESTIGATION' | 'CONFIRMED_FRAUD' | 'LEGITIMATE' | 'ESCALATED' | 'RESOLVED';
  assigned_to_user_id?: string;
  assigned_user_name?: string;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
}

export interface DashboardSummary {
  total_invoices_processed: number;
  legitimate_invoices: number;
  suspicious_invoices: number;
  confirmed_fraud_invoices: number;
  pending_approvals: number;
  duplicate_invoices_detected: number;
  total_invoice_value: number;
  exposure_under_investigation: number;
  currency: string;
}

export interface AuditLog {
  id: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  timestamp: string;
  new_values?: any;
}
