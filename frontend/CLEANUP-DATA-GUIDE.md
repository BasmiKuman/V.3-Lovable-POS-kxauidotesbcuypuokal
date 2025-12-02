# 🗑️ Panduan Cleanup Data Oktober 2025

## 📋 Overview
Script SQL untuk menghapus semua data transaksi dan aktivitas bulan **Oktober 2025** agar sistem fresh untuk bulan November.

## ⚠️ PENTING - BACA DULU!

### ✅ Data Yang AKAN DIHAPUS:
- ❌ Semua transaksi penjualan Oktober (1-31 Okt 2025)
- ❌ Detail item transaksi Oktober
- ❌ Distribusi produk ke rider Oktober
- ❌ Return product (pending & history) Oktober
- ❌ Semua aktivitas tanggal 1-31 Oktober 2025

### ✅ Data Yang AMAN (TIDAK DIHAPUS):
- ✅ Master data produk (products)
- ✅ Data user & profiles
- ✅ Stock warehouse (tidak berubah)
- ✅ Stock rider (aman, kecuali Anda pilih reset manual)
- ✅ Transaksi November 2025 keatas
- ✅ Settings & konfigurasi

## 🚀 Cara Menggunakan

### Step 1: Buka SQL Editor
1. Login ke **Supabase Dashboard**
2. Pilih project Anda
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New Query**

### Step 2: Preview Data (CEK DULU!)
Copy paste **Step 1** dari file `cleanup-october-data.sql`:

```sql
SELECT 
    'transactions' as table_name,
    COUNT(*) as total_records,
    MIN(created_at) as earliest_date,
    MAX(created_at) as latest_date,
    SUM(total_amount) as total_amount
FROM transactions
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
-- ... dst
```

**Klik RUN** → Lihat berapa banyak data yang akan dihapus

### Step 3: Backup Data (WAJIB!)
Copy paste **Step 2** dari file `cleanup-october-data.sql`:

```sql
CREATE TABLE IF NOT EXISTS transactions_backup_oct2025 AS
SELECT * FROM transactions
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00';
-- ... dst
```

**Klik RUN** → Backup otomatis dibuat

Verifikasi backup berhasil:
```sql
SELECT 
    'BACKUP CREATED' as status,
    (SELECT COUNT(*) FROM transactions_backup_oct2025) as transactions,
    -- ... dst
```

### Step 4: Hapus Data Oktober
Copy paste **Step 3** dari file `cleanup-october-data.sql`:

```sql
BEGIN;

DELETE FROM transaction_items
WHERE transaction_id IN (
    SELECT id FROM transactions
    WHERE created_at >= '2025-10-01 00:00:00'
      AND created_at < '2025-11-01 00:00:00'
);
-- ... dst

COMMIT;
```

**Klik RUN** → Data Oktober terhapus!

### Step 5: Verifikasi Hasil
Cek apakah data Oktober sudah terhapus:

```sql
SELECT COUNT(*) FROM transactions 
WHERE created_at >= '2025-10-01' AND created_at < '2025-11-01';
-- Harusnya: 0
```

## 🔧 Opsi Tambahan

### Reset Stock Rider (Opsional)
Jika ingin reset semua stock rider ke 0 (fresh start November):

```sql
TRUNCATE TABLE rider_stock;
```

**⚠️ WARNING:** Ini akan hapus SEMUA stock rider, tidak hanya Oktober!

### Reset Stock Rider Tertentu
Hapus stock rider spesifik saja:

```sql
DELETE FROM rider_stock 
WHERE rider_id = 'uuid-rider-disini';
```

## 🔄 Cara Restore (Jika Salah Hapus)

Jika tidak sengaja hapus data yang salah, restore dari backup:

```sql
-- Restore semua data Oktober
INSERT INTO transactions SELECT * FROM transactions_backup_oct2025;
INSERT INTO transaction_items SELECT * FROM transaction_items_backup_oct2025;
INSERT INTO distributions SELECT * FROM distributions_backup_oct2025;
INSERT INTO distribution_items SELECT * FROM distribution_items_backup_oct2025;
INSERT INTO returns SELECT * FROM returns_backup_oct2025;
INSERT INTO return_history SELECT * FROM return_history_backup_oct2025;
```

## 🧹 Cleanup Backup (Setelah Aman)

Setelah 1-2 minggu dan yakin tidak perlu restore, hapus tabel backup:

```sql
DROP TABLE IF EXISTS transactions_backup_oct2025;
DROP TABLE IF EXISTS transaction_items_backup_oct2025;
DROP TABLE IF EXISTS distributions_backup_oct2025;
DROP TABLE IF EXISTS distribution_items_backup_oct2025;
DROP TABLE IF EXISTS returns_backup_oct2025;
DROP TABLE IF EXISTS return_history_backup_oct2025;
```

## 📊 Contoh Output

### Preview (Step 1):
```
table_name          | total_records | earliest_date        | latest_date          | total_amount
--------------------|---------------|---------------------|---------------------|-------------
transactions        | 150           | 2025-10-01 08:00:00 | 2025-10-31 20:00:00 | 15000000
transaction_items   | 450           | 2025-10-01 08:00:00 | 2025-10-31 20:00:00 | 15000000
distributions       | 30            | 2025-10-01 06:00:00 | 2025-10-31 07:00:00 | NULL
```

### Setelah Delete (Step 4):
```
status            | transactions_remaining | distributions_remaining
------------------|------------------------|------------------------
DELETE COMPLETED  | 0                      | 0
```

## ❓ FAQ

### Q: Apakah data November 2025 akan terhapus?
**A:** Tidak! Script ini hanya hapus data **1-31 Oktober 2025**.

### Q: Apakah stock warehouse akan berubah?
**A:** Tidak! Stock warehouse tetap aman, tidak berubah.

### Q: Apakah master produk akan terhapus?
**A:** Tidak! Data produk, user, profiles semua aman.

### Q: Bagaimana jika saya hapus data yang salah?
**A:** Gunakan backup untuk restore (lihat bagian "Cara Restore").

### Q: Apakah perlu update aplikasi?
**A:** Tidak perlu! Ini SQL script yang dijalankan langsung di database.

### Q: Berapa lama prosesnya?
**A:** Tergantung jumlah data, biasanya 10-60 detik.

### Q: Apakah aplikasi perlu di-restart?
**A:** Tidak perlu, aplikasi akan otomatis sync dengan database.

## 📝 Checklist Lengkap

Sebelum menjalankan script, pastikan:

- [ ] Sudah backup database Supabase (via dashboard)
- [ ] Sudah jalankan Step 1 (Preview) untuk cek data
- [ ] Sudah jalankan Step 2 (Backup) untuk buat backup
- [ ] Sudah verifikasi backup berhasil dibuat
- [ ] Sudah konfirmasi dengan tim/owner
- [ ] Sudah mengerti data Oktober akan HILANG PERMANEN
- [ ] Sudah siap jalankan Step 3 (Delete)

Setelah delete:

- [ ] Verifikasi data Oktober sudah terhapus (Step 5)
- [ ] Test aplikasi, pastikan berjalan normal
- [ ] Tunggu 1-2 minggu untuk monitoring
- [ ] Hapus tabel backup jika sudah aman

## 🆘 Support

Jika ada masalah atau error:
1. Jangan panik!
2. JANGAN jalankan query lagi
3. Screenshot error message
4. Cek apakah backup masih ada
5. Hubungi developer untuk bantuan restore

## ⚡ Quick Command

Untuk yang sudah paham dan mau cepat:

```sql
-- 1. Preview
SELECT 'transactions' as table_name, COUNT(*) as total 
FROM transactions 
WHERE created_at >= '2025-10-01' AND created_at < '2025-11-01';

-- 2. Backup (RUN SEMUA Step 2)

-- 3. Delete (RUN SEMUA Step 3 dalam 1 transaction)

-- 4. Verify
SELECT COUNT(*) FROM transactions 
WHERE created_at >= '2025-10-01' AND created_at < '2025-11-01';
-- Result: 0 = SUCCESS ✅
```

---

**Last Updated:** November 3, 2025  
**Version:** 1.0  
**Status:** Ready to use ✅
