# 🔖 Auto Version Bump System

## ✨ Fitur Baru

Setiap kali Anda **build aplikasi**, version number akan **otomatis naik**!

---

## 🚀 Cara Kerja

### **Before:**
```json
// package.json
"version": "1.0.0"
```
```bash
npm run build
# Version tetap 1.0.0
```

### **After (NEW!):**
```bash
npm run build
# ✅ Version bumped: 1.0.0 → 1.0.1
# ✅ Android versionCode: 10001
# ✅ Android versionName: 1.0.1
```

**Otomatis update:**
- ✅ `package.json` → version
- ✅ `android/app/build.gradle` → versionCode & versionName
- ✅ `capacitor.config.ts` → version comment
- ✅ APK filename → `BK-POS-Debug-v1.0.1`

---

## 📋 Commands

### **1. Build dengan Auto Bump** (RECOMMENDED)
```bash
npm run build
```
- Bump version otomatis
- Build web assets
- **Output:** Version naik (1.0.0 → 1.0.1)

### **2. Build Tanpa Bump**
```bash
npm run build:no-bump
```
- Build saja, version tidak berubah
- Untuk re-build dengan version yang sama

### **3. Bump Version Saja**
```bash
npm run version:bump
```
- Hanya naikkan version
- Tidak build

### **4. Build Android APK**
```bash
npm run android:build
```
- Auto bump version
- Build web
- Sync to Android
- **Ready untuk build APK manual**

---

## 🔢 Version Format

**Format:** `MAJOR.MINOR.PATCH`

### **Patch (Auto Increment)**
```
1.0.0 → 1.0.1 → 1.0.2 → 1.0.3 ...
```
- Setiap `npm run build`
- Bug fixes, small changes

### **Minor (Manual Edit)**
```json
// package.json
"version": "1.1.0"  // ← Edit manual
```
```bash
npm run build
# Next: 1.1.0 → 1.1.1 → 1.1.2 ...
```
- New features
- Backwards compatible

### **Major (Manual Edit)**
```json
// package.json
"version": "2.0.0"  // ← Edit manual
```
```bash
npm run build
# Next: 2.0.0 → 2.0.1 → 2.0.2 ...
```
- Breaking changes
- Major redesign

---

## 📱 Android Version Code

**Formula:** `MAJOR × 10000 + MINOR × 100 + PATCH`

**Examples:**
```
1.0.0  → versionCode: 10000
1.0.1  → versionCode: 10001
1.0.99 → versionCode: 10099
1.1.0  → versionCode: 10100
2.0.0  → versionCode: 20000
```

**Kenapa?**
- Google Play Store requires versionCode naik setiap update
- Unique number untuk setiap build
- Max: 2147483647 (bisa sampai version 214.74.83647)

---

## 🎯 Workflow Update Aplikasi

### **Scenario 1: Bug Fix**
```bash
# 1. Fix bug di code
# 2. Build
npm run build
# Version: 1.0.5 → 1.0.6

# 3. Push (auto build APK di GitHub Actions)
git add .
git commit -m "🐛 Fix login bug"
git push

# 4. Download APK: BK-POS-Debug-v1.0.6
# 5. Distribute to users
```

### **Scenario 2: New Feature**
```bash
# 1. Develop new feature
# 2. Edit package.json manually
"version": "1.1.0"  // Minor bump

# 3. Build
npm run build
# Version: 1.1.0 (stays), versionCode updated

# 4. Next builds auto increment
npm run build
# 1.1.0 → 1.1.1

npm run build
# 1.1.1 → 1.1.2
```

### **Scenario 3: Major Release**
```bash
# 1. Big changes, breaking updates
# 2. Edit package.json
"version": "2.0.0"  // Major bump

# 3. Build
npm run build
# Version: 2.0.0

# 4. Tag release
git tag v2.0.0
git push --tags

# GitHub Actions will build release APK
```

---

## 📦 GitHub Actions Integration

**Otomatis di setiap push:**
```yaml
# .github/workflows/build-android-apk.yml
- name: Build web assets
  run: npm run build  # ← Auto bump version

- name: Get version
  id: version
  run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

- name: Upload APK
  with:
    name: BK-POS-Debug-v${{ steps.version.outputs.version }}
```

**Hasil:**
- ✅ Artifact name dengan version: `BK-POS-Debug-v1.0.6`
- ✅ Auto-incremented setiap push
- ✅ Mudah tracking version history

---

## 🔍 Check Current Version

### **Via Package.json:**
```bash
cat package.json | grep version
# "version": "1.0.6"
```

### **Via Node:**
```bash
node -p "require('./package.json').version"
# 1.0.6
```

### **Via Android:**
```bash
grep -E "versionCode|versionName" android/app/build.gradle
# versionCode 10006
# versionName "1.0.6"
```

### **Via Capacitor:**
```bash
head -n 5 capacitor.config.ts
# // Version: 1.0.6
```

---

## 💡 Tips

### **DO ✅:**
- Use `npm run build` untuk auto bump
- Commit version changes bersama code changes
- Tag major/minor releases: `git tag v1.1.0`

### **DON'T ❌:**
- Jangan edit versionCode manual di build.gradle (auto-calculated)
- Jangan lupa push package.json yang ter-update
- Jangan skip version numbers (akan confusing)

---

## 🆘 Troubleshooting

### **"Version tidak naik saat build"**
```bash
# Check script
cat package.json | grep '"build"'
# Harus: "build": "node bump-version.mjs && vite build"

# Atau jalankan manual
npm run version:bump
npm run build:no-bump
```

### **"Ingin reset version ke 1.0.0"**
```bash
# Edit package.json
"version": "1.0.0"

# Edit android/app/build.gradle
versionCode 10000
versionName "1.0.0"

# Commit
git commit -am "🔖 Reset version to 1.0.0"
```

### **"APK filename di GitHub Actions salah"**
```bash
# Pastikan workflow ambil version dari package.json
node -p "require('./package.json').version"

# Harus output version yang benar
```

---

## 📊 Version History Tracking

**Di Git:**
```bash
# Lihat version changes
git log --oneline --grep="Version bumped"

# Lihat semua tags
git tag -l

# Checkout version tertentu
git checkout v1.0.0
```

**Di GitHub Releases:**
- Create release untuk major/minor versions
- Attach APK files
- Add changelog

---

## ✨ Hasil Akhir

**Sekarang workflow Anda:**
```bash
# 1. Code changes
# 2. Build
npm run build
# ✅ Auto bump: 1.0.5 → 1.0.6

# 3. Commit & push
git add .
git commit -m "✨ New feature"
git push

# 4. GitHub Actions builds: BK-POS-Debug-v1.0.6.zip
# 5. Download & distribute
# 6. Repeat!
```

**Semua otomatis! No manual version editing needed!** 🎉

---

**Current Version:** `1.0.1`  
**Next Build Will Be:** `1.0.2`
