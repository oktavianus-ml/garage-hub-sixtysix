export type BudgetKey = "pembelian" | "pengadaan" | "kas";

export type BudgetAmounts = Record<BudgetKey, number>;

export type BudgetLine = {
  key: BudgetKey;
  label: string;
  hint: string;
  plan: number;
  actual: number;
  previous: number;
};

export type BudgetOutflow = {
  id: string;
  at: string;
  when: string;
  label: string;
  title: string;
  detail: string;
  amount: number;
  href: string;
};

export type BudgetAudit = {
  month: string;
  monthLabel: string;
  closed: boolean;
  saved: boolean;
  note: string;
  lines: BudgetLine[];
  planTotal: number;
  actualTotal: number;
  outflows: BudgetOutflow[];
};
