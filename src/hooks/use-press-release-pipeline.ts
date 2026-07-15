"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyReviewerFeedbackFix } from "@/lib/demo/generate-mock-draft";
import { applySocialFeedbackFix } from "@/lib/demo/social-media-formats";
import type { SocialPlatform } from "@/lib/demo/social-media-formats";
import {
  PIPELINE_FEEDBACK_DELAY_MS,
  PIPELINE_FINAL_NOTIFICATION,
  PIPELINE_MANAGER_DELAY_MS,
  PIPELINE_REVIEWER_FEEDBACK,
  getDefaultAssigneesForTaskType,
  getPipelineAssignee,
  type PipelineAssigneeId,
  type PipelineRunStatus,
  type PipelineStepStatus,
} from "@/lib/demo/content-pipeline-simulator";
import {
  computeDeadlineFromHours,
  createFeedbackLogEntry,
  formatPipelineActionTimestamp,
  DEFAULT_APPROVAL_SLA_HOURS,
  DEFAULT_FEEDBACK_SLA_HOURS,
} from "@/lib/demo/pipeline-tracking";
import {
  DEFAULT_PIPELINE_STATE,
  loadPipelineState,
  PR_PIPELINE_UPDATE_EVENT,
  savePipelineState,
  type PressReleasePipelineState,
} from "@/lib/demo/press-release-pipeline-storage";
import {
  addWorkspaceTask,
  createWorkspaceTask,
  getWorkspaceTask,
  setActiveTaskId,
  syncWorkspaceTaskFromPipeline,
  workspaceTaskToPipelineFields,
  type WorkspaceTaskType,
} from "@/lib/demo/workspace-tasks-storage";
import { useReviewerNotification } from "@/contexts/reviewer-notification-context";

interface UsePressReleasePipelineOptions {
  draftText?: string;
  title?: string;
  businessUnit?: string;
  taskType?: WorkspaceTaskType;
  feedbackText?: string;
}

function reconcileSimulation(state: PressReleasePipelineState): PressReleasePipelineState {
  if (!state.splitViewActive || !state.simulationStartedAt) return state;

  const now = Date.now();
  let next = { ...state };

  if (
    next.reviewerStatus === "processing" &&
    next.simulationStartedAt !== null &&
    now >= next.simulationStartedAt + PIPELINE_FEEDBACK_DELAY_MS
  ) {
    const timestamp = formatPipelineActionTimestamp(now);
    const assignee = getPipelineAssignee(next.reviewerId);
    const hasFeedbackEntry = next.feedbackLog.some((entry) => entry.step === "reviewer");

    next = {
      ...next,
      runStatus: "active",
      reviewerStatus: "feedback_provided",
      feedbackProvidedAt: next.feedbackProvidedAt ?? timestamp,
      feedbackLog: hasFeedbackEntry
        ? next.feedbackLog
        : [
            ...next.feedbackLog,
            createFeedbackLogEntry({
              assigneeId: next.reviewerId,
              assigneeName: assignee.name,
              message: next.feedbackText,
              taskType: next.taskType,
              providedAt: timestamp,
            }),
          ],
    };
  }

  if (
    next.managerDueAt &&
    next.managerStatus === "pending_final" &&
    now >= next.managerDueAt
  ) {
    next = {
      ...next,
      managerStatus: "approved",
      showCompleteButton: true,
      managerApprovedAt: next.managerApprovedAt ?? formatPipelineActionTimestamp(now),
    };
  }

  return next;
}

function syncTaskRecord(state: PressReleasePipelineState) {
  if (!state.taskId) return;
  syncWorkspaceTaskFromPipeline({
    taskId: state.taskId,
    content: state.draftText,
    reviewerStatus: state.reviewerStatus,
    managerStatus: state.managerStatus,
    simulationStartedAt: state.simulationStartedAt,
    managerDueAt: state.managerDueAt,
    reviewerSlaHours: state.reviewerSlaHours,
    managerSlaHours: state.managerSlaHours,
    reviewerDueAt: state.reviewerDueAt,
    managerApprovalDueAt: state.managerApprovalDueAt,
    feedbackProvidedAt: state.feedbackProvidedAt,
    reviewerApprovedAt: state.reviewerApprovedAt,
    managerApprovedAt: state.managerApprovedAt,
    completedAt: state.completedAt,
    feedbackLog: state.feedbackLog,
    feedbackExpanded: state.feedbackExpanded,
    showCompleteButton: state.showCompleteButton,
    draftLocked: state.draftLocked,
    socialCopies: state.socialCopies ?? undefined,
  });
}

function markReviewerFeedbackResolved(state: PressReleasePipelineState, resolvedAt: string) {
  return state.feedbackLog.map((entry) =>
    entry.step === "reviewer" && !entry.resolved
      ? { ...entry, resolved: true, resolvedAt, expanded: false }
      : entry
  );
}

export function usePressReleasePipeline(options: UsePressReleasePipelineOptions = {}) {
  const { addNotification } = useReviewerNotification();
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const managerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<PressReleasePipelineState>(DEFAULT_PIPELINE_STATE);

  const [state, setState] = useState<PressReleasePipelineState>(() => {
    if (typeof window === "undefined") return DEFAULT_PIPELINE_STATE;
    const stored = loadPipelineState();
    if (stored) return reconcileSimulation(stored);
    const taskType = options.taskType ?? null;
    const defaults = taskType ? getDefaultAssigneesForTaskType(taskType) : null;
    return {
      ...DEFAULT_PIPELINE_STATE,
      draftText: options.draftText ?? "",
      title: options.title ?? "",
      businessUnit: options.businessUnit,
      taskType,
      feedbackText: options.feedbackText ?? PIPELINE_REVIEWER_FEEDBACK,
      reviewerId: defaults?.reviewerId ?? "bilyana",
      managerId: defaults?.managerId ?? "fidan",
    };
  });

  stateRef.current = state;

  const persist = useCallback(
    (updater: (prev: PressReleasePipelineState) => PressReleasePipelineState) => {
      setState((prev) => {
        const next = reconcileSimulation(updater(prev));
        savePipelineState(next);
        syncTaskRecord(next);
        return next;
      });
    },
    []
  );

  const clearTimers = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (managerTimeoutRef.current) clearTimeout(managerTimeoutRef.current);
  }, []);

  const scheduleFeedbackTimer = useCallback(
    (startedAt: number) => {
      clearTimers();
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, PIPELINE_FEEDBACK_DELAY_MS - elapsed);

      feedbackTimeoutRef.current = setTimeout(() => {
        persist((prev) => {
          if (prev.reviewerStatus !== "processing") return prev;
          const timestamp = formatPipelineActionTimestamp();
          const assignee = getPipelineAssignee(prev.reviewerId);
          const hasFeedbackEntry = prev.feedbackLog.some((entry) => entry.step === "reviewer");

          return {
            ...prev,
            runStatus: "active",
            reviewerStatus: "feedback_provided",
            feedbackProvidedAt: timestamp,
            feedbackLog: hasFeedbackEntry
              ? prev.feedbackLog
              : [
                  ...prev.feedbackLog,
                  createFeedbackLogEntry({
                    assigneeId: prev.reviewerId,
                    assigneeName: assignee.name,
                    message: prev.feedbackText,
                    taskType: prev.taskType,
                    providedAt: timestamp,
                  }),
                ],
          };
        });
      }, remaining);
    },
    [clearTimers, persist]
  );

  const scheduleManagerTimer = useCallback(
    (dueAt: number) => {
      if (managerTimeoutRef.current) clearTimeout(managerTimeoutRef.current);
      const remaining = Math.max(0, dueAt - Date.now());

      managerTimeoutRef.current = setTimeout(() => {
        persist((prev) => {
          if (prev.managerStatus !== "pending_final") return prev;
          return {
            ...prev,
            managerStatus: "approved",
            showCompleteButton: true,
            managerApprovedAt: formatPipelineActionTimestamp(),
          };
        });
      }, remaining);
    },
    [persist]
  );

  useEffect(() => {
    function handleUpdate(event: Event) {
      const detail = (event as CustomEvent<PressReleasePipelineState | null>).detail;
      if (detail) {
        const reconciled = reconcileSimulation(detail);
        setState(reconciled);
        if (reconciled.splitViewActive && reconciled.simulationStartedAt) {
          if (reconciled.reviewerStatus === "processing") {
            scheduleFeedbackTimer(reconciled.simulationStartedAt);
          }
          if (reconciled.managerDueAt && reconciled.managerStatus === "pending_final") {
            scheduleManagerTimer(reconciled.managerDueAt);
          }
        }
      } else {
        setState(DEFAULT_PIPELINE_STATE);
        clearTimers();
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== "delta_pr_pipeline") return;
      const stored = loadPipelineState();
      if (stored) handleUpdate(new CustomEvent(PR_PIPELINE_UPDATE_EVENT, { detail: stored }));
      else handleUpdate(new CustomEvent(PR_PIPELINE_UPDATE_EVENT, { detail: null }));
    }

    window.addEventListener(PR_PIPELINE_UPDATE_EVENT, handleUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(PR_PIPELINE_UPDATE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleStorage);
      clearTimers();
    };
  }, [clearTimers, scheduleFeedbackTimer, scheduleManagerTimer]);

  useEffect(() => {
    if (state.splitViewActive && state.simulationStartedAt && state.reviewerStatus === "processing") {
      scheduleFeedbackTimer(state.simulationStartedAt);
    }
    if (state.managerDueAt && state.managerStatus === "pending_final") {
      scheduleManagerTimer(state.managerDueAt);
    }
  }, [
    state.splitViewActive,
    state.simulationStartedAt,
    state.reviewerStatus,
    state.managerDueAt,
    state.managerStatus,
    scheduleFeedbackTimer,
    scheduleManagerTimer,
  ]);

  const syncDraftMeta = useCallback(
    (draftText: string, title: string, businessUnit?: string) => {
      if (stateRef.current.runStatus !== "idle" && stateRef.current.draftText) return;
      persist((prev) => ({
        ...prev,
        draftText: prev.draftText || draftText,
        title: prev.title || title,
        businessUnit: prev.businessUnit ?? businessUnit,
      }));
    },
    [persist]
  );

  const dispatchPipeline = useCallback(
    (params: {
      draftText: string;
      title: string;
      businessUnit?: string;
      reviewerId: PipelineAssigneeId;
      managerId: PipelineAssigneeId;
      taskType?: WorkspaceTaskType;
      feedbackText?: string;
      socialPlatform?: SocialPlatform;
      socialCopies?: Record<SocialPlatform, string>;
      reviewerSlaHours?: number;
      managerSlaHours?: number;
    }) => {
      const reviewerSlaHours = params.reviewerSlaHours ?? DEFAULT_FEEDBACK_SLA_HOURS;
      const managerSlaHours = params.managerSlaHours ?? DEFAULT_APPROVAL_SLA_HOURS;
      const dispatchTime = Date.now();

      const task = createWorkspaceTask({
        title: params.title,
        type: params.taskType ?? "Press Release",
        content: params.draftText,
        businessUnit: params.businessUnit ?? "Marketing Communications",
        feedbackText: params.feedbackText,
        reviewerId: params.reviewerId,
        managerId: params.managerId,
        socialPlatform: params.socialPlatform,
        socialCopies: params.socialCopies,
        reviewerSlaHours,
        managerSlaHours,
      });
      addWorkspaceTask(task);
      setActiveTaskId(task.id);

      persist(() => ({
        ...DEFAULT_PIPELINE_STATE,
        draftText: params.draftText,
        title: params.title,
        businessUnit: params.businessUnit,
        taskId: task.id,
        taskType: task.type,
        feedbackText: task.feedbackText,
        runStatus: "dispatched",
        reviewerId: params.reviewerId,
        managerId: params.managerId,
        reviewerStatus: "pending",
        managerStatus: "pending",
        feedbackExpanded: true,
        showCompleteButton: false,
        draftLocked: false,
        splitViewActive: false,
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
        socialPlatform: params.socialPlatform ?? null,
        socialCopies: params.socialCopies ?? null,
      }));

      return task.id;
    },
    [persist]
  );

  const loadTaskIntoPipeline = useCallback(
    (taskId: string, options?: { openSplitView?: boolean }) => {
      const task = getWorkspaceTask(taskId);
      if (!task) return false;

      setActiveTaskId(taskId);
      const fields = workspaceTaskToPipelineFields(task);
      const shouldStartSimulation =
        Boolean(options?.openSplitView) &&
        !fields.simulationStartedAt &&
        !fields.draftLocked &&
        fields.reviewerStatus !== "feedback_provided" &&
        fields.reviewerStatus !== "approved";

      const startedAt = shouldStartSimulation ? Date.now() : fields.simulationStartedAt;

      persist(() => ({
        ...DEFAULT_PIPELINE_STATE,
        ...fields,
        socialCopies: fields.socialCopies ?? null,
        splitViewActive: options?.openSplitView ?? false,
        runStatus: fields.draftLocked
          ? "completed"
          : shouldStartSimulation
            ? "processing"
            : fields.runStatus,
        reviewerStatus: shouldStartSimulation ? "processing" : fields.reviewerStatus,
        simulationStartedAt: startedAt,
      }));

      if (shouldStartSimulation && startedAt) {
        scheduleFeedbackTimer(startedAt);
      }

      if (fields.managerDueAt && fields.managerStatus === "pending_final") {
        scheduleManagerTimer(fields.managerDueAt);
      }

      return true;
    },
    [persist, scheduleFeedbackTimer, scheduleManagerTimer]
  );

  const openProgressView = useCallback(
    (taskId?: string) => {
      const id = taskId ?? stateRef.current.taskId;
      if (!id) return null;

      if (stateRef.current.taskId !== id) {
        loadTaskIntoPipeline(id, { openSplitView: true });
        return id;
      }

      const task = getWorkspaceTask(id);
      const isCompleted = task?.draftLocked ?? stateRef.current.draftLocked;
      const startedAt = stateRef.current.simulationStartedAt ?? Date.now();
      const shouldSimulate =
        !isCompleted &&
        stateRef.current.reviewerStatus !== "feedback_provided" &&
        stateRef.current.reviewerStatus !== "approved";

      persist((prev) => ({
        ...prev,
        splitViewActive: true,
        runStatus: isCompleted ? "completed" : shouldSimulate ? "processing" : prev.runStatus,
        reviewerStatus:
          shouldSimulate && !prev.simulationStartedAt ? "processing" : prev.reviewerStatus,
        simulationStartedAt: prev.simulationStartedAt ?? (shouldSimulate ? startedAt : null),
      }));

      if (shouldSimulate && !stateRef.current.simulationStartedAt) {
        scheduleFeedbackTimer(startedAt);
      }

      setActiveTaskId(id);
      return id;
    },
    [loadTaskIntoPipeline, persist, scheduleFeedbackTimer]
  );

  const applyFixAndSendToManager = useCallback(
    (onDraftChange?: (value: string) => void) => {
      const current = stateRef.current;
      if (current.reviewerStatus !== "feedback_provided") return;

      const fixed =
        current.taskType === "Social Media Post"
          ? applySocialFeedbackFix(current.draftText)
          : applyReviewerFeedbackFix(current.draftText, current.businessUnit);
      onDraftChange?.(fixed);

      const resolvedAt = formatPipelineActionTimestamp();
      const managerSimDueAt = Date.now() + PIPELINE_MANAGER_DELAY_MS;
      const socialCopies =
        current.socialCopies && current.socialPlatform
          ? { ...current.socialCopies, [current.socialPlatform]: fixed }
          : current.socialCopies;

      persist((prev) => ({
        ...prev,
        draftText: fixed,
        socialCopies,
        reviewerStatus: "approved",
        managerStatus: "pending_final",
        feedbackExpanded: false,
        reviewerApprovedAt: resolvedAt,
        feedbackLog: markReviewerFeedbackResolved(prev, resolvedAt),
        managerDueAt: managerSimDueAt,
      }));
      scheduleManagerTimer(managerSimDueAt);
    },
    [persist, scheduleManagerTimer]
  );

  const completeProcess = useCallback(() => {
    addNotification(PIPELINE_FINAL_NOTIFICATION);
    persist((prev) => ({
      ...prev,
      draftLocked: true,
      runStatus: "completed",
      showCompleteButton: false,
      completedAt: formatPipelineActionTimestamp(),
    }));
  }, [addNotification, persist]);

  const closeProgressView = useCallback(() => {
    persist((prev) => ({ ...prev, splitViewActive: false }));
    setActiveTaskId(null);
    clearTimers();
  }, [clearTimers, persist]);

  const setReviewerId = useCallback(
    (reviewerId: PipelineAssigneeId) => persist((prev) => ({ ...prev, reviewerId })),
    [persist]
  );

  const setManagerId = useCallback(
    (managerId: PipelineAssigneeId) => persist((prev) => ({ ...prev, managerId })),
    [persist]
  );

  const setReviewerSlaHours = useCallback(
    (reviewerSlaHours: number) =>
      persist((prev) => ({
        ...prev,
        reviewerSlaHours,
        reviewerDueAt:
          prev.runStatus === "idle" || prev.runStatus === "dispatched"
            ? computeDeadlineFromHours(reviewerSlaHours)
            : prev.reviewerDueAt,
      })),
    [persist]
  );

  const setManagerSlaHours = useCallback(
    (managerSlaHours: number) =>
      persist((prev) => ({
        ...prev,
        managerSlaHours,
        managerApprovalDueAt:
          prev.runStatus === "idle" || prev.runStatus === "dispatched"
            ? computeDeadlineFromHours(managerSlaHours)
            : prev.managerApprovalDueAt,
      })),
    [persist]
  );

  const setFeedbackExpanded = useCallback(
    (feedbackExpanded: boolean) => persist((prev) => ({ ...prev, feedbackExpanded })),
    [persist]
  );

  const toggleFeedbackLogEntry = useCallback(
    (entryId: string) =>
      persist((prev) => ({
        ...prev,
        feedbackLog: prev.feedbackLog.map((entry) =>
          entry.id === entryId ? { ...entry, expanded: !entry.expanded } : entry
        ),
      })),
    [persist]
  );

  const updateDraftText = useCallback(
    (draftText: string) => persist((prev) => ({ ...prev, draftText })),
    [persist]
  );

  return {
    state,
    isDispatched: state.runStatus === "dispatched",
    isSplitViewActive: state.splitViewActive,
    isPipelineActive: state.runStatus !== "idle" && state.draftText.trim().length > 0,
    isHistorical: state.draftLocked || state.runStatus === "completed",
    dispatchPipeline,
    loadTaskIntoPipeline,
    openProgressView,
    closeProgressView,
    applyFixAndSendToManager,
    completeProcess,
    setReviewerId,
    setManagerId,
    setReviewerSlaHours,
    setManagerSlaHours,
    setFeedbackExpanded,
    toggleFeedbackLogEntry,
    updateDraftText,
    syncDraftMeta,
  };
}

export type { PressReleasePipelineState, PipelineStepStatus, PipelineRunStatus };
