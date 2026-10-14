export const PAPER_WIDTHS = ["58", "80"] as const;
export type PaperWidth = (typeof PAPER_WIDTHS)[number];

export const paperChoices: { id: PaperWidth; label: string; note: string }[] = [
  { id: "58", label: "58 mm", note: "Roll kecil, bawaan" },
  { id: "80", label: "80 mm", note: "Roll kasir besar" },
];

export function isPaperWidth(value: string): value is PaperWidth {
  return value === "58" || value === "80";
}

export function paperWidthLabel(value: PaperWidth) {
  return paperChoices.find((choice) => choice.id === value)?.label ?? "58 mm";
}

export const RECEIPT_LOGOS = [
  { id: "pelat", label: "Pelat lonjong", src: "/brand/sixtysix-pelat.png" },
  { id: "papan", label: "Papan", src: "/brand/sixtysix-papan.png" },
  { id: "segi", label: "Segi", src: "/brand/sixtysix-segi.png" },
  { id: "bendera", label: "Bendera", src: "/brand/sixtysix-bendera.png" },
  { id: "kapsul", label: "Sixtysix", src: "/brand/sixtysix-kapsul.png" },
] as const;

export type ReceiptLogo = (typeof RECEIPT_LOGOS)[number]["id"];
export const defaultReceiptLogo: ReceiptLogo = "kapsul";

export function isReceiptLogo(value: string): value is ReceiptLogo {
  return RECEIPT_LOGOS.some((logo) => logo.id === value);
}

export function receiptLogo(id: ReceiptLogo) {
  const logo = RECEIPT_LOGOS.find((item) => item.id === id);
  return logo ?? RECEIPT_LOGOS[RECEIPT_LOGOS.length - 1];
}

export function receiptLogoLabel(id: ReceiptLogo) {
  return receiptLogo(id).label;
}
