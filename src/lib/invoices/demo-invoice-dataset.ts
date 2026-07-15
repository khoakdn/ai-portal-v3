import type { InvoiceSchema } from "@/lib/invoices/schema";

export type DemoInvoiceStatus = "approved" | "ready";
export type DemoQuarter = "Q1" | "Q2" | "Q3" | "Q4";
export type QuarterFilter = "all" | DemoQuarter;

export interface DemoInvoiceSeed {
  id: string;
  title: string;
  amount: number;
  quarter: DemoQuarter;
  date: string;
  businessUnit: string;
  status: "Approved" | "Pending";
  vendor: string;
}

export interface DemoUploadedInvoiceRecord {
  id: string;
  fileName: string;
  fileSize: number;
  status: DemoInvoiceStatus;
  demoTitle: string;
  demoQuarter: DemoQuarter;
  demoBusinessUnit: string;
  invoiceData: InvoiceSchema;
}

export const DEMO_INVOICE_SEEDS: DemoInvoiceSeed[] = [
  {
    id: "INV-2026-001",
    title: "MCE Exhibition Munich - Booth Setup & Deposit",
    amount: 15000,
    quarter: "Q1",
    date: "2026-02-10",
    businessUnit: "EVS",
    status: "Approved",
    vendor: "Munich Expo GmbH",
  },
  {
    id: "INV-2026-002",
    title: "AWS AI Cloud Infrastructure Server Costs",
    amount: 8500,
    quarter: "Q1",
    date: "2026-03-01",
    businessUnit: "ICTBG",
    status: "Approved",
    vendor: "Amazon Web Services",
  },
  {
    id: "INV-2026-003",
    title: "Global PR Newswire Wire-Distribution Fees",
    amount: 3200,
    quarter: "Q1",
    date: "2026-03-22",
    businessUnit: "Corporate",
    status: "Approved",
    vendor: "Cision Newswire",
  },
  {
    id: "INV-2026-004",
    title: "MCE Exhibition Munich - Event Staffing & Services",
    amount: 12000,
    quarter: "Q2",
    date: "2026-04-18",
    businessUnit: "EVS",
    status: "Approved",
    vendor: "Munich Talents Agency",
  },
  {
    id: "INV-2026-005",
    title: "Google Ads Campaign Optimization - Delta EMEA",
    amount: 9800,
    quarter: "Q2",
    date: "2026-05-05",
    businessUnit: "EVS",
    status: "Approved",
    vendor: "Google Ireland Ltd",
  },
  {
    id: "INV-2026-006",
    title: "NotebookLM Pro Corporate Licensing (DeltaPR Core)",
    amount: 4500,
    quarter: "Q2",
    date: "2026-06-12",
    businessUnit: "ICTBG",
    status: "Approved",
    vendor: "Google Workspace Sales",
  },
  {
    id: "INV-2026-007",
    title: "Smarter E Munich Booth - Interactive Media Displays",
    amount: 6000,
    quarter: "Q3",
    date: "2026-07-02",
    businessUnit: "EVS",
    status: "Approved",
    vendor: "Vidi-Media Solutions",
  },
  {
    id: "INV-2026-008",
    title: "LinkedIn Sponsored Ads - Q3 Industrial Campaigns",
    amount: 5500,
    quarter: "Q3",
    date: "2026-08-15",
    businessUnit: "IABG",
    status: "Pending",
    vendor: "LinkedIn Ireland",
  },
  {
    id: "INV-2026-009",
    title: "Delta Electronics Autumn Press Release Syndication",
    amount: 3500,
    quarter: "Q4",
    date: "2026-10-10",
    businessUnit: "Corporate",
    status: "Pending",
    vendor: "Cision Newswire",
  },
  {
    id: "INV-2026-010",
    title: "EVS Global Marketing Asset Video Shoot",
    amount: 11000,
    quarter: "Q4",
    date: "2026-11-05",
    businessUnit: "EVS",
    status: "Pending",
    vendor: "CineFrame Studio",
  },
];

function inferCategoryFromSeed(seed: DemoInvoiceSeed): {
  category: InvoiceSchema["inferredCategory"];
  subCategory: string | null;
} {
  const title = seed.title.toLowerCase();
  if (title.includes("linkedin")) {
    return { category: "Social Media", subCategory: "LinkedIn" };
  }
  if (title.includes("google ads") || title.includes("banner")) {
    return { category: "National Marketing", subCategory: "Banner Ads" };
  }
  if (title.includes("press release") || title.includes("newswire")) {
    return { category: "Public Relations", subCategory: "Press Releases" };
  }
  if (title.includes("exhibition") || title.includes("booth") || title.includes("smarter e")) {
    return { category: "Public Relations", subCategory: "Events" };
  }
  if (title.includes("notebook") || title.includes("licensing") || title.includes("aws")) {
    return { category: "Content Marketing", subCategory: null };
  }
  if (title.includes("video")) {
    return { category: "Content Marketing", subCategory: null };
  }
  return { category: "Public Relations", subCategory: "Events" };
}

function seedToInvoiceData(seed: DemoInvoiceSeed): InvoiceSchema {
  const { category, subCategory } = inferCategoryFromSeed(seed);
  return {
    vendorName: seed.vendor,
    invoiceNumber: seed.id,
    invoiceDate: seed.date,
    dueDate: null,
    currency: "EUR",
    totalAmount: seed.amount,
    subtotal: seed.amount,
    taxAmount: 0,
    lineItems: [
      {
        description: seed.title,
        quantity: 1,
        unitPrice: seed.amount,
        amount: seed.amount,
      },
    ],
    inferredCategory: category,
    inferredSubCategory: subCategory,
  };
}

export function buildDemoInvoiceDataset(): DemoUploadedInvoiceRecord[] {
  return DEMO_INVOICE_SEEDS.map((seed) => ({
    id: seed.id,
    fileName: `${seed.id.toLowerCase()}-${seed.title.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}.pdf`,
    fileSize: 180_000 + seed.amount,
    status: seed.status === "Approved" ? "approved" : "ready",
    demoTitle: seed.title,
    demoQuarter: seed.quarter,
    demoBusinessUnit: seed.businessUnit,
    invoiceData: seedToInvoiceData(seed),
  }));
}

export function getInvoiceQuarterFromDate(dateStr?: string | null): DemoQuarter {
  if (!dateStr) return "Q1";
  const month = new Date(dateStr).getMonth();
  if (month < 3) return "Q1";
  if (month < 6) return "Q2";
  if (month < 9) return "Q3";
  return "Q4";
}
