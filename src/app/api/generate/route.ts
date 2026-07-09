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

    if (!body.title?.trim()) {
      return NextResponse.json(
        { success: false, error: "title is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Single-shot agent: draftText from output.output | output.text | output.reply | reply
    const { draftText, jobId } = await callRelevanceAgent(body);

    console.info(
      `[/api/generate] Agent ${RELEVANCE_AGENT_ID} completed. Job: ${jobId}. Draft length: ${draftText.length}`
    );

    return NextResponse.json(
      { success: true, draftText, jobId },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    const { status, body } = formatRelevanceApiError(err);
    console.error("[/api/generate]", body.error);
    return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
  }
}
