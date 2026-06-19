-- Atomic sale creation: inserts the sale + its items in one transaction,
-- computes the total server-side, and decrements stock for tracked products.
-- Run after 0001_init.sql.

create or replace function public.create_sale(
  p_customer_id uuid,
  p_paid_amount numeric,
  p_payment_mode text,
  p_note text,
  p_items jsonb            -- [{product_id, product_name, qty, unit_price}]
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_sale_id uuid;
  v_total   numeric := 0;
begin
  select coalesce(sum((it->>'qty')::numeric * (it->>'unit_price')::numeric), 0)
    into v_total
  from jsonb_array_elements(p_items) it;

  insert into public.sales (customer_id, staff_id, total_amount, paid_amount, payment_mode, note)
  values (p_customer_id, auth.uid(), v_total, coalesce(p_paid_amount, 0), p_payment_mode, p_note)
  returning id into v_sale_id;

  insert into public.sale_items (sale_id, product_id, product_name, qty, unit_price, line_total)
  select
    v_sale_id,
    nullif(it->>'product_id', '')::uuid,
    it->>'product_name',
    (it->>'qty')::numeric,
    (it->>'unit_price')::numeric,
    (it->>'qty')::numeric * (it->>'unit_price')::numeric
  from jsonb_array_elements(p_items) it;

  -- Decrement stock only for products that track it.
  update public.products p
     set stock_count = p.stock_count - x.qty
  from (
    select (it->>'product_id')::uuid as pid, sum((it->>'qty')::numeric) as qty
    from jsonb_array_elements(p_items) it
    where nullif(it->>'product_id', '') is not null
    group by 1
  ) x
  where p.id = x.pid and p.track_stock and p.stock_count is not null;

  return v_sale_id;
end;
$$;

grant execute on function public.create_sale to authenticated;
