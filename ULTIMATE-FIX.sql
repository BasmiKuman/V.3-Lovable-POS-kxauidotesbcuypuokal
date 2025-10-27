-- ULTIMATE FIX - Disable RLS temporarily, fix data, then re-enable with correct policy

-- Step 1: Disable RLS temporarily
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Clean up and set admin
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'fadlannafian@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email fadlannafian@gmail.com';
  END IF;
  
  -- Delete all roles for this user
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  
  -- Insert admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin');
  
  RAISE NOTICE 'User % set as admin', v_user_id;
END $$;

-- Step 3: Drop ALL existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', r.policyname);
    END LOOP;
END $$;

-- Step 4: Re-enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create ONE simple policy - everyone can SELECT
CREATE POLICY "allow_all_select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Step 6: Verify
SELECT 
  u.email,
  ur.role,
  ur.created_at,
  '✅ ADMIN SET!' as status
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'fadlannafian@gmail.com';

-- Step 7: Check all policies (should only have 1)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'user_roles'
ORDER BY policyname;
