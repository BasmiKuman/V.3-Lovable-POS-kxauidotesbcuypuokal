-- ============================================
-- CLEANUP DATA AKUN "percobaan sistem"
-- ============================================
-- Purpose: Menghapus semua data transaksi, laporan, dan stok
-- untuk akun testing "percobaan sistem"
-- Date: December 11, 2024
-- CAUTION: This will delete ALL data for this user!
-- ============================================

-- Step 1: Set user_id for "percobaan sistem"
DO $$
DECLARE
  v_user_id UUID := '9a04d367-2016-4212-a923-9bac493c72e2';
  v_user_name TEXT;
  v_deleted_transactions INT;
  v_deleted_items INT;
  v_deleted_distributions INT;
  v_deleted_rider_stock INT;
  v_deleted_eod_reports INT;
  v_deleted_eod_items INT;
  v_deleted_adjustments INT;
  v_deleted_product_changes INT;
BEGIN
  -- Verify user exists and get name
  SELECT full_name INTO v_user_name
  FROM profiles
  WHERE user_id = v_user_id;
  
  IF v_user_name IS NULL THEN
    RAISE EXCEPTION 'User with ID % tidak ditemukan!', v_user_id;
  END IF;
  
  RAISE NOTICE 'Target user_id: %', v_user_id;
  RAISE NOTICE 'Target user name: %', v_user_name;
  RAISE NOTICE 'Starting cleanup for user: percobaan sistem';
  RAISE NOTICE '================================================';
  
  -- Step 2: Delete transaction_items (child of transactions)
  DELETE FROM transaction_items
  WHERE transaction_id IN (
    SELECT id FROM transactions WHERE rider_id = v_user_id
  );
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted % transaction_items', v_deleted_items;
  
  -- Step 3: Delete transactions
  DELETE FROM transactions
  WHERE rider_id = v_user_id;
  GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;
  RAISE NOTICE 'Deleted % transactions', v_deleted_transactions;
  
  -- Step 4: Delete end_of_day_items (child of end_of_day_reports)
  DELETE FROM end_of_day_items
  WHERE report_id IN (
    SELECT id FROM end_of_day_reports WHERE rider_id = v_user_id
  );
  GET DIAGNOSTICS v_deleted_eod_items = ROW_COUNT;
  RAISE NOTICE 'Deleted % end_of_day_items', v_deleted_eod_items;
  
  -- Step 5: Delete stock_adjustments
  DELETE FROM stock_adjustments
  WHERE rider_id = v_user_id;
  GET DIAGNOSTICS v_deleted_adjustments = ROW_COUNT;
  RAISE NOTICE 'Deleted % stock_adjustments', v_deleted_adjustments;
  
  -- Step 6: Delete end_of_day_reports
  DELETE FROM end_of_day_reports
  WHERE rider_id = v_user_id;
  GET DIAGNOSTICS v_deleted_eod_reports = ROW_COUNT;
  RAISE NOTICE 'Deleted % end_of_day_reports', v_deleted_eod_reports;
  
  -- Step 7: Delete distributions
  DELETE FROM distributions
  WHERE rider_id = v_user_id;
  GET DIAGNOSTICS v_deleted_distributions = ROW_COUNT;
  RAISE NOTICE 'Deleted % distributions', v_deleted_distributions;
  
  -- Step 8: Delete rider_stock
  DELETE FROM rider_stock
  WHERE rider_id = v_user_id;
  GET DIAGNOSTICS v_deleted_rider_stock = ROW_COUNT;
  RAISE NOTICE 'Deleted % rider_stock records', v_deleted_rider_stock;
  
  -- Step 9: Delete product_changes (if exists)
  BEGIN
    DELETE FROM product_changes
    WHERE changed_by = v_user_id;
    GET DIAGNOSTICS v_deleted_product_changes = ROW_COUNT;
    RAISE NOTICE 'Deleted % product_changes', v_deleted_product_changes;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'Table product_changes does not exist, skipping';
  END;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'CLEANUP COMPLETED for user: %', v_user_name;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Transaction Items: %', v_deleted_items;
  RAISE NOTICE '  - Transactions: %', v_deleted_transactions;
  RAISE NOTICE '  - End of Day Items: %', v_deleted_eod_items;
  RAISE NOTICE '  - Stock Adjustments: %', v_deleted_adjustments;
  RAISE NOTICE '  - End of Day Reports: %', v_deleted_eod_reports;
  RAISE NOTICE '  - Distributions: %', v_deleted_distributions;
  RAISE NOTICE '  - Rider Stock: %', v_deleted_rider_stock;
  RAISE NOTICE '================================================';
  RAISE NOTICE 'User can now start fresh testing!';
  
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify cleanup was successful:

-- Check remaining transactions for user
SELECT COUNT(*) as remaining_transactions
FROM transactions
WHERE rider_id = '9a04d367-2016-4212-a923-9bac493c72e2';

-- Check remaining distributions
SELECT COUNT(*) as remaining_distributions
FROM distributions
WHERE rider_id = '9a04d367-2016-4212-a923-9bac493c72e2';

-- Check remaining rider_stock
SELECT COUNT(*) as remaining_rider_stock
FROM rider_stock
WHERE rider_id = '9a04d367-2016-4212-a923-9bac493c72e2';

-- Check remaining end_of_day_reports
SELECT COUNT(*) as remaining_eod_reports
FROM end_of_day_reports
WHERE rider_id = '9a04d367-2016-4212-a923-9bac493c72e2';

-- Summary: Show user info
SELECT 
  p.user_id,
  p.full_name,
  ur.role,
  (SELECT COUNT(*) FROM transactions WHERE rider_id = p.user_id) as transaction_count,
  (SELECT COUNT(*) FROM distributions WHERE rider_id = p.user_id) as distribution_count,
  (SELECT COUNT(*) FROM rider_stock WHERE rider_id = p.user_id) as rider_stock_count,
  (SELECT COUNT(*) FROM end_of_day_reports WHERE rider_id = p.user_id) as eod_report_count
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE p.user_id = '9a04d367-2016-4212-a923-9bac493c72e2';
