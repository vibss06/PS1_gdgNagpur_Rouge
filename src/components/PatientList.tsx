import React, { useState, useEffect } from 'react';
import { Search, Calendar, MapPin, Clock, FileText, ChevronLeft, ArrowRight, Activity } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { TRANSLATIONS } from '../utils/translations';
import type { Language } from '../utils/translations';
import { getStoredPatients, getStoredVisits } from '../utils/mockData';
import type { Patient, Visit } from '../types';

interface PatientListProps {
  language: Language;
}

export const PatientList: React.FC<PatientListProps> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientVisits, setPatientVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [visitsLoading, setVisitsLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      let localPatients = getStoredPatients();
      // Sort local patients by name ascending
      localPatients.sort((a, b) => a.name.localeCompare(b.name));
      setPatients(localPatients);

      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          setPatients(data);
          localStorage.setItem('asha_patients', JSON.stringify(data));
        }
      } catch (e) {
        console.log("Supabase fetch patients failed, using local storage:", e);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = async (patient: Patient) => {
    setSelectedPatient(patient);
    setVisitsLoading(true);
    try {
      const allLocalVisits = getStoredVisits();
      const localPatientVisits = allLocalVisits
        .filter(v => v.patient_id === patient.id)
        .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
      setPatientVisits(localPatientVisits);

      try {
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .eq('patient_id', patient.id)
          .order('visit_date', { ascending: false });

        if (!error && data && data.length > 0) {
          setPatientVisits(data);
        }
      } catch (e) {
        console.log("Supabase fetch patient visits failed, using local storage:", e);
      }
    } catch (err) {
      console.error('Error fetching patient visits:', err);
    } finally {
      setVisitsLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.condition_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getConditionLabel = (type: string) => {
    switch (type) {
      case 'pregnancy': return t.ancCheckup;
      case 'ncd_refill': return t.ncdRefill;
      case 'immunization': return t.immunization;
      default: return type;
    }
  };

  const getConditionColor = (type: string) => {
    switch (type) {
      case 'pregnancy': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'ncd_refill': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'immunization': return 'bg-purple-50 text-purple-700 border-purple-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="px-5 py-6 space-y-5 pb-24 animate-fadeIn">
      {!selectedPatient ? (
        <>
          {/* Main List Screen */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{t.patients}</h2>
            <p className="text-sm text-slate-500">{t.visitsListDesc}</p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm shadow-sm transition-all"
            />
          </div>

          {/* Patient Cards */}
          {loading ? (
            <div className="space-y-3 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredPatients.length > 0 ? (
            <div className="space-y-3">
              {filteredPatients.map(patient => (
                <div
                  key={patient.id}
                  onClick={() => handlePatientClick(patient)}
                  className="bg-white rounded-3xl p-4 border border-slate-100 shadow-soft hover:border-emerald-200/50 shadow-card-hover cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{patient.name}</h3>
                      <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{patient.locality}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getConditionColor(patient.condition_type)}`}>
                        {getConditionLabel(patient.condition_type)}
                      </span>
                    </div>
                  </div>

                  <div className="text-slate-400 hover:text-emerald-600 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft text-center py-12">
              <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">{t.noPatients}</p>
              <p className="text-xs text-slate-400">{t.noPatientsDesc}</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Patient Details / Timeline Screen */}
          <div className="space-y-5">
            <button
              onClick={() => setSelectedPatient(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/80 px-3 py-2 rounded-full transition-colors w-fit"
            >
              <ChevronLeft className="w-4 h-4" />
              {t.backBtn}
            </button>

            {/* Patient Header Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-soft space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.patientProfile}</span>
                <h2 className="text-2xl font-bold text-slate-800 mt-0.5">{selectedPatient.name}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-0.5">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.locality}</span>
                  <div className="flex items-center gap-1 text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{selectedPatient.locality}</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.condition}</span>
                  <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getConditionColor(selectedPatient.condition_type)}`}>
                    {getConditionLabel(selectedPatient.condition_type)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 text-lg">{t.visitHistory}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t.historyDesc}</p>
            </div>

            {/* Timeline */}
            {visitsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : patientVisits.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-100">
                {patientVisits.map((visit) => (
                  <div key={visit.id} className="relative group">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[21px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-all ${
                      visit.danger_flag ? 'bg-rose-500 ring-4 ring-rose-100' : 'bg-emerald-500 ring-4 ring-emerald-100'
                    }`} />

                    {/* Timeline Card */}
                    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-soft hover:border-slate-200/80 transition-all space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{visit.visit_date}</span>
                        </div>
                        {visit.danger_flag && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            Urgent Flag
                          </span>
                        )}
                      </div>

                      {/* Notes summary */}
                      <div className="space-y-1">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.addNoteTitle}</span>
                        <p className="text-sm text-slate-600 leading-relaxed font-normal">
                          {visit.notes || 'No description entered.'}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-50">
                        {visit.extracted_fields?.weeks_pregnant && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {visit.extracted_fields.weeks_pregnant} {t.weeksPregnant}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {t.nextDueDate}: {visit.next_due_date}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft text-center py-8">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">{t.noHistory}</p>
                <p className="text-xs text-slate-400">{t.noHistoryDesc}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
export default PatientList;
