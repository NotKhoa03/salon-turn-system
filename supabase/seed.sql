-- Seed data for Nail Salon POS
-- Run this after migrations to populate initial data

-- Insert default services
insert into public.services (name, price, is_half_turn, is_active) values
  ('Manicure', 25.00, true, true),
  ('Pedicure', 45.00, false, true),
  ('Full Set', 55.00, false, true),
  ('Fill', 40.00, false, true),
  ('Gel Manicure', 35.00, false, true),
  ('Gel Pedicure', 55.00, false, true),
  ('Acrylic Removal', 15.00, true, true),
  ('Nail Art (per nail)', 5.00, true, true),
  ('Polish Change', 15.00, true, true),
  ('Dip Powder', 50.00, false, true);

-- Insert sample employees (no profile_id - they don't have app logins)
insert into public.employees (full_name, display_order, is_active) values
  ('Anna', 1, true),
  ('Mike', 2, true),
  ('Lisa', 3, true),
  ('Jenny', 4, true),
  ('David', 5, true);

-- Note: Admin user must be created via Supabase Auth
-- Use the seed script (scripts/seed-admin.ts) or create manually in dashboard
-- Email: admin@salon.com (or your preferred email)
-- After creating the user, their profile will be auto-created by the trigger
-- Then update their role to 'admin':
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@salon.com';
