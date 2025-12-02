-- ============================================================================
-- FIX ALL RLS POLICIES FOR SUPER ADMIN ACCESS
-- ============================================================================
-- Problem: Super admin cannot access various tables (rider_stock, distributions, returns, etc.)
-- Reason: Old policies use has_role() which checks single role only
-- Solution: Update all policies to use public.get_user_role() that supports super_admin
-- ============================================================================

-- Fix rider_stock policies
-- ============================================================================
DROP POLICY IF EXISTS "Riders can view own stock" ON rider_stock;
DROP POLICY IF EXISTS "Admins can manage all stock" ON rider_stock;

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

-- Fix distributions policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can view relevant distributions" ON distributions;
DROP POLICY IF EXISTS "Admins can create distributions" ON distributions;

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

-- Fix returns policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can view relevant returns" ON returns;
DROP POLICY IF EXISTS "Users can create returns" ON returns;
DROP POLICY IF EXISTS "Admins can update returns" ON returns;

CREATE POLICY "Users can view relevant returns"
ON returns FOR SELECT
TO authenticated
USING (
    auth.uid() = rider_id 
    OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Users can create returns"
ON returns FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Admins can update returns"
ON returns FOR UPDATE
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Admins can delete returns"
ON returns FOR DELETE
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- Fix return_history policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can view relevant return history" ON return_history;

CREATE POLICY "Users can view relevant return history"
ON return_history FOR SELECT
TO authenticated
USING (
    auth.uid() = rider_id 
    OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- Fix products policies
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

CREATE POLICY "Anyone can view products"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage products"
ON products FOR ALL
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- Fix categories policies
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

CREATE POLICY "Anyone can view categories"
ON categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage categories"
ON categories FOR ALL
TO authenticated
USING (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test 1: Super admin should see all rider stock
SELECT 
    'Test 1: Rider stock visibility' as test_name,
    COUNT(*) as total_rider_stock
FROM rider_stock;

-- Test 2: Check all updated policies
SELECT 
    'Test 2: Updated policies' as test_name,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('rider_stock', 'distributions', 'returns', 'return_history', 'products', 'categories')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUCCESS! 🎉
-- ============================================================================
-- Now super_admin can:
-- ✅ View and manage all rider stock
-- ✅ Accept/reject returns without errors
-- ✅ Create distributions
-- ✅ View return history
-- ✅ Manage products and categories
-- ============================================================================
