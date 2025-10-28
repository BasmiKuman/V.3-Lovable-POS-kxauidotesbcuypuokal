# 🔧 FIX: Admin Tidak Bisa Tambah User Baru

## 🐛 Masalah

Ketika admin mencoba menambahkan user baru di **Pengaturan → Manajemen Pengguna**, muncul error:

```
Error 1: 409 Conflict - Failed to load resource: /rest/v1/profiles
Error 2: 403 Forbidden - Failed to load resource: /auth/v1/admin/users
```

## 🔍 Penyebab (2 Masalah!)

### ❌ **Masalah 1: Duplikat INSERT Profile (409 Conflict)**

Ada **trigger `handle_new_user()`** yang otomatis membuat profile ketika user signup:
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

Tetapi kode TypeScript di `Settings.tsx` juga mencoba INSERT profile **secara manual**:
```typescript
// ❌ DUPLIKAT! Trigger sudah buat profile
await supabase.from("profiles").insert({
  user_id: authData.user.id,
  full_name: newUser.fullName.trim(),
  phone: newUser.phone.trim(),
  address: newUser.address.trim(),
});
```

Hasilnya: **Conflict 409** karena profile sudah dibuat oleh trigger.

### ❌ **Masalah 2: Admin API Tidak Bisa Dari Browser (403 Forbidden)**

Kode mencoba cleanup dengan admin API:
```typescript
// ❌ GAGAL! Admin API hanya untuk server-side
await supabase.auth.admin.deleteUser(authData.user.id);
```

Hasilnya: **403 Forbidden** karena admin API tidak bisa dipanggil dari client-side (browser).

## ✅ Solusi

Ada 2 fix yang harus dilakukan:

### **Fix 1: Update Trigger `handle_new_user()` - Ambil Metadata Lengkap**

Update trigger agar mengambil `phone` dan `address` dari metadata signup:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile dengan SEMUA metadata (phone & address included)
  INSERT INTO public.profiles (user_id, full_name, phone, address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', '')
  );
  
  -- Assign rider role by default
  IF NEW.email = 'fadlannafian@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'rider');
  END IF;
  
  RETURN NEW;
END;
$$;
```

### **Fix 2: Hapus INSERT Manual di TypeScript**

Kode sudah diperbaiki di `src/pages/Settings.tsx`:

**❌ SEBELUM (SALAH):**
```typescript
// 1. Create auth user
const { data: authData } = await supabase.auth.signUp({ ... });

// 2. Manual INSERT profile (❌ DUPLIKAT!)
await supabase.from("profiles").insert({ ... });

// 3. Manual INSERT role (❌ DUPLIKAT!)
await supabase.from("user_roles").insert({ ... });

// 4. Cleanup with admin API (❌ FORBIDDEN!)
await supabase.auth.admin.deleteUser(authData.user.id);
```

**✅ SESUDAH (BENAR):**
```typescript
// Create auth user with metadata
// Trigger handle_new_user() will auto-create profile and role
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: newUser.email.trim(),
  password: newUser.password,
  options: {
    data: {
      full_name: newUser.fullName.trim(),
      phone: newUser.phone.trim(),
      address: newUser.address.trim(),
    },
  },
});

// ✅ Profile dan role otomatis dibuat oleh trigger!
// ✅ Tidak perlu INSERT manual
// ✅ Tidak perlu cleanup dengan admin API
```

## 📋 Cara Perbaiki

### ✅ **STEP 1: Update Trigger Function (WAJIB!)**

1. Login ke https://supabase.com/dashboard
2. Pilih project Anda
3. Klik **SQL Editor**
4. Copy-paste SQL dari file: `fix-handle-new-user.sql`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile dengan SEMUA metadata
  INSERT INTO public.profiles (user_id, full_name, phone, address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', '')
  );
  
  -- Assign role
  IF NEW.email = 'fadlannafian@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'rider');
  END IF;
  
  RETURN NEW;
END;
$$;
```

5. Klik **RUN** ▶️

### ✅ **STEP 2: RLS Policy untuk INSERT (WAJIB!)**

Masih di **SQL Editor**, jalankan juga:

```sql
-- Izinkan admin INSERT profile
CREATE POLICY "Admins can insert profiles"
  ON public.profiles 
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = user_id
  );

-- Izinkan admin DELETE profile
CREATE POLICY "Admins can delete profiles"
  ON public.profiles 
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
```

Klik **RUN** ▶️

### ✅ **STEP 3: Update Kode TypeScript (Otomatis via GitHub)**

Kode `src/pages/Settings.tsx` sudah diperbaiki dan akan tersedia di build berikutnya dari GitHub Actions.

Atau bisa pull latest code:
```bash
git pull origin main
npm install
npm run dev
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

- `fix-handle-new-user.sql` - SQL untuk update trigger function
- `fix-profiles-insert-policy.sql` - SQL untuk RLS policy INSERT/DELETE
- `supabase/migrations/20251028000001_fix_profiles_insert_policy.sql` - Migration RLS
- `supabase/migrations/20251028000002_fix_handle_new_user_with_metadata.sql` - Migration trigger
- `src/pages/Settings.tsx` - Kode sudah diperbaiki (hapus manual INSERT)

## 🎯 Ringkasan Perubahan

| Komponen | Sebelum | Sesudah |
|----------|---------|---------|
| **Trigger Function** | Hanya ambil `full_name` dari metadata | ✅ Ambil `full_name`, `phone`, `address` |
| **TypeScript Code** | Manual INSERT profile & role | ✅ Biarkan trigger auto-create |
| **Error Handling** | Pakai admin API (403) | ✅ Tidak perlu cleanup manual |
| **RLS Policy** | Tidak ada INSERT policy | ✅ Admin bisa INSERT profile |

## ✨ Kesimpulan

**Root Cause:**
1. ❌ Trigger `handle_new_user()` tidak ambil metadata lengkap
2. ❌ Kode TypeScript duplikat INSERT (conflict 409)
3. ❌ Cleanup pakai admin API yang forbidden (403)

**Solution:**
1. ✅ Update trigger ambil semua metadata (phone, address)
2. ✅ Hapus manual INSERT dari kode
3. ✅ Tambah RLS policy untuk INSERT/DELETE

Setelah kedua SQL dijalankan, admin bisa menambahkan user baru dengan lancar! 🚀
