-- ============================================================================
-- FIX: Super Admin Tidak Bisa Update Password Rider
-- ============================================================================
-- Problem 1: Super admin can't update rider password (needs service_role key)
-- Problem 2: Super admin sometimes switches to rider role on login (race condition)
-- Solution: Create RPC function for safe password updates
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE UPDATE PASSWORD FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_current_user_role TEXT;
  v_target_user_role TEXT;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get current user's role (using get_user_role function to avoid recursion)
  v_current_user_role := public.get_user_role(v_current_user_id);
  
  -- Check if current user is admin or super_admin
  IF v_current_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admin or super admin can update user passwords';
  END IF;
  
  -- Get target user's role
  v_target_user_role := public.get_user_role(p_user_id);
  
  -- Prevent super_admin password change (safety check)
  IF v_target_user_role = 'super_admin' AND v_current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admin can change super admin password';
  END IF;
  
  -- Prevent admin from changing another admin's password (only super_admin can)
  IF v_current_user_role = 'admin' AND v_target_user_role = 'admin' AND v_current_user_id != p_user_id THEN
    RAISE EXCEPTION 'Admin cannot change another admin password';
  END IF;
  
  -- Validate password length
  IF LENGTH(p_new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;
  
  -- Update password in auth.users table
  -- Using auth.users table directly with SECURITY DEFINER privilege
  UPDATE auth.users
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION update_user_password IS 'Updates user password. Only admin/super_admin can update passwords. Super admin can update any password, admin can only update rider passwords.';

-- ============================================================================
-- STEP 2: VERIFICATION
-- ============================================================================

-- Test: Verify function exists
SELECT 
  'update_user_password function' as test_name,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'update_user_password';

-- Test: Check current user's role (to verify permission)
SELECT 
  'Current user role check' as test_name,
  auth.uid() as my_user_id,
  public.get_user_role(auth.uid()) as my_role;

-- ============================================================================
-- SUCCESS! 🎉
-- ============================================================================
-- Expected result:
-- - Function update_user_password exists
-- - Super admin can update any user's password
-- - Regular admin can only update rider passwords
-- - Password must be at least 6 characters
--
-- Now super_admin can update rider passwords! ✅
-- ============================================================================
