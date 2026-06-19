// Messaging entry point. Today: WhatsApp click-to-send.
// To add automatic SMS / WhatsApp API later, implement another provider and
// switch on it here — callers (POS, ledger) don't change.

import type { SupabaseClient } from "@supabase/supabase-js";
import { whatsappUrl } from "./whatsapp";
import type { OutgoingMessage } from "./types";

export * from "./types";
export { whatsappUrl, normalizeIndianPhone } from "./whatsapp";

export type Provider = "whatsapp";

export const ACTIVE_PROVIDER: Provider = "whatsapp";

/**
 * Click-to-send: opens WhatsApp with the prefilled message and logs it.
 * Returns false if the customer has no usable phone number.
 */
export async function sendMessage(
  supabase: SupabaseClient,
  phone: string | null | undefined,
  msg: OutgoingMessage,
): Promise<{ ok: boolean; reason?: string }> {
  const url = whatsappUrl(phone, msg.body);
  if (!url) return { ok: false, reason: "No valid phone number" };

  // Open WhatsApp (new tab / app). Must run in a user-gesture handler.
  if (typeof window !== "undefined") window.open(url, "_blank");

  await supabase.from("messages_log").insert({
    customer_id: msg.customerId,
    sale_id: msg.saleId ?? null,
    type: msg.type,
    channel: ACTIVE_PROVIDER,
    content: msg.body,
    status: "sent",
  });

  return { ok: true };
}
