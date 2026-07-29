// SQLite has no native enum support, so LedgerAccount.type is a plain string
// column. This module is the single source of truth for the allowed values,
// used in place of a Prisma enum import.
export const LedgerAccountType = {
  USER_WALLET: "USER_WALLET",
  SUPPLIER_PAYABLE: "SUPPLIER_PAYABLE",
  KWETU_REVENUE: "KWETU_REVENUE",
  KWETU_VAT_PAYABLE: "KWETU_VAT_PAYABLE",
  INSURER_PAYABLE: "INSURER_PAYABLE",
  REFERRAL_PAYABLE: "REFERRAL_PAYABLE",
  CASH_CLEARING: "CASH_CLEARING",
} as const;

export type LedgerAccountType = (typeof LedgerAccountType)[keyof typeof LedgerAccountType];
