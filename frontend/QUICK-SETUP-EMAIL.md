# ⚡ Quick Setup - Email Verification

## 🎯 3 Steps Konfigurasi Supabase

### 1️⃣ Site URL
```
Settings → Authentication → Site URL
Isi: http://localhost:8080
Save ✓
```

### 2️⃣ Redirect URLs
```
Settings → Authentication → Redirect URLs
Tambahkan:
  • http://localhost:8080/email-verified
  • http://localhost:8080/**
Save ✓
```

### 3️⃣ Email Template
```
Authentication → Email Templates → Confirm signup
Ganti dengan template yang ada di PANDUAN-KONFIGURASI-SUPABASE.md
Save ✓
```

---

## 🧪 Quick Test

```bash
# 1. Jalankan app
npm run dev

# 2. Buka browser
http://localhost:8080/auth

# 3. Daftar user baru
# 4. Cek email
# 5. Klik link verifikasi
# 6. Lihat halaman sukses ✓
```

---

## 🔗 Quick Links

**Dashboard:**
https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit

**Email Templates:**
https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/auth/templates

**Auth Settings:**
https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/settings/auth

---

## ✅ Expected Result

User klik link email → Redirect ke halaman ini:

```
┌────────────────────────────┐
│    ✓ Centang Hijau        │
│                            │
│ Verifikasi Berhasil! 🎉   │
│                            │
│ Email Anda telah berhasil  │
│ diverifikasi!              │
│                            │
│ [  Login Sekarang  ]       │
└────────────────────────────┘
```

**BUKAN** Supabase error page!

---

📖 **Detail lengkap:** Lihat `PANDUAN-KONFIGURASI-SUPABASE.md`
