-- ============================================================================
-- DEBUG: Investigasi User Hilang
-- Email: berlibiyan@gmail.com
-- ============================================================================

-- Step 1: CEK APAKAH USER MASIH ADA DI auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    deleted_at,
    banned_until,
    is_sso_user
FROM auth.users 
WHERE email = 'berlibiyan@gmail.com';

-- Step 2: CEK PROFILE USER DI public.profiles
SELECT 
    id,
    email,
    full_name,
    phone,
    role,
    avatar_url,
    created_at,
    updated_at
FROM public.profiles 
WHERE email = 'berlibiyan@gmail.com';

-- Step 3: CEK SEMUA USER DENGAN ROLE RIDER (untuk perbandingan)
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM public.profiles 
WHERE role = 'rider'
ORDER BY created_at DESC;

-- Step 4: CEK STOCK RIDER (apakah masih ada)
SELECT 
    rs.id,
    rs.rider_id,
    p.email as rider_email,
    rs.product_id,
    prod.name as product_name,
    rs.quantity
FROM rider_stock rs
LEFT JOIN profiles p ON p.id = rs.rider_id
LEFT JOIN products prod ON prod.id = rs.product_id
WHERE p.email = 'berlibiyan@gmail.com';

-- Step 5: CEK TRANSAKSI RIDER (history)
SELECT 
    t.id,
    t.rider_id,
    p.email as rider_email,
    p.full_name,
    t.total_amount,
    t.created_at
FROM transactions t
LEFT JOIN profiles p ON p.id = t.rider_id
WHERE p.email = 'berlibiyan@gmail.com'
ORDER BY t.created_at DESC
LIMIT 10;

-- Step 6: CEK DISTRIBUSI KE RIDER
SELECT 
    d.id,
    d.rider_id,
    p.email as rider_email,
    p.full_name,
    d.notes,
    d.created_at
FROM distributions d
LEFT JOIN profiles p ON p.id = d.rider_id
WHERE p.email = 'berlibiyan@gmail.com'
ORDER BY d.created_at DESC
LIMIT 10;

-- ============================================================================
-- POSSIBLE ISSUES & FIXES
-- ============================================================================

-- ISSUE 1: Profile deleted/missing
-- FIX: Restore profile dari auth.users
/*
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    'rider' as role
FROM auth.users
WHERE email = 'berlibiyan@gmail.com'
AND id NOT IN (SELECT id FROM public.profiles);
*/

-- ISSUE 2: Role berubah (bukan rider lagi)
-- FIX: Update role kembali ke rider
/*
UPDATE public.profiles
SET role = 'rider'
WHERE email = 'berlibiyan@gmail.com';
*/

-- ISSUE 3: RLS Policy blocking
-- CEK: Siapa yang login sekarang?
SELECT 
    current_user,
    session_user,
    current_setting('request.jwt.claims', true)::json->>'email' as current_email,
    current_setting('request.jwt.claims', true)::json->>'role' as current_role;

-- ISSUE 4: User ter-ban atau deleted
-- FIX: Unban user
/*
UPDATE auth.users
SET banned_until = NULL,
    deleted_at = NULL
WHERE email = 'berlibiyan@gmail.com';
*/

-- ============================================================================
-- VERIFICATION AFTER FIX
-- ============================================================================

-- Setelah fix, jalankan query ini untuk verifikasi:
SELECT 
    u.email,
    u.banned_until,
    u.deleted_at,
    p.full_name,
    p.role,
    (SELECT COUNT(*) FROM rider_stock WHERE rider_id = p.id) as stock_count,
    (SELECT COUNT(*) FROM transactions WHERE rider_id = p.id) as transaction_count,
    (SELECT COUNT(*) FROM distributions WHERE rider_id = p.id) as distribution_count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'berlibiyan@gmail.com';

-- ============================================================================
-- COMMON CAUSES
-- ============================================================================

/*
1. Profile terhapus dari public.profiles (tapi masih ada di auth.users)
   → Solusi: Restore profile

2. Role berubah dari 'rider' ke role lain
   → Solusi: Update role kembali

3. User ter-ban atau soft-deleted
   → Solusi: Unban/restore user

4. RLS Policy blocking akses
   → Solusi: Fix RLS policy

5. Email confirmed_at NULL (belum verifikasi email)
   → Solusi: Manual confirm email

6. Bug di frontend filter (hanya tampilkan rider aktif)
   → Solusi: Fix frontend query
*/

-- ============================================================================
-- QUICK FIX: RESTORE USER
-- ============================================================================

-- Jalankan ini jika user benar-benar hilang dari profiles:
DO $$
DECLARE
    user_id UUID;
    user_email TEXT := 'berlibiyan@gmail.com';
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'User tidak ditemukan di auth.users!';
    ELSE
        -- Check if profile exists
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
            RAISE NOTICE 'Profile hilang! Membuat profile baru...';
            
            -- Restore profile
            INSERT INTO public.profiles (id, email, full_name, role)
            SELECT 
                id,
                email,
                COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
                'rider' as role
            FROM auth.users
            WHERE id = user_id;
            
            RAISE NOTICE 'Profile berhasil di-restore!';
        ELSE
            RAISE NOTICE 'Profile masih ada. Cek role...';
            
            -- Check role
            UPDATE public.profiles
            SET role = 'rider'
            WHERE id = user_id
            AND role != 'rider';
            
            RAISE NOTICE 'Role di-update ke rider (jika perlu)';
        END IF;
    END IF;
END $$;
