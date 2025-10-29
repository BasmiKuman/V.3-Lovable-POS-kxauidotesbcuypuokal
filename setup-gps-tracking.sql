-- ============================================
-- GPS TRACKING SYSTEM SETUP
-- ============================================
-- Fitur: Tracking lokasi rider secara real-time
-- Consent: Rider setuju via Terms & Conditions
-- Auto ON saat login, OFF saat logout
-- Manual toggle di Settings

-- ============================================
-- TABLE 1: Rider Locations (Real-time tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS rider_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2), -- in meters
    speed DECIMAL(5, 2), -- in km/h
    heading DECIMAL(5, 2), -- direction in degrees
    altitude DECIMAL(10, 2), -- in meters
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT DEFAULT 'active', -- 'active', 'idle', 'offline'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_rider_locations_rider_id ON rider_locations(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_locations_timestamp ON rider_locations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rider_locations_status ON rider_locations(status);

-- ============================================
-- TABLE 2: GPS Consent & Settings
-- ============================================

CREATE TABLE IF NOT EXISTS rider_gps_settings (
    rider_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_given BOOLEAN DEFAULT false,
    consent_date TIMESTAMPTZ,
    tracking_enabled BOOLEAN DEFAULT false,
    auto_start_on_login BOOLEAN DEFAULT true,
    location_update_interval INTEGER DEFAULT 60, -- in seconds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE 3: Tracking History (untuk analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS rider_tracking_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start TIMESTAMPTZ NOT NULL,
    session_end TIMESTAMPTZ,
    total_distance DECIMAL(10, 2), -- in km
    total_duration INTEGER, -- in seconds
    locations_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sessions
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_rider_id ON rider_tracking_sessions(rider_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_start ON rider_tracking_sessions(session_start DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE rider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_gps_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Riders can view their own locations
CREATE POLICY "Riders can view own locations"
    ON rider_locations FOR SELECT
    TO authenticated
    USING (rider_id = auth.uid());

-- Riders can insert their own locations
CREATE POLICY "Riders can insert own locations"
    ON rider_locations FOR INSERT
    TO authenticated
    WITH CHECK (rider_id = auth.uid());

-- Admins can view all locations
CREATE POLICY "Admins can view all locations"
    ON rider_locations FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- GPS Settings policies
CREATE POLICY "Riders can view own GPS settings"
    ON rider_gps_settings FOR SELECT
    TO authenticated
    USING (rider_id = auth.uid());

CREATE POLICY "Riders can update own GPS settings"
    ON rider_gps_settings FOR ALL
    TO authenticated
    USING (rider_id = auth.uid())
    WITH CHECK (rider_id = auth.uid());

CREATE POLICY "Admins can view all GPS settings"
    ON rider_gps_settings FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Tracking sessions policies
CREATE POLICY "Riders can view own sessions"
    ON rider_tracking_sessions FOR SELECT
    TO authenticated
    USING (rider_id = auth.uid());

CREATE POLICY "Riders can insert own sessions"
    ON rider_tracking_sessions FOR INSERT
    TO authenticated
    WITH CHECK (rider_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
    ON rider_tracking_sessions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get latest location for a rider
CREATE OR REPLACE FUNCTION get_latest_rider_location(p_rider_id UUID)
RETURNS TABLE (
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    last_timestamp TIMESTAMPTZ,
    status TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT latitude, longitude, timestamp as last_timestamp, status
    FROM rider_locations
    WHERE rider_id = p_rider_id
    ORDER BY timestamp DESC
    LIMIT 1;
$$;

-- Function to get all active riders (last update < 5 minutes)
CREATE OR REPLACE FUNCTION get_active_riders()
RETURNS TABLE (
    rider_id UUID,
    full_name TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    last_update TIMESTAMPTZ,
    status TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT DISTINCT ON (rl.rider_id)
        rl.rider_id,
        p.full_name,
        rl.latitude,
        rl.longitude,
        rl.timestamp as last_update,
        rl.status
    FROM rider_locations rl
    JOIN profiles p ON p.user_id = rl.rider_id
    WHERE rl.timestamp > NOW() - INTERVAL '5 minutes'
    ORDER BY rl.rider_id, rl.timestamp DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_latest_rider_location(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_riders() TO authenticated;

-- ============================================
-- TRIGGER: Auto-create GPS settings on user creation
-- ============================================

CREATE OR REPLACE FUNCTION create_rider_gps_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create for riders (not admins)
    IF EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = NEW.id 
        AND role = 'rider'
    ) THEN
        INSERT INTO rider_gps_settings (rider_id)
        VALUES (NEW.id)
        ON CONFLICT (rider_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_gps_settings ON auth.users;
CREATE TRIGGER trigger_create_gps_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_rider_gps_settings();

-- ============================================
-- CLEANUP: Auto-delete old location data (> 30 days)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_locations()
RETURNS void AS $$
BEGIN
    DELETE FROM rider_locations
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (manual execution or via pg_cron if available)
-- Call this function periodically: SELECT cleanup_old_locations();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('rider_locations', 'rider_gps_settings', 'rider_tracking_sessions')
ORDER BY table_name;

-- Check functions created
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('get_latest_rider_location', 'get_active_riders')
ORDER BY routine_name;

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN ('rider_locations', 'rider_gps_settings', 'rider_tracking_sessions');

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Insert sample GPS settings for existing riders
INSERT INTO rider_gps_settings (rider_id, consent_given, consent_date, tracking_enabled)
SELECT 
    ur.user_id,
    false, -- Will be set to true after they accept T&C
    NULL,
    false
FROM user_roles ur
WHERE ur.role = 'rider'
ON CONFLICT (rider_id) DO NOTHING;

-- ============================================
-- EXPECTED OUTPUT
-- ============================================
-- ✓ 3 tables created (rider_locations, rider_gps_settings, rider_tracking_sessions)
-- ✓ Indexes created for performance
-- ✓ RLS policies enabled for all tables
-- ✓ 2 functions created (get_latest_rider_location, get_active_riders)
-- ✓ Trigger created for auto GPS settings
-- ✓ Sample GPS settings inserted for existing riders
