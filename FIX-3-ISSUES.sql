-- ============================================
-- FINAL FIX untuk 3 masalah utama
-- ============================================
-- 1. Email verified redirect → Fixed di code (EmailVerified.tsx)
-- 2. Admin add user "violates constraint" → Fixed di code (Settings.tsx) 
-- 3. Rider POS "gagal memeriksa produk" → Fixed di code (POS.tsx) + SQL ini

-- ============================================
-- FIX 1: Create has_pending_return function
-- ============================================

-- Fungsi ini digunakan di POS untuk check apakah produk sedang dalam proses return
-- Jika function ini tidak ada, maka POS tidak bisa add product ke cart
CREATE OR REPLACE FUNCTION has_pending_return(p_product_id UUID, p_rider_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    -- Check if there's an active return for this product by this rider
    -- Returns table might not exist yet, so we'll create basic structure
    RETURN EXISTS (
        SELECT 1 
        FROM returns 
        WHERE product_id = p_product_id 
          AND rider_id = p_rider_id
          AND status IN ('pending', 'in_review')
    );
EXCEPTION
    -- If returns table doesn't exist, just return false
    WHEN undefined_table THEN
        RETURN false;
END;
$$;

-- ============================================
-- FIX 2: Grant permissions
-- ============================================

-- Allow all authenticated users (riders, admins) to call this function
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO anon;

-- ============================================
-- FIX 3: Verify atau create returns table (optional)
-- ============================================

-- Cek apakah returns table sudah ada
DO $$ 
BEGIN
    -- Jika returns table belum ada, create basic structure
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'returns'
    ) THEN
        -- Create returns table untuk future use
        CREATE TABLE returns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID NOT NULL,
            rider_id UUID NOT NULL REFERENCES auth.users(id),
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
        
        -- Allow riders to see their own returns
        CREATE POLICY "Riders can view own returns"
            ON returns FOR SELECT
            TO authenticated
            USING (rider_id = auth.uid());
        
        -- Allow admins to see all returns
        CREATE POLICY "Admins can view all returns"
            ON returns FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() 
                    AND role = 'admin'
                )
            );
    END IF;
END $$;

-- ============================================
-- VERIFY: Check everything created correctly
-- ============================================

-- 1. Check function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'has_pending_return';

-- 2. Check returns table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'returns'
) as "Returns Table Exists";

-- 3. Test function works (should return false for random IDs)
SELECT has_pending_return(
    gen_random_uuid(),
    COALESCE(auth.uid(), gen_random_uuid())
) as "Test Function (Should be FALSE)";

-- ============================================
-- BONUS: Check RLS policies untuk troubleshooting
-- ============================================

-- Check profiles INSERT policies (untuk admin add user)
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles'
    AND cmd = 'INSERT'
ORDER BY policyname;

-- Check user_roles INSERT policies (untuk admin add user)
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_roles'
    AND cmd = 'INSERT'
ORDER BY policyname;

-- Check current user info
SELECT 
    auth.uid() as "User ID",
    (SELECT full_name FROM profiles WHERE user_id = auth.uid()) as "Full Name",
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) as "Role";

-- ============================================
-- EXPECTED OUTPUT
-- ============================================
-- 1. has_pending_return function should be created ✓
-- 2. Returns table should exist (atau baru dibuat) ✓
-- 3. Test function should return FALSE ✓
-- 4. Profiles INSERT policies should show at least 1-2 policies ✓
-- 5. User_roles INSERT policies should show at least 1 policy ✓
