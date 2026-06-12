import { z } from "zod";
import { VALID_CATEGORIES } from "@/lib/budget/data";

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
  inferredCategory: z
    .enum(VALID_CATEGORIES)
    .describe(
      `The marketing budget category that best matches this invoice. Must be exactly one of: ${VALID_CATEGORIES.join(", ")}`
    ),
  inferredSubCategory: z
    .string()
    .nullable()
    .describe(
      "The sub-category within the inferred category, or null if not applicable. " +
      "National Marketing → Banner Ads; " +
      "Public Relations → Events | Press Releases | Conferences | Webinars; " +
      "Social Media → LinkedIn | Facebook"
    ),
});

export type InvoiceSchema = z.infer<typeof invoiceSchema>;
export type LineItemSchema = z.infer<typeof lineItemSchema>;
