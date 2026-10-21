import { useState } from "react";
import { api } from "../api/client";
import type { Voucher } from "../api/types";
import { useApiMutation } from "../api/useApiMutation";
import { FormError } from "./FormError";

//approver only: opens an inline remarks box, then issues the VRN
export function IssueVrn({ voucherId }: { voucherId: number }) {
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState("");

  const issue = useApiMutation(
    () => api<Voucher>(`/vouchers/${voucherId}/vrn`, { method: "POST", body: { remarks } }),
    {
      success: (v) => `${v.vrn?.vrn_number} issued for voucher ${v.coupon_code}.`,
    },
  );

  if (!open)
    return (
      <button className="btn-ok" onClick={() => setOpen(true)}>
        Issue VRN
      </button>
    );

  return (
    <div className="flex flex-col gap-2">
      <input
        className="input"
        placeholder="Remarks (optional)"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
      />
      <div className="flex gap-2">
        <button className="btn-ok" disabled={issue.isPending} onClick={() => issue.mutate()}>
          Confirm VRN
        </button>
        <button className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <FormError error={issue.error} />
    </div>
  );
}
