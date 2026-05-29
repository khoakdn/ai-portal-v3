import { Suspense } from "react";
import Link from "next/link";
import { Sparkles, Loader2 } from "lucide-react";
import { getTasksForBoard } from "@/actions/tasks/get-tasks";
import { TaskBoard } from "@/components/tasks/task-board";
import { Button } from "@/components/ui/button";

async function TaskBoardFetcher() {
  const { tasks, error } = await getTasksForBoard();
  return <TaskBoard initialTasks={tasks} fetchError={error} />;
}

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks &amp; Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review AI-generated drafts and manage the approval workflow.
          </p>
        </div>
        <Button asChild>
          <Link href="/content">
            <Sparkles className="h-4 w-4" />
            New Content
          </Link>
        </Button>
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
