"use server";

import type { PressReleaseStructuredContext } from "@/actions/content/generate-press-release";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TriggerAgentInput {
  title: string;
  pressReleaseType: string;
  context: PressReleaseStructuredContext;
}

export interface TriggerAgentResult {
  success: boolean;
  /** Relevance AI conversation / job ID returned on success */
  jobId?: string;
  error?: string;
  /** True when the action ran in simulation mode (no API keys configured) */
  simulated?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown formatter — maps every form field into a structured prompt
// ─────────────────────────────────────────────────────────────────────────────

function buildMarkdownPayload(
  title: string,
  pressReleaseType: string,
  ctx: PressReleaseStructuredContext
): string {
  const lines: string[] = [
    `# Press Release Request`,
    ``,
    `## Document Details`,
    `| Field | Value |`,
    `|---|---|`,
    `| **Type** | ${pressReleaseType} |`,
    `| **Title** | ${title} |`,
  ];

  if (ctx.region)       lines.push(`| **Region** | ${ctx.region} |`);
  if (ctx.language)     lines.push(`| **Language** | ${ctx.language} |`);
  if (ctx.businessUnit) lines.push(`| **Business Unit** | ${ctx.businessUnit} |`);
  if (ctx.priority)     lines.push(`| **Priority** | ${ctx.priority} |`);
  if (ctx.deadline)     lines.push(`| **Publication Deadline** | ${ctx.deadline} |`);

  lines.push(
    ``,
    `## Thematic Focus / Content Points`,
    ctx.thematicFocus,
    ``,
    `## Delta Products / Solutions to Address`,
    ctx.productsToAddress,
    ``,
    `## Product Description & Benefits`,
    ctx.productDescription,
  );

  if (ctx.contactPerson) {
    lines.push(``, `## Contact Person for Product Questions`, ctx.contactPerson);
  }

  if (ctx.infoMaterialLinks) {
    lines.push(``, `## Information Material & Image Links`, ctx.infoMaterialLinks);
  }

  if (ctx.existingSystems) {
    lines.push(``, `## Existing Systems to Consider / Integrate / Replace`, ctx.existingSystems);
  }

  if (ctx.testReports) {
    lines.push(``, `## Test Reports / Performance Results`, ctx.testReports);
  }

  lines.push(
    ``,
    `---`,
    `*Please generate a professional ${pressReleaseType} based on the brief above.*`,
    `*Use wire-service format, clear paragraphs, and plain text output.*`,
  );

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Action
// ─────────────────────────────────────────────────────────────────────────────

export async function triggerPressReleaseAgent(
  input: TriggerAgentInput
): Promise<TriggerAgentResult> {
  const { title, pressReleaseType, context } = input;

  const apiKey     = process.env.RELEVANCE_AI_API_KEY?.trim();
  const agentId    = process.env.RELEVANCE_AI_AGENT_ID?.trim();
  const baseUrl    = process.env.RELEVANCE_AI_REGION_BASE_URL?.trim();

  // ── Simulation mode ────────────────────────────────────────────────────────
  if (!apiKey || !agentId || !baseUrl) {
    console.info(
      "[triggerPressReleaseAgent] Relevance AI env vars not configured — running in simulation mode."
    );
    // Artificial delay so the loading state is visible
    await new Promise((r) => setTimeout(r, 1200));
    return {
      success: true,
      jobId: `sim_${Date.now()}`,
      simulated: true,
    };
  }

  // ── Build payload ──────────────────────────────────────────────────────────
  const messageContent = buildMarkdownPayload(title, pressReleaseType, context);

  const payload = {
    message: {
      role: "user",
      content: messageContent,
    },
    agent_id: agentId,
  };

  // ── Call Relevance AI ──────────────────────────────────────────────────────
  try {
    const response = await fetch(`${baseUrl}/agents/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(
        `[triggerPressReleaseAgent] Relevance AI returned ${response.status}: ${errorText}`
      );
      return {
        success: false,
        error: `Agent trigger failed (${response.status}). Please check your Relevance AI credentials.`,
      };
    }

    const data = await response.json().catch(() => ({}));

    // Relevance AI returns `{ job_info: { job_id: "..." } }` or `{ conversation_id: "..." }`
    const jobId: string =
      data?.job_info?.job_id ??
      data?.conversation_id ??
      data?.id ??
      "triggered";

    console.info(
      `[triggerPressReleaseAgent] Agent triggered successfully. Job ID: ${jobId}`
    );

    return { success: true, jobId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    console.error("[triggerPressReleaseAgent] Fetch failed:", message);
    return {
      success: false,
      error: "Could not reach Relevance AI. Check your network and base URL.",
    };
  }
}
