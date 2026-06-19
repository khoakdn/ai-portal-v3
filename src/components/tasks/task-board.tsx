"use client";

import { useState, useTransition, useOptimistic } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  SendHorizonal,
  Clock,
  FileText,
  MessageSquare,
  Loader2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  MessageSquareDiff,
  ArrowRight,
  Eye,
  ExternalLink,
} from "lucide-react";
import { updateTaskStatus } from "@/actions/tasks/update-task-status";
import { requestChanges } from "@/actions/tasks/request-changes";
import { getTaskDetail, type TaskDetail } from "@/actions/tasks/get-task-detail";
import type { TaskRow } from "@/actions/tasks/get-tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { TaskStatus } from "@/types/database";

const STATUS_FILTER_OPTIONS: { label: string; value: TaskStatus | "all" }[] = [
  { label: "All",              value: "all" },
  { label: "Draft",            value: "draft" },
  { label: "Pending",          value: "pending_approval" },
  { label: "Needs Revisions",  value: "needs_revisions" },
  { label: "Approved",         value: "approved" },
  { label: "Rejected",         value: "rejected" },
];

function StatusBadge({ status }: { status: TaskStatus }) {
  const config: Record<TaskStatus, { variant: string; icon: React.ElementType; label: string; cls: string }> = {
    draft:            { variant: "draft",    icon: FileText,         label: "Draft",            cls: "" },
    pending_approval: { variant: "pending",  icon: Clock,            label: "Pending Approval", cls: "" },
    approved:         { variant: "approved", icon: CheckCircle2,     label: "Approved",         cls: "" },
    rejected:         { variant: "rejected", icon: XCircle,          label: "Rejected",         cls: "" },
    needs_revisions:  { variant: "outline",  icon: MessageSquareDiff, label: "Needs Revisions", cls: "border-orange-200 bg-orange-50 text-orange-700" },
  };
  const { variant, icon: Icon, label, cls } = config[status];
  return (
    <Badge variant={variant as Parameters<typeof Badge>[0]["variant"]} className={cn("gap-1 whitespace-nowrap", cls)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}

function TypeLabel({ type, contentDraftType }: { type: TaskRow["type"]; contentDraftType: TaskRow["content_draft_type"] }) {
  if (type === "content_draft") {
    const Icon = contentDraftType === "social_post" ? MessageSquare : Sparkles;
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {contentDraftType === "social_post" ? "Social Post" : "Press Release"}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <FileText className="h-3.5 w-3.5" />
      Invoice
    </span>
  );
}

interface RequestChangesDialogState {
  taskId: string;
  taskTitle: string;
}

interface TaskBoardProps {
  initialTasks: TaskRow[];
  fetchError?: string;
}

export function TaskBoard({ initialTasks, fetchError }: TaskBoardProps) {
  const [statusFilter, setStatusFilter]   = useState<TaskStatus | "all">("all");
  const [rcDialog, setRcDialog]           = useState<RequestChangesDialogState | null>(null);
  const [feedback, setFeedback]           = useState("");
  const [isFeedbackPending, startFeedbackTransition] = useTransition();
  const [actionError, setActionError]     = useState<string | null>(null);
  const [isPending, startTransition]      = useTransition();

  // Per-row action states
  const [approvingId, setApprovingId]       = useState<string | null>(null);
  const [submittingId, setSubmittingId]     = useState<string | null>(null);
  const [approveSuccessId, setApproveSuccessId] = useState<string | null>(null);

  // View detail panel
  const [viewTaskId, setViewTaskId]         = useState<string | null>(null);
  const [viewTask, setViewTask]             = useState<TaskDetail | null>(null);
  const [viewLoading, setViewLoading]       = useState(false);

  const [optimisticTasks, updateOptimisticTasks] = useOptimistic(
    initialTasks,
    (state, { taskId, status }: { taskId: string; status: TaskStatus }) =>
      state.map((t) => (t.id === taskId ? { ...t, status } : t))
  );

  const filteredTasks =
    statusFilter === "all"
      ? optimisticTasks
      : optimisticTasks.filter((t) => t.status === statusFilter);

  const counts = Object.fromEntries(
    ["all", "draft", "pending_approval", "needs_revisions", "approved", "rejected"].map(
      (s) => [s, s === "all" ? initialTasks.length : initialTasks.filter((t) => t.status === s).length]
    )
  ) as Record<string, number>;

  function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    setActionError(null);
    if (newStatus === "approved") setApprovingId(taskId);
    if (newStatus === "pending_approval") setSubmittingId(taskId);

    startTransition(async () => {
      updateOptimisticTasks({ taskId, status: newStatus });
      const result = await updateTaskStatus({ taskId, status: newStatus });

      setApprovingId(null);
      setSubmittingId(null);

      if (result.success && newStatus === "approved") {
        setApproveSuccessId(taskId);
        window.setTimeout(() => setApproveSuccessId((id) => (id === taskId ? null : id)), 3500);
      } else if (!result.success) {
        setActionError(result.error ?? "Action failed. Please try again.");
      }
    });
  }

  function openRcDialog(task: TaskRow) {
    setFeedback("");
    setRcDialog({ taskId: task.id, taskTitle: task.title });
  }

  async function handleOpenView(taskId: string) {
    setViewTaskId(taskId);
    setViewTask(null);
    setViewLoading(true);
    setActionError(null);
    try {
      const { task, error } = await getTaskDetail(taskId);
      if (error || !task) {
        setActionError(error ?? "Could not load task details.");
        setViewTaskId(null);
      } else {
        setViewTask(task);
      }
    } catch {
      setActionError("Network error — could not load task details.");
      setViewTaskId(null);
    } finally {
      setViewLoading(false);
    }
  }

  function closeViewPanel() {
    setViewTaskId(null);
    setViewTask(null);
    setViewLoading(false);
  }

  function confirmRequestChanges() {
    if (!rcDialog || !feedback.trim()) return;
    setActionError(null);
    startFeedbackTransition(async () => {
      updateOptimisticTasks({ taskId: rcDialog.taskId, status: "needs_revisions" });
      const result = await requestChanges({ taskId: rcDialog.taskId, feedbackText: feedback.trim() });
      if (!result.success) setActionError(result.error ?? "Action failed. Please try again.");
      setRcDialog(null);
      setFeedback("");
    });
  }

  return (
    <>
      {fetchError && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Database not connected</p>
            <p className="mt-0.5 text-amber-700">{fetchError}</p>
          </div>
        </div>
      )}
      {actionError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Action failed</p>
            <p className="mt-0.5">{actionError}</p>
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {STATUS_FILTER_OPTIONS.map(({ label, value }) => {
          const count    = counts[value] ?? 0;
          const isActive = statusFilter === value;
          return (
            <button
              key={value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tasks table */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {statusFilter === "all" ? "No tasks yet" : `No ${statusFilter.replace(/_/g, " ")} tasks`}
          </p>
          {statusFilter === "all" && (
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/content">
                <Sparkles className="h-4 w-4" />
                Generate your first draft
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm" aria-label="Tasks">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Task</th>
                <th className="hidden py-3 px-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">Type</th>
                <th className="hidden py-3 px-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">Ver.</th>
                <th className="py-3 px-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="hidden py-3 px-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">Updated</th>
                <th className="py-3 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.map((task) => (
                <TaskTableRow
                  key={task.id}
                  task={task}
                  onApprove={() => handleStatusChange(task.id, "approved")}
                  onRequestChanges={() => openRcDialog(task)}
                  onSubmit={() => handleStatusChange(task.id, "pending_approval")}
                  onView={() => handleOpenView(task.id)}
                  isApproving={approvingId === task.id}
                  isSubmitting={submittingId === task.id}
                  approveSuccess={approveSuccessId === task.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Changes Dialog */}
      <Dialog open={!!rcDialog} onOpenChange={(open) => { if (!open) setRcDialog(null); }}>
        <DialogContent className="sm:max-w-lg z-[60]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareDiff className="h-5 w-5 text-orange-500" />
              Request Changes
            </DialogTitle>
            <DialogDescription>
              Describe what needs to be revised on &ldquo;{rcDialog?.taskTitle}&rdquo;. The author will see this as a feedback banner when they open the task.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. The opening paragraph needs a stronger hook. Please reference the Q2 campaign metrics and adjust the tone to be more confident."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={5}
            className="resize-none"
            aria-label="Feedback for revision"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRcDialog(null)} disabled={isFeedbackPending}>
              Cancel
            </Button>
            <Button
              onClick={confirmRequestChanges}
              disabled={isFeedbackPending || !feedback.trim()}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {isFeedbackPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <MessageSquareDiff className="h-4 w-4" />}
              Send Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task detail slide-over panel */}
      <TaskViewPanel
        open={!!viewTaskId}
        loading={viewLoading}
        task={viewTask}
        onClose={closeViewPanel}
      />
    </>
  );
}

function taskContentPreview(task: TaskDetail): string {
  if (task.content_draft) {
    return (
      task.content_draft.edited_body ??
      task.content_draft.generated_body ??
      task.content_draft.bullet_points ??
      ""
    );
  }
  return task.description ?? "No content available for this task.";
}

function TaskViewPanel({
  open,
  loading,
  task,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  task: TaskDetail | null;
  onClose: () => void;
}) {
  if (!open) return null;

  const preview = task ? taskContentPreview(task) : "";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Task detail preview"
        className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="min-w-0 pr-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Asset Preview
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-slate-900">
              {task?.title ?? "Loading…"}
            </h2>
            {task && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <StatusBadge status={task.status} />
                <span>v{task.version}</span>
                {task.content_draft && (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-600">
                    {task.content_draft.type === "press_release" ? "Press Release" : "Social Post"}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close preview"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#0087DC]" />
              <p className="text-sm text-slate-500">Loading asset details…</p>
            </div>
          ) : task ? (
            <div className="space-y-4">
              {task.latest_feedback && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-orange-600">
                    Revision Feedback
                  </p>
                  {task.latest_feedback}
                </div>
              )}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Document Content
                </p>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
                  {preview || "No document body on file."}
                </pre>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {task && (
          <div className="shrink-0 border-t border-slate-100 px-6 py-4">
            <Button asChild className="w-full">
              <Link href={`/tasks/${task.id}`}>
                Open Full Task
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function TaskTableRow({
  task,
  onApprove,
  onRequestChanges,
  onSubmit,
  onView,
  isApproving,
  isSubmitting,
  approveSuccess,
}: {
  task: TaskRow;
  onApprove: () => void;
  onRequestChanges: () => void;
  onSubmit: () => void;
  onView: () => void;
  isApproving: boolean;
  isSubmitting: boolean;
  approveSuccess: boolean;
}) {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <tr className="group hover:bg-muted/30 transition-colors">
      <td className="py-3.5 pl-4 pr-3">
        <div className="max-w-[240px]">
          <Link href={`/tasks/${task.id}`} className="truncate font-medium text-foreground hover:text-primary hover:underline block">
            {task.title}
          </Link>
          {task.rejection_reason && task.status === "needs_revisions" && (
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="mt-0.5 flex items-center gap-1 text-xs text-orange-600 hover:underline"
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", showFeedback && "rotate-180")} />
              {showFeedback ? "Hide feedback" : "View feedback"}
            </button>
          )}
          {showFeedback && task.rejection_reason && (
            <p className="mt-1.5 rounded-md bg-orange-50 p-2 text-xs text-orange-700 border border-orange-100">
              {task.rejection_reason}
            </p>
          )}
          {task.rejection_reason && task.status === "rejected" && (
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="mt-0.5 flex items-center gap-1 text-xs text-destructive hover:underline"
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", showFeedback && "rotate-180")} />
              {showFeedback ? "Hide reason" : "View rejection reason"}
            </button>
          )}
          {showFeedback && task.rejection_reason && task.status === "rejected" && (
            <p className="mt-1.5 rounded-md bg-red-50 p-2 text-xs text-red-700 border border-red-100">
              {task.rejection_reason}
            </p>
          )}
        </div>
      </td>

      <td className="hidden py-3.5 px-3 md:table-cell">
        <TypeLabel type={task.type} contentDraftType={task.content_draft_type} />
      </td>

      <td className="hidden py-3.5 px-3 lg:table-cell">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          v{task.version ?? 1}
        </span>
      </td>

      <td className="py-3.5 px-3">
        <StatusBadge status={task.status} />
      </td>

      <td className="hidden py-3.5 px-3 lg:table-cell">
        <span className="text-xs text-muted-foreground">{formatRelativeTime(task.updated_at)}</span>
      </td>

      <td className="relative z-10 py-3.5 pl-3 pr-4 text-right">
        <ActionButtons
          status={task.status}
          onApprove={onApprove}
          onRequestChanges={onRequestChanges}
          onSubmit={onSubmit}
          onView={onView}
          taskId={task.id}
          isApproving={isApproving}
          isSubmitting={isSubmitting}
          approveSuccess={approveSuccess}
        />
      </td>
    </tr>
  );
}

function ActionButtons({
  status,
  onApprove,
  onRequestChanges,
  onSubmit,
  onView,
  taskId,
  isApproving,
  isSubmitting,
  approveSuccess,
}: {
  status: TaskStatus;
  onApprove: () => void;
  onRequestChanges: () => void;
  onSubmit: () => void;
  onView: () => void;
  taskId: string;
  isApproving: boolean;
  isSubmitting: boolean;
  approveSuccess: boolean;
}) {
  const busy = isApproving || isSubmitting;

  if (approveSuccess) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#a7d33f]/50 bg-[#a7d33f]/15 px-3 py-1.5 text-xs font-semibold text-[#3d6b0e]">
        <CheckCircle2 className="h-3.5 w-3.5 text-[#a7d33f]" />
        Approved
      </div>
    );
  }

  if (status === "draft") {
    return (
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onView}
          className="text-xs"
        >
          <Eye className="h-3 w-3" />
          View
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSubmit}
          disabled={busy}
          className="text-xs"
        >
          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <SendHorizonal className="h-3 w-3" />}
          Submit
        </Button>
      </div>
    );
  }

  if (status === "pending_approval") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onView}
          className="text-xs text-slate-600"
        >
          <Eye className="h-3 w-3" />
          View
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRequestChanges}
          disabled={busy}
          className="border-orange-200 text-orange-600 hover:bg-orange-50 text-xs"
        >
          <MessageSquareDiff className="h-3 w-3" />
          Request Changes
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onApprove}
          disabled={busy}
          className="bg-[#a7d33f] text-[#1a3d00] hover:bg-[#96be38] text-xs font-semibold"
        >
          {isApproving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Approve
        </Button>
      </div>
    );
  }

  if (status === "needs_revisions") {
    return (
      <div className="flex items-center justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onView} className="text-xs">
          <Eye className="h-3 w-3" />
          View
        </Button>
        <Button size="sm" variant="outline" asChild className="text-xs">
          <Link href={`/tasks/${taskId}`}>
            <ArrowRight className="h-3 w-3" />
            Open
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onView}
        className="text-xs"
      >
        <Eye className="h-3 w-3" />
        View
      </Button>
      <Button size="sm" variant="ghost" asChild className="text-xs text-muted-foreground">
        <Link href={`/tasks/${taskId}`}>
          <ArrowRight className="h-3 w-3" />
          Open
        </Link>
      </Button>
    </div>
  );
}
