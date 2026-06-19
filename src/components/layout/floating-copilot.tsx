"use client";

import { useState } from "react";
import { MessageSquareCode, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const IFRAME_SRC =
  "https://app.relevanceai.com/agents/d7b62b/b775f35a-beef-4538-b4fe-a26e39c85077/23efc695-a036-4761-8330-ac445e61051b/embed-chat?hide_tool_steps=false&hide_file_uploads=false&hide_conversation_list=false&bubble_style=icon&primary_color=%230087dc&bubble_icon=sparkle&input_placeholder_text=Type+your+message...&hide_logo=false&hide_description=false";

export function FloatingCopilot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    /* Anchor — fixed viewport position; pointer-events-none lets clicks pass through */
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">

      {/* ── Chat panel ────────────────────────────────────────── */}
      <div
        aria-hidden={!isOpen}
        className={cn(
          // Positioning & size
          "mb-3 w-[420px] h-[620px]",
          // Card chrome
          "flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl",
          // Smooth open/close animation
          "origin-bottom-right transition-all duration-300 ease-out",
          isOpen
            ? "scale-100 opacity-100 pointer-events-auto"
            : "scale-95 opacity-0 pointer-events-none"
        )}
      >
        {/* Header bar */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
          <div className="flex items-center gap-2.5">
            {/* Online pulse dot — Delta Tertiary Green */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a7d33f] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#a7d33f]" />
            </span>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#0087DC]" aria-hidden="true" />
              <span className="text-[13px] font-semibold text-slate-800">DeltaNav Copilot</span>
            </div>
            <span className="rounded-full bg-[#0087DC]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#0087DC]">
              Live
            </span>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close DeltaNav Copilot"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Iframe — fills remaining height, no scroll bars */}
        <div className="h-[calc(100%-48px)] w-full">
          {/* Only render iframe once opened (avoids preloading until needed) */}
          {isOpen && (
            <iframe
              src={IFRAME_SRC}
              title="DeltaNav Copilot"
              width="100%"
              height="100%"
              allow="microphone"
              className="border-0"
            />
          )}
        </div>
      </div>

      {/* ── FAB trigger ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Close DeltaNav Copilot" : "Open DeltaNav Copilot"}
        aria-expanded={isOpen}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full shadow-xl pointer-events-auto",
          "bg-[#0087DC] text-white",
          "transition-all duration-200 hover:bg-[#0076c0] hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02d5ce] focus-visible:ring-offset-2"
        )}
      >
        {/* Icon swaps on open/close with a brief spin */}
        <span
          className={cn(
            "transition-transform duration-300",
            isOpen ? "rotate-90" : "rotate-0"
          )}
          aria-hidden="true"
        >
          {isOpen
            ? <X className="h-5 w-5" />
            : <MessageSquareCode className="h-5 w-5" />}
        </span>
      </button>
    </div>
  );
}
