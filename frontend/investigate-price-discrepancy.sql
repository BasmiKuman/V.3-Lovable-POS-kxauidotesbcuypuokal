-- INVESTIGASI: Discrepancy Nominal Uang
-- Kasus: Zulfian - Sistem: 284rb, Manual: 286rb (selisih 2rb)
-- Produk terjual: SAMA ✓, Stok akhir: SAMA ✓, Nominal: BEDA ✗

-- ============================================
-- STEP 1: CARI USER_ID ZULFIAN
-- ============================================
SELECT 
    id,
    full_name,
    email
FROM profiles
WHERE LOWER(full_name) LIKE '%zulfian%'
ORDER BY full_name;

-- COPY USER_ID ZULFIAN, GANTI DI QUERY BAWAH

-- ============================================
-- STEP 2: SEMUA TRANSAKSI ZULFIAN HARI INI
-- ============================================
SELECT 
    t.id as transaction_id,
    t.created_at::time as waktu,
    t.subtotal,
    t.tax_amount,
    t.total_amount,
    t.payment_method,
    COUNT(ti.id) as jumlah_item
FROM transactions t
LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
WHERE t.rider_id = 'PASTE_USER_ID_ZULFIAN_DISINI'
AND DATE(t.created_at) = CURRENT_DATE
GROUP BY t.id, t.created_at, t.subtotal, t.tax_amount, t.total_amount, t.payment_method
ORDER BY t.created_at ASC;

-- ============================================
-- STEP 3: DETAIL SETIAP ITEM DENGAN HARGA
-- ============================================
SELECT 
    t.id as transaction_id,
    t.created_at::time as waktu,
    p.name as product_name,
    ti.quantity,
    ti.price as harga_saat_transaksi,
    p.price as harga_produk_sekarang,
    (ti.quantity * ti.price) as subtotal_item,
    CASE 
        WHEN ti.price != p.price THEN 'HARGA BEDA'
        ELSE 'OK'
    END as status_harga
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transaction_id
JOIN products p ON ti.product_id = p.id
WHERE t.rider_id = 'PASTE_USER_ID_ZULFIAN_DISINI'
AND DATE(t.created_at) = CURRENT_DATE
ORDER BY t.created_at ASC, p.name;

-- ============================================
-- STEP 4: TOTAL NOMINAL MENURUT SISTEM
-- ============================================
SELECT 
    SUM(t.subtotal) as total_subtotal,
    SUM(t.tax_amount) as total_tax,
    SUM(t.total_amount) as total_amount_sistem
FROM transactions t
WHERE t.rider_id = 'PASTE_USER_ID_ZULFIAN_DISINI'
AND DATE(t.created_at) = CURRENT_DATE;

-- ============================================
-- STEP 5: KALKULASI ULANG DARI TRANSACTION_ITEMS
-- ============================================
SELECT 
    SUM(ti.quantity * ti.price) as total_dari_items,
    COUNT(DISTINCT t.id) as jumlah_transaksi,
    SUM(ti.quantity) as total_quantity
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transaction_id
WHERE t.rider_id = 'PASTE_USER_ID_ZULFIAN_DISINI'
AND DATE(t.created_at) = CURRENT_DATE;

-- ============================================
-- STEP 6: KALKULASI MANUAL (HARGA SEKARANG)
-- ============================================
-- Ini kalkulasi jika pakai harga produk yang sekarang
SELECT 
    SUM(ti.quantity * p.price) as total_manual_harga_sekarang,
    COUNT(DISTINCT t.id) as jumlah_transaksi
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transaction_id
JOIN products p ON ti.product_id = p.id
WHERE t.rider_id = 'PASTE_USER_ID_ZULFIAN_DISINI'
AND DATE(t.created_at) = CURRENT_DATE;

-- ============================================
-- STEP 7: CARI TRANSAKSI DENGAN HARGA ANOMALI
-- ============================================
SELECT 
    t.id as transaction_id,
    t.created_at::time as waktu,
    p.name as product_name,
    ti.quantity,
    ti.price as harga_transaksi,
    p.price as harga_seharusnya,
    (p.price - ti.price) as selisih_harga,
    (ti.quantity * (p.price - ti.price)) as selisih_total
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transaction_id
JOIN products p ON ti.product_id = p.id
WHERE t.rider_id = 'PASTE_USER_ID_ZULFIAN_DISINI'
AND DATE(t.created_at) = CURRENT_DATE
AND ti.price != p.price
ORDER BY t.created_at ASC;

-- ============================================
-- STEP 8: CEK TAX CALCULATION
-- ============================================
SELECT 
    t.id,
    t.created_at::time as waktu,
    t.subtotal,
    t.tax_amount,
    t.total_amount,
    (t.subtotal + t.tax_amount) as kalkulasi_ulang_total,
    CASE 
        WHEN (t.subtotal + t.tax_amount) != t.total_amount THEN 'TAX SALAH'
        ELSE 'OK'
    END as status_tax
FROM transactions t
WHERE t.rider_id = 'PASTE_USER_ID_ZULFIAN_DISINI'
AND DATE(t.created_at) = CURRENT_DATE
ORDER BY t.created_at ASC;

-- ============================================
-- STEP 9: SUMMARY DISCREPANCY
-- ============================================
WITH sistem AS (
    SELECT SUM(t.total_amount) as total_sistem
    FROM transactions t
    WHERE t.rider_id = 'PASTE_USER_ID_ZULFIAN_DISINI'
    AND DATE(t.created_at) = CURRENT_DATE
),
items AS (
    SELECT SUM(ti.quantity * ti.price) as total_items
    FROM transactions t
    JOIN transaction_items ti ON t.id = ti.transaction_id
    WHERE t.rider_id = 'PASTE_USER_ID_ZULFIAN_DISINI'
    AND DATE(t.created_at) = CURRENT_DATE
),
manual AS (
    SELECT SUM(ti.quantity * p.price) as total_manual
    FROM transactions t
    JOIN transaction_items ti ON t.id = ti.transaction_id
    JOIN products p ON ti.product_id = p.id
    WHERE t.rider_id = 'PASTE_USER_ID_ZULFIAN_DISINI'
    AND DATE(t.created_at) = CURRENT_DATE
)
SELECT 
    s.total_sistem as total_sistem_dengan_tax,
    i.total_items as total_dari_items,
    m.total_manual as total_manual_harga_sekarang,
    (m.total_manual - i.total_items) as selisih,
    CASE 
        WHEN m.total_manual != i.total_items THEN 'HARGA PRODUK BERUBAH'
        ELSE 'Harga Konsisten'
    END as diagnosis
FROM sistem s, items i, manual m;
