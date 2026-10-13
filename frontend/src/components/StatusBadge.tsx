import type { BudgetStatus } from "../api/types";

const styles = {
  PENDING: "bg-amber-100 text-amber-800 ring-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  REJECTED: "bg-rose-100 text-rose-800 ring-rose-300",
  ACK_PENDING: "bg-amber-100 text-amber-800 ring-amber-300",
  ACK_DONE: "bg-emerald-100 text-emerald-800 ring-emerald-300",
};

function Pill({ tone, children }: { tone: keyof typeof styles; children: React.ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${styles[tone]}`}>{children}</span>;
}

export function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase(); //PENDING -> Pending
  return <Pill tone={status}>{label}</Pill>;
}

export function VoucherStatusBadge({ vrnNumber }: { vrnNumber: string | null }) {
  if (!vrnNumber) return <Pill tone="ACK_PENDING">Pending acknowledgement</Pill>;
  return <Pill tone="ACK_DONE">{vrnNumber} ✓</Pill>;
}
