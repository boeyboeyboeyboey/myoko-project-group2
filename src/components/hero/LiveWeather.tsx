import { useEffect, useState } from "react";
import { fetchCurrentTemps, type PlaceTemp } from "../../lib/weather";

export default function LiveWeather() {
  const [temps, setTemps] = useState<PlaceTemp[] | null>(null);

  useEffect(() => {
    let live = true;
    fetchCurrentTemps().then((t) => { if (live) setTemps(t); });
    return () => { live = false; };
  }, []);

  if (!temps) return null;
  return (
    <p className="hero__weather">
      <span className="hero__weather-now">Now</span>
      {temps.map((t) => (
        <span key={t.place} className={t.place === "Myoko" ? "hero__weather-place hero__weather-place--main" : "hero__weather-place"}>
          {t.place} {t.tempC}°
        </span>
      ))}
      <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="hero__weather-src">Open-Meteo</a>
    </p>
  );
}
