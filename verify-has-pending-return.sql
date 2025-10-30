-- Verify has_pending_return function exists and has correct permissions

-- 1. Check if function exists
SELECT 
  routine_name,
  routine_type,
  routine_schema,
  security_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'has_pending_return';

-- 2. Check function permissions
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'has_pending_return';

-- 3. Show complete function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'has_pending_return';

-- 4. If function doesn't exist, create it again
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

-- 5. Grant all necessary permissions
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO postgres;
GRANT EXECUTE ON FUNCTION has_pending_return(UUID, UUID) TO service_role;

-- 6. Verify again after creation
SELECT 
  'Function created successfully' as status,
  routine_name,
  security_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'has_pending_return';

-- 7. Test the function
SELECT has_pending_return(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid
) as test_result;
