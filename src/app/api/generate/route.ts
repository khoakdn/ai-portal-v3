export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import {
  callRelevanceAgent,
  formatRelevanceApiError,
  resolveAgentId,
} from "@/lib/integrations/relevance-generate";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function POST(req: Request) {
  try {
    const body: Record<string, string> = await req.json();

    if (!body.title?.trim()) {
      return NextResponse.json(
        { success: false, error: "title is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const result = await callRelevanceAgent(body);

    if (!result.success) {
      console.warn("[/api/generate] Empty or unmapped agent response:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          debugPayload: result.debugPayload,
          jobId: result.jobId,
        },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    console.info(
      `[/api/generate] Agent ${resolveAgentId()} completed. Job: ${result.jobId}. Draft length: ${result.draftText.length}`
    );

    return NextResponse.json(
      { success: true, draftText: result.draftText, jobId: result.jobId },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    const { status, body } = formatRelevanceApiError(err);
    console.error("[/api/generate]", body.error);
    return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
  }
}
