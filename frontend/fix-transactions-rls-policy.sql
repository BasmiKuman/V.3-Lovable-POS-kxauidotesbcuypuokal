-- Fix transactions table RLS policy for admin manual sales input
-- Run this in Supabase SQL Editor

-- 1. Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Riders can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can insert transactions for riders" ON transactions;

-- 3. Create new policies

-- Allow riders to insert their own transactions
CREATE POLICY "Riders can insert their own transactions"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = rider_id
);

-- Allow admins/super_admins to insert transactions for any rider
CREATE POLICY "Admins can insert transactions for riders"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Allow users to view their own transactions
CREATE POLICY "Users can view their own transactions"
ON transactions FOR SELECT
TO authenticated
USING (
  auth.uid() = rider_id
);

-- Allow admins to view all transactions
CREATE POLICY "Admins can view all transactions"
ON transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Allow admins to update transactions (if needed)
CREATE POLICY "Admins can update transactions"
ON transactions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- 4. Grant permissions
GRANT SELECT, INSERT ON transactions TO authenticated;
GRANT UPDATE ON transactions TO authenticated;

-- 5. Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;
