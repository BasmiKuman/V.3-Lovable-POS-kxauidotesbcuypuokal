-- ============================================================================
-- ROLE CHANGE AUDIT LOG
-- Track semua perubahan role (rider ↔ admin) untuk keamanan dan debugging
-- ============================================================================

-- Step 1: Buat tabel untuk log perubahan role
CREATE TABLE IF NOT EXISTS public.role_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    old_role TEXT NOT NULL,
    new_role TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Step 2: Tambahkan index untuk performa
CREATE INDEX IF NOT EXISTS idx_role_change_logs_user_id ON role_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_logs_changed_by ON role_change_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_role_change_logs_changed_at ON role_change_logs(changed_at DESC);

-- Step 3: Enable Row Level Security
ALTER TABLE public.role_change_logs ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policy - Hanya admin yang bisa lihat log
CREATE POLICY "Admin can view role change logs"
ON public.role_change_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Step 5: RLS Policy - System bisa insert log
CREATE POLICY "System can insert role change logs"
ON public.role_change_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- QUERY UNTUK MONITORING
-- ============================================================================

-- Query 1: Lihat semua perubahan role (10 terbaru)
SELECT 
    rcl.id,
    rcl.user_id,
    p1.full_name as user_name,
    rcl.old_role,
    rcl.new_role,
    p2.full_name as changed_by_name,
    rcl.changed_at,
    rcl.notes
FROM role_change_logs rcl
LEFT JOIN profiles p1 ON p1.user_id = rcl.user_id
LEFT JOIN profiles p2 ON p2.user_id = rcl.changed_by
ORDER BY rcl.changed_at DESC
LIMIT 10;

-- Query 2: Cek siapa yang paling sering ubah role (potential abuse)
SELECT 
    p.full_name as admin_name,
    COUNT(*) as total_changes,
    COUNT(CASE WHEN rcl.new_role = 'admin' THEN 1 END) as promoted_to_admin,
    COUNT(CASE WHEN rcl.new_role = 'rider' THEN 1 END) as demoted_to_rider
FROM role_change_logs rcl
LEFT JOIN profiles p ON p.user_id = rcl.changed_by
WHERE rcl.changed_at >= NOW() - INTERVAL '30 days'
GROUP BY p.full_name, rcl.changed_by
ORDER BY total_changes DESC;

-- Query 3: Lihat history perubahan role untuk user tertentu
-- (Ganti 'BERLIANO' dengan nama user yang mau dicek)
SELECT 
    rcl.old_role,
    rcl.new_role,
    p.full_name as changed_by,
    rcl.changed_at
FROM role_change_logs rcl
LEFT JOIN profiles p ON p.user_id = rcl.changed_by
LEFT JOIN profiles target ON target.user_id = rcl.user_id
WHERE target.full_name ILIKE '%BERLIANO%'
ORDER BY rcl.changed_at DESC;

-- ============================================================================
-- RESTORE WRONG ROLE CHANGES
-- ============================================================================

-- Query untuk restore role dari log terakhir
-- (Jika ada yang salah ubah role, bisa rollback pakai ini)
/*
WITH latest_change AS (
    SELECT 
        user_id,
        old_role,
        new_role,
        changed_at
    FROM role_change_logs
    WHERE user_id = 'd7866771-6fe7-4d9b-9b0a-c72b2a0bc4fa' -- Ganti dengan user_id yang mau di-restore
    ORDER BY changed_at DESC
    LIMIT 1
)
UPDATE user_roles
SET role = (SELECT old_role FROM latest_change)
WHERE user_id = (SELECT user_id FROM latest_change);
*/

-- ============================================================================
-- NOTIFICATION / ALERT
-- ============================================================================

-- Fungsi untuk notify jika ada rider yang di-promote jadi admin
-- (Opsional - bisa dipasang trigger)
CREATE OR REPLACE FUNCTION notify_role_promotion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.new_role = 'admin' AND NEW.old_role = 'rider' THEN
        -- Bisa kirim notification ke Slack, Telegram, atau email
        RAISE NOTICE 'ALERT: User % promoted from rider to admin by %', NEW.user_id, NEW.changed_by;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pasang trigger (optional)
DROP TRIGGER IF EXISTS trigger_notify_role_promotion ON role_change_logs;
CREATE TRIGGER trigger_notify_role_promotion
    AFTER INSERT ON role_change_logs
    FOR EACH ROW
    EXECUTE FUNCTION notify_role_promotion();

-- ============================================================================
-- CLEANUP OLD LOGS (Optional - untuk hemat storage)
-- ============================================================================

-- Hapus log yang lebih dari 1 tahun (jalankan manual atau via cron)
/*
DELETE FROM role_change_logs
WHERE changed_at < NOW() - INTERVAL '1 year';
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Cek apakah tabel sudah dibuat
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'role_change_logs'
) as table_exists;

-- Cek jumlah log yang ada
SELECT COUNT(*) as total_logs FROM role_change_logs;
