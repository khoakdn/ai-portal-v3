"use client";

import { useState, useTransition, useOptimistic } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  FileEdit,
  FileText,
  Loader2,
  MessageSquare,
  MessageSquareDiff,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { requestChanges } from "@/actions/tasks/request-changes";
import { resubmitTask } from "@/actions/tasks/resubmit-task";
import { updateTaskStatus } from "@/actions/tasks/update-task-status";
import { assignTask } from "@/actions/tasks/assign-task";
import type { TaskDetail } from "@/actions/tasks/get-task-detail";
import type { TaskActivity, TaskStatus } from "@/types/database";
import { TEAM_MEMBERS, getMemberById, type TeamMember } from "@/lib/team";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

// ─────────────────────────────────────────────────────────────────────────────
// Status pill
// ─────────────────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: TaskStatus }) {
  const config: Record<TaskStatus, { label: string; cls: string }> = {
    draft:            { label: "Draft",            cls: "bg-slate-100 text-slate-700 border-slate-200" },
    pending_approval: { label: "Pending Approval", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    approved:         { label: "Approved",         cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected:         { label: "Rejected",         cls: "bg-rose-50 text-rose-700 border-rose-200" },
    needs_revisions:  { label: "Needs Revisions",  cls: "bg-orange-50 text-orange-700 border-orange-200" },
  };
  const { label, cls } = config[status];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", cls)}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignees panel
// ─────────────────────────────────────────────────────────────────────────────

function AssigneesPanel({
  taskId,
  initialAssigneeId,
}: {
  taskId: string;
  initialAssigneeId: string | null;
}) {
  // Map initial assigneeId to a mock team member if it exists, else null
  const initialMember = initialAssigneeId
    ? getMemberById(initialAssigneeId) ?? null
    : null;

  const [selected, setSelected]       = useState<TeamMember | null>(initialMember);
  const [open, setOpen]               = useState(false);
  const [isPending, startTransition]  = useTransition();

  function handleSelect(member: TeamMember) {
    if (selected?.id === member.id) {
      // Unassign
      setSelected(null);
      setOpen(false);
      startTransition(async () => {
        await assignTask({ taskId, assigneeId: null, assigneeName: null });
      });
    } else {
      setSelected(member);
      setOpen(false);
      startTransition(async () => {
        await assignTask({ taskId, assigneeId: member.id, assigneeName: member.name });
      });
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Assignee
      </p>

      {selected ? (
        <div className="flex items-center gap-2.5">
          <Avatar className={cn("h-7 w-7 ring-2 ring-white", selected.color)}>
            <AvatarFallback className={cn("text-[10px] font-bold text-white", selected.color)}>
              {selected.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{selected.name}</p>
            <p className="text-xs text-slate-400">{selected.role}</p>
          </div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Change assignee"
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
              </button>
            </PopoverTrigger>
            <AssigneePickerContent
              selected={selected}
              onSelect={handleSelect}
            />
          </Popover>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              disabled={isPending}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
            >
              {isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <UserPlus className="h-4 w-4" />}
              Assign to…
            </button>
          </PopoverTrigger>
          <AssigneePickerContent selected={null} onSelect={handleSelect} />
        </Popover>
      )}
    </div>
  );
}

function AssigneePickerContent({
  selected,
  onSelect,
}: {
  selected: TeamMember | null;
  onSelect: (m: TeamMember) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = TEAM_MEMBERS.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.role.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <PopoverContent align="start" className="p-0">
      {/* Search input */}
      <div className="border-b border-slate-100 px-3 py-2.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search team…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          autoFocus
        />
      </div>

      {/* Member list */}
      <ul className="max-h-52 overflow-y-auto py-1.5">
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-xs text-slate-400">No results</li>
        )}
        {filtered.map((member) => {
          const isSelected = selected?.id === member.id;
          return (
            <li key={member.id}>
              <button
                onClick={() => onSelect(member)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
              >
                <Avatar className={cn("h-7 w-7", member.color)}>
                  <AvatarFallback className={cn("text-[10px] font-bold text-white", member.color)}>
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{member.name}</p>
                  <p className="truncate text-xs text-slate-400">{member.role}</p>
                </div>
                {isSelected && <Check className="h-4 w-4 text-indigo-500 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
    </PopoverContent>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Stepper
// ─────────────────────────────────────────────────────────────────────────────

type PipelineStep = "drafted" | "in_review" | "changes_requested" | "approved" | "rejected";

interface StepConfig {
  key: PipelineStep;
  label: string;
  completedCls: string;
  activeCls: string;
}

const PIPELINE_STEPS: StepConfig[] = [
  { key: "drafted",           label: "Drafted",            completedCls: "bg-indigo-500 border-indigo-500",   activeCls: "border-indigo-500 bg-white text-indigo-600" },
  { key: "in_review",         label: "In Review",          completedCls: "bg-indigo-500 border-indigo-500",   activeCls: "border-indigo-500 bg-white text-indigo-600" },
  { key: "changes_requested", label: "Changes Requested",  completedCls: "bg-orange-400 border-orange-400",   activeCls: "border-orange-400 bg-white text-orange-600" },
  { key: "approved",          label: "Approved",           completedCls: "bg-emerald-500 border-emerald-500", activeCls: "border-emerald-500 bg-white text-emerald-600" },
];

const REJECTED_STEP: StepConfig = {
  key: "rejected", label: "Rejected", completedCls: "bg-rose-500 border-rose-500", activeCls: "border-rose-500 bg-white text-rose-600"
};

function statusToPipeline(
  status: TaskStatus,
  hadRevisions: boolean
): { steps: StepConfig[]; activeKey: PipelineStep } {
  const steps: StepConfig[] = [
    PIPELINE_STEPS[0], // drafted
    PIPELINE_STEPS[1], // in_review
    ...(hadRevisions || status === "needs_revisions" ? [PIPELINE_STEPS[2]] : []),
    PIPELINE_STEPS[3], // approved
  ];

  if (status === "rejected") {
    return { steps: [...steps.slice(0, -1), REJECTED_STEP], activeKey: "rejected" };
  }

  const activeKey: PipelineStep =
    status === "draft"            ? "drafted" :
    status === "pending_approval" ? "in_review" :
    status === "needs_revisions"  ? "changes_requested" :
    status === "approved"         ? "approved" : "drafted";

  return { steps, activeKey };
}

function PipelineStepper({
  status,
  activity,
}: {
  status: TaskStatus;
  activity: TaskActivity[];
}) {
  const hadRevisions = activity.some((a) => a.action === "changes_requested");
  const { steps, activeKey } = statusToPipeline(status, hadRevisions);

  let passedActive = false;

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Pipeline
      </p>
      <ol className="space-y-0">
        {steps.map((step, idx) => {
          const isActive    = step.key === activeKey;
          const isCompleted = !passedActive && !isActive;
          if (isActive) passedActive = true;
          const isFuture    = passedActive && !isActive && idx > steps.findIndex((s) => s.key === activeKey);
          const isLast      = idx === steps.length - 1;

          return (
            <li key={step.key} className="flex gap-3">
              {/* Icon column */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                    isCompleted
                      ? cn(step.completedCls, "text-white")
                      : isActive
                        ? cn(step.activeCls, "ring-2 ring-offset-1 ring-indigo-200")
                        : "border-slate-200 bg-white text-slate-300"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-px flex-1 transition-colors",
                      isCompleted ? "bg-indigo-300" : "bg-slate-200"
                    )}
                    style={{ minHeight: "20px" }}
                  />
                )}
              </div>

              {/* Label */}
              <div className={cn("pb-4 pt-0.5", isLast && "pb-0")}>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted ? "text-slate-500" :
                    isActive    ? "text-slate-900" :
                                  "text-slate-300"
                  )}
                >
                  {step.label}
                </p>
                {isActive && (
                  <p className="mt-0.5 text-xs text-slate-400">Current step</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Timeline (border-l design)
// ─────────────────────────────────────────────────────────────────────────────

function actionIcon(action: TaskActivity["action"]): React.ElementType {
  const map: Record<TaskActivity["action"], React.ElementType> = {
    draft_saved:       FileText,
    submitted:         Send,
    approved:          Check,
    rejected:          XCircle,
    changes_requested: MessageSquare,
    resubmitted:       FileEdit,
    assigned:          UserPlus,
  };
  return map[action] ?? Plus;
}

function actionIconBg(action: TaskActivity["action"]): string {
  const map: Record<TaskActivity["action"], string> = {
    draft_saved:       "bg-slate-100 text-slate-500 border-slate-200",
    submitted:         "bg-blue-50 text-blue-500 border-blue-200",
    approved:          "bg-emerald-50 text-emerald-600 border-emerald-200",
    rejected:          "bg-rose-50 text-rose-500 border-rose-200",
    changes_requested: "bg-orange-50 text-orange-500 border-orange-200",
    resubmitted:       "bg-indigo-50 text-indigo-500 border-indigo-200",
    assigned:          "bg-violet-50 text-violet-500 border-violet-200",
  };
  return map[action] ?? "bg-slate-100 text-slate-500 border-slate-200";
}

function actionLabel(entry: TaskActivity): string {
  const actor = entry.actor_name ? `${entry.actor_name}` : "Someone";
  switch (entry.action) {
    case "draft_saved":       return `${actor} saved a draft`;
    case "submitted":         return `${actor} submitted for review`;
    case "approved":          return `${actor} approved this`;
    case "rejected":          return `${actor} rejected this`;
    case "changes_requested": return `${actor} requested changes`;
    case "resubmitted":       return `${actor} submitted v${entry.version}`;
    case "assigned":          return entry.feedback_text ?? `${actor} updated the assignee`;
    default:                  return `${actor} updated this`;
  }
}

function ActivityTimeline({
  activity,
}: {
  activity: TaskActivity[];
}) {
  const [snapshotDialog, setSnapshotDialog] = useState<{
    version: number;
    content: string;
    action: string;
  } | null>(null);

  if (activity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center">
        <Clock3 className="mb-2 h-7 w-7 text-slate-300" />
        <p className="text-xs text-slate-400">No activity yet</p>
      </div>
    );
  }

  return (
    <>
      <ul className="relative border-l-2 border-slate-100 pl-5 space-y-5">
        {activity.map((entry) => {
          const Icon = actionIcon(entry.action);
          const iconCls = actionIconBg(entry.action);

          return (
            <li key={entry.id} className="relative">
              {/* Circle icon anchored to the border-l */}
              <span
                className={cn(
                  "absolute -left-[25px] flex h-6 w-6 items-center justify-center rounded-full border-2",
                  iconCls
                )}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
              </span>

              <div className="min-w-0">
                {/* Main line */}
                <p className="text-xs leading-snug text-slate-700">
                  <span className="font-semibold">{actionLabel(entry)}</span>
                </p>

                {/* Timestamp */}
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {formatRelativeTime(entry.created_at)}
                </p>

                {/* Feedback quote */}
                {entry.feedback_text && entry.action !== "assigned" && (
                  <p className="mt-1.5 rounded-md border border-orange-100 bg-orange-50 px-2.5 py-1.5 text-xs italic text-orange-700">
                    &ldquo;{entry.feedback_text}&rdquo;
                  </p>
                )}

                {/* Version badge + snapshot link */}
                {entry.snapshot_content && (
                  <button
                    onClick={() =>
                      setSnapshotDialog({
                        version: entry.version,
                        content: entry.snapshot_content!,
                        action: actionLabel(entry),
                      })
                    }
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-indigo-500 underline-offset-2 hover:underline"
                  >
                    <FileEdit className="h-3 w-3" />
                    View snapshot · v{entry.version}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Snapshot viewer dialog */}
      <Dialog open={!!snapshotDialog} onOpenChange={(open) => !open && setSnapshotDialog(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-indigo-500" />
              Snapshot · v{snapshotDialog?.version}
            </DialogTitle>
            <DialogDescription>
              Read-only document state at the time of: {snapshotDialog?.action}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={snapshotDialog?.content ?? ""}
            readOnly
            rows={14}
            className="resize-none font-mono text-sm bg-slate-50 text-slate-700"
            aria-label="Document snapshot"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapshotDialog(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviewer action bar
// ─────────────────────────────────────────────────────────────────────────────

function ReviewerActionBar({
  taskId,
  onOptimisticUpdate,
}: {
  taskId: string;
  onOptimisticUpdate: (status: TaskStatus) => void;
}) {
  const [rcDialogOpen, setRcDialogOpen] = useState(false);
  const [feedback, setFeedback]         = useState("");
  const [isPending, startTransition]    = useTransition();
  const [error, setError]               = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      onOptimisticUpdate("approved");
      const result = await updateTaskStatus({ taskId, status: "approved" });
      if (!result.success) setError(result.error ?? "Could not approve task.");
    });
  }

  function handleRequestChanges() {
    if (!feedback.trim()) return;
    setError(null);
    startTransition(async () => {
      onOptimisticUpdate("needs_revisions");
      const result = await requestChanges({ taskId, feedbackText: feedback.trim() });
      if (!result.success) {
        setError(result.error ?? "Could not send feedback.");
      } else {
        setRcDialogOpen(false);
        setFeedback("");
      }
    });
  }

  return (
    <>
      {error && (
        <p className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setRcDialogOpen(true)}
          disabled={isPending}
          className="border-orange-200 text-orange-600 hover:bg-orange-50"
        >
          <MessageSquareDiff className="h-4 w-4" />
          Request Changes
        </Button>
        <Button
          onClick={handleApprove}
          disabled={isPending}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Approve
        </Button>
      </div>

      <Dialog open={rcDialogOpen} onOpenChange={(open) => !open && setRcDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareDiff className="h-5 w-5 text-orange-500" />
              Request Changes
            </DialogTitle>
            <DialogDescription>
              Describe exactly what needs to be revised. The author will see this as a highlighted feedback banner.
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
            <Button variant="outline" onClick={() => setRcDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestChanges}
              disabled={isPending || !feedback.trim()}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareDiff className="h-4 w-4" />}
              Send Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Author editor + resubmit
// ─────────────────────────────────────────────────────────────────────────────

function AuthorEditor({
  taskId,
  initialContent,
  currentVersion,
  latestFeedback,
  status,
  onOptimisticUpdate,
}: {
  taskId: string;
  initialContent: string;
  currentVersion: number;
  latestFeedback: string | null;
  status: TaskStatus;
  onOptimisticUpdate: (status: TaskStatus) => void;
}) {
  const [content, setContent]        = useState(initialContent);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess]        = useState(false);
  const [error, setError]            = useState<string | null>(null);

  const nextVersion      = currentVersion + 1;
  const isNeedsRevisions = status === "needs_revisions";

  function handleResubmit() {
    setError(null);
    startTransition(async () => {
      onOptimisticUpdate("pending_approval");
      const result = await resubmitTask({ taskId, content });
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error ?? "Resubmission failed. Please try again.");
        onOptimisticUpdate(status);
      }
    });
  }

  function handleSubmitDraft() {
    setError(null);
    startTransition(async () => {
      onOptimisticUpdate("pending_approval");
      const result = await updateTaskStatus({ taskId, status: "pending_approval" });
      if (!result.success) {
        setError(result.error ?? "Submission failed.");
        onOptimisticUpdate("draft");
      }
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 py-12 text-center">
        <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
        <p className="font-semibold text-emerald-800">Resubmitted for review</p>
        <p className="mt-1 text-sm text-emerald-600">Version {nextVersion} is now pending approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isNeedsRevisions && latestFeedback && (
        <Alert className="border-orange-200 bg-orange-50">
          <MessageSquareDiff className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-800">Revision requested</AlertTitle>
          <AlertDescription className="text-orange-700">{latestFeedback}</AlertDescription>
        </Alert>
      )}
      {error && (
        <p className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>
      )}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        className="resize-none font-mono text-sm leading-relaxed"
        placeholder="Document content…"
        aria-label="Document content editor"
        readOnly={status === "approved" || status === "pending_approval"}
      />
      {(isNeedsRevisions || status === "draft") && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {isNeedsRevisions
              ? `Revising v${currentVersion} — submission will become v${nextVersion}`
              : "Ready to submit for review?"}
          </p>
          {isNeedsRevisions ? (
            <Button onClick={handleResubmit} disabled={isPending || !content.trim()}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Resubmit for Approval (v{nextVersion})
            </Button>
          ) : (
            <Button onClick={handleSubmitDraft} disabled={isPending} variant="outline">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit for Approval
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Right sidebar — assembled
// ─────────────────────────────────────────────────────────────────────────────

function RightSidebar({
  task,
  activity,
  optimisticStatus,
}: {
  task: TaskDetail;
  activity: TaskActivity[];
  optimisticStatus: TaskStatus;
}) {
  return (
    <div className="space-y-px rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden shadow-sm">
      {/* Assignees */}
      <section className="bg-white px-5 pt-5 pb-4">
        <AssigneesPanel taskId={task.id} initialAssigneeId={task.assignee_id} />
      </section>

      <div className="h-px bg-slate-100" />

      {/* Pipeline */}
      <section className="bg-white px-5 pt-5 pb-4">
        <PipelineStepper status={optimisticStatus} activity={activity} />
      </section>

      <div className="h-px bg-slate-100" />

      {/* Activity */}
      <section className="bg-white px-5 pt-5 pb-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          History &amp; Activity
        </p>
        <ActivityTimeline activity={activity} />
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

interface TaskDetailViewProps {
  task: TaskDetail;
  activity: TaskActivity[];
}

export function TaskDetailView({ task, activity }: TaskDetailViewProps) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<TaskStatus>(task.status);

  const currentContent =
    task.content_draft?.edited_body ??
    task.content_draft?.generated_body ??
    task.description ??
    "";

  const isReviewable = optimisticStatus === "pending_approval";
  const isEditable   = optimisticStatus === "draft" || optimisticStatus === "needs_revisions";
  const isTerminal   = optimisticStatus === "approved" || optimisticStatus === "rejected";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link href="/tasks">
            <ArrowLeft className="h-4 w-4" />
            All Tasks
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusPill status={optimisticStatus} />
          <span>·</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">v{task.version}</span>
          <span>·</span>
          <span>Updated {formatRelativeTime(task.updated_at)}</span>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Left: document + actions ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Document</h2>
              {task.type === "content_draft" && task.content_draft && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600">
                  {task.content_draft.type === "press_release" ? "Press Release" : "Social Post"}
                </span>
              )}
            </div>

            {isEditable || isTerminal ? (
              <AuthorEditor
                taskId={task.id}
                initialContent={currentContent}
                currentVersion={task.version}
                latestFeedback={task.latest_feedback}
                status={optimisticStatus}
                onOptimisticUpdate={setOptimisticStatus}
              />
            ) : (
              <Textarea
                value={currentContent}
                readOnly
                rows={20}
                className="resize-none font-mono text-sm leading-relaxed bg-slate-50 text-slate-700"
                aria-label="Document content (read-only)"
              />
            )}
          </div>

          {isReviewable && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">Review Decision</h2>
              <ReviewerActionBar taskId={task.id} onOptimisticUpdate={setOptimisticStatus} />
            </div>
          )}

          {isTerminal && (
            <div className={cn(
              "rounded-2xl border p-5",
              optimisticStatus === "approved"
                ? "border-emerald-200 bg-emerald-50"
                : "border-rose-200 bg-rose-50"
            )}>
              <div className="flex items-center gap-2">
                {optimisticStatus === "approved"
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  : <XCircle className="h-5 w-5 text-rose-600" />}
                <p className={cn("font-semibold",
                  optimisticStatus === "approved" ? "text-emerald-800" : "text-rose-800")}>
                  {optimisticStatus === "approved" ? "Task approved" : "Task rejected"}
                </p>
              </div>
              {task.rejection_reason && (
                <p className="mt-2 text-sm text-rose-700">{task.rejection_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Right: sidebar ──────────────────────────────────────── */}
        <div>
          <RightSidebar
            task={task}
            activity={activity}
            optimisticStatus={optimisticStatus}
          />
        </div>
      </div>
    </div>
  );
}
