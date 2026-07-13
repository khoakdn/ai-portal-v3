"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

export async function deleteTask(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("id, content_draft_id")
      .eq("id", taskId)
      .single();

    if (fetchError || !task) {
      console.error(
        "[deleteTask] Task lookup failed:",
        taskId,
        fetchError?.message ?? "not found"
      );
      return {
        success: false,
        error: fetchError?.message ?? "Task not found.",
      };
    }

    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (deleteError) {
      console.error(
        "[deleteTask] Supabase delete failed:",
        taskId,
        deleteError.message
      );
      return { success: false, error: deleteError.message };
    }

    if (task.content_draft_id) {
      const { error: draftDeleteError } = await supabase
        .from("content_drafts")
        .delete()
        .eq("id", task.content_draft_id);

      if (draftDeleteError) {
        console.warn(
          "[deleteTask] Linked content_draft cleanup failed:",
          task.content_draft_id,
          draftDeleteError.message
        );
      }
    }

    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[deleteTask] Unexpected error:", taskId, message);
    return { success: false, error: message };
  }
}
