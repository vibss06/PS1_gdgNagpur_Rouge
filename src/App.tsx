import { useState } from 'react';
import { HeartPulse, Users, PlusCircle, Settings, ClipboardList, Map } from 'lucide-react';
import Home from './components/Home';
import PatientList from './components/PatientList';
import AddNote from './components/AddNote';
import MapView from './components/MapView';
import SettingsModal from './components/SettingsModal';
import Login from './components/Login';
import { TRANSLATIONS } from './utils/translations';
import type { Language } from './utils/translations';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('asha_authenticated') === 'true';
  });
  const [activeTab, setActiveTab] = useState<'today' | 'patients' | 'add_note' | 'map'>('today');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('asha_language') as Language) || 'en';
  });

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'hi' : 'en';
    setLanguage(nextLang);
    localStorage.setItem('asha_language', nextLang);
  };

  const t = TRANSLATIONS[language];

  if (!isAuthenticated) {
    return <Login language={language} onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Mobile-first Center Container */}
      <div className="w-full max-w-md mx-auto bg-slate-50 min-h-screen flex flex-col shadow-xl relative overflow-x-hidden border-x border-slate-200/50">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100/50">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-base font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                {t.appTitle}
              </span>
              <span className="block text-[8px] text-emerald-600 font-bold uppercase tracking-widest leading-none">
                {t.appSubtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100/60 rounded-xl transition-all active:scale-95 flex items-center gap-1 shadow-sm"
              title={language === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
            >
              <span>🌐</span>
              <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-100"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'today' && (
            <Home onAddNoteClick={() => setActiveTab('add_note')} language={language} />
          )}
          {activeTab === 'patients' && (
            <PatientList language={language} />
          )}
          {activeTab === 'map' && (
            <MapView language={language} />
          )}
          {activeTab === 'add_note' && (
            <AddNote 
              onSuccess={() => setActiveTab('today')}
              onCancel={() => setActiveTab('today')}
              language={language}
            />
          )}
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-100 px-4 py-3 flex items-center justify-around z-40 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.04)]">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'today' 
                ? 'text-emerald-600 scale-105 font-semibold' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ClipboardList className="w-5.5 h-5.5" />
            <span className="text-[10px]">{t.today}</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'map' 
                ? 'text-emerald-600 scale-105 font-semibold' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Map className="w-5.5 h-5.5" />
            <span className="text-[10px]">{t.mapTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('add_note')}
            className={`flex flex-col items-center gap-1 transition-all -translate-y-4 ${
              activeTab === 'add_note'
                ? 'text-emerald-700 scale-110'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-4 rounded-full shadow-lg transition-all ${
              activeTab === 'add_note'
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-white border border-slate-100 text-emerald-600 shadow-slate-200/50'
            }`}>
              <PlusCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] -mt-2">{t.record}</span>
          </button>

          <button
            onClick={() => setActiveTab('patients')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'patients' 
                ? 'text-emerald-600 scale-105 font-semibold' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-5.5 h-5.5" />
            <span className="text-[10px]">{t.patients}</span>
          </button>
        </nav>

        {/* Settings Modal */}
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />

      </div>
    </div>
  );
}

export default App;
