-- Fix: Payment Method Inconsistency & Add Transaction Delete with Audit
-- Run this in Supabase SQL Editor

-- ============================================================
-- PART 1: Create transaction_adjustments table for audit log
-- ============================================================

CREATE TABLE IF NOT EXISTS transaction_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'deleted', 'edited', etc
  reason TEXT NOT NULL,
  adjusted_by UUID REFERENCES auth.users(id) NOT NULL,
  adjusted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Store transaction snapshot before deletion
  transaction_snapshot JSONB,
  
  -- Additional metadata
  rider_id UUID,
  rider_name TEXT,
  total_amount DECIMAL(10,2),
  payment_method VARCHAR(20),
  transaction_date TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE transaction_adjustments ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can insert adjustments
CREATE POLICY "Admins can insert adjustments"
ON transaction_adjustments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Policy: Admins can view all adjustments
CREATE POLICY "Admins can view all adjustments"
ON transaction_adjustments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Grant permissions
GRANT SELECT, INSERT ON transaction_adjustments TO authenticated;

-- ============================================================
-- PART 2: Create delete_transaction function
-- ============================================================

CREATE OR REPLACE FUNCTION delete_transaction(
  p_transaction_id UUID,
  p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_transaction RECORD;
  v_rider_name TEXT;
  v_deleted_items INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = v_user_id;
  
  IF v_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admins can delete transactions';
  END IF;
  
  -- Get transaction details for audit
  SELECT 
    t.*,
    p.full_name as rider_name
  INTO v_transaction
  FROM transactions t
  LEFT JOIN profiles p ON p.user_id = t.rider_id
  WHERE t.id = p_transaction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Get transaction items for snapshot
  WITH transaction_data AS (
    SELECT json_agg(
      json_build_object(
        'product_id', ti.product_id,
        'product_name', pr.name,
        'quantity', ti.quantity,
        'price', ti.price,
        'subtotal', ti.subtotal
      )
    ) as items
    FROM transaction_items ti
    LEFT JOIN products pr ON pr.id = ti.product_id
    WHERE ti.transaction_id = p_transaction_id
  )
  -- Insert audit record BEFORE deleting
  INSERT INTO transaction_adjustments (
    transaction_id,
    action,
    reason,
    adjusted_by,
    rider_id,
    rider_name,
    total_amount,
    payment_method,
    transaction_date,
    transaction_snapshot
  )
  SELECT
    p_transaction_id,
    'deleted',
    p_reason,
    v_user_id,
    v_transaction.rider_id,
    v_transaction.rider_name,
    v_transaction.total_amount,
    v_transaction.payment_method,
    v_transaction.created_at,
    json_build_object(
      'id', v_transaction.id,
      'rider_id', v_transaction.rider_id,
      'rider_name', v_transaction.rider_name,
      'subtotal', v_transaction.subtotal,
      'tax_amount', v_transaction.tax_amount,
      'total_amount', v_transaction.total_amount,
      'payment_method', v_transaction.payment_method,
      'notes', v_transaction.notes,
      'created_at', v_transaction.created_at,
      'items', (SELECT items FROM transaction_data)
    )
  FROM transaction_data;
  
  -- Delete transaction_items first (foreign key constraint)
  DELETE FROM transaction_items
  WHERE transaction_id = p_transaction_id;
  
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  
  -- Delete transaction
  DELETE FROM transactions
  WHERE id = p_transaction_id;
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'message', 'Transaction deleted successfully',
    'deleted_items', v_deleted_items,
    'transaction_id', p_transaction_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete transaction: %', SQLERRM;
END;
$$;

-- Grant execute to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION delete_transaction(UUID, TEXT) TO authenticated;

-- ============================================================
-- PART 3: Fix existing transactions with 'cash' to 'tunai'
-- ============================================================

-- Update transactions with 'cash' to 'tunai' for consistency
UPDATE transactions
SET payment_method = 'tunai'
WHERE payment_method = 'cash';

-- Verify the update
SELECT 
  payment_method, 
  COUNT(*) as count
FROM transactions
GROUP BY payment_method
ORDER BY payment_method;

-- ============================================================
-- PART 4: Add check constraint for payment_method (optional)
-- ============================================================

-- Drop existing constraint if exists
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_payment_method;

-- Add constraint to ensure only 'tunai' or 'qris'
ALTER TABLE transactions
ADD CONSTRAINT check_payment_method
CHECK (payment_method IN ('tunai', 'qris'));

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check transaction_adjustments table
SELECT * FROM transaction_adjustments LIMIT 5;

-- Check delete_transaction function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'delete_transaction';

-- Check payment_method values
SELECT payment_method, COUNT(*) 
FROM transactions 
GROUP BY payment_method;

COMMENT ON TABLE transaction_adjustments IS 'Audit log for transaction deletions and adjustments';
COMMENT ON FUNCTION delete_transaction IS 'Delete transaction with full audit trail (admin only)';
