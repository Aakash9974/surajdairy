# Suraj Dairy Sales — Roadmap & Acceptance Criteria

_Last updated: 2026-06-19_

Each phase is shippable. ✅ = done, 🔨 = in progress, ⬜ = not started.
**Always update `PROGRESS.md` after finishing a phase.**

## Phase 0 — Scaffold & foundation ✅
- [x] Next.js PWA + Tailwind + Supabase clients + auth + app shell + nav
- [x] Full schema (`0001_init.sql`), storage (`0002_storage.sql`), seed
- **Accept:** `npm run build` passes; login → dashboard works once Supabase is set.

## Phase 1 — Inventory & products ✅
- [x] Product grid with photos, price, category
- [x] Add / edit / delete product (modal form)
- [x] Photo upload to Supabase Storage
- [x] Optional stock toggle + count; active/inactive
- [x] Realtime: product changes reflect on all devices
- **Accept:** owner can manage the catalogue; seeded Amul items appear.

## Phase 2 — Customers ✅
- [x] Customer list with live balance + search
- [x] Add / edit customer (name, phone, address, opening balance)
- [x] Customer detail page (ledger placeholder until P5)
- **Accept:** can add/find customers; balance shows from the view.

## Phase 3 — POS sale flow ✅
- [x] Pick customer (or walk-in/cash)
- [x] Tap products → cart, qty +/−, running total
- [x] Payment: cash / udhar / partial (paid amount)
- [x] Save sale + items atomically; update balance; realtime
- **Accept:** a sale records correctly and the balance changes as expected.

## Phase 4 — Purchase WhatsApp message ✅
- [x] `lib/messaging` provider interface + WhatsApp click-to-send
- [x] After-sale: one-tap message (items, date, amount, balance, greeting)
- [x] Log to `messages_log`
- **Accept:** tapping send opens WhatsApp with a correct prefilled message.

## Phase 5 — Ledger, reports & reminders ✅
- [x] Customer ledger (purchases + payments + running balance)
- [x] Record payment (clear udhar)
- [x] Reports: sales by day/period, by product, by customer; outstanding total
- [x] Defaulter list; payment + monthly reminder (WhatsApp)
- **Accept:** reports reconcile with sales; reminders open prefilled WhatsApp.

## Phase 6 — PWA polish & deploy ✅
- [x] App icons (generated), offline service worker, manifest (native "Add to Home Screen")
- [x] `DEPLOYMENT.md` runbook (Vercel + Supabase prod)
- [ ] Custom install prompt — deferred (browser's native install is used)
- [ ] Role checks (owner-only deletes) — deferred; single-dairy trust model, all
      authenticated staff have full access via RLS. Add later if needed.
- **Accept:** installs to home screen; deploys from GitHub to Vercel.
