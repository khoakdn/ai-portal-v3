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

const OUTPUT_GUARDRAILS =
  "CRITICAL REQUIREMENT: You must only return the text draft inside the standard approved schema fields. Do not append, invent, or nest any new JSON keys, metadata properties, or extra fields, as this will trigger a strict schema violation error in our gateway pipeline.";

function pickCoreDetails(formData: Record<string, string>): string {
  return (
    formData.productDescription?.trim() ||
    formData.brief?.trim() ||
    formData.description?.trim() ||
    formData.thematicFocus?.trim() ||
    "Not specified"
  );
}

/** Map form fields to plain-text instructions — never raw JSON keys. */
function buildCleanInstructions(formData: Record<string, string>): string {
  const lines = [
    "Please write a professional press release draft based on these specific inputs:",
    `- Headline Title: ${formData.title?.trim() || "Untitled"}`,
    `- Press Release Type: ${formData.pressReleaseType?.trim() || "Corporate Announcement"}`,
    `- Business Unit: ${formData.businessUnit?.trim() || "Marketing Communications"}`,
    `- Target Region: ${formData.region?.trim() || "EMEA"}`,
    `- Language: ${formData.language?.trim() || "English"}`,
    `- Target Audience / Focus: ${formData.thematicFocus?.trim() || pickCoreDetails(formData)}`,
    `- Products to Address: ${formData.productsToAddress?.trim() || formData.deltaProducts?.trim() || "As described in core details"}`,
    `- Core Details: ${pickCoreDetails(formData)}`,
    "- Tone and Style: Professional, corporate, aligned with Delta Electronics brand voice",
  ];

  if (formData.priority?.trim()) lines.push(`- Priority: ${formData.priority.trim()}`);
  if (formData.deadline?.trim()) lines.push(`- Deadline: ${formData.deadline.trim()}`);
  if (formData.existingSystems?.trim()) {
    lines.push(`- Existing Systems / Context: ${formData.existingSystems.trim()}`);
  }
  if (formData.testReports?.trim()) lines.push(`- Test Reports / Evidence: ${formData.testReports.trim()}`);
  if (formData.infoMaterialLinks?.trim()) {
    lines.push(`- Reference Material Links: ${formData.infoMaterialLinks.trim()}`);
  }
  if (formData.contactPerson?.trim()) lines.push(`- Contact Person: ${formData.contactPerson.trim()}`);

  return lines.join("\n");
}

export function buildRelevanceMessageContent(formData: Record<string, string>): string {
  return `${buildCleanInstructions(formData)}\n\n${OUTPUT_GUARDRAILS}`;
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
