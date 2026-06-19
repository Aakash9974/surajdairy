"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import ProductForm from "./ProductForm";

export default function ProductsClient() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    setProducts(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    // Realtime: keep the catalogue in sync across devices.
    const channel = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) alert(error.message);
    else load();
  }

  const filtered = products.filter((p) =>
    (p.name + " " + (p.category ?? "")).toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Inventory</h1>
        <button onClick={openAdd} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          + Add
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          No products. Tap “+ Add” to create one.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className={`flex flex-col rounded-xl bg-white p-3 ring-1 ring-slate-200 ${
                p.is_active ? "" : "opacity-60"
              }`}
            >
              <div className="mb-2 flex h-24 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-3xl">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  "🥛"
                )}
              </div>
              <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
              <p className="text-xs text-slate-500">{p.category}</p>
              <p className="mt-1 font-semibold text-brand">
                {formatINR(p.price)}
                <span className="text-xs font-normal text-slate-400"> /{p.unit}</span>
              </p>
              {p.track_stock && (
                <p className="text-xs text-slate-500">Stock: {p.stock_count ?? 0}</p>
              )}
              <div className="mt-2 flex gap-2">
                <button onClick={() => openEdit(p)} className="flex-1 rounded-lg border border-slate-300 py-1.5 text-xs hover:bg-slate-50">
                  Edit
                </button>
                <button onClick={() => remove(p)} className="rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit product" : "Add product"}>
        <ProductForm
          product={editing}
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
