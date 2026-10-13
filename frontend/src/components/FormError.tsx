//shows the backend's own sentence ("only ₹4,000.00 remains...") right under the form
export function FormError({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
      {error.message}
    </p>
  );
}
