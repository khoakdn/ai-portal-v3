/**
 * Basecamp notification utility.
 *
 * Uses the Basecamp 3 Chatbot/Campfire webhook format.
 * Set up via: Basecamp project → Campfire → "Add a chatbot"
 * The generated URL goes into BASECAMP_WEBHOOK_URL.
 *
 * Payload format: { "content": "<HTML string>" }
 * Basecamp supports a limited set of HTML inside content:
 *   <em>, <strong>, <br>, <a href="...">, <ul>/<li>
 */

import type { TaskStatus, TaskType } from "@/types/database";

export interface BasecampNotificationPayload {
  taskId: string;
  taskTitle: string;
  taskType: TaskType;
  newStatus: TaskStatus;
  actionByName: string;
  rejectionReason?: string | null;
  /** Override the URL from env — used when set via the integrations settings UI */
  webhookUrl?: string | null;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  needs_revisions: "Needs Revisions",
};

const STATUS_EMOJI: Record<TaskStatus, string> = {
  draft: "📄",
  pending_approval: "⏳",
  approved: "✅",
  rejected: "❌",
  needs_revisions: "🔄",
};

const TYPE_LABELS: Record<TaskType, string> = {
  content_draft: "Content Draft",
  invoice: "Invoice",
};

function buildCampfireContent(payload: BasecampNotificationPayload): string {
  const statusLabel = STATUS_LABELS[payload.newStatus];
  const emoji = STATUS_EMOJI[payload.newStatus];

  const lines: string[] = [
    `${emoji} <strong>Marketing Portal — Task Update</strong>`,
    `<br>`,
    `<strong>${escapeHtml(payload.taskTitle)}</strong>`,
    `<br>`,
    `<ul>`,
    `<li><strong>Type:</strong> ${TYPE_LABELS[payload.taskType]}</li>`,
    `<li><strong>Status:</strong> ${escapeHtml(statusLabel)}</li>`,
    `<li><strong>Action by:</strong> ${escapeHtml(payload.actionByName)}</li>`,
  ];

  if (payload.rejectionReason) {
    lines.push(`<li><strong>Reason:</strong> ${escapeHtml(payload.rejectionReason)}</li>`);
  }

  lines.push(`</ul>`);

  return lines.join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function notifyBasecamp(
  payload: BasecampNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl =
    payload.webhookUrl?.trim() || process.env.BASECAMP_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    console.info("[Basecamp] Webhook URL not configured — skipping notification.");
    return { success: false, error: "Webhook URL not configured" };
  }

  try {
    const content = buildCampfireContent(payload);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Basecamp webhook returned ${response.status}: ${text.slice(0, 200)}`);
    }

    console.info(`[Basecamp] Notification sent — task "${payload.taskTitle}" → ${STATUS_LABELS[payload.newStatus]}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Basecamp] Notification failed:", message);
    return { success: false, error: message };
  }
}
