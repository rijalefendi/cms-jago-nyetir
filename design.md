# Design System: Driving School Operations Dashboard

**Project ID:** Local source project; no Stitch project ID is associated with this repository.  
**Visual references:** `src/style.css`. The CSS is authoritative when this document and the implementation differ.  
**Use:** A visual source of truth for new dashboard screens. Interface copy stays in Indonesian; this guide is in English.

## 1. Visual Theme & Atmosphere

A calm, compact operations workspace for driving-school staff. The design should feel dependable and quick to scan during scheduling work. It uses a warm gray canvas, white work surfaces, dark actions, and small yellow brand accents. Tables, agendas, and form controls carry the workload; cards summarize information without turning the interface into a marketing page.

Keep the density of the existing dashboard. Its sidebar stays visible on desktop, the topbar gives location and account context, and the main area puts the next task ahead of secondary information. Avoid decorative gradients, large hero imagery, bright full-color navigation, or motion that slows routine work. Demo content is visibly identified as simulated.

The visual identity is shared by every school. A school can provide its own name and logo; the palette, Montserrat type, geometry, and spacing remain fixed. The provided `radjamengemudi` logo is a school/demo reference asset, not the Jagonyetir platform identity or a template for inventing other school logos. Public authentication screens use the text wordmark **Jagonyetir**, without a new logo symbol or a school's identity.

## 2. Color Palette & Roles

| Descriptive role | Exact color | Use |
|---|---|---|
| Brand yellow | `#FFD21A` | Small identity accents and the current-day marker, with dark text or icons. |
| Soft selection yellow | `#FFF3BE` | Selected navigation, soft action emphasis, and brand chips. |
| Action charcoal | `#212121` | Primary buttons, important text, active markers, chart bars, and focus rings. |
| Charcoal hover | `#363636` | Primary button hover. |
| Muted graphite | `#626464` | Secondary labels and supporting text. |
| Clean white | `#FFFFFF` | Panels, sidebar, controls, and dialog surfaces. |
| Warm canvas | `#F7F6F3` | Workspace behind the white panels. |
| Warm guidance surface | `#FFF9EA` | Contextual notices and sidebar guidance. |
| Quiet divider | `#E7E2D8` | Panel outlines and structural separators. |
| Clear control border | `#8B867D` | Input and control edges that must remain visible. |
| Error red | `#B42318` | Form errors, conflicts, and destructive actions only. |
| Error wash | `#FEF3F2` | Error and destructive-action backgrounds. |
| Success green | `#177245` | Confirmed or completed states. |
| Warning amber | `#946200` | Pending attention and schedule warnings. |
| Information blue | `#2563A6` | Informational states and help. |

Use charcoal for normal primary actions. Yellow signals brand or selection, not a warning. Red never marks ordinary navigation or a normal call to action. Status always has a written label as well as color. Existing soft status backgrounds are `#E5F3E9` for success, `#FFF3BE` for warning, `#EAF1FA` for information, `#FEF3F2` for danger, and `#F0F0EE` for neutral.

## 3. Typography Rules

Montserrat is the identity and UI font, with the existing system sans-serif fallback. The base interface is medium-weight **14px with 1.55 line height**. Preserve the compact hierarchy rather than replacing it with larger marketing typography.

- Page titles are bold and tight: **28px, weight 800**, with slightly negative tracking; **23px** on narrow mobile screens.
- Section titles are **17px, weight 800**; panel titles are **15px, weight 800**. Labels and navigation use smaller, firm weights so the page title remains dominant.
- Metric figures are **30px, weight 800**, using aligned numerals; they reduce to **25px** on narrow screens.
- Sidebar links are **13px** in 45px rows. The small uppercase navigation group labels use wide tracking for separation.
- Table data is **12px** and table headings **11px** in the current implementation. Preserve the existing table rhythm during this design rewrite; review readability before any future change to type size.
- Dates, time ranges, counts, and progress figures should align cleanly. Keep copy specific to the task: `Permintaan baru`, `Jadwal bentrok`, and `Jadwalkan sesi` are clearer than generic CRM language.

## 4. Component Stylings

**App shell and navigation.** The sidebar is flat white with a thin warm divider. Its top shows the fixed **Jagonyetir** platform wordmark, followed by a separate **Sekolah aktif** block with the school's small optional logo, name, and location. The local demo's **Sekolah demo** selector lives in this block with an explicit simulation hint; it is not a live multi-membership switcher. Switching demo schools changes school identity and data context, never the platform wordmark or theme. Active links sit on soft yellow, use dark type, and have a short dark marker on the left. The topbar is nearly opaque white with a light blur and bottom border; show the current page, search, clock, and account without redundant Dashboard/Workspace labels. Mobile keeps the current page visible and school context in the navigation drawer.

**Icons.** Use locally embedded Hugeicons Free Stroke Rounded SVGs in the shared shell sprite, with the existing 18px/16px/22px sizes and inherited dashboard stroke weight. Each navigation destination has a distinct icon; Murid uses Student and Instruktur uses Teacher. Desktop and mobile reuse the same icon for the same destination. Preserve decorative `aria-hidden` icons and visible menu labels. The MIT license ships at `public/licenses/hugeicons.txt`.

**CRUD search.** Show an explicit Hugeicons X button labelled **Hapus pencarian** only while a query is present. Clearing removes only the search text, preserves other filters, restores the result list, and returns focus to the input. Use the same control in React resource tables and legacy Permintaan/Murid screens; hide the native browser clear glyph to avoid duplicate controls.

**Buttons and links.** Primary buttons are charcoal with white text, gently rounded corners (**10px**), and a minimum height of **42px**. Quiet buttons are white with a visible warm border. Soft buttons use selection yellow. Danger buttons use the red error treatment. Inline links are dark, compact, and underline on hover. Press feedback is a subtle 1px movement; keyboard focus remains visible.

**Panels and metrics.** Work panels are white, flat, and softly rounded (**16px**) with a 1px warm divider and no default shadow. Metric panels use the same shape, with **20px** top padding in the desktop layout and a large figure below a small label. Use a two-column work area for agenda and action queue where space allows.

**Tables, records, and scheduling.** Tables have quiet row separators, pale column headers, and generous enough row padding to scan names and status. On narrow screens, use compact record cards in place of the table. The desktop schedule has seven day columns with small bordered event cards; day and list views remain available. On mobile, show the agenda list rather than squeezing the seven-column calendar into the viewport.

**Forms and feedback.** Inputs are white with a distinct **1px `#8B867D` border**, **9px** corners, and at least **43px** height. Focus uses a **3px charcoal outline** with offset. Error text appears with a pale red surface and an explanation. Status badges are small pill shapes with a text label and dot. Empty states explain what is missing and provide the next available action. Demo notices use the warm guidance surface.

Form selects retain native keyboard/mobile behavior, with a custom chevron inset **14px** and **44px** right padding so text never crowds it. Use a subtle warm-gray resting surface, warm hover/focus, and soft-yellow selected options where the browser supports styling the native menu. Invalid fields keep their red surface and chevron; forced-colors mode restores the native arrow.

**Datepicker.** Use the shared `DatePicker` (`src/DatePicker.tsx`), automatically rendered by `Field` with `type: 'date'`; do not build a per-form calendar. Keep the native date input for typing, ISO `YYYY-MM-DD` form values, required/disabled semantics, and inline error/hint associations. Its calendar button opens an Indonesian, Monday-first calendar beneath the input, in normal flow so it cannot be clipped by the scrolling modal or overlap another field. Match the 43px input, 9px corners, warm control border, charcoal focus, white calendar surface, and 12px calendar corners. Use charcoal/white for the selected day, warm yellow hover, muted adjacent-month days, and an underline for today; touch day targets are at least 44px tall. Month controls, `Kosongkan`, and `Hari ini` are explicit buttons. Today follows WITA; dates remain calendar strings without UTC conversion. Arrow keys move by day/week, Home/End by week edge, PageUp/PageDown by month; Enter/Space selects. Escape closes the calendar first, returning focus to its button, without closing the form. Outside pointer/focus closes it; disabling the field closes it too. Pass `min`/`max` as ISO dates when the business rule requires bounds, and keep cross-field validation in the form. Other forms should reuse `Field` or import `DatePicker` with an `id`, `name`, and accessible label; the legacy scheduler is not migrated.

**Time picker.** Use shared `TimePicker` (`src/TimePicker.tsx`) for school operating hours and new time fields, or `Field` with `type: 'time'` for resource forms. Show two independently editable segments, separated by a colon: hours `00–23` and minutes `00–59`. Each accepts manual numeric entry or selection from a dropdown opened by clicking the number or its chevron; reject nonnumeric typing and mixed-text paste without changing the previous value. Keep the full list available while typing. Selecting a number commits that segment and closes the list. Hours and minutes never carry into one another.

The list scrolls continuously in both directions: `23 ↔ 00` for hours and `59 ↔ 00` for minutes. Open with the active number centered so preceding and following values are visible. Hide the gray scrollbar indicator without disabling vertical scrolling, and prevent horizontal scrolling. Arrow Up/Down previews options with wrap-around; Enter commits, Escape dismisses without committing the pending option, and Tab closes without trapping focus. Outside pointer/focus closes the list. Use editable combobox/listbox semantics, visible keyboard focus, and linked error descriptions; visual copies used for looping must not duplicate accessible options.

Match the compact dashboard controls: 44px minimum input/option height, 9px corners, warm control border and resting surface, bold tabular numerals, charcoal focus outline, soft-yellow active option, and charcoal/white selected option. Limit the list to 224px height in normal flow beneath the control. Opening uses a 140ms fade with a 4px upward entrance; the chevron rotates while expanded. Reduced motion removes animation and transitions. Disabled controls, including those inside a disabled fieldset, remain muted and unavailable. Keep the native time input as the named form-value and constraint-validation contract, not as the visible OS picker: preserve `required`/`min`/`max`/`step`, reset behavior, and `HH:MM` values without timezone conversion. Supply `name` and an accessible label. Existing legacy scheduling controls are not migrated.

**School settings validation.** Keep WITA context and cross-field rules in the parent school form. Validate on save, then update feedback as the user corrects fields. Empty names/addresses, missing or invalid time segments, closing times equal to or earlier than opening times, and closing every day group block submission. Mark only the affected fields with `aria-invalid`, red borders/surfaces, and nearby Indonesian error text linked by `aria-describedby`; mark the closing field for invalid time order. When every day group is closed, mark both groups and show one shared explanation. Focus the first invalid field on submit, retain entered values, and clear resolved errors without requiring another save. Use inline feedback rather than native validation tooltips; server/load failures use the existing red form-feedback treatment.

**Dialogs and elevation.** Dialogs are white with **18px** corners and a stronger shadow only while overlaying the workspace. The desktop dialog is centered and capped at **600px** width; mobile dialogs rise from the bottom edge with rounded top corners. Toasts are dark with white text. Focus returns to the invoking control when a dialog closes. Reduced-motion settings remove transitions and animation.

## 5. Layout Principles

The desktop shell uses a **250px sidebar**, a **72px topbar**, and a centered workspace capped at **1504px** with **30px top / 32px side / 70px bottom** padding. The dashboard’s four metrics use a 15px grid gap. The main agenda and action panels use a 20px gap. Section spacing is compact and task-oriented, usually around 20–30px, with smaller gaps inside controls and records.

Responsive behavior follows the existing breakpoints at **1280, 1060, 850, 690, and 355px**. At 1060px, the sidebar narrows to **222px** and the metric grid becomes two columns. At 850px, the topbar becomes **62px**, the sidebar turns into a drawer, and four bottom navigation tabs appear. At 690px, the workspace uses **16px side padding**, headings and metrics step down, tables become record lists, and dialogs use a bottom-sheet arrangement. The 355px rules tighten the smallest labels and controls without changing the visual language.

Keep important targets and text visible without horizontal page overflow. The application spans at least the dynamic viewport height. Do not make essential actions depend on hover. Maintain the existing keyboard focus, skip link, accessible status text, and reduced-motion behavior.

## 6. CRUD Screen Recipe and Reusable Patterns

The design system ships as two layers. **`src/ui.tsx` is the component library** every new React screen should build on: `Icon`, `Button` (primary/quiet/soft/danger, `sm`, optional leading icon), `Badge` (the shared status-to-tone map), `Field` (labelled input/select/textarea with optional hint, uncontrolled), `FormError`, `SearchField`, `Panel`/`PanelHead`, `Metric`, `PageHeading`, `EmptyState`, `Modal` (focus trap, Esc, focus return), `ConfirmDialog`, `BlockedDialog`, `FormModal` (dialog + field config + inline error), `UploadField` (with `compressImage`), `DemoNotice`, and `showToast` (creates the dark toast if the element is absent). On top of it, **`src/resource.tsx` is the CRUD kit**: a `ResourceConfig` (columns, fields, guards) rendered by `DemoResourcePage` (localStorage demo store) or `ServerCrudPage` (async API adapter). The kit is the single implementation used by **both** the demo app and the live workspace for the Instruktur and Mobil screens. The shared styles in `src/style.css` use the `instructor-*` class family as the generic resource-table styles.

**Kit pieces.** A `ResourceConfig` object describes one entity: labels, table columns, form fields, the demo validation guards, and the delete-blocked rule. `DemoResourcePage` renders a config against the local demo store (localStorage via `src/demoStore.mjs`); `ServerCrudPage` renders the same config against an async `fetchPage`/`onSave`/`onDelete` adapter (live API). Both share the view components: search toolbar, sortable table with icon actions, pagination footer, empty state, `FormModal` (with the optional image-upload field), `ConfirmDialog`, and `BlockedDialog`. Client-side search/sort/pagination use the generic `instructorTablePage()` helper from `src/instructorTable.mjs`; the same helper can page a plain API list client-side when the backend has no paginated endpoint.**Adding a similar menu.** Write a new `ResourceConfig`, render it through `DemoResourcePage` (demo) and/or `ServerCrudPage` (live), and register the page route. Do not fork the table, dialogs, or form markup. Screens that are not resource lists (Jadwal, Ringkasan, Pengaturan) still render through `src/legacy.js` as the migration layer; the shell, routing, and legacy modals stay there. Cross-boundary events keep the two worlds in sync: `demo-data-changed` (store mutation), `demo-toast` (feedback), `resource-edit` (open a form from a legacy dialog), and `resources-reload` (refetch after external changes).

**Dialog rules.** Create and edit use the modal form: Batal (quiet) + Simpan (primary). Instruktur/Mobil follow auth validation timing: quiet initial input/empty blur, inline field errors after nonempty blur or submit, clearing only the edited error when corrected. Use the shared red field border/background and small error text, with `aria-invalid`/`aria-describedby`; submit focuses the first invalid field, blur never moves focus. General service errors use the auth-style error surface near Simpan, without duplicating field errors. Focus moves to the first field on open, returns to the invoking control on close, Esc closes, and Tab is trapped inside. Destructive actions use a two-step confirm with `btn-danger` (title `Hapus <entity>?`, record name as description). When a record is referenced by history, deletion is blocked: show an explanatory dialog with a single Tutup button instead of a confirm, and never offer a cascade delete of session history.

**Paket (local demo).** The Paket menu uses the same resource-list CRUD kit, replacing the static example catalog. Fields follow `packages` in `schema.sql`: name, optional description, positive integer total_sessions, active status, required normal_price, and optional discount_price/start_discount/end_discount. Prices are rupiah amounts with at most two decimal places, matching numeric(10,2); zero is valid. A discount requires all three fields, a price strictly below normal_price, and end_discount strictly after start_discount. Date fields are calendar dates, not timestamps: use WITA, starting at 00:00 on start_discount and including all of end_discount. Outside that window, always use normal_price. Keep expired promotion fields for history rather than deleting them, show scheduled/active/expired text, and strike through the normal price only while the discount is active. Refresh prices at midnight WITA and when returning to the tab. Legacy records without a price show `Harga belum diisi` until edited; never invent their price. Fixture prices remain labeled simulations, not official offers. Description is plain multiline text: preserve line breaks, typed bullets, and numbering without interpreting HTML or Markdown. Search covers names/descriptions, and session counts sort numerically. Keep data school-scoped in localStorage and label it demo. Block deletion for packages referenced by demo students, including completed students; deactivation is allowed, and editing a package never rewrites a student's existing session allowance or historical package label. Database/API wiring remains separate; schema constraints here are reference definitions, not deployed migrations. Production effective prices must be calculated and checked by the server using its clock, never trusted from the browser.

**Paket form.** Pair normal/discount price in one row and start/end discount dates in the next within the existing two-column form; preserve the single-column mobile layout. Currency inputs use Indonesian thousands separators (`800.000`, `40.000`) and optional comma decimals (`800.000,50`); convert them back to unformatted numeric values before validation/storage. Both date inputs are disabled and not required when the discount price is empty; any supplied discount price, including zero, enables and requires both dates. Clearing the discount price removes all three promotion values on save, without requiring users to clear disabled dates manually.

**Edit guards.** Before saving an edit, check the fields other records depend on: a transmission change must not strand recorded sessions, and deactivation must not orphan upcoming sessions. Show known demo conflicts beneath Kompetensi/Transmisi or Status, in Indonesian, naming the blocking reason. These guards mirror the database triggers (`guard_instructor_schedule`, `guard_vehicle_schedule`), so demo and live fail the same way. Server errors without a reliable field mapping remain near Simpan; destructive failures (for example a foreign-key conflict on delete) appear in a page-level red action-error banner.

**Error and feedback surfaces.** Field-level problems appear inline in the dialog (`form-error`); successful demo actions confirm with the dark toast; live list-loading failures get a red bordered block with a Coba lagi button and a `Memuat …` status while fetching. Never use `alert()`.

**Image upload pattern (vehicle photos).** One optional photo per record. The control is a dashed upload box inside the modal form: a quiet **Pilih foto** button (the native file input stays visually hidden but keyboard-focusable, with a visible focus ring on the button), format/size hint, preview (132×88), and a Hapus foto button. Validation: JPG/PNG/WebP only, max 8 MB raw, then client-side canvas compression to ≤800px JPEG ≤200 KB. Demo mode stores the compressed data URL on the record; live mode uploads to the public `vehicle-photos` Supabase Storage bucket under `{school_id}/{vehicle_id}.{ext}` and saves the public URL in `vehicles.image_url` (backend wiring pending). Table thumbnails are 52×38 cover crops with a car-icon fallback when no photo exists.

**Checklist before building a new screen.** Decide: (1) the screen's purpose and its single primary action; (2) nav placement (MENU UTAMA, PENGELOLAAN, or LAINNYA) remembering the four mobile bottom tabs are fixed; (3) the record shape and which states it needs (empty, filtered-empty, loading, error, demo notice); (4) whether a `ResourceConfig` covers it — only write new markup when it does not.

## Product Boundaries for New Screens

The nine existing areas are Ringkasan, Permintaan, Jadwal, Murid, Instruktur, Mobil, Paket, Laporan, and Pengaturan. Preserve their operational hierarchy and Indonesian labels when extending the UI. The live school-profile page is named **Pengaturan Sekolah**; the planned owner-only **Staf** menu belongs under PENGELOLAAN. Demo figures, package names, business hours, and schedule records are examples and must remain labeled as such.

The app has separate local-demo and in-progress live paths. Demo school switching separates local sample records but does not authenticate or authorize a user. The live foundation uses Supabase Auth, a Go API that checks membership on each school request, and school-scoped PostgreSQL records; this is not a production-readiness claim. In v1, one account has at most one school membership, including staff. Do not offer a live school switcher. Scheduling and operating hours use **Asia/Makassar (WITA)**, not a configurable time zone per school. Server-side scheduling must reject overlapping use of a student, instructor, or car before a session is confirmed.

Public booking, payments, SIM processing, and automatic WhatsApp ingestion are outside the current dashboard. A manually recorded inquiry is not a confirmed booking. Design new states around that distinction rather than presenting unverified availability or metrics as real.

## 7. Authentication and School Access Specification

**Status and sources.** Stage 1 email auth, session handling, and the school-profile gate are implemented in the frontend; target-project email delivery and server authorization still require integration verification. Existing-school editing remains dependent on the server membership-role contract below. Stages 2–3 remain planned. `docs/frontend-auth.md` is the available frontend/backend integration contract dated 10 November 2026. The local `schema.sql` is a reference for data rules, not proof that migrations have been deployed. The backend repository remains the schema/RLS/migration source of truth; do not copy, modify, or execute schema from the frontend as part of auth integration. Keep demo behavior separate.

### 7.1 Shared auth presentation

- Put the **Jagonyetir** text wordmark above each auth form. Use Montserrat, the warm gray canvas, white panels, charcoal primary buttons, and small yellow accents from the existing styles. Do not introduce a symbol logo, marketing hero, school logo, sidebar, or dashboard navigation on public auth screens.
- Use Indonesian headings and actions: **Masuk**, **Daftar akun**, **Verifikasi email**, **Lupa password**, and **Reset password**. The login screen is shared by owners and staff; school identity appears only after access context is known.
- Reuse the existing labelled fields, buttons, panels, focus treatment, and inline errors. Provide a visible primary action, loading/success/error text, and prevent duplicate submissions. Keep forms usable on mobile and by keyboard; do not rely on placeholders, color, or hover alone.
- Login/signup validation stays quiet on first input and empty blur. Validate nonempty fields on blur without moving focus; keep existing field errors until corrected, clearing them as soon as input becomes valid. On submit (including Enter), validate every field and focus the first invalid input. Server errors appear only after submission; switching auth modes clears errors.
- Show validation and field-specific server errors only beside their fields, without a duplicate summary below the title. Put general service/session errors near submit. Always show an accessible password-visibility button in login/signup. Signup has a live “Minimal 8 karakter” checkmark: gray initially, red when invalid after validation, green when met (not a guarantee that all server password policies are satisfied). Below login submit, use “Belum punya akun? Daftar gratis”.

### 7.2 Stage 1: email auth and session bootstrap

Owners register themselves with email and password. Staff access is provisioned through the invitation flow in stage 3, not by assuming every newly registered account is staff or already belongs to a school.

- Use one Supabase browser client for signup, password login, session restore/events, and logout, following the handoff. Use the existing client if present; otherwise use `@supabase/supabase-js`. Replace the current manual `school-token` storage when implementing this stage; do not maintain parallel token storage or refresh logic.
- Follow the handoff's public configuration names (`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`) and allowed callback URLs. Coordinate the existing `VITE_SUPABASE_ANON_KEY` consumers during implementation. Never place service-role/secret keys, database credentials, or auth tokens in logs or analytics.
- Register without a session shows **Periksa email untuk memverifikasi akun**, not the dashboard. `/auth/callback` completes email confirmation according to the chosen SDK flow; bootstrap only after a session exists. Without a session, return to Masuk; invalid or expired links show an actionable error instead of indefinite loading.
- Restore the session before choosing a route. Auth listeners update state and unsubscribe on cleanup; run bootstrap separately rather than awaiting Supabase calls inside the listener. Use the latest session token for Go API requests.
- Call `GET /api/schools` when the authenticated user is first established or changes, after school creation/update, or when access context must be reloaded; not on every page change or token-refresh event.
- Development-only `VITE_AUTH_DASHBOARD_PREVIEW=true` may show the existing labeled local demo after a Supabase session is established, without calling the Go API or inferring live membership/setup status. Production ignores this flag; live errors never automatically fall back to demo.

| Bootstrap result | Live destination |
| --- | --- |
| No session | Masuk |
| Restoring session or loading school context | Loading; no operational content or login redirect flash |
| HTTP 200 with `[]` | Pengaturan Sekolah in create mode |
| School with `setup_complete: false` | Pengaturan Sekolah in completion mode |
| School with `setup_complete: true` | Dashboard, or the authorized requested page |
| Failed request | Error with Coba lagi; never treat failure as no school |

Logout/session end clears business data and school context. Cancel or ignore stale requests so responses from a previous account cannot populate a new account's state. A browser session is not server authorization.

### 7.3 Pengaturan Sekolah and the setup gate

Use one profile page, not separate competing onboarding and Settings forms. For an account without a school, save the complete profile with `POST /api/schools`; creation also creates the owner membership. Do not create a draft school at signup. For an existing incomplete school, read `GET /api/schools/{school_id}/settings` and save the complete profile with PUT to the same path.

**Required profile.** Name and address (`location`) must contain non-whitespace text. Supply both weekday (Monday-Friday) and weekend (Saturday-Sunday) groups. Each group is either closed without times or open with valid same-day `HH:MM` opening/closing times where open < close; at least one group must open. Display WITA as fixed context, not a selector. Logo is not a completion requirement. Split shifts, overnight hours, and special holidays are outside v1.

The demo/preview Pengaturan menu reuses this profile form, with a clearly labeled local simulation of completion status. Remove the old integration/data and important-rules cards, WhatsApp/service-type fields, and generic local-hours form. Preview saves remain school-scoped in browser storage and never verify live access. IDs, timestamps, roles, and generated `setup_complete` are not editable fields.

Follow the handoff's payload and response shapes: POST/PUT send nested `weekday`/`weekend` groups and return a JSON string UUID, not a school object. GET Settings returns an array with flat hours fields; convert `HH:MM:SS` to `HH:MM` for form inputs. Do not send `setup_complete`, `user_id`, or `role`; the Settings school ID comes from the authorized route. Preserve inputs on failure, including operating-hour conflicts with upcoming sessions.

**Access rules.** The database computes `setup_complete`; the frontend must not infer it from filled inputs, a successful save, or cached local flags.

| Access context | Available UI |
| --- | --- |
| Authenticated, no school | Complete-profile create form; operational navigation locked |
| Incomplete school, owner | Editable Pengaturan Sekolah; all other menus locked, including Staf |
| Incomplete school, staff | Read-only Pengaturan Sekolah and **Owner perlu melengkapi data sekolah**; operational navigation locked |
| Complete school, owner | Operational menus, editable Pengaturan Sekolah, and Staf once its backend contract exists |
| Complete school, staff | Operational menus and read-only Pengaturan Sekolah; no Staf management |
| Role unavailable | Do not assume owner or enable owner-only actions; show that access context could not be loaded, with Coba lagi |

- While setup is incomplete, keep other navigation entries visible but non-activatable, with the visible explanation **Lengkapi data sekolah terlebih dahulu**. Keep Pengaturan Sekolah and Keluar available. Apply the same gate to mobile navigation; the locked menu list must not bypass role restrictions.
- Expose locked state and its reason to keyboard and assistive-technology users; do not rely on a hover tooltip. Guard routes and data loading as well as clicks: deep links and Back/Forward cannot render operational pages or fetch their data while setup is incomplete.
- After a successful POST/PUT, reload school context. Only an authoritative `setup_complete: true` unlocks permitted menus. Stay on Pengaturan Sekolah and show success; do not force navigation away. If saving or reloading fails, keep menus locked and provide a retry path.
- If the API later reports `403` with `code: "school_setup_required"`, invalidate operational access and route to Pengaturan Sekolah without logging out. Frontend gating supplements Go authorization and database RLS; it does not replace them.

**Role contract dependency (proposed, not available).** Extend each school object in `GET /api/schools` with `role: "owner" | "staff"` for the authenticated user's membership in that school. It is not a global user role and must be derived server-side. The current handoff does not expose this field. Do not infer it from email, `user_metadata`, or frontend state; complete owner/staff presentation depends on the backend addition.

**Error behavior.** Follow the handoff's error shapes and bounded retry rules. For a bootstrap GET returning 401, check/refresh through the SDK and retry at most once; persistent failure offers login again without a loop. A 401 can also indicate an upstream auth failure. Other 403 responses show denied access without automatic logout. Validation/conflict errors retain form input; network/502 errors offer Coba lagi. Do not automatically retry writes after an uncertain network outcome.

### 7.4 Stage 2: password recovery

Specify Supabase Auth recovery separately from stage 1's available handoff; no Go password database or custom password-reset endpoint is needed.

- **Lupa password** accepts an email and shows a neutral confirmation that does not reveal whether an account exists. Document the required recovery email and allowed redirect configuration before integration.
- A valid recovery callback enters **Reset password**, not ordinary school bootstrap. Collect the new password and confirmation, validate their match and the configured auth password policy, and display success only after Supabase accepts the update.
- Invalid, expired, or already-consumed links never grant access; provide an explanation and a way to request another recovery email. On success, return to the normal login/session bootstrap flow rather than inventing school access.
- Recovery changes credentials only; it must not create or alter a school membership.

### 7.5 Stage 3: owner-only staff invitations

Add **Staf** under PENGELOLAAN for owners. It follows the setup gate: even owners cannot access it before school completion. Staff cannot open its page or call its management API.

The page contains an email invitation form, active staff list, and invitation statuses **Menunggu**, **Diterima**, and **Kedaluwarsa**. Show submission/loading/success/error states without claiming that sending an invitation has already activated membership.

**Backend contract dependency (not available).** Define authorized invitation creation/email delivery, staff/status listing, and invitation acceptance for both new and existing accounts before implementation. The legacy direct-add members endpoint grants access to a verified account immediately and must not substitute for pending invitation acceptance. Do not invent working endpoints or expose privileged Supabase credentials in the browser.

- The recipient opens an invitation magic link and explicitly confirms joining before membership becomes active. New staff set a password during activation for subsequent email/password login; existing accounts retain their password.
- Finish or reject the invitation flow before ordinary school bootstrap, so an invited user with no membership is not mistakenly directed to create a school. An expired, invalid, wrong-account, or consumed invitation must not activate membership.
- Enforce one account/one school during acceptance, including concurrent requests. An account already attached to another school cannot gain a second membership; frontend checks alone are insufficient.
- Role changes, revoking staff access, canceling invitations, social login, and a new logo design are outside this version.

### 7.6 Acceptance and delivery checks

For implementation, verify signup without a session, email confirmation, invalid/expired callbacks, wrong credentials, session restore on reload/deep links, and logout/account-switch cache cleanup. Verify successful empty bootstrap versus network failure, both school-profile save modes and their string-UUID responses, incomplete-school routing, and bounded 401/403 handling.

Exercise the setup gate before and after authoritative reload: visible locked menus, keyboard/mobile states, direct routes and Back/Forward, no premature operational fetches, save/reload failure, setup-required responses, and owner versus staff permissions. A complete school unlocks only role-permitted menus; an absent role never enables owner-only actions.

Verify recovery errors/success without membership changes; invitation acceptance for new/existing accounts, invalid/expired/wrong-account links, and rejection of second-school membership. Confirm the public bundle contains no privileged secrets and auth screens contain no school/demo branding.

For this documentation-only change, review the diff and consistency with the handoff/schema; no application tests, build, or browser run is required. Later integration must test against the target Supabase project and deployed Go contract, including email delivery and tenant isolation. Local documentation/schema inspection does not verify that environment.
