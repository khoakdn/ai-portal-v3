"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useTransition,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import {
  ArrowUp,
  FileText,
  Loader2,
  MessageSquare,
  Newspaper,
  Paperclip,
  Share2,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatAttachment, ChatMessage } from "@/app/api/chat/route";

// ─────────────────────────────────────────────────────────────────────────────
// Internal types
// ─────────────────────────────────────────────────────────────────────────────

interface Message extends ChatMessage {
  id: string;
  streaming?: boolean;
  isSimulated?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming hook  (logic unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function useStreamingChat(apiPath: string) {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string, attachments: ChatAttachment[]) => {
      if (!text.trim() && attachments.length === 0) return;

      const userMsg: Message = {
        id:          generateId(),
        role:        "user",
        content:     text.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };
      const assistantMsg: Message = {
        id: generateId(), role: "assistant", content: "", streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      const history: ChatMessage[] = [
        ...messages.map(({ role, content, attachments }) => ({ role, content, attachments })),
        { role: "user", content: userMsg.content, attachments: userMsg.attachments },
      ];

      abortRef.current = new AbortController();

      try {
        const res = await fetch(apiPath, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ messages: history }),
          signal:  abortRef.current.signal,
        });

        if (!res.ok || !res.body) throw new Error(`API error ${res.status}`);

        const simulated = res.headers.get("X-Simulation-Mode") === "true";
        setIsSimulated(simulated);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => m.id === assistantMsg.id ? { ...m, content: accumulated, streaming: true } : m)
          );
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: accumulated, streaming: false, isSimulated: simulated }
              : m
          )
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setMessages((prev) =>
          prev.map((m) => m.id === assistantMsg.id ? { ...m, content: `⚠️ ${msg}`, streaming: false } : m)
        );
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [apiPath, messages]
  );

  return { messages, input, setInput, isLoading, isSimulated, sendMessage };
}

// ─────────────────────────────────────────────────────────────────────────────
// Attachment preview tile
// ─────────────────────────────────────────────────────────────────────────────

function AttachmentTile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-transform hover:scale-105">
      {isImage && preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={file.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-0.5 px-1 text-center">
          <FileText className="h-4 w-4 text-slate-400" />
          <span className="w-full truncate text-[9px] font-medium text-slate-500">
            {file.name.split(".").pop()?.toUpperCase()}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5 text-slate-600" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] space-y-1.5">
          {/* Sent attachment chips */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {msg.attachments.map((att, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] text-indigo-600"
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="max-w-[110px] truncate">{att.name}</span>
                </span>
              ))}
            </div>
          )}
          {msg.content && (
            <div className="rounded-[18px] rounded-tr-[4px] bg-indigo-500 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
              {msg.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex items-start gap-2.5">
      {/* Avatar */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
        <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        {msg.content ? (
          <div className="rounded-[18px] rounded-tl-[4px] bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
            {msg.content}
            {msg.streaming && (
              <span className="ml-0.5 inline-block h-[14px] w-[2px] translate-y-[1px] animate-pulse rounded-sm bg-indigo-500 align-middle" />
            )}
          </div>
        ) : (
          /* Thinking dots */
          <div className="inline-flex items-center gap-1 rounded-[18px] rounded-tl-[4px] bg-slate-100 px-4 py-3.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-[6px] w-[6px] animate-bounce rounded-full bg-slate-400"
                style={{ animationDelay: `${i * 140}ms`, animationDuration: "0.9s" }}
              />
            ))}
          </div>
        )}

        {msg.isSimulated && !msg.streaming && (
          <p className="flex items-center gap-1 text-[11px] text-amber-600">
            <Zap className="h-2.5 w-2.5" />
            Simulation mode — add GEMINI_API_KEY for live AI
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt suggestion chips
// ─────────────────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: Newspaper,     text: "Draft a press release for our product launch" },
  { icon: Share2,        text: "Write a LinkedIn post about our Q2 results"   },
  { icon: FileText,      text: "Summarise the key points from an invoice"      },
  { icon: MessageSquare, text: "What tasks are currently pending approval?"   },
] as const;

function SuggestionChips({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTIONS.map(({ icon: Icon, text }) => (
        <button
          key={text}
          type="button"
          onClick={() => onSelect(text)}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition-all duration-150 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-[0.97]"
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
          {text}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface AiChatBoxProps {
  greeting: string;
  today: string;
  pendingCount: number;
}

export function AiChatBox({ greeting, today, pendingCount }: AiChatBoxProps) {
  const { messages, input, setInput, isLoading, sendMessage } =
    useStreamingChat("/api/chat");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [, startTransition] = useTransition();

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])].slice(0, 5));
    e.target.value = "";
  }

  async function buildAttachments(files: File[]): Promise<ChatAttachment[]> {
    return Promise.all(
      files.map(
        (file) =>
          new Promise<ChatAttachment>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ name: file.name, contentType: file.type, url: reader.result as string });
            reader.readAsDataURL(file);
          })
      )
    );
  }

  async function handleSubmit(overrideText?: string) {
    if (isLoading) return;
    const text  = (overrideText ?? input).trim();
    const files = [...selectedFiles];
    if (!text && files.length === 0) return;

    setInput("");
    setSelectedFiles([]);

    const attachments = await buildAttachments(files);
    startTransition(() => { void sendMessage(text, attachments); });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  const canSend = (input.trim().length > 0 || selectedFiles.length > 0) && !isLoading;
  const isEmpty = messages.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* ── Indigo accent strip at top ───────────────────────── */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400" />

      <div className="flex flex-col gap-0 px-6 pt-5 pb-5">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {/* Eyebrow row */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {today}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                <Sparkles className="h-2.5 w-2.5" />
                Gemini AI
              </span>
            </div>

            <h1 className="mt-1.5 text-[22px] font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl">
              {greeting}.{" "}
              <span className="font-normal text-slate-400">
                Here&apos;s your overview.
              </span>
            </h1>
          </div>

          {pendingCount > 0 && (
            <span className="mt-1 shrink-0 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {pendingCount} pending
            </span>
          )}
        </div>

        {/* ── Suggestion chips ─────────────────────────────────── */}
        {isEmpty && (
          <div className="mb-5">
            <SuggestionChips
              onSelect={(text) => {
                setInput(text);
                setTimeout(() => textareaRef.current?.focus(), 0);
              }}
            />
          </div>
        )}

        {/* ── Message feed ─────────────────────────────────────── */}
        {!isEmpty && (
          <div
            className="mb-4 max-h-[340px] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.200)_transparent]"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 0%, black 5%, black 93%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 5%, black 93%, transparent 100%)",
            }}
          >
            <div className="space-y-3 py-2">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* ── Input bar ────────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-col rounded-2xl border bg-slate-50 transition-all duration-200",
            "border-slate-200",
            "focus-within:border-indigo-300 focus-within:bg-white",
            "focus-within:shadow-[0_0_0_3px_rgba(0,135,220,0.12)]"
          )}
        >
          {/* Attachment strip */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3">
              {selectedFiles.map((file, i) => (
                <AttachmentTile
                  key={`${file.name}-${i}`}
                  file={file}
                  onRemove={() => setSelectedFiles((p) => p.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2 px-3 py-2.5">
            {/* Attach */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              aria-label="Attach files"
              className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-all duration-150 hover:bg-indigo-50 hover:text-indigo-500 disabled:pointer-events-none disabled:opacity-40"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
              onChange={handleFileChange}
              className="sr-only"
              aria-hidden="true"
            />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isEmpty
                  ? "Ask anything or pick a suggestion above…"
                  : "Reply to Gemini…"
              }
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50"
              aria-label="Chat input"
            />

            {/* Send */}
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSend}
              aria-label="Send message"
              className={cn(
                "mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-150",
                canSend
                  ? "bg-indigo-500 text-white shadow-sm hover:bg-indigo-600 active:scale-95"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              )}
            >
              {isLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <ArrowUp className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* ── Footer hint ───────────────────────────────────────── */}
        <p className="mt-2.5 text-center text-[11px] text-slate-400">
          Enter to send · Shift+Enter for new line · supports images &amp; PDFs
        </p>
      </div>
    </div>
  );
}
