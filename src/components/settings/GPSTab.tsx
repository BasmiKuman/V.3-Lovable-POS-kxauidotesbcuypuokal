import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { getGPSSettings, toggleTracking, getTrackingStatus, hasGPSConsent, saveGPSConsent } from "@/lib/gps-tracking";

interface GPSTabProps {
  userId: string;
}

export function GPSTab({ userId }: GPSTabProps) {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGPSStatus();
  }, [userId]);

  const loadGPSStatus = async () => {
    const consent = await hasGPSConsent(userId);
    setHasConsent(consent);

    if (consent) {
      const status = await getTrackingStatus();
      setGpsEnabled(status.isTracking);
    }
  };

  const handleGPSToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      const success = await toggleTracking(userId, enabled);
      if (success) {
        setGpsEnabled(enabled);
        toast.success(enabled ? 'GPS tracking diaktifkan' : 'GPS tracking dinonaktifkan');
      } else {
        toast.error('Gagal mengubah status GPS');
      }
    } catch (error) {
      console.error('Error toggling GPS:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableGPS = async () => {
    const success = await saveGPSConsent(userId);
    if (success) {
      setHasConsent(true);
      setGpsEnabled(true);
      toast.success("GPS Tracking diaktifkan!");
    } else {
      toast.error("Gagal mengaktifkan GPS");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              <div>
                <CardTitle className="text-lg">GPS Tracking</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {hasConsent 
                    ? "Kelola pelacakan lokasi Anda"
                    : "Aktifkan pelacakan lokasi untuk fitur lengkap"
                  }
                </CardDescription>
              </div>
            </div>
            {hasConsent ? (
              <Switch
                checked={gpsEnabled}
                onCheckedChange={handleGPSToggle}
                disabled={loading}
              />
            ) : (
              <Button
                size="sm"
                onClick={handleEnableGPS}
                disabled={loading}
              >
                Aktifkan
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasConsent ? (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">
                    GPS Tracking Belum Aktif
                  </h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 leading-relaxed">
                    Anda belum memberikan izin untuk pelacakan GPS. Aktifkan sekarang untuk:
                  </p>
                  <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 ml-4">
                    <li>• Koordinasi distribusi yang lebih baik</li>
                    <li>• Optimasi rute pengiriman</li>
                    <li>• Keamanan dan keselamatan rider</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                      Status: {gpsEnabled ? "🟢 Aktif" : "🔴 Nonaktif"}
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      {gpsEnabled 
                        ? "Lokasi Anda sedang dilacak secara real-time. Admin dapat melihat posisi Anda di peta."
                        : "Pelacakan lokasi dinonaktifkan. Anda dapat mengaktifkannya kembali kapan saja."
                      }
                    </p>
                    {gpsEnabled && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1 mt-2">
                        <p>✓ Auto-aktif saat login</p>
                        <p>✓ Auto-mati saat logout</p>
                        <p>✓ Update setiap 1 menit (hemat baterai)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!gpsEnabled && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    ⚠️ <strong>Perhatian:</strong> Menonaktifkan GPS tracking dapat mempengaruhi 
                    akses ke beberapa fitur dan koordinasi dengan tim.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
