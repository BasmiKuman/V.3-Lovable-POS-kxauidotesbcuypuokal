-- Prevent duplicate entries in return_history table
-- This script adds a unique constraint to prevent the same return from being recorded twice

-- Step 1: First, clean up any existing duplicates (keep the earliest entry)
-- This uses the cleanup script logic
DELETE FROM return_history
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY product_id, rider_id, quantity, returned_at, approved_by 
        ORDER BY approved_at ASC
      ) AS rn
    FROM return_history
  ) t
  WHERE rn > 1
);

-- Step 2: Add a unique constraint to prevent future duplicates
-- We use product_id, rider_id, and returned_at as the unique combination
-- This allows the same rider to return the same product multiple times on different dates
CREATE UNIQUE INDEX IF NOT EXISTS idx_return_history_unique 
ON return_history(product_id, rider_id, returned_at);

-- Step 3: Verify there are no duplicates remaining
SELECT 
  product_id,
  rider_id,
  returned_at,
  COUNT(*) as count
FROM return_history
GROUP BY product_id, rider_id, returned_at
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 4: Show summary of return history with status
SELECT 
  COUNT(*) as total_returns,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN status IS NULL THEN 1 END) as no_status_count
FROM return_history;

-- Step 5: Display return history with full information
SELECT 
  rh.id,
  p.name as product_name,
  pr.full_name as rider_name,
  rh.quantity,
  rh.status,
  rh.notes,
  rh.returned_at,
  rh.approved_at,
  pa.full_name as approved_by_name
FROM return_history rh
LEFT JOIN products p ON rh.product_id = p.id
LEFT JOIN profiles pr ON rh.rider_id = pr.user_id
LEFT JOIN profiles pa ON rh.approved_by = pa.user_id
ORDER BY rh.returned_at DESC
LIMIT 20;
