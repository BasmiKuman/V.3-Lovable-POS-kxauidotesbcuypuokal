-- Complete fix for user_roles RLS - Using function to avoid recursion

-- Drop all existing policies
DROP POLICY IF EXISTS "Admin can manage all user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admin can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can delete user roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Service role full access" ON user_roles;
DROP POLICY IF EXISTS "Admin full access" ON user_roles;

-- Drop function if exists
DROP FUNCTION IF EXISTS is_admin();

-- Create function to check if current user is admin (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own role
CREATE POLICY "Users can view own role"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Admin can view all roles
CREATE POLICY "Admin can view all roles"
ON user_roles
FOR SELECT
TO authenticated
USING (is_admin());

-- Policy 3: Admin can insert roles
CREATE POLICY "Admin can insert roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Policy 4: Admin can update roles
CREATE POLICY "Admin can update roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Policy 5: Admin can delete roles
CREATE POLICY "Admin can delete roles"
ON user_roles
FOR DELETE
TO authenticated
USING (is_admin());

-- Grant permissions
GRANT ALL ON user_roles TO authenticated;
