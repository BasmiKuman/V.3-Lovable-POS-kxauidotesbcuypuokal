-- ============================================
-- VERIFY: Stock Opname Adjustment Creates Transactions
-- ============================================
-- Purpose: Verify that SO adjustments create transactions that appear in reports
-- Date: December 12, 2024
-- ============================================

-- Step 1: Check if there are any Stock Adjustment transactions
SELECT 
  'Stock Adjustment Transactions' as check_type,
  COUNT(*) as total_count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM transactions
WHERE payment_method = 'Stock Adjustment';

-- Step 2: Show recent Stock Adjustment transactions with details
SELECT 
  t.id as transaction_id,
  t.created_at,
  p.full_name as rider_name,
  t.subtotal,
  t.total_amount,
  t.notes,
  t.payment_method,
  (SELECT COUNT(*) FROM transaction_items WHERE transaction_id = t.id) as item_count
FROM transactions t
LEFT JOIN profiles p ON t.rider_id = p.user_id
WHERE t.payment_method = 'Stock Adjustment'
ORDER BY t.created_at DESC
LIMIT 10;

-- Step 3: Show Stock Adjustment transaction items (what products were adjusted)
SELECT 
  t.created_at as transaction_date,
  p.full_name as rider_name,
  prod.name as product_name,
  ti.quantity as adjustment_quantity,
  ti.price,
  ti.subtotal,
  t.notes
FROM transactions t
LEFT JOIN profiles p ON t.rider_id = p.user_id
JOIN transaction_items ti ON t.id = ti.transaction_id
JOIN products prod ON ti.product_id = prod.id
WHERE t.payment_method = 'Stock Adjustment'
ORDER BY t.created_at DESC
LIMIT 20;

-- Step 4: Cross-check with stock_adjustments table
SELECT 
  sa.created_at,
  p.full_name as rider_name,
  prod.name as product_name,
  sa.quantity as adjustment_qty,
  sa.transaction_id,
  eod.report_date as so_date,
  eod.status as so_status
FROM stock_adjustments sa
LEFT JOIN profiles p ON sa.rider_id = p.user_id
LEFT JOIN products prod ON sa.product_id = prod.id
LEFT JOIN end_of_day_reports eod ON sa.report_id = eod.id
ORDER BY sa.created_at DESC
LIMIT 10;

-- Step 5: Verify end_of_day_reports that have adjustments
SELECT 
  eod.id as report_id,
  eod.report_date,
  p.full_name as rider_name,
  eod.status,
  eod.submitted_at,
  (SELECT COUNT(*) 
   FROM end_of_day_items 
   WHERE report_id = eod.id 
   AND adjustment_quantity > 0) as products_with_adjustment,
  (SELECT SUM(adjustment_quantity) 
   FROM end_of_day_items 
   WHERE report_id = eod.id) as total_adjustment
FROM end_of_day_reports eod
LEFT JOIN profiles p ON eod.rider_id = p.user_id
WHERE eod.status = 'submitted'
ORDER BY eod.submitted_at DESC
LIMIT 10;

-- Step 6: TEST QUERY - Simulate what Reports page queries
-- This shows what admin sees in Reports page
SELECT 
  t.id,
  t.created_at,
  p.full_name as rider_name,
  t.payment_method,
  t.total_amount,
  t.notes,
  CASE 
    WHEN t.payment_method = 'Stock Adjustment' THEN '🔧 Adjustment'
    ELSE t.payment_method 
  END as display_payment_method
FROM transactions t
LEFT JOIN profiles p ON t.rider_id = p.user_id
WHERE DATE(t.created_at) = CURRENT_DATE
ORDER BY t.created_at DESC;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- If SO adjustments are working correctly:
-- 
-- 1. Step 1: Should show count > 0 if any SO with adjustments submitted
-- 2. Step 2: Should list transactions with payment_method = 'Stock Adjustment'
-- 3. Step 3: Should show the actual products that were adjusted
-- 4. Step 4: Should show matching records in stock_adjustments table
-- 5. Step 5: Should show SO reports that created those adjustments
-- 6. Step 6: Should show how transactions appear in Reports page
--
-- If count = 0 in Step 1:
-- - No SO with adjustment has been submitted yet
-- - Or generate_adjustment_transaction function has issues
--
-- ============================================
-- TROUBLESHOOTING:
-- ============================================
-- If no Stock Adjustment transactions found:
-- 1. Check if any SO has been submitted with adjustment > 0
-- 2. Verify generate_adjustment_transaction function exists
-- 3. Check function permissions (GRANT EXECUTE)
-- 4. Look for errors in end_of_day_reports submission
--
-- If transactions exist but not showing in Reports:
-- 1. Check date filter in Reports page
-- 2. Check rider filter in Reports page
-- 3. Verify transaction.created_at is correct
-- 4. Check if UI filters out certain payment_method values
