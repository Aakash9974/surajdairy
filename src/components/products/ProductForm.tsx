"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";

const CATEGORIES = ["Milk", "Curd", "Buttermilk", "Beverage", "Butter", "Ghee", "Paneer", "Other"];
const UNITS = ["pkt", "litre", "ml", "kg", "g", "pcs", "cup", "jar"];

type Props = {
  product?: Product | null;
  onSaved: () => void;
  onClose: () => void;
};

export default function ProductForm({ product, onSaved, onClose }: Props) {
  const supabase = createClient();
  const editing = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "Amul");
  const [category, setCategory] = useState(product?.category ?? "Milk");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "pkt");
  const [trackStock, setTrackStock] = useState(product?.track_stock ?? false);
  const [stockCount, setStockCount] = useState(product?.stock_count?.toString() ?? "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(product?.photo_url ?? null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-photos")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("product-photos").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      brand: brand.trim() || null,
      category: category || null,
      price: Number(price) || 0,
      unit,
      track_stock: trackStock,
      stock_count: trackStock && stockCount !== "" ? Number(stockCount) : null,
      is_active: isActive,
      photo_url: photoUrl,
    };

    const { error: dbErr } = editing
      ? await supabase.from("products").update(payload).eq("id", product!.id)
      : await supabase.from("products").insert(payload);

    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-2xl">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            "🥛"
          )}
        </div>
        <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Add photo"}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
        </label>
      </div>

      <Field label="Name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Amul Gold 500ml"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Brand">
          <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (₹)">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputCls}
            placeholder="33"
          />
        </Field>
        <Field label="Unit">
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} />
        Track stock count
      </label>
      {trackStock && (
        <Field label="Stock count">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={stockCount}
            onChange={(e) => setStockCount(e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active (show in sales)
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || uploading}
          className="flex-1 rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : editing ? "Save" : "Add product"}
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
