"use client";

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileUp,
  FileText,
  ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  Sparkles,
  Building2,
  Calendar,
  DollarSign,
  Hash,
} from "lucide-react";
import { extractInvoice } from "@/actions/invoices/extract-invoice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InvoiceSkeleton } from "@/components/ui/skeleton-loader";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceSchema } from "@/lib/invoices/schema";

type Phase = "idle" | "loading" | "success" | "error";

const LOADING_STEPS = [
  "Reading your document…",
  "Sending to Gemini AI…",
  "Extracting invoice data…",
  "Parsing line items…",
  "Almost done…",
];

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp";
const MAX_MB = 10;

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf")
    return <FileText className="h-5 w-5 text-red-500" aria-hidden="true" />;
  return <ImageIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FieldRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

interface ExtractedDataViewProps {
  data: InvoiceSchema;
  taskId?: string;
  extractedOnly?: boolean;
  simulated?: boolean;
  onReset: () => void;
}

function ExtractedDataView({ data, taskId, extractedOnly, simulated, onReset }: ExtractedDataViewProps) {
  return (
    <div className="space-y-6">
      {/* Simulation mode notice */}
      {simulated && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="mt-px text-base leading-none">⚡</span>
          <div>
            <p className="font-semibold">Simulation Mode — mock invoice data</p>
            <p className="mt-0.5 text-xs text-amber-700">
              No API key was found. A hardcoded invoice was used so you can test the full UI and database workflow. Add <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">GEMINI_API_KEY</code> to <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">.env.local</code> for live extraction.
            </p>
          </div>
        </div>
      )}

      {/* Status banner */}
      {extractedOnly ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Data extracted — not saved to database</p>
            <p className="mt-0.5 text-amber-700">
              Sign in and configure Supabase to persist invoices and create approval tasks automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="font-medium">Invoice extracted &amp; task created</p>
            <p className="mt-0.5 text-emerald-700">
              Submitted for manager approval automatically.
            </p>
          </div>
          {taskId && (
            <Button size="sm" asChild className="shrink-0 bg-emerald-700 hover:bg-emerald-800">
              <Link href="/tasks">
                View Task
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Extracted summary */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Extracted Invoice Data
            </CardTitle>
            <Badge variant={extractedOnly ? "pending" : "approved"}>
              {extractedOnly ? "Preview only" : "Saved"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key fields grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldRow icon={Building2} label="Vendor" value={data.vendorName} />
            <FieldRow icon={Hash} label="Invoice Number" value={data.invoiceNumber} />
            <FieldRow icon={Calendar} label="Invoice Date" value={data.invoiceDate ? formatDate(data.invoiceDate) : null} />
            <FieldRow icon={Calendar} label="Due Date" value={data.dueDate ? formatDate(data.dueDate) : null} />
          </div>

          {/* Total amount — prominent */}
          {data.totalAmount != null && (
            <div className="flex items-center gap-3 rounded-xl border-2 border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Amount Due</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(data.totalAmount, data.currency ?? "USD")}
                </p>
              </div>
              {(data.subtotal != null || data.taxAmount != null) && (
                <div className="ml-auto text-right text-xs text-muted-foreground space-y-0.5">
                  {data.subtotal != null && (
                    <p>Subtotal: {formatCurrency(data.subtotal, data.currency ?? "USD")}</p>
                  )}
                  {data.taxAmount != null && (
                    <p>Tax: {formatCurrency(data.taxAmount, data.currency ?? "USD")}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Line items table */}
          {data.lineItems.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Line Items ({data.lineItems.length})
                </p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm" aria-label="Invoice line items">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="py-2 pl-3 pr-2 text-left text-xs font-semibold text-muted-foreground">Description</th>
                        <th className="py-2 px-2 text-right text-xs font-semibold text-muted-foreground">Qty</th>
                        <th className="hidden py-2 px-2 text-right text-xs font-semibold text-muted-foreground sm:table-cell">Unit Price</th>
                        <th className="py-2 pl-2 pr-3 text-right text-xs font-semibold text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.lineItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="py-2.5 pl-3 pr-2 font-medium">{item.description}</td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">{item.quantity}</td>
                          <td className="hidden py-2.5 px-2 text-right text-muted-foreground sm:table-cell">
                            {item.unitPrice != null
                              ? formatCurrency(item.unitPrice, data.currency ?? "USD")
                              : "—"}
                          </td>
                          <td className="py-2.5 pl-2 pr-3 text-right font-medium">
                            {formatCurrency(item.amount, data.currency ?? "USD")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" onClick={onReset} className="w-full">
        Analyze Another Invoice
      </Button>
    </div>
  );
}

export function InvoiceUploadForm() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<{
    data: InvoiceSchema;
    taskId?: string;
    extractedOnly?: boolean;
    simulated?: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // Cycle through loading messages
  useEffect(() => {
    if (phase !== "loading") return;
    const interval = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [phase]);

  const validateAndSetFile = useCallback((file: File): string | null => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return `"${file.name}" is not a supported file type. Please upload a PDF, PNG, or JPG.`;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return `"${file.name}" is too large (${formatBytes(file.size)}). Maximum is ${MAX_MB} MB.`;
    }
    return null;
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateAndSetFile(file);
    if (err) {
      setErrorMessage(err);
      setPhase("error");
    } else {
      setSelectedFile(file);
      setErrorMessage(null);
      setPhase("idle");
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const err = validateAndSetFile(file);
    if (err) {
      setErrorMessage(err);
      setPhase("error");
    } else {
      setSelectedFile(file);
      setErrorMessage(null);
      setPhase("idle");
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleAnalyze() {
    if (!selectedFile) return;
    setPhase("loading");
    setLoadingStep(0);
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("file", selectedFile);

    startTransition(async () => {
      const res = await extractInvoice(formData);
      if (res.success && res.data) {
        setResult({
          data:          res.data,
          taskId:        res.taskId,
          extractedOnly: res.extractedOnly,
          simulated:     res.simulated,
        });
        setPhase("success");
      } else {
        setErrorMessage(res.error ?? "An unexpected error occurred.");
        setPhase("error");
      }
    });
  }

  function handleReset() {
    setPhase("idle");
    setSelectedFile(null);
    setResult(null);
    setErrorMessage(null);
    setLoadingStep(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (phase === "loading") {
    return (
      <div className="space-y-6">
        {/* Loading header */}
        <div className="flex items-center gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-6 py-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-indigo-200 opacity-50" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 shadow">
              <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-800">
              {LOADING_STEPS[loadingStep]}
            </p>
            <p className="mt-0.5 text-xs text-indigo-500">
              Gemini 1.5 Pro is reading your document
            </p>
          </div>
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-400" aria-hidden="true" />
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-700"
              style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
              role="progressbar"
              aria-valuenow={Math.round(((loadingStep + 1) / LOADING_STEPS.length) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="flex justify-between px-0.5">
            {LOADING_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                  idx <= loadingStep ? "bg-indigo-500" : "bg-slate-200"
                )}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        {/* Skeleton preview of extracted data */}
        <InvoiceSkeleton />
      </div>
    );
  }

  if (phase === "success" && result) {
    return (
      <ExtractedDataView
        data={result.data}
        taskId={result.taskId}
        extractedOnly={result.extractedOnly}
        simulated={result.simulated}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardHeader className="pb-4 pt-7 px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <FileUp className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base">Upload Invoice</CardTitle>
              <CardDescription>
                Gemini 1.5 Pro extracts vendor, amounts, dates, and line items — automatically.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 px-7 pb-7">
          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload invoice file — click or drag and drop"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            className={cn(
              "relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              isDragOver
                ? "border-primary bg-primary/5"
                : selectedFile
                ? "border-emerald-400 bg-emerald-50/50"
                : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={handleFileChange}
              aria-hidden="true"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-border">
                  <FileIcon mimeType={selectedFile.type} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                </div>
                <p className="text-xs text-emerald-600 font-medium">Ready to analyze ✓</p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <FileUp className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold">
                  {isDragOver ? "Drop your invoice here" : "Drag & drop or click to upload"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, PNG, JPG, WEBP — up to 10 MB</p>
              </>
            )}
          </div>

          {/* Selected file actions */}
          {selectedFile && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileIcon mimeType={selectedFile.type} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                aria-label="Remove selected file"
                className="ml-3 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Error message */}
          {phase === "error" && errorMessage && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Unable to process file</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Analyze button */}
          <Button
            onClick={handleAnalyze}
            disabled={!selectedFile || isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            size="lg"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Analyze Invoice with AI
          </Button>
        </CardContent>
      </Card>

      {/* How it works */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          How it works
        </p>
        <ol className="space-y-3">
          {[
            { step: "1", text: "Upload your invoice PDF or image" },
            { step: "2", text: "Gemini AI reads and extracts all data" },
            { step: "3", text: "A task is automatically created for manager approval" },
            { step: "4", text: "Your team reviews the extracted data and approves or rejects" },
          ].map(({ step, text }) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {step}
              </span>
              <p className="text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
