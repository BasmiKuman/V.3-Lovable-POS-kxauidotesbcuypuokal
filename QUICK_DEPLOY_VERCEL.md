# ⚡ Quick Deploy ke Vercel

## 🎯 Langkah Cepat (5 Menit)

### 1️⃣ Upload ke GitHub
```bash
# Jika belum ada git
git init
git add .
git commit -m "Initial commit with enhancements"

# Push ke GitHub
git remote add origin https://github.com/USERNAME/bk-pos.git
git push -u origin main
```

### 2️⃣ Deploy di Vercel
1. Buka [vercel.com](https://vercel.com) dan login
2. Klik **"Add New Project"**
3. **Import** repository BK-POS Anda
4. Vercel akan auto-detect settings dari `vercel.json` ✅
5. Klik **"Deploy"**
6. Tunggu ±2 menit... ☕
7. **Done!** 🎉

### 3️⃣ Environment Variables (PENTING!)
Setelah deploy pertama kali:
1. Buka **Project Settings** → **Environment Variables**
2. Tambahkan:
   ```
   Name: VITE_SUPABASE_URL
   Value: https://mlwvrqjsaomthfcsmoit.supabase.co
   
   Name: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd3ZycWpzYW9tdGhmY3Ntb2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTg1NTQsImV4cCI6MjA3NzEzNDU1NH0.QUrLOVZjro2gl1JFUivatjlwvfbYegcR5BVsoz6kzpc
   ```
3. Klik **"Save"**
4. **"Redeploy"** project

---

## ✅ Files Sudah Disiapkan
- ✅ `/vercel.json` - Konfigurasi deployment
- ✅ `/package.json` - Root package
- ✅ `/.vercelignore` - Ignore backend & docs
- ✅ `/frontend/vercel.json` - Frontend config

---

## 🎊 Selesai!
Aplikasi Anda live di:
```
https://your-project-name.vercel.app
```

---

## 🔧 Manual Settings (Jika Auto-detect Gagal)

Di Vercel Dashboard, set:
```
Framework: Vite
Root Directory: ./
Build Command: cd frontend && yarn build:no-bump
Output Directory: frontend/build
Install Command: cd frontend && yarn install
Node Version: 18.x
```

---

## 📱 Testing Checklist
Setelah deploy, test:
- [ ] Buka URL production
- [ ] Login dengan akun Supabase
- [ ] Toggle dark mode (sun/moon icon)
- [ ] Check responsive mobile
- [ ] Test navigation (bottom nav)
- [ ] Verify data load dari Supabase

---

## 🚨 Troubleshooting Cepat

**"Module not found" Error:**
```bash
# Di project lokal:
cd frontend
rm -rf node_modules yarn.lock
yarn install
git add . && git commit -m "Fix dependencies"
git push
```

**"Routes return 404":**
- Pastikan `vercel.json` ada di root
- Check rewrites config sudah benar

**"Build timeout":**
- Vercel free tier: 45 detik build time
- Upgrade jika perlu atau optimize bundle

---

**Need Help?** Check `VERCEL_DEPLOYMENT_GUIDE.md` untuk panduan lengkap.
