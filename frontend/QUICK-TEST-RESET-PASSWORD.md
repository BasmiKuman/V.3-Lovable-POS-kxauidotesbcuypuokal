# 🔧 Setup Reset Password & Email Verification - LANGSUNG DI APLIKASI

## ⚠️ PENTING: Setup Supabase Dulu!

Sebelum test, **WAJIB** update Supabase Dashboard URL Configuration.

---

## 📋 LANGKAH 1: Update Supabase Dashboard

### 1. Login ke Supabase:
🔗 https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit

### 2. Buka Authentication → URL Configuration

Klik menu:
- **Authentication** (sidebar kiri)
- **URL Configuration** (tab)

### 3. Update Site URL

**Site URL:**
```
com.basmikuman.pos://
```

❌ Jangan pakai `http://localhost:8081`  
✅ Pakai `com.basmikuman.pos://` (deep link)

### 4. Update Redirect URLs

**Tambahkan 4 URL ini:**
```
com.basmikuman.pos://**
com.basmikuman.pos://auth
com.basmikuman.pos://email-verified
com.basmikuman.pos://reset-password
```

**Cara tambah:**
1. Klik di field "Redirect URLs"
2. Ketik URL pertama
3. Enter
4. Ulangi untuk 3 URL lainnya

### 5. SAVE!!!

Klik tombol **"Save"** di bawah!

⚠️ **Jika tidak di-save, tidak akan berfungsi!**

---

## � FIXED: Deep Link Routing

### Masalah Sebelumnya:
- ❌ Link reset password buka aplikasi tapi muncul halaman login
- ❌ Tidak redirect ke halaman reset password

### Solusi (Sudah Diperbaiki):
✅ `main.tsx` sekarang detect tipe link:
- `type=recovery` → Redirect ke `/reset-password` (Reset Password)
- `type=signup` → Redirect ke `/email-verified` (Email Verification)

✅ `Auth.tsx` sekarang detect recovery token dan redirect ke `/reset-password`

### Build Terbaru:
Commit: `5c3dd93` - "fix: Deep link routing untuk reset password & email verification"

---

## �📱 LANGKAH 2: Build & Install APK

### Option A: Via GitHub Actions (Recommended)

1. **Push ke GitHub:**
   ```bash
   git add -A
   git commit -m "fix: Update untuk deep link testing"
   git push origin main
   ```

2. **Tunggu build selesai** (~5-10 menit)
   🔗 https://github.com/BasmiKuman/V.3-Lovable-POS-kxauidotesbcuypuokal/actions

3. **Download APK dari Artifacts**

4. **Install di Android device**

### Option B: Build Manual (Lebih Cepat)

```bash
# Build tanpa bump version
npm run build:no-bump

# Sync ke Capacitor
npx cap sync android

# Build APK (di Android Studio atau CLI)
cd android
./gradlew assembleDebug
```

APK ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🧪 LANGKAH 3: Testing

### Test 1: Reset Password

1. **Buka aplikasi** (APK yang baru diinstall)

2. **Klik "Lupa Password"**

3. **Masukkan email** yang terdaftar
   ```
   Contoh: fadlannafian@gmail.com
   ```

4. **Klik "Kirim"**

5. **Buka email di HP/Laptop**

6. **Klik link di email**

   **Yang terjadi:**
   - ✅ **Android otomatis buka aplikasi BK POS**
   - ✅ **Halaman reset password muncul DI APLIKASI**
   - ✅ Tidak buka browser!

7. **Isi password baru:**
   - Password baru (min 6 karakter)
   - Konfirmasi password

8. **Klik "Ubah Password"**

9. ✅ **Berhasil!** Redirect ke login

10. **Login dengan password baru**

### Test 2: Email Verification (Bonus)

1. **Daftar user baru** di aplikasi

2. **Cek email verifikasi**

3. **Klik link**

   **Yang terjadi:**
   - ✅ **Aplikasi otomatis terbuka**
   - ✅ **Email langsung terverifikasi di aplikasi**

4. **Klik "Login Sekarang"**

5. ✅ Login dengan akun baru!

---

## ❌ Troubleshooting

### Problem: Link email buka browser, bukan aplikasi

**Penyebab:** 
- Supabase URL Configuration belum diupdate
- Deep link belum ter-register di Android

**Solusi:**
1. ✅ Cek Supabase Site URL = `com.basmikuman.pos://`
2. ✅ Cek Redirect URLs sudah ada 4 URL
3. ✅ Klik **Save** di Supabase
4. **Uninstall aplikasi** sepenuhnya dari Android
5. **Install ulang** APK terbaru
6. Test lagi

### Problem: Link email tidak berfungsi sama sekali

**Penyebab:** Email template menggunakan Supabase URL lama

**Solusi:**
1. Buka Supabase → Authentication → Email Templates
2. Klik "Confirm signup" atau "Reset password"
3. Pastikan ada `{{ .ConfirmationURL }}` di template
4. Save
5. Test lagi dengan request email baru

### Problem: Aplikasi crash saat buka link

**Penyebab:** AndroidManifest.xml belum ada intent filter

**Solusi:**
Build ulang dengan kode terbaru (sudah include intent filter)

---

## 📊 Checklist Sebelum Testing

- [ ] ✅ Supabase Site URL = `com.basmikuman.pos://`
- [ ] ✅ Supabase Redirect URLs ada 4 URL
- [ ] ✅ Klik **Save** di Supabase Dashboard
- [ ] ✅ File `.env` → `VITE_APP_URL=com.basmikuman.pos://`
- [ ] ✅ Build APK terbaru
- [ ] ✅ Install APK di Android device
- [ ] ✅ Siap test!

---

## 🎯 Expected Behavior

### Email Reset Password:

```
1. User klik "Lupa Password" di aplikasi
2. Masukkan email → kirim
3. Email diterima dengan link
4. Klik link di email
5. 📱 APLIKASI OTOMATIS TERBUKA (bukan browser!)
6. Form reset password muncul
7. Isi password baru → submit
8. Success! Redirect ke login
9. Login dengan password baru ✅
```

### Email Verification:

```
1. User daftar di aplikasi
2. Email verifikasi dikirim
3. Klik link di email
4. 📱 APLIKASI OTOMATIS TERBUKA
5. Email terverifikasi
6. Klik "Login Sekarang"
7. Login ✅
```

---

## 💡 Kenapa Tidak Pakai Localhost?

**Masalah localhost:**
- ❌ Hanya bisa di browser, tidak bisa di aplikasi Android
- ❌ Perlu port forwarding yang ribet
- ❌ Link email tidak bisa buka aplikasi

**Keuntungan deep link:**
- ✅ Email langsung buka aplikasi Android
- ✅ User experience lebih baik
- ✅ Tidak perlu browser sama sekali
- ✅ Lebih aman (tidak keluar dari aplikasi)

---

## 📁 Files Sudah Siap

```
✅ .env                           # VITE_APP_URL = deep link
✅ src/pages/ResetPassword.tsx   # Halaman reset password
✅ src/pages/EmailVerified.tsx   # Halaman email verification
✅ src/App.tsx                   # Routes sudah ada
✅ android/app/src/main/AndroidManifest.xml  # Intent filters
```

---

## 🚀 Quick Command

```bash
# Update environment
# (sudah otomatis via .env)

# Build APK
npm run build

# Push untuk GitHub Actions build
git add -A
git commit -m "test: Reset password via deep link"
git push origin main

# Tunggu build selesai (~5-10 menit)
# Download APK dari GitHub Actions
# Install di Android → Test!
```

---

**Siap untuk build & test di aplikasi!** 📱✨

**No localhost needed!** 🎉
