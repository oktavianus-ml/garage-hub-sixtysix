export const MAX_PARTNERS = 10;

export type ProfitPartner = { id: string; name: string; percent: number };
export type ProfitShare = ProfitPartner & { amount: number };

type SplitRecord = {
  partners?: unknown;
  shares?: unknown;
  ownerPercent?: unknown;
  investorPercent?: unknown;
  ownerShare?: unknown;
  investorShare?: unknown;
};

export function labeledPartners<T extends { name: string }>(rows: T[]) {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const name = row.name.trim() || "Tanpa nama";
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return { label: count === 1 ? name : `${name} ${count}`, row };
  });
}

export function splitError(partners: ProfitPartner[], allowedIds?: ReadonlySet<string>) {
  if (partners.length < 1) return "Tambah minimal satu orang.";
  if (partners.length > MAX_PARTNERS) return "Maksimal 10 orang.";
  const ids = new Set<string>();
  for (const partner of partners) {
    const id = partner.id.trim();
    if (!id || (allowedIds && !allowedIds.has(id))) return "Pilih orang dari daftar pegawai.";
    if (ids.has(id)) return "Orang ini sudah dipilih.";
    ids.add(id);
    if (!partner.name.trim()) return "Isi nama tiap orang.";
    if (!Number.isInteger(partner.percent) || partner.percent < 0 || partner.percent > 100) {
      return "Persen tiap orang harus bilangan 0 sampai 100.";
    }
  }
  const total = partners.reduce((sum, partner) => sum + partner.percent, 0);
  if (total !== 100) return "Total persentase harus 100.";
  return null;
}

export function allocateShares(profit: number, partners: ProfitPartner[]): ProfitShare[] {
  const amounts = partners.map((partner) => Math.round((profit * partner.percent) / 100));
  const total = partners.reduce((sum, partner) => sum + partner.percent, 0);
  if (total === 100 && partners.length > 0) {
    const drift = profit - amounts.reduce((sum, amount) => sum + amount, 0);
    if (drift !== 0) {
      let index = 0;
      for (let i = 1; i < partners.length; i += 1) {
        if (partners[i].percent >= partners[index].percent) index = i;
      }
      amounts[index] += drift;
    }
  }
  return partners.map((partner, index) => ({
    id: partner.id,
    name: partner.name,
    percent: partner.percent,
    amount: amounts[index] ?? 0,
  }));
}

function whole(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(number);
}

function parsePartners(value: unknown): ProfitPartner[] {
  if (!Array.isArray(value)) return [];
  const partners: ProfitPartner[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; name?: unknown; percent?: unknown };
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const percent = whole(row.percent, Number.NaN);
    if (!id || !name || !Number.isInteger(percent) || percent < 0 || percent > 100) continue;
    partners.push({ id, name, percent });
  }
  return partners;
}

function parseShares(value: unknown): ProfitShare[] {
  if (!Array.isArray(value)) return [];
  const shares: ProfitShare[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; name?: unknown; percent?: unknown; amount?: unknown };
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const percent = whole(row.percent, Number.NaN);
    const amount = typeof row.amount === "number" && Number.isFinite(row.amount) ? Math.round(row.amount) : Number.NaN;
    if (!id || !name || !Number.isInteger(percent) || percent < 0 || percent > 100 || !Number.isInteger(amount)) {
      continue;
    }
    shares.push({ id, name, percent, amount });
  }
  return shares;
}

export function partnersFromRecord(data: SplitRecord | undefined): ProfitPartner[] {
  const partners = parsePartners(data?.partners);
  if (partners.length > 0) return partners;
  return [
    { id: "owner", name: "Pemilik", percent: whole(data?.ownerPercent, 50) },
    { id: "investor", name: "Investor", percent: whole(data?.investorPercent, 50) },
  ];
}

export function sharesFromClose(data: SplitRecord | undefined): ProfitShare[] {
  const shares = parseShares(data?.shares);
  if (shares.length > 0) return shares;
  return [
    {
      id: "owner",
      name: "Pemilik",
      percent: whole(data?.ownerPercent, 50),
      amount: whole(data?.ownerShare, 0),
    },
    {
      id: "investor",
      name: "Investor",
      percent: whole(data?.investorPercent, 50),
      amount: whole(data?.investorShare, 0),
    },
  ];
}
