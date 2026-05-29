"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/actions/tasks/get-task-activity";
import { notifyTaskStatusChange } from "@/lib/integrations/notifications";
import { getIntegrationSettings } from "@/actions/integrations/get-settings";
import type { TaskStatus } from "@/types/database";

export interface UpdateTaskStatusInput {
  taskId: string;
  status: TaskStatus;
  assigneeId?: string | null;
  rejectionReason?: string;
}

async function getOptionalUser(): Promise<{ id: string; name: string } | null> {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return null;

    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    return { id: user.id, name: profile?.full_name ?? "A team member" };
  } catch {
    return null;
  }
}

export async function updateTaskStatus(
  input: UpdateTaskStatusInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();
  const actor    = await getOptionalUser();
  const actorName = actor?.name ?? "A team member";

  // ── Build update payload ───────────────────────────────────────────────
  const updatePayload: {
    status: TaskStatus;
    assignee_id?: string | null;
    submitted_at?: string;
    reviewed_at?: string;
    reviewed_by?: string;
    rejection_reason?: string;
  } = { status: input.status };

  if (input.assigneeId !== undefined) {
    updatePayload.assignee_id = input.assigneeId;
  }
  if (input.status === "pending_approval") {
    updatePayload.submitted_at = new Date().toISOString();
  }
  if (input.status === "approved" || input.status === "rejected") {
    updatePayload.reviewed_at = new Date().toISOString();
    if (actor?.id) updatePayload.reviewed_by = actor.id;
  }
  if (input.status === "rejected" && input.rejectionReason) {
    updatePayload.rejection_reason = input.rejectionReason;
  }

  // ── Persist ────────────────────────────────────────────────────────────
  const { data: task, error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", input.taskId)
    .select("title, type, status, version")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  // ── Fire notifications after the response is sent ─────────────────────
  const settings = await getIntegrationSettings();

  after(async () => {
    // Map status to activity action label
    const actionMap: Record<string, "submitted" | "approved" | "rejected"> = {
      pending_approval: "submitted",
      approved:         "approved",
      rejected:         "rejected",
    };
    const activityAction = actionMap[input.status];
    if (activityAction) {
      await logActivity({
        task_id:       input.taskId,
        action:        activityAction,
        feedback_text: input.rejectionReason ?? null,
        actor_name:    actorName,
        version:       (task as { version?: number }).version ?? 1,
      });
    }

    await notifyTaskStatusChange(
      {
        taskId:          input.taskId,
        taskTitle:       task.title,
        taskType:        task.type,
        newStatus:       input.status,
        actionByName:    actorName,
        rejectionReason: input.rejectionReason ?? null,
      },
      settings
    );
  });

  return { success: true };
}
