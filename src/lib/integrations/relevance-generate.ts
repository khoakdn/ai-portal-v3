export const RELEVANCE_ENDPOINT =
  "https://api-d7b62b.stack.tryrelevance.com/latest/agents/trigger";

export const RELEVANCE_AGENT_ID = "7d952fd2-b498-45f4-83e0-97984ef1eab7";

const POLL_INTERVAL_MS = 3000;
const POLL_BUDGET_MS = 55_000;

const QUEUED_STATES = new Set([
  "waiting-for-capacity",
  "starting-up",
  "queued-for-approval",
  "queued-for-rerun",
  "running",
]);

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

function getRelevanceBaseUrl(): string {
  const fromEnv = readRelevanceEnv("RELEVANCE_AI_REGION_BASE_URL");
  let base =
    fromEnv ||
    RELEVANCE_ENDPOINT.replace(/\/agents\/trigger\/?$/, "") ||
    "https://api-d7b62b.stack.tryrelevance.com/latest";

  base = base.replace(/\/$/, "");
  // Guard against env values that accidentally include the trigger path.
  base = base.replace(/\/agents\/trigger$/, "");
  return base;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  key_messages: string[] | string;
  features: string[];
  quote?: string;
  strategic_priorities?: string;
  new_product: StructuredBriefing;
  event_exhibition: StructuredBriefing;
  case_study_success_story: StructuredBriefing;
  article_questionnaire: StructuredBriefing;
}

export interface StructuredBriefing {
  region: string;
  product_name: string;
  launch_date: string;
  features: string[];
  key_messages: string;
  quote: string;
  strategic_priorities: string;
}

export interface NormalizedIncoming {
  prType: string;
  region: string;
  productName: string;
  launchDate: string;
  keyMessages: string;
  quote: string;
  strategicPriorities: string;
  features: string[];
  title: string;
}

const AGENT_DIAGNOSTIC_PATTERNS = [
  "Missing Input Stopped Output",
  "LLM Returned No Text",
];

function stringField(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function normalizeFeaturesValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => stringField(item)).filter(Boolean);
  }
  const single = stringField(value);
  if (!single) return [];
  return parseListValue(single);
}

/** Universal extractor — flat keys, nested formData, or briefingData. */
export function normalizeIncomingBody(body: unknown): NormalizedIncoming {
  const root = asRecord(body) ?? {};
  const incoming = asRecord(root.formData) ?? asRecord(root.briefingData) ?? root;

  const prType =
    stringField(incoming.prType) ||
    stringField(incoming.type) ||
    "product_launch";
  const region = stringField(incoming.region) || "EMEA";
  const productName =
    stringField(incoming.productName) ||
    stringField(incoming.product_name) ||
    stringField(incoming.title) ||
    "";
  const launchDate =
    stringField(incoming.launchDate) ||
    stringField(incoming.launch_date) ||
    stringField(incoming.deadline) ||
    "";
  const keyMessages =
    stringField(incoming.keyMessages) ||
    stringField(incoming.key_messages) ||
    stringField(incoming.thematicFocus) ||
    stringField(incoming.brief) ||
    "";
  const quote =
    stringField(incoming.quote) || stringField(incoming.contactPerson) || "";
  const strategicPriorities =
    stringField(incoming.strategicPriorities) ||
    stringField(incoming.strategic_priorities) ||
    stringField(incoming.businessUnit) ||
    "";

  let features = normalizeFeaturesValue(incoming.features);
  if (features.length === 0) {
    features = normalizeFeaturesValue(
      incoming.productsToAddress ?? incoming.productDescription
    );
  }

  return {
    prType,
    region,
    productName,
    launchDate,
    keyMessages,
    quote,
    strategicPriorities,
    features,
    title: stringField(incoming.title) || productName,
  };
}

/** Flat string map for legacy briefing builders. */
export function normalizedToFormData(normalized: NormalizedIncoming): Record<string, string> {
  return {
    prType: normalized.prType,
    type: normalized.prType,
    region: normalized.region,
    productName: normalized.productName,
    product_name: normalized.productName,
    title: normalized.title,
    launchDate: normalized.launchDate,
    launch_date: normalized.launchDate,
    deadline: normalized.launchDate,
    keyMessages: normalized.keyMessages,
    key_messages: normalized.keyMessages,
    thematicFocus: normalized.keyMessages,
    brief: normalized.keyMessages,
    quote: normalized.quote,
    strategicPriorities: normalized.strategicPriorities,
    strategic_priorities: normalized.strategicPriorities,
    features: normalized.features.join(", "),
    productsToAddress: normalized.features.join(", "),
    pressReleaseType: normalized.prType,
  };
}

function isAgentDiagnosticError(text: string): boolean {
  return AGENT_DIAGNOSTIC_PATTERNS.some((pattern) => text.includes(pattern));
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

export function buildAgentParams(normalized: NormalizedIncoming): RelevanceAgentParams {
  const structuredBriefing: StructuredBriefing = {
    region: normalized.region || "EMEA",
    product_name: normalized.productName || "[Product Name]",
    launch_date: normalized.launchDate || "[Launch Date]",
    features: normalized.features.length > 0 ? normalized.features : [],
    key_messages: normalized.keyMessages || "",
    quote: normalized.quote || "",
    strategic_priorities: normalized.strategicPriorities || "",
  };

  return {
    region: structuredBriefing.region,
    product_name: structuredBriefing.product_name,
    launch_date: structuredBriefing.launch_date,
    features: structuredBriefing.features,
    key_messages: normalized.keyMessages
      ? parseListValue(normalized.keyMessages)
      : [],
    quote: structuredBriefing.quote,
    strategic_priorities: structuredBriefing.strategic_priorities,
    new_product: structuredBriefing,
    event_exhibition: structuredBriefing,
    case_study_success_story: structuredBriefing,
    article_questionnaire: structuredBriefing,
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

export function buildRelevanceTriggerPayload(body: unknown) {
  const normalized = normalizeIncomingBody(body);
  const formData = normalizedToFormData(normalized);

  return {
    agent_id: resolveAgentId(),
    message: {
      role: "user" as const,
      content: buildRelevanceMessageContent(formData),
    },
    params: buildAgentParams(normalized),
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

export function extractConversationId(data: Record<string, unknown>): string | null {
  return (
    asNonEmptyString(data.conversation_id) ??
    asNonEmptyString(asRecord(data.job_info)?.conversation_id)
  );
}

function isAgentRole(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === "agent" || normalized === "assistant";
}

function getMessagesArray(payload: Record<string, unknown>): unknown[] {
  if (Array.isArray(payload.messages)) return payload.messages;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function extractTextFromHistoryMessage(msg: Record<string, unknown>): string | null {
  const role = asNonEmptyString(msg.role);
  const content = msg.content;
  const contentObj = asRecord(content);

  const isAgent =
    isAgentRole(role) ||
    contentObj?.type === "agent-message" ||
    contentObj?.type === "agent";

  if (!isAgent) return null;

  if (contentObj?.generating === true) return null;

  return (
    normalizeDraftValue(msg.text) ||
    normalizeDraftValue(msg.content) ||
    normalizeDraftValue(contentObj?.text) ||
    normalizeDraftValue(contentObj?.output) ||
    normalizeDraftValue(contentObj?.reply)
  );
}

/** Find the latest agent/assistant message in a conversation history payload. */
export function extractLatestAgentDraft(messages: unknown[]): string | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = asRecord(messages[i]);
    if (!msg) continue;
    const text = extractTextFromHistoryMessage(msg);
    if (text) return text;
  }

  return null;
}

function shouldPollForDraft(
  data: Record<string, unknown>,
  draftText: string | null
): boolean {
  if (draftText) return false;

  const conversationId = extractConversationId(data);
  if (!conversationId) return false;

  const state = asNonEmptyString(data.state);
  if (state && QUEUED_STATES.has(state)) return true;

  return Boolean(asRecord(data.job_info));
}

async function relevanceFetch(
  apiKey: string,
  url: string,
  method: "GET" | "POST" = "GET"
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`Relevance request failed: ${message}`);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Relevance request returned ${response.status}. ${errorText}`.trim()
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

async function fetchConversationMessages(
  apiKey: string,
  conversationId: string
): Promise<Record<string, unknown>> {
  const baseUrl = getRelevanceBaseUrl();
  const url = `${baseUrl}/agents/conversations/${conversationId}/messages`;
  return relevanceFetch(apiKey, url, "GET");
}

async function fetchAgentTaskView(
  apiKey: string,
  agentId: string,
  conversationId: string
): Promise<Record<string, unknown>> {
  const baseUrl = getRelevanceBaseUrl();
  const url = `${baseUrl}/agents/${agentId}/tasks/${conversationId}/view`;
  return relevanceFetch(apiKey, url, "POST");
}

async function fetchConversationStudios(
  apiKey: string,
  agentId: string,
  conversationId: string
): Promise<Record<string, unknown>> {
  const baseUrl = getRelevanceBaseUrl();
  const params = new URLSearchParams({
    conversation_id: conversationId,
    agent_id: agentId,
    page_size: "100",
  });
  const url = `${baseUrl}/agents/conversations/studios/list?${params.toString()}`;
  return relevanceFetch(apiKey, url, "GET");
}

function extractDraftFromTaskView(payload: Record<string, unknown>): string | null {
  const results = getMessagesArray(payload);

  for (let i = results.length - 1; i >= 0; i--) {
    const step = asRecord(results[i]);
    if (!step) continue;

    const content = asRecord(step.content);
    if (!content || content.generating === true) continue;

    const contentType = asNonEmptyString(content.type);
    if (contentType === "agent-message") {
      const text = normalizeDraftValue(content.text);
      if (text) return text;
    }

    if (contentType === "tool-run") {
      const output = content.output;
      if (typeof output === "string") {
        const text = normalizeDraftValue(output);
        if (text) return text;
      }
      const outputObj = asRecord(output);
      if (outputObj) {
        const draft =
          safeExtractDraftText({ output: outputObj }) ||
          normalizeDraftValue(outputObj.text) ||
          normalizeDraftValue(outputObj.reply);
        if (draft) return draft;
      }
    }

    if (contentType === "agent-error" && Array.isArray(content.errors)) {
      const messages = content.errors
        .map((item) => {
          const err = asRecord(item);
          return asNonEmptyString(err?.message) || asNonEmptyString(err?.error);
        })
        .filter(Boolean);
      if (messages.length > 0) return messages.join("\n");
    }

    const fromStep = extractTextFromHistoryMessage(step);
    if (fromStep) return fromStep;
  }

  return null;
}

function extractDraftFromStudiosList(payload: Record<string, unknown>): string | null {
  const results = payload.results;
  if (!Array.isArray(results)) return null;

  for (let i = results.length - 1; i >= 0; i--) {
    const item = asRecord(results[i]);
    if (!item || item.status !== "complete") continue;

    const preview =
      normalizeDraftValue(item.output_preview) ||
      safeExtractDraftText(item) ||
      normalizeDraftValue(item.output);
    if (preview) return preview;
  }

  return null;
}

function resolvePollDraft(text: string): PollConversationResult {
  if (isAgentDiagnosticError(text)) {
    return { kind: "diagnostic", error: text, raw: {} };
  }
  return { kind: "draft", draftText: text, raw: {} };
}

async function pollOnceForDraft(
  apiKey: string,
  agentId: string,
  conversationId: string
): Promise<{ draftText: string | null; snapshot: Record<string, unknown> }> {
  const snapshot: Record<string, unknown> = {};

  try {
    const messagesPayload = await fetchConversationMessages(apiKey, conversationId);
    snapshot.messages = messagesPayload;

    const draftFromHistory = extractLatestAgentDraft(getMessagesArray(messagesPayload));
    if (draftFromHistory) {
      return { draftText: draftFromHistory, snapshot };
    }

    const draftFromPayload = safeExtractDraftText(messagesPayload);
    if (draftFromPayload) {
      return { draftText: draftFromPayload, snapshot };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Messages poll failed";
    snapshot.messagesError = message;
    console.warn(`[Relevance poll] Messages endpoint: ${message}`);
  }

  try {
    const taskViewPayload = await fetchAgentTaskView(apiKey, agentId, conversationId);
    snapshot.taskView = taskViewPayload;

    const draftFromTaskView = extractDraftFromTaskView(taskViewPayload);
    if (draftFromTaskView) {
      return { draftText: draftFromTaskView, snapshot };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Task view poll failed";
    snapshot.taskViewError = message;
    console.warn(`[Relevance poll] Task view endpoint: ${message}`);
  }

  try {
    const studiosPayload = await fetchConversationStudios(apiKey, agentId, conversationId);
    snapshot.studios = studiosPayload;

    const draftFromStudios = extractDraftFromStudiosList(studiosPayload);
    if (draftFromStudios) {
      return { draftText: draftFromStudios, snapshot };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Studios poll failed";
    snapshot.studiosError = message;
    console.warn(`[Relevance poll] Studios endpoint: ${message}`);
  }

  return { draftText: null, snapshot };
}

type PollConversationResult =
  | { kind: "draft"; draftText: string; raw: Record<string, unknown> }
  | { kind: "diagnostic"; error: string; raw: Record<string, unknown> };

async function pollConversationForDraft(
  apiKey: string,
  agentId: string,
  conversationId: string,
  triggerData: Record<string, unknown>
): Promise<PollConversationResult | null> {
  let lastSnapshot: Record<string, unknown> = triggerData;
  const deadline = Date.now() + POLL_BUDGET_MS;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;

    if (attempt > 1) {
      await sleep(POLL_INTERVAL_MS);
      if (Date.now() >= deadline) break;
    }

    console.info(
      `[Relevance poll] Attempt ${attempt} — messages, task/view, studios for ${conversationId}`
    );

    const polled = await pollOnceForDraft(apiKey, agentId, conversationId);
    lastSnapshot = { trigger: triggerData, ...polled.snapshot };
    console.log(
      `=== RELEVANCE POLL SNAPSHOT (${attempt}) ===`,
      JSON.stringify(lastSnapshot, null, 2)
    );

    if (polled.draftText) {
      const resolved = resolvePollDraft(polled.draftText);
      if (resolved.kind === "diagnostic") {
        console.warn("[Relevance poll] Agent diagnostic error detected:", resolved.error);
        return { kind: "diagnostic", error: resolved.error, raw: lastSnapshot };
      }
      return { kind: "draft", draftText: resolved.draftText, raw: lastSnapshot };
    }
  }

  console.warn(
    `[Relevance poll] Exhausted ${attempt} attempts (${POLL_BUDGET_MS}ms budget) for conversation ${conversationId}`
  );
  return null;
}

export type RelevanceGenerateResult =
  | {
      success: true;
      draftText: string;
      jobId: string;
      raw: Record<string, unknown>;
      polled?: boolean;
    }
  | {
      success: false;
      pending: true;
      jobId: string;
      message: string;
      state?: string;
      raw?: Record<string, unknown>;
    }
  | {
      success: false;
      pending?: false;
      error: string;
      status?: number;
      debugPayload?: string;
      jobId?: string;
      raw?: Record<string, unknown>;
    };

const TERMINAL_FAILURE_STATES = new Set(["failed", "error", "cancelled"]);

function extractFailureFromSnapshot(snapshot: Record<string, unknown>): string | null {
  const studios = asRecord(snapshot.studios);
  const studioResults = studios?.results;
  if (Array.isArray(studioResults)) {
    for (let i = studioResults.length - 1; i >= 0; i--) {
      const row = asRecord(studioResults[i]);
      if (!row) continue;

      const status = asNonEmptyString(row.status);
      if (status !== "failed" && status !== "error") continue;

      if (Array.isArray(row.errors) && row.errors.length > 0) {
        const messages = row.errors
          .map((item) => {
            const err = asRecord(item);
            return asNonEmptyString(err?.message) || asNonEmptyString(err?.error);
          })
          .filter(Boolean);
        if (messages.length > 0) return messages.join("\n");
      }

      return `AI agent job failed (status: ${status}).`;
    }
  }

  const taskView = asRecord(snapshot.taskView);
  if (taskView) {
    const taskResults = getMessagesArray(taskView);
    for (let i = taskResults.length - 1; i >= 0; i--) {
      const step = asRecord(taskResults[i]);
      const content = asRecord(step?.content);
      if (!content || content.type !== "agent-error" || !Array.isArray(content.errors)) {
        continue;
      }

      const messages = content.errors
        .map((item) => {
          const err = asRecord(item);
          return asNonEmptyString(err?.message) || asNonEmptyString(err?.error);
        })
        .filter(Boolean);
      if (messages.length > 0) return messages.join("\n");
    }
  }

  return null;
}

function inferAgentStateFromSnapshot(
  snapshot: Record<string, unknown>
): string | undefined {
  const studios = asRecord(snapshot.studios);
  const results = studios?.results;
  if (Array.isArray(results) && results.length > 0) {
    const main = asRecord(results[0]);
    const status = asNonEmptyString(main?.status);
    if (status) return status;
  }

  const trigger = asRecord(snapshot.trigger);
  return asNonEmptyString(trigger?.state) ?? undefined;
}

function pendingMessage(state?: string): string {
  if (state === "waiting-for-capacity") {
    return "Waiting for AI agent capacity...";
  }
  if (state === "inprogress" || state === "running") {
    return "AI agent is researching and writing your draft...";
  }
  if (state === "complete") {
    return "Finalizing press release draft...";
  }
  if (state === "failed" || state === "error" || state === "cancelled") {
    return "AI agent could not complete this request.";
  }
  return "AI agent is processing your press release...";
}

export async function checkRelevanceJobStatus(
  conversationId: string
): Promise<RelevanceGenerateResult> {
  const apiKey = readRelevanceEnv("RELEVANCE_AI_API_KEY");
  if (!apiKey) {
    throw new Error("RELEVANCE_AI_API_KEY is not configured.");
  }

  const polled = await pollOnceForDraft(apiKey, resolveAgentId(), conversationId);
  const snapshot = polled.snapshot;
  const state = inferAgentStateFromSnapshot(snapshot);
  const failureMessage = extractFailureFromSnapshot(snapshot);

  if (polled.draftText) {
    const resolved = resolvePollDraft(polled.draftText);
    if (resolved.kind === "diagnostic") {
      return {
        success: false,
        error: resolved.error,
        status: 400,
        debugPayload: JSON.stringify(snapshot),
        jobId: conversationId,
        raw: snapshot,
      };
    }

    return {
      success: true,
      draftText: resolved.draftText,
      jobId: conversationId,
      raw: snapshot,
      polled: true,
    };
  }

  if (failureMessage || (state && TERMINAL_FAILURE_STATES.has(state))) {
    return {
      success: false,
      error: failureMessage ?? `AI agent job failed (state: ${state}).`,
      debugPayload: JSON.stringify(snapshot),
      jobId: conversationId,
      raw: snapshot,
    };
  }

  return {
    success: false,
    pending: true,
    jobId: conversationId,
    state,
    message: pendingMessage(state),
    raw: snapshot,
  };
}

export async function triggerRelevanceAgent(
  body: unknown
): Promise<RelevanceGenerateResult> {
  const apiKey = readRelevanceEnv("RELEVANCE_AI_API_KEY");
  if (!apiKey) {
    throw new Error("RELEVANCE_AI_API_KEY is not configured.");
  }

  const relevancePayload = buildRelevanceTriggerPayload(body);

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
    extractConversationId(data) ??
    asNonEmptyString(asRecord(data.job_info)?.job_id) ??
    asNonEmptyString(data.id) ??
    "triggered";

  let draftText: string | null = null;
  try {
    draftText = safeExtractDraftText(data);
    if (draftText && isAgentDiagnosticError(draftText)) {
      return {
        success: false,
        error: draftText,
        status: 400,
        debugPayload: JSON.stringify(data),
        jobId,
        raw: data,
      };
    }
  } catch (err) {
    console.warn("[Relevance] Path mapping guard caught:", err);
    draftText = null;
  }

  if (!draftText && shouldPollForDraft(data, draftText)) {
    const conversationId = extractConversationId(data);
    if (conversationId) {
      const state = asNonEmptyString(data.state) ?? undefined;
      console.info(
        `[Relevance] Queued response (state: ${state ?? "unknown"}). Returning job ${conversationId} for client polling.`
      );
      return {
        success: false,
        pending: true,
        jobId: conversationId,
        state,
        message: pendingMessage(state),
        raw: data,
      };
    }
  }

  if (!draftText) {
    const state = asNonEmptyString(data.state);
    const queuedHint = state && QUEUED_STATES.has(state)
      ? ` Agent state: ${state}.`
      : "";

    return {
      success: false,
      error: `Empty draft received from AI agent.${queuedHint}`,
      debugPayload: JSON.stringify(data),
      jobId,
      raw: data,
    };
  }

  return { success: true, draftText, jobId, raw: data, polled: false };
}

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

/** @deprecated Use triggerRelevanceAgent — server-side polling removed in favor of client polling. */
export async function callRelevanceAgent(
  body: unknown
): Promise<RelevanceGenerateResult> {
  return triggerRelevanceAgent(body);
}
