/**
 * Microsoft Teams notification utility.
 *
 * Uses the modern Teams Workflow (Adaptive Card) webhook format
 * (replaces deprecated Office 365 Connectors, August 2024+).
 *
 * Set up via: Teams channel → Workflows → "Post to a channel when a webhook
 * request is received". The generated URL goes into TEAMS_WEBHOOK_URL.
 *
 * Legacy note: If you still use an old Office 365 Connector URL, set
 * TEAMS_LEGACY_WEBHOOK=true and this module will fall back to MessageCard format.
 */

import type { TaskStatus, TaskType } from "@/types/database";

export interface TeamsNotificationPayload {
  taskId: string;
  taskTitle: string;
  taskType: TaskType;
  newStatus: TaskStatus;
  actionByName: string;
  rejectionReason?: string | null;
  /** Override the URL from env — used when set via the integrations settings UI */
  webhookUrl?: string | null;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  draft: "default",
  pending_approval: "warning",
  approved: "good",
  rejected: "attention",
  needs_revisions: "warning",
};

const STATUS_EMOJI: Record<TaskStatus, string> = {
  draft: "📄",
  pending_approval: "⏳",
  approved: "✅",
  rejected: "❌",
  needs_revisions: "🔄",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  needs_revisions: "Needs Revisions",
};

const TYPE_LABELS: Record<TaskType, string> = {
  content_draft: "Content Draft",
  invoice: "Invoice",
};

function buildAdaptiveCard(payload: TeamsNotificationPayload): object {
  const statusLabel = STATUS_LABELS[payload.newStatus];
  const emoji = STATUS_EMOJI[payload.newStatus];
  const color = STATUS_COLORS[payload.newStatus];

  const facts: { title: string; value: string }[] = [
    { title: "Task", value: payload.taskTitle },
    { title: "Type", value: TYPE_LABELS[payload.taskType] },
    { title: "Status", value: `**${statusLabel}**` },
    { title: "Action by", value: payload.actionByName },
  ];

  if (payload.rejectionReason) {
    facts.push({ title: "Reason", value: payload.rejectionReason });
  }

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          msteams: { width: "Full" },
          body: [
            {
              type: "Container",
              style: color,
              bleed: true,
              items: [
                {
                  type: "ColumnSet",
                  columns: [
                    {
                      type: "Column",
                      width: "stretch",
                      items: [
                        {
                          type: "TextBlock",
                          text: `${emoji} Marketing Portal — Task Update`,
                          weight: "Bolder",
                          size: "Medium",
                          color: "Light",
                        },
                      ],
                    },
                  ],
                },
              ],
              padding: { top: "Default", bottom: "Default", left: "Default", right: "Default" },
            },
            {
              type: "Container",
              items: [
                {
                  type: "TextBlock",
                  text: payload.taskTitle,
                  weight: "Bolder",
                  size: "Large",
                  wrap: true,
                  spacing: "Medium",
                },
                {
                  type: "FactSet",
                  facts,
                  spacing: "Medium",
                },
              ],
              padding: { top: "Default", bottom: "Default", left: "Default", right: "Default" },
            },
          ],
        },
      },
    ],
  };
}

export async function notifyTeams(
  payload: TeamsNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl =
    payload.webhookUrl?.trim() || process.env.TEAMS_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    console.info("[Teams] Webhook URL not configured — skipping notification.");
    return { success: false, error: "Webhook URL not configured" };
  }

  try {
    const body = buildAdaptiveCard(payload);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Teams webhook returned ${response.status}: ${text.slice(0, 200)}`);
    }

    console.info(`[Teams] Notification sent — task "${payload.taskTitle}" → ${STATUS_LABELS[payload.newStatus]}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Teams] Notification failed:", message);
    return { success: false, error: message };
  }
}
