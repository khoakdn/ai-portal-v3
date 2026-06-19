"use client";

import { useState } from "react";
import { MessageSquareCode, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const IFRAME_SRC =
  "https://app.relevanceai.com/agents/d7b62b/b775f35a-beef-4538-b4fe-a26e39c85077/23efc695-a036-4761-8330-ac445e61051b/embed-chat?hide_tool_steps=false&hide_file_uploads=false&hide_conversation_list=false&bubble_style=icon&primary_color=%230087dc&bubble_icon=sparkle&input_placeholder_text=Type+your+message...&hide_logo=false&hide_description=false";

export function FloatingCopilot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    /* Root: pointer-events-none so only explicit children capture clicks */
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end">

      {/* Panel — only mounted when open (no invisible hit-box when closed) */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="DeltaNav Copilot"
          className={cn(
            "pointer-events-auto relative z-10 mb-3 flex h-[620px] w-[420px] flex-col overflow-hidden",
            "rounded-2xl border border-slate-200/80 bg-white shadow-2xl",
            "origin-bottom-right animate-in fade-in slide-in-from-bottom-4 duration-300"
          )}
        >
          {/* Header bar */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
            <div className="flex items-center gap-2.5">
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

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close DeltaNav Copilot"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Iframe canvas */}
          <div className="pointer-events-auto relative z-10 flex min-h-0 flex-1 overflow-hidden">
            <iframe
              src={IFRAME_SRC}
              title="DeltaNav Copilot"
              width="100%"
              height="100%"
              allow="microphone"
              className="pointer-events-auto relative z-10 h-full min-h-[500px] w-full flex-1 border-0"
            />
          </div>
        </div>
      )}

      {/* FAB — always interactive */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Close DeltaNav Copilot" : "Open DeltaNav Copilot"}
        aria-expanded={isOpen}
        className={cn(
          "pointer-events-auto relative z-10 flex h-14 w-14 items-center justify-center rounded-full shadow-xl",
          "bg-[#0087DC] text-white",
          "transition-all duration-200 hover:bg-[#0076c0] hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02d5ce] focus-visible:ring-offset-2"
        )}
      >
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
