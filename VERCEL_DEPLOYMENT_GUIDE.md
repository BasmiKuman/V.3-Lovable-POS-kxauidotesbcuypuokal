# 🚀 Panduan Deploy BK-POS ke Vercel

## 📋 Prerequisites
- Akun Vercel (gratis di vercel.com)
- Repository Git (GitHub, GitLab, atau Bitbucket)
- Supabase project sudah setup

---

## 🔧 Konfigurasi Project

### 1. File Konfigurasi yang Sudah Disiapkan

✅ **Root Level:**
- `/vercel.json` - Konfigurasi utama Vercel
- `/package.json` - Package untuk root workspace
- `/.vercelignore` - File yang diabaikan saat deploy

✅ **Frontend Level:**
- `/frontend/vercel.json` - Konfigurasi frontend spesifik
- `/frontend/package.json` - Dependencies frontend

---

## 🚀 Cara Deploy

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Login ke Vercel**
   - Buka [vercel.com](https://vercel.com)
   - Login dengan akun GitHub/GitLab/Bitbucket

2. **Import Project**
   - Klik "Add New..." → "Project"
   - Pilih repository BK-POS Anda
   - Klik "Import"

3. **Configure Project**
   ```
   Framework Preset: Vite
   Root Directory: ./  (biarkan kosong atau pilih root)
   Build Command: cd frontend && yarn build:no-bump
   Output Directory: frontend/build
   Install Command: cd frontend && yarn install
   ```

4. **Environment Variables**
   Tambahkan variable berikut di Vercel Dashboard:
   ```
   VITE_SUPABASE_URL=https://mlwvrqjsaomthfcsmoit.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. **Deploy**
   - Klik "Deploy"
   - Tunggu proses build selesai (±2-3 menit)
   - Aplikasi siap di `your-project.vercel.app`

---

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy dari Root Directory**
   ```bash
   cd /path/to/bk-pos
   vercel
   ```

4. **Follow Prompts:**
   ```
   ? Set up and deploy "~/bk-pos"? [Y/n] y
   ? Which scope? Your Name
   ? Link to existing project? [y/N] n
   ? What's your project's name? bk-pos
   ? In which directory is your code located? ./
   ```

5. **Production Deploy**
   ```bash
   vercel --prod
   ```

---

## 🔐 Environment Variables

### Required Variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Optional (jika pakai backend sendiri):
```env
VITE_API_URL=https://your-backend-url.com
```

**Cara Set di Vercel:**
1. Buka Project Settings
2. Pilih tab "Environment Variables"
3. Tambah variable satu per satu
4. Pilih environment: Production, Preview, Development
5. Save dan Redeploy

---

## 📁 Struktur Project untuk Vercel

```
/app/
├── vercel.json          ← Konfigurasi deployment
├── package.json         ← Root package untuk workspace
├── .vercelignore        ← File yang diabaikan
├── frontend/            ← Source code yang akan di-deploy
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
└── backend/             ← Tidak di-deploy (diabaikan)
```

---

## ⚙️ Build Settings di Vercel Dashboard

Jika setup otomatis gagal, set manual:

```
Framework Preset: Vite
Root Directory: Leave empty (or select /)
Build Command: cd frontend && yarn build:no-bump
Output Directory: frontend/build
Install Command: cd frontend && yarn install
Node.js Version: 18.x (recommended)
```

---

## 🔍 Troubleshooting

### Error: "Could not read package.json"
**Solusi:**
- Pastikan file `/app/package.json` ada di root
- Check vercel.json sudah benar
- Coba hapus cache: Vercel Dashboard → Settings → Clear Cache

### Error: "Build failed"
**Solusi:**
1. Check build logs di Vercel Dashboard
2. Pastikan environment variables sudah diset
3. Test build locally:
   ```bash
   cd /app/frontend
   yarn build:no-bump
   ```

### Error: "Module not found"
**Solusi:**
- Hapus `node_modules` dan reinstall:
  ```bash
  cd frontend
  rm -rf node_modules
  yarn install
  ```

### Error: "Routes not working (404)"
**Solusi:**
- Pastikan `vercel.json` memiliki rewrites config:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```

### Build Timeout
**Solusi:**
- Use `yarn` instead of `npm` (lebih cepat)
- Upgrade Vercel plan jika project besar
- Optimize dependencies

---

## 🎯 Post-Deployment

### 1. Test Aplikasi
- [ ] Login berfungsi
- [ ] Dashboard load dengan benar
- [ ] Dark mode toggle works
- [ ] Navigation smooth
- [ ] Data dari Supabase tampil

### 2. Custom Domain (Optional)
1. Buka Project Settings → Domains
2. Tambah domain custom Anda
3. Update DNS records sesuai instruksi
4. Wait for propagation (~24 jam)

### 3. Analytics & Monitoring
- Enable Vercel Analytics di Project Settings
- Monitor performance dan errors
- Setup alerts untuk downtime

---

## 📊 Performance Tips

1. **Enable Compression**
   - Vercel automatically compresses assets
   - Gzip dan Brotli enabled by default

2. **Caching**
   - Static assets cached automatically
   - Set cache headers jika perlu custom

3. **Image Optimization**
   - Use Vercel Image Optimization
   - Optimize images before upload

4. **Bundle Size**
   - Keep bundle size < 500KB
   - Use code splitting
   - Tree shaking enabled di Vite

---

## 🔄 Auto-Deploy (CI/CD)

Vercel automatically deploy ketika:
- Push ke branch `main` → Production deploy
- Push ke branch lain → Preview deploy
- Pull Request created → Preview deploy

**Disable Auto-Deploy:**
- Project Settings → Git → Deploy Hooks
- Toggle off "Production Branch"

---

## 📝 Checklist Deploy

- [ ] vercel.json configured
- [ ] package.json di root exists
- [ ] Environment variables set
- [ ] Git repository connected
- [ ] Build berhasil locally
- [ ] Supabase credentials correct
- [ ] .vercelignore includes backend/
- [ ] Test production URL
- [ ] Custom domain setup (optional)
- [ ] Analytics enabled

---

## 🆘 Support

Jika ada masalah:
1. Check [Vercel Docs](https://vercel.com/docs)
2. Review build logs di dashboard
3. Check Vercel Status: [status.vercel.com](https://status.vercel.com)
4. Community: [Vercel Discord](https://vercel.com/discord)

---

## 🎉 Success!

Aplikasi BK-POS Anda sekarang live di Vercel! 🚀

**Production URL:**
```
https://your-project.vercel.app
```

**Custom Domain (jika sudah setup):**
```
https://your-custom-domain.com
```

---

**Happy Deploying! 🎊**

*Last Updated: 2025-01-02*
