-- Script untuk manual fix return yang sudah di-approve tapi stock rider belum berkurang
-- HANYA JALANKAN JIKA MENGGUNAKAN APK LAMA (sebelum fix)

-- Step 1: Cek return history yang sudah approved tapi stock rider belum dikurangi
SELECT 
    rh.id,
    rh.product_id,
    rh.rider_id,
    rh.quantity as returned_qty,
    p.name as product_name,
    pr.full_name as rider_name,
    rs.quantity as current_rider_stock,
    rh.approved_at,
    rh.status
FROM return_history rh
LEFT JOIN products p ON p.id = rh.product_id
LEFT JOIN profiles pr ON pr.id = rh.rider_id
LEFT JOIN rider_stock rs ON rs.rider_id = rh.rider_id AND rs.product_id = rh.product_id
WHERE rh.status = 'approved'
  AND rh.approved_at > NOW() - INTERVAL '1 day'  -- Return 24 jam terakhir
  AND rs.quantity IS NOT NULL  -- Masih ada stock di rider
ORDER BY rh.approved_at DESC;

-- Step 2: Manual fix - Kurangi stock rider sesuai return yang sudah approved
-- GANTI rider_id dan product_id sesuai hasil query di atas
DO $$
DECLARE
    rec RECORD;
    new_qty INTEGER;
BEGIN
    -- Loop semua return yang approved tapi stock belum dikurangi
    FOR rec IN 
        SELECT 
            rh.rider_id,
            rh.product_id,
            rh.quantity as returned_qty,
            rs.quantity as current_stock
        FROM return_history rh
        INNER JOIN rider_stock rs ON rs.rider_id = rh.rider_id AND rs.product_id = rh.product_id
        WHERE rh.status = 'approved'
          AND rh.approved_at > NOW() - INTERVAL '1 day'
    LOOP
        -- Hitung stock baru
        new_qty := rec.current_stock - rec.returned_qty;
        
        RAISE NOTICE 'Rider: %, Product: %, Current: %, Returned: %, New: %', 
            rec.rider_id, rec.product_id, rec.current_stock, rec.returned_qty, new_qty;
        
        IF new_qty > 0 THEN
            -- Update jika masih ada sisa
            UPDATE rider_stock 
            SET quantity = new_qty
            WHERE rider_id = rec.rider_id 
              AND product_id = rec.product_id;
            
            RAISE NOTICE 'Updated stock to %', new_qty;
            
        ELSIF new_qty = 0 THEN
            -- Delete jika stock jadi 0
            DELETE FROM rider_stock 
            WHERE rider_id = rec.rider_id 
              AND product_id = rec.product_id;
              
            RAISE NOTICE 'Deleted stock (quantity was 0)';
            
        ELSE
            -- Jangan ubah jika negatif (data error)
            RAISE WARNING 'SKIP - Would result in negative stock: %', new_qty;
        END IF;
    END LOOP;
END $$;

-- Step 3: Verifikasi hasil fix
SELECT 
    rh.id,
    p.name as product_name,
    pr.full_name as rider_name,
    rh.quantity as returned_qty,
    rs.quantity as remaining_stock,
    CASE 
        WHEN rs.quantity IS NULL THEN 'Stock deleted (OK)'
        WHEN rs.quantity >= 0 THEN 'Stock updated (OK)'
        ELSE 'ERROR: Negative stock!'
    END as status
FROM return_history rh
LEFT JOIN products p ON p.id = rh.product_id
LEFT JOIN profiles pr ON pr.id = rh.rider_id
LEFT JOIN rider_stock rs ON rs.rider_id = rh.rider_id AND rs.product_id = rh.product_id
WHERE rh.status = 'approved'
  AND rh.approved_at > NOW() - INTERVAL '1 day'
ORDER BY rh.approved_at DESC;
