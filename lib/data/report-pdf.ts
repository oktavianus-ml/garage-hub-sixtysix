import { jakartaDate } from "@/lib/data/format";
import { formatDay, rupiahPlain, type SaleLine, type SalesReport } from "@/lib/data/sales-report";
import type { WorkshopBrand } from "@/lib/data/settings";

const PAGE_W = 841.89;
const PAGE_H = 595.28;
const LEFT = 32;
const RIGHT = PAGE_W - 32;
const BOTTOM = 48;

const INK: [number, number, number] = [0.11, 0.1, 0.08];
const MUTED: [number, number, number] = [0.42, 0.4, 0.38];
const AMBER: [number, number, number] = [0.6, 0.4, 0.04];

const WIDTHS: Record<string, number> = {
  " ": 278,
  "!": 278,
  '"': 355,
  "#": 556,
  "$": 556,
  "%": 889,
  "&": 667,
  "'": 191,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  "0": 556,
  "1": 556,
  "2": 556,
  "3": 556,
  "4": 556,
  "5": 556,
  "6": 556,
  "7": 556,
  "8": 556,
  "9": 556,
  ":": 278,
  ";": 278,
  "?": 556,
  A: 667,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 500,
  K: 667,
  L: 556,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  a: 556,
  b: 556,
  c: 500,
  d: 556,
  e: 556,
  f: 278,
  g: 556,
  h: 556,
  i: 222,
  j: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  q: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 500,
};

const COLUMNS: { label: string; width: number; align: "left" | "right"; pick: (sale: SaleLine) => string }[] = [
  { label: "Tanggal", width: 72, align: "left", pick: (sale) => formatDay(sale.date) },
  { label: "Nomor", width: 70, align: "left", pick: (sale) => sale.no },
  { label: "Sumber", width: 48, align: "left", pick: (sale) => sale.source },
  { label: "Pelanggan", width: 100, align: "left", pick: (sale) => sale.customer },
  { label: "Keterangan", width: 187, align: "left", pick: (sale) => sale.detail || "-" },
  { label: "Jasa", width: 72, align: "right", pick: (sale) => rupiahPlain(sale.labor) },
  { label: "Sparepart", width: 78, align: "right", pick: (sale) => rupiahPlain(sale.parts) },
  { label: "Total", width: 78, align: "right", pick: (sale) => rupiahPlain(sale.total) },
  {
    label: "Uang",
    width: 72,
    align: "left",
    pick: (sale) =>
      sale.payLabel === "Rekening QRIS"
        ? "QRIS"
        : sale.payLabel === "Rekening bank"
          ? "Bank"
          : sale.payLabel === "Belum dicatat"
            ? "Belum"
            : sale.payLabel,
  },
];

function pdfSafe(value: string) {
  return value.replaceAll("×", "x").replaceAll("–", "-").replaceAll("—", "-").replaceAll("·", "-");
}

function escapePdf(value: string) {
  let out = "";
  for (const ch of pdfSafe(value)) {
    const code = ch.charCodeAt(0);
    if (ch === "\\" || ch === "(" || ch === ")") out += `\\${ch}`;
    else if (code >= 32 && code <= 126) out += ch;
    else out += "?";
  }
  return out;
}

function textWidth(value: string, size: number, bold: boolean) {
  let units = 0;
  for (const ch of pdfSafe(value)) units += WIDTHS[ch] ?? 560;
  return (units / 1000) * size * (bold ? 1.06 : 1);
}

function fit(value: string, size: number, maxWidth: number, bold = false) {
  const safe = pdfSafe(value);
  if (textWidth(safe, size, bold) <= maxWidth) return safe;
  let out = "";
  for (const ch of safe) {
    if (textWidth(`${out}${ch}...`, size, bold) > maxWidth) break;
    out += ch;
  }
  return `${out}...`;
}

type Draft = { commands: string[] };

function buildPdf(streams: string[]) {
  let body = "%PDF-1.4\n";
  const offsets = [0];
  const push = (object: string) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += object;
  };
  const kids = streams.map((_, index) => `${5 + index * 2} 0 R`).join(" ");
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  push(`2 0 obj\n<< /Type /Pages /Count ${streams.length} /Kids [${kids}] >>\nendobj\n`);
  push("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");
  push(
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
  );
  streams.forEach((content, index) => {
    const pageId = 5 + index * 2;
    const length = Buffer.byteLength(content, "latin1");
    push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>\nendobj\n`,
    );
    push(`${pageId + 1} 0 obj\n<< /Length ${length} >>\nstream\n${content}\nendstream\nendobj\n`);
  });
  const startxref = Buffer.byteLength(body, "latin1");
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  body += xref;
  body += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return Buffer.from(body, "latin1");
}

export function salesPdf(
  report: SalesReport,
  brand: WorkshopBrand = { name: "GarageHub", address: "", phone: "" },
) {
  const contact = [brand.address, brand.phone].filter(Boolean).join(" · ");
  const printed = formatDay(jakartaDate());
  const pages: Draft[] = [];
  let page: Draft = { commands: [] };
  let y = 0;

  function use(commands: string) {
    page.commands.push(commands);
  }

  function text(
    x: number,
    baseline: number,
    value: string,
    options?: { size?: number; bold?: boolean; color?: [number, number, number]; align?: "left" | "right"; right?: number; maxWidth?: number },
  ) {
    const size = options?.size ?? 9;
    const bold = options?.bold ?? false;
    const shown = options?.maxWidth ? fit(value, size, options.maxWidth, bold) : pdfSafe(value);
    const [r, g, b] = options?.color ?? INK;
    const drawX =
      options?.align === "right" && options.right !== undefined ? options.right - textWidth(shown, size, bold) : x;
    const font = bold ? "F2" : "F1";
    use(
      `${r} ${g} ${b} rg BT /${font} ${size} Tf 1 0 0 1 ${drawX.toFixed(2)} ${baseline.toFixed(2)} Tm (${escapePdf(shown)}) Tj ET`,
    );
  }

  function rule(baseline: number) {
    use(`0.75 0.72 0.68 RG 0.6 w ${LEFT.toFixed(2)} ${baseline.toFixed(2)} m ${RIGHT.toFixed(2)} ${baseline.toFixed(2)} l S`);
  }

  function tableHeader() {
    const bottom = y - 4;
    use(`0.96 0.93 0.88 rg ${LEFT} ${bottom.toFixed(2)} ${(RIGHT - LEFT).toFixed(2)} 16 re f`);
    let x = LEFT;
    for (const column of COLUMNS) {
      const pad = 4;
      if (column.align === "right") {
        text(0, y, column.label, { size: 8, bold: true, align: "right", right: x + column.width - pad });
      } else {
        text(x + pad, y, column.label, { size: 8, bold: true, maxWidth: column.width - pad * 2 });
      }
      x += column.width;
    }
    y -= 18;
  }

  function startPage(continued: boolean) {
    page = { commands: [] };
    pages.push(page);
    y = PAGE_H - 36;
    if (!continued) return;
    text(LEFT, y, brand.name, { size: 11, bold: true, color: AMBER, maxWidth: 280 });
    text(RIGHT - 220, y, "Laporan penjualan", { size: 11, bold: true, align: "right", right: RIGHT });
    y -= 8;
    rule(y);
    y -= 18;
    tableHeader();
  }

  function need(height: number) {
    if (y - height < BOTTOM) startPage(true);
  }

  function pair(label: string, value: string, maxWidth?: number) {
    text(LEFT, y, label, { size: 9, color: MUTED, maxWidth });
    text(0, y, value, { size: 9, bold: true, align: "right", right: LEFT + 250 });
    y -= 14;
  }

  startPage(false);
  text(LEFT, y, brand.name, { size: 16, bold: true, color: AMBER, maxWidth: RIGHT - LEFT });
  y -= 18;
  if (contact) {
    text(LEFT, y, contact, { size: 9, color: MUTED, maxWidth: RIGHT - LEFT });
    y -= 14;
  }
  text(LEFT, y, "Laporan penjualan", { size: 12, bold: true });
  y -= 15;
  text(LEFT, y, report.period.label, { size: 10, color: MUTED });
  y -= 8;
  rule(y);
  y -= 18;
  pair("Transaksi", String(report.count));
  pair("Omzet", rupiahPlain(report.total));
  pair("Harga pokok", rupiahPlain(report.cost));
  pair("Laba kotor", rupiahPlain(report.profit));
  pair("Sparepart", rupiahPlain(report.parts));
  y -= 4;
  text(LEFT, y, "Tempat uang", { size: 10, bold: true });
  y -= 15;
  for (const channel of report.channels) pair(channel.label, rupiahPlain(channel.amount));
  y -= 4;
  text(LEFT, y, "Asal penjualan", { size: 10, bold: true });
  y -= 15;
  for (const source of report.sources) {
    pair(source.label, `${source.count} penjualan, ${rupiahPlain(source.amount)}`);
  }
  y -= 4;
  text(LEFT, y, "Laba kotor = omzet dikurangi harga pokok sparepart. Pengeluaran kas tidak termasuk.", {
    size: 8,
    color: MUTED,
    maxWidth: RIGHT - LEFT,
  });
  y -= 18;
  text(LEFT, y, "Pembagian keuntungan", { size: 10, bold: true });
  y -= 15;
  if (report.shares.length === 0) {
    text(LEFT, y, "Persentase bagi hasil belum diatur.", { size: 9, color: MUTED });
    y -= 14;
  } else {
    for (const share of report.shares) {
      const who = share.role ? `${share.name} · ${share.role}` : share.name;
      pair(`${who} ${share.percent}%`, rupiahPlain(share.amount), 168);
    }
  }
  text(LEFT, y, "Bagian tiap orang dihitung dari laba kotor memakai persentase bagi hasil.", {
    size: 8,
    color: MUTED,
    maxWidth: RIGHT - LEFT,
  });
  y -= 16;
  rule(y);
  y -= 18;

  if (report.sales.length === 0) {
    text(LEFT, y, "Belum ada penjualan pada periode ini.", { size: 10, color: MUTED });
  } else {
    tableHeader();
    report.sales.forEach((sale, index) => {
      need(16);
      const baseline = y;
      if (index % 2 === 1) {
        use(`0.98 0.97 0.95 rg ${LEFT} ${(baseline - 4).toFixed(2)} ${(RIGHT - LEFT).toFixed(2)} 15 re f`);
      }
      let x = LEFT;
      for (const column of COLUMNS) {
        const pad = 4;
        const value = column.pick(sale);
        if (column.align === "right") {
          text(0, baseline, value, {
            size: 8,
            align: "right",
            right: x + column.width - pad,
            maxWidth: column.width - pad * 2,
          });
        } else {
          text(x + pad, baseline, value, { size: 8, maxWidth: column.width - pad * 2 });
        }
        x += column.width;
      }
      y -= 16;
    });
    need(18);
    rule(y + 10);
    text(LEFT, y, "Total", { size: 8, bold: true });
    let x = LEFT;
    for (const column of COLUMNS) {
      const pad = 4;
      const value =
        column.label === "Jasa"
          ? rupiahPlain(report.labor)
          : column.label === "Sparepart"
            ? rupiahPlain(report.parts)
            : column.label === "Total"
              ? rupiahPlain(report.total)
              : "";
      if (value) {
        text(0, y, value, { size: 8, bold: true, align: "right", right: x + column.width - pad });
      }
      x += column.width;
    }
  }

  pages.forEach((draft, index) => {
    const footer = `0.42 0.40 0.38 rg BT /F1 8 Tf 1 0 0 1 ${LEFT} 22 Tm (${escapePdf(`Halaman ${index + 1} dari ${pages.length}`)}) Tj ET`;
    const stamp = `0.42 0.40 0.38 rg BT /F1 8 Tf 1 0 0 1 ${RIGHT - textWidth(`Dicetak ${printed}`, 8, false)} 22 Tm (${escapePdf(`Dicetak ${printed}`)}) Tj ET`;
    const line = `0.75 0.72 0.68 RG 0.6 w ${LEFT} 34 m ${RIGHT} 34 l S`;
    draft.commands.push(line, footer, stamp);
  });

  return buildPdf(pages.map((draft) => draft.commands.join("\n")));
}
