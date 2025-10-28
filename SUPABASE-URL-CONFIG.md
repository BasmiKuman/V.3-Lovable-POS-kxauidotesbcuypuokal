# Konfigurasi URL Supabase untuk Reset Password

## ❌ Masalah
Email reset password mengarah ke `localhost:3000` bukan ke aplikasi yang sebenarnya.

## ✅ Solusi

### 1️⃣ **Setting di Supabase Dashboard (WAJIB)**

1. **Login ke Supabase Dashboard:**
   - Buka: https://supabase.com/dashboard
   - Login dengan akun Anda

2. **Pilih Project:**
   - Pilih project: `mlwvrqjsaomthfcsmoit`

3. **Authentication Settings:**
   - Klik **Authentication** di sidebar kiri
   - Klik **URL Configuration**

4. **Set Site URL:**
   
   Untuk **Production** (jika sudah deploy):
   ```
   Site URL: https://your-domain.com
   ```
   
   Untuk **Development** (testing lokal):
   ```
   Site URL: http://localhost:8081
   ```

5. **Set Redirect URLs (Allow List):**
   
   Tambahkan URL berikut (pisahkan dengan Enter):
   ```
   http://localhost:8081/auth
   http://localhost:8081/email-verified
   https://your-domain.com/auth
   https://your-domain.com/email-verified
   ```
   
   Ganti `your-domain.com` dengan domain production Anda.

6. **Klik Save** ✅

---

### 2️⃣ **Set Environment Variable di Aplikasi**

Aplikasi sudah dikonfigurasi untuk menggunakan environment variable.

#### File `.env` (untuk development):
```env
VITE_APP_URL=http://localhost:8081
```

#### Untuk Production:
Ubah `.env` menjadi:
```env
VITE_APP_URL=https://your-production-domain.com
```

---

### 3️⃣ **Untuk Android APK (Deep Link)**

Jika aplikasi Anda 100% Android APK tanpa web version, gunakan **Custom URL Scheme**:

1. **Update `.env`:**
   ```env
   VITE_APP_URL=com.basmikuman.pos://
   ```

2. **Update Supabase Redirect URLs:**
   Tambahkan di Supabase Dashboard:
   ```
   com.basmikuman.pos://auth
   com.basmikuman.pos://email-verified
   ```

3. **Configure Deep Link di Android** (capacitor.config.ts sudah OK)

---

## 🧪 Testing

### Test Reset Password:
1. Klik "Lupa Password" di halaman login
2. Masukkan email
3. Cek inbox email
4. Link di email harus mengarah ke:
   - Development: `http://localhost:8081/auth`
   - Production: `https://your-domain.com/auth`
   
   ✅ Bukan `localhost:3000`!

### Test Sign Up:
1. Daftar dengan email baru
2. Cek inbox untuk verifikasi
3. Link harus mengarah ke:
   - Development: `http://localhost:8081/email-verified`
   - Production: `https://your-domain.com/email-verified`

---

## 📝 Catatan

- **Perubahan di Supabase Dashboard langsung aktif** (tidak perlu build ulang)
- **Perubahan `.env` perlu restart dev server atau rebuild**
- Jika masih redirect ke `localhost:3000`, **clear browser cache** atau test di incognito mode

---

## 🔗 Referensi

- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth/auth-email#configure-email-settings)
- [Capacitor Deep Links](https://capacitorjs.com/docs/guides/deep-links)
