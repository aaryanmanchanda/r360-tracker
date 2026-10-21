import type { BudgetDetail, PurchaseOrderDetail } from "../api/types";

export type StepState = "done" | "current" | "todo" | "failed";
export interface Step {
  label: string;
  state: StepState;
}
export interface Progress {
  steps: Step[];
  next: string; //one plain sentence on what has to happen now, and who does it
}

//first step that isn't done becomes "current", the rest stay "todo"
function mark(items: { label: string; done: boolean }[]): Step[] {
  let currentSet = false;
  return items.map(({ label, done }) => {
    if (done) return { label, state: "done" };
    if (currentSet) return { label, state: "todo" };
    currentSet = true;
    return { label, state: "current" };
  });
}

export function budgetProgress(b: BudgetDetail): Progress {
  if (b.status === "REJECTED")
    return {
      steps: [
        { label: "Requested", state: "done" },
        { label: "Rejected", state: "failed" },
      ],
      next: "This request was rejected, so nothing more can happen on it. Raise a new request if it's still needed.",
    };

  const hasPo = b.purchase_orders.length > 0;
  const hasVoucher = b.purchase_orders.some((po) => Number(po.voucher_total) > 0);
  const steps = mark([
    { label: "Requested", done: true },
    { label: "Approved", done: b.status === "APPROVED" },
    { label: "PO raised", done: hasPo },
    { label: "Voucher received", done: hasVoucher },
  ]);

  let next = "Waiting for an Approver to approve or reject this request.";
  if (b.status === "APPROVED")
    next = "Approved. A Requester can now raise purchase orders against the remaining balance.";
  if (hasPo) next = "Open a PO below to record the vouchers the vendor delivers.";
  if (hasVoucher) next = "Vouchers are coming in. An Approver issues a VRN for each one on its PO page.";
  return { steps, next };
}

export function poProgress(po: PurchaseOrderDetail): Progress {
  const hasVoucher = po.vouchers.length > 0;
  const allAcknowledged = hasVoucher && po.vouchers.every((v) => v.vrn);
  const steps = mark([
    { label: "Budget approved", done: true },
    { label: "PO raised", done: true },
    { label: "Voucher received", done: hasVoucher },
    { label: "VRN issued", done: allAcknowledged },
  ]);

  let next = "Waiting for the vendor's first voucher. A Requester records it below once it arrives.";
  if (hasVoucher) next = "An Approver needs to issue a VRN for each voucher still marked pending.";
  if (allAcknowledged) next = "Every voucher so far has its VRN. Record more if the vendor delivers more.";
  return { steps, next };
}
