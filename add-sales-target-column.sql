-- Add sales_target column to profiles table
-- Default: 30 cups per month

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sales_target INTEGER DEFAULT 30;

-- Update existing riders to have default target
UPDATE profiles 
SET sales_target = 30 
WHERE sales_target IS NULL;

-- Add comment
COMMENT ON COLUMN profiles.sales_target IS 'Monthly sales target in cups for riders (default: 30)';
