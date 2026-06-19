"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard":    { title: "Dashboard",              subtitle: "Your team's workflow at a glance"          },
  "/content":      { title: "AI Content Generator",   subtitle: "Turn bullet points into polished drafts"   },
  "/invoices":     { title: "Invoice Analyzer",        subtitle: "Upload and extract invoice data with AI"   },
  "/tasks":        { title: "Tasks & Approvals",       subtitle: "Review and manage the approval pipeline"   },
  "/integrations": { title: "Integrations",            subtitle: "Configure webhooks and notification rules" },
};

function initials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "DT";
}

export function AppHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const key =
    Object.keys(PAGE_META)
      .filter((k) => pathname === k || pathname.startsWith(k + "/"))
      .sort((a, b) => b.length - a.length)[0] ?? "/dashboard";

  const { title, subtitle } = PAGE_META[key] ?? PAGE_META["/dashboard"];
  const user = session?.user;
  const email = session?.user?.email ?? "";
  const isLoading = status === "loading";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6">
      <div>
        <h1 className="text-[15px] font-semibold leading-none text-slate-900">
          {title}
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 active:scale-95"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="relative" ref={menuRef}>
          {isLoading ? (
            <div
              className="h-8 w-8 animate-pulse rounded-full bg-slate-200"
              aria-label="Loading account"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
              className="rounded-full transition-all duration-200 hover:ring-2 hover:ring-[#0087DC]/30 active:scale-95"
            >
              <Avatar className="h-8 w-8 shadow-sm">
                {user?.image && (
                  <AvatarImage src={user.image} alt={user.name ?? "Your account"} />
                )}
                <AvatarFallback className="bg-indigo-600 text-xs font-bold text-white">
                  {initials(user?.name, email)}
                </AvatarFallback>
              </Avatar>
            </button>
          )}

          {isOpen && !isLoading && (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Signed in as:
              </p>
              <p
                className="mt-1 truncate text-xs font-medium text-slate-600"
                title={email}
              >
                {email || "Unknown user"}
              </p>

              <div className="my-2 border-t border-slate-100" />

              <button
                type="button"
                role="menuitem"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
