/**
 * Client-side helper for POST /api/basecamp/create-todo
 */

export interface CreateBasecampTodoInput {
  title: string;
  businessUnit?: string;
  draftText?: string;
  contentPrefix?: string;
}

export interface CreateBasecampTodoResult {
  success: boolean;
  todoId?: number;
  todoUrl?: string;
  appUrl?: string;
  assignedTo?: string;
  error?: string;
  simulated?: boolean;
}

export async function createBasecampTodoFromClient(
  input: CreateBasecampTodoInput
): Promise<CreateBasecampTodoResult> {
  const res = await fetch("/api/basecamp/create-todo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await res.json().catch(() => ({
    success: false,
    error: "Invalid response from server.",
  }))) as CreateBasecampTodoResult;

  return data;
}
