-- Verify has_pending_return function exists and permissions
SELECT 
  routine_name,
  routine_type,
  routine_schema,
  security_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'has_pending_return';

-- Check function permissions
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'has_pending_return';

-- Show function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'has_pending_return';
