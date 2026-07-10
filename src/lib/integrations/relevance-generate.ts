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

const CLOSING_INSTRUCTION =
  "Please map these values directly to your internal variable configurations and generate the Delta Electronics press release draft.";

interface BriefingData {
  region: string;
  product_name: string;
  launch_date: string;
  features: string[];
  key_messages: string;
  quote: string;
  strategic_priorities: string;
}

function parseFeaturesArray(value: string | undefined): string[] {
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

function buildBriefingData(formData: Record<string, string>): BriefingData {
  const featuresSource =
    formData.features ||
    formData.productsToAddress ||
    formData.productDescription ||
    "";

  return {
    region: formData.region?.trim() || "",
    product_name: formData.productName?.trim() || formData.title?.trim() || "",
    launch_date: formData.launchDate?.trim() || formData.deadline?.trim() || "",
    features: parseFeaturesArray(featuresSource),
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

/** Build flat, LLM-friendly briefing text for Relevance message.content. */
export function buildRelevanceMessageContent(formData: Record<string, string>): string {
  const prType = resolvePrType(formData);
  const briefing = buildBriefingData(formData);
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
 * Single-shot responses only — no chat history or polling paths.
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

export class RelevancePathMappingError extends Error {
  readonly debugPayload: string;

  constructor(data: Record<string, unknown>) {
    super("Agent completed but path mapping failed.");
    this.name = "RelevancePathMappingError";
    this.debugPayload = JSON.stringify(data);
  }
}

export function formatRelevanceApiError(err: unknown): {
  status: number;
  body: { success: false; error: string; debugPayload?: string };
} {
  if (err instanceof RelevancePathMappingError) {
    return {
      status: 500,
      body: {
        success: false,
        error: err.message,
        debugPayload: err.debugPayload,
      },
    };
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  return {
    status: 500,
    body: { success: false, error: `Live AI call failed: ${message}` },
  };
}

export interface RelevanceGenerateResult {
  draftText: string;
  jobId: string;
  raw: Record<string, unknown>;
}

export async function callRelevanceAgent(
  formData: Record<string, string>
): Promise<RelevanceGenerateResult> {
  const apiKey = readRelevanceEnv("RELEVANCE_AI_API_KEY");
  if (!apiKey) {
    throw new Error("RELEVANCE_AI_API_KEY is not configured.");
  }

  const relevancePayload = {
    message: {
      role: "user" as const,
      content: buildRelevanceMessageContent(formData),
    },
    agent_id: RELEVANCE_AGENT_ID,
  };

  console.log(
    "Sending clean payload to Relevance:",
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

  const draftText = extractDraftText(data);
  if (!draftText) {
    throw new RelevancePathMappingError(data);
  }

  const jobId: string =
    asNonEmptyString(data.conversation_id) ??
    asNonEmptyString(asRecord(data.job_info)?.job_id) ??
    asNonEmptyString(data.id) ??
    "triggered";

  return { draftText, jobId, raw: data };
}
