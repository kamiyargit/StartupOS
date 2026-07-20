import { Role, Currency } from "@prisma/client";

export type UserDTO = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  position: string | null;
  avatarUrl: string | null;
  role: Role;
  isSuperAdmin?: boolean;
  isActive: boolean;
  isFinancier: boolean;
  sharePercent: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CostFactorTypeDTO = {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  expenseCount: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TaskDTO = {
  id: string;
  boardId: string;
  categoryId: string | null;
  categoryName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdById: string;
  createdByName: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: string;
  dueDate: string | null;
  dueDateJalali: string | null;
  sortOrder: number;
  labels: { id: string; name: string; color: string }[];
  acknowledgements: {
    id: string;
    userId: string;
    userName: string;
    acknowledgedAt: string | null;
    note: string | null;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type IncomeRecordDTO = {
  id: string;
  sourceId: string | null;
  sourceName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  amount: string;
  currency: Currency;
  description: string | null;
  incomeDate: string;
  incomeDateJalali: string;
  paymentStatus: "PENDING" | "RECEIVED" | "PARTIAL" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export type InvoiceDTO = {
  id: string;
  number: string;
  sourceId: string | null;
  sourceName: string | null;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string;
  issueDateJalali: string;
  dueDate: string;
  dueDateJalali: string;
  currency: Currency;
  subtotal: string;
  notes: string | null;
  incomeId: string | null;
  lineItems: { id: string; description: string; quantity: string; unitPrice: string; total: string }[];
  createdAt: string;
  updatedAt: string;
};

export type AppSettingsDTO = {
  minJalaliYear: number;
  twoFactorPolicy: "OPTIONAL" | "MANDATORY";
  appName: string;
  appNameShort: string;
  appNameFa: string;
  tagline: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  themeColor: string;
  updatedAt: string;
};

export type ExpenseAttachmentDTO = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};

export type FinancierSharePaymentDTO = {
  id: string;
  amount: string;
  kind: "OWN_SHARE" | "ADVANCE" | "REIMBURSEMENT";
  paymentDate: string;
  paymentDateJalali: string;
  payeeUserId: string | null;
  payeeUserName: string | null;
  attachment: ExpenseAttachmentDTO | null;
  createdAt: string;
};

export type FinancierSharePaymentStatus = "unpaid" | "partial" | "paid";
export type ExpenseFundingStatus = "unfunded" | "partial" | "funded";

export type ExpenseFinancierShareDTO = {
  id: string;
  userId: string;
  userName: string;
  amount: string;
  paidAmount: string;
  remainingAmount: string;
  status: FinancierSharePaymentStatus;
  creditorUserId: string | null;
  creditorUserName: string | null;
  payments: FinancierSharePaymentDTO[];
};

export type ExpenseDTO = {
  id: string;
  costFactorTypeId: string;
  costFactorTypeName: string;
  costFactorTypeColor: string;
  addedByUserId: string;
  addedByName: string;
  amount: string;
  currency: Currency;
  description: string | null;
  factorDate: string;
  factorDateJalali: string;
  createdAt: string;
  updatedAt: string;
  attachments: ExpenseAttachmentDTO[];
  fundedAmount: string;
  fundingStatus: ExpenseFundingStatus;
  financierShares: ExpenseFinancierShareDTO[];
};

export type MeetingMinutesDTO = {
  id: string;
  meetingDate: string;
  meetingDateJalali: string;
  subject: string;
  attendees: string;
  summary: string | null;
  decisions: string | null;
  status: "DRAFT" | "APPROVED";
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  document: ExpenseAttachmentDTO | null;
};

export type DashboardStats = {
  totalAmountToman: string;
  totalAmountUsd: string;
  /** @deprecated use periodAmountToman */
  monthAmountToman: string;
  /** @deprecated use periodAmountUsd */
  monthAmountUsd: string;
  periodAmountToman: string;
  periodAmountUsd: string;
  expenseCount: number;
  /** @deprecated use periodExpenseCount */
  monthExpenseCount: number;
  periodExpenseCount: number;
  chartMode: "months" | "years";
  byType: { typeId: string; name: string; color: string; amount: string; currency: Currency }[];
  byMonthToman: { month: string; amount: string }[];
  byMonthUsd: { month: string; amount: string }[];
  byMonthIncomeToman: { month: string; amount: string }[];
  byMonthIncomeUsd: { month: string; amount: string }[];
  byYearToman: { year: string; amount: string }[];
  byYearUsd: { year: string; amount: string }[];
  byYearIncomeToman: { year: string; amount: string }[];
  byYearIncomeUsd: { year: string; amount: string }[];
  financierTotals: {
    userId: string;
    userName: string;
    totalAmount: string;
    paidAmount: string;
    unpaidAmount: string;
  }[];
  financierBalances: {
    userId: string;
    userName: string;
    owedToMe: string;
    iOwe: string;
  }[];
  totalIncomeToman: string;
  periodIncomeToman: string;
  totalIncomeUsd: string;
  periodIncomeUsd: string;
  profitLossToman: string;
  profitLossUsd: string;
  byIncomeCategory: { categoryId: string; name: string; color: string; amount: string; currency: Currency }[];
};
