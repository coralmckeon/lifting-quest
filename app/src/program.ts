// Compatibility re-exports. Program logic has moved to:
//   Generic math  → src/utils.ts
//   nSuns data    → src/programs/nsuns.ts
//   Interface     → src/programs/types.ts
//   Registry      → src/programs/index.ts

export type { Units, PlateCount } from './utils';
export { BAR, roundWeight, setWeight, epley1RM, tmFrom1RM, calcPlates } from './utils';
export type { SetDef, AccessoryDef, DayDef, TMLift, ProgramVariant, ProgramDef } from './programs/types';
export { PROGRAMS, getProgram } from './programs';
export { NSUNS } from './programs/nsuns';
