import React, { useState } from 'react';
import { Sprout, CheckCircle2, Camera, MessageSquare, CloudSun } from 'lucide-react';
import { signInWithGoogle } from '../firebase';
import { Language, strings } from '../translations';
import farmlandHero from '../assets/images/daylight_green_farmland_1795509161969.jpg';

interface LoginViewProps {
  language: Language;
  setLang: (l: Language) => void;
  onGuestLogin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  language,
  setLang,
  onGuestLogin,
}) => {
  const t = strings[language];
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google sign in failed:', err);
      setErrorMsg(
        language === 'hi'
          ? 'गूगल लॉगिन पूरा नहीं हो सका। आप अतिथि किसान के रूप में जारी रख सकते हैं।'
          : language === 'mr'
          ? 'गुगल लॉगिन पूर्ण होऊ शकले नाही. तुम्ही अतिथी शेतकरी म्हणून सुरू ठेवू शकता.'
          : 'Could not complete Google sign-in. You can continue as a Guest Farmer below.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const highlights = [
    {
      icon: Camera,
      label:
        language === 'hi'
          ? 'फसल रोग और कीट की फोटो से पहचान'
          : language === 'mr'
          ? 'फोटोवरून रोपाचे रोग तपासा व कीड ओळखा'
          : 'Crop disease & pest detection from photos',
    },
    {
      icon: MessageSquare,
      label:
        language === 'hi'
          ? 'हिंदी, मराठी और अंग्रेजी में आवाज सहायक'
          : language === 'mr'
          ? 'मराठी, हिंदी व इंग्रजी बोलणारा शेती मदतनीस'
          : 'Multilingual voice-enabled AI farming assistant',
    },
    {
      icon: CloudSun,
      label:
        language === 'hi'
          ? 'लाइव मौसम, मिट्टी जांच, मंडी भाव और योजनाएं'
          : language === 'mr'
          ? 'थेट हवामान, माती परीक्षण, बाजार भाव व योजना'
          : 'Live weather, soil health, mandi prices & schemes',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8F5] flex flex-col">
      {/* Top Bar with Language Selector */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#1F6E43] text-white flex items-center justify-center">
            <Sprout className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-[#18221A] font-display">{t.appName}</span>
        </div>

        <div className="flex items-center gap-1 bg-white border border-[#E4E7DF] p-1 rounded-xl">
          {(
            [
              { code: 'en', label: 'English' },
              { code: 'hi', label: 'हिंदी' },
              { code: 'mr', label: 'मराठी' },
            ] as const
          ).map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLang(item.code)}
              className={`min-h-[36px] px-3 rounded-lg text-sm font-semibold transition-colors ${
                language === item.code
                  ? 'bg-[#1F6E43] text-white'
                  : 'text-[#526056] hover:text-[#18221A]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Content */}
      <div className="flex-1 flex items-center">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Daylight Farmland Visual */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-2xl overflow-hidden border border-[#E4E7DF] bg-white aspect-[16/10]">
              <img
                src={farmlandHero}
                alt="Green agricultural fields in morning daylight"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="bg-white border border-[#E4E7DF] rounded-xl p-4 flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#E9F5EE] text-[#1F6E43] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-medium text-[#18221A] leading-snug">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Clean Sign-In Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#E4E7DF] rounded-2xl p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#18221A] leading-tight mb-2">
                {t.common.welcomeFarmer}
              </h1>
              <p className="text-sm sm:text-base text-[#526056] mb-6">{t.tagline}</p>

              {errorMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#C53030]">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="w-full min-h-[48px] bg-[#1F6E43] hover:bg-[#185835] text-white font-semibold rounded-xl px-5 py-3 flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{signingIn ? t.common.loading : t.common.signInGoogle}</span>
                </button>

                <button
                  type="button"
                  onClick={onGuestLogin}
                  className="w-full min-h-[48px] bg-[#F7F8F5] hover:bg-[#E9F5EE] text-[#18221A] border border-[#E4E7DF] font-semibold rounded-xl px-5 py-3 transition-colors"
                >
                  {t.common.continueGuest}
                </button>
              </div>

              <p className="text-xs text-[#526056] mt-5 text-center">
                {language === 'hi'
                  ? 'गूगल खाते से आपकी फसल जांच, खर्च और चैट इतिहास सुरक्षित रूप से सेव होते हैं।'
                  : language === 'mr'
                  ? 'गुगल खात्याने तुमचे पीक तपासणी अहवाल, खर्च आणि इतिहास सुरक्षित जतन होतात.'
                  : 'Sign in with Google to save your crop scans, chats, and farm expenses across devices, or try Guest mode right away.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
