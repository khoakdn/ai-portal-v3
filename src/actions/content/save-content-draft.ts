"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { ContentType } from "@/types/database";

export interface SaveContentDraftInput {
  title: string;
  bulletPoints: string;
  contentType: ContentType;
  generatedBody: string;
  editedBody: string;
}

export interface SaveContentDraftResult {
  success: boolean;
  taskId?: string;
  draftId?: string;
  error?: string;
}

/** Returns the authenticated user's ID, or null if not logged in. */
async function getOptionalUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function saveAsDraft(
  input: SaveContentDraftInput
): Promise<SaveContentDraftResult> {
  const supabase = createServiceClient();
  const userId   = await getOptionalUserId();

  const { data: draft, error: draftError } = await supabase
    .from("content_drafts")
    .insert({
      type:           input.contentType,
      title:          input.title,
      bullet_points:  input.bulletPoints,
      generated_body: input.generatedBody,
      edited_body:    input.editedBody || null,
      ...(userId ? { created_by: userId } : {}),
    })
    .select("id")
    .single();

  if (draftError) return { success: false, error: draftError.message };

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      title:           input.title,
      type:            "content_draft",
      status:          "draft",
      content_draft_id: draft.id,
      ...(userId ? { created_by: userId } : {}),
    })
    .select("id")
    .single();

  if (taskError) return { success: false, error: taskError.message };

  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  return { success: true, taskId: task.id, draftId: draft.id };
}

export async function submitForApproval(
  input: SaveContentDraftInput
): Promise<SaveContentDraftResult> {
  const supabase = createServiceClient();
  const userId   = await getOptionalUserId();

  const { data: draft, error: draftError } = await supabase
    .from("content_drafts")
    .insert({
      type:           input.contentType,
      title:          input.title,
      bullet_points:  input.bulletPoints,
      generated_body: input.generatedBody,
      edited_body:    input.editedBody || null,
      ...(userId ? { created_by: userId } : {}),
    })
    .select("id")
    .single();

  if (draftError) return { success: false, error: draftError.message };

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      title:            input.title,
      type:             "content_draft",
      status:           "pending_approval",
      content_draft_id: draft.id,
      submitted_at:     new Date().toISOString(),
      ...(userId ? { created_by: userId } : {}),
    })
    .select("id")
    .single();

  if (taskError) return { success: false, error: taskError.message };

  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  return { success: true, taskId: task.id, draftId: draft.id };
}
