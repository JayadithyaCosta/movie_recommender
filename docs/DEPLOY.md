# Deploy — Vercel + Cloudflare DNS + free domain

Everything here is on a free tier. Order matters: DB → Vercel → domain → Cloudflare → auth.

## 1. Production database (Neon, free)

1. Create a project at [neon.tech](https://neon.tech). Copy the **pooled** connection string
   (host contains `-pooler`) and append `?sslmode=require&pgbouncer=true` if missing.
2. Keep it handy as `DATABASE_URL` for step 2.

## 2. Vercel project

1. [vercel.com/new](https://vercel.com/new) → import `JayadithyaCosta/movie_recommender`
   (Hobby plan). Framework auto-detects Next.js; pnpm is picked up from `packageManager`.
   Every push to `main` now deploys production; branches get previews.
2. Project → Settings → Environment Variables (Production):

   | Var                                         | Value                                           |
   | ------------------------------------------- | ----------------------------------------------- |
   | `DATABASE_URL`                              | Neon pooled URL                                 |
   | `AUTH_SECRET`                               | `openssl rand -base64 32` (new, not the dev one) |
   | `AUTH_URL`                                  | `https://<your-domain>` (after step 4)          |
   | `GEMINI_API_KEY`                            | AI Studio key                                   |
   | `TMDB_READ_TOKEN`                           | TMDB v4 read token                              |
   | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`     | Google OAuth client (step 6)                    |
   | `AUTH_RESEND_KEY` / `AUTH_EMAIL_FROM`       | optional — see step 6                           |

3. Locally: `make vercel-link`, `make vercel-env-pull`, `make migrate-prod` (applies
   `prisma/migrations` to Neon). Re-run `make migrate-prod` whenever a migration is added.
   Put Neon's non-pooled URL (same host minus `-pooler`) in `.env.production.local` as
   `DIRECT_URL` — migrations take advisory locks the pooler doesn't support.
   `make migrate-status-prod` checks the pooled path the app uses.
4. Redeploy (Deployments → Redeploy, or `make deploy`). Check `https://<project>.vercel.app`.

## 3. Free domain

Cloudflare does not hand out free domains (its registrar sells at cost). Free options that
can be delegated to Cloudflare nameservers:

- **DigitalPlat FreeDomain** — `*.dpdns.org`, `*.us.kg`, `*.qzz.io`, etc. Register at
  [dash.domain.digitalplat.org](https://dash.domain.digitalplat.org), set custom nameservers.
  Recommended: instant, NS delegation supported.
- **eu.org** — `*.eu.org`, free forever, manual approval (days–weeks).
- **is-a.dev** — `*.is-a.dev` via GitHub PR. Records live in their repo, so no Cloudflare
  zone — point a CNAME straight at Vercel instead and skip step 4.

Cheapest real TLD if free ones get flaky: Cloudflare Registrar (`.com` ~$10/yr at cost).

## 4. Cloudflare DNS

1. Cloudflare dashboard → **Add a domain** → enter the domain → Free plan.
2. Copy the two assigned nameservers into the domain registrar (DigitalPlat → domain →
   Nameservers). Wait until Cloudflare shows the zone **Active**.
3. Vercel → Project → Settings → Domains → add `example.dpdns.org` and `www.example.dpdns.org`
   (redirect www → apex). Vercel shows the exact records; typically:

   | Type  | Name  | Content                | Proxy               |
   | ----- | ----- | ---------------------- | ------------------- |
   | A     | `@`   | `76.76.21.21`          | **DNS only (grey)** |
   | CNAME | `www` | `cname.vercel-dns.com` | **DNS only (grey)** |

   Use whatever Vercel displays if it differs. Keep the cloud **grey**: Vercel already runs a
   CDN and issues the TLS cert; proxying through Cloudflare (orange) breaks cert renewal and
   double-caches. If you insist on orange, set SSL/TLS → **Full (strict)**.
4. Vercel marks the domain **Valid** and issues HTTPS within minutes.

## 5. Point the app at the domain

Set `AUTH_URL=https://<your-domain>` in Vercel and redeploy.

## 6. Auth providers

- **Google**: Google Cloud Console → OAuth client (Web) → Authorized redirect URI
  `https://<your-domain>/api/auth/callback/google` (add the `.vercel.app` one too if you use
  it). Put the id/secret in Vercel.
- **Magic link** (optional): in production the console fallback is off, so email login only
  appears with `AUTH_RESEND_KEY`. Resend's test sender (`onboarding@resend.dev`) only delivers
  to your own Resend account email; to mail anyone, verify the domain in Resend (it gives
  TXT/MX records — add them in Cloudflare, DNS only) and set
  `AUTH_EMAIL_FROM="Movie Recs <login@<your-domain>>"`.

## 7. Smoke test

- Wizard logged-out → 5 results with posters.
- Google login → For You loads.
- Phone → Add to Home Screen (closes F-13 Acceptance's pending item).
