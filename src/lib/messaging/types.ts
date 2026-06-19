import type { MessageType } from "@/lib/types";
import { DAIRY_NAME, formatINR, formatDate } from "@/lib/format";

// A message ready to be delivered by a provider.
export interface OutgoingMessage {
  customerId: string;
  saleId?: string | null;
  type: MessageType;
  body: string;
}

export interface PurchaseLine {
  product_name: string;
  qty: number;
  line_total: number;
}

// ---- Message templates (edit copy here) ----------------------------------

export function buildPurchaseMessage(opts: {
  customerName: string;
  date: string | Date;
  lines: PurchaseLine[];
  total: number;
  paid: number;
  balance: number;
}): string {
  const items = opts.lines
    .map((l) => `• ${l.qty} × ${l.product_name} = ${formatINR(l.line_total)}`)
    .join("\n");

  return [
    `Namaste ${opts.customerName} 🙏`,
    `Thank you for shopping at ${DAIRY_NAME}!`,
    ``,
    `🧾 ${formatDate(opts.date)}`,
    items,
    `Total: ${formatINR(opts.total)}`,
    `Paid: ${formatINR(opts.paid)}`,
    `Balance due: ${formatINR(opts.balance)}`,
    ``,
    `Have a great day! 🥛`,
  ].join("\n");
}

export function buildReminderMessage(opts: {
  customerName: string;
  balance: number;
}): string {
  return [
    `Namaste ${opts.customerName} 🙏`,
    `A friendly reminder from ${DAIRY_NAME}.`,
    `Your outstanding balance is ${formatINR(opts.balance)}.`,
    `Kindly clear it at your convenience. Thank you! 🥛`,
  ].join("\n");
}

export function buildMonthlyMessage(opts: {
  customerName: string;
  balance: number;
  monthLabel: string;
}): string {
  return [
    `Namaste ${opts.customerName} 🙏`,
    `${DAIRY_NAME} — statement for ${opts.monthLabel}.`,
    `Your current outstanding balance is ${formatINR(opts.balance)}.`,
    `Thank you for being our valued customer! 🥛`,
  ].join("\n");
}
