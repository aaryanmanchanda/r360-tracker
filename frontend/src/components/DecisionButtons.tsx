import { useState } from "react";
import { api } from "../api/client";
import type { BudgetDetail } from "../api/types";
import { useApiMutation } from "../api/useApiMutation";
import { FormError } from "./FormError";

//approver only: approve straight away, reject asks for the reason first
export function DecisionButtons({ budgetId }: { budgetId: number }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const decide = useApiMutation(
    (action: "approve" | "reject") =>
      api<BudgetDetail>(`/budgets/${budgetId}/${action}`, {
        method: "POST",
        body: action === "reject" ? { reason } : undefined,
      }),
    {
      success: (b) =>
        b.status === "APPROVED"
          ? `"${b.title}" approved. The requester can now raise POs.`
          : `"${b.title}" rejected. The requester will see your reason.`,
    },
  );

  if (!rejecting)
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button className="btn-ok" disabled={decide.isPending} onClick={() => decide.mutate("approve")}>
            Approve
          </button>
          <button className="btn-danger" onClick={() => setRejecting(true)}>
            Reject
          </button>
        </div>
        <FormError error={decide.error} />
      </div>
    );

  return (
    <div className="space-y-2">
      <input
        className="input"
        placeholder="Reason for rejection"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <button className="btn-danger" disabled={decide.isPending} onClick={() => decide.mutate("reject")}>
          Confirm reject
        </button>
        <button className="btn-ghost" onClick={() => setRejecting(false)}>
          Cancel
        </button>
      </div>
      <FormError error={decide.error} />
    </div>
  );
}
