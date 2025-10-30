-- Fix: has_pending_return parameter names to match frontend calls
-- Frontend calls with: product_id, rider_id
-- Function must have exact same parameter names (without p_ prefix)

-- Drop the old function
DROP FUNCTION IF EXISTS has_pending_return(UUID, UUID);

-- Create function with correct parameter names (no p_ prefix)
CREATE OR REPLACE FUNCTION has_pending_return(product_id UUID, rider_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check in 'returns' table for pending returns
    RETURN EXISTS (
        SELECT 1 
        FROM returns 
        WHERE returns.product_id = has_pending_return.product_id 
          AND returns.rider_id = has_pending_return.rider_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant all necessary permissions
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO postgres;
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO service_role;

-- Verify function created successfully
SELECT 
  'Function created with correct parameter names' as status,
  routine_name,
  string_agg(parameter_name, ', ' ORDER BY ordinal_position) as parameters,
  r.data_type as return_type
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p 
  ON r.specific_name = p.specific_name
WHERE routine_name = 'has_pending_return'
  AND routine_schema = 'public'
GROUP BY routine_name, r.data_type;

-- Test the function
SELECT has_pending_return(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid
) as test_result;

-- Show complete function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'has_pending_return';
