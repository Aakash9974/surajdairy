# Suraj Dairy Sales — Tester Guide

Welcome! This is a sales app for a dairy: record customer milk purchases, track
credit ("udhar"), message customers on WhatsApp, and view reports. Please run
through the checklist below and note anything confusing or broken.

---

## Option A — Just test the app (recommended, nothing to install)

The owner gives you:

- **App URL:** `__________________________`  (e.g. https://surajdairy.vercel.app)
- **Login email:** `__________________________`
- **Login password:** `__________________________`

1. Open the URL on your phone, tablet, or computer.
2. Log in with the email + password above.
3. (Phone/tablet) To use it like a real app: browser menu → **Add to Home
   Screen**. It opens full-screen.
4. Work through the **Test checklist** below.

> Tip: open the app on **two devices at once** and make a sale on one — it should
> appear on the other within a second (live sync).

---

## Option B — Run it yourself from scratch

Only needed if you're setting up your own backend.

1. **Supabase** (free): https://supabase.com → New project (region: nearest).
2. **Database:** SQL Editor → New query → paste all of
   `supabase/setup_all.sql` → **Run**. (One file does everything.)
3. **Login:** Authentication → Sign In/Providers → Email → turn **OFF** "Confirm
   email". Then Authentication → Users → **Add user** (tick **Auto Confirm**).
4. **Keys:** Project Settings → API → copy **Project URL** + **anon public** key.
5. **App:** install Node 20+, then in the project folder:
   ```bash
   npm install
   cp .env.local.example .env.local   # then put your URL + anon key inside
   npm run dev
   ```
   Open http://localhost:3000 and log in.

---

## Test checklist

**Login**
- [ ] Can log in; wrong password is rejected.

**Inventory** (📦 tab)
- [ ] Amul products are listed with prices.
- [ ] Add a product (name + price). It appears immediately.
- [ ] Edit a price; upload a photo on a product.
- [ ] Delete a product (asks to confirm).

**Customers** (👥 tab)
- [ ] Add a customer (name, phone, opening balance).
- [ ] Search finds them by name/phone.
- [ ] Open a customer → details + balance show.

**Sell** (🛒 tab) — the main flow
- [ ] Pick a customer (or Walk-in).
- [ ] Tap products to add; change quantity; total updates.
- [ ] **Cash** sale → saves; customer balance unchanged.
- [ ] **Udhar** sale → balance increases by the bill amount.
- [ ] **Partial** → enter part paid; balance increases by the rest.
- [ ] After saving, tap **Send WhatsApp receipt** → WhatsApp opens with a
      prefilled message (items, total, balance). (Needs a valid phone on the customer.)

**Ledger & reports** (📒 tab)
- [ ] Outstanding tab lists customers who owe money.
- [ ] Tap **Reminder** → WhatsApp opens with a reminder message.
- [ ] Open a customer → **Record payment** → balance goes down.
- [ ] Reports tab: Today / This month / All totals look right; "By product" lists items.

**Multi-device / PWA**
- [ ] A sale on one device shows on a second device live.
- [ ] "Add to Home Screen" works and opens full-screen.

## How to report issues
For each problem note: which screen, what you did, what you expected, what
happened (a screenshot helps). Send them to the owner.
