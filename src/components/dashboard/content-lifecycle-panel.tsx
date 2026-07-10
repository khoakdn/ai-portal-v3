"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createBasecampTodoFromClient } from "@/lib/integrations/create-basecamp-todo-client";

export function ContentLifecyclePanel() {
  const [formTitle, setFormTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [businessUnit, setBusinessUnit] = useState("Marketing Communications");
  const [draftText, setDraftText] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateDebugPayload, setGenerateDebugPayload] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [basecampUrl, setBasecampUrl] = useState<string | null>(null);
  const [todoId, setTodoId] = useState<number | null>(null);

  const [isGenerating, startGenerate] = useTransition();
  const [isAssigning, startAssign] = useTransition();
  const draftPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (draftText && draftPreviewRef.current) {
      draftPreviewRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [draftText]);

  function handleGenerate() {
    setGenerateError(null);
    setGenerateDebugPayload(null);
    setAssignError(null);
    setAssignSuccess(false);
    setBasecampUrl(null);
    setTodoId(null);
    setDraftText("");

    if (!formTitle.trim()) {
      setGenerateError("Please enter a title before generating.");
      return;
    }

    startGenerate(async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          cache: "no-store",
          body: JSON.stringify({
            title: formTitle.trim(),
            prType: "product_launch",
            thematicFocus: brief.trim() || "General corporate announcement",
            productDescription: brief.trim(),
            productsToAddress: brief.trim(),
            businessUnit,
            pressReleaseType: "Product Launch",
            region: "EMEA",
            language: "English",
          }),
        });

        const data = (await res.json().catch(() => ({
          success: false,
          error: "Invalid response from server.",
        }))) as {
          success?: boolean;
          draftText?: string;
          error?: string;
          debugPayload?: string;
        };

        if (!res.ok || !data.success || !data.draftText) {
          setGenerateError(
            data.error ??
              `Live AI call failed: HTTP ${res.status}. Check Vercel logs and RELEVANCE_AI_API_KEY.`
          );
          setGenerateDebugPayload(data.debugPayload ?? null);
          return;
        }

        setDraftText(data.draftText);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error";
        setGenerateError(`Live AI call failed: ${message}`);
      }
    });
  }

  function handleAssignToBilyana() {
    setAssignError(null);
    setAssignSuccess(false);

    if (!formTitle.trim() || !draftText.trim()) {
      setAssignError("Generate a draft before assigning for review.");
      return;
    }

    startAssign(async () => {
      try {
        const data = await createBasecampTodoFromClient({
          title: formTitle.trim(),
          draftText,
          businessUnit,
        });

        if (!data.success) {
          setAssignError(data.error ?? "Basecamp sync failed. Please try again.");
          return;
        }

        setAssignSuccess(true);
        setTodoId(data.todoId ?? null);
        setBasecampUrl(data.appUrl ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error";
        setAssignError(message);
      }
    });
  }

  const wordCount = draftText.trim() ? draftText.trim().split(/\s+/).length : 0;

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
                Generating press release draft (up to ~1 min)…
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
              <p>
                Generating your press release draft — the AI agent may take up to a minute while
                capacity is allocated.
              </p>
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
          <div ref={draftPreviewRef} className="animate-fade-in space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0087DC] text-[11px] font-bold text-white">
                    ✓
                  </span>
                  <h3 className="text-sm font-semibold text-slate-800">Generated Draft</h3>
                </div>
                <span className="text-xs text-slate-400">{wordCount} words · editable</span>
              </div>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={12}
                className="w-full resize-y border-0 bg-white px-5 py-4 font-mono text-[13px] leading-relaxed text-slate-700 outline-none focus:ring-0"
                aria-label="Generated draft preview"
              />
            </div>

            {/* Forward for verification */}
            <div className="rounded-2xl border border-[#a7d33f]/40 bg-gradient-to-br from-[#a7d33f]/8 to-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#5a8a14]">
                Forward Draft for Verification
              </p>
              <p className="mt-1.5 text-sm text-slate-600">
                Push this live draft to Bilyana&apos;s Basecamp review queue. You can edit the text above before assigning.
              </p>

              {assignSuccess ? (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#a7d33f]/50 bg-[#a7d33f]/10 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#3d6b0e]" />
                  <div>
                    <p className="text-sm font-semibold text-[#3d6b0e]">
                      Assigned to Bilyana Mihova on Basecamp!
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
                  onClick={handleAssignToBilyana}
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
                      Assign to Bilyana for Review
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
