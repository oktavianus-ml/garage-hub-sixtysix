export const SUPPLY_UNITS = [
  "pcs",
  "box",
  "set",
  "liter",
  "botol",
  "kaleng",
  "tube",
  "pasang",
  "roll",
  "meter",
  "rim",
  "pak",
] as const;

export type SupplyUnit = (typeof SUPPLY_UNITS)[number];

export function isSupplyUnit(value: string): value is SupplyUnit {
  return (SUPPLY_UNITS as readonly string[]).includes(value);
}
