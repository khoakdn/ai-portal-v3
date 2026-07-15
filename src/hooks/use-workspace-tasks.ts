"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadWorkspaceTasks,
  WORKSPACE_TASKS_UPDATE_EVENT,
  type WorkspaceTask,
} from "@/lib/demo/workspace-tasks-storage";

export function useWorkspaceTasks() {
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setTasks(loadWorkspaceTasks());
    setHydrated(true);
  }, []);

  useEffect(() => {
    refresh();

    function handleUpdate(event: Event) {
      const detail = (event as CustomEvent<WorkspaceTask[] | undefined>).detail;
      setTasks(detail ?? loadWorkspaceTasks());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === "delta_pr_tasks") refresh();
    }

    window.addEventListener(WORKSPACE_TASKS_UPDATE_EVENT, handleUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(WORKSPACE_TASKS_UPDATE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refresh]);

  return { tasks, hydrated, refresh };
}
