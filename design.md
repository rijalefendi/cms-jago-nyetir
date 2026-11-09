# Design System: Driving School Operations Dashboard

**Project ID:** Local source project; no Stitch project ID is associated with this repository.  
**Visual references:** `dashboard.html` and `src/style.css`. The CSS is authoritative when this document and the implementation differ.  
**Use:** A visual source of truth for new dashboard screens. Interface copy stays in Indonesian; this guide is in English.

## 1. Visual Theme & Atmosphere

A calm, compact operations workspace for driving-school staff. The design should feel dependable and quick to scan during scheduling work. It uses a warm gray canvas, white work surfaces, dark actions, and small yellow brand accents. Tables, agendas, and form controls carry the workload; cards summarize information without turning the interface into a marketing page.

Keep the density of the existing dashboard. Its sidebar stays visible on desktop, the topbar gives location and account context, and the main area puts the next task ahead of secondary information. Avoid decorative gradients, large hero imagery, bright full-color navigation, or motion that slows routine work. Demo content is visibly identified as simulated.

The visual identity is shared by every school. A school can provide its own name and logo; the palette, Montserrat type, geometry, and spacing remain fixed. The provided `radjamengemudi` logo is the current reference asset, not a template for inventing other school logos.

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

**App shell and navigation.** The sidebar is flat white with a thin warm divider. Active links sit on soft yellow, use dark type, and have a short dark marker on the left. The topbar is nearly opaque white with a light blur and bottom border. Keep the school selector visually aligned with existing controls; switching schools changes identity and data context, not the theme.

**Buttons and links.** Primary buttons are charcoal with white text, gently rounded corners (**10px**), and a minimum height of **42px**. Quiet buttons are white with a visible warm border. Soft buttons use selection yellow. Danger buttons use the red error treatment. Inline links are dark, compact, and underline on hover. Press feedback is a subtle 1px movement; keyboard focus remains visible.

**Panels and metrics.** Work panels are white, flat, and softly rounded (**16px**) with a 1px warm divider and no default shadow. Metric panels use the same shape, with **20px** top padding in the desktop layout and a large figure below a small label. Use a two-column work area for agenda and action queue where space allows.

**Tables, records, and scheduling.** Tables have quiet row separators, pale column headers, and generous enough row padding to scan names and status. On narrow screens, use compact record cards in place of the table. The desktop schedule has seven day columns with small bordered event cards; day and list views remain available. On mobile, show the agenda list rather than squeezing the seven-column calendar into the viewport.

**Forms and feedback.** Inputs are white with a distinct **1px `#8B867D` border**, **9px** corners, and at least **43px** height. Focus uses a **3px charcoal outline** with offset. Error text appears with a pale red surface and an explanation. Status badges are small pill shapes with a text label and dot. Empty states explain what is missing and provide the next available action. Demo notices use the warm guidance surface.

**Dialogs and elevation.** Dialogs are white with **18px** corners and a stronger shadow only while overlaying the workspace. The desktop dialog is centered and capped at **600px** width; mobile dialogs rise from the bottom edge with rounded top corners. Toasts are dark with white text. Focus returns to the invoking control when a dialog closes. Reduced-motion settings remove transitions and animation.

## 5. Layout Principles

The desktop shell uses a **250px sidebar**, a **72px topbar**, and a centered workspace capped at **1504px** with **30px top / 32px side / 70px bottom** padding. The dashboard’s four metrics use a 15px grid gap. The main agenda and action panels use a 20px gap. Section spacing is compact and task-oriented, usually around 20–30px, with smaller gaps inside controls and records.

Responsive behavior follows the existing breakpoints at **1280, 1060, 850, 690, and 355px**. At 1060px, the sidebar narrows to **222px** and the metric grid becomes two columns. At 850px, the topbar becomes **62px**, the sidebar turns into a drawer, and four bottom navigation tabs appear. At 690px, the workspace uses **16px side padding**, headings and metrics step down, tables become record lists, and dialogs use a bottom-sheet arrangement. The 355px rules tighten the smallest labels and controls without changing the visual language.

Keep important targets and text visible without horizontal page overflow. The application spans at least the dynamic viewport height. Do not make essential actions depend on hover. Maintain the existing keyboard focus, skip link, accessible status text, and reduced-motion behavior.

## Product Boundaries for New Screens

The nine existing areas are Ringkasan, Permintaan, Jadwal, Murid, Instruktur, Mobil, Paket, Laporan, and Pengaturan. Preserve their operational hierarchy and Indonesian labels when extending the UI. Demo figures, package names, business hours, and schedule records are examples and must remain labeled as such.

The current React app is a browser-only demo. School switching separates local sample records but does not authenticate or authorize a user. A real multi-tenant release uses Supabase Auth, a Go API that checks membership on each school request, and school-scoped PostgreSQL records. Staff may belong to multiple schools. Each school supplies its IANA time zone; dates and times display in that school's local zone. Server-side scheduling must reject overlapping use of a student, instructor, or car before a session is confirmed.

Public booking, payments, SIM processing, and automatic WhatsApp ingestion are outside the current dashboard. A manually recorded inquiry is not a confirmed booking. Design new states around that distinction rather than presenting unverified availability or metrics as real.
