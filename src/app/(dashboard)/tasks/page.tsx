import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getTasksForBoard } from "@/actions/tasks/get-tasks";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";

async function TaskBoardFetcher() {
  const { tasks, error } = await getTasksForBoard();
  return <TasksPageClient initialTasks={tasks} fetchError={error} />;
}

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks &amp; Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review AI-generated drafts and manage the approval workflow.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Loading tasks…</p>
            </div>
          </div>
        }
      >
        <TaskBoardFetcher />
      </Suspense>
    </div>
  );
}
