-- Add sales_target and email columns to profiles table
-- Default: 30 cups per month for sales_target

-- Add sales_target column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sales_target INTEGER DEFAULT 30;

-- Add email column (if not exists)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing riders to have default target
UPDATE profiles 
SET sales_target = 30 
WHERE sales_target IS NULL;

-- Add comments
COMMENT ON COLUMN profiles.sales_target IS 'Monthly sales target in cups for riders (default: 30)';
COMMENT ON COLUMN profiles.email IS 'User email address from auth.users';
