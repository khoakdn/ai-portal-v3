export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import {
  formatRelevanceApiError,
  normalizeIncomingBody,
  resolveAgentId,
  triggerRelevanceAgent,
} from "@/lib/integrations/relevance-generate";
import { relevanceResultToApiJson } from "@/lib/integrations/relevance-generate-response";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incoming = normalizeIncomingBody(body);

    if (!incoming.title?.trim() && !incoming.productName?.trim()) {
      return NextResponse.json(
        { success: false, error: "title is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const result = await triggerRelevanceAgent(body);
    const { body: responseBody, status } = relevanceResultToApiJson(result);

    if (result.success) {
      console.info(
        `[/api/generate] Agent ${resolveAgentId()} completed. Job: ${result.jobId}. Draft length: ${result.draftText.length}`
      );
    } else if (result.pending) {
      console.info(
        `[/api/generate] Agent ${resolveAgentId()} queued job ${result.jobId} (state: ${result.state ?? "unknown"}) for client polling.`
      );
    } else {
      console.warn("[/api/generate] Agent response issue:", result.error);
    }

    return NextResponse.json(responseBody, { status, headers: NO_CACHE_HEADERS });
  } catch (err) {
    const { status, body } = formatRelevanceApiError(err);
    console.error("[/api/generate]", body.error);
    return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
  }
}
