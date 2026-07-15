"use client";

import { cn } from "@/lib/utils";

interface PressReleaseReadonlyCanvasProps {
  title: string;
  body: string;
  highlightClassName?: string;
  className?: string;
}

export function PressReleaseReadonlyCanvas({
  title,
  body,
  highlightClassName,
  className,
}: PressReleaseReadonlyCanvasProps) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-400" aria-hidden="true" />
          <div className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
          <div className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          PR Version Canvas
        </span>
        <span className="text-[11px] text-slate-400">{today}</span>
      </div>

      <div className={cn("p-6 transition-colors duration-1000", highlightClassName)}>
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          For Immediate Release
        </p>
        {title ? (
          <h2 className="mb-4 font-serif text-xl font-bold leading-tight text-slate-900">
            {title}
          </h2>
        ) : null}
        <hr className="mb-5 border-slate-200" />
        <div className="whitespace-pre-wrap font-mono text-[13px] leading-[1.85] text-slate-800">
          {body}
        </div>
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2 text-center text-sm font-bold tracking-widest text-slate-300">###</p>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Media Contact: press@deltacorp.com</span>
            <span>Read-only · Live pipeline sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
