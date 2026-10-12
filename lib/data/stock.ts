export type HeldPart = { productId: string; qty: number };

export function heldQty(parts: HeldPart[], status: string) {
  const map = new Map<string, number>();
  if (status === "batal") return map;
  for (const part of parts) {
    map.set(part.productId, (map.get(part.productId) ?? 0) + part.qty);
  }
  return map;
}

export function holdDelta(before: Map<string, number>, after: Map<string, number>) {
  const delta = new Map<string, number>();
  const ids = new Set([...before.keys(), ...after.keys()]);
  for (const id of ids) {
    const change = (after.get(id) ?? 0) - (before.get(id) ?? 0);
    if (change !== 0) delta.set(id, change);
  }
  return delta;
}
