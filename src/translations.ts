export type Language = 'en' | 'hi' | 'mr';

export const VOICE_LANG_CODE: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};

export interface AppStrings {
  appName: string;
  tagline: string;
  nav: {
    home: string;
    disease: string;
    flower: string;
    pest: string;
    chat: string;
    weather: string;
    soil: string;
    crop: string;
    mandi: string;
    expense: string;
    schemes: string;
    history: string;
    settings: string;
  };
  common: {
    loading: string;
    analyze: string;
    analyzing: string;
    uploadPhoto: string;
    takePhoto: string;
    capture: string;
    cancel: string;
    save: string;
    saved: string;
    delete: string;
    retry: string;
    search: string;
    refresh: string;
    logout: string;
    language: string;
    guestFarmer: string;
    signInGoogle: string;
    continueGuest: string;
    welcomeFarmer: string;
    listen: string;
    replay: string;
    stop: string;
    speakQuestion: string;
    listening: string;
    voiceSpeed: string;
    noMarathiVoice: string;
    noHindiVoice: string;
    noEnglishVoice: string;
    micNotSupported: string;
    micPermissionDenied: string;
    offlineBanner: string;
    syncNow: string;
    syncing: string;
    queuedCount: string;
    apiErrorGeneric: string;
    viewAll: string;
    healthy: string;
    infected: string;
    uncertain: string;
  };
}

export const strings: Record<Language, AppStrings> = {
  en: {
    appName: 'Agri SmartAI',
    tagline: 'Simple AI-Powered Farming Assistant for Indian Farmers',
    nav: {
      home: 'Home',
      disease: 'Crop Disease Detection',
      flower: 'Flower Detection',
      pest: 'Pest Detection',
      chat: 'AI Farming Assistant',
      weather: 'Weather',
      soil: 'Soil Analysis',
      crop: 'Crop Recommendation',
      mandi: 'Mandi Prices',
      expense: 'Expense Calculator',
      schemes: 'Government Schemes',
      history: 'Farming History',
      settings: 'Settings',
    },
    common: {
      loading: 'Loading...',
      analyze: 'Analyze',
      analyzing: 'Analyzing...',
      uploadPhoto: 'Upload Photo',
      takePhoto: 'Take Photo',
      capture: 'Capture Photo',
      cancel: 'Cancel',
      save: 'Save to History',
      saved: 'Saved',
      delete: 'Delete',
      retry: 'Try Again',
      search: 'Search',
      refresh: 'Refresh',
      logout: 'Logout',
      language: 'Language',
      guestFarmer: 'Guest Farmer',
      signInGoogle: 'Sign in with Google',
      continueGuest: 'Continue as Guest Farmer',
      welcomeFarmer: 'Welcome to Agri SmartAI',
      listen: 'Listen',
      replay: 'Replay',
      stop: 'Stop',
      speakQuestion: 'Speak Question',
      listening: 'Listening...',
      voiceSpeed: 'Voice Speed',
      noMarathiVoice:
        'Marathi voice is not installed on this browser/device. Reading Marathi aloud is paused so it is not mispronounced; please read the Marathi text response below.',
      noHindiVoice:
        'Hindi voice is not available on this browser/device. Please read the Hindi text response below.',
      noEnglishVoice:
        'Speech synthesis is not available on this browser/device. Please read the text response.',
      micNotSupported:
        'Voice input is not supported in this browser. Please type your question instead.',
      micPermissionDenied:
        'Microphone access was blocked. Please allow microphone permission to speak your question.',
      offlineBanner:
        'You are offline. Plant scans are saved on your device and will analyze automatically when internet returns.',
      syncNow: 'Sync Now',
      syncing: 'Syncing...',
      queuedCount: 'scan(s) queued offline',
      apiErrorGeneric: 'Service is temporarily unavailable. Please try again shortly.',
      viewAll: 'View All',
      healthy: 'Healthy',
      infected: 'Infected',
      uncertain: 'Unclear Image',
    },
  },
  hi: {
    appName: 'Agri SmartAI',
    tagline: 'भारतीय किसानों के लिए सरल एआई खेती सहायक',
    nav: {
      home: 'होम',
      disease: 'फसल रोग पहचान',
      flower: 'फूल पहचान',
      pest: 'कीट पहचान',
      chat: 'एआई खेती सहायक',
      weather: 'मौसम जानकारी',
      soil: 'मिट्टी जांच',
      crop: 'फसल सुझाव',
      mandi: 'मंडी भाव',
      expense: 'खेती खर्च कैलकुलेटर',
      schemes: 'सरकारी योजनाएं',
      history: 'खेती रिकॉर्ड',
      settings: 'सेटिंग्स',
    },
    common: {
      loading: 'लोड हो रहा है...',
      analyze: 'जांच करें',
      analyzing: 'जांच हो रही है...',
      uploadPhoto: 'फोटो अपलोड करें',
      takePhoto: 'फोटो खींचें',
      capture: 'फोटो कैप्चर करें',
      cancel: 'रद्द करें',
      save: 'रिकॉर्ड में सहेजें',
      saved: 'सहेजा गया',
      delete: 'हटाएं',
      retry: 'पुनः प्रयास करें',
      search: 'खोजें',
      refresh: 'ताजा करें',
      logout: 'लॉगआउट',
      language: 'भाषा',
      guestFarmer: 'अतिथि किसान',
      signInGoogle: 'गूगल से लॉगिन करें',
      continueGuest: 'अतिथि किसान के रूप में जारी रखें',
      welcomeFarmer: 'Agri SmartAI में आपका स्वागत है',
      listen: 'सुनें',
      replay: 'दोबारा सुनें',
      stop: 'रोकें',
      speakQuestion: 'बोलकर पूछें',
      listening: 'सुन रहा है...',
      voiceSpeed: 'आवाज की गति',
      noMarathiVoice:
        'इस डिवाइस/ब्राउज़र में मराठी आवाज उपलब्ध नहीं है। गलत उच्चारण से बचने के लिए मराठी पढ़ना बंद रखा गया है; कृपया नीचे लिखित उत्तर पढ़ें।',
      noHindiVoice:
        'इस डिवाइस या ब्राउज़र में हिंदी आवाज उपलब्ध नहीं है। कृपया नीचे दिया गया हिंदी उत्तर पढ़ें।',
      noEnglishVoice:
        'इस ब्राउज़र में आवाज सुविधा उपलब्ध नहीं है। कृपया लिखित उत्तर पढ़ें।',
      micNotSupported:
        'इस ब्राउज़र में बोलकर पूछने की सुविधा उपलब्ध नहीं है। कृपया अपना प्रश्न टाइप करें।',
      micPermissionDenied:
        'माइक्रोफोन की अनुमति नहीं मिली। कृपया माइक्रोफोन अनुमति दें या प्रश्न टाइप करें।',
      offlineBanner:
        'आप अभी ऑफ़लाइन हैं। पौधे की जांच फोन में सहेजी गई है और इंटरनेट आने पर अपने आप पूरी होगी।',
      syncNow: 'अभी सिंक करें',
      syncing: 'सिंक हो रहा है...',
      queuedCount: 'स्कैन ऑफ़लाइन कतार में हैं',
      apiErrorGeneric: 'सेवा अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद प्रयास करें।',
      viewAll: 'सभी देखें',
      healthy: 'स्वस्थ',
      infected: 'संक्रमित',
      uncertain: 'फोटो स्पष्ट नहीं',
    },
  },
  mr: {
    appName: 'Agri SmartAI',
    tagline: 'भारतीय शेतकऱ्यांसाठी सोपा एआय शेती सहाय्यक',
    nav: {
      home: 'मुख्यपृष्ठ',
      disease: 'रोपाचे रोग तपासा',
      flower: 'फुलांची ओळख',
      pest: 'कीड ओळख',
      chat: 'एआय शेती सहाय्यक',
      weather: 'हवामान माहिती',
      soil: 'माती परीक्षण',
      crop: 'पीक शिफारस',
      mandi: 'बाजार भाव',
      expense: 'शेती खर्च हिशोब',
      schemes: 'शासकीय योजना',
      history: 'शेती नोंदी',
      settings: 'सेटिंग्ज',
    },
    common: {
      loading: 'लोड होत आहे...',
      analyze: 'तपासणी करा',
      analyzing: 'तपासणी सुरू आहे...',
      uploadPhoto: 'फोटो निवडा',
      takePhoto: 'फोटो काढा',
      capture: 'फोटो टिपा',
      cancel: 'रद्द करा',
      save: 'नोंदीत जतन करा',
      saved: 'जतन झाले',
      delete: 'काढून टाका',
      retry: 'पुन्हा प्रयत्न करा',
      search: 'शोधा',
      refresh: 'ताजे करा',
      logout: 'बाहेर पडा',
      language: 'भाषा',
      guestFarmer: 'अतिथी शेतकरी',
      signInGoogle: 'गुगलने लॉगिन करा',
      continueGuest: 'अतिथी शेतकरी म्हणून सुरू ठेवा',
      welcomeFarmer: 'Agri SmartAI मध्ये आपले स्वागत आहे',
      listen: 'ऐका',
      replay: 'पुन्हा ऐका',
      stop: 'थांबवा',
      speakQuestion: 'बोलून विचारा',
      listening: 'ऐकत आहे...',
      voiceSpeed: 'आवाजाचा वेग',
      noMarathiVoice:
        'तुमच्या ब्राउझर किंवा डिव्हाइसवर मराठी आवाज (Marathi TTS voice) उपलब्ध नाही. चुकीचे उच्चारण टाळण्यासाठी हिंदी आवाजात वाचले जाणार नाही; कृपया खालील मराठी मजकूर वाचा.',
      noHindiVoice:
        'तुमच्या ब्राउझर किंवा डिव्हाइसवर हिंदी आवाज उपलब्ध नाही. कृपया खालील मजकूर वाचा.',
      noEnglishVoice:
        'या ब्राउझरवर आवाज सुविधा उपलब्ध नाही. कृपया खालील मजकूर वाचा.',
      micNotSupported:
        'या ब्राउझरमध्ये बोलून प्रश्न विचारण्याची सुविधा नाही. कृपया प्रश्न टाइप करा.',
      micPermissionDenied:
        'मायक्रोफोनची परवानगी नाकारली आहे. कृपया परवानगी द्या किंवा प्रश्न टाइप करा.',
      offlineBanner:
        'तुम्ही सध्या ऑफलाइन आहात. रोपाची तपासणी फोनवर जतन केली आहे; इंटरनेट आल्यावर आपोआप पूर्ण होईल.',
      syncNow: 'आता सिंक करा',
      syncing: 'सिंक होत आहे...',
      queuedCount: 'तपासण्या ऑफलाइन रांगेत आहेत',
      apiErrorGeneric: 'सेवा सध्या उपलब्ध नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.',
      viewAll: 'सर्व पहा',
      healthy: 'निरोगी',
      infected: 'रोगग्रस्त',
      uncertain: 'फोटो स्पष्ट नाही',
    },
  },
};

export function getSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem('agrismart_lang');
    if (saved === 'en' || saved === 'hi' || saved === 'mr') return saved;
  } catch {}
  return 'en';
}

export function saveLanguage(lang: Language) {
  try {
    localStorage.setItem('agrismart_lang', lang);
  } catch {}
}
