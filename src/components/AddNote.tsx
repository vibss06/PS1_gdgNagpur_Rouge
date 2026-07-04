import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Check, Loader2, AlertCircle, Calendar, User, Info, Smartphone, Camera, ImagePlus, X } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { extractVisitNote } from '../utils/llmService';
import { transcribeAudio } from '../utils/transcribeService';
import { TRANSLATIONS } from '../utils/translations';
import type { Language } from '../utils/translations';
import type { Patient, ExtractedNote } from '../types';

interface AddNoteProps {
  onSuccess: () => void;
  onCancel: () => void;
  language: Language;
}

const MOCK_TRANSCRIPTIONS = [
  "Sunita Devi is 8 months pregnant, she complains of swelling in her legs and a mild headache.",
  "Rajesh Kumar came today for diabetes medicines. Blood sugar is stable, 130. Refilled Metformin for 30 days.",
  "Priya Sharma brought baby Aarav, 3 months old, for pentavalent vaccine dose. Baby is healthy.",
  "Meena Patel, 6 months pregnant. Regular checkup. No danger signs, blood pressure is normal.",
  "Ramesh Singh, NCD refill. High blood pressure 160/100, complaining of severe headache."
];

export const AddNote: React.FC<AddNoteProps> = ({ onSuccess, onCancel, language }) => {
  const t = TRANSLATIONS[language];
  const [noteText, setNoteText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<ExtractedNote> | null>(null);
  
  // Follow-up question state
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState('');

  // Image Upload states
  const [verificationImage, setVerificationImage] = useState<string | null>(null);
  const [symptomImage, setSymptomImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'verification' | 'symptom') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === 'verification') {
          setVerificationImage(base64String);
        } else {
          setSymptomImage(base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [whatsappMock, setWhatsappMock] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase.from('patients').select('*');
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const appendTemplateText = (textToAppend: string) => {
    setNoteText(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return textToAppend;
      if (trimmed.endsWith(',') || trimmed.endsWith('.')) {
        return `${trimmed} ${textToAppend}`;
      }
      return `${trimmed}, ${textToAppend}`;
    });
  };

  // Real voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks to release the mic
        stream.getTracks().forEach(track => track.stop());

        setIsTranscribing(true);
        try {
          const groqKey = localStorage.getItem('asha_groq_api_key') || localStorage.getItem('asha_llm_api_key');
          const transcription = await transcribeAudio(audioBlob, groqKey);
          setNoteText(transcription);
        } catch (err) {
          console.error("Transcription failed:", err);
          alert("Could not transcribe audio. Please make sure your microphone is enabled, or type your note manually.");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access denied. Please ensure you have granted permission to use the microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Mock speech-to-text typing animation for simulation
  const handleSimulationType = () => {
    if (isListening) return;
    
    setIsListening(true);
    setNoteText('');
    
    const randomNote = MOCK_TRANSCRIPTIONS[Math.floor(Math.random() * MOCK_TRANSCRIPTIONS.length)];
    let currentIdx = 0;
    
    const typingInterval = setInterval(() => {
      if (currentIdx < randomNote.length) {
        setNoteText(prev => prev + randomNote.charAt(currentIdx));
        currentIdx++;
      } else {
        clearInterval(typingInterval);
        setIsListening(false);
      }
    }, 45);
  };

  const handleExtract = async () => {
    if (!noteText.trim()) return;
    
    setIsLoading(true);
    setExtractedData(null);
    setShowFollowUp(false);
    setFollowUpAnswer('');

    const apiKey = localStorage.getItem('asha_llm_api_key');
    const provider = (localStorage.getItem('asha_llm_provider') as 'local' | 'openai' | 'gemini') || 'local';

    // Extract fields via LLM or Local Smart Parser
    const result = await extractVisitNote(noteText, patients, apiKey, provider);
    setExtractedData(result);
    setIsLoading(false);

    // Simulate missing field check: if it's pregnancy but weeks/months are not found
    if (result.visit_type === 'pregnancy' && !result.weeks_pregnant) {
      setShowFollowUp(true);
    }
  };

  // If follow-up is answered, recalculate due date and next visit details
  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weeks = parseInt(followUpAnswer, 10);
    if (!isNaN(weeks) && extractedData) {
      const updated = {
        ...extractedData,
        weeks_pregnant: weeks,
        condition: `ANC Checkup (${weeks} weeks pregnant)`,
      };
      setExtractedData(updated);
      setShowFollowUp(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!extractedData) return;

    setIsLoading(true);
    try {
      let patientId = '';
      
      // 1. Find if patient exists, otherwise create
      const matchName = extractedData.name || 'Unknown Patient';
      const existing = patients.find(p => 
        p.name.toLowerCase().includes(matchName.toLowerCase()) || 
        matchName.toLowerCase().includes(p.name.toLowerCase())
      );

      if (existing) {
        patientId = existing.id;
      } else {
        // Create new patient
        const { data, error } = await supabase
          .from('patients')
          .insert([
            {
              name: matchName,
              locality: 'General Ward', // fallback
              condition_type: extractedData.visit_type || 'pregnancy',
            }
          ])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          patientId = data[0].id;
        }
      }

      // 2. Insert visit
      const today = new Date().toISOString().split('T')[0];
      const { error: visitError } = await supabase
        .from('visits')
        .insert([
          {
            patient_id: patientId,
            visit_date: today,
            visit_type: extractedData.visit_type,
            notes: noteText,
            extracted_fields: {
              weeks_pregnant: extractedData.weeks_pregnant,
              condition: extractedData.condition,
              verification_image: verificationImage,
              symptom_image: symptomImage,
            },
            confidence: extractedData.confidence || 0.90,
            next_due_date: extractedData.next_due_date,
            danger_flag: extractedData.danger_flag || false,
          }
        ]);

      if (visitError) throw visitError;

      // Show success states
      setIsLoading(false);
      setSaveSuccess(true);
      
      // Mock sending WhatsApp message to the family
      setTimeout(() => {
        setWhatsappMock(true);
      }, 1000);

      // Return home after 3 seconds
      setTimeout(() => {
        onSuccess();
      }, 3500);

    } catch (err) {
      console.error('Error saving visit:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="px-5 py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t.addNoteTitle}</h2>
          <p className="text-sm text-slate-500">{t.addNoteSubtitle}</p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-full transition-colors"
        >
          {t.backBtn}
        </button>
      </div>

      {/* Main input card */}
      {!extractedData && !saveSuccess && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-soft space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              {t.tellAsha}
            </label>
            
            {/* Hoverable & Clickable Parameter Chips */}
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t.tapParameters}
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {/* Name Chip */}
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      const names = ["Sunita Devi", "Rajesh Kumar", "Priya Sharma", "Meena Patel", "Ramesh Singh"];
                      const randomName = names[Math.floor(Math.random() * names.length)];
                      appendTemplateText(randomName);
                    }}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/60 rounded-full text-xs font-semibold transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span>{t.paramName}</span>
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 leading-relaxed text-center">
                    Tap to add a patient name.
                    <span className="block text-[9px] text-emerald-300 font-semibold mt-0.5">Example: "Sunita Devi"</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                  </div>
                </div>

                {/* Visit Type Chip */}
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      const types = ["ANC checkup", "NCD checkup & medicine refill", "immunization visit"];
                      const randomType = types[Math.floor(Math.random() * types.length)];
                      appendTemplateText(randomType);
                    }}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/60 rounded-full text-xs font-semibold transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span>{t.paramVisitType}</span>
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 leading-relaxed text-center">
                    Tap to add checkup category.
                    <span className="block text-[9px] text-emerald-300 font-semibold mt-0.5">Example: "ANC checkup"</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                  </div>
                </div>

                {/* Weeks/Months Chip */}
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      const stages = ["7 months pregnant", "28 weeks pregnant", "32 weeks pregnant"];
                      const randomStage = stages[Math.floor(Math.random() * stages.length)];
                      appendTemplateText(randomStage);
                    }}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/60 rounded-full text-xs font-semibold transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span>{t.paramGestation}</span>
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 leading-relaxed text-center">
                    Tap to add pregnancy stage.
                    <span className="block text-[9px] text-emerald-300 font-semibold mt-0.5">Example: "7 months pregnant"</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                  </div>
                </div>

                {/* Symptoms Chip */}
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      const symptoms = ["complained of swelling in feet", "blood pressure is 140/90", "has mild fever", "normal checkup no signs"];
                      const randomSymptom = symptoms[Math.floor(Math.random() * symptoms.length)];
                      appendTemplateText(randomSymptom);
                    }}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/60 rounded-full text-xs font-semibold transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span>{t.paramSymptoms}</span>
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 leading-relaxed text-center">
                    Tap to add a symptom.
                    <span className="block text-[9px] text-emerald-300 font-semibold mt-0.5">Example: "leg swelling"</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Sunita Devi, 7 months pregnant, complained of leg swelling today..."
              className="w-full min-h-[160px] p-4 bg-slate-50/70 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-base leading-relaxed transition-all placeholder:text-slate-400"
              disabled={isListening || isRecording || isTranscribing}
            />
            {isListening && (
              <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px] rounded-2xl flex flex-col items-center justify-center space-y-3 animate-fadeIn">
                <div className="relative">
                  <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white animate-mic-pulse">
                    <Mic className="w-6 h-6 animate-bounce" />
                  </div>
                </div>
                <p className="text-sm font-bold text-red-500 tracking-wide uppercase">{t.listening}</p>
                <p className="text-xs text-slate-400 max-w-[220px] text-center">{t.listeningDesc}</p>
              </div>
            )}

            {isRecording && (
              <div 
                onClick={stopRecording}
                className="absolute inset-0 bg-red-50/90 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center space-y-3 animate-fadeIn cursor-pointer border-2 border-red-500/20"
              >
                <div className="relative">
                  <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white animate-mic-pulse">
                    <Mic className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm font-bold text-red-600 tracking-wide uppercase">{t.recording}</p>
                <p className="text-xs text-red-500 font-medium max-w-[220px] text-center animate-pulse">{t.recordingDesc}</p>
              </div>
            )}

            {isTranscribing && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] rounded-2xl flex flex-col items-center justify-center space-y-3 animate-fadeIn">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                <p className="text-sm font-bold text-slate-700 tracking-wide uppercase">{t.transcribing}</p>
                <p className="text-xs text-slate-400 max-w-[220px] text-center">{t.transcribingDesc}</p>
              </div>
            )}
          </div>

          {/* Photo Verification and Symptom Recording Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100/80">
            <span className="block text-xs font-semibold text-slate-700">
              {language === 'en' ? 'Photos Verification & Symptoms (Optional)' : 'फोटो सत्यापन और लक्षण विवरण (वैकल्पिक)'}
            </span>
            <div className="grid grid-cols-2 gap-3">
              {/* Verification Photo Input */}
              <div className="relative border-2 border-dashed border-slate-200 hover:border-emerald-500/50 bg-slate-50/50 hover:bg-emerald-50/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[110px] overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'verification')}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {verificationImage ? (
                  <div className="absolute inset-0 z-20 bg-white">
                    <img src={verificationImage} alt="Verification" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVerificationImage(null);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow-md z-30"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 w-fit mx-auto">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="block text-[10px] font-bold text-slate-700">{t.verificationPhoto}</span>
                    <span className="block text-[8px] text-slate-400">{t.photoUploadDesc}</span>
                  </div>
                )}
              </div>

              {/* Symptom Photo Input */}
              <div className="relative border-2 border-dashed border-slate-200 hover:border-emerald-500/50 bg-slate-50/50 hover:bg-emerald-50/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[110px] overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'symptom')}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {symptomImage ? (
                  <div className="absolute inset-0 z-20 bg-white">
                    <img src={symptomImage} alt="Symptom" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSymptomImage(null);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow-md z-30"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="p-2 bg-sky-50 rounded-xl text-sky-600 w-fit mx-auto">
                      <ImagePlus className="w-5 h-5" />
                    </div>
                    <span className="block text-[10px] font-bold text-slate-700">{t.symptomPhoto}</span>
                    <span className="block text-[8px] text-slate-400">{t.photoUploadDesc}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Real Mic button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isListening || isTranscribing}
              className={`p-4 rounded-2xl transition-all shadow-md flex items-center justify-center border ${
                isRecording 
                  ? 'bg-red-500 border-red-600 text-white shadow-red-500/10' 
                  : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/80'
              } disabled:opacity-50`}
              title={isRecording ? "Stop Recording" : "Record Real Voice with Whisper"}
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* Simulation button */}
            <button
              type="button"
              onClick={handleSimulationType}
              disabled={isListening || isRecording || isTranscribing}
              className="py-4 px-3 bg-slate-100 hover:bg-slate-200/80 disabled:opacity-50 text-slate-600 hover:text-slate-800 font-bold rounded-2xl border border-slate-200/50 flex items-center justify-center gap-1.5 transition-all text-xs"
              title="Auto-type an example note for testing"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{language === 'en' ? 'Simulate' : 'मॉक नोट'}</span>
            </button>

            {/* Extract button */}
            <button
              type="button"
              onClick={handleExtract}
              disabled={!noteText.trim() || isLoading || isRecording || isTranscribing || isListening}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 disabled:shadow-none flex items-center justify-center gap-1.5 transition-all text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>{t.extracting}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5" />
                  <span>{t.extractBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Loading Animation during analysis */}
      {isLoading && !extractedData && (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft flex flex-col items-center justify-center space-y-4 animate-fadeIn">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
          <h3 className="font-semibold text-slate-800">{t.appTitle} {t.extracting}</h3>
          <p className="text-xs text-slate-400 max-w-xs text-center">{language === 'en' ? 'Identifying patient details...' : 'मरीज की जानकारी का विश्लेषण हो रहा है...'}</p>
        </div>
      )}

      {/* Extracted fields review card */}
      {extractedData && !saveSuccess && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Missing Field Inline Question */}
          {showFollowUp && (
            <div className="p-5 bg-amber-50/70 border border-amber-100 rounded-3xl space-y-3 animate-slideDown shadow-soft">
              <div className="flex gap-2.5 text-amber-800">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">{t.missingDetails}</h4>
                  <p className="text-xs text-amber-700/95 mt-0.5">{t.howManyWeeks}</p>
                </div>
              </div>
              <form onSubmit={handleFollowUpSubmit} className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="42"
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  placeholder="e.g. 28"
                  required
                  className="flex-1 px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  {t.applyBtn}
                </button>
              </form>
            </div>
          )}

          {/* Structured Confirmation Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-soft overflow-hidden">
            <div className="px-5 py-4 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">{t.aiSummary}</span>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded-full">
                {Math.round((extractedData.confidence || 0.90) * 100)}% {t.confidenceMatch}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Patient details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5 border border-slate-100">
                  <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.patientName}</span>
                    <span className="text-sm font-semibold text-slate-700">{extractedData.name || (language === 'en' ? 'Not detected' : 'नहीं मिला')}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5 border border-slate-100">
                  <div className="p-1.5 bg-sky-100 rounded-lg text-sky-700">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.condition}</span>
                    <span className="text-sm font-semibold text-slate-700 truncate max-w-[120px]" title={extractedData.condition}>
                      {extractedData.condition || (language === 'en' ? 'ANC Checkup' : 'गर्भावस्था जांच')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5 border border-slate-100">
                  <div className="p-1.5 bg-purple-100 rounded-lg text-purple-700">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.nextDueDate}</span>
                    <span className="text-sm font-semibold text-slate-700">{extractedData.next_due_date}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2.5 border border-slate-100">
                  <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.urgencyFlag}</span>
                    <span className={`text-sm font-bold ${extractedData.danger_flag ? 'text-rose-500' : 'text-slate-500'}`}>
                      {extractedData.danger_flag ? t.urgencyHigh : t.urgencyNormal}
                    </span>
                  </div>
                </div>
              </div>

              {/* Photo Verification & Symptom Preview in Summary */}
              {(verificationImage || symptomImage) && (
                <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-50">
                  {verificationImage && (
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.photoVerificationTitle}</span>
                      <div className="w-full h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative group bg-slate-50">
                        <img src={verificationImage} alt="Verification" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                  {symptomImage && (
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.photoSymptomTitle}</span>
                      <div className="w-full h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative group bg-slate-50">
                        <img src={symptomImage} alt="Symptom" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Original text block */}
              <div className="space-y-1.5 pt-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'en' ? 'Transcribed Note:' : 'विवरण नोट:'}</span>
                <p className="text-xs text-slate-500 italic bg-slate-50/70 p-3 rounded-2xl border border-slate-100/50 leading-relaxed">
                  "{noteText}"
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setExtractedData(null)}
                  className="flex-1 py-3 text-center font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-colors text-sm"
                >
                  {t.editNoteBtn}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 text-sm"
                >
                  <Check className="w-4 h-4" />
                  {t.confirmSaveBtn}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Success Screens */}
      {saveSuccess && (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft text-center space-y-6 animate-fadeIn py-12">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-800">{t.saveSuccess}</h3>
            <p className="text-sm text-slate-400">{t.saveSuccessDesc}</p>
          </div>

          {/* WhatsApp Toast */}
          {whatsappMock && (
            <div className="bg-sky-50 border border-sky-100 p-4 rounded-2xl max-w-xs mx-auto flex items-center gap-3 text-left animate-slideDown shadow-soft">
              <div className="p-2 bg-sky-500 text-white rounded-xl">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-sky-800">{t.whatsappAlert}</h4>
                <p className="text-[10px] text-sky-600 mt-0.5">{t.whatsappAlertDesc(extractedData?.next_due_date || '')}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t.returningHome}
          </div>
        </div>
      )}
    </div>
  );
};
export default AddNote;
