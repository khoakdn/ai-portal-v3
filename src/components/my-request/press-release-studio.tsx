"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Megaphone,
  RotateCcw,
  Save,
  SendHorizonal,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { generatePressRelease, type PressReleaseStructuredContext } from "@/actions/content/generate-press-release";
import { triggerPressReleaseAgent } from "@/actions/relevance/trigger-press-release-agent";
import { saveAsDraft, submitForApproval } from "@/actions/content/save-content-draft";
import { DocumentSkeleton } from "@/components/ui/skeleton-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Press release type definitions
// ─────────────────────────────────────────────────────────────────────────────

interface PressReleaseType {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const PRESS_RELEASE_TYPES: PressReleaseType[] = [
  {
    id: "general",
    label: "General Press Release",
    subtitle: "Standard press release",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "article",
    label: "Article / News Item",
    subtitle: "Product-focused article",
    icon: BookOpen,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
  },
  {
    id: "case_study",
    label: "Case Study",
    subtitle: "Customer success story",
    icon: Trophy,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    id: "event",
    label: "Event Announcement",
    subtitle: "Trade show or exhibition",
    icon: Megaphone,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  {
    id: "product_launch",
    label: "Product Launch",
    subtitle: "New product announcement",
    icon: Star,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema + form types
// ─────────────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  title:             z.string().min(3, "Title must be at least 3 characters"),
  region:            z.string().min(1, "Region is required"),
  language:          z.string().min(1, "Language is required"),
  businessUnit:      z.string().min(1, "Business unit is required"),
  priority:          z.string().optional(),
  deadline:          z.string().optional(),
  thematicFocus:     z.string().min(20, "Please provide more detail (min 20 characters)"),
  productsToAddress: z.string().min(10, "Please describe the products/solutions"),
  infoMaterialLinks: z.string().optional(),
  contactPerson:     z.string().optional(),
  productDescription: z.string().min(20, "Please describe the product and its benefits"),
  existingSystems:   z.string().optional(),
  testReports:       z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Select options
// ─────────────────────────────────────────────────────────────────────────────

const REGIONS = ["Global", "EMEA", "APAC", "Americas", "DACH", "UK & Ireland", "Benelux", "Nordics"];
const LANGUAGES = ["English", "German", "French", "Spanish", "Dutch", "Swedish", "Italian", "Portuguese"];
const BUSINESS_UNITS = ["Marketing", "Product Management", "Sales", "R&D", "Corporate Communications", "Digital", "Engineering", "Operations"];
const PRIORITIES = ["High", "Medium", "Low"];

// ─────────────────────────────────────────────────────────────────────────────
// Step tracker
// ─────────────────────────────────────────────────────────────────────────────

type WizardPhase = "select-type" | "fill-form" | "review" | "saved" | "agent-submitted";

interface SavedState {
  taskId: string;
  mode: "draft" | "pending_approval";
  simulated?: boolean;
}

interface AgentSubmittedState {
  jobId: string;
  simulated?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared select component
// ─────────────────────────────────────────────────────────────────────────────

function FormSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full appearance-none rounded-lg border px-3 py-2 pr-9 text-sm transition-all",
          "bg-white text-slate-900 shadow-sm outline-none",
          "focus:border-[#02d5ce] focus:shadow-[0_0_0_3px_rgba(2,213,206,0.18)]",
          error ? "border-red-300 bg-red-50/50" : "border-slate-200",
          disabled && "cursor-not-allowed bg-slate-50 opacity-60",
          !value && "text-slate-400"
        )}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronRight
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-slate-400"
        aria-hidden="true"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Newsroom preview (right column)
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
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-400" aria-hidden="true" />
          <div className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
          <div className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Newsroom Wire</span>
        <span className="text-[11px] text-slate-400">{today}</span>
      </div>

      <div className="px-8 py-6">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          For Immediate Release
        </p>
        {title ? (
          <h2 className="mb-3 font-serif text-xl font-bold leading-tight text-slate-900">{title}</h2>
        ) : (
          <div className="mb-3 space-y-2">
            <div className="skeleton h-5 w-3/4 rounded" />
            <div className="skeleton h-5 w-1/2 rounded" />
          </div>
        )}
        <hr className="mb-5 border-slate-200" />
        {isGenerating ? (
          <DocumentSkeleton />
        ) : isEditable && body ? (
          <textarea
            value={body}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Press release content editor"
            className="min-h-[320px] w-full resize-none bg-transparent font-mono text-[13px] leading-[1.85] text-slate-800 outline-none"
          />
        ) : body ? (
          <p className="whitespace-pre-wrap font-mono text-[13px] leading-[1.85] text-slate-800">{body}</p>
        ) : (
          <div className="space-y-2">
            {[100, 96, 88, 94, 72, 100, 90, 84, 76, 60].map((w, i) => (
              <div key={i} className="skeleton h-3 rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
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
// Step 1: Type selection grid
// ─────────────────────────────────────────────────────────────────────────────

function TypeSelectionGrid({ onSelect }: { onSelect: (type: PressReleaseType) => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-100 bg-white px-8 py-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0087DC]/10">
            <FileText className="h-5 w-5 text-[#0087DC]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Select Press Release Type</h2>
            <p className="text-sm text-slate-500">
              Choose the format that best fits your communication goal.
            </p>
          </div>
        </div>
      </div>

      {/* Type grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PRESS_RELEASE_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onSelect(type)}
              className={cn(
                "group relative flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left",
                "shadow-sm transition-all duration-200",
                "hover:-translate-y-0.5 hover:border-[#0087DC] hover:shadow-md"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-200",
                type.bgColor
              )}>
                <Icon className={cn("h-6 w-6", type.color)} aria-hidden="true" />
              </div>

              {/* Text */}
              <div className="space-y-1">
                <p className="text-[15px] font-semibold text-slate-900 group-hover:text-[#0087DC] transition-colors">
                  {type.label}
                </p>
                <p className="text-sm text-slate-500">{type.subtitle}</p>
              </div>

              {/* Arrow hint */}
              <ArrowRight
                className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-200 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#0087DC]"
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Detailed form
// ─────────────────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
      {children}
    </p>
  );
}

interface DetailedFormProps {
  selectedType: PressReleaseType;
  onBack: () => void;
  onAgentTrigger: (title: string, ctx: PressReleaseStructuredContext) => void;
  isTriggering: boolean;
  triggerError: string | null;
}

function DetailedForm({
  selectedType,
  onBack,
  onAgentTrigger,
  isTriggering,
  triggerError,
}: DetailedFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      region: "",
      language: "",
      businessUnit: "",
      priority: "",
      deadline: "",
      thematicFocus: "",
      productsToAddress: "",
      infoMaterialLinks: "",
      contactPerson: "",
      productDescription: "",
      existingSystems: "",
      testReports: "",
    },
  });

  function onSubmit(data: FormValues) {
    const ctx: PressReleaseStructuredContext = {
      pressReleaseType: selectedType.label,
      region:            data.region,
      language:          data.language,
      businessUnit:      data.businessUnit,
      priority:          data.priority || undefined,
      deadline:          data.deadline || undefined,
      thematicFocus:     data.thematicFocus,
      productsToAddress: data.productsToAddress,
      infoMaterialLinks: data.infoMaterialLinks || undefined,
      contactPerson:     data.contactPerson || undefined,
      productDescription: data.productDescription,
      existingSystems:   data.existingSystems || undefined,
      testReports:       data.testReports || undefined,
    };
    onAgentTrigger(data.title, ctx);
  }

  const Icon = selectedType.icon;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Back + type badge */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
          "border-slate-200 bg-slate-50 text-slate-600"
        )}>
          <Icon className={cn("h-3.5 w-3.5", selectedType.color)} />
          {selectedType.label}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">

        {/* ── Left: Form (7/12) ──────────────────────────────── */}
        <div className="space-y-5 lg:col-span-7">

          {/* ─ Basic Info ─ */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <SectionLabel>Basic Information</SectionLabel>
            <div className="space-y-4">

              {/* Title */}
              <div>
                <Label htmlFor="pr-title" className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                  Article Title <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="pr-title"
                  placeholder="e.g. Delta Corp Announces New AI-Driven Solution for Smart Manufacturing"
                  {...register("title")}
                  className={cn(errors.title && "border-red-300 focus:border-red-400 focus:ring-red-100")}
                />
                <FieldError message={errors.title?.message} />
              </div>

              {/* Region + Language */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pr-region" className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                    Region <span className="text-red-400">*</span>
                  </Label>
                  <Controller
                    name="region"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        id="pr-region"
                        value={field.value}
                        onChange={field.onChange}
                        options={REGIONS}
                        placeholder="Select region"
                        error={errors.region?.message}
                      />
                    )}
                  />
                  <FieldError message={errors.region?.message} />
                </div>
                <div>
                  <Label htmlFor="pr-language" className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                    Language <span className="text-red-400">*</span>
                  </Label>
                  <Controller
                    name="language"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        id="pr-language"
                        value={field.value}
                        onChange={field.onChange}
                        options={LANGUAGES}
                        placeholder="Select language"
                        error={errors.language?.message}
                      />
                    )}
                  />
                  <FieldError message={errors.language?.message} />
                </div>
              </div>

              {/* Business Unit + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pr-bu" className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                    Business Unit <span className="text-red-400">*</span>
                  </Label>
                  <Controller
                    name="businessUnit"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        id="pr-bu"
                        value={field.value}
                        onChange={field.onChange}
                        options={BUSINESS_UNITS}
                        placeholder="Select unit"
                        error={errors.businessUnit?.message}
                      />
                    )}
                  />
                  <FieldError message={errors.businessUnit?.message} />
                </div>
                <div>
                  <Label htmlFor="pr-priority" className="mb-1.5 text-xs font-semibold text-slate-600">
                    Priority
                  </Label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        id="pr-priority"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        options={PRIORITIES}
                        placeholder="Select priority"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <Label htmlFor="pr-deadline" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Deadline
                </Label>
                <input
                  id="pr-deadline"
                  type="date"
                  {...register("deadline")}
                  className={cn(
                    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none",
                    "transition-all focus:border-[#02d5ce] focus:shadow-[0_0_0_3px_rgba(2,213,206,0.18)] focus:outline-none"
                  )}
                />
              </div>
            </div>
          </div>

          {/* ─ Content Brief ─ */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <SectionLabel>Content Brief</SectionLabel>
            <div className="space-y-4">

              {/* Thematic Focus */}
              <div>
                <Label htmlFor="pr-theme" className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                  Thematic Focus / Content Points <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="pr-theme"
                  placeholder={"Describe the core theme and key messages to communicate.\n\nExample:\n- New AI-powered analytics module\n- 40% reduction in processing time\n- Available Q3 2026"}
                  rows={5}
                  {...register("thematicFocus")}
                  className={cn("resize-none", errors.thematicFocus && "border-red-300")}
                />
                <FieldError message={errors.thematicFocus?.message} />
              </div>

              {/* Products to Address */}
              <div>
                <Label htmlFor="pr-products" className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                  Delta Products / Solutions to Address <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="pr-products"
                  placeholder="e.g. Delta SmartTrack 5.0, Delta CloudSuite ERP, Delta IoT Gateway"
                  rows={3}
                  {...register("productsToAddress")}
                  className={cn("resize-none", errors.productsToAddress && "border-red-300")}
                />
                <FieldError message={errors.productsToAddress?.message} />
              </div>

              {/* Info Links + Contact */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pr-links" className="mb-1.5 text-xs font-semibold text-slate-600">
                    Info Material &amp; Image Links
                  </Label>
                  <Input
                    id="pr-links"
                    placeholder="https://drive.google.com/…"
                    {...register("infoMaterialLinks")}
                  />
                </div>
                <div>
                  <Label htmlFor="pr-contact" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    Contact for Product Questions
                  </Label>
                  <Input
                    id="pr-contact"
                    placeholder="Jane Smith, jane@deltacorp.com"
                    {...register("contactPerson")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─ Product Details ─ */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <SectionLabel>Product Details</SectionLabel>
            <div className="space-y-4">

              {/* Product Description & Benefits */}
              <div>
                <Label htmlFor="pr-desc" className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                  Product Description &amp; Benefits <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="pr-desc"
                  placeholder={"Describe what the product does and its key benefits for the customer.\n\nExample:\nDelta SmartTrack 5.0 is a real-time asset management platform that reduces equipment downtime by 40% through AI-powered predictive maintenance."}
                  rows={5}
                  {...register("productDescription")}
                  className={cn("resize-none", errors.productDescription && "border-red-300")}
                />
                <FieldError message={errors.productDescription?.message} />
              </div>

              {/* Existing Systems */}
              <div>
                <Label htmlFor="pr-systems" className="mb-1.5 text-xs font-semibold text-slate-600">
                  Existing Systems to Consider / Integrate / Replace
                  <span className="ml-1 font-normal text-slate-400">(optional)</span>
                </Label>
                <Textarea
                  id="pr-systems"
                  placeholder="e.g. SAP ERP, legacy SCADA systems, Siemens MES"
                  rows={3}
                  {...register("existingSystems")}
                  className="resize-none"
                />
              </div>

              {/* Test Reports */}
              <div>
                <Label htmlFor="pr-tests" className="mb-1.5 text-xs font-semibold text-slate-600">
                  Test Reports or Performance Results
                  <span className="ml-1 font-normal text-slate-400">(optional)</span>
                </Label>
                <Textarea
                  id="pr-tests"
                  placeholder="e.g. ISO 9001 certified, 99.97% uptime SLA, 3rd-party benchmark results"
                  rows={3}
                  {...register("testReports")}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {triggerError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {triggerError}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={isTriggering} className="w-full" size="lg">
            {isTriggering
              ? <><Loader2 className="h-4 w-4 animate-spin" />Sending to AI Agent…</>
              : <><Zap className="h-4 w-4" />Send to AI Agent</>}
          </Button>
        </div>

        {/* ── Right: Relevance AI chatbox (5/12) ──────────────── */}
        <div className="sticky top-6 lg:col-span-5">
          {/* Premium container card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Header strip */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div className="flex items-center gap-2.5">
                {/* Live pulse dot */}
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[13px] font-semibold text-slate-700">
                  DeltaPR Interactive Assistant
                </span>
              </div>
              <span className="rounded-full bg-[#0087DC]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0087DC]">
                Live
              </span>
            </div>

            {/* Iframe */}
            <div className="p-1">
              <iframe
                src="https://app.relevanceai.com/agents/d7b62b/b775f35a-beef-4538-b4fe-a26e39c85077/7d952fd2-b498-45f4-83e0-97984ef1eab7/embed-chat?hide_tool_steps=false&hide_file_uploads=false&hide_conversation_list=false&bubble_style=agent&primary_color=%230087dc&bubble_icon=pd%2Fchat&input_placeholder_text=Type+your+message...&hide_logo=true&hide_description=false"
                className="min-h-[650px] w-full rounded-xl border-0"
                allow="microphone"
                title="DeltaPR Interactive Assistant"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Review phase (after generation)
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewPhaseProps {
  title: string;
  draftBody: string;
  isSimulated: boolean;
  onDraftChange: (v: string) => void;
  onRegenerate: () => void;
  isSaving: boolean;
  isSubmitting: boolean;
  saveError: string | null;
  onSaveAsDraft: () => void;
  onSubmitForApproval: () => void;
}

function ReviewPhase({
  title, draftBody, isSimulated,
  onDraftChange, onRegenerate,
  isSaving, isSubmitting, saveError,
  onSaveAsDraft, onSubmitForApproval,
}: ReviewPhaseProps) {
  const wordCount = draftBody.trim() ? draftBody.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Draft Generated
          </span>
          <span className="text-sm text-slate-500">{wordCount} words</span>
          {isSimulated && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">
              ⚡ Simulation
            </span>
          )}
        </div>
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-[0.98]"
        >
          <RotateCcw className="h-3 w-3" />
          Start Over
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Preview */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-7 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0087DC] text-[11px] font-bold text-white">✓</span>
              <h2 className="text-sm font-semibold text-slate-800">Review &amp; Edit Draft</h2>
            </div>
            <span className="text-[11px] font-medium text-emerald-600">✓ Editable</span>
          </div>
          <div className="p-5">
            <PressReleasePreview
              title={title}
              body={draftBody}
              onChange={onDraftChange}
              isEditable={true}
              isGenerating={false}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
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
              onClick={onSaveAsDraft}
              disabled={isSaving || isSubmitting}
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
              onClick={onSubmitForApproval}
              disabled={isSaving || isSubmitting}
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
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export function PressReleaseStudio() {
  const [phase, setPhase]               = useState<WizardPhase>("select-type");
  const [selectedType, setSelectedType] = useState<PressReleaseType | null>(null);
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentCtx, setCurrentCtx]     = useState<PressReleaseStructuredContext | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [agentResult, setAgentResult]   = useState<AgentSubmittedState | null>(null);

  // Kept for the review phase (Gemini fallback path — accessible via ReviewPhase)
  const [draftBody, setDraftBody]   = useState("");
  const [isSimulated, setIsSimulated] = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [saved, setSaved]           = useState<SavedState | null>(null);

  const [isTriggering, startTrigger] = useTransition();
  const [isSaving,     startSave]    = useTransition();
  const [isSubmitting, startSubmit]  = useTransition();

  function handleTypeSelect(type: PressReleaseType) {
    setSelectedType(type);
    setTriggerError(null);
    setPhase("fill-form");
  }

  // ── Primary path: send form to Relevance AI agent ──────────────────────
  function handleAgentTrigger(title: string, ctx: PressReleaseStructuredContext) {
    setTriggerError(null);
    setCurrentTitle(title);
    setCurrentCtx(ctx);
    startTrigger(async () => {
      const result = await triggerPressReleaseAgent({
        title,
        pressReleaseType: ctx.pressReleaseType,
        context: ctx,
      });
      if (result.success) {
        setAgentResult({ jobId: result.jobId ?? "triggered", simulated: result.simulated });
        setPhase("agent-submitted");
      } else {
        setTriggerError(result.error ?? "Failed to trigger the agent. Please try again.");
      }
    });
  }

  // ── Secondary path: Gemini generate (still available in review phase) ──
  function handleSaveAsDraft() {
    setSaveError(null);
    startSave(async () => {
      const result = await saveAsDraft({
        title: currentTitle,
        bulletPoints: currentCtx?.thematicFocus ?? "",
        contentType: "press_release",
        generatedBody: draftBody,
        editedBody: draftBody,
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
        title: currentTitle,
        bulletPoints: currentCtx?.thematicFocus ?? "",
        contentType: "press_release",
        generatedBody: draftBody,
        editedBody: draftBody,
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
    setPhase("select-type");
    setSelectedType(null);
    setCurrentTitle("");
    setCurrentCtx(null);
    setDraftBody("");
    setIsSimulated(false);
    setTriggerError(null);
    setSaveError(null);
    setSaved(null);
    setAgentResult(null);
  }

  // ── Agent submitted confirmation ───────────────────────────────────────
  if (phase === "agent-submitted" && agentResult) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-full max-w-md animate-fade-in">
          {/* Success icon */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0087DC]/10 ring-8 ring-[#0087DC]/5">
                <Bot className="h-10 w-10 text-[#0087DC]" />
              </div>
              <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-md">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Agent Triggered!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Your press release brief has been sent to the Relevance AI agent.
              The agent is now processing your request.
            </p>
            {agentResult.simulated && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                ⚡ Simulation Mode — add Relevance AI credentials to activate live agent
              </p>
            )}
          </div>

          {/* Job ID card */}
          <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Submission Details
            </p>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Press Release Type</span>
                <span className="font-semibold text-slate-800">{selectedType?.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Title</span>
                <span className="max-w-[180px] truncate text-right font-semibold text-slate-800">
                  {currentTitle}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span className="text-slate-500">Job / Session ID</span>
                <code className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                  {agentResult.jobId}
                </code>
              </div>
            </div>
          </div>

          {/* Next steps */}
          <div className="mb-6 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-blue-400">
              What happens next
            </p>
            <ul className="space-y-1.5 text-[13px] text-blue-700">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                The Relevance AI agent is generating your draft
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Review the output in your Relevance AI workspace
              </li>
              <li className="flex items-start gap-2">
                <SendHorizonal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Copy the draft back here to submit it for approval
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button asChild size="lg" className="flex-1">
              <Link href="/dashboard">
                Back to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="flex-1" onClick={handleStartOver}>
              Create Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Saved (Gemini path) ────────────────────────────────────────────────
  if (phase === "saved" && saved) {
    return (
      <div className="flex items-center justify-center py-16">
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
    );
  }

  return (
    <div>
      {phase === "select-type" && (
        <TypeSelectionGrid onSelect={handleTypeSelect} />
      )}

      {phase === "fill-form" && selectedType && (
        <DetailedForm
          selectedType={selectedType}
          onBack={() => setPhase("select-type")}
          onAgentTrigger={handleAgentTrigger}
          isTriggering={isTriggering}
          triggerError={triggerError}
        />
      )}

      {phase === "review" && (
        <ReviewPhase
          title={currentTitle}
          draftBody={draftBody}
          isSimulated={isSimulated}
          onDraftChange={setDraftBody}
          onRegenerate={handleStartOver}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          saveError={saveError}
          onSaveAsDraft={handleSaveAsDraft}
          onSubmitForApproval={handleSubmitForApproval}
        />
      )}
    </div>
  );
}
