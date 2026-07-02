import { NSUNS } from './nsuns';
import type { ProgramDef } from './types';

export type { ProgramDef, DayDef, SetDef, AccessoryDef, TMLift, ProgramVariant } from './types';

// ── Program registry ──────────────────────────────────────────────────────────
//
// To add a new program:
//   1. Create programs/<name>.ts exporting a `const MY_PROGRAM: ProgramDef`
//   2. Import it here and add it to REGISTRY and PROGRAMS
//   3. Done — the UI drives everything from the ProgramDef interface

const REGISTRY: Record<string, ProgramDef> = {
  [NSUNS.id]: NSUNS,
  // future: [GZCL.id]: GZCL,
  // future: [BBB.id]: BBB,
};

/** All available programs in display order. */
export const PROGRAMS: ProgramDef[] = [
  NSUNS,
];

/** Look up a program by id. Falls back to nSuns for unknown/missing ids. */
export function getProgram(id: string): ProgramDef {
  return REGISTRY[id] ?? NSUNS;
}
