-- Add min_stock column to products table for low stock alerts
-- This allows setting minimum stock threshold per product

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'min_stock'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN min_stock INTEGER DEFAULT 10 NOT NULL;
    
    RAISE NOTICE 'Column min_stock added successfully';
  ELSE
    RAISE NOTICE 'Column min_stock already exists';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.products.min_stock IS 'Minimum stock threshold for low stock alerts';

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'products' 
  AND column_name = 'min_stock';
