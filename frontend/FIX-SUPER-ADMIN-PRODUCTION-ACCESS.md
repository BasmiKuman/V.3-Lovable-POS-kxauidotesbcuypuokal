# Fix Super Admin - Production Access

## Masalah
Super admin tidak bisa menambahkan produksi. Mendapat error: **"Only admin can add production"**

## Penyebab
1. **RLS Policies `production_history`**: Hanya mengizinkan role `'admin'`, tidak termasuk `'super_admin'`
2. **Function `add_production()`**: Validasi role hanya memeriksa `'admin'`, bukan `'super_admin'`

## Solusi
Update semua RLS policies dan function untuk mendukung `super_admin`.

## Langkah Perbaikan

### 1. Jalankan SQL Script di Supabase

Buka **Supabase Dashboard** → **SQL Editor** → Jalankan script berikut:

```sql
-- File: fix-production-super-admin.sql
-- Copy semua isi file dan jalankan di Supabase SQL Editor
```

Atau copy dari file: `fix-production-super-admin.sql`

### 2. Verifikasi

Setelah menjalankan SQL, cek hasilnya:

```sql
-- Test 1: Cek jumlah policies (harus ada 4)
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'production_history'
GROUP BY tablename;

-- Test 2: List semua policies
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'production_history'
ORDER BY policyname;
```

**Expected Result:**
```
policy_count: 4

Policies:
1. Admins can view all production history (SELECT)
2. Admins can insert production history (INSERT)
3. Admins can update production history (UPDATE)
4. Admins can delete production history (DELETE)
```

### 3. Test Fitur Production

1. Login sebagai **super admin** (fadlannafian@gmail.com)
2. Buka halaman **Produk**
3. Klik tab **"Produksi"**
4. Klik tombol **"Tambah Produksi"**
5. Pilih produk, masukkan jumlah, dan klik **"Simpan Produksi"**
6. ✅ Harus berhasil tanpa error

## Perubahan yang Dilakukan

### A. RLS Policies `production_history`

**Sebelum:**
```sql
-- Hanya admin
EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'admin'
)
```

**Sesudah:**
```sql
-- Admin DAN Super Admin
public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
```

### B. Function `add_production()`

**Sebelum:**
```sql
-- Check if user is admin
IF NOT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = v_user_id AND role = 'admin'
) THEN
  RAISE EXCEPTION 'Only admin can add production';
END IF;
```

**Sesudah:**
```sql
-- Get user role using safe function
v_user_role := public.get_user_role(v_user_id);

-- Check if user is admin or super_admin
IF v_user_role NOT IN ('admin', 'super_admin') THEN
  RAISE EXCEPTION 'Only admin or super admin can add production';
END IF;
```

## Keuntungan

✅ **Super admin** sekarang bisa:
- Menambahkan produksi baru
- Melihat riwayat produksi
- Update/delete produksi (jika diperlukan)
- Semua fitur admin production tersedia

✅ **Konsistensi:**
- Menggunakan `public.get_user_role()` seperti policies lainnya
- Tidak ada infinite recursion
- RLS bypass dengan SECURITY DEFINER

✅ **Role Hierarchy:**
```
super_admin ─── Full Access (termasuk production)
    ↓
admin ────────── Production + Manage Riders
    ↓
rider ────────── POS Only
```

## File Terkait

- **SQL Script**: `fix-production-super-admin.sql`
- **Komponen**: `src/components/AddProductionDialog.tsx`
- **Migration**: `supabase/migrations/20250129_create_production_history.sql`

## Checklist

- [x] Update RLS policies production_history (4 policies)
- [x] Update function add_production()
- [x] Commit ke GitHub
- [x] ✅ **DONE**: Jalankan SQL di Supabase Dashboard
- [x] ✅ **DONE**: Test tambah produksi sebagai super admin - BERHASIL!

---

**Dibuat:** 5 November 2025  
**Commit:** 09e59d0  
**Status:** ✅ **COMPLETED** - Super admin dapat menambah produksi!
