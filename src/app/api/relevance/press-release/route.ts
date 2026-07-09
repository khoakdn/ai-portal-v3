export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import {
  callRelevanceAgent,
  formatRelevanceApiError,
  RELEVANCE_AGENT_ID,
} from "@/lib/integrations/relevance-generate";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function POST(req: Request) {
  try {
    const body: Record<string, string> = await req.json();
    const { draftText, jobId } = await callRelevanceAgent(body);

    console.info(
      `[/api/relevance/press-release] Agent ${RELEVANCE_AGENT_ID} triggered. Job: ${jobId}. Draft: true`
    );

    return NextResponse.json(
      {
        success: true,
        draft: draftText,
        draftText,
        jobId,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    const { status, body } = formatRelevanceApiError(err);
    console.error("[/api/relevance/press-release]", body.error);
    return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
  }
}
