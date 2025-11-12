-- ============================================================
-- FIX ORPHAN RIDER STOCK (Cleanup N/A Data)
-- ============================================================
-- Purpose: Remove rider_stock entries for deleted riders
-- Issue: When rider deleted, stock data remains (shows "N/A")
-- Solution: Clean up orphaned data + auto-cleanup trigger
-- Date: 2025-11-12
-- ============================================================

-- 1. IMMEDIATE CLEANUP: Remove existing orphaned rider_stock
-- ============================================================
-- Find and delete rider_stock where rider no longer exists in profiles

DELETE FROM rider_stock
WHERE rider_id NOT IN (
  SELECT user_id FROM profiles
);

-- Verify cleanup (should return 0 rows)
SELECT COUNT(*) as orphaned_stock_count
FROM rider_stock
WHERE rider_id NOT IN (
  SELECT user_id FROM profiles
);

-- ============================================================
-- 2. CREATE FUNCTION: Auto-cleanup on rider delete
-- ============================================================
-- This function will be called by trigger when profile is deleted

CREATE OR REPLACE FUNCTION cleanup_rider_data_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all rider_stock for the deleted rider
  DELETE FROM rider_stock
  WHERE rider_id = OLD.user_id;
  
  -- Delete all distributions for the deleted rider
  DELETE FROM distributions
  WHERE rider_id = OLD.user_id;
  
  -- Delete all returns for the deleted rider
  DELETE FROM returns
  WHERE rider_id = OLD.user_id;
  
  -- Delete all transactions for the deleted rider
  DELETE FROM transactions
  WHERE rider_id = OLD.user_id;
  
  -- Log the cleanup (optional, for audit)
  RAISE NOTICE 'Cleaned up data for deleted rider: %', OLD.user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. CREATE TRIGGER: Auto-cleanup on profile delete
-- ============================================================
-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_cleanup_rider_data ON profiles;

-- Create new trigger
CREATE TRIGGER trigger_cleanup_rider_data
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_rider_data_on_delete();

-- ============================================================
-- 4. VERIFY SETUP
-- ============================================================

-- Check if function exists
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'cleanup_rider_data_on_delete';

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_cleanup_rider_data';

-- ============================================================
-- 5. TEST QUERY: Check current rider_stock status
-- ============================================================

-- Show rider_stock with rider names (should not show N/A)
SELECT 
  rs.rider_id,
  p.full_name as rider_name,
  rs.product_id,
  pr.name as product_name,
  rs.quantity
FROM rider_stock rs
LEFT JOIN profiles p ON rs.rider_id = p.user_id
LEFT JOIN products pr ON rs.product_id = pr.id
WHERE rs.quantity > 0
ORDER BY p.full_name NULLS LAST, pr.name;

-- Count orphaned stocks (should be 0 after cleanup)
SELECT 
  COUNT(*) as orphaned_count,
  'These stocks have no associated rider profile' as note
FROM rider_stock rs
LEFT JOIN profiles p ON rs.rider_id = p.user_id
WHERE p.user_id IS NULL;

-- ============================================================
-- 6. MANUAL CLEANUP FUNCTION (for future use)
-- ============================================================
-- If needed, you can call this function manually to cleanup

CREATE OR REPLACE FUNCTION manual_cleanup_orphan_stocks()
RETURNS TABLE (
  deleted_stocks_count INTEGER,
  deleted_distributions_count INTEGER,
  deleted_returns_count INTEGER
) AS $$
DECLARE
  stocks_deleted INTEGER;
  distributions_deleted INTEGER;
  returns_deleted INTEGER;
BEGIN
  -- Delete orphaned rider_stock
  DELETE FROM rider_stock
  WHERE rider_id NOT IN (SELECT user_id FROM profiles);
  GET DIAGNOSTICS stocks_deleted = ROW_COUNT;
  
  -- Delete orphaned distributions
  DELETE FROM distributions
  WHERE rider_id NOT IN (SELECT user_id FROM profiles);
  GET DIAGNOSTICS distributions_deleted = ROW_COUNT;
  
  -- Delete orphaned returns
  DELETE FROM returns
  WHERE rider_id NOT IN (SELECT user_id FROM profiles);
  GET DIAGNOSTICS returns_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT stocks_deleted, distributions_deleted, returns_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. USAGE EXAMPLES
-- ============================================================

-- Example 1: Manual cleanup (if needed in future)
-- SELECT * FROM manual_cleanup_orphan_stocks();

-- Example 2: Check rider stock before deleting rider
/*
SELECT 
  rs.product_id,
  pr.name as product_name,
  rs.quantity
FROM rider_stock rs
JOIN products pr ON rs.product_id = pr.id
WHERE rs.rider_id = 'RIDER_USER_ID_HERE'
AND rs.quantity > 0;
*/

-- Example 3: Safe rider deletion (will auto-cleanup via trigger)
/*
DELETE FROM profiles WHERE user_id = 'RIDER_USER_ID_HERE';
-- Trigger will automatically delete associated rider_stock, distributions, returns
*/

-- ============================================================
-- 8. MONITORING QUERY
-- ============================================================

-- Run this to check for any orphaned data
SELECT 
  'rider_stock' as table_name,
  COUNT(*) as orphaned_count
FROM rider_stock
WHERE rider_id NOT IN (SELECT user_id FROM profiles)

UNION ALL

SELECT 
  'distributions' as table_name,
  COUNT(*) as orphaned_count
FROM distributions
WHERE rider_id NOT IN (SELECT user_id FROM profiles)

UNION ALL

SELECT 
  'returns' as table_name,
  COUNT(*) as orphaned_count
FROM returns
WHERE rider_id NOT IN (SELECT user_id FROM profiles);

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. ✅ Orphaned rider_stock will be deleted immediately
-- 2. ✅ Trigger ensures auto-cleanup on future rider deletions
-- 3. ✅ No more "N/A" in product page rider stocks
-- 4. ✅ Safe: Only deletes data for non-existent riders
-- 5. ✅ Can be run multiple times safely (idempotent)
--
-- ROLLBACK (if needed):
-- DROP TRIGGER IF EXISTS trigger_cleanup_rider_data ON profiles;
-- DROP FUNCTION IF EXISTS cleanup_rider_data_on_delete();
-- DROP FUNCTION IF EXISTS manual_cleanup_orphan_stocks();
-- ============================================================
