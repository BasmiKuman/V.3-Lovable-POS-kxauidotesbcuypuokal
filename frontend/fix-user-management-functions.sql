-- Fix User Management Functions
-- Run this in Supabase SQL Editor

-- ============================================================
-- PART 0: Drop existing functions first
-- ============================================================

DROP FUNCTION IF EXISTS update_user_password(UUID, TEXT);
DROP FUNCTION IF EXISTS delete_user_account(UUID);

-- ============================================================
-- PART 1: Create update_user_password function
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_current_user_role TEXT;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- Check if current user is admin/super_admin
  SELECT role INTO v_current_user_role
  FROM user_roles
  WHERE user_id = v_current_user_id;
  
  IF v_current_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admins can update user passwords';
  END IF;
  
  -- Update password using auth.users (bypassing auth constraints)
  UPDATE auth.users
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Password updated successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update password: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION update_user_password IS 'Update user password (admin only)';

-- ============================================================
-- PART 2: Create delete_user_account function
-- ============================================================

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
  
  -- 1. Delete rider_stock
  DELETE FROM rider_stock WHERE rider_id = target_user_id;
  GET DIAGNOSTICS v_deleted_stock = ROW_COUNT;
  
  -- 2. Delete distribution_items first (foreign key to distributions)
  DELETE FROM distribution_items 
  WHERE distribution_id IN (
    SELECT id FROM distributions WHERE rider_id = target_user_id
  );
  
  -- 3. Delete distributions
  DELETE FROM distributions WHERE rider_id = target_user_id;
  GET DIAGNOSTICS v_deleted_distributions = ROW_COUNT;
  
  -- 4. Delete return_history first (foreign key to returns)
  DELETE FROM return_history 
  WHERE return_id IN (
    SELECT id FROM returns WHERE rider_id = target_user_id
  );
  
  -- 5. Delete returns
  DELETE FROM returns WHERE rider_id = target_user_id;
  GET DIAGNOSTICS v_deleted_returns = ROW_COUNT;
  
  -- 6. Delete transaction_items first (foreign key to transactions)
  DELETE FROM transaction_items 
  WHERE transaction_id IN (
    SELECT id FROM transactions WHERE rider_id = target_user_id
  );
  
  -- 7. Delete transactions
  DELETE FROM transactions WHERE rider_id = target_user_id;
  GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;
  
  -- 8. Delete transaction_adjustments (for rider)
  DELETE FROM transaction_adjustments WHERE rider_id = target_user_id;
  
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
-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check if functions exist
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  prosecdef as security_definer
FROM pg_proc 
WHERE proname IN ('update_user_password', 'delete_user_account')
ORDER BY proname;
