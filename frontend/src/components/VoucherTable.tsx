import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Voucher } from "../api/types";
import { FormError } from "./FormError";
import { Money } from "./Money";
import { RoleGate } from "./RoleGate";
import { VoucherStatusBadge } from "./StatusBadge";

//approver only: opens an inline remarks box, then issues the VRN
function IssueVrn({ voucherId }: { voucherId: number }) {
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const queryClient = useQueryClient();

  const issue = useMutation({
    mutationFn: () => api(`/vouchers/${voucherId}/vrn`, { method: "POST", body: { remarks } }),
    onSuccess: () => queryClient.invalidateQueries(), //totals + status show up on several pages, refetch them all
  });

  if (!open)
    return (
      <button className="btn-ok" onClick={() => setOpen(true)}>
        Issue VRN
      </button>
    );

  return (
    <div className="flex flex-col gap-2">
      <input className="input" placeholder="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
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

export function VoucherTable({ vouchers, showPo }: { vouchers: Voucher[]; showPo: boolean }) {
  if (vouchers.length === 0) return <p className="text-sm text-slate-500">No vouchers here yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Coupon code</th>
            {showPo && <th>PO</th>}
            <th>Amount</th>
            <th>Received</th>
            <th>Status</th>
            <th>VRN details</th>
            <RoleGate role="APPROVER">
              <th></th>
            </RoleGate>
          </tr>
        </thead>
        <tbody>
          {vouchers.map((v) => (
            <tr key={v.id}>
              <td className="font-mono">{v.coupon_code}</td>
              {showPo && (
                <td>
                  <Link className="text-indigo-600 hover:underline" to={`/purchase-orders/${v.purchase_order_id}`}>
                    {v.po_number}
                  </Link>
                </td>
              )}
              <td>
                <Money value={v.amount} />
              </td>
              <td>{v.received_date}</td>
              <td>
                <VoucherStatusBadge vrnNumber={v.vrn?.vrn_number ?? null} />
              </td>
              <td className="text-xs text-slate-500">
                {v.vrn ? `by ${v.vrn.acknowledged_by}${v.vrn.remarks ? ` · ${v.vrn.remarks}` : ""}` : "—"}
              </td>
              <RoleGate role="APPROVER">
                <td className="w-56">{!v.vrn && <IssueVrn voucherId={v.id} />}</td>
              </RoleGate>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
