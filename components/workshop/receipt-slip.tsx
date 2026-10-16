"use client";

import { rupiah } from "@/lib/data/format";
import { payMethodLabel, type PayMethod } from "@/lib/data/payment";
import { receiptLogo, type PaperWidth, type ReceiptLogo } from "@/lib/data/receipt-options";
import type { SaleReceipt } from "@/lib/data/sale-receipt";
import type { WorkshopSettings } from "@/lib/data/settings";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export type ReceiptSlipData = {
  name: string;
  phone: string;
  address: string;
  footer: string;
  showPhone: boolean;
  showAddress: boolean;
  paper: PaperWidth;
  logo: ReceiptLogo;
  no: string;
  dateLabel: string;
  lines: { label: string; amount: number }[];
  payLabel: string;
};

export function receiptDateLabel(iso: string) {
  const [year, month, day] = iso.split("-");
  const name = SHORT_MONTHS[Number(month) - 1];
  if (!year || !name || !day) return iso;
  return `${Number(day)} ${name} ${year}`;
}

export function receiptSlipFromSale(
  settings: WorkshopSettings,
  sale: {
    no: string;
    businessDate: string;
    lines: { name: string; qty: number; price: number }[];
    payMethod: PayMethod | null;
  },
): ReceiptSlipData {
  return {
    name: settings.name,
    phone: settings.phone,
    address: settings.address,
    footer: settings.receiptFooter,
    showPhone: settings.showPhone,
    showAddress: settings.showAddress,
    paper: settings.paper,
    logo: settings.logo,
    no: sale.no,
    dateLabel: receiptDateLabel(sale.businessDate),
    lines: sale.lines.map((line) => ({
      label: line.qty > 1 ? `${line.name} × ${line.qty}` : line.name,
      amount: line.price * line.qty,
    })),
    payLabel: sale.payMethod ? payMethodLabel[sale.payMethod] : "Belum dicatat",
  };
}

export function receiptSlipFromSaved(settings: WorkshopSettings, sale: SaleReceipt) {
  return receiptSlipFromSale(settings, sale);
}

export function ReceiptSlip({ data }: { data: ReceiptSlipData }) {
  const title = data.name.trim() || "Nama bengkel";
  const mark = receiptLogo(data.logo);
  const total = data.lines.reduce((sum, line) => sum + line.amount, 0);
  const details = [
    data.showAddress ? data.address.trim() : "",
    data.showPhone ? data.phone.trim() : "",
  ].filter(Boolean);

  return (
    <div
      id="receipt-print"
      data-paper={data.paper}
      className="mx-auto w-full rounded-lg bg-[#fffdf8] px-4 py-5 text-[#1c1915] shadow-[0_8px_24px_rgba(28,25,21,0.12)]"
      style={{ maxWidth: data.paper === "80" ? 302 : 220 }}
    >
      <img
        src={mark.src}
        alt={mark.label}
        className="mx-auto mb-3 object-contain"
        style={{ width: data.paper === "80" ? 200 : 148, height: 46 }}
      />
      <p className="text-center text-sm font-bold tracking-wide uppercase">{title}</p>
      {details.map((line, index) => (
        <p
          key={`${index}-${line}`}
          className="mt-1 text-center text-[11px] leading-4 break-words whitespace-pre-line text-[#6b6560]"
        >
          {line}
        </p>
      ))}
      <div className="my-3 border-t border-dashed border-[#1c1915]/25" />
      <p className="text-[11px] font-semibold">{data.no}</p>
      <p className="text-[11px] text-[#6b6560]">{data.dateLabel}</p>
      <ul className="mt-3 flex flex-col gap-1">
        {data.lines.map((line, index) => (
          <li key={`${index}-${line.label}`} className="flex justify-between gap-3 text-[11px]">
            <span>{line.label}</span>
            <span className="tabular-nums">{rupiah(line.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="my-3 border-t border-dashed border-[#1c1915]/25" />
      <p className="flex justify-between gap-3 text-xs font-bold">
        <span>Total</span>
        <span className="tabular-nums">{rupiah(total)}</span>
      </p>
      <p className="mt-1 text-[11px] text-[#6b6560]">{data.payLabel}</p>
      {data.footer.trim() ? (
        <>
          <div className="my-3 border-t border-dashed border-[#1c1915]/25" />
          <p className="text-center text-[11px] leading-4 break-words whitespace-pre-line text-[#6b6560]">
            {data.footer.trim()}
          </p>
        </>
      ) : null}
    </div>
  );
}

const PAPER_COLUMNS: Record<PaperWidth, number> = { "58": 32, "80": 48 };

export function printsOnAndroid() {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

function receiptColumns(paper: PaperWidth) {
  return PAPER_COLUMNS[paper];
}

function wrapReceiptLine(text: string, width: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const lines: string[] = [];
  let rest = clean;
  while (rest.length > width) {
    let cut = rest.lastIndexOf(" ", width);
    if (cut <= 0) cut = width;
    lines.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) lines.push(rest);
  return lines;
}

function receiptBlock(text: string, width: number, align: "left" | "center") {
  const rows: string[] = [];
  for (const part of text.split(/\r?\n/)) {
    for (const line of wrapReceiptLine(part, width)) {
      if (align === "center" && line.length < width) {
        rows.push(`${" ".repeat(Math.floor((width - line.length) / 2))}${line}`);
      } else rows.push(line);
    }
  }
  return rows;
}

function receiptMoney(value: number) {
  const sign = value < 0 ? "-" : "";
  const digits = Math.abs(Math.round(value)).toString();
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function receiptRow(left: string, right: string, width: number) {
  const label = left.replaceAll("×", "x");
  if (label.length + right.length + 1 <= width) {
    return `${label}${" ".repeat(width - label.length - right.length)}${right}`;
  }
  const lines = wrapReceiptLine(label, width);
  const last = lines.pop() ?? "";
  if (last.length + right.length + 1 <= width) {
    lines.push(`${last}${" ".repeat(width - last.length - right.length)}${right}`);
  } else {
    if (last) lines.push(last);
    lines.push(right.length >= width ? right : right.padStart(width));
  }
  return lines.join("\n");
}

export function receiptPlainText(data: ReceiptSlipData) {
  const width = receiptColumns(data.paper);
  const rule = "-".repeat(width);
  const title = (data.name.trim() || "Nama bengkel").toLocaleUpperCase("id-ID");
  const details = [
    data.showAddress ? data.address.trim() : "",
    data.showPhone ? data.phone.trim() : "",
  ].filter(Boolean);
  const total = data.lines.reduce((sum, line) => sum + line.amount, 0);
  const rows = [
    ...receiptBlock(title, width, "center"),
    ...details.flatMap((line) => receiptBlock(line, width, "center")),
    rule,
    ...receiptBlock(data.no, width, "left"),
    ...receiptBlock(data.dateLabel, width, "left"),
    ...data.lines.map((line) => receiptRow(line.label, receiptMoney(line.amount), width)),
    rule,
    receiptRow("Total", receiptMoney(total), width),
    ...receiptBlock(data.payLabel, width, "left"),
  ];
  const footer = data.footer.trim();
  if (footer) rows.push("", ...receiptBlock(footer, width, "center"));
  return `${rows.join("\n")}\n\n\n`;
}

function openRawBt(text: string) {
  const encoded = encodeURI(text).replaceAll("#", "%23").replaceAll("?", "%3F").replaceAll("&", "%26");
  window.location.href = `intent:${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
}

export function printReceiptSlip(data: ReceiptSlipData) {
  if (printsOnAndroid()) {
    openRawBt(receiptPlainText(data));
    return;
  }
  printBrowserReceipt(data.paper);
}

function printBrowserReceipt(paper: PaperWidth) {
  const source = document.getElementById("receipt-print");
  if (!(source instanceof HTMLElement)) return;
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("img").forEach((image) => {
    const src = image.getAttribute("src");
    if (src) image.setAttribute("src", new URL(src, window.location.href).href);
  });
  const width = paper === "80" ? "72mm" : "48mm";
  const page = paper === "80" ? "80mm" : "58mm";
  const frame = document.createElement("iframe");
  frame.setAttribute("title", "Struk");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.right = "0";
  frame.style.bottom = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return;
  }
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')]
    .map((node) => {
      if (node instanceof HTMLLinkElement) {
        const href = new URL(node.href, window.location.href).href;
        return `<link rel="stylesheet" href="${href}" />`;
      }
      return node.outerHTML;
    })
    .join("");
  doc.open();
  doc.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Struk</title>
${styles}
<style>
  @page { size: ${page} auto; margin: 2mm; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; min-height: 0 !important; }
  body { width: ${width}; color: #1c1915; }
  #receipt-print {
    width: ${width} !important;
    max-width: ${width} !important;
    margin: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    background: #fff !important;
  }
</style>
</head>
<body>${clone.outerHTML}</body>
</html>`);
  doc.close();
  const images = [...doc.images];
  const ready = Promise.all(
    images.map(
      (image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.onload = () => resolve();
              image.onerror = () => resolve();
            }),
    ),
  );
  const start = () => {
    win.focus();
    win.print();
    win.addEventListener("afterprint", () => frame.remove(), { once: true });
  };
  if (images.every((image) => image.complete)) start();
  else void ready.then(start);
}
