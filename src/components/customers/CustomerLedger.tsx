"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatINR, formatDate } from "@/lib/format";
import type { Customer, Sale, SaleItem, Payment } from "@/lib/types";
import { sendMessage, buildReminderMessage, whatsappUrl } from "@/lib/messaging";
import Modal from "@/components/ui/Modal";

type SaleRow = Sale & { sale_items: SaleItem[] };
type Entry =
  | { kind: "sale"; date: string; amount: number; paid: number; items: SaleItem[]; id: string }
  | { kind: "payment"; date: string; amount: number; id: string; note: string | null };

export default function CustomerLedger({
  customer,
  balance,
  onChanged,
}: {
  customer: Customer;
  balance: number;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);

  const load = useCallback(async () => {
    const [{ data: sales }, { data: payments }] = await Promise.all([
      supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false }),
    ]);

    const saleEntries: Entry[] = (sales ?? []).map((s: SaleRow) => ({
      kind: "sale",
      id: s.id,
      date: s.created_at,
      amount: Number(s.total_amount),
      paid: Number(s.paid_amount),
      items: s.sale_items ?? [],
    }));
    const payEntries: Entry[] = (payments ?? []).map((p: Payment) => ({
      kind: "payment",
      id: p.id,
      date: p.created_at,
      amount: Number(p.amount),
      note: p.note,
    }));

    setEntries(
      [...saleEntries, ...payEntries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    );
    setLoading(false);
  }, [supabase, customer.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendReminder() {
    if (!whatsappUrl(customer.phone, "test")) {
      alert("This customer has no valid phone number. Add one first.");
      return;
    }
    await sendMessage(supabase, customer.phone, {
      customerId: customer.id,
      type: "reminder",
      body: buildReminderMessage({ customerName: customer.name, balance }),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowPay(true)}
          className="rounded-xl bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-700"
        >
          💵 Record payment
        </button>
        <button
          onClick={sendReminder}
          disabled={balance <= 0}
          className="rounded-xl bg-brand py-3 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          🔔 Send reminder
        </button>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">Transactions</h2>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            {entries.map((e) => (
              <li key={e.kind + e.id} className="px-4 py-3">
                {e.kind === "sale" ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">🛒 Sale</span>
                      <span className="font-semibold text-slate-800">{formatINR(e.amount)}</span>
                    </div>
                    <p className="text-xs text-slate-400">{formatDate(e.date)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {e.items.map((i) => `${i.qty}×${i.product_name}`).join(", ")}
                    </p>
                    {e.paid > 0 && (
                      <p className="text-xs text-emerald-600">Paid {formatINR(e.paid)}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-emerald-700">💵 Payment</span>
                      <p className="text-xs text-slate-400">{formatDate(e.date)}</p>
                      {e.note && <p className="text-xs text-slate-500">{e.note}</p>}
                    </div>
                    <span className="font-semibold text-emerald-700">− {formatINR(e.amount)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={showPay} onClose={() => setShowPay(false)} title="Record payment">
        <PaymentForm
          customer={customer}
          maxSuggested={balance}
          onSaved={() => {
            setShowPay(false);
            load();
            onChanged();
          }}
          onClose={() => setShowPay(false)}
        />
      </Modal>
    </div>
  );
}

function PaymentForm({
  customer,
  maxSuggested,
  onSaved,
  onClose,
}: {
  customer: Customer;
  maxSuggested: number;
  onSaved: () => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [amount, setAmount] = useState(maxSuggested > 0 ? String(maxSuggested) : "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("payments").insert({
      customer_id: customer.id,
      amount: Number(amount) || 0,
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) setError(error.message);
    else onSaved();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Amount (₹)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          placeholder="Cash / UPI…"
        />
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
          {saving ? "Saving…" : "Save payment"}
        </button>
      </div>
    </form>
  );
}
