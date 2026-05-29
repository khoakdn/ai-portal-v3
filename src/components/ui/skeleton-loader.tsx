import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Primitive ─────────────────────────────────────────────────────────── */

function SkeletonLine({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("skeleton rounded-md", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

/* ── Document / Press-Release skeleton ────────────────────────────────── */

export function DocumentSkeleton() {
  return (
    <div className="space-y-4 p-8" aria-label="Loading press release draft…" aria-busy="true">
      {/* Dateline */}
      <SkeletonLine className="h-2.5 w-28" />

      {/* Headline */}
      <div className="space-y-2 pt-1">
        <SkeletonLine className="h-5 w-3/4" />
        <SkeletonLine className="h-5 w-1/2" />
      </div>

      {/* Rule */}
      <SkeletonLine className="h-px w-full" />

      {/* First paragraph */}
      <div className="space-y-2">
        {[100, 96, 88, 94, 72].map((w, i) => (
          <SkeletonLine key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>

      {/* Second paragraph */}
      <div className="space-y-2 pt-2">
        {[100, 90, 84, 76].map((w, i) => (
          <SkeletonLine key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>

      {/* Third paragraph (shorter) */}
      <div className="space-y-2 pt-2">
        {[80, 68, 50].map((w, i) => (
          <SkeletonLine key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>

      {/* Footer – contact block */}
      <div className="flex items-center justify-between pt-4">
        <SkeletonLine className="h-3 w-16" />
        <SkeletonLine className="h-3 w-32" />
      </div>
    </div>
  );
}

/* ── Social / LinkedIn skeleton ────────────────────────────────────────── */

export function SocialSkeleton() {
  return (
    <div
      className="rounded-xl bg-[#F3F2EF] p-3"
      aria-label="Loading social post draft…"
      aria-busy="true"
    >
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {/* LinkedIn-style header */}
        <div className="flex items-center gap-3 p-4">
          <SkeletonLine className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine className="h-3 w-36" />
            <SkeletonLine className="h-2.5 w-24" />
            <SkeletonLine className="h-2.5 w-16" />
          </div>
        </div>

        {/* Post body */}
        <div className="space-y-2 px-4 pb-4">
          {[100, 92, 84, 96, 80, 70].map((w, i) => (
            <SkeletonLine key={i} className="h-3" style={{ width: `${w}%` }} />
          ))}
        </div>

        {/* Engagement bar */}
        <div className="border-t border-gray-100 px-4 py-2">
          <div className="flex justify-around">
            {[48, 56, 52, 44].map((w, i) => (
              <SkeletonLine key={i} className="h-7" style={{ width: `${w}px` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Invoice analysis skeleton ─────────────────────────────────────────── */

export function InvoiceSkeleton() {
  return (
    <div
      className="space-y-5 rounded-xl border border-slate-100 bg-white p-6"
      aria-label="Extracting invoice data…"
      aria-busy="true"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-4 w-40" />
        <SkeletonLine className="h-6 w-16 rounded-full" />
      </div>

      {/* Key fields 2-col grid */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonLine className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <SkeletonLine className="h-2.5 w-16" />
              <SkeletonLine className="h-3.5 w-28" />
            </div>
          </div>
        ))}
      </div>

      {/* Total amount block */}
      <SkeletonLine className="h-16 w-full rounded-xl" />

      {/* Table header */}
      <SkeletonLine className="h-8 w-full rounded-lg" />

      {/* Table rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonLine key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}
