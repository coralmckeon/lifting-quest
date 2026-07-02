import { roundWeight } from '../utils';
import type { Units } from '../utils';
import type { SetDef, DayDef, TMLift, ProgramVariant, ProgramDef } from './types';

// ── Internal lift type (not exported — keep nSuns internals self-contained) ────

type LiftKey =
  | 'squat' | 'bench' | 'deadlift' | 'ohp'
  | 'sumo' | 'frontSquat' | 'incline' | 'cgbp';

// ── Set-definition helper ──────────────────────────────────────────────────────

function s(pct: number, reps: number, isAmrap = false, isTop = false): SetDef {
  return { pct, reps, isAmrap, isTop };
}

function vol8x3(pct: number): SetDef[] {
  return Array.from({ length: 8 }, () => s(pct, 3));
}

function vol6x3(pct: number): SetDef[] {
  return Array.from({ length: 6 }, () => s(pct, 3));
}

// ── Set templates ──────────────────────────────────────────────────────────────

const T1_SQ_OHP: SetDef[] = [
  s(75,5), s(85,3), s(95,1,true,true),
  s(90,3), s(85,3), s(80,3), s(75,5), s(70,5), s(65,5,true),
];

const T1_DL: SetDef[] = [
  s(75,5), s(85,3), s(95,1,true,true),
  s(90,3), s(85,3), s(80,3), s(75,3), s(70,3), s(65,3,true),
];

const T1_BENCH: SetDef[] = [
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
    t1: { lift: 'squat', sets: T1_SQ_OHP },
    t2: { lift: 'sumo', sets: T2_LOWER, restSec: 120 },
    accessories: [
      { name: 'Leg Raise', sets: 3, reps: 12 },
      { name: 'Leg Extension', sets: 3, reps: 8 },
    ],
  },
  {
    id: 'ohp', name: 'OHP', short: 'OH',
    t1: { lift: 'ohp', sets: T1_SQ_OHP },
    t2: { lift: 'incline', sets: T2_UPPER, restSec: 120 },
    accessories: [
      { name: 'Lat Raise', sets: 4, reps: 12 },
      { name: 'Face Pull', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'deadlift', name: 'Deadlift', short: 'DL',
    t1: { lift: 'deadlift', sets: T1_DL },
    t2: { lift: 'frontSquat', sets: T2_LOWER, restSec: 120 },
    accessories: [
      { name: 'Ab Wheel', sets: 3, reps: 12 },
      { name: 'Chin Up', sets: 3, reps: 8 },
    ],
  },
  {
    id: 'bench-531', name: 'Bench 5/3/1', short: 'B5',
    t1: { lift: 'bench', sets: T1_BENCH },
    t2: { lift: 'cgbp', sets: T2_UPPER, restSec: 120 },
    accessories: [
      { name: 'Tri Pushdown', sets: 3, reps: 8 },
      { name: 'Hammer Curl', sets: 4, reps: 8 },
    ],
  },
];

const SQUAT_VOL_DAY: DayDef = {
  id: 'squat-vol', name: 'Squat Volume', short: 'SV',
  t1: { lift: 'squat', sets: vol8x3(72) },
  t2: { lift: 'sumo', sets: vol6x3(56), restSec: 120 },
  accessories: [],
};

const DL_VOL_DAY: DayDef = {
  id: 'dl-vol', name: 'DL Volume', short: 'DV',
  t1: { lift: 'deadlift', sets: vol8x3(72) },
  t2: { lift: 'frontSquat', sets: vol6x3(56), restSec: 120 },
  accessories: [],
};

// ── Metadata ───────────────────────────────────────────────────────────────────

const VARIANTS: ProgramVariant[] = [
  { id: '4-day',       name: '4-Day' },
  { id: '5-day',       name: '5-Day' },
  { id: '6-day-squat', name: '6-Day (Squat Volume)' },
  { id: '6-day-dl',   name: '6-Day (DL Volume)' },
];

const TM_LIFTS: TMLift[] = [
  { key: 'squat',    label: 'Squat',    defaultLbs: 225, defaultKg: 100 },
  { key: 'bench',    label: 'Bench',    defaultLbs: 155, defaultKg: 70  },
  { key: 'deadlift', label: 'Deadlift', defaultLbs: 275, defaultKg: 125 },
  { key: 'ohp',      label: 'OHP',      defaultLbs: 105, defaultKg: 50  },
];

const LIFT_NAMES: Record<LiftKey, string> = {
  squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', ohp: 'OHP',
  sumo: 'Sumo DL', frontSquat: 'Front Squat', incline: 'Incline', cgbp: 'CGBP',
};

// ── nSuns ProgramDef ──────────────────────────────────────────────────────────

export const NSUNS: ProgramDef = {
  id: 'nsuns',
  name: 'nSuns 5/3/1 LP',
  description:
    'Linear progression variant of Wendler 5/3/1 with higher-volume T1 sets ' +
    'and an 8-set T2 scheme. Designed for strength athletes running LP.',

  variants: VARIANTS,
  defaultVariant: '5-day',
  tmLifts: TM_LIFTS,

  getDays(variant: string): DayDef[] {
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
      default: return [...BASE_DAYS];
    }
  },

  getLiftTM(lift: string, tms: Record<string, number>, units: Units): number {
    switch (lift as LiftKey) {
      case 'squat':      return tms.squat ?? 0;
      case 'bench':      return tms.bench ?? 0;
      case 'deadlift':   return tms.deadlift ?? 0;
      case 'ohp':        return tms.ohp ?? 0;
      // Secondary lifts derive from primary TMs
      case 'sumo':       return tms.deadlift ?? 0;
      case 'frontSquat': return roundWeight((tms.squat ?? 0) * 0.85, units);
      case 'incline':    return roundWeight((tms.bench ?? 0) * 0.80, units);
      case 'cgbp':       return roundWeight((tms.bench ?? 0) * 0.90, units);
      default:           return 0;
    }
  },

  getLiftName(lift: string): string {
    return LIFT_NAMES[lift as LiftKey] ?? lift;
  },

  // nSuns LP progression: reps on top AMRAP set → TM increment
  progression(amrapReps: number, units: Units): number {
    if (amrapReps <= 1) return 0;
    if (amrapReps <= 3) return units === 'lbs' ? 5  : 2.5;
    if (amrapReps <= 5) return units === 'lbs' ? 10 : 5;
    return units === 'lbs' ? 15 : 7.5;
  },

  dayProgressionLift(dayId: string): string | null {
    switch (dayId) {
      case 'squat':     return 'squat';
      case 'ohp':       return 'ohp';
      case 'deadlift':  return 'deadlift';
      case 'bench-531': return 'bench';
      default:          return null;
    }
  },
};
