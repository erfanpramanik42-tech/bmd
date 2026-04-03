export type Role = "admin" | "member";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  isSuperAdmin?: boolean;
  firebase_uid?: string;
  photo?: string;
  address?: string;
  join_date?: string;
  pin_hash?: string;
  father_name?: string;
  mother_name?: string;
  nid?: string;
  occupation?: string;
  nominee_name?: string;
  nominee_relation?: string;
}

export interface Member extends User {}

export interface Deposit {
  id: string;
  member_id: string | null; // null for fund-only deposits
  month: string; // YYYY-MM
  amount: number;
  date: string;
  note?: string | null;
  fine: boolean;
}

export interface Loan {
  id: string;
  member_id: string;
  amount: number;
  interest: number; // percentage
  installments: number;
  date: string;
  purpose?: string;
  total_interest: number;
  total_payable: number;
  monthly_installment: number;
  status: "active" | "completed";
}

export interface Installment {
  id: string;
  member_id: string;
  loan_id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Request {
  id: string;
  type: "deposit" | "loan" | "installment";
  member_id: string;
  data: any;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface Investment {
  id: string;
  title: string;
  amount: number;
  expected_return: number;
  profit: number;
  invest_date: string;
  maturity_date?: string | null;
  status: "active" | "received";
  received_amount?: number | null;
  received_date?: string | null;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  note?: string | null;
}

export interface CashEntry {
  id: string;
  title: string;
  amount: number;
  type: 'in' | 'out';
  date: string;
  note?: string | null;
  distributed: boolean;
}

export interface Contact {
  id: string;
  name: string;
  position: string;
  phone: string;
  address?: string;
  photo?: string;
  bkash?: string;
  nagad?: string;
  rocket?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  target: string; // "all" or userId
  sent_at: string;
  sent_by: string;
  read_by: string[]; // array of userIds
}

export interface AppSettings {
  id: string;
  monthly_deposit: number;
  interest_rate: number;
  excel_link: string;
  super_admin_phone: string;
  super_admin_pin_hash: string;
}

export interface Terms {
  membership: string[];
  deposit: string[];
  loan: string[];
  governance: string[];
  special: string;
}

export interface Developer {
  name: string;
  photo?: string;
  phone?: string;
  facebook?: string;
  bio?: string;
}
