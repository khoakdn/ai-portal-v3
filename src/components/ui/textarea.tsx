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
          // Focus — Delta Secondary (teal) glow
          "transition-all duration-150 outline-none",
          "focus:border-[#02d5ce] focus:shadow-[0_0_0_3px_rgba(2,213,206,0.18)]",
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
