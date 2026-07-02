# Lifting Quest — nSuns 5/3/1 LP Tracker

PWA workout tracker for the nSuns 5/3/1 linear progression program.

| Layer | Tech | URL |
|-------|------|-----|
| Frontend | React + esbuild → GitHub Pages | `app.lifting.quest` |
| Backend | Cloudflare Worker + Hono | `api.lifting.quest` (temp: workers.dev URL) |
| Auth | Passkeys via SimpleWebAuthn v13 | RP_ID: `lifting.quest` |
| DB | Cloudflare D1 | `lifting-quest` database |
| Sessions | Cloudflare KV | challenges + sessions |

---

## Current Status — DNS setup is the only remaining step

Everything is deployed and running:

- ✅ **Worker** live at `https://lifting-quest-api.black-silence-26e0.workers.dev`
- ✅ **D1 database** `lifting-quest` with migrations applied
- ✅ **KV namespace** for sessions and challenges
- ✅ **GitHub Pages** built and deployed via CI
- ✅ **GitHub Actions CI/CD** configured (auto-deploys on push to main)
- ✅ **GitHub Actions secrets** `CF_API_TOKEN` and `CF_ACCOUNT_ID` set

**Blocked on:** `lifting.quest` domain needs DNS configuration (see below).  
Until DNS is live, the app redirects to Porkbun's parked page.

---

## DNS setup (one-time, ~10 min)

### Option A: Move DNS to Cloudflare (recommended — unlocks `api.lifting.quest` route)

1. In Porkbun, change nameservers to Cloudflare's (`e.g. aria.ns.cloudflare.com`)
2. In Cloudflare, add `lifting.quest` zone
3. Add DNS records:

| Type  | Name  | Value |
|-------|-------|-------|
| CNAME | `app` | `coralmckeon.github.io` (proxied off) |
| CNAME | `api` | `lifting-quest-api.black-silence-26e0.workers.dev` |

4. In `worker/wrangler.toml`, uncomment the routes section:
   ```toml
   [[routes]]
   pattern = "api.lifting.quest/*"
   zone_name = "lifting.quest"
   ```
5. Update `app/src/api.ts` line 1:
   ```typescript
   const BASE = 'https://api.lifting.quest';
   ```
6. Update `wrangler.toml` vars to remove the workers.dev URL from ALLOWED_ORIGIN / EXPECTED_ORIGIN
7. Push to main — CI redeploys everything

### Option B: Keep Porkbun DNS

Add these records in Porkbun:

| Type  | Name  | Value |
|-------|-------|-------|
| CNAME | `app` | `coralmckeon.github.io` |

The API stays at `https://lifting-quest-api.black-silence-26e0.workers.dev` (already configured in the app).

Then in GitHub repo Settings → Pages → Custom domain: set to `app.lifting.quest`.

---

## GitHub Actions secrets

| Secret | Description |
|--------|-------------|
| `CF_API_TOKEN` | Cloudflare API token (already set) |
| `CF_ACCOUNT_ID` | Cloudflare account ID (already set) |

---

## Worker env vars (wrangler.toml `[vars]`)

| Key | Current value |
|-----|---------|
| `RP_NAME` | `Lifting Quest` |
| `RP_ID` | `lifting.quest` |
| `EXPECTED_ORIGIN` | `https://app.lifting.quest,https://coralmckeon.github.io` |
| `ALLOWED_ORIGIN` | `https://app.lifting.quest,https://coralmckeon.github.io` |
| `COOKIE_DOMAIN` | `.lifting.quest` |
| `COOKIE_SECURE` | `true` |

---

## What can't be tested headlessly

| Item | Why | Manual check needed |
|------|-----|---------------------|
| Passkey registration/login | Requires browser + authenticator | Open app in Chrome/Safari on a real device |
| Cookie cross-subdomain | Requires live `.lifting.quest` domain | Works after DNS propagation |
| Service worker install | Requires HTTPS or localhost | Verified via DevTools → Application |
| iOS "Add to Home Screen" | Safari-specific PWA install | Test on iPhone |
