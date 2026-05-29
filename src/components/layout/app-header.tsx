"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard":    { title: "Dashboard",              subtitle: "Your team's workflow at a glance"          },
  "/content":      { title: "AI Content Generator",   subtitle: "Turn bullet points into polished drafts"   },
  "/invoices":     { title: "Invoice Analyzer",        subtitle: "Upload and extract invoice data with AI"   },
  "/tasks":        { title: "Tasks & Approvals",       subtitle: "Review and manage the approval pipeline"   },
  "/integrations": { title: "Integrations",            subtitle: "Configure webhooks and notification rules" },
};

export function AppHeader() {
  const pathname = usePathname();

  // Match the most specific route
  const key =
    Object.keys(PAGE_META)
      .filter((k) => pathname === k || pathname.startsWith(k + "/"))
      .sort((a, b) => b.length - a.length)[0] ?? "/dashboard";

  const { title, subtitle } = PAGE_META[key] ?? PAGE_META["/dashboard"];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6">
      <div>
        <h1 className="text-[15px] font-semibold leading-none text-slate-900">
          {title}
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          aria-label="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 active:scale-95"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Avatar placeholder */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm"
          aria-label="Your account"
          role="img"
        >
          DT
        </div>
      </div>
    </header>
  );
}
