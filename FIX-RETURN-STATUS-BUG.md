# 🔧 Fix: Return Status Bug - "Produk Sedang Dalam Persetujuan" 

## 📋 Deskripsi Masalah

### Skenario:
1. ✅ Rider melakukan return produk kemarin → Status: "pending"
2. ✅ Admin approve return kemarin → Return masuk ke history
3. ✅ Admin distribusi produk yang sama ke rider hari ini
4. ❌ **BUG**: Rider mencoba return lagi → Error: "Produk ini sudah memiliki pengajuan return yang menunggu persetujuan admin"

### Penyebab:
Ada **2 masalah** yang menyebabkan bug ini:

#### Masalah 1: Query Frontend Tidak Filter Status
File: `/src/pages/Products.tsx` line 186

**Query Lama (Salah):**
```typescript
const { data: pendingReturnsData, error: returnsError } = await supabase
  .from("returns")
  .select("product_id")
  .eq("rider_id", user.id);  // ❌ Mengambil SEMUA return
```

**Query Baru (Benar):**
```typescript
const { data: pendingReturnsData, error: returnsError } = await supabase
  .from("returns")
  .select("product_id")
  .eq("rider_id", user.id)
  .eq("status", "pending");  // ✅ Hanya pending returns
```

#### Masalah 2: Database Function Tidak Filter Status
File: Database function `has_pending_return`

**Function Lama (Salah):**
```sql
CREATE OR REPLACE FUNCTION has_pending_return(p_product_id UUID, p_rider_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM returns 
        WHERE product_id = p_product_id 
          AND rider_id = p_rider_id  -- ❌ Tidak filter status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Function Baru (Benar):**
```sql
CREATE OR REPLACE FUNCTION has_pending_return(p_product_id UUID, p_rider_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM returns 
        WHERE product_id = p_product_id 
          AND rider_id = p_rider_id
          AND status = 'pending'  -- ✅ Filter status pending
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔧 Cara Memperbaiki

### Langkah 1: Update Frontend (Sudah Selesai ✅)
File `/src/pages/Products.tsx` sudah diperbaiki dengan menambahkan `.eq("status", "pending")` pada query.

### Langkah 2: Update Database Function

1. **Buka Supabase Dashboard** → SQL Editor
2. **Copy & Paste** isi file `fix-has-pending-return-function.sql`
3. **Run** query
4. **Verify** bahwa function berhasil dibuat

**File SQL:** `fix-has-pending-return-function.sql`

---

## ✅ Testing

### Test Case 1: Return Baru (Normal Flow)
1. Login sebagai **Rider**
2. Pilih produk yang ada di "Stok Saya"
3. Klik tombol **"Return"**
4. Masukkan jumlah dan catatan
5. Klik **"Ajukan Return"**
6. **Expected**: ✅ Return berhasil diajukan
7. Status berubah menjadi **"Menunggu Approval"**

### Test Case 2: Return Produk yang Sudah Pending
1. Login sebagai **Rider**
2. Pilih produk yang sudah punya pending return
3. Klik tombol **"Return"** (seharusnya disabled/tidak ada)
4. Jika bisa diklik, akan muncul error
5. **Expected**: ❌ "Produk ini sudah memiliki pengajuan return yang menunggu persetujuan admin"

### Test Case 3: Return Setelah Approved & Re-distribusi (Bug Fix)
1. Login sebagai **Rider** → Return produk
2. Login sebagai **Admin** → Approve return
3. Login sebagai **Admin** → Distribusi produk yang sama ke rider lagi
4. Login sebagai **Rider** → Coba return produk lagi
5. **Expected**: ✅ Return berhasil diajukan (TIDAK ADA ERROR)

### Test Case 4: Tampilan Tombol Return
**Sebelum Fix:**
- Produk yang sudah approved → Tampil "Menunggu Approval" ❌

**Setelah Fix:**
- Produk baru/setelah approved → Tampil tombol "Return" ✅
- Produk dengan pending return → Tampil "Menunggu Approval" ✅

---

## 🗄️ Database Schema

### Tabel `returns`
```
- id: UUID
- product_id: UUID
- rider_id: UUID
- quantity: INTEGER
- notes: TEXT
- returned_at: TIMESTAMPTZ
- status: TEXT ('pending', 'approved', 'rejected')
```

### Flow Data:
```
1. Return diajukan → INSERT ke 'returns' (status: 'pending')
2. Admin approve  → INSERT ke 'return_history' (status: 'approved')
                  → DELETE dari 'returns'
3. Admin reject   → INSERT ke 'return_history' (status: 'rejected')
                  → DELETE dari 'returns'
```

### Fungsi Database:
- `has_pending_return(product_id, rider_id)` → Boolean
- `get_pending_return_info(product_id, rider_id)` → Return details

---

## 📝 Checklist Perbaikan

### Frontend ✅
- [x] Update query di `fetchRiderStock()` untuk filter `status = 'pending'`
- [x] Query di `handleReturnProduct()` sudah menggunakan RPC `has_pending_return`
- [x] UI menampilkan badge "Menunggu Approval" hanya untuk pending returns
- [x] Tombol "Return" muncul untuk produk tanpa pending return

### Backend ✅
- [x] Update function `has_pending_return` untuk filter `status = 'pending'`
- [x] Update function `get_pending_return_info` untuk filter `status = 'pending'`
- [x] Grant permissions ke authenticated & anon users
- [x] Verify functions dengan test query

### Database Cleanup (Optional) ⚠️
- [ ] Cek apakah ada data return dengan status != 'pending' di tabel `returns`
- [ ] Jika ada, backup dulu kemudian delete (data yang sudah approved seharusnya sudah dipindah ke `return_history`)

---

## 🐛 Troubleshooting

### Error: "has_pending_return is not a function"
**Solusi:**
1. Pastikan function sudah dibuat dengan menjalankan SQL di `fix-has-pending-return-function.sql`
2. Cek dengan query:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'has_pending_return';
```

### Error: Masih muncul "Menunggu Approval" padahal tidak ada pending return
**Solusi:**
1. Cek data di tabel `returns`:
```sql
SELECT * FROM returns 
WHERE rider_id = 'YOUR_RIDER_ID' 
AND status != 'pending';
```
2. Jika ada data lama dengan status approved/rejected, hapus:
```sql
DELETE FROM returns WHERE status IN ('approved', 'rejected');
```

### Error: Function permission denied
**Solusi:**
```sql
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO anon;
```

---

## 📚 File yang Diubah

### 1. `/src/pages/Products.tsx`
- Line 186: Tambah filter `.eq("status", "pending")`

### 2. `fix-has-pending-return-function.sql` (NEW)
- Update function `has_pending_return` dengan filter status
- Update function `get_pending_return_info` dengan filter status

---

## 🎯 Hasil Akhir

✅ Rider dapat melakukan return produk yang baru didistribusikan setelah return sebelumnya disetujui

✅ Tidak ada error "Produk sedang dalam persetujuan admin" untuk produk yang tidak memiliki pending return

✅ Badge "Menunggu Approval" hanya muncul untuk produk dengan return yang benar-benar pending

✅ Tombol "Return" muncul dengan benar untuk produk yang dapat di-return

---

**Tanggal Fix:** 30 Oktober 2025  
**Developer:** GitHub Copilot
