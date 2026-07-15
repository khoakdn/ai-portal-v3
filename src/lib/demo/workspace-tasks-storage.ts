import {
  PIPELINE_REVIEWER_FEEDBACK,
  getDefaultAssigneesForTaskType,
  getPipelineAssignee,
  type PipelineAssigneeId,
  type PipelineStepStatus,
} from "@/lib/demo/content-pipeline-simulator";
import {
  DEFAULT_APPROVAL_SLA_HOURS,
  DEFAULT_FEEDBACK_SLA_HOURS,
  computeDeadlineFromHours,
  createFeedbackLogEntry,
  type PipelineFeedbackEntry,
} from "@/lib/demo/pipeline-tracking";
import type { SocialPlatform } from "@/lib/demo/social-media-formats";

export const WORKSPACE_TASKS_STORAGE_KEY = "delta_pr_tasks";
export const WORKSPACE_TASKS_UPDATE_EVENT = "delta-workspace-tasks-update";
export const ACTIVE_TASK_STORAGE_KEY = "delta_pr_active_task";

export type WorkspaceTaskType = "Press Release" | "Social Media Post";
export type WorkspaceTaskStatus =
  | "In Progress"
  | "Action Required"
  | "Pending Final Sign-Off"
  | "Approved";
export type WorkspaceReviewerStatus = "Pending" | "Feedback Provided" | "Approved";
export type WorkspaceManagerStatus = "Pending" | "Approved";

export interface WorkspaceTask {
  id: string;
  title: string;
  type: WorkspaceTaskType;
  content: string;
  businessUnit: string;
  status: WorkspaceTaskStatus;
  reviewer: string;
  reviewerStatus: WorkspaceReviewerStatus;
  manager: string;
  managerStatus: WorkspaceManagerStatus;
  reviewerId: PipelineAssigneeId;
  managerId: PipelineAssigneeId;
  feedbackText: string;
  createdAt: string;
  socialPlatform?: SocialPlatform;
  socialCopies?: Record<SocialPlatform, string>;
  simulationStartedAt: number | null;
  managerDueAt: number | null;
  reviewerSlaHours: number;
  managerSlaHours: number;
  reviewerDueAt: number | null;
  managerApprovalDueAt: number | null;
  feedbackProvidedAt: string | null;
  reviewerApprovedAt: string | null;
  managerApprovedAt: string | null;
  completedAt: string | null;
  feedbackLog: PipelineFeedbackEntry[];
  feedbackExpanded: boolean;
  showCompleteButton: boolean;
  draftLocked: boolean;
}

export function createWorkspaceTask(params: {
  title: string;
  type: WorkspaceTaskType;
  content: string;
  businessUnit: string;
  feedbackText?: string;
  reviewerId?: PipelineAssigneeId;
  managerId?: PipelineAssigneeId;
  socialPlatform?: SocialPlatform;
  socialCopies?: Record<SocialPlatform, string>;
  reviewerSlaHours?: number;
  managerSlaHours?: number;
}): WorkspaceTask {
  const defaults = getDefaultAssigneesForTaskType(params.type);
  const reviewerId = params.reviewerId ?? defaults.reviewerId;
  const managerId = params.managerId ?? defaults.managerId;
  const reviewer = getPipelineAssignee(reviewerId);
  const manager = getPipelineAssignee(managerId);
  const reviewerSlaHours = params.reviewerSlaHours ?? DEFAULT_FEEDBACK_SLA_HOURS;
  const managerSlaHours = params.managerSlaHours ?? DEFAULT_APPROVAL_SLA_HOURS;
  const dispatchTime = Date.now();

  return {
    id: crypto.randomUUID(),
    title: params.title,
    type: params.type,
    content: params.content,
    businessUnit: params.businessUnit,
    status: "In Progress",
    reviewer: reviewer.name,
    reviewerStatus: "Pending",
    manager: manager.name,
    managerStatus: "Pending",
    reviewerId,
    managerId,
    feedbackText: params.feedbackText ?? PIPELINE_REVIEWER_FEEDBACK,
    createdAt: new Date().toISOString(),
    socialPlatform: params.socialPlatform,
    socialCopies: params.socialCopies,
    simulationStartedAt: null,
    managerDueAt: null,
    reviewerSlaHours,
    managerSlaHours,
    reviewerDueAt: computeDeadlineFromHours(reviewerSlaHours, dispatchTime),
    managerApprovalDueAt: computeDeadlineFromHours(managerSlaHours, dispatchTime),
    feedbackProvidedAt: null,
    reviewerApprovedAt: null,
    managerApprovedAt: null,
    completedAt: null,
    feedbackLog: [],
    feedbackExpanded: true,
    showCompleteButton: false,
    draftLocked: false,
  };
}

export function loadWorkspaceTasks(): WorkspaceTask[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WORKSPACE_TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkspaceTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWorkspaceTasks(tasks: WorkspaceTask[]): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(WORKSPACE_TASKS_STORAGE_KEY, JSON.stringify(tasks));
  window.dispatchEvent(new CustomEvent(WORKSPACE_TASKS_UPDATE_EVENT, { detail: tasks }));
}

export function getWorkspaceTask(id: string): WorkspaceTask | null {
  return loadWorkspaceTasks().find((task) => task.id === id) ?? null;
}

export function addWorkspaceTask(task: WorkspaceTask): void {
  const tasks = loadWorkspaceTasks();
  saveWorkspaceTasks([task, ...tasks]);
}

export function updateWorkspaceTask(
  id: string,
  patch: Partial<WorkspaceTask>
): WorkspaceTask | null {
  const tasks = loadWorkspaceTasks();
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;

  const next = { ...tasks[index], ...patch };
  tasks[index] = next;
  saveWorkspaceTasks(tasks);
  return next;
}

export function setActiveTaskId(id: string | null): void {
  if (typeof window === "undefined") return;

  if (id) window.localStorage.setItem(ACTIVE_TASK_STORAGE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_TASK_STORAGE_KEY);
}

export function getActiveTaskId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_TASK_STORAGE_KEY);
}

export function mapReviewerPipelineStatus(
  status: PipelineStepStatus
): WorkspaceReviewerStatus {
  if (status === "feedback_provided") return "Feedback Provided";
  if (status === "approved") return "Approved";
  return "Pending";
}

export function mapManagerPipelineStatus(
  status: PipelineStepStatus
): WorkspaceManagerStatus {
  if (status === "approved") return "Approved";
  return "Pending";
}

export function mapPipelineReviewerStatus(
  status: WorkspaceReviewerStatus,
  simulationStarted: boolean
): PipelineStepStatus {
  if (status === "Feedback Provided") return "feedback_provided";
  if (status === "Approved") return "approved";
  return simulationStarted ? "processing" : "pending";
}

export function mapPipelineManagerStatus(
  status: WorkspaceManagerStatus,
  reviewerApproved: boolean
): PipelineStepStatus {
  if (status === "Approved") return "approved";
  if (reviewerApproved) return "pending_final";
  return "pending";
}

export function deriveWorkspaceTaskStatus(task: Pick<
  WorkspaceTask,
  "reviewerStatus" | "managerStatus" | "draftLocked" | "showCompleteButton"
>): WorkspaceTaskStatus {
  if (task.draftLocked) return "Approved";
  if (task.reviewerStatus === "Feedback Provided") return "Action Required";
  if (task.reviewerStatus === "Approved" && task.managerStatus === "Pending") {
    return "Pending Final Sign-Off";
  }
  if (task.showCompleteButton) return "Pending Final Sign-Off";
  if (task.reviewerStatus === "Approved" && task.managerStatus === "Approved") {
    return "Pending Final Sign-Off";
  }
  return "In Progress";
}

export function syncWorkspaceTaskFromPipeline(params: {
  taskId: string;
  content: string;
  reviewerStatus: PipelineStepStatus;
  managerStatus: PipelineStepStatus;
  simulationStartedAt: number | null;
  managerDueAt: number | null;
  reviewerSlaHours: number;
  managerSlaHours: number;
  reviewerDueAt: number | null;
  managerApprovalDueAt: number | null;
  feedbackProvidedAt: string | null;
  reviewerApprovedAt: string | null;
  managerApprovedAt: string | null;
  completedAt: string | null;
  feedbackLog: PipelineFeedbackEntry[];
  feedbackExpanded: boolean;
  showCompleteButton: boolean;
  draftLocked: boolean;
  socialCopies?: Record<SocialPlatform, string>;
}): WorkspaceTask | null {
  const reviewerStatus = mapReviewerPipelineStatus(params.reviewerStatus);
  const managerStatus = mapManagerPipelineStatus(params.managerStatus);

  const status = deriveWorkspaceTaskStatus({
    reviewerStatus,
    managerStatus,
    draftLocked: params.draftLocked,
    showCompleteButton: params.showCompleteButton,
  });

  return updateWorkspaceTask(params.taskId, {
    content: params.content,
    reviewerStatus,
    managerStatus,
    status,
    simulationStartedAt: params.simulationStartedAt,
    managerDueAt: params.managerDueAt,
    reviewerSlaHours: params.reviewerSlaHours,
    managerSlaHours: params.managerSlaHours,
    reviewerDueAt: params.reviewerDueAt,
    managerApprovalDueAt: params.managerApprovalDueAt,
    feedbackProvidedAt: params.feedbackProvidedAt,
    reviewerApprovedAt: params.reviewerApprovedAt,
    managerApprovedAt: params.managerApprovedAt,
    completedAt: params.completedAt,
    feedbackLog: params.feedbackLog,
    feedbackExpanded: params.feedbackExpanded,
    showCompleteButton: params.showCompleteButton,
    draftLocked: params.draftLocked,
    ...(params.socialCopies ? { socialCopies: params.socialCopies } : {}),
  });
}

export function workspaceTaskToPipelineFields(task: WorkspaceTask) {
  const simulationStarted = task.simulationStartedAt !== null;
  const reviewerApproved = task.reviewerStatus === "Approved";

  const feedbackLog =
    task.feedbackLog?.length > 0
      ? task.feedbackLog
      : task.reviewerStatus === "Feedback Provided" || task.feedbackProvidedAt
        ? [
            (() => {
              const entry = createFeedbackLogEntry({
                assigneeId: task.reviewerId,
                assigneeName: task.reviewer,
                message: task.feedbackText,
                taskType: task.type,
                providedAt: task.feedbackProvidedAt ?? undefined,
              });
              if (task.reviewerStatus === "Approved") {
                return {
                  ...entry,
                  resolved: true,
                  resolvedAt: task.reviewerApprovedAt ?? entry.providedAt,
                  expanded: false,
                };
              }
              return entry;
            })(),
          ]
        : [];

  return {
    draftText: task.content,
    title: task.title,
    businessUnit: task.businessUnit,
    taskId: task.id,
    taskType: task.type,
    feedbackText: task.feedbackText,
    reviewerId: task.reviewerId,
    managerId: task.managerId,
    socialPlatform: task.socialPlatform ?? "linkedin",
    socialCopies: task.socialCopies,
    runStatus: task.draftLocked
      ? ("completed" as const)
      : simulationStarted
        ? ("active" as const)
        : ("dispatched" as const),
    reviewerStatus: mapPipelineReviewerStatus(task.reviewerStatus, simulationStarted),
    managerStatus: mapPipelineManagerStatus(task.managerStatus, reviewerApproved),
    simulationStartedAt: task.simulationStartedAt,
    managerDueAt: task.managerDueAt,
    reviewerSlaHours: task.reviewerSlaHours ?? DEFAULT_FEEDBACK_SLA_HOURS,
    managerSlaHours: task.managerSlaHours ?? DEFAULT_APPROVAL_SLA_HOURS,
    reviewerDueAt: task.reviewerDueAt ?? null,
    managerApprovalDueAt: task.managerApprovalDueAt ?? null,
    feedbackProvidedAt: task.feedbackProvidedAt ?? null,
    reviewerApprovedAt: task.reviewerApprovedAt ?? null,
    managerApprovedAt: task.managerApprovedAt ?? null,
    completedAt: task.completedAt ?? null,
    feedbackLog,
    feedbackExpanded: task.feedbackExpanded,
    showCompleteButton: task.showCompleteButton,
    draftLocked: task.draftLocked,
  };
}
