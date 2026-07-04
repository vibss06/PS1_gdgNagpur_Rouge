export interface Patient {
  id: string;
  name: string;
  locality: string;
  condition_type: 'pregnancy' | 'immunization' | 'ncd_refill';
  created_at: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  visit_date: string;
  visit_type: string;
  notes: string;
  extracted_fields: {
    weeks_pregnant?: number;
    months_pregnant?: number;
    symptoms?: string[];
    vaccines?: string[];
    blood_sugar?: string;
    blood_pressure?: string;
    [key: string]: any;
  };
  confidence: number;
  next_due_date: string;
  danger_flag: boolean;
}

export interface RiskResult {
  score: number;
  level: 'low' | 'medium' | 'high';
  reasoning: string[];
}

export interface ExtractedNote {
  name: string;
  condition: string;
  visit_type: 'pregnancy' | 'immunization' | 'ncd_refill';
  next_due_date: string;
  danger_flag: boolean;
  confidence: number;
  weeks_pregnant?: number;
}
