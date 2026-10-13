import type { ReactNode } from "react";
import { Money } from "./Money";

export function StatTile({ label, value, emphasis }: { label: string; value: string | null; emphasis?: boolean }) {
  let shown: ReactNode = <span className="text-slate-400">n/a</span>; //e.g. no balance to show on a pending budget
  if (value !== null) shown = <Money value={value} />;

  return (
    <div className={`rounded-lg border p-4 ${emphasis ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${emphasis ? "text-indigo-700" : ""}`}>{shown}</p>
    </div>
  );
}
