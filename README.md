# Finally Employed

A private job-search workspace built with React, TypeScript, Vite, Tailwind CSS, manually installed shadcn/ui patterns with Radix UI, React Router, TanStack Query, React Hook Form, Zod, and Supabase PostgreSQL/Auth.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended) and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://127.0.0.1:5173. Until real environment values are supplied, the app displays setup instructions. It does not simulate saved records or use local storage as a replacement database.

## Supabase setup

1. Create a Supabase project at https://supabase.com/dashboard.
2. For a new project, run `supabase/migrations/202610200001_initial.sql` followed by `supabase/migrations/202610200002_student_opportunities.sql` in the SQL Editor, once each. For an existing project with the initial migration already applied, run only `202610200002_student_opportunities.sql`. Alternatively link a Supabase CLI project and run `supabase db push`.
3. In the project Connect/API settings copy the project URL and **publishable** key to `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Legacy `anon` keys also work. Never use a secret/service-role key here. Every `VITE_` variable is public in the browser. Restart Vite after changing environment values.

## Google OAuth

1. In Google Cloud Console create/select a project and configure the OAuth consent screen for an external audience. While the Google app is in Testing, add each permitted Google account as a test user. For unrestricted Google users, publish its consent configuration as required by Google.
2. Create an OAuth client of type **Web application**. Add `http://127.0.0.1:5173` as an authorized JavaScript origin (add `http://localhost:5173` too if using localhost).
3. Add the Supabase callback `https://YOUR_PROJECT.supabase.co/auth/v1/callback` as an authorized redirect URI in Google. This is different from the frontend callback.
4. In Supabase Authentication → Sign In / Providers → Google, enable Google and paste the Google client ID and secret. Store the secret only in Supabase, never in `.env.local` or frontend code. Disable other login providers if you want Google-only access.
5. In Supabase Authentication → URL Configuration set Site URL to `http://127.0.0.1:5173` and allow `http://127.0.0.1:5173/auth/callback`. Add the matching localhost URL if needed. The app uses its current origin for redirects; allow exactly the origin/port you use.
6. Restart the app, click Continue with Google, and finish login in the same browser. The Supabase client automatically detects and exchanges the PKCE code on `/auth/callback`; the app does not exchange it twice.

Official references: [Google login](https://supabase.com/docs/guides/auth/social-login/auth-google), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Included behavior

- Dashboard counts, status distribution, recent applications, and next actions (including overdue actions).
- Create, view, edit, and delete with confirmation. Saved opportunities need no application date; other statuses require one.
- Statuses: Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn.
- Search company/job title (press Enter or Search), status filter, sorting, and 12-row pagination. Search punctuation is normalized before constructing the data query.
- Immutable ownership, database validation, and automatic status history on creation/status changes. Deletion cascades to history.
- UTC timestamps and local-time display/input; application dates remain date-only.
- Export **all your records**, independent of current filters, in batches rather than silently truncating to the Supabase response limit. CSV quotes/newlines are escaped and formula prefixes neutralized.
- Mobile cards, labeled forms, keyboard focus styles, and a focus-managed deletion dialog. Save failures preserve the form.

## Workspace, board, and calendar

- The slate workspace uses bundled Poppins fonts, rounded cards, pill navigation, and a dark follow-up panel.
- **Board:** drag opportunities between stages or use each card's stage selector with a keyboard or touchscreen. Moving an undated Saved opportunity into another stage asks for the real application date. Changes persist to Supabase and automatically update status history.
- **Calendar:** browse months, jump to a month, select a date to see its agenda, and export all scheduled next actions for open opportunities to an ICS file. Exported events last one hour and use UTC timestamps; the interface displays your local time.
- **Follow-ups:** the bell opens all open next actions, including unscheduled ones. The dashboard shows the first five. Completing an action asks for confirmation, then clears its description and scheduled time in Supabase. Completed actions are not kept in a separate task archive; application notes and status history remain available.
- **Insights:** activity bars count recorded application dates over the last seven days. Weekly goals count Monday through today. The response snapshot is the share of submitted opportunities currently in Screening, Interview, Offer, or Rejected; it is not a historical conversion metric.
- **Settings:** change the weekly goal (default 5, range 1–100) and interface animation preference. These preferences are stored on the current browser, scoped to the signed-in user's ID.
- **Appearance and readability:** Settings → Appearance offers Light, Dark, and Use device. Appearance is saved for this browser, applies to login and workspace screens, and follows device changes when selected. Poppins text uses larger controls and headings, a 12px minimum for small labels, stronger secondary text contrast, and single-column dashboard cards on phones.
- **Accent colors:** Settings offers Ocean, Violet, Teal, Rose, Amber, and Graphite for actions, highlights, and charts. Your choice is saved on this browser and works in both appearance modes.
- **Motion:** a short page entrance, counters that continue from their current value, chart bars and goal rings, subtle hover feedback, and coordinated dialog opening/closing. Cards avoid overlapping entrance effects. Device reduced-motion settings override interface animations.

## IT student opportunities

Apply `supabase/migrations/202610200002_student_opportunities.sql` before using the updated create/edit forms with your hosted database. It preserves existing records, supplies defaults, and keeps ownership policies and status-history triggers.

- Track Internship, Graduate, Junior, Part-time, Full-time, and Contract roles.
- Add up to 20 required technologies, including custom tools. Comma-separated entry and suggestion buttons support C#, .NET, and Node.js. Duplicate names are removed without regard to case.
- Record an application deadline, coding assessment progress and link, the portfolio/project submitted for this role, and preparation notes.
- Filter by role type and exact technology tag alongside search, stage, sorting, and pagination. Technology choices come from your own records. Board search also includes technologies.
- The dashboard shows deadlines for Saved opportunities, flags past deadlines, lists Preparing/Scheduled assessments on open opportunities, and shows technology frequency across tracked roles. No automatic status changes or notifications are sent.
- Schedule assessment reminders with next-action fields. The calendar shows scheduled next actions; application deadlines are date-only and appear in the toolkit and details.
- CSV includes the student fields. Database tests cover validation and cross-user isolation; hosted Supabase and OAuth checks still require external access.

These changes are local. Apply the migration to Supabase before updating your hosted frontend.

## Security and data

The browser calls the Supabase Data API with the current user's session. All application operations are constrained by PostgreSQL Row Level Security, not just UI filters. The history table is read-only for authenticated users; a restricted trigger writes history. Anonymous users have no table access. No custom backend server is needed.

`applications` stores the owner, opportunity fields, status, notes, next action, and audit timestamps. `application_status_history` stores status transitions and references its parent application. Both tables have RLS enabled. Supabase Auth owns the user accounts.

## Checks

```powershell
npm run typecheck
npm test
npm run build
npm run test:browser
```

Validation/CSV tests and an embedded PostgreSQL migration/policy suite run without credentials. Browser tests use test-only mocked Supabase responses to check setup, authentication routing, dashboard, search, CSV download, history, save failures, and mobile forms. They never contact a real backend. The browser suite uses installed Microsoft Edge; set `channel` in `playwright.config.mjs` to your installed browser or remove it and run `npx playwright install chromium` to use Playwright Chromium. Test servers start and stop automatically on ports 4173 and 4174.

Live Google login and hosted Supabase RLS verification require configured Supabase and two Google accounts. The embedded database checks verify the actual migration and policies, with only the Supabase auth schema mocked. They do not verify the hosted project's configuration.

### Two-user acceptance check

Use two separate browser profiles (A and B). Create an application as A and copy its ID. In profile B, confirm it is absent from the list and dashboard and cannot be opened by its URL. In B's browser console, obtain the existing Supabase client via `const { db } = await import('/src/lib/supabase.ts'); const client = db();` on the local dev server. Do not copy or log session tokens.

With `aId` set to A's application UUID:

```javascript
const aId = 'APPLICATION_UUID_FROM_A';
await client.from('applications').select('*').eq('id', aId); // data: []
await client.from('applications').update({ company: 'Forbidden' }).eq('id', aId).select(); // data: []
await client.from('applications').delete().eq('id', aId).select(); // data: []
await client.from('application_status_history').select('*').eq('application_id', aId); // data: []
```

Also attempt inserting an application with A's user ID as B: it must fail. Attempt transferring B's record to A: it must fail. Attempt writing history directly: it must fail. Confirm A's record remains unchanged afterward. Verify unauthenticated API requests cannot read records. Verify status changes create history entries, notes-only changes do not, and delete removes the application's history. Run the rollback-only SQL policy suite in `supabase/tests/rls.sql` through the SQL Editor to check database isolation without OAuth test accounts.

No deployment, email reminders, file uploads, scraping, or AI integration is included. Free Supabase projects can pause after low activity; monitor project quotas and keep independent database backups for important data. CSV is an application-data export, not a full database backup.
