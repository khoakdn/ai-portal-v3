import type {
  PipelineAssigneeId,
  PipelineRunStatus,
  PipelineStepStatus,
} from "@/lib/demo/content-pipeline-simulator";
import type { WorkspaceTaskType } from "@/lib/demo/workspace-tasks-storage";
import type { SocialPlatform } from "@/lib/demo/social-media-formats";

export const PR_PIPELINE_STORAGE_KEY = "delta_pr_pipeline";

export const PR_PIPELINE_UPDATE_EVENT = "delta-pr-pipeline-update";

export interface PressReleasePipelineState {
  draftText: string;
  title: string;
  businessUnit?: string;
  taskId: string | null;
  taskType: WorkspaceTaskType | null;
  feedbackText: string;
  runStatus: PipelineRunStatus;
  splitViewActive: boolean;
  reviewerId: PipelineAssigneeId;
  managerId: PipelineAssigneeId;
  reviewerStatus: PipelineStepStatus;
  managerStatus: PipelineStepStatus;
  feedbackExpanded: boolean;
  showCompleteButton: boolean;
  draftLocked: boolean;
  simulationStartedAt: number | null;
  managerDueAt: number | null;
  socialPlatform: SocialPlatform | null;
  socialCopies: Record<SocialPlatform, string> | null;
  updatedAt: number;
}

export const DEFAULT_PIPELINE_STATE: PressReleasePipelineState = {
  draftText: "",
  title: "",
  businessUnit: undefined,
  taskId: null,
  taskType: null,
  feedbackText: "",
  runStatus: "idle",
  splitViewActive: false,
  reviewerId: "bilyana",
  managerId: "fidan",
  reviewerStatus: "pending",
  managerStatus: "pending",
  feedbackExpanded: true,
  showCompleteButton: false,
  draftLocked: false,
  simulationStartedAt: null,
  managerDueAt: null,
  socialPlatform: null,
  socialCopies: null,
  updatedAt: 0,
};

export function loadPipelineState(): PressReleasePipelineState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PR_PIPELINE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PressReleasePipelineState>;
    return { ...DEFAULT_PIPELINE_STATE, ...parsed };
  } catch {
    return null;
  }
}

export function savePipelineState(state: PressReleasePipelineState): void {
  if (typeof window === "undefined") return;

  const next = { ...state, updatedAt: Date.now() };
  window.localStorage.setItem(PR_PIPELINE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent(PR_PIPELINE_UPDATE_EVENT, { detail: next })
  );
}

export function clearPipelineState(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(PR_PIPELINE_STORAGE_KEY);
  window.dispatchEvent(
    new CustomEvent(PR_PIPELINE_UPDATE_EVENT, { detail: null })
  );
}

export function isPipelineActive(state: PressReleasePipelineState | null): boolean {
  if (!state) return false;
  return state.runStatus !== "idle" && state.draftText.trim().length > 0;
}
