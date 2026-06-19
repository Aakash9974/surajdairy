# Suraj Dairy Sales — Roadmap & Acceptance Criteria

_Last updated: 2026-06-19_

Each phase is shippable. ✅ = done, 🔨 = in progress, ⬜ = not started.
**Always update `PROGRESS.md` after finishing a phase.**

## Phase 0 — Scaffold & foundation ✅
- [x] Next.js PWA + Tailwind + Supabase clients + auth + app shell + nav
- [x] Full schema (`0001_init.sql`), storage (`0002_storage.sql`), seed
- **Accept:** `npm run build` passes; login → dashboard works once Supabase is set.

## Phase 1 — Inventory & products 🔨
- [ ] Product grid with photos, price, category
- [ ] Add / edit / delete product (modal form)
- [ ] Photo upload to Supabase Storage
- [ ] Optional stock toggle + count; active/inactive
- [ ] Realtime: product changes reflect on all devices
- **Accept:** owner can manage the catalogue; seeded Amul items appear.

## Phase 2 — Customers ⬜
- [ ] Customer list with live balance + search
- [ ] Add / edit customer (name, phone, address, opening balance)
- [ ] Customer detail page (ledger placeholder until P5)
- **Accept:** can add/find customers; balance shows from the view.

## Phase 3 — POS sale flow ⬜
- [ ] Pick customer (or walk-in/cash)
- [ ] Tap products → cart, qty +/−, running total
- [ ] Payment: cash / udhar / partial (paid amount)
- [ ] Save sale + items atomically; update balance; realtime
- **Accept:** a sale records correctly and the balance changes as expected.

## Phase 4 — Purchase WhatsApp message ⬜
- [ ] `lib/messaging` provider interface + WhatsApp click-to-send
- [ ] After-sale: one-tap message (items, date, amount, balance, greeting)
- [ ] Log to `messages_log`
- **Accept:** tapping send opens WhatsApp with a correct prefilled message.

## Phase 5 — Ledger, reports & reminders ⬜
- [ ] Customer ledger (purchases + payments + running balance)
- [ ] Record payment (clear udhar)
- [ ] Reports: sales by day/period, by product, by customer; outstanding total
- [ ] Defaulter list; payment + monthly reminder (WhatsApp)
- **Accept:** reports reconcile with sales; reminders open prefilled WhatsApp.

## Phase 6 — PWA polish & deploy ⬜
- [ ] App icons, offline shell / service worker, install prompt
- [ ] Role checks (owner-only where needed)
- [ ] `DEPLOYMENT.md` runbook verified (Vercel + Supabase prod)
- **Accept:** installs to home screen; deploys from GitHub to Vercel.
