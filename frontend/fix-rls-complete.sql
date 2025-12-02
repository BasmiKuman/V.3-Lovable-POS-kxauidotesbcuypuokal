-- ============================================================================
-- FIX RLS INFINITE RECURSION - COMPLETE SOLUTION
-- ============================================================================
-- Problem: All policies were dropped but RLS still enabled = NO ACCESS!
-- Solution: Create function + policies in correct order
-- ============================================================================

-- Step 1: Temporarily disable RLS to allow function to work
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_logs DISABLE ROW LEVEL SECURITY;

-- Step 2: Create helper function (will work now because RLS is disabled)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role::text INTO user_role
    FROM public.user_roles
    WHERE user_id = user_id_param
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'rider');
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;

-- Step 3: Test function (should work now!)
SELECT 
    'Testing function with RLS disabled...' as test,
    public.get_user_role(auth.uid()) as my_role;

-- Step 4: Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_logs ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop ALL old policies
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admin can view roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admin and Super admin can view roles" ON user_roles;
DROP POLICY IF EXISTS "Super admin can update all roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can update rider roles only" ON user_roles;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin and Super admin can view all profiles" ON profiles;

DROP POLICY IF EXISTS "Admin can view role change logs" ON role_change_logs;
DROP POLICY IF EXISTS "Admins can view logs" ON role_change_logs;
DROP POLICY IF EXISTS "Admin and Super admin can view logs" ON role_change_logs;

-- Step 6: Create NEW policies using the function
-- ============================================================================
-- USER_ROLES POLICIES
-- ============================================================================

-- Everyone can view their own role
CREATE POLICY "Users can view own role"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins & Super admins can view all roles
CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- Super admin can update any role
CREATE POLICY "Super admin can update all roles"
ON user_roles FOR UPDATE
TO authenticated
USING (
    public.get_user_role(auth.uid()) = 'super_admin'
)
WITH CHECK (
    public.get_user_role(auth.uid()) = 'super_admin'
);

-- Regular admin can only update riders
CREATE POLICY "Admin can update rider roles only"
ON user_roles FOR UPDATE
TO authenticated
USING (
    public.get_user_role(auth.uid()) = 'admin'
    AND role::text = 'rider'
)
WITH CHECK (
    public.get_user_role(auth.uid()) = 'admin'
    AND role::text IN ('rider', 'admin')
);

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- ============================================================================
-- ROLE_CHANGE_LOGS POLICIES
-- ============================================================================

CREATE POLICY "Admins can view logs"
ON role_change_logs FOR SELECT
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test 1: Check function works
SELECT 
    'Test 1: Function check' as test_name,
    public.get_user_role(auth.uid()) as my_role;

-- Test 2: Check policy works
SELECT 
    'Test 2: Policy check' as test_name,
    role::text as my_role_from_policy
FROM user_roles
WHERE user_id = auth.uid();

-- Test 3: Check all users visible (if you're admin/super_admin)
SELECT 
    'Test 3: All users count' as test_name,
    COUNT(*) as total_visible_users
FROM user_roles;

-- ============================================================================
-- SUCCESS! 🎉
-- ============================================================================
-- Now the app should work:
-- ✅ Function bypasses RLS using SECURITY DEFINER
-- ✅ Policies use function instead of querying user_roles directly
-- ✅ No more infinite recursion!
-- ============================================================================
