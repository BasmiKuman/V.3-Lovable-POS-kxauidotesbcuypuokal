-- Verify registration fix is properly applied

-- 1. Check if handle_new_user function exists and has correct definition
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';

-- 2. Check if trigger exists on auth.users
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_schema = 'auth';

-- 3. Check if old GPS trigger is removed
SELECT 
  COUNT(*) as gps_trigger_count,
  CASE 
    WHEN COUNT(*) = 0 THEN 'OK - GPS trigger removed ✓'
    ELSE 'ERROR - GPS trigger still exists!'
  END as status
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_gps_settings';

-- 4. Check profiles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 5. Check user_roles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 6. Check rider_gps_settings table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'rider_gps_settings'
ORDER BY ordinal_position;

-- 7. Check RLS policies on profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 8. Check RLS policies on user_roles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- 9. Test if we can read from profiles (should work for authenticated users)
-- This will show current user's profile if logged in
SELECT 
  user_id,
  full_name,
  phone,
  address,
  created_at
FROM profiles
WHERE user_id = auth.uid();

-- 10. Check if there are any recent errors in logs (if available)
-- Note: This might not work depending on permissions
SELECT 
  p.full_name,
  p.created_at,
  ur.role,
  CASE WHEN rgs.rider_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_gps
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
LEFT JOIN rider_gps_settings rgs ON rgs.rider_id = p.user_id
ORDER BY p.created_at DESC
LIMIT 3;
