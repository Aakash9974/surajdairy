"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/format";
import type { CustomerBalance } from "@/lib/types";
import {
  sendMessage,
  buildReminderMessage,
  buildMonthlyMessage,
  whatsappUrl,
} from "@/lib/messaging";

type Tab = "outstanding" | "reports";

export default function LedgerClient() {
  const [tab, setTab] = useState<Tab>("outstanding");
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Ledger &amp; reports</h1>
      <div className="grid grid-cols-2 gap-2">
        <TabBtn active={tab === "outstanding"} onClick={() => setTab("outstanding")}>
          Outstanding
        </TabBtn>
        <TabBtn active={tab === "reports"} onClick={() => setTab("reports")}>
          Reports
        </TabBtn>
      </div>
      {tab === "outstanding" ? <Outstanding /> : <Reports />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg py-2 text-sm font-medium ring-1 ${
        active ? "bg-brand text-white ring-brand" : "bg-white text-slate-700 ring-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

// ---- Outstanding / defaulters --------------------------------------------

function Outstanding() {
  const supabase = createClient();
  const [rows, setRows] = useState<CustomerBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("customer_balances")
      .select("*")
      .gt("balance", 0)
      .order("balance", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("ledger-balances")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  const totalOutstanding = rows.reduce((s, r) => s + Number(r.balance), 0);
  const monthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  async function remind(r: CustomerBalance, monthly: boolean) {
    if (!whatsappUrl(r.phone, "x")) {
      alert(`${r.name} has no valid phone number.`);
      return;
    }
    await sendMessage(supabase, r.phone, {
      customerId: r.customer_id,
      type: monthly ? "monthly" : "reminder",
      body: monthly
        ? buildMonthlyMessage({ customerName: r.name, balance: Number(r.balance), monthLabel })
        : buildReminderMessage({ customerName: r.name, balance: Number(r.balance) }),
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-xs text-slate-500">Total outstanding (udhar)</p>
        <p className="text-2xl font-bold text-red-600">{formatINR(totalOutstanding)}</p>
        <p className="text-xs text-slate-400">{rows.length} customer(s) owe money</p>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Everyone is clear! 🎉</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.customer_id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <Link href={`/customers/${r.customer_id}`} className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.phone || "No phone"}</p>
                </Link>
                <span className="font-semibold text-red-600">{formatINR(Number(r.balance))}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => remind(r, false)} className="rounded-lg bg-brand py-1.5 text-xs font-medium text-white hover:bg-brand-dark">
                  🔔 Reminder
                </button>
                <button onClick={() => remind(r, true)} className="rounded-lg border border-slate-300 py-1.5 text-xs font-medium hover:bg-slate-50">
                  📅 Monthly
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Reports --------------------------------------------------------------

type Range = "today" | "month" | "all";

function Reports() {
  const supabase = createClient();
  const [range, setRange] = useState<Range>("today");
  const [data, setData] = useState<{
    total: number;
    paid: number;
    udhar: number;
    count: number;
    byProduct: { name: string; qty: number; amount: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fromDate = useMemo(() => {
    const now = new Date();
    if (range === "today") return now.toISOString().slice(0, 10);
    if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return "1970-01-01";
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: sales } = await supabase
      .from("sales")
      .select("total_amount, paid_amount, sale_items(product_name, qty, line_total)")
      .gte("sale_date", fromDate);

    let total = 0,
      paid = 0,
      count = 0;
    const prodMap = new Map<string, { qty: number; amount: number }>();
    for (const s of sales ?? []) {
      total += Number(s.total_amount);
      paid += Number(s.paid_amount);
      count++;
      for (const it of (s.sale_items as { product_name: string; qty: number; line_total: number }[]) ?? []) {
        const cur = prodMap.get(it.product_name) ?? { qty: 0, amount: 0 };
        cur.qty += Number(it.qty);
        cur.amount += Number(it.line_total);
        prodMap.set(it.product_name, cur);
      }
    }
    const byProduct = [...prodMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount);

    setData({ total, paid, udhar: total - paid, count, byProduct });
    setLoading(false);
  }, [supabase, fromDate]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {(["today", "month", "all"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-lg py-2 text-sm font-medium capitalize ring-1 ${
              range === r ? "bg-brand text-white ring-brand" : "bg-white text-slate-700 ring-slate-300"
            }`}
          >
            {r === "month" ? "This month" : r}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Sales" value={formatINR(data.total)} />
            <Stat label="Collected" value={formatINR(data.paid)} />
            <Stat label="On udhar" value={formatINR(data.udhar)} accent="text-orange-600" />
            <Stat label="Bills" value={String(data.count)} />
          </div>

          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h3 className="mb-2 text-sm font-semibold text-slate-600">By product</h3>
            {data.byProduct.length === 0 ? (
              <p className="text-sm text-slate-400">No sales in this period.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.byProduct.map((p) => (
                  <li key={p.name} className="flex items-center justify-between py-2 text-sm">
                    <span className="min-w-0 truncate">{p.name}</span>
                    <span className="ml-2 shrink-0 text-slate-500">
                      {p.qty} · <span className="font-medium text-slate-800">{formatINR(p.amount)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent ?? "text-slate-800"}`}>{value}</p>
    </div>
  );
}
