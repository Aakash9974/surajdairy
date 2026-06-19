"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/format";
import Modal from "@/components/ui/Modal";

type Row = {
  id: string;
  created_at: string;
  total_amount: number;
  paid_amount: number;
  payment_mode: string;
  customer: { name: string } | null;
  sale_items: { product_name: string; qty: number }[];
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function RecentSales({
  open,
  onClose,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  onEdit: (saleId: string) => void;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("sales")
      .select("id, created_at, total_amount, paid_amount, payment_mode, customer:customers(name), sale_items(product_name, qty)")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setRows((data as unknown as Row[]) ?? []);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Recent sales">
      <p className="mb-3 text-sm text-slate-500">Tap a sale to edit it (customer, items, payment) or delete it.</p>
      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No sales yet.</p>
      ) : (
        <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
          {rows.map((r) => (
            <li key={r.id}>
              <button onClick={() => onEdit(r.id)} className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.customer?.name ?? "Walk-in"}</p>
                  <p className="truncate text-xs text-slate-500">
                    {(r.sale_items ?? []).map((i) => `${i.qty}×${i.product_name}`).join(", ") || "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {timeAgo(r.created_at)} · <span className="capitalize">{r.payment_mode}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">{formatINR(Number(r.total_amount))}</p>
                  <span className="text-xs text-teal-700">Edit ›</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
