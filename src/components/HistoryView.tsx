import React, { useState, useMemo } from 'react';
import {
  Leaf,
  Flower2,
  Bug,
  MessageSquare,
  FlaskConical,
  Sprout,
  Calculator,
  ChevronDown,
  ChevronUp,
  Trash2,
  Filter,
} from 'lucide-react';
import { Language, strings } from '../translations';
import { HistoryItem, HistoryRecordType } from '../types';
import { DashboardPageId } from './NavigationShell';
import { CropHealthTrendChart } from './CropHealthTrendChart';

interface HistoryViewProps {
  language: Language;
  history: HistoryItem[];
  onDeleteRecord: (id: string) => Promise<void>;
  setActiveTab: (tab: DashboardPageId) => void;
  onSeedSampleData: () => Promise<void>;
  isSeeding: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  language,
  history,
  onDeleteRecord,
  setActiveTab,
  onSeedSampleData,
  isSeeding,
}) => {
  const t = strings[language];
  const [filterType, setFilterType] = useState<'all' | HistoryRecordType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filterType === 'all') return history;
    return history.filter((item) => item.type === filterType);
  }, [history, filterType]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteRecord(id);
    } finally {
      setDeletingId(null);
    }
  };

  const typeMeta = (type: HistoryRecordType) => {
    switch (type) {
      case 'plant':
        return { Icon: Leaf, label: t.nav.disease };
      case 'flower':
        return { Icon: Flower2, label: t.nav.flower };
      case 'pest':
        return { Icon: Bug, label: t.nav.pest };
      case 'chat':
        return { Icon: MessageSquare, label: t.nav.chat };
      case 'soil':
        return { Icon: FlaskConical, label: t.nav.soil };
      case 'crop':
        return { Icon: Sprout, label: t.nav.crop };
      case 'expense':
        return { Icon: Calculator, label: t.nav.expense };
      default:
        return { Icon: Leaf, label: type };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#18221A]">{t.nav.history}</h1>
          <p className="text-sm text-[#526056] mt-1">
            {language === 'hi'
              ? 'आपके सहेजे गए फसल रोग रिपोर्ट, कीट जांच, चैट, मिट्टी/फसल सलाह और खेती खर्च रिकॉर्ड।'
              : language === 'mr'
              ? 'तुमचे जतन केलेले रोग अहवाल, कीड तपासणी, चॅट संवाद, माती/पीक सल्ले आणि शेती खर्च नोंदी.'
              : 'View and manage your saved disease reports, pest scans, chatbot conversations, recommendations, and expense records.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#526056]" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="min-h-[42px] px-3.5 rounded-xl bg-white border border-[#E4E7DF] text-sm font-semibold text-[#18221A] outline-none focus:border-[#1F6E43]"
          >
            <option value="all">
              {language === 'hi' ? 'सभी रिकॉर्ड' : language === 'mr' ? 'सर्व नोंदी' : 'All Records'} (
              {history.length})
            </option>
            <option value="plant">{t.nav.disease}</option>
            <option value="flower">{t.nav.flower}</option>
            <option value="pest">{t.nav.pest}</option>
            <option value="chat">{t.nav.chat}</option>
            <option value="soil">{t.nav.soil}</option>
            <option value="crop">{t.nav.crop}</option>
            <option value="expense">{t.nav.expense}</option>
          </select>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white border border-[#E4E7DF] rounded-2xl divide-y divide-[#E4E7DF] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#526056]">
            {language === 'hi'
              ? 'इस श्रेणी में अभी कोई रिकॉर्ड नहीं है।'
              : language === 'mr'
              ? 'या प्रकारात अद्याप कोणतीही नोंद नाही.'
              : 'No saved records in this category yet.'}
          </div>
        ) : (
          filtered.map((item) => {
            const { Icon, label } = typeMeta(item.type);
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#E9F5EE] text-[#1F6E43] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm sm:text-base text-[#18221A] truncate">
                        {item.result}
                      </p>
                      <p className="text-xs text-[#526056] tabular-nums">
                        {label} · {item.timestamp}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#526056] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#526056] shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="min-h-[38px] min-w-[38px] rounded-xl text-[#526056] hover:text-[#C53030] hover:bg-[#FEF2F2] inline-flex items-center justify-center shrink-0 disabled:opacity-40"
                    title={t.common.delete}
                    aria-label={t.common.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {isExpanded && item.details && (
                  <div className="mt-3 pt-3 border-t border-[#E4E7DF] text-xs sm:text-sm text-[#526056] space-y-2">
                    {item.type === 'plant' && (
                      <>
                        {item.details.plantName && (
                          <p>
                            <strong className="text-[#18221A]">Crop:</strong> {item.details.plantName}{' '}
                            {item.details.scientificName ? `(${item.details.scientificName})` : ''}
                          </p>
                        )}
                        {item.details.diseaseName && (
                          <p>
                            <strong className="text-[#18221A]">Disease:</strong>{' '}
                            {item.details.diseaseName} ({item.details.severity})
                          </p>
                        )}
                        {item.details.diagnosisDetails && <p>{item.details.diagnosisDetails}</p>}
                        {item.details.treatment && (
                          <p>
                            <strong className="text-[#18221A]">Treatment:</strong>{' '}
                            {Array.isArray(item.details.treatment)
                              ? item.details.treatment.join('; ')
                              : item.details.treatment}
                          </p>
                        )}
                      </>
                    )}

                    {item.type === 'pest' && (
                      <>
                        <p>
                          <strong className="text-[#18221A]">Damage:</strong>{' '}
                          {item.details.damageCaused}
                        </p>
                        {Array.isArray(item.details.ipmRecommendations) && (
                          <p>
                            <strong className="text-[#18221A]">IPM:</strong>{' '}
                            {item.details.ipmRecommendations.join('; ')}
                          </p>
                        )}
                      </>
                    )}

                    {item.type === 'chat' && Array.isArray(item.details.conversation) && (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto bg-[#F7F8F5] p-3 rounded-xl">
                        {item.details.conversation.map((m: any, idx: number) => (
                          <p key={idx}>
                            <strong className="text-[#18221A]">
                              {m.role === 'user' ? 'Farmer' : 'Agri SmartAI'}:
                            </strong>{' '}
                            {m.text}
                          </p>
                        ))}
                      </div>
                    )}

                    {item.type === 'soil' && (
                      <>
                        <p>
                          <strong className="text-[#18221A]">Condition:</strong>{' '}
                          {item.details.soilCondition}
                        </p>
                        <p>
                          <strong className="text-[#18221A]">Fertilizer:</strong>{' '}
                          {item.details.fertilizerGuidance}
                        </p>
                      </>
                    )}

                    {item.type === 'crop' && Array.isArray(item.details.recommendations) && (
                      <ul className="list-disc list-inside space-y-1">
                        {item.details.recommendations.map((c: any, idx: number) => (
                          <li key={idx}>
                            <strong className="text-[#18221A]">{c.cropName}:</strong>{' '}
                            {c.whyRecommended}
                          </li>
                        ))}
                      </ul>
                    )}

                    {item.type === 'expense' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F7F8F5] p-3 rounded-xl tabular-nums">
                        <div>
                          <span className="block text-[11px]">Investment</span>
                          <strong className="text-[#18221A]">
                            ₹{Number(item.details.totalInvestment || 0).toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[11px]">Revenue</span>
                          <strong className="text-[#1F6E43]">
                            ₹{Number(item.details.estimatedRevenue || 0).toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[11px]">Profit/Loss</span>
                          <strong
                            className={
                              Number(item.details.estimatedProfit || 0) >= 0
                                ? 'text-[#1F6E43]'
                                : 'text-[#C53030]'
                            }
                          >
                            ₹{Number(item.details.estimatedProfit || 0).toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[11px]">ROI</span>
                          <strong className="text-[#18221A]">{item.details.roiPercent}%</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Detailed Health Chart */}
      <CropHealthTrendChart
        history={history}
        language={language}
        onScanNewPlant={() => setActiveTab('disease')}
        onSeedSampleData={onSeedSampleData}
        isSeeding={isSeeding}
      />
    </div>
  );
};
