import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { BudgetDetail as BudgetDetailType } from "../api/types";
import { BalanceBar } from "../components/BalanceBar";
import { FormError } from "../components/FormError";
import { Money } from "../components/Money";
import { RoleGate } from "../components/RoleGate";
import { StatTile } from "../components/StatTile";
import { BudgetStatusBadge } from "../components/StatusBadge";

function RaisePoForm({ budget }: { budget: BudgetDetailType }) {
  const queryClient = useQueryClient();
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");

  const raise = useMutation({
    mutationFn: () => api("/purchase-orders", { method: "POST", body: { budget_id: budget.id, vendor_name: vendor, amount } }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setVendor("");
      setAmount("");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    raise.mutate();
  }

  //the form only unlocks on an approved budget, otherwise say why (the backend enforces it either way)
  if (budget.status !== "APPROVED")
    return (
      <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
        POs can only be raised on an approved budget. This one is {budget.status.toLowerCase()}.
      </p>
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="vendor">
            Vendor name
          </label>
          <input id="vendor" className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="po-amount">
            Amount (₹) · up to <Money value={budget.remaining} />
          </label>
          <input id="po-amount" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <FormError error={raise.error} />
      <button className="btn-primary" disabled={raise.isPending}>
        Raise PO
      </button>
    </form>
  );
}

export function BudgetDetail() {
  const { id } = useParams();
  const { data: budget, error, isLoading } = useQuery({
    queryKey: ["budget", id],
    queryFn: () => api<BudgetDetailType>(`/budgets/${id}`),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error || !budget) return <FormError error={error} />;

  const approved = budget.status === "APPROVED";

  return (
    <>
      <div>
        <Link to="/" className="text-sm text-indigo-600 hover:underline">
          ← All budgets
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold">{budget.title}</h1>
          <BudgetStatusBadge status={budget.status} />
        </div>
        <p className="mt-1 text-sm text-slate-600">{budget.purpose}</p>
        <p className="mt-1 text-xs text-slate-500">
          Requested by {budget.created_by}
          {budget.decided_by && ` · ${budget.status.toLowerCase()} by ${budget.decided_by}`}
        </p>
      </div>

      {budget.status === "REJECTED" && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          Rejected: {budget.rejection_reason}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={approved ? "Approved amount" : "Requested amount"} value={budget.amount} />
        <StatTile label="PO total" value={budget.po_total} />
        <StatTile label="Remaining balance" value={approved ? budget.remaining : null} emphasis />
      </div>
      {approved && <BalanceBar used={budget.po_total} total={budget.amount} usedLabel="ordered" />}

      <RoleGate role="REQUESTER">
        <div className="card space-y-4">
          <h2 className="font-semibold">Raise a purchase order</h2>
          <RaisePoForm budget={budget} />
        </div>
      </RoleGate>

      <div className="card overflow-x-auto p-0">
        <h2 className="p-5 pb-3 font-semibold">Purchase orders</h2>
        {budget.purchase_orders.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">No POs raised against this budget yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>PO number</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>Vouchers received</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {budget.purchase_orders.map((po) => (
                <tr key={po.id}>
                  <td>
                    <Link className="font-medium text-indigo-600 hover:underline" to={`/purchase-orders/${po.id}`}>
                      {po.po_number}
                    </Link>
                  </td>
                  <td>{po.vendor_name}</td>
                  <td>
                    <Money value={po.amount} />
                  </td>
                  <td>
                    <Money value={po.voucher_total} />
                  </td>
                  <td>
                    <Money value={po.remaining} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
