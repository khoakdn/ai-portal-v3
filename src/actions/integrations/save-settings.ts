"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SaveIntegrationSettingsInput {
  integration: "teams" | "basecamp";
  enabled: boolean;
  webhookUrl: string | null;
  notifyOnApproved: boolean;
  notifyOnRejected: boolean;
  notifyOnPending: boolean;
}

export async function saveIntegrationSettings(
  input: SaveIntegrationSettingsInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update settings." };
  }

  // Verify the user has manager or admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["manager", "admin"].includes(profile.role)) {
    return { success: false, error: "Only managers and admins can update integration settings." };
  }

  const { error } = await supabase
    .from("integration_settings")
    .update({
      enabled: input.enabled,
      webhook_url: input.webhookUrl?.trim() || null,
      notify_on_approved: input.notifyOnApproved,
      notify_on_rejected: input.notifyOnRejected,
      notify_on_pending: input.notifyOnPending,
      updated_by: user.id,
    })
    .eq("integration", input.integration);

  if (error) return { success: false, error: error.message };

  revalidatePath("/integrations");
  return { success: true };
}
