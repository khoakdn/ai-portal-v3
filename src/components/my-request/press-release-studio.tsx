"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileText,
  Globe,
  Loader2,
  RotateCcw,
  Save,
  SendHorizonal,
  Sparkles,
} from "lucide-react";
import { generatePressRelease } from "@/actions/content/generate-press-release";
import { saveAsDraft, submitForApproval } from "@/actions/content/save-content-draft";
import { TaskStepper } from "@/components/shared/task-stepper";
import { DocumentSkeleton } from "@/components/ui/skeleton-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Phase = "input" | "review" | "saved";
interface SavedState { taskId: string; mode: "draft" | "pending_approval"; simulated?: boolean; }

// ─────────────────────────────────────────────────────────────────────────────
// Newsroom / press-release live preview
// ─────────────────────────────────────────────────────────────────────────────

function PressReleasePreview({
  title,
  body,
  onChange,
  isEditable,
  isGenerating,
}: {
  title: string;
  body: string;
  onChange: (v: string) => void;
  isEditable: boolean;
  isGenerating: boolean;
}) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Editorial top bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-400" aria-hidden="true" />
          <div className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
          <div className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Newsroom Wire
        </span>
        <span className="text-[11px] text-slate-400">{today}</span>
      </div>

      {/* Document body */}
      <div className="px-8 py-6">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          For Immediate Release
        </p>

        {/* Headline */}
        {title ? (
          <h2 className="mb-3 font-serif text-xl font-bold leading-tight text-slate-900">{title}</h2>
        ) : (
          <div className="mb-3 space-y-2">
            <div className="skeleton h-5 w-3/4 rounded" aria-hidden="true" />
            <div className="skeleton h-5 w-1/2 rounded" aria-hidden="true" />
          </div>
        )}

        <hr className="mb-5 border-slate-200" />

        {/* Body */}
        {isGenerating ? (
          <DocumentSkeleton />
        ) : isEditable && body ? (
          <textarea
            value={body}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Press release content editor"
            className="min-h-[280px] w-full resize-none bg-transparent font-mono text-[13px] leading-[1.85] text-slate-800 outline-none placeholder:text-slate-300"
          />
        ) : body ? (
          <p className="whitespace-pre-wrap font-mono text-[13px] leading-[1.85] text-slate-800">{body}</p>
        ) : (
          <div className="space-y-2">
            {[100, 96, 88, 94, 72, 100, 90, 84, 76, 60].map((w, i) => (
              <div key={i} className="skeleton h-3 rounded" style={{ width: `${w}%` }} aria-hidden="true" />
            ))}
          </div>
        )}

        {/* Footer */}
        {(body || !isGenerating) && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-center text-sm font-bold tracking-widest text-slate-300">###</p>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Media Contact: press@deltacorp.com</span>
              <span>Delta Corp</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main studio
// ─────────────────────────────────────────────────────────────────────────────

export function PressReleaseStudio() {
  const [title, setTitle]               = useState("");
  const [bulletPoints, setBulletPoints] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [draftBody, setDraftBody]       = useState("");
  const [phase, setPhase]               = useState<Phase>("input");
  const [saved, setSaved]               = useState<SavedState | null>(null);
  const [isSimulated, setIsSimulated]   = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saveError, setSaveError]         = useState<string | null>(null);

  const [isGenerating, startGenerate] = useTransition();
  const [isSaving,     startSave]     = useTransition();
  const [isSubmitting, startSubmit]   = useTransition();

  const wordCount  = draftBody.trim() ? draftBody.trim().split(/\s+/).length : 0;
  const stepIndex  = phase === "input" ? 0 : phase === "review" ? 1 : 2;
  const isReview   = phase === "review";

  function handleGenerate() {
    setGenerateError(null);
    // Prepend organisation context to bullet points if provided
    const enrichedBullets = organisation.trim()
      ? `Organisation: ${organisation.trim()}\n\n${bulletPoints}`
      : bulletPoints;

    startGenerate(async () => {
      const result = await generatePressRelease({
        title,
        bulletPoints: enrichedBullets,
        contentType: "press_release",
      });
      if (result.success && result.draft) {
        setDraftBody(result.draft);
        setIsSimulated(result.simulated ?? false);
        setPhase("review");
      } else {
        setGenerateError(result.error ?? "Generation failed. Please try again.");
      }
    });
  }

  function handleSaveAsDraft() {
    setSaveError(null);
    startSave(async () => {
      const result = await saveAsDraft({
        title, bulletPoints, contentType: "press_release",
        generatedBody: draftBody, editedBody: draftBody,
      });
      if (result.success && result.taskId) {
        setSaved({ taskId: result.taskId, mode: "draft", simulated: isSimulated });
        setPhase("saved");
      } else {
        setSaveError(result.error ?? "Failed to save.");
      }
    });
  }

  function handleSubmitForApproval() {
    setSaveError(null);
    startSubmit(async () => {
      const result = await submitForApproval({
        title, bulletPoints, contentType: "press_release",
        generatedBody: draftBody, editedBody: draftBody,
      });
      if (result.success && result.taskId) {
        setSaved({ taskId: result.taskId, mode: "pending_approval", simulated: isSimulated });
        setPhase("saved");
      } else {
        setSaveError(result.error ?? "Failed to submit.");
      }
    });
  }

  function handleStartOver() {
    setTitle(""); setBulletPoints(""); setOrganisation(""); setDraftBody("");
    setPhase("input"); setSaved(null); setIsSimulated(false);
    setGenerateError(null); setSaveError(null);
  }

  // ── Saved confirmation ────────────────────────────────────────────────
  if (phase === "saved" && saved) {
    return (
      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-100 bg-white px-8 py-6 shadow-sm">
          <TaskStepper currentStep={2} />
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="max-w-sm text-center animate-fade-in">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {saved.mode === "draft" ? "Draft Saved!" : "Submitted for Approval!"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {saved.mode === "draft"
                ? "Your press release draft is saved and ready for editing."
                : "Your press release is in the approval queue. Your manager will be notified."}
            </p>
            {saved.simulated && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                ⚡ Simulation Mode — add GEMINI_API_KEY for live AI
              </p>
            )}
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href="/tasks">View in Tasks <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" size="lg" onClick={handleStartOver}>Create Another</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main workspace ────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Stepper */}
      <div className="rounded-2xl border border-slate-100 bg-white px-8 py-6 shadow-sm">
        <TaskStepper currentStep={stepIndex} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Left: Form ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-7 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0087DC] text-[11px] font-bold text-white">1</span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Configure</h2>
                  <p className="text-[11px] text-slate-400">Formal announcement for media distribution</p>
                </div>
              </div>
              {isReview && (
                <button
                  onClick={() => { setPhase("input"); setDraftBody(""); setSaveError(null); }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-[0.98]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Edit &amp; Regenerate
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5 p-7">
            {/* Type badge (fixed) */}
            <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <FileText className="h-4 w-4 text-[#0087DC]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Press Release</p>
                <p className="text-[11px] text-blue-500">Wire-service format · for media distribution</p>
              </div>
            </div>

            {/* Headline / topic */}
            <div className="space-y-1.5">
              <Label htmlFor="pr-title" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Headline / Topic
              </Label>
              <Input
                id="pr-title"
                placeholder="e.g. Delta Corp Launches Q3 Marketing Campaign"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isReview}
                className={cn(isReview && "bg-slate-50 opacity-60")}
              />
            </div>

            {/* Organisation */}
            <div className="space-y-1.5">
              <Label htmlFor="pr-org" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Organisation Name <span className="normal-case font-normal text-slate-300">(optional)</span>
              </Label>
              <Input
                id="pr-org"
                placeholder="e.g. Delta Corp"
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                disabled={isReview}
                className={cn(isReview && "bg-slate-50 opacity-60")}
              />
            </div>

            {/* Key points */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pr-bullets" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Key Points
                </Label>
                <span className="text-[11px] text-slate-400">
                  {bulletPoints.trim().split("\n").filter(Boolean).length} points
                </span>
              </div>
              <Textarea
                id="pr-bullets"
                placeholder={"- Company name and announcement\n- Key dates or milestones\n- Quote from leadership\n- Target audience\n- Call to action"}
                rows={9}
                value={bulletPoints}
                onChange={(e) => setBulletPoints(e.target.value)}
                disabled={isReview}
                className={cn("resize-none", isReview && "bg-slate-50 opacity-60")}
              />
            </div>

            {generateError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {generateError}
              </div>
            )}

            {!isReview && (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !title.trim() || !bulletPoints.trim()}
                className="w-full"
                size="lg"
              >
                {isGenerating
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
                  : <><Sparkles className="h-4 w-4" />Generate Press Release</>}
              </Button>
            )}
          </div>
        </div>

        {/* ── Right: Preview ──────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300",
                  isReview ? "bg-[#0087DC] text-white" : "bg-slate-200 text-slate-500"
                )}>2</span>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Live Preview</h2>
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    <Eye className="h-2.5 w-2.5" />
                    Newsroom Wire
                  </span>
                </div>
              </div>
              {isReview && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Draft Ready
                </span>
              )}
            </div>

            <div className="p-5">
              <PressReleasePreview
                title={title}
                body={draftBody}
                onChange={setDraftBody}
                isEditable={isReview}
                isGenerating={isGenerating}
              />
            </div>

            {isReview && draftBody && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-7 py-2.5">
                <span className="text-[11px] text-slate-400">{wordCount} words</span>
                <div className="flex items-center gap-2">
                  {isSimulated && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                      ⚡ Simulation
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-emerald-600">✓ Editable</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {isReview && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-fade-in">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                What would you like to do?
              </p>
              {saveError && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs text-red-700" role="alert">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {saveError}
                </div>
              )}
              <div className="space-y-3">
                <button
                  onClick={handleSaveAsDraft}
                  disabled={isSaving || isSubmitting || !draftBody.trim()}
                  className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-slate-200">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <Save className="h-4 w-4 text-slate-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Save as Draft</p>
                    <p className="mt-0.5 text-xs text-slate-400">Keep editing later — not sent for review</p>
                  </div>
                </button>
                <button
                  onClick={handleSubmitForApproval}
                  disabled={isSaving || isSubmitting || !draftBody.trim()}
                  className="group flex w-full items-center gap-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50/50 px-5 py-4 text-left transition-all duration-200 hover:from-blue-100 hover:to-blue-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0087DC] shadow-sm shadow-blue-200 transition-transform duration-150 group-hover:scale-105">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <SendHorizonal className="h-4 w-4 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Submit for Approval</p>
                    <p className="mt-0.5 text-xs text-blue-500">Send to manager · triggers notification</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
