import type { PipelineAssigneeId } from "@/lib/demo/content-pipeline-simulator";
import type { WorkspaceTaskType } from "@/lib/demo/workspace-tasks-storage";

export const DEADLINE_DAY_OPTIONS = [1, 2, 3, 5, 7] as const;
export const DEFAULT_FEEDBACK_SLA_DAYS = 2;
export const DEFAULT_APPROVAL_SLA_DAYS = 3;
export const DEADLINE_END_HOUR = 17;

/** @deprecated Legacy hour-based defaults — migrated to days on load */
export const DEFAULT_FEEDBACK_SLA_HOURS = 24;
/** @deprecated Legacy hour-based defaults — migrated to days on load */
export const DEFAULT_APPROVAL_SLA_HOURS = 48;

export type DeadlineDayOption = (typeof DEADLINE_DAY_OPTIONS)[number];

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

export function formatDaysLabel(days: number): string {
  return days === 1 ? "1 Day" : `${days} Days`;
}

export function toDateInputValue(date: Date | number = Date.now()): string {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function computeDeadlineFromDays(
  days: number,
  from: Date | number = Date.now()
): number {
  const target = new Date(from);
  target.setDate(target.getDate() + days);
  target.setHours(DEADLINE_END_HOUR, 0, 0, 0);
  return target.getTime();
}

export function computeDeadlineFromDateInput(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, DEADLINE_END_HOUR, 0, 0, 0).getTime();
}

export function resolvePipelineDeadline(params: {
  days: number;
  customDate?: string | null;
  from?: Date | number;
}): number {
  if (params.customDate) {
    return computeDeadlineFromDateInput(params.customDate);
  }
  return computeDeadlineFromDays(params.days, params.from);
}

/** Migrate legacy hour values to whole-day increments */
export function migrateHoursToDays(hours?: number | null, fallback = DEFAULT_FEEDBACK_SLA_DAYS): number {
  if (!hours || hours <= 0) return fallback;
  return Math.max(1, Math.round(hours / 24));
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
