import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Flower2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Volume2,
  Square,
  Sun,
  Droplets,
  Thermometer,
  Calendar,
  X,
} from 'lucide-react';
import { Language, strings } from '../translations';
import { optimizeImageForFastAnalysis } from '../types';
import { analyzeFlowerImage } from '../services/geminiService';
import { speakText, stopSpeaking } from '../utils/voice';

interface FlowerScanViewProps {
  language: Language;
  voiceSpeed: number;
  onResult: (res: any) => void;
}

export const FlowerScanView: React.FC<FlowerScanViewProps> = ({
  language,
  voiceSpeed,
  onResult,
}) => {
  const t = strings[language];
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLimitation, setVoiceLimitation] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((tr) => tr.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      stopSpeaking();
    };
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setResult(null);
    stopSpeaking();
    setIsSpeaking(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const optimized = await optimizeImageForFastAnalysis(reader.result as string, 900, 0.82);
      setImage(optimized);
      stopCamera();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startCamera = async () => {
    setErrorMsg(null);
    setResult(null);
    setIsCameraOpen(true);
    setImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setIsCameraOpen(false);
      setErrorMsg(
        language === 'hi'
          ? 'कैमरा शुरू नहीं हो सका। कृपया अनुमति दें या गैलरी से फूल की फोटो चुनें।'
          : language === 'mr'
          ? 'कॅमेरा सुरू होऊ शकला नाही. कृपया परवानगी द्या किंवा गॅलरीतून फुलाचा फोटो निवडा.'
          : 'Could not access the camera. Please grant permission or upload a flower photo.'
      );
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vw = video.videoWidth || 800;
    const vh = video.videoHeight || 600;
    const scale = Math.min(1, 900 / Math.max(vw, vh));
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setImage(canvas.toDataURL('image/jpeg', 0.82));
      stopCamera();
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setErrorMsg(null);
    setVoiceLimitation(null);
    stopSpeaking();
    setIsSpeaking(false);

    try {
      const fastImage = await optimizeImageForFastAnalysis(image, 900, 0.8);
      const data = await analyzeFlowerImage(fastImage, language);
      setResult(data);
      onResult({
        type: 'flower',
        result: `${data.flowerName || 'Flower'}${
          data.englishFlowerName &&
          data.englishFlowerName.toLowerCase() !== String(data.flowerName || '').toLowerCase()
            ? ` (${data.englishFlowerName})`
            : ''
        } — ${data.diseaseOrPest || data.healthStatus || 'Identified'}`,
        details: data,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || t.common.apiErrorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const handleReadReport = async () => {
    if (!result) return;
    setVoiceLimitation(null);
    setIsSpeaking(true);
    const parts = [
      result.flowerName,
      result.overview,
      result.diseaseOrPest ? `${result.diseaseOrPest}` : '',
      result.usesAndMarketValue,
      ...(Array.isArray(result.careTips) ? result.careTips.slice(0, 3) : []),
    ].filter(Boolean);
    const res = await speakText(parts.join('. '), language, voiceSpeed, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
    if (!res.started) {
      setIsSpeaking(false);
      if (res.limitationMessage) setVoiceLimitation(res.limitationMessage);
    }
  };

  const isHealthy = result?.healthStatus === 'Healthy';
  const isUncertain =
    result?.healthStatus === 'Uncertain' || result?.imageEvidenceSufficient === false;

  const ui = {
    subtitle:
      language === 'hi'
        ? 'गेंदा, गुलाब, मोगरा, गुड़हल, शेवंती, रजनीगंधा, सूरजमुखी या किसी भी फूल की फोटो अपलोड करें — हम फूल का नाम, स्वास्थ्य और देखभाल बताएंगे।'
        : language === 'mr'
        ? 'झेंडू, गुलाब, मोगरा, जास्वंद, शेवंती, निशिगंधा, सूर्यफूल किंवा कोणत्याही फुलाचा फोटो अपलोड करा — आम्ही फुलाचे नाव, आरोग्य आणि निगा माहिती देऊ.'
        : 'Upload or capture a clear photo of Marigold, Rose, Jasmine, Hibiscus, Chrysanthemum, Tuberose, Sunflower, or any flower to identify its name, health, and care guide.',
    flowerNameLabel:
      language === 'hi'
        ? 'फूल का नाम (Flower Name)'
        : language === 'mr'
        ? 'फुलाचे नाव (Flower Name)'
        : 'Flower Name',
    familyLabel: language === 'hi' ? 'कुल (Family)' : language === 'mr' ? 'कुळ (Family)' : 'Family',
    colorLabel: language === 'hi' ? 'रंग' : language === 'mr' ? 'रंग' : 'Petal Color',
    confidenceLabel:
      language === 'hi' ? 'सटीकता (Confidence)' : language === 'mr' ? 'अचूकता (Confidence)' : 'Confidence',
    statusLabel: language === 'hi' ? 'स्वास्थ्य स्थिति' : language === 'mr' ? 'आरोग्य स्थिती' : 'Health Status',
    seasonLabel: language === 'hi' ? 'फूल आने का मौसम' : language === 'mr' ? 'फुलण्याचा हंगाम' : 'Blooming Season',
    sunlightLabel: language === 'hi' ? 'धूप' : language === 'mr' ? 'सूर्यप्रकाश' : 'Sunlight',
    waterLabel: language === 'hi' ? 'पानी' : language === 'mr' ? 'पाणी' : 'Watering',
    soilLabel: language === 'hi' ? 'मिट्टी' : language === 'mr' ? 'माती' : 'Soil',
    tempLabel: language === 'hi' ? 'तापमान' : language === 'mr' ? 'तापमान' : 'Temperature',
    usesLabel:
      language === 'hi'
        ? 'उपयोग और बाजार महत्व'
        : language === 'mr'
        ? 'उपयोग आणि बाजार महत्त्व'
        : 'Uses & Floriculture Value',
    careLabel:
      language === 'hi' ? 'देखभाल के सुझाव' : language === 'mr' ? 'निगा व काळजी उपाय' : 'Growing & Care Tips',
    treatmentLabel:
      language === 'hi'
        ? 'रोग / कीट उपचार'
        : language === 'mr'
        ? 'रोग / कीड नियंत्रण उपाय'
        : 'Disease & Pest Treatment',
  };

  const toList = (val: any): string[] => {
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === 'string' && val.trim()) return [val.trim()];
    return [];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.flower}</h1>
        <p className="text-sm sm:text-base text-[#526056] mt-1">{ui.subtitle}</p>
      </div>

      {errorMsg && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#C53030] rounded-xl p-4 flex items-start justify-between gap-3 text-sm">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {voiceLimitation && (
        <div className="bg-[#FEF6E7] border border-[#F5D79E] text-[#8A540E] rounded-xl p-4 text-sm">
          {voiceLimitation}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Upload & Camera Card */}
        <div className="lg:col-span-5 bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-4">
          <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-[#D5DDD0] bg-[#F7F8F5] flex items-center justify-center overflow-hidden">
            {isCameraOpen ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : image ? (
              <img src={image} alt="Flower preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-5">
                <Flower2 className="w-10 h-10 text-[#1F6E43] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#18221A]">
                  {language === 'hi'
                    ? 'यहाँ फूल की फोटो दिखेगी'
                    : language === 'mr'
                    ? 'येथे फुलाचा फोटो दिसेल'
                    : 'Flower Photo Preview'}
                </p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {result?.flowerName && (
            <div className="rounded-xl bg-[#E9F5EE] border border-[#CBE6D6] px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1F6E43] text-white flex items-center justify-center shrink-0">
                <Flower2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#1F6E43]">
                  {ui.flowerNameLabel}
                </p>
                <p className="text-base font-bold text-[#18221A] truncate">
                  {result.flowerName}
                  {result.englishFlowerName &&
                    result.englishFlowerName.toLowerCase() !==
                      String(result.flowerName).toLowerCase() && (
                      <span className="text-sm font-semibold text-[#526056]">
                        {' '}({result.englishFlowerName})
                      </span>
                    )}
                </p>
                {result.scientificName && (
                  <p className="text-xs italic text-[#526056] truncate">{result.scientificName}</p>
                )}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />

          {isCameraOpen ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={capturePhoto}
                className="min-h-[46px] bg-[#1F6E43] text-white font-semibold rounded-xl px-4 inline-flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>{t.common.capture}</span>
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="min-h-[46px] bg-[#F7F8F5] border border-[#E4E7DF] text-[#18221A] font-semibold rounded-xl px-4"
              >
                {t.common.cancel}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startCamera}
                className="min-h-[46px] bg-[#F7F8F5] hover:bg-[#E9F5EE] border border-[#E4E7DF] text-[#18221A] font-semibold rounded-xl px-3 inline-flex items-center justify-center gap-2 text-sm"
              >
                <Camera className="w-4 h-4 text-[#1F6E43]" />
                <span>{t.common.takePhoto}</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[46px] bg-[#F7F8F5] hover:bg-[#E9F5EE] border border-[#E4E7DF] text-[#18221A] font-semibold rounded-xl px-3 inline-flex items-center justify-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4 text-[#1F6E43]" />
                <span>{t.common.uploadPhoto}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!image || loading}
            className="w-full min-h-[48px] bg-[#1F6E43] hover:bg-[#185835] disabled:bg-[#CBD2C6] text-white font-bold rounded-xl px-5 inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t.common.analyzing}</span>
              </>
            ) : (
              <span>{t.common.analyze}</span>
            )}
          </button>
        </div>

        {/* Right: Structured Flower Identification Report */}
        <div className="lg:col-span-7">
          {!result ? (
            <div className="bg-white border border-[#E4E7DF] rounded-2xl p-8 text-center">
              <Flower2 className="w-10 h-10 text-[#1F6E43] mx-auto mb-3" />
              <h2 className="text-base font-bold text-[#18221A] mb-1">
                {language === 'hi'
                  ? 'फूल पहचान और देखभाल रिपोर्ट यहाँ दिखेगी'
                  : language === 'mr'
                  ? 'फुलाची ओळख व निगा अहवाल येथे दिसेल'
                  : 'Flower Identification & Care Report'}
              </h2>
              <p className="text-sm text-[#526056] max-w-md mx-auto">
                {language === 'hi'
                  ? 'दिन की रोशनी में फूल की साफ फोटो चुनें और "जांच करें" दबाएं।'
                  : language === 'mr'
                  ? 'दिवसाच्या स्पष्ट उजेडात फुलाचा फोटो निवडा आणि "तपासणी करा" दाबा.'
                  : 'Capture or upload a clear daylight photo of a flower and tap Analyze to get its name, botanical details, health check, and care advice.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E4E7DF] rounded-2xl overflow-hidden">
              {/* Top Identification Banner */}
              <div
                className={`p-5 border-b ${
                  isUncertain
                    ? 'bg-[#FEF6E7] border-[#F5D79E]'
                    : isHealthy
                    ? 'bg-[#E9F5EE] border-[#CBE6D6]'
                    : 'bg-[#FEF2F2] border-[#FECACA]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 ${
                        isUncertain
                          ? 'bg-[#C47B17]'
                          : isHealthy
                          ? 'bg-[#1F6E43]'
                          : 'bg-[#C53030]'
                      }`}
                    >
                      {isUncertain ? (
                        <HelpCircle className="w-6 h-6" />
                      ) : isHealthy ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <AlertTriangle className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#1F6E43]">
                        {ui.flowerNameLabel}
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#18221A] leading-tight mt-0.5">
                        {result.flowerName || result.englishFlowerName}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#526056] mt-1">
                        {result.englishFlowerName &&
                          result.englishFlowerName.toLowerCase() !==
                            String(result.flowerName || '').toLowerCase() && (
                            <span className="font-semibold text-[#18221A] mr-2">
                              {result.englishFlowerName} ·
                            </span>
                          )}
                        {result.scientificName && <span className="italic">{result.scientificName}</span>}
                        {result.family && <span> · {result.family}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Voice Read-Aloud Controls */}
                  <div className="flex items-center gap-2">
                    {!isSpeaking ? (
                      <button
                        type="button"
                        onClick={handleReadReport}
                        className="min-h-[38px] px-3 rounded-xl bg-white border border-[#E4E7DF] text-xs font-semibold text-[#18221A] inline-flex items-center gap-1.5 hover:border-[#1F6E43]"
                      >
                        <Volume2 className="w-4 h-4 text-[#1F6E43]" />
                        <span>{t.common.listen}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          stopSpeaking();
                          setIsSpeaking(false);
                        }}
                        className="min-h-[38px] px-3 rounded-xl bg-[#C53030] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>{t.common.stop}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white rounded-xl p-2.5 border border-[#E4E7DF]">
                    <span className="text-[11px] text-[#526056] block">{ui.statusLabel}</span>
                    <span
                      className={`text-sm font-bold ${
                        isUncertain
                          ? 'text-[#C47B17]'
                          : isHealthy
                          ? 'text-[#1F6E43]'
                          : 'text-[#C53030]'
                      }`}
                    >
                      {isUncertain
                        ? t.common.uncertain
                        : isHealthy
                        ? t.common.healthy
                        : t.common.infected}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-[#E4E7DF]">
                    <span className="text-[11px] text-[#526056] block">{ui.confidenceLabel}</span>
                    <span className="text-sm font-bold text-[#18221A] tabular-nums">
                      {result.confidence ?? 0}%
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-[#E4E7DF]">
                    <span className="text-[11px] text-[#526056] block">{ui.colorLabel}</span>
                    <span className="text-sm font-bold text-[#18221A] truncate block">
                      {result.color || '—'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-[#E4E7DF]">
                    <span className="text-[11px] text-[#526056] block">{ui.familyLabel}</span>
                    <span className="text-sm font-bold text-[#18221A] truncate block">
                      {result.family || '—'}
                    </span>
                  </div>
                </div>

                {result.diseaseOrPest && (
                  <div className="mt-3 p-3 rounded-xl bg-white border border-[#FECACA]">
                    <span className="text-xs font-semibold text-[#526056]">
                      {ui.treatmentLabel}:{' '}
                    </span>
                    <span className="text-sm font-bold text-[#C53030]">{result.diseaseOrPest}</span>
                  </div>
                )}
              </div>

              {/* Detailed Body */}
              <div className="p-5 space-y-5 text-sm">
                {result.overview && (
                  <p className="text-[#18221A] leading-relaxed">{result.overview}</p>
                )}

                {/* Growing Conditions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.bloomingSeason && (
                    <div className="rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] p-3.5 flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-[#1F6E43] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-[#18221A] block">{ui.seasonLabel}</span>
                        <span className="text-xs text-[#526056]">{result.bloomingSeason}</span>
                      </div>
                    </div>
                  )}
                  {result.sunlight && (
                    <div className="rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] p-3.5 flex items-start gap-2.5">
                      <Sun className="w-4 h-4 text-[#1F6E43] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-[#18221A] block">{ui.sunlightLabel}</span>
                        <span className="text-xs text-[#526056]">{result.sunlight}</span>
                      </div>
                    </div>
                  )}
                  {result.watering && (
                    <div className="rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] p-3.5 flex items-start gap-2.5">
                      <Droplets className="w-4 h-4 text-[#1F6E43] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-[#18221A] block">{ui.waterLabel}</span>
                        <span className="text-xs text-[#526056]">{result.watering}</span>
                      </div>
                    </div>
                  )}
                  {(result.idealTemperature || result.soilType) && (
                    <div className="rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] p-3.5 flex items-start gap-2.5">
                      <Thermometer className="w-4 h-4 text-[#1F6E43] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-[#18221A] block">
                          {ui.soilLabel} & {ui.tempLabel}
                        </span>
                        <span className="text-xs text-[#526056]">
                          {[result.soilType, result.idealTemperature].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {result.usesAndMarketValue && (
                  <div className="rounded-xl bg-[#E9F5EE] border border-[#CBE6D6] p-4">
                    <h3 className="font-bold text-[#1F6E43] mb-1">{ui.usesLabel}</h3>
                    <p className="text-[#18221A] leading-relaxed">{result.usesAndMarketValue}</p>
                  </div>
                )}

                {toList(result.careTips).length > 0 && (
                  <div className="rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] p-4">
                    <h3 className="font-bold text-[#18221A] mb-2">{ui.careLabel}</h3>
                    <ul className="list-disc list-inside space-y-1 text-[#526056]">
                      {toList(result.careTips).map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {toList(result.treatment).length > 0 && (
                  <div className="rounded-xl bg-[#FEF6E7] border border-[#F5D79E] p-4">
                    <h3 className="font-bold text-[#18221A] mb-2">{ui.treatmentLabel}</h3>
                    <ul className="list-disc list-inside space-y-1 text-[#526056]">
                      {toList(result.treatment).map((tr, i) => (
                        <li key={i}>{tr}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
