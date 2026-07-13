export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import {
  getDemoDraftStandard,
  improveDemoDraft,
  simulateGenerateLatency,
} from "@/lib/demo/generate-mock-draft";
import { normalizeIncomingBody } from "@/lib/integrations/relevance-generate";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await simulateGenerateLatency();

    if (body.action === "improve") {
      const source =
        typeof body.draftText === "string" && body.draftText.trim()
          ? body.draftText
          : getDemoDraftStandard(
              typeof body.businessUnit === "string" ? body.businessUnit : undefined
            );

      const draftText = improveDemoDraft(
        source,
        typeof body.businessUnit === "string" ? body.businessUnit : undefined
      );

      console.info("[/api/generate] Demo improve — placeholders filled.");

      return NextResponse.json(
        { success: true, draftText, jobId: "demo-improve" },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const incoming = normalizeIncomingBody(body);

    if (!incoming.title?.trim() && !incoming.productName?.trim()) {
      return NextResponse.json(
        { success: false, error: "title is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const draftText = getDemoDraftStandard(incoming.businessUnit || undefined);

    console.info(
      `[/api/generate] Demo draft served (${draftText.length} chars) for "${incoming.title || incoming.productName}" · BU ${incoming.businessUnit || "EVS"}.`
    );

    return NextResponse.json(
      { success: true, draftText, jobId: "demo-generate" },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/generate]", message);
    return NextResponse.json(
      { success: false, error: `Live AI call failed: ${message}` },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
