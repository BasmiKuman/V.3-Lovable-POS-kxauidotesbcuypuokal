# Production Tracking System - Panduan Lengkap

## 📋 Overview

Sistem tracking produksi yang memungkinkan admin untuk:
- ✅ Mencatat produksi baru
- ✅ Otomatis menambah stok di gudang
- ✅ Melihat history produksi lengkap
- ✅ Monitoring siapa yang produksi, kapan, dan berapa banyak
- ✅ Mobile-responsive interface

## 🗄️ Database Schema

### Table: `production_history`

```sql
- id (UUID, Primary Key)
- product_id (UUID, FK to products)
- quantity (INTEGER, > 0)
- notes (TEXT, optional)
- produced_by (UUID, FK to profiles)
- produced_at (TIMESTAMP, default now())
- created_at (TIMESTAMP, default now())
```

### Function: `add_production()`

```sql
add_production(
  p_product_id UUID,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL
)
```

**Fungsi:**
- Validasi user adalah admin
- Validasi quantity > 0
- Insert ke production_history
- Update stock_in_warehouse di products
- Return JSON dengan detail produksi

**Return:**
```json
{
  "production_id": "uuid",
  "product_id": "uuid",
  "quantity": 100,
  "previous_stock": 50,
  "new_stock": 150
}
```

## 🚀 Setup

### 1. Jalankan SQL Migration

**PENTING:** Lakukan ini SEBELUM menggunakan fitur!

```bash
# Option 1: Via Supabase Dashboard
# 1. Buka Supabase Dashboard → SQL Editor
# 2. Copy isi file setup-production-tracking.sql
# 3. Paste dan Run
```

Atau copy isi file `setup-production-tracking.sql` dan paste ke Supabase SQL Editor, lalu klik Run.

### 2. Regenerate TypeScript Types (Optional)

Setelah SQL migration, regenerate types agar tidak ada TypeScript error:

```bash
# Install Supabase CLI jika belum
npm install -g supabase

# Login ke Supabase
supabase login

# Link ke project (ganti dengan Project ID kamu)
supabase link --project-ref YOUR_PROJECT_ID

# Generate types
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

**Note:** Untuk sementara, TypeScript errors sudah di-suppress dengan `@ts-ignore` dan `as any` casting, jadi fitur tetap bisa jalan meskipun belum regenerate types.

### 3. File yang Sudah Dibuat

✅ **Backend:**
- `setup-production-tracking.sql` - Database schema dan function

✅ **Frontend:**
- `src/components/AddProductionDialog.tsx` - Form tambah produksi
- `src/components/ProductionHistory.tsx` - Tampilan history produksi
- `src/pages/Products.tsx` - Updated dengan tabs dan tombol produksi

## 📱 Fitur UI

### Tab Produk (Admin)

Halaman Products sekarang memiliki 2 tabs:
1. **Produk** - Daftar semua produk (existing)
2. **Produksi** - History produksi lengkap (NEW!)

### Tombol "Tambah Produksi"

**Desktop:**
- Full button dengan icon + text "Tambah Produksi"

**Mobile:**
- Icon-only button (Factory icon)
- Space-efficient untuk layar kecil

### Form Tambah Produksi

**Fields:**
- **Produk** (Required) - Dropdown dengan nama + stok saat ini
- **Jumlah Produksi** (Required) - Input number, min 1
  - Menampilkan preview: "Stok akan bertambah: 50 → 150"
- **Catatan** (Optional) - Textarea untuk info tambahan
  - Contoh: "Produksi batch pagi", "Kualitas premium", dll

**Validasi:**
- Produk harus dipilih
- Quantity harus > 0
- Hanya admin yang bisa akses

### Production History Display

**Mobile View (Grid 1 kolom):**
- Image produk (16×16 atau 20×20)
- Nama produk
- Badge jumlah (+100 unit)
- Tanggal & waktu produksi
- Nama admin yang produksi
- Catatan (jika ada)

**Desktop View (Grid 2 kolom):**
- Sama seperti mobile, tapi 2 kolom

**Features:**
- Sorted by latest first
- Limit 100 records
- Auto-refresh setelah tambah produksi
- Empty state dengan ilustrasi

## 🔐 Security & RLS

### Policies

1. **View Production History**
   - Hanya admin yang bisa lihat
   - Query: Check `user_roles.role = 'admin'`

2. **Insert Production**
   - Hanya admin yang bisa insert
   - Function `add_production()` juga validasi admin

3. **Atomic Transaction**
   - Insert history + update stock dalam 1 transaksi
   - Rollback otomatis jika gagal

## 🎯 Use Cases

### Case 1: Produksi Harian

1. Admin klik "Tambah Produksi"
2. Pilih produk: "Basmi Kuman Spray 500ml"
3. Input quantity: 200
4. Catatan: "Produksi batch pagi - 29 Okt 2025"
5. Submit → Stok otomatis +200

### Case 2: Monitoring Produksi

1. Klik tab "Produksi"
2. Lihat semua history:
   - Produk apa yang diproduksi
   - Berapa banyak
   - Siapa yang produksi
   - Kapan diproduksi
3. Filter by product (future enhancement)

### Case 3: Audit Trail

Jika stok warehouse bertambah, admin bisa cek:
- Apakah dari produksi baru?
- Atau dari return rider?
- Siapa yang input?
- Kapan tepatnya?

## 📊 Data Flow

```
Admin → Tambah Produksi Form
  ↓
AddProductionDialog
  ↓
supabase.rpc('add_production')
  ↓
Database Function:
  1. Validate admin
  2. Validate quantity
  3. Get current stock
  4. Insert production_history
  5. Update products.stock_in_warehouse
  6. Return result
  ↓
Success → Refresh products & close dialog
  ↓
ProductionHistory auto-reload
```

## 🔧 Troubleshooting

### TypeScript Errors (Expected)

**Error:** `'production_history' is not assignable...` atau `'add_production' is not assignable...`

**Cause:** Table dan function belum ada di TypeScript types
**Status:** ✅ Sudah di-handle dengan `@ts-ignore` dan `as any` casting
**Fix:** (Optional) Regenerate types setelah run SQL migration

```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### Error: "Only admins can add production"

**Cause:** User bukan admin
**Fix:** Pastikan user memiliki role 'admin' di table `user_roles`

```sql
-- Cek role user
SELECT * FROM user_roles WHERE user_id = 'USER_UUID';

-- Set user jadi admin (jika perlu)
INSERT INTO user_roles (user_id, role)
VALUES ('USER_UUID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Error: "Product not found"

**Cause:** product_id tidak valid
**Fix:** Pastikan produk exists di table `products`

### History Tidak Muncul

**Cause:** RLS policy
**Fix:** Pastikan user adalah admin

```sql
-- Cek policies
SELECT * FROM pg_policies WHERE tablename = 'production_history';
```

## 🎨 Mobile Optimization

### Layout Adjustments

1. **Header Buttons**
   - Desktop: Full text button
   - Mobile: Icon only (Factory icon)

2. **Tabs**
   - Responsive TabsList
   - Icon + text (smaller icons di mobile)

3. **Production Cards**
   - Grid 1 kolom di mobile
   - Grid 2 kolom di desktop (md breakpoint)
   - Compact spacing di mobile

4. **Dialog Form**
   - max-w-lg untuk tidak terlalu lebar
   - Scrollable jika konten panjang
   - Touch-friendly input sizes

## 📈 Future Enhancements

### Phase 2 (Optional)

1. **Filter & Search**
   - Filter by product
   - Filter by date range
   - Search by notes

2. **Export Data**
   - Export to CSV
   - Export to Excel
   - Print report

3. **Statistics**
   - Total produksi per produk
   - Trend produksi (chart)
   - Top producing admin

4. **Notifications**
   - Notify admin saat produksi baru
   - Daily summary email

5. **Batch Production**
   - Tambah multiple products sekaligus
   - Upload via CSV

## ✅ Checklist Setup

- [ ] Run `setup-production-tracking.sql` di Supabase
- [ ] Verify table `production_history` created
- [ ] Verify function `add_production` created
- [ ] Test add production (admin user)
- [ ] Verify stok bertambah di products
- [ ] Check production history tampil
- [ ] Test mobile responsive
- [ ] Test validasi (non-admin, negative qty, etc)

## 📝 Notes

- Function menggunakan `SECURITY DEFINER` agar bisa update products meskipun RLS enabled
- Timestamp menggunakan `now()` untuk akurasi server-side
- Profile joined via `produced_by` untuk nama admin
- Quantity harus > 0 (CHECK constraint)
- Auto-increment stok dengan atomic transaction

## 🎉 Done!

Production tracking system sudah ready! Admin sekarang bisa:
✅ Track semua produksi
✅ Auto-update stok
✅ History lengkap
✅ Mobile-friendly

---

**Version:** 1.0  
**Created:** 29 Oktober 2025  
**Author:** Basmi Kuman Dev Team
