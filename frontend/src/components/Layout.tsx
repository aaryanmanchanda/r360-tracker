import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { NavCount } from "./NavCount";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`;

export function Layout() {
  const { user, loading, logout } = useAuth();

  if (loading) return <p className="p-8 text-sm text-slate-500">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />; //every page under Layout needs a login

  return (
    <div>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link to="/" className="font-semibold">
            Budget → PO → Voucher
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/" end className={navClass}>
              Budgets
              <NavCount of="budgets" />
            </NavLink>
            <NavLink to="/vouchers" className={navClass}>
              Vouchers
              <NavCount of="vouchers" />
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span>
              {user.full_name}{" "}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{user.role}</span>
            </span>
            <button className="btn-ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
