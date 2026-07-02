import type { Units } from '../utils';

export type { Units };

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
  t1: { lift: string; sets: SetDef[] };
  t2: { lift: string; sets: SetDef[]; restSec: number };
  accessories: AccessoryDef[];
}

/** One user-configurable training max, with sensible defaults for both unit systems. */
export interface TMLift {
  key: string;
  label: string;
  defaultLbs: number;
  defaultKg: number;
}

export interface ProgramVariant {
  id: string;
  name: string;
}

/**
 * Contract every workout program must satisfy.
 *
 * To add a new program (GZCL, BBB, PPL, etc.):
 *   1. Create `programs/<name>.ts` that exports a `const MY_PROGRAM: ProgramDef`
 *   2. Register it in `programs/index.ts`
 *   3. The UI renders it automatically — no other changes needed.
 */
export interface ProgramDef {
  id: string;
  name: string;
  description: string;

  /** User-selectable variants (e.g. 4-day, 5-day, 6-day). */
  variants: ProgramVariant[];
  defaultVariant: string;

  /** Lifts the user enters a training max for on the setup/settings screen. */
  tmLifts: TMLift[];

  /** Return the ordered training days for the given variant id. */
  getDays(variant: string): DayDef[];

  /**
   * Resolve the effective training max for a lift.
   * Primary lifts look up directly; secondary lifts may derive from primaries
   * (e.g. front squat at 85 % of squat TM in nSuns).
   */
  getLiftTM(lift: string, tms: Record<string, number>, units: Units): number;

  /** Human-readable display name for a lift key. */
  getLiftName(lift: string): string;

  /**
   * How much to add to the TM given the reps logged on the AMRAP set.
   * Return 0 to hold at current TM.
   */
  progression(amrapReps: number, units: Units): number;

  /**
   * Which TM key gets updated after completing this day's T1 AMRAP?
   * Return null for volume-only days or days with no TM progression.
   */
  dayProgressionLift(dayId: string): string | null;
}
