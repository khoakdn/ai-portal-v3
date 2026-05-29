"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  Globe,
  Loader2,
  MessageCircle,
  Repeat2,
  RotateCcw,
  Save,
  Send,
  SendHorizonal,
  Share2,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { generatePressRelease } from "@/actions/content/generate-press-release";
import { saveAsDraft, submitForApproval } from "@/actions/content/save-content-draft";
import { TaskStepper } from "@/components/shared/task-stepper";
import { SocialSkeleton } from "@/components/ui/skeleton-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LINKEDIN_CHAR_LIMIT = 3000;

type Tone = "professional" | "enthusiastic" | "casual";

const TONES: { value: Tone; label: string; description: string; emoji: string }[] = [
  { value: "professional", label: "Professional",  description: "Formal, authoritative",  emoji: "👔" },
  { value: "enthusiastic", label: "Enthusiastic",  description: "Energetic, inspiring",   emoji: "🚀" },
  { value: "casual",       label: "Casual",        description: "Friendly, conversational", emoji: "💬" },
];

type Phase = "input" | "review" | "saved";
interface SavedState { taskId: string; mode: "draft" | "pending_approval"; simulated?: boolean; }

// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn card preview
// ─────────────────────────────────────────────────────────────────────────────

function LinkedInPreview({
  body,
  onChange,
  isEditable,
  isGenerating,
}: {
  body: string;
  onChange: (v: string) => void;
  isEditable: boolean;
  isGenerating: boolean;
}) {
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const charCount = body.length;
  const nearLimit = charCount > LINKEDIN_CHAR_LIMIT * 0.85;
  const overLimit  = charCount > LINKEDIN_CHAR_LIMIT;

  return (
    <div className="rounded-xl bg-[#F3F2EF] p-3">
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        {/* Profile header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0087DC] to-blue-600 text-sm font-bold text-white shadow-sm">
            DM
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-900">Delta Marketing Team</p>
            <p className="text-[11px] leading-tight text-gray-500">
              Marketing &amp; Communications · Delta Corp
            </p>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
              <span>{today}</span>
              <span>·</span>
              <Globe className="h-3 w-3" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Post body */}
        <div className="px-4 pb-3">
          {isGenerating ? (
            <SocialSkeleton />
          ) : isEditable && body ? (
            <textarea
              value={body}
              onChange={(e) => onChange(e.target.value)}
              maxLength={LINKEDIN_CHAR_LIMIT}
              aria-label="Social post content editor"
              className="min-h-[160px] w-full resize-none bg-transparent text-[13.5px] leading-[1.7] text-gray-800 outline-none placeholder:text-gray-300"
            />
          ) : body ? (
            <p className="whitespace-pre-wrap text-[13.5px] leading-[1.7] text-gray-800">{body}</p>
          ) : (
            <div className="space-y-2 py-1">
              {[100, 92, 84, 96, 80, 72, 60].map((w, i) => (
                <div key={i} className="skeleton h-3 rounded" style={{ width: `${w}%` }} aria-hidden="true" />
              ))}
            </div>
          )}

          {/* Hashtag ghost */}
          {!body && !isGenerating && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["#Marketing", "#CorpComms", "#DeltaCorp"].map((tag) => (
                <span key={tag} className="rounded text-[11px] font-medium text-[#0A66C2]">{tag}</span>
              ))}
            </div>
          )}

          {/* Character counter */}
          {isEditable && body && (
            <div className="mt-2 flex justify-end">
              <span className={cn(
                "text-[11px] font-medium tabular-nums",
                overLimit  ? "text-red-500" :
                nearLimit  ? "text-amber-500" :
                             "text-gray-400"
              )}>
                {charCount} / {LINKEDIN_CHAR_LIMIT}
              </span>
            </div>
          )}
        </div>

        {/* Divider + counts */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-1.5">
          <div className="flex items-center gap-1">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0A66C2] text-[9px] text-white">👍</span>
            <span className="text-[11px] text-gray-500">42</span>
          </div>
          <span className="text-[11px] text-gray-400">8 comments · 3 reposts</span>
        </div>

        {/* Engagement bar */}
        <div className="flex items-center justify-around border-t border-gray-100 px-2 py-0.5">
          {[
            { icon: ThumbsUp, label: "Like" },
            { icon: MessageCircle, label: "Comment" },
            { icon: Repeat2, label: "Repost" },
            { icon: Send, label: "Send" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              tabIndex={-1}
              aria-hidden="true"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main studio
// ─────────────────────────────────────────────────────────────────────────────

export function SocialMediaStudio() {
  const [title, setTitle]               = useState("");
  const [bulletPoints, setBulletPoints] = useState("");
  const [tone, setTone]                 = useState<Tone>("professional");
  const [draftBody, setDraftBody]       = useState("");
  const [phase, setPhase]               = useState<Phase>("input");
  const [saved, setSaved]               = useState<SavedState | null>(null);
  const [isSimulated, setIsSimulated]   = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saveError, setSaveError]         = useState<string | null>(null);

  const [isGenerating, startGenerate] = useTransition();
  const [isSaving,     startSave]     = useTransition();
  const [isSubmitting, startSubmit]   = useTransition();

  const charCount  = draftBody.length;
  const overLimit  = charCount > LINKEDIN_CHAR_LIMIT;
  const stepIndex  = phase === "input" ? 0 : phase === "review" ? 1 : 2;
  const isReview   = phase === "review";

  function handleGenerate() {
    setGenerateError(null);
    // Append tone instruction to bullet points so Gemini adopts the right voice
    const toneLabel = TONES.find((t) => t.value === tone)?.label ?? tone;
    const enrichedBullets = `${bulletPoints}\n\nTone: ${toneLabel}`;

    startGenerate(async () => {
      const result = await generatePressRelease({
        title,
        bulletPoints: enrichedBullets,
        contentType: "social_post",
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
        title, bulletPoints, contentType: "social_post",
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
        title, bulletPoints, contentType: "social_post",
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
    setTitle(""); setBulletPoints(""); setDraftBody("");
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
                ? "Your social post draft is saved and ready for editing."
                : "Your social post is in the approval queue. Your manager will be notified."}
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
                  <p className="text-[11px] text-slate-400">LinkedIn · X/Twitter · Instagram ready</p>
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
                <Share2 className="h-4 w-4 text-[#0087DC]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Social Media Post</p>
                <p className="text-[11px] text-blue-500">LinkedIn, X/Twitter, Instagram · up to {LINKEDIN_CHAR_LIMIT.toLocaleString()} chars</p>
              </div>
            </div>

            {/* Topic */}
            <div className="space-y-1.5">
              <Label htmlFor="sm-title" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Topic / Subject
              </Label>
              <Input
                id="sm-title"
                placeholder="e.g. Q2 Product Launch Announcement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isReview}
                className={cn(isReview && "bg-slate-50 opacity-60")}
              />
            </div>

            {/* Tone picker */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Tone</Label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(({ value, label, description, emoji }) => {
                  const active = tone === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTone(value)}
                      disabled={isReview}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all duration-150",
                        active
                          ? "border-blue-200 bg-blue-50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                        isReview && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <span className="text-xl leading-none" aria-hidden="true">{emoji}</span>
                      <p className={cn(
                        "text-[12px] font-semibold leading-none",
                        active ? "text-[#0087DC]" : "text-slate-700"
                      )}>
                        {label}
                      </p>
                      <p className="text-[10px] leading-snug text-slate-400">{description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Key points */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sm-bullets" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Key Points
                </Label>
                <span className="text-[11px] text-slate-400">
                  {bulletPoints.trim().split("\n").filter(Boolean).length} points
                </span>
              </div>
              <Textarea
                id="sm-bullets"
                placeholder={"- Core message to communicate\n- Target audience\n- Key achievement or announcement\n- Hashtags to include\n- Call to action"}
                rows={8}
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
                  : <><Sparkles className="h-4 w-4" />Generate Social Post</>}
              </Button>
            )}
          </div>
        </div>

        {/* ── Right: LinkedIn Preview ─────────────────────────────── */}
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
                  <span className="flex items-center gap-1 rounded-full bg-[#E7F3FF] px-2 py-0.5 text-[11px] font-medium text-[#0A66C2]">
                    <Eye className="h-2.5 w-2.5" />
                    LinkedIn
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
              <LinkedInPreview
                body={draftBody}
                onChange={setDraftBody}
                isEditable={isReview}
                isGenerating={isGenerating}
              />
            </div>

            {/* Footer: char counter + simulation badge */}
            {isReview && draftBody && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-7 py-2.5">
                <span className={cn(
                  "text-[11px] font-medium tabular-nums",
                  overLimit ? "text-red-500" : "text-slate-400"
                )}>
                  {charCount.toLocaleString()} / {LINKEDIN_CHAR_LIMIT.toLocaleString()} chars
                </span>
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
                  disabled={isSaving || isSubmitting || !draftBody.trim() || overLimit}
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
                  disabled={isSaving || isSubmitting || !draftBody.trim() || overLimit}
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
