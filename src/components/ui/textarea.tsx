import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Layout & shape
          "flex min-h-[120px] w-full rounded-xl border bg-white px-3.5 py-3 text-sm leading-relaxed",
          // Default border — soft slate
          "border-slate-200 text-slate-900 placeholder:text-slate-400",
          // Focus — soft glow instead of heavy ring
          "transition-all duration-150 outline-none",
          "focus:border-slate-400 focus:shadow-[0_0_0_3px_rgba(0,135,220,0.12)]",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
