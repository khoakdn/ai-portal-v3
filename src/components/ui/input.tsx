import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Layout & shape
          "flex h-10 w-full rounded-xl border bg-white px-3.5 py-2 text-sm",
          // Default border — soft slate
          "border-slate-200 text-slate-900 placeholder:text-slate-400",
          // Focus — soft indigo glow instead of heavy ring
          "transition-all duration-150 outline-none",
          "focus:border-slate-400 focus:shadow-[0_0_0_3px_rgba(0,135,220,0.12)]",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
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
Input.displayName = "Input";

export { Input };
