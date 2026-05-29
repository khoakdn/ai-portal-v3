"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Share2,
  CheckSquare,
  Settings,
  Megaphone,
  ChevronDown,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Nav structure
// ─────────────────────────────────────────────────────────────────────────────

const TOP_NAV = [
  { href: "/dashboard", label: "Dashboard",        icon: LayoutDashboard },
  { href: "/invoices",  label: "Invoices",          icon: Receipt         },
  { href: "/tasks",     label: "Tasks & Approvals", icon: CheckSquare     },
  { href: "/integrations", label: "Integrations",   icon: Settings        },
];

const MY_REQUEST_ITEMS = [
  { href: "/my-request/press-release", label: "Press Release",      icon: FileText },
  { href: "/my-request/social-media",  label: "Social Media Posts", icon: Share2   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const isMyRequestSection = pathname.startsWith("/my-request");

  // Auto-open if we're inside My Request, otherwise start closed
  const [myRequestOpen, setMyRequestOpen] = useState(isMyRequestSection);

  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-slate-200 bg-white">

      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0087DC] shadow-sm shadow-blue-200">
          <Megaphone className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-slate-900">
            Marketing Portal
          </p>
          <p className="text-[11px] font-medium text-slate-400">Delta Team</p>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
          Navigation
        </p>

        <ul className="space-y-0.5" role="list">

          {/* Dashboard — always first */}
          <NavItem
            href="/dashboard"
            label="Dashboard"
            icon={LayoutDashboard}
            isActive={pathname === "/dashboard"}
          />

          {/* ── My Request (collapsible parent) ─────────── */}
          <li>
            <button
              type="button"
              onClick={() => setMyRequestOpen((o) => !o)}
              aria-expanded={myRequestOpen}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                isMyRequestSection
                  ? "bg-blue-50 font-semibold text-[#0087DC]"
                  : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {/* Active left bar */}
              {isMyRequestSection && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#0087DC]"
                  aria-hidden="true"
                />
              )}

              <FilePlus2
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isMyRequestSection
                    ? "text-[#0087DC]"
                    : "text-slate-400 group-hover:text-slate-600"
                )}
                aria-hidden="true"
              />

              <span className="min-w-0 flex-1 truncate text-left">My Request</span>

              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                  myRequestOpen ? "rotate-180" : "rotate-0",
                  isMyRequestSection ? "text-[#0087DC]" : "text-slate-400"
                )}
                aria-hidden="true"
              />
            </button>

            {/* Sub-menu with connecting guide-line */}
            {myRequestOpen && (
              <ul
                role="list"
                className="relative mt-0.5 ml-[22px] space-y-0.5 border-l-2 border-slate-100 pl-3"
              >
                {MY_REQUEST_ITEMS.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-150",
                          isActive
                            ? "bg-blue-50 font-semibold text-[#0087DC]"
                            : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isActive ? "text-[#0087DC]" : "text-slate-400"
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          {/* Remaining top-level items */}
          {TOP_NAV.slice(1).map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              isActive={pathname === href || pathname.startsWith(`${href}/`)}
            />
          ))}
        </ul>
      </nav>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold text-slate-700">Need help?</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
            Contact your team admin for support.
          </p>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable flat nav item
// ─────────────────────────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
          isActive
            ? "bg-blue-50 font-semibold text-[#0087DC]"
            : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        {isActive && (
          <span
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#0087DC]"
            aria-hidden="true"
          />
        )}
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isActive ? "text-[#0087DC]" : "text-slate-400 group-hover:text-slate-600"
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {isActive && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0087DC]/60" aria-hidden="true" />
        )}
      </Link>
    </li>
  );
}
