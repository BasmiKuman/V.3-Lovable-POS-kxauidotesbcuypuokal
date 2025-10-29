-- Fix: RLS policies blocking handle_new_user trigger
-- Problem: Trigger function can't insert because RLS blocks service_role
-- Solution: Add bypass for SECURITY DEFINER functions

-- 1. Update profiles INSERT policy to allow trigger
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Policy 1: Allow SECURITY DEFINER functions (triggers) to insert
CREATE POLICY "Allow trigger to insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true); -- Always allow INSERT (RLS still enabled for SELECT/UPDATE/DELETE)

-- 2. Update user_roles INSERT policy to allow trigger
DROP POLICY IF EXISTS "Allow trigger to insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can insert user_roles" ON public.user_roles;

-- Policy 2: Allow SECURITY DEFINER functions (triggers) to insert
CREATE POLICY "Allow trigger to insert user_roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (true); -- Always allow INSERT

-- 3. Update rider_gps_settings INSERT policy
DROP POLICY IF EXISTS "Allow trigger to insert gps_settings" ON public.rider_gps_settings;
DROP POLICY IF EXISTS "Riders can insert own GPS settings" ON public.rider_gps_settings;

-- Policy 3: Allow SECURITY DEFINER functions (triggers) to insert
CREATE POLICY "Allow trigger to insert gps_settings"
  ON public.rider_gps_settings
  FOR INSERT
  WITH CHECK (true); -- Always allow INSERT

-- 4. Keep other policies for SELECT/UPDATE/DELETE strict

-- Profiles SELECT (existing should be fine)
-- Just verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname LIKE '%can view%'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.profiles
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Profiles UPDATE (existing should be fine)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname LIKE '%can update%'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Verify policies
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN with_check::text = 'true' THEN 'OPEN (for triggers)'
    ELSE 'RESTRICTED'
  END as access_level
FROM pg_policies
WHERE tablename IN ('profiles', 'user_roles', 'rider_gps_settings')
ORDER BY tablename, cmd, policyname;

-- 6. Test query - show recent users
SELECT 
  p.full_name,
  ur.role,
  CASE WHEN rgs.rider_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_gps,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
LEFT JOIN rider_gps_settings rgs ON rgs.rider_id = p.user_id
ORDER BY p.created_at DESC
LIMIT 5;
