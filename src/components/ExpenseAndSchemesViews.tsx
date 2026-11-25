import React, { useState, useMemo } from 'react';
import {
  Calculator,
  BookmarkCheck,
  Landmark,
  ExternalLink,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Language, strings } from '../translations';

export const ExpenseCalculatorView: React.FC<{
  language: Language;
  onSaveExpense: (item: any) => void;
}> = ({ language, onSaveExpense }) => {
  const t = strings[language];
  const [cropName, setCropName] = useState('Soybean');
  const [areaAcres, setAreaAcres] = useState('2');
  const [seed, setSeed] = useState('4500');
  const [fertilizer, setFertilizer] = useState('6000');
  const [labour, setLabour] = useState('8000');
  const [irrigation, setIrrigation] = useState('2500');
  const [pesticide, setPesticide] = useState('3000');
  const [transport, setTransport] = useState('2000');
  const [expectedYield, setExpectedYield] = useState('14');
  const [sellingPrice, setSellingPrice] = useState('4600');
  const [savedNotice, setSavedNotice] = useState(false);

  const num = (v: string) => {
    const parsed = parseFloat(v);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  };

  const calc = useMemo(() => {
    const totalInvestment =
      num(seed) +
      num(fertilizer) +
      num(labour) +
      num(irrigation) +
      num(pesticide) +
      num(transport);
    const acres = Math.max(num(areaAcres), 0.1);
    const revenue = num(expectedYield) * num(sellingPrice);
    const profit = revenue - totalInvestment;
    const costPerAcre = totalInvestment / acres;
    const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;
    return { totalInvestment, revenue, profit, costPerAcre, roi, acres };
  }, [seed, fertilizer, labour, irrigation, pesticide, transport, areaAcres, expectedYield, sellingPrice]);

  const handleSave = () => {
    const label = `${cropName || 'Crop'} (${calc.acres} acre) — ${
      calc.profit >= 0 ? 'Profit' : 'Loss'
    } ₹${Math.abs(Math.round(calc.profit)).toLocaleString('en-IN')}`;
    onSaveExpense({
      type: 'expense',
      result: label,
      details: {
        cropName,
        areaAcres: calc.acres,
        expenses: {
          seed: num(seed),
          fertilizer: num(fertilizer),
          labour: num(labour),
          irrigation: num(irrigation),
          pesticide: num(pesticide),
          transport: num(transport),
        },
        expectedYieldQuintals: num(expectedYield),
        sellingPricePerQuintal: num(sellingPrice),
        totalInvestment: Math.round(calc.totalInvestment),
        estimatedRevenue: Math.round(calc.revenue),
        estimatedProfit: Math.round(calc.profit),
        costPerAcre: Math.round(calc.costPerAcre),
        roiPercent: Number(calc.roi.toFixed(1)),
      },
    });
    setSavedNotice(true);
  };

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  const fields = [
    {
      label: language === 'hi' ? 'बीज खर्च (₹)' : language === 'mr' ? 'बियाणे खर्च (₹)' : 'Seed Expense (₹)',
      value: seed,
      set: setSeed,
    },
    {
      label: language === 'hi' ? 'खाद खर्च (₹)' : language === 'mr' ? 'खते खर्च (₹)' : 'Fertilizer Expense (₹)',
      value: fertilizer,
      set: setFertilizer,
    },
    {
      label: language === 'hi' ? 'मजदूरी खर्च (₹)' : language === 'mr' ? 'मजुरी खर्च (₹)' : 'Labour Expense (₹)',
      value: labour,
      set: setLabour,
    },
    {
      label: language === 'hi' ? 'सिंचाई खर्च (₹)' : language === 'mr' ? 'सिंचन खर्च (₹)' : 'Irrigation Expense (₹)',
      value: irrigation,
      set: setIrrigation,
    },
    {
      label: language === 'hi' ? 'कीटनाशक खर्च (₹)' : language === 'mr' ? 'कीटकनाशके खर्च (₹)' : 'Pesticide Expense (₹)',
      value: pesticide,
      set: setPesticide,
    },
    {
      label: language === 'hi' ? 'परिवहन खर्च (₹)' : language === 'mr' ? 'वाहतूक खर्च (₹)' : 'Transportation Expense (₹)',
      value: transport,
      set: setTransport,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.expense}</h1>
        <p className="text-sm sm:text-base text-[#526056] mt-1">
          {language === 'hi'
            ? 'अपने खेती के सभी खर्च और अनुमानित उपज डालें — कुल लागत, कमाई, मुनाफा और प्रति एकड़ खर्च तुरंत देखें।'
            : language === 'mr'
            ? 'शेतीचा सर्व खर्च व अपेक्षित उत्पादन टाका — एकूण गुंतवणूक, उत्पन्न, नफा आणि एकरी खर्च त्वरित पहा.'
            : 'Enter your crop expenses, area, expected yield, and selling price to calculate profit, cost per acre, and ROI.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#526056] mb-1">
                {language === 'hi' ? 'फसल का नाम' : language === 'mr' ? 'पिकाचे नाव' : 'Crop Name'}
              </label>
              <input
                type="text"
                value={cropName}
                onChange={(e) => {
                  setCropName(e.target.value);
                  setSavedNotice(false);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#526056] mb-1">
                {language === 'hi' ? 'कुल भूमि (एकड़)' : language === 'mr' ? 'क्षेत्रफळ (एकर)' : 'Farm Area (Acres)'}
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={areaAcres}
                onChange={(e) => {
                  setAreaAcres(e.target.value);
                  setSavedNotice(false);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm tabular-nums outline-none focus:border-[#1F6E43]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E4E7DF]">
            {fields.map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-[#526056] mb-1">{f.label}</label>
                <input
                  type="number"
                  min="0"
                  value={f.value}
                  onChange={(e) => {
                    f.set(e.target.value);
                    setSavedNotice(false);
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm tabular-nums outline-none focus:border-[#1F6E43]"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E4E7DF]">
            <div>
              <label className="block text-xs font-semibold text-[#526056] mb-1">
                {language === 'hi'
                  ? 'अनुमानित उपज (क्विंटल)'
                  : language === 'mr'
                  ? 'अपेक्षित उत्पादन (क्विंटल)'
                  : 'Expected Crop Yield (Quintals)'}
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={expectedYield}
                onChange={(e) => {
                  setExpectedYield(e.target.value);
                  setSavedNotice(false);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm tabular-nums outline-none focus:border-[#1F6E43]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#526056] mb-1">
                {language === 'hi'
                  ? 'बिक्री मूल्य (₹ / क्विंटल)'
                  : language === 'mr'
                  ? 'विक्री दर (₹ / क्विंटल)'
                  : 'Selling Price (₹ / Quintal)'}
              </label>
              <input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(e) => {
                  setSellingPrice(e.target.value);
                  setSavedNotice(false);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm tabular-nums outline-none focus:border-[#1F6E43]"
              />
            </div>
          </div>
        </div>

        {/* Summary Output Card */}
        <div className="lg:col-span-5 bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-base text-[#18221A]">
            <Calculator className="w-5 h-5 text-[#1F6E43]" />
            <span>
              {language === 'hi'
                ? 'खर्च और मुनाफे का सारांश'
                : language === 'mr'
                ? 'खर्च व नफ्याचा सारांश'
                : 'Financial Summary'}
            </span>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              calc.profit >= 0
                ? 'bg-[#E9F5EE] border-[#CBE6D6]'
                : 'bg-[#FEF2F2] border-[#FECACA]'
            }`}
          >
            <span className="text-xs font-semibold text-[#526056] block">
              {calc.profit >= 0
                ? language === 'hi'
                  ? 'अनुमानित शुद्ध लाभ'
                  : language === 'mr'
                  ? 'अंदाजे निव्वळ नफा'
                  : 'Estimated Net Profit'
                : language === 'hi'
                ? 'अनुमानित हानि'
                : language === 'mr'
                ? 'अंदाजे तोटा'
                : 'Estimated Net Loss'}
            </span>
            <p
              className={`text-3xl font-bold tabular-nums mt-0.5 ${
                calc.profit >= 0 ? 'text-[#1F6E43]' : 'text-[#C53030]'
              }`}
            >
              {calc.profit < 0 ? '-' : ''}
              {fmt(Math.abs(calc.profit))}
            </p>
          </div>

          <div className="divide-y divide-[#E4E7DF] text-sm">
            <div className="py-2.5 flex justify-between">
              <span className="text-[#526056]">
                {language === 'hi' ? 'कुल निवेश (लागत)' : language === 'mr' ? 'एकूण गुंतवणूक (खर्च)' : 'Total Investment'}
              </span>
              <span className="font-bold tabular-nums">{fmt(calc.totalInvestment)}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#526056]">
                {language === 'hi' ? 'अनुमानित कुल आय' : language === 'mr' ? 'अंदाजे एकूण उत्पन्न' : 'Estimated Revenue'}
              </span>
              <span className="font-bold tabular-nums text-[#1F6E43]">{fmt(calc.revenue)}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#526056]">
                {language === 'hi' ? 'प्रति एकड़ लागत' : language === 'mr' ? 'प्रति एकर खर्च' : 'Cost per Acre'}
              </span>
              <span className="font-bold tabular-nums">{fmt(calc.costPerAcre)}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#526056]">
                {language === 'hi' ? 'अनुमानित ROI (%)' : language === 'mr' ? 'अंदाजे परतावा (ROI %)' : 'Estimated ROI'}
              </span>
              <span
                className={`font-bold tabular-nums ${
                  calc.roi >= 0 ? 'text-[#1F6E43]' : 'text-[#C53030]'
                }`}
              >
                {calc.roi.toFixed(1)}%
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full min-h-[46px] rounded-xl bg-[#1F6E43] hover:bg-[#185835] text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>{savedNotice ? t.common.saved : t.common.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface SchemeItem {
  id: string;
  name: Record<Language, string>;
  info: Record<Language, string>;
  eligibility: Record<Language, string>;
  benefits: Record<Language, string>;
  applicationProcess: Record<Language, string>;
  officialUrl: string;
  updatedDate: string;
}

const VERIFIED_SCHEMES: SchemeItem[] = [
  {
    id: 'pm-kisan',
    name: {
      en: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
      hi: 'पीएम-किसान (प्रधानमंत्री किसान सम्मान निधि)',
      mr: 'पीएम-किसान (प्रधानमंत्री किसान सन्मान निधी)',
    },
    info: {
      en: 'Central sector income support scheme providing direct financial assistance to landholding farmer families across India.',
      hi: 'भारत के भूमिधारक किसान परिवारों को सीधी आर्थिक सहायता देने वाली केंद्र सरकार की योजना।',
      mr: 'भारतातील भूधारक शेतकरी कुटुंबांना थेट आर्थिक मदत देणारी केंद्र सरकारची योजना.',
    },
    eligibility: {
      en: 'All eligible landholding farmer families with cultivable land records (subject to income-tax & institutional exclusions).',
      hi: 'खेती योग्य भूमि वाले सभी पात्र किसान परिवार (आयकर दाता और संस्थागत भूमिधारक अपात्र)।',
      mr: 'लागवडीयोग्य जमीन असलेली सर्व पात्र शेतकरी कुटुंबे (आयकर भरणारे वगळून).',
    },
    benefits: {
      en: '₹6,000 per year paid in three equal ₹2,000 installments directly into Aadhaar-seeded bank accounts.',
      hi: 'प्रति वर्ष ₹6,000 (₹2,000 की तीन किश्तों में) सीधे आधार से जुड़े बैंक खाते में।',
      mr: 'दरवर्षी ₹६,००० (₹२,००० चे तीन हप्ते) थेट आधार-लिंक बँक खात्यात जमा होतात.',
    },
    applicationProcess: {
      en: 'Register online at pmkisan.gov.in using Aadhaar & land records, or apply through your nearest Common Service Centre (CSC) / Patwari.',
      hi: 'pmkisan.gov.in पर आधार व खतौनी के साथ पंजीकरण करें या नजदीकी CSC केंद्र / पटवारी से आवेदन करें।',
      mr: 'pmkisan.gov.in पोर्टलवर आधार व ७/१२ उताऱ्यासह नोंदणी करा किंवा जवळच्या CSC / तलाठी कार्यालयात अर्ज करा.',
    },
    officialUrl: 'https://pmkisan.gov.in/',
    updatedDate: 'November 2026',
  },
  {
    id: 'pmfby',
    name: {
      en: 'PMFBY (Pradhan Mantri Fasal Bima Yojana)',
      hi: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)',
      mr: 'प्रधानमंत्री पीक विमा योजना (PMFBY)',
    },
    info: {
      en: 'Government-backed crop insurance protecting farmers against natural calamities, pests, and crop diseases.',
      hi: 'प्राकृतिक आपदा, कीट और रोग से फसल नुकसान होने पर किसानों को बीमा सुरक्षा देने वाली योजना।',
      mr: 'नैसर्गिक आपत्ती, कीड आणि रोगांमुळे पीक नुकसान झाल्यास शेतकऱ्यांना विमा संरक्षण देणारी योजना.',
    },
    eligibility: {
      en: 'All farmers (including sharecroppers and tenant farmers) growing notified crops in notified areas.',
      hi: 'अधिसूचित क्षेत्रों में अधिसूचित फसल उगाने वाले सभी किसान (बटाईदार व किराएदार किसान सहित)।',
      mr: 'अधिसूचित क्षेत्रातील अधिसूचित पिके घेणारे सर्व शेतकरी (कुळ व भाडेपट्टी शेतकरी देखील).',
    },
    benefits: {
      en: 'Low farmer premium: 2% for Kharif, 1.5% for Rabi, and 5% for horticultural/commercial crops; government subsidizes the balance.',
      hi: 'खरीफ पर 2%, रबी पर 1.5% और बागवानी फसलों पर 5% प्रीमियम; शेष राशि सरकार भरती है।',
      mr: 'खरीप पिकासाठी २%, रब्बीसाठी १.५% आणि नगदी/फळपिकांसाठी ५% विमा हप्ता; उर्वरित रक्कम सरकार भरते.',
    },
    applicationProcess: {
      en: 'Apply online via pmfby.gov.in, CSC centres, or through your crop loan bank before the seasonal cut-off date.',
      hi: 'सीजन की अंतिम तिथि से पहले pmfby.gov.in, CSC केंद्र या अपने बैंक से आवेदन करें।',
      mr: 'हंगामाच्या अंतिम तारखेपूर्वी pmfby.gov.in, CSC केंद्र किंवा बँकेमार्फत अर्ज करा.',
    },
    officialUrl: 'https://pmfby.gov.in/',
    updatedDate: 'November 2026',
  },
  {
    id: 'kcc',
    name: {
      en: 'Kisan Credit Card (KCC)',
      hi: 'किसान क्रेडिट कार्ड (KCC)',
      mr: 'किसान क्रेडिट कार्ड (KCC)',
    },
    info: {
      en: 'Timely and affordable short-term credit facility for crop cultivation, seeds, fertilizers, and allied activities.',
      hi: 'बीज, खाद, खेती खर्च और पशुपालन/मत्स्यपालन के लिए समय पर और कम ब्याज पर कृषि ऋण सुविधा।',
      mr: 'बियाणे, खते, पीक लागवड व शेतीपूरक व्यवसायासाठी वेळेवर व कमी व्याजदरात पीक कर्ज सुविधा.',
    },
    eligibility: {
      en: 'Individual/joint owner cultivators, tenant farmers, oral lessees, SHGs, and animal husbandry/fisheries farmers.',
      hi: 'भूमि स्वामी किसान, बटाईदार, किराएदार किसान, स्वयं सहायता समूह व पशुपालक किसान।',
      mr: 'जमीन मालक शेतकरी, भाडेपट्टी शेतकरी, बचत गट तसेच पशुपालन व मत्स्यपालन करणारे शेतकरी.',
    },
    benefits: {
      en: 'Short-term crop loans up to ₹3 lakh with interest subvention (effective interest around 4% p.a. on prompt repayment).',
      hi: '₹3 लाख तक अल्पकालिक फसल ऋण पर ब्याज अनुदान (समय पर चुकाने पर प्रभावी ब्याज लगभग 4% वार्षिक)।',
      mr: '₹३ लाखांपर्यंतच्या पीक कर्जावर व्याज सवलत (वेळेवर परतफेड केल्यास सुमारे ४% प्रभावी व्याजदर).',
    },
    applicationProcess: {
      en: 'Apply at any public/cooperative/regional rural bank branch or via the Jansamarth / PM-KISAN portal with Aadhaar & land papers.',
      hi: 'नजदीकी बैंक शाखा या जनसमर्थ पोर्टल पर आधार व भूमि दस्तावेजों के साथ आवेदन करें।',
      mr: 'जवळच्या बँक शाखेत किंवा जनसमर्थ पोर्टलवर आधार व जमिनीच्या कागदपत्रांसह अर्ज करा.',
    },
    officialUrl: 'https://www.jansamarth.in/',
    updatedDate: 'November 2026',
  },
  {
    id: 'soil-health-card',
    name: {
      en: 'Soil Health Card Scheme',
      hi: 'मृदा स्वास्थ्य कार्ड योजना (Soil Health Card)',
      mr: 'मृदा आरोग्य पत्रिका योजना (Soil Health Card)',
    },
    info: {
      en: 'Provides crop-wise soil nutrient status and balanced fertilizer dosage recommendations to improve soil fertility.',
      hi: 'खेत की मिट्टी के पोषक तत्वों की जांच कर फसल अनुसार संतुलित खाद की सिफारिश देने वाली योजना।',
      mr: 'शेतातील मातीतील अन्नद्रव्यांची तपासणी करून पिकानुसार संतुलित खतांची शिफारस देणारी योजना.',
    },
    eligibility: {
      en: 'All farmers across India can get soil samples tested through state agriculture laboratories.',
      hi: 'देश के सभी किसान राज्य कृषि प्रयोगशालाओं के माध्यम से अपनी मिट्टी की जांच करा सकते हैं।',
      mr: 'देशातील सर्व शेतकरी शासकीय कृषी प्रयोगशाळांमधून आपल्या मातीची तपासणी करू शकतात.',
    },
    benefits: {
      en: 'Detailed report of 12 soil parameters (N, P, K, pH, EC, organic carbon, micronutrients) helping reduce excess fertilizer cost.',
      hi: '12 मिट्टी मानकों (N, P, K, pH, जैविक कार्बन आदि) की रिपोर्ट जिससे खाद का खर्च घटता है और उपज बढ़ती है।',
      mr: '१२ माती घटकांचा (N, P, K, pH, सेंद्रिय कर्ब इ.) अहवाल मिळतो, ज्यामुळे खताचा खर्च कमी होतो.',
    },
    applicationProcess: {
      en: 'Contact your local Krishi Vigyan Kendra (KVK) / Agriculture Assistant or check reports online at soilhealth.dac.gov.in.',
      hi: 'नजदीकी कृषि विज्ञान केंद्र (KVK) या कृषि सहायक से संपर्क करें या soilhealth.dac.gov.in पर रिपोर्ट देखें।',
      mr: 'जवळच्या कृषी विज्ञान केंद्र (KVK) किंवा कृषी सहाय्यकाशी संपर्क साधा किंवा soilhealth.dac.gov.in वर अहवाल पहा.',
    },
    officialUrl: 'https://soilhealth.dac.gov.in/',
    updatedDate: 'November 2026',
  },
  {
    id: 'pmksy',
    name: {
      en: 'PMKSY — Per Drop More Crop (Micro Irrigation)',
      hi: 'प्रधानमंत्री कृषि सिंचाई योजना — प्रति बूंद अधिक फसल',
      mr: 'प्रधानमंत्री कृषी सिंचन योजना — प्रति थेंब अधिक पीक',
    },
    info: {
      en: 'Promotes drip and sprinkler micro-irrigation systems to save water and boost farm productivity.',
      hi: 'ड्रिप और स्प्रिंकलर सिंचाई को बढ़ावा देकर पानी बचाने और फसल उत्पादन बढ़ाने की योजना।',
      mr: 'ठिबक आणि तुषार सिंचनाला प्रोत्साहन देऊन पाण्याची बचत व पीक उत्पादन वाढवणारी योजना.',
    },
    eligibility: {
      en: 'Farmers with valid land records and water source; higher subsidy priority for small & marginal farmers.',
      hi: 'वैध भूमि दस्तावेज और जल स्रोत वाले किसान; छोटे और सीमांत किसानों को अधिक सब्सिडी।',
      mr: 'वैध ७/१२ उतारा व पाण्याचा स्रोत असलेले शेतकरी; अल्पभूधारक शेतकऱ्यांना अधिक अनुदान.',
    },
    benefits: {
      en: 'Substantial capital subsidy (typically 45%–55%, plus state top-ups in states like Maharashtra) on drip and sprinkler sets.',
      hi: 'ड्रिप व स्प्रिंकलर सेट पर 45% से 55% (और राज्य अतिरिक्त अनुदान) तक सरकारी सब्सिडी।',
      mr: 'ठिबक व तुषार सिंचन संचावर ४५% ते ५५% (आणि राज्य शासनाच्या अतिरिक्त अनुदानासह) सबसिडी.',
    },
    applicationProcess: {
      en: 'Apply online through your state DBT agriculture portal (e.g., MahaDBT in Maharashtra) or pmksy.gov.in.',
      hi: 'अपने राज्य के कृषि DBT पोर्टल या pmksy.gov.in के माध्यम से ऑनलाइन आवेदन करें।',
      mr: 'राज्याच्या महाडीबीटी (MahaDBT) कृषी पोर्टलवर किंवा pmksy.gov.in द्वारे ऑनलाइन अर्ज करा.',
    },
    officialUrl: 'https://pmksy.gov.in/',
    updatedDate: 'November 2026',
  },
  {
    id: 'enam',
    name: {
      en: 'e-NAM (National Agriculture Market)',
      hi: 'ई-नाम (राष्ट्रीय कृषि बाजार)',
      mr: 'ई-नाम (राष्ट्रीय कृषी बाजार)',
    },
    info: {
      en: 'Pan-India electronic trading portal connecting existing APMC mandis for transparent online price discovery.',
      hi: 'देश की प्रमुख APMC मंडियों को जोड़ने वाला ऑनलाइन पोर्टल जिससे किसानों को पारदर्शी और बेहतर भाव मिलता है।',
      mr: 'देशातील बाजार समित्यांना जोडणारे ऑनलाइन व्यासपीठ, ज्यामुळे शेतकऱ्यांना पारदर्शक व योग्य बाजारभाव मिळतो.',
    },
    eligibility: {
      en: 'All farmers wishing to sell agricultural produce at e-NAM integrated mandis.',
      hi: 'ई-नाम से जुड़ी मंडियों में अपनी उपज बेचने वाले सभी किसान।',
      mr: 'ई-नामशी जोडलेल्या बाजार समित्यांमध्ये शेतीमाल विकू इच्छिणारे सर्व शेतकरी.',
    },
    benefits: {
      en: 'Transparent e-auction bidding, assaying quality checks, and direct online payment into farmer bank accounts.',
      hi: 'पारदर्शी ऑनलाइन नीलामी, गुणवत्ता जांच और सीधे बैंक खाते में भुगतान।',
      mr: 'पारदर्शक ऑनलाइन लिलाव, गुणवत्ता तपासणी आणि थेट बँक खात्यात रक्कम जमा होते.',
    },
    applicationProcess: {
      en: 'Register free on enam.gov.in or at the entry gate of any e-NAM enabled APMC mandi with Aadhaar and bank passbook.',
      hi: 'enam.gov.in पर या ई-नाम मंडी के प्रवेश द्वार पर आधार और बैंक पासबुक से निःशुल्क पंजीकरण करें।',
      mr: 'enam.gov.in पोर्टलवर किंवा ई-नाम बाजार समितीच्या प्रवेशद्वारावर आधार व बँक पासबुकसह मोफत नोंदणी करा.',
    },
    officialUrl: 'https://enam.gov.in/',
    updatedDate: 'November 2026',
  },
];

export const GovSchemesView: React.FC<{ language: Language }> = ({ language }) => {
  const t = strings[language];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.schemes}</h1>
          <p className="text-sm sm:text-base text-[#526056] mt-1">
            {language === 'hi'
              ? 'भारत सरकार की सत्यापित प्रमुख कृषि योजनाएं, पात्रता, लाभ और आधिकारिक वेबसाइट लिंक।'
              : language === 'mr'
              ? 'भारत सरकारच्या सत्यापित प्रमुख शेती योजना, पात्रता, फायदे आणि अधिकृत शासकीय लिंक.'
              : 'Verified Indian Government agricultural schemes with eligibility, benefits, application steps, and official links.'}
          </p>
        </div>
        <span className="text-xs font-semibold text-[#1F6E43] bg-[#E9F5EE] px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>Info Updated: November 2026</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {VERIFIED_SCHEMES.map((s) => (
          <div
            key={s.id}
            className="bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-3 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E9F5EE] text-[#1F6E43] flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#18221A]">
                    {s.name[language]}
                  </h2>
                  <p className="text-xs text-[#526056]">Updated: {s.updatedDate}</p>
                </div>
              </div>

              <a
                href={s.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[38px] px-3.5 rounded-xl bg-[#1F6E43] hover:bg-[#185835] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
              >
                <span>
                  {language === 'hi'
                    ? 'आधिकारिक वेबसाइट'
                    : language === 'mr'
                    ? 'अधिकृत संकेतस्थळ'
                    : 'Official Portal'}
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-[#18221A] leading-relaxed">{s.info[language]}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF]">
                <p className="text-xs font-bold text-[#1F6E43] mb-1">
                  {language === 'hi' ? 'पात्रता' : language === 'mr' ? 'पात्रता' : 'Eligibility'}
                </p>
                <p className="text-xs text-[#526056] leading-relaxed">
                  {s.eligibility[language]}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF]">
                <p className="text-xs font-bold text-[#1F6E43] mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'मुख्य लाभ' : language === 'mr' ? 'मुख्य फायदे' : 'Benefits'}</span>
                </p>
                <p className="text-xs text-[#526056] leading-relaxed">{s.benefits[language]}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF]">
                <p className="text-xs font-bold text-[#1F6E43] mb-1">
                  {language === 'hi'
                    ? 'आवेदन प्रक्रिया'
                    : language === 'mr'
                    ? 'अर्ज प्रक्रिया'
                    : 'How to Apply'}
                </p>
                <p className="text-xs text-[#526056] leading-relaxed">
                  {s.applicationProcess[language]}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
