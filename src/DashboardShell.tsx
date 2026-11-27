import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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

const SidebarState = createContext<[boolean, React.Dispatch<React.SetStateAction<boolean>>] | null>(null);
export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const state = useState(false);
  return <SidebarState.Provider value={state}>{children}</SidebarState.Provider>;
}

export function DashboardShell({
  school,
  demo,
  page,
  userEmail,
  onNavigate,
  locked = false,
  loggingOut,
  onLogout,
  children,
}: {
  school: School | null;
  demo?: { id: string; schools: readonly { id: string; name: string }[]; onChange: (id: string) => void };
  page: string;
  userEmail?: string;
  onNavigate: (page: string) => void;
  locked?: boolean;
  loggingOut: boolean;
  onLogout?: () => void;
  children: React.ReactNode;
}) {
  const roleLabel = demo ? undefined : school?.role === "owner" ? "Owner" : school?.role === "staff" ? "Staff" : undefined;
  const accountInitial = userEmail?.slice(0, 1).toUpperCase();
  const [open, setOpen] = useState(false);
  const localSidebarState = useState(false);
  const [collapsed, setCollapsed] = useContext(SidebarState) ?? localSidebarState;
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
    document.title = `${title} | ${school?.name || "AturSetir"}`;
  }, [title, school?.name]);
  useEffect(() => {
    if (!open) return;
    const links = Array.from(
      document.querySelectorAll<HTMLElement>(
        "#sidebar button:not(:disabled), #sidebar select:not(:disabled), #sidebar a[href]",
      ),
    );
    const visible = links.filter(element => element.getClientRects().length > 0);
    visible[0]?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab" && visible.length) {
        const first = visible[0],
          last = visible[visible.length - 1];
        if (event.shiftKey && (document.activeElement === first || !visible.includes(document.activeElement as HTMLElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !visible.includes(document.activeElement as HTMLElement))) {
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
      aria-label={label}
      title={label}
      data-live-page={demo ? undefined : key}
      data-page={demo ? ({home:"dashboard",sessions:"jadwal",students:"murid",instructors:"instruktur",vehicles:"mobil",packages:"paket",reports:"laporan",settings:"pengaturan"} as Record<string,string>)[key] : undefined}
      aria-current={page === key ? "page" : undefined}
      disabled={locked && key !== "settings"}
      aria-describedby={
        locked && key !== "settings" ? "setup-reason" : undefined
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
      <div className={`app${collapsed ? " sidebar-collapsed" : ""}`}>
        <div className={`scrim${open ? " open" : ""}`} onClick={close} />
        <aside
          className={`sidebar${open ? " open" : ""}`}
          id="sidebar"
          aria-label="Navigasi dashboard"
        >
          <div className="brand">
            <div id="brandWord" className="brand-word platform-wordmark"><BrandIcon /><span>AturSetir</span></div>
          </div>
          <div className="sidebar-school">
            <span className="sidebar-school-name">{school && (demo || school.role !== "owner" || school.setup_complete) ? school.name : "Sekolah Anda"}</span>
            <button type="button" className="sidebar-toggle" aria-label={collapsed ? "Perluas navigasi" : "Perkecil navigasi"} title={collapsed ? "Perluas navigasi" : "Perkecil navigasi"} aria-controls="sidebar" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>
              <Icon name={collapsed ? "chevron-right" : "chevron-left"} />
            </button>
          </div>
          {demo && <section className="school-context" aria-label="Konteks sekolah">
            <label className="school-picker"><span>Sekolah demo</span><select id="schoolPicker" value={demo.id} onChange={e => demo.onChange(e.target.value)}>{demo.schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          </section>}
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
            {(demo || !school || school.role === "owner") && <div className="nav-group">
              <div className="nav-title">LAINNYA</div>
              {demo && link("reports", "Laporan", "chart")}
              {!demo && school?.role === "owner" && school.setup_complete && link("invitations", "Staf", "users")}
              {link("settings", "Pengaturan", "settings")}
            </div>}
          </nav>
          {userEmail && <div className="sidebar-account">
            {accountInitial && <span className="avatar neutral" aria-hidden="true">{accountInitial}</span>}
            <span className="sidebar-account-info">
              <span className="sidebar-account-email">{userEmail}</span>
              {roleLabel && <small>{roleLabel}</small>}
            </span>
          </div>}
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
              <span className="topbar-school">{school && (demo || school.role !== "owner" || school.setup_complete) ? school.name : "Sekolah Anda"}</span>
            </div>
            <div className="topbar-right">
              {(!demo || onLogout) && <button
                type="button"
                className="btn btn-quiet"
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
