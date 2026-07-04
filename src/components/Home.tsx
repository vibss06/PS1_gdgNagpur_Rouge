import React, { useState, useEffect } from 'react';
import { Plus, MapPin, ChevronDown, ChevronUp, Calendar, HeartPulse, RefreshCw } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { calculateRiskScore } from '../utils/rules';
import { TRANSLATIONS } from '../utils/translations';
import type { Language } from '../utils/translations';
import type { Patient, Visit, RiskResult } from '../types';

interface HomeProps {
  onAddNoteClick: () => void;
  language: Language;
}

interface PatientRiskInfo {
  patient: Patient;
  latestVisit: Visit | null;
  daysOverdue: number;
  risk: RiskResult;
}

export const Home: React.FC<HomeProps> = ({ onAddNoteClick, language }) => {
  const t = TRANSLATIONS[language];
  const [patientRisks, setPatientRisks] = useState<PatientRiskInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch patients
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*');
      if (patientsError) throw patientsError;

      // 2. Fetch visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .order('visit_date', { ascending: false });
      if (visitsError) throw visitsError;

      const patients: Patient[] = patientsData || [];
      const visits: Visit[] = visitsData || [];

      // 3. Map patients to their latest visit and calculate risk
      const risks: PatientRiskInfo[] = patients.map(p => {
        // Find latest visit for this patient
        const patientVisits = visits.filter(v => v.patient_id === p.id);
        const latestVisit = patientVisits.length > 0 ? patientVisits[0] : null;

        let nextDueDateStr = p.created_at.split('T')[0]; // fallback
        let hasDangerFlag = false;

        if (latestVisit) {
          nextDueDateStr = latestVisit.next_due_date;
          hasDangerFlag = latestVisit.danger_flag;
        }

        // Calculate days overdue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(nextDueDateStr);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Calculate risk
        const risk = calculateRiskScore(nextDueDateStr, p.condition_type, hasDangerFlag);

        return {
          patient: p,
          latestVisit,
          daysOverdue,
          risk,
        };
      });

      // 4. Sort risks descending by risk score
      risks.sort((a, b) => b.risk.score - a.risk.score);
      setPatientRisks(risks);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTodayDateString = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('en-IN', options);
  };

  const toggleExpand = (patientId: string) => {
    setExpandedPatientId(prev => (prev === patientId ? null : patientId));
  };

  const getRiskBadgeStyles = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
  };

  const getReasonString = (info: PatientRiskInfo) => {
    const condition = info.patient.condition_type === 'pregnancy' ? t.ancCheckup :
                      info.patient.condition_type === 'ncd_refill' ? t.ncdRefill : t.immunization;

    if (info.daysOverdue > 0) {
      return `${condition} — ${info.daysOverdue} ${t.overdue(info.daysOverdue)}`;
    } else if (info.daysOverdue === 0) {
      return `${condition} — ${t.dueToday}`;
    } else {
      return `${condition} — ${t.dueIn(Math.abs(info.daysOverdue))}`;
    }
  };

  return (
    <div className="px-5 py-6 space-y-6 pb-24 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-slate-800 tracking-tight leading-none">
            {t.namaste}, Anjali 👋
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {getTodayDateString()}
          </p>
        </div>
        
        {/* Refresh button */}
        <button
          onClick={fetchDashboardData}
          className="p-2.5 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-emerald-700 shadow-soft hover:bg-emerald-50/50 transition-colors"
          title="Refresh Dashboard"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Quick Insights Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-3xl p-5 shadow-lg shadow-emerald-700/10 space-y-3">
        <h2 className="text-lg font-bold">{t.priorityTitle}</h2>
        <p className="text-sm text-emerald-50/90 leading-relaxed font-light">
          {t.priorityDesc(
            patientRisks.filter(r => r.daysOverdue >= 0).length,
            patientRisks.filter(r => r.risk.level === 'high').length
          )}
        </p>
      </div>

      {/* Section Title */}
      <div>
        <h3 className="font-bold text-slate-800 text-lg">{t.visitsList}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{t.visitsListDesc}</p>
      </div>

      {/* Patient Cards List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : patientRisks.length > 0 ? (
        <div className="space-y-4">
          {patientRisks.map(({ patient, latestVisit, risk, daysOverdue }) => {
            const isExpanded = expandedPatientId === patient.id;
            const badgeStyles = getRiskBadgeStyles(risk.level);
            
            return (
              <div
                key={patient.id}
                className={`bg-white rounded-3xl border transition-all shadow-soft overflow-hidden ${
                  isExpanded ? 'border-emerald-500/30 shadow-md ring-2 ring-emerald-500/5' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                {/* Main Card Area */}
                <div
                  onClick={() => toggleExpand(patient.id)}
                  className="p-5 flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-3 flex-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-800 text-base leading-snug">
                          {patient.name}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeStyles}`}>
                          {risk.level}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{patient.locality}</span>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-slate-600 leading-snug">
                      {getReasonString({ patient, latestVisit, daysOverdue, risk })}
                    </p>
                  </div>

                  <div className="text-slate-400 hover:text-slate-600 self-center">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Expanded Trace Reasoning */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-50 bg-slate-50/50 space-y-4 animate-slideDown">
                    
                    {/* Diagnostic Trace Details */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        AI Reasoning & Score breakdown
                      </span>
                      <ul className="space-y-1.5">
                        {risk.reasoning.map((reason, rIdx) => (
                          <li key={rIdx} className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 font-medium">
                        Total Risk Score: <span className="font-extrabold text-slate-700">{risk.score} pts</span>
                      </span>
                      {latestVisit && (
                        <span className="text-slate-400 font-medium">
                          Last Checked: <span className="font-semibold text-slate-600">{latestVisit.visit_date}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft text-center py-16">
          <HeartPulse className="w-12 h-12 text-emerald-100 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700">{t.noVisits}</h4>
          <p className="text-xs text-slate-400 max-w-[200px] mx-auto mt-1">
            {t.noVisitsDesc}
          </p>
        </div>
      )}

      {/* Floating Add Visit Note Button */}
      <button
        onClick={onAddNoteClick}
        className="fixed bottom-6 right-6 p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/40 transform active:scale-95 transition-all z-40 flex items-center justify-center gap-1.5"
        title={t.addNoteTitle}
      >
        <Plus className="w-6 h-6" />
        <span className="text-sm font-bold pr-2">{t.addNoteBtn}</span>
      </button>

    </div>
  );
};
export default Home;
