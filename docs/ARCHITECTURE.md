# Suraj Dairy Sales — Architecture & Design

_Last updated: 2026-06-19_

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 16 (App Router) + React 19 + Tailwind 4** | One PWA codebase for web/tablet/phone |
| Backend / DB | **Supabase** (Postgres, Auth, Storage, Realtime) | Relational ledger + realtime sync + low cost |
| Messaging | **Pluggable module**; WhatsApp click-to-send first | Free, no India DLT; upgrade to API/SMS later |
| Hosting | **Vercel** (app) + **Supabase cloud** (data) | Free tiers, GitHub auto-deploy |

## Project layout

```
src/
  app/
    login/                  # public login page
    (app)/                  # authenticated shell (header + bottom nav)
      dashboard/            # stats + quick actions
      sale/                 # POS counter
      customers/            # list, new, [id] ledger
      products/             # inventory
      ledger/               # reports, defaulters, reminders
    layout.tsx              # root layout (PWA metadata)
  components/
    ui/                     # Modal, shared primitives
    products/, customers/, sale/, ledger/   # feature components
    AppNav.tsx, SignOutButton.tsx
  lib/
    supabase/               # client.ts, server.ts, middleware.ts (session)
    messaging/              # provider interface + whatsapp click-to-send
    types.ts, format.ts
  proxy.ts                  # Next 16 "proxy" (auth gate; was middleware)
supabase/
  migrations/0001_init.sql  # schema, balance view, RLS, realtime
  migrations/0002_storage.sql
  seed.sql                  # starter Amul products
docs/                       # this SDLC documentation
```

## Data model

Tables: `profiles`, `customers`, `products`, `sales`, `sale_items`,
`payments`, `messages_log`. View: `customer_balances`.

**Balance rule** (single source of truth):
```
balance = opening_balance
        + Σ(sales.total_amount − sales.paid_amount)   -- unpaid portion of each sale
        − Σ(payments.amount)                          -- later udhar clearances
```
`balance > 0` ⇒ customer owes the dairy. Computed by the `customer_balances` view
so the app never has to maintain a cached balance column.

`sale_items.product_name` / `unit_price` are **snapshots** so historical bills stay
correct even if a product is renamed or repriced.

## Data access patterns

- **Interactive pages** (POS, inventory, customers): Client Components using the
  browser Supabase client, with **Realtime subscriptions** for live sync.
- **Auth gate**: `proxy.ts` refreshes the session and redirects unauthenticated
  users to `/login`; the `(app)` layout double-checks on the server.
- **RLS**: every table requires an authenticated user; single-dairy trust model
  (all staff can read/write). Tighten to owner-only deletes later if needed.

## Messaging design (pluggable)

```
lib/messaging/
  types.ts        # MessageProvider interface, buildPurchaseMessage(), buildReminder()
  whatsapp.ts     # click-to-send: builds wa.me/<phone>?text=... link
  index.ts        # selects provider (env-driven); future: sms.ts, whatsappApi.ts
```
Callers build a message + open the provider link, then write a `messages_log` row.
Swapping to an automatic provider later means adding one file and changing the
selector — no caller changes.

## Key decisions log

- PWA over native — single codebase, fastest path, good enough on the counter.
- Supabase over Firebase — relational data (ledgers, SUM reports) fits Postgres.
- WhatsApp click-to-send first — zero cost, no DLT/business verification to launch.
- Balance as a view, not a stored column — avoids drift; reporting is just SQL.
- Next 16 uses `proxy.ts` (not `middleware.ts`) and async `cookies()`.
