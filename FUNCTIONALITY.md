# Chap Connect - Functional Status

Handoff description of what this app actually does, written from the code rather than from intent. Current as of the latest commit on `main` plus uncommitted working-tree changes.

## What it is

A web app for the Westlake High School (Eanes ISD, Austin TX) alumni community. Two jobs:

1. **Mentorship matching.** A current student is paired with one alumnus who has already walked the path the student is starting (same intended major, career field, or university). The student gets a pre-written outreach message to send.
2. **Alumni CRM.** An internal admin surface for tracking the alumni roster, donations, and giving analytics.

## Stack

- **React 19** + **Vite 8**, plain **JSX** (no TypeScript, no shadcn/ui, no `@/` path alias)
- **Tailwind CSS v4**, CSS-first config (no `tailwind.config.js`); all tokens live in `src/index.css`
- **framer-motion** for animation, **lucide-react** for icons
- **Supabase** (`@supabase/supabase-js`) for auth and Postgres
- **Google Gemini 2.5 Flash** for the optional AI matching path

### Environment variables

| Variable | Required | Effect if absent |
|---|---|---|
| `VITE_SUPABASE_URL` | yes for persistence | Client is constructed with `''`; DB calls fail and features degrade to local storage |
| `VITE_SUPABASE_ANON_KEY` | yes for persistence | Same |
| `VITE_GEMINI_API_KEY` | no | AI matching is unavailable; the algorithmic matcher is used |

### Commands

`npm run dev` (Vite, port 5173) · `npm run build` · `npm run lint` · `npm run preview`

## Routes

All client-side, `react-router-dom`, defined in `src/App.jsx`. Route changes cross-fade via `AnimatePresence`.

| Path | Component | Purpose |
|---|---|---|
| `/` | `WelcomeScreen` | Sign in with Google, or continue as guest with name + graduating class |
| `/onboarding` | `OnboardingFlow` | Multi-step profile builder, branching on graduating class |
| `/match` | `MatchPage` | Runs matchmaking, shows the matched alumnus and outreach message |
| `/dashboard` | `Dashboard` | Home / My Matches / My Profile tabs |
| `/directory` | `Directory` | Searchable alumni list (alumni and recent grads only) |
| `/admin` | `AdminCRM` | Overview / Contacts / Donations / Trends |

## Authentication

Two identity paths, both producing a `session` object passed down from `App.jsx`:

- **Google OAuth** via `supabase.auth.signInWithOAuth`. A `sessionStorage` flag (`cc_oauth_return`) marks the return leg of the redirect, so an existing session does not bounce a user off the landing page.
- **Local guest session** (`ensureLocalSession` in `App.jsx`). If there is no Supabase session, the app mints a v4 UUID, persists it as `localStorage.mock_user_id`, and synthesises `chap.<8hex>@chapconnect.local`. This is why the app opens straight into the experience with no login wall. Code distinguishes real users by checking the email does **not** end in `@chapconnect.local`.

`signOutToWelcome()` signs out of Supabase, clears `mock_user_id` and the OAuth flag, then hard-reloads to `/` (the reload is required so a fresh guest identity is built).

## Data model

Postgres tables referenced by the client:

| Table | Used for |
|---|---|
| `user_profiles` | The main profile record, keyed by `user_id`, upserted with `onConflict: 'user_id'` |
| `student_matches` | Persisted match history per student |
| `mentors` | A separate legacy/seed pool of mentors, merged with `user_profiles` in the Directory and matching |
| `donations` | CRM gift records |
| `crm_notes` | Free-text notes per contact |
| `crm_tags` | Tags per contact |

Setup SQL lives in `supabase/crm_setup.sql` and `supabase/admin_setup.sql`.

### `user_profiles` fields written by onboarding

`name`, `grad_year`, `flow_type`, `email`, `college`, `major`, `career`, `company`, `location`, `high_school_activities`, `target_colleges`, `target_majors`, `target_careers`, `favorite_classes`, `post_grad_school`, `post_grad_program`, `user_id`.

Two important conventions:

- **`name` stores the *preferred* display name.** Onboarding asks for first name, last name, and an optional nickname; the nickname wins over the first name. Every greeting in the app reads `name.split(' ')[0]`. There is no `preferred_name` column.
- **`post_grad_program` doubles as a JSON blob.** For the alumni flow, `post_grad_school` is the sentinel string `'ALUMNI_METADATA'` and `post_grad_program` holds serialised JSON (grad programs, contact platform/handle, consent flags). For the `recent` flow it holds serialised contact info. Parse defensively.

### `flow_type` values

Derived from graduating class relative to the current year:

| Value | Meaning |
|---|---|
| `student` | Current high-school student. The only role that can request a match. |
| `recent` | Recent graduate |
| `post_schooling` | Alumnus who has finished schooling |
| `established` | Established alumnus / mentor |

`Dashboard` auto-corrects a stale `student` whose graduating year has passed to `post_schooling` and writes the correction back. Directory access is `!isStudent`.

### The 1000-row trap

`selectAll(table, columns, refine)` in `src/utils/supabaseClient.js` pages through with `.range()`. PostgREST silently caps a plain `select()` at 1000 rows with no indication it truncated, so a 1151-row table returns 1000. Use this helper for any query that could exceed 1000 rows.

## Matchmaking (`src/utils/matchingEngine.js`)

`findBestMatch(userProfile)` fetches the candidate pool and returns a match plus the reasons for it. Two paths, chosen by `userProfile.matchType`:

### Algorithmic scorer (`matchType: 'algo'`)

Six weighted dimensions, highest wins:

| Weight | Dimension |
|---|---|
| +45 | Academic major synergy against the student's intended majors |
| +25 | Career / current-position match |
| +18 | Semantic field association (via a `FIELD_ASSOCIATIONS` map) |
| +10 / +5 | University match, exact or same affinity group (`UNIVERSITY_GROUPS`) |
| +5 | Geographic match |
| penalty | Popularity / scarcity, to stop one mentor absorbing every match |

If nothing scores, a fallback branch picks a reasonable candidate rather than failing.

### AI path (`matchType: 'ai'`)

Calls `gemini-2.5-flash` via `generativelanguage.googleapis.com`. Returns a holistic assessment string alongside the match. **Falls back to the algorithmic scorer on server errors**, and the result is flagged `fallbackToAlgo` so the UI can say so.

Note: the Dashboard currently only ever requests `'algo'`. The AI path remains reachable in the engine but nothing in the UI asks for it, because the local scorer needs no API key, no quota, and no network round trip.

### Rate limiting (`src/utils/rateLimiter.js`)

Two matches per rolling 14 days. **Enforced entirely in `localStorage`** under the key `chap_connect_matches` as an array of timestamps. `checkLimit()` gates, `recordMatch()` appends. This is client-side only and trivially bypassable by clearing storage; it is a courtesy limit, not a security control.

## Outreach message (`src/components/OutreachMessage.jsx`)

Generates a subject line and body from templates, client-side, with three tonal registers (casual / formal / coffee-chat) chosen from the shared attributes between student and mentor. When the AI path ran, `matchData.outreachMessage` supplies the body instead. Copy-to-clipboard for subject and body separately.

Note: this file contains a large amount of dead code (roughly ten unused local variables from earlier template iterations). Lint flags them; they are harmless but misleading when reading.

## Admin CRM (`src/pages/AdminCRM.jsx`)

Four tabs: Overview, Contacts, Donations, Trends.

**Dual-mode storage** (`src/utils/crmStore.js`): `initCRM()` tries Supabase; on any error it logs a warning and falls back to `localStorage`, so the CRM always works. `crmMode()` reports `'supabase'` or `'local'`. The "Seed demo data" button only appears in Supabase mode, since local mode seeds itself.

**Analytics** (`src/utils/crmAnalytics.js`) computes, from real records rather than hard-coded copy: giving by five-year cohort, campaign, city, industry, and undergraduate college (with `normalizeCollege` folding name variants); year and month series; payment-method mix; growth rate; donor retention by year; LYBUNT lapsed-donor call lists; and a generated `insights()` summary. Minimum-population thresholds suppress groups too small to be meaningful (a one-person "industry" is a person, not a trend).

Contacts merges `user_profiles` and `mentors`, supports search, source and donor filters, pagination, and CSV export. A contact drawer holds notes, tags, and per-contact donation history.

## Theming

Semantic-token design system in `src/index.css`, documented in `DESIGN.md` with a machine-readable sidecar at `.impeccable/design.json`. Components consume semantic roles (`text-ink`, `bg-canvas`, `bg-action`, `border-rule`) rather than raw palette values, so a theme change remaps tokens without editing components.

There are **two independent axes**, both applied as classes on `<html>` by the pre-paint script in `index.html` so neither flashes:

| Axis | Class | Storage key | Control |
|---|---|---|---|
| Light / dark | `.dark` | `cc_theme` | `ThemeToggle` |
| Colour + type scheme | `.ivy` | `cc_scheme` | `SchemeToggle` |

All four combinations are defined and verified. The scheme axis swaps both the palette and the typeface pair:

- **Chaparral** (default): the **official Eanes ISD brand identity**, applied literally. The logo palette unaltered, with its Pantone lineage recorded in `DESIGN.md`: Eanes Red (PMS 187 C, `#A6192E`) owns primary action, Eanes Navy (PMS 2766 C, `#102047`) is both the body ink and the field, Eanes Blue (PMS 287 C, `#003087`) is the index hue. Campus colours (Bright Gold, Forest Green, Sky Blue) carry semantic signals and chart categories only. Westlake Red and Westlake Blue are Westlake High's own marks and are deliberately absent, since this scheme is the district's.

  Typography follows the district guide, which specifies **Gotham**. Gotham is a commercial Typography.com licence and is not bundled, so the stack is `Gotham, Montserrat, Arial` (Arial being the substitute the guide itself names). **Drop in a licensed Gotham webfont and it takes over with no other change.** **Sanchez**, the slab in the Eanes logo, is on Google Fonts and sets the wordmark via a `.wordmark` class; it ships one weight (400) and is confined to the wordmark for that reason.
- **Ivy**: Newsreader + Inter on a warm cream ground. The warmth stays in the paper; body ink, secondary text and hairlines are all navy, and Ink Navy owns primary action while Westlake Red and Oxblood carry emphasis, heritage marks and the photographic duotone. Gold appears only as the warning signal and the last chart series. The dark form keeps the scheme blue: grounds are the navy carried to near-black and action is a lifted Bright Navy.

`.ivy` remaps semantic roles plus `--font-sans` / `--font-heading`, so no component references the scheme. A small set of `.ivy`-scoped rules handles what a role remap cannot express: serif display weight, italic-serif emphasis, a navy-to-oxblood duotone ground, softer corner radii, and table zebra striping.

Every colour pair in both schemes and both themes is verified by computation, not by eye. All four combinations currently pass: body text at 4.5:1 and controls, marks and chart series at 3:1, on every surface each can land on.

## Known limitations and risks

Ordered by how much they would matter in production.

1. **`/admin` has no access control.** The "Admin sign-in" button on the welcome screen simply calls `navigate('/admin')`. `is_admin` appears nowhere in the client except one code comment. Anyone who knows the URL reaches the CRM, including donor names and gift amounts. `supabase/admin_setup.sql` defines an `is_admin` flag, an `is_admin()` function, and RLS policies, but **the client never checks any of it** - so whether data is actually protected depends entirely on whether that SQL was applied to the live database.
2. **CRM RLS is deliberately open.** `crm_setup.sql` grants `anon` and `authenticated` full read/write on `donations`, `crm_notes`, and `crm_tags`. Its own header says this is fine for a prototype and not secure for real donor data.
3. **The Gemini API key is a `VITE_` variable**, so it is bundled into client-side JavaScript and visible to anyone who opens devtools. Any real deployment needs the AI call proxied server-side.
4. **The guest session bypasses authentication by design.** Any visitor gets a working identity and can write a `user_profiles` row.
5. **Rate limiting is client-side only** (see above).
6. **Match rate limiting and match history live in different places** - the limit in `localStorage`, the history in `student_matches` - so they can disagree across devices.
7. **`src/App.css` is dead** Vite scaffold, never imported.
8. **Pre-existing lint debt**: about 45 ESLint errors, mostly unused `React` imports (the project predates the automatic JSX runtime convention) and the dead template variables in `OutreachMessage.jsx`.

## Directory of note

```
src/
  App.jsx                     routes, guest session, theme mount, intro splash
  index.css                   all design tokens, dark mode, component primitives
  pages/       Dashboard · AdminCRM · MatchPage · Directory · ScrollMorphDemo
  components/  WelcomeScreen · OnboardingFlow · MatchCard · OutreachMessage
               ContactDrawer · DonationModal · Autocomplete · ThemeToggle · IntroSplash
  components/ui/  TabBar · BubbleCursor · ScrollMorphHero · Magnetic · SchemeToggle
  utils/       matchingEngine · crmStore · crmAnalytics · rateLimiter
               supabaseClient · demoDonations · colleges · cn
supabase/      crm_setup.sql · admin_setup.sql
scripts/       seed-donations.mjs
```
