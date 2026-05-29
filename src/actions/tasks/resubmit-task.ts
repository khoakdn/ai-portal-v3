"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/actions/tasks/get-task-activity";
import { notifyTaskStatusChange } from "@/lib/integrations/notifications";
import { getIntegrationSettings } from "@/actions/integrations/get-settings";

export interface ResubmitTaskInput {
  taskId: string;
  /** The latest edited content body to persist and snapshot. */
  content: string;
}

export async function resubmitTask(
  input: ResubmitTaskInput
): Promise<{ success: boolean; newVersion?: number; error?: string }> {
  if (!input.content.trim()) {
    return { success: false, error: "Content cannot be empty before resubmitting." };
  }

  const supabase = createServiceClient();

  // Resolve actor name
  let actorName = "A team member";
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).single();
      if (profile?.full_name) actorName = profile.full_name;
    }
  } catch { /* no auth — proceed */ }

  // Fetch current task
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("version, title, type, content_draft_id")
    .eq("id", input.taskId)
    .single();

  if (fetchError || !task) {
    return { success: false, error: fetchError?.message ?? "Task not found." };
  }

  const newVersion = (task.version ?? 1) + 1;

  // Update the content draft with the revised body
  if (task.content_draft_id) {
    const { error: draftError } = await supabase
      .from("content_drafts")
      .update({ edited_body: input.content })
      .eq("id", task.content_draft_id);

    if (draftError) {
      return { success: false, error: `Failed to save content: ${draftError.message}` };
    }
  }

  // Advance task status + bump version
  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      status:       "pending_approval",
      version:      newVersion,
      submitted_at: new Date().toISOString(),
      reviewed_at:  null,
      reviewed_by:  null,
    })
    .eq("id", input.taskId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath(`/tasks/${input.taskId}`);

  // Log + notify after response
  const settings = await getIntegrationSettings();

  after(async () => {
    await logActivity({
      task_id:          input.taskId,
      action:           "resubmitted",
      snapshot_content: input.content,
      actor_name:       actorName,
      version:          newVersion,
    });

    await notifyTaskStatusChange(
      {
        taskId:       input.taskId,
        taskTitle:    task.title,
        taskType:     task.type,
        newStatus:    "pending_approval",
        actionByName: actorName,
      },
      settings
    );
  });

  return { success: true, newVersion };
}
