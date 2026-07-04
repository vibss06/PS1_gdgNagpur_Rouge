import React, { useState, useEffect } from 'react';
import { MapPin, Users, HeartPulse, Map as MapIcon, ArrowLeft } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { TRANSLATIONS } from '../utils/translations';
import type { Language } from '../utils/translations';
import { getStoredPatients } from '../utils/mockData';
import type { Patient } from '../types';

interface MapViewProps {
  language: Language;
  highlightedLocality?: string | null;
  onLocalityClear?: () => void;
}

interface LocalityNode {
  name: string;
  x: number; // percentage from left
  y: number; // percentage from top
  color: string;
}

const LOCALITIES: LocalityNode[] = [
  { name: "Ramnagar", x: 25, y: 30, color: "bg-emerald-500" },
  { name: "Shantinagar", x: 75, y: 25, color: "bg-sky-500" },
  { name: "Hanuman Nagar", x: 50, y: 55, color: "bg-purple-500" },
  { name: "Ganga Layout", x: 20, y: 70, color: "bg-amber-500" },
  { name: "Hanuman Chowk", x: 80, y: 70, color: "bg-rose-500" },
];

export const MapView: React.FC<MapViewProps> = ({ language, highlightedLocality, onLocalityClear }) => {
  const t = TRANSLATIONS[language];
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedLocality, setSelectedLocality] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (highlightedLocality) {
      // Find matching locality name case-insensitively
      const match = LOCALITIES.find(l => 
        l.name.toLowerCase() === highlightedLocality.toLowerCase() || 
        highlightedLocality.toLowerCase().includes(l.name.toLowerCase()) ||
        l.name.toLowerCase().includes(highlightedLocality.toLowerCase())
      );
      if (match) {
        setSelectedLocality(match.name);
      } else {
        setSelectedLocality(highlightedLocality);
      }
    }
  }, [highlightedLocality]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      let localPatients = getStoredPatients();
      setPatients(localPatients);

      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*');
        if (!error && data && data.length > 0) {
          setPatients(data);
          localStorage.setItem('asha_patients', JSON.stringify(data));
        }
      } catch (e) {
        console.log("Supabase fetch failed, relying on local dataset:", e);
      }
    } catch (err) {
      console.error('Error fetching patients for map:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group patients by locality
  const getPatientsByLocality = (localityName: string) => {
    return patients.filter(p => {
      const loc = p.locality?.toLowerCase() || '';
      const query = localityName.toLowerCase();
      return loc.includes(query) || query.includes(loc);
    });
  };

  const getConditionColor = (type: string) => {
    switch (type) {
      case 'pregnancy': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'ncd_refill': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'immunization': return 'bg-purple-50 text-purple-700 border-purple-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getConditionLabel = (type: string) => {
    switch (type) {
      case 'pregnancy': return t.ancCheckup;
      case 'ncd_refill': return t.ncdRefill;
      case 'immunization': return t.immunization;
      default: return type;
    }
  };

  const filteredPatients = selectedLocality 
    ? getPatientsByLocality(selectedLocality) 
    : patients;

  return (
    <div className="px-5 py-6 space-y-6 pb-24 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-emerald-600" />
            <span>{t.mapLocateTitle}</span>
          </h2>
          <p className="text-sm text-slate-500">{t.mapLocateSubtitle}</p>
        </div>
      </div>

      {/* Visual Vector Village Map Card */}
      <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-3xl border border-slate-200/60 p-4 shadow-soft relative h-64 overflow-hidden select-none">
        
        {/* Map Grid Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />

        {/* Local Road lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20 stroke-slate-500 stroke-4 fill-none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 50 Q 150 70 200 130 T 400 140" />
          <path d="M 100 0 Q 120 120 220 180 T 320 260" />
          <path d="M 0 200 C 150 180, 250 220, 400 180" />
        </svg>

        {/* Map Pins */}
        {LOCALITIES.map((node) => {
          const locPatients = getPatientsByLocality(node.name);
          const activeCount = locPatients.length;
          const isSelected = selectedLocality === node.name;

          return (
            <button
              key={node.name}
              onClick={() => setSelectedLocality(isSelected ? null : node.name)}
              className="absolute group transition-transform duration-200 focus:outline-none"
              style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {/* Pulsar Glow */}
              {activeCount > 0 && (
                <div className={`absolute -inset-2 rounded-full animate-ping opacity-40 ${node.color}`} />
              )}

              {/* Pin body */}
              <div className={`relative flex items-center justify-center p-2 rounded-full shadow-lg border border-white transition-all ${
                isSelected ? `${node.color} text-white scale-125 z-20` : 'bg-white text-slate-700 hover:scale-110'
              }`}>
                <MapPin className="w-4 h-4" />
                
                {/* Badge count */}
                {activeCount > 0 && (
                  <span className={`absolute -top-2 -right-2 text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white text-white ${
                    isSelected ? 'bg-slate-800' : 'bg-rose-500'
                  }`}>
                    {activeCount}
                  </span>
                )}
              </div>

              {/* Tooltip Label */}
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[9px] font-semibold rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:visible transition-opacity ${
                isSelected ? 'opacity-100 visible scale-110 z-20 bg-emerald-600' : 'invisible'
              }`}>
                {node.name}
              </div>
            </button>
          );
        })}

        {/* Compass rose */}
        <div className="absolute bottom-3 right-3 w-10 h-10 border border-slate-300 rounded-full flex items-center justify-center bg-white/60 text-slate-400 text-[10px] font-bold">
          N ↑
        </div>
      </div>

      {/* Localities List / Patient Filter Title */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700">
            <Users className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-800">
              {selectedLocality 
                ? `${t.filterLocality} ${selectedLocality}` 
                : `${t.activePatients} (${patients.length})`
              }
            </h3>
          </div>
          {selectedLocality && (
            <button
              onClick={() => {
                setSelectedLocality(null);
                if (onLocalityClear) onLocalityClear();
              }}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          )}
        </div>

        {/* Filtered Patient List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="grid gap-3">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white p-4.5 rounded-3xl border border-slate-100 shadow-soft hover:border-slate-200/80 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-sm leading-snug">{patient.name}</h4>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-300" />
                      <span>{patient.locality}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getConditionColor(patient.condition_type)}`}>
                    {getConditionLabel(patient.condition_type)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-soft text-center py-12">
            <HeartPulse className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">No active patients registered here</p>
          </div>
        )}
      </div>

    </div>
  );
};
export default MapView;
