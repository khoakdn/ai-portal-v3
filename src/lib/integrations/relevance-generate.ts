export const RELEVANCE_ENDPOINT =
  "https://api-d7b62b.stack.tryrelevance.com/latest/agents/trigger";

export const RELEVANCE_AGENT_ID = "7d952fd2-b498-45f4-83e0-97984ef1eab7";

/** Strip optional surrounding quotes from env values. */
export function readRelevanceEnv(key: string): string {
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

export function resolveAgentId(): string {
  return readRelevanceEnv("RELEVANCE_AI_AGENT_ID") || RELEVANCE_AGENT_ID;
}

const CLOSING_INSTRUCTION =
  "Please map these values directly to your internal variable configurations and generate the Delta Electronics press release draft.";

export interface BriefingData {
  region: string;
  product_name: string;
  launch_date: string;
  features: string[];
  key_messages: string;
  quote: string;
  strategic_priorities: string;
}

export interface RelevanceAgentParams {
  region: string;
  product_name: string;
  launch_date: string;
  key_messages: string[];
  features: string[];
}

function parseListValue(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[\n,;|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolvePrType(formData: Record<string, string>): string {
  if (formData.prType?.trim()) return formData.prType.trim();

  const label = formData.pressReleaseType?.trim().toLowerCase() ?? "";
  if (label.includes("product launch")) return "product_launch";
  if (label.includes("event")) return "event";
  if (label.includes("case study")) return "case_study";
  if (label.includes("article")) return "article";

  return "product_launch";
}

export function buildBriefingData(formData: Record<string, string>): BriefingData {
  const featuresSource =
    formData.features ||
    formData.productsToAddress ||
    formData.productDescription ||
    "";

  return {
    region: formData.region?.trim() || "",
    product_name: formData.productName?.trim() || formData.title?.trim() || "",
    launch_date: formData.launchDate?.trim() || formData.deadline?.trim() || "",
    features: parseListValue(featuresSource),
    key_messages:
      formData.keyMessages?.trim() ||
      formData.thematicFocus?.trim() ||
      formData.brief?.trim() ||
      "",
    quote: formData.quote?.trim() || formData.contactPerson?.trim() || "",
    strategic_priorities:
      formData.strategicPriorities?.trim() ||
      [formData.businessUnit, formData.existingSystems].filter(Boolean).join(" · ") ||
      "",
  };
}

export function buildAgentParams(briefing: BriefingData): RelevanceAgentParams {
  return {
    region: briefing.region || "EMEA",
    product_name: briefing.product_name || "[Product Name]",
    launch_date: briefing.launch_date || "[Launch Date]",
    key_messages: briefing.key_messages
      ? parseListValue(briefing.key_messages)
      : [],
    features: briefing.features.length > 0 ? briefing.features : [],
  };
}

function buildFlatBriefingBlock(prType: string, briefing: BriefingData): string {
  const featuresList =
    briefing.features.length > 0 ? briefing.features.join(", ") : "Not specified";

  return `PR_TYPE: ${prType}
---
BRIEFING_DATA:
Region: ${briefing.region || "Not specified"}
Product Name: ${briefing.product_name || "Not specified"}
Launch Date: ${briefing.launch_date || "Not specified"}
Features: ${featuresList}
Key Messages: ${briefing.key_messages || "Not specified"}
Manager Quote: ${briefing.quote || "Not specified"}
Strategic Priorities: ${briefing.strategic_priorities || "Not specified"}
---
${CLOSING_INSTRUCTION}`;
}

/** Dual-format message: JSON briefing + flat markdown block for the agent stream. */
export function buildRelevanceMessageContent(formData: Record<string, string>): string {
  const prType = resolvePrType(formData);
  const briefing = buildBriefingData(formData);
  const flatBlock = buildFlatBriefingBlock(prType, briefing);

  return `Please generate a press release based on this data:\n${JSON.stringify(briefing, null, 2)}\n\n${flatBlock}`;
}

export function buildRelevanceTriggerPayload(formData: Record<string, string>) {
  const briefing = buildBriefingData(formData);

  return {
    agent_id: resolveAgentId(),
    message: {
      role: "user" as const,
      content: buildRelevanceMessageContent(formData),
    },
    params: buildAgentParams(briefing),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

/** Convert simple HTML agent output into editable plain text. */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeDraftValue(value: unknown): string | null {
  const direct = asNonEmptyString(value);
  if (!direct) return null;
  if (/<[a-z][\s\S]*>/i.test(direct)) {
    return htmlToPlainText(direct) || direct;
  }
  return direct;
}

/**
 * Extract press release markdown/text from a direct Relevance trigger payload.
 * Returns null when expected keys are missing or empty.
 */
export function extractDraftText(data: Record<string, unknown>): string | null {
  const output = data.output;
  const outputObj = asRecord(output);

  const draftText =
    normalizeDraftValue(outputObj?.output) ||
    normalizeDraftValue(outputObj?.text) ||
    normalizeDraftValue(outputObj?.html) ||
    normalizeDraftValue(outputObj?.reply) ||
    normalizeDraftValue(data.reply) ||
    (typeof output === "string" ? normalizeDraftValue(output) : null);

  return draftText;
}

/** Safe wrapper — never throws during path mapping. */
export function safeExtractDraftText(data: Record<string, unknown>): string | null {
  try {
    if (!data || typeof data !== "object") return null;
    return extractDraftText(data);
  } catch (err) {
    console.warn("[Relevance] Draft extraction failed:", err);
    return null;
  }
}

export type RelevanceGenerateResult =
  | {
      success: true;
      draftText: string;
      jobId: string;
      raw: Record<string, unknown>;
    }
  | {
      success: false;
      error: string;
      debugPayload?: string;
      jobId?: string;
      raw?: Record<string, unknown>;
    };

export function formatRelevanceApiError(err: unknown): {
  status: number;
  body: { success: false; error: string };
} {
  const message = err instanceof Error ? err.message : "Unknown error";
  return {
    status: 500,
    body: { success: false, error: `Live AI call failed: ${message}` },
  };
}

export async function callRelevanceAgent(
  formData: Record<string, string>
): Promise<RelevanceGenerateResult> {
  const apiKey = readRelevanceEnv("RELEVANCE_AI_API_KEY");
  if (!apiKey) {
    throw new Error("RELEVANCE_AI_API_KEY is not configured.");
  }

  const relevancePayload = buildRelevanceTriggerPayload(formData);

  console.log(
    "Sending dual payload to Relevance:",
    JSON.stringify(relevancePayload, null, 2)
  );

  let response: Response;
  try {
    response = await fetch(RELEVANCE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(relevancePayload),
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(message);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Relevance AI returned ${response.status}. ${errorText}`.trim());
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON from Relevance AI";
    throw new Error(message);
  }

  console.log("=== RAW RELEVANCE AI RESPONSE ===", JSON.stringify(data, null, 2));

  const jobId: string =
    asNonEmptyString(data.conversation_id) ??
    asNonEmptyString(asRecord(data.job_info)?.job_id) ??
    asNonEmptyString(data.id) ??
    "triggered";

  let draftText: string | null = null;
  try {
    draftText = safeExtractDraftText(data);
  } catch (err) {
    console.warn("[Relevance] Path mapping guard caught:", err);
    draftText = null;
  }

  if (!draftText) {
    return {
      success: false,
      error: "Empty draft received from AI agent",
      debugPayload: JSON.stringify(data),
      jobId,
      raw: data,
    };
  }

  return { success: true, draftText, jobId, raw: data };
}
