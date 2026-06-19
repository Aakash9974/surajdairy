"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/format";
import type { Customer } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import CustomerForm from "./CustomerForm";

type Row = Customer & { balance: number };

export default function CustomersClient() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const [{ data: customers }, { data: balances }] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("customer_balances").select("customer_id, balance"),
    ]);
    const balMap = new Map((balances ?? []).map((b) => [b.customer_id, Number(b.balance)]));
    setRows((customers ?? []).map((c) => ({ ...c, balance: balMap.get(c.id) ?? 0 })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("customers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  const filtered = rows.filter((c) =>
    (c.name + " " + (c.phone ?? "")).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Customers</h1>
        <button onClick={() => setShowForm(true)} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          + Add
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or phone…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No customers yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link href={`/customers/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-slate-500">{c.phone || "No phone"}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${c.balance > 0 ? "text-red-600" : "text-slate-600"}`}>
                    {formatINR(c.balance)}
                  </p>
                  <p className="text-xs text-slate-400">{c.balance > 0 ? "owes" : "clear"}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add customer">
        <CustomerForm
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onClose={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
