// Database row shapes (kept in sync with supabase/migrations/0001_init.sql).

export type Role = "owner" | "staff";
export type PaymentMode = "cash" | "udhar" | "partial";
export type MessageType = "purchase" | "reminder" | "monthly" | "custom";

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  opening_balance: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  photo_url: string | null;
  price: number;
  unit: string;
  track_stock: boolean;
  stock_count: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Sale {
  id: string;
  customer_id: string | null;
  staff_id: string | null;
  sale_date: string;
  total_amount: number;
  paid_amount: number;
  payment_mode: PaymentMode;
  note: string | null;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface Payment {
  id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  mode: string;
  note: string | null;
  staff_id: string | null;
  created_at: string;
}

export interface CustomerBalance {
  customer_id: string;
  name: string;
  phone: string | null;
  balance: number;
}

// Cart line used in the POS screen before a sale is saved.
export interface CartLine {
  product_id: string;
  product_name: string;
  unit_price: number;
  qty: number;
}
