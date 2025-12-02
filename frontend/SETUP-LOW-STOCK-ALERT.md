# Setup Low Stock Alert Feature

Fitur ini menampilkan peringatan produk yang stoknya rendah di halaman Produk (khusus Admin).

## 🎨 UX Improvements

### Loading State
- ✨ Menggunakan **BK Logo animasi** (bounce effect) saat loading
- 🎯 Konsisten di semua halaman (Products, POS, Settings)
- 🔄 Mengganti icon Package/ShoppingCart yang spinning

### Low Stock Alert Flow
- 🎯 Klik produk → **Langsung ke Tab Produksi**
- 📝 Auto-open dialog produksi dengan produk terpilih
- 📊 History produksi tercatat dengan baik
- 💡 Toast notification dengan info stok saat ini

## 📋 Cara Setup

### 1. Jalankan SQL Migration

Buka Supabase SQL Editor dan jalankan file: `add-min-stock-column.sql`

```sql
-- File ini akan menambahkan kolom min_stock ke tabel products
-- Default nilai: 10
```

**Atau copy-paste SQL berikut:**

```sql
-- Add min_stock column to products table for low stock alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'min_stock'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN min_stock INTEGER DEFAULT 10 NOT NULL;
    
    RAISE NOTICE 'Column min_stock added successfully';
  ELSE
    RAISE NOTICE 'Column min_stock already exists';
  END IF;
END $$;

COMMENT ON COLUMN public.products.min_stock IS 'Minimum stock threshold for low stock alerts';
```

### 2. Test di Browser

1. **Pastikan SQL sudah berhasil dijalankan** (lihat success notice)
2. Refresh aplikasi POS di browser
3. Login sebagai **Admin**
4. Buka halaman **Produk**

## ✨ Fitur Low Stock Alert

### Tampilan Alert

- **Muncul di atas Tab Produk** - Hanya muncul jika ada produk dengan stok rendah
- **Horizontal Scroll** - Produk ditampilkan dalam card yang bisa di-scroll horizontal
- **Badge Kategori:**
  - 🔴 **Kritis** - Stok = 0 atau < 50% dari min_stock
  - 🟠 **Warning** - Stok antara 50% sampai 100% dari min_stock

### Detail Setiap Card

- **Foto Produk** - Jika ada
- **Nama & SKU** - Informasi produk
- **Progress Bar** - Visual stok saat ini vs minimum
- **Badge Status:**
  - `HABIS` - Stock = 0
  - `SANGAT RENDAH` - Stock < 50% dari minimum
  - `RENDAH` - Stock ≤ minimum
- **Clickable** - Klik untuk buka produksi (bukan edit!)

### Alur Saat Klik Produk

1. **Auto Switch Tab** - Pindah ke tab "Produksi"
2. **Open Dialog** - Dialog "Tambah Produksi" terbuka
3. **Pre-Selected** - Produk sudah terpilih otomatis
4. **Toast Info** - Muncul notifikasi dengan info stok
5. **Input Qty** - Tinggal masukkan jumlah produksi
6. **Save** - History tercatat di tab Produksi

### Keuntungan Flow Baru

✅ **History Tercatat** - Semua produksi masuk database  
✅ **Tracking** - Bisa lihat riwayat kapan produksi  
✅ **Audit Trail** - Ada catatan siapa yang produksi  
✅ **Reporting** - Data lengkap untuk laporan  
❌ **Bukan Edit Manual** - Tidak langsung edit stok (no history)

### Pengaturan Per Produk

1. **Tambah Produk Baru:**
   - Field "Stok Minimal" - Default 10
   - Hint: "Peringatan akan muncul jika stok ≤ nilai ini"

2. **Edit Produk:**
   - Bisa ubah nilai "Stok Minimal"
   - Klik ikon Edit (pensil) di card produk

## 🎯 Cara Kerja

### Logika Alert

```
Produk MUNCUL di alert jika:
stock_in_warehouse <= min_stock

Status KRITIS jika:
- stock_in_warehouse = 0, ATAU
- stock_in_warehouse < (min_stock * 0.5)

Status WARNING jika:
- stock_in_warehouse >= (min_stock * 0.5)
- stock_in_warehouse <= min_stock
```

### Contoh

**Produk A:**
- Stock di gudang: 5
- Min stock: 10
- **Status:** WARNING (5/10 = 50%)

**Produk B:**
- Stock di gudang: 3
- Min stock: 10  
- **Status:** KRITIS (3/10 = 30%)

**Produk C:**
- Stock di gudang: 0
- Min stock: 10
- **Status:** KRITIS - HABIS

**Produk D:**
- Stock di gudang: 15
- Min stock: 10
- **Status:** TIDAK MUNCUL di alert (stok aman)

## 🎨 Desain

- **Warna:**
  - Border & Background: Orange untuk warning
  - Card Kritis: Red border & background
  - Icon: AlertTriangle (warning icon)
  
- **Responsive:**
  - Mobile: Card width 160px
  - Desktop: Card width 180px
  - Scroll horizontal untuk banyak produk

## 💡 Tips Penggunaan

1. **Set Min Stock yang Realistis**
   - Pertimbangkan lead time produksi
   - Pertimbangkan permintaan rata-rata
   
2. **Update Min Stock Berkala**
   - Sesuaikan dengan musim/trend
   - Update jika pattern penjualan berubah

3. **Quick Production dari Alert**
   - Klik produk di alert
   - Langsung input jumlah produksi
   - History otomatis tercatat
   - Tidak perlu edit manual

4. **Monitoring**
   - Cek alert setiap hari
   - Prioritaskan produk KRITIS
   - Plan produksi untuk produk WARNING

## ⚡ Perbedaan dengan Edit Manual

| Fitur | Via Alert (Produksi) | Edit Manual |
|-------|---------------------|-------------|
| History Tercatat | ✅ Ya | ❌ Tidak |
| Tracking Waktu | ✅ Ya | ❌ Tidak |
| Catatan/Notes | ✅ Bisa | ❌ Tidak bisa |
| Audit Trail | ✅ Lengkap | ❌ Tidak ada |
| Laporan | ✅ Masuk laporan | ❌ Tidak masuk |
| **Rekomendasi** | **✅ GUNAKAN INI** | ⚠️ Hanya untuk koreksi |

## 🔧 Troubleshooting

### Alert Tidak Muncul

1. **Cek apakah ada produk low stock:**
   ```sql
   SELECT name, stock_in_warehouse, min_stock
   FROM products
   WHERE stock_in_warehouse <= min_stock;
   ```

2. **Cek apakah kolom min_stock ada:**
   ```sql
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'products' 
   AND column_name = 'min_stock';
   ```

3. **Pastikan login sebagai Admin**
   - Alert hanya muncul untuk role Admin
   - Rider tidak bisa lihat alert ini

### Produk Tidak Auto-Select di Dialog

1. **Refresh browser** setelah klik
2. **Cek console** untuk error
3. **Pastikan product ID valid**

### Loading Masih Pakai Icon Lama

1. **Hard refresh** browser (Ctrl+Shift+R)
2. **Clear cache** browser
3. **Restart dev server**

---

**Status:** ✅ Ready to Test  
**Last Updated:** Oct 31, 2025  
**Note:** Jangan push dulu, test di browser dulu!
