-- ============================================================================
-- SETUP SUPER ADMIN SYSTEM - PART 1
-- Add 'super_admin' to ENUM type
-- ⚠️ JALANKAN SCRIPT INI DULU, TUNGGU SELESAI, BARU JALANKAN PART 2!
-- ============================================================================

-- Step 0: Add 'super_admin' to ENUM type
-- HARUS DIJALANKAN TERPISAH DARI STEP LAINNYA!
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- ============================================================================
-- SETELAH STEP 0 SELESAI, TUNGGU 2-3 DETIK, LALU JALANKAN SCRIPT DIBAWAH INI:
-- ============================================================================

-- Step 1: Update role fadlannafian menjadi super_admin
UPDATE user_roles
SET role = 'super_admin'::app_role
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'fadlannafian@gmail.com'
);

-- Step 2: Verifikasi super admin sudah dibuat
SELECT 
    ur.user_id,
    ur.role,
    p.full_name,
    u.email
FROM user_roles ur
JOIN profiles p ON p.user_id = ur.user_id
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'super_admin';

-- Step 3: Cek hierarki role saat ini
SELECT 
    ur.role,
    COUNT(*) as total_users,
    STRING_AGG(p.full_name, ', ') as user_names
FROM user_roles ur
JOIN profiles p ON p.user_id = ur.user_id
GROUP BY ur.role
ORDER BY 
    CASE ur.role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'rider' THEN 3
        ELSE 4
    END;

-- ============================================================================
-- UPDATE RLS POLICIES - Super Admin Full Access
-- ============================================================================

-- Policy untuk profiles - Super admin bisa lihat semua
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admin and Super admin can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
);

-- Policy untuk user_roles - Super admin bisa lihat semua
DROP POLICY IF EXISTS "Admin can view roles" ON user_roles;
DROP POLICY IF EXISTS "Super admin can view all roles" ON user_roles;

CREATE POLICY "Admin and Super admin can view roles"
ON user_roles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
);

-- Policy untuk update roles - Super admin full access, admin terbatas
DROP POLICY IF EXISTS "Admin can update roles" ON user_roles;
DROP POLICY IF EXISTS "Super admin can update all roles" ON user_roles;

CREATE POLICY "Super admin can update all roles"
ON user_roles FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
);

CREATE POLICY "Admin can update rider roles only"
ON user_roles FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
    AND role = 'rider' -- Hanya bisa update rider
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
    AND role IN ('rider', 'admin') -- Hanya bisa ubah jadi rider atau admin
);

-- ============================================================================
-- PROTECTION: Super Admin Cannot Be Downgraded
-- ============================================================================

-- Trigger untuk prevent super admin downgrade
CREATE OR REPLACE FUNCTION prevent_super_admin_downgrade()
RETURNS TRIGGER AS $$
BEGIN
    -- Cek apakah user yang di-update adalah super admin
    IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
        -- Cek siapa yang mencoba downgrade
        DECLARE
            current_user_role TEXT;
        BEGIN
            SELECT role INTO current_user_role 
            FROM user_roles 
            WHERE user_id = auth.uid();
            
            -- Hanya super admin lain yang boleh downgrade super admin
            IF current_user_role != 'super_admin' THEN
                RAISE EXCEPTION 'Cannot downgrade super admin! Only super admin can change super admin role.';
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang trigger
DROP TRIGGER IF EXISTS trigger_prevent_super_admin_downgrade ON user_roles;
CREATE TRIGGER trigger_prevent_super_admin_downgrade
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_super_admin_downgrade();

-- ============================================================================
-- UPDATE AUDIT LOG - Support super_admin role
-- ============================================================================

-- Update RLS policy untuk audit log
DROP POLICY IF EXISTS "Admin can view role change logs" ON role_change_logs;

CREATE POLICY "Admin and Super admin can view logs"
ON role_change_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
);

-- Update notification function untuk super admin
CREATE OR REPLACE FUNCTION notify_role_promotion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.new_role = 'admin' AND NEW.old_role = 'rider' THEN
        RAISE NOTICE 'ALERT: User % promoted from rider to admin by %', NEW.user_id, NEW.changed_by;
    END IF;
    
    IF NEW.new_role = 'super_admin' THEN
        RAISE NOTICE 'CRITICAL: User % promoted to SUPER ADMIN by %', NEW.user_id, NEW.changed_by;
    END IF;
    
    IF NEW.old_role = 'super_admin' AND NEW.new_role != 'super_admin' THEN
        RAISE NOTICE 'CRITICAL: Super admin % downgraded to % by %', NEW.user_id, NEW.new_role, NEW.changed_by;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER QUERIES
-- ============================================================================

-- Query: Lihat hierarki semua user
SELECT 
    CASE 
        WHEN ur.role = 'super_admin' THEN '👑 Super Admin'
        WHEN ur.role = 'admin' THEN '🔑 Admin'
        WHEN ur.role = 'rider' THEN '🚴 Rider'
        ELSE ur.role
    END as role_display,
    p.full_name,
    p.phone,
    ur.user_id
FROM user_roles ur
JOIN profiles p ON p.user_id = ur.user_id
ORDER BY 
    CASE ur.role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'rider' THEN 3
        ELSE 4
    END,
    p.full_name;

-- Query: Cek siapa super admin saat ini
SELECT 
    p.full_name,
    u.email,
    ur.role,
    p.created_at
FROM user_roles ur
JOIN profiles p ON p.user_id = ur.user_id
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'super_admin';

-- Query: Test apakah user adalah super admin (untuk debugging)
-- Ganti auth.uid() dengan user_id yang mau dicek
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        ) THEN 'YES - Super Admin'
        WHEN EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        ) THEN 'Admin Only'
        ELSE 'Not Admin'
    END as admin_status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Final check: Pastikan super admin sudah setup
DO $$
DECLARE
    super_admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO super_admin_count 
    FROM user_roles 
    WHERE role = 'super_admin';
    
    IF super_admin_count = 0 THEN
        RAISE WARNING 'No super admin found! Please run Step 1 again.';
    ELSE
        RAISE NOTICE 'Super admin setup complete! Total super admins: %', super_admin_count;
    END IF;
END $$;
