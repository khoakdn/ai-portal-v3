"use client";

import { useState, useTransition, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  RotateCcw,
  Settings2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { extractInvoice } from "@/actions/invoices/extract-invoice";
import { resetInvoicePlatformData } from "@/actions/invoices/reset-platform-data";
import { reset2026InvoiceData } from "@/actions/invoices/reset-2026-invoice-data";
import {
  buildDemoInvoiceDataset,
  type QuarterFilter,
} from "@/lib/invoices/demo-invoice-dataset";
import {
  calculateInvoiceBudgetMetrics,
  getRecordAmount,
  getRecordQuarter,
  isApprovedInvoiceRecord,
  matchesQuarterFilter,
} from "@/lib/invoices/invoice-budget-metrics";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CATEGORY_COLORS,
  DEFAULT_ANNUAL_BUDGET_TOTAL,
  fmt, fmtFull,
  formatBudgetEur,
  getLinesForTimeframe,
  scaleBudgetLinesToAnnualTotal,
  scaleMonthlyBudgetData,
  dateToQuarterIndex,
  type BudgetLine,
  type MonthlyDataPoint,
  type TimeframeTab,
  type ChartType,
} from "@/lib/budget/data";
import {
  getDefaultMarketingBudgetSnapshot,
  getZeroMarketingBudgetSnapshot,
  loadAllocatedBudget,
  loadMarketingBudgetSnapshot,
  reset2026SpendingInSnapshot,
  saveAllocatedBudget,
  saveMarketingBudgetSnapshot,
} from "@/lib/budget/storage";
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
  label, value, sub, icon: Icon, accent, trend, alert,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  trend?: "up" | "down" | "neutral";
  alert?: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-col gap-3 rounded-2xl border p-6 shadow-sm",
      alert
        ? "border-red-100 bg-red-50 text-red-700"
        : "border-slate-100 bg-white"
    )}>
      <div className="flex items-start justify-between">
        <p className={cn(
          "text-[11px] font-bold uppercase tracking-widest",
          alert ? "text-red-500/80" : "text-slate-400"
        )}>{label}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div>
        <p className={cn(
          "text-2xl font-bold tracking-tight",
          alert ? "text-red-700" : "text-slate-900"
        )}>{value}</p>
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
  chartType, lines, tab, monthlyData,
}: { chartType: ChartType; lines: BudgetLine[]; tab: TimeframeTab; monthlyData: MonthlyDataPoint[] }) {
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
          <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
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

function InvoiceMetricsStrip({
  totalUploaded,
  totalApproved,
  totalPending,
}: {
  totalUploaded: number;
  totalApproved: number;
  totalPending: number;
}) {
  const items = [
    {
      label: "Total Invoices Uploaded",
      value: totalUploaded,
      accent: "border-[#0087DC]/20 bg-gradient-to-br from-blue-50/80 to-white",
      valueClass: "text-[#0087DC]",
    },
    {
      label: "Approved Invoices",
      value: totalApproved,
      accent: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white",
      valueClass: "text-emerald-600",
    },
    {
      label: "Pending Review",
      value: totalPending,
      accent: "border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white",
      valueClass: "text-amber-700",
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-xl border px-4 py-3 shadow-sm",
            item.accent
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {item.label}
          </p>
          <p className={cn("mt-1 text-2xl font-bold tabular-nums", item.valueClass)}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Uploaded invoice history
// ─────────────────────────────────────────────────────────────────────────────

type UploadStatus = "extracting" | "ready" | "approved" | "error";
type InvoiceStatusFilter = "all" | "approved" | "pending";

interface UploadedInvoiceRecord {
  id: string;
  fileName: string;
  fileSize: number;
  status: UploadStatus;
  errorMessage?: string;
  invoiceData?: InvoiceSchema;
  demoTitle?: string;
  demoQuarter?: "Q1" | "Q2" | "Q3" | "Q4";
  demoBusinessUnit?: string;
}

const QUARTER_FILTER_OPTIONS: { id: QuarterFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Q1", label: "Q1" },
  { id: "Q2", label: "Q2" },
  { id: "Q3", label: "Q3" },
  { id: "Q4", label: "Q4" },
];

function QuarterFilterBar({
  value,
  onChange,
}: {
  value: QuarterFilter;
  onChange: (filter: QuarterFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Filter by Quarter
      </p>
      <div className="flex flex-wrap gap-1.5">
        {QUARTER_FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
              value === option.id
                ? "bg-[#0087DC] text-white shadow-sm ring-1 ring-[#0087DC]/30"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function uploadStatusLabel(status: UploadStatus): string {
  switch (status) {
    case "extracting": return "Extracting…";
    case "ready":      return "Ready for review";
    case "approved":   return "Approved";
    case "error":      return "Extraction failed";
  }
}

function isInvoiceYear2026(record: UploadedInvoiceRecord): boolean {
  const date = record.invoiceData?.invoiceDate;
  if (!date) return true;
  return date.startsWith("2026");
}

function InvoiceStatusFilterTabs({
  statusFilter,
  onStatusFilterChange,
  totalCount,
  approvedCount,
  pendingCount,
}: {
  statusFilter: InvoiceStatusFilter;
  onStatusFilterChange: (filter: InvoiceStatusFilter) => void;
  totalCount: number;
  approvedCount: number;
  pendingCount: number;
}) {
  const tabs: { id: InvoiceStatusFilter; label: string; count: number }[] = [
    { id: "all", label: "All Invoices", count: totalCount },
    { id: "approved", label: "✅ Approved", count: approvedCount },
    { id: "pending", label: "⏳ Pending Review", count: pendingCount },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onStatusFilterChange(tab.id)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
            statusFilter === tab.id
              ? "bg-[#0087DC] text-white shadow-sm ring-1 ring-[#0087DC]/30"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
          )}
        >
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
}

function UploadedInvoicesList({
  records,
  displayedRecords,
  statusFilter,
  onStatusFilterChange,
  quarterFilter,
  onQuarterFilterChange,
  totalCount,
  approvedCount,
  pendingCount,
  activeId,
  onRemove,
  onSelect,
}: {
  records: UploadedInvoiceRecord[];
  displayedRecords: UploadedInvoiceRecord[];
  statusFilter: InvoiceStatusFilter;
  onStatusFilterChange: (filter: InvoiceStatusFilter) => void;
  quarterFilter: QuarterFilter;
  onQuarterFilterChange: (filter: QuarterFilter) => void;
  totalCount: number;
  approvedCount: number;
  pendingCount: number;
  activeId: string | null;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  if (records.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100">
      <div className="space-y-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Uploaded Invoices
        </p>
        <QuarterFilterBar value={quarterFilter} onChange={onQuarterFilterChange} />
        <InvoiceStatusFilterTabs
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          totalCount={totalCount}
          approvedCount={approvedCount}
          pendingCount={pendingCount}
        />
      </div>
      {displayedRecords.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">
          No invoices match this filter.
        </p>
      ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <th className="px-4 py-2">Invoice</th>
            <th className="hidden px-3 py-2 md:table-cell">Vendor</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="hidden px-3 py-2 sm:table-cell">Quarter</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-4 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {displayedRecords.map((record) => (
            <tr
              key={record.id}
              className={cn(
                "transition-colors",
                activeId === record.id && "bg-blue-50/50",
                record.status === "ready" && "cursor-pointer hover:bg-slate-50/80"
              )}
              onClick={() => {
                if (record.status === "ready" && record.invoiceData) onSelect(record.id);
              }}
            >
              <td className="max-w-[180px] px-4 py-2.5">
                <p className="truncate font-medium text-slate-700">
                  {record.demoTitle ??
                    record.invoiceData?.lineItems?.[0]?.description ??
                    record.fileName}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {record.invoiceData?.invoiceNumber ?? record.fileName}
                </p>
              </td>
              <td className="hidden max-w-[120px] truncate px-3 py-2.5 text-xs text-slate-600 md:table-cell">
                {record.invoiceData?.vendorName ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-800">
                {formatBudgetEur(getRecordAmount(record))}
              </td>
              <td className="hidden px-3 py-2.5 text-xs font-medium text-slate-500 sm:table-cell">
                {getRecordQuarter(record)}
              </td>
              <td className="px-3 py-2.5">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  record.status === "extracting" && "bg-blue-50 text-blue-600",
                  record.status === "ready"      && "bg-amber-50 text-amber-700",
                  record.status === "approved"   && "bg-emerald-50 text-emerald-700",
                  record.status === "error"      && "bg-red-50 text-red-600"
                )}>
                  {record.status === "extracting" && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {uploadStatusLabel(record.status)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(record.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  Remove Invoice
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice upload zone
// ─────────────────────────────────────────────────────────────────────────────

function InvoiceUploadZone({
  onUploadFile,
}: {
  onUploadFile: (file: File) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const acceptFile = useCallback((file: File) => {
    setError(null);
    onUploadFile(file);
  }, [onUploadFile]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
    e.target.value = "";
  }, [acceptFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  }, [acceptFile]);

  return (
    <label
      htmlFor="invoice-upload"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 transition-all duration-200",
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
// Annual budget configuration dialog
// ─────────────────────────────────────────────────────────────────────────────

function BudgetConfigDialog({
  open,
  onOpenChange,
  budget,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: number;
  onApply: (value: number) => void;
}) {
  const [draftBudget, setDraftBudget] = useState<number>(budget);

  function handleOpenChange(next: boolean) {
    if (next) setDraftBudget(budget);
    onOpenChange(next);
  }

  function handleApply() {
    const nextAmount = Number.isFinite(draftBudget) ? draftBudget : 0;
    onApply(nextAmount);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[#0087DC]" />
            Set Annual Budget
          </DialogTitle>
          <DialogDescription>
            Adjust the FY baseline ceiling. All category allocations, utilisation percentages, and charts scale proportionally.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="annual-budget-input" className="text-xs font-semibold text-slate-600">
            Annual budget ceiling (EUR)
          </Label>
          <Input
            id="annual-budget-input"
            type="number"
            min={0}
            step={1000}
            value={draftBudget}
            onChange={(e) => setDraftBudget(Number(e.target.value) || 0)}
            placeholder="e.g. 500000"
            className="font-mono text-lg"
          />
          <p className="text-[11px] text-slate-400">
            Default: {formatBudgetEur(DEFAULT_ANNUAL_BUDGET_TOTAL)} · Current:{" "}
            {formatBudgetEur(budget)}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDraftBudget(0)}
          >
            <RotateCcw className="h-4 w-4" />
            Clear &amp; Set New
          </Button>
          <Button type="button" onClick={handleApply}>
            Save Budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const amount = Number(invoice.totalAmount ?? 0);

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
  const router = useRouter();
  const [lines, setLines] = useState<BudgetLine[]>(() => {
    const saved = loadMarketingBudgetSnapshot();
    return saved?.lines ?? getDefaultMarketingBudgetSnapshot().lines;
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyDataPoint[]>(() => {
    const saved = loadMarketingBudgetSnapshot();
    return saved?.monthlyData ?? getDefaultMarketingBudgetSnapshot().monthlyData;
  });
  const [budget, setBudget] = useState<number>(0);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetHydrated, setBudgetHydrated] = useState(false);
  const [activeTab, setActiveTab]       = useState<TimeframeTab>("Q2");
  const [chartType, setChartType]       = useState<ChartType>("bar");
  const [pendingInvoice, setPendingInvoice] = useState<InvoiceSchema | null>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [uploadedInvoices, setUploadedInvoices] = useState<UploadedInvoiceRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>("all");
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>("all");
  const [, startUploadTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();
  const [isResetting2026, startReset2026Transition] = useTransition();

  const invoiceMetrics = useMemo(
    () =>
      calculateInvoiceBudgetMetrics(
        uploadedInvoices,
        Number(budget || 0),
        quarterFilter
      ),
    [uploadedInvoices, budget, quarterFilter]
  );

  const totalUploaded = uploadedInvoices.length;
  const totalApproved = uploadedInvoices.filter(isApprovedInvoiceRecord).length;
  const totalPending = uploadedInvoices.filter(
    (inv) => inv.status === "ready" || inv.status === "extracting"
  ).length;

  const displayedInvoices = uploadedInvoices.filter((inv) => {
    if (!matchesQuarterFilter(inv, quarterFilter)) return false;
    if (statusFilter === "approved") return isApprovedInvoiceRecord(inv);
    if (statusFilter === "pending") return !isApprovedInvoiceRecord(inv) && inv.status !== "error";
    return true;
  });

  const quarterLabel = quarterFilter === "all" ? "All quarters" : quarterFilter;
  const isBudgetOverrun = invoiceMetrics.remainingBalance < 0;

  useEffect(() => {
    const snapshot = loadMarketingBudgetSnapshot();
    const dedicatedBudget = loadAllocatedBudget();
    const resolvedBudget =
      dedicatedBudget ??
      snapshot?.annualCeiling ??
      getDefaultMarketingBudgetSnapshot().annualCeiling;

    setBudget(resolvedBudget);

    if (snapshot) {
      setLines(snapshot.lines);
      setMonthlyData(snapshot.monthlyData);
    }

    setBudgetHydrated(true);
  }, []);

  useEffect(() => {
    if (!budgetHydrated) return;
    saveAllocatedBudget(budget);
    saveMarketingBudgetSnapshot({ annualCeiling: budget, lines, monthlyData });
  }, [budget, lines, monthlyData, budgetHydrated]);

  function handleUploadFile(file: File) {
    const id = crypto.randomUUID();
    setUploadedInvoices((prev) => [
      ...prev,
      { id, fileName: file.name, fileSize: file.size, status: "extracting" },
    ]);

    startUploadTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const result = await extractInvoice(fd);

      if (result.success && result.data) {
        setUploadedInvoices((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: "ready" as const, invoiceData: result.data }
              : r
          )
        );
        setPendingInvoice(result.data);
        setActiveUploadId(id);
      } else {
        setUploadedInvoices((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "error" as const,
                  errorMessage: result.error ?? "Extraction failed.",
                }
              : r
          )
        );
      }
    });
  }

  function handleRemoveUpload(id: string) {
    setUploadedInvoices((prev) => prev.filter((r) => r.id !== id));
    if (activeUploadId === id) {
      setActiveUploadId(null);
      setPendingInvoice(null);
    }
  }

  function handleSelectUpload(id: string) {
    const record = uploadedInvoices.find((r) => r.id === id);
    if (record?.invoiceData) {
      setActiveUploadId(id);
      setPendingInvoice(record.invoiceData);
    }
  }

  function handleUpdateBudget(newAmount: number) {
    const safeAmount = Number.isFinite(newAmount) ? Math.max(0, newAmount) : 0;

    if (safeAmount === 0) {
      const zeroSnapshot = getZeroMarketingBudgetSnapshot();
      setLines(zeroSnapshot.lines);
      setMonthlyData(zeroSnapshot.monthlyData);
      setBudget(0);
      return;
    }

    const currentLineTotal = lines.reduce((sum, line) => sum + line.annualBudget, 0);
    const scaleBase =
      budget > 0 ? budget : currentLineTotal > 0 ? currentLineTotal : DEFAULT_ANNUAL_BUDGET_TOTAL;
    const factor = safeAmount / scaleBase;

    const baseLines =
      currentLineTotal > 0
        ? lines
        : getDefaultMarketingBudgetSnapshot().lines;

    setLines(scaleBudgetLinesToAnnualTotal(baseLines, safeAmount));
    setMonthlyData((prev) =>
      scaleMonthlyBudgetData(
        prev.some((point) => point.budgeted > 0)
          ? prev
          : getDefaultMarketingBudgetSnapshot().monthlyData,
        factor
      )
    );
    setBudget(safeAmount);
  }

  function handleApprove() {
    if (!pendingInvoice) return;
    const amount = Number(pendingInvoice.totalAmount ?? 0);
    const qIdx = dateToQuarterIndex(pendingInvoice.invoiceDate);

    setLines((prev) =>
      prev.map((line) => {
        if (line.category !== pendingInvoice.inferredCategory) return line;
        if (
          pendingInvoice.inferredSubCategory != null &&
          line.subCategory !== pendingInvoice.inferredSubCategory
        ) return line;
        const newSpent = [...line.quarterlySpent] as [number, number, number, number];
        newSpent[qIdx] = newSpent[qIdx] + amount;
        return { ...line, quarterlySpent: newSpent };
      })
    );
    if (activeUploadId) {
      setUploadedInvoices((prev) =>
        prev.map((r) => (r.id === activeUploadId ? { ...r, status: "approved" as const } : r))
      );
    }
    setPendingInvoice(null);
    setActiveUploadId(null);
  }

  function handleLoadDemoDataset() {
    setPendingInvoice(null);
    setActiveUploadId(null);
    setStatusFilter("all");
    setQuarterFilter("all");
    setUploadedInvoices(buildDemoInvoiceDataset());

    if (Number(budget || 0) === 0) {
      handleUpdateBudget(DEFAULT_ANNUAL_BUDGET_TOTAL);
    }
  }

  function handleMasterReset() {
    if (
      !window.confirm(
        "Are you absolute sure you want to wipe all invoice data and reset the budget to 0?"
      )
    ) {
      return;
    }

    startResetTransition(async () => {
      const result = await resetInvoicePlatformData();
      if (!result.success) {
        window.alert(result.error ?? "Failed to reset platform data.");
        return;
      }

      const zeroSnapshot = getZeroMarketingBudgetSnapshot();
      setLines(zeroSnapshot.lines);
      setMonthlyData(zeroSnapshot.monthlyData);
      setBudget(0);
      setUploadedInvoices([]);
      setPendingInvoice(null);
      setActiveUploadId(null);
      saveMarketingBudgetSnapshot(zeroSnapshot);
    });
  }

  function handleReset2026Data() {
    if (
      !window.confirm(
        "Are you sure you want to zero out the 2026 financial year metrics? This will clear all invoice items dated in 2026."
      )
    ) {
      return;
    }

    startReset2026Transition(async () => {
      const result = await reset2026InvoiceData();
      if (!result.success) {
        window.alert(result.error ?? "Failed to reset 2026 data.");
        return;
      }

      const nextSnapshot = reset2026SpendingInSnapshot({
        annualCeiling: budget,
        lines,
        monthlyData,
      });

      setLines(nextSnapshot.lines);
      setMonthlyData(nextSnapshot.monthlyData);
      setUploadedInvoices((prev) => prev.filter((inv) => !isInvoiceYear2026(inv)));
      setPendingInvoice(null);
      setActiveUploadId(null);
      setStatusFilter("all");
      setQuarterFilter("all");
      saveMarketingBudgetSnapshot(nextSnapshot);
      router.refresh();
    });
  }

  function handleDiscardPending() {
    setPendingInvoice(null);
    setActiveUploadId(null);
  }

  const TABS: TimeframeTab[] = ["Q1", "Q2", "Q3", "Q4", "H1", "Full Year"];

  return (
    <div className="space-y-6">

      <BudgetConfigDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        budget={budget}
        onApply={handleUpdateBudget}
      />

      {/* ── Hero metrics ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          FY 2026 · Allocated budget{" "}
          {new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(
            budget
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBudgetDialogOpen(true)}
            className="gap-2"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Set / Reset Annual Budget
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset2026Data}
            disabled={isResetting2026}
            className="gap-2 border-[#0087DC]/30 text-[#005a94] hover:bg-[#0087DC]/5"
          >
            {isResetting2026 ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            🔄 Reset 2026 Data
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadDemoDataset}
            className="gap-2 border-[#a7d33f]/50 text-[#3d6b0e] hover:bg-[#a7d33f]/10"
          >
            ⚡ Load Demo Dataset
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleMasterReset}
            disabled={isResetting}
            className="gap-2"
          >
            {isResetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Clear All Invoices &amp; Budgets
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Allocated Budget"
          value={formatBudgetEur(budget)}
          sub="FY 2026 ceiling"
          icon={DollarSign}
          accent="bg-blue-50 text-[#0087DC]"
          trend="neutral"
        />
        <MetricCard
          label="Total Spent"
          value={formatBudgetEur(invoiceMetrics.totalSpent)}
          sub={`${invoiceMetrics.pct}% of allocated · ${quarterLabel} · approved only`}
          icon={TrendingUp}
          accent={invoiceMetrics.pct > 90 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}
          trend={invoiceMetrics.pct > 90 ? "down" : "up"}
        />
        <MetricCard
          label="Remaining Budget"
          value={formatBudgetEur(invoiceMetrics.remainingBalance)}
          sub={
            isBudgetOverrun
              ? `Over budget by ${formatBudgetEur(Math.abs(invoiceMetrics.remainingBalance))} · ${quarterLabel}`
              : `${100 - invoiceMetrics.pct}% unspent · ${quarterLabel}`
          }
          icon={Wallet}
          accent={isBudgetOverrun ? "bg-red-100 text-red-600" : "bg-slate-50 text-slate-500"}
          trend={isBudgetOverrun ? "down" : "neutral"}
          alert={isBudgetOverrun}
        />
        <MetricCard
          label="Invoices Approved"
          value={String(totalApproved)}
          sub={`${totalUploaded} uploaded total`}
          icon={Paperclip}
          accent="bg-violet-50 text-violet-600"
          trend={totalApproved > 0 ? "up" : "neutral"}
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
      <div className={cn(
        "rounded-2xl border px-6 py-5 shadow-sm",
        isBudgetOverrun ? "border-red-100 bg-red-50/40" : "border-slate-100 bg-white"
      )}>
        <div className="mb-3">
          <QuarterFilterBar value={quarterFilter} onChange={setQuarterFilter} />
        </div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className={cn("font-semibold", isBudgetOverrun ? "text-red-700" : "text-slate-700")}>
            Invoice Spend vs Allocated Budget · {quarterLabel}
          </span>
          <span className={cn(
            "font-bold tabular-nums",
            invoiceMetrics.pct > 90 || isBudgetOverrun ? "text-red-500" : "text-slate-700"
          )}>
            {invoiceMetrics.pct}%
          </span>
        </div>
        <Progress
          value={Math.min(100, invoiceMetrics.pct)}
          className="h-3"
          indicatorClassName={
            invoiceMetrics.pct >= 100 ? "bg-red-400" : invoiceMetrics.pct >= 85 ? "bg-amber-400" : "bg-[#a7d33f]"
          }
        />
        <div className="mt-2 flex justify-between text-[11px] text-slate-400">
          <span>Spent: {formatBudgetEur(invoiceMetrics.totalSpent)}</span>
          <span>
            Remaining:{" "}
            <span className={isBudgetOverrun ? "font-semibold text-red-600" : ""}>
              {formatBudgetEur(invoiceMetrics.remainingBalance)}
            </span>
            {" · "}Allocated: {formatBudgetEur(Number(budget || 0))}
          </span>
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
            <ChartPanel chartType={chartType} lines={lines} tab={activeTab} monthlyData={monthlyData} />
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
          <div className="space-y-4 p-6">
            <InvoiceUploadZone onUploadFile={handleUploadFile} />
            <InvoiceMetricsStrip
              totalUploaded={totalUploaded}
              totalApproved={totalApproved}
              totalPending={totalPending}
            />
            <UploadedInvoicesList
              records={uploadedInvoices}
              displayedRecords={displayedInvoices}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              quarterFilter={quarterFilter}
              onQuarterFilterChange={setQuarterFilter}
              totalCount={totalUploaded}
              approvedCount={totalApproved}
              pendingCount={totalPending}
              activeId={activeUploadId}
              onRemove={handleRemoveUpload}
              onSelect={handleSelectUpload}
            />
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
              onDiscard={handleDiscardPending}
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
