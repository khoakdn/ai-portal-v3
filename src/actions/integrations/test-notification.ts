"use server";

import { notifyTeams } from "@/lib/integrations/teams";
import { notifyBasecamp } from "@/lib/integrations/basecamp";

export interface TestNotificationInput {
  integration: "teams" | "basecamp";
  /** Explicit URL — from the input field in the UI, before saving */
  webhookUrl: string;
}

export async function testNotification(
  input: TestNotificationInput
): Promise<{ success: boolean; error?: string }> {
  if (!input.webhookUrl.trim()) {
    return { success: false, error: "Please enter a webhook URL before testing." };
  }

  const testPayload = {
    taskId: "test-000",
    taskTitle: "Test Task — Marketing Portal",
    taskType: "content_draft" as const,
    newStatus: "approved" as const,
    actionByName: "Portal Admin",
    webhookUrl: input.webhookUrl.trim(),
  };

  if (input.integration === "teams") {
    return notifyTeams(testPayload);
  }

  return notifyBasecamp(testPayload);
}
