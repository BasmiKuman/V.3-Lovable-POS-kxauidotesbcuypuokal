# 🐛 ISSUE: Admin Tidak Bisa Tambah User - Error user_id

## Masalah yang Dilaporkan

Ketika admin mencoba menambahkan pengguna baru di **Settings → Manajemen Pengguna**, muncul error:
```
Error: user_id key di profile
```

## 🔍 Analisis

### Kemungkinan Penyebab:

1. **RLS Policy INSERT belum ada** ✅ SOLVED (sudah dibuat fix)
   - File: `fix-profiles-insert-policy.sql`
   - Policy: `Admins can insert profiles`

2. **Column `address` tidak ada** ⚠️ PERLU CEK
   - File: `add-address-column.sql` (ada tapi mungkin belum dijalankan di database)

3. **Struktur data salah**
   - Code di `Settings.tsx` sudah benar (tidak insert `id`, hanya `user_id`)

## ✅ Solusi yang Sudah Disiapkan

### 1. RLS Policy Fix (DONE)

File: `fix-profiles-insert-policy.sql`

```sql
CREATE POLICY "Admins can insert profiles"
  ON public.profiles 
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR
    auth.uid() = user_id
  );
```

**Cara Apply:**
1. Login ke Supabase SQL Editor
2. Copy-paste SQL dari file tersebut
3. Run

### 2. Address Column (PERLU DICEK)

File: `add-address-column.sql`

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address TEXT;
```

**Cara Cek:**
1. Buka Supabase → Table Editor → profiles
2. Lihat apakah column `address` ada
3. Jika tidak ada, jalankan SQL di atas

## 🧪 Testing Step by Step

### Pre-requisites:
1. ✅ Jalankan `fix-profiles-insert-policy.sql` di Supabase
2. ✅ Pastikan column `address` ada di table `profiles`
3. ✅ Dev server running: `npm run dev`

### Test Flow:

1. **Login sebagai admin**
   ```
   Email: fadlannafian@gmail.com
   Password: [your admin password]
   ```

2. **Buka Settings → Manajemen Pengguna**

3. **Klik "+ Tambah Pengguna"**

4. **Isi form:**
   ```
   Email: test@example.com
   Password: password123
   Nama: User Test
   Telepon: 081234567890
   Alamat: Jl. Test No. 123, Jakarta Selatan
   ```

5. **Klik "Tambah"**

### Expected Result:
```
✅ Toast: "Berhasil menambahkan pengguna baru"
✅ User muncul di tabel
✅ Tidak ada error di console
```

### Error Scenarios:

#### Error: "new row violates row level security"
**Penyebab:** RLS policy INSERT belum dibuat
**Solusi:** Jalankan `fix-profiles-insert-policy.sql`

#### Error: "column address does not exist"
**Penyebab:** Column address belum ditambahkan
**Solusi:** Jalankan `add-address-column.sql`

#### Error: "duplicate key value violates unique constraint"
**Penyebab:** Email sudah terdaftar
**Solusi:** Gunakan email lain atau hapus user lama

## 📋 Checklist untuk User

Silakan cek dan laporkan:

- [ ] Apakah sudah jalankan `fix-profiles-insert-policy.sql` di Supabase?
- [ ] Apakah column `address` sudah ada di table `profiles`?
- [ ] Apakah error masih terjadi setelah kedua SQL dijalankan?
- [ ] Error message lengkap yang muncul (jika masih error)
- [ ] Screenshot console browser (F12 → Console tab)

## 🔧 Quick Fix Script

Jika ingin fix semuanya sekaligus, jalankan SQL ini di Supabase SQL Editor:

```sql
-- 1. Add address column if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Drop old policies
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- 3. Create INSERT policy
CREATE POLICY "Admins can insert profiles"
  ON public.profiles 
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR
    auth.uid() = user_id
  );

-- 4. Create DELETE policy
CREATE POLICY "Admins can delete profiles"
  ON public.profiles 
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Verify
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
```

## 📝 Files Terkait

```
fix-profiles-insert-policy.sql          # RLS policy fix
add-address-column.sql                  # Address column migration
FIX-ADD-USER-RLS.md                    # Dokumentasi lengkap
src/pages/Settings.tsx (line 296-356)  # Add user logic
```

## 🆘 Need More Help?

Jika masih error, mohon kirimkan:
1. Screenshot error message
2. Console log (F12 → Console)
3. Network tab error (F12 → Network → XHR yang failed)
4. Result dari query ini di Supabase SQL Editor:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'profiles';
   ```

---

**Status:** Waiting for user testing dengan `npm run dev` ⏳
