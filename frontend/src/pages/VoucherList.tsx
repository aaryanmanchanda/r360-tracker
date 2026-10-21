import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Voucher } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { FormError } from "../components/FormError";
import { Hint } from "../components/Hint";
import { Loading } from "../components/Loading";
import { VoucherTable } from "../components/VoucherTable";

const TABS = [
  { label: "All", value: "" },
  { label: "Pending acknowledgement", value: "pending" },
  { label: "Acknowledged", value: "acknowledged" },
];

export function VoucherList() {
  const { user } = useAuth();
  const [status, setStatus] = useState(user?.role === "APPROVER" ? "pending" : ""); //approvers come to clear the queue
  const {
    data: vouchers,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["vouchers", status],
    queryFn: () => api<Voucher[]>(`/vouchers${status ? `?status=${status}` : ""}`),
  });

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">Vouchers</h1>
        <Hint>
          A voucher is a coupon code a vendor delivered against a PO. A VRN (Voucher Received Note) is the Approver's
          confirmation that it arrived. Vouchers are recorded from their PO's page.
        </Hint>
      </div>
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
        {isLoading && <Loading />}
        <FormError error={error} />
        {vouchers && <VoucherTable vouchers={vouchers} showPo />}
      </div>
    </>
  );
}
