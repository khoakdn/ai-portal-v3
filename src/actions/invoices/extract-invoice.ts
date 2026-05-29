"use server";

import { revalidatePath } from "next/cache";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { invoiceSchema, type InvoiceSchema } from "@/lib/invoices/schema";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ExtractInvoiceResult {
  success: boolean;
  data?: InvoiceSchema;
  taskId?: string;
  invoiceId?: string;
  /** true when extraction succeeded but the DB write was skipped */
  extractedOnly?: boolean;
  /** true when the result came from simulation mode */
  simulated?: boolean;
  error?: string;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

function buildGoogleClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set.");
  return createGoogleGenerativeAI({ apiKey });
}

function buildTaskDescription(data: InvoiceSchema): string {
  const lines: string[] = [
    `Invoice from ${data.vendorName ?? "Unknown Vendor"}`,
  ];
  if (data.invoiceNumber) lines.push(`Invoice #: ${data.invoiceNumber}`);
  if (data.invoiceDate)   lines.push(`Date: ${data.invoiceDate}`);
  if (data.dueDate)       lines.push(`Due: ${data.dueDate}`);
  if (data.totalAmount != null)
    lines.push(
      `Total: ${data.totalAmount.toLocaleString("en-US", {
        style: "currency",
        currency: data.currency ?? "USD",
      })}`
    );
  return lines.join(" · ");
}

/* ── Simulation mock data ─────────────────────────────────────────────── */

/**
 * Returns a realistic hardcoded invoice payload that matches the full Zod schema.
 * All downstream DB writes and notifications fire exactly as with a live API call.
 */
const SIMULATED_INVOICE: InvoiceSchema = {
  vendorName:    "Global Tech Logistics Ltd",
  invoiceNumber: "GTL-2026-04821",
  invoiceDate:   "2026-05-28",
  dueDate:       "2026-06-28",
  currency:      "USD",
  totalAmount:   1450.00,
  subtotal:      1250.00,
  taxAmount:     200.00,
  lineItems: [
    {
      description: "Corporate Event Marketing Strategy",
      quantity:    1,
      unitPrice:   1000.00,
      amount:      1000.00,
    },
    {
      description: "Digital Assets & Graphics Design",
      quantity:    3,
      unitPrice:    150.00,
      amount:        450.00,
    },
  ],
};

/* ── DB persistence (shared by both real and simulated paths) ─────────── */

async function persistInvoiceToDatabase(
  extractedData: InvoiceSchema,
  fileName: string,
  fileMimeType: string,
  aiModel: string
): Promise<{ taskId: string; invoiceId: string } | null> {
  const supabase = createServiceClient();

  // Optionally capture the logged-in user
  let userId: string | null = null;
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch { /* no auth session — proceed without */ }

  // Insert invoice record
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      file_name:      fileName,
      file_url:       `pending-upload/${Date.now()}-${fileName}`,
      file_mime_type: fileMimeType,
      vendor:         extractedData.vendorName ?? null,
      total_amount:   extractedData.totalAmount ?? null,
      currency:       extractedData.currency ?? "USD",
      due_date:       extractedData.dueDate ?? null,
      invoice_number: extractedData.invoiceNumber ?? null,
      extracted_raw:  extractedData as unknown as import("@/types/supabase").Json,
      ai_model:       aiModel,
      ...(userId ? { created_by: userId } : {}),
    })
    .select("id")
    .single();

  if (invoiceError) throw new Error(invoiceError.message);

  // Insert line items
  if (extractedData.lineItems.length > 0) {
    const lineItems = extractedData.lineItems.map((item, idx) => ({
      invoice_id:  invoice.id,
      description: item.description,
      quantity:    item.quantity ?? 1,
      unit_price:  item.unitPrice ?? null,
      amount:      item.amount,
      sort_order:  idx,
    }));

    const { error: lineItemsError } = await supabase
      .from("invoice_line_items")
      .insert(lineItems);

    if (lineItemsError)
      console.error("[extractInvoice] Line items error:", lineItemsError.message);
  }

  // Create linked task
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      title:        `Invoice — ${extractedData.vendorName ?? fileName}`,
      description:  buildTaskDescription(extractedData),
      type:         "invoice",
      status:       "pending_approval",
      invoice_id:   invoice.id,
      submitted_at: new Date().toISOString(),
      ...(userId ? { created_by: userId } : {}),
    })
    .select("id")
    .single();

  if (taskError) throw new Error(taskError.message);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  return { taskId: task.id, invoiceId: invoice.id };
}

/* ── Server Action ────────────────────────────────────────────────────── */

export async function extractInvoice(
  formData: FormData
): Promise<ExtractInvoiceResult> {
  // ── 1. Validate uploaded file ──────────────────────────────────────────
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { success: false, error: "No file was uploaded." };
  }
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return {
      success: false,
      error: `Unsupported file type "${file.type}". Please upload a PDF, PNG, or JPG.`,
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      success: false,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`,
    };
  }

  // ── 2. Simulation mode (no API key) ────────────────────────────────────
  if (!process.env.GEMINI_API_KEY) {
    console.info(
      "[extractInvoice] GEMINI_API_KEY not set — returning simulated invoice data."
    );
    await delay(2200); // realistic AI "extraction" pause

    try {
      const ids = await persistInvoiceToDatabase(
        SIMULATED_INVOICE,
        file.name,
        file.type,
        "simulation"
      );

      return {
        success:   true,
        data:      SIMULATED_INVOICE,
        taskId:    ids?.taskId,
        invoiceId: ids?.invoiceId,
        simulated: true,
      };
    } catch (err) {
      console.error("[extractInvoice] Simulation DB error:", err);
      // Still return the data so the user can see the preview
      return {
        success:       true,
        data:          SIMULATED_INVOICE,
        extractedOnly: true,
        simulated:     true,
      };
    }
  }

  // ── 3. Convert file to Buffer for Gemini ──────────────────────────────
  let fileBuffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } catch {
    return { success: false, error: "Failed to read the uploaded file." };
  }

  // ── 4. Live Gemini extraction via Vercel AI SDK ────────────────────────
  let extractedData: InvoiceSchema;
  try {
    const google = buildGoogleClient();

    const { object } = await generateObject({
      model: google("gemini-1.5-pro"),
      schema: invoiceSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert accounts-payable assistant. Extract all structured data from the invoice document below.
Be precise with numbers — do not add currency symbols to numeric fields.
Use YYYY-MM-DD format for all dates.
If a field is not present on the document, return null for that field.
Extract every line item visible on the invoice.`,
            },
            {
              type: "file",
              data: fileBuffer,
              mediaType: file.type,
            },
          ],
        },
      ],
    });

    extractedData = object;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini extraction failed.";
    console.error("[extractInvoice] Gemini error:", message);

    if (message.includes("Could not process")) {
      return {
        success: false,
        error: "Gemini could not read this document. Make sure it is a clear, unencrypted PDF or image.",
      };
    }
    return { success: false, error: `AI extraction failed: ${message}` };
  }

  // ── 5. Persist to Supabase ─────────────────────────────────────────────
  try {
    const ids = await persistInvoiceToDatabase(
      extractedData,
      file.name,
      file.type,
      "gemini-1.5-pro"
    );

    return {
      success:   true,
      data:      extractedData,
      taskId:    ids?.taskId,
      invoiceId: ids?.invoiceId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error.";
    console.error("[extractInvoice] DB error:", message);
    return { success: true, data: extractedData, extractedOnly: true };
  }
}
