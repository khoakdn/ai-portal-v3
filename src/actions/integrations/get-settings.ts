"use server";

import { createServiceClient } from "@/lib/supabase/service";
import type { IntegrationSettings, IntegrationConfig } from "@/lib/integrations/notifications";
import { DEFAULT_INTEGRATION_SETTINGS } from "@/lib/integrations/notifications";

/** Fetch integration settings from the DB, merging with env-var defaults. */
export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("integration_settings")
      .select("*");

    if (error || !data) return DEFAULT_INTEGRATION_SETTINGS;

    const build = (key: "teams" | "basecamp"): IntegrationConfig => {
      const row = data.find((r) => r.integration === key);
      if (!row) return DEFAULT_INTEGRATION_SETTINGS[key];
      return {
        enabled: row.enabled,
        webhookUrl: row.webhook_url,
        notifyOnApproved: row.notify_on_approved,
        notifyOnRejected: row.notify_on_rejected,
        notifyOnPending: row.notify_on_pending,
      };
    };

    return { teams: build("teams"), basecamp: build("basecamp") };
  } catch {
    return DEFAULT_INTEGRATION_SETTINGS;
  }
}

/** For the integrations page — returns raw DB rows so the UI can show current values */
export interface IntegrationRow {
  integration: "teams" | "basecamp";
  enabled: boolean;
  webhookUrl: string | null;
  notifyOnApproved: boolean;
  notifyOnRejected: boolean;
  notifyOnPending: boolean;
}

export async function getIntegrationRows(): Promise<{
  rows: IntegrationRow[];
  error?: string;
}> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("integration_settings")
      .select("integration, enabled, webhook_url, notify_on_approved, notify_on_rejected, notify_on_pending")
      .order("integration");

    if (error) return { rows: [], error: error.message };

    const rows: IntegrationRow[] = (data ?? []).map((r) => ({
      integration: r.integration,
      enabled: r.enabled,
      webhookUrl: r.webhook_url,
      notifyOnApproved: r.notify_on_approved,
      notifyOnRejected: r.notify_on_rejected,
      notifyOnPending: r.notify_on_pending,
    }));

    return { rows };
  } catch {
    return {
      rows: [],
      error:
        "Could not load settings. Ensure the integration_settings migration has been run in Supabase.",
    };
  }
}
