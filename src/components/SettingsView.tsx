import React, { useState, useEffect } from 'react';
import {
  Globe,
  Volume2,
  User,
  CheckCircle2,
  AlertCircle,
  Square,
  Phone,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Language, strings } from '../translations';
import { FarmerUser, OperationType, handleFirestoreError } from '../types';
import {
  getVoiceAvailability,
  getSavedVoiceEngine,
  saveVoiceEngine,
  getSavedVoicePersona,
  saveVoicePersona,
  speakText,
  stopSpeaking,
  VoiceAvailability,
  VoiceEngine,
  VoicePackPersona,
  VOICE_PACK_PERSONAS,
} from '../utils/voice';

interface SettingsViewProps {
  language: Language;
  setLang: (l: Language) => void;
  voiceSpeed: number;
  setVoiceSpeed: (s: number) => void;
  user: FarmerUser;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  language,
  setLang,
  voiceSpeed,
  setVoiceSpeed,
  user,
}) => {
  const t = strings[language];
  const [voiceAvail, setVoiceAvail] = useState<VoiceAvailability>(() => getVoiceAvailability());
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>(() => getSavedVoiceEngine());
  const [voicePersona, setVoicePersona] = useState<VoicePackPersona>(() => getSavedVoicePersona());
  const [testingLang, setTestingLang] = useState<Language | null>(null);
  const [loadingLang, setLoadingLang] = useState<Language | null>(null);
  const [voiceTestMsg, setVoiceTestMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: user.displayName || '',
    location: '',
    cropsGrown: '',
    experience: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const refresh = () => setVoiceAvail(getVoiceAvailability());
    refresh();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = refresh;
    }
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (user.isGuest || !auth.currentUser) {
        try {
          const saved = localStorage.getItem('agrismart_guest_profile');
          if (saved) setProfile(JSON.parse(saved));
        } catch {}
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            name: d.displayName || user.displayName || '',
            location: d.location || '',
            cropsGrown: d.cropsGrown || '',
            experience: d.experience || '',
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }
    };
    loadProfile();
  }, [user]);

  const handleEngineChange = (engine: VoiceEngine) => {
    stopSpeaking();
    setTestingLang(null);
    setLoadingLang(null);
    setVoiceTestMsg(null);
    setVoiceEngine(engine);
    saveVoiceEngine(engine);
    setVoiceAvail(getVoiceAvailability());
  };

  const handlePersonaChange = (persona: VoicePackPersona) => {
    stopSpeaking();
    setTestingLang(null);
    setLoadingLang(null);
    setVoicePersona(persona);
    saveVoicePersona(persona);
  };

  const handleTestVoice = async (testLang: Language) => {
    setVoiceTestMsg(null);
    setLoadingLang(testLang);
    const sample =
      testLang === 'hi'
        ? 'नमस्ते किसान भाई, मैं एग्री स्मार्ट एआई खेती सहायक हूँ। मैं आपकी फसल रोग, खाद और मौसम में मदद कर सकता हूँ।'
        : testLang === 'mr'
        ? 'नमस्कार शेतकरी मित्रांनो, मी अ‍ॅग्री स्मार्ट एआय शेती सहाय्यक आहे. मी तुम्हाला पिकाचे रोग, खते आणि हवामानाबद्दल अचूक सल्ला देऊ शकतो.'
        : 'Hello farmer, I am Agri SmartAI, your multilingual Indian farming assistant.';

    const res = await speakText(sample, testLang, voiceSpeed, {
      personaOverride: voicePersona,
      onStart: () => {
        setLoadingLang(null);
        setTestingLang(testLang);
      },
      onEnd: () => {
        setLoadingLang(null);
        setTestingLang(null);
      },
      onError: () => {
        setLoadingLang(null);
        setTestingLang(null);
      },
    });

    if (!res.started) {
      setLoadingLang(null);
      setTestingLang(null);
      if (res.limitationMessage) setVoiceTestMsg(res.limitationMessage);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      if (user.isGuest || !auth.currentUser) {
        localStorage.setItem('agrismart_guest_profile', JSON.stringify(profile));
      } else {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            displayName: profile.name || user.displayName || 'Farmer',
            email: user.email || 'farmer@agrismart.ai',
            role: 'farmer',
            location: profile.location,
            cropsGrown: profile.cropsGrown,
            experience: profile.experience,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      setProfileSaved(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.settings}</h1>
        <p className="text-sm text-[#526056] mt-1">
          {language === 'hi'
            ? 'भाषा, हिंदी और मराठी वॉइस पैक, आवाज की गति और किसान प्रोफ़ाइल सेटिंग्स प्रबंधित करें।'
            : language === 'mr'
            ? 'भाषा, हिंदी व मराठी व्हॉइस पॅक, आवाजाचा वेग आणि शेतकरी प्रोफाइल सेटिंग्ज व्यवस्थापित करा.'
            : 'Manage language preference, built-in Hindi & Marathi voice pack, speed, and your farmer profile.'}
        </p>
      </div>

      {/* Language Preference */}
      <section className="bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-bold text-[#18221A] flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#1F6E43]" />
          <span>{t.common.language}</span>
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { code: 'en', label: 'English (en-IN)' },
              { code: 'hi', label: 'हिंदी (hi-IN)' },
              { code: 'mr', label: 'मराठी (mr-IN)' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLang(opt.code)}
              className={`min-h-[46px] px-3 rounded-xl border text-sm font-semibold transition-colors ${
                language === opt.code
                  ? 'bg-[#1F6E43] border-[#1F6E43] text-white'
                  : 'bg-[#F7F8F5] border-[#E4E7DF] text-[#18221A] hover:border-[#1F6E43]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Built-in Hindi & Marathi Voice Pack */}
      <section className="bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#18221A] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1F6E43]" />
              <span>
                {language === 'hi'
                  ? 'हिंदी और मराठी वॉइस पैक (Built-in)'
                  : language === 'mr'
                  ? 'हिंदी आणि मराठी व्हॉइस पॅक (अंगभूत)'
                  : 'Hindi & Marathi Voice Pack (Built-in)'}
              </span>
            </h2>
            <p className="text-xs text-[#526056] mt-1">
              {language === 'hi'
                ? 'आपके फोन या ब्राउज़र में आवाज न होने पर भी स्पष्ट हिंदी और मराठी उच्चारण के लिए इन-बिल्ट AI वॉइस पैक शामिल है।'
                : language === 'mr'
                ? 'तुमच्या फोन किंवा ब्राउझरमध्ये मराठी आवाज नसला तरीही स्पष्ट मराठी व हिंदी उच्चारासाठी अंगभूत AI व्हॉइस पॅक उपलब्ध आहे.'
                : 'Built-in natural Marathi (mr-IN), Hindi (hi-IN), and Indian English (en-IN) speech voices—works on every browser without OS installation.'}
            </p>
          </div>
          {testingLang && (
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setTestingLang(null);
                setLoadingLang(null);
              }}
              className="min-h-[38px] px-3.5 rounded-xl bg-[#C53030] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5" />
              <span>{t.common.stop}</span>
            </button>
          )}
        </div>

        {/* Voice Engine Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleEngineChange('pack')}
            className={`p-3.5 rounded-xl border text-left transition-colors ${
              voiceEngine === 'pack'
                ? 'bg-[#E9F5EE] border-[#1F6E43]'
                : 'bg-[#F7F8F5] border-[#E4E7DF] hover:border-[#1F6E43]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-[#18221A]">
                {language === 'hi'
                  ? 'बिल्ट-इन हिंदी और मराठी वॉइस पैक'
                  : language === 'mr'
                  ? 'अंगभूत हिंदी व मराठी व्हॉइस पॅक'
                  : 'Built-in Hindi & Marathi Voice Pack'}
              </span>
              {voiceEngine === 'pack' && <CheckCircle2 className="w-4 h-4 text-[#1F6E43]" />}
            </div>
            <p className="text-xs text-[#526056] mt-1">
              {language === 'hi'
                ? 'अनुशंसित — प्राकृतिक मराठी, हिंदी और भारतीय अंग्रेजी उच्चारण'
                : language === 'mr'
                ? 'शिफारस केलेले — अस्सल मराठी, हिंदी व भारतीय इंग्रजी उच्चार'
                : 'Recommended — authentic Marathi, Hindi & Indian English pronunciation'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleEngineChange('device')}
            className={`p-3.5 rounded-xl border text-left transition-colors ${
              voiceEngine === 'device'
                ? 'bg-[#E9F5EE] border-[#1F6E43]'
                : 'bg-[#F7F8F5] border-[#E4E7DF] hover:border-[#1F6E43]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-[#18221A]">
                {language === 'hi'
                  ? 'डिवाइस / ब्राउज़र आवाज (ऑफ़लाइन)'
                  : language === 'mr'
                  ? 'डिव्हाइस / ब्राउझर आवाज (ऑफलाइन)'
                  : 'Device / Browser Voice (Offline)'}
              </span>
              {voiceEngine === 'device' && <CheckCircle2 className="w-4 h-4 text-[#1F6E43]" />}
            </div>
            <p className="text-xs text-[#526056] mt-1">
              {language === 'hi'
                ? 'केवल आपके फोन/कंप्यूटर में इंस्टॉल आवाज़ों का उपयोग करता है'
                : language === 'mr'
                ? 'फक्त तुमच्या फोन/संगणकावरील स्थापित आवाज वापरते'
                : 'Uses only voices installed on your device operating system'}
            </p>
          </button>
        </div>

        {/* Voice Pack Persona Selection */}
        {voiceEngine === 'pack' && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#18221A]">
              {language === 'hi'
                ? 'आवाज चुनें (Voice Speaker)'
                : language === 'mr'
                ? 'आवाज निवडा (Voice Speaker)'
                : 'Select Voice Speaker'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VOICE_PACK_PERSONAS.map((vp) => {
                const label =
                  language === 'hi' ? vp.labelHi : language === 'mr' ? vp.labelMr : vp.labelEn;
                const desc =
                  language === 'hi' ? vp.descHi : language === 'mr' ? vp.descMr : vp.descEn;
                const active = voicePersona === vp.id;
                return (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => handlePersonaChange(vp.id)}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      active
                        ? 'bg-[#1F6E43] border-[#1F6E43] text-white'
                        : 'bg-[#F7F8F5] border-[#E4E7DF] text-[#18221A] hover:border-[#1F6E43]'
                    }`}
                  >
                    <p className="text-sm font-bold">{label}</p>
                    <p className={`text-xs mt-0.5 ${active ? 'text-[#E9F5EE]' : 'text-[#526056]'}`}>
                      {desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Test All 3 Language Voices */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#18221A]">
            {language === 'hi'
              ? 'आवाज सुनकर जांचें (Sample Test)'
              : language === 'mr'
              ? 'आवाज ऐकून तपासा (Sample Test)'
              : 'Preview Voice Pack Samples'}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {(
              [
                { code: 'mr', label: 'मराठी आवाज तपासा (Marathi)' },
                { code: 'hi', label: 'हिंदी आवाज जांचें (Hindi)' },
                { code: 'en', label: 'Test English (en-IN)' },
              ] as const
            ).map((item) => {
              const isLoading = loadingLang === item.code;
              const isPlaying = testingLang === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  disabled={loadingLang !== null}
                  onClick={() => {
                    if (isPlaying) {
                      stopSpeaking();
                      setTestingLang(null);
                    } else {
                      handleTestVoice(item.code);
                    }
                  }}
                  className={`min-h-[42px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                    isPlaying
                      ? 'bg-[#C53030] border-[#C53030] text-white'
                      : 'bg-[#E9F5EE] border-[#CBE6D6] text-[#1F6E43] hover:bg-[#1F6E43] hover:text-white'
                  } disabled:opacity-60`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPlaying ? (
                    <Square className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span>{isPlaying ? t.common.stop : item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice Speed */}
        <div className="space-y-2 pt-2 border-t border-[#E4E7DF]">
          <p className="text-xs font-bold text-[#18221A]">{t.common.voiceSpeed}</p>
          <div className="flex flex-wrap gap-2">
            {[0.75, 1, 1.25, 1.5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setVoiceSpeed(spd)}
                className={`min-h-[40px] px-4 rounded-xl border text-sm font-semibold tabular-nums ${
                  voiceSpeed === spd
                    ? 'bg-[#1F6E43] border-[#1F6E43] text-white'
                    : 'bg-[#F7F8F5] border-[#E4E7DF] text-[#18221A]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {voiceTestMsg && (
          <div className="p-3.5 rounded-xl bg-[#FEF6E7] border border-[#F5D79E] text-xs sm:text-sm text-[#8A540E] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{voiceTestMsg}</span>
          </div>
        )}

        {/* Voice Pack & Device Availability Status */}
        <div className="pt-3 border-t border-[#E4E7DF] space-y-2 text-xs">
          <p className="font-bold text-[#18221A]">
            {language === 'hi'
              ? 'वॉइस पैक स्थिति (Voice Pack Status):'
              : language === 'mr'
              ? 'व्हॉइस पॅक स्थिती (Voice Pack Status):'
              : 'Voice Pack Status:'}
          </p>
          {(
            [
              { code: 'mr', label: 'Marathi (mr-IN)', info: voiceAvail.mr },
              { code: 'hi', label: 'Hindi (hi-IN)', info: voiceAvail.hi },
              { code: 'en', label: 'English (en-IN)', info: voiceAvail.en },
            ] as const
          ).map((row) => (
            <div
              key={row.code}
              className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg bg-[#F7F8F5]"
            >
              <span className="font-semibold text-[#18221A]">{row.label}</span>
              {voiceEngine === 'pack' ? (
                <span className="text-[#1F6E43] font-semibold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {language === 'hi'
                      ? `बिल्ट-इन वॉइस पैक सक्रिय (${voicePersona})`
                      : language === 'mr'
                      ? `अंगभूत व्हॉइस पॅक सक्रिय (${voicePersona})`
                      : `Built-in Voice Pack Ready (${voicePersona})`}
                  </span>
                </span>
              ) : row.info.available ? (
                <span className="text-[#1F6E43] font-semibold">
                  Device Voice Available ({row.info.voiceName})
                </span>
              ) : (
                <span className="text-[#C47B17] font-semibold">
                  Not installed on device (Switch to Built-in Voice Pack above)
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Farmer Profile */}
      <section className="bg-white border border-[#E4E7DF] rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-bold text-[#18221A] flex items-center gap-2">
          <User className="w-4 h-4 text-[#1F6E43]" />
          <span>
            {language === 'hi' ? 'किसान प्रोफ़ाइल' : language === 'mr' ? 'शेतकरी प्रोफाइल' : 'Farmer Profile'}
          </span>
        </h2>

        {profileSaved && (
          <div className="p-3 rounded-xl bg-[#E9F5EE] border border-[#CBE6D6] text-xs font-semibold text-[#1F6E43] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.common.saved}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Farmer Name"
              className="min-h-[44px] px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
            />
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              placeholder="Village / District (e.g., Nashik, MH)"
              className="min-h-[44px] px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={profile.cropsGrown}
              onChange={(e) => setProfile({ ...profile, cropsGrown: e.target.value })}
              placeholder="Crops Grown (e.g., Cotton, Soybean, Onion)"
              className="min-h-[44px] px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm outline-none focus:border-[#1F6E43]"
            />
            <input
              type="number"
              min="0"
              value={profile.experience}
              onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
              placeholder="Farming Experience (Years)"
              className="min-h-[44px] px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm tabular-nums outline-none focus:border-[#1F6E43]"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="min-h-[44px] px-6 rounded-xl bg-[#1F6E43] hover:bg-[#185835] text-white text-sm font-semibold"
          >
            {savingProfile ? t.common.loading : t.common.save}
          </button>
        </form>
      </section>

      {/* Helpline Strip */}
      <div className="bg-[#E9F5EE] border border-[#CBE6D6] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Phone className="w-5 h-5 text-[#1F6E43]" />
          <div className="text-sm">
            <p className="font-bold text-[#18221A]">Kisan Call Center (Toll-Free 24x7)</p>
            <p className="text-xs text-[#526056]">Ministry of Agriculture & Farmers Welfare</p>
          </div>
        </div>
        <a
          href="tel:18001801551"
          className="min-h-[40px] px-4 rounded-xl bg-[#1F6E43] text-white font-bold text-sm inline-flex items-center tabular-nums"
        >
          1800-180-1551
        </a>
      </div>
    </div>
  );
};
