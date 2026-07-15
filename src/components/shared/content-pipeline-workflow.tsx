"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getAssigneesForTaskType,
  getDefaultAssigneesForTaskType,
  getPipelineAssignee,
  type PipelineAssigneeId,
} from "@/lib/demo/content-pipeline-simulator";
import type { SocialPlatform } from "@/lib/demo/social-media-formats";
import type { WorkspaceTaskType } from "@/lib/demo/workspace-tasks-storage";
import { usePressReleasePipeline } from "@/hooks/use-press-release-pipeline";

interface ContentPipelineWorkflowProps {
  draftText: string;
  onDraftChange: (value: string) => void;
  title?: string;
  businessUnit?: string;
  taskType?: WorkspaceTaskType;
  feedbackText?: string;
  socialPlatform?: SocialPlatform;
  socialCopies?: Record<SocialPlatform, string>;
  progressNavigation?: "redirect" | "inline";
  disabled?: boolean;
  className?: string;
  onProgressViewOpen?: () => void;
}

export function ContentPipelineWorkflow({
  draftText,
  onDraftChange,
  title = "Press Release Draft",
  businessUnit,
  taskType = "Press Release",
  feedbackText,
  socialPlatform,
  socialCopies,
  progressNavigation = "redirect",
  disabled = false,
  className,
  onProgressViewOpen,
}: ContentPipelineWorkflowProps) {
  const router = useRouter();
  const defaults = getDefaultAssigneesForTaskType(taskType);
  const assigneeOptions = getAssigneesForTaskType(taskType);

  const {
    state,
    isDispatched,
    isSplitViewActive,
    dispatchPipeline,
    openProgressView,
    setReviewerId,
    setManagerId,
    syncDraftMeta,
  } = usePressReleasePipeline({ draftText, title, businessUnit, taskType, feedbackText });

  const [isDispatching, startDispatch] = useTransition();

  const reviewer = getPipelineAssignee(state.reviewerId);
  const manager = getPipelineAssignee(state.managerId);
  const canDispatch =
    !disabled && !isDispatched && !isSplitViewActive && draftText.trim().length > 0;

  useEffect(() => {
    syncDraftMeta(draftText, title, businessUnit);
  }, [draftText, title, businessUnit, syncDraftMeta]);

  useEffect(() => {
    if (state.runStatus === "idle" && !state.taskId) {
      setReviewerId(defaults.reviewerId);
      setManagerId(defaults.managerId);
    }
  }, [taskType, state.runStatus, state.taskId, defaults.reviewerId, defaults.managerId, setReviewerId, setManagerId]);

  function handleDispatch() {
    if (!canDispatch || isDispatching) return;

    startDispatch(() => {
      dispatchPipeline({
        draftText,
        title,
        businessUnit,
        reviewerId: state.reviewerId,
        managerId: state.managerId,
        taskType,
        feedbackText,
        socialPlatform,
        socialCopies,
      });
    });
  }

  function handleViewProgress() {
    const taskId = openProgressView(state.taskId ?? undefined);
    onProgressViewOpen?.();
    if (taskId && progressNavigation === "redirect") {
      router.push(`/tasks?pipeline=${taskId}`);
    }
  }

  if (isSplitViewActive) return null;

  if (isDispatched) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-6 shadow-sm",
          className
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/30" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-100/60">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 drop-shadow-sm" />
            </span>
          </div>
          <p className="text-sm font-semibold text-emerald-900">Pipeline dispatched successfully</p>
          <p className="mt-1 max-w-sm text-xs text-emerald-700/80">
            Saved to your Task Pipeline Board and routed to {reviewer.name} for feedback and{" "}
            {manager.name} for final approval.
          </p>
          <Button
            type="button"
            onClick={handleViewProgress}
            className="mt-5 w-full bg-[#0087DC] font-semibold text-white shadow-md shadow-[#0087DC]/25 hover:bg-[#0076c0]"
            size="lg"
          >
            <Eye className="mr-2 h-4 w-4" />
            👁️ View Progress Tracker
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#0087DC]/20 bg-gradient-to-br from-[#0087DC]/5 to-white p-5 shadow-sm",
        className
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#005a94]">
        Review &amp; Approval Route
      </p>
      <p className="mt-1.5 text-sm text-slate-600">
        Plan your stakeholder feedback loop before dispatching the content pipeline.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pipeline-reviewer-select">Assignee 1</Label>
          <Select
            value={state.reviewerId}
            onValueChange={(value) => setReviewerId(value as PipelineAssigneeId)}
          >
            <SelectTrigger id="pipeline-reviewer-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assigneeOptions.map((person) => (
                <SelectItem key={`reviewer-${person.id}`} value={person.id}>
                  {person.name} — {person.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-400">{reviewer.roleTag}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pipeline-manager-select">Assignee 2</Label>
          <Select
            value={state.managerId}
            onValueChange={(value) => setManagerId(value as PipelineAssigneeId)}
          >
            <SelectTrigger id="pipeline-manager-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assigneeOptions.map((person) => (
                <SelectItem key={`manager-${person.id}`} value={person.id}>
                  {person.name} — {person.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-400">{manager.roleTag}</p>
        </div>
      </div>

      <Button
        type="button"
        onClick={handleDispatch}
        disabled={!canDispatch || isDispatching}
        className="mt-5 w-full bg-[#0087DC] font-semibold text-white hover:bg-[#0076c0]"
        size="lg"
      >
        {isDispatching ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Dispatching pipeline…
          </>
        ) : (
          <>🚀 Dispatch Content Pipeline</>
        )}
      </Button>
    </div>
  );
}
