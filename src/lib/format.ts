// Indian Rupee formatting and small shared helpers.

export const DAIRY_NAME = process.env.NEXT_PUBLIC_DAIRY_NAME || "Suraj Dairy";

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export type BalanceTone = "owe" | "advance" | "clear";

// Describes a customer balance for display.
//   balance > 0 => customer owes the dairy (udhar)
//   balance < 0 => customer has an advance (dairy owes them)
//   balance = 0 => clear
// Always returns a positive amount string + a human label, so the UI never
// shows a confusing minus sign.
export function describeBalance(balance: number): {
  amount: string;
  label: string;
  tone: BalanceTone;
} {
  if (balance > 0.005) return { amount: formatINR(balance), label: "owes", tone: "owe" };
  if (balance < -0.005) return { amount: formatINR(-balance), label: "advance", tone: "advance" };
  return { amount: formatINR(0), label: "clear", tone: "clear" };
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
