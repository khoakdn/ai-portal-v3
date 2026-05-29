"use server";

import { createServiceClient } from "@/lib/supabase/service";
import type { TaskActivity } from "@/types/database";

export async function getTaskActivity(taskId: string): Promise<{
  activity: TaskActivity[];
  error?: string;
}> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("task_activity")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) return { activity: [], error: error.message };

    const activity: TaskActivity[] = (data ?? []).map((row) => ({
      id:               row.id,
      task_id:          row.task_id,
      action:           row.action,
      feedback_text:    row.feedback_text,
      snapshot_content: row.snapshot_content,
      actor_name:       row.actor_name,
      version:          row.version,
      created_at:       row.created_at,
    }));

    return { activity };
  } catch {
    return { activity: [], error: "Failed to load task activity." };
  }
}

/** Helper used by server actions to append an activity entry. */
export async function logActivity(entry: {
  task_id: string;
  action: TaskActivity["action"];
  feedback_text?: string | null;
  snapshot_content?: string | null;
  actor_name?: string | null;
  version?: number;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("task_activity").insert({
      task_id:          entry.task_id,
      action:           entry.action,
      feedback_text:    entry.feedback_text ?? null,
      snapshot_content: entry.snapshot_content ?? null,
      actor_name:       entry.actor_name ?? null,
      version:          entry.version ?? 1,
    });
  } catch (err) {
    console.error("[logActivity]", err);
  }
}
