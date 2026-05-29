"use server";

import { getGeminiClient, GEMINI_MODELS } from "@/lib/gemini/client";
import type { ContentType } from "@/types/database";

export interface GeneratePressReleaseInput {
  title: string;
  bulletPoints: string;
  contentType?: ContentType;
  /** Optional structured context from the press-release wizard */
  structuredContext?: PressReleaseStructuredContext;
}

export interface PressReleaseStructuredContext {
  pressReleaseType: string;
  region?: string;
  language?: string;
  businessUnit?: string;
  priority?: string;
  deadline?: string;
  thematicFocus: string;
  productsToAddress: string;
  infoMaterialLinks?: string;
  contactPerson?: string;
  productDescription: string;
  existingSystems?: string;
  testReports?: string;
}

export interface GeneratePressReleaseResult {
  success: boolean;
  draft?: string;
  simulated?: boolean;
  error?: string;
}

/* ── Shared helpers ───────────────────────────────────────────────────── */

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

const CONTENT_PROMPTS: Record<ContentType, string> = {
  press_release: `You are an expert corporate communications writer. Generate a professional press release based on the bullet points provided.

Requirements:
- Use standard press release format (headline, dateline, lead paragraph, body, boilerplate, contact info placeholder)
- Write in clear, professional language suitable for media distribution
- Expand bullet points into compelling narrative paragraphs
- Keep tone confident but not overly promotional
- Output plain text only, no markdown`,

  social_post: `You are a social media manager for a corporate brand. Generate engaging social media posts based on the bullet points provided.

Requirements:
- Create 2-3 platform-ready posts (LinkedIn, X/Twitter, Instagram)
- Include relevant hashtags where appropriate
- Keep each post concise and engaging
- Match professional corporate tone
- Output plain text only, no markdown`,
};

/* ── Simulation fallbacks ─────────────────────────────────────────────── */

function buildSimulatedPressRelease(title: string, bulletPoints: string): string {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const points = bulletPoints
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  const lead = points[0] ?? "a significant new development";
  const body = points.slice(1);

  return `FOR IMMEDIATE RELEASE

${title.toUpperCase()}

${today} — Delta Corp today announced ${lead}. The company continues to demonstrate its commitment to excellence and innovation across all areas of operation.

${body.length > 0
  ? body.map((p) => `${p}.`).join("\n\n")
  : "This announcement reflects the organisation's ongoing strategy to deliver value to its stakeholders and partners worldwide."}

The initiative underscores Delta Corp's leadership position and its dedication to transparent communication with media and industry partners.

"We are proud to share this news with our stakeholders," said a spokesperson for Delta Corp. "This represents a key milestone in our journey and we look forward to sharing more updates in the coming weeks."

For further information, visit www.deltacorp.com or contact the communications team directly.

###

About Delta Corp
Delta Corp is a leading organisation committed to innovation, partnerships, and responsible growth. Headquartered in Europe, the company serves clients across multiple industry verticals.

Media Contact:
press@deltacorp.com
+32 2 000 0000

[SIMULATION MODE — Replace GEMINI_API_KEY in .env.local to use live AI generation]`;
}

function buildSimulatedSocialPost(title: string, bulletPoints: string): string {
  const points = bulletPoints
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  const summary = points.slice(0, 2).join(". ");
  const hashtags = "#CorporateComms #Marketing #Announcement #DeltaCorp #B2B";

  return `━━ LINKEDIN ━━

Excited to share some important news from Delta Corp! 🚀

${title}

${summary ? `${summary}.` : "We are thrilled to announce this new development that reflects our ongoing commitment to excellence."}

This is a pivotal moment for our team and the communities we serve. Stay tuned for more updates.

${hashtags}

---

━━ X / TWITTER ━━

Big news from @DeltaCorp: ${title}

${points[0] ? `${points[0]}.` : "A major announcement that marks an exciting chapter for our organisation."}

Full details: deltacorp.com 👇

${hashtags}

---

━━ INSTAGRAM ━━

${title} ✨

${points.slice(0, 3).map((p) => `▸ ${p}`).join("\n") || "▸ Exciting developments ahead\n▸ Committed to excellence\n▸ More to come"}

Follow us for the latest updates from Delta Corp.

${hashtags}

[SIMULATION MODE — Replace GEMINI_API_KEY in .env.local to use live AI generation]`;
}

/* ── Server Action ────────────────────────────────────────────────────── */

/** Build a rich structured prompt when the wizard form is used */
function buildStructuredPrompt(
  title: string,
  ctx: NonNullable<GeneratePressReleaseInput["structuredContext"]>
): string {
  const lines: string[] = [
    `You are an expert corporate communications writer specialising in technology press releases and media content.`,
    ``,
    `Generate a professional ${ctx.pressReleaseType} based on the following structured brief. Use wire-service format, clear professional language, and expand the brief into compelling narrative paragraphs.`,
    `Output plain text only — no markdown.`,
    ``,
    `=== DOCUMENT BRIEF ===`,
    `Type: ${ctx.pressReleaseType}`,
    `Title: ${title}`,
  ];

  if (ctx.region)       lines.push(`Region: ${ctx.region}`);
  if (ctx.language)     lines.push(`Language: ${ctx.language}`);
  if (ctx.businessUnit) lines.push(`Business Unit: ${ctx.businessUnit}`);
  if (ctx.priority)     lines.push(`Priority: ${ctx.priority}`);
  if (ctx.deadline)     lines.push(`Publication Deadline: ${ctx.deadline}`);

  lines.push(
    ``,
    `=== CONTENT BRIEF ===`,
    `Thematic Focus / Content Points:`,
    ctx.thematicFocus,
    ``,
    `Delta Products / Solutions to Address:`,
    ctx.productsToAddress,
    ``,
    `Product Description & Benefits:`,
    ctx.productDescription,
  );

  if (ctx.contactPerson) {
    lines.push(``, `Contact Person for Product Questions: ${ctx.contactPerson}`);
  }
  if (ctx.infoMaterialLinks) {
    lines.push(``, `Information Material & Image Links: ${ctx.infoMaterialLinks}`);
  }
  if (ctx.existingSystems) {
    lines.push(``, `Existing Systems to Consider / Integrate / Replace:`, ctx.existingSystems);
  }
  if (ctx.testReports) {
    lines.push(``, `Test Reports / Performance Results:`, ctx.testReports);
  }

  lines.push(``, `=== END BRIEF ===`, ``, `Generate the ${ctx.pressReleaseType} now.`);
  return lines.join("\n");
}

export async function generatePressRelease(
  input: GeneratePressReleaseInput
): Promise<GeneratePressReleaseResult> {
  const { title, bulletPoints, contentType = "press_release", structuredContext } = input;

  if (!title.trim()) {
    return { success: false, error: "Title is required" };
  }

  // When no structured context, bullet points are required
  if (!structuredContext && !bulletPoints.trim()) {
    return { success: false, error: "Please provide at least one bullet point" };
  }

  // ── Simulation mode (no API key) ───────────────────────────────────────
  if (!process.env.GEMINI_API_KEY) {
    console.info(
      "[generatePressRelease] GEMINI_API_KEY not set — returning simulated draft."
    );
    await delay(1800);

    const draft =
      contentType === "press_release"
        ? buildSimulatedPressRelease(title, structuredContext?.thematicFocus ?? bulletPoints)
        : buildSimulatedSocialPost(title, bulletPoints);

    return { success: true, draft, simulated: true };
  }

  // ── Live Gemini generation ─────────────────────────────────────────────
  try {
    const ai = getGeminiClient();

    const userText = structuredContext
      ? buildStructuredPrompt(title, structuredContext)
      : `${CONTENT_PROMPTS[contentType]}\n\nTitle: ${title}\n\nBullet Points:\n${bulletPoints}\n\nGenerate the ${contentType === "press_release" ? "press release" : "social media posts"} now.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODELS.content,
      contents: [{ role: "user", parts: [{ text: userText }] }],
      config: { temperature: 0.7, maxOutputTokens: 2048 },
    });

    const draft = response.text?.trim();
    if (!draft) {
      return { success: false, error: "AI returned an empty response. Please try again." };
    }

    return { success: true, draft };
  } catch (error) {
    console.error("[generatePressRelease]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate content";
    return { success: false, error: message };
  }
}
