# Driving school dashboard

This workspace contains the original `dashboard.html` and a React + Vite migration. The current app is a **browser-only demo**. Its school switcher separates local sample records; it does not authenticate users or protect tenant data.

## Run the demo

Install Node dependencies with `npm install`, then run `npm run dev`. Use `npm run typecheck`, `npm test`, and `npm run test:ui` for the current checks. The nine screens are rendered through React while the original page and event code remains in `src/legacy.js` as a migration layer.

This workspace currently has a temporary `node_modules` junction to `D:\personal\project\smart-car\node_modules` for local verification. Remove that junction before running `npm install`; the sandbox rejected its cleanup command.

## Server foundation

The Go API and Supabase schema live in the separate [be-jago-nyetir repository](https://github.com/rijalefendi/be-jago-nyetir). Run that service on port 8080 when developing the live workspace. The Vite dev server proxies `/api` to it.

## Shared workspace (in progress)

The app shows the existing local demo when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unset. Copy `.env.example` to `.env.local` and set both values to show the authenticated workspace. Follow the backend repository's setup instructions for the schema and Go service, and enable email sign-up in Supabase Auth. The browser calls `/api` on its own origin; the Vite dev proxy handles this locally. A production frontend must reverse-proxy `/api` to the Go host.

Owners can sign up, create a school, and attach a confirmed staff account by email. Create a school named `Sekolah Demo Jago Nyetir` to enable an idempotent sample-data button. Other schools start empty. Student, package, instructor, vehicle, enrollment, and lesson records use the shared API; the original demo remains a separate local mode.

Instructor backend routes are `GET /api/schools/{school_id}/instructors`, `GET /api/schools/{school_id}/instructors/{id}`, `POST /api/schools/{school_id}/instructors`, `PATCH /api/schools/{school_id}/instructors/{id}`, and `DELETE /api/schools/{school_id}/instructors/{id}`. Send a Supabase access token as `Authorization: Bearer ...`. Create requires `name` and `transmission` (`Matic`, `Manual`, or `Matic & Manual`); optional fields are `active` and `notes`. PATCH accepts any subset of those fields. Deleting an instructor referenced by a lesson returns a foreign key conflict, preserving lesson history. Deactivation or an incompatible transmission change is rejected if the instructor has an upcoming lesson.

For server-paginated instructor lists, request `GET /api/schools/{school_id}/instructors?page=1&page_size=10&search=&sort=name&direction=asc`. The response contains `items`, `total`, `page`, and `pageSize`. Search covers name and notes; sort accepts `name`, `transmission`, or `status`; direction accepts `asc` or `desc`. The API keeps the unpaginated GET response for existing lookup consumers.

For an existing Supabase database created from an earlier schema, follow the migration instructions in the backend repository. Both demo and live instructor screens provide a searchable, sortable, paginated table with create, edit, and confirmed delete actions. The live screen reports a conflict when an instructor is referenced by lesson history.

This is **not yet a production launch**. The Go service still forwards most record operations to Supabase PostgREST, live lesson scheduling has not been tested against a configured Supabase instance, and the live UI needs usability work. Do not treat the local demo as an authenticated service. See `design.md` for the product contract.
