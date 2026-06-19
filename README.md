# JobConnect

JobConnect is a full-stack India-focused opportunities platform for internships, full-time roles, startup openings, and research positions. It combines a React frontend, an Express API, Neon Postgres storage, and automated sync jobs that aggregate live listings from free public job sources.

## Features

- India-first job discovery across internships, full-time roles, startup jobs, and research opportunities
- User registration and login with database-backed sessions
- Live multi-source aggregation from The Muse, Remotive, Jobicy, Adzuna,
  Greenhouse, Lever, Ashby, and Arbeitnow
- Automated syncing and persistence of opportunities into PostgreSQL
- Startup dashboard with startup scoring and segmented opportunity views
- Filters for search, location, track, and startup-only roles
- Direct outbound apply links to the source listing page
- Optional Ollama-assisted query expansion for richer search
- Vercel-ready frontend, API routing, and scheduled cron sync

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Wouter
- TanStack Query
- Tailwind CSS
- Shadcn-style UI primitives

### Backend

- Node.js
- Express
- TypeScript
- Drizzle ORM
- Neon Postgres

### Data Sources

- The Muse public jobs API
- Remotive public jobs API
- Jobicy RSS feed
- Optional Adzuna integration
- Greenhouse public employer job boards
- Lever public employer postings
- Ashby public employer job boards
- Arbeitnow public job-board API

## Project Structure

```text
.
├── api/                  # Vercel serverless entry
├── client/               # React frontend
│   ├── index.html
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── pages/
│       └── types/
├── server/               # Express app, auth, sync, DB logic
├── shared/               # Shared schema and types
├── drizzle.config.ts     # Drizzle configuration
├── vercel.json           # Vercel routing and cron config
└── package.json
```

## Environment Variables

Create a `.env` file in the project root.

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=your_neon_database_url
CRON_SECRET=replace_with_a_long_random_secret

# Optional source-specific credentials
THE_MUSE_API_KEY=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=

# Optional employer boards. Separate entries with commas.
# Format: board-token|Display Name
GREENHOUSE_BOARDS=company-token|Company Name
LEVER_SITES=company-site|Company Name
ASHBY_BOARDS=company-board|Company Name

# Optional Ollama integration
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1
```

Notes:

- `DATABASE_URL` is required for persisted users, sessions, jobs, and sync logs.
- `CRON_SECRET` protects the sync endpoint.
- `THE_MUSE_API_KEY` is optional.
- `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` are optional.
- `GREENHOUSE_BOARDS`, `LEVER_SITES`, and `ASHBY_BOARDS` are optional
  comma-separated employer-board lists.
- Arbeitnow requires no API key or configuration.

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Neon Postgres

Add your Neon connection string to `.env` as `DATABASE_URL`.

### 3. Push the schema

```bash
npx drizzle-kit push
```

This creates the core tables:

- `users`
- `auth_sessions`
- `jobs`
- `sync_runs`

### 4. Start the app

```bash
npm run dev
```

Open the app at the local URL shown in the terminal.

### 5. Trigger an initial sync

Replace the token with your `CRON_SECRET` value:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/sync-opportunities" -Headers @{ Authorization = "Bearer YOUR_CRON_SECRET" }
```

After syncing, refresh the app and verify jobs appear.

## Authentication

JobConnect uses a custom email/password auth flow:

- User accounts are stored in `users`
- Passwords are hashed with `bcryptjs`
- Session tokens are stored in `auth_sessions`
- Session cookies are HTTP-only

Endpoints:

- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

## Opportunity Sync

The sync layer:

- fetches data from the configured general job APIs and employer ATS boards
- normalizes jobs into a shared schema
- deduplicates repeated listings
- upserts active listings into Postgres
- marks stale records inactive
- writes sync metadata to `sync_runs`

Endpoints:

- `GET /api/opportunities`
- `GET /api/dashboard`
- `GET /api/health`
- `GET /api/cron/sync-opportunities`

## Source Setup

### Remotive

- No API key required
- Docs: https://remotive.com/remote-jobs/api

### The Muse

- Optional API key
- Docs: https://www.themuse.com/developers/api/v2
- Public jobs endpoint: `https://www.themuse.com/api/public/jobs`

### Jobicy

- No API key required
- RSS feed docs: https://jobicy.com/jobs-rss-feed

### Adzuna

- Optional
- Docs: https://developer.adzuna.com/overview

### Greenhouse

- No API key is required for published jobs.
- Add each employer's board token to `GREENHOUSE_BOARDS`.
- Example format: `company-token|Company Name,second-token|Second Company`
- Docs: https://developers.greenhouse.io/job-board.html

### Lever

- No API key is required for published jobs.
- Add each employer's Lever site name to `LEVER_SITES`.
- The site name is the value after `jobs.lever.co/` in its careers URL.
- Docs: https://github.com/lever/postings-api

### Ashby

- No API key is required for public job-board postings.
- Add each employer's Ashby board name to `ASHBY_BOARDS`.
- The board name is the value after `jobs.ashbyhq.com/` in its careers URL.
- Docs: https://developers.ashbyhq.com/docs/public-job-posting-api

### Arbeitnow

- No API key or configuration is required.
- India-relevant listings are retained; unrelated listings are discarded.
- Docs: https://www.arbeitnow.com/blog/job-board-api

## Deployment on Vercel

The repository is already prepared for Vercel with:

- `api/index.ts` for API handling
- `vercel.json` rewrites for SPA routing and API routing
- a cron job that calls `/api/cron/sync-opportunities`

### Deploy Steps

1. Push the project to GitHub
2. Import the repo into Vercel
3. Add environment variables in Vercel:
   - `DATABASE_URL`
   - `CRON_SECRET`
   - `THE_MUSE_API_KEY` optional
   - `ADZUNA_APP_ID` optional
   - `ADZUNA_APP_KEY` optional
   - `GREENHOUSE_BOARDS` optional
   - `LEVER_SITES` optional
   - `ASHBY_BOARDS` optional
   - `OLLAMA_BASE_URL` optional
   - `OLLAMA_MODEL` optional
4. Deploy
5. Trigger the sync endpoint once manually after the first deployment

## Useful Commands

```bash
npm install
npm run dev
npm run check
npm run build
npx drizzle-kit push
```

## Current Status

Implemented:

- India-focused opportunities UI
- Login/register flow
- Neon-backed persistence
- Automated sync pipeline
- Multi-source aggregation
- Startup dashboard
- Vercel deployment config

Planned improvements:

- saved jobs
- source-quality filtering for direct employer ATS links only
- admin sync controls
- richer analytics per source

## License

This project is licensed under the MIT License.
