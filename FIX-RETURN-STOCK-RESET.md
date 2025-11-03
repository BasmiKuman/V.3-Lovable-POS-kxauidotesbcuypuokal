# Fix: Return Product Stock Reset

## Masalah
Ketika admin menyetujui return product dari rider, stock di rider tidak ter-reset ke 0. Sehingga ketika admin melakukan distribusi baru, rider menerima stock baru **ditambah** dengan stock lama yang seharusnya sudah dikembalikan.

## Contoh Kasus
1. Rider memiliki 10 cup produk A
2. Rider melakukan return 10 cup produk A
3. Admin menyetujui return
4. Stock rider untuk produk A seharusnya jadi 0
5. **BUG**: Stock rider masih ada (tidak ter-reset)
6. Saat distribusi baru 20 cup, rider dapat 20 + 10 (sisa lama) = 30 cup ❌

## Solusi
Ketika admin menyetujui return product, sistem akan:
1. Menambah stock warehouse dengan quantity yang dikembalikan ✅
2. **MENGHAPUS TOTAL** stock rider untuk produk tersebut (bukan mengurangi) ✅
3. Menyimpan history return ✅
4. Menghapus data dari table returns ✅

## Perubahan Code

### File: `src/pages/Dashboard.tsx`

**Sebelum:**
```typescript
// Update rider stock (deduct returned quantity)
const { data: riderStock } = await supabase
  .from("rider_stock")
  .select("quantity")
  .eq("rider_id", returnItem.rider_id)
  .eq("product_id", returnItem.product_id)
  .single();

if (riderStock) {
  const newQuantity = riderStock.quantity - returnItem.quantity;
  if (newQuantity > 0) {
    // Update dengan quantity baru
    await supabase.from("rider_stock").update({ quantity: newQuantity })...
  } else {
    // Delete jika 0
    await supabase.from("rider_stock").delete()...
  }
}
```

**Sesudah:**
```typescript
// Delete rider stock completely (return means rider has 0 stock for this product)
const { error: deleteStockError } = await supabase
  .from("rider_stock")
  .delete()
  .eq("rider_id", returnItem.rider_id)
  .eq("product_id", returnItem.product_id);
```

## Alasan Perubahan
Ketika rider melakukan return product, artinya mereka mengembalikan **SEMUA** stock yang mereka punya untuk produk tersebut. Tidak ada konsep "partial return" dalam sistem ini.

Jadi pendekatan yang benar adalah:
- ❌ Mengurangi stock rider berdasarkan quantity return
- ✅ Menghapus total stock rider untuk produk yang di-return

## Testing
1. Rider return product → Admin approve
2. Cek table `rider_stock` → Tidak ada data untuk product yang di-return
3. Admin distribusi baru → Rider dapat stock baru saja (tidak ada penambahan stock lama)

## Status
✅ Fixed - Deployed
