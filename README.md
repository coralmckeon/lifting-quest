# Lifting Quest — nSuns 5/3/1 LP Tracker

PWA workout tracker for the nSuns 5/3/1 linear progression program.

| Layer | Tech | URL |
|-------|------|-----|
| Frontend | React + esbuild → GitHub Pages | `app.lifting.quest` |
| Backend | Cloudflare Worker + Hono | `api.lifting.quest` |
| Auth | Passkeys via SimpleWebAuthn v13 | RP_ID: `lifting.quest` |
| DB | Cloudflare D1 | `lifting-quest` database |
| Sessions | Cloudflare KV | challenges + sessions |

---

## First-time setup

### 1. Create Cloudflare D1 database

```bash
cd worker
CLOUDFLARE_API_TOKEN=<token> npx wrangler d1 create lifting-quest
```

Copy the `database_id` into `wrangler.toml` under `[[d1_databases]]`.

### 2. Create Cloudflare KV namespace

```bash
CLOUDFLARE_API_TOKEN=<token> npx wrangler kv namespace create LQ_SESSIONS
```

Copy the `id` into `wrangler.toml` under `[[kv_namespaces]]`.

### 3. Run D1 migration

```bash
CLOUDFLARE_API_TOKEN=<token> npx wrangler d1 execute lifting-quest \
  --remote --file=migrations/0001_init.sql
```

### 4. Deploy the worker

```bash
CLOUDFLARE_API_TOKEN=<token> npx wrangler deploy
```

### 5. Build and deploy the frontend

```bash
cd ../app
npm install
npm run build
# Push app/dist/ to gh-pages branch
```

---

## DNS records (in Cloudflare Dashboard)

| Type  | Name  | Value |
|-------|-------|-------|
| CNAME | `app` | `<github-username>.github.io` |
| Worker route | `api.lifting.quest/*` | Managed by wrangler.toml |

GitHub Pages: set custom domain to `app.lifting.quest` and enable HTTPS.

---

## GitHub Actions secrets required

| Secret | Value |
|--------|-------|
| `CF_API_TOKEN` | Cloudflare API token with Worker + D1 + KV edit permissions |
| `CF_ACCOUNT_ID` | `868abd9a4cf5af9e3c9dd3c983396709` |

---

## Worker env vars (wrangler.toml `[vars]`)

| Key | Default |
|-----|---------|
| `RP_NAME` | `Lifting Quest` |
| `RP_ID` | `lifting.quest` |
| `EXPECTED_ORIGIN` | `https://app.lifting.quest` |
| `ALLOWED_ORIGIN` | `https://app.lifting.quest` |
| `COOKIE_DOMAIN` | `.lifting.quest` |
| `COOKIE_SECURE` | `true` |

For local dev, override in `wrangler.toml` `[env.dev]` with `localhost` values.

---

## What can't be tested headlessly

| Item | Why | Manual check needed |
|------|-----|---------------------|
| Passkey registration/login | Requires browser + authenticator | Open app in Chrome/Safari on a real device |
| Cookie cross-subdomain | Requires live `.lifting.quest` domain | Works after DNS propagation |
| Service worker install | Requires HTTPS or localhost | Verified via DevTools → Application |
| iOS "Add to Home Screen" | Safari-specific PWA install | Test on iPhone |
