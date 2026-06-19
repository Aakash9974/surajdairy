# Suraj Dairy Sales — Setup

A PWA (installable on web, tablet and phone) for milk sales, customers, the udhar
(credit) ledger, reports and WhatsApp customer messages. Built with **Next.js +
Supabase**.

## 1. Create a Supabase project (free)

1. Go to <https://supabase.com> → **New project**. Pick a region close to you
   (e.g. Mumbai / `ap-south-1`).
2. Open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Configure the app

Edit `.env.local` (already created) and replace the placeholders:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_DAIRY_NAME=Suraj Dairy
```

## 3. Create the database

In the Supabase dashboard → **SQL Editor**, run these in order:

1. `supabase/migrations/0001_init.sql` — tables, balance view, security, realtime
2. `supabase/seed.sql` — starter Amul products (optional; you can also add your own)

## 4. Create your login

In Supabase → **Authentication → Users → Add user**, create an email + password
for the owner. (Disable "Confirm email" under Authentication → Providers → Email,
or use the "Auto Confirm" option, so you can log in immediately.) A matching
`profiles` row is created automatically.

To mark someone as the owner, in SQL Editor:

```sql
update public.profiles set role = 'owner' where id = (
  select id from auth.users where email = 'you@example.com'
);
```

## 5. Run it

```bash
npm run dev
```

Open <http://localhost:3000>, sign in, and you're on the dashboard.

### Install on a tablet / phone

Open the deployed URL (or your PC's LAN address) in Chrome/Safari on the device →
browser menu → **Add to Home Screen**. It then runs full-screen like a native app.

## Build status

- ✅ Phase 0 — scaffold, auth, app shell, schema, seed (this commit)
- ⬜ Phase 1 — inventory UI + photo upload
- ⬜ Phase 2 — customers
- ⬜ Phase 3 — POS sale flow (realtime)
- ⬜ Phase 4 — WhatsApp purchase message
- ⬜ Phase 5 — ledger, reports, reminders
- ⬜ Phase 6 — PWA polish + deploy to Vercel
