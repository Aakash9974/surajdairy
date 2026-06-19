# Suraj Dairy Sales — Deployment Runbook

_Last updated: 2026-06-19_

Deploys the PWA to **Vercel** (auto-builds from GitHub) with **Supabase** as the
database. All free-tier.

## Prerequisites
- GitHub repo: https://github.com/Aakash9974/surajdairy (code pushed).
- A Supabase project (can reuse your local one, or make a separate "prod" one).

## 1. Prepare Supabase (production)
1. In the Supabase project → **SQL Editor**, run **`supabase/setup_all.sql`** —
   one file that creates everything (tables, security, realtime, storage, the
   sale RPCs incl. `create_sale`/`update_sale`/`delete_sale`, and seed products).
   (Or run the individual `migrations/0001…0004` + `seed.sql` in order.)
2. **Authentication → Providers → Email**: enable, and turn **off** "Confirm email"
   (or pre-confirm users) so staff can log in immediately.
3. **Authentication → Users → Add user**: create the owner account.
4. Mark owner role (SQL Editor):
   ```sql
   update public.profiles set role = 'owner'
   where id = (select id from auth.users where email = 'OWNER_EMAIL');
   ```
5. **Project Settings → API**: copy the Project URL and anon public key.

## 2. Push code to GitHub
```bash
git add -A
git commit -m "Suraj Dairy Sales"
git branch -M main
git remote add origin https://github.com/Aakash9974/surajdairy.git   # first time only
git push -u origin main
```

## 3. Deploy on Vercel
1. Go to https://vercel.com → **Add New → Project** → import `Aakash9974/surajdairy`.
2. Framework preset: **Next.js** (auto-detected). Leave build/output defaults.
3. **Environment Variables** — add:
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
   | `NEXT_PUBLIC_DAIRY_NAME` | `Suraj Dairy` |
4. **Deploy**. Vercel gives a URL like `https://surajdairy.vercel.app`.

Every push to `main` now auto-deploys.

## 4. Configure Supabase for the live URL
- **Authentication → URL Configuration**: set **Site URL** to your Vercel URL and
  add it to **Redirect URLs**.

## 5. Install on devices
- Open the Vercel URL on the tablet/phone in Chrome/Safari → menu →
  **Add to Home Screen**. Runs full-screen like a native app, synced live.

## Rollback
- Vercel → Deployments → pick a previous successful deploy → **Promote to
  Production**. (Database changes are not rolled back automatically.)

## Notes
- `.env.local` is git-ignored; never commit real keys. Prod keys live in Vercel.
- The anon key is safe in the browser — Row Level Security protects the data.
