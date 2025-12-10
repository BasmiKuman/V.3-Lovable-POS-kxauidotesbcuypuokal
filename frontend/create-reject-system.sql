-- ============================================================================
-- CREATE REJECT SYSTEM FOR DAMAGED PRODUCTS
-- ============================================================================
-- Purpose: Separate damaged/unsellable products from regular returns
-- Reject products DO NOT go back to warehouse stock
-- Return products DO go back to warehouse stock
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE REJECTS TABLE (similar to returns but separate)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rejects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  returned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rejects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: CREATE REJECT_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reject_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  notes TEXT,
  returned_at TIMESTAMP WITH TIME ZONE NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reject_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: RLS POLICIES FOR REJECTS
-- ============================================================================

-- Riders can create their own rejects
CREATE POLICY "Riders can create own rejects"
  ON public.rejects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rider_id);

-- Riders can view their own rejects
CREATE POLICY "Riders can view own rejects"
  ON public.rejects FOR SELECT
  TO authenticated
  USING (auth.uid() = rider_id);

-- Admins can view all rejects
CREATE POLICY "Admins can view all rejects"
  ON public.rejects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can update rejects (approve/reject)
CREATE POLICY "Admins can update rejects"
  ON public.rejects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can delete rejects
CREATE POLICY "Admins can delete rejects"
  ON public.rejects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- STEP 4: RLS POLICIES FOR REJECT_HISTORY
-- ============================================================================

-- Anyone can view reject history (for transparency)
CREATE POLICY "Authenticated users can view reject history"
  ON public.reject_history FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert reject history
CREATE POLICY "Admins can insert reject history"
  ON public.reject_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- STEP 5: CREATE FUNCTION TO CHECK PENDING REJECT
-- ============================================================================

CREATE OR REPLACE FUNCTION has_pending_reject(
  p_rider_id UUID,
  p_product_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM rejects
    WHERE rider_id = p_rider_id
    AND product_id = p_product_id
    AND status = 'pending'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION has_pending_reject(UUID, UUID) TO authenticated;

-- ============================================================================
-- STEP 6: VERIFY TABLES AND POLICIES
-- ============================================================================

-- Check rejects table
SELECT 
  'Rejects table' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'rejects'
ORDER BY ordinal_position;

-- Check reject_history table
SELECT 
  'Reject_history table' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'reject_history'
ORDER BY ordinal_position;

-- Check rejects policies
SELECT 
  'Rejects policies' as check_name,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'rejects'
AND schemaname = 'public'
ORDER BY policyname;

-- Check reject_history policies
SELECT 
  'Reject_history policies' as check_name,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'reject_history'
AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 
-- REJECT vs RETURN:
-- 
-- RETURN (Normal):
-- - Product can be resold
-- - Goes back to warehouse stock (stock_in_warehouse++)
-- - Admin approves → stock reduced from rider, added to warehouse
-- 
-- REJECT (Damaged):
-- - Product damaged/expired/unsellable
-- - Does NOT go back to warehouse stock
-- - Admin approves → stock reduced from rider, NOT added to warehouse
-- - Effectively removes product from circulation
-- 
-- UI Differences:
-- - Return: Blue/Green theme
-- - Reject: Red theme (danger/warning)
-- 
-- ============================================================================
