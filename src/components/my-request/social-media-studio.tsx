"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  RotateCcw,
  Share2,
  Sparkles,
} from "lucide-react";
import { generatePressRelease } from "@/actions/content/generate-press-release";
import { TaskStepper } from "@/components/shared/task-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ContentPipelineWorkflow } from "@/components/shared/content-pipeline-workflow";
import { ContentPipelineProgressView } from "@/components/shared/content-pipeline-progress-view";
import { SocialPostPreview } from "@/components/shared/social-post-preview";
import { usePressReleasePipeline } from "@/hooks/use-press-release-pipeline";
import { DEFAULT_DELTA_BUSINESS_UNIT } from "@/lib/content/delta-business-units";
import {
  SOCIAL_OPTIMIZE_DELAY_MS,
  SOCIAL_REVIEWER_FEEDBACK_MESSAGE,
  SMARTER_E_SOCIAL_DEMO,
  buildPlatformCopies,
  optimizeSocialCopy,
  saveSocialDraftToStorage,
  type SocialPlatform,
} from "@/lib/demo/social-media-formats";

const LINKEDIN_CHAR_LIMIT = 3000;
const INSTAGRAM_CHAR_LIMIT = 2200;

type Tone = "professional" | "enthusiastic" | "casual";

const TONES: { value: Tone; label: string; description: string; emoji: string }[] = [
  { value: "professional", label: "Professional", description: "Formal, authoritative", emoji: "👔" },
  { value: "enthusiastic", label: "Enthusiastic", description: "Energetic, inspiring", emoji: "🚀" },
  { value: "casual", label: "Casual", description: "Friendly, conversational", emoji: "💬" },
];

type Phase = "input" | "review";

function StudioToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="pointer-events-auto fixed right-6 top-20 z-[9998] flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg animate-in fade-in slide-in-from-top-2"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      {message}
    </div>
  );
}

export function SocialMediaStudio() {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [bulletPoints, setBulletPoints] = useState("");
  const [businessUnit, setBusinessUnit] = useState<string>(DEFAULT_DELTA_BUSINESS_UNIT);
  const [tone, setTone] = useState<Tone>("professional");
  const [platform, setPlatform] = useState<SocialPlatform>("linkedin");
  const [copies, setCopies] = useState<Record<SocialPlatform, string>>({
    linkedin: "",
    instagram: "",
  });
  const [phase, setPhase] = useState<Phase>("input");
  const [isSimulated, setIsSimulated] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [demoFlash, setDemoFlash] = useState(false);

  const [isGenerating, startGenerate] = useTransition();
  const [isOptimizing, startOptimize] = useTransition();

  const activeBody = copies[platform];
  const { isDispatched, isSplitViewActive } = usePressReleasePipeline({
    draftText: activeBody,
    title: title || "Social Media Post",
    businessUnit,
    taskType: "Social Media Post",
    feedbackText: SOCIAL_REVIEWER_FEEDBACK_MESSAGE,
  });
  const charLimit = platform === "linkedin" ? LINKEDIN_CHAR_LIMIT : INSTAGRAM_CHAR_LIMIT;
  const overLimit = activeBody.length > charLimit;
  const stepIndex = phase === "input" ? 0 : 1;
  const isReview = phase === "review";

  function setActiveBody(value: string) {
    setCopies((prev) => ({ ...prev, [platform]: value }));
  }

  function loadDemoTemplate() {
    setTitle("");
    setBulletPoints(SMARTER_E_SOCIAL_DEMO.brief);
    setBusinessUnit(SMARTER_E_SOCIAL_DEMO.businessUnit);
    setPlatform(SMARTER_E_SOCIAL_DEMO.platform);
    setTone("professional");
    setDemoFlash(true);
    window.setTimeout(() => setDemoFlash(false), 1500);
    window.setTimeout(() => titleInputRef.current?.focus(), 50);
  }

  const demoFlashClassName = cn(
    "transition-colors duration-1000",
    demoFlash && "bg-blue-50/80 ring-2 ring-[#0087DC]/25"
  );

  function handleGenerate() {
    setGenerateError(null);
    const toneLabel = TONES.find((t) => t.value === tone)?.label ?? tone;
    const enrichedBullets = `${bulletPoints}\n\nTone: ${toneLabel}`;

    startGenerate(async () => {
      const result = await generatePressRelease({
        title,
        bulletPoints: enrichedBullets,
        contentType: "social_post",
      });
      if (result.success && result.draft) {
        const formatted = buildPlatformCopies(result.draft, title);
        setCopies(formatted);
        setPlatform("linkedin");
        setIsSimulated(result.simulated ?? false);
        setPhase("review");
      } else {
        setGenerateError(result.error ?? "Generation failed. Please try again.");
      }
    });
  }

  function handleOptimize() {
    if (!activeBody.trim() || isOptimizing) return;

    startOptimize(async () => {
      await new Promise((resolve) => setTimeout(resolve, SOCIAL_OPTIMIZE_DELAY_MS));
      setCopies((prev) => ({
        ...prev,
        [platform]: optimizeSocialCopy(prev[platform], platform),
      }));
      setIsHighlighting(true);
      window.setTimeout(() => setIsHighlighting(false), 1500);
    });
  }

  function handleSaveForDraft() {
    saveSocialDraftToStorage({
      title,
      bulletPoints,
      tone,
      platform,
      copies,
      savedAt: new Date().toISOString(),
    });
    setToastMessage("Draft saved successfully!");
  }

  const highlightClassName = isHighlighting ? "bg-blue-50/50 ring-2 ring-[#0087DC]/30" : "";

  if (isSplitViewActive) {
    return (
      <div className="space-y-6">
        {toastMessage && (
          <StudioToast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        )}
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-[#0087DC]/30 bg-[#0087DC]/10 px-3 py-1 text-[12px] font-semibold text-[#005a94]">
              <Eye className="h-3.5 w-3.5" />
              Social Workflow Progress View
            </span>
            <span className="text-sm text-slate-500">{title || "Social Media Post"}</span>
          </div>
        </div>
        <ContentPipelineProgressView
          onDraftChange={setActiveBody}
          onSocialCopiesChange={setCopies}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {toastMessage && (
        <StudioToast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}

      <div className="rounded-2xl border border-slate-100 bg-white px-8 py-6 shadow-sm">
        <TaskStepper currentStep={stepIndex} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-7 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0087DC] text-[11px] font-bold text-white">
                  1
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Configure</h2>
                  <p className="text-[11px] text-slate-400">LinkedIn &amp; Instagram formats</p>
                </div>
              </div>
              {isReview && (
                <button
                  type="button"
                  onClick={() => {
                    setPhase("input");
                    setCopies({ linkedin: "", instagram: "" });
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 active:scale-[0.98]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Edit &amp; Regenerate
                </button>
              )}
            </div>
          </div>

          <div className={cn("space-y-5 p-7", demoFlashClassName)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Social Brief
              </p>
              {!isReview && (
                <button
                  type="button"
                  onClick={loadDemoTemplate}
                  className="border border-blue-100 bg-blue-50/50 px-3 py-1.5 text-xs font-medium text-blue-600 transition rounded-lg hover:bg-blue-100"
                >
                  ⚡ Load &apos;Smarter E 2026&apos; Social Media Template
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <Share2 className="h-4 w-4 text-[#0087DC]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Social Media Post</p>
                <p className="text-[11px] text-blue-500">Platform-optimized copy after generation</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sm-title" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Initial Hook / Headline
              </Label>
              <Input
                id="sm-title"
                ref={titleInputRef}
                placeholder={SMARTER_E_SOCIAL_DEMO.hookPlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isReview}
                className={cn(isReview && "bg-slate-50 opacity-60")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sm-bu" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Business Unit
              </Label>
              <Input
                id="sm-bu"
                value={businessUnit}
                onChange={(e) => setBusinessUnit(e.target.value.toUpperCase())}
                disabled={isReview}
                className={cn(isReview && "bg-slate-50 opacity-60")}
              />
            </div>

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
                      <span className="text-xl leading-none" aria-hidden="true">
                        {emoji}
                      </span>
                      <p className={cn("text-[12px] font-semibold leading-none", active ? "text-[#0087DC]" : "text-slate-700")}>
                        {label}
                      </p>
                      <p className="text-[10px] leading-snug text-slate-400">{description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sm-bullets" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Key Message / Brief
              </Label>
              <Textarea
                id="sm-bullets"
                placeholder={"- Core message\n- Target audience\n- Key announcement\n- Call to action"}
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
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate with AI
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Right: Preview + actions */}
        <div className="flex flex-col gap-5">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300",
                    isReview ? "bg-[#0087DC] text-white" : "bg-slate-200 text-slate-500"
                  )}
                >
                  2
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Live Preview</h2>
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      platform === "linkedin"
                        ? "bg-[#E7F3FF] text-[#0A66C2]"
                        : "bg-gradient-to-r from-purple-50 to-pink-50 text-pink-600"
                    )}
                  >
                    <Eye className="h-2.5 w-2.5" />
                    {platform === "linkedin" ? "LinkedIn" : "Instagram"}
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

            {isReview && (
              <div className="flex gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setPlatform("linkedin")}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
                    platform === "linkedin"
                      ? "border-[#0A66C2]/40 bg-white text-[#0A66C2] shadow-sm"
                      : "border-transparent text-slate-500 hover:bg-white/80"
                  )}
                >
                  🔗 LinkedIn Post
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform("instagram")}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
                    platform === "instagram"
                      ? "border-pink-300/50 bg-white text-pink-600 shadow-sm"
                      : "border-transparent text-slate-500 hover:bg-white/80"
                  )}
                >
                  📸 Instagram Post
                </button>
              </div>
            )}

            <div className="p-5">
              <SocialPostPreview
                platform={platform}
                body={activeBody}
                onChange={setActiveBody}
                isEditable={isReview && !isDispatched}
                isGenerating={isGenerating}
                highlightClassName={highlightClassName}
              />
            </div>

            {isReview && activeBody && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-7 py-2.5">
                <span className={cn("text-[11px] font-medium tabular-nums", overLimit ? "text-red-500" : "text-slate-400")}>
                  {activeBody.length.toLocaleString()} / {charLimit.toLocaleString()} chars
                </span>
                <div className="flex items-center gap-2">
                  {isSimulated && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                      ⚡ Simulation
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-emerald-600">
                    {isDispatched ? "Locked · Dispatched" : "✓ Editable"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {isReview && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOptimize}
                  disabled={isOptimizing || !activeBody.trim() || overLimit}
                  className="flex-1 border-[#0087DC]/30 text-[#005a94] hover:bg-[#0087DC]/5"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Optimizing…
                    </>
                  ) : (
                    <>✨ Optimize with AI</>
                  )}
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleSaveForDraft}
                disabled={!activeBody.trim() || overLimit || isDispatched}
                className="w-full justify-center gap-2"
              >
                💾 Save for Draft
              </Button>

              <ContentPipelineWorkflow
                draftText={activeBody}
                onDraftChange={setActiveBody}
                title={title || "Social Media Post"}
                businessUnit={businessUnit}
                taskType="Social Media Post"
                feedbackText={SOCIAL_REVIEWER_FEEDBACK_MESSAGE}
                socialPlatform={platform}
                socialCopies={copies}
                progressNavigation="inline"
                disabled={!activeBody.trim() || overLimit}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
