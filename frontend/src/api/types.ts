//mirrors backend/app/schemas.py. amounts stay strings end to end, only Money/BalanceBar turn them into numbers (display only)

export type Role = "REQUESTER" | "APPROVER";
export type BudgetStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
}

export interface Budget {
  id: number;
  title: string;
  purpose: string;
  amount: string;
  status: BudgetStatus;
  rejection_reason: string | null;
  created_by_id: number;
  created_by: string;
  created_at: string;
  decided_by: string | null;
  decided_at: string | null;
  po_total: string;
  remaining: string;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  budget_id: number;
  budget_title: string;
  vendor_name: string;
  amount: string;
  created_by: string;
  created_at: string;
  voucher_total: string;
  remaining: string;
}

export interface Vrn {
  vrn_number: string;
  acknowledged_by: string;
  acknowledged_at: string;
  remarks: string | null;
}

export interface Voucher {
  id: number;
  coupon_code: string;
  purchase_order_id: number;
  po_number: string;
  amount: string;
  received_date: string;
  acknowledged: boolean;
  vrn: Vrn | null;
}

export interface BudgetDetail extends Budget {
  purchase_orders: PurchaseOrder[];
}

export interface PurchaseOrderDetail extends PurchaseOrder {
  vouchers: Voucher[];
}
