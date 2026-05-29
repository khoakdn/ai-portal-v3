"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/actions/tasks/get-task-activity";
import { notifyTaskStatusChange } from "@/lib/integrations/notifications";
import { getIntegrationSettings } from "@/actions/integrations/get-settings";

export interface RequestChangesInput {
  taskId: string;
  feedbackText: string;
}

export async function requestChanges(
  input: RequestChangesInput
): Promise<{ success: boolean; error?: string }> {
  if (!input.feedbackText.trim()) {
    return { success: false, error: "Feedback is required when requesting changes." };
  }

  const supabase = createServiceClient();

  // Resolve actor name (best-effort)
  let actorName = "A reviewer";
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).single();
      if (profile?.full_name) actorName = profile.full_name;
    }
  } catch { /* no auth — proceed */ }

  // Fetch current task version + content snapshot
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("version, title, type, content_draft_id")
    .eq("id", input.taskId)
    .single();

  if (fetchError || !task) {
    return { success: false, error: fetchError?.message ?? "Task not found." };
  }

  // Snapshot current content_draft body (if applicable)
  let snapshotContent: string | null = null;
  if (task.content_draft_id) {
    const { data: draft } = await supabase
      .from("content_drafts")
      .select("edited_body, generated_body")
      .eq("id", task.content_draft_id)
      .single();
    snapshotContent = draft?.edited_body ?? draft?.generated_body ?? null;
  }

  // Update task status
  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      status:           "needs_revisions",
      reviewed_at:      new Date().toISOString(),
      rejection_reason: input.feedbackText,
    })
    .eq("id", input.taskId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath(`/tasks/${input.taskId}`);

  // Log activity + fire notification after response
  const currentVersion = task.version ?? 1;
  const settings       = await getIntegrationSettings();

  after(async () => {
    await logActivity({
      task_id:          input.taskId,
      action:           "changes_requested",
      feedback_text:    input.feedbackText,
      snapshot_content: snapshotContent,
      actor_name:       actorName,
      version:          currentVersion,
    });

    await notifyTaskStatusChange(
      {
        taskId:          input.taskId,
        taskTitle:       task.title,
        taskType:        task.type,
        newStatus:       "needs_revisions",
        actionByName:    actorName,
        rejectionReason: input.feedbackText,
      },
      settings
    );
  });

  return { success: true };
}
