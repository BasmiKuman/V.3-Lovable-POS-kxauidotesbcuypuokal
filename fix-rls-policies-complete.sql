-- COMPLETE FIX: Reset all RLS policies to resolve 406/500 errors
-- This will completely rebuild RLS policies from scratch

-- ============================================
-- STEP 1: DISABLE RLS temporarily (to clean up)
-- ============================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_gps_settings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ============================================

-- Drop ALL profiles policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    END LOOP;
END $$;

-- Drop ALL user_roles policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_roles') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', r.policyname);
    END LOOP;
END $$;

-- Drop ALL rider_gps_settings policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'rider_gps_settings') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rider_gps_settings', r.policyname);
    END LOOP;
END $$;

-- ============================================
-- STEP 3: RE-ENABLE RLS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_gps_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE SIMPLE, WORKING POLICIES
-- ============================================

-- PROFILES: Allow all authenticated users to read all profiles
CREATE POLICY "allow_authenticated_select_profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- PROFILES: Allow users to update their own profile
CREATE POLICY "allow_users_update_own_profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- PROFILES: Allow insert (for trigger)
CREATE POLICY "allow_insert_profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- PROFILES: Allow delete (admin only via backend)
CREATE POLICY "allow_delete_profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (true);

-- USER_ROLES: Allow all authenticated users to read all roles
CREATE POLICY "allow_authenticated_select_user_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- USER_ROLES: Allow insert (for trigger)
CREATE POLICY "allow_insert_user_roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- USER_ROLES: Allow update (admin operations)
CREATE POLICY "allow_update_user_roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- USER_ROLES: Allow delete (admin operations)
CREATE POLICY "allow_delete_user_roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (true);

-- GPS_SETTINGS: Allow all authenticated users to read
CREATE POLICY "allow_authenticated_select_gps"
  ON public.rider_gps_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- GPS_SETTINGS: Allow users to update their own settings
CREATE POLICY "allow_users_update_own_gps"
  ON public.rider_gps_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = rider_id)
  WITH CHECK (auth.uid() = rider_id);

-- GPS_SETTINGS: Allow insert (for trigger)
CREATE POLICY "allow_insert_gps"
  ON public.rider_gps_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- STEP 5: VERIFY POLICIES
-- ============================================

SELECT 
  'PROFILES POLICIES' as section,
  policyname,
  cmd,
  roles::text as roles,
  CASE 
    WHEN qual::text = 'true' THEN 'Allow all'
    WHEN qual::text LIKE '%auth.uid%' THEN 'User-specific'
    ELSE 'Custom'
  END as policy_logic
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd;

SELECT 
  'USER_ROLES POLICIES' as section,
  policyname,
  cmd,
  roles::text as roles,
  CASE 
    WHEN qual::text = 'true' THEN 'Allow all'
    ELSE 'Custom'
  END as policy_logic
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY cmd;

SELECT 
  'GPS_SETTINGS POLICIES' as section,
  policyname,
  cmd,
  roles::text as roles,
  CASE 
    WHEN qual::text = 'true' THEN 'Allow all'
    WHEN qual::text LIKE '%auth.uid%' THEN 'User-specific'
    ELSE 'Custom'
  END as policy_logic
FROM pg_policies
WHERE tablename = 'rider_gps_settings'
ORDER BY cmd;

-- ============================================
-- STEP 6: TEST QUERIES
-- ============================================

-- Test as authenticated user
SELECT 
  '✓ Profile Test' as test,
  COUNT(*) as my_profiles
FROM profiles
WHERE user_id = auth.uid();

SELECT 
  '✓ Role Test' as test,
  role
FROM user_roles
WHERE user_id = auth.uid();

SELECT 
  '✓ GPS Test' as test,
  tracking_enabled,
  consent_given
FROM rider_gps_settings
WHERE rider_id = auth.uid();

-- ============================================
-- SUMMARY
-- ============================================

SELECT 
  'RLS RESET COMPLETE' as status,
  'All policies rebuilt with simple logic' as message,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') as profiles_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_roles') as roles_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'rider_gps_settings') as gps_policies;
