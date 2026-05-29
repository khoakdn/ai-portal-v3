import { z } from "zod";

export const lineItemSchema = z.object({
  description: z
    .string()
    .describe("Description of the product or service"),
  quantity: z
    .number()
    .describe("Quantity of units"),
  unitPrice: z
    .number()
    .nullable()
    .describe("Price per unit, or null if not specified"),
  amount: z
    .number()
    .describe("Total line item amount (quantity × unit price)"),
});

export const invoiceSchema = z.object({
  vendorName: z
    .string()
    .nullable()
    .describe("The full legal name of the vendor or supplier issuing this invoice"),
  invoiceNumber: z
    .string()
    .nullable()
    .describe("The invoice or reference number printed on the document"),
  invoiceDate: z
    .string()
    .nullable()
    .describe("The date the invoice was issued, in YYYY-MM-DD format"),
  dueDate: z
    .string()
    .nullable()
    .describe("The payment due date, in YYYY-MM-DD format. Null if not stated."),
  currency: z
    .string()
    .default("USD")
    .describe("ISO 4217 currency code (e.g. USD, EUR, GBP)"),
  totalAmount: z
    .number()
    .nullable()
    .describe("The final total amount due, as a plain number without currency symbols"),
  subtotal: z
    .number()
    .nullable()
    .describe("Pre-tax subtotal, or null if not shown"),
  taxAmount: z
    .number()
    .nullable()
    .describe("Tax amount, or null if not shown"),
  lineItems: z
    .array(lineItemSchema)
    .describe("All line items listed on the invoice"),
});

export type InvoiceSchema = z.infer<typeof invoiceSchema>;
export type LineItemSchema = z.infer<typeof lineItemSchema>;
