"use client";

import { useEffect, useRef } from "react";
import { useReviewerNotification } from "@/contexts/reviewer-notification-context";

export function useRegisterReviewerApplyFix(handler: () => void, enabled = true) {
  const { registerApplyFixHandler } = useReviewerNotification();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) {
      registerApplyFixHandler(null);
      return;
    }

    registerApplyFixHandler(() => handlerRef.current());
    return () => registerApplyFixHandler(null);
  }, [enabled, registerApplyFixHandler]);
}
