# 🚀 Quick Deploy ke bk-pos.lakujoo.com

## Pilihan Tercepat: Vercel (5 Menit)

### 1️⃣ Sign Up / Login Vercel
- Buka: https://vercel.com/signup
- Sign up dengan GitHub account Anda

### 2️⃣ Import Project dari GitHub
1. Klik **"Add New..."** → **"Project"**
2. Pilih repository: **V.3-Lovable-POS-kxauidotesbcuypuokal**
3. Klik **Import**

### 3️⃣ Configure Project
**Framework Preset:** Vite (auto-detect)

**Build Settings:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Environment Variables:** (Klik "Add")
```
VITE_APP_URL = https://bk-pos.lakujoo.com
VITE_SUPABASE_URL = https://mlwvrqjsaomthfcsmoit.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd3ZycWpzYW9tdGhmY3Ntb2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTg1NTQsImV4cCI6MjA3NzEzNDU1NH0.QUrLOVZjro2gl1JFUivatjlwvfbYegcR5BVsoz6kzpc
```

### 4️⃣ Deploy
Klik **Deploy** → Tunggu ~2 menit

### 5️⃣ Add Custom Domain
1. Setelah deploy selesai, buka **Settings** → **Domains**
2. Ketik: `bk-pos.lakujoo.com`
3. Klik **Add**
4. Vercel akan kasih instruksi DNS:
   
   **Tambahkan di DNS lakujoo.com:**
   ```
   Type: CNAME
   Name: bk-pos
   Value: cname.vercel-dns.com
   ```

### 6️⃣ Update DNS
1. Login ke control panel domain lakujoo.com
2. Cari **DNS Settings** atau **DNS Management**
3. Tambah CNAME record seperti di atas
4. Save

⏱️ **Tunggu propagasi DNS: 5-60 menit**

### 7️⃣ Update Supabase
1. Login: https://supabase.com/dashboard
2. Pilih project: `mlwvrqjsaomthfcsmoit`
3. **Authentication** → **URL Configuration**
4. Set:
   ```
   Site URL: https://bk-pos.lakujoo.com
   ```
5. **Redirect URLs:**
   ```
   https://bk-pos.lakujoo.com/auth
   https://bk-pos.lakujoo.com/email-verified
   ```
6. **Save**

---

## ✅ Test

1. Buka browser: `https://bk-pos.lakujoo.com`
2. Harusnya muncul halaman login BK POS
3. Test reset password:
   - Klik "Lupa Password"
   - Masukkan email
   - Cek inbox
   - Link harusnya: `https://bk-pos.lakujoo.com/auth` ✅

---

## 🔄 Auto Deploy

Setelah setup:
- Setiap git push ke `main` → Vercel auto build & deploy
- APK tetap build via GitHub Actions
- Web version selalu up-to-date

---

## 🆘 Troubleshooting

**Domain tidak bisa diakses?**
- Cek DNS dengan: `nslookup bk-pos.lakujoo.com`
- Tunggu propagasi DNS (bisa sampai 24 jam)

**Build failed?**
- Cek Environment Variables sudah diisi
- Cek build log di Vercel dashboard

**Reset password masih ke localhost?**
- Cek VITE_APP_URL di Environment Variables
- Redeploy project di Vercel

---

Butuh bantuan? Tanya saja! 😊
