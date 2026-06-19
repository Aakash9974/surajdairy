-- ============================================================================
-- Suraj Dairy Sales — SAMPLE / TEST data.
-- Paste into Supabase → SQL Editor → Run. Adds customers, sales, items and
-- payments so the dashboard, ledger and reports have something to show.
-- Safe to run once; re-running skips (it detects sample sales).
-- Requires the products from seed / setup_all.sql to exist.
-- ============================================================================
do $$
declare
  c_ramesh uuid; c_sunita uuid; c_imran uuid; c_priya uuid;
  p_gold uuid; p_taaza uuid; p_cow uuid; p_dahi uuid; p_butter uuid;
  s uuid;
begin
  if exists (select 1 from public.sales where note = 'sample') then
    raise notice 'Sample data already present — skipping.';
    return;
  end if;

  -- Look up product ids by name (null is fine; line still records by name).
  select id into p_gold   from public.products where name = 'Amul Gold (Full Cream) 500ml' limit 1;
  select id into p_taaza  from public.products where name = 'Amul Taaza (Toned) 500ml'     limit 1;
  select id into p_cow    from public.products where name = 'Amul Cow Milk 500ml'          limit 1;
  select id into p_dahi   from public.products where name = 'Amul Masti Dahi 400g'         limit 1;
  select id into p_butter from public.products where name = 'Amul Butter 100g'             limit 1;

  -- Customers (only if not already there).
  insert into public.customers (name, phone, address, opening_balance)
    select 'Ramesh Kumar', '9876543210', 'Gali 4, Patel Nagar', 0
    where not exists (select 1 from public.customers where name = 'Ramesh Kumar');
  insert into public.customers (name, phone, address, opening_balance)
    select 'Sunita Devi', '9811122233', 'Model Town', 50
    where not exists (select 1 from public.customers where name = 'Sunita Devi');
  insert into public.customers (name, phone, address, opening_balance)
    select 'Imran Shaikh', '9700055511', 'Old Market Rd', 0
    where not exists (select 1 from public.customers where name = 'Imran Shaikh');
  insert into public.customers (name, phone, address, opening_balance)
    select 'Priya Sharma', '9999000011', 'Sector 12', 0
    where not exists (select 1 from public.customers where name = 'Priya Sharma');

  select id into c_ramesh from public.customers where name = 'Ramesh Kumar' limit 1;
  select id into c_sunita from public.customers where name = 'Sunita Devi'  limit 1;
  select id into c_imran  from public.customers where name = 'Imran Shaikh' limit 1;
  select id into c_priya  from public.customers where name = 'Priya Sharma' limit 1;

  -- Sale 1 — Ramesh, today, full udhar (₹101 credit)
  insert into public.sales (customer_id, sale_date, total_amount, paid_amount, payment_mode, note)
    values (c_ramesh, current_date, 101, 0, 'udhar', 'sample') returning id into s;
  insert into public.sale_items (sale_id, product_id, product_name, qty, unit_price, line_total) values
    (s, p_gold, 'Amul Gold (Full Cream) 500ml', 2, 33, 66),
    (s, p_dahi, 'Amul Masti Dahi 400g',         1, 35, 35);

  -- Sale 2 — Ramesh, yesterday, cash
  insert into public.sales (customer_id, sale_date, total_amount, paid_amount, payment_mode, note)
    values (c_ramesh, current_date - 1, 27, 27, 'cash', 'sample') returning id into s;
  insert into public.sale_items (sale_id, product_id, product_name, qty, unit_price, line_total) values
    (s, p_taaza, 'Amul Taaza (Toned) 500ml', 1, 27, 27);

  -- Sale 3 — Sunita, today, partial (paid ₹50 of ₹81)
  insert into public.sales (customer_id, sale_date, total_amount, paid_amount, payment_mode, note)
    values (c_sunita, current_date, 81, 50, 'partial', 'sample') returning id into s;
  insert into public.sale_items (sale_id, product_id, product_name, qty, unit_price, line_total) values
    (s, p_cow, 'Amul Cow Milk 500ml', 3, 27, 81);

  -- Sale 4 — Imran, 3 days ago, udhar
  insert into public.sales (customer_id, sale_date, total_amount, paid_amount, payment_mode, note)
    values (c_imran, current_date - 3, 124, 0, 'udhar', 'sample') returning id into s;
  insert into public.sale_items (sale_id, product_id, product_name, qty, unit_price, line_total) values
    (s, p_butter, 'Amul Butter 100g', 2, 62, 124);

  -- Sale 5 — Priya, today, cash
  insert into public.sales (customer_id, sale_date, total_amount, paid_amount, payment_mode, note)
    values (c_priya, current_date, 33, 33, 'cash', 'sample') returning id into s;
  insert into public.sale_items (sale_id, product_id, product_name, qty, unit_price, line_total) values
    (s, p_gold, 'Amul Gold (Full Cream) 500ml', 1, 33, 33);

  -- Sale 6 — Walk-in (no customer), today, cash
  insert into public.sales (customer_id, sale_date, total_amount, paid_amount, payment_mode, note)
    values (null, current_date, 54, 54, 'cash', 'sample') returning id into s;
  insert into public.sale_items (sale_id, product_id, product_name, qty, unit_price, line_total) values
    (s, p_taaza, 'Amul Taaza (Toned) 500ml', 2, 27, 54);

  -- Payments (clearing some udhar)
  insert into public.payments (customer_id, amount, note) values
    (c_ramesh, 50, 'sample'),
    (c_imran, 100, 'sample');

  raise notice 'Sample data inserted.';
end $$;

-- After running, expected outstanding balances:
--   Ramesh Kumar  ₹51   (101 + 0 - 50 payment)
--   Sunita Devi   ₹81   (50 opening + 31 unpaid)
--   Imran Shaikh  ₹24   (124 - 100 payment)
--   Priya Sharma  ₹0    (paid cash)
