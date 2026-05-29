import { notifyTeams } from "./teams";
import { notifyBasecamp } from "./basecamp";
import type { TaskStatus, TaskType } from "@/types/database";

export interface IntegrationConfig {
  enabled: boolean;
  webhookUrl: string | null;
  notifyOnApproved: boolean;
  notifyOnRejected: boolean;
  notifyOnPending: boolean;
}

export interface IntegrationSettings {
  teams: IntegrationConfig;
  basecamp: IntegrationConfig;
}

/** Default config: disabled, falls back to env vars if set */
export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  teams: {
    enabled: !!process.env.TEAMS_WEBHOOK_URL,
    webhookUrl: null,
    notifyOnApproved: true,
    notifyOnRejected: true,
    notifyOnPending: false,
  },
  basecamp: {
    enabled: !!process.env.BASECAMP_WEBHOOK_URL,
    webhookUrl: null,
    notifyOnApproved: true,
    notifyOnRejected: true,
    notifyOnPending: false,
  },
};

export interface TaskNotificationPayload {
  taskId: string;
  taskTitle: string;
  taskType: TaskType;
  newStatus: TaskStatus;
  actionByName: string;
  rejectionReason?: string | null;
}

function shouldNotify(
  config: IntegrationConfig,
  status: TaskStatus
): boolean {
  if (!config.enabled) return false;
  if (status === "approved" && !config.notifyOnApproved) return false;
  if ((status === "rejected" || status === "needs_revisions") && !config.notifyOnRejected) return false;
  if (status === "pending_approval" && !config.notifyOnPending) return false;
  if (status === "draft") return false;
  return true;
}

export async function notifyTaskStatusChange(
  payload: TaskNotificationPayload,
  settings: IntegrationSettings = DEFAULT_INTEGRATION_SETTINGS
): Promise<void> {
  const promises: Promise<{ success: boolean; error?: string }>[] = [];

  if (shouldNotify(settings.teams, payload.newStatus)) {
    promises.push(
      notifyTeams({
        taskId: payload.taskId,
        taskTitle: payload.taskTitle,
        taskType: payload.taskType,
        newStatus: payload.newStatus,
        actionByName: payload.actionByName,
        rejectionReason: payload.rejectionReason,
        webhookUrl: settings.teams.webhookUrl,
      })
    );
  }

  if (shouldNotify(settings.basecamp, payload.newStatus)) {
    promises.push(
      notifyBasecamp({
        taskId: payload.taskId,
        taskTitle: payload.taskTitle,
        taskType: payload.taskType,
        newStatus: payload.newStatus,
        actionByName: payload.actionByName,
        rejectionReason: payload.rejectionReason,
        webhookUrl: settings.basecamp.webhookUrl,
      })
    );
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
}
