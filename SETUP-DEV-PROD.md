# 🔧 Setup Supabase untuk Development & Production

## 🎯 Penting!

Ada **2 konfigurasi berbeda** untuk development dan production:

---

## 💻 Development (npm run dev)

### 1. Update `.env` file:

```env
VITE_APP_URL=http://localhost:8080
```

### 2. Update Supabase Dashboard:

Login ke: https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit

**Authentication → URL Configuration:**

**Site URL:**
```
http://localhost:8080
```

**Redirect URLs (tambahkan semua):**
```
http://localhost:8080/**
http://localhost:8080/auth
http://localhost:8080/email-verified
http://localhost:8080/reset-password
```

**Save!**

---

## 📱 Production APK (Build Android)

### 1. Update `.env` file:

```env
VITE_APP_URL=com.basmikuman.pos://
```

### 2. Update Supabase Dashboard:

**Site URL:**
```
com.basmikuman.pos://
```

**Redirect URLs (tambahkan semua):**
```
com.basmikuman.pos://**
com.basmikuman.pos://auth
com.basmikuman.pos://email-verified
com.basmikuman.pos://reset-password
```

**Save!**

---

## 🔄 Workflow

### Saat Development:
1. Set `.env` → `http://localhost:8080`
2. Set Supabase → `http://localhost:8080`
3. `npm run dev`
4. Test di browser

### Saat Build APK:
1. Set `.env` → `com.basmikuman.pos://`
2. Set Supabase → `com.basmikuman.pos://`
3. `npm run build`
4. Push ke GitHub → APK auto build

---

## ✅ Testing Checklist

### Test di Development (Browser):

- [ ] Login dengan email/password ✅
- [ ] Register user baru ✅
- [ ] Email verification link buka `localhost:8080/email-verified` ✅
- [ ] Reset password link buka `localhost:8080/reset-password` ✅
- [ ] Ubah password berhasil ✅

### Test di Production (APK):

- [ ] Install APK di Android ✅
- [ ] Login dengan email/password ✅
- [ ] Email verification link buka aplikasi ✅
- [ ] Reset password link buka aplikasi ✅
- [ ] Ubah password berhasil ✅

---

## 🆘 Troubleshooting

### ❌ Link email masih redirect ke Supabase error page

**Penyebab:** Site URL dan Redirect URLs belum diupdate

**Solusi:**
1. Cek Supabase Dashboard → Authentication → URL Configuration
2. Pastikan Site URL = `http://localhost:8080` (dev) atau `com.basmikuman.pos://` (prod)
3. Pastikan semua Redirect URLs sudah ditambahkan
4. Klik **Save**
5. Test lagi

### ❌ Reset password tidak muncul halaman

**Penyebab:** Route `/reset-password` belum ada atau link salah

**Solusi:**
1. Cek file `src/App.tsx` → route `/reset-password` harus ada
2. Cek file `src/pages/Auth.tsx` → `redirectTo` harus `/reset-password`
3. Restart dev server: `npm run dev`

### ❌ Admin tidak bisa tambah user (RLS error)

**Penyebab:** RLS policy untuk INSERT profiles belum dibuat

**Solusi:**
1. Jalankan SQL: `fix-profiles-insert-policy.sql` di Supabase SQL Editor
2. Refresh halaman settings
3. Test tambah user lagi

---

## 📁 Files yang Diupdate

```
.env                                 # VITE_APP_URL configuration
src/App.tsx                         # Added /reset-password route
src/pages/Auth.tsx                  # Reset password redirectTo updated
src/pages/ResetPassword.tsx         # NEW - Reset password page
src/pages/EmailVerified.tsx         # Email verification page
fix-profiles-insert-policy.sql      # RLS fix for admin insert
```

---

## 🎉 Done!

Sekarang aplikasi Anda memiliki:
- ✅ Halaman email verification (`/email-verified`)
- ✅ Halaman reset password (`/reset-password`)
- ✅ Support development (localhost) & production (deep link)
- ✅ Admin bisa tambah user baru
- ✅ RLS policies lengkap dan aman

Tinggal **update Supabase URL Configuration** sesuai mode (dev/prod) dan test! 🚀
