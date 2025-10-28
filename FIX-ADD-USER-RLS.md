# 🔧 FIX: Admin Tidak Bisa Tambah User Baru

## 🐛 Masalah

Ketika admin mencoba menambahkan user baru di **Pengaturan → Manajemen Pengguna**, muncul error:

```
new row violates row level security for tables profiles
```

## 🔍 Penyebab

Tabel `profiles` hanya memiliki RLS policy untuk:
- ✅ **SELECT** (view profiles) - semua user authenticated
- ✅ **UPDATE** (edit own profile) - user bisa edit profil sendiri

Tapi **TIDAK ada policy untuk INSERT**! 

Jadi ketika admin mencoba INSERT profile untuk user baru, RLS menolak operasi tersebut.

## ✅ Solusi

Tambahkan 2 policy baru untuk tabel `profiles`:

### 1. Policy INSERT
Izinkan admin atau user sendiri untuk INSERT profile:

```sql
CREATE POLICY "Admins can insert profiles"
  ON public.profiles 
  FOR INSERT
  WITH CHECK (
    -- Admin bisa insert profile siapapun
    public.has_role(auth.uid(), 'admin')
    OR
    -- User bisa insert profile sendiri (untuk auto-signup)
    auth.uid() = user_id
  );
```

### 2. Policy DELETE  
Izinkan admin untuk DELETE profile:

```sql
CREATE POLICY "Admins can delete profiles"
  ON public.profiles 
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
```

## 📋 Cara Perbaiki

### Opsi 1: Via Supabase SQL Editor (RECOMMENDED)

1. Login ke https://supabase.com/dashboard
2. Pilih project Anda
3. Klik **SQL Editor**
4. Copy-paste SQL dari file: `fix-profiles-insert-policy.sql`
5. Klik **Run**

### Opsi 2: Via Migration (untuk deployment)

Migration file sudah dibuat:
```
supabase/migrations/20251028000001_fix_profiles_insert_policy.sql
```

Jalankan migration:
```bash
# Jika menggunakan Supabase CLI
supabase db push
```

## 🧪 Testing

Setelah SQL dijalankan, test fitur tambah user:

1. Login sebagai admin
2. Buka **Pengaturan** → **Manajemen Pengguna**
3. Klik **+ Tambah Pengguna**
4. Isi form:
   - Email: `test@example.com`
   - Password: `password123`
   - Nama: `User Test`
   - Telepon: `081234567890`
   - Alamat: `Jl. Test No. 123, Jakarta`
5. Klik **Tambah**

✅ **Expected Result**: User berhasil ditambahkan tanpa error!

## 📊 RLS Policies Lengkap untuk `profiles`

Setelah fix, tabel `profiles` akan memiliki policy lengkap:

| Operation | Policy | Who Can Do |
|-----------|--------|------------|
| **SELECT** | Users can view all profiles | Semua user authenticated |
| **INSERT** | Admins can insert profiles | Admin OR user sendiri |
| **UPDATE** | Users can update own profile | User hanya profil sendiri |
| **DELETE** | Admins can delete profiles | Hanya admin |

## 🔒 Keamanan

Policy ini tetap aman karena:
- ✅ Rider biasa **TIDAK bisa** insert profile user lain
- ✅ Rider biasa **TIDAK bisa** delete profile siapapun
- ✅ Rider hanya bisa update profile sendiri
- ✅ Admin memiliki kontrol penuh untuk manajemen user

## 📝 Files Terkait

- `fix-profiles-insert-policy.sql` - SQL untuk fix langsung
- `supabase/migrations/20251028000001_fix_profiles_insert_policy.sql` - Migration file
- `src/pages/Settings.tsx` - Kode UI untuk tambah user (baris 296-356)

## ✨ Kesimpulan

Masalah **"new row violates row level security"** sekarang sudah diperbaiki! Admin bisa menambahkan user baru dengan lancar. 🚀
