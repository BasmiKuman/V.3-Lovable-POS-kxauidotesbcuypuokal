# 🚀 Railway Deployment Guide

Panduan deploy aplikasi POS ke Railway dengan GitHub auto-deploy.

---

## 📋 Prasyarat

- Akun GitHub (repository sudah push)
- Akun Railway.app (gratis, $5 credit/bulan)
- Akun Supabase (untuk database)

---

## 🎯 CARA 1: Deploy via Railway Dashboard (Termudah!)

### Step 1: Login ke Railway
1. Buka https://railway.app
2. Klik **Login with GitHub**
3. Authorize Railway

### Step 2: Create New Project
1. Klik **New Project**
2. Pilih **Deploy from GitHub repo**
3. Pilih repository: `BasmiKuman/V.3-Lovable-POS-kxauidotesbcuypuokal`
4. Railway akan otomatis detect dan deploy

### Step 3: Set Environment Variables
1. Klik project yang baru dibuat
2. Klik tab **Variables**
3. Klik **Raw Editor**
4. Copy-paste ini (ganti dengan nilai asli Anda):

```env
VITE_SUPABASE_URL=https://xxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxx
```

5. Klik **Add** atau **Update Variables**
6. Railway akan otomatis **redeploy** dengan env variables baru

### Step 4: Verify Deployment
1. Klik tab **Deployments** untuk lihat progress
2. Tunggu sampai status **SUCCESS** (2-5 menit)
3. Klik **View Logs** jika ada error
4. Setelah sukses, klik tab **Settings** → **Generate Domain**
5. Buka URL yang digenerate (contoh: `your-app.up.railway.app`)

### Step 5: Test Aplikasi
1. Buka URL Railway Anda
2. Coba login dengan akun yang ada di Supabase
3. Cek apakah data ter-load dari Supabase

✅ **SELESAI!** Setiap kali Anda `git push`, Railway otomatis deploy ulang.

---

## 🛠️ CARA 2: Deploy via Railway CLI

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login
```bash
railway login
```

### Step 3: Initialize Project
```bash
cd /path/to/V.3-Lovable-POS-kxauidotesbcuypuokal/frontend
railway init
```

Pilih:
- **Create new project** atau link ke existing project

### Step 4: Set Environment Variables
```bash
# Set satu per satu
railway variables set VITE_SUPABASE_URL=https://xxxxxxx.supabase.co
railway variables set VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx
```

Atau dari file `.env`:
```bash
# Buat file .env dulu di folder frontend/
railway variables set --from-file .env
```

### Step 5: Deploy
```bash
railway up
```

### Step 6: Get Domain
```bash
railway domain
```

---

## 🔍 Troubleshooting

### Error: "Supabase environment variables missing"

**Penyebab**: Environment variables belum di-set atau belum ter-apply setelah build.

**Solusi**:
1. Pastikan variables sudah di-set di Railway dashboard
2. Trigger manual redeploy:
   - Dashboard → Deployments → klik tiga titik → **Redeploy**
3. Atau push commit kosong:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push origin main
   ```

### Error: Build Failed

**Cek logs**:
```bash
railway logs
```

Atau via dashboard: **Deployments** → klik deployment → **View Logs**

**Common issues**:
- Node.js version mismatch → Tambahkan di `package.json`:
  ```json
  "engines": {
    "node": "18.x"
  }
  ```
- Build command salah → Railway default pakai `npm run build`

### Environment Variables Tidak Terbaca di Browser

**PENTING**: Vite environment variables harus:
1. Diawali dengan `VITE_` (sudah benar ✅)
2. Di-set **sebelum** build (Railway sudah otomatis ✅)
3. Diakses dengan `import.meta.env.VITE_*` (sudah benar ✅)

**Cek di browser console**:
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL)
```

Jika masih `undefined`, berarti build tidak pakai env vars. Trigger redeploy!

### Deploy Terlalu Lama

Railway biasanya deploy dalam 2-5 menit. Jika lebih dari 10 menit:
1. Cek **Logs** untuk error
2. Restart deployment dari dashboard
3. Cek RAM usage (free tier limited)

### Error: "_jsxDEV is not a function" atau "Uncaught TypeError: _jsxDEV is not a function"

**Penyebab**: React JSX runtime tidak ter-configure dengan benar saat build di Railway.

**Solusi**: ✅ Sudah diperbaiki di commit terbaru!

File yang sudah ditambahkan:
- `frontend/railway.json` - Konfigurasi build Railway
- `frontend/vite.config.ts` - Tambahan `jsxRuntime: 'automatic'`

**Jika masih error**:
1. Pastikan code terbaru sudah push ke GitHub
2. Railway akan auto-redeploy
3. Cek di deployment logs: **Deployments** → **View Logs**
4. Pastikan build command: `npm install && npm run build`

**Manual fix** (jika diperlukan):
```bash
# Di Railway dashboard → Settings → Build Command
npm install && npm run build

# Start Command  
npx serve -s build -l $PORT
```

### Error: "Fetch event handler is recognized as no-op"

**Penyebab**: Service worker warning (bukan error kritis).

**Solusi**: 
- Ini hanya warning, tidak mempengaruhi fungsionalitas
- Untuk hilangkan, hapus/disable service worker di `src/main.tsx`
- Atau abaikan saja, aplikasi tetap jalan normal ✅

---

## 📝 Konfigurasi Railway (Optional)

### railway.json
Buat file `railway.json` di root project untuk konfigurasi custom:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd frontend && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "cd frontend && npx serve -s build -l 3000",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### nixpacks.toml
Atau pakai Nixpacks config di `frontend/nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npx serve -s build -p $PORT"
```

---

## 🔄 Auto-Deploy dari GitHub

Railway sudah otomatis setup webhook. Setiap kali push ke branch `main`:
1. Railway detect perubahan
2. Trigger build baru
3. Deploy otomatis
4. Zero downtime deployment

**Cek auto-deploy settings**:
- Dashboard → Project → **Settings** → **GitHub**
- Pastikan checkbox **Auto-deploy** aktif ✅
- Branch: `main`

---

## 🌐 Custom Domain (Optional)

### Pakai Domain Sendiri

1. Buka Railway dashboard → **Settings** → **Domains**
2. Klik **Custom Domain**
3. Masukkan domain Anda (contoh: `pos.yourdomain.com`)
4. Railway akan kasih CNAME record:
   ```
   CNAME pos.yourdomain.com → your-app.up.railway.app
   ```
5. Tambahkan CNAME di DNS provider Anda (Cloudflare, Niagahoster, dll)
6. Tunggu DNS propagation (5-60 menit)
7. SSL otomatis di-provision oleh Railway ✅

---

## 💰 Pricing & Limits

### Free Tier
- **$5 credit per bulan** (cukup untuk 1 app kecil-menengah)
- Unlimited deployments
- Shared CPU & RAM
- 512MB RAM per service
- Sleep after 5 menit idle (app bisa jadi slow di first request)

### Hobby Plan ($5/month)
- $5 + usage-based billing
- No sleeping
- Priority support
- Custom domains unlimited

**Estimasi untuk POS app**:
- Static frontend (React build): ~$0-2/bulan (served by Railway)
- Backend Python (jika ada): ~$3-5/bulan
- **Total**: ~$5-7/bulan (masih dalam budget!)

---

## 📊 Monitoring

### Via Dashboard
- **Metrics**: CPU, RAM, Network usage
- **Logs**: Real-time streaming
- **Deployments**: History & rollback

### Via CLI
```bash
# Stream logs
railway logs -f

# Check status
railway status

# Check variables
railway variables
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` file**
   - Sudah ada di `.gitignore` ✅

2. **Rotate API keys regularly**
   - Ganti Supabase keys setiap 3-6 bulan

3. **Use service role key only in backend**
   - Frontend pakai `anon` key only ✅

4. **Enable Railway 2FA**
   - Settings → Security → Two-Factor Authentication

---

## 🎯 Checklist Deployment

- [ ] Repository sudah push ke GitHub
- [ ] Railway project sudah dibuat
- [ ] Environment variables sudah di-set:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Deployment status: **SUCCESS**
- [ ] Domain sudah di-generate
- [ ] Aplikasi bisa dibuka di browser
- [ ] Login berfungsi
- [ ] Data ter-load dari Supabase
- [ ] Auto-deploy aktif (push ke main otomatis deploy)

---

## 📞 Support

**Railway Discord**: https://discord.gg/railway
**Railway Docs**: https://docs.railway.app
**Status Page**: https://status.railway.app

---

## 🆚 Railway vs Vercel vs VPS

| Feature | Railway | Vercel | VPS Manual |
|---------|---------|--------|------------|
| **Harga** | $5/bulan | Gratis (Hobby) | ~100rb/bulan |
| **Auto-deploy** | ✅ | ✅ | ❌ Manual git pull |
| **Setup** | 5 menit | 3 menit | 1-2 jam |
| **Database** | ✅ (PostgreSQL gratis) | ❌ | Setup manual |
| **Logs** | ✅ Real-time | ✅ | SSH manual |
| **SSL** | ✅ Auto | ✅ Auto | Certbot manual |
| **Rollback** | ✅ 1-click | ✅ 1-click | Git revert manual |
| **Monitoring** | ✅ Built-in | ✅ Built-in | Setup Grafana |

**Rekomendasi**:
- **Prototyping/MVP**: Vercel (gratis, fastest setup)
- **Production < 1000 users**: Railway (balance price/features)
- **Production > 1000 users**: VPS (lebih murah per user, full control)

---

## 🎉 Selesai!

Aplikasi POS Anda sekarang live di Railway:
- **URL**: https://your-app.up.railway.app
- **Auto-deploy**: Setiap `git push origin main`
- **Zero downtime**: Railway handle dengan graceful shutdown

**Happy deploying!** 🚀
