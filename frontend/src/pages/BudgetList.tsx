import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Budget } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { FormError } from "../components/FormError";
import { Money } from "../components/Money";
import { RoleGate } from "../components/RoleGate";
import { BudgetStatusBadge } from "../components/StatusBadge";

function CreateBudgetForm() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");

  const create = useMutation({
    mutationFn: () => api("/budgets", { method: "POST", body: { title, purpose, amount } }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setTitle("");
      setPurpose("");
      setAmount("");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="font-semibold">New budget request</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="purpose">
            Purpose
          </label>
          <input id="purpose" className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="amount">
            Amount (₹)
          </label>
          <input id="amount" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <FormError error={create.error} />
      <button className="btn-primary" disabled={create.isPending}>
        Submit for approval
      </button>
    </form>
  );
}

//approver only: approve straight away, reject asks for the reason first
function DecisionButtons({ budget }: { budget: Budget }) {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const decide = useMutation({
    mutationFn: (action: "approve" | "reject") =>
      api(`/budgets/${budget.id}/${action}`, { method: "POST", body: action === "reject" ? { reason } : undefined }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

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
      <input className="input" placeholder="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
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

export function BudgetList() {
  const { user } = useAuth();
  const { data: budgets, error, isLoading } = useQuery({ queryKey: ["budgets"], queryFn: () => api<Budget[]>("/budgets") });

  return (
    <>
      <h1 className="text-xl font-semibold">Budget requests</h1>
      <RoleGate role="REQUESTER">
        <CreateBudgetForm />
      </RoleGate>

      <div className="card overflow-x-auto p-0">
        {isLoading && <p className="p-5 text-sm text-slate-500">Loading…</p>}
        <FormError error={error} />
        {budgets && budgets.length === 0 && <p className="p-5 text-sm text-slate-500">No budget requests yet.</p>}
        {budgets && budgets.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Requested by</th>
                <th>Amount</th>
                <th>PO total</th>
                <th>Remaining</th>
                <th>Status</th>
                <RoleGate role="APPROVER">
                  <th></th>
                </RoleGate>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link className="font-medium text-indigo-600 hover:underline" to={`/budgets/${b.id}`}>
                      {b.title}
                    </Link>
                  </td>
                  <td>{b.created_by}</td>
                  <td>
                    <Money value={b.amount} />
                  </td>
                  <td>
                    <Money value={b.po_total} />
                  </td>
                  <td>{b.status === "APPROVED" ? <Money value={b.remaining} /> : <span className="text-slate-400">—</span>}</td>
                  <td>
                    <BudgetStatusBadge status={b.status} />
                  </td>
                  <RoleGate role="APPROVER">
                    <td className="w-64">
                      {b.status === "PENDING" &&
                        (b.created_by_id === user?.id ? (
                          <span className="text-xs text-slate-400">Your own request</span> //can't decide your own, backend refuses too
                        ) : (
                          <DecisionButtons budget={b} />
                        ))}
                    </td>
                  </RoleGate>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
