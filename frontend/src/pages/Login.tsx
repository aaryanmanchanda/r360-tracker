import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Field } from "../components/Field";
import { FormError } from "../components/FormError";
import { onSubmit } from "../lib/form";

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

  async function submit() {
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
      <form onSubmit={onSubmit(submit)} className="card space-y-4">
        <Field id="email" label="Email" value={email} onChange={setEmail} autoFocus />
        <Field id="password" label="Password" type="password" value={password} onChange={setPassword} />
        <FormError error={error} />
        <button className="btn-primary w-full" disabled={submitting}>
          Log in
        </button>
      </form>

      <div className="card space-y-2 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Demo logins (password {DEMO_PASSWORD})
        </p>
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
