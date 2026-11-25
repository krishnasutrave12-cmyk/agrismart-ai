import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { Sprout, Camera, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Language } from '../translations';
import { HistoryItem } from '../types';

export type HistoryRecord = HistoryItem;

interface CropHealthTrendChartProps {
  history: HistoryRecord[];
  language: Language;
  onScanNewPlant?: () => void;
  onSeedSampleData?: () => Promise<void>;
  isSeeding?: boolean;
}

interface TrendPoint {
  id: string;
  cropName: string;
  status: 'Healthy' | 'Infected';
  healthScore: number;
  diseaseName: string | null;
  rawTimestamp: number;
  displayDate: string;
  fullDate: string;
  treatment?: string;
}

export const CropHealthTrendChart: React.FC<CropHealthTrendChartProps> = ({
  history,
  language,
  onScanNewPlant,
  onSeedSampleData,
  isSeeding = false,
}) => {
  const [selectedCrop, setSelectedCrop] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');

  const trendData = useMemo(() => {
    const plantScans = history.filter((item) => item.type === 'plant');

    const parsed: TrendPoint[] = plantScans.map((item, index) => {
      const details = item.details || {};
      let cropName = details.plantName;
      if (!cropName && item.result) {
        cropName = item.result.split('-')[0]?.trim();
      }
      if (!cropName) cropName = language === 'hi' ? 'फसल' : language === 'mr' ? 'पीक' : 'Crop';

      let status: 'Healthy' | 'Infected' = 'Healthy';
      const statusStr = (details.status || item.result || '').toLowerCase();
      if (
        statusStr.includes('infect') ||
        statusStr.includes('diseas') ||
        statusStr.includes('rot') ||
        statusStr.includes('blight')
      ) {
        status = 'Infected';
      }

      const diseaseName =
        details.diseaseName ||
        (status === 'Infected' && item.result.includes('-')
          ? item.result.split('-')[1]?.trim()
          : null);

      let healthScore = 85;
      if (typeof details.healthScore === 'number' && !isNaN(details.healthScore)) {
        healthScore = Math.min(100, Math.max(0, details.healthScore));
      } else if (typeof item.healthScore === 'number' && !isNaN(item.healthScore)) {
        healthScore = Math.min(100, Math.max(0, item.healthScore));
      } else {
        healthScore = status === 'Healthy' ? 92 : 48;
      }

      let dateObj = new Date();
      if (item.rawDate && !isNaN(item.rawDate)) {
        dateObj = new Date(item.rawDate);
      } else if (details.scanDate) {
        const d = new Date(details.scanDate);
        if (!isNaN(d.getTime())) dateObj = d;
      } else if (item.timestamp) {
        const d = new Date(item.timestamp);
        if (!isNaN(d.getTime())) dateObj = d;
      }

      const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US';
      return {
        id: item.id || `plant_${index}`,
        cropName,
        status,
        healthScore,
        diseaseName,
        rawTimestamp: dateObj.getTime(),
        displayDate: dateObj.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
        fullDate: dateObj.toLocaleString(locale, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        treatment: details.treatment,
      };
    });

    parsed.sort((a, b) => a.rawTimestamp - b.rawTimestamp);
    return parsed;
  }, [history, language]);

  const availableCrops = useMemo(() => {
    const crops = new Set<string>();
    trendData.forEach((p) => {
      if (p.cropName) crops.add(p.cropName);
    });
    return Array.from(crops);
  }, [trendData]);

  const filteredData = useMemo(() => {
    let result = [...trendData];
    if (selectedCrop !== 'ALL') {
      result = result.filter((p) => p.cropName.toLowerCase() === selectedCrop.toLowerCase());
    }
    if (timeRange !== 'all') {
      const cutoff = Date.now() - (timeRange === '7d' ? 7 : 30) * 86400000;
      result = result.filter((p) => p.rawTimestamp >= cutoff);
    }
    return result;
  }, [trendData, selectedCrop, timeRange]);

  const metrics = useMemo(() => {
    if (filteredData.length === 0) {
      return { latestScore: 0, averageScore: 0, healthyCount: 0, totalScans: 0 };
    }
    const totalScans = filteredData.length;
    const sum = filteredData.reduce((a, b) => a + b.healthScore, 0);
    return {
      latestScore: filteredData[totalScans - 1].healthScore,
      averageScore: Math.round(sum / totalScans),
      healthyCount: filteredData.filter((d) => d.status === 'Healthy').length,
      totalScans,
    };
  }, [filteredData]);

  const labels = {
    title: language === 'hi' ? 'फसल स्वास्थ्य चार्ट' : language === 'mr' ? 'पीक आरोग्य आलेख' : 'Crop Health Over Time',
    subtitle:
      language === 'hi'
        ? 'आपके पिछले पौधों की जांच का सरल सारांश'
        : language === 'mr'
        ? 'तुमच्या मागील रोप तपासणीचा सोपा सारांश'
        : 'Simple summary of your saved plant checks',
    allCrops: language === 'hi' ? 'सभी फसलें' : language === 'mr' ? 'सर्व पिके' : 'All Crops',
    latest: language === 'hi' ? 'ताजा स्कोर' : language === 'mr' ? 'ताजा स्कोअर' : 'Latest Score',
    average: language === 'hi' ? 'औसत' : language === 'mr' ? 'सरासरी' : 'Average',
    scans: language === 'hi' ? 'कुल जांच' : language === 'mr' ? 'एकूण तपासणी' : 'Total Checks',
    healthy: language === 'hi' ? 'स्वस्थ' : language === 'mr' ? 'निरोगी' : 'Healthy',
    needsCare: language === 'hi' ? 'देखभाल चाहिए' : language === 'mr' ? 'काळजी आवश्यक' : 'Needs Care',
    emptyTitle: language === 'hi' ? 'अभी कोई पौधे की जांच नहीं हुई' : language === 'mr' ? 'अद्याप कोणतीही रोप तपासणी नाही' : 'No plant checks yet',
    emptyDesc:
      language === 'hi'
        ? 'फसल का स्वास्थ्य देखने के लिए पौधे की फोटो लें या उदाहरण डेटा जोड़ें।'
        : language === 'mr'
        ? 'पिकाचे आरोग्य पाहण्यासाठी रोपाचा फोटो काढा किंवा नमुना माहिती जोडा.'
        : 'Scan a plant photo to track crop health over time, or load sample records to preview.',
    scanNow: language === 'hi' ? 'फसल रोग जांचें' : language === 'mr' ? 'रोपाचे रोग तपासा' : 'Check Crop Disease',
    loadSample: language === 'hi' ? 'उदाहरण डेटा जोड़ें' : language === 'mr' ? 'नमुना माहिती जोडा' : 'Load Sample Records',
    loadingSample: language === 'hi' ? 'जोड़ रहा है...' : language === 'mr' ? 'जोडत आहे...' : 'Adding...',
    allTime: language === 'hi' ? 'सभी' : language === 'mr' ? 'सर्व' : 'All',
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data: TrendPoint = payload[0].payload;
    const isHealthy = data.status === 'Healthy';
    return (
      <div className="bg-white border border-[#E4E7DF] rounded-xl p-3.5 shadow-lg max-w-xs text-sm">
        <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-[#E4E7DF]">
          <span className="font-semibold text-[#18221A] flex items-center gap-1.5">
            <Sprout className="w-4 h-4 text-[#1F6E43]" />
            {data.cropName}
          </span>
          <span className="text-xs text-[#526056] tabular-nums">{data.fullDate}</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[#526056]">Health:</span>
            <span className={`font-bold tabular-nums ${isHealthy ? 'text-[#1F6E43]' : 'text-[#C53030]'}`}>
              {data.healthScore}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#526056]">Status:</span>
            <span className={`font-semibold flex items-center gap-1 ${isHealthy ? 'text-[#1F6E43]' : 'text-[#C53030]'}`}>
              {isHealthy ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {isHealthy ? labels.healthy : labels.needsCare}
            </span>
          </div>
          {data.diseaseName && (
            <p className="text-xs text-[#C53030] font-medium pt-1">{data.diseaseName}</p>
          )}
          {data.treatment && (
            <p className="text-xs text-[#526056] line-clamp-2">{data.treatment}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-[#E4E7DF] rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#18221A]">{labels.title}</h3>
          <p className="text-sm text-[#526056]">{labels.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {availableCrops.length > 0 && (
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="min-h-[44px] bg-[#F7F8F5] border border-[#E4E7DF] text-[#18221A] text-sm font-medium rounded-xl px-3 outline-none focus:border-[#1F6E43]"
            >
              <option value="ALL">
                {labels.allCrops} ({trendData.length})
              </option>
              {availableCrops.map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center bg-[#F7F8F5] p-1 rounded-xl border border-[#E4E7DF]">
            {(['7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`min-h-[36px] px-3 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-[#1F6E43] text-white'
                    : 'text-[#526056] hover:text-[#18221A]'
                }`}
              >
                {range === '7d' ? '7D' : range === '30d' ? '30D' : labels.allTime}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredData.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6 pb-5 border-b border-[#E4E7DF]">
            <div>
              <span className="text-xs font-medium text-[#526056] block">{labels.latest}</span>
              <span className="text-2xl font-bold text-[#18221A] tabular-nums">{metrics.latestScore}%</span>
            </div>
            <div>
              <span className="text-xs font-medium text-[#526056] block">{labels.average}</span>
              <span className="text-2xl font-bold text-[#1F6E43] tabular-nums">{metrics.averageScore}%</span>
            </div>
            <div>
              <span className="text-xs font-medium text-[#526056] block">{labels.scans}</span>
              <span className="text-2xl font-bold text-[#18221A] tabular-nums">{metrics.totalScans}</span>
            </div>
          </div>

          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredData} margin={{ top: 12, right: 16, left: -16, bottom: 4 }}>
                <defs>
                  <linearGradient id="daylightHealthArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1F6E43" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#1F6E43" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7DF" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  stroke="#526056"
                  tick={{ fill: '#526056', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E4E7DF' }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#526056"
                  tick={{ fill: '#526056', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E4E7DF' }}
                  unit="%"
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={80} stroke="#1F6E43" strokeDasharray="4 4" strokeOpacity={0.45} />
                <ReferenceLine y={50} stroke="#C53030" strokeDasharray="4 4" strokeOpacity={0.35} />
                <Area type="monotone" dataKey="healthScore" fill="url(#daylightHealthArea)" stroke="none" />
                <Line
                  type="monotone"
                  dataKey="healthScore"
                  stroke="#1F6E43"
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!cx || !cy) return null;
                    const isHealthy = payload.status === 'Healthy';
                    return (
                      <circle
                        key={`dot-${payload.id}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={isHealthy ? '#1F6E43' : '#C53030'}
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 7, fill: '#1F6E43', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-5 mt-4 pt-3 border-t border-[#E4E7DF] text-xs text-[#526056]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1F6E43]" />
              {labels.healthy} (80%+)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C53030]" />
              {labels.needsCare} (&lt;50%)
            </span>
          </div>
        </>
      ) : (
        <div className="py-10 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-[#E9F5EE] text-[#1F6E43] flex items-center justify-center mx-auto mb-4">
            <Sprout className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[#18221A] mb-1">{labels.emptyTitle}</h4>
          <p className="text-sm text-[#526056] mb-6">{labels.emptyDesc}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {onScanNewPlant && (
              <button
                type="button"
                onClick={onScanNewPlant}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1F6E43] hover:bg-[#185835] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4" />
                {labels.scanNow}
              </button>
            )}
            {onSeedSampleData && (
              <button
                type="button"
                onClick={onSeedSampleData}
                disabled={isSeeding}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F7F8F5] hover:bg-[#E9F5EE] text-[#18221A] border border-[#E4E7DF] text-sm font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-[#1F6E43] ${isSeeding ? 'animate-spin' : ''}`} />
                {isSeeding ? labels.loadingSample : labels.loadSample}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
