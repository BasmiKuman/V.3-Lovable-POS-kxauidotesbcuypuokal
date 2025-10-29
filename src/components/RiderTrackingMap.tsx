/**
 * RIDER TRACKING MAP
 * ===================
 * Admin dashboard component to view rider locations in real-time
 * Features:
 * - Real-time map with rider markers
 * - Auto-refresh every 30 seconds
 * - Shows rider status (active/idle/offline)
 * - Clickable markers with rider info
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, User } from "lucide-react";
import { getActiveRiders } from "@/lib/gps-tracking";
import { toast } from "sonner";

interface ActiveRider {
  rider_id: string;
  full_name: string;
  latitude: number;
  longitude: number;
  last_update: string;
  status: string;
}

export default function RiderTrackingMap() {
  const [riders, setRiders] = useState<ActiveRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<ActiveRider | null>(null);

  useEffect(() => {
    loadRiders();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadRiders, 30000);

    return () => clearInterval(interval);
  }, []);

  async function loadRiders() {
    try {
      const activeRiders = await getActiveRiders();
      setRiders(activeRiders);
      setLoading(false);
    } catch (error) {
      console.error("Error loading riders:", error);
      toast.error("Gagal memuat data rider");
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "idle":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Aktif";
      case "idle":
        return "Idle";
      default:
        return "Offline";
    }
  };

  const getTimeSince = (timestamp: string) => {
    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const diffMinutes = Math.floor((now - then) / 60000);

    if (diffMinutes < 1) return "Baru saja";
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    return new Date(timestamp).toLocaleDateString("id-ID");
  };

  const openInGoogleMaps = (lat: number, lon: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lon}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Pelacakan Rider Real-time
          </CardTitle>
          <CardDescription>Memuat data rider...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <img 
              src="/images/logo.png" 
              alt="Loading" 
              className="w-12 h-12 animate-spin"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              Pelacakan Rider Real-time
            </CardTitle>
            <CardDescription className="mt-1">
              {riders.length} rider aktif dalam 5 menit terakhir
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Auto-refresh 30s
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {riders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Tidak ada rider yang aktif saat ini</p>
            <p className="text-xs mt-1">
              Rider akan muncul di sini saat mereka login dan GPS aktif
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Tips:</strong> Klik "Buka di Maps" untuk melihat lokasi rider di Google Maps. 
                Data diperbarui otomatis setiap 30 detik.
              </p>
            </div>

            {/* Riders Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {riders.map((rider) => (
                <Card
                  key={rider.rider_id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedRider?.rider_id === rider.rider_id
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedRider(rider)}
                >
                  <CardContent className="pt-4 space-y-3">
                    {/* Rider Info */}
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-semibold">
                          {rider.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(
                            rider.status
                          )}`}
                          title={getStatusLabel(rider.status)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">
                          {rider.full_name}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" />
                          {getTimeSince(rider.last_update)}
                        </div>
                      </div>
                      <Badge
                        variant={rider.status === "active" ? "default" : "outline"}
                        className="text-[9px]"
                      >
                        {getStatusLabel(rider.status)}
                      </Badge>
                    </div>

                    {/* Location Info */}
                    <div className="bg-muted rounded-lg p-2 space-y-1.5">
                      <div className="flex items-center gap-1 text-xs">
                        <Navigation className="w-3 h-3 text-primary" />
                        <span className="font-mono text-[10px]">
                          {rider.latitude.toFixed(6)}, {rider.longitude.toFixed(6)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInGoogleMaps(rider.latitude, rider.longitude);
                        }}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded px-2 py-1.5 text-xs font-medium transition-colors"
                      >
                        <MapPin className="w-3 h-3 inline mr-1" />
                        Buka di Maps
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Selected Rider Details */}
            {selectedRider && (
              <Card className="bg-primary/5 border-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Detail Rider Terpilih
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Nama</p>
                      <p className="font-semibold">{selectedRider.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge
                        variant={
                          selectedRider.status === "active" ? "default" : "outline"
                        }
                        className="text-xs mt-1"
                      >
                        {getStatusLabel(selectedRider.status)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Latitude</p>
                      <p className="font-mono text-xs">
                        {selectedRider.latitude.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Longitude</p>
                      <p className="font-mono text-xs">
                        {selectedRider.longitude.toFixed(6)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">
                        Terakhir Update
                      </p>
                      <p className="text-xs">
                        {new Date(selectedRider.last_update).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
