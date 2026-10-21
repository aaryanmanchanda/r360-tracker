import type { Progress, StepState } from "../lib/progress";

const dot: Record<StepState, string> = {
  done: "bg-emerald-600 text-white",
  current: "bg-indigo-600 text-white ring-4 ring-indigo-100",
  todo: "bg-slate-200 text-slate-500",
  failed: "bg-rose-600 text-white",
};
const text: Record<StepState, string> = {
  done: "text-slate-700",
  current: "font-semibold text-indigo-700",
  todo: "text-slate-400",
  failed: "font-semibold text-rose-700",
};
const icon: Record<StepState, (n: number) => string> = {
  done: () => "✓",
  current: (n) => String(n),
  todo: (n) => String(n),
  failed: () => "✕",
};

//where this record is in Budget → Approval → PO → Voucher → VRN, plus the one thing that happens next
export function ProgressSteps({ progress }: { progress: Progress }) {
  return (
    <div className="card space-y-3">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {progress.steps.map((step, i) => (
          <li
            key={step.label}
            className="flex items-center gap-2"
            aria-current={step.state === "current" ? "step" : undefined}
          >
            {i > 0 && <span aria-hidden className="h-px w-6 bg-slate-300 sm:w-10" />}
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${dot[step.state]}`}
            >
              {icon[step.state](i + 1)}
            </span>
            <span className={`text-sm ${text[step.state]}`}>{step.label}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-slate-600">{progress.next}</p>
    </div>
  );
}
