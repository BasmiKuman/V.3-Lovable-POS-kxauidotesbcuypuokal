# ✅ FIX: Payment Method Consistency & Transaction Delete with Audit

## 📋 Issue Summary

### Issue 1: Cash/QRIS Tidak Muncul di Crosscheck Setoran
**Problem**: Ketika admin input penjualan manual, di "Crosscheck Setoran Per Rider" menunjukkan Cash 0 dan QRIS 0, padahal total setorannya benar.

**Root Cause**: Inconsistency `payment_method` value
- **Admin Manual Sale** menggunakan: `'cash'` dan `'qris'`
- **Rider POS** menggunakan: `'tunai'` dan `'qris'`
- **Reports Query** filter dengan: `'tunai'` dan `'qris'`

Akibatnya transaksi admin dengan `payment_method = 'cash'` tidak terdeteksi saat filter `payment_method === 'tunai'`.

**Solution**:
✅ Change ManualSalesTab payment_method dari `'cash'` ke `'tunai'`
✅ Add SQL script untuk update existing transactions: `'cash'` → `'tunai'`
✅ Add constraint untuk ensure hanya `'tunai'` atau `'qris'`

---

### Issue 2: Tidak Bisa Hapus Transaksi yang Salah Input
**Problem**: Ada transaksi yang tercatat manual berbeda dengan sistem (misal: kelebihan input), tidak bisa dihapus. Jika dihapus, tidak ada audit trail.

**Solution**: 
✅ Create audit table `transaction_adjustments`
✅ Create RPC function `delete_transaction` with full audit trail
✅ Add Delete button di Riwayat Transaksi (admin only)
✅ Add confirmation dialog dengan input alasan
✅ Add "Penyesuaian Transaksi Rider" section untuk tampilkan history

---

## 🗄️ Database Changes

### 1. Transaction Adjustments Table
```sql
CREATE TABLE transaction_adjustments (
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id),
  action VARCHAR(50), -- 'deleted', 'edited'
  reason TEXT NOT NULL,
  adjusted_by UUID REFERENCES auth.users(id),
  adjusted_at TIMESTAMP DEFAULT NOW(),
  
  -- Snapshot before deletion
  transaction_snapshot JSONB,
  
  -- Quick access fields
  rider_id UUID,
  rider_name TEXT,
  total_amount DECIMAL(10,2),
  payment_method VARCHAR(20),
  transaction_date TIMESTAMP
);
```

**RLS Policies**:
- ✅ Only admins can INSERT adjustments
- ✅ Only admins can SELECT adjustments

---

### 2. Delete Transaction Function
```sql
CREATE FUNCTION delete_transaction(
  p_transaction_id UUID,
  p_reason TEXT
) RETURNS JSON
```

**Features**:
- ✅ Check user role (admin/super_admin only)
- ✅ Save full transaction snapshot (items, products, amounts)
- ✅ Insert audit record BEFORE deletion
- ✅ Delete transaction_items first
- ✅ Delete transaction
- ✅ Return success response

**Security**: `SECURITY DEFINER` - runs with elevated privileges, but checks user role internally.

---

### 3. Payment Method Consistency
```sql
-- Update existing 'cash' to 'tunai'
UPDATE transactions
SET payment_method = 'tunai'
WHERE payment_method = 'cash';

-- Add constraint
ALTER TABLE transactions
ADD CONSTRAINT check_payment_method
CHECK (payment_method IN ('tunai', 'qris'));
```

---

## 💻 Frontend Changes

### 1. ManualSalesTab.tsx
**Changed**:
```typescript
// BEFORE:
const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
<SelectItem value="cash">💵 Tunai</SelectItem>

// AFTER:
const [paymentMethod, setPaymentMethod] = useState<"tunai" | "qris">("tunai");
<SelectItem value="tunai">💵 Tunai</SelectItem>

// Reset after submit:
setPaymentMethod("tunai"); // was: "cash"
```

---

### 2. Reports.tsx
**New States**:
```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
const [deleteReason, setDeleteReason] = useState("");
const [isDeleting, setIsDeleting] = useState(false);
const [adjustmentHistory, setAdjustmentHistory] = useState<any[]>([]);
const [showAdjustments, setShowAdjustments] = useState(false);
```

**New Functions**:
```typescript
// Fetch adjustment history
const fetchAdjustmentHistory = async () => {
  const { data, error } = await supabase
    .from("transaction_adjustments")
    .select(`
      *,
      profiles!transaction_adjustments_adjusted_by_fkey (full_name)
    `)
    .order("adjusted_at", { ascending: false });
  setAdjustmentHistory(data || []);
};

// Delete transaction
const handleDeleteTransaction = async () => {
  const { data, error } = await supabase.rpc("delete_transaction", {
    p_transaction_id: selectedTransaction.id,
    p_reason: deleteReason
  });
  toast.success("Transaksi berhasil dihapus");
  window.location.reload();
};
```

**UI Components Added**:
1. **Delete Button** di setiap transaction card:
   ```tsx
   <Button
     variant="ghost"
     size="sm"
     className="text-red-600"
     onClick={() => openDeleteDialog(transaction)}
   >
     <Trash2 className="h-4 w-4" />
   </Button>
   ```

2. **Delete Confirmation Dialog**:
   - Transaction details (date, amount, items)
   - Textarea untuk input alasan (mandatory)
   - Confirm/Cancel buttons

3. **Adjustment History Section**:
   - Card "Penyesuaian / Update Transaksi Rider"
   - Toggle show/hide
   - List of all deleted transactions with:
     - Badge action (DIHAPUS)
     - Rider name, date, amount
     - Reason for deletion
     - Admin who deleted
     - Collapsible item details

---

## 🎯 Features

### ✅ Admin Manual Sale Payment Fix
- Payment method sekarang consistent: `'tunai'` dan `'qris'`
- Crosscheck setoran sekarang menampilkan Cash dan QRIS dengan benar
- Transaksi admin tidak lagi hilang dari breakdown

### ✅ Delete Transaction (Admin Only)
- **Authorization**: Only admin/super_admin can delete
- **Confirmation**: Dialog dengan transaction details
- **Mandatory Reason**: Alasan penghapusan wajib diisi
- **Audit Trail**: Full transaction snapshot disimpan
- **Visual Feedback**: Toast notification + auto-reload

### ✅ Adjustment History
- **Visibility**: Section terpisah di Reports (collapsible)
- **Complete Info**: Date, rider, amount, payment method, reason
- **Admin Info**: Who deleted and when
- **Item Details**: Expandable detail produk yang dihapus
- **Badge**: Visual indicator (DIHAPUS)

---

## 📝 Usage Guide

### For Admin: Menghapus Transaksi

1. **Buka Reports** → Tab "Transaksi Harian"
2. **Scroll ke** "Riwayat Transaksi per Rider"
3. **Expand rider** yang transaksinya ingin dihapus
4. **Klik tombol Trash** 🗑️ di sebelah transaksi
5. **Review detail transaksi** di dialog
6. **Isi alasan penghapusan** (contoh: "Kelebihan input", "Transaksi duplikat")
7. **Klik "Hapus Transaksi"**
8. **Verifikasi**: Transaksi hilang dari list, muncul di "Penyesuaian Transaksi"

### For Admin: Melihat Audit Trail

1. **Buka Reports** → Tab "Transaksi Harian"
2. **Scroll ke bawah** ke section "Penyesuaian / Update Transaksi Rider"
3. **Klik "Tampilkan"** untuk expand
4. **Lihat list** transaksi yang sudah dihapus:
   - Badge merah "DIHAPUS"
   - Nama rider, tanggal, total
   - Alasan penghapusan
   - Nama admin yang hapus
5. **Expand "Detail Item"** untuk lihat produk yang dihapus

---

## 🧪 Testing

### Test 1: Payment Method Fix

1. ✅ Login sebagai admin
2. ✅ Buka Gudang → Manual Sale
3. ✅ Pilih rider, tambah produk
4. ✅ Pilih **"💵 Tunai"** → Submit
5. ✅ Buka Reports → "Crosscheck Setoran Per Rider"
6. ✅ **Verify**: Cash amount muncul dengan benar
7. ✅ Ulangi dengan **"📱 QRIS"**
8. ✅ **Verify**: QRIS amount muncul dengan benar

### Test 2: Delete Transaction

1. ✅ Buka Reports → Riwayat Transaksi
2. ✅ Expand rider yang punya transaksi
3. ✅ Klik tombol 🗑️ Trash
4. ✅ Dialog muncul dengan detail transaksi
5. ✅ Isi alasan: "Test kelebihan input"
6. ✅ Klik "Hapus Transaksi"
7. ✅ Toast success muncul
8. ✅ Transaksi hilang dari list
9. ✅ Scroll ke "Penyesuaian Transaksi"
10. ✅ **Verify**: Transaksi muncul di audit log dengan badge "DIHAPUS"

### Test 3: Rider Cannot Delete

1. ✅ Login sebagai rider
2. ✅ Buka halaman manapun
3. ✅ **Verify**: Tidak ada tombol delete di transaksi
4. ✅ Try direct RPC call (if possible)
5. ✅ **Verify**: Error "Only admins can delete transactions"

---

## 📂 Files Changed

### SQL Scripts
1. ✅ `fix-payment-method-and-add-delete-transaction.sql` (NEW)
   - Create `transaction_adjustments` table
   - Create `delete_transaction` RPC function
   - Update payment_method 'cash' → 'tunai'
   - Add check constraint

### Frontend Components
1. ✅ `ManualSalesTab.tsx`
   - Line 45: Change payment_method type `'cash'` → `'tunai'`
   - Line 716: Change SelectItem value `'cash'` → `'tunai'`
   - Line 270: Change reset value `'cash'` → `'tunai'`

2. ✅ `Reports.tsx`
   - Add imports: `Dialog`, `Textarea`, `Trash2`, `AlertTriangle`
   - Add delete states and adjustment history states
   - Add `fetchAdjustmentHistory()` function
   - Add `handleDeleteTransaction()` function
   - Add `openDeleteDialog()` function
   - Add Delete button in transaction card
   - Add Delete confirmation Dialog
   - Add Adjustment History Card (collapsible)

---

## 🔐 Security

### RLS Policies
- ✅ `transaction_adjustments` table: Admin only (INSERT, SELECT)
- ✅ `delete_transaction` RPC: Checks user role internally

### Authorization Flow
1. User clicks delete button
2. Frontend opens dialog
3. User enters reason
4. Frontend calls `supabase.rpc("delete_transaction", {...})`
5. RPC checks `auth.uid()` role in `user_roles`
6. If not admin: RAISE EXCEPTION
7. If admin: Insert audit → Delete items → Delete transaction
8. Return success JSON

---

## 🎨 UI/UX

### Delete Button
- Icon: `Trash2` (red)
- Size: Small (8x8 px)
- Position: Right side of transaction card
- Hover: Red background
- Only visible to admin

### Delete Dialog
- Title: "Konfirmasi Hapus Transaksi" (red)
- Shows: Transaction details (date, amount, items)
- Input: Textarea for reason (mandatory)
- Buttons: Cancel (outline) | Delete (destructive red)
- Loading state: "Menghapus..." with spinner

### Adjustment History
- Card with orange accent (AlertTriangle icon)
- Toggle button: "Tampilkan" / "Sembunyikan"
- Each entry:
  - Orange border card
  - Badge "DIHAPUS" (red)
  - Date, rider, amount
  - Reason box with border-top
  - Admin name
  - Expandable item details

---

## 📊 Data Flow

### Delete Transaction Flow
```
1. User clicks Delete button
   ↓
2. Frontend: openDeleteDialog(transaction)
   ↓
3. User enters reason in Textarea
   ↓
4. User clicks "Hapus Transaksi"
   ↓
5. Frontend: handleDeleteTransaction()
   ↓
6. RPC: delete_transaction(id, reason)
   ↓
7. Check: user role (admin?)
   ↓
8. Fetch: transaction + items + products
   ↓
9. Insert: transaction_adjustments (with snapshot)
   ↓
10. Delete: transaction_items
    ↓
11. Delete: transactions
    ↓
12. Return: success JSON
    ↓
13. Frontend: toast.success() + reload()
    ↓
14. Adjustment appears in history
```

---

## 🚀 Deployment Steps

### 1. Run SQL Script
```bash
# In Supabase SQL Editor
# Run: fix-payment-method-and-add-delete-transaction.sql
```

### 2. Deploy Frontend
```bash
cd frontend
npm run build:no-bump
# Deploy to Vercel/Railway
```

### 3. Verify
- ✅ Check Supabase: `transaction_adjustments` table created
- ✅ Check Supabase: `delete_transaction` function exists
- ✅ Check Supabase: payment_method values (should be 'tunai'/'qris')
- ✅ Test admin delete transaction
- ✅ Test rider cannot delete
- ✅ Check adjustment history displays

---

## 💡 Notes

### Why Not Soft Delete?
Instead of adding `deleted_at` column to `transactions`, we:
- **Hard delete** the transaction (cleaner data)
- **Keep full snapshot** in `transaction_adjustments`
- **Easier queries** (no need to filter `deleted_at IS NULL`)
- **Complete audit trail** with reason and admin info

### Payment Method Standardization
- **Old**: Mixed `'cash'` and `'tunai'`
- **New**: Always `'tunai'`
- **Why**: Consistency across rider POS, admin manual sale, and reports
- **Migration**: Automatic via SQL UPDATE

### Future Enhancements
- [ ] Edit transaction (change amount/items)
- [ ] Restore deleted transaction
- [ ] Export adjustment history to Excel
- [ ] Filter adjustment history by rider/date
- [ ] Bulk delete transactions

---

## 🐛 Known Issues & Solutions

### Issue: "Function delete_transaction does not exist"
**Solution**: Run SQL script in Supabase SQL Editor

### Issue: "Only admins can delete transactions"
**Solution**: Check user_roles table, ensure current user has role 'admin' or 'super_admin'

### Issue: Delete button tidak muncul
**Solution**: Clear cache, hard refresh browser (Ctrl+Shift+R)

### Issue: Adjustment history kosong
**Solution**: 
1. Check RLS policies for transaction_adjustments
2. Check console for errors
3. Try delete a transaction first

---

## ✅ Success Criteria

1. ✅ Cash/QRIS muncul dengan benar di Crosscheck Setoran
2. ✅ Admin dapat menghapus transaksi dengan alasan
3. ✅ Rider tidak dapat menghapus transaksi
4. ✅ Audit trail tersimpan lengkap (snapshot + reason)
5. ✅ Adjustment history tampil di Reports
6. ✅ Payment method consistent ('tunai'/'qris')
7. ✅ Build successful tanpa error
8. ✅ RLS policies enforce admin-only access

---

## 📝 Changelog

### v1.1.10 (2025-12-05)
- ✅ Fix payment method inconsistency (cash → tunai)
- ✅ Add transaction delete feature with audit trail
- ✅ Add transaction_adjustments table
- ✅ Add delete_transaction RPC function
- ✅ Add Delete button in Reports (admin only)
- ✅ Add Adjustment History section
- ✅ Add delete confirmation dialog
- ✅ Update existing transactions: 'cash' → 'tunai'
- ✅ Add payment_method constraint

**Impact**: Admin dapat menghapus transaksi yang salah input, dengan audit trail lengkap. Cash/QRIS sekarang muncul dengan benar di Crosscheck Setoran.
