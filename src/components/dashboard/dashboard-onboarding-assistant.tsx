"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserFirstName } from "@/lib/auth/get-user-name";
import {
  buildWorkspaceWelcome,
  DEMO_ASSISTANT_EMAIL,
  INLINE_TYPING_DELAY_MS,
  type HelpChip,
  type HelpTopic,
  WORKSPACE_HELP_CHIPS,
} from "@/lib/assistant/workspace-help-topics";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
}

export function DashboardOnboardingAssistant() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [usedTopics, setUsedTopics] = useState<Set<HelpTopic>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const firstName = getUserFirstName(session?.user?.email ?? DEMO_ASSISTANT_EMAIL);
  const visibleChips = WORKSPACE_HELP_CHIPS.filter((chip) => !usedTopics.has(chip.id));

  useEffect(() => {
    if (!isOpen || messages.length > 0) return;

    setMessages([
      {
        id: crypto.randomUUID(),
        role: "bot",
        text: buildWorkspaceWelcome(firstName),
      },
    ]);
  }, [isOpen, messages.length, firstName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, isOpen, visibleChips.length]);

  function resetSession() {
    setMessages([]);
    setUsedTopics(new Set());
    setIsTyping(false);
  }

  function handleClose() {
    setIsOpen(false);
    resetSession();
  }

  function handleToggle() {
    if (isOpen) {
      handleClose();
      return;
    }
    setIsOpen(true);
  }

  function handleChipClick(chip: HelpChip) {
    if (isTyping || usedTopics.has(chip.id)) return;

    setUsedTopics((prev) => new Set(prev).add(chip.id));
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: chip.userText },
    ]);
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "bot", text: chip.steps },
      ]);
      setIsTyping(false);
    }, INLINE_TYPING_DELAY_MS);
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {isOpen && (
        <div
          role="dialog"
          aria-label="DeltaPR workflow assistant"
          className={cn(
            "pointer-events-auto mb-3 flex h-[26rem] w-80 flex-col overflow-hidden",
            "rounded-xl border border-slate-100 bg-white shadow-2xl",
            "origin-bottom-right animate-in fade-in slide-in-from-bottom-4 duration-300"
          )}
        >
          <div className="flex h-12 shrink-0 items-center justify-between bg-[#0087DC] px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight text-white">
                DeltaPR Assistant
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close assistant"
              className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
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
                  "max-w-[92%] whitespace-pre-line rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                  message.role === "bot"
                    ? "self-start border border-slate-100 bg-white text-slate-700 shadow-sm"
                    : "self-end bg-[#0087DC] font-medium text-white shadow-sm"
                )}
              >
                {message.text}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 self-start rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 text-[13px] text-slate-500 shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0087DC]" />
                Preparing instructions…
              </div>
            )}

            {visibleChips.length > 0 && !isTyping && (
              <div className="flex flex-col gap-2 pt-0.5">
                {visibleChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className={cn(
                      "rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 text-left text-[13px] font-semibold text-slate-700",
                      "shadow-sm transition-all hover:border-[#0087DC]/35 hover:bg-[#0087DC]/5 hover:text-[#005a94]"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={isOpen ? "Close DeltaPR assistant" : "Open DeltaPR assistant"}
        aria-expanded={isOpen}
        className={cn(
          "pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-100",
          "bg-[#0087DC] text-white shadow-xl transition-all duration-200",
          "hover:scale-105 hover:bg-[#0076c0] active:scale-95"
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
