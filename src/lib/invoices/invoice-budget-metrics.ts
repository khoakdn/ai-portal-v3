import { dateToQuarterIndex } from "@/lib/budget/data";
import type { QuarterFilter } from "@/lib/invoices/demo-invoice-dataset";

export interface InvoiceBudgetRecord {
  status: string;
  invoiceData?: {
    totalAmount?: number | null;
    invoiceDate?: string | null;
  } | null;
  demoQuarter?: "Q1" | "Q2" | "Q3" | "Q4";
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export function isApprovedInvoiceRecord(record: InvoiceBudgetRecord): boolean {
  return record.status.toLowerCase() === "approved";
}

export function getRecordQuarter(record: InvoiceBudgetRecord): "Q1" | "Q2" | "Q3" | "Q4" {
  if (record.demoQuarter) return record.demoQuarter;
  const date = record.invoiceData?.invoiceDate;
  if (!date) return "Q1";
  return QUARTERS[dateToQuarterIndex(date)] ?? "Q1";
}

export function getRecordAmount(record: InvoiceBudgetRecord): number {
  const amount = Number(record.invoiceData?.totalAmount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function matchesQuarterFilter(
  record: InvoiceBudgetRecord,
  quarterFilter: QuarterFilter
): boolean {
  if (quarterFilter === "all") return true;
  return getRecordQuarter(record) === quarterFilter;
}

export function calculateInvoiceBudgetMetrics(
  records: InvoiceBudgetRecord[],
  budget: number,
  quarterFilter: QuarterFilter
) {
  const scoped = records.filter((record) => matchesQuarterFilter(record, quarterFilter));
  const approved = scoped.filter(isApprovedInvoiceRecord);

  const totalSpent = approved.reduce(
    (sum, record) => sum + getRecordAmount(record),
    0
  );

  const safeBudget = Number.isFinite(Number(budget)) ? Number(budget) : 0;
  const remainingBalance = safeBudget - totalSpent;
  const pct =
    safeBudget > 0 ? Math.min(100, Math.round((totalSpent / safeBudget) * 100)) : 0;

  return {
    totalSpent,
    remainingBalance,
    pct,
    approvedCount: approved.length,
    scopedCount: scoped.length,
  };
}
