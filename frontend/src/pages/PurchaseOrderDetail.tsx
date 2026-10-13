import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { PurchaseOrderDetail as PurchaseOrderDetailType } from "../api/types";
import { BalanceBar } from "../components/BalanceBar";
import { FormError } from "../components/FormError";
import { Money } from "../components/Money";
import { RoleGate } from "../components/RoleGate";
import { StatTile } from "../components/StatTile";
import { VoucherTable } from "../components/VoucherTable";

const today = () => new Date().toLocaleDateString("en-CA"); //en-CA prints YYYY-MM-DD in the user's own timezone

function RecordVoucherForm({ po }: { po: PurchaseOrderDetailType }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [received, setReceived] = useState(today());

  const record = useMutation({
    mutationFn: () =>
      api("/vouchers", {
        method: "POST",
        body: { purchase_order_id: po.id, coupon_code: code, amount, received_date: received },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setCode("");
      setAmount("");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    record.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="font-semibold">Record a voucher received</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="coupon">
            Coupon code
          </label>
          <input id="coupon" className="input font-mono" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="voucher-amount">
            Amount (₹) · up to <Money value={po.remaining} />
          </label>
          <input id="voucher-amount" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="received">
            Received date
          </label>
          <input id="received" type="date" className="input" value={received} onChange={(e) => setReceived(e.target.value)} />
        </div>
      </div>
      <FormError error={record.error} />
      <button className="btn-primary" disabled={record.isPending}>
        Record voucher
      </button>
    </form>
  );
}

export function PurchaseOrderDetail() {
  const { id } = useParams();
  const { data: po, error, isLoading } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => api<PurchaseOrderDetailType>(`/purchase-orders/${id}`),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
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
