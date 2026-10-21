import { useState } from "react";
import { api } from "../api/client";
import type { BudgetDetail } from "../api/types";
import { useApiMutation } from "../api/useApiMutation";
import { onSubmit } from "../lib/form";
import { Field } from "./Field";
import { FormError } from "./FormError";

export function CreateBudgetForm() {
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");

  const create = useApiMutation(
    () => api<BudgetDetail>("/budgets", { method: "POST", body: { title, purpose, amount } }),
    {
      onDone: () => {
        setTitle("");
        setPurpose("");
        setAmount("");
      },
      success: (b) => `Budget "${b.title}" submitted. It's now waiting for an Approver.`,
    },
  );

  return (
    <form onSubmit={onSubmit(() => create.mutate())} className="card space-y-4">
      <h2 className="font-semibold">New budget request</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="title" label="Title" value={title} onChange={setTitle} />
        <Field id="purpose" label="Purpose" value={purpose} onChange={setPurpose} />
        <Field id="amount" label="Amount (₹)" inputMode="decimal" value={amount} onChange={setAmount} />
      </div>
      <FormError error={create.error} />
      <button className="btn-primary" disabled={create.isPending}>
        Submit for approval
      </button>
    </form>
  );
}
