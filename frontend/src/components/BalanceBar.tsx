import { Money } from "./Money";

//the "remaining balance at a glance" bit: a bar of how much of the parent amount is used up
export function BalanceBar({ used, total, usedLabel }: { used: string; total: string; usedLabel: string }) {
  const percent = Number(total) > 0 ? Math.min(100, (Number(used) / Number(total)) * 100) : 0;
  const full = percent >= 100;

  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${full ? "bg-slate-500" : "bg-indigo-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        <Money value={used} /> {usedLabel} · {full ? "fully used" : `${percent.toFixed(0)}% used`}
      </p>
    </div>
  );
}
