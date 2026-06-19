# Suraj Dairy Sales — Requirements

_Last updated: 2026-06-19_

## 1. Purpose

A sales application for **Suraj Dairy**, a small dairy, to record customer milk
purchases, track outstanding credit ("udhar"), message customers, and run basic
reports — usable on web, tablet and phone, all in sync during peak sales.

## 2. Actors

- **Owner** — full access, manages staff, products, reports.
- **Staff** — runs the sales counter, manages customers/sales.
- **Customer** — does NOT log in. Only receives WhatsApp messages.

## 3. Functional requirements

### FR-1 Authentication
- Email/password login for owner & staff (Supabase Auth).
- Owner role flag controls owner-only actions (later: staff management).

### FR-2 Inventory / Products
- Pre-seeded common Amul products (name, brand, category, price, unit).
- Add / edit / delete products.
- Upload a product photo (shown in the sales grid).
- Optional stock count per product (owner may ignore it).
- Active/inactive toggle (hide without deleting).

### FR-3 Customers
- Add / edit / search customers (name, phone, address).
- Opening balance (udhar carried in at setup).
- Active/inactive.

### FR-4 Point of Sale (POS)
- Select a customer (or walk-in / cash).
- Tap products to build a cart, adjust quantity.
- Choose payment: **cash** (paid in full), **udhar** (all on credit), or
  **partial** (part paid, rest on credit).
- Save the sale; updates the customer balance; syncs live to other devices.

### FR-5 Customer messaging (WhatsApp)
- After a sale, one-tap WhatsApp message to the customer with: items, date,
  amount, **current balance**, and a greeting.
- Pluggable provider — start with click-to-send (free), allow auto SMS / WhatsApp
  API later without rewriting callers.
- Log every message sent (`messages_log`).

### FR-6 Ledger, reports & reminders
- Per-customer ledger (purchases, payments, running balance).
- Record a payment (customer clears udhar).
- Reports: sales by day/period, by product, by customer; outstanding total.
- Defaulter list (who owes, how much, how old).
- Payment reminder + monthly reminder messages (WhatsApp).

## 4. Non-functional requirements

- **Multi-device live sync** (Supabase Realtime) — fast during peak sales.
- **PWA** — installable to home screen on tablet/phone, works offline for
  viewing; one codebase for web + mobile.
- **India context** — INR currency, en-IN formatting, WhatsApp-first messaging,
  no SMS DLT dependency at launch.
- **Simple & fast UI** — large tap targets, minimal steps to complete a sale.
- **Low cost** — Supabase + Vercel free tiers.

## 5. Out of scope (for now)

- Customer self-service login/portal.
- Multi-dairy SaaS / tenancy.
- Automatic recurring subscriptions / route delivery planning.
- GST invoicing / accounting export (can add later).
