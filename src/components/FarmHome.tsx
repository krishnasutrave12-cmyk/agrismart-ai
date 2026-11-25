import React, { useMemo } from 'react';
import {
  Leaf,
  Flower2,
  Bug,
  MessageSquare,
  CloudSun,
  FlaskConical,
  Sprout,
  IndianRupee,
  Calculator,
  Landmark,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Camera,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Language, strings } from '../translations';
import { FarmerUser, HistoryItem } from '../types';
import { DashboardPageId } from './NavigationShell';

interface FarmHomeProps {
  language: Language;
  user: FarmerUser;
  history: HistoryItem[];
  setActiveTab: (tab: DashboardPageId) => void;
}

export const FarmHome: React.FC<FarmHomeProps> = ({
  language,
  user,
  history,
  setActiveTab,
}) => {
  const t = strings[language];
  const firstName = (user.displayName || t.common.guestFarmer).split(' ')[0];

  // Last 10 plant scans for the small Recharts healthScore line chart
  const lastTenScans = useMemo(() => {
    const plantScans = history
      .filter((item) => item.type === 'plant')
      .map((item, idx) => {
        const d = item.details || {};
        const statusStr = `${d.status || ''} ${item.result || ''}`.toLowerCase();
        const isInfected = statusStr.includes('infect') || statusStr.includes('diseas');
        const score =
          typeof item.healthScore === 'number'
            ? item.healthScore
            : typeof d.healthScore === 'number'
            ? d.healthScore
            : isInfected
            ? 48
            : 92;

        let ts = item.rawDate || Date.now() - idx * 1000;
        if (!item.rawDate && item.timestamp) {
          const parsed = new Date(item.timestamp).getTime();
          if (!isNaN(parsed)) ts = parsed;
        }
        const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
        return {
          id: item.id,
          crop: d.plantName || item.result.split('-')[0]?.trim() || 'Crop',
          healthScore: Math.min(100, Math.max(0, Math.round(score))),
          status: isInfected ? t.common.infected : t.common.healthy,
          dateLabel: new Date(ts).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
          rawDate: ts,
        };
      })
      .sort((a, b) => b.rawDate - a.rawDate)
      .slice(0, 10)
      .reverse();

    return plantScans;
  }, [history, language, t.common.healthy, t.common.infected]);

  const stats = useMemo(() => {
    const plantScans = history.filter((h) => h.type === 'plant');
    const infectedCount = plantScans.filter((h) =>
      `${h.details?.status || ''} ${h.result || ''}`.toLowerCase().includes('infect')
    ).length;
    const avgScore =
      lastTenScans.length > 0
        ? Math.round(
            lastTenScans.reduce((sum, p) => sum + p.healthScore, 0) / lastTenScans.length
          )
        : null;
    return {
      totalRecords: history.length,
      plantScans: plantScans.length,
      infectedCount,
      avgScore,
    };
  }, [history, lastTenScans]);

  const modules: {
    id: DashboardPageId;
    title: string;
    desc: string;
    icon: React.ComponentType<any>;
  }[] = [
    {
      id: 'disease',
      title: t.nav.disease,
      desc:
        language === 'hi'
          ? 'पत्ते या फसल की फोटो से रोग और उपचार जानें'
          : language === 'mr'
          ? 'पानाच्या फोटोवरून पिकाचे नाव, रोग व उपचार जाणून घ्या'
          : 'Identify crops and detect plant diseases from a photo',
      icon: Leaf,
    },
    {
      id: 'flower',
      title: t.nav.flower,
      desc:
        language === 'hi'
          ? 'फूल की फोटो से नाम, मौसम और देखभाल की जानकारी पाएं'
          : language === 'mr'
          ? 'फुलाच्या फोटोवरून नाव, हंगाम आणि निगा माहिती मिळवा'
          : 'Identify flowers, blooming season & floriculture care',
      icon: Flower2,
    },
    {
      id: 'pest',
      title: t.nav.pest,
      desc:
        language === 'hi'
          ? 'कीड़ों की फोटो से नुकसान और नियंत्रण उपाय जानें'
          : language === 'mr'
          ? 'कीटकाच्या फोटोवरून नुकसान व नियंत्रण उपाय जाणून घ्या'
          : 'Identify insects/pests and get IPM control advice',
      icon: Bug,
    },
    {
      id: 'chat',
      title: t.nav.chat,
      desc:
        language === 'hi'
          ? 'बोलकर या लिखकर खेती का कोई भी प्रश्न पूछें'
          : language === 'mr'
          ? 'बोलून किंवा लिहून शेतीचा कोणताही प्रश्न विचारा'
          : 'Ask farming questions by voice or text in EN/HI/MR',
      icon: MessageSquare,
    },
    {
      id: 'weather',
      title: t.nav.weather,
      desc:
        language === 'hi'
          ? 'ताजा तापमान, 7 दिन का पूर्वानुमान और बारिश चेतावनी'
          : language === 'mr'
          ? 'थेट तापमान, ७ दिवसांचा अंदाज आणि मुसळधार पाऊस सूचना'
          : 'Live temperature, 7-day forecast & heavy rain alerts',
      icon: CloudSun,
    },
    {
      id: 'soil',
      title: t.nav.soil,
      desc:
        language === 'hi'
          ? 'मिट्टी का pH और NPK डालकर खाद सलाह पाएं'
          : language === 'mr'
          ? 'मातीचा pH आणि NPK भरून खत व पीक सल्ला मिळवा'
          : 'Enter soil type, pH & NPK for fertilizer advice',
      icon: FlaskConical,
    },
    {
      id: 'crop',
      title: t.nav.crop,
      desc:
        language === 'hi'
          ? 'मौसम, मिट्टी और सिंचाई के अनुसार सही फसल चुनें'
          : language === 'mr'
          ? 'हवामान, माती व पाण्यानुसार योग्य पीक निवडा'
          : 'Get suitable crop choices for your season and soil',
      icon: Sprout,
    },
    {
      id: 'mandi',
      title: t.nav.mandi,
      desc:
        language === 'hi'
          ? 'मंडी के न्यूनतम, अधिकतम और मॉडल भाव देखें'
          : language === 'mr'
          ? 'बाजार समितीचे किमान, कमाल आणि सर्वसाधारण दर पहा'
          : 'Check verified min, max & modal APMC mandi prices',
      icon: IndianRupee,
    },
    {
      id: 'expense',
      title: t.nav.expense,
      desc:
        language === 'hi'
          ? 'कुल लागत, कमाई, मुनाफा और प्रति एकड़ खर्च निकालें'
          : language === 'mr'
          ? 'एकूण खर्च, उत्पन्न, नफा आणि एकरी खर्चाचा हिशोब करा'
          : 'Calculate total cost, revenue, profit & ROI per acre',
      icon: Calculator,
    },
    {
      id: 'schemes',
      title: t.nav.schemes,
      desc:
        language === 'hi'
          ? 'PM-KISAN, फसल बीमा और सरकारी योजनाओं की जानकारी'
          : language === 'mr'
          ? 'पीएम-किसान, पीक विमा व शासकीय योजनांची माहिती'
          : 'Verified Indian agricultural schemes & official links',
      icon: Landmark,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <section className="bg-white border border-[#E4E7DF] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#18221A]">
            {language === 'hi'
              ? `नमस्ते, ${firstName}`
              : language === 'mr'
              ? `नमस्कार, ${firstName}`
              : `Welcome, ${firstName}`}
          </h1>
          <p className="text-sm sm:text-base text-[#526056] mt-1">{t.tagline}</p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('disease')}
          className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1F6E43] hover:bg-[#185835] text-white font-semibold text-sm sm:text-base inline-flex items-center justify-center gap-2 shrink-0 transition-colors"
        >
          <Camera className="w-4 h-4" />
          <span>{t.nav.disease}</span>
        </button>
      </section>

      {/* Summary Stats Row */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E4E7DF] rounded-2xl p-4">
          <p className="text-xs font-semibold text-[#526056]">
            {language === 'hi'
              ? 'कुल फसल जांच'
              : language === 'mr'
              ? 'एकूण पीक तपासण्या'
              : 'Total Plant Scans'}
          </p>
          <p className="text-2xl font-bold text-[#18221A] tabular-nums mt-1">
            {stats.plantScans}
          </p>
        </div>

        <div className="bg-white border border-[#E4E7DF] rounded-2xl p-4">
          <p className="text-xs font-semibold text-[#526056]">
            {language === 'hi'
              ? 'औसत फसल स्वास्थ्य'
              : language === 'mr'
              ? 'सरासरी पीक आरोग्य'
              : 'Avg. Health Score (Last 10)'}
          </p>
          <p className="text-2xl font-bold text-[#1F6E43] tabular-nums mt-1">
            {stats.avgScore !== null ? `${stats.avgScore}%` : '—'}
          </p>
        </div>

        <div className="bg-white border border-[#E4E7DF] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#526056]">
              {language === 'hi'
                ? 'रोग चेतावनी'
                : language === 'mr'
                ? 'काळजी आवश्यक'
                : 'Needs Attention'}
            </p>
            <p
              className={`text-2xl font-bold tabular-nums mt-1 ${
                stats.infectedCount > 0 ? 'text-[#C53030]' : 'text-[#1F6E43]'
              }`}
            >
              {stats.infectedCount}
            </p>
          </div>
          {stats.infectedCount > 0 ? (
            <AlertTriangle className="w-7 h-7 text-[#C53030]" />
          ) : (
            <CheckCircle2 className="w-7 h-7 text-[#1F6E43]" />
          )}
        </div>
      </section>

      {/* Small Recharts Line Chart: Last 10 Plant Scans healthScore Trend */}
      <section className="bg-white border border-[#E4E7DF] rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#18221A]">
              {language === 'hi'
                ? 'पिछले 10 पौधों की जांच का स्वास्थ्य ग्राफ'
                : language === 'mr'
                ? 'मागील १० रोप तपासण्यांचा आरोग्य आलेख'
                : 'Crop Health Trend (Last 10 Plant Scans)'}
            </h2>
            <p className="text-xs text-[#526056]">
              {language === 'hi'
                ? 'समय के साथ फसल स्वास्थ्य स्कोर (0–100%)'
                : language === 'mr'
                ? 'वेळेनुसार तुमच्या पिकांचा आरोग्य स्कोअर (0–100%)'
                : 'See if your crops are improving over time (healthScore 0–100%)'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className="text-xs sm:text-sm font-semibold text-[#1F6E43] hover:underline inline-flex items-center gap-1"
          >
            <span>{t.common.viewAll}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {lastTenScans.length === 0 ? (
          <div className="py-8 text-center bg-[#F7F8F5] rounded-xl border border-dashed border-[#D5DDD0]">
            <p className="text-sm text-[#526056] mb-3">
              {language === 'hi'
                ? 'अभी कोई पौधे की जांच सहेजी नहीं गई है। ग्राफ देखने के लिए पहली फसल जांचें।'
                : language === 'mr'
                ? 'अद्याप कोणतीही रोप तपासणी जतन नाही. आलेख पाहण्यासाठी पहिले रोपाचे रोग तपासा.'
                : 'No plant scans recorded yet. Scan a crop to start tracking your health trend.'}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('disease')}
              className="min-h-[40px] px-4 rounded-xl bg-[#1F6E43] text-white text-sm font-semibold"
            >
              {t.nav.disease}
            </button>
          </div>
        ) : (
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lastTenScans} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7DF" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: '#526056', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E4E7DF' }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  unit="%"
                  tick={{ fill: '#526056', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E4E7DF' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E4E7DF',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, _name: any, props: any) => [
                    `${value}% (${props?.payload?.crop || 'Crop'} — ${props?.payload?.status || ''})`,
                    language === 'hi'
                      ? 'स्वास्थ्य स्कोर'
                      : language === 'mr'
                      ? 'आरोग्य स्कोअर'
                      : 'Health Score',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="healthScore"
                  stroke="#1F6E43"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#1F6E43', stroke: '#FFFFFF', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#1F6E43' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Farming Modules Grid */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[#18221A]">
          {language === 'hi'
            ? 'खेती उपकरण चुनें'
            : language === 'mr'
            ? 'शेती साधने निवडा'
            : 'Farming Tools'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveTab(m.id)}
                className="bg-white border border-[#E4E7DF] hover:border-[#1F6E43] rounded-2xl p-4 text-left flex items-start gap-3.5 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E9F5EE] text-[#1F6E43] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-[#18221A]">{m.title}</h3>
                  <p className="text-xs sm:text-sm text-[#526056] mt-0.5 leading-snug">{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Activity Preview */}
      {history.length > 0 && (
        <section className="bg-white border border-[#E4E7DF] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#18221A] flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#1F6E43]" />
              <span>{t.nav.history}</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="text-xs sm:text-sm font-semibold text-[#1F6E43] hover:underline"
            >
              {t.common.viewAll}
            </button>
          </div>
          <div className="divide-y divide-[#E4E7DF]">
            {history.slice(0, 4).map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-[#18221A] truncate">{item.result}</span>
                <span className="text-xs text-[#526056] tabular-nums shrink-0">
                  {item.timestamp}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
