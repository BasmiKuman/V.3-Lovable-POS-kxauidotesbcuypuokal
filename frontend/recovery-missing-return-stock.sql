-- Script untuk recovery stock dari returns yang sudah approved tapi belum update stock gudang
-- Run this ONCE di Supabase SQL Editor untuk memperbaiki data lama

-- STEP 1: Lihat dulu returns mana yang sudah approved dan belum ada di return_history
SELECT 
    r.id,
    r.product_id,
    r.rider_id,
    r.quantity,
    r.notes,
    r.returned_at,
    r.approved_at,
    r.approved_by,
    p.name as product_name,
    p.stock as current_stock,
    prof.full_name as rider_name
FROM returns r
LEFT JOIN products p ON p.id = r.product_id
LEFT JOIN profiles prof ON prof.user_id = r.rider_id
WHERE r.status = 'approved'
AND NOT EXISTS (
    SELECT 1 FROM return_history rh
    WHERE rh.rider_id = r.rider_id
    AND rh.product_id = r.product_id
    AND rh.quantity = r.quantity
    AND rh.returned_at = r.returned_at
)
ORDER BY r.returned_at DESC;

-- STEP 2: Kalau data di atas ada, jalankan script ini untuk recovery
-- WARNING: Backup dulu sebelum jalankan!

-- 2a. Update stock gudang (tambah quantity dari approved returns)
UPDATE products p
SET stock = p.stock + subquery.total_quantity
FROM (
    SELECT 
        r.product_id,
        SUM(r.quantity) as total_quantity
    FROM returns r
    WHERE r.status = 'approved'
    AND NOT EXISTS (
        SELECT 1 FROM return_history rh
        WHERE rh.rider_id = r.rider_id
        AND rh.product_id = r.product_id
        AND rh.quantity = r.quantity
        AND rh.returned_at = r.returned_at
    )
    GROUP BY r.product_id
) subquery
WHERE p.id = subquery.product_id;

-- 2b. Copy approved returns ke return_history
INSERT INTO return_history (
    rider_id,
    product_id,
    quantity,
    notes,
    returned_at,
    approved_at,
    approved_by,
    status
)
SELECT 
    r.rider_id,
    r.product_id,
    r.quantity,
    r.notes,
    r.returned_at,
    r.approved_at,
    r.approved_by,
    r.status
FROM returns r
WHERE r.status = 'approved'
AND NOT EXISTS (
    SELECT 1 FROM return_history rh
    WHERE rh.rider_id = r.rider_id
    AND rh.product_id = r.product_id
    AND rh.quantity = r.quantity
    AND rh.returned_at = r.returned_at
);

-- 2c. Opsional: Delete approved returns dari table returns (karena sudah di return_history)
-- UNCOMMENT jika mau bersihkan table returns
-- DELETE FROM returns WHERE status = 'approved';

-- STEP 3: Verify hasil recovery
SELECT 
    p.id,
    p.name,
    p.stock as current_stock,
    COALESCE(SUM(rh.quantity), 0) as total_returned
FROM products p
LEFT JOIN return_history rh ON rh.product_id = p.id
GROUP BY p.id, p.name, p.stock
ORDER BY p.name;

-- Done! Stock gudang sekarang sudah include returns yang sebelumnya hilang
