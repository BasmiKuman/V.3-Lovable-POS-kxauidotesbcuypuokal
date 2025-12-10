-- ============================================================================
-- CHECK BERLIANO MAKRAM NAZHEF SALES TODAY
-- ============================================================================
-- Purpose: Verify if sales report showing 42 cups is correct or should be 41
-- Date: 10 December 2025
-- ============================================================================

-- STEP 1: Find Berliano's user_id
-- ============================================================================
SELECT 
  'Berliano Profile' as check_name,
  user_id,
  full_name,
  email
FROM profiles
WHERE LOWER(full_name) LIKE '%berliano%'
   OR LOWER(full_name) LIKE '%makram%'
   OR LOWER(full_name) LIKE '%nazhef%';

-- ============================================================================
-- STEP 2: Get ALL transactions for Berliano TODAY
-- ============================================================================
-- Replace 'BERLIANO_USER_ID' with actual UUID from STEP 1
-- Also adjust date range to today in your timezone

WITH berliano_transactions AS (
  SELECT 
    t.id as transaction_id,
    t.created_at,
    t.total_amount,
    t.rider_id,
    p.full_name as rider_name
  FROM transactions t
  JOIN profiles p ON p.user_id = t.rider_id
  WHERE LOWER(p.full_name) LIKE '%berliano%'
    AND DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
  ORDER BY t.created_at DESC
)
SELECT 
  'Berliano Transactions Today' as check_name,
  transaction_id,
  TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI:SS') as time,
  total_amount,
  rider_name
FROM berliano_transactions;

-- ============================================================================
-- STEP 3: Get DETAILED items for each transaction (with categories)
-- ============================================================================
-- This shows EVERY item sold, including quantity and category

WITH berliano_transactions AS (
  SELECT t.id as transaction_id
  FROM transactions t
  JOIN profiles p ON p.user_id = t.rider_id
  WHERE LOWER(p.full_name) LIKE '%berliano%'
    AND DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
)
SELECT 
  'Transaction Items Detail' as check_name,
  ti.transaction_id,
  p.name as product_name,
  c.name as category_name,
  ti.quantity,
  ti.unit_price,
  ti.subtotal,
  CASE 
    WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN '❌ EXCLUDED (Add-On)'
    ELSE '✅ COUNTED as Cup'
  END as counted_status
FROM transaction_items ti
JOIN products p ON p.id = ti.product_id
LEFT JOIN categories c ON c.id = p.category_id
WHERE ti.transaction_id IN (SELECT transaction_id FROM berliano_transactions)
ORDER BY ti.transaction_id, p.name;

-- ============================================================================
-- STEP 4: Calculate TOTAL CUPS (excluding Add-On)
-- ============================================================================
-- This is the actual calculation used in the report

WITH berliano_transactions AS (
  SELECT t.id as transaction_id
  FROM transactions t
  JOIN profiles p ON p.user_id = t.rider_id
  WHERE LOWER(p.full_name) LIKE '%berliano%'
    AND DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
),
transaction_cups AS (
  SELECT 
    ti.transaction_id,
    SUM(
      CASE 
        WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN 0
        ELSE ti.quantity
      END
    ) as cups_count
  FROM transaction_items ti
  JOIN products p ON p.id = ti.product_id
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE ti.transaction_id IN (SELECT transaction_id FROM berliano_transactions)
  GROUP BY ti.transaction_id
)
SELECT 
  'Total Cups Summary' as check_name,
  COUNT(*) as total_transactions,
  SUM(cups_count) as total_cups_excluding_addon,
  ARRAY_AGG(cups_count ORDER BY transaction_id) as cups_per_transaction
FROM transaction_cups;

-- ============================================================================
-- STEP 5: Show ALL items grouped (to verify count)
-- ============================================================================
-- Summary of each product sold today by Berliano

WITH berliano_transactions AS (
  SELECT t.id as transaction_id
  FROM transactions t
  JOIN profiles p ON p.user_id = t.rider_id
  WHERE LOWER(p.full_name) LIKE '%berliano%'
    AND DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
)
SELECT 
  'Product Summary' as check_name,
  p.name as product_name,
  c.name as category_name,
  SUM(ti.quantity) as total_quantity,
  COUNT(DISTINCT ti.transaction_id) as num_transactions,
  CASE 
    WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN 'NOT COUNTED'
    ELSE 'COUNTED AS CUP'
  END as status
FROM transaction_items ti
JOIN products p ON p.id = ti.product_id
LEFT JOIN categories c ON c.id = p.category_id
WHERE ti.transaction_id IN (SELECT transaction_id FROM berliano_transactions)
GROUP BY p.name, c.name
ORDER BY 
  CASE WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN 1 ELSE 0 END,
  SUM(ti.quantity) DESC;

-- ============================================================================
-- STEP 6: VERIFICATION - Transaction by Transaction Breakdown
-- ============================================================================
-- Shows each transaction with its cup count

WITH berliano_transactions AS (
  SELECT 
    t.id as transaction_id,
    t.created_at,
    p.full_name as rider_name
  FROM transactions t
  JOIN profiles p ON p.user_id = t.rider_id
  WHERE LOWER(p.full_name) LIKE '%berliano%'
    AND DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
)
SELECT 
  'Transaction Breakdown' as check_name,
  bt.transaction_id,
  TO_CHAR(bt.created_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI:SS') as time,
  bt.rider_name,
  COUNT(ti.id) as num_items,
  SUM(
    CASE 
      WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN 0
      ELSE ti.quantity
    END
  ) as cups_in_transaction,
  STRING_AGG(
    p.name || ' x' || ti.quantity || 
    CASE 
      WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN ' (Add-On ❌)'
      ELSE ' ✅'
    END,
    ', '
  ) as items_detail
FROM berliano_transactions bt
JOIN transaction_items ti ON ti.transaction_id = bt.transaction_id
JOIN products p ON p.id = ti.product_id
LEFT JOIN categories c ON c.id = p.category_id
GROUP BY bt.transaction_id, bt.created_at, bt.rider_name
ORDER BY bt.created_at;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- 
-- If report shows 42 cups but should be 41:
-- 
-- Possible causes:
-- 1. ✅ One Add-On item being counted as a cup (bug in category check)
-- 2. ✅ Duplicate transaction entry
-- 3. ✅ Wrong date/time range in report
-- 4. ✅ Manual transaction not recorded properly
-- 5. ✅ Quantity field error (e.g., 2 instead of 1)
-- 
-- How to verify:
-- - Check STEP 4 "total_cups_excluding_addon" - this should match report
-- - Check STEP 5 to see if any Add-On is being counted
-- - Check STEP 6 "cups_in_transaction" to find which transaction has extra cup
-- 
-- ============================================================================
