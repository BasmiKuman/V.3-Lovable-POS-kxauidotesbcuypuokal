/**
 * GPS TRACKING SERVICE
 * ====================
 * Features:
 * - Auto-start on login (if consent given)
 * - Auto-stop on logout
 * - Manual toggle in Settings
 * - Battery-efficient (coarse location, 1-minute intervals)
 * - Graceful permission handling
 */

import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  timestamp: number;
}

export interface GPSSettings {
  consent_given: boolean;
  tracking_enabled: boolean;
  auto_start_on_login: boolean;
  location_update_interval: number;
}

// Global state
let watchId: string | null = null;
let isTracking = false;
let currentSessionId: string | null = null;

/**
 * Check if user has given GPS consent
 */
export async function hasGPSConsent(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('rider_gps_settings')
      .select('consent_given')
      .eq('rider_id', userId)
      .single();

    if (error) {
      console.error('Error checking GPS consent:', error);
      return false;
    }

    return data?.consent_given || false;
  } catch (error) {
    console.error('Error in hasGPSConsent:', error);
    return false;
  }
}

/**
 * Get GPS settings for a user
 */
export async function getGPSSettings(userId: string): Promise<GPSSettings | null> {
  try {
    const { data, error } = await supabase
      .from('rider_gps_settings')
      .select('*')
      .eq('rider_id', userId)
      .single();

    if (error) {
      console.error('Error fetching GPS settings:', error);
      return null;
    }

    return data as GPSSettings;
  } catch (error) {
    console.error('Error in getGPSSettings:', error);
    return null;
  }
}

/**
 * Update GPS settings
 */
export async function updateGPSSettings(
  userId: string,
  settings: Partial<GPSSettings>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rider_gps_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('rider_id', userId);

    if (error) {
      console.error('Error updating GPS settings:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateGPSSettings:', error);
    return false;
  }
}

/**
 * Save GPS consent (called after user accepts T&C)
 */
export async function saveGPSConsent(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rider_gps_settings')
      .upsert({
        rider_id: userId,
        consent_given: true,
        consent_date: new Date().toISOString(),
        tracking_enabled: true,
        auto_start_on_login: true,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving GPS consent:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveGPSConsent:', error);
    return false;
  }
}

/**
 * Request GPS permissions
 */
export async function requestGPSPermissions(): Promise<boolean> {
  try {
    const permissions = await Geolocation.requestPermissions();
    return permissions.location === 'granted';
  } catch (error) {
    console.error('Error requesting GPS permissions:', error);
    return false;
  }
}

/**
 * Check if GPS permissions are granted
 */
export async function checkGPSPermissions(): Promise<boolean> {
  try {
    const permissions = await Geolocation.checkPermissions();
    return permissions.location === 'granted';
  } catch (error) {
    console.error('Error checking GPS permissions:', error);
    return false;
  }
}

/**
 * Update rider location in database
 */
async function updateLocation(userId: string, position: GeolocationPosition) {
  try {
    const { error } = await supabase.from('rider_locations').insert({
      rider_id: userId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy || null,
      speed: position.coords.speed ? position.coords.speed * 3.6 : null, // m/s to km/h
      heading: position.coords.heading || null,
      altitude: position.coords.altitude || null,
      timestamp: new Date(position.timestamp).toISOString(),
      status: 'active',
    });

    if (error) {
      console.error('Error updating location:', error);
    }
  } catch (error) {
    console.error('Error in updateLocation:', error);
  }
}

/**
 * Start tracking session
 */
async function startTrackingSession(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('rider_tracking_sessions')
      .insert({
        rider_id: userId,
        session_start: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error starting tracking session:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error in startTrackingSession:', error);
    return null;
  }
}

/**
 * End tracking session
 */
async function endTrackingSession(sessionId: string) {
  try {
    const { error } = await supabase
      .from('rider_tracking_sessions')
      .update({
        session_end: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending tracking session:', error);
    }
  } catch (error) {
    console.error('Error in endTrackingSession:', error);
  }
}

/**
 * Start GPS tracking
 * This is called automatically on login if auto_start_on_login is true
 */
export async function startTracking(userId: string): Promise<boolean> {
  // Don't start if already tracking
  if (isTracking) {
    console.log('Already tracking');
    return true;
  }

  try {
    // Check consent
    const hasConsent = await hasGPSConsent(userId);
    if (!hasConsent) {
      console.log('No GPS consent given');
      return false;
    }

    // Check permissions
    const hasPermissions = await checkGPSPermissions();
    if (!hasPermissions) {
      const granted = await requestGPSPermissions();
      if (!granted) {
        console.log('GPS permissions not granted');
        return false;
      }
    }

    // Get settings
    const settings = await getGPSSettings(userId);
    if (!settings?.tracking_enabled) {
      console.log('Tracking disabled in settings');
      return false;
    }

    // Start session
    currentSessionId = await startTrackingSession(userId);

    // Start watching position
    watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: false, // Battery-efficient
        timeout: 10000,
        maximumAge: settings.location_update_interval * 1000, // Default 60 seconds
      },
      (position, err) => {
        if (err) {
          console.error('Geolocation error:', err);
          return;
        }

        if (position) {
          updateLocation(userId, position);
        }
      }
    );

    isTracking = true;
    console.log('GPS tracking started', { watchId, sessionId: currentSessionId });

    // Store state in localStorage for persistence
    localStorage.setItem('gps_tracking_active', 'true');
    localStorage.setItem('gps_watch_id', watchId);
    if (currentSessionId) {
      localStorage.setItem('gps_session_id', currentSessionId);
    }

    return true;
  } catch (error) {
    console.error('Error starting GPS tracking:', error);
    return false;
  }
}

/**
 * Stop GPS tracking
 * This is called automatically on logout
 */
export async function stopTracking(): Promise<void> {
  try {
    // Clear watch
    if (watchId) {
      await Geolocation.clearWatch({ id: watchId });
      watchId = null;
    }

    // End session
    if (currentSessionId) {
      await endTrackingSession(currentSessionId);
      currentSessionId = null;
    }

    isTracking = false;

    // Clear localStorage
    localStorage.removeItem('gps_tracking_active');
    localStorage.removeItem('gps_watch_id');
    localStorage.removeItem('gps_session_id');

    console.log('GPS tracking stopped');
  } catch (error) {
    console.error('Error stopping GPS tracking:', error);
  }
}

/**
 * Toggle tracking on/off (manual control from Settings)
 */
export async function toggleTracking(userId: string, enable: boolean): Promise<boolean> {
  try {
    // Update settings
    const success = await updateGPSSettings(userId, {
      tracking_enabled: enable,
    });

    if (!success) {
      return false;
    }

    // Start or stop based on state
    if (enable) {
      return await startTracking(userId);
    } else {
      await stopTracking();
      return true;
    }
  } catch (error) {
    console.error('Error toggling tracking:', error);
    return false;
  }
}

/**
 * Get current tracking status
 */
export function getTrackingStatus(): {
  isTracking: boolean;
  watchId: string | null;
  sessionId: string | null;
} {
  return {
    isTracking,
    watchId,
    sessionId: currentSessionId,
  };
}

/**
 * Resume tracking from localStorage (on app restart)
 */
export async function resumeTracking(userId: string): Promise<void> {
  const wasTracking = localStorage.getItem('gps_tracking_active') === 'true';

  if (wasTracking) {
    console.log('Resuming GPS tracking from previous session');
    await startTracking(userId);
  }
}

/**
 * Get latest location for a rider
 */
export async function getLatestLocation(
  riderId: string
): Promise<LocationData | null> {
  try {
    const { data, error } = await supabase
      .from('rider_locations')
      .select('*')
      .eq('rider_id', riderId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching latest location:', error);
      return null;
    }

    return {
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      accuracy: data.accuracy ? parseFloat(data.accuracy) : null,
      speed: data.speed ? parseFloat(data.speed) : null,
      heading: data.heading ? parseFloat(data.heading) : null,
      altitude: data.altitude ? parseFloat(data.altitude) : null,
      timestamp: new Date(data.timestamp).getTime(),
    };
  } catch (error) {
    console.error('Error in getLatestLocation:', error);
    return null;
  }
}

/**
 * Get all active riders (updated within last 5 minutes)
 */
export async function getActiveRiders(): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_active_riders');

    if (error) {
      console.error('Error fetching active riders:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getActiveRiders:', error);
    return [];
  }
}
