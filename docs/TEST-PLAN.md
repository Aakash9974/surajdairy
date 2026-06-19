# Suraj Dairy Sales — Local Test Plan

_Last updated: 2026-06-19_

Run through this after connecting Supabase (`SETUP.md`) to verify each phase.

## Setup smoke test
- [ ] `npm run dev` starts without errors.
- [ ] Visiting `/` while logged out redirects to `/login`.
- [ ] Login with the owner account → lands on `/dashboard`.
- [ ] Dashboard shows tiles (no "Connect Supabase" banner once keys are set).

## Phase 1 — Inventory
- [ ] Seeded Amul products appear in the grid.
- [ ] Add a product (name, price, category) → appears immediately.
- [ ] Edit price → reflected; open app on a 2nd device/tab → updates live.
- [ ] Upload a photo → shows on the card.
- [ ] Toggle stock tracking + set count; delete a product (with confirm).

## Phase 2 — Customers
- [ ] Add customer with opening balance → shows in list with that balance.
- [ ] Search by name/phone works.
- [ ] Edit customer details persists.

## Phase 3 — POS sale
- [ ] Pick a customer, tap products, change qty → total is correct.
- [ ] Cash sale → paid = total; balance unchanged.
- [ ] Udhar sale → balance increases by total.
- [ ] Partial → balance increases by (total − paid).
- [ ] Sale appears on a second device live.

## Phase 4 — WhatsApp message
- [ ] After a sale, "Send WhatsApp" opens wa.me with items + balance + greeting.
- [ ] Message is logged (visible later in customer ledger / messages).

## Phase 5 — Ledger & reports
- [ ] Customer ledger lists purchases + payments with running balance.
- [ ] Record a payment → balance decreases.
- [ ] Sales report totals match the day's sales.
- [ ] Defaulter list shows customers with balance > 0.
- [ ] Reminder opens prefilled WhatsApp.

## Phase 6 — PWA
- [ ] "Add to Home Screen" installs; opens full-screen.
- [ ] Basic offline: app shell loads without network.
