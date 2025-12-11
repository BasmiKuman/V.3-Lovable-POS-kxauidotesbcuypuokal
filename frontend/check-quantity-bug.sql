-- CEK APAKAH ADA POLA BUG PADA QUANTITY > 1

-- Semua transaksi Zulfian yang punya item dengan quantity > 1
SELECT 
    t.id as transaction_id,
    t.created_at::time as waktu,
    t.subtotal as subtotal_transaction,
    p.name as product_name,
    ti.quantity,
    ti.price,
    ti.subtotal as subtotal_item_db,
    (ti.quantity * ti.price) as subtotal_item_kalkulasi,
    CASE 
        WHEN ti.subtotal != (ti.quantity * ti.price) THEN 'BUG - SUBTOTAL ITEM SALAH'
        ELSE 'OK'
    END as status_subtotal_item
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transaction_id
JOIN products p ON ti.product_id = p.id
WHERE t.rider_id = '48c98fe0-ad30-4868-aa00-b87f5c035861'
AND DATE(t.created_at) = CURRENT_DATE
AND ti.quantity > 1
ORDER BY t.created_at ASC;

-- Cek apakah subtotal transaction match dengan sum items
WITH trans_items AS (
    SELECT 
        t.id as transaction_id,
        t.created_at::time as waktu,
        t.subtotal as subtotal_transaction,
        SUM(ti.subtotal) as total_items_subtotal,
        SUM(ti.quantity * ti.price) as total_items_kalkulasi,
        STRING_AGG(p.name || ' x' || ti.quantity::text, ', ') as items
    FROM transactions t
    JOIN transaction_items ti ON t.id = ti.transaction_id
    JOIN products p ON ti.product_id = p.id
    WHERE t.rider_id = '48c98fe0-ad30-4868-aa00-b87f5c035861'
    AND DATE(t.created_at) = CURRENT_DATE
    GROUP BY t.id, t.created_at, t.subtotal
)
SELECT 
    transaction_id,
    waktu,
    items,
    subtotal_transaction,
    total_items_subtotal,
    total_items_kalkulasi,
    (subtotal_transaction - total_items_subtotal) as selisih,
    CASE 
        WHEN subtotal_transaction != total_items_subtotal THEN 'BUG DITEMUKAN'
        ELSE 'OK'
    END as status
FROM trans_items
WHERE subtotal_transaction != total_items_subtotal
ORDER BY waktu;
