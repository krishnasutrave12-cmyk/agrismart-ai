import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Droplets,
  Wind,
  CloudRain,
  MapPin,
  AlertTriangle,
  Search,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Language, strings } from '../translations';
import { fetchLiveWeather } from '../services/geminiService';

interface WeatherViewProps {
  language: Language;
}

export const WeatherView: React.FC<WeatherViewProps> = ({ language }) => {
  const t = strings[language];
  const [cityInput, setCityInput] = useState('Pune');
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadWeather = async (params: { q?: string; lat?: number; lng?: number }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchLiveWeather({ ...params, language });
      setWeather(data);
    } catch (err: any) {
      setWeather(null);
      setErrorMsg(err?.message || 'Unable to load live weather data right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather({ q: cityInput });
  }, [language]);

  const handleUseGps = () => {
    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation is not supported on this device. Please type your city name.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadWeather({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLoading(false);
        setErrorMsg(
          language === 'hi'
            ? 'लोकेशन अनुमति नहीं मिली। कृपया अपना शहर या जिला नाम ऊपर लिखें।'
            : language === 'mr'
            ? 'स्थान परवानगी मिळाली नाही. कृपया तुमचे शहर किंवा जिल्ह्याचे नाव वर लिहा.'
            : 'Location permission was declined. Please type your city or district name above.'
        );
      },
      { timeout: 8000 }
    );
  };

  const quickCities = ['Pune', 'Nashik', 'Nagpur', 'Kolhapur', 'Indore', 'Ludhiana', 'Lucknow'];

  const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.weather}</h1>
        <p className="text-sm sm:text-base text-[#526056] mt-1">
          {language === 'hi'
            ? 'ओपन-मेटियो से वास्तविक समय का मौसम, 7-दिन का पूर्वानुमान और कृषि सुझाव।'
            : language === 'mr'
            ? 'Open-Meteo वरून थेट हवामान माहिती, ७ दिवसांचा अंदाज आणि शेती सल्ला.'
            : 'Live real-time temperature, rainfall, 7-day forecast, heavy rain alerts, and farming advice.'}
        </p>
      </div>

      {/* Location Selector */}
      <div className="bg-white border border-[#E4E7DF] rounded-2xl p-4 sm:p-5 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (cityInput.trim()) loadWeather({ q: cityInput.trim() });
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#526056] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'शहर या जिला लिखें (जैसे नाशिक, पुणे, इंदौर)'
                  : language === 'mr'
                  ? 'शहर किंवा जिल्हा लिहा (उदा. नाशिक, पुणे, कोल्हापूर)'
                  : 'Enter city or district (e.g., Pune, Nashik, Indore)'
              }
              className="w-full min-h-[46px] pl-10 pr-4 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[46px] px-5 rounded-xl bg-[#1F6E43] hover:bg-[#185835] text-white font-semibold text-sm shrink-0"
          >
            {t.common.search}
          </button>
          <button
            type="button"
            onClick={handleUseGps}
            disabled={loading}
            className="min-h-[46px] px-4 rounded-xl bg-[#F7F8F5] hover:bg-[#E9F5EE] border border-[#E4E7DF] text-[#18221A] font-semibold text-sm inline-flex items-center justify-center gap-1.5 shrink-0"
          >
            <MapPin className="w-4 h-4 text-[#1F6E43]" />
            <span>{language === 'hi' ? 'मेरा स्थान' : language === 'mr' ? 'माझे ठिकाण' : 'My Location'}</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {quickCities.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCityInput(c);
                loadWeather({ q: c });
              }}
              className="px-3 py-1 rounded-lg bg-[#F7F8F5] hover:bg-[#E9F5EE] border border-[#E4E7DF] text-xs font-medium text-[#18221A]"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#C53030] rounded-xl p-4 text-sm flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => loadWeather({ q: cityInput })}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#FECACA] text-xs font-semibold shrink-0"
          >
            {t.common.retry}
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#E4E7DF] rounded-2xl p-8 text-center text-sm text-[#526056]">
          <RefreshCw className="w-6 h-6 text-[#1F6E43] animate-spin mx-auto mb-2" />
          {t.common.loading}
        </div>
      ) : weather ? (
        <>
          {/* Heavy Rainfall Alert Banner (Real Forecast Only) */}
          {Array.isArray(weather.heavyRainAlerts) && weather.heavyRainAlerts.length > 0 && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#C53030] shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-[#C53030]">
                  {language === 'hi'
                    ? 'भारी बारिश चेतावनी'
                    : language === 'mr'
                    ? 'मुसळधार पावसाचा इशारा'
                    : 'Heavy Rainfall Alert'}
                </p>
                <p className="text-[#18221A] mt-0.5">
                  {weather.heavyRainAlerts
                    .map((a: any) => `${a.date} (${a.rainfallMm} mm — ${a.condition})`)
                    .join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Current Weather Card */}
          <div className="bg-white border border-[#E4E7DF] rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E4E7DF]">
              <div>
                <p className="text-xs font-semibold text-[#1F6E43]">{weather.source}</p>
                <h2 className="text-2xl font-bold text-[#18221A] mt-0.5">
                  {weather.location.name}
                  {weather.location.region ? `, ${weather.location.region}` : ''}
                </h2>
                <p className="text-sm text-[#526056]">{weather.current.condition}</p>
              </div>
              <div className="text-4xl font-bold text-[#1F6E43] tabular-nums flex items-center gap-2">
                <CloudSun className="w-9 h-9" />
                <span>{weather.current.temperature}°C</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-5">
              <div className="flex items-center gap-2.5">
                <Droplets className="w-5 h-5 text-[#1D6FA5]" />
                <div>
                  <span className="text-xs text-[#526056] block">
                    {language === 'hi' ? 'नमी' : language === 'mr' ? 'आर्द्रता' : 'Humidity'}
                  </span>
                  <span className="text-base font-bold tabular-nums">{weather.current.humidity}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Wind className="w-5 h-5 text-[#526056]" />
                <div>
                  <span className="text-xs text-[#526056] block">
                    {language === 'hi' ? 'हवा की गति' : language === 'mr' ? 'वाऱ्याचा वेग' : 'Wind Speed'}
                  </span>
                  <span className="text-base font-bold tabular-nums">
                    {weather.current.windSpeed} km/h
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <CloudRain className="w-5 h-5 text-[#1F6E43]" />
                <div>
                  <span className="text-xs text-[#526056] block">
                    {language === 'hi' ? 'बारिश' : language === 'mr' ? 'पाऊस' : 'Rainfall'}
                  </span>
                  <span className="text-base font-bold tabular-nums">
                    {weather.current.precipitation} mm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Forecast */}
          <div className="bg-white border border-[#E4E7DF] rounded-2xl p-5">
            <h3 className="text-base font-bold text-[#18221A] mb-3">
              {language === 'hi'
                ? '7-दिन का मौसम पूर्वानुमान'
                : language === 'mr'
                ? '७ दिवसांचा हवामान अंदाज'
                : '7-Day Weather Forecast'}
            </h3>
            <div className="divide-y divide-[#E4E7DF]">
              {(weather.daily || []).map((day: any, idx: number) => (
                <div
                  key={idx}
                  className="py-3 grid grid-cols-12 items-center gap-2 text-sm"
                >
                  <span className="col-span-4 sm:col-span-3 font-semibold text-[#18221A]">
                    {new Date(day.date + 'T00:00:00').toLocaleDateString(locale, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="col-span-4 sm:col-span-4 text-xs sm:text-sm text-[#526056]">
                    {day.condition}
                  </span>
                  <span className="col-span-2 text-xs text-[#1D6FA5] tabular-nums text-right">
                    {day.rainfallMm} mm ({day.rainChance}%)
                  </span>
                  <span className="col-span-2 sm:col-span-3 font-bold text-[#18221A] tabular-nums text-right">
                    {day.minTemp}° / {day.maxTemp}°C
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Weather-Based Farming Suggestions */}
          {Array.isArray(weather.farmingSuggestions) && weather.farmingSuggestions.length > 0 && (
            <div className="bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-3">
              <h3 className="text-base font-bold text-[#18221A]">
                {language === 'hi'
                  ? 'मौसम आधारित खेती सुझाव'
                  : language === 'mr'
                  ? 'हवामानानुसार शेती सल्ला'
                  : 'Weather-Based Farming Suggestions'}
              </h3>
              <ul className="space-y-2 text-sm text-[#18221A]">
                {weather.farmingSuggestions.map((tip: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1F6E43] shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
