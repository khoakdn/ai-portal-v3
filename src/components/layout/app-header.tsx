"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  initialsFromSender,
  useReviewerNotification,
} from "@/contexts/reviewer-notification-context";

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

function formatNotificationTime(timestamp: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

export function AppHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);

  const { notifications, unreadCount, applyFixForNotification } =
    useReviewerNotification();

  const key =
    Object.keys(PAGE_META)
      .filter((k) => pathname === k || pathname.startsWith(k + "/"))
      .sort((a, b) => b.length - a.length)[0] ?? "/dashboard";

  const { title, subtitle } = PAGE_META[key] ?? PAGE_META["/dashboard"];
  const user = session?.user;
  const email = session?.user?.email ?? "";
  const isLoading = status === "loading";
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setIsShaking(true);
      const timer = window.setTimeout(() => setIsShaking(false), 500);
      prevUnreadRef.current = unreadCount;
      return () => window.clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsBellOpen(false);
      }
    }

    if (isOpen || isBellOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, isBellOpen]);

  function handleFixDraft(notificationId: string) {
    applyFixForNotification(notificationId);
    setIsBellOpen(false);
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6">
      <div>
        <h1 className="text-[15px] font-semibold leading-none text-slate-900">
          {title}
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={isBellOpen}
            onClick={() => setIsBellOpen((prev) => !prev)}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 active:scale-95",
              hasUnread && "text-slate-600"
            )}
          >
            <Bell
              className={cn("h-4 w-4", isShaking && "animate-wiggle")}
              aria-hidden="true"
            />
            {hasUnread && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </span>
            )}
          </button>

          {isBellOpen && (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
            >
              <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Notification Center
                </p>
              </div>

              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  No notifications yet.
                </p>
              ) : (
                <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                  {notifications.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        "px-4 py-3 transition-colors",
                        !item.read && "bg-blue-50/40"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative mt-1 shrink-0">
                          {!item.read && (
                            <span className="absolute -left-2 top-1 flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0087DC] opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0087DC]" />
                            </span>
                          )}
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0087DC] text-[10px] font-bold text-white">
                            {initialsFromSender(item.sender)}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {item.sender}
                            </p>
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {formatNotificationTime(item.timestamp)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                            {item.message}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleFixDraft(item.id)}
                            className="mt-2 text-xs font-semibold text-[#0087DC] transition-colors hover:text-[#005a94] hover:underline"
                          >
                            👉 Fix Draft
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

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
