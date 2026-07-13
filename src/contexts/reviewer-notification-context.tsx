"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface ReviewerNotificationItem {
  id: string;
  sender: string;
  message: string;
  read: boolean;
  timestamp: string;
}

type ApplyFixHandler = () => void;

interface ReviewerNotificationContextValue {
  notifications: ReviewerNotificationItem[];
  unreadCount: number;
  addNotification: (payload: { sender: string; message: string }) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  registerApplyFixHandler: (handler: ApplyFixHandler | null) => void;
  applyFixForNotification: (id: string) => void;
}

const ReviewerNotificationContext =
  createContext<ReviewerNotificationContextValue | null>(null);

export function ReviewerNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ReviewerNotificationItem[]>([]);
  const applyFixRef = useRef<ApplyFixHandler | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const registerApplyFixHandler = useCallback((handler: ApplyFixHandler | null) => {
    applyFixRef.current = handler;
  }, []);

  const addNotification = useCallback(
    (payload: { sender: string; message: string }) => {
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          sender: payload.sender,
          message: payload.message,
          read: false,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const applyFixForNotification = useCallback((id: string) => {
    applyFixRef.current?.();
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }, []);

  return (
    <ReviewerNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        clearNotifications,
        registerApplyFixHandler,
        applyFixForNotification,
      }}
    >
      {children}
    </ReviewerNotificationContext.Provider>
  );
}

export function useReviewerNotification() {
  const context = useContext(ReviewerNotificationContext);
  if (!context) {
    throw new Error(
      "useReviewerNotification must be used within ReviewerNotificationProvider"
    );
  }
  return context;
}

export function initialsFromSender(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}
