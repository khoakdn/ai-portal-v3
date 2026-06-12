"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SyncToBasecampProps {
  /** Todo content (maps to Basecamp `content` field) */
  title: string;
  /** Optional HTML description / body */
  description?: string;
  /** Optional ISO date string "YYYY-MM-DD" */
  dueDate?: string;
  /** Extra classes on the outer wrapper */
  className?: string;
}

type SyncState = "idle" | "loading" | "success" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// Async helper
// ─────────────────────────────────────────────────────────────────────────────

async function syncTaskToBasecamp(
  title: string,
  description?: string,
  dueDate?: string
): Promise<{ success: boolean; todoId?: number; appUrl?: string; error?: string; simulated?: boolean }> {
  const res = await fetch("/api/basecamp/todo", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, dueDate }),
  });

  const data = await res.json();
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SyncToBasecampButton({
  title,
  description,
  dueDate,
  className,
}: SyncToBasecampProps) {
  const [state, setState]   = useState<SyncState>("idle");
  const [result, setResult] = useState<{ todoId?: number; appUrl?: string; simulated?: boolean } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSync() {
    if (state === "loading") return;
    setState("loading");
    setErrorMsg(null);
    setResult(null);

    try {
      const data = await syncTaskToBasecamp(title, description, dueDate);
      if (data.success) {
        setResult({ todoId: data.todoId, appUrl: data.appUrl, simulated: data.simulated });
        setState("success");
      } else {
        setErrorMsg(data.error ?? "Sync failed.");
        setState("error");
      }
    } catch {
      setErrorMsg("Network error — could not reach /api/basecamp/todo.");
      setState("error");
    }
  }

  // ── Idle / loading trigger button ─────────────────────────────────────────
  if (state === "idle" || state === "loading") {
    return (
      <button
        type="button"
        onClick={handleSync}
        disabled={state === "loading"}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white",
          "bg-[#0087DC] transition-all duration-200 hover:bg-[#0076c0]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02d5ce] focus-visible:ring-offset-2",
          "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70",
          className
        )}
        aria-label="Sync this task to Basecamp"
      >
        {state === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Syncing to Basecamp…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Sync to Basecamp
          </>
        )}
      </button>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (state === "success" && result) {
    return (
      <div className={cn(
        "flex flex-col gap-2 rounded-xl border border-[#a7d33f]/40 bg-[#a7d33f]/8 p-4",
        className
      )}
      style={{ backgroundColor: "rgba(167,211,63,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6a9c1a]" aria-hidden="true" />
          <span className="text-sm font-semibold text-[#4a7010]">
            {result.simulated ? "Simulated sync — todo queued locally" : "Todo created in Basecamp!"}
          </span>
        </div>

        {result.todoId && (
          <p className="text-xs text-[#5a8012]">
            Todo ID: <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono">{result.todoId}</code>
          </p>
        )}

        {result.simulated && (
          <p className="text-[11px] text-amber-600">
            ⚡ Set <code className="font-mono">BASECAMP_ACCESS_TOKEN</code> to activate live sync.
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          {result.appUrl && !result.simulated && (
            <a
              href={result.appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0087DC] hover:underline"
            >
              View in Basecamp
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
          <button
            type="button"
            onClick={() => { setState("idle"); setResult(null); }}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Send again
          </button>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      "flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4",
      className
    )}>
      <p className="text-sm font-semibold text-red-700">Basecamp sync failed</p>
      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      <button
        type="button"
        onClick={() => setState("idle")}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#0087DC] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0076c0] transition-colors active:scale-[0.98]"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
