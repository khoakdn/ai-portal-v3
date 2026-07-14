"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Sparkles } from "lucide-react";
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

export function VirtualWorkspaceAssistant() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [usedTopics, setUsedTopics] = useState<Set<HelpTopic>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const firstName = getUserFirstName(session?.user?.email ?? DEMO_ASSISTANT_EMAIL);
  const welcomeText = buildWorkspaceWelcome(firstName);
  const visibleChips = WORKSPACE_HELP_CHIPS.filter((chip) => !usedTopics.has(chip.id));

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, visibleChips.length]);

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
    <section
      aria-label="DeltaPR Virtual Workspace Assistant"
      className="flex h-[550px] flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm"
    >
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-[#0087DC]/20 bg-[#0087DC] px-5">
        <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
        <h2 className="text-sm font-semibold tracking-tight text-white">
          DeltaPR Virtual Workspace Assistant
        </h2>
      </header>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-slate-50/50 p-5"
      >
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 text-sm leading-relaxed text-slate-700 shadow-sm">
          {welcomeText}
        </div>

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[90%] whitespace-pre-line rounded-xl px-4 py-3 text-sm leading-relaxed",
              message.role === "bot"
                ? "self-start border border-slate-100 bg-white text-slate-700 shadow-sm"
                : "self-end bg-[#0087DC] font-medium text-white shadow-sm"
            )}
          >
            {message.text}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 self-start rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[#0087DC]" />
            Preparing instructions…
          </div>
        )}

        {visibleChips.length > 0 && !isTyping && (
          <div className="flex flex-col gap-2.5">
            {visibleChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChipClick(chip)}
                className={cn(
                  "rounded-xl border border-slate-100 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700",
                  "shadow-sm transition-all hover:border-[#0087DC]/35 hover:bg-[#0087DC]/5 hover:text-[#005a94]"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
