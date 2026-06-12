"use client";

import { useState, useTransition, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Loader2,
  Paperclip,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { extractInvoice } from "@/actions/invoices/extract-invoice";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INITIAL_BUDGET_LINES,
  MONTHLY_DATA,
  CATEGORY_COLORS,
  fmt, fmtFull,
  getTimeframeMetrics,
  getLinesForTimeframe,
  dateToQuarterIndex,
  type BudgetLine,
  type TimeframeTab,
  type ChartType,
} from "@/lib/budget/data";
import type { InvoiceSchema } from "@/lib/invoices/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Formatters for Recharts tooltips
// ─────────────────────────────────────────────────────────────────────────────

const fmtAxis = (v: number) =>
  v >= 1_000 ? `$${(v / 1_000).toFixed(0)}k` : `$${v}`;

// ─────────────────────────────────────────────────────────────────────────────
// Hero metric card
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon: Icon, accent, trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {sub && (
          <p className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            trend === "up"   ? "text-emerald-600"
            : trend === "down" ? "text-red-500"
            : "text-slate-400"
          )}>
            {trend === "up" && <TrendingUp className="h-3 w-3" />}
            {trend === "down" && <TrendingDown className="h-3 w-3" />}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart type selector dropdown
// ─────────────────────────────────────────────────────────────────────────────

const CHART_OPTIONS: { value: ChartType; label: string }[] = [
  { value: "bar",   label: "Bar Chart — Budget vs Actual" },
  { value: "donut", label: "Donut Chart — Category Split" },
  { value: "area",  label: "Area Chart — Monthly Cumulative" },
];

function ChartSelector({
  value, onChange,
}: { value: ChartType; onChange: (v: ChartType) => void }) {
  const [open, setOpen] = useState(false);
  const current = CHART_OPTIONS.find((o) => o.value === value)!;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        {current.label}
        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {CHART_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-left transition hover:bg-slate-50",
                opt.value === value ? "font-semibold text-[#0087DC] bg-blue-50/50" : "text-slate-700"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart panel
// ─────────────────────────────────────────────────────────────────────────────

function ChartPanel({
  chartType, lines, tab,
}: { chartType: ChartType; lines: BudgetLine[]; tab: TimeframeTab }) {
  const timeframeLines = getLinesForTimeframe(lines, tab);

  // ── Bar chart data ──
  const barData = timeframeLines
    .filter((l) => l.subCategory === null || timeframeLines.filter((x) => x.category === l.category).length === 1)
    .map((l) => ({
      name: l.subCategory ?? l.category,
      Budgeted: l.budgeted,
      Actual: l.spent,
    }));

  // For categories with sub-categories, aggregate at category level
  const categoryMap = new Map<string, { Budgeted: number; Actual: number }>();
  for (const l of timeframeLines) {
    const existing = categoryMap.get(l.category) ?? { Budgeted: 0, Actual: 0 };
    existing.Budgeted += l.budgeted;
    existing.Actual   += l.spent;
    categoryMap.set(l.category, existing);
  }
  const barDataGrouped = Array.from(categoryMap.entries()).map(([name, v]) => ({
    name,
    Budgeted: v.Budgeted,
    Actual:   v.Actual,
  }));

  // ── Donut data ──
  const donutData = Array.from(categoryMap.entries()).map(([name, v]) => ({
    name,
    value: v.Actual,
    color: CATEGORY_COLORS[name] ?? "#94a3b8",
  })).filter((d) => d.value > 0);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
        <p className="mb-2 text-xs font-bold text-slate-500">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-600">{p.name}:</span>
            <span className="font-semibold text-slate-900">{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.payload.color }} />
          <span className="font-semibold text-slate-900">{p.name}</span>
        </div>
        <p className="mt-1 text-sm text-slate-600">{fmt(p.value)}</p>
      </div>
    );
  };

  return (
    <div className="h-[320px] w-full">
      {chartType === "bar" && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barDataGrouped} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="Budgeted" fill="#0087DC" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Actual"   fill="#02d5ce" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {chartType === "donut" && (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={75}
              outerRadius={120}
              paddingAngle={3}
              dataKey="value"
            >
              {donutData.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      {chartType === "area" && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={MONTHLY_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="gradBudgeted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0087DC" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0087DC" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSpent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#02d5ce" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#02d5ce" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Area type="monotone" dataKey="budgeted" name="Budgeted (cum.)" stroke="#0087DC" fill="url(#gradBudgeted)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="spent"    name="Actual (cum.)"   stroke="#02d5ce" fill="url(#gradSpent)"    strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category breakdown table
// ─────────────────────────────────────────────────────────────────────────────

function CategoryTable({
  lines, tab,
}: { lines: BudgetLine[]; tab: TimeframeTab }) {
  const rows = getLinesForTimeframe(lines, tab);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-800">Budget Breakdown</h3>
        <p className="text-[11px] text-slate-400">{tab} · all categories</p>
      </div>
      <div className="divide-y divide-slate-50">
        {rows.map((row) => {
          const pct = row.budgeted > 0 ? Math.min(100, Math.round((row.spent / row.budgeted) * 100)) : 0;
          const over = row.spent > row.budgeted;
          return (
            <div key={row.id} className="px-6 py-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">
                      {row.subCategory ?? row.category}
                    </p>
                    {row.subCategory && (
                      <p className="text-[11px] text-slate-400">{row.category}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-[13px] font-semibold tabular-nums", over ? "text-red-500" : "text-slate-700")}>
                    {fmt(row.spent)}
                  </p>
                  <p className="text-[11px] text-slate-400">of {fmt(row.budgeted)}</p>
                </div>
              </div>
              <Progress
                value={pct}
                className="h-1.5"
                indicatorClassName={over ? "bg-red-400" : pct > 85 ? "bg-amber-400" : "bg-[#a7d33f]"}
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>{pct}% used</span>
                <span>{fmt(row.remaining)} remaining</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice upload zone
// ─────────────────────────────────────────────────────────────────────────────

type UploadPhase = "idle" | "loading" | "preview" | "approved" | "error";

function InvoiceUploadZone({
  onResult,
}: {
  onResult: (data: InvoiceSchema) => void;
}) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [, startTransition] = useTransition();

  const process = useCallback((file: File) => {
    setPhase("loading");
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const result = await extractInvoice(fd);
      if (result.success && result.data) {
        onResult(result.data);
        setPhase("preview");
      } else {
        setError(result.error ?? "Extraction failed.");
        setPhase("error");
      }
    });
  }, [onResult]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) process(file);
  }, [process]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) process(file);
  }, [process]);

  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#0087DC]" />
        <p className="text-sm font-medium text-slate-600">Extracting data with AI…</p>
        <p className="text-xs text-slate-400">Gemini is reading your invoice and inferring budget category</p>
      </div>
    );
  }

  return (
    <label
      htmlFor="invoice-upload"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-12 transition-all duration-200",
        dragOver
          ? "border-[#0087DC] bg-blue-50"
          : "border-slate-200 bg-slate-50/50 hover:border-[#0087DC]/50 hover:bg-blue-50/30"
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
        <Upload className="h-5 w-5 text-[#0087DC]" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700">
          Drop invoice here or <span className="text-[#0087DC]">browse files</span>
        </p>
        <p className="mt-0.5 text-xs text-slate-400">PDF, PNG, JPG · max 10 MB</p>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
      <input
        id="invoice-upload"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={handleFile}
      />
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget impact banner — shown after AI parses invoice, before approval
// ─────────────────────────────────────────────────────────────────────────────

function ImpactBanner({
  invoice,
  lines,
  tab,
  onApprove,
  onDiscard,
}: {
  invoice: InvoiceSchema;
  lines: BudgetLine[];
  tab: TimeframeTab;
  onApprove: () => void;
  onDiscard: () => void;
}) {
  const amount = invoice.totalAmount ?? 0;

  // Find matching budget line
  const match = lines.find(
    (l) =>
      l.category === invoice.inferredCategory &&
      (invoice.inferredSubCategory == null || l.subCategory === invoice.inferredSubCategory)
  ) ?? lines.find((l) => l.category === invoice.inferredCategory);

  const timeframeLines = match ? getLinesForTimeframe([match], tab) : null;
  const lineData = timeframeLines?.[0];

  const before = lineData?.remaining ?? 0;
  const after  = before - amount;
  const exceeds = after < 0;
  const newPct  = lineData ? Math.min(100, Math.round(((lineData.spent + amount) / lineData.budgeted) * 100)) : 0;

  return (
    <div className={cn(
      "overflow-hidden rounded-2xl border shadow-sm",
      exceeds ? "border-red-200 bg-red-50/50" : "border-emerald-200 bg-emerald-50/40"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-5 py-3 border-b",
        exceeds ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
      )}>
        <div className="flex items-center gap-2">
          {exceeds
            ? <AlertTriangle className="h-4 w-4 text-red-500" />
            : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          <span className={cn("text-sm font-semibold", exceeds ? "text-red-700" : "text-emerald-700")}>
            {exceeds ? "Budget Exceeded" : "Impact Preview"}
          </span>
        </div>
        <button onClick={onDiscard} className="rounded-md p-1 text-slate-400 hover:bg-white/60 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-4 p-5">
        {/* Invoice summary */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Vendor</p>
            <p className="text-sm font-semibold text-slate-800">{invoice.vendorName ?? "Unknown"}</p>
            {invoice.invoiceNumber && (
              <p className="text-[11px] text-slate-400">#{invoice.invoiceNumber}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Amount</p>
            <p className="text-lg font-bold text-slate-900">{fmtFull(amount)}</p>
            <p className="text-[11px] text-slate-400">{invoice.invoiceDate}</p>
          </div>
        </div>

        {/* Category inference pill */}
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
            {invoice.inferredCategory}
          </span>
          {invoice.inferredSubCategory && (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
              {invoice.inferredSubCategory}
            </span>
          )}
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500">
            {tab}
          </span>
        </div>

        {/* Before / after calculation */}
        {lineData && (
          <div className="space-y-2 rounded-xl bg-white/70 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Remaining before</span>
              <span className="font-semibold text-slate-700">{fmt(before)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">This invoice</span>
              <span className="font-semibold text-red-500">− {fmt(amount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-sm">
              <span className="font-semibold text-slate-700">Remaining after</span>
              <span className={cn("font-bold", after < 0 ? "text-red-500" : "text-emerald-600")}>
                {after < 0 ? `(${fmt(Math.abs(after))}) over` : fmt(after)}
              </span>
            </div>
          </div>
        )}

        {/* Warning message */}
        {exceeds && lineData && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Warning: This transaction exceeds your remaining {tab}{" "}
              <strong>{lineData.subCategory ?? lineData.category}</strong> budget by{" "}
              <strong>{fmt(Math.abs(after))}</strong>.
            </span>
          </div>
        )}

        {/* Progress bar */}
        {lineData && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Category depletion after approval</span>
              <span className="font-semibold">{newPct}%</span>
            </div>
            <Progress
              value={newPct}
              className="h-2"
              indicatorClassName={
                newPct >= 100 ? "bg-red-400" : newPct >= 85 ? "bg-amber-400" : "bg-[#a7d33f]"
              }
            />
          </div>
        )}

        {/* Line items */}
        {invoice.lineItems.length > 0 && (
          <div className="rounded-xl bg-white/70 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Line Items
            </p>
            <div className="space-y-1">
              {invoice.lineItems.map((item, i) => (
                <div key={i} className="flex justify-between gap-3 text-xs">
                  <span className="text-slate-600 truncate">{item.description}</span>
                  <span className="shrink-0 font-semibold text-slate-700">{fmtFull(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={onApprove}
            size="sm"
            className={cn("flex-1", exceeds && "bg-red-500 hover:bg-red-600")}
          >
            <Wallet className="h-3.5 w-3.5" />
            {exceeds ? "Approve Anyway" : "Approve Expense"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function BudgetCommandCenter() {
  const [lines, setLines]               = useState<BudgetLine[]>(INITIAL_BUDGET_LINES);
  const [activeTab, setActiveTab]       = useState<TimeframeTab>("Q2");
  const [chartType, setChartType]       = useState<ChartType>("bar");
  const [pendingInvoice, setPendingInvoice] = useState<InvoiceSchema | null>(null);
  const [approvedCount, setApprovedCount] = useState(0);

  const metrics = getTimeframeMetrics(lines, activeTab);

  function handleInvoiceResult(data: InvoiceSchema) {
    setPendingInvoice(data);
  }

  function handleApprove() {
    if (!pendingInvoice) return;
    const amount    = pendingInvoice.totalAmount ?? 0;
    const qIdx      = dateToQuarterIndex(pendingInvoice.invoiceDate);

    setLines((prev) =>
      prev.map((line) => {
        if (line.category !== pendingInvoice.inferredCategory) return line;
        // If sub-category matches (or invoice has none), apply to this line
        if (
          pendingInvoice.inferredSubCategory != null &&
          line.subCategory !== pendingInvoice.inferredSubCategory
        ) return line;
        const newSpent = [...line.quarterlySpent] as [number, number, number, number];
        newSpent[qIdx] = newSpent[qIdx] + amount;
        return { ...line, quarterlySpent: newSpent };
      })
    );
    setApprovedCount((c) => c + 1);
    setPendingInvoice(null);
  }

  const TABS: TimeframeTab[] = ["Q1", "Q2", "Q3", "Q4", "H1", "Full Year"];

  return (
    <div className="space-y-6">

      {/* ── Hero metrics ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total Budget"
          value={fmt(metrics.budgeted)}
          sub={`${activeTab} allocation`}
          icon={DollarSign}
          accent="bg-blue-50 text-[#0087DC]"
          trend="neutral"
        />
        <MetricCard
          label="Total Spent"
          value={fmt(metrics.spent)}
          sub={`${metrics.pct}% of ${activeTab} budget`}
          icon={TrendingUp}
          accent={metrics.pct > 90 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}
          trend={metrics.pct > 90 ? "down" : "up"}
        />
        <MetricCard
          label="Remaining"
          value={fmt(metrics.remaining)}
          sub={`${100 - metrics.pct}% unspent`}
          icon={Wallet}
          accent="bg-slate-50 text-slate-500"
          trend="neutral"
        />
        <MetricCard
          label="Invoices Approved"
          value={String(approvedCount + 14)}
          sub={`${approvedCount} in this session`}
          icon={Paperclip}
          accent="bg-violet-50 text-violet-600"
          trend="up"
        />
      </div>

      {/* ── Timeframe tabs ─────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TimeframeTab)}>
        <div className="flex items-center justify-between">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
            ))}
          </TabsList>
          <p className="hidden text-[11px] text-slate-400 sm:block">
            IC-Annual-Marketing-Budget · FY 2026
          </p>
        </div>
      </Tabs>

      {/* ── Overall budget bar ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">Overall {activeTab} Budget Utilisation</span>
          <span className={cn("font-bold tabular-nums", metrics.pct > 90 ? "text-red-500" : "text-slate-700")}>
            {metrics.pct}%
          </span>
        </div>
        <Progress
          value={metrics.pct}
          className="h-3"
          indicatorClassName={
            metrics.pct >= 100 ? "bg-red-400" : metrics.pct >= 85 ? "bg-amber-400" : "bg-[#a7d33f]"
          }
        />
        <div className="mt-2 flex justify-between text-[11px] text-slate-400">
          <span>Spent: {fmt(metrics.spent)}</span>
          <span>Budget: {fmt(metrics.budgeted)}</span>
        </div>
      </div>

      {/* ── Charts + Category table ────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chart panel */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Budget Analytics</h3>
              <p className="text-[11px] text-slate-400">{activeTab} · all categories</p>
            </div>
            <ChartSelector value={chartType} onChange={setChartType} />
          </div>
          <div className="p-6">
            <ChartPanel chartType={chartType} lines={lines} tab={activeTab} />
          </div>
        </div>

        {/* Category table */}
        <div className="lg:col-span-2">
          <CategoryTable lines={lines} tab={activeTab} />
        </div>
      </div>

      {/* ── Invoice scanner ────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-slate-800">Scan &amp; Categorize Invoice</h3>
            <p className="text-[11px] text-slate-400">
              AI reads your invoice and maps it to the correct budget line
            </p>
          </div>
          <div className="p-6">
            {pendingInvoice ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700">Invoice scanned successfully</p>
                <p className="text-xs text-slate-400">Review the impact panel and approve or discard</p>
              </div>
            ) : (
              <InvoiceUploadZone onResult={handleInvoiceResult} />
            )}
          </div>
        </div>

        {/* Impact banner */}
        <div>
          {pendingInvoice ? (
            <ImpactBanner
              invoice={pendingInvoice}
              lines={lines}
              tab={activeTab}
              onApprove={handleApprove}
              onDiscard={() => setPendingInvoice(null)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <TrendingDown className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-400">No invoice pending</p>
              <p className="max-w-[200px] text-xs text-slate-400">
                Upload an invoice on the left to see budget impact analysis here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
