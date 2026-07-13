"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

export async function resetInvoicePlatformData(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createServiceClient();

    const { error: tasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("type", "invoice");

    if (tasksError) {
      console.error(
        "[resetInvoicePlatformData] Invoice task purge failed:",
        tasksError.message
      );
      return { success: false, error: tasksError.message };
    }

    const { error } = await supabase
      .from("invoices")
      .delete()
      .not("id", "is", null);

    if (error) {      console.error(
        "[resetInvoicePlatformData] Invoice purge failed:",
        error.message
      );
      return { success: false, error: error.message };
    }

    revalidatePath("/invoices");
    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[resetInvoicePlatformData] Unexpected error:", message);
    return { success: false, error: message };
  }
}
