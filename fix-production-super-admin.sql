-- ============================================================================
-- FIX PRODUCTION ACCESS FOR SUPER ADMIN
-- ============================================================================
-- Problem: production_history RLS policies and add_production function
--          only allow 'admin', not 'super_admin'
-- Solution: Update all policies and function to include super_admin
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL OLD AND NEW PRODUCTION_HISTORY POLICIES
-- ============================================================================

-- Drop old policy names
DROP POLICY IF EXISTS "Admin can view all production history" ON production_history;
DROP POLICY IF EXISTS "Admin can insert production history" ON production_history;
DROP POLICY IF EXISTS "Admin can update production history" ON production_history;
DROP POLICY IF EXISTS "Admin can delete production history" ON production_history;

-- Drop new policy names (in case they already exist)
DROP POLICY IF EXISTS "Admins can view all production history" ON production_history;
DROP POLICY IF EXISTS "Admins can insert production history" ON production_history;
DROP POLICY IF EXISTS "Admins can update production history" ON production_history;
DROP POLICY IF EXISTS "Admins can delete production history" ON production_history;

-- ============================================================================
-- STEP 2: CREATE NEW POLICIES WITH SUPER ADMIN SUPPORT
-- ============================================================================

-- Admin and Super Admin can view all production history
CREATE POLICY "Admins can view all production history"
  ON production_history
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Admin and Super Admin can insert production history
CREATE POLICY "Admins can insert production history"
  ON production_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Admin and Super Admin can update production history
CREATE POLICY "Admins can update production history"
  ON production_history
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Admin and Super Admin can delete production history
CREATE POLICY "Admins can delete production history"
  ON production_history
  FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- ============================================================================
-- STEP 3: UPDATE add_production FUNCTION
-- ============================================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS add_production(UUID, INTEGER, TEXT);

-- Create new function with super_admin support
CREATE OR REPLACE FUNCTION add_production(
  p_product_id UUID,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_production_id UUID;
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get user role using our safe function
  v_user_role := public.get_user_role(v_user_id);
  
  -- Check if user is admin or super_admin
  IF v_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admin or super admin can add production';
  END IF;

  -- Check if product exists
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Insert production history
  INSERT INTO production_history (product_id, quantity, notes, produced_by)
  VALUES (p_product_id, p_quantity, p_notes, v_user_id)
  RETURNING id INTO v_production_id;

  -- Update product stock
  UPDATE products
  SET stock_in_warehouse = stock_in_warehouse + p_quantity
  WHERE id = p_product_id;

  RETURN v_production_id;
END;
$$;

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

-- Test 1: Check production_history policies
SELECT 
  'Test 1: production_history policies' as test_name,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'production_history'
GROUP BY tablename;

-- Test 2: List all production_history policies
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'production_history'
ORDER BY policyname;

-- Test 3: Verify add_production function exists
SELECT 
  'Test 3: add_production function' as test_name,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'add_production';

-- ============================================================================
-- SUCCESS! 🎉
-- ============================================================================
-- Expected results:
-- - production_history: 4 policies (view, insert, update, delete)
-- - All policies support both 'admin' and 'super_admin'
-- - add_production function updated to allow super_admin
--
-- Now super_admin can add production! ✅
-- ============================================================================
