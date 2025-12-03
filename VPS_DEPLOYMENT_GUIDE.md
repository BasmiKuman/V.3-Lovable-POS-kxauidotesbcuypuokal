# 🚀 Panduan Deploy Aplikasi POS ke VPS CloudHost

Panduan lengkap untuk deploy aplikasi POS React + Python backend ke VPS CloudHost dengan Nginx, PM2, dan SSL.

---

## 📋 Prasyarat

### 1. VPS Requirements
- **OS**: Ubuntu 20.04 / 22.04 LTS
- **RAM**: Minimal 2GB (Rekomendasi 4GB)
- **Storage**: Minimal 20GB
- **Port**: 80 (HTTP), 443 (HTTPS), 5000 (Backend API)
- **Domain**: Sudah pointing ke IP VPS (contoh: `pos.yourdomain.com`)

### 2. Akun yang Dibutuhkan
- Akun Supabase (untuk database)
- Akun CloudHost VPS
- Domain name (opsional, bisa pakai IP)

---

## 🔧 BAGIAN 1: Setup VPS Awal

### 1.1 Login ke VPS
```bash
ssh root@YOUR_VPS_IP
# Atau pakai user non-root jika sudah dikonfigurasi
```

### 1.2 Update System
```bash
apt update && apt upgrade -y
```

### 1.3 Install Dependencies Dasar
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Python 3 dan pip
apt install -y python3 python3-pip python3-venv

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git

# Install PM2 (Process Manager)
npm install -g pm2

# Install Certbot untuk SSL (opsional)
apt install -y certbot python3-certbot-nginx
```

### 1.4 Verifikasi Instalasi
```bash
node -v    # Harus v18.x.x
npm -v     # Harus 9.x.x atau lebih
python3 -v # Harus 3.8+ 
nginx -v   # Harus 1.18+ atau lebih
pm2 -v     # Harus 5.x.x
```

---

## 📦 BAGIAN 2: Upload & Setup Aplikasi

### 2.1 Clone Repository ke VPS
```bash
# Buat direktori aplikasi
mkdir -p /var/www/pos-app
cd /var/www/pos-app

# Clone dari repository Anda
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Atau upload manual via SFTP/SCP
# scp -r /path/to/local/project root@YOUR_VPS_IP:/var/www/pos-app
```

### 2.2 Setup Frontend

#### 2.2.1 Konfigurasi Environment
```bash
cd /var/www/pos-app/frontend

# Buat file .env untuk production
nano .env
```

Isi file `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### 2.2.2 Install Dependencies & Build
```bash
npm install
npm run build
```

Hasil build akan ada di folder `build/` dengan struktur:
```
build/
├── index.html
├── assets/
│   ├── index-xxxx.css
│   └── index-xxxx.js
```

### 2.3 Setup Backend

#### 2.3.1 Buat Virtual Environment
```bash
cd /var/www/pos-app/backend

# Buat virtual environment
python3 -m venv venv

# Aktivasi venv
source venv/bin/activate
```

#### 2.3.2 Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### 2.3.3 Konfigurasi Environment Backend (Jika Ada)
```bash
# Jika backend butuh environment variables
nano .env
```

Contoh `.env` backend:
```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key-here
```

---

## 🔄 BAGIAN 3: Setup PM2 untuk Backend

### 3.1 Buat Konfigurasi PM2
```bash
cd /var/www/pos-app/backend
nano ecosystem.config.js
```

Isi file `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'pos-backend',
    script: 'server.py',
    interpreter: '/var/www/pos-app/backend/venv/bin/python',
    cwd: '/var/www/pos-app/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/pm2/pos-backend-error.log',
    out_file: '/var/log/pm2/pos-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### 3.2 Start Backend dengan PM2
```bash
# Buat folder log
mkdir -p /var/log/pm2

# Start aplikasi
pm2 start ecosystem.config.js

# Lihat status
pm2 status

# Lihat log real-time
pm2 logs pos-backend

# Setup PM2 auto-start saat reboot
pm2 startup
pm2 save
```

### 3.3 Perintah PM2 Berguna
```bash
pm2 restart pos-backend  # Restart aplikasi
pm2 stop pos-backend     # Stop aplikasi
pm2 delete pos-backend   # Hapus dari PM2
pm2 logs --lines 100     # Lihat 100 log terakhir
pm2 monit                # Monitor real-time
```

---

## 🌐 BAGIAN 4: Setup Nginx

### 4.1 Buat Konfigurasi Nginx
```bash
nano /etc/nginx/sites-available/pos-app
```

**OPSI A: Jika Pakai Domain** (`pos.yourdomain.com`):
```nginx
# Upstream untuk backend API
upstream backend_api {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name pos.yourdomain.com;
    
    # Redirect HTTP to HTTPS (setelah SSL setup)
    # return 301 https://$server_name$request_uri;
    
    # Root directory untuk frontend build
    root /var/www/pos-app/frontend/build;
    index index.html;
    
    # Logging
    access_log /var/log/nginx/pos-app-access.log;
    error_log /var/log/nginx/pos-app-error.log;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    # Frontend routes (React Router)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Backend API proxy
    location /api/ {
        proxy_pass http://backend_api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**OPSI B: Jika Pakai IP Langsung** (`http://123.456.789.012`):
```nginx
upstream backend_api {
    server 127.0.0.1:5000;
}

server {
    listen 80 default_server;
    server_name _;
    
    root /var/www/pos-app/frontend/build;
    index index.html;
    
    access_log /var/log/nginx/pos-app-access.log;
    error_log /var/log/nginx/pos-app-error.log;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /api/ {
        proxy_pass http://backend_api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 4.2 Aktifkan Konfigurasi
```bash
# Buat symbolic link
ln -s /etc/nginx/sites-available/pos-app /etc/nginx/sites-enabled/

# Hapus default config (opsional)
rm /etc/nginx/sites-enabled/default

# Test konfigurasi
nginx -t

# Jika OK, restart Nginx
systemctl restart nginx
```

### 4.3 Cek Status Nginx
```bash
systemctl status nginx

# Lihat log jika ada error
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/pos-app-error.log
```

---

## 🔒 BAGIAN 5: Setup SSL/HTTPS (Opsional tapi Direkomendasikan)

### 5.1 Install SSL dengan Certbot (Gratis dari Let's Encrypt)
```bash
# Pastikan domain sudah pointing ke IP VPS
# Cek dengan: dig pos.yourdomain.com

# Generate SSL certificate
certbot --nginx -d pos.yourdomain.com

# Ikuti prompt:
# - Email: your@email.com
# - Agree ToS: Yes
# - Redirect HTTP to HTTPS: Yes (Recommended)
```

### 5.2 Auto-Renewal SSL
```bash
# Certbot otomatis setup cron job untuk renewal
# Cek renewal timer
systemctl status certbot.timer

# Test renewal secara manual
certbot renew --dry-run
```

### 5.3 Hasil Konfigurasi Nginx Setelah SSL
Certbot akan otomatis update `/etc/nginx/sites-available/pos-app`:
```nginx
server {
    listen 80;
    server_name pos.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pos.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/pos.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pos.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # ... rest of config (sama seperti sebelumnya)
}
```

---

## 🔥 BAGIAN 6: Firewall Setup

### 6.1 Setup UFW (Uncomplicated Firewall)
```bash
# Install UFW (biasanya sudah ada)
apt install -y ufw

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (PENTING! Jangan sampai terkunci)
ufw allow 22/tcp

# Allow HTTP & HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Cek status
ufw status verbose
```

**PENTING**: Jangan tutup port 22 (SSH) atau Anda tidak bisa login lagi!

---

## 📝 BAGIAN 7: Deployment Workflow untuk Update

### 7.1 Script Update Otomatis
Buat file `/var/www/pos-app/deploy.sh`:
```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code from Git..."
git pull origin main

# Update Frontend
echo "🎨 Building frontend..."
cd /var/www/pos-app/frontend
npm install
npm run build

# Update Backend
echo "🐍 Updating backend..."
cd /var/www/pos-app/backend
source venv/bin/activate
pip install -r requirements.txt

# Restart Backend
echo "🔄 Restarting backend..."
pm2 restart pos-backend

# Reload Nginx
echo "🌐 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
```

Buat script executable:
```bash
chmod +x /var/www/pos-app/deploy.sh
```

### 7.2 Cara Update Aplikasi
```bash
cd /var/www/pos-app
./deploy.sh
```

### 7.3 Rollback Jika Ada Masalah
```bash
# Rollback git ke commit sebelumnya
cd /var/www/pos-app
git log --oneline  # Lihat commit history
git checkout <commit-hash>

# Rebuild
./deploy.sh
```

---

## 🐛 BAGIAN 8: Troubleshooting

### 8.1 Frontend Tidak Muncul (Blank Page)
```bash
# Cek Nginx error log
tail -f /var/log/nginx/error.log

# Cek apakah build folder ada
ls -la /var/www/pos-app/frontend/build

# Cek permission
chmod -R 755 /var/www/pos-app/frontend/build
chown -R www-data:www-data /var/www/pos-app/frontend/build

# Restart Nginx
systemctl restart nginx
```

### 8.2 Backend API Error 502 Bad Gateway
```bash
# Cek status PM2
pm2 status

# Cek log backend
pm2 logs pos-backend --lines 100

# Restart backend
pm2 restart pos-backend

# Cek apakah port 5000 terbuka
netstat -tulpn | grep 5000
```

### 8.3 Environment Variables Tidak Terbaca
```bash
# Frontend: Rebuild dengan .env yang benar
cd /var/www/pos-app/frontend
cat .env  # Pastikan VITE_SUPABASE_URL dan KEY ada
npm run build

# Backend: Cek PM2 ecosystem config
pm2 env pos-backend
```

### 8.4 Nginx 404 untuk React Routes
Pastikan `try_files $uri $uri/ /index.html;` ada di config Nginx untuk SPA routing.

### 8.5 SSL Certificate Error
```bash
# Renew manual
certbot renew --force-renewal

# Cek certificate
certbot certificates
```

---

## 📊 BAGIAN 9: Monitoring & Maintenance

### 9.1 Setup PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# Web dashboard (opsional)
pm2 plus
```

### 9.2 Log Rotation untuk Nginx
```bash
# Nginx log rotation otomatis di:
cat /etc/logrotate.d/nginx
```

### 9.3 Backup Script
Buat file `/var/www/pos-app/backup.sh`:
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/pos-app"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup code
tar -czf $BACKUP_DIR/code_$DATE.tar.gz /var/www/pos-app

# Keep only last 7 backups
ls -t $BACKUP_DIR/code_*.tar.gz | tail -n +8 | xargs rm -f

echo "✅ Backup completed: $BACKUP_DIR/code_$DATE.tar.gz"
```

Setup cron job untuk backup harian:
```bash
crontab -e

# Tambahkan:
0 2 * * * /var/www/pos-app/backup.sh
```

---

## ✅ BAGIAN 10: Checklist Akhir

Pastikan semua ini sudah beres:

- [ ] VPS sudah diupdate (`apt update && apt upgrade`)
- [ ] Node.js, Python, Nginx, PM2 sudah terinstall
- [ ] Repository sudah di-clone ke `/var/www/pos-app`
- [ ] Frontend `.env` sudah diisi dengan Supabase credentials
- [ ] Frontend sudah di-build (`npm run build`)
- [ ] Backend virtual environment sudah dibuat
- [ ] Backend dependencies sudah diinstall (`pip install -r requirements.txt`)
- [ ] PM2 sudah running backend (`pm2 status` menunjukkan online)
- [ ] Nginx config sudah dibuat dan diaktifkan
- [ ] Nginx test passed (`nginx -t`)
- [ ] Firewall (UFW) sudah dikonfigurasi dengan port 80, 443, 22
- [ ] SSL certificate sudah diinstall (jika pakai domain)
- [ ] Browser bisa buka aplikasi di `http://YOUR_IP` atau `https://pos.yourdomain.com`
- [ ] Login berfungsi dan bisa fetch data dari Supabase
- [ ] Backend API bisa diakses via `/api/` endpoint
- [ ] PM2 startup sudah dikonfigurasi (`pm2 startup`, `pm2 save`)

---

## 🎯 Quick Start Commands

**Deploy Pertama Kali:**
```bash
# 1. Clone & masuk folder
cd /var/www/pos-app

# 2. Setup Frontend
cd frontend
npm install
npm run build

# 3. Setup Backend
cd ../backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Start Backend
pm2 start ecosystem.config.js
pm2 save

# 5. Setup Nginx
sudo nano /etc/nginx/sites-available/pos-app
sudo ln -s /etc/nginx/sites-available/pos-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 6. Buka browser ke http://YOUR_VPS_IP
```

**Update Aplikasi:**
```bash
cd /var/www/pos-app
git pull
./deploy.sh
```

---

## 📞 Kontak & Support

Jika ada masalah:
1. Cek log Nginx: `tail -f /var/log/nginx/error.log`
2. Cek log Backend: `pm2 logs pos-backend`
3. Cek status service: `systemctl status nginx` dan `pm2 status`

---

**🎉 Selamat! Aplikasi POS Anda sekarang sudah live di VPS CloudHost!**

Akses via:
- **Dengan Domain**: https://pos.yourdomain.com
- **Dengan IP**: http://123.456.789.012

---

## 📚 Referensi Tambahan

- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Certbot Documentation](https://certbot.eff.org/)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)
