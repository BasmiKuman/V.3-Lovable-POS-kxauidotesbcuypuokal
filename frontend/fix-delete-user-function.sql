-- Fix delete_user_account function - handle missing tables gracefully
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS delete_user_account(UUID);

CREATE OR REPLACE FUNCTION delete_user_account(
  target_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_current_user_role TEXT;
  v_target_user_role TEXT;
  v_deleted_stock INTEGER := 0;
  v_deleted_distributions INTEGER := 0;
  v_deleted_returns INTEGER := 0;
  v_deleted_transactions INTEGER := 0;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- Check if current user is super_admin
  SELECT role INTO v_current_user_role
  FROM user_roles
  WHERE user_id = v_current_user_id;
  
  IF v_current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can delete user accounts';
  END IF;
  
  -- Get target user role
  SELECT role INTO v_target_user_role
  FROM user_roles
  WHERE user_id = target_user_id;
  
  -- Prevent deleting super_admin
  IF v_target_user_role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot delete super admin account';
  END IF;
  
  -- Prevent self-deletion
  IF target_user_id = v_current_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  
  -- Delete related data CASCADE (in order of dependencies)
  -- Using BEGIN/EXCEPTION blocks to handle missing tables
  
  -- 1. Delete rider_stock
  BEGIN
    DELETE FROM rider_stock WHERE rider_id = target_user_id;
    GET DIAGNOSTICS v_deleted_stock = ROW_COUNT;
  EXCEPTION
    WHEN undefined_table THEN
      v_deleted_stock := 0;
  END;
  
  -- 2. Delete distribution_items first (foreign key to distributions)
  BEGIN
    DELETE FROM distribution_items 
    WHERE distribution_id IN (
      SELECT id FROM distributions WHERE rider_id = target_user_id
    );
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;
  
  -- 3. Delete distributions
  BEGIN
    DELETE FROM distributions WHERE rider_id = target_user_id;
    GET DIAGNOSTICS v_deleted_distributions = ROW_COUNT;
  EXCEPTION
    WHEN undefined_table THEN
      v_deleted_distributions := 0;
  END;
  
  -- 4. Delete return_history first (foreign key to returns)
  BEGIN
    DELETE FROM return_history 
    WHERE return_id IN (
      SELECT id FROM returns WHERE rider_id = target_user_id
    );
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;
  
  -- 5. Delete returns
  BEGIN
    DELETE FROM returns WHERE rider_id = target_user_id;
    GET DIAGNOSTICS v_deleted_returns = ROW_COUNT;
  EXCEPTION
    WHEN undefined_table THEN
      v_deleted_returns := 0;
  END;
  
  -- 6. Delete transaction_items first (foreign key to transactions)
  BEGIN
    DELETE FROM transaction_items 
    WHERE transaction_id IN (
      SELECT id FROM transactions WHERE rider_id = target_user_id
    );
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;
  
  -- 7. Delete transactions
  BEGIN
    DELETE FROM transactions WHERE rider_id = target_user_id;
    GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;
  EXCEPTION
    WHEN undefined_table THEN
      v_deleted_transactions := 0;
  END;
  
  -- 8. Delete transaction_adjustments (for rider)
  BEGIN
    DELETE FROM transaction_adjustments WHERE rider_id = target_user_id;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;
  
  -- 9. Delete from user_roles
  DELETE FROM user_roles WHERE user_id = target_user_id;
  
  -- 10. Delete from profiles
  DELETE FROM profiles WHERE user_id = target_user_id;
  
  -- 11. Delete from auth.users (final step)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User account deleted successfully',
    'deleted_data', json_build_object(
      'stock_items', v_deleted_stock,
      'distributions', v_deleted_distributions,
      'returns', v_deleted_returns,
      'transactions', v_deleted_transactions
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete user account: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

COMMENT ON FUNCTION delete_user_account IS 'Delete user account with all related data (super admin only)';

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'delete_user_account';
