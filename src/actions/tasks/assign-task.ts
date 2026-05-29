"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/actions/tasks/get-task-activity";

export interface AssignTaskInput {
  taskId: string;
  /** null to unassign */
  assigneeId: string | null;
  assigneeName: string | null;
}

export async function assignTask(
  input: AssignTaskInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  // Resolve the actor who is making the assignment (best-effort)
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

  // Fetch current task version for the activity log
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("version, title")
    .eq("id", input.taskId)
    .single();

  if (fetchError || !task) {
    return { success: false, error: fetchError?.message ?? "Task not found." };
  }

  // Update assignee on the task row
  const { error: updateError } = await supabase
    .from("tasks")
    .update({ assignee_id: input.assigneeId })
    .eq("id", input.taskId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Log assignment in activity (fire-and-forget; do not block the response)
  const feedbackText = input.assigneeId
    ? `Assigned to ${input.assigneeName ?? "a team member"}`
    : "Unassigned";

  // We call logActivity directly here (lightweight, no notification needed)
  await logActivity({
    task_id:       input.taskId,
    action:        "assigned",
    feedback_text: feedbackText,
    actor_name:    actorName,
    version:       task.version ?? 1,
  });

  revalidatePath(`/tasks/${input.taskId}`);
  revalidatePath("/tasks");

  return { success: true };
}
