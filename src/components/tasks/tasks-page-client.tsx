"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TaskPipelineBoard } from "@/components/tasks/task-pipeline-board";
import { TaskBoard } from "@/components/tasks/task-board";
import type { TaskRow } from "@/actions/tasks/get-tasks";
import { usePressReleasePipeline } from "@/hooks/use-press-release-pipeline";

interface TasksPageClientProps {
  initialTasks: TaskRow[];
  fetchError?: string;
}

export function TasksPageClient({ initialTasks, fetchError }: TasksPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pipelineId = searchParams.get("pipeline");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(pipelineId);

  const { loadTaskIntoPipeline, openProgressView } = usePressReleasePipeline();

  useEffect(() => {
    if (!pipelineId) return;
    setSelectedTaskId(pipelineId);
    loadTaskIntoPipeline(pipelineId, { openSplitView: true });
    openProgressView(pipelineId);
  }, [pipelineId, loadTaskIntoPipeline, openProgressView]);

  function handleSelectTask(taskId: string | null) {
    setSelectedTaskId(taskId);
    if (taskId) {
      router.replace(`/tasks?pipeline=${taskId}`, { scroll: false });
    } else {
      router.replace("/tasks", { scroll: false });
    }
  }

  return (
    <div className="space-y-8">
      <TaskPipelineBoard selectedTaskId={selectedTaskId} onSelectTask={handleSelectTask} />

      {!selectedTaskId && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Database Approvals
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Legacy task records synced from the portal database.
            </p>
          </div>
          <TaskBoard initialTasks={initialTasks} fetchError={fetchError} />
        </div>
      )}
    </div>
  );
}
