import type { Patient, RiskResult, ExtractedNote } from '../types';


export const PROTOCOLS = {
  pregnancy: 28, // days between ANC visits
  immunization: 30, // days between immunization visits
  ncd_refill: 30, // days between NCD checkups/refills
};

export function getProtocolDays(conditionType: string): number {
  if (conditionType === 'pregnancy') return PROTOCOLS.pregnancy;
  if (conditionType === 'immunization') return PROTOCOLS.immunization;
  if (conditionType === 'ncd_refill') return PROTOCOLS.ncd_refill;
  return 30; // default fallback
}

/**
 * Calculates risk score based on:
 * days_overdue_weight + condition_risk_weight + danger_sign_bonus
 * Missing/unclear data treated as medium risk flag (score = 15, level = medium)
 */
export function calculateRiskScore(
  nextDueDateStr: string,
  conditionType: string | undefined,
  hasDangerFlag: boolean
): RiskResult {
  const reasoning: string[] = [];
  let score = 0;

  // Calculate days overdue
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(nextDueDateStr);
  dueDate.setHours(0, 0, 0, 0);

  // Difference in days
  const diffTime = today.getTime() - dueDate.getTime();
  const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // 1. Days Overdue Weight (2 pts per day overdue)
  if (daysOverdue > 0) {
    const overdueWeight = daysOverdue * 2;
    score += overdueWeight;
    reasoning.push(`${daysOverdue} days overdue (+${overdueWeight} pts)`);
  } else if (daysOverdue < 0) {
    reasoning.push(`Due in ${Math.abs(daysOverdue)} days (on schedule)`);
  } else {
    reasoning.push('Due today');
  }

  // 2. Condition Risk Weight
  // pregnancy = 15, ncd_refill = 10, immunization = 5, missing/unclear = 10
  let conditionWeight = 0;
  if (!conditionType) {
    conditionWeight = 10;
    reasoning.push('Condition unclear/missing: treated as medium risk (+10 pts)');
  } else if (conditionType === 'pregnancy') {
    conditionWeight = 15;
    reasoning.push('High-risk category: Pregnancy (+15 pts)');
  } else if (conditionType === 'ncd_refill') {
    conditionWeight = 10;
    reasoning.push('Medium-risk category: NCD Refill (+10 pts)');
  } else if (conditionType === 'immunization') {
    conditionWeight = 5;
    reasoning.push('Low-risk category: Immunization (+5 pts)');
  } else {
    conditionWeight = 10;
    reasoning.push('Unknown condition type: treated as medium risk (+10 pts)');
  }
  score += conditionWeight;

  // 3. Danger Sign Bonus
  if (hasDangerFlag) {
    const dangerBonus = 50;
    score += dangerBonus;
    reasoning.push('Danger signs detected (swelling, bleeding, high fever, severe pain, etc.) (+50 pts)');
  }

  // Determine Risk Level
  let level: 'low' | 'medium' | 'high' = 'low';
  if (score >= 40 || hasDangerFlag) {
    level = 'high';
  } else if (score >= 15 || daysOverdue > 7) {
    level = 'medium';
  }

  return {
    score,
    level,
    reasoning,
  };
}

/**
 * Client-side heuristic parser for extract-and-save functionality.
 * Falls back to this if no LLM key is configured.
 */
export function localSmartParser(noteText: string, existingPatients: Patient[]): Partial<ExtractedNote> {
  const text = noteText.toLowerCase();

  // 1. Try to extract name
  let name = '';
  // Check if any existing patient name is a substring
  const matchedPatient = existingPatients.find(p => 
    text.includes(p.name.toLowerCase()) || 
    p.name.split(' ').some(part => part.length > 3 && text.includes(part.toLowerCase()))
  );
  if (matchedPatient) {
    name = matchedPatient.name;
  } else {
    // Basic regex for Capitalized name at the beginning of a sentence
    const nameMatch = noteText.match(/^([A-Z][a-z]+)/);
    if (nameMatch) {
      name = nameMatch[1];
    }
  }

  // 2. Determine Condition / Visit Type
  let visit_type: 'pregnancy' | 'immunization' | 'ncd_refill' = 'pregnancy'; // default
  let condition = '';
  if (text.includes('vacc') || text.includes('dose') || text.includes('immun') || text.includes('baby') || text.includes('child')) {
    visit_type = 'immunization';
    condition = 'Immunization Checkup';
  } else if (text.includes('diabet') || text.includes('sugar') || text.includes('bp') || text.includes('blood pressure') || text.includes('hypertension') || text.includes('ncd') || text.includes('refill')) {
    visit_type = 'ncd_refill';
    condition = 'NCD Monitor / Refill';
  } else {
    visit_type = 'pregnancy';
    condition = 'ANC Checkup';
  }

  // 3. Search for pregnancy weeks/months (to validate missing info rule)
  let weeks_pregnant: number | undefined = undefined;
  const weekMatch = text.match(/(\d+)\s*(?:weeks|week|wk|wks)/);
  if (weekMatch) {
    weeks_pregnant = parseInt(weekMatch[1], 10);
  } else {
    const monthMatch = text.match(/(\d+)\s*(?:months|month|mo|mos)/);
    if (monthMatch) {
      weeks_pregnant = parseInt(monthMatch[1], 10) * 4;
    }
  }

  // 4. Check for danger signs
  const dangerKeywords = [
    'swelling',
    'bleeding',
    'fever',
    'severe pain',
    'headache',
    'dizzy',
    'vomiting',
    'seizure',
    'convulsion',
    'breathless',
    'chest pain',
  ];
  const danger_flag = dangerKeywords.some(keyword => text.includes(keyword));

  // 5. Calculate next due date
  const today = new Date();
  const interval = getProtocolDays(visit_type);
  const nextDueDate = new Date(today);
  nextDueDate.setDate(today.getDate() + interval);

  const formattedDueDate = nextDueDate.toISOString().split('T')[0];

  return {
    name,
    condition,
    visit_type,
    next_due_date: formattedDueDate,
    danger_flag,
    confidence: 0.90,
    weeks_pregnant,
  };
}
