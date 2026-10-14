import { jakartaDate } from "@/lib/data/format";
import type { SalesReport } from "@/lib/data/sales-report";
import type { WorkshopBrand } from "@/lib/data/settings";

type Cell =
  | { kind: "text"; value: string; bold?: boolean }
  | { kind: "number"; value: number; bold?: boolean }
  | null;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let crc = n;
    for (let k = 0; k < 8; k += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    table[n] = crc >>> 0;
  }
  return table;
})();

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: Buffer }[]) {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    parts.push(local, file.data);

    const entry = Buffer.alloc(46 + name.length);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0, 8);
    entry.writeUInt16LE(0, 10);
    entry.writeUInt16LE(0, 12);
    entry.writeUInt16LE(0, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(file.data.length, 20);
    entry.writeUInt32LE(file.data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    entry.writeUInt32LE(0, 38);
    entry.writeUInt32LE(offset, 42);
    name.copy(entry, 46);
    central.push(entry);
    offset += local.length + file.data.length;
  }

  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...parts, directory, end]);
}

function xml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index: number) {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function worksheetXml(rows: Cell[][], options?: { widths?: number[]; freezeHeader?: boolean; filter?: boolean }) {
  const lastRow = Math.max(rows.length, 1);
  const lastCol = Math.max(1, ...rows.map((row) => row.length));
  const cols = (options?.widths ?? [])
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");
  const body = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, colIndex) => {
          if (!cell) return "";
          const ref = `${columnName(colIndex)}${rowIndex + 1}`;
          if (cell.kind === "number" && Number.isFinite(cell.value)) {
            const style = cell.bold ? 3 : 2;
            return `<c r="${ref}" s="${style}"><v>${Math.round(cell.value)}</v></c>`;
          }
          const style = cell.kind === "text" && cell.bold ? ` s="1"` : "";
          const value = cell.kind === "text" ? cell.value : "";
          const space = value.startsWith(" ") || value.endsWith(" ") ? ` xml:space="preserve"` : "";
          return `<c r="${ref}" t="inlineStr"${style}><is><t${space}>${xml(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  const filter =
    options?.filter && rows.length > 1
      ? `<autoFilter ref="A1:${columnName(lastCol - 1)}${rows.length}"/>`
      : "";
  const freeze = options?.freezeHeader
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${columnName(lastCol - 1)}${lastRow}"/>
${freeze}
<cols>${cols}</cols>
<sheetData>${body}</sheetData>
${filter}
</worksheet>`;
}

function text(value: string, bold = false): Cell {
  return { kind: "text", value, bold };
}

function money(value: number, bold = false): Cell {
  return { kind: "number", value, bold };
}

function workbookXml(sheets: { name: string; rows: Cell[][]; widths?: number[]; freezeHeader?: boolean; filter?: boolean }[]) {
  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets
  .map(
    (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  )
  .join("\n")}
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheets
  .map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
  .join("\n")}
</sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets
  .map(
    (_, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  )
  .join("\n")}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="2">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
</cellXfs>
</styleSheet>`,
    },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: worksheetXml(sheet.rows, sheet),
    })),
  ];

  return zipStore(files.map((file) => ({ name: file.name, data: Buffer.from(file.data, "utf8") })));
}

export function salesWorkbook(
  report: SalesReport,
  brand: WorkshopBrand = { name: "GarageHub", address: "", phone: "" },
) {
  const printed = jakartaDate();
  const summary: Cell[][] = [
    [text("Laporan penjualan", true)],
    [text("Bengkel", true), text(brand.name)],
    ...(brand.address ? [[text("Alamat", true), text(brand.address)]] : []),
    ...(brand.phone ? [[text("Telepon", true), text(brand.phone)]] : []),
    [text("Periode", true), text(report.period.label)],
    [text("Diunduh", true), text(printed)],
    [],
    [text("Transaksi", true), money(report.count)],
    [text("Omzet", true), money(report.total)],
    [text("Harga pokok", true), money(report.cost)],
    [text("Laba kotor", true), money(report.profit)],
    [text("Sparepart", true), money(report.parts)],
    [],
    [text("Tempat uang", true), text("Jumlah", true)],
    ...report.channels.map((channel) => [text(channel.label), money(channel.amount)]),
    [],
    [text("Asal penjualan", true), text("Jumlah transaksi", true), text("Omzet", true)],
    ...report.sources.map((source) => [text(source.label), money(source.count), money(source.amount)]),
    [],
    [text("Laba kotor adalah omzet dikurangi harga pokok sparepart. Pengeluaran kas tidak masuk laporan ini.")],
    [],
    [text("Pembagian keuntungan", true), text("Peran", true), text("Persen", true), text("Jumlah", true)],
    ...(report.shares.length === 0
      ? [[text("Persentase bagi hasil belum diatur.")]]
      : report.shares.map((share) => [
          text(share.name),
          text(share.role || "-"),
          text(`${share.percent}%`),
          money(share.amount),
        ])),
    [text("Bagian tiap orang dihitung dari laba kotor memakai persentase bagi hasil.")],
  ];

  const detail: Cell[][] = [
    [
      text("Tanggal", true),
      text("Nomor", true),
      text("Sumber", true),
      text("Pelanggan", true),
      text("Keterangan", true),
      text("Jasa", true),
      text("Sparepart", true),
      text("Total", true),
      text("Harga pokok", true),
      text("Laba kotor", true),
      text("Tempat uang", true),
    ],
    ...report.sales.map((sale) => [
      text(sale.date),
      text(sale.no),
      text(sale.source),
      text(sale.customer),
      text(sale.detail),
      money(sale.labor),
      money(sale.parts),
      money(sale.total),
      money(sale.cost),
      money(sale.profit),
      text(sale.payLabel),
    ]),
  ];
  if (report.sales.length === 0) detail.push([text("Belum ada penjualan pada periode ini.")]);

  return workbookXml([
    { name: "Ringkasan", rows: summary, widths: [28, 48, 14, 16] },
    {
      name: "Penjualan",
      rows: detail,
      widths: [14, 14, 12, 24, 36, 14, 14, 14, 14, 14, 18],
      freezeHeader: true,
      filter: report.sales.length > 0,
    },
  ]);
}
