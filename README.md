# Putnam Proof Trainer

A private Next.js training interface for working through historical Putnam problems with static archive difficulty data.

## What it does

- reads the precomputed `putnam_problem_stats_all_years.csv` dataset locally
- does not rerun the scraper or scrape the archive at runtime
- uses historical Top N score distributions to calibrate difficulty
- tracks your personal practice state server-side
- supports optional future topic metadata via `putnam_problem_metadata.json`

## Required environment variables

Copy `.env.example` to `.env.local` and set:

- `PUTNAM_DASHBOARD_PASSWORD`: shared password for the site
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: service role key used by the practice-state API

If Supabase is not configured, the app falls back to in-memory storage. That is fine for local testing but not durable for deployment.

## Supabase setup

Run the SQL migration in `supabase/migrations/20260310_create_putnam_practice_records.sql`.

This creates the `putnam_practice_records` table used for server-side practice tracking.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run start
```

## Vercel deployment

1. Import the repository into Vercel.
2. Add the three environment variables from `.env.example`.
3. Ensure `putnam_problem_stats_all_years.csv` is present in the project root.
4. Run the Supabase migration before first use.
5. Deploy.

## Data files

Required:

- `putnam_problem_stats_all_years.csv`

Optional:

- `putnam_problem_metadata.json`

The optional metadata file should be an array of objects keyed by `year` and `problem`, for example:

```json
[
  {
    "year": 2005,
    "problem": "A3",
    "primary_topic": "number theory",
    "secondary_topics": ["modular arithmetic"],
    "techniques": ["lifting exponent"]
  }
]
```
