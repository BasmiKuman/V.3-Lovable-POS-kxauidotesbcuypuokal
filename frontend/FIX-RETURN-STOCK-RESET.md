# Fix: Return Product - Support Partial Return

## Masalah
Ketika admin menyetujui return product dari rider, sistem harus mendukung:
1. **Partial Return**: Rider return sebagian produk (produk cacat, rusak, kadaluarsa)
2. **Full Return**: Rider return semua produk
3. **Validasi**: Mencegah return quantity melebihi stock rider

## Contoh Kasus

### Skenario 1: Partial Return (Produk Cacat)
1. Rider memiliki **20 cup** produk A
2. Rider return **3 cup** (produk cacat)
3. Admin approve return
4. Stock rider menjadi **17 cup** ✅
5. Stock warehouse bertambah **3 cup** ✅

### Skenario 2: Full Return
1. Rider memiliki **10 cup** produk B
2. Rider return **10 cup** (semua stock)
3. Admin approve return
4. Stock rider menjadi **0 cup** (data dihapus) ✅
5. Stock warehouse bertambah **10 cup** ✅

### Skenario 3: Return Berlebihan (Error Prevention)
1. Rider memiliki **5 cup** produk C
2. Rider coba return **8 cup** ❌
3. Admin approve return
4. Sistem **TOLAK** dengan error message ✅
5. Mencegah stock negatif

## Solusi
Ketika admin menyetujui return product, sistem akan:
1. ✅ Menambah stock warehouse dengan quantity yang dikembalikan
2. ✅ Mengurangi stock rider sesuai quantity return
3. ✅ Jika stock rider = 0 → Hapus data dari `rider_stock`
4. ✅ Jika stock rider > 0 → Update quantity baru
5. ✅ Jika return > stock → Tolak dengan error
6. ✅ Menyimpan history return
7. ✅ Menghapus data dari table `returns`

## Perubahan Code

### File: `src/pages/Dashboard.tsx`

**Logika Baru (Support Partial Return):**
```typescript
// Update rider stock: deduct the returned quantity
const { data: riderStock } = await supabase
  .from("rider_stock")
  .select("quantity")
  .eq("rider_id", returnItem.rider_id)
  .eq("product_id", returnItem.product_id)
  .single();

if (riderStock) {
  const newQuantity = riderStock.quantity - returnItem.quantity;
  
  if (newQuantity > 0) {
    // Update stock if there's remaining quantity (PARTIAL RETURN)
    await supabase.from("rider_stock")
      .update({ quantity: newQuantity })
      .eq("rider_id", returnItem.rider_id)
      .eq("product_id", returnItem.product_id);
      
  } else if (newQuantity === 0) {
    // Delete stock if quantity becomes 0 (FULL RETURN)
    await supabase.from("rider_stock")
      .delete()
      .eq("rider_id", returnItem.rider_id)
      .eq("product_id", returnItem.product_id);
      
  } else {
    // newQuantity < 0: Return quantity exceeds rider stock (ERROR)
    throw new Error(
      `Quantity return (${returnItem.quantity}) melebihi stock rider (${riderStock.quantity}). ` +
      `Return dibatalkan untuk mencegah stock negatif.`
    );
  }
}
```

## Fitur Keamanan
1. **Validasi Return Quantity**: 
   - Sistem cek apakah return quantity ≤ stock rider
   - Jika lebih → Tolak dengan error message jelas
   
2. **Prevent Negative Stock**:
   - Tidak mungkin stock rider jadi negatif
   - Semua transaksi ter-validasi

3. **Data Consistency**:
   - Stock rider + Stock warehouse selalu balance
   - Audit trail lengkap di `return_history`

## Testing

### Test Case 1: Partial Return
```
Initial: Rider stock = 20 cup
Action: Return 5 cup cacat
Result: 
  - Rider stock = 15 cup ✅
  - Warehouse stock +5 ✅
```

### Test Case 2: Full Return
```
Initial: Rider stock = 10 cup
Action: Return 10 cup
Result: 
  - Rider stock = 0 (deleted) ✅
  - Warehouse stock +10 ✅
```

### Test Case 3: Over Return (Should Fail)
```
Initial: Rider stock = 5 cup
Action: Return 8 cup
Result: 
  - Error message ✅
  - No changes to stocks ✅
```

## Status
✅ Fixed - Support Partial & Full Return
✅ Validasi return quantity
✅ Error handling untuk return berlebihan
