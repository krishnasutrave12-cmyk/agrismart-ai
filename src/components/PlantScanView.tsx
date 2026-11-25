import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Leaf,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Volume2,
  Square,
  RotateCcw,
  CloudOff,
  Trash2,
  X,
  Stethoscope,
} from 'lucide-react';
import { Language, strings } from '../translations';
import { OfflinePlantRequest, optimizeImageForFastAnalysis } from '../types';
import { analyzePlantImage } from '../services/geminiService';
import { speakText, stopSpeaking } from '../utils/voice';

interface PlantScanViewProps {
  language: Language;
  voiceSpeed: number;
  onResult: (res: any) => void;
  offlineQueue: OfflinePlantRequest[];
  onEnqueueOffline: (req: OfflinePlantRequest) => void;
  onRemoveQueueItem: (id: string) => void;
  isSyncingQueue: boolean;
  onSyncQueue: () => Promise<void>;
  isOnline: boolean;
}

export const PlantScanView: React.FC<PlantScanViewProps> = ({
  language,
  voiceSpeed,
  onResult,
  offlineQueue,
  onEnqueueOffline,
  onRemoveQueueItem,
  isSyncingQueue,
  onSyncQueue,
  isOnline,
}) => {
  const t = strings[language];
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [offlineQueued, setOfflineQueued] = useState(false);
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
    setOfflineQueued(false);
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
    setOfflineQueued(false);
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
          ? 'कैमरा शुरू नहीं हो सका। कृपया अनुमति दें या गैलरी से फोटो चुनें।'
          : language === 'mr'
          ? 'कॅमेरा सुरू होऊ शकला नाही. कृपया परवानगी द्या किंवा गॅलरीतून फोटो निवडा.'
          : 'Could not access the camera. Please grant permission or upload a photo.'
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
    setOfflineQueued(false);
    setVoiceLimitation(null);
    stopSpeaking();
    setIsSpeaking(false);

    const fastImage = await optimizeImageForFastAnalysis(image, 900, 0.8);

    if (!navigator.onLine || !isOnline) {
      onEnqueueOffline({
        id: `offline_plant_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        image: fastImage,
        language,
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString(),
        status: 'queued',
      });
      setOfflineQueued(true);
      setLoading(false);
      return;
    }

    try {
      const data = await analyzePlantImage(fastImage, language);
      setResult(data);
      onResult({
        type: 'plant',
        result: `${data.plantName || 'Plant'} — ${
          data.diseaseName ? data.diseaseName : data.status || 'Checked'
        }`,
        healthScore: typeof data.healthScore === 'number' ? data.healthScore : undefined,
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
      result.plantName,
      result.diseaseName || result.status,
      result.diagnosisDetails,
      Array.isArray(result.treatment) ? result.treatment.join('. ') : result.treatment,
    ].filter(Boolean);
    const res = await speakText(parts.join('. '), language, voiceSpeed, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
    if (!res.started) {
      setIsSpeaking(false);
      if (res.limitationMessage) {
        setVoiceLimitation(res.limitationMessage);
      }
    }
  };

  const isHealthy = result?.status === 'Healthy';
  const isUncertain = result?.status === 'Uncertain' || result?.imageEvidenceSufficient === false;

  const ui = {
    subtitle:
      language === 'hi'
        ? 'कपास, सोयाबीन, गेहूं, धान, टमाटर, आलू, प्याज, मिर्च, मक्का या किसी भी पौधे की फोटो अपलोड करें।'
        : language === 'mr'
        ? 'कापूस, सोयाबीन, गहू, भात, टोमॅटो, बटाटा, कांदा, मिरची, मका किंवा कोणत्याही रोपाचा स्पष्ट फोटो अपलोड करा.'
        : 'Upload or capture a clear daylight photo of Cotton, Soybean, Wheat, Rice, Tomato, Potato, Onion, Chilli, Maize, or any plant.',
    identifiedCrop:
      language === 'hi' ? 'पौधे / फसल का नाम (Plant Name)' : language === 'mr' ? 'रोपाचे / पिकाचे नाव (Plant Name)' : 'Plant / Crop Name',
    diseaseLabel: language === 'hi' ? 'रोग का नाम' : language === 'mr' ? 'रोगाचे नाव' : 'Detected Disease',
    severityLabel: language === 'hi' ? 'गंभीरता' : language === 'mr' ? 'तीव्रता' : 'Severity',
    confidenceLabel: language === 'hi' ? 'सटीकता (Confidence)' : language === 'mr' ? 'अचूकता (Confidence)' : 'Confidence',
    healthLabel: language === 'hi' ? 'स्वास्थ्य स्कोर' : language === 'mr' ? 'आरोग्य स्कोअर' : 'Health Score',
    symptomsLabel: language === 'hi' ? 'लक्षण' : language === 'mr' ? 'लक्षणे' : 'Visible Symptoms',
    causesLabel: language === 'hi' ? 'संभावित कारण' : language === 'mr' ? 'संभाव्य कारणे' : 'Possible Causes',
    preventionLabel: language === 'hi' ? 'रोकथाम के उपाय' : language === 'mr' ? 'प्रतिबंधात्मक उपाय' : 'Prevention Methods',
    treatmentLabel: language === 'hi' ? 'उपचार सुझाव' : language === 'mr' ? 'उपचार पद्धती' : 'Treatment Options',
    expertLabel: language === 'hi' ? 'विशेषज्ञ सलाह' : language === 'mr' ? 'तज्ञांचा सल्ला' : 'Expert Consultation',
    plantDetailsLabel: language === 'hi' ? 'पौधे की सामान्य जानकारी' : language === 'mr' ? 'रोपाची सामान्य माहिती' : 'Crop / Plant Care Info',
  };

  const toList = (val: any): string[] => {
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === 'string' && val.trim()) return [val.trim()];
    return [];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.disease}</h1>
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
        {/* Left: Upload & Camera Box */}
        <div className="lg:col-span-5 bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-4">
          <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-[#D5DDD0] bg-[#F7F8F5] flex items-center justify-center overflow-hidden">
            {isCameraOpen ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : image ? (
              <img src={image} alt="Crop preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-5">
                <Leaf className="w-10 h-10 text-[#1F6E43] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#18221A]">
                  {language === 'hi'
                    ? 'यहाँ फसल या पत्ते की फोटो दिखेगी'
                    : language === 'mr'
                    ? 'येथे पिकाचा किंवा पानाचा फोटो दिसेल'
                    : 'Crop / Leaf Photo Preview'}
                </p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {result?.plantName && (
            <div className="rounded-xl bg-[#E9F5EE] border border-[#CBE6D6] px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1F6E43] text-white flex items-center justify-center shrink-0">
                <Leaf className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#1F6E43]">
                  {ui.identifiedCrop}
                </p>
                <p className="text-base font-bold text-[#18221A] truncate">
                  {result.plantName}
                  {result.englishPlantName &&
                    result.englishPlantName.toLowerCase() !== String(result.plantName).toLowerCase() && (
                      <span className="text-sm font-semibold text-[#526056]">
                        {' '}({result.englishPlantName})
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

          {offlineQueued && (
            <div className="p-3.5 rounded-xl bg-[#FEF6E7] border border-[#F5D79E] text-xs text-[#8A540E] flex items-center gap-2">
              <CloudOff className="w-4 h-4 shrink-0" />
              <span>{t.common.offlineBanner}</span>
            </div>
          )}

          {offlineQueue.length > 0 && (
            <div className="pt-3 border-t border-[#E4E7DF] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>
                  {offlineQueue.length} {t.common.queuedCount}
                </span>
                {isOnline && (
                  <button
                    type="button"
                    onClick={onSyncQueue}
                    disabled={isSyncingQueue}
                    className="px-3 py-1.5 rounded-lg bg-[#1F6E43] text-white inline-flex items-center gap-1"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                    <span>{isSyncingQueue ? t.common.syncing : t.common.syncNow}</span>
                  </button>
                )}
              </div>
              {offlineQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF]"
                >
                  <img src={item.image} alt="Queued" className="w-10 h-10 rounded-lg object-cover" />
                  <span className="text-xs text-[#526056] flex-1 tabular-nums">
                    {item.formattedTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveQueueItem(item.id)}
                    className="p-1.5 text-[#526056] hover:text-[#C53030]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Structured Crop & Disease Report */}
        <div className="lg:col-span-7">
          {!result ? (
            <div className="bg-white border border-[#E4E7DF] rounded-2xl p-8 text-center">
              <Leaf className="w-10 h-10 text-[#1F6E43] mx-auto mb-3" />
              <h2 className="text-base font-bold text-[#18221A] mb-1">
                {language === 'hi'
                  ? 'फसल और रोग की रिपोर्ट यहाँ दिखेगी'
                  : language === 'mr'
                  ? 'पीक ओळख आणि रोग अहवाल येथे दिसेल'
                  : 'Crop Identification & Disease Report'}
              </h2>
              <p className="text-sm text-[#526056] max-w-md mx-auto">
                {language === 'hi'
                  ? 'साफ दिन की रोशनी में पत्ते या पौधे की फोटो चुनें और "जांच करें" दबाएं।'
                  : language === 'mr'
                  ? 'दिवसाच्या स्पष्ट उजेडात पानाचा किंवा रोपाचा फोटो निवडा आणि "तपासणी करा" दाबा.'
                  : 'Take a clear close-up photo in natural daylight and click Analyze to identify the plant and inspect for disease.'}
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
                        {ui.identifiedCrop}
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#18221A] leading-tight mt-0.5">
                        {result.plantName || result.englishPlantName}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#526056] mt-1">
                        {result.englishPlantName &&
                          result.englishPlantName.toLowerCase() !==
                            String(result.plantName || '').toLowerCase() && (
                            <span className="font-semibold text-[#18221A] mr-2">
                              {result.englishPlantName} ·
                            </span>
                          )}
                        {result.scientificName && <span className="italic">{result.scientificName}</span>}
                        {result.plantType && <span> · {result.plantType}</span>}
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

                {/* Key Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white rounded-xl p-2.5 border border-[#E4E7DF]">
                    <span className="text-[11px] text-[#526056] block">Status</span>
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
                    <span className="text-[11px] text-[#526056] block">{ui.severityLabel}</span>
                    <span className="text-sm font-bold text-[#18221A]">
                      {result.severity || 'None'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-[#E4E7DF]">
                    <span className="text-[11px] text-[#526056] block">{ui.confidenceLabel}</span>
                    <span className="text-sm font-bold text-[#18221A] tabular-nums">
                      {result.confidence ?? 0}%
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-[#E4E7DF]">
                    <span className="text-[11px] text-[#526056] block">{ui.healthLabel}</span>
                    <span className="text-sm font-bold text-[#1F6E43] tabular-nums">
                      {result.healthScore ?? 0}%
                    </span>
                  </div>
                </div>

                {result.diseaseName && (
                  <div className="mt-3 p-3 rounded-xl bg-white border border-[#FECACA]">
                    <span className="text-xs font-semibold text-[#526056]">{ui.diseaseLabel}: </span>
                    <span className="text-sm font-bold text-[#C53030]">{result.diseaseName}</span>
                  </div>
                )}
              </div>

              {/* Detailed Diagnosis Body */}
              <div className="p-5 space-y-5 text-sm">
                {result.diagnosisDetails && (
                  <p className="text-[#18221A] leading-relaxed">{result.diagnosisDetails}</p>
                )}

                {toList(result.symptoms).length > 0 && (
                  <div>
                    <h3 className="font-bold text-[#18221A] mb-1.5">{ui.symptomsLabel}</h3>
                    <ul className="list-disc list-inside space-y-1 text-[#526056]">
                      {toList(result.symptoms).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {toList(result.possibleCauses).length > 0 && (
                  <div>
                    <h3 className="font-bold text-[#18221A] mb-1.5">{ui.causesLabel}</h3>
                    <ul className="list-disc list-inside space-y-1 text-[#526056]">
                      {toList(result.possibleCauses).map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] p-4">
                    <h3 className="font-bold text-[#18221A] mb-2">{ui.preventionLabel}</h3>
                    <ul className="list-disc list-inside space-y-1 text-[#526056]">
                      {toList(result.prevention).map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] p-4">
                    <h3 className="font-bold text-[#18221A] mb-2">{ui.treatmentLabel}</h3>
                    <ul className="list-disc list-inside space-y-1 text-[#526056]">
                      {toList(result.treatment).map((tr, i) => (
                        <li key={i}>{tr}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {result.plantInfo && (
                  <div className="rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] p-4 space-y-2">
                    <h3 className="font-bold text-[#18221A]">{ui.plantDetailsLabel}</h3>
                    {result.plantInfo.overview && (
                      <p className="text-[#526056]">{result.plantInfo.overview}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#526056] pt-1">
                      {result.plantInfo.sunlight && (
                        <div>
                          <strong className="text-[#18221A]">Sunlight:</strong> {result.plantInfo.sunlight}
                        </div>
                      )}
                      {result.plantInfo.watering && (
                        <div>
                          <strong className="text-[#18221A]">Watering:</strong> {result.plantInfo.watering}
                        </div>
                      )}
                      {result.plantInfo.soilType && (
                        <div>
                          <strong className="text-[#18221A]">Soil:</strong> {result.plantInfo.soilType}
                        </div>
                      )}
                      {result.plantInfo.idealTemperature && (
                        <div>
                          <strong className="text-[#18221A]">Temp:</strong> {result.plantInfo.idealTemperature}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {result.consultExpertAdvice && (
                  <div className="rounded-xl bg-[#FEF6E7] border border-[#F5D79E] p-4 flex items-start gap-3">
                    <Stethoscope className="w-5 h-5 text-[#C47B17] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-[#18221A] text-sm">{ui.expertLabel}</h3>
                      <p className="text-xs sm:text-sm text-[#526056] mt-0.5">
                        {result.consultExpertAdvice}
                      </p>
                    </div>
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
