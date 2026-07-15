"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_DELTA_BUSINESS_UNIT } from "@/lib/content/delta-business-units";
import {
  improveDemoDraft,
  MOCK_OPTIMIZE_DELAY_MS,
} from "@/lib/demo/generate-mock-draft";
import { useOptimizeHighlight } from "@/hooks/use-optimize-highlight";
import { ContentPipelineWorkflow } from "@/components/shared/content-pipeline-workflow";
import { PIPELINE_ASSIGNEES } from "@/lib/demo/content-pipeline-simulator";

/** @deprecated Use PIPELINE_ASSIGNEES from content-pipeline-simulator */
export const REVIEW_HANDOFF_REVIEWERS = PIPELINE_ASSIGNEES.map((person) => ({
  id: person.id,
  name: person.name,
  role: person.role,
}));

export function formatReviewerHandoffLabel(reviewer: {
  name: string;
  role: string;
}): string {
  return `${reviewer.name} — ${reviewer.role}`;
}

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
  readOnly = false,
  showHandoff = true,
  className,
}: DraftReviewWorkflowProps) {
  const [isOptimizing, startOptimize] = useTransition();
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const { triggerHighlight, highlightClassName } = useOptimizeHighlight(1500);

  const wordCount = draftText.trim() ? draftText.trim().split(/\s+/).length : 0;

  function handleOptimize() {
    if (!draftText.trim() || readOnly || isOptimizing) return;
    setOptimizeError(null);
    startOptimize(async () => {
      await new Promise((resolve) => setTimeout(resolve, MOCK_OPTIMIZE_DELAY_MS));
      onDraftChange(improveDemoDraft(draftText, businessUnit));
      triggerHighlight();
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
            {taskTitle ? ` · ${taskTitle}` : ""}
          </span>
        </div>
        <textarea
          value={draftText}
          onChange={(e) => onDraftChange(e.target.value)}
          readOnly={readOnly}
          rows={12}
          className={cn(
            "w-full resize-y border-0 bg-white px-5 py-4 font-mono text-[13px] leading-relaxed text-slate-700 outline-none focus:ring-0",
            readOnly && "bg-slate-50 text-slate-600",
            highlightClassName
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

      {showHandoff && !readOnly && (
        <ContentPipelineWorkflow
          draftText={draftText}
          onDraftChange={onDraftChange}
          title={taskTitle}
          businessUnit={businessUnit}
        />
      )}
    </div>
  );
}
