import { useState } from "react";
import { api } from "../api/client";
import type { BudgetDetail } from "../api/types";
import { useApiMutation } from "../api/useApiMutation";
import { onSubmit } from "../lib/form";
import { Field } from "./Field";
import { FormError } from "./FormError";
import { Money } from "./Money";

export function RaisePoForm({ budget }: { budget: BudgetDetail }) {
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");

  const raise = useApiMutation(
    () => api("/purchase-orders", { method: "POST", body: { budget_id: budget.id, vendor_name: vendor, amount } }),
    () => {
      setVendor("");
      setAmount("");
    },
  );

  //the form only unlocks on an approved budget, otherwise say why (the backend enforces it either way)
  if (budget.status !== "APPROVED")
    return (
      <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
        POs can only be raised on an approved budget. This one is {budget.status.toLowerCase()}.
      </p>
    );

  return (
    <form onSubmit={onSubmit(() => raise.mutate())} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="vendor" label="Vendor name" value={vendor} onChange={setVendor} />
        <Field
          id="po-amount"
          label={
            <>
              Amount (₹) · up to <Money value={budget.remaining} />
            </>
          }
          inputMode="decimal"
          value={amount}
          onChange={setAmount}
        />
      </div>
      <FormError error={raise.error} />
      <button className="btn-primary" disabled={raise.isPending}>
        Raise PO
      </button>
    </form>
  );
}
