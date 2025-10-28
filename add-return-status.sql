-- Add status column to return_history and create function to check pending returns
-- Run this in Supabase SQL Editor

-- 1. Add status column to return_history if not exists (for history tracking)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'return_history' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE return_history 
        ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- 2. Update existing records to have 'approved' status
UPDATE return_history 
SET status = 'approved' 
WHERE status IS NULL;

-- 3. Create function to check if a product has pending returns for a rider
-- NOTE: We check the 'returns' table, not 'return_history'
-- 'returns' = pending returns waiting for approval
-- 'return_history' = approved/completed returns
CREATE OR REPLACE FUNCTION has_pending_return(p_product_id UUID, p_rider_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check in 'returns' table for pending returns
    RETURN EXISTS (
        SELECT 1 
        FROM returns 
        WHERE product_id = p_product_id 
          AND rider_id = p_rider_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to get pending return details
CREATE OR REPLACE FUNCTION get_pending_return_info(p_product_id UUID, p_rider_id UUID)
RETURNS TABLE (
    id UUID,
    quantity INTEGER,
    returned_at TIMESTAMPTZ,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.quantity,
        r.returned_at,
        r.notes
    FROM returns r
    WHERE r.product_id = p_product_id 
      AND r.rider_id = p_rider_id 
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create index for faster queries on returns table
CREATE INDEX IF NOT EXISTS idx_returns_product_rider 
ON returns(product_id, rider_id);

-- 6. Create index on return_history for status tracking
CREATE INDEX IF NOT EXISTS idx_return_history_status 
ON return_history(product_id, rider_id, status);

-- 7. Verify the changes
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'return_history' 
  AND column_name = 'status';

-- 8. Test the function (should return true if you have pending returns)
SELECT has_pending_return(
    (SELECT product_id FROM returns LIMIT 1),
    (SELECT rider_id FROM returns LIMIT 1)
) as "Has Pending Return Test";

-- 9. Show all pending returns to verify
SELECT 
    r.id,
    p.name as product_name,
    pr.full_name as rider_name,
    r.quantity,
    r.notes,
    r.returned_at
FROM returns r
JOIN products p ON r.product_id = p.id
JOIN profiles pr ON r.rider_id = pr.user_id
ORDER BY r.returned_at DESC;
