import {
  DEFAULT_DELTA_BUSINESS_UNIT,
  resolveBusinessUnit,
} from "@/lib/content/delta-business-units";

const DEMO_DRAFT_TEMPLATE = `Delta Showcases Leadership in EV Charging with the UFC500 Ultra-Fast Charger at The Smarter E Europe 2026

Munich, Germany – [Date] – Delta Electronics, a global leader in power and thermal management solutions, today announced it will present the UFC500 ultra-fast EV charger and integrated energy-management platform at The Smarter E Europe 2026, Messe München, Hall B5, Booth 470.

The UFC500 delivers up to 500 kW of charging power with 97.5% peak efficiency, dynamic load balancing, and seamless integration with solar and battery storage systems — enabling fleet operators, charge point operators, and infrastructure planners to accelerate Europe's e-mobility transition.

"The UFC500 gives European operators a future-ready path to scalable, grid-friendly ultra-fast charging," said Maggie Weng, [Title] of the [BusinessUnit] at Delta Electronics. "We are proud to demonstrate how Delta's power electronics expertise translates into reliable infrastructure for the next generation of mobility."

Visitors to Delta's booth can experience live demonstrations of modular power architecture, liquid-cooling thermal design, and cloud-based site management through Delta's IoT-enabled EV charging software suite.

Key highlights at The Smarter E Europe 2026:
• UFC500 ultra-fast charger — 500 kW peak output with intelligent power sharing
• Grid-friendly operation with renewable integration and storage coupling
• Remote diagnostics, OCPP compliance, and predictive maintenance analytics

Media and partners are invited to schedule a briefing with the Delta EMEA team during the exhibition.

About Delta

Delta, founded in 1971 and listed on the Taiwan Stock Exchange (code: 2308), is a global leader in switching power supplies and thermal management products with a thriving portfolio of smart energy-saving systems and solutions in the fields of industrial automation, building automation, telecom power, data center infrastructure, EV charging, renewable energy, energy storage and display.

As a world-class corporate citizen guided by its mission statement, "To provide innovative, clean and energy-efficient solutions for a better tomorrow," Delta leverages its core competence in high-efficiency power electronics and its ESG-embedded business model to address key environmental issues, such as climate change. Delta serves customers through its sales offices, R&D centers and manufacturing facilities spread over close to 200 locations across 5 continents.

For detailed information about Delta, please visit: www.delta-emea.com`;

const IMPROVE_REPLACEMENTS: Record<string, string> = {
  "[Date]": "June 23, 2026",
  "[Title]": "Regional Marketing Director",
};

const EXECUTIVE_QUOTE_PATTERN =
  /"The UFC500 gives European operators[\s\S]*?next generation of mobility\."/;

export function extractBusinessUnitFromDraft(text: string): string | null {
  const match = text.match(/of the ([A-Z]+) at Delta Electronics/);
  return match?.[1] ?? null;
}

function injectBusinessUnit(text: string, businessUnit: string): string {
  return text.split("[BusinessUnit]").join(businessUnit);
}

function buildImprovedExecutiveQuote(businessUnit: string): string {
  return `"The UFC500 is a game-changer for European operators — delivering ultra-fast power in a remarkably compact footprint," said Maggie Weng, Regional Marketing Director of the ${businessUnit} at Delta Electronics. "This space-saving design proves that serious charging performance doesn't require serious square footage, and we're proud to show how Delta is accelerating the next wave of e-mobility."`;
}

export function getDemoDraftStandard(businessUnit?: string): string {
  const unit = resolveBusinessUnit(businessUnit);
  return injectBusinessUnit(DEMO_DRAFT_TEMPLATE, unit);
}

export function improveDemoDraft(text: string, businessUnit?: string): string {
  let result = text;
  for (const [placeholder, value] of Object.entries(IMPROVE_REPLACEMENTS)) {
    result = result.split(placeholder).join(value);
  }

  const unit =
    resolveBusinessUnit(
      businessUnit ?? extractBusinessUnitFromDraft(result) ?? undefined
    );
  return injectBusinessUnit(result, unit);
}

export const REVIEWER_FEEDBACK_MESSAGE =
  "Great draft on the UFC500! Can we optimize the executive quote section to make it sound punchier and place more emphasis on the compact, space-saving layout?";

export function applyReviewerFeedbackFix(text: string, businessUnit?: string): string {
  const unit = resolveBusinessUnit(
    businessUnit ?? extractBusinessUnitFromDraft(text) ?? undefined
  );
  let result = improveDemoDraft(text, unit);
  const improvedQuote = buildImprovedExecutiveQuote(unit);
  if (EXECUTIVE_QUOTE_PATTERN.test(result)) {
    result = result.replace(EXECUTIVE_QUOTE_PATTERN, improvedQuote);
  }
  return result;
}

export const MOCK_OPTIMIZE_DELAY_MS = 800;

export const MOCK_GENERATE_DELAY_MS = 1200;

export async function simulateGenerateLatency(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_GENERATE_DELAY_MS));
}
