import { notFound } from "next/navigation";
import { getTaskDetail } from "@/actions/tasks/get-task-detail";
import { getTaskActivity } from "@/actions/tasks/get-task-activity";
import { TaskDetailView } from "@/components/tasks/task-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: Props) {
  const { id } = await params;

  const [{ task, error }, { activity }] = await Promise.all([
    getTaskDetail(id),
    getTaskActivity(id),
  ]);

  if (error || !task) notFound();

  return <TaskDetailView task={task} activity={activity} />;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const { task } = await getTaskDetail(id);
  return {
    title: task ? `${task.title} — AI Portal` : "Task — AI Portal",
  };
}
