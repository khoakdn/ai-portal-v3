"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  Save,
  SendHorizonal,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  FileText,
  MessageSquare,
  ThumbsUp,
  MessageCircle,
  Repeat2,
  Send,
  Globe,
  Eye,
} from "lucide-react";
import { generatePressRelease } from "@/actions/content/generate-press-release";
import { saveAsDraft, submitForApproval } from "@/actions/content/save-content-draft";
import { TaskStepper } from "@/components/shared/task-stepper";
import { DocumentSkeleton, SocialSkeleton } from "@/components/ui/skeleton-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/types/database";

type Phase = "input" | "review" | "saved";

interface SavedState {
  taskId: string;
  mode: "draft" | "pending_approval";
  simulated?: boolean;
}

interface ContentGeneratorFormProps {
  defaultType?: ContentType;
}

const CONTENT_TYPE_META: Record<
  ContentType,
  {
    label: string;
    icon: React.ElementType;
    description: string;
    accent: string;
    accentBg: string;
  }
> = {
  press_release: {
    label: "Press Release",
    icon: FileText,
    description: "Formal announcement for media distribution",
    accent: "text-violet-600",
    accentBg: "bg-violet-50",
  },
  social_post: {
    label: "Social Posts",
    icon: MessageSquare,
    description: "LinkedIn, X & Instagram ready",
    accent: "text-blue-600",
    accentBg: "bg-blue-50",
  },
};

/* ── LinkedIn Live Preview ────────────────────────────────────────────── */

function LinkedInPreview({
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
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-xl bg-[#F3F2EF] p-3">
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        {/* Profile header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-bold text-white shadow-sm">
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
              aria-label="Social post content editor"
              className={cn(
                "w-full resize-none bg-transparent text-[13.5px] leading-[1.7] text-gray-800 outline-none",
                "min-h-[160px] placeholder:text-gray-300"
              )}
            />
          ) : body ? (
            <p className="whitespace-pre-wrap text-[13.5px] leading-[1.7] text-gray-800">
              {body}
            </p>
          ) : (
            <div className="space-y-2 py-1">
              {[100, 92, 84, 96, 80, 72, 60].map((w, i) => (
                <div
                  key={i}
                  className="skeleton h-3 rounded"
                  style={{ width: `${w}%` }}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {/* Hashtag ghost */}
          {!body && !isGenerating && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["#Marketing", "#CorpComms", "#PressRelease"].map((tag) => (
                <span key={tag} className="rounded text-[11px] font-medium text-[#0A66C2]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Divider + counts */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-1.5">
          <div className="flex items-center gap-1">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0A66C2] text-[9px] text-white">
              👍
            </span>
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
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              tabIndex={-1}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Newsroom / Press-Release Live Preview ───────────────────────────── */

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
    year: "numeric",
    month: "long",
    day: "numeric",
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

      {/* Document content */}
      <div className="px-8 py-6">
        {/* Dateline */}
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          For Immediate Release
        </p>

        {/* Headline */}
        {title ? (
          <h2 className="mb-3 font-serif text-xl font-bold leading-tight text-slate-900">
            {title}
          </h2>
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
            className={cn(
              "w-full resize-none bg-transparent font-mono text-[13px] leading-[1.85] text-slate-800 outline-none",
              "min-h-[280px] placeholder:text-slate-300"
            )}
          />
        ) : body ? (
          <p className="whitespace-pre-wrap font-mono text-[13px] leading-[1.85] text-slate-800">
            {body}
          </p>
        ) : (
          <div className="space-y-2">
            {[100, 96, 88, 94, 72, 100, 90, 84, 76, 60].map((w, i) => (
              <div
                key={i}
                className="skeleton h-3 rounded"
                style={{ width: `${w}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {/* Footer */}
        {(body || !isGenerating) && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-center text-sm font-bold tracking-widest text-slate-300">
              ###
            </p>
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

/* ── Main form ────────────────────────────────────────────────────────── */

export function ContentGeneratorForm({
  defaultType = "press_release",
}: ContentGeneratorFormProps) {
  const [contentType, setContentType] = useState<ContentType>(defaultType);
  const [title, setTitle] = useState("");
  const [bulletPoints, setBulletPoints] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [saved, setSaved] = useState<SavedState | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isGenerating, startGenerate] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  const wordCount = draftBody.trim() ? draftBody.trim().split(/\s+/).length : 0;
  const stepIndex = phase === "input" ? 0 : phase === "review" ? 1 : 2;

  function handleGenerate() {
    setGenerateError(null);
    startGenerate(async () => {
      const result = await generatePressRelease({ title, bulletPoints, contentType });
      if (result.success && result.draft) {
        setDraftBody(result.draft);
        setIsSimulated(result.simulated ?? false);
        setPhase("review");
      } else {
        setGenerateError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  function handleRegenerate() {
    setPhase("input");
    setDraftBody("");
    setSaveError(null);
  }

  function handleSaveAsDraft() {
    setSaveError(null);
    startSave(async () => {
      const result = await saveAsDraft({
        title, bulletPoints, contentType,
        generatedBody: draftBody, editedBody: draftBody,
      });
      if (result.success && result.taskId) {
        setSaved({ taskId: result.taskId, mode: "draft", simulated: isSimulated });
        setPhase("saved");
      } else {
        setSaveError(result.error ?? "Failed to save. Please try again.");
      }
    });
  }

  function handleSubmitForApproval() {
    setSaveError(null);
    startSubmit(async () => {
      const result = await submitForApproval({
        title, bulletPoints, contentType,
        generatedBody: draftBody, editedBody: draftBody,
      });
      if (result.success && result.taskId) {
        setSaved({ taskId: result.taskId, mode: "pending_approval", simulated: isSimulated });
        setPhase("saved");
      } else {
        setSaveError(result.error ?? "Failed to submit. Please try again.");
      }
    });
  }

  function handleStartOver() {
    setTitle(""); setBulletPoints(""); setDraftBody("");
    setPhase("input"); setSaved(null); setIsSimulated(false);
    setGenerateError(null); setSaveError(null);
  }

  /* ── Saved confirmation screen ──────────────────────────────────────── */
  if (phase === "saved" && saved) {
    return (
      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-100 bg-white px-8 py-6 shadow-sm">
          <TaskStepper currentStep={2} />
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="max-w-sm text-center animate-fade-in">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {saved.mode === "draft" ? "Draft Saved!" : "Submitted for Approval!"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {saved.mode === "draft"
                ? "Your draft is saved and ready whenever you're ready to send it for review."
                : "Your content is in the approval queue. Your manager will be notified."}
            </p>
            {saved.simulated && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                ⚡ Generated in Simulation Mode — add GEMINI_API_KEY for live AI
              </p>
            )}
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                <Link href="/tasks">
                  View in Tasks
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" onClick={handleStartOver}>
                Create Another
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isReview = phase === "review";

  /* ── Main two-column workspace ──────────────────────────────────────── */
  return (
    <div className="space-y-8">
      {/* Progress stepper */}
      <div className="rounded-2xl border border-slate-100 bg-white px-8 py-6 shadow-sm">
        <TaskStepper currentStep={stepIndex} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Left: Configuration form ────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Panel header */}
          <div className="border-b border-slate-100 px-7 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                  1
                </span>
                <h2 className="text-sm font-semibold text-slate-800">Configure</h2>
              </div>
              {isReview && (
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-800 active:scale-[0.98]"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Edit &amp; Regenerate
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Choose content type and provide your key points.
            </p>
          </div>

          <div className="space-y-6 p-7">
            {/* Content type toggle */}
            <div>
              <Label className="mb-3 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Content Type
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {(["press_release", "social_post"] as ContentType[]).map((type) => {
                  const { label, icon: Icon, description, accent, accentBg } = CONTENT_TYPE_META[type];
                  const active = contentType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setContentType(type)}
                      disabled={isReview}
                      aria-pressed={active}
                      className={cn(
                        "group flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200",
                        active
                          ? "border-indigo-200 bg-indigo-50/70 shadow-sm shadow-indigo-100/50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/80",
                        isReview && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        active ? "bg-indigo-100" : accentBg
                      )}>
                        <Icon
                          className={cn("h-4 w-4", active ? "text-indigo-600" : accent)}
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <p className={cn(
                          "text-sm font-semibold leading-none",
                          active ? "text-indigo-700" : "text-slate-700"
                        )}>
                          {label}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-slate-400">
                          {description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="content-title" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Title / Topic
              </Label>
              <Input
                id="content-title"
                placeholder="e.g. Q2 Product Launch Announcement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isReview}
                className={cn(isReview && "bg-slate-50 opacity-60")}
              />
            </div>

            {/* Key points */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bullet-points" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Key Points
                </Label>
                <span className="text-[11px] text-slate-400">
                  {bulletPoints.trim().split("\n").filter(Boolean).length} points
                </span>
              </div>
              <Textarea
                id="bullet-points"
                placeholder={
                  contentType === "press_release"
                    ? "- Company name and announcement\n- Key dates or milestones\n- Quote from a leader\n- Call to action"
                    : "- Core message\n- Target audience\n- Hashtags to include\n- Tone: professional / casual"
                }
                rows={8}
                value={bulletPoints}
                onChange={(e) => setBulletPoints(e.target.value)}
                disabled={isReview}
                className={cn("resize-none", isReview && "bg-slate-50 opacity-60")}
              />
            </div>

            {/* Error */}
            {generateError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {generateError}
              </div>
            )}

            {/* Generate CTA */}
            {!isReview && (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !title.trim() || !bulletPoints.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Generate with AI
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* ── Right: Live Preview ──────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300",
                    isReview ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                  )}
                >
                  2
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Live Preview</h2>
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    <Eye className="h-2.5 w-2.5" aria-hidden="true" />
                    {contentType === "social_post" ? "LinkedIn" : "Newsroom"}
                  </span>
                </div>
              </div>
              {isReview && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Draft Ready
                </span>
              )}
            </div>

            <div className="p-5">
              {contentType === "social_post" ? (
                <LinkedInPreview
                  title={title}
                  body={draftBody}
                  onChange={setDraftBody}
                  isEditable={isReview}
                  isGenerating={isGenerating}
                />
              ) : (
                <PressReleasePreview
                  title={title}
                  body={draftBody}
                  onChange={setDraftBody}
                  isEditable={isReview}
                  isGenerating={isGenerating}
                />
              )}
            </div>

            {/* Word count + simulation badge footer */}
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

          {/* Save / Submit actions (only in review phase) */}
          {isReview && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-fade-in">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                What would you like to do?
              </p>

              {saveError && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs text-red-700" role="alert">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {saveError}
                </div>
              )}

              <div className="space-y-3">
                {/* Save as draft */}
                <button
                  onClick={handleSaveAsDraft}
                  disabled={isSaving || isSubmitting || !draftBody.trim()}
                  className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-slate-200">
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    ) : (
                      <Save className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Save as Draft</p>
                    <p className="mt-0.5 text-xs text-slate-400">Keep editing later — not sent for review</p>
                  </div>
                </button>

                {/* Submit for approval */}
                <button
                  onClick={handleSubmitForApproval}
                  disabled={isSaving || isSubmitting || !draftBody.trim()}
                  className="group flex w-full items-center gap-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-indigo-50/50 px-5 py-4 text-left transition-all duration-200 hover:from-indigo-100 hover:to-indigo-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-200 transition-transform duration-150 group-hover:scale-105">
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <SendHorizonal className="h-4 w-4 text-white" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">Submit for Approval</p>
                    <p className="mt-0.5 text-xs text-indigo-500">Send to manager · triggers notification</p>
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
