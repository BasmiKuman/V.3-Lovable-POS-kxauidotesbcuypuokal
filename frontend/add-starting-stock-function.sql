-- ============================================
-- UPDATE: Add function to get rider's starting stock
-- ============================================
-- Purpose: Get rider's stock at the START of the day
-- This is used for Stock Opname calculation
-- Formula: Starting Stock = Previous Day Remaining + Today's Distribution
-- ============================================

CREATE OR REPLACE FUNCTION get_rider_starting_stock(
  p_rider_id UUID,
  p_product_id UUID,
  p_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_starting_stock INTEGER := 0;
  v_yesterday_remaining INTEGER := 0;
  v_today_distribution INTEGER := 0;
BEGIN
  -- Get yesterday's remaining from last SO report
  -- (if exists, otherwise assume returned all)
  SELECT COALESCE(remaining_quantity, 0)
  INTO v_yesterday_remaining
  FROM end_of_day_items eod_items
  JOIN end_of_day_reports eod_reports ON eod_items.report_id = eod_reports.id
  WHERE eod_reports.rider_id = p_rider_id
  AND eod_items.product_id = p_product_id
  AND eod_reports.report_date < p_date
  AND eod_reports.status = 'submitted'
  ORDER BY eod_reports.report_date DESC
  LIMIT 1;
  
  -- Get today's distribution
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_today_distribution
  FROM distributions
  WHERE rider_id = p_rider_id
  AND product_id = p_product_id
  AND DATE(distributed_at) = p_date;
  
  -- Starting stock = Yesterday remaining + Today distribution
  v_starting_stock := v_yesterday_remaining + v_today_distribution;
  
  RETURN v_starting_stock;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_rider_starting_stock TO authenticated;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Test the function (replace with actual IDs and date)

-- Example:
-- SELECT 
--   p.name as product_name,
--   get_rider_starting_stock(
--     '9a04d367-2016-4212-a923-9bac493c72e2', -- rider_id
--     p.id, -- product_id
--     '2024-12-12' -- date
--   ) as starting_stock
-- FROM products p
-- WHERE p.name LIKE '%Kopi%';

-- Expected Result for Stock Opname Logic:
-- If rider had 35 cups at start of day (19 from yesterday + 16 distributed today)
-- And POS shows 16 sold
-- And rider brings back 19
-- Then:
--   Starting Stock: 35
--   POS: 16
--   Remaining Input: 19
--   Calculated Sold: 35 - 19 = 16
--   Adjustment: 16 - 16 = 0 ✓
