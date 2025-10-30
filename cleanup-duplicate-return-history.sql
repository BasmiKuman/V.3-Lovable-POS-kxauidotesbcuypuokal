-- Cleanup duplicate return history entries
-- This script will keep only the first occurrence of each duplicate

-- Step 1: Check for duplicates
SELECT 
  product_id,
  rider_id,
  quantity,
  returned_at,
  approved_by,
  COUNT(*) as duplicate_count
FROM return_history
GROUP BY product_id, rider_id, quantity, returned_at, approved_by
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Delete duplicates, keeping only the first (oldest) record
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

-- Step 3: Verify cleanup - should return no results
SELECT 
  product_id,
  rider_id,
  quantity,
  returned_at,
  approved_by,
  COUNT(*) as duplicate_count
FROM return_history
GROUP BY product_id, rider_id, quantity, returned_at, approved_by
HAVING COUNT(*) > 1;

-- Step 4: Show remaining records with status
SELECT 
  rh.id,
  p.name as product_name,
  pr.full_name as rider_name,
  rh.quantity,
  rh.status,
  rh.returned_at,
  rh.approved_at
FROM return_history rh
LEFT JOIN products p ON rh.product_id = p.id
LEFT JOIN profiles pr ON rh.rider_id = pr.user_id
ORDER BY rh.returned_at DESC;
