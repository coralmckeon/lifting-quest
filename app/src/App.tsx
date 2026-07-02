import { useState, useEffect, useRef } from 'react';
import * as Api from './api';
import {
  Units, Variant, TMs, LiftKey,
  SetDef, AccessoryDef, DayDef,
  getDays, getLiftTM, getLiftName,
  setWeight, roundWeight, epley1RM, tmFrom1RM,
  progression, dayProgressionLift, calcPlates, BAR,
} from './program';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Settings { units: Units; variant: Variant; tms: TMs }
interface AppState  { settings: Settings | null; currentDayIndex: number }

// ── Icons ──────────────────────────────────────────────────────────────────────

const Gear = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const X = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ChevL = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────────

const U_LABEL: Record<Units, string> = { lbs: 'lb', kg: 'kg' };

function fmtTime(sec: number) {
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

function fmtW(w: number) {
  return w % 1 === 0 ? String(w) : w.toFixed(1);
}

const CACHE_KEY = 'lq_state_v1';
const loadCache = (): AppState | null => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null'); } catch { return null; }
};
const saveCache = (s: AppState) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch {}
};

// ── Loading screen ─────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="screen center">
      <Barbell size={48}/>
      <p className="brand-name">Lifting Quest</p>
      <div className="spinner"/>
    </div>
  );
}

function Barbell({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="4"  y="21" width="40" height="6" rx="3" fill="var(--steel-mid)"/>
      <rect x="0"  y="17" width="8"  height="14" rx="3" fill="var(--steel-bright)"/>
      <rect x="40" y="17" width="8"  height="14" rx="3" fill="var(--steel-bright)"/>
      <rect x="10" y="19" width="5"  height="10" rx="2" fill="var(--orange)"/>
      <rect x="33" y="19" width="5"  height="10" rx="2" fill="var(--orange)"/>
    </svg>
  );
}

// ── Auth screen ────────────────────────────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: (u: Api.AuthUser) => void }) {
  const [mode, setMode] = useState<'home' | 'register'>('home');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setErr('');
    try { onAuth(await Api.passkeyRegister(name.trim())); }
    catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : String(ex)); }
    finally { setBusy(false); }
  }

  async function doLogin() {
    setBusy(true); setErr('');
    try { onAuth(await Api.passkeyLogin()); }
    catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : String(ex)); }
    finally { setBusy(false); }
  }

  return (
    <div className="screen center auth-screen">
      <Barbell size={48}/>
      <p className="brand-name">Lifting Quest</p>
      <p className="auth-tagline">nSuns 5/3/1 LP tracker</p>

      {mode === 'home' && (
        <div className="auth-btns">
          <button className="btn btn-primary btn-lg" onClick={() => setMode('register')} disabled={busy}>
            Create Account
          </button>
          <button className="btn btn-secondary" onClick={doLogin} disabled={busy}>
            {busy ? 'Waiting for passkey…' : 'Sign In with Passkey'}
          </button>
          {err && <p className="err-msg">{err}</p>}
        </div>
      )}

      {mode === 'register' && (
        <form className="auth-form" onSubmit={doRegister}>
          <button type="button" className="back-btn" onClick={() => setMode('home')}>
            <ChevL/> Back
          </button>
          <label className="field">
            <span className="field-label">Your name</span>
            <input className="input" type="text" autoFocus value={name} maxLength={50}
              placeholder="e.g. Alex" onChange={e => setName(e.target.value)}/>
          </label>
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Registering passkey…' : 'Create with Passkey'}
          </button>
          {err && <p className="err-msg">{err}</p>}
        </form>
      )}
    </div>
  );
}

// ── Setup screen ───────────────────────────────────────────────────────────────

function SetupScreen({ user, onDone }: { user: Api.AuthUser; onDone: (s: Settings) => void }) {
  const [units, setUnits] = useState<Units>('lbs');
  const [variant, setVariant] = useState<Variant>('5-day');
  const [tms, setTms] = useState<TMs>({ squat: 225, bench: 155, deadlift: 275, ohp: 105 });
  const [eW, setEW] = useState('');
  const [eR, setER] = useState('');
  const [eLift, setELift] = useState<keyof TMs | ''>('');

  const u = U_LABEL[units];
  const LIFTS: { k: keyof TMs; label: string }[] = [
    { k: 'squat', label: 'Squat' }, { k: 'bench', label: 'Bench' },
    { k: 'deadlift', label: 'Deadlift' }, { k: 'ohp', label: 'OHP' },
  ];

  function setTM(k: keyof TMs, v: string) {
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0) setTms(p => ({ ...p, [k]: roundWeight(n, units) }));
  }

  function applyEpley() {
    const w = parseFloat(eW), r = parseInt(eR);
    if (!eLift || isNaN(w) || isNaN(r) || r < 1 || w <= 0) return;
    const tm = tmFrom1RM(epley1RM(w, r), units);
    setTms(p => ({ ...p, [eLift]: tm }));
  }

  const epleyTM = eLift && eW && eR
    ? tmFrom1RM(epley1RM(parseFloat(eW) || 0, parseInt(eR) || 1), units)
    : null;

  return (
    <div className="screen setup-screen">
      <h1 className="setup-title">Welcome, {user.displayName}!</h1>
      <p className="setup-sub">Configure your nSuns program.</p>

      <section className="setup-card">
        <h3 className="card-title">Units</h3>
        <div className="seg">
          <button className={`seg-btn ${units === 'lbs' ? 'on' : ''}`} onClick={() => setUnits('lbs')}>LBS</button>
          <button className={`seg-btn ${units === 'kg' ? 'on' : ''}`} onClick={() => setUnits('kg')}>KG</button>
        </div>
      </section>

      <section className="setup-card">
        <h3 className="card-title">Variant</h3>
        <div className="variant-grid">
          {(['4-day','5-day','6-day-squat','6-day-dl'] as Variant[]).map(v => (
            <button key={v} className={`variant-btn ${variant === v ? 'on' : ''}`} onClick={() => setVariant(v)}>
              {v}
            </button>
          ))}
        </div>
      </section>

      <section className="setup-card">
        <h3 className="card-title">Training Maxes ({u})</h3>
        <p className="card-sub">Enter TM directly (= 90% × 1RM, rounded to 5{u}).</p>
        <div className="tms-grid">
          {LIFTS.map(({ k, label }) => (
            <label key={k} className="tm-row">
              <span className="tm-label">{label}</span>
              <input className="input input-num mono" type="number" value={tms[k]}
                step={units === 'lbs' ? 5 : 2.5} min={0}
                onChange={e => setTM(k, e.target.value)}/>
            </label>
          ))}
        </div>
      </section>

      <section className="setup-card epley-card">
        <h3 className="card-title">Epley 1RM → TM Calculator</h3>
        <div className="epley-row">
          <select className="input input-sel" value={eLift} onChange={e => setELift(e.target.value as keyof TMs)}>
            <option value="">Lift…</option>
            {LIFTS.map(({ k, label }) => <option key={k} value={k}>{label}</option>)}
          </select>
          <input className="input input-num mono" type="number" placeholder={`Wt (${u})`}
            value={eW} onChange={e => setEW(e.target.value)}/>
          <input className="input input-num mono" type="number" placeholder="Reps"
            value={eR} onChange={e => setER(e.target.value)}/>
        </div>
        {epleyTM !== null && (
          <p className="epley-result">
            Est. TM: <strong className="mono">{epleyTM}{u}</strong>
            <button className="btn btn-ghost btn-sm" onClick={applyEpley}>Apply</button>
          </p>
        )}
      </section>

      <button className="btn btn-primary btn-lg cta-start" onClick={() => onDone({ units, variant, tms })}>
        Start Training
      </button>
    </div>
  );
}

// ── Plate modal ────────────────────────────────────────────────────────────────

function PlateModal({ weight, name, units, onClose }: {
  weight: number; name: string; units: Units; onClose: () => void;
}) {
  const plates = calcPlates(weight, units);
  const bar = BAR[units];
  const u = U_LABEL[units];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <span>{name} — <span className="mono">{fmtW(weight)}{u}</span></span>
          <button className="icon-btn" onClick={onClose}><X/></button>
        </div>
        <div className="plate-list">
          {plates.length === 0
            ? <p className="plate-empty">Bar only ({bar}{u})</p>
            : plates.map(({ plate, count }) => (
                <div key={plate} className="plate-entry">
                  <span className="mono plate-p">{plate}{u}</span>
                  <span className="plate-x">×</span>
                  <span className="mono plate-c">{count}/side</span>
                </div>
              ))
          }
        </div>
        <p className="plate-total">
          {bar}{u} bar
          {plates.map(({ plate, count }) => ` + ${plate}×${count * 2}`)}
          {' = '}<strong className="mono">{fmtW(weight)}{u}</strong>
        </p>
      </div>
    </div>
  );
}

// ── Rest timer ─────────────────────────────────────────────────────────────────

function RestTimer({ remaining, total, onSkip }: {
  remaining: number; total: number; onSkip: () => void;
}) {
  const r = 44, circ = 2 * Math.PI * r;
  const pct = total > 0 ? remaining / total : 0;
  const urgent = remaining <= 10;
  return (
    <div className="rest-overlay">
      <svg className="rest-ring" width="140" height="140" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="6"/>
        <circle cx="50" cy="50" r={r} fill="none"
          stroke={urgent ? 'var(--orange)' : 'var(--steel-bright)'}
          strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
        />
        <text x="50" y="58" textAnchor="middle" fontSize="24"
          fontFamily="'SF Mono','Cascadia Code',monospace" fill="var(--text)"
          className={urgent ? 'urgent' : ''}>
          {fmtTime(remaining)}
        </text>
      </svg>
      <p className="rest-label">REST</p>
      <button className="btn btn-secondary btn-sm" onClick={onSkip}>Skip</button>
    </div>
  );
}

// ── AMRAP stepper ──────────────────────────────────────────────────────────────

function AmrapInput({ label, min, onOk, onCancel }: {
  label: string; min: number; onOk: (n: number) => void; onCancel: () => void;
}) {
  const [n, setN] = useState(min);
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal amrap-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <span className="amrap-label">{label}</span>
          <button className="icon-btn" onClick={onCancel}><X/></button>
        </div>
        <p className="amrap-sub">Reps completed?</p>
        <div className="stepper">
          <button className="step-btn" onClick={() => setN(v => Math.max(0, v - 1))}>−</button>
          <span className="step-val mono">{n}</span>
          <button className="step-btn" onClick={() => setN(v => v + 1)}>+</button>
        </div>
        <button className="btn btn-primary" onClick={() => onOk(n)}>Confirm</button>
      </div>
    </div>
  );
}

// ── Progression result ─────────────────────────────────────────────────────────

function ProgressionSheet({ rows, onNext }: {
  rows: { lift: string; reps: number; add: number; newTM: number; u: string }[];
  onNext: () => void;
}) {
  return (
    <div className="overlay">
      <div className="modal prog-modal">
        <h2 className="prog-title">Workout Complete!</h2>
        {rows.map(r => (
          <div key={r.lift} className="prog-row">
            <span className="prog-lift">{r.lift}</span>
            <span className="mono prog-reps">{r.reps} reps</span>
            <span className={`mono prog-add ${r.add > 0 ? 'up' : 'hold'}`}>
              {r.add > 0 ? `+${r.add}${r.u}` : 'hold'}
            </span>
            <span className="mono prog-tm">→ {r.newTM}{r.u}</span>
          </div>
        ))}
        <button className="btn btn-primary btn-lg" onClick={onNext}>Next Workout →</button>
      </div>
    </div>
  );
}

// ── Set row ────────────────────────────────────────────────────────────────────

function SetRow({ idx, set, w, units, liftName, done, onDone, onWeight }: {
  idx: number; set: SetDef; w: number; units: Units; liftName: string;
  done: boolean; onDone: () => void; onWeight: () => void;
}) {
  const u = U_LABEL[units];
  return (
    <div className={`set-row ${done ? 'set-done' : ''} ${set.isTop ? 'set-top' : ''}`}>
      <span className="set-n mono">{idx + 1}</span>
      <button className="set-wbtn" onClick={onWeight}>
        <span className="mono set-w">{fmtW(w)}</span>
        <span className="set-u">{u}</span>
      </button>
      <span className="set-x">×</span>
      <span className="mono set-r">{set.isAmrap ? `${set.reps}+` : set.reps}</span>
      <span className="mono set-pct">{set.pct}%</span>
      {set.isTop && <span className="top-badge">TOP</span>}
      <button className={`set-chk ${done ? 'chk-done' : ''}`} onClick={onDone} disabled={done}>
        {done ? <Check/> : null}
      </button>
    </div>
  );
}

// ── Settings sheet ─────────────────────────────────────────────────────────────

function SettingsSheet({ user, settings, onSave, onClose, onLogout }: {
  user: Api.AuthUser; settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  const [units, setUnits] = useState(settings.units);
  const [variant, setVariant] = useState(settings.variant);
  const [tms, setTms] = useState(settings.tms);
  const u = U_LABEL[units];
  const LIFTS: { k: keyof TMs; label: string }[] = [
    { k: 'squat', label: 'Squat' }, { k: 'bench', label: 'Bench' },
    { k: 'deadlift', label: 'Deadlift' }, { k: 'ohp', label: 'OHP' },
  ];

  return (
    <div className="overlay sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-drag"/>
        <div className="sheet-hd">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}><X/></button>
        </div>
        <div className="sheet-body">
          <p className="sheet-user">{user.displayName}</p>

          <div className="s-row">
            <span className="s-label">Units</span>
            <div className="seg">
              <button className={`seg-btn ${units === 'lbs' ? 'on' : ''}`} onClick={() => setUnits('lbs')}>LBS</button>
              <button className={`seg-btn ${units === 'kg' ? 'on' : ''}`} onClick={() => setUnits('kg')}>KG</button>
            </div>
          </div>

          <div className="s-row col">
            <span className="s-label">Variant</span>
            <div className="variant-grid">
              {(['4-day','5-day','6-day-squat','6-day-dl'] as Variant[]).map(v => (
                <button key={v} className={`variant-btn ${variant === v ? 'on' : ''}`} onClick={() => setVariant(v)}>{v}</button>
              ))}
            </div>
          </div>

          <div className="s-row col">
            <span className="s-label">Training Maxes ({u})</span>
            <div className="tms-grid">
              {LIFTS.map(({ k, label }) => (
                <label key={k} className="tm-row">
                  <span className="tm-label">{label}</span>
                  <input className="input input-num mono" type="number" value={tms[k]}
                    step={units === 'lbs' ? 5 : 2.5} min={0}
                    onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n) && n > 0) setTms(p => ({ ...p, [k]: roundWeight(n, units) })); }}/>
                </label>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => { onSave({ units, variant, tms }); onClose(); }}>Save Changes</button>
          <button className="btn btn-ghost danger" onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

// ── Workout screen ─────────────────────────────────────────────────────────────

function WorkoutScreen({ user, appState, onChange, onLogout }: {
  user: Api.AuthUser; appState: AppState;
  onChange: (s: AppState) => void;
  onLogout: () => void;
}) {
  const { settings } = appState;
  if (!settings) return null;
  const { units, variant, tms } = settings;

  const days = getDays(variant);
  const dayIdx = appState.currentDayIndex % days.length;
  const day = days[dayIdx];

  const [done, setDone] = useState(new Set<string>());
  const [amrapReps, setAmrapReps] = useState<Record<string, number>>({});
  const [pendingAmrap, setPendingAmrap] = useState<string | null>(null);
  const [rest, setRest] = useState<{ rem: number; tot: number } | null>(null);
  const [plate, setPlate] = useState<{ w: number; name: string } | null>(null);
  const [showProg, setShowProg] = useState(false);
  const [nextState, setNextState] = useState<AppState | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Reset on day change
  useEffect(() => {
    setDone(new Set()); setAmrapReps({}); setPendingAmrap(null);
    setRest(null); setShowProg(false); setNextState(null);
  }, [dayIdx, variant]);

  // Countdown
  useEffect(() => {
    if (!rest || rest.rem <= 0) { if (rest?.rem === 0) setRest(null); return; }
    const id = setTimeout(() => setRest(r => r ? { ...r, rem: r.rem - 1 } : null), 1000);
    return () => clearTimeout(id);
  }, [rest]);

  const t1TM = getLiftTM(day.t1.lift, tms, units);
  const t2TM = getLiftTM(day.t2.lift, tms, units);
  const t1Sets = day.t1.sets;
  const t2Sets = day.t2.sets;

  const totalReq = t1Sets.length + t2Sets.length;
  const doneReq = [...done].filter(k => k.startsWith('t1-') || k.startsWith('t2-')).length;
  const allDone = doneReq >= totalReq;

  const topIdx = t1Sets.findIndex(s => s.isTop);
  const topKey = `t1-${topIdx}`;

  function completeSet(key: string, set: SetDef, restSec: number) {
    setDone(p => new Set([...p, key]));
    if (set.isAmrap) { setPendingAmrap(key); }
    else { setRest({ rem: restSec, tot: restSec }); }
  }

  function confirmAmrap(reps: number) {
    if (!pendingAmrap) return;
    setAmrapReps(p => ({ ...p, [pendingAmrap]: reps }));
    setPendingAmrap(null);
    const isT1 = pendingAmrap.startsWith('t1-');
    setRest({ rem: isT1 ? 180 : 120, tot: isT1 ? 180 : 120 });
  }

  function finish() {
    const pLift = dayProgressionLift(day.id);
    const newTMs = { ...tms };
    if (pLift && topIdx >= 0) {
      const reps = amrapReps[topKey] ?? 0;
      newTMs[pLift] = tms[pLift] + progression(reps, units);
    }
    const next: AppState = {
      ...appState,
      settings: { ...settings, tms: newTMs },
      currentDayIndex: appState.currentDayIndex + 1,
    };
    setNextState(next);
    setShowProg(true);
  }

  function buildProgRows() {
    const pLift = dayProgressionLift(day.id);
    if (!pLift || topIdx < 0) return [];
    const reps = amrapReps[topKey] ?? 0;
    const add = progression(reps, units);
    return [{ lift: getLiftName(day.t1.lift), reps, add, newTM: tms[pLift] + add, u: U_LABEL[units] }];
  }

  function navTo(i: number) {
    const base = Math.floor(appState.currentDayIndex / days.length) * days.length;
    onChange({ ...appState, currentDayIndex: base + i });
  }

  function getPendingAmrapInfo() {
    if (!pendingAmrap) return null;
    const isT1 = pendingAmrap.startsWith('t1-');
    const i = parseInt(pendingAmrap.split('-')[1]);
    const set = isT1 ? t1Sets[i] : t2Sets[i];
    const tm = isT1 ? t1TM : t2TM;
    const lift = isT1 ? day.t1.lift : day.t2.lift;
    const w = setWeight(tm, set.pct, units);
    return { label: `${getLiftName(lift)} ${fmtW(w)}${U_LABEL[units]}`, min: set.reps };
  }

  const amrapInfo = getPendingAmrapInfo();
  const u = U_LABEL[units];

  return (
    <div className="screen workout-screen">
      {/* Header */}
      <header className="w-hdr">
        <div className="w-hdr-info">
          <span className="w-day-name">{day.name}</span>
          <span className="w-day-pos">{dayIdx + 1}/{days.length}</span>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(true)}><Gear/></button>
      </header>

      {/* Day nav */}
      <nav className="day-nav">
        {days.map((d, i) => (
          <button key={d.id} className={`day-dot ${i === dayIdx ? 'dot-cur' : i < dayIdx ? 'dot-done' : ''}`}
            onClick={() => navTo(i)} title={d.name}>
            <span className="dot-short">{d.short}</span>
          </button>
        ))}
      </nav>

      {/* Workout content */}
      <div className="w-body">
        {/* T1 */}
        <section className="block">
          <div className="block-hd">
            <span className="tier-badge t1-badge">T1</span>
            <span className="block-lift">{getLiftName(day.t1.lift)}</span>
            <span className="block-tm mono">TM {t1TM}{u}</span>
          </div>
          {t1Sets.map((set, i) => {
            const key = `t1-${i}`;
            const w = setWeight(t1TM, set.pct, units);
            return <SetRow key={key} idx={i} set={set} w={w} units={units}
              liftName={getLiftName(day.t1.lift)} done={done.has(key)}
              onDone={() => completeSet(key, set, 180)}
              onWeight={() => setPlate({ w, name: getLiftName(day.t1.lift) })}/>;
          })}
        </section>

        {/* T2 */}
        <section className="block">
          <div className="block-hd">
            <span className="tier-badge t2-badge">T2</span>
            <span className="block-lift">{getLiftName(day.t2.lift)}</span>
            <span className="block-tm mono">TM {t2TM}{u}</span>
          </div>
          {t2Sets.map((set, i) => {
            const key = `t2-${i}`;
            const w = setWeight(t2TM, set.pct, units);
            return <SetRow key={key} idx={i} set={set} w={w} units={units}
              liftName={getLiftName(day.t2.lift)} done={done.has(key)}
              onDone={() => completeSet(key, set, day.t2.restSec)}
              onWeight={() => setPlate({ w, name: getLiftName(day.t2.lift) })}/>;
          })}
        </section>

        {/* Accessories */}
        {day.accessories.length > 0 && (
          <section className="block">
            <div className="block-hd">
              <span className="tier-badge acc-badge">ACC</span>
              <span className="block-lift">Accessories</span>
            </div>
            {day.accessories.map((acc, i) => {
              const key = `acc-${i}`;
              const isDone = done.has(key);
              return (
                <div key={key} className={`acc-row ${isDone ? 'acc-done' : ''}`}>
                  <button className={`set-chk ${isDone ? 'chk-done' : ''}`} disabled={isDone}
                    onClick={() => { setDone(p => new Set([...p, key])); setRest({ rem: 90, tot: 90 }); }}>
                    {isDone && <Check/>}
                  </button>
                  <span className="acc-name">{acc.name}</span>
                  <span className="mono acc-scheme">{acc.sets}×{acc.reps}</span>
                </div>
              );
            })}
          </section>
        )}

        {allDone && !showProg && (
          <button className="btn btn-primary btn-finish" onClick={finish}>
            Finish Workout →
          </button>
        )}
        <div style={{ height: 48 }}/>
      </div>

      {/* Overlays */}
      {rest && rest.rem > 0 && <RestTimer remaining={rest.rem} total={rest.tot} onSkip={() => setRest(null)}/>}

      {plate && <PlateModal weight={plate.w} name={plate.name} units={units} onClose={() => setPlate(null)}/>}

      {amrapInfo && <AmrapInput label={amrapInfo.label} min={amrapInfo.min}
        onOk={confirmAmrap} onCancel={() => setPendingAmrap(null)}/>}

      {showProg && (
        <ProgressionSheet rows={buildProgRows()} onNext={() => {
          if (nextState) onChange(nextState);
          setShowProg(false);
        }}/>
      )}

      {showSettings && (
        <SettingsSheet user={user} settings={settings}
          onSave={s => onChange({ ...appState, settings: s })}
          onClose={() => setShowSettings(false)}
          onLogout={onLogout}/>
      )}
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<'loading' | 'auth' | 'setup' | 'workout'>('loading');
  const [user, setUser] = useState<Api.AuthUser | null>(null);
  const [appState, setAppStateRaw] = useState<AppState | null>(null);
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function persist(next: AppState) {
    setAppStateRaw(next);
    saveCache(next);
    if (syncRef.current) clearTimeout(syncRef.current);
    syncRef.current = setTimeout(async () => {
      try { await Api.putState(next); } catch {}
    }, 800);
  }

  useEffect(() => {
    const cached = loadCache();
    if (cached) setAppStateRaw(cached);

    Api.checkAuth().then(async authed => {
      if (!authed) { setView('auth'); return; }
      setUser(authed);
      let state = await Api.getState<AppState>().catch(() => null);
      if (!state && cached) state = cached;
      if (state) { setAppStateRaw(state); saveCache(state); }
      setView(!state?.settings ? 'setup' : 'workout');
    });
  }, []);

  async function onAuth(u: Api.AuthUser) {
    setUser(u);
    let state = await Api.getState<AppState>().catch(() => null);
    if (state) { setAppStateRaw(state); saveCache(state); }
    setView(!state?.settings ? 'setup' : 'workout');
  }

  async function onSetup(s: Settings) {
    const next: AppState = { settings: s, currentDayIndex: 0 };
    await persist(next);
    setView('workout');
  }

  async function onLogout() {
    try { await Api.logout(); } catch {}
    localStorage.removeItem(CACHE_KEY);
    setUser(null); setAppStateRaw(null); setView('auth');
  }

  if (view === 'loading') return <LoadingScreen/>;
  if (view === 'auth')    return <AuthScreen onAuth={onAuth}/>;
  if (view === 'setup')   return <SetupScreen user={user!} onDone={onSetup}/>;
  return user && appState
    ? <WorkoutScreen user={user} appState={appState} onChange={persist} onLogout={onLogout}/>
    : <LoadingScreen/>;
}
