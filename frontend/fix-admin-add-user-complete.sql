-- Complete fix untuk admin add user issue
-- Error: "user not allowed" atau RLS violations

-- ============================================
-- 1. Fix RLS Policy untuk INSERT profiles
-- ============================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create new policy: Allow admin to insert ANY profile
CREATE POLICY "Admins can insert any profile"
  ON public.profiles 
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

-- Create new policy: Allow users to insert their OWN profile only
CREATE POLICY "Users can insert own profile"
  ON public.profiles 
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- ============================================
-- 2. Fix RLS Policy untuk INSERT user_roles
-- ============================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

-- Create new policy: Allow admin to insert ANY role
CREATE POLICY "Admins can insert any role"
  ON public.user_roles 
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 3. Verify handle_new_user trigger exists
-- ============================================

-- Check if trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- If trigger doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ============================================
-- 4. Verify Policies
-- ============================================

-- Check profiles policies
SELECT 
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Check user_roles policies
SELECT 
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'user_roles'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- ============================================
-- 5. Test Query (Optional)
-- ============================================

-- Check if current user is admin
SELECT 
  auth.uid() as current_user_id,
  public.has_role(auth.uid(), 'admin') as is_admin;

-- List all profiles
SELECT 
  id,
  user_id,
  full_name,
  phone,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- List all user_roles
SELECT 
  ur.user_id,
  ur.role,
  p.full_name,
  p.phone
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.user_id
ORDER BY ur.created_at DESC
LIMIT 10;
