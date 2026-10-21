const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

//display only (Money component and toast messages). the real maths happens on the server in Decimal
export const rupees = (value: string) => inr.format(Number(value));
