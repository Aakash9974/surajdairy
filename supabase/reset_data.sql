-- ============================================================================
-- Suraj Dairy Sales — RESET to a clean app for delivery.
-- Deletes ALL transactional + customer data but KEEPS products and logins.
-- ⚠️ PERMANENT / irreversible. Paste into Supabase → SQL Editor → Run.
--
--   Removed : messages_log, payments, sale_items, sales, customers
--   Kept    : products, profiles, auth users (your login)
-- ============================================================================

delete from public.messages_log;
delete from public.payments;
delete from public.sale_items;   -- also cascades from sales, listed for clarity
delete from public.sales;
delete from public.customers;

-- (Optional) If you tracked stock and want counts back to a known value,
-- set them here, e.g.:  update public.products set stock_count = null;
