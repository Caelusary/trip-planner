# Trip Planner

A small trip-planning app: create trips with a destination and date range, add multi-city stops, and see a 5-day weather forecast (plus weather-based suggestions) for each destination via OpenWeatherMap.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript, Turbopack) with React Server Components and server actions
- [Supabase](https://supabase.com) — Postgres + auth (`@supabase/ssr` for cookie-based sessions)
- Tailwind CSS 4
- Deployed on [Vercel](https://vercel.com) via GitHub integration (pushes to `main` auto-deploy)

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the three variables:

   | Variable | Purpose |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
   | `OPENWEATHER_API_KEY` | OpenWeatherMap key (server-only, no `NEXT_PUBLIC_` prefix) |

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Deployment (Vercel)

- Repo: `Zachyy-boi/trip-planner`, branch `main` auto-deploys.
- The same three env vars from `.env.example` must be set in the Vercel project (Settings > Environment Variables) for Production/Preview — the app 500s without them.
- Supabase project ref: `tpjawauntyfqtdpkewgn`. The database schema (`trips`, `trip_stops`, RLS policies) lives in Supabase migrations — apply via the Supabase dashboard or CLI, not from this repo.

## Known caveats

- **Signup email confirmation**: Supabase's built-in email service is heavily rate-limited. New signups will stall on the confirmation email unless you either disable "Confirm email" (Supabase Dashboard > Authentication > Sign In / Providers) or configure custom SMTP.
- **Weather data**: forecasts come from OpenWeatherMap's free tier (5-day/3-hour forecast). Dates outside that window show no forecast.
