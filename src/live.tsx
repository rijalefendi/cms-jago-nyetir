import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StudentsPage } from './StudentsPage';
import { instructorConfig, vehicleConfig, packageConfig, ServerCrudPage } from './resource';
import type { ResourceConfig } from './resource';
import { instructorTablePage } from './instructorTable.mjs';
import { ApiError, type Api, type School } from './auth';
import { validatePackagePricing } from './packagePricing.mjs';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';
import { isoDay } from './seed.mjs';
import { loadPages } from './loadPages';
import { DashboardShell } from './DashboardShell';
import { Badge, Button, EmptyState, Icon, Metric, HomeHeading, HomeMetricsSkeleton, Modal, PageHeading, SearchSelect, showToast } from './ui';
const moveDay = (day: string, delta: number) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0, 10); };
const monday = (day: string) => moveDay(day, -((new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7));
const moveMonth = (day: string, delta: number) => { const d = new Date(`${day.slice(0, 7)}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + delta); return d.toISOString().slice(0, 10); };
const formatDay = (day: string) => { const date = new Date(`${day}T12:00:00Z`); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date) : 'Tanggal tidak tersedia'; };
const formatDivider = (day: string) => { const date = new Date(`${day}T12:00:00Z`); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date) : day; };

type Row = Record<string, any>;
export type OnboardingProgress = { packages: boolean | null; instructors: boolean | null; vehicles: boolean | null; students: boolean | null };
export const emptyProgress: OnboardingProgress = { packages: null, instructors: null, vehicles: null, students: null };
export const stepStatus = (value: boolean | null) => value === null ? <span className="step-status unknown">Belum dicek</span> : value ? <span className="step-status ready">Siap</span> : <span className="step-status missing">Belum diisi</span>;
const fields: Record<string, { key: string; label: string; type?: string }[]> = {
  students: [{ key: 'name', label: 'Nama murid' }, { key: 'phone', label: 'WhatsApp' }],
  packages: [{ key: 'name', label: 'Nama paket' }, { key: 'total_sessions', label: 'Jumlah pertemuan', type: 'number' }, { key: 'normal_price', label: 'Harga (Rp)', type: 'number' }, { key: 'session_duration_minutes', label: 'Durasi per pertemuan (menit)', type: 'number' }, { key: 'description', label: 'Deskripsi (opsional)' }],
};
const labels: Record<string, string> = { students: 'Murid', packages: 'Paket', instructors: 'Instruktur', vehicles: 'Mobil', sessions: 'Jadwal' };
const kitPages = ['home', 'students', 'instructors', 'vehicles', 'packages'];
const sessionFields: Record<string, { id: string; label: string }> = {
  student_id: { id: 'live-student-select', label: 'Murid' },
  enrollment_id: { id: 'live-enrollment-select', label: 'Paket murid' },
  session_date: { id: 'live-session-date', label: 'Tanggal sesi' },
  status: { id: 'live-session-status', label: 'Status sesi' },
  start_time: { id: 'live-session-start', label: 'Jam mulai' },
  instructor_id: { id: 'live-instructor-select', label: 'Instruktur' },
  vehicle_id: { id: 'live-vehicle-select', label: 'Mobil' },
};
const livePackageConfig: ResourceConfig = { ...packageConfig, description: 'Kelola harga, jumlah sesi, transmisi, dan durasi paket kursus.', columns: [...packageConfig.columns.slice(0, 3), { key: 'transmission', label: 'Transmisi' }, { key: 'session_duration_minutes', label: 'Durasi' }, ...packageConfig.columns.slice(3)] };
const editableStatuses = ['Menunggu konfirmasi', 'Terkonfirmasi'];
const sessionLockMessage = 'Sesi latihan sudah final (Selesai, Dibatalkan, atau Tidak hadir) dan tidak dapat diubah. Data jadwal dimuat ulang.';
const isLocked = (e: unknown) => e instanceof ApiError && e.code === 'session_status_locked';
const writeErrorText = (e: unknown) =>
  e instanceof ApiError && e.code === 'schedule_conflict' ? 'Jadwal bentrok dengan sesi lain. Pilih waktu, instruktur, atau mobil lain.'
  : e instanceof ApiError && e.code === 'session_allowance_exhausted' ? 'Kuota paket telah habis. Tambahkan pembelian paket baru untuk melanjutkan.'
  : e instanceof ApiError && e.code === 'outside_operating_hours' ? 'Sesi berada di luar jam operasional sekolah. Pilih waktu pada jam layanan.'
  : e instanceof ApiError && e.code === 'enrollment_transmission_mismatch' ? 'Transmisi sesi tidak sesuai dengan paket murid.'
  : e instanceof ApiError && e.code === 'enrollment_duration_mismatch' ? 'Durasi sesi tidak sesuai dengan paket murid.'
  : e instanceof Error ? e.message : String(e);

function Home({ school, api, onSchedule, onNavigate, progress, markProgress }: { school: string; api: Api; onSchedule: (date?: string) => void; onNavigate: (page: string) => void; progress: OnboardingProgress; markProgress: (patch: Partial<OnboardingProgress>) => void }) {
  const [data, setData] = useState<{ date: string; today_count: number; pending_count: number; overdue_count: number; today_sessions: Row[]; overdue_sessions: Row[] } | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true); setError(false);
    api(`/schools/${school}/home`).then(result => {
      if (!result || typeof result.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(result.date) || !Number.isFinite(Date.parse(`${result.date}T12:00:00Z`)) || !['today_count', 'pending_count', 'overdue_count'].every(key => Number.isSafeInteger(result[key]) && result[key] >= 0) || !Array.isArray(result.today_sessions) || !Array.isArray(result.overdue_sessions)) throw Error('Respons beranda tidak valid.');
      if (active) setData(result);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [api, school, revision]);
  const list = (rows: Row[], empty: string) => rows.length ? <div className="live-agenda">{rows.map(row => {
    const validDate = Boolean(row.session_date && Number.isFinite(Date.parse(`${row.session_date}T12:00:00Z`)));
    return <button type="button" className="agenda-entry agenda-entry-link" key={row.id} disabled={!validDate} onClick={() => onSchedule(row.session_date)} aria-label={`Lihat jadwal ${row.student_name || "murid"} ${formatDay(row.session_date)}`}><div className="agenda-time">{row.start_time?.slice(0, 5)}<small>{formatDay(row.session_date)}</small></div><div className="agenda-detail"><div className="agenda-primary"><strong>{row.student_name || 'Murid tidak tersedia'}</strong><Badge status={row.status} /></div><div className="agenda-meta">{row.start_time?.slice(0, 5)}–{row.end_time?.slice(0, 5)} WITA</div></div><span className="agenda-entry-arrow" aria-hidden="true"><Icon name="chevron-right" extra="sm" /></span></button>;
  })}</div> : <div className="home-empty"><Icon name="calendar" extra="lg" /><p>{empty}</p></div>;
  const showSetupGuide = Boolean(data && data.today_count === 0 && data.overdue_count === 0 && !data.today_sessions.length && !data.overdue_sessions.length);
  useEffect(() => {
    if (data && (data.today_count > 0 || data.overdue_count > 0)) markProgress({ packages: true, instructors: true, vehicles: true, students: true });
  }, [data, markProgress]);
  const resourcesStep = progress.instructors === true && progress.vehicles === true ? true : progress.instructors === false || progress.vehicles === false ? false : null;
  const stepsReady = progress.packages === true && progress.instructors === true && progress.vehicles === true && progress.students === true;
  return <><HomeHeading busy={busy} onReload={() => setRevision(n => n + 1)} onSchedule={() => onSchedule()} />{busy ? <HomeMetricsSkeleton /> : error || !data ? <div role="alert" className="instructor-load-error">Gagal memuat beranda. <Button onClick={() => setRevision(n => n + 1)}>Coba lagi</Button></div> : <><div className="metrics home-metrics"><Metric label="Menunggu konfirmasi" value={data.pending_count} foot="Jadwal hari ini" icon="clock" tone="yellow" /><Metric label="Sesi lewat" value={data.overdue_count} foot="Belum diperbarui · 30 hari terakhir" icon="alert" tone={data.overdue_count ? 'hot' : ''} /></div><div className="layout-two home-work"><section className="panel"><div className="panel-head"><div><h2 className="panel-title">Agenda hari ini</h2><p className="panel-sub">{data.date} · WITA · {data.today_count} sesi</p></div></div>{list(data.today_sessions, 'Belum ada sesi hari ini.')}</section><section className="panel"><div className="panel-head"><div><h2 className="panel-title">Perlu ditindaklanjuti</h2><p className="panel-sub">Sesi lewat belum diperbarui · 30 hari terakhir ({moveDay(data.date, -30)}–{data.date})</p></div></div>{list(data.overdue_sessions, 'Tidak ada sesi lewat yang perlu diperbarui.')}</section></div>{showSetupGuide && <section className="panel onboarding-guide" aria-label="Panduan persiapan operasional"><div className="panel-head"><div><h2 className="panel-title">Mulai operasional sekolah</h2><p className="panel-sub">{stepsReady ? 'Semua data operasional sudah siap. Jadwalkan sesi latihan pertama Anda.' : 'Siapkan data dasar berikut sesuai urutan sebelum menjadwalkan sesi latihan pertama. Progres tercatat saat menu terkait dibuka.'}</p></div></div>{stepsReady ? <div className="onboarding-ready"><Button variant="primary" onClick={() => onSchedule()}>Buka jadwal</Button></div> : <ol className="onboarding-steps"><li><div><strong>1. Paket kursus {stepStatus(progress.packages)}</strong><p>Atur pilihan paket, transmisi, jumlah pertemuan, dan durasi per sesi.</p></div><Button sm onClick={() => onNavigate('packages')}>Buka menu Paket</Button></li><li><div><strong>2. Instruktur &amp; Mobil {stepStatus(resourcesStep)}</strong><p>Tambahkan instruktur dan mobil aktif dengan transmisi yang sesuai paket.</p></div><div className="student-detail-actions"><Button sm onClick={() => onNavigate('instructors')}>Buka menu Instruktur</Button><Button sm onClick={() => onNavigate('vehicles')}>Buka menu Mobil</Button></div></li><li><div><strong>3. Murid &amp; paket murid {stepStatus(progress.students)}</strong><p>Daftarkan murid lalu tambahkan paket aktif pada detail murid.</p></div><Button sm onClick={() => onNavigate('students')}>Buka menu Murid</Button></li></ol>}</section>}</>}</>;
}

export function LiveApp({ school: profile, api, initialPage, userEmail, onNavigate, loggingOut, onLogout, progress, markProgress }: {
  school: School; api: Api; initialPage: string; userEmail?: string; onNavigate: (page: string) => void; loggingOut: boolean; onLogout: () => void;
  progress: OnboardingProgress; markProgress: (patch: Partial<OnboardingProgress>) => void;
}) {
  const school = profile.id;
  type DatePreset = 'hari' | 'minggu' | 'bulan' | 'custom' | 'tanggal';
  const [page, setPage] = useState(initialPage);
  useEffect(() => {
    if (page === initialPage) return;
    setEditorOpen(false); setDateOpen(false); setPage(initialPage); setRows([]); setLookups({}); setEditing(null); setStudentId(''); setEnrollmentId(''); setStart(''); setInstructorId(''); setVehicleId(''); setStatus(''); setJustSaved(null);
  }, [initialPage]);
  const [rows, setRows] = useState<Row[]>([]);
  const [lookups, setLookups] = useState<Record<string, Row[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [sessionErrors, setSessionErrors] = useState<Record<string, string>>({});
  const sessionForm = useRef<HTMLFormElement>(null);
  function focusSessionField(name: string) {
    const field = sessionForm.current?.querySelector(`#${sessionFields[name]?.id}`)?.closest('.form-field');
    field?.querySelector<HTMLElement>('input:not([type="hidden"]):not([aria-hidden="true"]), select:not([aria-hidden="true"])')?.focus();
  }
  function sessionError(name: string, message: string) {
    setSessionErrors(current => ({ ...current, [name]: message }));
    focusSessionField(name);
  }
  function sessionValidation(name: string, hint?: string) {
    return { 'aria-invalid': !!sessionErrors[name], 'aria-describedby': [hint, sessionErrors[name] ? `${sessionFields[name].id}-error` : ''].filter(Boolean).join(' ') || undefined };
  }
  function sessionFeedback(name: string) {
    return sessionErrors[name] && <small id={`${sessionFields[name].id}-error`} className="field-error" role="alert">{sessionErrors[name]}</small>;
  }
  function validateSessionControl(control: HTMLInputElement | HTMLSelectElement) {
    if (control.disabled || control.type === 'hidden') return '';
    const label = sessionFields[control.name]?.label;
    return !control.value ? `${label} wajib diisi.` : !control.validity.valid ? `${label} tidak valid.` : '';
  }
  function updateSessionError(event: React.FocusEvent<HTMLFormElement> | React.ChangeEvent<HTMLFormElement>) {
    if (page !== 'sessions' || !(event.target instanceof HTMLElement)) return;
    const field = event.target.closest('.form-field');
    const control = field?.querySelector<HTMLInputElement | HTMLSelectElement>('[name]');
    if (!control || !sessionFields[control.name]) return;
    if (event.type === 'change') setError('');
    if (event.type === 'blur' && (!control.value || field?.contains((event as React.FocusEvent<HTMLFormElement>).relatedTarget as Node | null))) return;
    if (event.type === 'change' && !sessionErrors[control.name]) return;
    setSessionErrors(current => ({ ...current, [control.name]: validateSessionControl(control) }));
  }
  const requestSerial = useRef(0);
  const [range, setRange] = useState<{ from: string; to: string }>(() => { const start = monday(isoDay()); return { from: start, to: moveDay(start, 6) }; });
  const [loadedRange, setLoadedRange] = useState<{ from: string; to: string } | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('minggu');
  const [dateOpen, setDateOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => isoDay());
  const [customMode, setCustomMode] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [rangeError, setRangeError] = useState('');
  const dateFilterRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState('Semua status');
  const [settings, setSettings] = useState<Row[] | null>(null);
  const [enrollmentId, setEnrollmentId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [status, setStatus] = useState('');
  const [justSaved, setJustSaved] = useState<'packages' | 'instructors' | 'vehicles' | null>(null);
  const [enrollments, setEnrollments] = useState<Row[]>([]);
  const [enrollmentBusy, setEnrollmentBusy] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState('');
  const [enrollmentRevision, setEnrollmentRevision] = useState(0);
  const [start, setStart] = useState('');
  const selected = enrollments.find(e => e.id === enrollmentId && e.student_id === studentId);
  const minutes = start ? Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)) + Number(selected?.session_duration_minutes || 0) : 0;
  const end = start && selected && minutes < 1440 ? `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}` : '';
  const witaToday = isoDay();
  const defaultWeekStart = monday(witaToday);
  const rangeLabel = datePreset === 'hari' ? `Hari ini · ${formatDay(range.from)}`
    : datePreset === 'minggu' ? `Minggu ini · ${formatDay(range.from)} – ${formatDay(range.to)}`
    : datePreset === 'bulan' ? `1 bulan terakhir · ${formatDay(range.from)} – ${formatDay(range.to)}`
    : range.from === range.to ? formatDay(range.from)
    : `${formatDay(range.from)} – ${formatDay(range.to)}`;
  const monthYear = Number(viewMonth.slice(0, 4));
  const monthIndex = Number(viewMonth.slice(5, 7)) - 1;
  const firstDayOffset = (new Date(Date.UTC(monthYear, monthIndex, 1, 12)).getUTCDay() + 6) % 7;
  const gridStart = moveDay(`${viewMonth.slice(0, 7)}-01`, -firstDayOffset);
  const calendarDays = Array.from({ length: 42 }, (_, i) => moveDay(gridStart, i));
  useEffect(() => {
    if (!dateOpen) return;
    const outside = (event: PointerEvent) => {
      if (!dateFilterRef.current?.contains(event.target as Node)) {
        setDateOpen(false); setCustomMode(false); setDraftFrom(''); setRangeError('');
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [dateOpen]);
  const visibleRows = statusFilter === 'Semua status' ? rows : rows.filter(r => r.status === statusFilter);
  const instructorOptions = [
    { value: '', label: 'Pilih Instruktur', disabled: true },
    ...(lookups.instructors || []).filter(x => (x.active || x.id === editing?.instructor_id) && selected
      && (x.transmission === selected.transmission || x.transmission === 'Matic & Manual'))
      .map(x => ({ value: x.id, label: x.active ? x.name : `${x.name} (Nonaktif)` })),
  ];
  const vehicleOptions = [
    { value: '', label: 'Pilih Mobil', disabled: true },
    ...(lookups.vehicles || []).filter(x => (x.active || x.id === editing?.vehicle_id) && selected
      && x.transmission === selected.transmission)
      .map(x => ({ value: x.id, label: x.active ? x.name : `${x.name} (Nonaktif)` })),
  ];

  const resourcesReady = !!selected && !enrollmentBusy && !enrollmentError;
  const instructorValid = instructorOptions.some(o => o.value === instructorId);
  const vehicleValid = vehicleOptions.some(o => o.value === vehicleId);
  useEffect(() => {
    if (!enrollmentId || (resourcesReady && !instructorValid)) setInstructorId('');
    if (!enrollmentId || (resourcesReady && !vehicleValid)) setVehicleId('');
  }, [enrollmentId, resourcesReady, instructorValid, vehicleValid]);

  async function refresh() {
    if (!school || kitPages.includes(page)) return;
    const serial = ++requestSerial.current;
    if (page === 'sessions' && !range) { setBusy(false); return; }
    setBusy(true);
    try {
      const names = page === 'sessions' ? ['students', 'instructors', 'vehicles', 'sessions'] : [page];
      const all = await Promise.all(names.map(async n => {
        // shortcut: load student names for pilot search; use server search when the list becomes large.
        if (n === 'students') return loadPages(api, `/schools/${school}/students`);
        if (n !== 'sessions') return api(`/schools/${school}/${n}`);
        const items: Row[] = [];
        let pageNumber = 1;
        while (true) {
          if (serial !== requestSerial.current) return [];
          const params = new URLSearchParams({ date_from: range!.from, date_to: range!.to, page: String(pageNumber), page_size: '100' });
          const result = await api(`/schools/${school}/sessions?${params}`);
          if (!Array.isArray(result?.items) || !Number.isInteger(result.total) || result.total < 0) throw Error('Respons jadwal tidak valid.');
          items.push(...result.items);
          if (items.length >= result.total) return items;
          if (!result.items.length) throw Error('Halaman jadwal tidak lengkap. Coba lagi.');
          pageNumber++;
        }
      }));
      if (serial !== requestSerial.current) return;
      const next = Object.fromEntries(names.map((n, i) => [n, all[i] as Row[]]));
      if (page === 'sessions') {
        setLoadedRange(range);
        markProgress({
          students: (next.students || []).length > 0,
          instructors: (next.instructors || []).some(x => x.active),
          vehicles: (next.vehicles || []).some(x => x.active),
        });
      }
      setLookups(next);
      setRows(next[page] || []);
      setError('');
    } catch (e) {
      if (serial === requestSerial.current) setError(String(e));
    }
    finally { if (serial === requestSerial.current) setBusy(false); }
  }
  useEffect(() => { refresh(); return () => { requestSerial.current++; }; }, [school, page, api, range?.from, range?.to]);
  useEffect(() => {
    if (page !== 'sessions' || settings) return;
    let active = true;
    api(`/schools/${school}/settings`).then(s => { if (active) setSettings(Array.isArray(s) ? s : []); }).catch(() => { if (active) setSettings([]); });
    return () => { active = false; };
  }, [api, school, page, settings]);
  useEffect(() => {
    if (page !== 'sessions' || !studentId) { setEnrollments([]); setEnrollmentError(''); return; }
    let active = true;
    setEnrollments([]); setEnrollmentBusy(true); setEnrollmentError('');
    loadPages(api, `/schools/${school}/student_enrollments`, { student_id: studentId })
      .then(items => { if (active) setEnrollments(items); })
      .catch(e => { if (active) setEnrollmentError(String(e)); })
      .finally(() => { if (active) setEnrollmentBusy(false); });
    return () => { active = false; };
  }, [api, school, page, studentId, enrollmentRevision]);
  async function saveRecord(form: FormData) {
    if (!school || busy || saving) return;
    setSaving(true);
    try {
      const body: Row = Object.fromEntries(form.entries());
      if (editing && page === 'sessions' && body.status === 'Dibatalkan') {
        await api(`/schools/${school}/sessions/${editing.id}`, 'PATCH', { status: 'Dibatalkan' });
        setEditing(null); setEditorOpen(false); setEnrollmentId(''); setStart(''); setEnrollmentRevision(n => n + 1);
        showToast('Sesi latihan dibatalkan.');
        await refresh(); return;
      }
      if (page === 'packages') {
        const errors = validatePackagePricing({ normal_price: body.normal_price });
        if (Object.keys(errors).length) throw Error(Object.values(errors).join(' '));
        if (!body.name?.trim() || !['Matic', 'Manual'].includes(body.transmission) || !Number.isInteger(Number(body.total_sessions)) || Number(body.total_sessions) < 1 || Number(body.total_sessions) > 2147483647 || !Number.isInteger(Number(body.session_duration_minutes)) || Number(body.session_duration_minutes) < 1 || Number(body.session_duration_minutes) > 1439) throw Error('Lengkapi nama, transmisi, jumlah sesi, dan durasi 1–1439 menit.');
        body.total_sessions = Number(body.total_sessions); body.normal_price = Number(body.normal_price); body.session_duration_minutes = Number(body.session_duration_minutes); body.active = body.active === 'true'; }
      if (page === 'sessions') {
        const targetStudentId = editing ? editing.student_id : studentId;
        const targetEnrollmentId = editing ? editing.enrollment_id : body.enrollment_id;
        const enrollment = enrollments.find(e => e.id === targetEnrollmentId && e.student_id === targetStudentId);
        if (start && selected && minutes >= 1440) return sessionError('start_time', 'Jam selesai melewati pukul 23:59 WITA. Pilih jam mulai lebih awal.');
        if (!enrollment) return sessionError('enrollment_id', 'Pilih paket murid yang valid.');
        if (!end) return sessionError('start_time', 'Pilih jam mulai yang valid.');
        if (enrollmentBusy || enrollmentError) return sessionError('enrollment_id', 'Muat ulang paket murid sebelum menyimpan.');
        body.student_id = enrollment.student_id; body.enrollment_id = enrollment.id; body.transmission = enrollment.transmission; body.end_time = end;
        if (!instructorOptions.some(o => o.value && o.value === body.instructor_id)) return sessionError('instructor_id', 'Pilih instruktur yang sesuai transmisi paket.');
        if (!vehicleOptions.some(o => o.value && o.value === body.vehicle_id)) return sessionError('vehicle_id', 'Pilih mobil yang sesuai transmisi paket.');
        const sessionStatus = String(body.status || '');
        if (!editing && ['Dibatalkan', 'Tidak hadir'].includes(sessionStatus)) return sessionError('status', 'Sesi baru tidak bisa langsung dibatalkan atau ditandai tidak hadir. Batalkan setelah sesi dibuat.');
        if (['Selesai', 'Tidak hadir'].includes(sessionStatus) && String(body.session_date) > isoDay()) return sessionError('status', 'Status Selesai atau Tidak hadir hanya untuk sesi hari ini atau yang sudah lewat.');
        const hoursProfile = Array.isArray(settings) ? settings[0] : null;
        if (hoursProfile) {
          const dow = new Date(`${body.session_date}T12:00:00Z`).getUTCDay();
          const group = dow === 0 || dow === 6 ? 'weekend' : 'weekday';
          const open = String(hoursProfile[`${group}_open`] || '').slice(0, 5);
          const close = String(hoursProfile[`${group}_close`] || '').slice(0, 5);
          if (hoursProfile[`${group}_closed`]) return sessionError('session_date', 'Sekolah tutup pada hari tersebut. Pilih tanggal lain.');
          if (open && close && (String(body.start_time) < open || String(body.end_time) > close)) return sessionError('start_time', `Sesi di luar jam layanan (${open}–${close} WITA).`);
        }
        if (!['Dibatalkan', 'Tidak hadir'].includes(sessionStatus)) {
          const clash = (lookups.sessions || []).find(s => s.id !== editing?.id
            && !['Dibatalkan', 'Tidak hadir'].includes(s.status)
            && s.session_date === body.session_date
            && String(body.start_time) < String(s.end_time).slice(0, 5)
            && String(body.end_time) > String(s.start_time).slice(0, 5)
            && (s.student_id === body.student_id || s.instructor_id === body.instructor_id || s.vehicle_id === body.vehicle_id));
          if (clash) {
            const who = clash.student_id === body.student_id
              ? lookups.students?.find(x => x.id === clash.student_id)?.name || 'Murid'
              : clash.instructor_id === body.instructor_id
                ? lookups.instructors?.find(x => x.id === clash.instructor_id)?.name || 'Instruktur'
                : lookups.vehicles?.find(x => x.id === clash.vehicle_id)?.name || 'Mobil';
            throw Error(`${who} sudah terjadwal pada ${clash.session_date} ${String(clash.start_time).slice(0, 5)}–${String(clash.end_time).slice(0, 5)} WITA. Pilih waktu atau resource lain.`);
          }
        }
        const holdsQuota = ['Menunggu konfirmasi', 'Terkonfirmasi', 'Selesai'].includes(body.status);
        const heldQuota = Boolean(editing && body.enrollment_id === editing.enrollment_id && ['Menunggu konfirmasi', 'Terkonfirmasi', 'Selesai'].includes(editing.status || ''));
        if (holdsQuota && !heldQuota && (enrollment.status !== 'Aktif' || !Number.isSafeInteger(enrollment.remaining_sessions) || enrollment.remaining_sessions <= 0)) return sessionError('enrollment_id', 'Paket tidak memiliki kuota tersedia untuk sesi ini.');
      }
      const path = `/schools/${school}/${page}${editing?.id ? `/${editing.id}` : ''}`;
      await api(path, editing ? 'PATCH' : 'POST', body);
      setEditing(null); setEditorOpen(false);
      if (page === 'sessions') { setEnrollmentId(''); setStart(''); setEnrollmentRevision(n => n + 1); showToast(editing ? 'Perubahan sesi latihan tersimpan.' : 'Jadwal sesi latihan berhasil dibuat.'); }
      await refresh();

    } catch (e) {
      if (page === 'sessions' && isLocked(e)) {
        setEditing(null); setEditorOpen(false); setSessionErrors({});
        setEnrollmentRevision(n => n + 1);
        await refresh();
        setError(sessionLockMessage);
        return;
      }
      setError(writeErrorText(e));
    } finally { setSaving(false); }
  }
  async function cancelSession(id: string) {
    if (busy) return;
    setBusy(true);
    try { await api(`/schools/${school}/sessions/${id}`, 'PATCH', { status: 'Dibatalkan' }); setEnrollmentRevision(n => n + 1); showToast('Sesi latihan dibatalkan.'); await refresh(); }
    catch (e) {
      if (isLocked(e)) { setEnrollmentRevision(n => n + 1); await refresh(); setError(sessionLockMessage); }
      else setError(writeErrorText(e));
    } finally { setBusy(false); }
  }
  const fetchInstructors = useCallback(async ({ search, sort, direction, page: pageNr }: { search: string; sort: string; direction: 'asc' | 'desc'; page: number }) => {
    const params = new URLSearchParams({ page: String(pageNr), page_size: '10', search, sort, direction });
    const result = await api(`/schools/${school}/instructors?${params}`) as { items: Row[]; total: number };
    markProgress({ instructors: result.items.some(x => x.active) });
    return { items: result.items, total: result.total };
  }, [api, school, markProgress]);
  const saveInstructor = async (form: { name: string; transmission: string; notes: string; active: boolean }, editing: Row | null) => {
    await api(`/schools/${school}/instructors${editing?.id ? `/${editing.id}` : ''}`, editing ? 'PATCH' : 'POST', form);
    if (form.active) { markProgress({ instructors: true }); setJustSaved('instructors'); }
  };
  const deleteInstructor = async (row: Row) => {
    await api(`/schools/${school}/instructors/${row.id}`, 'DELETE');
  };
  const fetchVehicles = useCallback(async ({ search, sort, direction, page: pageNr }: { search: string; sort: string; direction: 'asc' | 'desc'; page: number }) => {
    const list = await api(`/schools/${school}/vehicles`) as Row[];
    markProgress({ vehicles: list.some(x => x.active) });
    return instructorTablePage(list, { query: search, sort, direction, page: pageNr, pageSize: 10 });
  }, [api, school, markProgress]);
  const saveVehicle = async (form: { name: string; transmission: string; notes: string; active: boolean }, editing: Row | null) => {
    await api(`/schools/${school}/vehicles${editing?.id ? `/${editing.id}` : ''}`, editing ? 'PATCH' : 'POST', { name: form.name, transmission: form.transmission, active: form.active });
    if (form.active) { markProgress({ vehicles: true }); setJustSaved('vehicles'); }
  };
  const deleteVehicle = async (row: Row) => {
    await api(`/schools/${school}/vehicles/${row.id}`, 'DELETE');
  };
  const fetchPackages = useCallback(async ({ search, sort, direction, page: pageNr }: { search: string; sort: string; direction: 'asc' | 'desc'; page: number }) => {
    const list = await api(`/schools/${school}/packages`) as Row[];
    markProgress({ packages: list.some(x => x.active) });
    return instructorTablePage(list, { query: search, sort, direction, page: pageNr, pageSize: 10 });
  }, [api, school, markProgress]);
  const savePackage = async (form: { name: string; transmission: string; active: boolean; description?: string; total_sessions?: string; session_duration_minutes?: string; normal_price?: string }, editing: Row | null) => {
    await api(`/schools/${school}/packages${editing?.id ? `/${editing.id}` : ''}`, editing ? 'PATCH' : 'POST', { name: form.name, description: form.description, transmission: form.transmission, active: form.active, total_sessions: Number(form.total_sessions), session_duration_minutes: Number(form.session_duration_minutes), normal_price: Number(form.normal_price) });
    if (String(form.active) === 'true') { markProgress({ packages: true }); setJustSaved('packages'); }
  };
  const closeEditor = () => { if (busy || saving) return; setSessionErrors({}); setEditorOpen(false); setEditing(null); setStudentId(''); setEnrollmentId(''); setStart(''); setInstructorId(''); setVehicleId(''); setStatus(''); setError(''); };
  const openSessionEditor = (row: Row | null) => {
    if (row && !editableStatuses.includes(row.status)) return;
    setError(''); setSessionErrors({});
    setEditing(row);
    setStudentId(row?.student_id || '');
    setEnrollmentId(row?.enrollment_id || '');
    setStart(row?.start_time?.slice(0, 5) || '');
    setInstructorId(row?.instructor_id || '');
    setVehicleId(row?.vehicle_id || '');
    setStatus(row?.status || 'Menunggu konfirmasi');
    setEditorOpen(true);
  };
  const form = (onSubmit: (f: FormData) => void, children: React.ReactNode) => <form ref={sessionForm} noValidate={page === 'sessions'} onBlur={updateSessionError} onChange={updateSessionError} key={`${page}-${editing?.id || 'new'}`} onSubmit={e => { e.preventDefault(); if (busy || saving) return;
    if (page === 'sessions' && !(editing && status === 'Dibatalkan')) {
      const errors = Object.fromEntries(Object.keys(sessionFields).map(name => {
        const control = e.currentTarget.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
        return [name, control ? validateSessionControl(control) : ''];
      }));
      setSessionErrors(errors); setError('');
      const invalid = Object.keys(errors).find(name => errors[name]);
      if (invalid) { focusSessionField(invalid); return; }
    }
    onSubmit(new FormData(e.currentTarget)); }}><div className="modal-content"><div className="form-grid">{children}</div></div><div className="modal-foot">{error && <div role="alert" className="notice form-feedback">{error}</div>}<Button type="button" onClick={closeEditor} disabled={saving}>Batal</Button><Button variant="primary" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button></div></form>;
  const jumpToPage = (next: string) => {
    if (next === 'settings') { onNavigate(next); return; }
    if (next === page) return;
    onNavigate(next);
    setEditorOpen(false); setDateOpen(false); setPage(next); setRows([]); setLookups({}); setEditing(null); setStudentId(''); setEnrollmentId(''); setStart(''); setInstructorId(''); setVehicleId(''); setStatus(''); setJustSaved(null);
  };
  const hasLoadedLookups = Array.isArray(lookups.students) && Array.isArray(lookups.instructors) && Array.isArray(lookups.vehicles);
  const hasActiveInstructor = (lookups.instructors || []).some(x => x.active);
  const hasActiveVehicle = (lookups.vehicles || []).some(x => x.active);
  const hasStudents = (lookups.students || []).length > 0;
  const missingSchedulePrereqs = hasLoadedLookups && (!hasActiveInstructor || !hasActiveVehicle || !hasStudents || progress.packages === false);
  const stepsReady = progress.packages === true && progress.instructors === true && progress.vehicles === true && progress.students === true;
  // Next-step banners only surface right after a save on that page, or when the next
  // prerequisite is PROVEN empty (`=== false`); unknown (`null`) is never treated as missing.
  // They disappear entirely once every prerequisite is ready, and their buttons stay quiet
  // so the page header keeps the only primary CTA (Tambah paket/instruktur/mobil).
  const chainNotice = (kind: 'packages' | 'instructors' | 'vehicles') => {
    if (stepsReady) return undefined;
    const jump = (target: string, label: string) => <Button sm onClick={() => jumpToPage(target)}>{label}</Button>;
    if (kind === 'packages') {
      const relevant = justSaved === 'packages' || progress.instructors === false || progress.vehicles === false;
      if (!relevant) return undefined;
      const actions = progress.instructors === false ? jump('instructors', 'Buka menu Instruktur')
        : progress.vehicles === false ? jump('vehicles', 'Buka menu Mobil')
        : <>{jump('instructors', 'Buka menu Instruktur')}{jump('vehicles', 'Buka menu Mobil')}</>;
      return <section className="notice onboarding-chain" aria-label="Langkah persiapan berikutnya"><strong>Langkah 1 siap: paket kursus aktif tersedia.</strong><p>Tambahkan paket lain jika perlu, atau lanjut ke langkah 2: instruktur dan mobil dengan transmisi yang sesuai paket.</p><div className="student-detail-actions">{actions}</div></section>;
    }
    if (kind === 'instructors') {
      const relevant = justSaved === 'instructors' || progress.vehicles === false || progress.students === false;
      if (!relevant) return undefined;
      const actions = progress.vehicles === false ? jump('vehicles', 'Buka menu Mobil')
        : progress.students === false ? jump('students', 'Buka menu Murid')
        : <>{jump('vehicles', 'Buka menu Mobil')}{jump('students', 'Buka menu Murid')}</>;
      return <section className="notice onboarding-chain" aria-label="Langkah persiapan berikutnya"><strong>Instruktur aktif sudah tercatat.</strong><p>Tambahkan instruktur lain jika perlu, atau lanjut ke langkah berikutnya agar jadwal siap dibuat.</p><div className="student-detail-actions">{actions}</div></section>;
    }
    const relevant = justSaved === 'vehicles' || progress.instructors === false || progress.students === false;
    if (!relevant) return undefined;
    const actions = progress.instructors === false ? jump('instructors', 'Buka menu Instruktur')
      : progress.students === false ? jump('students', 'Buka menu Murid')
      : <>{jump('instructors', 'Buka menu Instruktur')}{jump('students', 'Buka menu Murid')}</>;
    return <section className="notice onboarding-chain" aria-label="Langkah persiapan berikutnya"><strong>Mobil aktif sudah tercatat.</strong><p>Tambahkan mobil lain jika perlu, atau lanjut ke langkah berikutnya agar jadwal siap dibuat.</p><div className="student-detail-actions">{actions}</div></section>;
  };
  return <DashboardShell school={profile} page={page} userEmail={userEmail} loggingOut={loggingOut} onLogout={onLogout} onNavigate={jumpToPage}>{error && !editorOpen && <p role="alert" className="notice">{error}<button className="btn btn-quiet" onClick={refresh}>Coba lagi</button></p>}
      {page === 'home' ? <Home school={school} api={api} progress={progress} markProgress={markProgress} onNavigate={jumpToPage} onSchedule={date => {
        if (date) {
          setRange({ from: date, to: date });
          setDatePreset(date === witaToday ? 'hari' : 'tanggal');
          setViewMonth(date);
        }
        onNavigate('sessions'); setPage('sessions');
      }} /> : page === 'students' ? <StudentsPage schoolId={school} api={api} onOpenPackages={() => jumpToPage('packages')} onProgress={markProgress} onSchedule={(student, id) => {
        onNavigate('sessions'); setPage('sessions'); setRows([]); setLookups({}); setEditing(null); setError('');
        openSessionEditor(null); setStudentId(student.id); setEnrollmentId(id);
      }} /> : page === 'instructors' ? <ServerCrudPage key="instructors" config={instructorConfig} notice={chainNotice('instructors')} fetchPage={fetchInstructors} onSave={saveInstructor} onDelete={deleteInstructor} deleteError={error => (error instanceof ApiError && error.code === '23503') || /23503|foreign key|referenced/i.test(String(error)) ? 'Instruktur masih tercatat pada sesi. Data riwayat harus tetap disimpan.' : String(error)} />
      : page === 'vehicles' ? <ServerCrudPage key="vehicles" config={vehicleConfig} notice={chainNotice('vehicles')} fetchPage={fetchVehicles} fields={vehicleConfig.fields.filter(f => !f.upload)} onSave={saveVehicle} onDelete={deleteVehicle} deleteError={error => (error instanceof ApiError && error.code === '23503') || /23503|foreign key|referenced/i.test(String(error)) ? 'Mobil masih tercatat pada sesi. Data riwayat harus tetap disimpan.' : String(error)} />
      : page === 'packages' ? <ServerCrudPage key="packages" config={livePackageConfig} notice={chainNotice('packages')} fetchPage={fetchPackages} canDelete={false} onSave={savePackage} onDelete={async () => {}} />
      : <><PageHeading label={labels[page]} actions={<Button variant="primary" icon="plus" onClick={() => openSessionEditor(null)}>Jadwalkan sesi</Button>} />
      <section className="panel live-week">
        <div className="toolbar live-schedule-toolbar" aria-label="Filter jadwal">
          <div className="schedule-date-filter" ref={dateFilterRef} onKeyDown={e => { if (dateOpen && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setDateOpen(false); setCustomMode(false); setDraftFrom(''); setRangeError(''); } }}>
            <button type="button" className="btn btn-quiet schedule-date-trigger" aria-label="Filter tanggal jadwal" aria-expanded={dateOpen} aria-controls="schedule-date-popover" onClick={() => {
              if (dateOpen) { setDateOpen(false); setCustomMode(false); setDraftFrom(''); setRangeError(''); return; }
              setViewMonth(range.from); setCustomMode(false); setDraftFrom(''); setRangeError(''); setDateOpen(true);
            }}>
              <Icon name="calendar" extra="sm" />
              <span>{rangeLabel}</span>
            </button>
            {dateOpen && <section id="schedule-date-popover" className="date-picker-calendar schedule-date-popover" role="region" aria-label="Kalender filter jadwal">
              <div className="schedule-date-presets" role="group" aria-label="Preset rentang tanggal">
                <button type="button" className={!customMode && datePreset === 'hari' ? 'active' : ''} aria-pressed={!customMode && datePreset === 'hari'} onClick={() => {
                  setDatePreset('hari'); setRange({ from: witaToday, to: witaToday }); setViewMonth(witaToday);
                  setCustomMode(false); setDraftFrom(''); setRangeError(''); setDateOpen(false);
                }}>Hari ini</button>
                <button type="button" className={!customMode && datePreset === 'minggu' ? 'active' : ''} aria-pressed={!customMode && datePreset === 'minggu'} onClick={() => {
                  const start = monday(witaToday);
                  setDatePreset('minggu'); setRange({ from: start, to: moveDay(start, 6) }); setViewMonth(start);
                  setCustomMode(false); setDraftFrom(''); setRangeError(''); setDateOpen(false);
                }}>Minggu ini</button>
                <button type="button" className={!customMode && datePreset === 'bulan' ? 'active' : ''} aria-pressed={!customMode && datePreset === 'bulan'} onClick={() => {
                  setDatePreset('bulan'); setRange({ from: moveDay(witaToday, -30), to: witaToday }); setViewMonth(witaToday);
                  setCustomMode(false); setDraftFrom(''); setRangeError(''); setDateOpen(false);
                }}>1 bulan terakhir</button>
                <button type="button" className={customMode || datePreset === 'custom' ? 'active' : ''} aria-pressed={customMode || datePreset === 'custom'} onClick={() => {
                  setCustomMode(true); setDraftFrom(''); setRangeError('');
                }}>Custom</button>
              </div>
              <div className="date-picker-heading">
                <div className="schedule-date-month">
                  <select className="field-select" aria-label="Bulan kalender" value={viewMonth.slice(5, 7)} onChange={e => setViewMonth(`${viewMonth.slice(0, 4)}-${e.target.value}-01`)}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, i, 1)))}</option>)}
                  </select>
                  <select className="field-select" aria-label="Tahun kalender" value={monthYear} onChange={e => setViewMonth(`${e.target.value}-${viewMonth.slice(5, 7)}-01`)}>
                    {Array.from({ length: Math.max(2100, monthYear) - Math.min(1900, monthYear) + 1 }, (_, i) => Math.min(1900, monthYear) + i).map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <button type="button" aria-label="Bulan sebelumnya" onClick={() => setViewMonth(moveMonth(viewMonth, -1))}>
                  <svg className="icon sm" aria-hidden="true" viewBox="0 0 24 24"><path d="m14 6-6 6 6 6" /></svg>
                </button>
                <button type="button" aria-label="Bulan berikutnya" onClick={() => setViewMonth(moveMonth(viewMonth, 1))}>
                  <svg className="icon sm" aria-hidden="true" viewBox="0 0 24 24"><path d="m10 6 6 6-6 6" /></svg>
                </button>
              </div>
              <div className="date-picker-days">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => <span key={day} aria-hidden="true">{day}</span>)}
                {calendarDays.map(day => {
                  const outside = day.slice(0, 7) !== viewMonth.slice(0, 7);
                  const isSelected = customMode && draftFrom ? day === draftFrom : (day === range.from || day === range.to);
                  const inRange = (!customMode || !draftFrom) && day > range.from && day < range.to;
                  return <button key={day} type="button" data-date={day}
                    className={`${outside ? 'outside-month' : ''}${isSelected ? ' selected' : ''}${inRange ? ' in-range' : ''}`}
                    aria-label={formatDivider(day)}
                    aria-pressed={isSelected}
                    aria-current={day === witaToday ? 'date' : undefined}
                    onClick={() => {
                      if (!customMode) {
                        setDatePreset(day === witaToday ? 'hari' : 'tanggal');
                        setRange({ from: day, to: day });
                        setDateOpen(false);
                        return;
                      }
                      if (!draftFrom) {
                        setDraftFrom(day); setRangeError('');
                        return;
                      }
                      const [from, to] = day < draftFrom ? [day, draftFrom] : [draftFrom, day];
                      const span = Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
                      if (span > 30) {
                        setRangeError('Rentang maksimal 31 hari.');
                        return;
                      }
                      setDatePreset('custom'); setRange({ from, to });
                      setCustomMode(false); setDraftFrom(''); setRangeError(''); setDateOpen(false);
                    }}>{Number(day.slice(8))}</button>;
                })}
              </div>
              {customMode && <p className="schedule-date-hint">{draftFrom ? `Pilih tanggal akhir (mulai ${formatDay(draftFrom)}, maks. 31 hari).` : 'Pilih tanggal awal dan tanggal akhir pada kalender (maks. 31 hari).'}</p>}
              {rangeError && <p role="alert" className="field-error schedule-date-error">{rangeError}</p>}
            </section>}
          </div>
          <select className="field-select" aria-label="Filter status jadwal" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {['Semua status', 'Menunggu konfirmasi', 'Terkonfirmasi', 'Selesai', 'Dibatalkan', 'Tidak hadir'].map(s => <option key={s}>{s}</option>)}
          </select>
          <Button variant="quiet" disabled={range.from === defaultWeekStart && range.to === moveDay(defaultWeekStart, 6) && statusFilter === 'Semua status'} onClick={() => {
            setDatePreset('minggu'); setRange({ from: defaultWeekStart, to: moveDay(defaultWeekStart, 6) }); setViewMonth(defaultWeekStart);
            setStatusFilter('Semua status'); setDateOpen(false); setCustomMode(false); setDraftFrom(''); setRangeError('');
          }}>Reset filter</Button>
        </div>
      {loadedRange && (loadedRange.from !== range.from || loadedRange.to !== range.to) && <p role="status" className="notice">Data terakhir dari {loadedRange.from} sampai {loadedRange.to}. Rentang baru belum berhasil dimuat.</p>}
      {busy && <div role="status"><p>Memuat jadwal?</p><div className="loading-skeleton" aria-hidden="true">{[0, 1, 2].map(i => <div className="agenda-entry" key={i}><span className="skeleton-bar" /><span className="skeleton-bar" /></div>)}</div></div>}
      {!busy && !error && !rows.length && missingSchedulePrereqs && <section className="notice schedule-readiness" aria-label="Kesiapan pembuatan jadwal"><strong>Prasyarat jadwal belum lengkap</strong><p>Untuk menjadwalkan sesi latihan, pastikan paket kursus, instruktur aktif, mobil aktif, dan murid dengan paket aktif sudah tersedia.</p><ul className="readiness-list"><li><span>Paket kursus aktif: <strong>{progress.packages === null ? 'Belum dicek' : progress.packages ? 'Siap' : 'Belum ada'}</strong></span>{progress.packages === false && <Button sm onClick={() => jumpToPage('packages')}>Buka menu Paket</Button>}</li><li><span>Instruktur aktif: <strong>{hasActiveInstructor ? 'Siap' : 'Belum ada'}</strong></span>{!hasActiveInstructor && <Button sm onClick={() => jumpToPage('instructors')}>Buka menu Instruktur</Button>}</li><li><span>Mobil aktif: <strong>{hasActiveVehicle ? 'Siap' : 'Belum ada'}</strong></span>{!hasActiveVehicle && <Button sm onClick={() => jumpToPage('vehicles')}>Buka menu Mobil</Button>}</li><li><span>Data murid: <strong>{hasStudents ? 'Siap' : 'Belum ada'}</strong></span>{!hasStudents && <Button sm onClick={() => jumpToPage('students')}>Buka menu Murid</Button>}</li></ul></section>}
      {!busy && !error && !visibleRows.length && <EmptyState title={!rows.length ? 'Belum ada sesi pada rentang ini' : 'Tidak ada sesi dengan status tersebut'} description={!rows.length ? 'Ubah rentang waktu atau jadwalkan sesi baru.' : 'Coba status lain atau ubah rentang waktu.'} />}
      <div hidden={busy}>
        {(() => {
          const groups = new Map<string, Row[]>();
          for (const r of visibleRows) { const list = groups.get(r.session_date) || []; list.push(r); groups.set(r.session_date, list); }
          return [...groups].map(([day, items]) => <div className="date-group" key={day}>
            <div className="date-divider">{formatDivider(day)}{day === isoDay() ? ' · Hari ini' : ''}</div>
            <div className="live-list live-agenda">{items.map(r => <article key={r.id} className="agenda-entry">
              <div className="agenda-time">{r.start_time?.slice(0, 5)}<small>{r.end_time?.slice(0, 5)}</small></div>
              <div className="agenda-detail"><div className="agenda-primary"><strong>{lookups.students?.find(student => student.id === r.student_id)?.name || 'Murid'}</strong></div><div className="agenda-meta"><span>{r.session_date}</span><span>{r.transmission}</span><span>{lookups.instructors?.find(instructor => instructor.id === r.instructor_id)?.name}</span><span>{lookups.vehicles?.find(vehicle => vehicle.id === r.vehicle_id)?.name}</span></div></div>
              <Badge status={r.status} />
              {editableStatuses.includes(r.status) && <div className="live-session-actions"><Button sm icon="edit" onClick={() => openSessionEditor(r)}>Ubah</Button><Button sm variant="danger" disabled={busy} onClick={() => cancelSession(r.id)}>Batalkan sesi</Button></div>}
            </article>)}</div>
          </div>);
        })()}
      </div></section>
      {editorOpen && <Modal title={editing ? 'Ubah sesi latihan' : 'Jadwalkan sesi'} desc="Atur sesi latihan dalam WITA." onClose={closeEditor}>
      {form(saveRecord, <>{fields[page]?.map(f => <label className="form-field" key={`${page}-${editing?.id}-${f.key}`}>{f.label}<input name={f.key} type={f.type || 'text'} defaultValue={editing?.[f.key] ?? ''} min={f.key === 'normal_price' ? 0 : 1} max={f.key === 'normal_price' ? 99999999.99 : f.key === 'session_duration_minutes' ? 1439 : 2147483647} step={f.key === 'normal_price' ? '0.01' : 1} required={!['phone', 'description'].includes(f.key)} /></label>)}{page === 'packages' && <label className="form-field">Transmisi<select name="transmission" defaultValue={editing?.transmission || 'Matic'}><option>Matic</option><option>Manual</option></select></label>}{page === 'packages' && <label className="form-field">Status<select name="active" defaultValue={String(editing?.active ?? true)}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>}{page === 'sessions' && <>
        {editing ? <><input type="hidden" name="student_id" value={studentId} /><div className="form-field"><label htmlFor="live-student-select">Murid</label><SearchSelect id="live-student-select" aria-label="Murid untuk jadwal" value={studentId} disabled placeholder="Pilih murid" options={[{ value: '', label: 'Pilih murid' }, ...(lookups.students || []).map(s => ({ value: s.id, label: s.name }))]} /></div></>
          : <div className="form-field"><label htmlFor="live-student-select">Murid</label><SearchSelect id="live-student-select" name="student_id" {...sessionValidation('student_id')} aria-label="Murid untuk jadwal" value={studentId} disabled={busy || saving} required placeholder="Pilih murid" onChange={e => { setStudentId(e.target.value); setEnrollmentId(''); setStart(''); }} options={[{ value: '', label: 'Pilih murid' }, ...(lookups.students || []).map(s => ({ value: s.id, label: s.name }))]} />{hasLoadedLookups && !hasStudents && <small className="hint">Belum ada murid terdaftar. <button type="button" className="inline-link" onClick={() => jumpToPage('students')}>Buka menu Murid</button></small>}{sessionFeedback('student_id')}</div>}
        {editing ? <><input type="hidden" name="enrollment_id" value={enrollmentId} /><div className="form-field"><label htmlFor="live-enrollment-select">Paket murid</label><SearchSelect id="live-enrollment-select" aria-label="Murid dan paket" disabled value={enrollmentId} placeholder="Paket murid" options={selected ? [{ value: selected.id, label: `${selected.package_name} · Sisa kuota: ${selected.remaining_sessions}` }] : []} /><small className="hint">Murid dan paket mengikuti sesi saat ini.</small></div></>
          : <div className="form-field"><label htmlFor="live-enrollment-select">Paket murid</label><SearchSelect id="live-enrollment-select" {...sessionValidation('enrollment_id')} aria-label="Murid dan paket" name="enrollment_id" value={enrollmentId} disabled={!studentId || enrollmentBusy || !!enrollmentError} required placeholder={enrollmentBusy ? 'Memuat paket...' : 'Pilih paket murid'} onChange={e => setEnrollmentId(e.target.value)} options={[{ value: '', label: enrollmentBusy ? 'Memuat paket...' : 'Pilih paket murid' }, ...enrollments.filter(e => e.status === 'Aktif').map(e => ({ value: e.id, label: `${e.package_name} · ${e.remaining_sessions === undefined ? 'Kuota belum tersedia' : `Sisa kuota: ${e.remaining_sessions}`}`, disabled: !Number.isSafeInteger(e.remaining_sessions) || e.remaining_sessions <= 0 }))]} /><small className="hint">{selected ? `Transmisi ${selected.transmission} · ${selected.session_duration_minutes} menit per sesi.` : 'Pilih paket untuk melihat transmisi dan durasi.'}</small>{sessionFeedback('enrollment_id')}</div>}
        {enrollmentError && <p role="alert" className="form-field span-2">{enrollmentError}<button type="button" className="btn btn-quiet" onClick={() => setEnrollmentRevision(n => n + 1)}>Muat ulang paket</button></p>}
        {studentId && !enrollmentBusy && !enrollmentError && !enrollments.some(e => e.status === 'Aktif') && <p role="status" className="form-field span-2">Murid belum memiliki paket aktif. Tambahkan melalui menu Murid. <button type="button" className="inline-link" onClick={() => jumpToPage('students')}>Buka menu Murid</button></p>}
        <div className="form-field"><label htmlFor="live-session-date">Tanggal sesi (WITA)</label><DatePicker id="live-session-date" {...sessionValidation('session_date')} aria-label="Tanggal sesi" name="session_date" defaultValue={editing?.session_date || ''} required />{sessionFeedback('session_date')}</div>
        <div className="form-field"><label htmlFor="live-session-status">Status sesi</label><select id="live-session-status" {...sessionValidation('status')} aria-label="Status sesi" name="status" value={status} onChange={e => setStatus(e.target.value)} required>{(editing ? ['Menunggu konfirmasi', 'Terkonfirmasi', 'Selesai', 'Dibatalkan', 'Tidak hadir'] : ['Menunggu konfirmasi', 'Terkonfirmasi']).map(s => <option key={s}>{s}</option>)}</select>{sessionFeedback('status')}</div>
        <div className="form-field"><label htmlFor="live-session-start">Jam mulai (WITA)</label><TimePicker id="live-session-start" {...sessionValidation('start_time')} aria-label="Jam mulai" name="start_time" value={start} onChange={e => setStart(e.target.value)} required />{sessionFeedback('start_time')}</div>
        <div className="form-field"><label htmlFor="live-session-end">Jam selesai (otomatis)</label><TimePicker id="live-session-end" aria-label="Jam selesai" name="end_time" value={end} readOnly required /><small className="hint">Mengikuti durasi paket yang dibeli.</small></div>
        <div className="form-field"><label htmlFor="live-instructor-select">Pilih Instruktur</label><SearchSelect id="live-instructor-select" {...sessionValidation('instructor_id', 'live-instructor-hint')} aria-label="Pilih Instruktur" name="instructor_id" disabled={!resourcesReady} value={instructorOptions.some(o => o.value === instructorId) ? instructorId : ''} required placeholder="Pilih Instruktur" onChange={e => setInstructorId(e.target.value)} options={instructorOptions} /><small id="live-instructor-hint" className="hint">{!resourcesReady ? 'Pilih paket murid terlebih dahulu.' : instructorOptions.length === 1 ? 'Belum ada instruktur yang sesuai transmisi paket.' : ''}</small>{resourcesReady && instructorOptions.length === 1 && <button type="button" className="inline-link" onClick={() => jumpToPage('instructors')}>Buka menu Instruktur</button>}{sessionFeedback('instructor_id')}</div>
        <div className="form-field"><label htmlFor="live-vehicle-select">Pilih Mobil</label><SearchSelect id="live-vehicle-select" {...sessionValidation('vehicle_id', 'live-vehicle-hint')} aria-label="Pilih Mobil" name="vehicle_id" disabled={!resourcesReady} value={vehicleOptions.some(o => o.value === vehicleId) ? vehicleId : ''} required placeholder="Pilih Mobil" onChange={e => setVehicleId(e.target.value)} options={vehicleOptions} /><small id="live-vehicle-hint" className="hint">{!resourcesReady ? 'Pilih paket murid terlebih dahulu.' : vehicleOptions.length === 1 ? 'Belum ada mobil yang sesuai transmisi paket.' : ''}</small>{resourcesReady && vehicleOptions.length === 1 && <button type="button" className="inline-link" onClick={() => jumpToPage('vehicles')}>Buka menu Mobil</button>}{sessionFeedback('vehicle_id')}</div>
      </>}</>)}</Modal>}</>}
  </DashboardShell>;
}
