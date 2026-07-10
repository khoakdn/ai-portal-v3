export type RelevanceGenerateApiResponse = {
  success?: boolean;
  draftText?: string;
  polling?: boolean;
  jobId?: string;
  message?: string;
  state?: string;
  error?: string;
  debugPayload?: string;
};

export interface PollRelevanceDraftOptions {
  intervalMs?: number;
  maxAttempts?: number;
  onProgress?: (message: string, state?: string) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGenerateStatus(
  jobId: string
): Promise<{ data: RelevanceGenerateApiResponse; httpStatus: number }> {
  const res = await fetch(
    `/api/generate/status?jobId=${encodeURIComponent(jobId)}`,
    {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
      cache: "no-store",
    }
  );

  const data = (await res.json().catch(() => ({
    success: false,
    error: "Invalid response from status endpoint.",
  }))) as RelevanceGenerateApiResponse;

  return { data, httpStatus: res.status };
}

/**
 * Poll /api/generate/status until the Relevance agent returns a draft or fails.
 */
export async function pollRelevanceDraftFromApi(
  jobId: string,
  options: PollRelevanceDraftOptions = {}
): Promise<{ draftText: string; jobId: string }> {
  const intervalMs = options.intervalMs ?? 4000;
  const maxAttempts = options.maxAttempts ?? 45;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      await sleep(intervalMs);
    }

    const { data } = await fetchGenerateStatus(jobId);

    if (data.success && data.draftText) {
      return { draftText: data.draftText, jobId };
    }

    if (data.polling) {
      options.onProgress?.(
        data.message ?? "AI agent is processing your press release...",
        data.state
      );
      continue;
    }

    throw new PollRelevanceDraftError(
      data.error ?? "Live AI call failed while waiting for draft.",
      data.debugPayload
    );
  }

  throw new PollRelevanceDraftError(
    `Timed out after ~${Math.round((maxAttempts * intervalMs) / 1000)}s waiting for the AI agent. Job ID: ${jobId}. Try again shortly.`
  );
}

export class PollRelevanceDraftError extends Error {
  debugPayload?: string;

  constructor(message: string, debugPayload?: string) {
    super(message);
    this.name = "PollRelevanceDraftError";
    this.debugPayload = debugPayload;
  }
}

/**
 * Trigger /api/generate and poll client-side when the agent returns a pending job.
 */
export async function requestRelevanceDraftFromApi(
  payload: Record<string, unknown>,
  options: PollRelevanceDraftOptions = {}
): Promise<{ draftText: string; jobId: string }> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({
    success: false,
    error: "Invalid response from server.",
  }))) as RelevanceGenerateApiResponse;

  if (data.success && data.draftText) {
    return { draftText: data.draftText, jobId: data.jobId ?? "completed" };
  }

  if (data.polling && data.jobId) {
    options.onProgress?.(
      data.message ?? "AI agent is processing your press release...",
      data.state
    );
    return pollRelevanceDraftFromApi(data.jobId, options);
  }

  throw new PollRelevanceDraftError(
    data.error ??
      `Live AI call failed: HTTP ${res.status}. Check Vercel logs and RELEVANCE_AI_API_KEY.`,
    data.debugPayload
  );
}
