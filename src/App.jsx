import React, { useEffect, useRef, useState } from "react";

const WEATHER_MAP = {
  0: { label: "Clear sky", emoji: "☀️" },
  1: { label: "Mainly clear", emoji: "🌤️" },
  2: { label: "Partly cloudy", emoji: "⛅" },
  3: { label: "Overcast", emoji: "☁️" },
  45: { label: "Fog", emoji: "🌫️" },
  48: { label: "Rime fog", emoji: "🌫️" },
  61: { label: "Light rain", emoji: "🌦️" },
  63: { label: "Rain", emoji: "🌧️" },
  65: { label: "Heavy rain", emoji: "🌧️" },
  71: { label: "Light snow", emoji: "🌨️" },
  73: { label: "Snow", emoji: "❄️" },
  75: { label: "Heavy snow", emoji: "❄️" },
  95: { label: "Thunderstorm", emoji: "⛈️" },
  99: { label: "Severe thunderstorm", emoji: "⛈️" },
};

const formatTemp = (t) => (t !== undefined && t !== null ? Math.round(t) : "—");

function getCurrentTemp(data) {
  try {
    const t = data?.current_weather?.temperature;
    if (t !== undefined && t !== null) return t;
    const nowISO = data?.current_weather?.time;
    if (data?.hourly?.time && data?.hourly?.temperature_2m) {
      if (nowISO) {
        const idx = data.hourly.time.indexOf(nowISO);
        if (idx >= 0) return data.hourly.temperature_2m[idx];
      }
      return data.hourly.temperature_2m[0];
    }
  } catch {}
  return null;
}

function WeatherApp() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [units, setUnits] = useState("imperial"); // default Fahrenheit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const listRef = useRef(null);

  const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";
  const windUnit = units === "imperial" ? "mph" : "kmh";
  const tempSymbol = units === "imperial" ? "°F" : "°C";
  const speedSymbol = units === "imperial" ? "mph" : "km/h";

  const onSubmitSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("Please enter a valid city.");
      return;
    }
    try {
      setError("");
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        q
      )}&count=1&language=en&format=json`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.results || json.results.length === 0) {
        setError("City not found.");
        return;
      }
      const r = json.results[0];
      const name = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
      setSelected({ name, lat: r.latitude, lon: r.longitude });
      setQuery(name);
      listRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError("Could not search the city.");
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!selected) return;
      setLoading(true);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${selected.lat}&longitude=${selected.lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,weathercode&daily=uv_index_max&timezone=auto&temperature_unit=${tempUnit}&windspeed_unit=${windUnit}`;
        const res = await fetch(url);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError("Error loading weather data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selected, units]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#dff2f2] via-[#eaf7f7] to-[#f7fbfb] flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-lg shadow ring-1 ring-black/5 p-8">
        <h1 className="text-center text-2xl font-semibold text-black">Weather App</h1>
        <div className="flex justify-center my-6 relative">
          <img src="/weather-illustration.png" alt="Weather illustration" className="h-40 w-auto" />
          {data && (
            <div className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-black drop-shadow">
              {formatTemp(getCurrentTemp(data))}{tempSymbol}
            </div>
          )}
        </div>
        <form onSubmit={onSubmitSearch} className="mt-4 flex justify-center">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="City"
            className="w-[320px] border border-black/30 rounded-l-md px-3 py-2 text-black" />
          <button type="submit"
            className="px-4 py-2 bg-black text-white rounded-r-md font-medium hover:bg-black/90">Search</button>
        </form>
        {error && <div className="mt-4 text-red-600">{error}</div>}
        {loading && <p className="mt-4 text-gray-600">Loading...</p>}
        {data && (
          <div ref={listRef} className="mt-6 text-center">
            <div className="text-sm text-gray-700">{selected?.name}</div>
            <div className="mt-2">{(WEATHER_MAP[data.current_weather.weathercode]?.emoji) || "❓"}{" "}
              {WEATHER_MAP[data.current_weather.weathercode]?.label || "—"}</div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <Stat label="Wind" value={`${Math.round(data.current_weather.windspeed)} ${speedSymbol}`} />
              <Stat label="Humidity" value={(() => {
                try {
                  const idx = data.hourly.time.indexOf(data.current_weather.time);
                  const rh = idx >= 0 ? data.hourly.relativehumidity_2m[idx] : null;
                  return rh != null ? `${Math.round(rh)}%` : "—";
                } catch { return "—"; }
              })()} />
              <Stat label="UV max" value={data.daily?.uv_index_max?.length ? Math.round(data.daily.uv_index_max[0]) : "—"} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-black/10 p-2">
      <div className="text-[11px] text-gray-600">{label}</div>
      <div className="text-sm font-semibold text-black mt-0.5">{value}</div>
    </div>
  );
}

export default function App() { return <WeatherApp />; }
