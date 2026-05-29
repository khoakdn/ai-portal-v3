"use server";

import { createServiceClient } from "@/lib/supabase/service";

export interface TaskRow {
  id: string;
  title: string;
  type: "content_draft" | "invoice";
  status: "draft" | "pending_approval" | "approved" | "rejected" | "needs_revisions";
  version: number;
  created_at: string;
  updated_at: string;
  assignee_id: string | null;
  rejection_reason: string | null;
  content_draft_type: "press_release" | "social_post" | null;
  assignee_name: string | null;
  created_by_name: string | null;
}

export async function getTasksForBoard(): Promise<{
  tasks: TaskRow[];
  error?: string;
}> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        type,
        status,
        version,
        created_at,
        updated_at,
        assignee_id,
        rejection_reason,
        content_drafts ( type ),
        creator:profiles!tasks_created_by_fkey ( full_name ),
        assignee:profiles!tasks_assignee_id_fkey ( full_name )
      `
      )
      .order("updated_at", { ascending: false });

    if (error) {
      return { tasks: [], error: error.message };
    }

    const tasks: TaskRow[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      version: (row as { version?: number }).version ?? 1,
      created_at: row.created_at,
      updated_at: row.updated_at,
      assignee_id: row.assignee_id,
      rejection_reason: row.rejection_reason,
      content_draft_type:
        (row.content_drafts as { type?: string } | null)?.type as
          | "press_release"
          | "social_post"
          | null ?? null,
      assignee_name:
        (row.assignee as { full_name?: string } | null)?.full_name ?? null,
      created_by_name:
        (row.creator as { full_name?: string } | null)?.full_name ?? null,
    }));

    return { tasks };
  } catch {
    return {
      tasks: [],
      error:
        "Could not connect to the database. Ensure Supabase environment variables are set.",
    };
  }
}
