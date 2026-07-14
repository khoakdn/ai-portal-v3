"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_HIGHLIGHT_MS = 1500;

export function useOptimizeHighlight(durationMs = DEFAULT_HIGHLIGHT_MS) {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerHighlight = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsHighlighted(true);
    timerRef.current = setTimeout(() => setIsHighlighted(false), durationMs);
  }, [durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const highlightClassName = cn(
    "transition-colors duration-1000",
    isHighlighted && "bg-blue-50 ring-2 ring-[#0087DC]/40"
  );

  return { isHighlighted, triggerHighlight, highlightClassName };
}
