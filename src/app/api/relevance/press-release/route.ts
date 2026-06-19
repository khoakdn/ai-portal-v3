import { NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Relevance AI endpoint (hardcoded; overridden by env vars when present)
// ─────────────────────────────────────────────────────────────────────────────
const RELEVANCE_ENDPOINT =
  "https://api-d7b62b.stack.tryrelevance.com/latest/agents/trigger";

// ─────────────────────────────────────────────────────────────────────────────
// Build message.content per Relevance AI root-level schema
// ─────────────────────────────────────────────────────────────────────────────
function buildMessageContent(formData: Record<string, string>): string {
  const products =
    formData.deltaProducts ??
    formData.productsToAddress ??
    "";

  return [
    "Please generate a professional press release with the following criteria:",
    `- Title: ${formData.title ?? ""}`,
    `- Region: ${formData.region ?? ""}`,
    `- Language: ${formData.language ?? ""}`,
    `- Business Unit: ${formData.businessUnit ?? ""}`,
    `- Thematic Focus: ${formData.thematicFocus ?? ""}`,
    `- Products: ${products}`,
    `- Description: ${formData.productDescription ?? ""}`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Safely walk the Relevance AI response for the generated draft text.
// Relevance may nest the output in several different shapes depending on
// whether the agent ran synchronously or returned early.
// ─────────────────────────────────────────────────────────────────────────────
function extractDraftText(data: Record<string, unknown>): string | null {
  // Flat string at top level
  if (typeof data.output === "string" && data.output.trim()) return data.output.trim();

  // Nested output object
  const out = data.output as Record<string, unknown> | undefined;
  if (out) {
    if (typeof out.output === "string" && out.output.trim()) return out.output.trim();
    if (typeof out.answer === "string" && out.answer.trim())  return out.answer.trim();
    if (typeof out.text   === "string" && out.text.trim())    return out.text.trim();
  }

  // Direct answer / response / text keys
  if (typeof data.answer   === "string" && data.answer.trim())   return data.answer.trim();
  if (typeof data.response === "string" && data.response.trim()) return data.response.trim();
  if (typeof data.text     === "string" && data.text.trim())     return data.text.trim();

  // Message object at top level
  const msg = data.message as Record<string, unknown> | undefined;
  if (msg && typeof msg.content === "string" && msg.content.trim()) {
    return msg.content.trim();
  }

  // Message history array — take the last assistant message
  const msgs = (data.messages ?? data.message_history) as unknown[] | undefined;
  if (Array.isArray(msgs) && msgs.length > 0) {
    const last = msgs[msgs.length - 1] as Record<string, unknown>;
    const content = last?.content ?? last?.text;
    if (typeof content === "string" && content.trim()) return content.trim();
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulated draft — used when env vars are missing (dev / staging)
// ─────────────────────────────────────────────────────────────────────────────
function buildSimulatedDraft(title: string, businessUnit: string, region: string): string {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `FOR IMMEDIATE RELEASE

${title}

${region}, ${today} — Delta Electronics, a global leader in power and thermal management solutions, today announced a significant advancement in its ${businessUnit} portfolio. The initiative reflects Delta's ongoing commitment to innovation, sustainability, and delivering measurable value to its customers and partners worldwide.

"This milestone underscores Delta's mission to deliver innovative, clean, and energy-efficient solutions," said a senior spokesperson for Delta Electronics EMEA. "We are proud to bring this development to our customers and look forward to the positive impact it will have across the industry."

The announcement marks a key step in Delta's strategic roadmap, reinforcing the company's position as a trusted technology partner for organisations seeking to modernise their operations and reduce their environmental footprint.

For further information, please contact the Delta Electronics EMEA Communications team.

###

About Delta Electronics, Inc.
Delta, founded in 1971, is a global provider of power and thermal management solutions. Its mission statement, "To provide innovative, clean and energy-efficient solutions for a better tomorrow," focuses on addressing key environmental issues such as global climate change. Delta's businesses encompass Power Electronics, Automation, and Infrastructure.

For more information, please visit: www.delta-emea.com

[SIMULATION MODE — set RELEVANCE_API_KEY and RELEVANCE_AGENT_ID in .env.local to enable live generation]`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/relevance/press-release
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body: Record<string, string> = await req.json();

    const apiKey  = process.env.RELEVANCE_API_KEY?.trim();
    const agentId = process.env.RELEVANCE_AGENT_ID?.trim();

    // ── Simulation mode ──────────────────────────────────────────────────────
    if (!apiKey || !agentId) {
      console.info(
        "[/api/relevance/press-release] Env vars not configured — running in simulation mode."
      );
      // Realistic delay so loading states are visible
      await new Promise((r) => setTimeout(r, 2000));

      return NextResponse.json({
        success:   true,
        draft:     buildSimulatedDraft(
          body.title        ?? "Press Release",
          body.businessUnit ?? "Marketing",
          body.region       ?? "EMEA",
        ),
        simulated: true,
        jobId:     `sim_${Date.now()}`,
      });
    }

    // ── Build Relevance AI payload (message at root level) ───────────────────
    const payload = {
      agent_id: agentId,
      message: {
        role: "user",
        content: buildMessageContent(body),
      },
    };

    // ── Call Relevance AI ─────────────────────────────────────────────────────
    const response = await fetch(RELEVANCE_ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(
        `[/api/relevance/press-release] Relevance AI returned ${response.status}: ${errText}`
      );
      return NextResponse.json(
        {
          success: false,
          error: `Relevance AI returned ${response.status}. ${errText}`.trim(),
        },
        { status: 502 }
      );
    }

    const data: Record<string, unknown> = await response.json().catch(() => ({}));

    // Extract job / conversation ID for tracking
    const jobId: string =
      (data?.job_info as Record<string, unknown>)?.job_id as string ??
      data?.conversation_id as string ??
      data?.id as string ??
      "triggered";

    // Try to pull an immediately available draft from the response
    const draft = extractDraftText(data);

    console.info(
      `[/api/relevance/press-release] Agent triggered. Job: ${jobId}. Draft available: ${!!draft}`
    );

    return NextResponse.json({
      success:   true,
      draft,           // null means the job was queued; poll separately if needed
      jobId,
      simulated: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/relevance/press-release] Unexpected error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
