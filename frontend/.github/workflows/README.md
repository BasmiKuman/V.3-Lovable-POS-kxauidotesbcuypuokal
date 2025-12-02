# 🤖 GitHub Actions - Auto Build APK

## ✅ Setup Selesai!

Saya sudah setup 2 workflow untuk auto-build APK:

1. **build-android-apk.yml** - Debug build (untuk testing)
2. **build-release-apk.yml** - Release build (untuk production)

---

## 🚀 Cara Menggunakan

### **Workflow 1: Debug Build (Auto)**

**Trigger:** Otomatis setiap push ke branch `main`

**Yang terjadi:**
1. ✅ Install dependencies
2. ✅ Build web assets
3. ✅ Sync ke Android
4. ✅ Build APK debug
5. ✅ Upload sebagai artifact

**Cara download APK:**
1. Push code ke GitHub:
   ```bash
   git add .
   git commit -m "Your message"
   git push
   ```

2. Buka GitHub repo → tab **Actions**

3. Klik workflow run terbaru

4. Scroll ke bawah, lihat section **Artifacts**

5. Download **BK-POS-Debug-v1.0.0**

6. Extract zip → dapat file `app-debug.apk`

7. Install ke HP! 🎉

---

### **Workflow 2: Release Build (Manual)**

**Trigger:** Manual via GitHub UI atau push tag

#### **Method 1: Manual Trigger**

1. Buka GitHub repo → tab **Actions**

2. Pilih workflow **Build Release APK**

3. Klik **Run workflow**

4. Input version number (e.g., `1.0.0`)

5. Klik **Run workflow** hijau

6. Tunggu selesai → Download artifact

#### **Method 2: Git Tag**

```bash
# Create version tag
git tag v1.0.0

# Push tag
git push origin v1.0.0
```

Workflow akan auto-run dan create GitHub Release!

---

## 📦 Artifacts yang Dihasilkan

### **Debug Build:**
- **BK-POS-Debug-v1.0.0.zip** - Contains `app-debug.apk`
- **Build-Info.txt** - Build information

### **Release Build:**
- **BK-POS-Release-v1.0.0.zip** - Contains `app-release-unsigned.apk`
- **Release-Notes.md** - Release notes

**Retention:** 
- Debug: 30 hari
- Release: 90 hari

---

## 🔄 Update Version

Edit `package.json`:
```json
{
  "version": "1.0.0"  // Change this
}
```

Push ke GitHub → workflow akan build dengan version baru!

---

## ⚙️ Workflow Features

### **build-android-apk.yml (Debug)**
- ✅ Auto trigger on push to main
- ✅ Auto trigger on pull request
- ✅ Manual trigger via workflow_dispatch
- ✅ Node.js 20
- ✅ JDK 17
- ✅ Gradle cache untuk build cepat
- ✅ Upload artifact dengan version number
- ✅ Generate build info

### **build-release-apk.yml (Release)**
- ✅ Trigger via git tag atau manual
- ✅ Production build optimization
- ✅ Generate release notes
- ✅ Auto create GitHub Release (jika via tag)
- ✅ Unsigned APK (siap untuk signing)

---

## 🎯 Use Cases

### **Development & Testing:**
```bash
# Make changes
git add .
git commit -m "Add new feature"
git push

# Wait 5 minutes
# Download debug APK from Actions
# Test on device
```

### **Beta Release:**
```bash
# Prepare release
git tag v1.0.0-beta.1
git push origin v1.0.0-beta.1

# Download from GitHub Releases
# Share with beta testers
```

### **Production Release:**
```bash
# Create release tag
git tag v1.0.0
git push origin v1.0.0

# Download release APK
# Sign with keystore
# Upload to Play Store
```

---

## 🔐 Signing APK (Next Step)

APK yang dihasilkan workflow ini **unsigned**. Untuk production:

1. **Generate keystore:**
   ```bash
   keytool -genkey -v -keystore bk-pos.keystore -alias bk-pos -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Encode keystore ke base64:**
   ```bash
   base64 bk-pos.keystore > keystore.b64
   ```

3. **Add GitHub Secrets:**
   - Settings → Secrets → Actions → New repository secret
   - `KEYSTORE_FILE` = isi dari `keystore.b64`
   - `KEYSTORE_PASSWORD` = password keystore
   - `KEY_ALIAS` = `bk-pos`
   - `KEY_PASSWORD` = password key

4. **Update workflow** untuk use signing config

5. **Push** → get signed APK!

---

## 📊 Build Time

**Typical duration:**
- Install dependencies: ~30 seconds
- Build web: ~15 seconds
- Sync Capacitor: ~5 seconds
- Build APK: ~3 minutes

**Total:** ~4-5 minutes per build

---

## 🐛 Troubleshooting

### **Build Failed - Dependencies**
```bash
# Local test
npm ci
npm run build
npx cap sync android
```

### **Build Failed - Gradle**
Check workflow logs di Actions tab untuk detail error

### **APK Not Found**
APK ada di **Artifacts** section, bukan di **Release** (kecuali trigger via tag)

### **Workflow Not Running**
1. Check branch = `main`
2. Check file ada di `.github/workflows/`
3. Check file extension = `.yml`

---

## 📱 Testing APK

### **On Real Device:**
1. Download APK dari Artifacts
2. Extract zip
3. Transfer `app-debug.apk` ke HP
4. Settings → Security → Unknown Sources (enable)
5. Install APK
6. Test!

### **On Emulator:**
```bash
# Install to emulator
adb install app-debug.apk

# Or drag & drop APK to emulator window
```

---

## 🎨 Customization

### **Change Build Trigger:**
Edit `.github/workflows/build-android-apk.yml`:
```yaml
on:
  push:
    branches: [ main, develop ]  # Add branches
```

### **Add Build Steps:**
```yaml
- name: Run tests
  run: npm test
  
- name: Lint code
  run: npm run lint
```

### **Add Notifications:**
Use Slack/Discord webhook untuk notif saat build selesai

---

## 🚀 Production Checklist

Before going to production:

- [ ] Update version in `package.json`
- [ ] Generate signing keystore
- [ ] Add GitHub secrets for signing
- [ ] Update workflow untuk signed build
- [ ] Test signed APK on multiple devices
- [ ] Create Play Store listing
- [ ] Prepare screenshots & assets
- [ ] Submit for review

---

## 📞 Quick Commands

```bash
# Trigger debug build
git push

# Create release
git tag v1.0.0 && git push origin v1.0.0

# Update version
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

---

**Status:** ✅ Workflows Active  
**Next:** Push code to trigger first build!  
**APK Location:** GitHub Actions → Artifacts
