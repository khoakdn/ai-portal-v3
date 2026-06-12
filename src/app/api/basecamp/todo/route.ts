/**
 * POST /api/basecamp/todo
 *
 * Creates a todo item in the configured Basecamp 3 project todolist.
 *
 * Authorization:
 *   Uses BASECAMP_ACCESS_TOKEN (personal/app token from OAuth flow).
 *   To rotate, exchange a refresh_token at:
 *     POST https://launchpad.37signals.com/authorization/token
 *       ?type=refresh&client_id=...&client_secret=...&refresh_token=...
 *
 * Basecamp API reference:
 *   https://github.com/basecamp/bc3-api/blob/master/sections/todos.md#create-a-to-do
 */

import { NextResponse } from "next/server";

// ── Request / Response types ─────────────────────────────────────────────────

export interface CreateTodoRequest {
  title: string;
  description?: string;
  dueDate?: string;   // ISO date string: "YYYY-MM-DD"
  notify?: boolean;   // whether to notify assignees (Basecamp default: false)
}

export interface CreateTodoResponse {
  success: boolean;
  todoId?: number;
  todoUrl?: string;
  appUrl?: string;
  error?: string;
  simulated?: boolean;
}

// ── Environment helpers ──────────────────────────────────────────────────────

function getBasecampConfig() {
  const accountId  = process.env.BASECAMP_ACCOUNT_ID?.trim();
  const projectId  = process.env.BASECAMP_PROJECT_ID?.trim();
  const listId     = process.env.BASECAMP_TODOLIST_ID?.trim();
  const assigneeId = process.env.BASECAMP_ASSIGNEE_ID?.trim();
  const token      = process.env.BASECAMP_ACCESS_TOKEN?.trim();

  return { accountId, projectId, listId, assigneeId, token };
}

// ── Simulation mode ──────────────────────────────────────────────────────────

function simulatedResponse(title: string): CreateTodoResponse {
  return {
    success:   true,
    todoId:    Math.floor(Math.random() * 9_000_000) + 1_000_000,
    todoUrl:   `https://3.basecampapi.com/4846061/buckets/47385854/todos/sim_${Date.now()}.json`,
    appUrl:    `https://basecamp.com/4846061/projects/47385854/todos/sim_${Date.now()}`,
    simulated: true,
  };
  void title;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let body: CreateTodoRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { title, description = "", dueDate, notify = false } = body;

  if (!title?.trim()) {
    return NextResponse.json(
      { success: false, error: "title is required." },
      { status: 400 }
    );
  }

  // ── 2. Resolve env config ─────────────────────────────────────────────────
  const { accountId, projectId, listId, assigneeId, token } =
    getBasecampConfig();

  // Simulation mode: if access token is absent, return mock success so the
  // full UI flow is testable before the OAuth grant is completed.
  if (!token) {
    console.info(
      "[/api/basecamp/todo] BASECAMP_ACCESS_TOKEN not set — returning simulated response."
    );
    await new Promise((r) => setTimeout(r, 600)); // realistic latency
    return NextResponse.json(simulatedResponse(title), { status: 201 });
  }

  if (!accountId || !projectId || !listId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Basecamp environment variables are incomplete. " +
          "Set BASECAMP_ACCOUNT_ID, BASECAMP_PROJECT_ID, and BASECAMP_TODOLIST_ID.",
      },
      { status: 500 }
    );
  }

  // ── 3. Build Basecamp API URL ─────────────────────────────────────────────
  const url =
    `https://3.basecampapi.com/${accountId}` +
    `/buckets/${projectId}` +
    `/todolists/${listId}` +
    `/todos.json`;

  // ── 4. Build payload ──────────────────────────────────────────────────────
  const payload: Record<string, unknown> = {
    content:      title.trim(),
    description:  description.trim() || undefined,
    notify,
    ...(assigneeId
      ? { assignee_ids: [parseInt(assigneeId, 10)] }
      : {}),
    ...(dueDate ? { due_on: dueDate } : {}),
  };

  // ── 5. Call Basecamp ──────────────────────────────────────────────────────
  let bcResponse: Response;
  try {
    bcResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
        // Basecamp strictly requires a descriptive User-Agent.
        // Format: AppName (contact email)
        "User-Agent":    "DeltaElectronicsPortal (marcom.emea@delta-emea.com)",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    console.error("[/api/basecamp/todo] Fetch failed:", message);
    return NextResponse.json(
      { success: false, error: "Could not reach Basecamp API. Check network and base URL." },
      { status: 502 }
    );
  }

  // ── 6. Handle Basecamp response ───────────────────────────────────────────

  // 201 = created, 422 = validation error, 403 = auth error, etc.
  if (!bcResponse.ok) {
    let detail = "";
    try { detail = await bcResponse.text(); } catch { /* ignore */ }

    console.error(
      `[/api/basecamp/todo] Basecamp returned ${bcResponse.status}: ${detail.slice(0, 300)}`
    );

    if (bcResponse.status === 401 || bcResponse.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Basecamp access token is invalid or expired. " +
            "Re-authorise at https://launchpad.37signals.com/authorization and update BASECAMP_ACCESS_TOKEN.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Basecamp API error (${bcResponse.status}): ${detail.slice(0, 200)}` },
      { status: bcResponse.status }
    );
  }

  const data = await bcResponse.json();

  console.info(
    `[/api/basecamp/todo] Todo created — ID: ${data.id}, title: "${title}"`
  );

  return NextResponse.json(
    {
      success: true,
      todoId:  data.id,
      todoUrl: data.url,
      appUrl:  data.app_url,
    } satisfies CreateTodoResponse,
    { status: 201 }
  );
}
