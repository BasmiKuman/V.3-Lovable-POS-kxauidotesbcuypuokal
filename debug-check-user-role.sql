-- Debug: Check if user_roles data exists
SELECT 
    'Current user ID:' as info,
    auth.uid() as user_id;

-- Check if your user_role exists (might be blocked by RLS)
SELECT 
    'User role data:' as info,
    user_id,
    role::text as role
FROM user_roles
WHERE user_id = auth.uid();

-- Try to see ALL user_roles (will fail if RLS blocks)
SELECT 
    'All user roles count:' as info,
    COUNT(*) as total_users
FROM user_roles;

-- Check RLS status
SELECT 
    'RLS enabled on user_roles?' as info,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'user_roles';
