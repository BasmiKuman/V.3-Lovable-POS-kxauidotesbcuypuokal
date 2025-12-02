-- Update add_production function to also log to product_changes table

-- Drop existing function first
DROP FUNCTION IF EXISTS add_production(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION add_production(
  p_product_id UUID,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Insert into production_history
  INSERT INTO production_history (
    product_id,
    quantity,
    produced_by,
    notes
  ) VALUES (
    p_product_id,
    p_quantity,
    v_user_id,
    p_notes
  );

  -- Update product stock
  UPDATE products
  SET stock_in_warehouse = stock_in_warehouse + p_quantity
  WHERE id = p_product_id;

  -- Log to product_changes
  INSERT INTO product_changes (
    product_id,
    changed_by,
    change_type,
    quantity_change,
    notes
  ) VALUES (
    p_product_id,
    v_user_id,
    'production',
    p_quantity,
    COALESCE(p_notes, 'Produksi dari tab Produksi')
  );

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found with id: %', p_product_id;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_production(UUID, INTEGER, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION add_production IS 'Adds production record, updates product stock, and logs change to product_changes table';
