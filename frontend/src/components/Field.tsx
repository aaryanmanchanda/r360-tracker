import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "id"> {
  id: string; //ties the label to the input
  label: ReactNode;
  onChange: (value: string) => void;
}

//label + input in one, so forms read as a list of fields instead of repeated markup
export function Field({ id, label, onChange, className = "", ...input }: FieldProps) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className={`input ${className}`} onChange={(e) => onChange(e.target.value)} {...input} />
    </div>
  );
}
