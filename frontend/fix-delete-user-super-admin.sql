-- ============================================================================
-- FIX DELETE USER FOR SUPER ADMIN
-- ============================================================================
-- Problem: Super admin can't delete users because it uses Admin API
--          which requires service_role key
-- Solution: Create database function to handle user deletion using RLS
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE DELETE USER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_user_account(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_current_user_role TEXT;
  v_target_user_role TEXT;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- Get current user's role
  v_current_user_role := public.get_user_role(v_current_user_id);
  
  -- Check if current user is admin or super_admin
  IF v_current_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admin or super admin can delete users';
  END IF;
  
  -- Get target user's role
  v_target_user_role := public.get_user_role(p_user_id);
  
  -- Prevent deleting super_admin (safety check)
  IF v_target_user_role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot delete super admin account';
  END IF;
  
  -- Prevent admin from deleting another admin (only super_admin can)
  IF v_current_user_role = 'admin' AND v_target_user_role = 'admin' THEN
    RAISE EXCEPTION 'Admin cannot delete another admin account';
  END IF;
  
  -- Delete rider_stock if user is a rider
  IF v_target_user_role = 'rider' THEN
    DELETE FROM rider_stock WHERE rider_id = p_user_id;
  END IF;
  
  -- Delete user_roles
  DELETE FROM user_roles WHERE user_id = p_user_id;
  
  -- Delete profile
  DELETE FROM profiles WHERE user_id = p_user_id;
  
  -- Note: We cannot delete from auth.users table directly
  -- The auth.users record will remain but user won't be able to login
  -- without a profile and role
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

COMMENT ON FUNCTION delete_user_account IS 'Deletes user account (profile and roles). Only admin/super_admin can delete users.';

-- ============================================================================
-- STEP 2: VERIFICATION
-- ============================================================================

-- Test: Verify function exists
SELECT 
  'delete_user_account function' as test_name,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'delete_user_account';

-- ============================================================================
-- SUCCESS! 🎉
-- ============================================================================
-- Expected result:
-- - Function delete_user_account exists
-- - Super admin can delete rider and admin users
-- - Super admin cannot be deleted (protected)
--
-- Now super_admin can delete users! ✅
-- ============================================================================
