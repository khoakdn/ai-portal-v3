/**
 * Basecamp 3 REST API helpers — OAuth refresh + todo creation.
 */

const TOKEN_URL = "https://launchpad.37signals.com/authorization/token";
const USER_AGENT = "DeltaPRPortal (comms@delta.corp)";

export interface BasecampEnvConfig {
  accountId: string;
  projectId: string;
  listId: string;
  assigneeId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessTokenFallback: string;
}

export function getBasecampEnv(): Partial<BasecampEnvConfig> {
  return {
    accountId: process.env.BASECAMP_ACCOUNT_ID?.trim() ?? "",
    projectId: process.env.BASECAMP_PROJECT_ID?.trim() ?? "",
    listId: process.env.BASECAMP_TODOLIST_ID?.trim() ?? "",
    assigneeId:
      process.env.BASECAMP_BILYANA_ID?.trim() ??
      process.env.BASECAMP_ASSIGNEE_ID?.trim() ??
      "",
    clientId: process.env.BASECAMP_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.BASECAMP_CLIENT_SECRET?.trim() ?? "",
    refreshToken: process.env.BASECAMP_REFRESH_TOKEN?.trim() ?? "",
    accessTokenFallback: process.env.BASECAMP_ACCESS_TOKEN?.trim() ?? "",
  };
}

/** Exchange refresh token for a short-lived access token. */
export async function refreshBasecampAccessToken(
  config: Pick<BasecampEnvConfig, "clientId" | "clientSecret" | "refreshToken">
): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      type: "refresh",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Token refresh failed (${res.status}): ${detail.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Token refresh response missing access_token.");
  }

  return data.access_token;
}

export async function resolveBasecampAccessToken(
  env: Partial<BasecampEnvConfig>
): Promise<string | null> {
  if (env.clientId && env.clientSecret && env.refreshToken) {
    try {
      return await refreshBasecampAccessToken({
        clientId: env.clientId,
        clientSecret: env.clientSecret,
        refreshToken: env.refreshToken,
      });
    } catch (err) {
      console.error("[basecamp-api] Refresh token exchange failed:", err);
    }
  }

  return env.accessTokenFallback || null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTodoDescription(
  businessUnit: string,
  draftText: string
): string {
  const unit = escapeHtml(businessUnit || "General");
  const body = escapeHtml(draftText || "").replace(/\n/g, "<br/>");
  return `<div><strong>Business Unit:</strong> ${unit}</div><br/>${body}`;
}

export interface CreateBasecampTodoPayload {
  content: string;
  description: string;
  assignee_ids: number[];
  notify: boolean;
}

export function buildTodosUrl(env: Pick<BasecampEnvConfig, "accountId" | "projectId" | "listId">) {
  return (
    `https://3.basecampapi.com/${env.accountId}` +
    `/buckets/${env.projectId}` +
    `/todolists/${env.listId}` +
    `/todos.json`
  );
}

export async function createBasecampTodo(
  accessToken: string,
  url: string,
  payload: CreateBasecampTodoPayload
): Promise<{ id: number; url: string; app_url: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Basecamp API ${res.status}: ${detail.slice(0, 200)}`);
  }

  return res.json();
}

export function simulatedTodoResponse() {
  const id = Math.floor(Math.random() * 9_000_000) + 1_000_000;
  return {
    success: true as const,
    todoId: id,
    todoUrl: `https://3.basecampapi.com/sim/todos/${id}.json`,
    appUrl: `https://basecamp.com/sim/todos/${id}`,
    simulated: true as const,
    assignedTo: "Bilyana Mihova",
  };
}
