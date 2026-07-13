"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserName } from "@/lib/auth/get-user-name";

type QuickActionId = "press_release" | "invoice_tracker";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
}

const PRESS_RELEASE_REPLY =
  "1. Select type, 2. Fill brief details and specify Business Unit (ICTBG, EVS, etc.), 3. Click Generate, 4. Use inline 'Optimize with AI' to fix placeholders, 5. Select assignee and route for final approval.";

const INVOICE_TRACKER_REPLY =
  "Open the Budget Command Center under Invoices. Use the filter tabs above the table — All Invoices, Approved, and Pending Review — to inspect status counts. To zero out FY 2026 metrics, click 'Reset 2026 Data' (confirms before wiping 2026 database records and clearing approved spend totals). Use 'Load Demo Dataset' after a clear to repopulate sample rows for your presentation.";

const QUICK_ACTIONS: { id: QuickActionId; label: string; userText: string }[] = [
  {
    id: "press_release",
    label: "How do I request a press release?",
    userText: "How do I request a press release?",
  },
  {
    id: "invoice_tracker",
    label: "How do I clear the invoice tracker?",
    userText: "How do I clear the invoice tracker?",
  },
];

const DEMO_EMAIL = "maggie.weng@deltaww.com";

export function FloatingCopilot() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [usedActions, setUsedActions] = useState<Set<QuickActionId>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const userEmail = session?.user?.email ?? DEMO_EMAIL;
  const displayName = getUserName(userEmail);

  useEffect(() => {
    if (!isOpen) return;
    if (messages.length > 0) return;

    setMessages([
      {
        id: crypto.randomUUID(),
        role: "bot",
        text: `Hi ${displayName}, welcome back to DeltaPR! How can I assist your workflow today?`,
      },
    ]);
  }, [isOpen, messages.length, displayName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, isOpen]);

  function handleQuickAction(action: (typeof QUICK_ACTIONS)[number]) {
    if (isTyping || usedActions.has(action.id)) return;

    setUsedActions((prev) => new Set(prev).add(action.id));
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: action.userText },
    ]);
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          text:
            action.id === "press_release"
              ? PRESS_RELEASE_REPLY
              : INVOICE_TRACKER_REPLY,
        },
      ]);
      setIsTyping(false);
    }, 800);
  }

  const availableActions = QUICK_ACTIONS.filter(
    (action) => !usedActions.has(action.id)
  );

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div
          role="dialog"
          aria-label="DeltaPR Assistant"
          className={cn(
            "pointer-events-auto mb-3 flex h-[min(70vh,520px)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden",
            "rounded-2xl border border-slate-200/80 bg-white shadow-2xl",
            "origin-bottom-right animate-in fade-in slide-in-from-bottom-4 duration-300"
          )}
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0087DC]" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-800">DeltaPR Assistant</span>
              <span className="rounded-full bg-[#a7d33f]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#3d6b0e]">
                Guide
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50/60 p-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                  message.role === "bot"
                    ? "self-start rounded-bl-md border border-slate-100 bg-white text-slate-700"
                    : "self-end rounded-br-md bg-[#0087DC] text-white"
                )}
              >
                {message.text}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md border border-slate-100 bg-white px-3.5 py-2.5 text-sm text-slate-500 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-[#0087DC]" />
                DeltaPR is typing…
              </div>
            )}

            {availableActions.length > 0 && !isTyping && (
              <div className="mt-1 flex flex-col gap-2">
                {availableActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleQuickAction(action)}
                    className={cn(
                      "rounded-xl border border-[#0087DC]/25 bg-white px-3 py-2.5 text-left text-xs font-semibold text-[#005a94]",
                      "shadow-sm transition-colors hover:border-[#0087DC]/40 hover:bg-[#0087DC]/5"
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Close DeltaPR Assistant" : "Open DeltaPR Assistant"}
        aria-expanded={isOpen}
        className={cn(
          "pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full shadow-xl",
          "bg-[#0087DC] text-white transition-all duration-200",
          "hover:scale-105 hover:bg-[#0076c0] active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02d5ce] focus-visible:ring-offset-2"
        )}
      >
        {isOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
