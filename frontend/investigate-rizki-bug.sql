-- INVESTIGASI BUG: Rizki Hari Saputra - Salted Caramel
-- Menjual 12pcs, sisa stok 3pcs, tapi laporan hanya 9
-- Expected: 12 terjual, Actual: 9 terjual (selisih 3)

-- ============================================
-- STEP 1: CARI USER_ID RIZKI
-- ============================================
SELECT 
    id as user_id,
    full_name,
    email
FROM profiles
WHERE LOWER(full_name) LIKE '%rizki%hari%'
   OR LOWER(full_name) LIKE '%rizki%saputra%';

-- ============================================
-- STEP 2: SEMUA TRANSAKSI RIZKI HARI INI
-- ============================================
SELECT 
    t.id as transaction_id,
    t.created_at,
    t.total_amount,
    t.payment_method,
    COUNT(ti.id) as total_items,
    SUM(ti.quantity) as total_quantity
FROM transactions t
LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
WHERE t.rider_id = (
    SELECT id FROM profiles 
    WHERE LOWER(full_name) LIKE '%rizki%hari%' 
    LIMIT 1
)
AND DATE(t.created_at) = CURRENT_DATE
GROUP BY t.id, t.created_at, t.total_amount, t.payment_method
ORDER BY t.created_at DESC;

-- ============================================
-- STEP 3: DETAIL SEMUA ITEM YANG DIJUAL (TERMASUK SALTED CARAMEL)
-- ============================================
SELECT 
    t.id as transaction_id,
    TO_CHAR(t.created_at, 'HH24:MI:SS') as waktu,
    p.name as product_name,
    c.name as category_name,
    ti.quantity,
    ti.price,
    (ti.quantity * ti.price) as subtotal,
    CASE 
        WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') THEN 'TIDAK DIHITUNG'
        ELSE 'DIHITUNG SEBAGAI CUP'
    END as status_perhitungan
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transaction_id
JOIN products p ON ti.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE t.rider_id = (
    SELECT id FROM profiles 
    WHERE LOWER(full_name) LIKE '%rizki%hari%' 
    LIMIT 1
)
AND DATE(t.created_at) = CURRENT_DATE
ORDER BY t.created_at DESC, p.name;

-- ============================================
-- STEP 4: FOKUS PADA SALTED CARAMEL SAJA
-- ============================================
SELECT 
    t.id as transaction_id,
    TO_CHAR(t.created_at, 'HH24:MI:SS') as waktu,
    p.name as product_name,
    ti.quantity as qty_terjual,
    ti.price,
    (ti.quantity * ti.price) as subtotal
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transaction_id
JOIN products p ON ti.product_id = p.id
WHERE t.rider_id = (
    SELECT id FROM profiles 
    WHERE LOWER(full_name) LIKE '%rizki%hari%' 
    LIMIT 1
)
AND DATE(t.created_at) = CURRENT_DATE
AND LOWER(p.name) LIKE '%salted%caramel%'
ORDER BY t.created_at DESC;

-- ============================================
-- STEP 5: TOTAL SALTED CARAMEL TERJUAL
-- ============================================
SELECT 
    p.name as product_name,
    SUM(ti.quantity) as total_terjual,
    COUNT(DISTINCT t.id) as jumlah_transaksi,
    STRING_AGG(ti.quantity::text, ' + ' ORDER BY t.created_at) as breakdown_per_transaksi
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transaction_id
JOIN products p ON ti.product_id = p.id
WHERE t.rider_id = (
    SELECT id FROM profiles 
    WHERE LOWER(full_name) LIKE '%rizki%hari%' 
    LIMIT 1
)
AND DATE(t.created_at) = CURRENT_DATE
AND LOWER(p.name) LIKE '%salted%caramel%'
GROUP BY p.name;

-- ============================================
-- STEP 6: CEK RIDER_STOCK RIZKI (SISA STOK SAAT INI)
-- ============================================
SELECT 
    p.name as product_name,
    rs.quantity as sisa_stok_sekarang,
    TO_CHAR(rs.updated_at, 'YYYY-MM-DD HH24:MI:SS') as terakhir_update
FROM rider_stock rs
JOIN products p ON rs.product_id = p.id
WHERE rs.rider_id = (
    SELECT id FROM profiles 
    WHERE LOWER(full_name) LIKE '%rizki%hari%' 
    LIMIT 1
)
AND LOWER(p.name) LIKE '%salted%caramel%';

-- ============================================
-- STEP 7: HITUNG ULANG LOGIKA STOK
-- ============================================
-- Formula: STOK_AWAL = TOTAL_TERJUAL + SISA_STOK_SEKARANG
WITH rizki_user AS (
    SELECT id FROM profiles 
    WHERE LOWER(full_name) LIKE '%rizki%hari%' 
    LIMIT 1
),
salted_sold AS (
    SELECT 
        COALESCE(SUM(ti.quantity), 0) as total_terjual
    FROM transactions t
    JOIN transaction_items ti ON t.id = ti.transaction_id
    JOIN products p ON ti.product_id = p.id
    WHERE t.rider_id = (SELECT id FROM rizki_user)
    AND DATE(t.created_at) = CURRENT_DATE
    AND LOWER(p.name) LIKE '%salted%caramel%'
),
salted_stock AS (
    SELECT 
        COALESCE(rs.quantity, 0) as sisa_stok
    FROM rider_stock rs
    JOIN products p ON rs.product_id = p.id
    WHERE rs.rider_id = (SELECT id FROM rizki_user)
    AND LOWER(p.name) LIKE '%salted%caramel%'
)
SELECT 
    ss.total_terjual as "Total Terjual (dari transaksi)",
    st.sisa_stok as "Sisa Stok Sekarang (dari rider_stock)",
    (ss.total_terjual + st.sisa_stok) as "Stok Awal (Kalkulasi)",
    CASE 
        WHEN (ss.total_terjual + st.sisa_stok) = 12 THEN '✅ BENAR (12 = 9 + 3)'
        WHEN (ss.total_terjual + st.sisa_stok) = 15 THEN '✅ BENAR (15 = 12 + 3)'
        ELSE '❌ ADA YANG SALAH!'
    END as "Status Verifikasi"
FROM salted_sold ss, salted_stock st;

-- ============================================
-- STEP 8: CEK APAKAH ADA TRANSAKSI YANG DIHAPUS/DIUBAH
-- ============================================
-- Cek apakah ada return/reject untuk Salted Caramel hari ini
SELECT 
    'RETURN' as type,
    r.id,
    p.name as product_name,
    r.quantity,
    r.status,
    TO_CHAR(r.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM returns r
JOIN products p ON r.product_id = p.id
WHERE r.rider_id = (
    SELECT id FROM profiles 
    WHERE LOWER(full_name) LIKE '%rizki%hari%' 
    LIMIT 1
)
AND DATE(r.created_at) = CURRENT_DATE
AND LOWER(p.name) LIKE '%salted%caramel%'

UNION ALL

SELECT 
    'REJECT' as type,
    rj.id,
    p.name as product_name,
    rj.quantity,
    'pending' as status,
    TO_CHAR(rj.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM rejects rj
JOIN products p ON rj.product_id = p.id
WHERE rj.rider_id = (
    SELECT id FROM profiles 
    WHERE LOWER(full_name) LIKE '%rizki%hari%' 
    LIMIT 1
)
AND DATE(rj.created_at) = CURRENT_DATE
AND LOWER(p.name) LIKE '%salted%caramel%';

-- ============================================
-- STEP 9: CEK TOTAL CUP RIZKI (UNTUK LAPORAN)
-- ============================================
SELECT 
    COUNT(DISTINCT t.id) as jumlah_transaksi,
    SUM(CASE 
        WHEN LOWER(c.name) NOT IN ('add on', 'addon', 'add-on') 
        THEN ti.quantity 
        ELSE 0 
    END) as total_cups_terhitung,
    SUM(ti.quantity) as total_items_semua,
    SUM(CASE 
        WHEN LOWER(c.name) IN ('add on', 'addon', 'add-on') 
        THEN ti.quantity 
        ELSE 0 
    END) as total_addon_dikecualikan
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transaction_id
JOIN products p ON ti.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE t.rider_id = (
    SELECT id FROM profiles 
    WHERE LOWER(full_name) LIKE '%rizki%hari%' 
    LIMIT 1
)
AND DATE(t.created_at) = CURRENT_DATE;

-- ============================================
-- STEP 10: SUMMARY & DIAGNOSIS
-- ============================================
SELECT 
    '=== DIAGNOSIS BUG ===' as info,
    '' as detail
UNION ALL
SELECT 
    'Yang Anda Laporkan:' as info,
    '- Jual: 12 pcs Salted Caramel' as detail
UNION ALL
SELECT 
    '' as info,
    '- Sisa Stok: 3 pcs' as detail
UNION ALL
SELECT 
    '' as info,
    '- Laporan: Hanya 9 terjual' as detail
UNION ALL
SELECT 
    '' as info,
    '' as detail
UNION ALL
SELECT 
    'Kemungkinan Penyebab:' as info,
    '' as detail
UNION ALL
SELECT 
    '1.' as info,
    'Transaksi 12 pcs dipecah jadi beberapa transaksi' as detail
UNION ALL
SELECT 
    '2.' as info,
    'Ada transaksi yang belum masuk sistem' as detail
UNION ALL
SELECT 
    '3.' as info,
    'Ada return/reject yang belum diproses' as detail
UNION ALL
SELECT 
    '4.' as info,
    'Stok awal Rizki bukan 12, tapi lebih banyak' as detail
UNION ALL
SELECT 
    '5.' as info,
    'Bug di frontend saat input transaksi' as detail;
