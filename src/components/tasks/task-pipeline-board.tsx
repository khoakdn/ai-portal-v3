"use client";

import Link from "next/link";
import { ArrowLeft, Eye, FileText, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspaceTasks } from "@/hooks/use-workspace-tasks";
import { usePressReleasePipeline } from "@/hooks/use-press-release-pipeline";
import { ContentPipelineProgressView } from "@/components/shared/content-pipeline-progress-view";
import { formatDeadlineDateTime } from "@/lib/demo/pipeline-tracking";
import type { WorkspaceTask, WorkspaceTaskStatus } from "@/lib/demo/workspace-tasks-storage";

function StatusBadge({ task }: { task: WorkspaceTask }) {
  const config: Record<WorkspaceTaskStatus, string> = {
    "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
    "Action Required": "bg-amber-50 text-amber-800 border-amber-200",
    "Pending Final Sign-Off": "bg-violet-50 text-violet-700 border-violet-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const reviewerFirst = task.reviewer.split(" ")[0];
  const managerFirst = task.manager.split(" ")[0];

  const labels: Record<WorkspaceTaskStatus, string> = {
    "In Progress": "⏳ In Progress",
    "Action Required": `⚠️ Action Required (${reviewerFirst} Feedback)`,
    "Pending Final Sign-Off": `⏳ Pending Manager (${managerFirst})`,
    Approved: "✅ Approved",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        config[task.status]
      )}
    >
      {labels[task.status]}
    </span>
  );
}

function StepIndicator({ task }: { task: WorkspaceTask }) {
  const reviewerDone = task.reviewerStatus === "Approved";
  const reviewerActive = task.reviewerStatus === "Feedback Provided";
  const managerDone = task.managerStatus === "Approved";
  const managerActive = task.reviewerStatus === "Approved" && task.managerStatus === "Pending";

  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className="flex items-center gap-1">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            reviewerDone ? "bg-emerald-500" : reviewerActive ? "bg-amber-400" : "bg-slate-300"
          )}
        />
        {task.reviewer.split(" ")[0]}
      </span>
      <span className="text-slate-300">→</span>
      <span className="flex items-center gap-1">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            managerDone ? "bg-emerald-500" : managerActive ? "bg-violet-400" : "bg-slate-200"
          )}
        />
        {task.manager.split(" ")[0]}
      </span>
    </div>
  );
}

function TypeBadge({ type }: { type: WorkspaceTask["type"] }) {
  const isSocial = type === "Social Media Post";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        isSocial ? "bg-pink-50 text-pink-700" : "bg-indigo-50 text-indigo-700"
      )}
    >
      {isSocial ? <MessageSquare className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
      {type}
    </span>
  );
}

interface TaskPipelineBoardProps {
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string | null) => void;
}

export function TaskPipelineBoard({ selectedTaskId, onSelectTask }: TaskPipelineBoardProps) {
  const { tasks, hydrated } = useWorkspaceTasks();
  const { openProgressView, closeProgressView, isSplitViewActive } = usePressReleasePipeline();

  function handleOpenTask(taskId: string) {
    openProgressView(taskId);
    onSelectTask?.(taskId);
  }

  function handleBackToList() {
    closeProgressView();
    onSelectTask?.(null);
  }

  if (isSplitViewActive || selectedTaskId) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBackToList}
          className="-ml-2 text-muted-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Task Pipeline Board
        </Button>
        <ContentPipelineProgressView />
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading campaign pipelines…
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-8 py-14 text-center shadow-sm">
        <Sparkles className="mx-auto mb-4 h-10 w-10 text-[#0087DC]/40" />
        <p className="text-base font-semibold text-slate-700">No active workflows yet.</p>
        <p className="mt-2 text-sm text-slate-500">
          Generate a Press Release or Social Media post to begin!
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/my-request/press-release">Press Release Studio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/my-request/social-media">Social Media Post</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#005a94]">
            Task Pipeline Board
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {tasks.length} campaign{tasks.length === 1 ? "" : "s"} tracked locally
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tasks.map((task) => (
          <article
            key={task.id}
            className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-slate-900">{task.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(task.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <TypeBadge type={task.type} />
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {task.businessUnit}
              </span>
              <StatusBadge task={task} />
            </div>

            <StepIndicator task={task} />

            <div className="mt-3 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              {task.reviewerDueAt && (
                <p className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Feedback deadline:</span>{" "}
                  {formatDeadlineDateTime(task.reviewerDueAt)}
                </p>
              )}
              {task.managerApprovalDueAt && (
                <p className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Approval deadline:</span>{" "}
                  {formatDeadlineDateTime(task.managerApprovalDueAt)}
                </p>
              )}
              {task.feedbackProvidedAt && (
                <p className="text-[11px] italic text-slate-500">
                  💬 Feedback logged · {task.feedbackProvidedAt}
                </p>
              )}
              {task.managerApprovedAt && (
                <p className="text-[11px] italic text-emerald-700/90">
                  ✅ Approved · {task.managerApprovedAt}
                </p>
              )}
            </div>

            <Button
              type="button"
              onClick={() => handleOpenTask(task.id)}
              className="mt-4 w-full bg-[#0087DC] font-semibold text-white hover:bg-[#0076c0]"
            >
              <Eye className="mr-2 h-4 w-4" />
              👁️ Check Process / View Details
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
