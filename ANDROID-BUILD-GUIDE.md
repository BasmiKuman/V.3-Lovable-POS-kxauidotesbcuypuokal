# 📱 Android APK Build Guide - BK POS System

## ✅ Setup Completed!

Capacitor sudah berhasil diinstall dan dikonfigurasi untuk project ini.

---

## 🚀 Cara Build APK

### **Option 1: Build di Local (Butuh Android Studio)**

#### Prerequisites:
1. **Install Android Studio**: https://developer.android.com/studio
2. **Install Java JDK 17**: https://adoptium.net/
3. **Setup Android SDK** (via Android Studio)

#### Steps:

1. **Build web assets & sync:**
   ```bash
   npm run android:build
   ```

2. **Open Android Studio:**
   ```bash
   npm run android
   ```
   Atau manual:
   ```bash
   npx cap open android
   ```

3. **Build APK di Android Studio:**
   - Menu: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - Tunggu build selesai (3-5 menit)
   - Klik `locate` untuk buka folder APK
   - File APK ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

4. **Install APK ke HP:**
   - Transfer file APK ke HP
   - Buka file di HP
   - Izinkan install dari unknown sources
   - Install!

---

### **Option 2: Build via GitHub Actions (Recommended untuk Production)**

#### Setup:

1. **Buat file `.github/workflows/android-build.yml`:**
   ```yaml
   name: Build Android APK
   
   on:
     push:
       branches: [ main ]
     workflow_dispatch:
   
   jobs:
     build:
       runs-on: ubuntu-latest
       
       steps:
       - uses: actions/checkout@v3
       
       - name: Setup Node.js
         uses: actions/setup-node@v3
         with:
           node-version: '18'
           
       - name: Setup Java JDK
         uses: actions/setup-java@v3
         with:
           distribution: 'temurin'
           java-version: '17'
           
       - name: Install dependencies
         run: npm ci
         
       - name: Build web assets
         run: npm run build
         
       - name: Sync Capacitor
         run: npx cap sync android
         
       - name: Build APK
         run: |
           cd android
           ./gradlew assembleDebug
           
       - name: Upload APK
         uses: actions/upload-artifact@v3
         with:
           name: app-debug
           path: android/app/build/outputs/apk/debug/app-debug.apk
   ```

2. **Push ke GitHub**
3. **Download APK** dari tab Actions → Artifacts

---

### **Option 3: Build via Cloud Service**

#### **Appflow (by Ionic) - Recommended**
- Website: https://ionic.io/appflow
- Free tier available
- Auto build on git push
- Support signing & distribution

#### **Codemagic**
- Website: https://codemagic.io/
- Free tier: 500 build minutes/month
- Easy setup untuk Capacitor

#### **Bitrise**
- Website: https://www.bitrise.io/
- Free tier available
- CI/CD untuk mobile apps

---

## 📝 NPM Scripts Available

```bash
# Build web + sync + open Android Studio
npm run android

# Build web + sync to Android (tanpa buka studio)
npm run android:build

# Sync saja (setelah ada perubahan code)
npm run android:sync

# Sync semua platform
npm run cap:sync
```

---

## 🔧 Installed Capacitor Plugins

1. **@capacitor/core** - Core functionality
2. **@capacitor/android** - Android platform
3. **@capacitor/camera** - Access camera & photo library
4. **@capacitor/splash-screen** - Custom splash screen
5. **@capacitor/status-bar** - Status bar styling

---

## 🎨 Customization

### **App Icon**
1. Buat icon 1024x1024 px
2. Generate dengan: https://www.appicon.co/
3. Download Android icons
4. Replace di: `android/app/src/main/res/mipmap-*/`

### **Splash Screen**
1. Buat splash 2732x2732 px (center 1242x2208 safe area)
2. Save ke: `android/app/src/main/res/drawable/splash.png`
3. Config sudah ada di `capacitor.config.ts`

### **App Name**
Edit di: `android/app/src/main/res/values/strings.xml`
```xml
<string name="app_name">BK POS System</string>
```

### **Package ID**
Edit di: `capacitor.config.ts` → `appId`
Format: `com.company.appname`

---

## 🐛 Troubleshooting

### **Error: JAVA_HOME not set**
```bash
# Linux/Mac
export JAVA_HOME=/path/to/jdk-17
export PATH=$JAVA_HOME/bin:$PATH

# Windows
setx JAVA_HOME "C:\Program Files\Java\jdk-17"
```

### **Error: SDK location not found**
Buat file `android/local.properties`:
```
sdk.dir=/Users/USERNAME/Library/Android/sdk
```

### **Error: Gradle build failed**
```bash
cd android
./gradlew clean
cd ..
npm run android:build
```

### **App crashes on startup**
1. Check console logs: `npx cap run android --livereload`
2. Check Supabase URL di `.env`
3. Pastikan HTTPS (bukan HTTP)

---

## 📦 Build Variants

### **Debug APK** (untuk testing):
```bash
cd android
./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### **Release APK** (untuk production):

1. **Generate keystore:**
   ```bash
   keytool -genkey -v -keystore bk-pos-release.keystore -alias bk-pos -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Edit `android/app/build.gradle`:**
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('../../bk-pos-release.keystore')
               storePassword 'your-password'
               keyAlias 'bk-pos'
               keyPassword 'your-password'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

3. **Build:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🚀 Publish to Google Play Store

1. **Buat Google Play Console account**: https://play.google.com/console
2. **Bayar one-time fee**: $25
3. **Create app** di console
4. **Upload APK/AAB**:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   Upload: `android/app/build/outputs/bundle/release/app-release.aab`
5. **Fill app details** (screenshots, description, etc)
6. **Submit for review**

---

## 📊 App Details

- **App Name:** BK POS System
- **Package ID:** com.basmikuman.pos
- **Version:** 1.0.0
- **Min SDK:** 22 (Android 5.1)
- **Target SDK:** 34 (Android 14)

---

## 🔄 Update Flow

Setiap kali ada perubahan code:

1. **Update code** di src/
2. **Build & sync:**
   ```bash
   npm run android:build
   ```
3. **Rebuild APK** di Android Studio
4. **Install updated APK** ke HP

---

## 📱 Testing di Real Device

### **Via USB:**
1. Enable **Developer Options** di HP
2. Enable **USB Debugging**
3. Connect HP ke laptop
4. Run:
   ```bash
   npx cap run android
   ```

### **Via WiFi (ADB Wireless):**
1. HP & laptop connect ke WiFi sama
2. Di HP: Developer Options → Wireless Debugging
3. Pair device:
   ```bash
   adb pair <ip>:<port>
   adb connect <ip>:<port>
   npx cap run android
   ```

---

## 🎯 Next Steps

1. ✅ **Test app di emulator/real device**
2. ✅ **Customize app icon & splash screen**
3. ✅ **Build release APK**
4. ✅ **Test offline functionality**
5. ✅ **Setup signing untuk production**
6. ✅ **Publish to Play Store**

---

## 📞 Support

Jika ada masalah:
- Capacitor Docs: https://capacitorjs.com/docs
- Android Developer Docs: https://developer.android.com/docs
- Stack Overflow: Tag `capacitor` atau `android-capacitor`

---

**Build Status:** ✅ Ready to build APK!  
**Last Updated:** October 28, 2025  
**Capacitor Version:** 7.4.4
