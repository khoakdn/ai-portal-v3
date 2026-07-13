"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  initialsFromSender,
  useReviewerNotification,
} from "@/contexts/reviewer-notification-context";

export function ReviewerFeedbackNotification() {
  const { notifications, applyFixForNotification, markAsRead } =
    useReviewerNotification();
  const [isApplying, startApply] = useTransition();

  const activeToast = notifications.find((item) => !item.read);

  if (!activeToast) return null;

  const toastId = activeToast.id;

  function handleApplyFix() {
    startApply(() => {
      applyFixForNotification(toastId);
    });
  }

  function handleDismiss(event: React.MouseEvent) {
    event.stopPropagation();
    markAsRead(toastId);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-live="polite"
      onClick={handleApplyFix}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleApplyFix();
        }
      }}
      className={cn(
        "pointer-events-auto fixed right-4 top-4 z-[9999] w-[min(100vw-2rem,22rem)] cursor-pointer",
        "animate-slide-right rounded-2xl border border-amber-200/80 bg-white shadow-xl shadow-amber-100/50",
        "transition-transform hover:scale-[1.01] active:scale-[0.99]"
      )}
    >
      <div className="flex items-start gap-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0087DC] text-xs font-bold text-white ring-2 ring-amber-200">
          {initialsFromSender(activeToast.sender)}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
            Reviewer Feedback
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">
            {activeToast.sender}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="pointer-events-auto rounded-lg px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 px-4 py-4">
        <p className="text-sm leading-relaxed text-slate-600">{activeToast.message}</p>
        <div
          className={cn(
            "flex w-full items-center justify-center rounded-lg bg-[#0087DC] py-2.5 text-sm font-semibold text-white",
            isApplying && "opacity-80"
          )}
        >
          {isApplying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Applying fix…
            </>
          ) : (
            <>👉 Review &amp; Apply Fix</>
          )}
        </div>
      </div>
    </div>
  );
}
