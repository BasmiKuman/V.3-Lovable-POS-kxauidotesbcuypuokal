# 🔧 Fix: Add Status Columns to Returns Table

## 🐛 Masalah

Error saat return produk:
```
Failed to load resource: the server responded with a status of 404
Error submitting return
```

**Root cause**: Table `returns` belum punya kolom `status`, `approved_by`, `approved_at` yang dibutuhkan untuk tracking approval.

---

## ✅ Solusi: Jalankan SQL Script

### Step 1: Buka Supabase SQL Editor

1. Login ke https://supabase.com/dashboard
2. Pilih project POS Anda
3. Klik **SQL Editor** di sidebar kiri

### Step 2: Copy-Paste Script

Copy script dari file:
```
frontend/add-returns-status-columns.sql
```

Atau copy dari sini:

```sql
-- Add status tracking columns to returns table
-- Run this in Supabase SQL Editor

-- 1. Add status column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'returns' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE returns 
        ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- 2. Add approved_by column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'returns' 
        AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE returns 
        ADD COLUMN approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add approved_at column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'returns' 
        AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE returns 
        ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. Update existing records to have 'approved' status (if any old data)
UPDATE returns 
SET status = 'approved',
    approved_at = returned_at
WHERE status IS NULL;

-- 5. Enable RLS on returns table
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if any
DROP POLICY IF EXISTS "Riders can insert their own returns" ON returns;
DROP POLICY IF EXISTS "Riders can view their own returns" ON returns;
DROP POLICY IF EXISTS "Admins can view all returns" ON returns;
DROP POLICY IF EXISTS "Admins can approve/reject returns" ON returns;

-- 7. Create RLS policies

-- Riders can insert their own returns
CREATE POLICY "Riders can insert their own returns"
ON returns FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = rider_id
    OR
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Riders can view their own returns
CREATE POLICY "Riders can view their own returns"
ON returns FOR SELECT
TO authenticated
USING (
    auth.uid() = rider_id
    OR
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Admins can view all returns
CREATE POLICY "Admins can view all returns"
ON returns FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Admins can update returns (approve/reject)
CREATE POLICY "Admins can approve/reject returns"
ON returns FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- 8. Grant permissions
GRANT SELECT, INSERT ON returns TO authenticated;
GRANT UPDATE ON returns TO authenticated;

-- Done! Now returns table supports status tracking
```

### Step 3: Run Script

1. Paste script ke SQL Editor
2. Klik **Run** (atau Ctrl+Enter)
3. Tunggu sampai muncul **Success**

### Step 4: Verify

Cek apakah kolom sudah ditambahkan:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'returns'
ORDER BY ordinal_position;
```

Harusnya muncul:
- `status` (TEXT)
- `approved_by` (UUID)
- `approved_at` (TIMESTAMP WITH TIME ZONE)

---

## 🎯 Testing

### Test Return Manual (Admin)

1. Login sebagai Admin/Super Admin
2. Buka **Gudang** → **Penjualan Manual** → **Tab Return**
3. Pilih rider
4. Klik "Return Semua" atau pilih produk
5. Isi alasan return
6. Klik "Proses Return"
7. ✅ Seharusnya sukses tanpa error 404!

### Test Return Rider

1. Login sebagai Rider
2. Buka **Produk** → Pilih produk dengan stock
3. Klik button "Return"
4. Isi form return
5. Submit
6. ✅ Status return: **pending** (menunggu approval admin)

---

## 📊 Struktur Table Returns

Setelah fix:

```sql
returns
├── id (UUID, PK)
├── product_id (UUID, FK → products)
├── rider_id (UUID, FK → auth.users)
├── quantity (INTEGER)
├── notes (TEXT)
├── returned_at (TIMESTAMPTZ) ✅ 
├── status (TEXT) ✅ NEW: 'pending', 'approved', 'rejected'
├── approved_by (UUID, FK → auth.users) ✅ NEW
└── approved_at (TIMESTAMPTZ) ✅ NEW
```

---

## 🔒 RLS Policies

Script juga menambahkan RLS policies:

1. **Riders can insert their own returns** - Rider bisa create return sendiri
2. **Riders can view their own returns** - Rider hanya lihat return miliknya
3. **Admins can view all returns** - Admin lihat semua returns
4. **Admins can approve/reject returns** - Admin bisa update status (approve/reject)

---

## ⚠️ Troubleshooting

### Error: column "status" already exists

Tidak masalah, script menggunakan `IF NOT EXISTS` jadi aman dijalankan berkali-kali.

### Error: permission denied

Pastikan Anda login sebagai **database owner** atau punya privilege `ALTER TABLE`.

### Returns tetap error 404

1. **Clear cache**: Refresh browser dengan Ctrl+Shift+R
2. **Check schema**: Pastikan table `returns` ada di schema `public`
3. **RLS**: Pastikan RLS policies sudah dibuat dengan benar

---

## ✅ Summary

**Before:**
```
returns (id, product_id, rider_id, quantity, notes, returned_at)
❌ No status tracking
❌ No approval flow
```

**After:**
```
returns (id, product_id, rider_id, quantity, notes, returned_at, status, approved_by, approved_at)
✅ Status: pending/approved/rejected
✅ Approval tracking
✅ RLS policies
```

Sekarang return produk berfungsi dengan sempurna! 🎉
