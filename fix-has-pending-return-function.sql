-- Fix has_pending_return function to filter by status = 'pending'
-- This ensures that only pending returns are checked, not approved/rejected ones
-- Run this in Supabase SQL Editor

-- Drop the old function
DROP FUNCTION IF EXISTS has_pending_return(UUID, UUID);

-- Create improved function that filters by status
CREATE OR REPLACE FUNCTION has_pending_return(p_product_id UUID, p_rider_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check in 'returns' table for ONLY pending returns
    -- This prevents false positives from approved/rejected returns that might still be in the table
    RETURN EXISTS (
        SELECT 1 
        FROM returns 
        WHERE product_id = p_product_id 
          AND rider_id = p_rider_id
          AND status = 'pending'  -- ✅ Only check pending returns
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO anon;

-- Also update get_pending_return_info to filter by status
DROP FUNCTION IF EXISTS get_pending_return_info(UUID, UUID);

CREATE OR REPLACE FUNCTION get_pending_return_info(p_product_id UUID, p_rider_id UUID)
RETURNS TABLE (
    id UUID,
    quantity INTEGER,
    returned_at TIMESTAMPTZ,
    notes TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.quantity,
        r.returned_at,
        r.notes,
        r.status
    FROM returns r
    WHERE r.product_id = p_product_id 
      AND r.rider_id = p_rider_id 
      AND r.status = 'pending'  -- ✅ Only get pending returns
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_pending_return_info(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_return_info(UUID, UUID) TO anon;

-- Verify the functions are created
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('has_pending_return', 'get_pending_return_info')
ORDER BY routine_name;

-- Test: Check for any non-pending returns that might cause issues
SELECT 
    r.id,
    r.product_id,
    r.rider_id,
    r.status,
    r.quantity,
    r.returned_at,
    p.name as product_name
FROM returns r
LEFT JOIN products p ON r.product_id = p.id
WHERE r.status != 'pending' OR r.status IS NULL
ORDER BY r.returned_at DESC;

-- Clean up any old approved/rejected returns that should have been deleted
-- (Only if you want to clean up old data - BE CAREFUL!)
-- DELETE FROM returns WHERE status IN ('approved', 'rejected');

-- Test the function with a pending return
SELECT 
    product_id,
    rider_id,
    has_pending_return(product_id, rider_id) as has_pending
FROM returns 
WHERE status = 'pending'
LIMIT 5;
