-- ============================================================================
-- CLEANUP DATA OKTOBER 2025
-- Script untuk menghapus semua transaksi dan data terkait bulan Oktober 2025
-- ============================================================================
-- PENTING: 
-- 1. Backup database dulu sebelum menjalankan script ini!
-- 2. Script ini akan menghapus PERMANEN, tidak bisa di-undo
-- 3. Jalankan di Supabase SQL Editor
-- ============================================================================

-- Step 1: CEK DATA YANG AKAN DIHAPUS (Preview)
-- Jalankan query ini dulu untuk melihat berapa banyak data yang akan dihapus

SELECT 
    'transactions' as table_name,
    COUNT(*) as total_records,
    MIN(created_at) as earliest_date,
    MAX(created_at) as latest_date,
    SUM(total_amount) as total_amount
FROM transactions
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'

UNION ALL

SELECT 
    'transaction_items' as table_name,
    COUNT(*) as total_records,
    MIN(t.created_at) as earliest_date,
    MAX(t.created_at) as latest_date,
    SUM(ti.subtotal) as total_amount
FROM transaction_items ti
INNER JOIN transactions t ON t.id = ti.transaction_id
WHERE t.created_at >= '2025-10-01 00:00:00'
  AND t.created_at < '2025-11-01 00:00:00'

UNION ALL

SELECT 
    'distributions' as table_name,
    COUNT(*) as total_records,
    MIN(created_at) as earliest_date,
    MAX(created_at) as latest_date,
    NULL as total_amount
FROM distributions
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'

UNION ALL

SELECT 
    'distribution_items' as table_name,
    COUNT(*) as total_records,
    MIN(d.created_at) as earliest_date,
    MAX(d.created_at) as latest_date,
    NULL as total_amount
FROM distribution_items di
INNER JOIN distributions d ON d.id = di.distribution_id
WHERE d.created_at >= '2025-10-01 00:00:00'
  AND d.created_at < '2025-11-01 00:00:00'

UNION ALL

SELECT 
    'returns' as table_name,
    COUNT(*) as total_records,
    MIN(returned_at) as earliest_date,
    MAX(returned_at) as latest_date,
    NULL as total_amount
FROM returns
WHERE returned_at >= '2025-10-01 00:00:00'
  AND returned_at < '2025-11-01 00:00:00'

UNION ALL

SELECT 
    'return_history' as table_name,
    COUNT(*) as total_records,
    MIN(returned_at) as earliest_date,
    MAX(returned_at) as latest_date,
    NULL as total_amount
FROM return_history
WHERE returned_at >= '2025-10-01 00:00:00'
  AND returned_at < '2025-11-01 00:00:00';


-- ============================================================================
-- Step 2: BACKUP DATA (OPSIONAL tapi SANGAT DIREKOMENDASIKAN)
-- ============================================================================

-- Buat tabel backup untuk transactions
CREATE TABLE IF NOT EXISTS transactions_backup_oct2025 AS
SELECT * FROM transactions
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00';

-- Buat tabel backup untuk transaction_items
CREATE TABLE IF NOT EXISTS transaction_items_backup_oct2025 AS
SELECT ti.* FROM transaction_items ti
INNER JOIN transactions t ON t.id = ti.transaction_id
WHERE t.created_at >= '2025-10-01 00:00:00'
  AND t.created_at < '2025-11-01 00:00:00';

-- Buat tabel backup untuk distributions
CREATE TABLE IF NOT EXISTS distributions_backup_oct2025 AS
SELECT * FROM distributions
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00';

-- Buat tabel backup untuk distribution_items
CREATE TABLE IF NOT EXISTS distribution_items_backup_oct2025 AS
SELECT di.* FROM distribution_items di
INNER JOIN distributions d ON d.id = di.distribution_id
WHERE d.created_at >= '2025-10-01 00:00:00'
  AND d.created_at < '2025-11-01 00:00:00';

-- Buat tabel backup untuk returns
CREATE TABLE IF NOT EXISTS returns_backup_oct2025 AS
SELECT * FROM returns
WHERE returned_at >= '2025-10-01 00:00:00'
  AND returned_at < '2025-11-01 00:00:00';

-- Buat tabel backup untuk return_history
CREATE TABLE IF NOT EXISTS return_history_backup_oct2025 AS
SELECT * FROM return_history
WHERE returned_at >= '2025-10-01 00:00:00'
  AND returned_at < '2025-11-01 00:00:00';

-- Verifikasi backup berhasil
SELECT 
    'BACKUP CREATED' as status,
    (SELECT COUNT(*) FROM transactions_backup_oct2025) as transactions,
    (SELECT COUNT(*) FROM transaction_items_backup_oct2025) as transaction_items,
    (SELECT COUNT(*) FROM distributions_backup_oct2025) as distributions,
    (SELECT COUNT(*) FROM distribution_items_backup_oct2025) as distribution_items,
    (SELECT COUNT(*) FROM returns_backup_oct2025) as returns,
    (SELECT COUNT(*) FROM return_history_backup_oct2025) as return_history;


-- ============================================================================
-- Step 3: HAPUS DATA OKTOBER 2025 (HATI-HATI! PERMANEN!)
-- ============================================================================

-- UNCOMMENT BARIS DI BAWAH INI UNTUK MENJALANKAN DELETE
-- Pastikan sudah backup dan cek preview di Step 1

BEGIN;

-- 1. Hapus transaction_items dulu (child table)
DELETE FROM transaction_items
WHERE transaction_id IN (
    SELECT id FROM transactions
    WHERE created_at >= '2025-10-01 00:00:00'
      AND created_at < '2025-11-01 00:00:00'
);

-- 2. Hapus transactions (parent table)
DELETE FROM transactions
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00';

-- 3. Hapus distribution_items dulu (child table)
DELETE FROM distribution_items
WHERE distribution_id IN (
    SELECT id FROM distributions
    WHERE created_at >= '2025-10-01 00:00:00'
      AND created_at < '2025-11-01 00:00:00'
);

-- 4. Hapus distributions (parent table)
DELETE FROM distributions
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00';

-- 5. Hapus returns (pending returns)
DELETE FROM returns
WHERE returned_at >= '2025-10-01 00:00:00'
  AND returned_at < '2025-11-01 00:00:00';

-- 6. Hapus return_history
DELETE FROM return_history
WHERE returned_at >= '2025-10-01 00:00:00'
  AND returned_at < '2025-11-01 00:00:00';

-- Verifikasi hasil delete
SELECT 
    'DELETE COMPLETED' as status,
    (SELECT COUNT(*) FROM transactions 
     WHERE created_at >= '2025-10-01' AND created_at < '2025-11-01') as transactions_remaining,
    (SELECT COUNT(*) FROM distributions 
     WHERE created_at >= '2025-10-01' AND created_at < '2025-11-01') as distributions_remaining,
    (SELECT COUNT(*) FROM returns 
     WHERE returned_at >= '2025-10-01' AND returned_at < '2025-11-01') as returns_remaining,
    (SELECT COUNT(*) FROM return_history 
     WHERE returned_at >= '2025-10-01' AND returned_at < '2025-11-01') as return_history_remaining;

COMMIT;


-- ============================================================================
-- Step 4: OPSIONAL - RESET STOCK RIDER (Jika diperlukan)
-- ============================================================================

-- Jika ingin reset semua stock rider ke 0 (fresh start)
-- UNCOMMENT jika diperlukan

-- TRUNCATE TABLE rider_stock;

-- Atau hapus stock rider tertentu saja
-- DELETE FROM rider_stock WHERE rider_id = 'rider-uuid-here';


-- ============================================================================
-- Step 5: OPSIONAL - HAPUS TABEL BACKUP (Setelah yakin tidak perlu restore)
-- ============================================================================

-- Jalankan SETELAH beberapa hari dan yakin tidak perlu restore
-- UNCOMMENT jika sudah yakin data tidak perlu lagi

-- DROP TABLE IF EXISTS transactions_backup_oct2025;
-- DROP TABLE IF EXISTS transaction_items_backup_oct2025;
-- DROP TABLE IF EXISTS distributions_backup_oct2025;
-- DROP TABLE IF EXISTS distribution_items_backup_oct2025;
-- DROP TABLE IF EXISTS returns_backup_oct2025;
-- DROP TABLE IF EXISTS return_history_backup_oct2025;


-- ============================================================================
-- CARA RESTORE DATA (Jika ada kesalahan)
-- ============================================================================

-- Jika perlu restore data yang sudah dihapus, jalankan:

/*
INSERT INTO transactions SELECT * FROM transactions_backup_oct2025;
INSERT INTO transaction_items SELECT * FROM transaction_items_backup_oct2025;
INSERT INTO distributions SELECT * FROM distributions_backup_oct2025;
INSERT INTO distribution_items SELECT * FROM distribution_items_backup_oct2025;
INSERT INTO returns SELECT * FROM returns_backup_oct2025;
INSERT INTO return_history SELECT * FROM return_history_backup_oct2025;
*/


-- ============================================================================
-- SUMMARY & CHECKLIST
-- ============================================================================

/*
LANGKAH-LANGKAH AMAN:

1. ✅ Buka Supabase Dashboard → SQL Editor
2. ✅ Jalankan Step 1 (Preview) - Lihat berapa banyak data yang akan dihapus
3. ✅ Jalankan Step 2 (Backup) - Backup semua data Oktober
4. ✅ Verifikasi backup berhasil dibuat
5. ✅ Jalankan Step 3 (Delete) - Hapus data Oktober
6. ✅ Verifikasi data sudah terhapus
7. ⏱️ Tunggu beberapa hari, pastikan aplikasi berjalan normal
8. ✅ Opsional: Jalankan Step 5 untuk hapus tabel backup

CATATAN:
- Data yang dihapus: 1 - 31 Oktober 2025
- Data November 2025 keatas: AMAN, tidak terhapus
- Master data (products, profiles, users): AMAN, tidak terhapus
- Stock warehouse: AMAN, tidak berubah
- Stock rider: AMAN, kecuali Anda jalankan Step 4

TROUBLESHOOTING:
- Jika ada error "violates foreign key constraint": 
  Pastikan delete child table dulu (transaction_items sebelum transactions)
- Jika perlu restore:
  Gunakan script di bagian "CARA RESTORE DATA"
*/
