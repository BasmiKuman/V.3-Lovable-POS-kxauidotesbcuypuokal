-- ============================================
-- FIX: Stock Opname Adjustment Payment Method
-- ============================================
-- Issue: SO adjustment fails due to payment_method validation
-- Solution: Change payment_method from 'Stock Adjustment' to 'tunai' (default)
-- Date: December 17, 2025
-- ============================================

-- Drop and recreate the function with fixed payment_method
CREATE OR REPLACE FUNCTION generate_adjustment_transaction(
  p_report_id UUID,
  p_rider_id UUID,
  p_submitted_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_item RECORD;
  v_subtotal DECIMAL(10,2) := 0;
BEGIN
  -- Get items that need adjustment
  FOR v_item IN
    SELECT 
      product_id,
      adjustment_quantity,
      (SELECT price FROM products WHERE id = product_id) as price
    FROM end_of_day_items
    WHERE report_id = p_report_id
    AND adjustment_quantity > 0
  LOOP
    v_subtotal := v_subtotal + (v_item.adjustment_quantity * v_item.price);
  END LOOP;
  
  -- Only create transaction if there are adjustments
  IF v_subtotal > 0 THEN
    -- Create adjustment transaction with payment_method = 'tunai' (default for adjustments)
    -- Notes will indicate this is from Stock Adjustment
    INSERT INTO transactions (
      rider_id,
      subtotal,
      tax_amount,
      total_amount,
      payment_method,
      notes
    )
    VALUES (
      p_rider_id,
      v_subtotal,
      0,
      v_subtotal,
      'tunai',
      'Stock Adjustment - Auto-generated from end-of-day stock count'
    )
    RETURNING id INTO v_transaction_id;
    
    -- Create transaction items
    FOR v_item IN
      SELECT 
        product_id,
        adjustment_quantity,
        (SELECT price FROM products WHERE id = product_id) as price
      FROM end_of_day_items
      WHERE report_id = p_report_id
      AND adjustment_quantity > 0
    LOOP
      INSERT INTO transaction_items (
        transaction_id,
        product_id,
        quantity,
        price,
        subtotal
      )
      VALUES (
        v_transaction_id,
        v_item.product_id,
        v_item.adjustment_quantity,
        v_item.price,
        v_item.adjustment_quantity * v_item.price
      );
      
      -- Create stock adjustment record
      INSERT INTO stock_adjustments (
        report_id,
        transaction_id,
        rider_id,
        product_id,
        quantity,
        created_by
      )
      VALUES (
        p_report_id,
        v_transaction_id,
        p_rider_id,
        v_item.product_id,
        v_item.adjustment_quantity,
        p_submitted_by
      );
    END LOOP;
  END IF;
  
  RETURN v_transaction_id;
END;
$$;

-- ============================================
-- INSTRUCTIONS:
-- ============================================
-- 1. Copy this SQL script
-- 2. Open Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. Test SO submission with adjustment
-- 
-- WHAT CHANGED:
-- - payment_method changed from 'Stock Adjustment' to 'tunai'
-- - notes updated to include 'Stock Adjustment - ' prefix
-- - This ensures compatibility with payment_method validation
--
-- HOW TO IDENTIFY:
-- - Adjustment transactions will have notes starting with 'Stock Adjustment - '
-- - payment_method will be 'tunai' (not 'Stock Adjustment')
-- - Can still be tracked via stock_adjustments table
-- ============================================
