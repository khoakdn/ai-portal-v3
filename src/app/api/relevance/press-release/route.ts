export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";

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

function buildSimulatedDraft(title: string, businessUnit: string, region: string): string {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `FOR IMMEDIATE RELEASE

${title}

${region}, ${today} — Delta Electronics, a global leader in power and thermal management solutions, today announced a significant advancement in its ${businessUnit} portfolio.

[SIMULATION MODE — set RELEVANCE_AI_API_KEY in Vercel environment variables to enable live generation]`;
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function POST(req: Request) {
  const relevanceEndpoint =
    "https://api-d7b62b.stack.tryrelevance.com/latest/agents/trigger";
  const defaultAgentId = "7d952fd2-b498-45f4-83e0-97984ef1eab7";

  try {
    const body: Record<string, string> = await req.json();

    const apiKey =
      readEnv("RELEVANCE_AI_API_KEY") || readEnv("RELEVANCE_API_KEY");
    const agentId =
      readEnv("RELEVANCE_AI_AGENT_ID") ||
      readEnv("RELEVANCE_AGENT_ID") ||
      defaultAgentId;

    if (!apiKey) {
      console.info(
        "[/api/relevance/press-release] RELEVANCE_AI_API_KEY not set — simulation mode."
      );
      await new Promise((r) => setTimeout(r, 2000));

      return NextResponse.json(
        {
          success: true,
          draft: buildSimulatedDraft(
            body.title ?? "Press Release",
            body.businessUnit ?? "Marketing",
            body.region ?? "EMEA"
          ),
          simulated: true,
          jobId: `sim_${Date.now()}`,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const payload = {
      message: {
        role: "user" as const,
        content: buildMessageContent(body),
      },
      agent_id: agentId,
    };

    const response = await fetch(relevanceEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Relevance AI Fault:", errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Relevance AI returned ${response.status}. ${errorText}`.trim(),
        },
        { status: 502, headers: NO_CACHE_HEADERS }
      );
    }

    const data: Record<string, unknown> = await response.json().catch(() => ({}));

    const jobId: string =
      ((data?.job_info as Record<string, unknown>)?.job_id as string) ??
      (data?.conversation_id as string) ??
      (data?.id as string) ??
      "triggered";

    const draft = extractDraftText(data);

    console.info(
      `[/api/relevance/press-release] Agent ${agentId} triggered. Job: ${jobId}. Draft: ${!!draft}. Key present: true`
    );

    return NextResponse.json(
      {
        success: true,
        draft,
        jobId,
        simulated: false,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/relevance/press-release] Unexpected error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
