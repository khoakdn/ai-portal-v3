import { Suspense } from "react";
import Link from "next/link";
import {
  Newspaper,
  Receipt,
  Share2,
  Clock3,
  Sparkles,
  FileText,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  CalendarDays,
  BarChart3,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { getTasksForBoard } from "@/actions/tasks/get-tasks";
import type { TaskRow } from "@/actions/tasks/get-tasks";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
/* ═══════════════════════════════════════════════════════════════
   § 1 — DELTANAV BENTO HERO  (two-column grid)
   ═══════════════════════════════════════════════════════════════ */

const COPILOT_IFRAME_SRC =
  "https://app.relevanceai.com/agents/d7b62b/b775f35a-beef-4538-b4fe-a26e39c85077/23efc695-a036-4761-8330-ac445e61051b/embed-chat?hide_tool_steps=false&hide_file_uploads=false&hide_conversation_list=false&bubble_style=icon&primary_color=%230087dc&bubble_icon=sparkle&input_placeholder_text=Type+your+message...&hide_logo=false&hide_description=true";

const QUICK_LINKS = [
  {
    href:     "/my-request/press-release",
    label:    "Press Release Studio",
    caption:  "Create & dispatch announcements",
    icon:     Newspaper,
    iconBg:   "bg-violet-50",
    iconColor:"text-violet-600",
    border:   "hover:border-violet-200",
  },
  {
    href:     "/invoices",
    label:    "Invoice Auditor",
    caption:  "Upload & extract invoice data",
    icon:     Receipt,
    iconBg:   "bg-[#0087DC]/8",
    iconColor:"text-[#0087DC]",
    border:   "hover:border-[#0087DC]/30",
  },
  {
    href:     "/invoices",
    label:    "Budget Dashboard",
    caption:  "Track spend vs. budget",
    icon:     BarChart3,
    iconBg:   "bg-[#a7d33f]/10",
    iconColor:"text-[#4a7010]",
    border:   "hover:border-[#a7d33f]/50",
  },
] as const;

function DeltaNavHero({
  pendingCount,
  weekday,
  fullDate,
}: {
  pendingCount: number;
  weekday: string;
  fullDate: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

      {/* ══ LEFT — Executive Welcome Panel (4 / 12) ══════════════ */}
      <div className="flex flex-col gap-5 lg:col-span-4">

        {/* Welcome + calendar card */}
        <div className="flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

          {/* Greeting */}
          <div>
            <p className="text-sm font-medium text-slate-400">Welcome back,</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
              Delta Marketing Team
            </h1>
          </div>

          {/* Calendar widget */}
          <div className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0087DC]/10">
              <CalendarDays className="h-5 w-5 text-[#0087DC]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Today</p>
              <p className="text-sm font-semibold text-slate-700">{weekday}</p>
              <p className="text-[11px] text-slate-400">{fullDate}</p>
            </div>
          </div>

          {/* Pending workflow alert */}
          <Link
            href="/tasks"
            className={cn(
              "group flex items-center gap-3.5 rounded-xl border px-4 py-3 transition-all duration-200",
              pendingCount > 0
                ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                : "border-slate-100 bg-slate-50 hover:bg-slate-100"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              pendingCount > 0 ? "bg-amber-100" : "bg-slate-100"
            )}>
              <Clock3 className={cn("h-5 w-5", pendingCount > 0 ? "text-amber-600" : "text-slate-400")} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-bold",
                pendingCount > 0 ? "text-amber-800" : "text-slate-500"
              )}>
                {pendingCount > 0 ? `${pendingCount} Tasks Pending Review` : "No pending tasks"}
              </p>
              <p className={cn("text-[11px]", pendingCount > 0 ? "text-amber-600" : "text-slate-400")}>
                {pendingCount > 0 ? "Tap to review workflow queue →" : "You're all caught up!"}
              </p>
            </div>
            {pendingCount > 0 && (
              <span className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>

        {/* Quick-access shortcuts */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-3.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Zap className="h-3 w-3" aria-hidden="true" />
            Quick Access
          </p>
          <div className="space-y-2">
            {QUICK_LINKS.map(({ href, label, caption, icon: Icon, iconBg, iconColor, border }) => (
              <Link
                key={href + label}
                href={href}
                className={cn(
                  "group flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3",
                  "transition-all duration-200 hover:bg-white hover:shadow-sm",
                  border
                )}
              >
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconBg)}>
                  <Icon className={cn("h-4 w-4", iconColor)} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                    {label}
                  </p>
                  <p className="text-[11px] text-slate-400">{caption}</p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-400"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ══ RIGHT — Live Agent Panel (8 / 12) ════════════════════ */}
      <div className="lg:col-span-8">
        <div className="flex h-[600px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md">

          {/* Management bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
            <div className="flex items-center gap-2.5">
              {/* Delta Tertiary Green live pulse */}
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a7d33f] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#a7d33f]" />
              </span>
              <span className="text-[13px] font-semibold text-slate-800">DeltaNav Co&#8209;Pilot</span>
              <span className="text-[12px] text-slate-300" aria-hidden="true">•</span>
              <span className="text-[12px] text-slate-500">Online</span>
            </div>

            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <Link
                  href="/tasks"
                  className="hidden items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 sm:flex"
                >
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  {pendingCount} pending
                </Link>
              )}
              <span className="rounded-full bg-[#0087DC]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#0087DC]">
                Live
              </span>
            </div>
          </div>

          {/* Iframe — fills remaining height with zero gutters */}
          <div className="flex-1 overflow-hidden">
            <iframe
              src={COPILOT_IFRAME_SRC}
              title="DeltaNav Co-Pilot"
              width="100%"
              height="100%"
              allow="microphone"
              className="h-full w-full rounded-b-2xl border-0"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   § 2 — METRIC STAT CARDS
   ═══════════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}: {
  label: string;
  value: number;
  caption: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: number;
}) {
  return (
    <div className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{caption}</p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} aria-hidden="true" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          {trend}% from last week
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   § 3 — BENTO QUICK ACTIONS
   ═══════════════════════════════════════════════════════════════ */

interface ActionCardProps {
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badge?: string;
  title: string;
  description: string;
  accentBorder: string;
}

function BentoActionCard({
  href,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  accentBorder,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-6 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        accentBorder
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105",
          iconBg
        )}
      >
        <Icon className={cn("h-7 w-7", iconColor)} aria-hidden="true" />
      </div>

      {/* Text */}
      <div className="flex-1">
        <h3 className="text-lg font-bold tracking-tight text-slate-800">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{description}</p>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600">
        Get started
        <ArrowRight
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

function BentoQuickActions() {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-800">
          Start something new
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Choose a workflow to kick off your next task.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <BentoActionCard
          href="/content"
          icon={Newspaper}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          title="Draft Press Release"
          description="Turn bullet points into a polished, publication-ready announcement in seconds."
          accentBorder="hover:border-violet-200"
        />
        <BentoActionCard
          href="/invoices"
          icon={Receipt}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          title="Process Invoice"
          description="Upload a PDF or image and let Gemini AI extract vendor, amounts, and line items."
          accentBorder="hover:border-blue-200"
        />
        <BentoActionCard
          href="/content?type=social_post"
          icon={Share2}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          title="Draft Social Post"
          description="Generate LinkedIn, X, and Instagram-ready posts tailored to your brand voice."
          accentBorder="hover:border-indigo-200"
        />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   § 4 — NEEDS ATTENTION / PENDING TASKS
   ═══════════════════════════════════════════════════════════════ */

function TypeChip({
  type,
  contentDraftType,
}: {
  type: TaskRow["type"];
  contentDraftType: TaskRow["content_draft_type"];
}) {
  if (type === "content_draft") {
    const isSocial = contentDraftType === "social_post";
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
        {isSocial ? (
          <MessageSquare className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3 w-3" aria-hidden="true" />
        )}
        {isSocial ? "Social Post" : "Press Release"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
      <FileText className="h-3 w-3" aria-hidden="true" />
      Invoice
    </span>
  );
}

function PendingTaskCard({ task }: { task: TaskRow }) {
  const isInvoice = task.type === "invoice";
  const TypeIcon = isInvoice ? Receipt : task.content_draft_type === "social_post" ? Share2 : Newspaper;
  const iconBg = isInvoice ? "bg-blue-50" : task.content_draft_type === "social_post" ? "bg-indigo-50" : "bg-violet-50";
  const iconColor = isInvoice ? "text-blue-600" : task.content_draft_type === "social_post" ? "text-indigo-600" : "text-violet-600";

  return (
    <div className="group flex items-center gap-5 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm transition-all duration-200 hover:border-amber-200 hover:shadow-md">
      {/* Type icon */}
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          iconBg
        )}
      >
        <TypeIcon className={cn("h-5 w-5", iconColor)} aria-hidden="true" />
      </div>

      {/* Task info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <TypeChip type={task.type} contentDraftType={task.content_draft_type} />
          <span className="text-slate-200" aria-hidden="true">·</span>
          <span className="text-[11px] text-slate-400">
            {formatRelativeTime(task.updated_at)}
          </span>
        </div>
      </div>

      {/* Status badge (mobile fallback) */}
      <StatusBadge
        status={task.status}
        className="hidden shrink-0 sm:inline-flex"
        showIcon={false}
      />

      {/* Review CTA */}
      <Button
        asChild
        size="sm"
        className="shrink-0 bg-slate-900 text-white hover:bg-slate-700"
      >
        <Link href="/tasks">
          Review
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

function AllCaughtUpEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
      {/* Layered icon — outer dim, inner bright */}
      <div className="relative mb-5">
        <CheckCircle2
          className="h-20 w-20 text-slate-100"
          aria-hidden="true"
          strokeWidth={1}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <CheckCircle2
            className="h-9 w-9 text-emerald-400"
            aria-hidden="true"
            strokeWidth={1.5}
          />
        </div>
      </div>

      <h3 className="text-base font-semibold text-slate-700">
        You&apos;re all caught up!
      </h3>
      <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400">
        No pending approvals right now. When team members submit drafts or invoices for review, they&apos;ll appear here.
      </p>

      <Button variant="outline" asChild size="sm" className="mt-6">
        <Link href="/tasks">
          View all tasks
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

function NeedsAttentionSection({ tasks }: { tasks: TaskRow[] }) {
  const pending = tasks.filter((t) => t.status === "pending_approval");

  return (
    <section>
      {/* Section header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-800">
              Needs Attention
            </h2>
            {pending.length > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-400">
            Tasks waiting for your approval
          </p>
        </div>

        {pending.length > 0 && (
          <Button variant="ghost" size="sm" asChild className="text-slate-500">
            <Link href="/tasks">
              View all
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>

      {/* List or empty state */}
      {pending.length === 0 ? (
        <AllCaughtUpEmptyState />
      ) : (
        <div className="space-y-3" role="list" aria-label="Tasks pending approval">
          {pending.map((task) => (
            <div key={task.id} role="listitem">
              <PendingTaskCard task={task} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   § 5 — RECENT ACTIVITY (compact side panel)
   ═══════════════════════════════════════════════════════════════ */

function RecentActivityFeed({ tasks }: { tasks: TaskRow[] }) {
  const recent = tasks.slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">
            Recent Activity
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">Latest workflow updates</p>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-slate-500">
          <Link href="/tasks">
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <ul role="list" className="divide-y divide-slate-50">
          {recent.map((task, i) => (
            <li
              key={task.id}
              className={cn(
                "flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-slate-50/60",
                i === 0 && "rounded-t-2xl",
                i === recent.length - 1 && "rounded-b-2xl"
              )}
            >
              <div
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  task.status === "approved"         && "bg-emerald-500",
                  task.status === "pending_approval" && "bg-amber-400",
                  task.status === "rejected"         && "bg-rose-500",
                  task.status === "draft"            && "bg-slate-300"
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {task.title}
                </p>
                <TypeChip
                  type={task.type}
                  contentDraftType={task.content_draft_type}
                />
              </div>
              <StatusBadge status={task.status} className="shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   § 6 — PAGE LOADING SKELETON
   ═══════════════════════════════════════════════════════════════ */

function DashboardSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Bento hero (two-col) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-4">
          <div className="h-52 rounded-2xl bg-slate-100" />
          <div className="h-44 rounded-2xl bg-slate-100" />
        </div>
        <div className="h-[600px] rounded-2xl bg-slate-100 lg:col-span-8" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100" />
        ))}
      </div>

      {/* Bento */}
      <div className="grid gap-5 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-52 rounded-2xl bg-slate-100" />
        ))}
      </div>

      {/* Needs attention */}
      <div className="space-y-3">
        <div className="h-7 w-48 rounded-xl bg-slate-100" />
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   § 7 — ASYNC DATA WRAPPER
   ═══════════════════════════════════════════════════════════════ */

async function DashboardContent() {
  const { tasks } = await getTasksForBoard();

  const pendingCount    = tasks.filter((t) => t.status === "pending_approval").length;
  const recentDrafts    = tasks.filter((t) => t.type === "content_draft").length;
  const pendingInvoices = tasks.filter((t) => t.type === "invoice" && t.status !== "approved").length;
  const weekAgo         = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const approvedThisWeek = tasks.filter(
    (t) => t.status === "approved" && t.updated_at >= weekAgo
  ).length;

  const now     = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const fullDate = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-10">
      {/* 1 — DeltaNav bento hero */}
      <DeltaNavHero pendingCount={pendingCount} weekday={weekday} fullDate={fullDate} />

      {/* 2 — Metric cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Approval"
          value={pendingCount}
          caption="awaiting review"
          icon={Clock3}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="AI Drafts"
          value={recentDrafts}
          caption="press releases & posts"
          icon={Sparkles}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
        <StatCard
          label="Invoices Pending"
          value={pendingInvoices}
          caption="awaiting approval"
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Approved This Week"
          value={approvedThisWeek}
          caption="tasks completed"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          trend={approvedThisWeek > 0 ? 12 : undefined}
        />
      </div>

      {/* 3 — Bento quick actions */}
      <BentoQuickActions />

      {/* 4 — Needs attention */}
      <NeedsAttentionSection tasks={tasks} />

      {/* 5 — Recent activity (only when there's data) */}
      {tasks.length > 0 && <RecentActivityFeed tasks={tasks} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   § 8 — PAGE EXPORT
   ═══════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
