-- Fix RLS policies for user_roles table to allow admin to change roles

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin can manage all user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admin can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can delete user roles" ON user_roles;

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own role
CREATE POLICY "Users can view their own role"
ON user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admin can view all roles
CREATE POLICY "Admin can view all user roles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admin can insert roles
CREATE POLICY "Admin can insert user roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admin can update roles
CREATE POLICY "Admin can update user roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admin can delete roles
CREATE POLICY "Admin can delete user roles"
ON user_roles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Grant necessary permissions
GRANT ALL ON user_roles TO authenticated;
