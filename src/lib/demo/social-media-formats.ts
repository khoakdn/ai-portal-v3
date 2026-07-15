export type SocialPlatform = "linkedin" | "instagram";

export const SOCIAL_OPTIMIZE_DELAY_MS = 800;

export const SOCIAL_FEEDBACK_DELAY_MS = 3000;

export const SOCIAL_DRAFT_STORAGE_KEY = "delta_social_draft";

export const INSTAGRAM_MOCKUP_IMAGE_URL =
  "https://filecenter.deltaww.com/news/images/album/202606231905025776.jpg?w=800";

export const SOCIAL_STAKEHOLDERS = [
  { id: "andrea", name: "Andrea", role: "Reviewer / Feedback" },
  { id: "denise", name: "Denise Futterer", role: "Manager / Approval" },
] as const;

export type StakeholderId = (typeof SOCIAL_STAKEHOLDERS)[number]["id"];

export const SOCIAL_REVIEWER_FEEDBACK_MESSAGE =
  "Great tone, but let's make the hashtags slightly more corporate on LinkedIn and make sure to explicitly tag Delta Electronics EMEA!";

export const SOCIAL_CORPORATE_HASHTAGS = "#DeltaElectronicsEMEA #UFC500";

export const SMARTER_E_SOCIAL_DEMO = {
  brief:
    "Delta's UFC500 ultra-fast charger (500kW) is taking center stage at The Smarter E Europe 2026 in Munich. Perfect compatibility for heavy-duty electric commercial fleets and public fast-charging grid integration.",
  businessUnit: "EVS",
  platform: "linkedin" as SocialPlatform,
  hookPlaceholder: "e.g. ⚡ Charging up the future of fleet transport!",
};

export function applySocialFeedbackFix(text: string): string {
  let result = text.trim();
  if (!result.includes("#DeltaElectronicsEMEA")) {
    result = `${result}\n\n${SOCIAL_CORPORATE_HASHTAGS}`;
  }
  if (!result.toLowerCase().includes("delta electronics emea")) {
    result = result.replace(
      /(Join us at|Smarter E Europe|#DeltaElectronicsEMEA)/i,
      "Delta Electronics EMEA — $1"
    );
    if (!result.toLowerCase().includes("delta electronics emea")) {
      result = `${result}\n\nTag: Delta Electronics EMEA`;
    }
  }
  return result.trim();
}

function stripBracketPlaceholders(text: string): string {
  return text
    .replace(/\[Date\]/g, "June 23, 2026")
    .replace(/\[Title\]/g, "Regional Marketing Director")
    .replace(/\[BusinessUnit\]/g, "EVS")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatLinkedInPost(rawDraft: string, topic: string): string {
  const headline = topic.trim() || "Delta EV Charging Innovation";
  const excerpt = stripBracketPlaceholders(rawDraft).slice(0, 280);

  return `${headline} — Delta is advancing the next generation of EV infrastructure.

${excerpt || "We're showcasing the UFC500 ultra-fast charger at The Smarter E Europe 2026 — engineered for operators who need grid-friendly, scalable charging at 500 kW."}

Why it matters:
• 97.5% peak efficiency with intelligent load balancing
• Seamless solar and battery storage integration
• Cloud diagnostics and OCPP-ready fleet management

Join us at Messe München, Hall B5, Booth 470.

#EVCharging #DeltaElectronics #GreenTech #Emobility #SmartEnergy`;
}

export function formatInstagramPost(rawDraft: string, topic: string): string {
  const headline = topic.trim() || "Smarter charging starts here";

  return `⚡ ${headline} 🔌

The UFC500 is here 💚
Ultra-fast · Compact · Built for tomorrow's networks

✨ 500 kW peak output
🌍 Grid-friendly by design
🔋 Solar + storage ready

Smarter E Europe 2026
Hall B5 · Booth 470 👋

#Delta #Sustainability #EVCharging #GreenTech #CleanEnergy #Innovation`;
}

export function buildPlatformCopies(rawDraft: string, topic: string): Record<SocialPlatform, string> {
  return {
    linkedin: formatLinkedInPost(rawDraft, topic),
    instagram: formatInstagramPost(rawDraft, topic),
  };
}

export function optimizeSocialCopy(text: string, platform: SocialPlatform): string {
  let result = stripBracketPlaceholders(text);

  if (platform === "linkedin") {
    if (!result.includes("#EVCharging")) {
      result = `${result}\n\n#EVCharging #DeltaElectronics #GreenTech #Emobility #SmartEnergy`;
    }
    result = result.replace(/\n{3,}/g, "\n\n");
  } else {
    if (!result.includes("#Delta")) {
      result = `${result}\n\n#Delta #Sustainability #EVCharging #GreenTech #CleanEnergy`;
    }
    result = result
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n\n");
  }

  return result.trim();
}

export interface SavedSocialDraft {
  title: string;
  bulletPoints: string;
  tone: string;
  platform: SocialPlatform;
  copies: Record<SocialPlatform, string>;
  savedAt: string;
}

export function saveSocialDraftToStorage(draft: SavedSocialDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOCIAL_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (err) {
    console.error("[delta_social_draft] Failed to persist draft:", err);
  }
}

export function loadSocialDraftFromStorage(): SavedSocialDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SOCIAL_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSocialDraft;
  } catch {
    return null;
  }
}
