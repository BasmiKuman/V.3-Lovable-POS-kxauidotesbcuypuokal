-- ============================================================================
-- CLEAN ALL OLD RLS POLICIES AND CREATE NEW ONES FOR SUPER ADMIN
-- ============================================================================
-- Problem: Duplicate/conflicting policies blocking super_admin access
-- Solution: Drop ALL old policies, create clean new ones
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL OLD POLICIES
-- ============================================================================

-- Drop ALL rider_stock policies
DROP POLICY IF EXISTS "Riders can view own stock" ON rider_stock;
DROP POLICY IF EXISTS "Admins can manage all stock" ON rider_stock;
DROP POLICY IF EXISTS "allow_riders_view_own_stock" ON rider_stock;
DROP POLICY IF EXISTS "allow_admins_manage_stock" ON rider_stock;

-- Drop ALL distributions policies
DROP POLICY IF EXISTS "Users can view relevant distributions" ON distributions;
DROP POLICY IF EXISTS "Admins can create distributions" ON distributions;
DROP POLICY IF EXISTS "allow_view_distributions" ON distributions;
DROP POLICY IF EXISTS "allow_create_distributions" ON distributions;

-- Drop ALL returns policies
DROP POLICY IF EXISTS "Users can view relevant returns" ON returns;
DROP POLICY IF EXISTS "Users can create returns" ON returns;
DROP POLICY IF EXISTS "Admins can update returns" ON returns;
DROP POLICY IF EXISTS "Admins can delete returns" ON returns;
DROP POLICY IF EXISTS "allow_authenticated_select_returns" ON returns;
DROP POLICY IF EXISTS "allow_riders_insert_own_returns" ON returns;
DROP POLICY IF EXISTS "allow_update_returns" ON returns;
DROP POLICY IF EXISTS "allow_delete_returns" ON returns;

-- Drop ALL return_history policies
DROP POLICY IF EXISTS "Users can view relevant return history" ON return_history;
DROP POLICY IF EXISTS "Only admins can insert return history" ON return_history;
DROP POLICY IF EXISTS "allow_view_return_history" ON return_history;
DROP POLICY IF EXISTS "allow_insert_return_history" ON return_history;

-- Drop ALL products policies
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "allow_view_products" ON products;
DROP POLICY IF EXISTS "allow_manage_products" ON products;

-- Drop ALL categories policies
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Everyone can read categories" ON categories;
DROP POLICY IF EXISTS "Only admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Only admins can update categories" ON categories;
DROP POLICY IF EXISTS "Only admins can delete categories" ON categories;
DROP POLICY IF EXISTS "allow_view_categories" ON categories;
DROP POLICY IF EXISTS "allow_manage_categories" ON categories;

-- ============================================================================
-- STEP 2: CREATE CLEAN NEW POLICIES FOR SUPER ADMIN
-- ============================================================================

-- RIDER_STOCK: Riders view own, Admins/Super admins manage all
-- ============================================================================
CREATE POLICY "Riders can view own stock"
ON rider_stock FOR SELECT
TO authenticated
USING (
    auth.uid() = rider_id 
    OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Admins can manage all stock"
ON rider_stock FOR ALL
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- DISTRIBUTIONS: View relevant, Admins create
-- ============================================================================
CREATE POLICY "Users can view relevant distributions"
ON distributions FOR SELECT
TO authenticated
USING (
    auth.uid() = rider_id 
    OR auth.uid() = admin_id 
    OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Admins can create distributions"
ON distributions FOR INSERT
TO authenticated
WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Admins can update distributions"
ON distributions FOR UPDATE
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Admins can delete distributions"
ON distributions FOR DELETE
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- RETURNS: Riders create, Admins manage
-- ============================================================================
CREATE POLICY "Users can view relevant returns"
ON returns FOR SELECT
TO authenticated
USING (
    auth.uid() = rider_id 
    OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Riders can create returns"
ON returns FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Admins can update returns"
ON returns FOR UPDATE
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Admins can delete returns"
ON returns FOR DELETE
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- RETURN_HISTORY: View relevant, Admins insert
-- ============================================================================
CREATE POLICY "Users can view relevant return history"
ON return_history FOR SELECT
TO authenticated
USING (
    auth.uid() = rider_id 
    OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Admins can insert return history"
ON return_history FOR INSERT
TO authenticated
WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- PRODUCTS: All view, Admins manage
-- ============================================================================
CREATE POLICY "Anyone can view products"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert products"
ON products FOR INSERT
TO authenticated
WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Admins can update products"
ON products FOR UPDATE
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Admins can delete products"
ON products FOR DELETE
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- CATEGORIES: All view, Admins manage
-- ============================================================================
CREATE POLICY "Anyone can view categories"
ON categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert categories"
ON categories FOR INSERT
TO authenticated
WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Admins can update categories"
ON categories FOR UPDATE
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Admins can delete categories"
ON categories FOR DELETE
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- ============================================================================
-- STEP 3: VERIFICATION
-- ============================================================================

-- Test 1: Check rider stock access
SELECT 
    'Test 1: Rider stock count' as test_name,
    COUNT(*) as total_rider_stock
FROM rider_stock;

-- Test 2: Check all policies (should be clean now)
SELECT 
    'Test 2: All policies' as test_name,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('rider_stock', 'distributions', 'returns', 'return_history', 'products', 'categories')
GROUP BY tablename
ORDER BY tablename;

-- Test 3: List all policies for review
SELECT 
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('rider_stock', 'distributions', 'returns', 'return_history', 'products', 'categories')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUCCESS! 🎉
-- ============================================================================
-- Expected policy counts:
-- - rider_stock: 2 policies (view own, manage all)
-- - distributions: 4 policies (view, insert, update, delete)
-- - returns: 4 policies (view, insert, update, delete)
-- - return_history: 2 policies (view, insert)
-- - products: 4 policies (view, insert, update, delete)
-- - categories: 4 policies (view, insert, update, delete)
--
-- Now super_admin can accept returns without errors! ✅
-- ============================================================================
