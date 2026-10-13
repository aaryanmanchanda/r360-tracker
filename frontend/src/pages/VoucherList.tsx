import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Voucher } from "../api/types";
import { FormError } from "../components/FormError";
import { VoucherTable } from "../components/VoucherTable";

const TABS = [
  { label: "All", value: "" },
  { label: "Pending acknowledgement", value: "pending" },
  { label: "Acknowledged", value: "acknowledged" },
];

export function VoucherList() {
  const [status, setStatus] = useState("");
  const { data: vouchers, error, isLoading } = useQuery({
    queryKey: ["vouchers", status],
    queryFn: () => api<Voucher[]>(`/vouchers${status ? `?status=${status}` : ""}`),
  });

  return (
    <>
      <h1 className="text-xl font-semibold">Vouchers</h1>
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            className={tab.value === status ? "btn-primary" : "btn-ghost ring-1 ring-slate-200"}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="card">
        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        <FormError error={error} />
        {vouchers && <VoucherTable vouchers={vouchers} showPo />}
      </div>
    </>
  );
}
