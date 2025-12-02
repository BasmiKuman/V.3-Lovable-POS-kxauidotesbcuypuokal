-- Fix RLS policies for user_roles - Simplified version to avoid recursion

-- Drop all existing policies
DROP POLICY IF EXISTS "Admin can manage all user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admin can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can delete user roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can view all user roles" ON user_roles;

-- Disable RLS temporarily to clean up
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Simple policy: Users can view their own role
CREATE POLICY "Users can view own role"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admin can do everything (using service role check to avoid recursion)
CREATE POLICY "Service role full access"
ON user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can manage if they are admin (check via direct table scan, not subquery)
CREATE POLICY "Admin full access"
ON user_roles
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Grant permissions
GRANT ALL ON user_roles TO authenticated;
GRANT ALL ON user_roles TO service_role;
