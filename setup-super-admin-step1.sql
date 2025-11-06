-- ============================================================================
-- SETUP SUPER ADMIN - STEP 1
-- Add 'super_admin' to ENUM type
-- ⚠️ JALANKAN INI DULU!
-- ============================================================================

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- ============================================================================
-- SETELAH QUERY INI BERHASIL:
-- 1. Tunggu 2-3 detik
-- 2. Jalankan file: setup-super-admin-step2.sql
-- ============================================================================
