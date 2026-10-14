import type { FormEvent } from "react";

//wraps a submit action so no form has to repeat the preventDefault dance
export const onSubmit = (run: () => void) => (e: FormEvent) => {
  e.preventDefault();
  run();
};

//YYYY-MM-DD in the user's own timezone (en-CA happens to print that shape), for <input type="date">
export const today = () => new Date().toLocaleDateString("en-CA");
