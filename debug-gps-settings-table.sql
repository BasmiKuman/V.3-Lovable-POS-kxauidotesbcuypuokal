-- Debug: Check rider_gps_settings table
-- This will help us understand why 406 errors persist

-- 1. Check if table exists
SELECT 
  'Table exists' as status,
  tablename,
  schemaname
FROM pg_tables
WHERE tablename = 'rider_gps_settings';

-- 2. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'rider_gps_settings'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if RLS is disabled
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN 'ENABLED (should be disabled!)'
    ELSE 'DISABLED (correct!)'
  END as rls_status
FROM pg_tables
WHERE tablename = 'rider_gps_settings'
AND schemaname = 'public';

-- 4. Check if there's data in the table
SELECT 
  'Total GPS settings records' as info,
  COUNT(*) as count
FROM rider_gps_settings;

-- 5. Check if specific user has GPS settings
-- Replace with actual user_id: 2454b70f-d2cc-456e-9dec-bcf36846e47e
SELECT 
  'User GPS settings' as info,
  rider_id,
  consent_given,
  tracking_enabled,
  created_at
FROM rider_gps_settings
WHERE rider_id = '2454b70f-d2cc-456e-9dec-bcf36846e47e';

-- 6. If no record found, create it manually
INSERT INTO rider_gps_settings (
  rider_id,
  consent_given,
  tracking_enabled,
  auto_start_on_login
)
VALUES (
  '2454b70f-d2cc-456e-9dec-bcf36846e47e',
  false,
  false,
  true
)
ON CONFLICT (rider_id) DO NOTHING;

-- 7. Verify insertion
SELECT 
  'After insert' as status,
  rider_id,
  consent_given,
  tracking_enabled
FROM rider_gps_settings
WHERE rider_id = '2454b70f-d2cc-456e-9dec-bcf36846e47e';

-- 8. Check all GPS settings records
SELECT 
  'All GPS settings' as info,
  rgs.rider_id,
  p.full_name,
  rgs.consent_given,
  rgs.tracking_enabled,
  rgs.created_at
FROM rider_gps_settings rgs
LEFT JOIN profiles p ON p.user_id = rgs.rider_id
ORDER BY rgs.created_at DESC;
