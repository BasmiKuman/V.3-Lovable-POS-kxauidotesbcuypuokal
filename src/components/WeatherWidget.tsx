import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye } from "lucide-react";
import { toast } from "sonner";

interface WeatherData {
  temp: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  forecast: ForecastItem[];
}

interface ForecastItem {
  time: string;
  temp: number;
  icon: string;
  pop: number; // Probability of precipitation
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Fallback to Jakarta coordinates if location denied
          setLocation({ lat: -6.2088, lon: 106.8456 });
        }
      );
    } else {
      // Fallback to Jakarta if geolocation not supported
      setLocation({ lat: -6.2088, lon: 106.8456 });
    }
  }, []);

  useEffect(() => {
    if (!location) return;

    const fetchWeather = async () => {
      try {
        // Using Open-Meteo API (free, no API key required)
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Asia/Jakarta&forecast_days=1`
        );

        if (!response.ok) throw new Error("Failed to fetch weather");

        const data = await response.json();

        // Get current hour index
        const now = new Date();
        const currentHourIndex = now.getHours();

        // Get next 2 hours forecast
        const forecast: ForecastItem[] = [];
        for (let i = 1; i <= 2; i++) {
          const index = currentHourIndex + i;
          if (index < 24) {
            forecast.push({
              time: `${(index).toString().padStart(2, '0')}:00`,
              temp: Math.round(data.hourly.temperature_2m[index]),
              icon: getWeatherIcon(data.hourly.weather_code[index]),
              pop: data.hourly.precipitation_probability[index] || 0,
            });
          }
        }

        setWeather({
          temp: Math.round(data.current.temperature_2m),
          description: getWeatherDescription(data.current.weather_code),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          icon: getWeatherIcon(data.current.weather_code),
          forecast,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching weather:", error);
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [location]);

  const getWeatherIcon = (code: number): string => {
    // WMO Weather interpretation codes
    if (code === 0) return "clear";
    if (code <= 3) return "partly-cloudy";
    if (code <= 48) return "cloudy";
    if (code <= 67) return "rainy";
    if (code <= 77) return "snow";
    if (code <= 82) return "rainy";
    if (code <= 86) return "snow";
    return "cloudy";
  };

  const getWeatherDescription = (code: number): string => {
    if (code === 0) return "Cerah";
    if (code <= 3) return "Berawan";
    if (code <= 48) return "Berkabut";
    if (code <= 67) return "Hujan";
    if (code <= 77) return "Salju";
    if (code <= 82) return "Hujan Lebat";
    if (code <= 86) return "Salju Lebat";
    return "Berawan";
  };

  const WeatherIcon = ({ icon, size = "w-8 h-8" }: { icon: string; size?: string }) => {
    switch (icon) {
      case "clear":
        return <Sun className={`${size} text-yellow-500`} />;
      case "partly-cloudy":
        return <Cloud className={`${size} text-gray-400`} />;
      case "rainy":
        return <CloudRain className={`${size} text-blue-500`} />;
      default:
        return <Cloud className={`${size} text-gray-500`} />;
    }
  };

  if (loading) {
    return (
      <Card className="p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 min-w-[200px] sm:min-w-[240px]">
        <div className="flex items-center gap-2">
          <div className="animate-pulse">
            <Cloud className="w-8 h-8 text-gray-400" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
            <div className="h-2 bg-gray-200 rounded w-16 animate-pulse"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <Card className="p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-shadow">
      <div className="space-y-2">
        {/* Current Weather */}
        <div className="flex items-center gap-2 sm:gap-3">
          <WeatherIcon icon={weather.icon} size="w-10 h-10 sm:w-12 sm:h-12" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">
                {weather.temp}°
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-300">C</span>
            </div>
            <p className="text-[10px] sm:text-xs text-blue-800 dark:text-blue-200 font-medium">
              {weather.description}
            </p>
          </div>
        </div>

        {/* Forecast 2 hours */}
        <div className="border-t border-blue-200 dark:border-blue-700 pt-2">
          <p className="text-[9px] sm:text-[10px] text-blue-700 dark:text-blue-300 font-semibold mb-1.5">
            2 Jam Kedepan:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {weather.forecast.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 bg-white/50 dark:bg-blue-900/30 rounded-md p-1.5"
              >
                <WeatherIcon icon={item.icon} size="w-5 h-5 sm:w-6 sm:h-6" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs font-bold text-blue-900 dark:text-blue-100">
                    {item.time}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] sm:text-[10px] text-blue-700 dark:text-blue-300">
                      {item.temp}°C
                    </span>
                    {item.pop > 30 && (
                      <div className="flex items-center gap-0.5" title={`${item.pop}% kemungkinan hujan`}>
                        <Droplets className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500" />
                        <span className="text-[8px] sm:text-[9px] text-blue-600 dark:text-blue-400">
                          {item.pop}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex items-center gap-3 text-[9px] sm:text-[10px] text-blue-700 dark:text-blue-300 border-t border-blue-200 dark:border-blue-700 pt-1.5">
          <div className="flex items-center gap-1" title="Kelembaban">
            <Droplets className="w-3 h-3" />
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1" title="Kecepatan Angin">
            <Wind className="w-3 h-3" />
            <span>{weather.windSpeed} km/h</span>
          </div>
        </div>

        {/* Warning if rain probability > 50% */}
        {weather.forecast.some((f) => f.pop > 50) && (
          <div className="flex items-start gap-1.5 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md p-1.5">
            <CloudRain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-[9px] sm:text-[10px] text-yellow-800 dark:text-yellow-300 leading-tight">
              ⚠️ Kemungkinan hujan tinggi! Siapkan jas hujan.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
