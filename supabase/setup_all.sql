-- ============================================================================
-- Suraj Dairy Sales — COMPLETE one-shot database setup.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once (idempotent). Equivalent to running
-- migrations 0001 + 0002 + 0003 + seed together.
-- ============================================================================

-- ---- profiles + auto-create on signup -------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  role        text not null default 'staff' check (role in ('owner', 'staff')),
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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

-- ---- customers ------------------------------------------------------------
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text,
  address         text,
  opening_balance numeric(10,2) not null default 0,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id)
);
create index if not exists customers_phone_idx on public.customers (phone);

-- ---- products -------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  brand        text,
  category     text,
  photo_url    text,
  price        numeric(10,2) not null default 0,
  unit         text not null default 'pkt',
  track_stock  boolean not null default false,
  stock_count  numeric(10,2),
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists products_active_idx on public.products (is_active, sort_order);

-- ---- sales + items --------------------------------------------------------
create table if not exists public.sales (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid references public.customers(id),
  staff_id      uuid references public.profiles(id),
  sale_date     date not null default current_date,
  total_amount  numeric(10,2) not null default 0,
  paid_amount   numeric(10,2) not null default 0,
  payment_mode  text not null default 'cash' check (payment_mode in ('cash','udhar','partial')),
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists sales_customer_idx on public.sales (customer_id);
create index if not exists sales_date_idx on public.sales (sale_date);

create table if not exists public.sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references public.sales(id) on delete cascade,
  product_id   uuid references public.products(id),
  product_name text not null,
  qty          numeric(10,2) not null default 1,
  unit_price   numeric(10,2) not null default 0,
  line_total   numeric(10,2) not null default 0
);
create index if not exists sale_items_sale_idx on public.sale_items (sale_id);

-- ---- payments + message log -----------------------------------------------
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

create table if not exists public.messages_log (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  sale_id     uuid references public.sales(id),
  type        text not null check (type in ('purchase','reminder','monthly','custom')),
  channel     text not null default 'whatsapp',
  content     text,
  status      text not null default 'sent',
  sent_at     timestamptz not null default now(),
  sent_by     uuid references public.profiles(id)
);
create index if not exists messages_customer_idx on public.messages_log (customer_id);

-- ---- live balance view ----------------------------------------------------
create or replace view public.customer_balances as
select
  c.id as customer_id, c.name, c.phone,
  c.opening_balance
    + coalesce((select sum(s.total_amount - s.paid_amount) from public.sales s where s.customer_id = c.id), 0)
    - coalesce((select sum(p.amount) from public.payments p where p.customer_id = c.id), 0) as balance
from public.customers c;

-- ---- Row Level Security ----------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.customers    enable row level security;
alter table public.products     enable row level security;
alter table public.sales        enable row level security;
alter table public.sale_items   enable row level security;
alter table public.payments     enable row level security;
alter table public.messages_log enable row level security;

drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_read"   on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['customers','products','sales','sale_items','payments','messages_log']
  loop
    execute format('drop policy if exists "%s_all" on public.%I;', t, t);
    execute format('create policy "%s_all" on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');', t, t);
  end loop;
end $$;

-- ---- Realtime (ignore if already added) -----------------------------------
do $$
declare t text;
begin
  foreach t in array array['sales','sale_items','payments','customers','products']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---- Storage bucket for product photos ------------------------------------
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

drop policy if exists "product photos public read"            on storage.objects;
drop policy if exists "product photos authenticated insert"   on storage.objects;
drop policy if exists "product photos authenticated update"   on storage.objects;
drop policy if exists "product photos authenticated delete"   on storage.objects;
create policy "product photos public read"          on storage.objects for select using (bucket_id = 'product-photos');
create policy "product photos authenticated insert" on storage.objects for insert to authenticated with check (bucket_id = 'product-photos');
create policy "product photos authenticated update" on storage.objects for update to authenticated using (bucket_id = 'product-photos');
create policy "product photos authenticated delete" on storage.objects for delete to authenticated using (bucket_id = 'product-photos');

-- ---- Atomic sale creation RPC ---------------------------------------------
create or replace function public.create_sale(
  p_customer_id uuid, p_paid_amount numeric, p_payment_mode text, p_note text, p_items jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_sale_id uuid; v_total numeric := 0;
begin
  select coalesce(sum((it->>'qty')::numeric * (it->>'unit_price')::numeric), 0)
    into v_total from jsonb_array_elements(p_items) it;

  insert into public.sales (customer_id, staff_id, total_amount, paid_amount, payment_mode, note)
  values (p_customer_id, auth.uid(), v_total, coalesce(p_paid_amount, 0), p_payment_mode, p_note)
  returning id into v_sale_id;

  insert into public.sale_items (sale_id, product_id, product_name, qty, unit_price, line_total)
  select v_sale_id, nullif(it->>'product_id','')::uuid, it->>'product_name',
         (it->>'qty')::numeric, (it->>'unit_price')::numeric,
         (it->>'qty')::numeric * (it->>'unit_price')::numeric
  from jsonb_array_elements(p_items) it;

  update public.products p set stock_count = p.stock_count - x.qty
  from (
    select (it->>'product_id')::uuid as pid, sum((it->>'qty')::numeric) as qty
    from jsonb_array_elements(p_items) it
    where nullif(it->>'product_id','') is not null group by 1
  ) x
  where p.id = x.pid and p.track_stock and p.stock_count is not null;

  return v_sale_id;
end;
$$;
grant execute on function public.create_sale to authenticated;

-- ---- Seed starter Amul products (only if the table is empty) --------------
do $$
begin
  if not exists (select 1 from public.products) then
    insert into public.products (name, brand, category, price, unit, sort_order) values
      ('Amul Gold (Full Cream) 500ml',  'Amul', 'Milk',        33, 'pkt', 10),
      ('Amul Gold (Full Cream) 1L',     'Amul', 'Milk',        66, 'pkt', 11),
      ('Amul Taaza (Toned) 500ml',      'Amul', 'Milk',        27, 'pkt', 20),
      ('Amul Taaza (Toned) 1L',         'Amul', 'Milk',        54, 'pkt', 21),
      ('Amul Shakti (Std) 500ml',       'Amul', 'Milk',        30, 'pkt', 30),
      ('Amul Cow Milk 500ml',           'Amul', 'Milk',        27, 'pkt', 40),
      ('Amul Cow Milk 1L',              'Amul', 'Milk',        54, 'pkt', 41),
      ('Amul Buffalo Milk 500ml',       'Amul', 'Milk',        35, 'pkt', 50),
      ('Amul Slim & Trim (DTM) 500ml',  'Amul', 'Milk',        25, 'pkt', 60),
      ('Amul Masti Dahi 400g',          'Amul', 'Curd',        35, 'cup', 70),
      ('Amul Masti Buttermilk 500ml',   'Amul', 'Buttermilk',  15, 'pkt', 80),
      ('Amul Lassi 200ml',              'Amul', 'Beverage',    20, 'pkt', 90),
      ('Amul Butter 100g',              'Amul', 'Butter',      62, 'pcs', 100),
      ('Amul Ghee 500ml',               'Amul', 'Ghee',       330, 'jar', 110);
  end if;
end $$;

-- Done. Next: Authentication → turn OFF "Confirm email", then add a user.
