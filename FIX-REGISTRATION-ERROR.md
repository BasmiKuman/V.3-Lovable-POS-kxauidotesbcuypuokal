# 🔧 Fix: Database Error Saat Registrasi User Baru

## 🐛 Problem
Pengguna baru yang mendaftar mendapat error "Database Error" karena **race condition** antara 2 trigger:
- `handle_new_user()` - membuat profile & user_roles
- `create_rider_gps_settings()` - cek user_roles untuk create GPS settings

GPS trigger berjalan **bersamaan** dengan handle_new_user, sehingga user_roles belum tersedia saat dicek.

## ✅ Solusi (Tanpa Build Ulang!)

### Langkah 1: Buka Supabase SQL Editor
1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Klik **SQL Editor** di sidebar kiri

### Langkah 2: Jalankan Fix SQL
1. Buka file `fix-new-user-registration.sql` dari repository
2. Copy semua isi file
3. Paste ke SQL Editor
4. Klik **RUN** atau tekan `Ctrl+Enter`

### Langkah 3: Verifikasi
Setelah SQL selesai, Anda akan melihat output:
```
✓ handle_new_user function updated successfully
✓ GPS trigger successfully removed
✓ riders_with_gps_settings: X (jumlah rider dengan GPS settings)
✓ Sample of recent profiles (5 terbaru)
```

## 🔍 Apa yang Difix?

### Sebelum:
```
User Register
    ↓
┌───────────────────────────┐
│ Trigger: handle_new_user  │ ← Membuat profile + user_roles
└───────────────────────────┘
    ↓
┌───────────────────────────────────┐
│ Trigger: create_gps_settings      │ ← Cek user_roles (BELUM ADA!)
│ ERROR: user_roles not found       │
└───────────────────────────────────┘
```

### Sesudah:
```
User Register
    ↓
┌────────────────────────────────────┐
│ Trigger: handle_new_user           │
│ 1. Create profile                  │
│ 2. Create user_roles               │
│ 3. Create GPS settings (if rider)  │ ← Semuanya dalam 1 function!
└────────────────────────────────────┘
    ↓
✓ Semua berhasil, tidak ada race condition
```

## 🧪 Testing

### Test Registrasi Baru:
1. Logout dari aplikasi
2. Klik "Daftar" / "Sign Up"
3. Isi form dengan data:
   - Email: `test@example.com`
   - Password: `password123`
   - Full Name: `Test User`
   - Phone: `081234567890`
   - Address: `Jl. Test No. 123`
4. Klik "Daftar"
5. **Expected:** Berhasil tanpa error "Database Error"

### Verifikasi di Database:
```sql
SELECT 
  p.full_name,
  p.phone,
  ur.role,
  CASE WHEN rgs.rider_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_gps_settings
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
LEFT JOIN rider_gps_settings rgs ON rgs.rider_id = p.user_id
WHERE p.full_name = 'Test User';
```

Expected output:
```
full_name  | phone         | role  | has_gps_settings
-----------|---------------|-------|------------------
Test User  | 081234567890  | rider | Yes
```

## 📋 Checklist

- [ ] Jalankan `fix-new-user-registration.sql` di Supabase SQL Editor
- [ ] Verifikasi output menunjukkan "successfully"
- [ ] Test registrasi user baru
- [ ] Verifikasi user baru memiliki profile, role, dan GPS settings
- [ ] Beritahu user bahwa registrasi sudah bisa digunakan

## ⚠️ Catatan Penting

1. **Tidak perlu build ulang APK** - Ini hanya database fix
2. **Tidak perlu update code** - Frontend tetap sama
3. **Fix otomatis berlaku** untuk semua user yang mendaftar setelah SQL dijalankan
4. **Existing users** yang sudah terdaftar tidak terpengaruh
5. **Rider yang belum punya GPS settings** otomatis dibuatkan saat SQL dijalankan

## 🎯 Root Cause

PostgreSQL triggers yang berjalan pada event yang sama (`AFTER INSERT ON auth.users`) tidak memiliki **guaranteed execution order**. Sehingga:
- `handle_new_user` dan `create_rider_gps_settings` berjalan bersamaan
- `create_rider_gps_settings` mencoba membaca `user_roles` yang belum dibuat
- Error terjadi karena foreign key constraint

**Solusi:** Gabungkan logic GPS settings creation ke dalam `handle_new_user` function, sehingga eksekusi sequential dan deterministik.

## 📚 Files Changed

- `fix-new-user-registration.sql` - Fix script (NEW)
- `FIX-REGISTRATION-ERROR.md` - Documentation (NEW)

## ✅ Status

- [x] Diagnosis
- [x] Create fix SQL
- [x] Create documentation
- [ ] **Execute SQL in production**
- [ ] Test registrasi
- [ ] Mark as resolved

---

**Last Updated:** 2025-01-29  
**Version:** 1.0.5  
**Priority:** 🔴 CRITICAL (blocking new user registration)
