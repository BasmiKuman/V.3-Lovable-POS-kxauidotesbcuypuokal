-- ============================================================================
-- FIX REPORTS ACCESS FOR SUPER ADMIN
-- ============================================================================
-- Problem: transactions and transaction_items RLS policies use old has_role()
--          function which doesn't support super_admin
-- Solution: Update all policies to use public.get_user_role()
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP OLD TRANSACTION POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view relevant transactions" ON transactions;
DROP POLICY IF EXISTS "Riders can create transactions" ON transactions;

-- ============================================================================
-- STEP 2: DROP OLD TRANSACTION_ITEMS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view transaction items" ON transaction_items;
DROP POLICY IF EXISTS "Users can create transaction items" ON transaction_items;

-- ============================================================================
-- STEP 3: CREATE NEW POLICIES WITH SUPER ADMIN SUPPORT
-- ============================================================================

-- TRANSACTIONS: Riders view own, Admins/Super admins view all
-- ============================================================================
CREATE POLICY "Users can view relevant transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = rider_id 
    OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Riders can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rider_id);

-- TRANSACTION_ITEMS: View based on transaction access
-- ============================================================================
CREATE POLICY "Users can view transaction items"
  ON transaction_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND (
        transactions.rider_id = auth.uid() 
        OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Users can create transaction items"
  ON transaction_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.rider_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

-- Test 1: Check transactions policies
SELECT 
  'Test 1: transactions policies' as test_name,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'transactions'
GROUP BY tablename;

-- Test 2: List all transactions policies
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'transactions'
ORDER BY policyname;

-- Test 3: Check transaction_items policies
SELECT 
  'Test 3: transaction_items policies' as test_name,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'transaction_items'
GROUP BY tablename;

-- Test 4: List all transaction_items policies
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'transaction_items'
ORDER BY policyname;

-- ============================================================================
-- SUCCESS! 🎉
-- ============================================================================
-- Expected results:
-- - transactions: 2 policies (view, insert)
-- - transaction_items: 2 policies (view, insert)
-- - All policies support both 'admin' and 'super_admin'
--
-- Now super_admin can access Reports page! ✅
-- ============================================================================
