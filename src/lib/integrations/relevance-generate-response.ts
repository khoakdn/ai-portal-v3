import type { RelevanceGenerateResult } from "@/lib/integrations/relevance-generate";

export type RelevanceApiJson =
  | {
      success: true;
      draftText: string;
      jobId: string;
      polled?: boolean;
    }
  | {
      success: false;
      polling: true;
      jobId: string;
      message: string;
      state?: string;
    }
  | {
      success: false;
      polling?: false;
      error: string;
      debugPayload?: string;
      jobId?: string;
    };

export function relevanceResultToApiJson(
  result: RelevanceGenerateResult
): { body: RelevanceApiJson; status: number } {
  if (result.success) {
    return {
      status: 200,
      body: {
        success: true,
        draftText: result.draftText,
        jobId: result.jobId,
        polled: result.polled,
      },
    };
  }

  if (result.pending) {
    return {
      status: 202,
      body: {
        success: false,
        polling: true,
        jobId: result.jobId,
        message: result.message,
        state: result.state,
      },
    };
  }

  return {
    status: result.status ?? 200,
    body: {
      success: false,
      error: result.error,
      debugPayload: result.debugPayload,
      jobId: result.jobId,
    },
  };
}
