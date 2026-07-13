import type { InvoiceSchema } from "@/lib/invoices/schema";

export type DemoInvoiceStatus = "approved" | "ready";

export interface DemoUploadedInvoiceRecord {
  id: string;
  fileName: string;
  fileSize: number;
  status: DemoInvoiceStatus;
  invoiceData: InvoiceSchema;
}

export function buildDemoInvoiceDataset(): DemoUploadedInvoiceRecord[] {
  return [
    {
      id: crypto.randomUUID(),
      fileName: "pr-messe-munich-events-2026.pdf",
      fileSize: 312_400,
      status: "approved",
      invoiceData: {
        vendorName: "Messe München GmbH",
        invoiceNumber: "MM-PR-2026-1184",
        invoiceDate: "2026-03-14",
        dueDate: "2026-04-14",
        currency: "USD",
        totalAmount: 18_750,
        subtotal: 17_500,
        taxAmount: 1_250,
        inferredCategory: "Public Relations",
        inferredSubCategory: "Events",
        lineItems: [
          {
            description: "Smarter E Europe booth activation — PR Events",
            quantity: 1,
            unitPrice: 17_500,
            amount: 17_500,
          },
        ],
      },
    },
    {
      id: crypto.randomUUID(),
      fileName: "linkedin-campaign-q2.pdf",
      fileSize: 198_200,
      status: "approved",
      invoiceData: {
        vendorName: "LinkedIn Marketing Solutions",
        invoiceNumber: "LN-88421-2026",
        invoiceDate: "2026-04-02",
        dueDate: "2026-05-02",
        currency: "USD",
        totalAmount: 6_420,
        subtotal: 6_000,
        taxAmount: 420,
        inferredCategory: "Social Media",
        inferredSubCategory: "LinkedIn",
        lineItems: [
          {
            description: "Sponsored content — UFC500 product launch",
            quantity: 1,
            unitPrice: 6_000,
            amount: 6_000,
          },
        ],
      },
    },
    {
      id: crypto.randomUUID(),
      fileName: "content-agency-retainer-may.pdf",
      fileSize: 156_800,
      status: "ready",
      invoiceData: {
        vendorName: "Northstar Content Studio",
        invoiceNumber: "NCS-2026-0521",
        invoiceDate: "2026-05-18",
        dueDate: "2026-06-18",
        currency: "USD",
        totalAmount: 9_850,
        subtotal: 9_200,
        taxAmount: 650,
        inferredCategory: "Content Marketing",
        inferredSubCategory: null,
        lineItems: [
          {
            description: "Editorial production — EV charging thought leadership",
            quantity: 1,
            unitPrice: 9_200,
            amount: 9_200,
          },
        ],
      },
    },
  ];
}
