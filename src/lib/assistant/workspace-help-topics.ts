export type HelpTopic = "press-release" | "social-media";

export interface HelpChip {
  id: HelpTopic;
  label: string;
  userText: string;
  steps: string;
}

export const DEMO_ASSISTANT_EMAIL = "denise.futterer@deltaww.com";

export const INLINE_TYPING_DELAY_MS = 600;

export const WORKSPACE_HELP_CHIPS: HelpChip[] = [
  {
    id: "press-release",
    label: "📝 How to request a Press Release",
    userText: "How do I request a Press Release?",
    steps: `Press Release workflow — generation through compliance routing:

1. Open Press Release Studio and complete the executive briefing form (Region, Date, Thematic Focus, Products, and product details).
2. Select your target corporate Business Unit acronym from the dropdown (ICTBG, EVS, IABG, BABG, EIBG, PSBG, CPBG, FMBG, or BMBU).
3. Click "Send to AI Agent" to generate the draft and populate the review canvas.
4. Run "✨ Optimize with AI" on the output — this patch tool auto-fills placeholders and removes layout brackets for a clean compliance-ready draft.
5. Choose a reviewer from the handoff dropdown and click "Assign for Review" to route the release to your supervisor.`,
  },
  {
    id: "social-media",
    label: "📱 How to create a Social Media Post",
    userText: "How do I create a Social Media Post?",
    steps: `Social Media workflow — short-form content through team handoff:

1. Open Social Media Post Studio and enter your Topic / Subject plus Key Points for the campaign brief.
2. Shift format types by selecting the tone that matches your channel (Professional, Enthusiastic, or Casual) — the live preview adapts for LinkedIn, X/Twitter, and Instagram layouts.
3. Click "Generate Social Post" to produce short-form copy in the preview canvas.
4. Refine the generated text directly in the live preview panel before submission.
5. Use the approval handoff controls to route the short-form layout directly to team reviewers via "Submit for Approval."`,
  },
];

export function buildWorkspaceWelcome(firstName: string): string {
  return `Welcome to DeltaPR, ${firstName}! 🚀 I can guide you through our internal generation and compliance pipelines. Select an operational framework below to begin.`;
}
