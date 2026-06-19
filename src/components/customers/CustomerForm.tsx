"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/lib/types";

type Props = {
  customer?: Customer | null;
  onSaved: (id: string) => void;
  onClose: () => void;
};

export default function CustomerForm({ customer, onSaved, onClose }: Props) {
  const supabase = createClient();
  const editing = !!customer;

  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [openingBalance, setOpeningBalance] = useState(
    customer?.opening_balance?.toString() ?? "0",
  );
  const [isActive, setIsActive] = useState(customer?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      opening_balance: Number(openingBalance) || 0,
      is_active: isActive,
    };

    const res = editing
      ? await supabase.from("customers").update(payload).eq("id", customer!.id).select("id").single()
      : await supabase.from("customers").insert(payload).select("id").single();

    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    onSaved(res.data!.id);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name">
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Customer name" />
      </Field>
      <Field label="Phone (for WhatsApp)">
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputCls}
          placeholder="10-digit mobile (e.g. 98765 43210)"
        />
      </Field>
      <Field label="Address">
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} rows={2} placeholder="Optional" />
      </Field>
      <Field label="Opening balance / old udhar (₹)">
        <input
          type="number"
          inputMode="decimal"
          step="1"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
          className={inputCls}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60">
          {saving ? "Saving…" : editing ? "Save" : "Add customer"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
