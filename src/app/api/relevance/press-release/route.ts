export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";

const RELEVANCE_ENDPOINT =
  "https://api-d7b62b.stack.tryrelevance.com/latest/agents/trigger";

const AGENT_ID = "7d952fd2-b498-45f4-83e0-97984ef1eab7";

/** Strip optional surrounding quotes from env values. */
function readEnv(key: string): string {
  const raw = process.env[key];
  if (!raw) return "";
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function buildCompiledFormString(formData: Record<string, string>): string {
  const lines = [
    `**Product / Announcement Title:** ${formData.title ?? ""}`,
    `**Press Release Type:** ${formData.pressReleaseType ?? ""}`,
    `**Business Unit:** ${formData.businessUnit ?? ""}`,
    `**Region:** ${formData.region ?? ""}`,
    `**Language:** ${formData.language ?? ""}`,
    `**Target Audience / Thematic Focus:** ${formData.thematicFocus ?? ""}`,
    `**Products to Address:** ${formData.productsToAddress ?? formData.deltaProducts ?? ""}`,
    `**Core Features & Description:** ${formData.productDescription ?? ""}`,
    `**Tone & Style:** Professional, corporate, aligned with Delta Electronics brand voice`,
    `**Priority:** ${formData.priority ?? "Standard"}`,
    `**Deadline:** ${formData.deadline ?? "Not specified"}`,
    `**Existing Systems / Context:** ${formData.existingSystems ?? "N/A"}`,
    `**Test Reports / Evidence:** ${formData.testReports ?? "N/A"}`,
    `**Reference Material Links:** ${formData.infoMaterialLinks ?? "N/A"}`,
    `**Contact Person:** ${formData.contactPerson ?? "N/A"}`,
  ];

  return lines.join("\n");
}

function buildMessageContent(formData: Record<string, string>): string {
  const compiled = buildCompiledFormString(formData);
  return `Generate a professional press release with the following details:\n${compiled}`;
}

function extractDraftText(data: Record<string, unknown>): string | null {
  if (typeof data.output === "string" && data.output.trim()) return data.output.trim();

  const out = data.output as Record<string, unknown> | undefined;
  if (out) {
    if (typeof out.output === "string" && out.output.trim()) return out.output.trim();
    if (typeof out.answer === "string" && out.answer.trim()) return out.answer.trim();
    if (typeof out.text === "string" && out.text.trim()) return out.text.trim();
  }

  if (typeof data.answer === "string" && data.answer.trim()) return data.answer.trim();
  if (typeof data.response === "string" && data.response.trim()) return data.response.trim();
  if (typeof data.text === "string" && data.text.trim()) return data.text.trim();

  const msg = data.message as Record<string, unknown> | undefined;
  if (msg && typeof msg.content === "string" && msg.content.trim()) {
    return msg.content.trim();
  }

  const msgs = (data.messages ?? data.message_history) as unknown[] | undefined;
  if (Array.isArray(msgs) && msgs.length > 0) {
    const last = msgs[msgs.length - 1] as Record<string, unknown>;
    const content = last?.content ?? last?.text;
    if (typeof content === "string" && content.trim()) return content.trim();
  }

  return null;
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

function liveErrorResponse(message: string, status = 500) {
  console.error("[/api/relevance/press-release]", message);
  return NextResponse.json(
    { success: false, error: `Live AI call failed: ${message}` },
    { status, headers: NO_CACHE_HEADERS }
  );
}

export async function POST(req: Request) {
  try {
    const body: Record<string, string> = await req.json();
    const apiKey = readEnv("RELEVANCE_AI_API_KEY");

    if (!apiKey) {
      return liveErrorResponse("RELEVANCE_AI_API_KEY is not configured.");
    }

    const payload = {
      message: {
        role: "user" as const,
        content: buildMessageContent(body),
      },
      agent_id: AGENT_ID,
    };

    let response: Response;
    try {
      response = await fetch(RELEVANCE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network request failed";
      return liveErrorResponse(message);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Relevance AI Fault:", errorText);
      return liveErrorResponse(
        `Relevance AI returned ${response.status}. ${errorText}`.trim()
      );
    }

    let data: Record<string, unknown>;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid JSON from Relevance AI";
      return liveErrorResponse(message);
    }

    const jobId: string =
      ((data?.job_info as Record<string, unknown>)?.job_id as string) ??
      (data?.conversation_id as string) ??
      (data?.id as string) ??
      "triggered";

    const draft = extractDraftText(data);

    console.info(
      `[/api/relevance/press-release] Agent ${AGENT_ID} triggered. Job: ${jobId}. Draft: ${!!draft}`
    );

    return NextResponse.json(
      {
        success: true,
        draft,
        jobId,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return liveErrorResponse(message);
  }
}
