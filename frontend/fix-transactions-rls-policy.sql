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

-- 5. Fix transaction_items table RLS policies
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for transaction_items
DROP POLICY IF EXISTS "Users can insert transaction items" ON transaction_items;
DROP POLICY IF EXISTS "Users can view transaction items" ON transaction_items;
DROP POLICY IF EXISTS "Admins can view all transaction items" ON transaction_items;
DROP POLICY IF EXISTS "Riders can insert transaction items" ON transaction_items;
DROP POLICY IF EXISTS "Admins can insert transaction items" ON transaction_items;

-- Allow anyone with valid transaction to insert items
CREATE POLICY "Authenticated users can insert transaction items"
ON transaction_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM transactions
    WHERE transactions.id = transaction_items.transaction_id
    AND (
      transactions.rider_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
      )
    )
  )
);

-- Allow users to view transaction items for their transactions
CREATE POLICY "Users can view their transaction items"
ON transaction_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM transactions
    WHERE transactions.id = transaction_items.transaction_id
    AND transactions.rider_id = auth.uid()
  )
);

-- Allow admins to view all transaction items
CREATE POLICY "Admins can view all transaction items"
ON transaction_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- 6. Grant permissions for transaction_items
GRANT SELECT, INSERT ON transaction_items TO authenticated;

-- 7. Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('transactions', 'transaction_items')
ORDER BY tablename, policyname;
