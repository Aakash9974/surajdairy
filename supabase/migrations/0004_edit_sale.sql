-- Edit and delete a saved sale, atomically, with stock kept correct.
-- Run after 0003_create_sale.sql.

-- Replace a sale's customer / payment / items in one transaction.
create or replace function public.update_sale(
  p_sale_id uuid, p_customer_id uuid, p_paid_amount numeric, p_payment_mode text, p_note text, p_items jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare v_total numeric := 0;
begin
  -- Put the old items' quantities back into stock (tracked products only).
  update public.products p set stock_count = p.stock_count + x.qty
  from (
    select si.product_id as pid, sum(si.qty) as qty
    from public.sale_items si
    where si.sale_id = p_sale_id and si.product_id is not null
    group by si.product_id
  ) x
  where p.id = x.pid and p.track_stock and p.stock_count is not null;

  select coalesce(sum((it->>'qty')::numeric * (it->>'unit_price')::numeric), 0)
    into v_total from jsonb_array_elements(p_items) it;

  update public.sales
     set customer_id  = p_customer_id,
         total_amount = v_total,
         paid_amount  = coalesce(p_paid_amount, 0),
         payment_mode = p_payment_mode,
         note         = p_note
   where id = p_sale_id;

  delete from public.sale_items where sale_id = p_sale_id;

  insert into public.sale_items (sale_id, product_id, product_name, qty, unit_price, line_total)
  select p_sale_id, nullif(it->>'product_id','')::uuid, it->>'product_name',
         (it->>'qty')::numeric, (it->>'unit_price')::numeric,
         (it->>'qty')::numeric * (it->>'unit_price')::numeric
  from jsonb_array_elements(p_items) it;

  -- Subtract the new quantities from stock.
  update public.products p set stock_count = p.stock_count - y.qty
  from (
    select (it->>'product_id')::uuid as pid, sum((it->>'qty')::numeric) as qty
    from jsonb_array_elements(p_items) it
    where nullif(it->>'product_id','') is not null group by 1
  ) y
  where p.id = y.pid and p.track_stock and p.stock_count is not null;
end;
$$;
grant execute on function public.update_sale to authenticated;

-- Delete a sale (returns its stock).
create or replace function public.delete_sale(p_sale_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.products p set stock_count = p.stock_count + x.qty
  from (
    select product_id pid, sum(qty) qty from public.sale_items
    where sale_id = p_sale_id and product_id is not null group by product_id
  ) x
  where p.id = x.pid and p.track_stock and p.stock_count is not null;

  delete from public.sales where id = p_sale_id;  -- cascades sale_items
end;
$$;
grant execute on function public.delete_sale to authenticated;
