export const DELTA_BUSINESS_UNITS = [
  "ICTBG",
  "BABG",
  "EIBG",
  "IABG",
  "PSBG",
  "EVS",
  "CPBG",
  "FMBG",
  "BMBU",
] as const;

export type DeltaBusinessUnit = (typeof DELTA_BUSINESS_UNITS)[number];

export const DEFAULT_DELTA_BUSINESS_UNIT: DeltaBusinessUnit = "EVS";

export function resolveBusinessUnit(value?: string | null): string {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (DELTA_BUSINESS_UNITS.includes(normalized as DeltaBusinessUnit)) {
    return normalized;
  }
  return DEFAULT_DELTA_BUSINESS_UNIT;
}
