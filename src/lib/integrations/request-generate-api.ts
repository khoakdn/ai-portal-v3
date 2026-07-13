export type GenerateApiResponse = {
  success?: boolean;
  draftText?: string;
  polling?: boolean;
  error?: string;
  debugPayload?: string;
};

export async function postGenerateApi(
  payload: Record<string, unknown>
): Promise<GenerateApiResponse> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  return (await res.json().catch(() => ({
    success: false,
    error: "Invalid response from server.",
  }))) as GenerateApiResponse;
}

export async function requestDraftFromGenerateApi(
  payload: Record<string, unknown>
): Promise<string> {
  const data = await postGenerateApi(payload);

  if (data.success && data.draftText) {
    return data.draftText;
  }

  throw new Error(
    data.error ??
      "Live AI call failed. Check server logs and try again."
  );
}

export async function requestImprovedDraftFromGenerateApi(
  draftText: string,
  businessUnit?: string
): Promise<string> {
  const data = await postGenerateApi({
    action: "improve",
    draftText,
    ...(businessUnit ? { businessUnit } : {}),
  });

  if (data.success && data.draftText) {
    return data.draftText;
  }

  throw new Error(data.error ?? "Failed to optimize draft placeholders.");
}
