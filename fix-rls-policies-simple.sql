-- Simple RLS Fix - Disable RLS completely for testing
-- After this works, we can add back selective policies

-- Temporarily DISABLE RLS to diagnose
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_gps_settings DISABLE ROW LEVEL SECURITY;

-- Test query - should work now
SELECT 'Profiles table' as table_name, COUNT(*) as total_records FROM profiles;
SELECT 'User roles table' as table_name, COUNT(*) as total_records FROM user_roles;
SELECT 'GPS settings table' as table_name, COUNT(*) as total_records FROM rider_gps_settings;

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'RLS ENABLED ⚠️'
    ELSE 'RLS DISABLED ✓'
  END as rls_status
FROM pg_tables
WHERE tablename IN ('profiles', 'user_roles', 'rider_gps_settings')
AND schemaname = 'public';
