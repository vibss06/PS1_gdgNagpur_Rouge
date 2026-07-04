import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, HeartPulse } from 'lucide-react';
import { TRANSLATIONS } from '../utils/translations';
import type { Language } from '../utils/translations';

interface LoginProps {
  language: Language;
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ language, onSuccess }) => {
  const t = TRANSLATIONS[language];
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      if (name.trim().toLowerCase() === 'asha' && password === '1234') {
        sessionStorage.setItem('asha_authenticated', 'true');
        onSuccess();
      } else {
        setError(t.loginError);
      }
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center font-sans p-4">
      {/* Mobile-first Center Container */}
      <div className="w-full max-w-md bg-white min-h-[600px] flex flex-col justify-between rounded-3xl shadow-xl border border-slate-200/50 p-6 space-y-6 relative overflow-hidden">
        
        {/* Decorative Background Glows */}
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="flex-1 flex flex-col justify-center space-y-8 z-10">
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 border border-emerald-100/60 mx-auto shadow-sm">
              <HeartPulse className="w-9 h-9 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {t.loginTitle}
              </h2>
              <p className="text-xs text-slate-500 font-medium max-w-[240px] mx-auto mt-1 leading-relaxed">
                {t.loginSubtitle}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-semibold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                {t.username}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. asha"
                required
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                {t.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                required
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>{t.loginBtn}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Account Indicator Footer */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 text-center space-y-1 z-10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Demo Credentials</span>
          <div className="text-xs text-slate-600 font-medium flex items-center justify-center gap-3">
            <span>Name: <strong className="text-emerald-700">asha</strong></span>
            <span className="text-slate-300">|</span>
            <span>Password: <strong className="text-emerald-700">1234</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
};
export default Login;
