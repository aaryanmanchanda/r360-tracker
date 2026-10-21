import { rupees } from "../lib/rupees";

export function Money({ value }: { value: string }) {
  return <span className="tabular-nums">{rupees(value)}</span>;
}
