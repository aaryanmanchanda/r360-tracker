import { useState } from "react";
import { api } from "../api/client";
import type { PurchaseOrderDetail } from "../api/types";
import { useApiMutation } from "../api/useApiMutation";
import { onSubmit, today } from "../lib/form";
import { Field } from "./Field";
import { FormError } from "./FormError";
import { Money } from "./Money";

export function RecordVoucherForm({ po }: { po: PurchaseOrderDetail }) {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [received, setReceived] = useState(today());

  const record = useApiMutation(
    () =>
      api("/vouchers", {
        method: "POST",
        body: { purchase_order_id: po.id, coupon_code: code, amount, received_date: received },
      }),
    () => {
      setCode("");
      setAmount("");
    },
  );

  return (
    <form onSubmit={onSubmit(() => record.mutate())} className="card space-y-4">
      <h2 className="font-semibold">Record a voucher received</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="coupon" label="Coupon code" className="font-mono" value={code} onChange={setCode} />
        <Field
          id="voucher-amount"
          label={
            <>
              Amount (₹) · up to <Money value={po.remaining} />
            </>
          }
          inputMode="decimal"
          value={amount}
          onChange={setAmount}
        />
        <Field id="received" label="Received date" type="date" value={received} onChange={setReceived} />
      </div>
      <FormError error={record.error} />
      <button className="btn-primary" disabled={record.isPending}>
        Record voucher
      </button>
    </form>
  );
}
