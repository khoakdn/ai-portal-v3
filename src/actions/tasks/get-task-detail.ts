"use server";

import { createServiceClient } from "@/lib/supabase/service";
import type { TaskActivity, TaskStatus, ContentType } from "@/types/database";

export interface TaskDetail {
  id: string;
  title: string;
  type: "content_draft" | "invoice";
  status: TaskStatus;
  version: number;
  description: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Assignee (from profiles join, or null)
  assignee_id: string | null;
  assignee_name: string | null;
  // Joined content
  content_draft: {
    id: string;
    type: ContentType;
    edited_body: string | null;
    generated_body: string;
    bullet_points: string;
  } | null;
  // Latest feedback from activity log (for needs_revisions banner)
  latest_feedback: string | null;
}

export async function getTaskDetail(taskId: string): Promise<{
  task: TaskDetail | null;
  error?: string;
}> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        id, title, description, type, status, version,
        rejection_reason, created_at, updated_at,
        assignee_id,
        assignee:profiles!tasks_assignee_id_fkey ( full_name ),
        content_drafts (
          id, type, edited_body, generated_body, bullet_points
        )
      `)
      .eq("id", taskId)
      .single();

    if (error || !data) {
      return { task: null, error: error?.message ?? "Task not found." };
    }

    // Fetch latest feedback from activity log
    const { data: activityRows } = await supabase
      .from("task_activity")
      .select("feedback_text")
      .eq("task_id", taskId)
      .eq("action", "changes_requested")
      .order("created_at", { ascending: false })
      .limit(1);

    const latest_feedback = activityRows?.[0]?.feedback_text ?? null;

    const cd = (data.content_drafts as unknown) as {
      id: string;
      type: string;
      edited_body: string | null;
      generated_body: string;
      bullet_points: string;
    } | null;

    const assignee = data.assignee as { full_name?: string } | null;

    const task: TaskDetail = {
      id:               data.id,
      title:            data.title,
      description:      data.description ?? null,
      type:             data.type,
      status:           data.status as TaskStatus,
      version:          data.version ?? 1,
      rejection_reason: data.rejection_reason,
      created_at:       data.created_at,
      updated_at:       data.updated_at,
      assignee_id:      data.assignee_id ?? null,
      assignee_name:    assignee?.full_name ?? null,
      content_draft:    cd
        ? {
            id:            cd.id,
            type:          cd.type as ContentType,
            edited_body:   cd.edited_body,
            generated_body: cd.generated_body,
            bullet_points: cd.bullet_points,
          }
        : null,
      latest_feedback,
    };

    return { task };
  } catch {
    return { task: null, error: "Failed to load task details." };
  }
}
