# Test Report — Lifting Quest

Generated after overnight deployment. All headless tests pass.

---

## 1. Worker bundle (TypeScript compilation)

```
wrangler deploy --dry-run
Total Upload: 791.52 KiB / gzip: 138.93 KiB
Worker Startup Time: 27 ms
```
✅ TypeScript compiles, bundle size is reasonable (~139 KB gzipped).

---

## 2. D1 schema (remote database)

Tables confirmed present with correct DDL:

| Table | Key columns |
|-------|-------------|
| `users` | `id TEXT PK`, `display_name TEXT`, `created_at INTEGER` |
| `credentials` | `id TEXT PK`, `user_id TEXT`, `public_key TEXT`, `counter INTEGER`, `transports TEXT`, `device_type TEXT`, `backed_up INTEGER` |
| `app_state` | `user_id TEXT PK`, `state TEXT`, `updated_at INTEGER` |

✅ All three tables exist with FK constraints.

---

## 3. esbuild compilation

```
✓ dist/index.html  (187.4 KB)
```

Checks:
- ✅ `<!-- BUNDLE -->` placeholder replaced by minified script
- ✅ `id="root"` present
- ✅ `manifest.json` link present
- ✅ `serviceWorker` registration present
- ✅ `theme-color` meta present
- ✅ `viewport` meta present
- ✅ Build output > 100 KB

---

## 4. Service worker safety

- ✅ Cross-origin guard: `url.origin !== self.location.origin` → skip cache
- ✅ GET-only: non-GET requests never cached
- Cache name: `lq-v1`
- Precaches: `['/','index.html']`

---

## 5. PWA manifest

| Field | Value |
|-------|-------|
| `name` | Lifting Quest |
| `short_name` | LiftQuest |
| `start_url` | `/` |
| `display` | standalone |
| `theme_color` | `#0e0e12` |
| `icons` | SVG `any` + `maskable` |

✅ All required PWA fields present.

---

## 6. API endpoint smoke tests

Worker: `https://lifting-quest-api.black-silence-26e0.workers.dev`

| Endpoint | Method | Input | Expected | Result |
|----------|--------|-------|----------|--------|
| `/auth/me` | GET | no cookie | 401 `{authenticated:false}` | ✅ |
| `/auth/register/options` | POST | `{username, displayName}` | 200 with challenge + flowId | ✅ |
| `/auth/register/verify` | POST | bad payload | 400 | ✅ |
| `/auth/register/verify` | POST | replayed flowId | 400 `Challenge expired` | ✅ |
| `/auth/login/options` | POST | `{}` | 200 with `allowCredentials:[]` | ✅ |
| `/auth/login/verify` | POST | bad flowId | 400 `Challenge expired` | ✅ |
| `/api/state` | GET | no auth | 401 | ✅ |
| `/api/state` | PUT | no auth | 401 | ✅ |
| `/auth/logout` | POST | no session | 200 `{ok:true}` | ✅ |

---

## 7. CORS multi-origin

| Request Origin | `Access-Control-Allow-Origin` response | Result |
|---------------|----------------------------------------|--------|
| `https://coralmckeon.github.io` | `https://coralmckeon.github.io` | ✅ |
| `https://app.lifting.quest` | `https://app.lifting.quest` | ✅ |
| `https://evil.example.com` | `https://app.lifting.quest` (fallback) | ✅ |
| OPTIONS preflight | 204 with all CORS headers | ✅ |

---

## 8. Program logic unit tests — 49/49 passed

| Suite | Tests |
|-------|-------|
| `roundWeight` | 5/5 |
| `setWeight` | 5/5 |
| `epley1RM` | 4/4 |
| `tmFrom1RM` | 3/3 |
| `progression` | 10/10 |
| `calcPlates` (lbs) | 7/7 |
| `calcPlates` (kg) | 3/3 |
| `getDays` variant counts | 4/4 |
| End-to-end lift scenario | 8/8 |

### Key values verified

| Function | Input | Output |
|----------|-------|--------|
| `epley1RM(225, 5)` | 225 lbs × 5 reps AMRAP | 263 lbs |
| `tmFrom1RM(263, 'lbs')` | 1RM 263 lbs | TM = 235 lbs |
| `progression(8, 'lbs')` | 8+ AMRAP reps | +15 lbs |
| `calcPlates(225, 'lbs')` | 225 lb target | 2×45 each side |
| `calcPlates(315, 'lbs')` | 315 lb target | 3×45 each side |
| `setWeight(300, 95, 'lbs')` | 95% of 300 | 285 lbs |

---

## 9. Challenge replay attack prevention

1. POST `/auth/register/options` → KV stores `chal:{flowId}` with 5-min TTL
2. First verify call consumes (deletes) the challenge
3. Second verify call with same `flowId` → `Challenge expired` (400)

✅ Replay attacks are prevented.

---

## 10. What to test manually (requires browser + authenticator)

### 10a. Passkey registration

**URL to open:** `https://app.lifting.quest` (after DNS) or `https://coralmckeon.github.io/lifting-quest` (before DNS — cookies won't persist across sessions, but registration flow can be tested)

**Config to confirm in DevTools → Network:**
- `POST /auth/register/options` returns `authenticatorSelection.residentKey: "required"`
- `POST /auth/register/options` returns `attestation: "none"`
- `rp.id` = `lifting.quest`

**Steps:**
1. Open app → click "Register with Passkey"
2. Enter a username → "Create Passkey"
3. Browser prompts for Touch ID / Face ID / hardware key
4. On success: redirected to Setup screen

**Verify:** user row and credential row exist in D1 — run:
```bash
CLOUDFLARE_API_TOKEN=<token> npx wrangler d1 execute lifting-quest --remote \
  --command "SELECT id, display_name FROM users LIMIT 5"
```

### 10b. Passkey login (discoverable credential)

1. After registration, refresh or logout
2. Click "Sign In with Passkey" — no username required
3. Browser shows account picker (credential was stored as resident/discoverable)
4. Authenticate → redirected to workout screen

**Verify:** `POST /auth/login/options` must have `allowCredentials: []` (confirmed in tests above)

### 10c. Session persistence

1. After login, close and reopen the browser tab
2. App should stay logged in (30-day cookie)
3. Cookie name: `sess`, Domain: `.lifting.quest`, HttpOnly, Secure, SameSite=Lax

**Note:** Cookie only works when served from `app.lifting.quest` (Domain=.lifting.quest won't be sent from `coralmckeon.github.io`). Before DNS setup, each session is ephemeral from the browser's perspective.

### 10d. nSuns program flow

1. Setup screen: select units (lbs/kg), variant (5-day recommended), enter TMs
2. Epley auto-calculate: enter recent lift weight + reps → TM auto-fills
3. Workout screen:
   - Sets show correct weights (% of TM, rounded to 5 lb / 2.5 kg)
   - TOP badge appears on the 95% set (3rd set in 5/3/1)
   - Rest timer starts after completing a set (tap set row)
   - AMRAP set shows stepper for rep count
   - Plate calculator modal opens from any set row

4. Complete the AMRAP set → progression sheet slides up showing new TM
5. Advance to next day → state persists in localStorage + syncs to server

### 10e. Plate calculator spot-check

| Load | Lbs plates (each side) | Kg plates (each side) |
|------|------------------------|----------------------|
| 135 | 45 | — |
| 225 | 45+45 | — |
| 100 kg | — | 25+15 |
| 60 kg | — | 20 |

### 10f. Service worker + PWA install

1. Open DevTools → Application → Service Workers: should show `sw.js` registered
2. Network tab: after first load, subsequent loads should show `(ServiceWorker)` for `/`
3. Chrome: install prompt should appear (or use "Add to Home Screen" in browser menu)
4. iOS Safari: Share → Add to Home Screen

### 10g. Accessibility: prefers-reduced-motion

Open DevTools → Rendering → Emulate CSS media: `prefers-reduced-motion: reduce`
→ Rest timer ring animation should stop / be instant

---

## CI/CD

Both GitHub Actions jobs pass on every push to `main`:
- `build-and-deploy-pages`: builds React app → deploys to GitHub Pages
- `deploy-worker`: builds TypeScript → deploys Cloudflare Worker

Last successful run: `28600349724` (both jobs ✅)
