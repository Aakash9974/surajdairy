"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/format";
import type { Customer, Product, PaymentMode } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import CustomerPicker from "./CustomerPicker";
import RecentSales from "./RecentSales";
import { sendMessage, buildPurchaseMessage, whatsappUrl } from "@/lib/messaging";

type Cart = Record<string, { product: Product; qty: number }>;

export default function SaleClient() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);

  // When set, we're editing an existing sale rather than creating a new one.
  const [editing, setEditing] = useState<{ id: string; mode: PaymentMode; paid: number } | null>(null);

  const [saved, setSaved] = useState<null | {
    lines: { product_name: string; qty: number; line_total: number }[];
    total: number;
    paid: number;
    balance: number;
    customer: Customer | null;
    wasEdit: boolean;
  }>(null);

  const loadProducts = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");
    setProducts(data ?? []);
  }, [supabase]);

  useEffect(() => {
    loadProducts();
    const channel = supabase
      .channel("sale-products")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadProducts())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadProducts]);

  const lines = useMemo(() => Object.values(cart), [cart]);
  const total = useMemo(() => lines.reduce((s, l) => s + l.qty * Number(l.product.price), 0), [lines]);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  function add(p: Product) {
    setCart((c) => ({ ...c, [p.id]: { product: p, qty: (c[p.id]?.qty ?? 0) + 1 } }));
  }
  function setQty(id: string, qty: number) {
    setCart((c) => {
      if (qty <= 0) {
        const next = { ...c };
        delete next[id];
        return next;
      }
      return { ...c, [id]: { ...c[id], qty } };
    });
  }
  function reset() {
    setCart({});
    setCustomer(null);
    setEditing(null);
  }

  // Load a previously-saved sale back into the cart for editing.
  const loadSaleForEdit = useCallback(
    async (saleId: string) => {
      const { data } = await supabase
        .from("sales")
        .select("*, sale_items(*), customer:customers(*)")
        .eq("id", saleId)
        .single();
      if (!data) return;

      const newCart: Cart = {};
      (data.sale_items ?? []).forEach(
        (si: { product_id: string | null; product_name: string; qty: number; unit_price: number }, i: number) => {
          const found = products.find((p) => p.id === si.product_id);
          const prod: Product = found
            ? { ...found, price: Number(si.unit_price) }
            : {
                id: si.product_id ?? `tmp-${i}`,
                name: si.product_name,
                brand: null,
                category: null,
                photo_url: null,
                price: Number(si.unit_price),
                unit: "pkt",
                track_stock: false,
                stock_count: null,
                sort_order: 0,
                is_active: true,
                created_at: "",
              };
          newCart[prod.id] = { product: prod, qty: Number(si.qty) };
        },
      );

      setCart(newCart);
      setCustomer((data.customer as Customer) ?? null);
      setEditing({
        id: data.id,
        mode: data.payment_mode as PaymentMode,
        paid: Number(data.paid_amount),
      });
      setRecentOpen(false);
      setCheckoutOpen(true);
    },
    [supabase, products],
  );

  const filtered = products.filter((p) =>
    (p.name + " " + (p.category ?? "")).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{editing ? "Edit sale" : "New sale"}</h1>
        <button
          onClick={() => setRecentOpen(true)}
          className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-teal-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          🕘 Recent
        </button>
      </div>

      {editing && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <span>Editing a saved sale</span>
          <button onClick={reset} className="font-medium underline">
            Cancel
          </button>
        </div>
      )}

      {/* Customer section */}
      <section className="space-y-1.5">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
        <button onClick={() => setPickerOpen(true)} className="card flex w-full items-center gap-3 px-4 py-3 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-lg">
            {customer ? "🧑" : "🚶"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{customer ? customer.name : "Walk-in (cash)"}</p>
            <p className="text-xs text-slate-500">{customer?.phone || "Tap to choose a customer"}</p>
          </div>
          <span className="text-sm text-teal-700">Change ▾</span>
        </button>
      </section>

      {/* Products section */}
      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Products</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        />

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            {products.length === 0 ? "No active products. Add some in Inventory." : "No products match."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {filtered.map((p) => {
              const qty = cart[p.id]?.qty ?? 0;
              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-2xl bg-white p-2 shadow-sm ring-1 transition ${
                    qty > 0 ? "ring-2 ring-teal-500" : "ring-slate-200/70"
                  }`}
                >
                  {qty > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 z-10 flex h-6 min-w-6 animate-pop items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 px-1 text-xs font-bold text-white shadow">
                      {qty}
                    </span>
                  )}
                  <button onClick={() => add(p)} className="flex flex-1 flex-col items-center active:scale-[0.97]">
                    <div className="mb-1 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-2xl">
                      {p.photo_url ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" /> : "🥛"}
                    </div>
                    <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight">{p.name}</span>
                    <span className="mt-0.5 text-xs font-bold text-teal-700">{formatINR(p.price)}</span>
                  </button>

                  {qty > 0 ? (
                    <div className="mt-1.5 flex items-center justify-between rounded-lg bg-slate-100 p-0.5">
                      <button
                        onClick={() => setQty(p.id, qty - 1)}
                        aria-label="Decrease"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-xl font-bold leading-none text-slate-700 shadow-sm active:scale-95"
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold">{qty}</span>
                      <button
                        onClick={() => add(p)}
                        aria-label="Increase"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-xl font-bold leading-none text-teal-700 shadow-sm active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 rounded-lg bg-slate-50 py-1 text-center text-[11px] font-medium text-slate-400">
                      Tap to add
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sticky checkout bar */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-20 mx-auto max-w-2xl px-4">
          <button
            onClick={() => setCheckoutOpen(true)}
            className="btn-brand flex w-full items-center justify-between px-5 py-3.5 text-base shadow-lg shadow-teal-700/25"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 px-1.5 text-sm">
                {itemCount}
              </span>
              item{itemCount > 1 ? "s" : ""}
            </span>
            <span>{editing ? "Review edit" : "Checkout"} · {formatINR(total)}</span>
          </button>
        </div>
      )}

      <CustomerPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(c) => {
          setCustomer(c);
          setPickerOpen(false);
        }}
      />

      <RecentSales open={recentOpen} onClose={() => setRecentOpen(false)} onEdit={loadSaleForEdit} />

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title={editing ? "Edit sale" : "Checkout"}>
        <Checkout
          lines={lines}
          total={total}
          customer={customer}
          editing={editing}
          onChangeQty={setQty}
          onPickCustomer={() => {
            setCheckoutOpen(false);
            setPickerOpen(true);
          }}
          onDeleted={() => {
            setCheckoutOpen(false);
            reset();
            loadProducts();
          }}
          onDone={(result) => {
            setCheckoutOpen(false);
            setSaved(result);
            reset();
            loadProducts();
          }}
        />
      </Modal>

      <Modal open={!!saved} onClose={() => setSaved(null)} title={saved?.wasEdit ? "Sale updated ✅" : "Sale saved ✅"}>
        {saved && <SaleSuccess saved={saved} onClose={() => setSaved(null)} />}
      </Modal>
    </div>
  );
}

function Checkout({
  lines,
  total,
  customer,
  editing,
  onChangeQty,
  onPickCustomer,
  onDone,
  onDeleted,
}: {
  lines: { product: Product; qty: number }[];
  total: number;
  customer: Customer | null;
  editing: { id: string; mode: PaymentMode; paid: number } | null;
  onChangeQty: (id: string, qty: number) => void;
  onPickCustomer: () => void;
  onDone: (r: {
    lines: { product_name: string; qty: number; line_total: number }[];
    total: number;
    paid: number;
    balance: number;
    customer: Customer | null;
    wasEdit: boolean;
  }) => void;
  onDeleted: () => void;
}) {
  const supabase = createClient();
  const [mode, setMode] = useState<PaymentMode>(editing?.mode ?? "cash");
  const [partialPaid, setPartialPaid] = useState(
    editing && editing.mode === "partial" ? String(editing.paid) : "",
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paid = mode === "cash" ? total : mode === "udhar" ? 0 : Number(partialPaid) || 0;
  const credit = total - paid;

  async function save() {
    setError(null);
    if (mode !== "cash" && !customer) {
      setError("Select a customer for udhar/partial (walk-in must pay cash).");
      return;
    }
    setSaving(true);

    const itemsPayload = lines.map((l) => ({
      product_id: l.product.id.startsWith("tmp-") ? null : l.product.id,
      product_name: l.product.name,
      qty: l.qty,
      unit_price: Number(l.product.price),
    }));

    const { error: rpcErr } = editing
      ? await supabase.rpc("update_sale", {
          p_sale_id: editing.id,
          p_customer_id: customer?.id ?? null,
          p_paid_amount: paid,
          p_payment_mode: mode,
          p_note: null,
          p_items: itemsPayload,
        })
      : await supabase.rpc("create_sale", {
          p_customer_id: customer?.id ?? null,
          p_paid_amount: paid,
          p_payment_mode: mode,
          p_note: null,
          p_items: itemsPayload,
        });

    if (rpcErr) {
      setSaving(false);
      setError(rpcErr.message);
      return;
    }

    let balance = 0;
    if (customer) {
      const { data } = await supabase
        .from("customer_balances")
        .select("balance")
        .eq("customer_id", customer.id)
        .single();
      balance = Number(data?.balance ?? 0);
    }

    setSaving(false);
    onDone({
      lines: lines.map((l) => ({
        product_name: l.product.name,
        qty: l.qty,
        line_total: l.qty * Number(l.product.price),
      })),
      total,
      paid,
      balance,
      customer,
      wasEdit: !!editing,
    });
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("Delete this sale? This cannot be undone.")) return;
    setDeleting(true);
    const { error } = await supabase.rpc("delete_sale", { p_sale_id: editing.id });
    setDeleting(false);
    if (error) setError(error.message);
    else onDeleted();
  }

  return (
    <div className="space-y-4">
      {/* Customer */}
      <button onClick={onPickCustomer} className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
        <span className="text-slate-500">Customer</span>
        <span className="font-medium">{customer ? customer.name : "Walk-in (cash)"} ▾</span>
      </button>

      {/* Items */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Items</p>
        <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
          {lines.map((l) => (
            <li key={l.product.id} className="flex items-center justify-between px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.product.name}</p>
                <p className="text-xs text-slate-500">{formatINR(Number(l.product.price))} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onChangeQty(l.product.id, l.qty - 1)} className="h-7 w-7 rounded-full bg-slate-100 text-lg leading-none">−</button>
                <span className="w-6 text-center font-medium">{l.qty}</span>
                <button onClick={() => onChangeQty(l.product.id, l.qty + 1)} className="h-7 w-7 rounded-full bg-slate-100 text-lg leading-none">+</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Payment */}
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment</p>
        <div className="grid grid-cols-3 gap-2">
          {(["cash", "udhar", "partial"] as PaymentMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg py-2.5 text-sm font-medium capitalize ring-1 ${
                mode === m ? "bg-brand text-white ring-brand" : "bg-white text-slate-700 ring-slate-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {mode === "partial" && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Amount paid now (₹)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max={total}
              value={partialPaid}
              onChange={(e) => setPartialPaid(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="0"
            />
          </label>
        )}
        {credit > 0 && (
          <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
            Udhar (credit): <strong>{formatINR(credit)}</strong> added to the balance.
          </p>
        )}
      </div>

      {/* Total + submit (clearly separated footer) */}
      <div className="space-y-3 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatINR(total)}</span>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button onClick={save} disabled={saving || lines.length === 0} className="btn-brand w-full py-3">
          {saving ? "Saving…" : editing ? `Update sale · ${formatINR(total)}` : `Save sale · ${formatINR(total)}`}
        </button>

        {editing && (
          <button
            onClick={remove}
            disabled={deleting}
            className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "🗑 Delete this sale"}
          </button>
        )}
      </div>
    </div>
  );
}

function SaleSuccess({
  saved,
  onClose,
}: {
  saved: {
    lines: { product_name: string; qty: number; line_total: number }[];
    total: number;
    paid: number;
    balance: number;
    customer: Customer | null;
    wasEdit: boolean;
  };
  onClose: () => void;
}) {
  const supabase = createClient();
  const canMessage = saved.customer && whatsappUrl(saved.customer.phone, "x");

  async function send() {
    if (!saved.customer) return;
    await sendMessage(supabase, saved.customer.phone, {
      customerId: saved.customer.id,
      type: "purchase",
      body: buildPurchaseMessage({
        customerName: saved.customer.name,
        date: new Date(),
        lines: saved.lines,
        total: saved.total,
        paid: saved.paid,
        balance: saved.balance,
      }),
    });
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-50 p-3 text-sm">
        <div className="flex justify-between"><span>Total</span><span className="font-medium">{formatINR(saved.total)}</span></div>
        <div className="flex justify-between"><span>Paid</span><span className="font-medium">{formatINR(saved.paid)}</span></div>
        {saved.customer && (
          <div className="flex justify-between"><span>New balance</span><span className="font-medium text-red-600">{formatINR(saved.balance)}</span></div>
        )}
      </div>

      {canMessage ? (
        <button onClick={send} className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700">
          📲 Send WhatsApp receipt
        </button>
      ) : saved.customer ? (
        <p className="text-center text-sm text-slate-400">No valid phone — add one to send WhatsApp.</p>
      ) : null}

      <button onClick={onClose} className="w-full rounded-xl border border-slate-300 py-2.5 font-medium">
        Done
      </button>
    </div>
  );
}
