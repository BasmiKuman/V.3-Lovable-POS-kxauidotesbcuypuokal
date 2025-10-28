# 🎯 Panduan Konfigurasi Supabase Dashboard - Step by Step

## ⚠️ PENTING: Ikuti langkah ini dengan teliti!

---

## 📋 STEP 1: LOGIN KE SUPABASE DASHBOARD

1. Buka browser
2. Kunjungi: https://supabase.com/dashboard
3. Login dengan akun Supabase Anda
4. Pilih project: **mlwvrqjsaomthfcsmoit**

---

## 🔧 STEP 2: UPDATE SITE URL

### Navigasi:
```
Dashboard → Settings (⚙️) → Authentication
```

### Cari Section: "Site URL"

### Isi dengan:
**Development:**
```
http://localhost:8080
```

**Production (nanti setelah deploy):**
```
https://your-domain.com
```

### Screenshot Location:
Settings → Authentication → scroll ke bawah → cari "Site URL"

### ✅ Klik "Save" setelah mengubah

---

## 🔗 STEP 3: TAMBAHKAN REDIRECT URLs

### Navigasi:
```
Dashboard → Settings (⚙️) → Authentication
```

### Cari Section: "Redirect URLs"

### Klik tombol "Add URL" dan tambahkan satu per satu:

**URL 1:**
```
http://localhost:8080/email-verified
```

**URL 2:**
```
http://localhost:8080/**
```

**URL 3 (untuk production nanti):**
```
https://your-domain.com/email-verified
```

**URL 4 (untuk production nanti):**
```
https://your-domain.com/**
```

### Tips:
- Wildcards (`**`) penting untuk handle semua routes
- Jangan lupa slash (`/`) di akhir jika diperlukan
- Case sensitive - pastikan lowercase semua

### ✅ Klik "Save" setelah menambahkan semua URL

---

## 📧 STEP 4: UPDATE EMAIL TEMPLATE

### Navigasi:
```
Dashboard → Authentication → Email Templates
```

### Pilih: "Confirm signup"

### Ganti template dengan ini:

```html
<h2>Konfirmasi Email Anda</h2>

<p>Halo,</p>

<p>Terima kasih telah mendaftar di <strong>POS System</strong>! 
Silakan klik tombol di bawah untuk memverifikasi email Anda:</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}" 
     style="background-color: #4F46E5; 
            color: white; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block;
            font-weight: bold;
            font-size: 16px;">
    ✓ Verifikasi Email Saya
  </a>
</p>

<p>Atau copy dan paste link berikut ke browser Anda:</p>
<p style="word-break: break-all; 
          color: #666; 
          background-color: #f5f5f5; 
          padding: 10px; 
          border-radius: 4px;
          font-size: 12px;">
  <a href="{{ .ConfirmationURL }}" style="color: #4F46E5;">
    {{ .ConfirmationURL }}
  </a>
</p>

<hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

<p style="color: #666; font-size: 14px;">
  ⏰ <strong>Link ini akan kadaluarsa dalam 24 jam.</strong>
</p>

<p style="color: #666; font-size: 14px;">
  🔒 Jika Anda tidak mendaftar untuk akun ini, 
  abaikan email ini dan tidak ada perubahan yang akan terjadi.
</p>

<p style="margin-top: 30px; color: #333;">
  Terima kasih,<br>
  <strong>Tim POS System</strong>
</p>

<p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
  Email ini dikirim secara otomatis, mohon tidak membalas email ini.
</p>
```

### ⚠️ JANGAN HAPUS:
- `{{ .ConfirmationURL }}` - ini adalah variable Supabase untuk link verifikasi
- Pastikan variable ini ada minimal 2 kali (di button dan di plain text link)

### Preview:
Klik tombol "Send test email" untuk lihat hasilnya

### ✅ Klik "Save" setelah selesai edit

---

## 🧪 STEP 5: TEST KONFIGURASI

### Test Flow:

1. **Jalankan aplikasi:**
   ```bash
   npm run dev
   ```

2. **Buka browser:**
   ```
   http://localhost:8080/auth
   ```

3. **Daftar user baru:**
   - Klik tab "Daftar"
   - Isi:
     - Nama: Test User
     - Email: test@example.com (ganti dengan email valid Anda)
     - Password: testpassword123
     - No. Telepon: 08123456789
   - Klik "Daftar"

4. **Cek email:**
   - Buka inbox email yang Anda gunakan
   - Cari email dari Supabase
   - Subject: "Confirm Your Email" atau sejenisnya

5. **Klik link verifikasi:**
   - Klik tombol "✓ Verifikasi Email Saya"
   - ATAU klik link text di bawahnya

6. **Verifikasi hasil:**
   - Browser harus redirect ke: `http://localhost:8080/email-verified`
   - Anda harus melihat:
     - ✓ Icon centang hijau
     - Teks: "Verifikasi Berhasil! 🎉"
     - Pesan: "Email Anda telah berhasil diverifikasi!"
     - Tombol: "Login Sekarang"

7. **Login:**
   - Klik tombol "Login Sekarang"
   - Redirect ke `/auth`
   - Login dengan email dan password yang tadi didaftarkan
   - Berhasil masuk ke dashboard/POS

### ✅ Jika semua step berhasil, konfigurasi sudah benar!

---

## ❌ Troubleshooting

### Problem: Masih redirect ke error page Supabase

**Kemungkinan Penyebab:**
1. Site URL belum disave
2. Redirect URLs belum ditambahkan
3. Browser cache belum dihapus

**Solusi:**
1. Cek ulang STEP 2 dan STEP 3
2. Pastikan tombol "Save" sudah diklik
3. Clear browser cache: `Ctrl + Shift + Del`
4. Test di incognito/private window
5. Tunggu 1-2 menit untuk perubahan propagate

### Problem: Email tidak masuk

**Kemungkinan Penyebab:**
1. Email masuk spam
2. Email provider block
3. Template tidak aktif

**Solusi:**
1. Cek folder Spam/Junk
2. Tambahkan noreply@mail.supabase.io ke contact
3. Test dengan email provider lain (Gmail, Outlook)
4. Cek Supabase logs: Dashboard → Logs → Auth

### Problem: Link di email tidak bisa diklik

**Kemungkinan Penyebab:**
1. Template HTML rusak
2. `{{ .ConfirmationURL }}` terhapus

**Solusi:**
1. Copy ulang template dari STEP 4
2. Pastikan `{{ .ConfirmationURL }}` ada
3. Test dengan "Send test email"

### Problem: Halaman /email-verified blank/loading terus

**Kemungkinan Penyebab:**
1. JavaScript error
2. Token tidak valid
3. Hash parameters hilang

**Solusi:**
1. Buka browser console (F12)
2. Lihat error message
3. Cek network tab untuk failed requests
4. Pastikan URL punya hash: `#access_token=...`

---

## 🔄 STEP 6: UNTUK PRODUCTION

### Saat Deploy ke Production:

1. **Update Site URL:**
   ```
   https://your-domain.com
   ```

2. **Update Redirect URLs:**
   ```
   https://your-domain.com/email-verified
   https://your-domain.com/**
   ```

3. **Hapus localhost URLs** (optional, untuk keamanan)

4. **Test ulang** dengan daftar user baru di production

---

## 📊 Monitoring

### Setelah deploy, monitor:

1. **Email Delivery:**
   - Dashboard → Logs → Auth
   - Cek berapa email terkirim
   - Cek ada email yang bounce/fail

2. **Verification Rate:**
   - Berapa % user yang klik link verifikasi
   - Average time to verify

3. **User Feedback:**
   - Ada komplain tentang email tidak masuk?
   - Ada user yang stuck di verifikasi?

---

## 🎯 Checklist Lengkap

Gunakan checklist ini untuk memastikan semua sudah benar:

### Konfigurasi Supabase:
- [ ] Site URL diupdate ke `http://localhost:8080`
- [ ] Redirect URL 1: `http://localhost:8080/email-verified` ✓
- [ ] Redirect URL 2: `http://localhost:8080/**` ✓
- [ ] Email template "Confirm signup" diupdate
- [ ] `{{ .ConfirmationURL }}` ada di template
- [ ] Semua perubahan di-Save

### Testing:
- [ ] Dev server running (`npm run dev`)
- [ ] Bisa akses http://localhost:8080
- [ ] Daftar user baru berhasil
- [ ] Email verifikasi masuk inbox
- [ ] Klik link redirect ke `/email-verified`
- [ ] Tampilan success page muncul
- [ ] Tombol "Login Sekarang" bekerja
- [ ] Bisa login dengan akun baru

### Production (nanti):
- [ ] Site URL production diupdate
- [ ] Redirect URLs production ditambahkan
- [ ] Test di production environment
- [ ] Monitor email delivery rate

---

## 🆘 Butuh Bantuan?

Jika masih ada masalah setelah mengikuti panduan ini:

1. Cek console browser (F12) untuk error
2. Cek Supabase logs untuk error backend
3. Screenshot error dan share
4. Pastikan semua step diikuti dengan benar

---

## ✅ Selesai!

Setelah semua step selesai, user yang mendaftar akan:
1. ✅ Menerima email verifikasi yang cantik
2. ✅ Klik link dan melihat halaman sukses (bukan error!)
3. ✅ Login dengan lancar ke aplikasi

**Happy configuring! 🎉**
