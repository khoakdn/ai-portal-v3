"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  requestDraftFromGenerateApi,
} from "@/lib/integrations/request-generate-api";
import { DraftReviewWorkflow } from "@/components/shared/draft-review-workflow";

export function ContentLifecyclePanel() {
  const [formTitle, setFormTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [businessUnit, setBusinessUnit] = useState("Marketing Communications");
  const [draftText, setDraftText] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateDebugPayload, setGenerateDebugPayload] = useState<string | null>(null);

  const [isGenerating, startGenerate] = useTransition();
  const draftPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (draftText && draftPreviewRef.current) {
      draftPreviewRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [draftText]);

  function handleGenerate() {
    setGenerateError(null);
    setGenerateDebugPayload(null);
    setDraftText("");

    if (!formTitle.trim()) {
      setGenerateError("Please enter a title before generating.");
      return;
    }

    startGenerate(async () => {
      try {
        const draft = await requestDraftFromGenerateApi({
          title: formTitle.trim(),
          prType: "product_launch",
          thematicFocus: brief.trim() || "General corporate announcement",
          productDescription: brief.trim(),
          productsToAddress: brief.trim(),
          businessUnit,
          pressReleaseType: "Product Launch",
          region: "EMEA",
          language: "English",
        });

        setDraftText(draft);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error";
        setGenerateError(`Live AI call failed: ${message}`);
      }
    });
  }

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a7d33f] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#a7d33f]" />
          </span>
          <span className="text-[13px] font-semibold text-slate-800">
            Content Lifecycle
          </span>
          <span className="text-[12px] text-slate-300" aria-hidden="true">
            •
          </span>
          <span className="text-[12px] text-slate-500">Generate → Review → Assign</span>
        </div>
        <Link
          href="/my-request/press-release"
          className="text-[11px] font-semibold text-[#0087DC] hover:underline"
        >
          Full Press Release Studio →
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
        {/* Input form */}
        <div className="mb-5 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
          <div>
            <label htmlFor="dashboard-title" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Announcement Title
            </label>
            <input
              id="dashboard-title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Delta launches new industrial power module"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#0087DC] focus:ring-2 focus:ring-[#0087DC]/20"
            />
          </div>

          <div>
            <label htmlFor="dashboard-brief" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Key Points / Brief
            </label>
            <textarea
              id="dashboard-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              placeholder="Summarize the announcement, audience, and core message for the AI agent…"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#0087DC] focus:ring-2 focus:ring-[#0087DC]/20"
            />
          </div>

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-[#0087DC] hover:bg-[#0070b8]"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating press release draft…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate with AI
              </>
            )}
          </Button>

          {isGenerating && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#0087DC]/20 bg-[#0087DC]/5 p-4 text-sm text-[#005a94]">
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              <p>Generating your press release draft…</p>
            </div>
          )}

          {generateError && (
            <div
              className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p>{generateError}</p>
                {generateDebugPayload && (
                  <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-red-200 bg-red-100/40 p-3 text-[10px] font-mono leading-relaxed text-red-900 whitespace-pre-wrap break-all">
                    {generateDebugPayload}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Draft preview */}
        {draftText && (
          <div ref={draftPreviewRef}>
            <DraftReviewWorkflow
              draftText={draftText}
              onDraftChange={setDraftText}
              taskTitle={formTitle.trim() || "Press Release Draft"}
              businessUnit={businessUnit}
            />
          </div>
        )}

        {!draftText && !isGenerating && (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-6 py-10 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-[#0087DC]/40" />
            <p className="text-sm font-medium text-slate-500">
              Your AI-generated draft will appear here instantly
            </p>
            <p className="mt-1 text-xs text-slate-400">
              No copy-paste from Relevance — generate, edit, and assign in one flow
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
