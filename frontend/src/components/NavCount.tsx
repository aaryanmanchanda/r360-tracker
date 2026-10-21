import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Budget, Voucher } from "../api/types";
import { useAuth } from "../auth/useAuth";

//approver's to-do count on a nav link. same query keys as the pages, so it shares their cache and
//refreshes whenever a mutation invalidates everything
export function NavCount({ of }: { of: "budgets" | "vouchers" }) {
  const { user } = useAuth();
  const isApprover = user?.role === "APPROVER";

  const { data: budgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => api<Budget[]>("/budgets"),
    enabled: isApprover && of === "budgets",
  });
  const { data: vouchers } = useQuery({
    queryKey: ["vouchers", "pending"],
    queryFn: () => api<Voucher[]>("/vouchers?status=pending"),
    enabled: isApprover && of === "vouchers",
  });

  const count =
    of === "budgets"
      ? (budgets?.filter((b) => b.status === "PENDING" && b.created_by_id !== user?.id).length ?? 0)
      : (vouchers?.length ?? 0);
  if (!isApprover || count === 0) return null;

  return (
    <span
      className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-white"
      title={`${count} waiting for you`}
    >
      {count}
    </span>
  );
}
