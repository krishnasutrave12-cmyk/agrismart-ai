import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Bug,
  AlertTriangle,
  HelpCircle,
  Volume2,
  Square,
  Stethoscope,
  X,
} from 'lucide-react';
import { Language, strings } from '../translations';
import { optimizeImageForFastAnalysis } from '../types';
import { analyzePestImage } from '../services/geminiService';
import { speakText, stopSpeaking } from '../utils/voice';

interface PestScanViewProps {
  language: Language;
  voiceSpeed: number;
  onResult: (res: any) => void;
}

export const PestScanView: React.FC<PestScanViewProps> = ({
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
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setIsCameraOpen(false);
      setErrorMsg(
        language === 'hi'
          ? 'कैमरा शुरू नहीं हो सका। कृपया अनुमति दें या गैलरी से फोटो चुनें।'
          : language === 'mr'
          ? 'कॅमेरा सुरू होऊ शकला नाही. कृपया परवानगी द्या किंवा फोटो अपलोड करा.'
          : 'Could not open camera. Please allow permission or upload a photo.'
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
      const data = await analyzePestImage(fastImage, language);
      setResult(data);
      onResult({
        type: 'pest',
        result: `${data.pestName || 'Pest'} (${data.severity || 'Checked'})`,
        details: data,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || t.common.apiErrorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const handleRead = async () => {
    if (!result) return;
    setVoiceLimitation(null);
    setIsSpeaking(true);
    const text = [
      result.pestName,
      result.damageCaused,
      ...(Array.isArray(result.ipmRecommendations) ? result.ipmRecommendations : []),
    ]
      .filter(Boolean)
      .join('. ');
    const res = await speakText(text, language, voiceSpeed, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
    if (!res.started) {
      setIsSpeaking(false);
      if (res.limitationMessage) setVoiceLimitation(res.limitationMessage);
    }
  };

  const ui = {
    subtitle:
      language === 'hi'
        ? 'फसल पर दिखने वाले कीड़े की फोटो लें — हम कीट का नाम, नुकसान और एकीकृत कीट प्रबंधन (IPM) उपाय बताएंगे।'
        : language === 'mr'
        ? 'पिकावरील कीटकाचा फोटो अपलोड करा — आम्ही कीड ओळख, नुकसान आणि एकात्मिक कीड व्यवस्थापन (IPM) सल्ला देऊ.'
        : 'Upload or capture an insect/pest photo to identify the pest, damage caused, affected crops, and IPM control methods.',
    damage: language === 'hi' ? 'फसल को होने वाला नुकसान' : language === 'mr' ? 'पिकाचे होणारे नुकसान' : 'Damage Caused',
    affected: language === 'hi' ? 'प्रभावित फसलें' : language === 'mr' ? 'प्रभावित पिके' : 'Affected Crops',
    prevention: language === 'hi' ? 'रोकथाम के तरीके' : language === 'mr' ? 'प्रतिबंधात्मक उपाय' : 'Prevention Methods',
    ipm:
      language === 'hi'
        ? 'एकीकृत कीट प्रबंधन (IPM) सिफारिशें'
        : language === 'mr'
        ? 'एकात्मिक कीड व्यवस्थापन (IPM) शिफारसी'
        : 'Integrated Pest Management (IPM)',
    expert: language === 'hi' ? 'विशेषज्ञ परामर्श' : language === 'mr' ? 'तज्ञांचा सल्ला' : 'Expert Advice',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.pest}</h1>
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
        <div className="lg:col-span-5 bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-4">
          <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-[#D5DDD0] bg-[#F7F8F5] flex items-center justify-center overflow-hidden">
            {isCameraOpen ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : image ? (
              <img src={image} alt="Pest preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-5">
                <Bug className="w-10 h-10 text-[#1F6E43] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#18221A]">
                  {language === 'hi'
                    ? 'कीट / कीड़े की फोटो यहाँ दिखेगी'
                    : language === 'mr'
                    ? 'कीटकाचा फोटो येथे दिसेल'
                    : 'Insect / Pest Photo Preview'}
                </p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

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

        <div className="lg:col-span-7">
          {!result ? (
            <div className="bg-white border border-[#E4E7DF] rounded-2xl p-8 text-center">
              <Bug className="w-10 h-10 text-[#1F6E43] mx-auto mb-3" />
              <h2 className="text-base font-bold text-[#18221A] mb-1">
                {language === 'hi'
                  ? 'कीट पहचान रिपोर्ट यहाँ दिखेगी'
                  : language === 'mr'
                  ? 'कीड ओळख अहवाल येथे दिसेल'
                  : 'Pest Identification & IPM Report'}
              </h2>
              <p className="text-sm text-[#526056]">
                {language === 'hi'
                  ? 'फोटो अपलोड करने के बाद कीट का नाम, प्रभावित फसलें और नियंत्रण के सुरक्षित उपाय दिखाई देंगे।'
                  : language === 'mr'
                  ? 'फोटो अपलोड केल्यानंतर कीटकाचे नाव, प्रभावित पिके आणि सुरक्षित नियंत्रणाचे उपाय येथे दिसतील.'
                  : 'Upload a clear close-up photo of the insect or pest damage to receive an IPM action plan.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E4E7DF] rounded-2xl overflow-hidden">
              <div
                className={`p-5 border-b ${
                  result.imageEvidenceSufficient === false
                    ? 'bg-[#FEF6E7] border-[#F5D79E]'
                    : 'bg-[#FEF2F2] border-[#FECACA]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 ${
                        result.imageEvidenceSufficient === false ? 'bg-[#C47B17]' : 'bg-[#C53030]'
                      }`}
                    >
                      {result.imageEvidenceSufficient === false ? (
                        <HelpCircle className="w-6 h-6" />
                      ) : (
                        <AlertTriangle className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#18221A]">{result.pestName}</h2>
                      <p className="text-xs text-[#526056]">
                        {result.scientificName && <span className="italic">{result.scientificName}</span>}
                        {result.pestType && <span> · {result.pestType}</span>}
                      </p>
                    </div>
                  </div>

                  {!isSpeaking ? (
                    <button
                      type="button"
                      onClick={handleRead}
                      className="min-h-[38px] px-3 rounded-xl bg-white border border-[#E4E7DF] text-xs font-semibold text-[#18221A] inline-flex items-center gap-1.5"
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

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-white rounded-xl p-2.5 border border-[#E4E7DF]">
                    <span className="text-[11px] text-[#526056] block">Severity</span>
                    <span className="text-sm font-bold text-[#18221A]">{result.severity}</span>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-[#E4E7DF]">
                    <span className="text-[11px] text-[#526056] block">Confidence</span>
                    <span className="text-sm font-bold text-[#18221A] tabular-nums">
                      {result.confidence ?? 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5 text-sm">
                <div>
                  <h3 className="font-bold text-[#18221A] mb-1">{ui.damage}</h3>
                  <p className="text-[#526056] leading-relaxed">{result.damageCaused}</p>
                </div>

                {Array.isArray(result.affectedCrops) && result.affectedCrops.length > 0 && (
                  <div>
                    <h3 className="font-bold text-[#18221A] mb-2">{ui.affected}</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.affectedCrops.map((crop: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-lg bg-[#F7F8F5] border border-[#E4E7DF] text-xs font-semibold text-[#18221A]"
                        >
                          {crop}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] p-4">
                    <h3 className="font-bold text-[#18221A] mb-2">{ui.prevention}</h3>
                    <ul className="list-disc list-inside space-y-1 text-[#526056]">
                      {(result.preventionMethods || []).map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-[#E9F5EE] border border-[#CBE6D6] p-4">
                    <h3 className="font-bold text-[#18221A] mb-2">{ui.ipm}</h3>
                    <ul className="list-disc list-inside space-y-1 text-[#18221A]">
                      {(result.ipmRecommendations || []).map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {result.consultExpertAdvice && (
                  <div className="rounded-xl bg-[#FEF6E7] border border-[#F5D79E] p-4 flex items-start gap-3">
                    <Stethoscope className="w-5 h-5 text-[#C47B17] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-[#18221A] text-sm">{ui.expert}</h3>
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
