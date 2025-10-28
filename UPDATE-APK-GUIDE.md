# 🔄 Panduan Update APK

## 🚀 Cara Paling Mudah (Otomatis via GitHub)

### **Langkah-langkah:**

```bash
# 1. Pastikan semua perubahan sudah di-commit
git add .
git commit -m "✨ Deskripsi update yang Anda buat"

# 2. Push ke GitHub
git push

# 3. SELESAI! APK otomatis ter-build
```

**Itu saja!** GitHub Actions akan otomatis:
- ✅ Build APK baru (~5 menit)
- ✅ Upload sebagai artifact
- ✅ Siap download

### **Download APK Baru:**
1. Buka: https://github.com/BasmiKuman/V.3-Lovable-POS-kxauidotesbcuypuokal/actions
2. Klik workflow run **paling atas** (yang baru saja di-trigger)
3. Tunggu sampai selesai (hijau ✓)
4. Download artifact: `BK-POS-Debug-v1.0.0.zip`
5. Extract → `app-debug.apk`
6. Install ke HP Android

---

## 📦 Cara Manual (Build Lokal)

Jika ingin build di komputer sendiri:

```bash
# 1. Build web app
npm run build

# 2. Sync ke Android
npx cap sync android

# 3. Build APK
cd android
./gradlew assembleDebug

# 4. APK ada di:
# android/app/build/outputs/apk/debug/app-debug.apk
```

**Transfer ke HP:**
```bash
# Via USB/ADB
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Atau copy manual file APK ke HP
```

---

## 🔢 Update Versi APK

Sebelum push update besar, update versi di `package.json`:

```json
{
  "version": "1.0.1"  ← Ubah ini (dari 1.0.0)
}
```

**Konvensi Versi:**
- `1.0.0` → `1.0.1` = Bug fix kecil
- `1.0.0` → `1.1.0` = Fitur baru
- `1.0.0` → `2.0.0` = Perubahan besar

Lalu:
```bash
git add package.json
git commit -m "🔖 Bump version to 1.0.1"
git push
```

APK yang di-build akan punya nama: `BK-POS-Debug-v1.0.1`

---

## 📱 Update Versi Android (versionCode)

Untuk update di Google Play Store, edit `android/app/build.gradle`:

```groovy
android {
    defaultConfig {
        versionCode 2        ← Naikkan dari 1 → 2 → 3 dst
        versionName "1.0.1"  ← Sesuaikan dengan package.json
    }
}
```

Commit dan push:
```bash
git add android/app/build.gradle package.json
git commit -m "🔖 Bump to version 1.0.1 (build 2)"
git push
```

---

## 🎯 Workflow Update Ideal

```bash
# 1. Buat perubahan code (misalnya tambah fitur)
# Edit file src/...

# 2. Test di browser
npm run dev

# 3. Kalau sudah OK, commit
git add .
git commit -m "✨ Tambah fitur laporan PDF"

# 4. Push (APK otomatis ter-build)
git push

# 5. Tunggu 5 menit

# 6. Download APK baru dari GitHub Actions

# 7. Install ke HP → Testing

# 8. Kalau ada bug, ulangi dari langkah 1
```

---

## ⚡ Quick Commands

### Update Biasa:
```bash
git add . && git commit -m "💄 Update UI" && git push
```

### Update dengan Bump Versi:
```bash
# Edit package.json version
git add . && git commit -m "🔖 Release v1.0.1" && git push
```

### Regenerate Icons (kalau ganti logo):
```bash
./generate-icons.sh
npm run build
npx cap sync android
git add . && git commit -m "🎨 Update app icons" && git push
```

---

## 🔍 Cek Status Build

**Via Browser:**
https://github.com/BasmiKuman/V.3-Lovable-POS-kxauidotesbcuypuokal/actions

**Status:**
- 🟡 Kuning (berlangsung) → Tunggu
- 🟢 Hijau ✓ → Sukses, download APK
- 🔴 Merah ✗ → Gagal, cek log error

---

## 💡 Tips

1. **Update Kecil:** Langsung push, otomatis build
2. **Update Besar:** Bump version dulu
3. **Ganti Logo/Icon:** Jalankan `./generate-icons.sh` sebelum push
4. **Build Gagal:** Cek GitHub Actions logs, biasanya error TypeScript atau Java
5. **APK Tidak Berubah:** Pastikan sudah `npm run build` sebelum sync

---

## 🆘 Troubleshooting

### "APK tidak update"
```bash
# Force rebuild:
cd android
./gradlew clean
cd ..
npm run build
npx cap sync android
git add . && git commit -m "🔧 Force rebuild" && git push
```

### "Build error di GitHub"
- Cek file `.github/workflows/build-android-apk.yml`
- Lihat logs di GitHub Actions
- Error Java → Sudah fixed dengan Java 17 config
- Error TypeScript → Fix di code, lalu push lagi

### "Icon tidak berubah"
```bash
./generate-icons.sh
npx cap sync android
git add android/app/src/main/res/
git commit -m "🎨 Update icons"
git push
```

---

**🎉 Sekarang Anda bisa update APK kapan saja hanya dengan `git push`!**
