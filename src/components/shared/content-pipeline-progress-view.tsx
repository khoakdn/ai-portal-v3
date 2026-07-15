"use client";

import { useState, useTransition } from "react";
import { Archive, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getPipelineAssignee,
  pipelineStatusLabel,
  type PipelineStepStatus,
} from "@/lib/demo/content-pipeline-simulator";
import {
  formatDeadlineDateTime,
  getAssigneeInitials,
  type PipelineFeedbackEntry,
} from "@/lib/demo/pipeline-tracking";
import type { SocialPlatform } from "@/lib/demo/social-media-formats";
import { usePressReleasePipeline } from "@/hooks/use-press-release-pipeline";
import { useOptimizeHighlight } from "@/hooks/use-optimize-highlight";
import { PressReleaseReadonlyCanvas } from "@/components/shared/press-release-readonly-canvas";
import { SocialPostPreview } from "@/components/shared/social-post-preview";

function StatusBadge({ status }: { status: PipelineStepStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        status === "approved" && "bg-emerald-50 text-emerald-700",
        status === "feedback_provided" && "bg-amber-50 text-amber-700",
        (status === "pending" || status === "pending_final" || status === "processing") &&
          "bg-slate-100 text-slate-600"
      )}
    >
      {pipelineStatusLabel(status)}
    </span>
  );
}

function DeadlineBadge({ dueAt }: { dueAt: number | null }) {
  if (!dueAt) return null;
  return (
    <span className="mt-2 inline-flex text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
      Deadline: {formatDeadlineDateTime(dueAt)}
    </span>
  );
}

function ActionLogLine({
  icon,
  label,
  timestamp,
  tone = "neutral",
}: {
  icon: string;
  label: string;
  timestamp: string;
  tone?: "neutral" | "success";
}) {
  return (
    <p
      className={cn(
        "mt-2 text-xs italic",
        tone === "success" ? "text-emerald-700/90" : "text-slate-500"
      )}
    >
      {icon} {label} on {timestamp}
    </p>
  );
}

function FeedbackLogCard({
  entry,
  managerFirstName,
  isHistorical,
  isApplyingFix,
  draftLocked,
  onToggle,
  onApplyFix,
}: {
  entry: PipelineFeedbackEntry;
  managerFirstName: string;
  isHistorical: boolean;
  isApplyingFix: boolean;
  draftLocked: boolean;
  onToggle: () => void;
  onApplyFix: () => void;
}) {
  return (
    <div className="mt-4 ml-[52px]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-left text-sm font-medium text-amber-900 transition hover:bg-amber-50"
      >
        <span>💬 View Feedback Details</span>
        <span className="flex items-center gap-2">
          {entry.resolved && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Resolved
            </span>
          )}
          {entry.expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
        </span>
      </button>

      {entry.expanded && (
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0087DC]/10 text-xs font-bold text-[#0087DC]">
              {getAssigneeInitials(entry.assigneeName)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{entry.assigneeName}</p>
              <p className="text-[11px] text-slate-500">Feedback Role · {entry.providedAt}</p>
            </div>
          </div>

          <div className="space-y-3 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Feedback
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{entry.message}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Audit History
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{entry.auditNote}</p>
            </div>

            {entry.resolved && entry.resolvedAt && (
              <p className="text-xs italic text-emerald-700">
                ✅ Fix applied &amp; resubmitted on {entry.resolvedAt}
              </p>
            )}

            {!isHistorical && !entry.resolved && (
              <Button
                type="button"
                size="sm"
                onClick={onApplyFix}
                disabled={isApplyingFix || draftLocked}
                className="w-full bg-[#0087DC] hover:bg-[#0076c0]"
              >
                {isApplyingFix ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying fix…
                  </>
                ) : (
                  <>⚡ Apply Fix &amp; Send to {managerFirstName}</>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ContentPipelineProgressViewProps {
  onDraftChange?: (value: string) => void;
  onSocialCopiesChange?: (copies: Record<SocialPlatform, string>) => void;
  className?: string;
}

export function ContentPipelineProgressView({
  onDraftChange,
  onSocialCopiesChange,
  className,
}: ContentPipelineProgressViewProps) {
  const {
    state,
    isHistorical,
    applyFixAndSendToManager,
    completeProcess,
    toggleFeedbackLogEntry,
  } = usePressReleasePipeline();
  const { triggerHighlight, highlightClassName } = useOptimizeHighlight(1500);
  const [isApplyingFix, startApplyFix] = useTransition();
  const [isCompleting, startComplete] = useTransition();
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>(
    state.socialPlatform ?? "linkedin"
  );

  const isSocial = state.taskType === "Social Media Post";
  const reviewer = getPipelineAssignee(state.reviewerId);
  const manager = getPipelineAssignee(state.managerId);
  const managerFirstName = manager.name.split(" ")[0];
  const reviewerFeedbackEntry = state.feedbackLog.find((entry) => entry.step === "reviewer");

  function handleApplyFix() {
    if (isApplyingFix || state.reviewerStatus !== "feedback_provided" || isHistorical) return;
    startApplyFix(() => {
      applyFixAndSendToManager((fixed) => {
        onDraftChange?.(fixed);
        if (isSocial && state.socialCopies) {
          const platform = state.socialPlatform ?? previewPlatform;
          onSocialCopiesChange?.({ ...state.socialCopies, [platform]: fixed });
        }
        triggerHighlight();
      });
    });
  }

  function handleComplete() {
    if (isCompleting || isHistorical) return;
    startComplete(() => completeProcess());
  }

  const socialBody = state.socialCopies?.[previewPlatform] ?? state.draftText;

  return (
    <div className={cn("grid grid-cols-1 gap-6 lg:grid-cols-2", className)}>
      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#005a94]">
            {isSocial ? "Social Draft Workspace" : "PR Version Canvas"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {isHistorical
              ? "Approved record — read-only historical reference."
              : isSocial
                ? "Premium feed mockup synced across studios and the Task Pipeline Board."
                : "Live draft synced across studios and the Task Pipeline Board."}
          </p>
        </div>

        {isSocial ? (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewPlatform("linkedin")}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                  previewPlatform === "linkedin"
                    ? "border-[#0A66C2]/40 bg-[#E7F3FF] text-[#0A66C2]"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                )}
              >
                🔗 LinkedIn
              </button>
              <button
                type="button"
                onClick={() => setPreviewPlatform("instagram")}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                  previewPlatform === "instagram"
                    ? "border-pink-300/50 bg-pink-50 text-pink-600"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                )}
              >
                📸 Instagram
              </button>
            </div>
            <SocialPostPreview
              platform={previewPlatform}
              body={socialBody}
              highlightClassName={highlightClassName}
            />
          </>
        ) : (
          <PressReleaseReadonlyCanvas
            title={state.title}
            body={state.draftText}
            highlightClassName={highlightClassName}
          />
        )}

        {isHistorical && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <Archive className="h-4 w-4 shrink-0" />
            Completed workflow — this version is locked for audit reference.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#005a94]">
            Workflow Progress Tracker
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {isHistorical
              ? "Final approval snapshot for this campaign."
              : "Interactive approval simulation across your configured stakeholder route."}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-[#0087DC]/10 to-white px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#005a94]">
              Content Lifecycle Process Tracker
            </p>
            {state.taskType && (
              <p className="mt-1 text-xs text-slate-500">{state.taskType}</p>
            )}
          </div>

          <div className="p-5">
            <ol className="relative space-y-0">
              {[reviewer, manager].map((person, index) => {
                const isReviewer = index === 0;
                const status = isReviewer ? state.reviewerStatus : state.managerStatus;
                const dueAt = isReviewer ? state.reviewerDueAt : state.managerApprovalDueAt;

                return (
                  <li
                    key={person.id}
                    className={cn(
                      "relative flex flex-col pb-8 last:pb-0",
                      index === 0 &&
                        "before:absolute before:left-5 before:top-10 before:h-[calc(100%-2.5rem)] before:w-0.5 before:bg-slate-200"
                    )}
                  >
                    <div className="relative z-10 flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                          status === "approved"
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : status === "feedback_provided"
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : "border-[#0087DC]/30 bg-[#0087DC]/10 text-[#0087DC]"
                        )}
                      >
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{person.name}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-[#0087DC]">
                          {person.roleTag}
                        </p>
                        <DeadlineBadge dueAt={dueAt} />
                        <div className="mt-2">
                          <StatusBadge status={status} />
                        </div>

                        {isReviewer && state.feedbackProvidedAt && (
                          <ActionLogLine
                            icon="💬"
                            label="Feedback submitted"
                            timestamp={state.feedbackProvidedAt}
                          />
                        )}

                        {isReviewer && state.reviewerApprovedAt && (
                          <ActionLogLine
                            icon="✅"
                            label="Fix applied & resubmitted"
                            timestamp={state.reviewerApprovedAt}
                            tone="success"
                          />
                        )}

                        {!isReviewer && state.managerApprovedAt && (
                          <ActionLogLine
                            icon="✅"
                            label="Approved"
                            timestamp={state.managerApprovedAt}
                            tone="success"
                          />
                        )}

                        {!isReviewer && state.completedAt && (
                          <ActionLogLine
                            icon="🎉"
                            label="Process completed"
                            timestamp={state.completedAt}
                            tone="success"
                          />
                        )}
                      </div>
                    </div>

                    {isReviewer && reviewerFeedbackEntry && (
                      <FeedbackLogCard
                        entry={reviewerFeedbackEntry}
                        managerFirstName={managerFirstName}
                        isHistorical={isHistorical}
                        isApplyingFix={isApplyingFix}
                        draftLocked={state.draftLocked}
                        onToggle={() => toggleFeedbackLogEntry(reviewerFeedbackEntry.id)}
                        onApplyFix={handleApplyFix}
                      />
                    )}
                  </li>
                );
              })}
            </ol>

            {state.showCompleteButton && !isHistorical && (
              <Button
                type="button"
                onClick={handleComplete}
                disabled={isCompleting}
                className="mt-6 w-full border border-emerald-300 bg-emerald-50 font-semibold text-emerald-800 shadow-sm shadow-emerald-100 hover:bg-emerald-100"
                size="lg"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing…
                  </>
                ) : (
                  <>🎉 Approve &amp; Complete Process</>
                )}
              </Button>
            )}

            {isHistorical && (
              <p
                role="status"
                className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
              >
                ✅ Approved — process complete and locked for reference.
                {state.completedAt && (
                  <span className="mt-1 block text-xs italic text-emerald-700/90">
                    Completed on {state.completedAt}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
