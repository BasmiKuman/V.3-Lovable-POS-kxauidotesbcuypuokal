-- QUICK CHECK: Rizki Salted Caramel Bug
-- Jalankan satu per satu untuk melihat hasilnya

-- 1️⃣ CARI RIZKI USER ID
SELECT 
    id,
    full_name,
    email
FROM profiles
WHERE LOWER(full_name) LIKE '%rizki%'
ORDER BY full_name;

-- COPY USER_ID RIZKI DARI HASIL ATAS, LALU GANTI DI QUERY BAWAH
-- Ganti 'PASTE_USER_ID_RIZKI_DISINI' dengan ID yang sebenarnya

-- 2️⃣ TOTAL SALTED CARAMEL TERJUAL HARI INI
SELECT 
    SUM(ti.quantity) as total_terjual
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transaction_id
JOIN products p ON ti.product_id = p.id
WHERE t.rider_id = 'PASTE_USER_ID_RIZKI_DISINI'
AND DATE(t.created_at) = CURRENT_DATE
AND LOWER(p.name) LIKE '%salted%caramel%';

-- 3️⃣ SISA STOK SALTED CARAMEL RIZKI SEKARANG
SELECT 
    rs.quantity as sisa_stok
FROM rider_stock rs
JOIN products p ON rs.product_id = p.id
WHERE rs.rider_id = 'PASTE_USER_ID_RIZKI_DISINI'
AND LOWER(p.name) LIKE '%salted%caramel%';

-- 4️⃣ KALKULASI STOK AWAL (Terjual + Sisa)
-- Hasil dari query 2 + query 3 = Stok Awal
-- Contoh: Jika terjual 12 dan sisa 3, maka stok awal = 15
-- Contoh: Jika terjual 9 dan sisa 3, maka stok awal = 12
