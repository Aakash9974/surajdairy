"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/format";
import type { Customer } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import CustomerForm from "./CustomerForm";
import CustomerLedger from "./CustomerLedger";

export default function CustomerDetailClient({ id }: { id: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async () => {
    const [{ data: c }, { data: bal }] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase.from("customer_balances").select("balance").eq("customer_id", id).single(),
    ]);
    setCustomer(c);
    setBalance(Number(bal?.balance ?? 0));
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;
  if (!customer) return <p className="py-10 text-center text-sm text-slate-400">Customer not found.</p>;

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="text-sm text-slate-500">← Back</button>

      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold">{customer.name}</h1>
            <p className="text-sm text-slate-500">{customer.phone || "No phone"}</p>
            {customer.address && <p className="mt-1 text-sm text-slate-500">{customer.address}</p>}
          </div>
          <button onClick={() => setShowEdit(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Edit
          </button>
        </div>
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Outstanding balance</p>
          <p className={`text-2xl font-bold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {formatINR(balance)}
          </p>
        </div>
      </div>

      <CustomerLedger customer={customer} balance={balance} onChanged={load} />

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit customer">
        <CustomerForm
          customer={customer}
          onSaved={() => {
            setShowEdit(false);
            load();
          }}
          onClose={() => setShowEdit(false)}
        />
      </Modal>
    </div>
  );
}
