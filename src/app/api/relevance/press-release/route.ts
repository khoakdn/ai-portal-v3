export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

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
    const result = await callRelevanceAgent(body);

    if (!result.success) {
      console.warn("[/api/relevance/press-release] Empty or unmapped response:", result.error);
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
      `[/api/relevance/press-release] Agent ${resolveAgentId()} triggered. Job: ${result.jobId}. Draft: true`
    );

    return NextResponse.json(
      {
        success: true,
        draft: result.draftText,
        draftText: result.draftText,
        jobId: result.jobId,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    const { status, body } = formatRelevanceApiError(err);
    console.error("[/api/relevance/press-release]", body.error);
    return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
  }
}
