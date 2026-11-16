import React, { useEffect, useRef, useState } from "react";
import { IconSprite } from "./IconSprite";
import type { School } from "./auth";
import { Icon } from "./ui";
import { BrandIcon } from "./BrandIcon";

const groups = [
  {
    label: "MENU UTAMA",
    items: [
      ["home", "Beranda", "layout"],
      ["sessions", "Jadwal", "calendar"],
      ["students", "Murid", "student"],
    ],
  },
  {
    label: "PENGELOLAAN",
    items: [
      ["instructors", "Instruktur", "teacher"],
      ["vehicles", "Mobil", "car"],
      ["packages", "Paket", "package"],
    ],
  },
];

export function DashboardShell({
  school,
  demo,
  page,
  onNavigate,
  locked = false,
  loggingOut,
  onLogout,
  children,
}: {
  school: School | null;
  demo?: { id: string; timeZone: string; schools: readonly { id: string; name: string }[]; onChange: (id: string) => void };
  page: string;
  onNavigate: (page: string) => void;
  locked?: boolean;
  loggingOut: boolean;
  onLogout?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState("");
  const toggle = useRef<HTMLButtonElement>(null);
  const title =
    page === "reports" ? "Laporan" : demo && page === "home" ? "Ringkasan" : page === "settings"
      ? "Pengaturan Sekolah"
      : groups
          .flatMap((group) => group.items)
          .find((item) => item[0] === page)?.[1] || "Memuat sekolah";
  function close() {
    setOpen(false);
    toggle.current?.focus();
  }
  function navigate(next: string) {
    setOpen(false);
    document.getElementById("main")?.focus();
    onNavigate(next);
  }
  useEffect(() => {
    function update() {
      setClock(
        new Intl.DateTimeFormat("id-ID", {
          timeZone: demo?.timeZone || "Asia/Makassar",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date()) + (demo?.timeZone === "Asia/Jakarta" ? " WIB" : " WITA"),
      );
    }
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [demo?.timeZone]);
  useEffect(() => {
    document.title = `${title} | ${school?.name || "AturSetir"}`;
  }, [title, school?.name]);
  useEffect(() => {
    if (!open) return;
    const links = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        "#sidebar button:not(:disabled)",
      ),
    );
    links[0]?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab" && links.length) {
        const first = links[0],
          last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  const link = (key: string, label: string, icon: string, mobile = false) => (
    <button
      type="button"
      key={key}
      className={`${mobile ? "mobile-tab" : "nav-link"}${page === key ? " active" : ""}`}
      data-live-page={demo ? undefined : key}
      data-page={demo ? ({home:"dashboard",sessions:"jadwal",students:"murid",instructors:"instruktur",vehicles:"mobil",packages:"paket",reports:"laporan",settings:"pengaturan"} as Record<string,string>)[key] : undefined}
      aria-current={page === key ? "page" : undefined}
      disabled={locked && key !== "settings" && key !== "inbox"}
      aria-describedby={
        locked && key !== "settings" && key !== "inbox" ? "setup-reason" : undefined
      }
      onClick={() => navigate(key)}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#main">
        Lewati navigasi
      </a>
      <IconSprite />
      <div className="app">
        <div className={`scrim${open ? " open" : ""}`} onClick={close} />
        <aside
          className={`sidebar${open ? " open" : ""}`}
          id="sidebar"
          aria-label="Navigasi dashboard"
        >
          <div className="brand">
            <div id="brandWord" className="brand-word platform-wordmark"><BrandIcon />AturSetir</div>
            <div className="brand-caption">Operasional kursus mobil</div>
          </div>
          <section className="school-context" aria-label="Konteks sekolah">
            <div className="school-context-label">Sekolah aktif</div>{demo && <label className="school-picker"><span>Sekolah demo</span><select id="schoolPicker" value={demo.id} onChange={e => demo.onChange(e.target.value)}>{demo.schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
            <div className="school-identity">
              {demo && <img className="brand-logo" alt="" hidden />}<div className="school-copy">
                <div id="schoolName" className="school-name">
                  {school?.name || "Sekolah Anda"}
                </div>
                <div id="schoolLocation" className="brand-caption">
                  {school?.location || "Lengkapi profil sekolah"}
                </div>
              </div>
            </div>
          </section>
          <nav aria-label="Menu utama">
            <div className="live-nav">
              {groups.map((group) => (
                <div className="nav-group" key={group.label}>
                  <div className="nav-title">{group.label}</div>
                  {group.items.map(([key, label, icon]) =>
                    link(key, label, icon),
                  )}
                </div>
              ))}
            </div>
            <div className="nav-group">
              <div className="nav-title">LAINNYA</div>
              {demo && link("reports", "Laporan", "chart")}
              {!demo && link("inbox", "Inbox Undangan", "message")}
              {!demo && school?.role === "owner" && school.setup_complete && link("invitations", "Staff", "users")}
              {(demo || !school || school.role === "owner") && link("settings", "Pengaturan", "settings")}
            </div>
          </nav>
        </aside>
        <div className="app-body">
          <header className="topbar">
            <div className="topbar-left">
              <button
                ref={toggle}
                type="button"
                className="mobile-menu-btn"
                aria-label={open ? "Tutup menu" : "Buka menu"}
                aria-controls="sidebar"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
              >
                <Icon name="menu" extra="lg" />
              </button>
            </div>
            <div className="topbar-right">
              <span id="headerClock" className="header-clock">{clock}</span>
              {(!demo || onLogout) && <button
                type="button"
                className="btn btn-danger"
                disabled={loggingOut}
                onClick={onLogout}
              >
                <Icon name="logout" extra="sm" />
                {loggingOut ? "Memproses..." : "Keluar"}
              </button>}
            </div>
          </header>
          <main id="main" className="workspace" tabIndex={-1}>
            {children}
          </main>
        </div>
        <nav className="mobile-bottom" aria-label="Navigasi cepat mobile">
          {link("home", "Beranda", "layout", true)}
          {link("sessions", "Jadwal", "calendar", true)}
          {link("students", "Murid", "student", true)}
          {(demo || !school || school.role === "owner") && link("settings", "Pengaturan", "settings", true)}
        </nav>
      </div>
    </div>
  );
}
