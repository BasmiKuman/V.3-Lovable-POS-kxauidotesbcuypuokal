# Fix Super Admin - Reports Page Access

## Masalah
Super admin tidak bisa mengakses data apapun di halaman **Reports**. Halaman kosong atau tidak menampilkan transaksi.

## Penyebab
RLS policies untuk tabel `transactions` dan `transaction_items` masih menggunakan fungsi `public.has_role()` yang lama, yang tidak mendukung role `super_admin`.

```sql
-- Policy lama (SALAH)
public.has_role(auth.uid(), 'admin')  -- Hanya cek 'admin', tidak termasuk 'super_admin'
```

## Solusi
Update RLS policies untuk menggunakan `public.get_user_role()` dan support `super_admin`.

## Langkah Perbaikan

### 1. Jalankan SQL Script di Supabase

Buka **Supabase Dashboard** → **SQL Editor** → Jalankan script berikut:

```sql
-- File: fix-reports-super-admin-access.sql
-- Copy semua isi file dan jalankan di Supabase SQL Editor
```

### 2. Verifikasi

Setelah menjalankan SQL, cek hasilnya:

```sql
-- Test 1: Cek transactions policies (harus ada 2)
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'transactions'
GROUP BY tablename;

-- Test 2: Cek transaction_items policies (harus ada 2)
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'transaction_items'
GROUP BY tablename;
```

**Expected Result:**
```
transactions: 2 policies
transaction_items: 2 policies
```

### 3. Test Halaman Reports

1. Login sebagai **super admin** (fadlannafian@gmail.com)
2. Buka halaman **Reports**
3. ✅ Harus muncul data transaksi
4. ✅ Filter date range harus berfungsi
5. ✅ Filter rider harus berfungsi
6. ✅ Export Excel/PDF harus berfungsi

## Perubahan yang Dilakukan

### A. Transactions Policies

**Sebelum:**
```sql
-- Hanya admin
public.has_role(auth.uid(), 'admin')
```

**Sesudah:**
```sql
-- Admin DAN Super Admin
public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
```

### B. Transaction Items Policies

**Sebelum:**
```sql
EXISTS (
  SELECT 1 FROM public.transactions
  WHERE transactions.id = transaction_items.transaction_id
  AND (transactions.rider_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
)
```

**Sesudah:**
```sql
EXISTS (
  SELECT 1 FROM transactions
  WHERE transactions.id = transaction_items.transaction_id
  AND (
    transactions.rider_id = auth.uid() 
    OR public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
  )
)
```

## Tabel yang Diperbaiki

1. **transactions** (2 policies)
   - `Users can view relevant transactions` - SELECT
   - `Riders can create transactions` - INSERT

2. **transaction_items** (2 policies)
   - `Users can view transaction items` - SELECT
   - `Users can create transaction items` - INSERT

## Keuntungan

✅ **Super admin** sekarang bisa:
- Melihat semua transaksi (dari semua rider)
- Filter transaksi berdasarkan tanggal
- Filter transaksi berdasarkan rider
- Export laporan ke Excel
- Export laporan ke PDF
- Melihat detail item transaksi

✅ **Konsistensi:**
- Menggunakan `public.get_user_role()` seperti policies lainnya
- Tidak ada infinite recursion
- RLS bypass dengan SECURITY DEFINER

## Checklist

- [x] Update RLS policies transactions (2 policies)
- [x] Update RLS policies transaction_items (2 policies)
- [x] Commit ke GitHub
- [ ] **PENDING**: Jalankan SQL di Supabase Dashboard
- [ ] **PENDING**: Test Reports page sebagai super admin

---

**Dibuat:** 5 November 2025  
**Commit:** de733ce  
**Status:** ✅ Code committed, ⏳ SQL pending execution
