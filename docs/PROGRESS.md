# Suraj Dairy Sales — Progress Log

> **READ THIS FIRST.** Single source of truth for where the build is and what's
> next. Update it at the end of every working session / phase.

_Last updated: 2026-06-19_

## Current state

- **Phase:** Phase 1 (Inventory) — starting.
- **Build:** `npm run build` passes (Phase 0).
- **Supabase:** not yet connected by user; `.env.local` has placeholders. App boots
  and shows a "Connect Supabase" banner until real keys + SQL are applied.
- **GitHub:** repo https://github.com/Aakash9974/surajdairy (remote to be wired).

## Done

- **Phase 0 ✅** — Next.js 16 + React 19 + Tailwind 4 PWA scaffold; Supabase
  client/server/proxy auth; login page; `(app)` shell + bottom nav; dashboard with
  live stat tiles; section stubs. Schema `0001_init.sql`, storage `0002_storage.sql`,
  `seed.sql` (14 Amul products). SDLC docs created.

## Next up (in order)

1. **Phase 1 — Inventory:** product grid + photos, add/edit/delete modal, photo
   upload to Storage, optional stock, realtime.
2. Phase 2 — Customers.
3. Phase 3 — POS sale flow.
4. Phase 4 — WhatsApp purchase message.
5. Phase 5 — Ledger, reports, reminders.
6. Phase 6 — PWA polish + deploy.

## Decisions / notes

- Next 16: use `proxy.ts` (not `middleware.ts`); `cookies()` is async.
- Use plain `<img>` for product photos (eslint rule disabled).
- Balance is computed by `customer_balances` view — never cache it on a column.
- Money in INR via `formatINR` in `src/lib/format.ts`.

## Open items for the user

- Create Supabase project + paste keys into `.env.local` (see `SETUP.md`).
- Run `supabase/migrations/*.sql` then `seed.sql` in Supabase SQL editor.
- Create owner login user in Supabase Auth.

## How to resume after context loss

1. Read this file, then `docs/ROADMAP.md` for the current phase's checklist.
2. Read `docs/ARCHITECTURE.md` for layout & patterns.
3. Continue the first unchecked item; tick boxes + update "Current state" here.
