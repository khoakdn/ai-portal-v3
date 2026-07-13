"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

const FY_2026_START = "2026-01-01T00:00:00Z";
const FY_2026_END = "2026-12-31T23:59:59Z";

export async function reset2026InvoiceData(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createServiceClient();

    const { data: invoices2026, error: fetchError } = await supabase
      .from("invoices")
      .select("id")
      .gte("created_at", FY_2026_START)
      .lte("created_at", FY_2026_END);

    if (fetchError) {
      console.error("[reset2026InvoiceData] Invoice lookup failed:", fetchError.message);
      return { success: false, error: fetchError.message };
    }

    const invoiceIds = (invoices2026 ?? []).map((row) => row.id);

    if (invoiceIds.length > 0) {
      const { error: tasksError } = await supabase
        .from("tasks")
        .delete()
        .in("invoice_id", invoiceIds);

      if (tasksError) {
        console.error("[reset2026InvoiceData] Linked task purge failed:", tasksError.message);
        return { success: false, error: tasksError.message };
      }
    }

    const { error: orphanTasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("type", "invoice")
      .gte("created_at", FY_2026_START)
      .lte("created_at", FY_2026_END);

    if (orphanTasksError) {
      console.error("[reset2026InvoiceData] Orphan task purge failed:", orphanTasksError.message);
      return { success: false, error: orphanTasksError.message };
    }

    const { error } = await supabase
      .from("invoices")
      .delete()
      .gte("created_at", FY_2026_START)
      .lte("created_at", FY_2026_END);

    if (error) {
      console.error("[reset2026InvoiceData] Invoice purge failed:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/invoices");
    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[reset2026InvoiceData] Unexpected error:", message);
    return { success: false, error: message };
  }
}
