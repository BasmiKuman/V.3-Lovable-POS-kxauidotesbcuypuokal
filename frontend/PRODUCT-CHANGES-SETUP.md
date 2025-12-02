# Setup Product Changes History Feature

## 🎯 Fitur Baru

### 1. **Filter Kategori di Tab Produk**
- Quick filter untuk memfilter produk berdasarkan kategori
- Mirip seperti di halaman Distribution
- Mempercepat pencarian produk saat produksi atau penyesuaian stok

### 2. **Tab Riwayat Perubahan Produk**
- Tracking semua perubahan data produk
- Jenis perubahan:
  * **Produksi**: Penambahan stok dari produksi
  * **Penyesuaian Manual**: Perubahan stok manual dari halaman produk
  * **Update Info**: Perubahan nama, SKU, harga, min_stock, dll
- Filter berdasarkan tipe perubahan dan produk
- Menampilkan: user yang melakukan perubahan, tanggal, detail perubahan

### 3. **Fix: Edit Nama Pengguna**
- Menambahkan delay 300ms untuk memastikan database sudah terupdate
- Force refresh setelah update data

---

## 🚨 LANGKAH WAJIB - Jalankan SQL Migration!

### 1. Buka Supabase Dashboard
- Login ke: https://supabase.com/dashboard
- Pilih project: **mlwvrqjsaomthfcsmoit**

### 2. Buka SQL Editor
- Klik menu **SQL Editor** di sidebar kiri
- Klik **New query**

### 3. Jalankan Migration 1 - Create Table:

```sql
-- Create product_changes table for tracking all product modifications
-- This includes changes from production, manual stock adjustments, and product info updates

CREATE TABLE IF NOT EXISTS product_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- 'production', 'manual_adjustment', 'info_update'
  field_changed TEXT, -- 'name', 'sku', 'price', 'stock', 'min_stock', 'description', 'category'
  old_value TEXT,
  new_value TEXT,
  quantity_change INTEGER, -- For stock changes: positive for increase, negative for decrease
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_product_changes_product_id ON product_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_changes_changed_by ON product_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_product_changes_created_at ON product_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_changes_change_type ON product_changes(change_type);

-- Add RLS policies
ALTER TABLE product_changes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read product changes
CREATE POLICY "Allow read product_changes for authenticated users"
  ON product_changes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert product changes
CREATE POLICY "Allow insert product_changes for authenticated users"
  ON product_changes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE product_changes IS 'Tracks all changes made to products including production, stock adjustments, and info updates';
COMMENT ON COLUMN product_changes.change_type IS 'Type of change: production, manual_adjustment, or info_update';
COMMENT ON COLUMN product_changes.field_changed IS 'Which field was changed (for info_update type)';
COMMENT ON COLUMN product_changes.quantity_change IS 'Stock quantity change (positive for increase, negative for decrease)';
```

### 4. Klik **RUN** atau tekan `Ctrl+Enter`

### 5. Jalankan Migration 2 - Update Function:

```sql
-- Update add_production function to also log to product_changes table

CREATE OR REPLACE FUNCTION add_production(
  p_product_id UUID,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Insert into production_history
  INSERT INTO production_history (
    product_id,
    quantity,
    produced_by,
    notes
  ) VALUES (
    p_product_id,
    p_quantity,
    v_user_id,
    p_notes
  );

  -- Update product stock
  UPDATE products
  SET stock_in_warehouse = stock_in_warehouse + p_quantity
  WHERE id = p_product_id;

  -- Log to product_changes
  INSERT INTO product_changes (
    product_id,
    changed_by,
    change_type,
    quantity_change,
    notes
  ) VALUES (
    p_product_id,
    v_user_id,
    'production',
    p_quantity,
    COALESCE(p_notes, 'Produksi dari tab Produksi')
  );

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found with id: %', p_product_id;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_production(UUID, INTEGER, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION add_production IS 'Adds production record, updates product stock, and logs change to product_changes table';
```

### 6. Klik **RUN** atau tekan `Ctrl+Enter`

### 7. Refresh Aplikasi
- Setelah SQL berhasil dijalankan
- Refresh halaman aplikasi POS
- Fitur baru sudah siap digunakan!

---

## ✅ Fitur Yang Akan Aktif:

### 1. **Filter Kategori di Tab Produk**
- Tombol quick filter muncul di atas list produk
- Klik kategori untuk filter
- Tombol "Semua" untuk tampilkan semua

### 2. **Tab Riwayat Perubahan**
- Tab baru "Riwayat" muncul di sebelah tab Produksi
- Menampilkan semua perubahan produk
- Filter berdasarkan tipe dan produk
- Detail perubahan ditampilkan dengan warna:
  * 🟢 Hijau = Produksi (penambahan stok)
  * 🔵 Biru = Penyesuaian Manual
  * 🟣 Ungu = Update Info Produk

### 3. **Auto-Logging Perubahan**
- ✅ Produksi → Otomatis tercatat
- ✅ Edit stok manual → Otomatis tercatat
- ✅ Edit nama/harga/SKU → Otomatis tercatat
- Semua perubahan mencatat siapa yang melakukan dan kapan

---

## 🔍 Verifikasi Setup:

1. **Cek Tabel di Supabase:**
   - Buka Table Editor
   - Cari tabel `product_changes`
   - Pastikan tabel ada dengan kolom lengkap

2. **Cek di Aplikasi:**
   - Login sebagai Admin
   - Buka **Halaman Produk**
   - Tab Produk: Ada filter kategori di atas
   - Tab Riwayat: Tab baru muncul
   - Edit produk → Perubahan tercatat di riwayat

---

## 📝 File Locations:
- `/workspaces/V.3-Lovable-POS-kxauidotesbcuypuokal/create-product-changes-table.sql`
- `/workspaces/V.3-Lovable-POS-kxauidotesbcuypuokal/update-add-production-with-logging.sql`
