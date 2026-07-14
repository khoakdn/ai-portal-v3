// ─────────────────────────────────────────────────────────────────────────────
// IC-Annual-Marketing-Budget — structural model
// ─────────────────────────────────────────────────────────────────────────────

export type TimeframeTab = "Q1" | "Q2" | "Q3" | "Q4" | "H1" | "Full Year";
export type ChartType = "bar" | "donut" | "area";

export interface BudgetLine {
  id: string;
  category: string;
  subCategory: string | null;
  /** Hex color for charts */
  color: string;
  annualBudget: number;
  /** [Q1, Q2, Q3, Q4] */
  quarterlyBudget: [number, number, number, number];
  /** Pre-loaded demo spending per quarter */
  quarterlySpent: [number, number, number, number];
}

export interface MonthlyDataPoint {
  month: string;
  budgeted: number;
  spent: number;
}

export interface TimeframeMetrics {
  budgeted: number;
  spent: number;
  remaining: number;
  pct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color palette (one per top-level category)
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, string> = {
  "National Marketing": "#0087DC",
  "Local Marketing":    "#34d399",
  "Public Relations":   "#a78bfa",
  "Content Marketing":  "#fb923c",
  "Social Media":       "#f472b6",
};

// ─────────────────────────────────────────────────────────────────────────────
// Valid AI-inferred categories (used in Gemini prompt + zod schema)
// ─────────────────────────────────────────────────────────────────────────────

export const VALID_CATEGORIES = [
  "National Marketing",
  "Local Marketing",
  "Public Relations",
  "Content Marketing",
  "Social Media",
] as const;

export const VALID_SUBCATEGORIES: Record<string, string[]> = {
  "National Marketing": ["Banner Ads"],
  "Local Marketing":    [],
  "Public Relations":   ["Events", "Press Releases", "Conferences", "Webinars"],
  "Content Marketing":  [],
  "Social Media":       ["LinkedIn", "Facebook"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Initial budget data — mirrors IC-Annual-Marketing-Budget-8603_2.xlsx
// Q1 ~90% spent · Q2 ~65% spent · Q3 ~10% spent · Q4 0% (front-loaded year)
// ─────────────────────────────────────────────────────────────────────────────

export const INITIAL_BUDGET_LINES: BudgetLine[] = [
  {
    id: "national-banner",
    category: "National Marketing",
    subCategory: "Banner Ads",
    color: "#0087DC",
    annualBudget: 120_000,
    quarterlyBudget: [30_000, 30_000, 30_000, 30_000],
    quarterlySpent:  [27_000, 19_500, 3_000,  0],
  },
  {
    id: "local-marketing",
    category: "Local Marketing",
    subCategory: null,
    color: "#34d399",
    annualBudget: 80_000,
    quarterlyBudget: [20_000, 20_000, 20_000, 20_000],
    quarterlySpent:  [18_000, 13_000, 2_000,  0],
  },
  {
    id: "pr-events",
    category: "Public Relations",
    subCategory: "Events",
    color: "#a78bfa",
    annualBudget: 60_000,
    quarterlyBudget: [15_000, 15_000, 15_000, 15_000],
    quarterlySpent:  [13_500, 9_750,  1_500,  0],
  },
  {
    id: "pr-press-releases",
    category: "Public Relations",
    subCategory: "Press Releases",
    color: "#8b5cf6",
    annualBudget: 30_000,
    quarterlyBudget: [7_500, 7_500, 7_500, 7_500],
    quarterlySpent:  [6_750, 4_875, 750,   0],
  },
  {
    id: "pr-conferences",
    category: "Public Relations",
    subCategory: "Conferences",
    color: "#7c3aed",
    annualBudget: 45_000,
    quarterlyBudget: [11_250, 11_250, 11_250, 11_250],
    quarterlySpent:  [10_125, 7_300,  1_125,  0],
  },
  {
    id: "pr-webinars",
    category: "Public Relations",
    subCategory: "Webinars",
    color: "#6d28d9",
    annualBudget: 25_000,
    quarterlyBudget: [6_250, 6_250, 6_250, 6_250],
    quarterlySpent:  [5_625, 4_063, 625,   0],
  },
  {
    id: "content-marketing",
    category: "Content Marketing",
    subCategory: null,
    color: "#fb923c",
    annualBudget: 90_000,
    quarterlyBudget: [22_500, 22_500, 22_500, 22_500],
    quarterlySpent:  [20_250, 14_625, 2_250,  0],
  },
  {
    id: "social-linkedin",
    category: "Social Media",
    subCategory: "LinkedIn",
    color: "#f472b6",
    annualBudget: 50_000,
    quarterlyBudget: [12_500, 12_500, 12_500, 12_500],
    quarterlySpent:  [11_250, 8_125,  1_250,  0],
  },
  {
    id: "social-facebook",
    category: "Social Media",
    subCategory: "Facebook",
    color: "#ec4899",
    annualBudget: 40_000,
    quarterlyBudget: [10_000, 10_000, 10_000, 10_000],
    quarterlySpent:  [9_000,  6_500,  1_000,  0],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Monthly data — for Area chart (cumulative actual vs budgeted by month)
// ─────────────────────────────────────────────────────────────────────────────

export const MONTHLY_DATA: MonthlyDataPoint[] = [
  { month: "Jan", budgeted: 45_000, spent: 55_000 },
  { month: "Feb", budgeted: 90_000, spent: 105_000 },
  { month: "Mar", budgeted: 135_000, spent: 148_000 },
  { month: "Apr", budgeted: 180_000, spent: 196_000 },
  { month: "May", budgeted: 225_000, spent: 232_000 },
  { month: "Jun", budgeted: 270_000, spent: 258_000 },
  { month: "Jul", budgeted: 315_000, spent: 272_000 },
  { month: "Aug", budgeted: 360_000, spent: 272_000 },
  { month: "Sep", budgeted: 405_000, spent: 272_000 },
  { month: "Oct", budgeted: 450_000, spent: 272_000 },
  { month: "Nov", budgeted: 495_000, spent: 272_000 },
  { month: "Dec", budgeted: 540_000, spent: 272_000 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

/** EUR formatter for allocated budget overview cards */
export function formatBudgetEur(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Returns budgeted and spent totals for the selected timeframe */
export function getTimeframeMetrics(
  lines: BudgetLine[],
  tab: TimeframeTab
): TimeframeMetrics {
  let budgeted = 0;
  let spent = 0;

  for (const line of lines) {
    const qb = line.quarterlyBudget;
    const qs = line.quarterlySpent;

    switch (tab) {
      case "Q1":       budgeted += qb[0]; spent += qs[0]; break;
      case "Q2":       budgeted += qb[1]; spent += qs[1]; break;
      case "Q3":       budgeted += qb[2]; spent += qs[2]; break;
      case "Q4":       budgeted += qb[3]; spent += qs[3]; break;
      case "H1":       budgeted += qb[0] + qb[1]; spent += qs[0] + qs[1]; break;
      case "Full Year":
        budgeted += line.annualBudget;
        spent    += qs[0] + qs[1] + qs[2] + qs[3];
        break;
    }
  }

  const remaining = Math.max(0, budgeted - spent);
  const pct = budgeted > 0 ? Math.min(100, Math.round((spent / budgeted) * 100)) : 0;
  return { budgeted, spent, remaining, pct };
}

/** Returns per-line budgeted/spent for the selected timeframe — used by charts */
export function getLinesForTimeframe(lines: BudgetLine[], tab: TimeframeTab) {
  return lines.map((line) => {
    const qb = line.quarterlyBudget;
    const qs = line.quarterlySpent;
    let budgeted: number;
    let spent: number;

    switch (tab) {
      case "Q1":       budgeted = qb[0]; spent = qs[0]; break;
      case "Q2":       budgeted = qb[1]; spent = qs[1]; break;
      case "Q3":       budgeted = qb[2]; spent = qs[2]; break;
      case "Q4":       budgeted = qb[3]; spent = qs[3]; break;
      case "H1":       budgeted = qb[0] + qb[1]; spent = qs[0] + qs[1]; break;
      case "Full Year":
        budgeted = line.annualBudget;
        spent    = qs[0] + qs[1] + qs[2] + qs[3];
        break;
    }

    const label = line.subCategory
      ? `${line.category} — ${line.subCategory}`
      : line.category;

    return { ...line, label, budgeted, spent, remaining: Math.max(0, budgeted - spent) };
  });
}

/** Determine current quarter from an ISO date string (or today) */
export function dateToQuarterIndex(dateStr?: string | null): number {
  const d = dateStr ? new Date(dateStr) : new Date();
  const month = d.getMonth(); // 0-indexed
  if (month < 3)  return 0; // Q1
  if (month < 6)  return 1; // Q2
  if (month < 9)  return 2; // Q3
  return 3;                  // Q4
}

/** Sum of all line annual budgets — default FY ceiling */
export const DEFAULT_ANNUAL_BUDGET_TOTAL = INITIAL_BUDGET_LINES.reduce(
  (sum, line) => sum + line.annualBudget,
  0
);

/** Deep-clone budget lines (preserves current spend in session) */
export function cloneBudgetLines(lines: BudgetLine[]): BudgetLine[] {
  return lines.map((line) => ({
    ...line,
    quarterlyBudget: [...line.quarterlyBudget] as [number, number, number, number],
    quarterlySpent: [...line.quarterlySpent] as [number, number, number, number],
  }));
}

/** Scale every budget allocation to a new annual ceiling (spent unchanged) */
export function scaleBudgetLinesToAnnualTotal(
  lines: BudgetLine[],
  newAnnualTotal: number
): BudgetLine[] {
  const currentTotal = lines.reduce((sum, line) => sum + line.annualBudget, 0);
  if (currentTotal <= 0) return lines;
  const factor = newAnnualTotal / currentTotal;
  return lines.map((line) => ({
    ...line,
    annualBudget: Math.round(line.annualBudget * factor),
    quarterlyBudget: line.quarterlyBudget.map((q) => Math.round(q * factor)) as [
      number,
      number,
      number,
      number,
    ],
  }));
}

/** Reset budget allocations to template while keeping session spend */
export function resetBudgetLinesToDefault(currentLines: BudgetLine[]): BudgetLine[] {
  const spentById = Object.fromEntries(
    currentLines.map((line) => [line.id, line.quarterlySpent])
  );
  return INITIAL_BUDGET_LINES.map((line) => ({
    ...line,
    quarterlyBudget: [...line.quarterlyBudget] as [number, number, number, number],
    quarterlySpent: spentById[line.id]
      ? ([...spentById[line.id]] as [number, number, number, number])
      : ([...line.quarterlySpent] as [number, number, number, number]),
  }));
}

/** Scale monthly budgeted curve to match a new annual ceiling */
export function scaleMonthlyBudgetData(
  data: MonthlyDataPoint[],
  factor: number
): MonthlyDataPoint[] {
  return data.map((point) => ({
    ...point,
    budgeted: Math.round(point.budgeted * factor),
  }));
}
