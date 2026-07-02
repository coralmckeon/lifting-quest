export type Units = 'lbs' | 'kg';

export interface PlateCount { plate: number; count: number }

export const BAR: Record<Units, number> = { lbs: 45, kg: 20 };

const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];
const PLATES_KG  = [25, 20, 15, 10, 5, 2.5, 1.25];

export function roundWeight(w: number, units: Units): number {
  const inc = units === 'lbs' ? 5 : 2.5;
  return Math.round(w / inc) * inc;
}

export function setWeight(tm: number, pct: number, units: Units): number {
  return roundWeight(tm * pct / 100, units);
}

export function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function tmFrom1RM(oneRM: number, units: Units): number {
  return roundWeight(oneRM * 0.9, units);
}

export function calcPlates(target: number, units: Units): PlateCount[] {
  const bar = BAR[units];
  const plates = units === 'lbs' ? PLATES_LBS : PLATES_KG;
  let rem = (target - bar) / 2;
  if (rem <= 0) return [];
  const result: PlateCount[] = [];
  for (const p of plates) {
    const n = Math.floor(rem / p + 1e-9);
    if (n > 0) { result.push({ plate: p, count: n }); rem -= n * p; }
  }
  return result;
}
