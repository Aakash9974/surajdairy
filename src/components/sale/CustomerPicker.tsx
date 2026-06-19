"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import CustomerForm from "@/components/customers/CustomerForm";

export default function CustomerPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (customer: Customer | null) => void;
}) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("is_active", true)
      .order("name");
    setCustomers(data ?? []);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = customers.filter((c) =>
    (c.name + " " + (c.phone ?? "")).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal open={open} onClose={onClose} title="Choose customer">
      <div className="space-y-3">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />

        <button
          onClick={() => onPick(null)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-left text-sm font-medium hover:bg-slate-50"
        >
          🚶 Walk-in (cash, no account)
        </button>

        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg ring-1 ring-slate-200">
          {filtered.map((c) => (
            <li key={c.id}>
              <button onClick={() => onPick(c)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50">
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-slate-500">{c.phone}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-400">No match.</li>
          )}
        </ul>

        <button onClick={() => setShowNew(true)} className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark">
          + New customer
        </button>
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New customer">
        <CustomerForm
          onSaved={async (id) => {
            setShowNew(false);
            const { data } = await supabase.from("customers").select("*").eq("id", id).single();
            if (data) onPick(data);
          }}
          onClose={() => setShowNew(false)}
        />
      </Modal>
    </Modal>
  );
}
