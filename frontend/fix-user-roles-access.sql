-- Fix user_roles table access and RLS policies
-- Run this in Supabase SQL Editor if CORS errors persist

-- 1. Ensure RLS is enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- 3. Create simple SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view roles"
ON user_roles FOR SELECT
TO authenticated
USING (true);

-- 4. Create policy for admins to manage roles
CREATE POLICY "Admins can manage roles"
ON user_roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- 5. Grant permissions
GRANT SELECT ON user_roles TO authenticated;
GRANT ALL ON user_roles TO authenticated;

-- 6. Verify the policies
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
WHERE tablename = 'user_roles';
