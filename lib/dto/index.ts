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

export type AppSettingsDTO = {
  minJalaliYear: number;
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
  byYearToman: { year: string; amount: string }[];
  byYearUsd: { year: string; amount: string }[];
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
};
