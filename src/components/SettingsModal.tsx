import React, { useState } from 'react';
import { X, Settings, Key, Bot, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState<'local' | 'openai' | 'gemini'>(() => {
    return (localStorage.getItem('asha_llm_provider') as 'local' | 'openai' | 'gemini') || 'local';
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('asha_llm_api_key') || '';
  });
  const [groqApiKey, setGroqApiKey] = useState(() => {
    return localStorage.getItem('asha_groq_api_key') || '';
  });
  const [showSavedToast, setShowSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('asha_llm_provider', provider);
    localStorage.setItem('asha_llm_api_key', apiKey);
    localStorage.setItem('asha_groq_api_key', groqApiKey);
    
    // Show temporary success toast
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-3xl border border-emerald-50">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-emerald-50/50 border-b border-emerald-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100/80 rounded-xl text-emerald-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg leading-tight">Settings</h3>
              <p className="text-xs text-emerald-700/80">Configure AI Assist & Keys</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          {/* Provider Selection */}
          <div className="space-y-2.5">
            <label className="block text-sm font-medium text-slate-700">
              AI Engine Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setProvider('local')}
                className={`py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  provider === 'local'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-100'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-semibold">Local (Rule)</span>
              </button>
              <button
                type="button"
                onClick={() => setProvider('openai')}
                className={`py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  provider === 'openai'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-100'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Bot className="w-5 h-5" />
                <span className="text-xs font-semibold">OpenAI API</span>
              </button>
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  provider === 'gemini'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-100'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Key className="w-5 h-5" />
                <span className="text-xs font-semibold">Gemini API</span>
              </button>
            </div>
          </div>

          {/* API Key Input */}
          {provider !== 'local' && (
            <div className="space-y-2.5 animate-slideDown">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  {provider === 'openai' ? 'OpenAI API Key' : 'Gemini API Key'}
                </label>
                <a 
                  href={provider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://aistudio.google.com/app/apikey'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-emerald-600 hover:underline"
                >
                  Get key ↗
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === 'openai' ? 'sk-...' : 'AIzaSy...'}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition-all"
                />
              </div>
              <p className="text-xs text-slate-400">
                Your API key is saved locally in your browser. It is only used to query the model and is never stored on a server.
              </p>
            </div>
          )}
          {provider === 'local' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 animate-fadeIn">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Features</span>
              <p className="text-sm text-slate-600 leading-relaxed">
                The **Local Smart Rule Parser** works instantly and parses pregnancy details, symptoms, next visit schedules, and danger flags using client-side heuristics. No API keys required!
              </p>
            </div>
          )}

          {/* Groq Whisper API Key for Speech-to-Text */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Groq API Key (Whisper Voice-to-Text)
              </label>
              <a 
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-emerald-600 hover:underline"
              >
                Get key ↗
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm transition-all"
              />
            </div>
            <p className="text-xs text-slate-400">
              Required for the microphone voice checkup transcription. If not set, it will default to a demo mode fallback.
            </p>
          </div>

          {/* Footer Save Button */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 text-center font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-600/10 transition-colors text-sm"
            >
              Save Settings
            </button>
          </div>
        </form>

        {/* Success Toast */}
        {showSavedToast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-full shadow-xl flex items-center gap-2 animate-bounce">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Settings saved successfully!
          </div>
        )}
      </div>
    </div>
  );
};
export default SettingsModal;
