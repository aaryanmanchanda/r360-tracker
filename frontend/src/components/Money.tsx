const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

//display only. the real maths (caps, remaining) all happens on the server in Decimal
export function Money({ value }: { value: string }) {
  return <span className="tabular-nums">{inr.format(Number(value))}</span>;
}
