// WhatsApp click-to-send provider.
// Normalizes an Indian phone number and builds a wa.me link with prefilled text.

export function normalizeIndianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10) digits = "91" + digits; // bare 10-digit mobile
  else if (digits.length === 11 && digits.startsWith("0")) digits = "91" + digits.slice(1);
  // 12 digits starting with 91 (already has country code) -> as-is
  if (digits.length < 11) return null;
  return digits;
}

export function whatsappUrl(phone: string | null | undefined, text: string): string | null {
  const num = normalizeIndianPhone(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
