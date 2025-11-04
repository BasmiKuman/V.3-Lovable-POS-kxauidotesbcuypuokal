-- ============================================================================
-- FIX RLS INFINITE RECURSION ERROR
-- ============================================================================
-- Problem: RLS policy queries user_roles table inside policy for user_roles
-- Solution: Use SECURITY DEFINER function to bypass RLS when checking roles
-- ============================================================================

-- Step 1: Create function to check user role (bypasses RLS)
-- Using SECURITY DEFINER means function runs with owner's privileges (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Query with explicit schema and NO RLS check (SECURITY DEFINER does this)
    SELECT role::text INTO user_role
    FROM public.user_roles
    WHERE user_id = user_id_param
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'rider'); -- Default to rider if not found
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;

-- Step 2: Drop ALL existing RLS policies
-- user_roles policies
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admin can view roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admin and Super admin can view roles" ON user_roles;
DROP POLICY IF EXISTS "Super admin can update all roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can update rider roles only" ON user_roles;

-- profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin and Super admin can view all profiles" ON profiles;

-- role_change_logs policies
DROP POLICY IF EXISTS "Admin can view role change logs" ON role_change_logs;
DROP POLICY IF EXISTS "Admins can view logs" ON role_change_logs;
DROP POLICY IF EXISTS "Admin and Super admin can view logs" ON role_change_logs;

-- Step 3: Create NEW policies using the function (no recursion!)
-- Policy untuk user_roles - SELECT
CREATE POLICY "Users can view own role"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON user_roles FOR SELECT
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- Policy untuk user_roles - UPDATE
CREATE POLICY "Super admin can update all roles"
ON user_roles FOR UPDATE
TO authenticated
USING (
    public.get_user_role(auth.uid()) = 'super_admin'
)
WITH CHECK (
    public.get_user_role(auth.uid()) = 'super_admin'
);

CREATE POLICY "Admin can update rider roles only"
ON user_roles FOR UPDATE
TO authenticated
USING (
    public.get_user_role(auth.uid()) = 'admin'
    AND role::text = 'rider' -- Hanya bisa update rider
)
WITH CHECK (
    public.get_user_role(auth.uid()) = 'admin'
    AND role::text IN ('rider', 'admin') -- Hanya bisa ubah jadi rider atau admin
);

-- Policy untuk profiles
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

-- Policy untuk role_change_logs
CREATE POLICY "Admins can view logs"
ON role_change_logs FOR SELECT
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test function
SELECT 
    'Testing public.get_user_role function...' as test_name,
    public.get_user_role(auth.uid()) as my_role;

-- Test policy (should work now!)
SELECT role::text as my_role_from_table
FROM user_roles
WHERE user_id = auth.uid();

-- ============================================================================
-- SUCCESS! 🎉
-- Infinite recursion fixed by using SECURITY DEFINER function
-- ============================================================================
