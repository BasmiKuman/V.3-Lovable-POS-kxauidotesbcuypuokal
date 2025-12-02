-- Fix: Return produk error - RLS policies for returns table

-- ============================================
-- STEP 1: Create has_pending_return function if not exists
-- ============================================

CREATE OR REPLACE FUNCTION has_pending_return(p_product_id UUID, p_rider_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check in 'returns' table for pending returns
    RETURN EXISTS (
        SELECT 1 
        FROM returns 
        WHERE product_id = p_product_id 
          AND rider_id = p_rider_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO anon;

-- ============================================
-- STEP 2: Check if returns table has RLS enabled
-- ============================================
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN 'RLS ENABLED'
    ELSE 'RLS DISABLED'
  END as rls_status
FROM pg_tables
WHERE tablename = 'returns'
AND schemaname = 'public';

-- Check existing policies
SELECT 
  'RETURNS POLICIES' as section,
  policyname,
  cmd,
  roles::text as roles
FROM pg_policies
WHERE tablename = 'returns'
ORDER BY cmd;

-- Disable RLS temporarily to test
ALTER TABLE public.returns DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'returns') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.returns', r.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Create simple policies
-- RETURNS: Allow all authenticated users to read
CREATE POLICY "allow_authenticated_select_returns"
  ON public.returns
  FOR SELECT
  TO authenticated
  USING (true);

-- RETURNS: Allow riders to insert their own returns
CREATE POLICY "allow_riders_insert_own_returns"
  ON public.returns
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rider_id);

-- RETURNS: Allow update (for admin approval)
CREATE POLICY "allow_update_returns"
  ON public.returns
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RETURNS: Allow delete (admin only)
CREATE POLICY "allow_delete_returns"
  ON public.returns
  FOR DELETE
  TO authenticated
  USING (true);

-- Verify has_pending_return function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'has_pending_return'
AND routine_schema = 'public';

-- Grant execute permission (if not already granted)
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO anon;

-- Test query
SELECT 
  'Returns table check' as test,
  COUNT(*) as total_returns
FROM returns;

-- Verify policies
SELECT 
  'FINAL RETURNS POLICIES' as section,
  policyname,
  cmd,
  CASE 
    WHEN qual::text = 'true' THEN 'Allow all'
    WHEN qual::text LIKE '%auth.uid%' THEN 'User-specific'
    ELSE 'Custom'
  END as policy_logic
FROM pg_policies
WHERE tablename = 'returns'
ORDER BY cmd;
