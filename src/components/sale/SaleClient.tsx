"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/format";
import type { Customer, Product, PaymentMode } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import CustomerPicker from "./CustomerPicker";
import { sendMessage, buildPurchaseMessage, whatsappUrl } from "@/lib/messaging";

type Cart = Record<string, { product: Product; qty: number }>;

export default function SaleClient() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [saved, setSaved] = useState<null | {
    lines: { product_name: string; qty: number; line_total: number }[];
    total: number;
    paid: number;
    balance: number;
    customer: Customer | null;
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
  const total = useMemo(
    () => lines.reduce((s, l) => s + l.qty * Number(l.product.price), 0),
    [lines],
  );
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
  }

  return (
    <div className="space-y-4">
      {/* Customer bar */}
      <button
        onClick={() => setPickerOpen(true)}
        className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left ring-1 ring-slate-200"
      >
        <span className="text-sm text-slate-500">Customer</span>
        <span className="font-medium">{customer ? customer.name : "Walk-in (cash)"} ▾</span>
      </button>

      {/* Product grid */}
      {products.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          No active products. Add some in Inventory.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {products.map((p) => {
            const qty = cart[p.id]?.qty ?? 0;
            return (
              <button
                key={p.id}
                onClick={() => add(p)}
                className={`relative flex flex-col items-center rounded-xl bg-white p-2 ring-1 transition ${
                  qty > 0 ? "ring-2 ring-brand" : "ring-slate-200"
                }`}
              >
                {qty > 0 && (
                  <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
                    {qty}
                  </span>
                )}
                <div className="mb-1 flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-xl">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "🥛"
                  )}
                </div>
                <span className="line-clamp-2 text-center text-[11px] leading-tight">{p.name}</span>
                <span className="text-xs font-semibold text-brand">{formatINR(p.price)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sticky checkout bar */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-2xl px-4">
          <button
            onClick={() => setCheckoutOpen(true)}
            className="flex w-full items-center justify-between rounded-xl bg-brand px-5 py-3.5 font-semibold text-white shadow-lg"
          >
            <span>{itemCount} item{itemCount > 1 ? "s" : ""}</span>
            <span>Checkout · {formatINR(total)}</span>
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

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Checkout">
        <Checkout
          lines={lines}
          total={total}
          customer={customer}
          onChangeQty={setQty}
          onPickCustomer={() => {
            setCheckoutOpen(false);
            setPickerOpen(true);
          }}
          onDone={(result) => {
            setCheckoutOpen(false);
            setSaved(result);
            reset();
            loadProducts();
          }}
        />
      </Modal>

      {/* Success + WhatsApp */}
      <Modal open={!!saved} onClose={() => setSaved(null)} title="Sale saved ✅">
        {saved && (
          <SaleSuccess
            saved={saved}
            onClose={() => setSaved(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function Checkout({
  lines,
  total,
  customer,
  onChangeQty,
  onPickCustomer,
  onDone,
}: {
  lines: { product: Product; qty: number }[];
  total: number;
  customer: Customer | null;
  onChangeQty: (id: string, qty: number) => void;
  onPickCustomer: () => void;
  onDone: (r: {
    lines: { product_name: string; qty: number; line_total: number }[];
    total: number;
    paid: number;
    balance: number;
    customer: Customer | null;
  }) => void;
}) {
  const supabase = createClient();
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [partialPaid, setPartialPaid] = useState("");
  const [saving, setSaving] = useState(false);
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
      product_id: l.product.id,
      product_name: l.product.name,
      qty: l.qty,
      unit_price: Number(l.product.price),
    }));

    const { error: rpcErr } = await supabase.rpc("create_sale", {
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

    // New balance for the success message.
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
    });
  }

  return (
    <div className="space-y-4">
      <button onClick={onPickCustomer} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-500">Customer</span>
        <span className="font-medium">{customer ? customer.name : "Walk-in (cash)"} ▾</span>
      </button>

      <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
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

      <div className="flex items-center justify-between text-lg font-semibold">
        <span>Total</span>
        <span>{formatINR(total)}</span>
      </div>

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
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="0"
          />
        </label>
      )}

      {credit > 0 && (
        <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
          Udhar (credit): <strong>{formatINR(credit)}</strong> will be added to the balance.
        </p>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        onClick={save}
        disabled={saving || lines.length === 0}
        className="w-full rounded-lg bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {saving ? "Saving…" : `Save sale · ${formatINR(total)}`}
      </button>
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
      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <div className="flex justify-between"><span>Total</span><span className="font-medium">{formatINR(saved.total)}</span></div>
        <div className="flex justify-between"><span>Paid</span><span className="font-medium">{formatINR(saved.paid)}</span></div>
        {saved.customer && (
          <div className="flex justify-between"><span>New balance</span><span className="font-medium text-red-600">{formatINR(saved.balance)}</span></div>
        )}
      </div>

      {canMessage ? (
        <button onClick={send} className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700">
          📲 Send WhatsApp receipt
        </button>
      ) : saved.customer ? (
        <p className="text-center text-sm text-slate-400">No valid phone — add one to send WhatsApp.</p>
      ) : null}

      <button onClick={onClose} className="w-full rounded-lg border border-slate-300 py-2.5 font-medium">
        Done / New sale
      </button>
    </div>
  );
}
