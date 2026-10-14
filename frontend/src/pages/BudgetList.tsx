import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Budget } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { CreateBudgetForm } from "../components/CreateBudgetForm";
import { DecisionButtons } from "../components/DecisionButtons";
import { FormError } from "../components/FormError";
import { Loading } from "../components/Loading";
import { Money } from "../components/Money";
import { RoleGate } from "../components/RoleGate";
import { BudgetStatusBadge } from "../components/StatusBadge";

export function BudgetList() {
  const { user } = useAuth();
  const {
    data: budgets,
    error,
    isLoading,
  } = useQuery({ queryKey: ["budgets"], queryFn: () => api<Budget[]>("/budgets") });

  return (
    <>
      <h1 className="text-xl font-semibold">Budget requests</h1>
      <RoleGate role="REQUESTER">
        <CreateBudgetForm />
      </RoleGate>

      <div className="card overflow-x-auto p-0">
        {isLoading && <Loading />}
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
                  <td>
                    {b.status === "APPROVED" ? (
                      <Money value={b.remaining} />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td>
                    <BudgetStatusBadge status={b.status} />
                  </td>
                  <RoleGate role="APPROVER">
                    <td className="w-64">
                      {b.status === "PENDING" &&
                        (b.created_by_id === user?.id ? (
                          <span className="text-xs text-slate-400">Your own request</span> //can't decide your own, backend refuses too
                        ) : (
                          <DecisionButtons budgetId={b.id} />
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
