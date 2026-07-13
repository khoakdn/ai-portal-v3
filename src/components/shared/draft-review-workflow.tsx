"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  UserCheck,
} from "lucide-react";
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
import { createBasecampTodoFromClient } from "@/lib/integrations/create-basecamp-todo-client";
import {
  DELTA_BUSINESS_UNITS,
  DEFAULT_DELTA_BUSINESS_UNIT,
} from "@/lib/content/delta-business-units";
import {
  REVIEWER_FEEDBACK_MESSAGE,
  applyReviewerFeedbackFix,
  improveDemoDraft,
  MOCK_OPTIMIZE_DELAY_MS,
} from "@/lib/demo/generate-mock-draft";
import { useReviewerNotification } from "@/contexts/reviewer-notification-context";
import { useRegisterReviewerApplyFix } from "@/hooks/use-register-reviewer-apply-fix";

export const REVIEW_HANDOFF_REVIEWERS = [
  { id: "bilyana", name: "Bilyana Mihova" },
  { id: "denise", name: "Denise Futterer" },
  { id: "maggie", name: "Maggie Weng" },
] as const;

interface DraftReviewWorkflowProps {
  draftText: string;
  onDraftChange: (value: string) => void;
  taskTitle: string;
  businessUnit?: string;
  contentPrefix?: string;
  readOnly?: boolean;
  showHandoff?: boolean;
  className?: string;
}

export function DraftReviewWorkflow({
  draftText,
  onDraftChange,
  taskTitle,
  businessUnit = DEFAULT_DELTA_BUSINESS_UNIT,
  contentPrefix = "Review Press Release Draft:",
  readOnly = false,
  showHandoff = true,
  className,
}: DraftReviewWorkflowProps) {
  const [isOptimizing, startOptimize] = useTransition();
  const [isAssigning, startAssign] = useTransition();
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [basecampUrl, setBasecampUrl] = useState<string | null>(null);
  const [todoId, setTodoId] = useState<number | null>(null);
  const [selectedReviewer, setSelectedReviewer] = useState<string>(
    REVIEW_HANDOFF_REVIEWERS[0].id
  );
  const { addNotification } = useReviewerNotification();
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useRegisterReviewerApplyFix(() => {
    if (!draftText.trim() || readOnly) return;
    onDraftChange(applyReviewerFeedbackFix(draftText, businessUnit));
  }, !readOnly);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const wordCount = draftText.trim() ? draftText.trim().split(/\s+/).length : 0;
  const reviewerName =
    REVIEW_HANDOFF_REVIEWERS.find((r) => r.id === selectedReviewer)?.name ??
    REVIEW_HANDOFF_REVIEWERS[0].name;

  function handleOptimize() {
    if (!draftText.trim() || readOnly || isOptimizing) return;
    setOptimizeError(null);
    startOptimize(async () => {
      await new Promise((resolve) => setTimeout(resolve, MOCK_OPTIMIZE_DELAY_MS));
      onDraftChange(improveDemoDraft(draftText, businessUnit));
    });
  }

  function handleAssign() {
    if (!draftText.trim() || !taskTitle.trim()) {
      setAssignError("Draft content is required before assigning for review.");
      return;
    }

    setAssignError(null);
    setAssignSuccess(false);
    startAssign(async () => {
      try {
        const data = await createBasecampTodoFromClient({
          title: taskTitle.trim(),
          draftText,
          businessUnit,
          contentPrefix: `${contentPrefix} (Reviewer: ${reviewerName})`,
        });

        if (!data.success) {
          setAssignError(data.error ?? "Basecamp sync failed. Please try again.");
          return;
        }

        setAssignSuccess(true);
        setTodoId(data.todoId ?? null);
        setBasecampUrl(data.appUrl ?? null);

        const selectedAssignee = reviewerName;
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
          addNotification({
            sender: selectedAssignee || "Bilyana Mihova",
            message: REVIEWER_FEEDBACK_MESSAGE,
          });
        }, 4000);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error";
        setAssignError(message);
      }
    });
  }

  return (
    <div className={cn("animate-fade-in space-y-4", className)}>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0087DC] text-[11px] font-bold text-white">
              ✓
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Generated Draft</h3>
          </div>
          <span className="text-xs text-slate-400">
            {wordCount} words · {readOnly ? "read-only" : "editable"}
          </span>
        </div>
        <textarea
          value={draftText}
          onChange={(e) => onDraftChange(e.target.value)}
          readOnly={readOnly}
          rows={12}
          className={cn(
            "w-full resize-y border-0 bg-white px-5 py-4 font-mono text-[13px] leading-relaxed text-slate-700 outline-none focus:ring-0",
            readOnly && "bg-slate-50 text-slate-600"
          )}
          aria-label="Generated draft preview"
        />
      </div>

      {!readOnly && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handleOptimize}
            disabled={isOptimizing || !draftText.trim()}
            className="w-full border-[#0087DC]/30 text-[#005a94] hover:bg-[#0087DC]/5"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing placeholders…
              </>
            ) : (
              <>✨ Optimize with AI</>
            )}
          </Button>

          {optimizeError && (
            <div
              className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {optimizeError}
            </div>
          )}
        </>
      )}

      {showHandoff && (
        <div className="rounded-2xl border border-[#a7d33f]/40 bg-gradient-to-br from-[#a7d33f]/8 to-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#5a8a14]">
            Forward Draft for Verification
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Route this draft to a communications reviewer. Edit the text above before
            assigning.
          </p>

          <div className="mt-4 space-y-2">
            <Label htmlFor="reviewer-handoff-select">Assign reviewer</Label>
            <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
              <SelectTrigger id="reviewer-handoff-select">
                <SelectValue placeholder="Select reviewer" />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_HANDOFF_REVIEWERS.map((reviewer) => (
                  <SelectItem key={reviewer.id} value={reviewer.id}>
                    {reviewer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {assignSuccess ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#a7d33f]/50 bg-[#a7d33f]/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#3d6b0e]" />
              <div>
                <p className="text-sm font-semibold text-[#3d6b0e]">
                  Task Dispatched — assigned to {reviewerName} on Basecamp!
                </p>
                <p className="mt-0.5 text-xs text-[#5a8a14]">
                  {todoId ? `Todo #${todoId} · push notification sent` : "Review task created successfully"}
                </p>
                {basecampUrl && (
                  <a
                    href={basecampUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0087DC] hover:underline"
                  >
                    View in Basecamp
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleAssign}
              disabled={isAssigning || !draftText.trim()}
              className={cn(
                "mt-4 w-full font-semibold text-white shadow-sm",
                "bg-[#a7d33f] hover:bg-[#96bc38] text-[#2d4a0a]"
              )}
              size="lg"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning to Basecamp…
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Assign for Review
                </>
              )}
            </Button>
          )}

          {assignError && !assignSuccess && (
            <div
              className="mt-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {assignError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
