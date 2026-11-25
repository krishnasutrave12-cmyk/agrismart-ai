import React, { useState } from 'react';
import { IndianRupee, Search, ExternalLink, AlertCircle, Calendar } from 'lucide-react';
import { Language, strings } from '../translations';
import { fetchMandiPrices } from '../services/geminiService';

interface MandiPricesViewProps {
  language: Language;
}

export const MandiPricesView: React.FC<MandiPricesViewProps> = ({ language }) => {
  const t = strings[language];
  const [crop, setCrop] = useState('Onion');
  const [state, setState] = useState('Maharashtra');
  const [market, setMarket] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent, cropOverride?: string) => {
    if (e) e.preventDefault();
    const targetCrop = (cropOverride ?? crop).trim();
    if (!targetCrop) return;
    if (cropOverride) setCrop(cropOverride);

    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchMandiPrices({
        crop: targetCrop,
        state,
        market: market.trim(),
        language,
      });
      setResult(data);
    } catch (err: any) {
      setResult(null);
      setErrorMsg(err?.message || t.common.apiErrorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const popularCrops = ['Onion', 'Soybean', 'Cotton', 'Wheat', 'Tomato', 'Potato', 'Rice', 'Chilli', 'Maize'];
  const indianStates = [
    'Maharashtra',
    'Madhya Pradesh',
    'Punjab',
    'Uttar Pradesh',
    'Gujarat',
    'Karnataka',
    'Rajasthan',
    'Haryana',
    'Andhra Pradesh',
    'Tamil Nadu',
  ];

  const formatRupees = (val: any) =>
    typeof val === 'number' && !isNaN(val) ? `₹${val.toLocaleString('en-IN')}` : '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.mandi}</h1>
        <p className="text-sm sm:text-base text-[#526056] mt-1">
          {language === 'hi'
            ? 'Agmarknet और सरकारी मंडी स्रोतों से न्यूनतम, अधिकतम और मॉडल भाव खोजें और तुलना करें।'
            : language === 'mr'
            ? 'Agmarknet आणि अधिकृत बाजार समिती स्त्रोतांवरून किमान, कमाल आणि सर्वसाधारण दर पहा व तुलना करा.'
            : 'Search verified Agmarknet / APMC mandi prices (Min, Max, Modal) and compare markets. Prices are never fabricated.'}
        </p>
      </div>

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        className="bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#526056] mb-1">
              {language === 'hi' ? 'फसल चुनें / लिखें' : language === 'mr' ? 'पीक निवडा / लिहा' : 'Crop / Commodity'}
            </label>
            <input
              type="text"
              required
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              placeholder="e.g., Onion, Soybean, Cotton"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#526056] mb-1">
              {language === 'hi' ? 'राज्य' : language === 'mr' ? 'राज्य' : 'State'}
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
            >
              {indianStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#526056] mb-1">
              {language === 'hi'
                ? 'नजदीकी मंडी (वैकल्पिक)'
                : language === 'mr'
                ? 'जवळची बाजार समिती (ऐच्छिक)'
                : 'Nearby Market (Optional)'}
            </label>
            <input
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="e.g., Lasalgaon, Pune, Indore"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {popularCrops.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleSearch(undefined, c)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  crop.toLowerCase() === c.toLowerCase()
                    ? 'bg-[#E9F5EE] border-[#1F6E43] text-[#1F6E43]'
                    : 'bg-[#F7F8F5] border-[#E4E7DF] text-[#18221A] hover:border-[#1F6E43]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] px-6 rounded-xl bg-[#1F6E43] hover:bg-[#185835] disabled:bg-[#CBD2C6] text-white font-semibold text-sm inline-flex items-center gap-2 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? t.common.loading : t.common.search}</span>
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#C53030] rounded-xl p-4 text-sm">
          {errorMsg}
        </div>
      )}

      {!result && !loading && !errorMsg && (
        <div className="bg-white border border-[#E4E7DF] rounded-2xl p-8 text-center">
          <IndianRupee className="w-10 h-10 text-[#1F6E43] mx-auto mb-3" />
          <p className="text-sm text-[#526056] mb-4">
            {language === 'hi'
              ? 'फसल और राज्य चुनकर "खोजें" दबाएं और ताजा मंडी भाव देखें।'
              : language === 'mr'
              ? 'पीक व राज्य निवडून "शोधा" दाबा आणि अधिकृत बाजार भाव पहा.'
              : 'Select a crop and state above, then click Search to check live reported mandi prices.'}
          </p>
          <a
            href="https://agmarknet.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1F6E43] hover:underline"
          >
            <span>Agmarknet Official Portal (agmarknet.gov.in)</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {result && result.available === false && (
        <div className="bg-[#FEF6E7] border border-[#F5D79E] rounded-2xl p-5 space-y-3 text-sm text-[#8A540E]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-medium">{result.message || result.error}</p>
          </div>
          {Array.isArray(result.officialLinks) && (
            <div className="flex flex-wrap gap-3 pt-1">
              {result.officialLinks.map((lnk: any, i: number) => (
                <a
                  key={i}
                  href={lnk.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#F5D79E] text-[#1F6E43] font-semibold text-xs inline-flex items-center gap-1.5"
                >
                  <span>{lnk.title}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {result && result.available && Array.isArray(result.records) && (
        <div className="bg-white border border-[#E4E7DF] rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E4E7DF] flex flex-wrap items-center justify-between gap-2 bg-[#F7F8F5]">
            <div>
              <p className="text-sm font-bold text-[#18221A]">{result.sourceName}</p>
              {result.note && <p className="text-xs text-[#526056] mt-0.5">{result.note}</p>}
            </div>
            <div className="text-xs font-semibold text-[#1F6E43] inline-flex items-center gap-1.5 tabular-nums">
              <Calendar className="w-4 h-4" />
              <span>Last Updated: {result.lastUpdated}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-[#E4E7DF] text-xs text-[#526056]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Market / APMC</th>
                  <th className="py-3 px-4 font-semibold">Crop / Variety</th>
                  <th className="py-3 px-4 font-semibold text-right">Min Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Max Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Modal Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E7DF]">
                {result.records.map((rec: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#F7F8F5]">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#18221A]">{rec.market}</p>
                      <p className="text-xs text-[#526056]">
                        {[rec.district, rec.state].filter(Boolean).join(', ')}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#18221A]">{rec.crop}</p>
                      <p className="text-xs text-[#526056]">{rec.variety || 'General'}</p>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#526056]">
                      {formatRupees(rec.minPrice)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#526056]">
                      {formatRupees(rec.maxPrice)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-[#1F6E43]">
                      {formatRupees(rec.modalPrice)}
                      <span className="block text-[10px] font-normal text-[#526056]">
                        {rec.unit || '₹ / Quintal'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-[#526056] tabular-nums">
                      {rec.arrivalDate || result.lastUpdated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {Array.isArray(result.sourceUrls) && result.sourceUrls.length > 0 && (
            <div className="p-4 border-t border-[#E4E7DF] bg-[#F7F8F5] flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-[#526056]">Sources:</span>
              {result.sourceUrls.map((src: any, i: number) => (
                <a
                  key={i}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1F6E43] hover:underline inline-flex items-center gap-1"
                >
                  <span>{src.title}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
