-- Fix: Login & Profile errors (401 on GPS settings, 406 on profiles)
-- Problem 1: RLS blocking authenticated users from reading their own data
-- Problem 2: Missing SELECT policies for authenticated users
-- Solution: Add proper SELECT policies for authenticated users

-- ============================================
-- FIX 1: Profiles SELECT Policy
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- Allow authenticated users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================
-- FIX 2: Rider GPS Settings SELECT Policy
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Riders can view own GPS settings" ON public.rider_gps_settings;
DROP POLICY IF EXISTS "Admins can view all GPS settings" ON public.rider_gps_settings;

-- Allow riders to view their own GPS settings
CREATE POLICY "Riders can view own GPS settings"
  ON public.rider_gps_settings
  FOR SELECT
  USING (auth.uid() = rider_id);

-- Allow admins to view all GPS settings
CREATE POLICY "Admins can view all GPS settings"
  ON public.rider_gps_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================
-- FIX 3: Rider GPS Settings UPDATE Policy
-- ============================================

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Riders can update own GPS settings" ON public.rider_gps_settings;

-- Allow riders to update their own GPS settings
CREATE POLICY "Riders can update own GPS settings"
  ON public.rider_gps_settings
  FOR UPDATE
  USING (auth.uid() = rider_id)
  WITH CHECK (auth.uid() = rider_id);

-- ============================================
-- FIX 4: Profiles UPDATE Policy
-- ============================================

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to update any profile
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================
-- FIX 5: User Roles SELECT Policy
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Allow users to view their own role
CREATE POLICY "Users can view own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to view all roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================
-- VERIFY POLICIES
-- ============================================

-- Check profiles policies
SELECT 
  'PROFILES' as table_name,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NULL THEN 'No restriction'
    WHEN qual::text LIKE '%auth.uid()%' THEN 'User-specific'
    WHEN qual::text LIKE '%admin%' THEN 'Admin-only'
    ELSE 'Custom'
  END as access_type
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Check rider_gps_settings policies
SELECT 
  'GPS_SETTINGS' as table_name,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NULL THEN 'No restriction'
    WHEN qual::text LIKE '%auth.uid()%' THEN 'User-specific'
    WHEN qual::text LIKE '%admin%' THEN 'Admin-only'
    ELSE 'Custom'
  END as access_type
FROM pg_policies
WHERE tablename = 'rider_gps_settings'
ORDER BY cmd, policyname;

-- Check user_roles policies
SELECT 
  'USER_ROLES' as table_name,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NULL THEN 'No restriction'
    WHEN qual::text LIKE '%auth.uid()%' THEN 'User-specific'
    WHEN qual::text LIKE '%admin%' THEN 'Admin-only'
    ELSE 'Custom'
  END as access_type
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY cmd, policyname;

-- ============================================
-- TEST QUERIES (Run these after logging in)
-- ============================================

-- Test 1: Can I read my profile?
SELECT 
  'Profile Test' as test,
  user_id,
  full_name,
  phone
FROM profiles
WHERE user_id = auth.uid();

-- Test 2: Can I read my GPS settings?
SELECT 
  'GPS Settings Test' as test,
  rider_id,
  tracking_enabled,
  consent_given,
  consent_date
FROM rider_gps_settings
WHERE rider_id = auth.uid();

-- Test 3: Can I read my role?
SELECT 
  'Role Test' as test,
  user_id,
  role
FROM user_roles
WHERE user_id = auth.uid();

-- ============================================
-- SUMMARY
-- ============================================

SELECT 
  'Fix Summary' as status,
  'Profiles: ' || COUNT(*) FILTER (WHERE tablename = 'profiles') as profiles_policies,
  'GPS Settings: ' || COUNT(*) FILTER (WHERE tablename = 'rider_gps_settings') as gps_policies,
  'User Roles: ' || COUNT(*) FILTER (WHERE tablename = 'user_roles') as role_policies
FROM pg_policies
WHERE tablename IN ('profiles', 'rider_gps_settings', 'user_roles');
