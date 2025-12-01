# Setup Sales Target Feature

## 🚨 LANGKAH WAJIB - Jalankan SQL Migration Dulu!

Error yang muncul:
```
column profiles.sales_target does not exist
```

**Penyebab:** Kolom `sales_target` belum ada di tabel `profiles`

---

## 📋 Cara Setup:

### 1. Buka Supabase Dashboard
- Login ke: https://supabase.com/dashboard
- Pilih project: **mlwvrqjsaomthfcsmoit**

### 2. Buka SQL Editor
- Klik menu **SQL Editor** di sidebar kiri
- Klik **New query**

### 3. Copy & Jalankan SQL Ini:

```sql
-- Add sales_target column to profiles table
-- Default: 30 cups per month

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sales_target INTEGER DEFAULT 30;

-- Update existing riders to have default target
UPDATE profiles 
SET sales_target = 30 
WHERE sales_target IS NULL;

-- Add comment
COMMENT ON COLUMN profiles.sales_target IS 'Monthly sales target in cups for riders (default: 30)';
```

### 4. Klik **RUN** atau tekan `Ctrl+Enter`

### 5. Refresh Aplikasi
- Setelah SQL berhasil dijalankan
- Refresh halaman aplikasi POS
- Buka menu **Settings → Manage Users**
- Seharusnya sudah tidak ada error

---

## ✅ Fitur Yang Akan Aktif Setelah Migration:

### 1. **Leaderboard dengan Target Indicator**
- ✅ Target Tercapai = Background Hijau
- ❌ Belum Tercapai = Background Merah
- Menampilkan: `X / 30 cup` (progress vs target)

### 2. **Management Pengguna - Edit Target**
- Kolom baru: **Target Penjualan (Cup/Bulan)**
- Default: 30 cup
- Bisa diubah per rider sesuai kebutuhan
- Hanya muncul untuk role **Rider**

### 3. **Filter Tanggal di Riwayat Transaksi**
- 3 tombol quick filter: Hari Ini | Bulan Ini | Filter Utama
- Filter tanggal bekerja real-time
- Tidak perlu refresh data

---

## 🔍 Verifikasi Setup Berhasil:

1. **Cek di Supabase Table Editor:**
   - Buka tabel `profiles`
   - Pastikan kolom `sales_target` ada
   - Value default semua rider = 30

2. **Cek di Aplikasi:**
   - Login sebagai Super Admin
   - Buka **Dashboard** → Lihat Leaderboard (ada warna hijau/merah)
   - Buka **Settings → Manage Users** → Edit rider → Ada input "Target Penjualan"

---

## 📝 File SQL Location:
`/workspaces/V.3-Lovable-POS-kxauidotesbcuypuokal/add-sales-target-column.sql`
