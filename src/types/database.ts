export interface AdminRecord {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

export type ClearanceStatus = 
  | 'Paid' 
  | 'Pending' 
  | 'Not Yet Due' 
  | 'Advance Paid';

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  member_id: string;
  maintenance_year: number;
  maintenance_month?: number | null; // null for annual
  allocated_amount: number;
  created_at: string;
}

export interface MonthClearanceItem {
  year: number;
  month: number;
  monthName: string;
  requiredAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: ClearanceStatus;
  allocations: {
    allocationId?: string;
    paymentId: string;
    paymentDate: string;
    amount: number;
    paymentMethod?: string;
    reference?: string | null;
  }[];
}

export interface YearClearanceItem {
  year: number;
  requiredAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: ClearanceStatus;
  paymentDate?: string | null;
  allocations: {
    allocationId?: string;
    paymentId: string;
    paymentDate: string;
    amount: number;
    paymentMethod?: string;
    reference?: string | null;
  }[];
}

export interface MemberClearanceSummary {
  frequency: 'monthly' | 'annual';
  rate: number;
  paidThroughText: string;
  paidThroughYear?: number | null;
  paidThroughMonth?: number | null;
  currentPeriodText: string;
  currentPeriodDue: number;
  totalOutstanding: number;
  advanceCredit: number;
  unallocatedCredit: number;
  lastPaymentDate: string | null;
  monthsCleared: number;
  monthsPending: number;
  overallStatus: ClearanceStatus;
}

export interface Member {
  id: string;
  full_name: string;
  flat_number: string;
  building?: string | null;
  phone?: string | null;
  email?: string | null;
  monthly_amount: number;
  annual_amount: number;
  maintenance_frequency?: 'monthly' | 'annual';
  effective_from?: string | null;
  status: 'active' | 'inactive' | 'archived';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Computed / aggregated
  total_paid?: number;
  current_year_paid?: number;
  current_month_paid?: number;
  last_payment_date?: string | null;
  clearance_summary?: MemberClearanceSummary;
}

export interface Payment {
  id: string;
  member_id: string;
  amount: number;
  payment_type: 'Monthly' | 'Annual' | 'Other';
  payment_month?: number | null;
  payment_year?: number | null;
  start_month?: number | null;
  start_year?: number | null;
  end_month?: number | null;
  end_year?: number | null;
  payment_date: string;
  payment_method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
  transaction_reference?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined allocations
  allocations?: PaymentAllocation[];
  // Joined member details
  member?: {
    id: string;
    full_name: string;
    flat_number: string;
    building?: string | null;
    monthly_amount?: number;
    annual_amount?: number;
    maintenance_frequency?: 'monthly' | 'annual';
  } | null;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_method?: string | null;
  description?: string | null;
  reference_number?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceSettings {
  id?: string;
  society_name: string;
  address: string;
  initial_balance: number;
  monthly_default_amount: number;
  annual_default_amount: number;
  updated_at?: string;
}

export interface FinancialSummary {
  initial_balance: number;
  total_collected: number;
  total_expenses: number;
  current_balance: number;
  current_month_collected: number;
  current_month_expenses: number;
  active_members: number;
}

export interface AuditLog {
  id: string;
  admin_user_id?: string | null;
  action: string;
  table_name: string;
  record_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  created_at: string;
}
