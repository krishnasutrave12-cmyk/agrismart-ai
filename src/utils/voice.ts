import { Language, VOICE_LANG_CODE, strings } from '../translations';

export type VoiceEngine = 'pack' | 'device';
export type VoicePackPersona = 'Kore' | 'Charon' | 'Puck' | 'Zephyr';

export interface VoicePackOption {
  id: VoicePackPersona;
  labelEn: string;
  labelHi: string;
  labelMr: string;
  descEn: string;
  descHi: string;
  descMr: string;
}

export const VOICE_PACK_PERSONAS: VoicePackOption[] = [
  {
    id: 'Kore',
    labelEn: 'Kore (Female — Clear)',
    labelHi: 'कोरे (महिला — स्पष्ट)',
    labelMr: 'कोरे (महिला — स्पष्ट)',
    descEn: 'Warm, clear female voice for Marathi, Hindi & English',
    descHi: 'हिंदी, मराठी और अंग्रेजी के लिए स्पष्ट महिला आवाज',
    descMr: 'मराठी, हिंदी व इंग्रजीसाठी स्पष्ट व मधुर महिला आवाज',
  },
  {
    id: 'Charon',
    labelEn: 'Charon (Male — Steady)',
    labelHi: 'कैरन (पुरुष — शांत)',
    labelMr: 'कॅरन (पुरुष — स्पष्ट)',
    descEn: 'Deep, calm male advisor voice for Marathi, Hindi & English',
    descHi: 'हिंदी, मराठी और अंग्रेजी के लिए शांत पुरुष आवाज',
    descMr: 'मराठी, हिंदी व इंग्रजीसाठी स्पष्ट पुरुष आवाज',
  },
  {
    id: 'Puck',
    labelEn: 'Puck (Friendly)',
    labelHi: 'पक (मित्रवत)',
    labelMr: 'पक (मैत्रीपूर्ण)',
    descEn: 'Upbeat, conversational voice for daily farming tips',
    descHi: 'रोजाना खेती की सलाह के लिए सहज बातचीत वाली आवाज',
    descMr: 'रोजच्या शेती सल्ल्यासाठी सहज व मैत्रीपूर्ण आवाज',
  },
  {
    id: 'Zephyr',
    labelEn: 'Zephyr (Soft)',
    labelHi: 'ज़ेफ़िर (सौम्य)',
    labelMr: 'झेफिर (सौम्य)',
    descEn: 'Gentle, easy-to-follow voice for long explanations',
    descHi: 'विस्तृत जानकारी सुनने के लिए सौम्य आवाज',
    descMr: 'सविस्तर माहिती ऐकण्यासाठी सौम्य व संथ आवाज',
  },
];

export interface VoiceAvailability {
  en: { available: boolean; voiceName: string | null; langCode: string | null };
  hi: { available: boolean; voiceName: string | null; langCode: string | null };
  mr: { available: boolean; voiceName: string | null; langCode: string | null };
  speechRecognitionSupported: boolean;
  speechSynthesisSupported: boolean;
  builtInPackEnabled: boolean;
}

const SPEED_KEY = 'agrismart_voice_speed';
const ENGINE_KEY = 'agrismart_voice_engine';
const PERSONA_KEY = 'agrismart_voice_persona';

let activeAudio: HTMLAudioElement | null = null;
let activeAbortController: AbortController | null = null;
const ttsCache = new Map<string, string>();

export function getSavedVoiceSpeed(): number {
  try {
    const raw = localStorage.getItem(SPEED_KEY);
    const num = raw ? parseFloat(raw) : 1;
    if (!isNaN(num) && num >= 0.6 && num <= 1.6) return num;
  } catch {}
  return 1;
}

export function saveVoiceSpeed(speed: number) {
  try {
    localStorage.setItem(SPEED_KEY, String(speed));
  } catch {}
  if (activeAudio) {
    activeAudio.playbackRate = Math.min(Math.max(speed, 0.6), 1.6);
  }
}

export function getSavedVoiceEngine(): VoiceEngine {
  try {
    const raw = localStorage.getItem(ENGINE_KEY);
    if (raw === 'pack' || raw === 'device') return raw;
  } catch {}
  return 'pack';
}

export function saveVoiceEngine(engine: VoiceEngine) {
  try {
    localStorage.setItem(ENGINE_KEY, engine);
  } catch {}
}

export function getSavedVoicePersona(): VoicePackPersona {
  try {
    const raw = localStorage.getItem(PERSONA_KEY);
    if (raw === 'Kore' || raw === 'Charon' || raw === 'Puck' || raw === 'Zephyr') {
      return raw;
    }
  } catch {}
  return 'Kore';
}

export function saveVoicePersona(persona: VoicePackPersona) {
  try {
    localStorage.setItem(PERSONA_KEY, persona);
  } catch {}
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Strictly selects a language-appropriate browser SpeechSynthesisVoice.
 * CRITICAL: Never returns a Hindi (hi-IN) voice for Marathi (mr-IN), so Marathi is never mispronounced with Hindi rules.
 */
export function findVoiceForLanguage(
  lang: Language,
  voicesList?: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = voicesList ?? window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  if (lang === 'mr') {
    const exactMrIn = voices.find((v) => v.lang.toLowerCase() === 'mr-in');
    if (exactMrIn) return exactMrIn;
    const anyMr = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('mr') ||
        v.name.toLowerCase().includes('marathi') ||
        v.name.includes('मराठी')
    );
    return anyMr || null;
  }

  if (lang === 'hi') {
    const exactHiIn = voices.find((v) => v.lang.toLowerCase() === 'hi-in');
    if (exactHiIn) return exactHiIn;
    const anyHi = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.name.includes('हिन्दी') ||
        v.name.includes('हिंदी')
    );
    return anyHi || null;
  }

  const enIn = voices.find((v) => v.lang.toLowerCase() === 'en-in');
  if (enIn) return enIn;
  const enInName = voices.find(
    (v) => v.lang.toLowerCase().startsWith('en') && v.name.toLowerCase().includes('india')
  );
  if (enInName) return enInName;
  const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
  return anyEn || null;
}

export function getVoiceAvailability(voicesList?: SpeechSynthesisVoice[]): VoiceAvailability {
  const voices =
    voicesList ??
    (isSpeechSynthesisSupported() ? window.speechSynthesis.getVoices() : []);
  const enV = findVoiceForLanguage('en', voices);
  const hiV = findVoiceForLanguage('hi', voices);
  const mrV = findVoiceForLanguage('mr', voices);

  return {
    en: { available: Boolean(enV), voiceName: enV?.name || null, langCode: enV?.lang || null },
    hi: { available: Boolean(hiV), voiceName: hiV?.name || null, langCode: hiV?.lang || null },
    mr: { available: Boolean(mrV), voiceName: mrV?.name || null, langCode: mrV?.lang || null },
    speechRecognitionSupported: isSpeechRecognitionSupported(),
    speechSynthesisSupported: isSpeechSynthesisSupported(),
    builtInPackEnabled: getSavedVoiceEngine() === 'pack',
  };
}

export function stopSpeaking() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.src = '';
    } catch {}
    activeAudio = null;
  }
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

export interface SpeakResult {
  started: boolean;
  source?: 'pack' | 'device';
  limitationMessage?: string;
}

function speakWithDeviceVoice(
  cleaned: string,
  lang: Language,
  speed: number,
  callbacks?: { onEnd?: () => void; onError?: () => void }
): SpeakResult {
  if (!isSpeechSynthesisSupported()) {
    return { started: false, limitationMessage: strings[lang].common.noEnglishVoice };
  }

  const voice = findVoiceForLanguage(lang);

  // Strict requirement: Never pronounce Marathi using Hindi/English browser voices
  if (!voice) {
    const limitationMessage =
      lang === 'mr'
        ? strings.mr.common.noMarathiVoice
        : lang === 'hi'
        ? strings.hi.common.noHindiVoice
        : strings.en.common.noEnglishVoice;
    return { started: false, limitationMessage };
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.voice = voice;
  utterance.lang = VOICE_LANG_CODE[lang];
  utterance.rate = Math.min(Math.max(speed, 0.6), 1.6);
  utterance.onend = () => callbacks?.onEnd?.();
  utterance.onerror = () => callbacks?.onError?.();

  window.speechSynthesis.speak(utterance);
  return { started: true, source: 'device' };
}

/**
 * Speaks text using the Built-in Hindi, Marathi & Indian English AI Voice Pack (/api/tts)
 * by default, with automatic speed control and replay caching.
 * Falls back strictly to a matching native browser voice if offline or in Device Voice mode
 * (never mispronouncing Marathi with a Hindi voice).
 */
export async function speakText(
  text: string,
  lang: Language,
  speed = 1,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
    personaOverride?: VoicePackPersona;
  }
): Promise<SpeakResult> {
  const cleaned = text.replace(/[*#_`~]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return { started: false };

  stopSpeaking();

  const engine = getSavedVoiceEngine();
  const persona = callbacks?.personaOverride || getSavedVoicePersona();

  if (engine === 'device' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    const devRes = speakWithDeviceVoice(cleaned, lang, speed, callbacks);
    if (devRes.started) callbacks?.onStart?.();
    return devRes;
  }

  const cacheKey = `${lang}:${persona}:${cleaned.slice(0, 1200)}`;
  let audioDataUrl = ttsCache.get(cacheKey);

  if (!audioDataUrl) {
    const controller = new AbortController();
    activeAbortController = controller;
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleaned.slice(0, 1200),
          language: lang,
          voiceName: persona,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS failed with status ${response.status}`);
      }
      const data = await response.json();
      if (!data.audioBase64) {
        throw new Error('No audio returned');
      }
      const mime = data.mimeType || 'audio/wav';
      audioDataUrl = `data:${mime};base64,${data.audioBase64}`;

      // Keep cache bounded to 25 recent clips to avoid excess memory usage
      if (ttsCache.size >= 25) {
        const firstKey = ttsCache.keys().next().value;
        if (firstKey) ttsCache.delete(firstKey);
      }
      ttsCache.set(cacheKey, audioDataUrl);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { started: false };
      }
      // Built-in AI voice pack temporarily unavailable: try matching device voice only (never Hindi for Marathi)
      const fallback = speakWithDeviceVoice(cleaned, lang, speed, callbacks);
      if (fallback.started) {
        callbacks?.onStart?.();
        return fallback;
      }
      const busyMsg =
        lang === 'mr'
          ? 'मराठी व्हॉइस पॅक सध्या तात्पुरता व्यस्त आहे आणि या डिव्हाइसवर मराठी आवाज उपलब्ध नाही. कृपया खालील मराठी मजकूर वाचा किंवा काही सेकंदांनी पुन्हा प्रयत्न करा.'
          : lang === 'hi'
          ? 'हिंदी वॉइस पैक अभी अस्थायी रूप से व्यस्त है। कृपया नीचे दिया गया उत्तर पढ़ें या कुछ सेकंड बाद फिर प्रयास करें।'
          : 'Built-in voice pack is temporarily busy and no matching browser voice is installed. Please read the response or try again shortly.';
      callbacks?.onError?.();
      return { started: false, limitationMessage: busyMsg };
    } finally {
      if (activeAbortController === controller) {
        activeAbortController = null;
      }
    }
  }

  try {
    const audio = new Audio(audioDataUrl);
    audio.playbackRate = Math.min(Math.max(speed, 0.6), 1.6);
    activeAudio = audio;

    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
      callbacks?.onEnd?.();
    };
    audio.onerror = () => {
      if (activeAudio === audio) activeAudio = null;
      callbacks?.onError?.();
    };

    await audio.play();
    callbacks?.onStart?.();
    return { started: true, source: 'pack' };
  } catch {
    activeAudio = null;
    // Browser autoplay policy or audio error: try native voice if available
    const fallback = speakWithDeviceVoice(cleaned, lang, speed, callbacks);
    if (fallback.started) {
      callbacks?.onStart?.();
      return fallback;
    }
    callbacks?.onError?.();
    return {
      started: false,
      limitationMessage:
        lang === 'mr'
          ? 'आवाज सुरू करण्यासाठी कृपया "ऐका" किंवा "पुन्हा ऐका" बटणावर टॅप करा.'
          : lang === 'hi'
          ? 'आवाज सुनने के लिए कृपया "सुनें" बटन पर टैप करें।'
          : 'Tap Listen or Replay to allow audio playback in your browser.',
    };
  }
}

export function startVoiceRecognition(
  lang: Language,
  handlers: {
    onResult: (transcript: string) => void;
    onEnd: () => void;
    onError: (message: string) => void;
  }
): { stop: () => void } | null {
  if (!isSpeechRecognitionSupported()) {
    handlers.onError(strings[lang].common.micNotSupported);
    return null;
  }

  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognitionCtor();
  recognition.lang = VOICE_LANG_CODE[lang];
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event: any) => {
    const transcript = event?.results?.[0]?.[0]?.transcript || '';
    if (transcript.trim()) {
      handlers.onResult(transcript.trim());
    }
  };

  recognition.onerror = (event: any) => {
    const errCode = event?.error;
    if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
      handlers.onError(strings[lang].common.micPermissionDenied);
    } else if (errCode === 'no-speech') {
      handlers.onError(
        lang === 'hi'
          ? 'कोई आवाज सुनाई नहीं दी। कृपया दोबारा बोलें।'
          : lang === 'mr'
          ? 'आवाज ऐकू आला नाही. कृपया पुन्हा बोला.'
          : 'No speech detected. Please tap the microphone and try again.'
      );
    } else {
      handlers.onError(
        lang === 'hi'
          ? 'आवाज पहचानने में समस्या आई। कृपया फिर से प्रयास करें।'
          : lang === 'mr'
          ? 'आवाज ओळखण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा.'
          : 'Could not capture voice clearly. Please try again or type your question.'
      );
    }
    handlers.onEnd();
  };

  recognition.onend = () => {
    handlers.onEnd();
  };

  try {
    recognition.start();
  } catch {
    handlers.onError(strings[lang].common.micNotSupported);
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {}
    },
  };
}
