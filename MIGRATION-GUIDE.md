## 🚀 Setup Supabase Database - Manual Steps

Karena keterbatasan otomasi, berikut adalah langkah-langkah untuk menyelesaikan setup database Anda:

### ✅ Yang Sudah Selesai:
1. ✓ Environment variables sudah di-update (`.env.local`)
2. ✓ Supabase config sudah di-update (`supabase/config.toml`)
3. ✓ File migration lengkap sudah dibuat (`complete-migration.sql`)

### 📋 Langkah Selanjutnya:

#### **Opsi 1: Menggunakan Supabase Dashboard (RECOMMENDED)** ⭐

1. **Buka SQL Editor di Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/editor
   ```

2. **Klik "SQL Editor"** di sidebar kiri

3. **Klik "+ New Query"**

4. **Copy isi file `complete-migration.sql`** ke editor
   - File ini berisi semua migrations yang sudah digabung
   - Total 507 baris SQL

5. **Klik "Run"** atau tekan `Ctrl + Enter`

6. **Tunggu hingga selesai** - akan muncul pesan sukses

#### **Opsi 2: Menggunakan psql (Advanced)**

1. **Dapatkan Database Password:**
   - Buka: https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/settings/database
   - Scroll ke "Connection String"
   - Copy password atau reset jika lupa

2. **Jalankan migration:**
   ```bash
   PGPASSWORD='YOUR_DB_PASSWORD' psql \
     -h db.mlwvrqjsaomthfcsmoit.supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -f complete-migration.sql
   ```

### 🔍 Verifikasi Setup:

Setelah migration selesai, verifikasi di Dashboard:

1. **Cek Tables:**
   - Buka: https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/editor
   - Pastikan tables berikut ada:
     - ✓ profiles
     - ✓ user_roles
     - ✓ categories
     - ✓ products
     - ✓ rider_stock
     - ✓ distributions
     - ✓ returns
     - ✓ return_history
     - ✓ transactions
     - ✓ transaction_items
     - ✓ tax_settings

2. **Cek RLS Policies:**
   - Klik pada setiap table
   - Pilih tab "Policies"
   - Pastikan RLS enabled dan policies ada

### 🧪 Test Koneksi:

Setelah migration selesai, test aplikasi:

```bash
npm run dev
# atau
bun run dev
```

Aplikasi akan menggunakan credentials di `.env.local`

### 📊 Struktur Database:

**Tables yang akan dibuat:**
- `profiles` - User profiles
- `user_roles` - User roles (admin/rider)
- `categories` - Product categories
- `products` - Products
- `rider_stock` - Rider stock inventory
- `distributions` - Distribution history
- `returns` - Return requests
- `return_history` - Approved returns
- `transactions` - Sales transactions
- `transaction_items` - Transaction line items
- `tax_settings` - Tax configuration

**Functions:**
- `has_role()` - Check user role
- `handle_new_user()` - Auto-create profile on signup
- `decrement_rider_stock()` - Update rider inventory

**Triggers:**
- Auto-update `updated_at` timestamps
- Auto-create profiles for new users

### 🎯 Admin User:

Default admin email: `fadlannafian@gmail.com`

Ketika user dengan email ini sign up, akan otomatis mendapat role `admin`.
User lain akan mendapat role `rider`.

---

**Need help?** Jika ada error saat migration, silakan screenshot dan tanyakan!
