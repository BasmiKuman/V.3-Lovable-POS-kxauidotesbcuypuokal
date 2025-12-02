-- FIX UPSERT: Add UNIQUE constraint to user_roles.user_id
-- This fixes error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- Step 1: Remove duplicate entries (keep only one per user)
DELETE FROM user_roles a 
USING user_roles b
WHERE a.id > b.id 
AND a.user_id = b.user_id;

-- Step 2: Add UNIQUE constraint on user_id column
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Step 3: Verify the constraint was added
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'user_roles'::regclass
AND contype = 'u';
