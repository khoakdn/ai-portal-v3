import type { PipelineAssigneeId } from "@/lib/demo/content-pipeline-simulator";
import type { WorkspaceTaskType } from "@/lib/demo/workspace-tasks-storage";

export const DEFAULT_FEEDBACK_SLA_HOURS = 24;
export const DEFAULT_APPROVAL_SLA_HOURS = 48;

export const FEEDBACK_SLA_OPTIONS = [12, 24, 48] as const;
export const APPROVAL_SLA_OPTIONS = [24, 48, 72] as const;

export interface PipelineFeedbackEntry {
  id: string;
  assigneeId: PipelineAssigneeId;
  assigneeName: string;
  step: "reviewer" | "manager";
  message: string;
  auditNote: string;
  providedAt: string;
  resolvedAt: string | null;
  resolved: boolean;
  expanded: boolean;
}

export function formatPipelineActionTimestamp(date: Date | number = Date.now()): string {
  return new Date(date).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDeadlineDate(date: Date | number): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDeadlineDateTime(date: Date | number): string {
  return new Date(date).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function computeDeadlineFromHours(hours: number, from: Date | number = Date.now()): number {
  return new Date(from).getTime() + hours * 60 * 60 * 1000;
}

export function getAssigneeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function getFeedbackAuditNote(
  taskType: WorkspaceTaskType | null,
  assigneeId: PipelineAssigneeId
): string {
  if (taskType === "Social Media Post" || assigneeId === "andrea") {
    return "Audit: Add corporate hashtags (#DeltaElectronicsEMEA #UFC500) and explicitly tag Delta Electronics EMEA in the LinkedIn copy.";
  }
  return "Audit: Optimize the executive quote to highlight UFC500 compatibility with heavy-duty electric commercial fleets.";
}

export function createFeedbackLogEntry(params: {
  assigneeId: PipelineAssigneeId;
  assigneeName: string;
  message: string;
  taskType: WorkspaceTaskType | null;
  providedAt?: string;
}): PipelineFeedbackEntry {
  return {
    id: crypto.randomUUID(),
    assigneeId: params.assigneeId,
    assigneeName: params.assigneeName,
    step: "reviewer",
    message: params.message,
    auditNote: getFeedbackAuditNote(params.taskType, params.assigneeId),
    providedAt: params.providedAt ?? formatPipelineActionTimestamp(),
    resolvedAt: null,
    resolved: false,
    expanded: true,
  };
}
