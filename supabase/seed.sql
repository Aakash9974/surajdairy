-- Suraj Dairy Sales — starter products (common Amul milk range).
-- Prices are typical market defaults; the owner can edit them in the app.
-- photo_url is left null — upload photos from the Inventory screen.

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
  ('Amul Ghee 500ml',               'Amul', 'Ghee',       330, 'jar', 110)
on conflict do nothing;
