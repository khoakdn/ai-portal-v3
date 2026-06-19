/**
 * POST /api/basecamp/create-todo
 *
 * 1. Refresh OAuth access token via 37signals Launchpad
 * 2. Create a todo assigned to Bilyana Mihova with push notification
 */

import { NextResponse } from "next/server";
import {
  buildTodoDescription,
  buildTodosUrl,
  createBasecampTodo,
  getBasecampEnv,
  missingBasecampProjectEnv,
  resolveBasecampAccessToken,
  simulatedTodoResponse,
} from "@/lib/integrations/basecamp-api";

export interface CreateTodoBody {
  title: string;
  businessUnit?: string;
  draftText?: string;
  /** Override content prefix — default: "Review Press Release Draft:" */
  contentPrefix?: string;
}

export interface CreateTodoApiResponse {
  success: boolean;
  todoId?: number;
  todoUrl?: string;
  appUrl?: string;
  assignedTo?: string;
  error?: string;
  simulated?: boolean;
}

export async function POST(req: Request) {
  let body: CreateTodoBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." } satisfies CreateTodoApiResponse,
      { status: 400 }
    );
  }

  const { title, businessUnit = "Marketing Communications", draftText = "", contentPrefix } = body;

  if (!title?.trim()) {
    return NextResponse.json(
      { success: false, error: "title is required." } satisfies CreateTodoApiResponse,
      { status: 400 }
    );
  }

  const env = getBasecampEnv();

  const accessToken = await resolveBasecampAccessToken(env);

  // Simulation mode — no live credentials; project env not required
  if (!accessToken) {
    console.info(
      "[/api/basecamp/create-todo] No refresh token or access token — simulation mode."
    );
    await new Promise((r) => setTimeout(r, 700));
    return NextResponse.json(simulatedTodoResponse(), { status: 201 });
  }

  const missingProject = missingBasecampProjectEnv(env);
  if (missingProject.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          `Basecamp project env vars missing: ${missingProject.join(", ")}. ` +
          "Add them to .env.local and restart the dev server.",
      } satisfies CreateTodoApiResponse,
      { status: 500 }
    );
  }

  const assigneeId = parseInt(env.assigneeId ?? "", 10);
  if (!Number.isFinite(assigneeId)) {
    return NextResponse.json(
      {
        success: false,
        error: "BASECAMP_BILYANA_ID (or BASECAMP_ASSIGNEE_ID) must be a numeric user ID.",
      } satisfies CreateTodoApiResponse,
      { status: 500 }
    );
  }

  const prefix = contentPrefix ?? "Review Press Release Draft:";
  const payload = {
    content: `${prefix} ${title.trim()}`,
    description: buildTodoDescription(businessUnit, draftText),
    assignee_ids: [assigneeId],
    notify: true,
  };

  try {
    const url = buildTodosUrl({
      accountId: env.accountId!,
      projectId: env.projectId!,
      listId: env.listId!,
    });

    const data = await createBasecampTodo(accessToken, url, payload);

    console.info(
      `[/api/basecamp/create-todo] Todo #${data.id} created — "${payload.content}"`
    );

    return NextResponse.json(
      {
        success: true,
        todoId: data.id,
        todoUrl: data.url,
        appUrl: data.app_url,
        assignedTo: "Bilyana Mihova",
      } satisfies CreateTodoApiResponse,
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/basecamp/create-todo]", message);
    return NextResponse.json(
      { success: false, error: message } satisfies CreateTodoApiResponse,
      { status: 502 }
    );
  }
}
