export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import {
  formatRelevanceApiError,
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
    const body: Record<string, string> = await req.json();
    const result = await triggerRelevanceAgent(body);
    const { body: responseBody, status } = relevanceResultToApiJson(result);

    if (result.success) {
      console.info(
        `[/api/relevance/press-release] Agent ${resolveAgentId()} completed. Job: ${result.jobId}. Draft: true`
      );
      return NextResponse.json(
        {
          ...responseBody,
          draft: result.draftText,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (!result.pending) {
      console.warn("[/api/relevance/press-release] Agent response issue:", result.error);
    }

    return NextResponse.json(responseBody, { status, headers: NO_CACHE_HEADERS });
  } catch (err) {
    const { status, body } = formatRelevanceApiError(err);
    console.error("[/api/relevance/press-release]", body.error);
    return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
  }
}
