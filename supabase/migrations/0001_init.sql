-- Suraj Dairy Sales — initial schema
-- Run this in the Supabase SQL editor (or via the Supabase CLI).

-- ----------------------------------------------------------------------------
-- profiles: staff/owner accounts, linked 1:1 to Supabase auth users
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  role        text not null default 'staff' check (role in ('owner', 'staff')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text,                       -- E.164 or local; used for WhatsApp
  address         text,
  opening_balance numeric(10,2) not null default 0,  -- udhar carried in at setup
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id)
);
create index if not exists customers_name_idx on public.customers using gin (to_tsvector('simple', name));
create index if not exists customers_phone_idx on public.customers (phone);

-- ----------------------------------------------------------------------------
-- products (inventory)
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  brand        text,
  category     text,                          -- e.g. Milk, Curd, Buttermilk
  photo_url    text,
  price        numeric(10,2) not null default 0,
  unit         text not null default 'pkt',   -- pkt, litre, kg, pcs
  track_stock  boolean not null default false,
  stock_count  numeric(10,2),                 -- optional, only if track_stock
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists products_active_idx on public.products (is_active, sort_order);

-- ----------------------------------------------------------------------------
-- sales (one bill) + sale_items (the lines on that bill)
-- ----------------------------------------------------------------------------
create table if not exists public.sales (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid references public.customers(id),
  staff_id      uuid references public.profiles(id),
  sale_date     date not null default current_date,
  total_amount  numeric(10,2) not null default 0,
  paid_amount   numeric(10,2) not null default 0,   -- paid at time of sale
  payment_mode  text not null default 'cash' check (payment_mode in ('cash', 'udhar', 'partial')),
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists sales_customer_idx on public.sales (customer_id);
create index if not exists sales_date_idx on public.sales (sale_date);

create table if not exists public.sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references public.sales(id) on delete cascade,
  product_id   uuid references public.products(id),
  product_name text not null,                 -- snapshot, so old bills stay correct
  qty          numeric(10,2) not null default 1,
  unit_price   numeric(10,2) not null default 0,
  line_total   numeric(10,2) not null default 0
);
create index if not exists sale_items_sale_idx on public.sale_items (sale_id);

-- ----------------------------------------------------------------------------
-- payments: customer clearing their udhar later
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id),
  amount        numeric(10,2) not null,
  payment_date  date not null default current_date,
  mode          text not null default 'cash',
  note          text,
  staff_id      uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index if not exists payments_customer_idx on public.payments (customer_id);

-- ----------------------------------------------------------------------------
-- messages_log: what was sent to customers (purchase msg, reminders, etc.)
-- ----------------------------------------------------------------------------
create table if not exists public.messages_log (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  sale_id     uuid references public.sales(id),
  type        text not null check (type in ('purchase', 'reminder', 'monthly', 'custom')),
  channel     text not null default 'whatsapp',
  content     text,
  status      text not null default 'sent',
  sent_at     timestamptz not null default now(),
  sent_by     uuid references public.profiles(id)
);
create index if not exists messages_customer_idx on public.messages_log (customer_id);

-- ----------------------------------------------------------------------------
-- customer_balances: live outstanding balance per customer
--   balance > 0  => customer owes the dairy (udhar)
--   balance = opening + sum(unpaid on sales) - sum(payments)
-- ----------------------------------------------------------------------------
create or replace view public.customer_balances as
select
  c.id   as customer_id,
  c.name,
  c.phone,
  c.opening_balance
    + coalesce((select sum(s.total_amount - s.paid_amount) from public.sales s where s.customer_id = c.id), 0)
    - coalesce((select sum(p.amount) from public.payments p where p.customer_id = c.id), 0)
    as balance
from public.customers c;

-- ----------------------------------------------------------------------------
-- Row Level Security: single dairy, all signed-in staff have full access.
-- (Tighten to owner-only deletes later if needed.)
-- ----------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.customers    enable row level security;
alter table public.products     enable row level security;
alter table public.sales        enable row level security;
alter table public.sale_items   enable row level security;
alter table public.payments     enable row level security;
alter table public.messages_log enable row level security;

-- Profiles: a user can read all profiles, update only their own.
create policy "profiles_read"   on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- All other tables: any authenticated staff member may do everything.
do $$
declare t text;
begin
  foreach t in array array['customers','products','sales','sale_items','payments','messages_log']
  loop
    execute format('create policy "%s_all" on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');', t, t);
  end loop;
end $$;

-- Realtime: broadcast changes so all devices stay in sync.
alter publication supabase_realtime add table public.sales, public.sale_items, public.payments, public.customers, public.products;
