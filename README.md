# Driving school dashboard

This workspace contains a React + Vite app with a **browser-only demo** and a separately configured live workspace. The demo school switcher separates local sample records; it does not authenticate users or protect tenant data.

## Run the demo

Install Node dependencies with `npm install`, then run `npm run dev`. Use `npm run typecheck`, `npm test`, and `npm run test:ui` for the current checks. The screens render through React; non-CRUD screens still go through the legacy page and event code in `src/legacy.js` as a migration layer, while the Instruktur and Mobil CRUD screens are shared React components in `src/resource.tsx` used by both the demo and live workspaces. The UI checks need `jsdom`; it is pinned to `jsdom@25` because Node 22.5 cannot `require()` the ESM-only dependencies of jsdom 26+.

## Server foundation

The Go API and Supabase schema live in the separate [be-jago-nyetir repository](https://github.com/rijalefendi/be-jago-nyetir). Run that service on port 8080 when developing the live workspace. The Vite dev server proxies `/api` to it.

## Shared workspace (in progress)

The app shows the existing local demo when Supabase configuration is unset. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to show the authenticated workspace. The legacy `VITE_SUPABASE_ANON_KEY` is accepted as a fallback during migration. Partial configuration shows an error rather than silently entering demo mode. Use only a public publishable/anon key, never a secret/service-role key. Follow the backend repository's setup instructions for the schema and Go service. The browser calls `/api` on its own origin; the Vite dev proxy handles this locally. A production frontend must reverse-proxy `/api` to the Go host.

Email signup/login, confirmation callback, session restore/refresh, and logout use one Supabase SDK client. Enable email/password signup and Confirm Email in the target project, configure production Site URL, and allow `http://localhost:5173/auth/callback` plus the production equivalent in Redirect URLs. Hosting must serve the SPA at `/auth/callback`. Set up SMTP for production and verify actual email delivery; local tests do not verify project configuration.

After login, `GET /api/schools` determines access: an empty successful list opens school creation, an incomplete school locks operations behind Pengaturan Sekolah, and a complete school opens operations. School profiles include required name/address and weekday/weekend hours in WITA. Saves reload server context; failures never create a school automatically or retry a write. The SDK owns token persistence; old manually stored `school-token` values are no longer used. Existing sessions from that implementation must sign in again.

To preview the dashboard before the Go API is ready, set `VITE_AUTH_DASHBOARD_PREVIEW=true` in `.env.local` and restart `npm run dev`. Supabase login/session restoration still runs, but authenticated users see the existing local demo with simulated data and no `/api` requests. No real school membership or setup status is inferred. Set it back to `false` to test the live API flow. This flag is ignored in production builds.

Existing school settings are read-only unless the server returns membership `role: "owner"` in the schools response. The current backend handoff does not supply that field, so completing/editing an existing school remains blocked until that contract is added. Roles are never inferred from email or auth metadata. Staff invitations and password recovery are deferred; the legacy direct-add-staff form is not an invitation flow and is no longer exposed.

Create a school named `Sekolah Demo Jago Nyetir` to enable an idempotent sample-data button. Other schools start empty. Student, package, instructor, vehicle, enrollment, and lesson records use the shared API; the original demo remains a separate local mode. `npm run test:auth` exercises auth/access UI with a mock SDK; `npm run test:ui` also runs demo and live instructor regression checks.

Instructor backend routes are `GET /api/schools/{school_id}/instructors`, `GET /api/schools/{school_id}/instructors/{id}`, `POST /api/schools/{school_id}/instructors`, `PATCH /api/schools/{school_id}/instructors/{id}`, and `DELETE /api/schools/{school_id}/instructors/{id}`. Send a Supabase access token as `Authorization: Bearer ...`. Create requires `name` and `transmission` (`Matic`, `Manual`, or `Matic & Manual`); optional fields are `active` and `notes`. PATCH accepts any subset of those fields. Deleting an instructor referenced by a lesson returns a foreign key conflict, preserving lesson history. Deactivation or an incompatible transmission change is rejected if the instructor has an upcoming lesson.

For server-paginated instructor lists, request `GET /api/schools/{school_id}/instructors?page=1&page_size=10&search=&sort=name&direction=asc`. The response contains `items`, `total`, `page`, and `pageSize`. Search covers name and notes; sort accepts `name`, `transmission`, or `status`; direction accepts `asc` or `desc`. The API keeps the unpaginated GET response for existing lookup consumers.

For an existing Supabase database created from an earlier schema, follow the migration instructions in the backend repository. Both demo and live instructor screens provide a searchable, sortable, paginated table with create, edit, and confirmed delete actions. The live screen reports a conflict when an instructor is referenced by lesson history.

The demo and live Instruktur and Mobil screens share the React resource kit in `src/resource.tsx`: a `ResourceConfig` (columns, fields, guards) rendered by `DemoResourcePage` against localStorage or by `ServerCrudPage` against the API. Add a similar CRUD menu by writing a new config instead of forking the markup. The demo Mobil form includes an optional photo (compressed to a small JPEG data URL in localStorage); the live vehicle form omits photo upload and delete until the Go backend accepts `image_url` and vehicle deletes — `schema.sql` already provisions the column and the school-scoped `vehicle-photos` storage bucket.

This is **not yet a production launch**. The Go service still forwards most record operations to Supabase PostgREST, live lesson scheduling has not been tested against a configured Supabase instance, and the live UI needs usability work. Do not treat the local demo as an authenticated service. See `design.md` for the product contract.
