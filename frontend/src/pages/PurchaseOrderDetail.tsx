import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { PurchaseOrderDetail as PurchaseOrderDetailType } from "../api/types";
import { BalanceBar } from "../components/BalanceBar";
import { FormError } from "../components/FormError";
import { Loading } from "../components/Loading";
import { RecordVoucherForm } from "../components/RecordVoucherForm";
import { RoleGate } from "../components/RoleGate";
import { StatTile } from "../components/StatTile";
import { VoucherTable } from "../components/VoucherTable";

export function PurchaseOrderDetail() {
  const { id } = useParams();
  const {
    data: po,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => api<PurchaseOrderDetailType>(`/purchase-orders/${id}`),
  });

  if (isLoading) return <Loading />;
  if (error || !po) return <FormError error={error} />;

  return (
    <>
      <div>
        <Link to={`/budgets/${po.budget_id}`} className="text-sm text-indigo-600 hover:underline">
          ← {po.budget_title}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
          {po.po_number} <span className="font-normal text-slate-500">· {po.vendor_name}</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500">Raised by {po.created_by}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="PO amount" value={po.amount} />
        <StatTile label="Vouchers received" value={po.voucher_total} />
        <StatTile label="Remaining balance" value={po.remaining} emphasis />
      </div>
      <BalanceBar used={po.voucher_total} total={po.amount} usedLabel="received" />

      <RoleGate role="REQUESTER">
        <RecordVoucherForm po={po} />
      </RoleGate>

      <div className="card space-y-3">
        <h2 className="font-semibold">Vouchers</h2>
        <VoucherTable vouchers={po.vouchers} showPo={false} />
      </div>
    </>
  );
}
