-- ============================================================================
-- COMPREHENSIVE REPORT CALCULATION AUDIT
-- ============================================================================
-- Purpose: Verify all report calculations are accurate
-- Date: 10 December 2025
-- 
-- This script checks:
-- 1. Cup counting logic (exclude Add-On products)
-- 2. Sales totals per rider
-- 3. Transaction counts
-- 4. Category filtering
-- 5. Date range accuracy
-- ============================================================================

-- ============================================================================
-- PART 1: VERIFY ADD-ON CATEGORY DETECTION
-- ============================================================================
-- Check all possible variations of Add-On category names

SELECT 
  'Category Variations Check' as audit_section,
  id,
  name,
  LOWER(name) as lowercase_name,
  CASE 
    WHEN LOWER(name) IN ('add on', 'addon', 'add-on') THEN '✅ Will be EXCLUDED'
    ELSE '⚠️ Will be COUNTED'
  END as cup_counting_status
FROM categories
ORDER BY name;

-- ============================================================================
-- PART 2: VERIFY PRODUCTS ARE CORRECTLY CATEGORIZED
-- ============================================================================
-- Shows all products with their categories

SELECT 
  'Products by Category' as audit_section,
  c.name as category_name,
  COUNT(p.id) as product_count,
  STRING_AGG(p.name, ', ' ORDER BY p.name) as products,
  CASE 
    WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN '❌ NOT COUNTED as cups'
    ELSE '✅ COUNTED as cups'
  END as counting_status
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
GROUP BY c.name
ORDER BY c.name NULLS LAST;

-- ============================================================================
-- PART 3: TODAY'S SALES - ALL RIDERS
-- ============================================================================
-- Comprehensive breakdown for today

WITH todays_transactions AS (
  SELECT 
    t.id as transaction_id,
    t.created_at,
    t.rider_id,
    t.total_amount,
    p.full_name as rider_name
  FROM transactions t
  JOIN profiles p ON p.user_id = t.rider_id
  WHERE DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
),
transaction_details AS (
  SELECT 
    tt.transaction_id,
    tt.rider_id,
    tt.rider_name,
    tt.total_amount,
    tt.created_at,
    -- Count cups (exclude Add-On)
    SUM(
      CASE 
        WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN 0
        ELSE ti.quantity
      END
    ) as cups_in_transaction,
    -- Count all items (including Add-On)
    SUM(ti.quantity) as total_items_including_addon,
    -- Count Add-On items separately
    SUM(
      CASE 
        WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN ti.quantity
        ELSE 0
      END
    ) as addon_items
  FROM todays_transactions tt
  JOIN transaction_items ti ON ti.transaction_id = tt.transaction_id
  JOIN products prod ON prod.id = ti.product_id
  LEFT JOIN categories c ON c.id = prod.category_id
  GROUP BY tt.transaction_id, tt.rider_id, tt.rider_name, tt.total_amount, tt.created_at
)
SELECT 
  'Todays Sales by Rider' as audit_section,
  rider_name,
  COUNT(transaction_id) as total_transactions,
  SUM(cups_in_transaction) as total_cups_excluding_addon,
  SUM(total_items_including_addon) as total_items_with_addon,
  SUM(addon_items) as total_addon_items,
  SUM(total_amount) as total_sales,
  ROUND(AVG(cups_in_transaction), 2) as avg_cups_per_transaction
FROM transaction_details
GROUP BY rider_id, rider_name
ORDER BY total_cups_excluding_addon DESC;

-- ============================================================================
-- PART 4: DETAILED BREAKDOWN - EACH TRANSACTION TODAY
-- ============================================================================
-- Shows every transaction with cup count breakdown

WITH todays_transactions AS (
  SELECT 
    t.id as transaction_id,
    t.created_at,
    t.rider_id,
    t.total_amount,
    p.full_name as rider_name
  FROM transactions t
  JOIN profiles p ON p.user_id = t.rider_id
  WHERE DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
)
SELECT 
  'Transaction Detail Breakdown' as audit_section,
  tt.transaction_id,
  TO_CHAR(tt.created_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI:SS') as time,
  tt.rider_name,
  tt.total_amount,
  SUM(
    CASE 
      WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN 0
      ELSE ti.quantity
    END
  ) as cups_count,
  STRING_AGG(
    prod.name || ' x' || ti.quantity || 
    CASE 
      WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN ' (Add-On ❌)'
      ELSE ' ✅'
    END,
    ', ' ORDER BY prod.name
  ) as items_detail
FROM todays_transactions tt
JOIN transaction_items ti ON ti.transaction_id = tt.transaction_id
JOIN products prod ON prod.id = ti.product_id
LEFT JOIN categories c ON c.id = prod.category_id
GROUP BY tt.transaction_id, tt.created_at, tt.rider_name, tt.total_amount
ORDER BY tt.created_at DESC;

-- ============================================================================
-- PART 5: MONTHLY SUMMARY - CURRENT MONTH
-- ============================================================================
-- Aggregate stats for the entire current month

WITH monthly_transactions AS (
  SELECT 
    t.id as transaction_id,
    t.created_at,
    t.rider_id,
    t.total_amount,
    p.full_name as rider_name
  FROM transactions t
  JOIN profiles p ON p.user_id = t.rider_id
  WHERE DATE_TRUNC('month', t.created_at AT TIME ZONE 'Asia/Jakarta') = DATE_TRUNC('month', CURRENT_DATE)
),
rider_monthly_stats AS (
  SELECT 
    mt.rider_id,
    mt.rider_name,
    COUNT(DISTINCT mt.transaction_id) as total_transactions,
    SUM(mt.total_amount) as total_sales,
    SUM(
      CASE 
        WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN 0
        ELSE ti.quantity
      END
    ) as total_cups
  FROM monthly_transactions mt
  JOIN transaction_items ti ON ti.transaction_id = mt.transaction_id
  JOIN products prod ON prod.id = ti.product_id
  LEFT JOIN categories c ON c.id = prod.category_id
  GROUP BY mt.rider_id, mt.rider_name
)
SELECT 
  'Monthly Summary (Current Month)' as audit_section,
  rider_name,
  total_transactions,
  total_cups,
  total_sales,
  ROUND(total_sales / NULLIF(total_cups, 0), 0) as avg_price_per_cup,
  ROUND(total_cups::NUMERIC / NULLIF(total_transactions, 0), 2) as avg_cups_per_transaction
FROM rider_monthly_stats
ORDER BY total_cups DESC;

-- ============================================================================
-- PART 6: CROSS-CHECK - PRODUCTS SOLD TODAY BY CATEGORY
-- ============================================================================
-- Verify Add-On items are not counted

WITH todays_transactions AS (
  SELECT id as transaction_id
  FROM transactions
  WHERE DATE(created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
)
SELECT 
  'Products Sold Today by Category' as audit_section,
  COALESCE(c.name, 'UNCATEGORIZED') as category_name,
  prod.name as product_name,
  SUM(ti.quantity) as total_quantity_sold,
  COUNT(DISTINCT ti.transaction_id) as num_transactions,
  CASE 
    WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN '❌ NOT COUNTED'
    WHEN c.name IS NULL THEN '⚠️ UNCATEGORIZED (COUNTED)'
    ELSE '✅ COUNTED AS CUP'
  END as counting_status
FROM transaction_items ti
JOIN products prod ON prod.id = ti.product_id
LEFT JOIN categories c ON c.id = prod.category_id
WHERE ti.transaction_id IN (SELECT transaction_id FROM todays_transactions)
GROUP BY c.name, prod.name
ORDER BY 
  CASE 
    WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN 2
    WHEN c.name IS NULL THEN 1
    ELSE 0
  END,
  SUM(ti.quantity) DESC;

-- ============================================================================
-- PART 7: ANOMALY DETECTION
-- ============================================================================
-- Find potential issues in data

SELECT 
  'Anomaly Detection' as audit_section,
  'Products without category' as issue_type,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as affected_items
FROM products
WHERE category_id IS NULL
UNION ALL
SELECT 
  'Anomaly Detection' as audit_section,
  'Transactions without items' as issue_type,
  COUNT(*) as count,
  STRING_AGG(t.id::TEXT, ', ') as affected_items
FROM transactions t
LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
WHERE ti.id IS NULL
  AND DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
UNION ALL
SELECT 
  'Anomaly Detection' as audit_section,
  'Zero quantity items' as issue_type,
  COUNT(*) as count,
  STRING_AGG(ti.id::TEXT, ', ') as affected_items
FROM transaction_items ti
JOIN transactions t ON t.id = ti.transaction_id
WHERE ti.quantity = 0
  AND DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
UNION ALL
SELECT 
  'Anomaly Detection' as audit_section,
  'Negative quantity items' as issue_type,
  COUNT(*) as count,
  STRING_AGG(ti.id::TEXT, ', ') as affected_items
FROM transaction_items ti
JOIN transactions t ON t.id = ti.transaction_id
WHERE ti.quantity < 0
  AND DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE;

-- ============================================================================
-- PART 8: VERIFICATION SUMMARY
-- ============================================================================
-- Final verification numbers

WITH todays_data AS (
  SELECT 
    t.id as transaction_id,
    ti.quantity,
    LOWER(c.name) as category_name
  FROM transactions t
  JOIN transaction_items ti ON ti.transaction_id = t.id
  JOIN products prod ON prod.id = ti.product_id
  LEFT JOIN categories c ON c.id = prod.category_id
  WHERE DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') = CURRENT_DATE
)
SELECT 
  'FINAL VERIFICATION SUMMARY' as audit_section,
  COUNT(DISTINCT transaction_id) as total_transactions_today,
  SUM(quantity) as total_items_sold_including_addon,
  SUM(
    CASE 
      WHEN category_name IN ('add on', 'addon', 'add-on') THEN 0
      ELSE quantity
    END
  ) as total_cups_excluding_addon,
  SUM(
    CASE 
      WHEN category_name IN ('add on', 'addon', 'add-on') THEN quantity
      ELSE 0
    END
  ) as total_addon_items_excluded,
  ROUND(
    SUM(
      CASE 
        WHEN category_name IN ('add on', 'addon', 'add-on') THEN 0
        ELSE quantity
      END
    )::NUMERIC / NULLIF(COUNT(DISTINCT transaction_id), 0),
    2
  ) as avg_cups_per_transaction
FROM todays_data;

-- ============================================================================
-- EXPECTED RESULTS & VALIDATION
-- ============================================================================
-- 
-- What to check:
-- 
-- 1. PART 1: All Add-On variations should show "Will be EXCLUDED"
--    - "Add On", "addon", "add-on" all should be caught
-- 
-- 2. PART 2: Verify product categorization
--    - Syrup products should be in "Add On" category
--    - Drink products (Kopi, Teh, etc) should NOT be in "Add On"
-- 
-- 3. PART 3 & 4: Compare with frontend report
--    - Total cups should match what's shown in Reports page
--    - Each rider's count should match their individual stats
-- 
-- 4. PART 5: Monthly summary should match Monthly Summary tab
-- 
-- 5. PART 6: Verify no Add-On products are counted
--    - All syrups should show "NOT COUNTED"
--    - All drinks should show "COUNTED AS CUP"
-- 
-- 6. PART 7: Check for data issues
--    - Products without category = potential counting errors
--    - Transactions without items = data corruption
--    - Zero/negative quantities = data entry errors
-- 
-- 7. PART 8: Final numbers
--    - Compare "total_cups_excluding_addon" with frontend report
--    - Should match exactly!
-- 
-- ============================================================================
