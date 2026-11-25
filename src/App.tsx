import React, { useState, useEffect, useCallback } from 'react';
import { Sprout, CloudOff, RotateCcw } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  Language,
  strings,
  getSavedLanguage,
  saveLanguage,
} from './translations';
import { getSavedVoiceSpeed, saveVoiceSpeed, stopSpeaking } from './utils/voice';
import { analyzePlantImage } from './services/geminiService';
import {
  FarmerUser,
  HistoryItem,
  OfflinePlantRequest,
  OperationType,
  handleFirestoreError,
} from './types';
import {
  ErrorBoundary,
  DashboardLayout,
  DashboardPageId,
} from './components/NavigationShell';
import { LoginView } from './components/LoginView';
import { FarmHome } from './components/FarmHome';
import { PlantScanView } from './components/PlantScanView';
import { FlowerScanView } from './components/FlowerScanView';
import { PestScanView } from './components/PestScanView';
import { ChatbotView } from './components/ChatbotView';
import { WeatherView } from './components/WeatherView';
import {
  SoilAnalysisView,
  CropRecommendationView,
} from './components/SoilAndCropViews';
import { MandiPricesView } from './components/MandiPricesView';
import {
  ExpenseCalculatorView,
  GovSchemesView,
} from './components/ExpenseAndSchemesViews';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardPageId>('home');
  const [lang, setLangState] = useState<Language>(() => getSavedLanguage());
  const [voiceSpeed, setVoiceSpeedState] = useState<number>(() => getSavedVoiceSpeed());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, loading] = useAuthState(auth);
  const [isGuest, setIsGuest] = useState(false);
  const [isSeedingHistory, setIsSeedingHistory] = useState(false);

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [offlineQueue, setOfflineQueue] = useState<OfflinePlantRequest[]>(() => {
    try {
      const stored = localStorage.getItem('agrismart_offline_plant_queue');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isSyncingOfflineQueue, setIsSyncingOfflineQueue] = useState(false);

  const t = strings[lang];

  const setLang = useCallback((nextLang: Language) => {
    setLangState(nextLang);
    saveLanguage(nextLang);
    stopSpeaking();
  }, []);

  const setVoiceSpeed = useCallback((speed: number) => {
    setVoiceSpeedState(speed);
    saveVoiceSpeed(speed);
  }, []);

  const currentUser: FarmerUser | null = user
    ? {
        uid: user.uid,
        displayName: user.displayName || 'Farmer',
        email: user.email || '',
        photoURL: user.photoURL || null,
        isGuest: false,
      }
    : isGuest
    ? {
        uid: 'guest-farmer-01',
        displayName: t.common.guestFarmer,
        email: 'guest@agrismart.ai',
        photoURL: null,
        isGuest: true,
      }
    : null;

  const navigateTo = useCallback((tab: DashboardPageId) => {
    stopSpeaking();
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const enqueueOfflinePlantAnalysis = (request: OfflinePlantRequest) => {
    setOfflineQueue((prev) => {
      const updated = [request, ...prev.filter((i) => i.id !== request.id)];
      try {
        localStorage.setItem('agrismart_offline_plant_queue', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist offline queue:', e);
      }
      return updated;
    });
  };

  const removeOfflineQueueItem = (id: string) => {
    setOfflineQueue((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem('agrismart_offline_plant_queue', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist offline queue:', e);
      }
      return updated;
    });
  };

  const addToHistory = useCallback(
    async (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
      let healthScore: number | undefined = item.healthScore;
      if (healthScore === undefined && item.type === 'plant') {
        if (item.details?.healthScore !== undefined) {
          healthScore = Number(item.details.healthScore);
        } else if (item.details?.status?.toLowerCase().includes('healthy')) {
          healthScore = 92;
        } else if (item.details?.status?.toLowerCase().includes('infected')) {
          healthScore = 48;
        }
      }

      if (!user) {
        const now = Date.now();
        const newItem: HistoryItem = {
          ...item,
          id: `hist_${now}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleString(),
          rawDate: now,
          healthScore,
        };
        setHistory((prev) => [newItem, ...prev]);
        return;
      }

      try {
        await addDoc(collection(db, 'history'), {
          ...item,
          ...(healthScore !== undefined ? { healthScore } : {}),
          uid: user.uid,
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'history');
      }
    },
    [user]
  );

  const deleteHistoryRecord = useCallback(
    async (id: string) => {
      if (!user) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
        return;
      }
      try {
        await deleteDoc(doc(db, 'history', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `history/${id}`);
      }
    },
    [user]
  );

  const processOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncingOfflineQueue) return;

    let queue: OfflinePlantRequest[] = [];
    try {
      const stored = localStorage.getItem('agrismart_offline_plant_queue');
      queue = stored ? JSON.parse(stored) : [];
    } catch {
      queue = offlineQueue;
    }
    if (!queue.length) return;

    setIsSyncingOfflineQueue(true);
    const remaining: OfflinePlantRequest[] = [];

    for (const item of queue) {
      try {
        const data = await analyzePlantImage(item.image, item.language || lang);
        if (data.error && !data.plantName) throw new Error(data.error);
        await addToHistory({
          type: 'plant',
          result: `${data.plantName || 'Crop'} - ${data.diseaseName || data.status || 'Checked'}`,
          healthScore: data.healthScore,
          details: data,
        });
      } catch (err) {
        console.error('Failed to sync offline item:', item.id, err);
        remaining.push({ ...item, status: 'error' });
      }
    }

    setOfflineQueue(remaining);
    try {
      localStorage.setItem('agrismart_offline_plant_queue', JSON.stringify(remaining));
    } catch {}
    setIsSyncingOfflineQueue(false);
  }, [lang, isSyncingOfflineQueue, offlineQueue, addToHistory]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (navigator.onLine && offlineQueue.length > 0) {
      processOfflineQueue();
    }
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processOfflineQueue, offlineQueue.length]);

  useEffect(() => {
    if (!user) {
      if (!isGuest) {
        setHistory([]);
      }
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    getDoc(userRef).then((docSnap) => {
      if (!docSnap.exists()) {
        setDoc(userRef, {
          displayName: user.displayName || 'Farmer',
          email: user.email || 'farmer@agrismart.ai',
          photoURL: user.photoURL || '',
          role: 'farmer',
          createdAt: serverTimestamp(),
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
      }
    });

    const q = query(
      collection(db, 'history'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(60)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: HistoryItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let rawDate = Date.now();
          if (data.timestamp instanceof Timestamp) {
            rawDate = data.timestamp.toDate().getTime();
          } else if (typeof data.timestamp === 'string') {
            const parsed = new Date(data.timestamp);
            if (!isNaN(parsed.getTime())) rawDate = parsed.getTime();
          }
          return {
            id: docSnap.id,
            type: data.type,
            result: data.result || '',
            timestamp:
              data.timestamp instanceof Timestamp
                ? data.timestamp.toDate().toLocaleString()
                : typeof data.timestamp === 'string'
                ? data.timestamp
                : new Date().toLocaleString(),
            rawDate,
            healthScore: data.healthScore,
            details: data.details,
          };
        });
        setHistory(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'history');
      }
    );

    return () => unsubscribe();
  }, [user, isGuest]);

  const seedSampleHistory = async () => {
    setIsSeedingHistory(true);
    const now = Date.now();
    const dayMs = 86400000;
    const sampleScans = [
      {
        plantName: 'Cotton',
        scientificName: 'Gossypium hirsutum',
        status: 'Infected',
        severity: 'Moderate',
        diseaseName: 'Alternaria Leaf Spot',
        confidence: 86,
        healthScore: 54,
        symptoms: 'Small circular brown spots with concentric rings on lower leaves.',
        possibleCauses: 'High humidity and warm temperatures.',
        prevention: 'Maintain proper plant spacing and avoid overhead irrigation.',
        treatment: 'Spray Copper Oxychloride or Mancozeb as advised by local Krishi Kendra.',
        consultExpertAdvice: 'Consult local agriculture officer if spots spread to upper canopy.',
        timeOffset: 10 * dayMs,
      },
      {
        plantName: 'Tomato',
        scientificName: 'Solanum lycopersicum',
        status: 'Healthy',
        severity: 'None',
        diseaseName: null,
        confidence: 92,
        healthScore: 88,
        symptoms: 'Leaves are dark green with no spots or curling.',
        possibleCauses: 'Healthy balanced crop nutrition.',
        prevention: 'Continue morning drip irrigation and staking.',
        treatment: 'No treatment required.',
        consultExpertAdvice: 'Routine weekly field monitoring is sufficient.',
        timeOffset: 5 * dayMs,
      },
      {
        plantName: 'Cotton',
        scientificName: 'Gossypium hirsutum',
        status: 'Healthy',
        severity: 'None',
        diseaseName: null,
        confidence: 94,
        healthScore: 93,
        symptoms: 'New foliage is healthy and leaf spot spread has stopped.',
        possibleCauses: 'Timely fungicide application and good drainage.',
        prevention: 'Keep field weed-free and continue balanced nutrition.',
        treatment: 'No further spray needed.',
        consultExpertAdvice: 'Continue regular field checks.',
        timeOffset: 1 * dayMs,
      },
    ];

    try {
      if (user) {
        for (const scan of sampleScans) {
          const scanDate = new Date(now - scan.timeOffset);
          await addDoc(collection(db, 'history'), {
            uid: user.uid,
            type: 'plant',
            result: `${scan.plantName} - ${scan.diseaseName || scan.status}`,
            timestamp: Timestamp.fromDate(scanDate),
            healthScore: scan.healthScore,
            details: { ...scan, scanDate: scanDate.toISOString() },
          });
        }
      } else {
        const localItems: HistoryItem[] = sampleScans.map((scan, idx) => {
          const scanDate = new Date(now - scan.timeOffset);
          return {
            id: `sample_${now}_${idx}`,
            type: 'plant',
            result: `${scan.plantName} - ${scan.diseaseName || scan.status}`,
            timestamp: scanDate.toLocaleString(),
            rawDate: scanDate.getTime(),
            healthScore: scan.healthScore,
            details: { ...scan, scanDate: scanDate.toISOString() },
          };
        });
        setHistory((prev) => [...localItems, ...prev]);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'history');
    } finally {
      setIsSeedingHistory(false);
    }
  };

  if (loading && !isGuest) {
    return (
      <div className="min-h-screen bg-[#F7F8F5] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#1F6E43] text-white flex items-center justify-center mb-3">
          <Sprout className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-[#526056]">{t.common.loading}</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        language={lang}
        setLang={setLang}
        onGuestLogin={() => setIsGuest(true)}
      />
    );
  }

  const offlineBanner =
    !isOnline || offlineQueue.length > 0 ? (
      <div className="bg-[#FEF6E7] border-b border-[#F5D79E]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8A540E]">
          <div className="flex items-center gap-2">
            <CloudOff className="w-4 h-4 shrink-0" />
            <span className="font-medium">
              {offlineQueue.length > 0
                ? `${offlineQueue.length} ${t.common.queuedCount}`
                : t.common.offlineBanner}
            </span>
          </div>
          {isOnline && offlineQueue.length > 0 && (
            <button
              type="button"
              onClick={processOfflineQueue}
              disabled={isSyncingOfflineQueue}
              className="min-h-[34px] px-3.5 rounded-lg bg-[#1F6E43] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 ${isSyncingOfflineQueue ? 'animate-spin' : ''}`}
              />
              <span>{isSyncingOfflineQueue ? t.common.syncing : t.common.syncNow}</span>
            </button>
          )}
        </div>
      </div>
    ) : undefined;

  return (
    <ErrorBoundary>
      <DashboardLayout
        lang={lang}
        setLang={setLang}
        activeTab={activeTab}
        setActiveTab={navigateTo}
        user={currentUser}
        onExitGuest={() => setIsGuest(false)}
        banner={offlineBanner}
      >
        {activeTab === 'home' && (
          <FarmHome
            language={lang}
            user={currentUser}
            history={history}
            setActiveTab={navigateTo}
          />
        )}

        {activeTab === 'disease' && (
          <PlantScanView
            language={lang}
            voiceSpeed={voiceSpeed}
            onResult={addToHistory}
            offlineQueue={offlineQueue}
            onEnqueueOffline={enqueueOfflinePlantAnalysis}
            onRemoveQueueItem={removeOfflineQueueItem}
            isSyncingQueue={isSyncingOfflineQueue}
            onSyncQueue={processOfflineQueue}
            isOnline={isOnline}
          />
        )}

        {activeTab === 'flower' && (
          <FlowerScanView
            language={lang}
            voiceSpeed={voiceSpeed}
            onResult={addToHistory}
          />
        )}

        {activeTab === 'pest' && (
          <PestScanView
            language={lang}
            voiceSpeed={voiceSpeed}
            onResult={addToHistory}
          />
        )}

        {activeTab === 'chat' && (
          <ChatbotView
            language={lang}
            voiceSpeed={voiceSpeed}
            setVoiceSpeed={setVoiceSpeed}
            onSaveConversation={addToHistory}
          />
        )}

        {activeTab === 'weather' && <WeatherView language={lang} />}

        {activeTab === 'soil' && (
          <SoilAnalysisView language={lang} onResult={addToHistory} />
        )}

        {activeTab === 'crop' && (
          <CropRecommendationView language={lang} onResult={addToHistory} />
        )}

        {activeTab === 'mandi' && <MandiPricesView language={lang} />}

        {activeTab === 'expense' && (
          <ExpenseCalculatorView language={lang} onSaveExpense={addToHistory} />
        )}

        {activeTab === 'schemes' && <GovSchemesView language={lang} />}

        {activeTab === 'history' && (
          <HistoryView
            language={lang}
            history={history}
            onDeleteRecord={deleteHistoryRecord}
            setActiveTab={navigateTo}
            onSeedSampleData={seedSampleHistory}
            isSeeding={isSeedingHistory}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            language={lang}
            setLang={setLang}
            voiceSpeed={voiceSpeed}
            setVoiceSpeed={setVoiceSpeed}
            user={currentUser}
          />
        )}
      </DashboardLayout>
    </ErrorBoundary>
  );
}
