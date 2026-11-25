import React, { useState } from 'react';
import { FlaskConical, Sprout, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Language, strings } from '../translations';
import { analyzeSoilHealth, getCropRecommendation } from '../services/geminiService';

export const SoilAnalysisView: React.FC<{
  language: Language;
  onResult: (res: any) => void;
}> = ({ language, onResult }) => {
  const t = strings[language];
  const [soilType, setSoilType] = useState('Black Cotton Soil');
  const [ph, setPh] = useState('6.8');
  const [nitrogen, setNitrogen] = useState('Medium');
  const [phosphorus, setPhosphorus] = useState('Low');
  const [potassium, setPotassium] = useState('Medium');
  const [moisture, setMoisture] = useState('45');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await analyzeSoilHealth({
        soilType,
        ph,
        nitrogen,
        phosphorus,
        potassium,
        moisture,
        language,
      });
      setResult(data);
      onResult({
        type: 'soil',
        result: `${soilType} (pH ${ph}) — ${data.soilCondition?.slice(0, 50) || 'Analyzed'}`,
        details: { inputs: { soilType, ph, nitrogen, phosphorus, potassium, moisture }, ...data },
      });
    } catch (err: any) {
      setErrorMsg(err?.message || t.common.apiErrorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const l = {
    subtitle:
      language === 'hi'
        ? 'मिट्टी का प्रकार, pH, नाइट्रोजन (N), फॉस्फोरस (P), पोटाश (K) और नमी दर्ज करें।'
        : language === 'mr'
        ? 'मातीचा प्रकार, सामू (pH), नत्र (N), स्फुरद (P), पालाश (K) आणि ओलावा प्रविष्ट करा.'
        : 'Enter your soil type, pH, Nitrogen (N), Phosphorus (P), Potassium (K), and moisture levels.',
    soilType: language === 'hi' ? 'मिट्टी का प्रकार' : language === 'mr' ? 'मातीचा प्रकार' : 'Soil Type',
    ph: language === 'hi' ? 'मिट्टी का pH मान' : language === 'mr' ? 'मातीचा सामू (pH)' : 'Soil pH',
    n: language === 'hi' ? 'नाइट्रोजन (N)' : language === 'mr' ? 'नत्र (Nitrogen - N)' : 'Nitrogen (N)',
    p: language === 'hi' ? 'फॉस्फोरस (P)' : language === 'mr' ? 'स्फुरद (Phosphorus - P)' : 'Phosphorus (P)',
    k: language === 'hi' ? 'पोटाश (K)' : language === 'mr' ? 'पालाश (Potassium - K)' : 'Potassium (K)',
    moisture: language === 'hi' ? 'मिट्टी की नमी (%)' : language === 'mr' ? 'मातीतील ओलावा (%)' : 'Soil Moisture (%)',
    condition: language === 'hi' ? 'मिट्टी की स्थिति' : language === 'mr' ? 'मातीची स्थिती' : 'Soil Condition',
    deficiency: language === 'hi' ? 'पोषक तत्वों की कमी' : language === 'mr' ? 'अन्नद्रव्यांची कमतरता' : 'Nutrient Deficiencies',
    improve: language === 'hi' ? 'मिट्टी सुधार सुझाव' : language === 'mr' ? 'माती सुधारणा उपाय' : 'Soil Improvement Suggestions',
    fertilizer: language === 'hi' ? 'उर्वरक मार्गदर्शन' : language === 'mr' ? 'खत व्यवस्थापन सल्ला' : 'Fertilizer Guidance',
    crops: language === 'hi' ? 'उपयुक्त फसलें' : language === 'mr' ? 'योग्य पिके' : 'Suitable Crops',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.soil}</h1>
        <p className="text-sm sm:text-base text-[#526056] mt-1">{l.subtitle}</p>
      </div>

      {errorMsg && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#C53030] rounded-xl p-4 flex justify-between text-sm">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-[#18221A] mb-1">{l.soilType}</label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
            >
              <option value="Black Cotton Soil">Black Cotton Soil (Regur / काळी कसदार माती)</option>
              <option value="Alluvial Soil">Alluvial Soil (जलोढ़ / गाळाची माती)</option>
              <option value="Red Loamy Soil">Red Loamy Soil (लाल माती)</option>
              <option value="Sandy Soil">Sandy Soil (रेतीली / वालुकामय माती)</option>
              <option value="Clay Soil">Clay Soil (चिकनी / चिकणमाती)</option>
              <option value="Laterite Soil">Laterite Soil (लैटेराइट / जांभी माती)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#18221A] mb-1">{l.ph}</label>
              <input
                type="number"
                step="0.1"
                min="3.0"
                max="10.0"
                value={ph}
                onChange={(e) => setPh(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm tabular-nums outline-none focus:border-[#1F6E43]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#18221A] mb-1">
                {l.moisture}
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={moisture}
                onChange={(e) => setMoisture(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm tabular-nums outline-none focus:border-[#1F6E43]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#18221A] mb-1">{l.n}</label>
              <select
                value={nitrogen}
                onChange={(e) => setNitrogen(e.target.value)}
                className="w-full min-h-[42px] px-2 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-xs outline-none focus:border-[#1F6E43]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18221A] mb-1">{l.p}</label>
              <select
                value={phosphorus}
                onChange={(e) => setPhosphorus(e.target.value)}
                className="w-full min-h-[42px] px-2 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-xs outline-none focus:border-[#1F6E43]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18221A] mb-1">{l.k}</label>
              <select
                value={potassium}
                onChange={(e) => setPotassium(e.target.value)}
                className="w-full min-h-[42px] px-2 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-xs outline-none focus:border-[#1F6E43]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-[#1F6E43] hover:bg-[#185835] disabled:bg-[#CBD2C6] text-white font-bold rounded-xl"
          >
            {loading ? t.common.analyzing : t.common.analyze}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white border border-[#E4E7DF] rounded-2xl p-5 sm:p-6">
          {!result ? (
            <div className="py-10 text-center">
              <FlaskConical className="w-10 h-10 text-[#1F6E43] mx-auto mb-3" />
              <p className="text-sm text-[#526056]">
                {language === 'hi'
                  ? 'मिट्टी जांच की पूरी रिपोर्ट यहाँ दिखेगी।'
                  : language === 'mr'
                  ? 'माती परीक्षणाचा संपूर्ण अहवाल येथे दिसेल.'
                  : 'Submit your soil parameters to view soil condition, deficiencies, fertilizer plan, and suitable crops.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5 text-sm">
              <div className="p-4 rounded-xl bg-[#E9F5EE] border border-[#CBE6D6]">
                <span className="text-xs font-bold text-[#1F6E43]">{l.condition}</span>
                <p className="text-base font-bold text-[#18221A] mt-0.5">{result.soilCondition}</p>
                {result.phStatus && (
                  <p className="text-xs text-[#526056] mt-1">{result.phStatus}</p>
                )}
              </div>

              {Array.isArray(result.nutrientDeficiencies) &&
                result.nutrientDeficiencies.length > 0 && (
                  <div>
                    <h3 className="font-bold text-[#18221A] mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-[#C47B17]" />
                      <span>{l.deficiency}</span>
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-[#526056]">
                      {result.nutrientDeficiencies.map((d: string, i: number) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

              <div>
                <h3 className="font-bold text-[#18221A] mb-1.5">{l.improve}</h3>
                <ul className="space-y-1.5 text-[#526056]">
                  {(result.improvementSuggestions || []).map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#1F6E43] shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF]">
                <h3 className="font-bold text-[#18221A] mb-1">{l.fertilizer}</h3>
                <p className="text-[#526056] leading-relaxed">{result.fertilizerGuidance}</p>
              </div>

              {Array.isArray(result.suitableCrops) && result.suitableCrops.length > 0 && (
                <div>
                  <h3 className="font-bold text-[#18221A] mb-2">{l.crops}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.suitableCrops.map((crop: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF]"
                      >
                        <p className="font-bold text-[#1F6E43]">{crop.name}</p>
                        <p className="text-xs text-[#526056] mt-0.5">{crop.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CropRecommendationView: React.FC<{
  language: Language;
  onResult: (res: any) => void;
}> = ({ language, onResult }) => {
  const t = strings[language];
  const [location, setLocation] = useState('Nashik, Maharashtra');
  const [soilType, setSoilType] = useState('Black Cotton Soil');
  const [season, setSeason] = useState('Kharif');
  const [rainfall, setRainfall] = useState('Medium (600-1000mm)');
  const [temperature, setTemperature] = useState('28');
  const [irrigation, setIrrigation] = useState('Drip / Borewell');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getCropRecommendation({
        location,
        soilType,
        season,
        rainfall,
        temperature,
        irrigation,
        language,
      });
      setResult(data);
      const topCrops = (data.recommendations || [])
        .map((c: any) => c.cropName)
        .slice(0, 3)
        .join(', ');
      onResult({
        type: 'crop',
        result: `${season} (${location}): ${topCrops || 'Crops Recommended'}`,
        details: { inputs: { location, soilType, season, rainfall, temperature, irrigation }, ...data },
      });
    } catch (err: any) {
      setErrorMsg(err?.message || t.common.apiErrorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.crop}</h1>
        <p className="text-sm sm:text-base text-[#526056] mt-1">
          {language === 'hi'
            ? 'अपने स्थान, मिट्टी, मौसम, बारिश, तापमान और सिंचाई के अनुसार सबसे उपयुक्त फसलें जानें।'
            : language === 'mr'
            ? 'तुमचे ठिकाण, माती, हंगाम, पाऊस, तापमान व सिंचनानुसार योग्य पिकांची शिफारस मिळवा.'
            : 'Enter your farm conditions to receive tailored crop recommendations with clear reasons.'}
        </p>
      </div>

      {errorMsg && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#C53030] rounded-xl p-4 flex justify-between text-sm">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-[#18221A] mb-1">
              {language === 'hi' ? 'स्थान (जिला / राज्य)' : language === 'mr' ? 'ठिकाण (जिल्हा / राज्य)' : 'Location (District / State)'}
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#18221A] mb-1">
                {language === 'hi' ? 'मिट्टी का प्रकार' : language === 'mr' ? 'मातीचा प्रकार' : 'Soil Type'}
              </label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full min-h-[44px] px-2.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
              >
                <option value="Black Cotton Soil">Black Cotton</option>
                <option value="Alluvial Soil">Alluvial</option>
                <option value="Red Loamy Soil">Red Loamy</option>
                <option value="Sandy Soil">Sandy</option>
                <option value="Clay Soil">Clay</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#18221A] mb-1">
                {language === 'hi' ? 'मौसम (सीजन)' : language === 'mr' ? 'हंगाम' : 'Season'}
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full min-h-[44px] px-2.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
              >
                <option value="Kharif">Kharif (Monsoon)</option>
                <option value="Rabi">Rabi (Winter)</option>
                <option value="Zaid">Zaid (Summer)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#18221A] mb-1">
                {language === 'hi' ? 'बारिश' : language === 'mr' ? 'पाऊस' : 'Rainfall'}
              </label>
              <select
                value={rainfall}
                onChange={(e) => setRainfall(e.target.value)}
                className="w-full min-h-[44px] px-2.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
              >
                <option value="Low (< 500mm)">Low (&lt;500mm)</option>
                <option value="Medium (600-1000mm)">Medium (600–1000mm)</option>
                <option value="High (> 1100mm)">High (&gt;1100mm)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#18221A] mb-1">
                {language === 'hi' ? 'तापमान (°C)' : language === 'mr' ? 'तापमान (°C)' : 'Avg Temp (°C)'}
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm tabular-nums outline-none focus:border-[#1F6E43]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#18221A] mb-1">
              {language === 'hi' ? 'सिंचाई सुविधा' : language === 'mr' ? 'सिंचन सुविधा' : 'Irrigation Availability'}
            </label>
            <select
              value={irrigation}
              onChange={(e) => setIrrigation(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
            >
              <option value="Rainfed Only">Rainfed Only (केवल बारिश / कोरडवाहू)</option>
              <option value="Partial / Well">Well / Partial Irrigation</option>
              <option value="Drip / Borewell">Drip / Borewell (Full Irrigation)</option>
              <option value="Canal Irrigation">Canal / River Irrigation</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-[#1F6E43] hover:bg-[#185835] disabled:bg-[#CBD2C6] text-white font-bold rounded-xl"
          >
            {loading ? t.common.analyzing : t.nav.crop}
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          {!result ? (
            <div className="bg-white border border-[#E4E7DF] rounded-2xl p-8 text-center">
              <Sprout className="w-10 h-10 text-[#1F6E43] mx-auto mb-3" />
              <p className="text-sm text-[#526056]">
                {language === 'hi'
                  ? 'विवरण भरें और सबसे उपयुक्त फसलों की सूची देखें।'
                  : language === 'mr'
                  ? 'माहिती भरा आणि तुमच्या शेतासाठी सर्वोत्तम पिकांची यादी पहा.'
                  : 'Enter your farm details to see the best crops and why each one fits your field.'}
              </p>
            </div>
          ) : (
            <>
              {result.summary && (
                <div className="bg-[#E9F5EE] border border-[#CBE6D6] rounded-2xl p-4 text-sm text-[#18221A]">
                  {result.summary}
                </div>
              )}
              <div className="space-y-3">
                {(result.recommendations || []).map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-[#1F6E43]">{rec.cropName}</h3>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#E9F5EE] text-[#1F6E43]">
                        {rec.suitabilityLevel} · {rec.expectedDuration}
                      </span>
                    </div>
                    <p className="text-[#18221A] leading-relaxed">
                      <strong>
                        {language === 'hi' ? 'क्यों चुनें:' : language === 'mr' ? 'का निवडावे:' : 'Why recommended:'}
                      </strong>{' '}
                      {rec.whyRecommended}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#E4E7DF] text-xs text-[#526056]">
                      <div>
                        <strong className="text-[#18221A]">Water Need:</strong> {rec.waterRequirement}
                      </div>
                      <div>
                        <strong className="text-[#18221A]">Sowing Tip:</strong> {rec.sowingTips}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
