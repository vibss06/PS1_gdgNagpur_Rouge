import type { Patient, Visit } from '../types';

export const DEMO_PATIENTS: Patient[] = [
  {
    id: "p1",
    name: "Sunita Devi",
    locality: "Ramnagar",
    condition_type: "pregnancy",
    created_at: "2026-06-01"
  },
  {
    id: "p2",
    name: "Rajesh Kumar",
    locality: "Hanuman Nagar",
    condition_type: "ncd_refill",
    created_at: "2026-06-01"
  },
  {
    id: "p3",
    name: "Priya Sharma",
    locality: "Ganga Layout",
    condition_type: "immunization",
    created_at: "2026-06-02"
  },
  {
    id: "p4",
    name: "Meena Patel",
    locality: "Shantinagar",
    condition_type: "pregnancy",
    created_at: "2026-06-02"
  },
  {
    id: "p5",
    name: "Ramesh Singh",
    locality: "Hanuman Chowk",
    condition_type: "ncd_refill",
    created_at: "2026-06-03"
  },
  {
    id: "p6",
    name: "Kavita Bai",
    locality: "Ramnagar",
    condition_type: "immunization",
    created_at: "2026-06-03"
  }
];

export const DEMO_VISITS: Visit[] = [
  {
    id: "v1",
    patient_id: "p1",
    visit_date: "2026-06-15",
    visit_type: "ANC checkup",
    notes: "Complained of mild morning sickness. Blood pressure normal. Advised iron tablets and proper rest.",
    extracted_fields: {
      weeks_pregnant: 24,
      gestation_weeks: 24,
      condition: "pregnancy"
    },
    confidence: 0.95,
    next_due_date: "2026-07-13",
    danger_flag: false
  },
  {
    id: "v2",
    patient_id: "p2",
    visit_date: "2026-06-10",
    visit_type: "NCD refill",
    notes: "Blood sugar checked: 140 mg/dl. Hypertension monitored: 130/85. Metformin and Amlodipine refilled for 30 days.",
    extracted_fields: {
      blood_sugar: "140",
      blood_pressure: "130/85",
      condition: "ncd_refill"
    },
    confidence: 0.92,
    next_due_date: "2026-07-10",
    danger_flag: false
  },
  {
    id: "v3",
    patient_id: "p3",
    visit_date: "2026-06-12",
    visit_type: "Immunization checkup",
    notes: "Baby Aarav, 3 months old, given Pentavalent 2nd dose and OPV 2nd dose. No fever reported.",
    extracted_fields: {
      vaccines: ["Pentavalent 2", "OPV 2"],
      condition: "immunization"
    },
    confidence: 0.94,
    next_due_date: "2026-07-12",
    danger_flag: false
  }
];

// Helper functions for local storage operations
export function getStoredPatients(): Patient[] {
  const local = localStorage.getItem('asha_patients');
  if (!local) {
    localStorage.setItem('asha_patients', JSON.stringify(DEMO_PATIENTS));
    return DEMO_PATIENTS;
  }
  try {
    return JSON.parse(local);
  } catch (e) {
    return DEMO_PATIENTS;
  }
}

export function saveStoredPatient(patient: Patient): Patient[] {
  const list = getStoredPatients();
  // Check if already exists
  if (!list.some(p => p.id === patient.id || p.name.toLowerCase() === patient.name.toLowerCase())) {
    list.push(patient);
    localStorage.setItem('asha_patients', JSON.stringify(list));
  }
  return list;
}

export function getStoredVisits(): Visit[] {
  const local = localStorage.getItem('asha_visits');
  if (!local) {
    localStorage.setItem('asha_visits', JSON.stringify(DEMO_VISITS));
    return DEMO_VISITS;
  }
  try {
    return JSON.parse(local);
  } catch (e) {
    return DEMO_VISITS;
  }
}

export function saveStoredVisit(visit: Visit): Visit[] {
  const list = getStoredVisits();
  list.push(visit);
  localStorage.setItem('asha_visits', JSON.stringify(list));
  return list;
}
