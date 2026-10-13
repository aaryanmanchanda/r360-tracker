import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { FormError } from "../components/FormError";

//same list as backend/app/seed.py, shown so the reviewer can click straight in
const DEMO_LOGINS = [
  { label: "Requester", email: "requester@r360.test" },
  { label: "Requester 2", email: "requester2@r360.test" },
  { label: "Approver", email: "approver@r360.test" },
];
const DEMO_PASSWORD = "Passw0rd!";

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err as Error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-24 max-w-sm space-y-4 px-4">
      <h1 className="text-xl font-semibold">Budget → PO → Voucher Tracker</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <FormError error={error} />
        <button className="btn-primary w-full" disabled={submitting}>
          Log in
        </button>
      </form>

      <div className="card space-y-2 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Demo logins (password {DEMO_PASSWORD})</p>
        {DEMO_LOGINS.map((d) => (
          <button
            key={d.email}
            type="button"
            className="btn-ghost w-full justify-between"
            onClick={() => {
              setEmail(d.email);
              setPassword(DEMO_PASSWORD);
            }}
          >
            <span>{d.label}</span>
            <span className="text-slate-400">{d.email}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
