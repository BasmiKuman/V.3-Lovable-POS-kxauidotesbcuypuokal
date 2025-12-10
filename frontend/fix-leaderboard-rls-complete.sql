-- ============================================================================
-- FIX LEADERBOARD - ENSURE RIDERS CAN SEE ALL DATA
-- ============================================================================
-- Problem: Riders only see their own data in leaderboard
-- Solution: Verify and fix RLS policies for all tables needed by leaderboard
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK CURRENT POLICIES
-- ============================================================================

-- Check user_roles policies
SELECT 
  '1. user_roles policies' as check_step,
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'user_roles'
AND schemaname = 'public'
ORDER BY policyname;

-- Check profiles policies
SELECT 
  '2. profiles policies' as check_step,
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'profiles'
AND schemaname = 'public'
ORDER BY policyname;

-- Check transactions policies
SELECT 
  '3. transactions policies' as check_step,
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'transactions'
AND schemaname = 'public'
ORDER BY policyname;

-- Check transaction_items policies
SELECT 
  '4. transaction_items policies' as check_step,
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'transaction_items'
AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- STEP 2: FIX USER_ROLES - ENSURE ALL RIDERS CAN SEE ALL RIDERS
-- ============================================================================

-- Drop old restrictive policy if exists
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;

-- Ensure policy allows ALL authenticated users to see ALL roles
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;

CREATE POLICY "Users can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true); -- All authenticated users can see all roles

-- ============================================================================
-- STEP 3: FIX PROFILES - ENSURE ALL RIDERS CAN SEE ALL PROFILES
-- ============================================================================

-- Drop old restrictive policy if exists
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Ensure policy allows ALL authenticated users to see ALL profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true); -- All authenticated users can see all profiles

-- ============================================================================
-- STEP 4: FIX TRANSACTIONS - ENSURE RIDERS CAN SEE ALL TRANSACTIONS
-- ============================================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Riders can view own transactions" ON transactions;

-- Ensure policy allows viewing all transactions for leaderboard
DROP POLICY IF EXISTS "Riders can view all transactions for leaderboard" ON transactions;

CREATE POLICY "Riders can view all transactions for leaderboard"
  ON transactions FOR SELECT
  TO authenticated
  USING (true); -- All authenticated users can see all transactions (for leaderboard)

-- ============================================================================
-- STEP 5: FIX TRANSACTION_ITEMS - ENSURE RIDERS CAN SEE ALL ITEMS
-- ============================================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view own transaction items" ON transaction_items;
DROP POLICY IF EXISTS "Riders can view own transaction items" ON transaction_items;

-- Ensure policy allows viewing all transaction items
DROP POLICY IF EXISTS "Riders can view all transaction items for leaderboard" ON transaction_items;

CREATE POLICY "Riders can view all transaction items for leaderboard"
  ON transaction_items FOR SELECT
  TO authenticated
  USING (true); -- All authenticated users can see all transaction items

-- ============================================================================
-- STEP 6: VERIFY FIXES
-- ============================================================================

-- Verify user_roles policies
SELECT 
  'AFTER: user_roles policies' as step,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'user_roles'
AND schemaname = 'public'
ORDER BY policyname;

-- Verify profiles policies
SELECT 
  'AFTER: profiles policies' as step,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'profiles'
AND schemaname = 'public'
ORDER BY policyname;

-- Verify transactions policies
SELECT 
  'AFTER: transactions policies' as step,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'transactions'
AND schemaname = 'public'
ORDER BY policyname;

-- Verify transaction_items policies
SELECT 
  'AFTER: transaction_items policies' as step,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'transaction_items'
AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- STEP 7: TEST QUERIES AS RIDER
-- ============================================================================

-- Test 1: Can rider see all rider roles?
SELECT 
  'Test 1: Riders visible in user_roles' as test_name,
  COUNT(*) as rider_count
FROM user_roles
WHERE role = 'rider';

-- Test 2: Can rider see all profiles?
SELECT 
  'Test 2: Profiles visible' as test_name,
  COUNT(*) as profile_count
FROM profiles;

-- Test 3: Can rider see all transactions this month?
SELECT 
  'Test 3: Transactions visible (Dec 2025)' as test_name,
  COUNT(*) as transaction_count
FROM transactions
WHERE created_at >= '2025-12-01'
AND created_at < '2026-01-01';

-- Test 4: Can rider see all transaction items?
SELECT 
  'Test 4: Transaction items visible (Dec 2025)' as test_name,
  COUNT(*) as item_count
FROM transaction_items ti
JOIN transactions t ON t.id = ti.transaction_id
WHERE t.created_at >= '2025-12-01'
AND t.created_at < '2026-01-01';

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 
-- After running this script:
-- 1. Clear browser cache and reload the app
-- 2. Login as rider (e.g., Zulfian)
-- 3. Check browser console for debug logs:
--    - "✅ Found riders in user_roles: X"
--    - "✅ Found transactions this month: Y"
--    - "✅ Found profiles: Z"
--    - "📊 Leaderboard data: [...]"
-- 4. Verify leaderboard shows ALL riders with their correct cup counts
-- 5. If still showing 0 for others, check console logs for RLS errors
-- 
-- ============================================================================
