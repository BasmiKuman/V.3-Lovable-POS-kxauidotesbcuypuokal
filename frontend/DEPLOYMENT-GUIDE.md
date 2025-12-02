# Deploy BK POS ke bk-pos.lakujoo.com

## 🎯 Tujuan
Deploy aplikasi web ke domain `bk-pos.lakujoo.com` untuk handle:
- Reset password
- Email verification
- Authentication pages

## 📋 Pilihan Deployment

### Opsi 1: Vercel (RECOMMENDED - Paling Mudah) ⭐

1. **Install Vercel CLI** (atau gunakan website):
   ```bash
   npm i -g vercel
   ```

2. **Login ke Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   Ikuti wizard:
   - Set up and deploy? **Y**
   - Which scope? **Pilih akun Anda**
   - Link to existing project? **N**
   - What's your project's name? **bk-pos**
   - In which directory is your code located? **./** (tekan Enter)

4. **Set Environment Variables:**
   ```bash
   vercel env add VITE_APP_URL production
   ```
   Masukkan: `https://bk-pos.lakujoo.com`

5. **Deploy Production:**
   ```bash
   vercel --prod
   ```

6. **Setup Custom Domain:**
   - Buka Vercel Dashboard: https://vercel.com/dashboard
   - Pilih project **bk-pos**
   - Settings → Domains
   - Add Domain: `bk-pos.lakujoo.com`
   - Update DNS (lihat instruksi dari Vercel)

---

### Opsi 2: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Build:**
   ```bash
   npm run build
   ```

4. **Deploy:**
   ```bash
   netlify deploy --prod --dir=dist
   ```

5. **Setup Custom Domain:**
   - Buka Netlify Dashboard
   - Domain Settings → Add custom domain
   - Masukkan: `bk-pos.lakujoo.com`
   - Update DNS sesuai instruksi

---

### Opsi 3: GitHub Pages (Gratis)

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json:**
   ```json
   {
     "homepage": "https://bk-pos.lakujoo.com",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist -u 'github-actions[bot] <github-actions[bot]@users.noreply.github.com>'"
     }
   }
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

4. **Setup Custom Domain:**
   - Repo Settings → Pages
   - Custom domain: `bk-pos.lakujoo.com`
   - Update DNS dengan CNAME record

---

### Opsi 4: Manual (VPS/Shared Hosting)

Jika Anda punya hosting sendiri di lakujoo.com:

1. **Build:**
   ```bash
   npm run build
   ```

2. **Upload folder `dist/` ke server:**
   - Via FTP/SFTP
   - Upload ke folder web root: `/public_html/bk-pos/`

3. **Configure Nginx/Apache:**
   
   **Nginx:**
   ```nginx
   server {
       listen 80;
       server_name bk-pos.lakujoo.com;
       root /var/www/bk-pos;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```
   
   **Apache (.htaccess):**
   ```apache
   <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /index.html [L]
   </IfModule>
   ```

---

## 🔧 Setelah Deploy

### 1. Update Supabase Settings:

Login ke Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://bk-pos.lakujoo.com
```

**Redirect URLs (Allow List):**
```
https://bk-pos.lakujoo.com/auth
https://bk-pos.lakujoo.com/email-verified
```

### 2. Update DNS Settings:

Di registrar domain Anda (lakujoo.com), tambahkan:

**Untuk Vercel/Netlify:**
- Type: **CNAME**
- Name: **bk-pos**
- Value: **[sesuai instruksi platform]**

**Untuk VPS:**
- Type: **A Record**
- Name: **bk-pos**
- Value: **[IP server Anda]**

### 3. Test:

1. Buka browser: `https://bk-pos.lakujoo.com`
2. Harusnya muncul halaman login BK POS
3. Test reset password - email harusnya link ke `https://bk-pos.lakujoo.com/auth`

---

## 📱 Android APK

APK tetap berfungsi normal, tapi reset password akan redirect ke web:
- User klik link di email
- Browser buka: `https://bk-pos.lakujoo.com/auth`
- User reset password
- Setelah reset, bisa login di APK dengan password baru

---

## 🚀 Recommended: Vercel

Kenapa Vercel paling mudah:
- ✅ Auto build on git push
- ✅ Free SSL certificate
- ✅ Custom domain support
- ✅ Fast CDN global
- ✅ Zero config untuk Vite
- ✅ Environment variables support

---

## 💡 Quick Start (Vercel):

```bash
# 1. Install Vercel
npm i -g vercel

# 2. Deploy
vercel

# 3. Set production domain
vercel --prod

# 4. Add custom domain via dashboard
# → vercel.com/dashboard → Settings → Domains → Add bk-pos.lakujoo.com
```

---

Mau saya bantu setup yang mana? 😊
