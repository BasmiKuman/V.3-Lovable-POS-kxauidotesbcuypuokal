# 🚀 Quick Start - Build APK Sekarang!

## ✅ Setup Selesai!

Capacitor sudah terinstall dan siap digunakan. Ada 3 cara untuk build APK:

---

## 🎯 Cara Tercepat (Tanpa Android Studio)

### **1. Install Termux di HP Android**
Download: https://f-droid.org/en/packages/com.termux/

### **2. Jalankan di Termux:**
```bash
# Install dependencies
pkg install nodejs-lts git -y

# Clone repo
git clone https://github.com/BasmiKuman/V.3-Lovable-POS-kxauidotesbcuypuokal.git
cd V.3-Lovable-POS-kxauidotesbcuypuokal

# Install & build
npm install
npm run build

# Install Gradle
pkg install gradle -y

# Build APK
cd android
gradle assembleDebug
```

APK akan ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 💻 Cara via Laptop (Butuh Android Studio)

### **Prerequisites:**
1. Download & Install **Android Studio**: https://developer.android.com/studio
2. Download & Install **JDK 17**: https://adoptium.net/

### **Steps:**

```bash
# Di project folder
npm run android
```

Ini akan:
1. ✅ Build web assets
2. ✅ Sync ke Android
3. ✅ Buka Android Studio

**Di Android Studio:**
- Menu → `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
- Tunggu 3-5 menit
- Klik `locate` untuk buka folder APK
- File: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🚀 GitHub Actions (Otomatis)

Setiap kali Anda push ke branch `main`, GitHub Actions akan otomatis:
1. Build APK dengan Java 17 (kompatibilitas penuh)
2. Upload sebagai artifact
3. Simpan selama 30 hari

**Download APK:**
1. Buka: https://github.com/BasmiKuman/V.3-Lovable-POS-kxauidotesbcuypuokal/actions
2. Klik workflow run terbaru (tunggu ~5 menit)
3. Download artifact `BK-POS-Debug-v1.0.0`

**⚠️ Java Version Fix:**
Jika build gagal dengan error "invalid source release: 21", sudah diperbaiki dengan:
- Global Java 17 configuration untuk semua subprojects
- `afterEvaluate` untuk Capacitor modules
- `configureEach` untuk semua compile tasks

---

## 📱 Install APK ke HP

1. Transfer file `app-debug.apk` ke HP
2. Buka file di HP
3. Jika ada warning "Unknown sources":
   - Settings → Security → Install unknown apps
   - Izinkan untuk file manager yang digunakan
4. Tap `Install`
5. Selesai! 🎉

---

## 🔄 Update APK

Setiap kali ada perubahan code:

```bash
npm run android:build
```

Lalu rebuild APK di Android Studio atau GitHub Actions.

---

## 🎨 Customize App

### **Ganti Icon:**
1. Buat icon 1024x1024 px
2. Generate: https://icon.kitchen/
3. Download Android resources
4. Replace folder `android/app/src/main/res/mipmap-*/`

### **Ganti Splash Screen:**
1. Buat splash 2732x2732 px
2. Save sebagai `android/app/src/main/res/drawable/splash.png`

### **Ganti Nama App:**
Edit `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Nama App Baru</string>
```

---

## 🐛 Troubleshooting

### **Error: Gradle not found**
```bash
# Install Gradle
npm install -g gradle

# Atau gunakan wrapper
cd android
chmod +x gradlew
./gradlew assembleDebug
```

### **Error: JAVA_HOME not set**
Install JDK 17, lalu:
```bash
export JAVA_HOME=/path/to/jdk-17
```

### **Error: Android SDK not found**
Buat file `android/local.properties`:
```
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

---

## 📦 File Locations

- **Debug APK:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK:** `android/app/build/outputs/apk/release/app-release.apk`
- **Config:** `capacitor.config.ts`
- **Android Project:** `android/`

---

## ✨ NPM Commands

```bash
# Build web + sync + open Android Studio
npm run android

# Build web + sync (no Android Studio)
npm run android:build

# Sync only
npm run android:sync

# Build web only
npm run build
```

---

## 🎯 Recommendation

**Untuk pertama kali:** Gunakan **GitHub Actions** (paling mudah, no setup)

**Untuk development:** Install **Android Studio** (bisa debug & test)

**Untuk quick test:** Build di **Termux** langsung di HP

---

## 📞 Need Help?

Baca guide lengkap: `ANDROID-BUILD-GUIDE.md`

**Status:** ✅ Ready to build!  
**App:** BK POS System  
**Package:** com.basmikuman.pos
