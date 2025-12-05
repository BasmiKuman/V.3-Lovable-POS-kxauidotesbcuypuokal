-- Delete transactions that have no items (empty transactions)
-- Run this in Supabase SQL Editor

-- 1. First, check which transactions will be deleted (for verification)
SELECT 
    t.id as transaction_id,
    t.rider_id,
    p.full_name as rider_name,
    t.total_amount,
    t.payment_method,
    t.created_at,
    (SELECT COUNT(*) FROM transaction_items WHERE transaction_id = t.id) as item_count
FROM transactions t
LEFT JOIN profiles p ON p.user_id = t.rider_id
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_items 
    WHERE transaction_items.transaction_id = t.id
)
ORDER BY t.created_at DESC;

-- 2. If the above query shows the correct transactions (Muhammad Akila Pratama with 200,000),
--    uncomment and run this DELETE query:

/*
DELETE FROM transactions
WHERE id IN (
    SELECT t.id
    FROM transactions t
    WHERE NOT EXISTS (
        SELECT 1 FROM transaction_items 
        WHERE transaction_items.transaction_id = t.id
    )
    -- Optional: Add specific filter for the rider if needed
    -- AND t.rider_id = 'RIDER_UUID_HERE'
    -- Optional: Add date range filter
    -- AND t.created_at >= '2024-01-01' AND t.created_at < '2025-12-06'
);
*/

-- 3. After deletion, verify the result:
/*
SELECT 
    p.full_name as rider_name,
    COUNT(t.id) as transaction_count,
    SUM(t.total_amount) as total_sales
FROM transactions t
LEFT JOIN profiles p ON p.user_id = t.rider_id
GROUP BY p.full_name
ORDER BY p.full_name;
*/
