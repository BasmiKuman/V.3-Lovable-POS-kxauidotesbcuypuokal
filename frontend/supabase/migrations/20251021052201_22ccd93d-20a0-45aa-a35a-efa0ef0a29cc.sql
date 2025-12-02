-- Create function to decrement rider stock
CREATE OR REPLACE FUNCTION public.decrement_rider_stock(
  p_rider_id UUID,
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.rider_stock
  SET quantity = quantity - p_quantity
  WHERE rider_id = p_rider_id AND product_id = p_product_id;
END;
$$;