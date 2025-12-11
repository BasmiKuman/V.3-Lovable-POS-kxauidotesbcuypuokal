-- CEK DETAIL TRANSAKSI BERMASALAH
-- Transaction ID: 7e325c34-f7be-41c1-a4d1-4e7ca958f050

-- 1. Detail transaksi
SELECT 
    id,
    created_at,
    rider_id,
    subtotal,
    tax_amount,
    total_amount,
    payment_method
FROM transactions
WHERE id = '7e325c34-f7be-41c1-a4d1-4e7ca958f050';

-- 2. Items di transaksi ini
SELECT 
    ti.id,
    ti.transaction_id,
    p.name as product_name,
    ti.quantity,
    ti.price,
    ti.subtotal,
    (ti.quantity * ti.price) as kalkulasi_ulang_subtotal,
    CASE 
        WHEN ti.subtotal != (ti.quantity * ti.price) THEN 'SUBTOTAL ITEM SALAH'
        ELSE 'OK'
    END as status
FROM transaction_items ti
JOIN products p ON ti.product_id = p.id
WHERE ti.transaction_id = '7e325c34-f7be-41c1-a4d1-4e7ca958f050';

-- 3. Total dari items vs transaction
WITH items_total AS (
    SELECT 
        SUM(ti.subtotal) as total_dari_items_subtotal,
        SUM(ti.quantity * ti.price) as total_kalkulasi_ulang
    FROM transaction_items ti
    WHERE ti.transaction_id = '7e325c34-f7be-41c1-a4d1-4e7ca958f050'
),
trans AS (
    SELECT 
        subtotal as subtotal_transaction
    FROM transactions
    WHERE id = '7e325c34-f7be-41c1-a4d1-4e7ca958f050'
)
SELECT 
    i.total_dari_items_subtotal as "Total Items (kolom subtotal)",
    i.total_kalkulasi_ulang as "Total Items (kalkulasi ulang)",
    t.subtotal_transaction as "Subtotal Transaction",
    (i.total_dari_items_subtotal - t.subtotal_transaction) as "Selisih Items - Trans",
    CASE 
        WHEN i.total_dari_items_subtotal = t.subtotal_transaction THEN 'MATCH'
        ELSE 'TIDAK MATCH - ADA BUG!'
    END as status
FROM items_total i, trans t;

-- 4. Cek apakah ada transaksi lain dalam waktu bersamaan (± 1 detik)
SELECT 
    t.id,
    t.created_at,
    t.subtotal,
    t.total_amount,
    COUNT(ti.id) as jumlah_item
FROM transactions t
LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
WHERE t.rider_id = '48c98fe0-ad30-4868-aa00-b87f5c035861'
AND t.created_at BETWEEN 
    (SELECT created_at - INTERVAL '2 seconds' FROM transactions WHERE id = '7e325c34-f7be-41c1-a4d1-4e7ca958f050')
    AND 
    (SELECT created_at + INTERVAL '2 seconds' FROM transactions WHERE id = '7e325c34-f7be-41c1-a4d1-4e7ca958f050')
GROUP BY t.id, t.created_at, t.subtotal, t.total_amount
ORDER BY t.created_at;
