export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import {
  checkRelevanceJobStatus,
  formatRelevanceApiError,
} from "@/lib/integrations/relevance-generate";
import { relevanceResultToApiJson } from "@/lib/integrations/relevance-generate-response";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId")?.trim();

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "jobId query parameter is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const result = await checkRelevanceJobStatus(jobId);
    const { body, status } = relevanceResultToApiJson(result);

    if (!result.success && !result.pending) {
      console.warn("[/api/generate/status] Agent response issue:", result.error);
    }

    return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
  } catch (err) {
    const { status, body } = formatRelevanceApiError(err);
    console.error("[/api/generate/status]", body.error);
    return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
  }
}
