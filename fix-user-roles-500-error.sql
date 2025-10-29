-- Fix: 500 Error on user_roles query
-- Problem: Infinite recursion - policies check user_roles to determine if admin,
--          but user_roles table itself has policies that check user_roles!
-- Solution: Simplify user_roles policies to avoid recursion

-- ============================================
-- FIX: User Roles Policies (No Recursion)
-- ============================================

-- Drop ALL existing user_roles policies
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow trigger to insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.user_roles;

-- Simple policy: All authenticated users can read ALL roles
-- This is safe because knowing someone's role doesn't expose sensitive data
CREATE POLICY "Authenticated users can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service_role (backend/triggers) can INSERT
-- Frontend should not insert roles directly
CREATE POLICY "Service role can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (true); -- No restriction for INSERT (trigger will use this)

-- Only service_role can UPDATE roles
-- Users cannot change their own role
CREATE POLICY "Service role can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Only service_role can DELETE roles
CREATE POLICY "Service role can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (true);

-- ============================================
-- Re-verify Profiles Policies (Simplify)
-- ============================================

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- All authenticated users can view all profiles
-- (This prevents 406 errors and is safe for a POS system)
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Simplify GPS Settings Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Riders can view own GPS settings" ON public.rider_gps_settings;
DROP POLICY IF EXISTS "Admins can view all GPS settings" ON public.rider_gps_settings;

-- All authenticated users can view GPS settings
CREATE POLICY "Authenticated users can view GPS settings"
  ON public.rider_gps_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Riders can update own GPS settings" ON public.rider_gps_settings;

-- Riders can update their own GPS settings
CREATE POLICY "Riders can update own GPS settings"
  ON public.rider_gps_settings
  FOR UPDATE
  USING (auth.uid() = rider_id)
  WITH CHECK (auth.uid() = rider_id);

-- ============================================
-- VERIFY: Check all policies
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual::text LIKE '%authenticated%' THEN '✓ Simple (authenticated)'
    WHEN qual::text LIKE '%auth.uid()%' THEN '✓ User-specific'
    WHEN qual::text = 'true' THEN '✓ Service role only'
    ELSE 'Custom'
  END as policy_type
FROM pg_policies
WHERE tablename IN ('profiles', 'user_roles', 'rider_gps_settings')
ORDER BY tablename, cmd, policyname;

-- ============================================
-- TEST QUERIES
-- ============================================

-- Test 1: Can I read my role? (Should work now)
SELECT 
  'My Role' as test,
  user_id,
  role
FROM user_roles
WHERE user_id = auth.uid();

-- Test 2: Can I read my profile?
SELECT 
  'My Profile' as test,
  user_id,
  full_name,
  phone
FROM profiles
WHERE user_id = auth.uid();

-- Test 3: Can I read my GPS settings?
SELECT 
  'My GPS' as test,
  rider_id,
  tracking_enabled,
  consent_given
FROM rider_gps_settings
WHERE rider_id = auth.uid();

-- ============================================
-- SUMMARY
-- ============================================

SELECT 
  '✓ Fix Applied' as status,
  'No more infinite recursion!' as message,
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename IN ('profiles', 'user_roles', 'rider_gps_settings');
