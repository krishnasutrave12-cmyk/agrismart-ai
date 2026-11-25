import React, { useState } from 'react';
import {
  Home,
  Leaf,
  Flower2,
  Bug,
  MessageSquare,
  CloudSun,
  FlaskConical,
  Sprout,
  IndianRupee,
  Calculator,
  Landmark,
  ClipboardList,
  Settings,
  Menu,
  X,
  LogOut,
  Globe,
} from 'lucide-react';
import { Language, strings } from '../translations';
import { FarmerUser } from '../types';
import { logout } from '../firebase';

export type DashboardPageId =
  | 'home'
  | 'disease'
  | 'flower'
  | 'pest'
  | 'chat'
  | 'weather'
  | 'soil'
  | 'crop'
  | 'mandi'
  | 'expense'
  | 'schemes'
  | 'history'
  | 'settings';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F8F5] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E7DF] rounded-2xl p-6 max-w-md w-full text-center">
            <Sprout className="w-10 h-10 text-[#1F6E43] mx-auto mb-3" />
            <h2 className="text-lg font-bold text-[#18221A] mb-2">Something went wrong</h2>
            <p className="text-sm text-[#526056] mb-5">
              Please reload Agri SmartAI to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] bg-[#1F6E43] hover:bg-[#185835] text-white font-semibold rounded-xl"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface DashboardLayoutProps {
  lang: Language;
  setLang: (l: Language) => void;
  activeTab: DashboardPageId;
  setActiveTab: (tab: DashboardPageId) => void;
  user: FarmerUser;
  onExitGuest: () => void;
  banner?: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  lang,
  setLang,
  activeTab,
  setActiveTab,
  user,
  onExitGuest,
  banner,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = strings[lang];

  const menuItems: { id: DashboardPageId; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'home', label: t.nav.home, icon: Home },
    { id: 'disease', label: t.nav.disease, icon: Leaf },
    { id: 'flower', label: t.nav.flower, icon: Flower2 },
    { id: 'pest', label: t.nav.pest, icon: Bug },
    { id: 'chat', label: t.nav.chat, icon: MessageSquare },
    { id: 'weather', label: t.nav.weather, icon: CloudSun },
    { id: 'soil', label: t.nav.soil, icon: FlaskConical },
    { id: 'crop', label: t.nav.crop, icon: Sprout },
    { id: 'mandi', label: t.nav.mandi, icon: IndianRupee },
    { id: 'expense', label: t.nav.expense, icon: Calculator },
    { id: 'schemes', label: t.nav.schemes, icon: Landmark },
    { id: 'history', label: t.nav.history, icon: ClipboardList },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  const handleSelect = (id: DashboardPageId) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    if (user.isGuest) {
      onExitGuest();
    } else {
      logout();
    }
  };

  const currentNavItem = menuItems.find((m) => m.id === activeTab);

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#18221A] flex flex-col">
      {/* Clean Top Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7DF]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-xl border border-[#E4E7DF] text-[#18221A] hover:bg-[#F7F8F5]"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelect('home')}
              className="flex items-center gap-2.5 shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-[#1F6E43] text-white flex items-center justify-center">
                <Sprout className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold text-[#18221A] block leading-tight">
                  {t.appName}
                </span>
                <span className="hidden sm:block text-xs text-[#526056] leading-tight">
                  {currentNavItem?.label}
                </span>
              </div>
            </button>
          </div>

          {/* Right Controls: Language Selector & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-[#F7F8F5] border border-[#E4E7DF] rounded-xl p-1">
              <Globe className="w-4 h-4 text-[#1F6E43] ml-1.5 hidden sm:block" />
              {(
                [
                  { code: 'en', label: 'EN' },
                  { code: 'hi', label: 'हिंदी' },
                  { code: 'mr', label: 'मराठी' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setLang(opt.code)}
                  className={`min-h-[34px] px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    lang === opt.code
                      ? 'bg-[#1F6E43] text-white'
                      : 'text-[#526056] hover:text-[#18221A]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="min-h-[40px] px-3 rounded-xl border border-[#E4E7DF] text-[#526056] hover:text-[#C53030] hover:bg-[#FEF2F2] text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
              title={t.common.logout}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">{t.common.logout}</span>
            </button>
          </div>
        </div>
      </header>

      {banner}

      {/* Mobile Slide-Down Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-30 bg-black/30" onClick={() => setMobileMenuOpen(false)}>
          <nav
            className="bg-white border-b border-[#E4E7DF] max-h-[80vh] overflow-y-auto p-3 grid grid-cols-2 gap-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            aria-label="Mobile menu"
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`min-h-[46px] px-3 py-2.5 rounded-xl text-left text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    isActive
                      ? 'bg-[#E9F5EE] text-[#1F6E43] border border-[#CBE6D6]'
                      : 'bg-[#F7F8F5] text-[#18221A] hover:bg-[#E9F5EE]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Workspace: Clean Left Sidebar on Desktop + Content Viewport */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex gap-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <nav
            className="sticky top-22 bg-white border border-[#E4E7DF] rounded-2xl p-3 space-y-1"
            aria-label="Dashboard navigation"
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-colors ${
                    isActive
                      ? 'bg-[#1F6E43] text-white'
                      : 'text-[#334137] hover:bg-[#E9F5EE] hover:text-[#1F6E43]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-[#E4E7DF] px-2">
              <p className="text-xs font-bold text-[#18221A] truncate">
                {user.displayName || t.common.guestFarmer}
              </p>
              <p className="text-xs text-[#526056] truncate">{user.email || ''}</p>
            </div>
          </nav>
        </aside>

        <main className="flex-1 min-w-0 pb-20 lg:pb-8">{children}</main>
      </div>

      {/* Compact Mobile Bottom Quick Bar (5 Core Destinations) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E4E7DF] pb-safe"
        aria-label="Quick mobile navigation"
      >
        <div className="grid grid-cols-5 h-16">
          {(
            [
              { id: 'home', label: t.nav.home, icon: Home },
              { id: 'disease', label: lang === 'mr' ? 'रोग तपासणी' : lang === 'hi' ? 'रोग जांच' : 'Disease', icon: Leaf },
              { id: 'chat', label: lang === 'mr' ? 'सहाय्यक' : lang === 'hi' ? 'सहायक' : 'Assistant', icon: MessageSquare },
              { id: 'weather', label: lang === 'mr' ? 'हवामान' : lang === 'hi' ? 'मौसम' : 'Weather', icon: CloudSun },
              { id: 'history', label: lang === 'mr' ? 'नोंदी' : lang === 'hi' ? 'रिकॉर्ड' : 'History', icon: ClipboardList },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  isActive ? 'text-[#1F6E43]' : 'text-[#526056]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate max-w-full px-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
