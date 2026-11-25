import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  Square,
  RotateCcw,
  BookmarkCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Language, strings } from '../translations';
import { getChatResponse } from '../services/geminiService';
import {
  getVoiceAvailability,
  speakText,
  stopSpeaking,
  startVoiceRecognition,
  VoiceAvailability,
} from '../utils/voice';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface ChatbotViewProps {
  language: Language;
  voiceSpeed: number;
  setVoiceSpeed: (s: number) => void;
  onSaveConversation: (item: any) => void;
}

export const ChatbotView: React.FC<ChatbotViewProps> = ({
  language,
  voiceSpeed,
  setVoiceSpeed,
  onSaveConversation,
}) => {
  const t = strings[language];

  const greetingForLang = (lang: Language) =>
    lang === 'hi'
      ? 'नमस्ते किसान भाई! मैं Agri SmartAI हूँ। आप फसल रोग, खाद, सिंचाई, बुवाई या कटाई से जुड़ा कोई भी प्रश्न बोलकर या लिखकर पूछ सकते हैं।'
      : lang === 'mr'
      ? 'नमस्कार शेतकरी मित्र! मी Agri SmartAI आहे. तुम्ही पीक रोग, खते, सिंचन, पेरणी किंवा काढणीबद्दल कोणताही प्रश्न बोलून किंवा लिहून विचारू शकता.'
      : 'Hello Farmer! I am Agri SmartAI. Ask me any question about crop diseases, fertilizers, irrigation, planting, or harvesting by typing or using the microphone.';

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', text: greetingForLang(language) },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingSpeechId, setLoadingSpeechId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceAvail, setVoiceAvail] = useState<VoiceAvailability>(() => getVoiceAvailability());
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refreshVoices = () => setVoiceAvail(getVoiceAvailability());
    refreshVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
    return () => {
      stopSpeaking();
      recognitionRef.current?.stop();
    };
  }, []);

  // Update welcome greeting if no user messages yet when language changes
  useEffect(() => {
    setVoiceNotice(null);
    stopSpeaking();
    setSpeakingId(null);
    setMessages((prev) =>
      prev.length === 1 && prev[0].id === 'welcome'
        ? [{ id: 'welcome', role: 'assistant', text: greetingForLang(language) }]
        : prev
    );
  }, [language]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const speakMessage = async (msgId: string, text: string) => {
    setVoiceNotice(null);
    setLoadingSpeechId(msgId);
    const res = await speakText(text, language, voiceSpeed, {
      onStart: () => {
        setLoadingSpeechId(null);
        setSpeakingId(msgId);
      },
      onEnd: () => {
        setLoadingSpeechId(null);
        setSpeakingId(null);
      },
      onError: () => {
        setLoadingSpeechId(null);
        setSpeakingId(null);
      },
    });
    if (!res.started) {
      setLoadingSpeechId(null);
      setSpeakingId(null);
      if (res.limitationMessage) {
        setVoiceNotice(res.limitationMessage);
      }
    }
  };

  const handleStopVoice = () => {
    stopSpeaking();
    setLoadingSpeechId(null);
    setSpeakingId(null);
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    setErrorMsg(null);
    setSavedToast(false);
    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', text };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setSending(true);

    try {
      const apiMessages = updatedHistory
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }));
      const replyText = await getChatResponse(apiMessages, language);
      const botMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: replyText,
      };
      setMessages((prev) => [...prev, botMsg]);

      if (autoSpeak) {
        speakMessage(botMsg.id, botMsg.text);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || t.common.apiErrorGeneric);
    } finally {
      setSending(false);
    }
  };

  const handleToggleMic = () => {
    setVoiceNotice(null);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    stopSpeaking();
    setSpeakingId(null);
    setIsListening(true);
    recognitionRef.current = startVoiceRecognition(language, {
      onResult: (transcript) => {
        setInput(transcript);
        sendMessage(transcript);
      },
      onEnd: () => setIsListening(false),
      onError: (msg) => {
        setVoiceNotice(msg);
        setIsListening(false);
      },
    });
  };

  const handleSaveChat = () => {
    const userQuestions = messages.filter((m) => m.role === 'user');
    if (userQuestions.length === 0) return;
    const summaryTitle = userQuestions[0].text.slice(0, 60);
    onSaveConversation({
      type: 'chat',
      result: `Chat: ${summaryTitle}${userQuestions[0].text.length > 60 ? '...' : ''}`,
      details: {
        language,
        messageCount: messages.length,
        conversation: messages.map((m) => ({ role: m.role, text: m.text })),
      },
    });
    setSavedToast(true);
  };

  const sampleQuestions =
    language === 'hi'
      ? [
          'कपास में सफेद मक्खी को कैसे रोकें?',
          'टमाटर के पत्तों पर पीले धब्बे क्यों आते हैं?',
          'गेहूं में पहली सिंचाई कब करनी चाहिए?',
        ]
      : language === 'mr'
      ? [
          'कापसावरील बोंडअळी कशी नियंत्रित करावी?',
          'सोयाबीन पिकासाठी कोणते खत योग्य आहे?',
          'कांदा पिकात पाणी व्यवस्थापन कसे करावे?',
        ]
      : [
          'How do I control whitefly in cotton?',
          'Best fertilizer schedule for soybean crop?',
          'When should I irrigate wheat crop?',
        ];

  const currentLangVoiceAvailable =
    voiceAvail.builtInPackEnabled || voiceAvail[language].available;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.chat}</h1>
          <p className="text-sm text-[#526056]">
            {language === 'hi'
              ? 'आवाज (माइक) या टाइप करके अपनी भाषा में खेती का सवाल पूछें — हिंदी और मराठी वॉइस पैक सक्रिय है।'
              : language === 'mr'
              ? 'आवाज (माइक) किंवा टाइप करून तुमच्या भाषेत शेतीचे प्रश्न विचारा — मराठी व हिंदी व्हॉइस पॅक सक्रिय आहे.'
              : 'Ask farming questions by voice or text — built-in Hindi, Marathi & Indian English voice pack ready.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Voice Speed Control */}
          <label className="flex items-center gap-1.5 bg-white border border-[#E4E7DF] rounded-xl px-3 min-h-[40px] text-xs font-semibold text-[#18221A]">
            <span>{t.common.voiceSpeed}:</span>
            <select
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
              className="bg-transparent outline-none text-[#1F6E43] font-bold"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </label>

          {/* Auto-Speak Toggle */}
          <button
            type="button"
            onClick={() => setAutoSpeak((v) => !v)}
            className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 ${
              autoSpeak
                ? 'bg-[#E9F5EE] border-[#CBE6D6] text-[#1F6E43]'
                : 'bg-white border-[#E4E7DF] text-[#526056]'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>
              {language === 'hi'
                ? autoSpeak
                  ? 'आवाज चालू'
                  : 'आवाज बंद'
                : language === 'mr'
                ? autoSpeak
                  ? 'आवाज चालू'
                  : 'आवाज बंद'
                : autoSpeak
                ? 'Auto-Speak On'
                : 'Auto-Speak Off'}
            </span>
          </button>

          {/* Save Conversation Button */}
          <button
            type="button"
            onClick={handleSaveChat}
            disabled={messages.filter((m) => m.role === 'user').length === 0}
            className="min-h-[40px] px-3.5 rounded-xl bg-white border border-[#E4E7DF] hover:border-[#1F6E43] disabled:opacity-40 text-xs font-semibold text-[#18221A] inline-flex items-center gap-1.5"
          >
            <BookmarkCheck className="w-4 h-4 text-[#1F6E43]" />
            <span>{savedToast ? t.common.saved : t.common.save}</span>
          </button>
        </div>
      </div>

      {/* Show limitation notice only if Device Voice mode is chosen and device lacks voice */}
      {!currentLangVoiceAvailable && (
        <div className="bg-[#FEF6E7] border border-[#F5D79E] rounded-xl p-3.5 text-xs sm:text-sm text-[#8A540E] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {language === 'mr'
              ? t.common.noMarathiVoice
              : language === 'hi'
              ? t.common.noHindiVoice
              : t.common.noEnglishVoice}
          </span>
        </div>
      )}

      {voiceNotice && (
        <div className="bg-[#FEF6E7] border border-[#F5D79E] rounded-xl p-3.5 text-xs sm:text-sm text-[#8A540E]">
          {voiceNotice}
        </div>
      )}

      {errorMsg && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3.5 text-sm text-[#C53030]">
          {errorMsg}
        </div>
      )}

      {/* Quick Starter Questions */}
      <div className="flex flex-wrap gap-2">
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => sendMessage(q)}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#E4E7DF] hover:border-[#1F6E43] text-xs font-medium text-[#18221A] transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <div className="bg-white border border-[#E4E7DF] rounded-2xl flex flex-col h-[58vh] min-h-[420px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F7F8F5]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#1F6E43] text-white'
                    : 'bg-white border border-[#E4E7DF] text-[#18221A]'
                }`}
              >
                <p>{msg.text}</p>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-[#E4E7DF]">
                    {loadingSpeechId === msg.id ? (
                      <span className="text-xs font-semibold text-[#526056] inline-flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1F6E43]" />
                        <span>{t.common.loading}</span>
                      </span>
                    ) : speakingId === msg.id ? (
                      <button
                        type="button"
                        onClick={handleStopVoice}
                        className="text-xs font-semibold text-[#C53030] inline-flex items-center gap-1"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>{t.common.stop}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => speakMessage(msg.id, msg.text)}
                        className="text-xs font-semibold text-[#1F6E43] hover:underline inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t.common.replay}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="text-xs text-[#526056] px-2">{t.common.loading}</div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-3 bg-white border-t border-[#E4E7DF] flex items-center gap-2"
        >
          <button
            type="button"
            onClick={handleToggleMic}
            className={`min-h-[46px] min-w-[46px] rounded-xl inline-flex items-center justify-center border transition-colors shrink-0 ${
              isListening
                ? 'bg-[#C53030] border-[#C53030] text-white animate-pulse'
                : 'bg-[#F7F8F5] border-[#E4E7DF] text-[#1F6E43] hover:bg-[#E9F5EE]'
            }`}
            title={isListening ? t.common.listening : t.common.speakQuestion}
            aria-label={t.common.speakQuestion}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? t.common.listening
                : language === 'hi'
                ? 'अपना खेती से जुड़ा प्रश्न लिखें...'
                : language === 'mr'
                ? 'तुमचा शेतीविषयक प्रश्न येथे लिहा...'
                : 'Type your farming question...'
            }
            className="flex-1 min-h-[46px] px-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7DF] text-sm text-[#18221A] outline-none focus:border-[#1F6E43]"
          />

          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="min-h-[46px] px-4 rounded-xl bg-[#1F6E43] hover:bg-[#185835] disabled:bg-[#CBD2C6] text-white font-semibold text-sm inline-flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === 'hi' ? 'भेजें' : language === 'mr' ? 'पाठवा' : 'Send'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
