export type Units = 'lbs' | 'kg';
export type Variant = '4-day' | '5-day' | '6-day-squat' | '6-day-dl';
export type LiftKey =
  | 'squat' | 'bench' | 'deadlift' | 'ohp'
  | 'sumo' | 'frontSquat' | 'incline' | 'cgbp';

export interface SetDef {
  pct: number;
  reps: number;
  isAmrap: boolean;
  isTop: boolean;
}

export interface AccessoryDef {
  name: string;
  sets: number;
  reps: number;
}

export interface DayDef {
  id: string;
  name: string;
  short: string;
  t1: { lift: LiftKey; sets: SetDef[] };
  t2: { lift: LiftKey; sets: SetDef[]; restSec: number };
  accessories: AccessoryDef[];
}

export interface TMs {
  squat: number;
  bench: number;
  deadlift: number;
  ohp: number;
}

// ── Set templates ──────────────────────────────────────────────────────────────

function s(pct: number, reps: number, isAmrap = false, isTop = false): SetDef {
  return { pct, reps, isAmrap, isTop };
}

const T1_531_SQ_OHP: SetDef[] = [
  s(75,5), s(85,3), s(95,1,true,true),
  s(90,3), s(85,3), s(80,3), s(75,5), s(70,5), s(65,5,true),
];

const T1_531_DL: SetDef[] = [
  s(75,5), s(85,3), s(95,1,true,true),
  s(90,3), s(85,3), s(80,3), s(75,3), s(70,3), s(65,3,true),
];

const T1_531_BENCH: SetDef[] = [
  s(75,5), s(85,3), s(95,1,true,true),
  s(90,3), s(85,5), s(80,3), s(75,5), s(70,3), s(65,5,true),
];

const T1_BENCH_VOL: SetDef[] = [
  s(65,8), s(75,6), s(85,4), s(85,4), s(85,4),
  s(80,5), s(75,6), s(70,7), s(65,8,true),
];

const T2_UPPER: SetDef[] = [
  s(50,6), s(60,5), s(70,3), s(70,5), s(70,7), s(70,4), s(70,6), s(70,8),
];

const T2_LOWER: SetDef[] = [
  s(50,5), s(60,5), s(70,3), s(70,5), s(70,7), s(70,4), s(70,6), s(70,8),
];

const VOL_8X3 = (pct: number): SetDef[] =>
  Array.from({ length: 8 }, () => s(pct, 3));

const VOL_6X3 = (pct: number): SetDef[] =>
  Array.from({ length: 6 }, () => s(pct, 3));

// ── Day definitions ────────────────────────────────────────────────────────────

const BASE_DAYS: DayDef[] = [
  {
    id: 'bench-vol', name: 'Bench Volume', short: 'BV',
    t1: { lift: 'bench', sets: T1_BENCH_VOL },
    t2: { lift: 'ohp', sets: T2_UPPER, restSec: 120 },
    accessories: [
      { name: 'Lat Pulldown', sets: 3, reps: 8 },
      { name: 'Bicep Curl', sets: 4, reps: 8 },
    ],
  },
  {
    id: 'squat', name: 'Squat', short: 'SQ',
    t1: { lift: 'squat', sets: T1_531_SQ_OHP },
    t2: { lift: 'sumo', sets: T2_LOWER, restSec: 120 },
    accessories: [
      { name: 'Leg Raise', sets: 3, reps: 12 },
      { name: 'Leg Extension', sets: 3, reps: 8 },
    ],
  },
  {
    id: 'ohp', name: 'OHP', short: 'OH',
    t1: { lift: 'ohp', sets: T1_531_SQ_OHP },
    t2: { lift: 'incline', sets: T2_UPPER, restSec: 120 },
    accessories: [
      { name: 'Lat Raise', sets: 4, reps: 12 },
      { name: 'Face Pull', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'deadlift', name: 'Deadlift', short: 'DL',
    t1: { lift: 'deadlift', sets: T1_531_DL },
    t2: { lift: 'frontSquat', sets: T2_LOWER, restSec: 120 },
    accessories: [
      { name: 'Ab Wheel', sets: 3, reps: 12 },
      { name: 'Chin Up', sets: 3, reps: 8 },
    ],
  },
  {
    id: 'bench-531', name: 'Bench 5/3/1', short: 'B5',
    t1: { lift: 'bench', sets: T1_531_BENCH },
    t2: { lift: 'cgbp', sets: T2_UPPER, restSec: 120 },
    accessories: [
      { name: 'Tri Pushdown', sets: 3, reps: 8 },
      { name: 'Hammer Curl', sets: 4, reps: 8 },
    ],
  },
];

const SQUAT_VOL_DAY: DayDef = {
  id: 'squat-vol', name: 'Squat Volume', short: 'SV',
  t1: { lift: 'squat', sets: VOL_8X3(72) },
  t2: { lift: 'sumo', sets: VOL_6X3(56), restSec: 120 },
  accessories: [],
};

const DL_VOL_DAY: DayDef = {
  id: 'dl-vol', name: 'DL Volume', short: 'DV',
  t1: { lift: 'deadlift', sets: VOL_8X3(72) },
  t2: { lift: 'frontSquat', sets: VOL_6X3(56), restSec: 120 },
  accessories: [],
};

export function getDays(variant: Variant): DayDef[] {
  switch (variant) {
    case '4-day': return BASE_DAYS.filter(d => d.id !== 'ohp');
    case '5-day': return [...BASE_DAYS];
    case '6-day-squat': {
      const out: DayDef[] = [];
      for (const d of BASE_DAYS) {
        out.push(d);
        if (d.id === 'squat') out.push(SQUAT_VOL_DAY);
      }
      return out;
    }
    case '6-day-dl': {
      const out: DayDef[] = [];
      for (const d of BASE_DAYS) {
        out.push(d);
        if (d.id === 'deadlift') out.push(DL_VOL_DAY);
      }
      return out;
    }
  }
}

export function getLiftTM(lift: LiftKey, tms: TMs, units: Units): number {
  switch (lift) {
    case 'squat':      return tms.squat;
    case 'bench':      return tms.bench;
    case 'deadlift':   return tms.deadlift;
    case 'ohp':        return tms.ohp;
    case 'sumo':       return tms.deadlift;
    case 'frontSquat': return roundWeight(tms.squat * 0.85, units);
    case 'incline':    return roundWeight(tms.bench * 0.8, units);
    case 'cgbp':       return roundWeight(tms.bench * 0.9, units);
  }
}

export function getLiftName(lift: LiftKey): string {
  const n: Record<LiftKey, string> = {
    squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', ohp: 'OHP',
    sumo: 'Sumo DL', frontSquat: 'Front Squat', incline: 'Incline', cgbp: 'CGBP',
  };
  return n[lift];
}

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

export function progression(amrapReps: number, units: Units): number {
  if (amrapReps <= 1) return 0;
  if (amrapReps <= 3) return units === 'lbs' ? 5 : 2.5;
  if (amrapReps <= 5) return units === 'lbs' ? 10 : 5;
  return units === 'lbs' ? 15 : 7.5;
}

// Which main lift TM does this day's T1 affect?
export function dayProgressionLift(dayId: string): keyof TMs | null {
  switch (dayId) {
    case 'squat':     return 'squat';
    case 'ohp':       return 'ohp';
    case 'deadlift':  return 'deadlift';
    case 'bench-531': return 'bench';
    default:          return null;
  }
}

// ── Plate calculator ───────────────────────────────────────────────────────────

export interface PlateCount { plate: number; count: number }

const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];
const PLATES_KG  = [25, 20, 15, 10, 5, 2.5, 1.25];
export const BAR: Record<Units, number> = { lbs: 45, kg: 20 };

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
