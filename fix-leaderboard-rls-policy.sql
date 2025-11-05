-- ============================================================================
-- FIX LEADERBOARD RLS POLICY - VERSION 2 (COMPLETE)
-- ============================================================================
-- Problem: Policy already exists but still showing 0 cups
-- Root Cause: BOTH transactions AND transaction_items have restrictive RLS
-- Solution: Add open SELECT policies for leaderboard on BOTH tables
-- ============================================================================

-- ============================================================================
-- STEP 1: FIX TRANSACTIONS TABLE
-- ============================================================================

-- Check current transactions policies
SELECT 
  'BEFORE: transactions policies' as step,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'transactions'
AND schemaname = 'public'
ORDER BY policyname;

-- Add policy for riders to see all transactions (for leaderboard)
DROP POLICY IF EXISTS "Riders can view all transactions for leaderboard" ON transactions;

CREATE POLICY "Riders can view all transactions for leaderboard"
  ON transactions FOR SELECT
  TO authenticated
  USING (true); -- All riders can see all transactions (for leaderboard only)

-- ============================================================================
-- STEP 2: FIX TRANSACTION_ITEMS TABLE
-- ============================================================================

-- Check current transaction_items policies
SELECT 
  'BEFORE: transaction_items policies' as step,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'transaction_items'
AND schemaname = 'public'
ORDER BY policyname;

-- Add policy for riders to see all transaction items (for leaderboard)
DROP POLICY IF EXISTS "Riders can view all transaction items for leaderboard" ON transaction_items;

CREATE POLICY "Riders can view all transaction items for leaderboard"
  ON transaction_items FOR SELECT
  TO authenticated
  USING (true); -- All riders can read for leaderboard

-- ============================================================================
-- STEP 3: VERIFY
-- ============================================================================

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
-- VERIFICATION TESTS
-- ============================================================================

-- Test 1: Count ALL transactions (should work now)
SELECT 
  'Test 1: Total transactions visible' as test_name,
  COUNT(*) as total_transactions
FROM transactions
WHERE created_at >= '2025-11-01';

-- Test 2: Count ALL transaction items
SELECT 
  'Test 2: Total items visible' as test_name,
  COUNT(*) as total_items
FROM transaction_items ti
JOIN transactions t ON t.id = ti.transaction_id
WHERE t.created_at >= '2025-11-01';

-- Test 3: Leaderboard simulation (November 2025)
SELECT 
  'Test 3: Leaderboard data' as test_name,
  t.rider_id,
  COUNT(DISTINCT t.id) as transaction_count,
  SUM(ti.quantity) as total_quantity
FROM transactions t
JOIN transaction_items ti ON ti.transaction_id = t.id
WHERE t.created_at >= '2025-11-01'
  AND t.created_at < '2025-12-01'
GROUP BY t.rider_id
ORDER BY total_quantity DESC;

-- ============================================================================
-- EXPECTED RESULT
-- ============================================================================
-- Should show these policies for each table:
--
-- TRANSACTIONS:
-- 1. "Riders can create transactions" - INSERT
-- 2. "Riders can view all transactions for leaderboard" - SELECT (new, open)
-- 3. "Users can view relevant transactions" - SELECT (old, restrictive - will be ignored)
--
-- TRANSACTION_ITEMS:
-- 1. "Riders can view all transaction items for leaderboard" - SELECT (new, open)
-- 2. "Users can create transaction items" - INSERT
-- 3. "Users can view transaction items" - SELECT (old, restrictive - will be ignored)
--
-- PostgreSQL RLS: When multiple SELECT policies exist, they are OR'd together.
-- So the open policy (USING true) will allow access even if restrictive one exists.
-- ============================================================================
