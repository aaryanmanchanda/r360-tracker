import type { ReactNode } from "react";

//one plain-language line under a page title, so nobody has to know the jargon up front
export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-slate-600">{children}</p>;
}
