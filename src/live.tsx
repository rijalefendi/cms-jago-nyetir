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
import { Badge, Button, EmptyState, Icon, Metric, Modal, PageHeading } from './ui';
const moveDay = (day: string, delta: number) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0, 10); };
const monday = (day: string) => moveDay(day, -((new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7));
const formatDay = (day: string) => { const date = new Date(`${day}T12:00:00Z`); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date) : 'Tanggal tidak tersedia'; };

type Row = Record<string, any>;
const fields: Record<string, { key: string; label: string; type?: string }[]> = {
  students: [{ key: 'name', label: 'Nama murid' }, { key: 'phone', label: 'WhatsApp' }],
  packages: [{ key: 'name', label: 'Nama paket' }, { key: 'total_sessions', label: 'Jumlah pertemuan', type: 'number' }, { key: 'normal_price', label: 'Harga (Rp)', type: 'number' }, { key: 'session_duration_minutes', label: 'Durasi per pertemuan (menit)', type: 'number' }, { key: 'description', label: 'Deskripsi (opsional)' }],
};
const labels: Record<string, string> = { students: 'Murid', packages: 'Paket', instructors: 'Instruktur', vehicles: 'Mobil', sessions: 'Jadwal' };
const kitPages = ['home', 'students', 'instructors', 'vehicles', 'packages'];
const livePackageConfig: ResourceConfig = { ...packageConfig, description: 'Kelola harga, jumlah sesi, transmisi, dan durasi paket kursus.', columns: [...packageConfig.columns.slice(0, 3), { key: 'transmission', label: 'Transmisi' }, { key: 'session_duration_minutes', label: 'Durasi' }, ...packageConfig.columns.slice(3)] };

function Home({ school, api, onSchedule }: { school: string; api: Api; onSchedule: (date?: string) => void }) {
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
  const list = (rows: Row[], empty: string) => rows.length ? <div className="live-agenda">{rows.map(row => <article className="agenda-entry" key={row.id}><div className="agenda-time">{row.start_time?.slice(0, 5)}<small>{formatDay(row.session_date)}</small></div><div className="agenda-detail"><div className="agenda-primary"><strong>{row.student_name || 'Murid tidak tersedia'}</strong><Badge status={row.status} /></div><div className="agenda-meta">{row.start_time?.slice(0, 5)}–{row.end_time?.slice(0, 5)} WITA</div></div><Button sm disabled={!row.session_date || !Number.isFinite(Date.parse(`${row.session_date}T12:00:00Z`))} onClick={() => onSchedule(row.session_date)} aria-label={`Lihat jadwal ${row.student_name || "murid"} ${formatDay(row.session_date)}`}>Lihat jadwal</Button></article>)}</div> : <div className="home-empty"><Icon name="calendar" extra="lg" /><p>{empty}</p></div>;
  return <><PageHeading label="Beranda" description="Ringkasan operasional sekolah · WITA" actions={<><Button onClick={() => setRevision(n => n + 1)} disabled={busy}>Muat ulang</Button><Button onClick={() => onSchedule()}>Buka jadwal</Button></>} />{busy ? <p role="status">Memuat beranda…</p> : error || !data ? <div role="alert" className="instructor-load-error">Gagal memuat beranda. <Button onClick={() => setRevision(n => n + 1)}>Coba lagi</Button></div> : <><div className="metrics home-metrics"><Metric label="Sesi hari ini" value={data.today_count} foot="Semua status · WITA" icon="calendar" /><Metric label="Menunggu konfirmasi" value={data.pending_count} foot="Jadwal hari ini" icon="clock" tone="yellow" /><Metric label="Sesi lewat" value={data.overdue_count} foot="Belum diperbarui · 30 hari terakhir" icon="alert" tone={data.overdue_count ? 'hot' : ''} /></div><div className="layout-two home-work"><section className="panel"><div className="panel-head"><div><h2 className="panel-title">Agenda hari ini</h2><p className="panel-sub">{data.date} · WITA</p></div><Button sm onClick={() => onSchedule()}>Lihat jadwal</Button></div>{list(data.today_sessions, 'Belum ada sesi hari ini.')}</section><section className="panel"><div className="panel-head"><div><h2 className="panel-title">Perlu ditindaklanjuti</h2><p className="panel-sub">Sesi lewat belum diperbarui · 30 hari terakhir ({moveDay(data.date, -30)}–{data.date})</p></div></div>{list(data.overdue_sessions, 'Tidak ada sesi lewat yang perlu diperbarui.')}</section></div></>}</>;
}

export function LiveApp({ school: profile, api, initialPage, onNavigate, loggingOut, onLogout }: {
  school: School; api: Api; initialPage: string; onNavigate: (page: string) => void; loggingOut: boolean; onLogout: () => void;
}) {
  const school = profile.id;
  const [page, setPage] = useState(initialPage);
  useEffect(() => {
    if (page === initialPage) return;
    setEditorOpen(false); setPage(initialPage); setRows([]); setLookups({}); setEditing(null); setStudentId(''); setStudentSearch(''); setEnrollmentId(''); setStart('');
  }, [initialPage]);
  const [rows, setRows] = useState<Row[]>([]);
  const [lookups, setLookups] = useState<Record<string, Row[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const requestSerial = useRef(0);
  const [week, setWeek] = useState(() => monday(isoDay()));
  const [loadedWeek, setLoadedWeek] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [enrollments, setEnrollments] = useState<Row[]>([]);
  const [enrollmentBusy, setEnrollmentBusy] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState('');
  const [enrollmentRevision, setEnrollmentRevision] = useState(0);
  const [start, setStart] = useState('');
  const selected = enrollments.find(e => e.id === enrollmentId && e.student_id === studentId);
  const minutes = start ? Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)) + Number(selected?.session_duration_minutes || 0) : 0;
  const end = start && selected && minutes < 1440 ? `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}` : '';

  async function refresh() {
    if (!school || kitPages.includes(page)) return;
    const serial = ++requestSerial.current;
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
          const params = new URLSearchParams({ date_from: week, date_to: moveDay(week, 6), page: String(pageNumber), page_size: '100' });
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
      if (page === 'sessions') setLoadedWeek(week);
      setLookups(next);
      setRows(next[page] || []);
      setError('');
    } catch (e) {
      if (serial === requestSerial.current) setError(String(e));
    }
    finally { if (serial === requestSerial.current) setBusy(false); }
  }
  useEffect(() => { refresh(); return () => { requestSerial.current++; }; }, [school, page, api, week]);
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
    if (!school) return;
    setBusy(true);
    try {
      const body: Row = Object.fromEntries(form.entries());
      if (editing && page === 'sessions' && body.status === 'Dibatalkan') {
        await api(`/schools/${school}/sessions/${editing.id}`, 'PATCH', { status: 'Dibatalkan' });
        setEditing(null); setEditorOpen(false); setEnrollmentId(''); setStart(''); setEnrollmentRevision(n => n + 1); await refresh(); return;
      }
      if (page === 'packages') {
        const errors = validatePackagePricing({ normal_price: body.normal_price });
        if (Object.keys(errors).length) throw Error(Object.values(errors).join(' '));
        if (!body.name?.trim() || !['Matic', 'Manual'].includes(body.transmission) || !Number.isInteger(Number(body.total_sessions)) || Number(body.total_sessions) < 1 || Number(body.total_sessions) > 2147483647 || !Number.isInteger(Number(body.session_duration_minutes)) || Number(body.session_duration_minutes) < 1 || Number(body.session_duration_minutes) > 1439) throw Error('Lengkapi nama, transmisi, jumlah sesi, dan durasi 1–1439 menit.');
        body.total_sessions = Number(body.total_sessions); body.normal_price = Number(body.normal_price); body.session_duration_minutes = Number(body.session_duration_minutes); body.active = body.active === 'true'; }
      if (page === 'sessions') {
        const enrollment = enrollments.find(e => e.id === body.enrollment_id && e.student_id === studentId);
        if (!enrollment || !end) throw Error('Pilih enrollment dan jam mulai yang valid dalam hari yang sama.');
        if (enrollmentBusy || enrollmentError) throw Error('Muat ulang paket murid sebelum menyimpan.');
        if (enrollment.id !== editing?.enrollment_id && (enrollment.status !== 'Aktif' || !Number.isSafeInteger(enrollment.remaining_sessions) || enrollment.remaining_sessions <= 0)) throw Error('Paket tidak memiliki kuota tersedia untuk sesi baru.');
        body.student_id = enrollment.student_id; body.transmission = enrollment.transmission; body.end_time = end; if (editing) body.status = editing.status;
      }
      const path = `/schools/${school}/${page}${editing?.id ? `/${editing.id}` : ''}`;
      await api(path, editing ? 'PATCH' : 'POST', body);
      setEditing(null); setEditorOpen(false);
      if (page === 'sessions') { setEnrollmentId(''); setStart(''); setEnrollmentRevision(n => n + 1); }
      await refresh();

    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function cancelSession(id: string) {
    if (busy) return;
    setBusy(true);
    try { await api(`/schools/${school}/sessions/${id}`, 'PATCH', { status: 'Dibatalkan' }); setEnrollmentRevision(n => n + 1); await refresh(); }
    catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  const fetchInstructors = useCallback(async ({ search, sort, direction, page: pageNr }: { search: string; sort: string; direction: 'asc' | 'desc'; page: number }) => {
    const params = new URLSearchParams({ page: String(pageNr), page_size: '10', search, sort, direction });
    const result = await api(`/schools/${school}/instructors?${params}`) as { items: Row[]; total: number };
    return { items: result.items, total: result.total };
  }, [api, school]);
  const saveInstructor = async (form: { name: string; transmission: string; notes: string; active: boolean }, editing: Row | null) => {
    await api(`/schools/${school}/instructors${editing?.id ? `/${editing.id}` : ''}`, editing ? 'PATCH' : 'POST', form);
  };
  const deleteInstructor = async (row: Row) => {
    await api(`/schools/${school}/instructors/${row.id}`, 'DELETE');
  };
  const fetchVehicles = useCallback(async ({ search, sort, direction, page: pageNr }: { search: string; sort: string; direction: 'asc' | 'desc'; page: number }) => {
    const list = await api(`/schools/${school}/vehicles`) as Row[];
    return instructorTablePage(list, { query: search, sort, direction, page: pageNr, pageSize: 10 });
  }, [api, school]);
  const saveVehicle = async (form: { name: string; transmission: string; notes: string; active: boolean }, editing: Row | null) => {
    await api(`/schools/${school}/vehicles${editing?.id ? `/${editing.id}` : ''}`, editing ? 'PATCH' : 'POST', { name: form.name, transmission: form.transmission, active: form.active });
  };
  const deleteVehicle = async (row: Row) => {
    await api(`/schools/${school}/vehicles/${row.id}`, 'DELETE');
  };
  const fetchPackages = useCallback(async ({ search, sort, direction, page: pageNr }: { search: string; sort: string; direction: 'asc' | 'desc'; page: number }) => {
    const list = await api(`/schools/${school}/packages`) as Row[];
    return instructorTablePage(list, { query: search, sort, direction, page: pageNr, pageSize: 10 });
  }, [api, school]);
  const savePackage = async (form: { name: string; transmission: string; active: boolean; description?: string; total_sessions?: string; session_duration_minutes?: string; normal_price?: string }, editing: Row | null) => {
    await api(`/schools/${school}/packages${editing?.id ? `/${editing.id}` : ''}`, editing ? 'PATCH' : 'POST', { name: form.name, description: form.description, transmission: form.transmission, active: form.active, total_sessions: Number(form.total_sessions), session_duration_minutes: Number(form.session_duration_minutes), normal_price: Number(form.normal_price) });
  };
  const closeEditor = () => { if (busy) return; setEditorOpen(false); setEditing(null); setStudentId(''); setStudentSearch(''); setEnrollmentId(''); setStart(''); setError(''); };
  const form = (onSubmit: (f: FormData) => void, children: React.ReactNode) => <form key={`${page}-${editing?.id || 'new'}`} onSubmit={e => { e.preventDefault(); if (busy) return; onSubmit(new FormData(e.currentTarget)); }}><div className="modal-content"><div className="form-grid">{children}</div>{error && <p role="alert" className="form-error">{error}</p>}</div><div className="modal-foot"><Button type="button" onClick={closeEditor} disabled={busy}>Batal</Button><Button variant="primary" type="submit" disabled={busy}>Simpan</Button></div></form>;
  return <DashboardShell school={profile} page={page} loggingOut={loggingOut} onLogout={onLogout} onNavigate={next => {
    if (next === 'settings') { onNavigate(next); return; }
    if (next === page) return;
    onNavigate(next);
    setEditorOpen(false); setPage(next); setRows([]); setLookups({}); setEditing(null); setStudentId(''); setStudentSearch(''); setEnrollmentId(''); setStart('');
  }}>{error && !editorOpen && <p role="alert" className="notice">{error}<button className="btn btn-quiet" onClick={refresh}>Coba lagi</button></p>}
      {page === 'home' ? <Home school={school} api={api} onSchedule={date => { if (date) setWeek(monday(date)); onNavigate('sessions'); setPage('sessions'); }} /> : page === 'students' ? <StudentsPage schoolId={school} api={api} onSchedule={(student, id) => {
        onNavigate('sessions'); setPage('sessions'); setRows([]); setLookups({}); setEditing(null); setError('');
        setStudentId(student.id); setStudentSearch(''); setEnrollmentId(id); setStart(''); setEditorOpen(true);
      }} /> : page === 'instructors' ? <ServerCrudPage key="instructors" config={instructorConfig} fetchPage={fetchInstructors} onSave={saveInstructor} onDelete={deleteInstructor} deleteError={error => (error instanceof ApiError && error.code === '23503') || /23503|foreign key|referenced/i.test(String(error)) ? 'Instruktur masih tercatat pada sesi. Data riwayat harus tetap disimpan.' : String(error)} />
      : page === 'vehicles' ? <ServerCrudPage key="vehicles" config={vehicleConfig} fetchPage={fetchVehicles} fields={vehicleConfig.fields.filter(f => !f.upload)} onSave={saveVehicle} onDelete={deleteVehicle} deleteError={error => (error instanceof ApiError && error.code === '23503') || /23503|foreign key|referenced/i.test(String(error)) ? 'Mobil masih tercatat pada sesi. Data riwayat harus tetap disimpan.' : String(error)} />
      : page === 'packages' ? <ServerCrudPage key="packages" config={livePackageConfig} fetchPage={fetchPackages} canDelete={false} onSave={savePackage} onDelete={async () => {}} />
      : <><PageHeading label={labels[page]} description={page === 'sessions' ? 'Atur sesi latihan, murid, instruktur, dan mobil. Semua jam dalam WITA.' : 'Kelola harga, jumlah sesi, transmisi, dan durasi paket kursus.'} actions={<Button variant="primary" icon="plus" onClick={() => { setError(''); setEditorOpen(true); }}>Jadwalkan sesi</Button>} />
      <section className="panel live-week"><nav className="calendar-tools" aria-label="Minggu jadwal"><Button icon="chevron-left" disabled={busy} onClick={() => setWeek(moveDay(week, -7))}>Minggu sebelumnya</Button><strong>{week} — {moveDay(week, 6)} · WITA</strong><Button disabled={busy} onClick={() => setWeek(moveDay(week, 7))}>Minggu berikutnya<Icon name="chevron-right" extra="sm" /></Button></nav>
      {page === 'sessions' && loadedWeek && loadedWeek !== week && <p role="status" className="notice">Data terakhir dari {loadedWeek} sampai {moveDay(loadedWeek, 6)}. Rentang baru belum berhasil dimuat.</p>}
      {busy && <div role="status"><p>Memuat jadwal?</p><div className="loading-skeleton" aria-hidden="true">{[0, 1, 2].map(i => <div className="agenda-entry" key={i}><span className="skeleton-bar" /><span className="skeleton-bar" /></div>)}</div></div>}
      {!busy && !rows.length && !error && <EmptyState title={page === 'sessions' ? 'Belum ada sesi minggu ini' : 'Belum ada paket kursus'} description="Tambahkan data melalui formulir di bawah." />}
      <div hidden={busy} className={`live-list ${page === 'packages' ? 'package-grid' : 'live-agenda'}`}>{rows.map(r => <article key={r.id} className={page === 'packages' ? 'package-card' : 'agenda-entry'}>
        {page === 'packages' ? <><div className="package-top"><span className="package-icon"><Icon name="package" extra="lg" /></span><Badge status={r.active ? 'Aktif' : 'Nonaktif'} /></div><h3>{r.name}</h3>{r.description && <p className="live-package-description">{r.description}</p>}<div className="package-amount">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(r.normal_price)}</div><p>{r.total_sessions} pertemuan · {r.transmission} · {r.session_duration_minutes} menit/sesi</p></>
          : <><div className="agenda-time">{r.start_time?.slice(0, 5)}<small>{r.end_time?.slice(0, 5)}</small></div><div className="agenda-detail"><div className="agenda-primary"><strong>{lookups.students?.find(student => student.id === r.student_id)?.name || 'Murid'}</strong></div><div className="agenda-meta"><span>{r.session_date}</span><span>{r.transmission}</span><span>{lookups.instructors?.find(instructor => instructor.id === r.instructor_id)?.name}</span><span>{lookups.vehicles?.find(vehicle => vehicle.id === r.vehicle_id)?.name}</span></div></div><Badge status={r.status} /></>}
        <div className={page === 'packages' ? 'package-footer' : 'live-session-actions'}><Button sm icon="edit" onClick={() => { setError(''); setEditorOpen(true); setEditing(r); setStudentId(r.student_id || ''); setStudentSearch(''); setEnrollmentId(r.enrollment_id || ''); setStart(r.start_time?.slice(0, 5) || ''); }}>Ubah</Button>{page === 'sessions' && r.status !== 'Dibatalkan' && <Button sm variant="danger" disabled={busy} onClick={() => cancelSession(r.id)}>Batalkan sesi</Button>}</div>
      </article>)}</div></section>
      {editorOpen && <Modal title={editing ? 'Ubah sesi latihan' : 'Jadwalkan sesi'} desc="Atur sesi latihan dalam WITA." onClose={closeEditor}>
      {form(saveRecord, <>{fields[page]?.map(f => <label className="form-field" key={`${page}-${editing?.id}-${f.key}`}>{f.label}<input name={f.key} type={f.type || 'text'} defaultValue={editing?.[f.key] ?? ''} min={f.key === 'normal_price' ? 0 : 1} max={f.key === 'normal_price' ? 99999999.99 : f.key === 'session_duration_minutes' ? 1439 : 2147483647} step={f.key === 'normal_price' ? '0.01' : 1} required={!['phone', 'description'].includes(f.key)} /></label>)}{page === 'packages' && <label className="form-field">Transmisi<select name="transmission" defaultValue={editing?.transmission || 'Matic'}><option>Matic</option><option>Manual</option></select></label>}{page === 'packages' && <label className="form-field">Status<select name="active" defaultValue={String(editing?.active ?? true)}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>}{page === 'sessions' && <>{!editing && <label className="form-field">Cari murid<input aria-label="Cari murid untuk jadwal" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Nama murid" /></label>}
        <label className="form-field">Murid<select aria-label="Murid untuk jadwal" value={studentId} disabled={busy} required onChange={e => { setStudentId(e.target.value); setEnrollmentId(''); setStart(''); }}><option value="">Pilih murid</option>{lookups.students?.filter(s => s.id === studentId || s.name.toLocaleLowerCase('id-ID').includes(studentSearch.toLocaleLowerCase('id-ID'))).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {editing && studentId === editing.student_id ? <input type="hidden" name="enrollment_id" value={enrollmentId} /> : <label className="form-field">Paket murid<select aria-label="Murid dan paket" name="enrollment_id" value={enrollmentId} disabled={!studentId || enrollmentBusy || !!enrollmentError} onChange={e => setEnrollmentId(e.target.value)} required><option value="">{enrollmentBusy ? 'Memuat paket...' : 'Pilih paket murid'}</option>{enrollments.filter(e => e.status === 'Aktif' || e.id === editing?.enrollment_id).map(e => <option key={e.id} value={e.id} disabled={e.id !== editing?.enrollment_id && (!Number.isSafeInteger(e.remaining_sessions) || e.remaining_sessions <= 0)}>{e.package_name} · {e.remaining_sessions === undefined ? 'Kuota belum tersedia' : `Sisa kuota: ${e.remaining_sessions}`}</option>)}</select></label>}
        {enrollmentError && <p role="alert">{enrollmentError}<button type="button" className="btn btn-quiet" onClick={() => setEnrollmentRevision(n => n + 1)}>Muat ulang paket</button></p>}
        {studentId && !enrollmentBusy && !enrollmentError && !enrollments.some(e => e.status === 'Aktif') && <p role="status">Murid belum memiliki paket aktif. Tambahkan melalui menu Murid.</p>}
        <div className="form-field"><label htmlFor="live-session-date">Tanggal sesi (WITA)</label><DatePicker id="live-session-date" aria-label="Tanggal sesi" name="session_date" defaultValue={editing?.session_date || ''} required /></div><div className="form-field"><label htmlFor="live-session-start">Jam mulai (WITA)</label><TimePicker id="live-session-start" aria-label="Jam mulai" name="start_time" value={start} onChange={e => setStart(e.target.value)} required /></div><div className="form-field"><label htmlFor="live-session-end">Jam selesai (otomatis)</label><TimePicker id="live-session-end" aria-label="Jam selesai" name="end_time" value={end} readOnly required /><small className="hint">Mengikuti durasi paket yang dibeli.</small></div>{(['instructors', 'vehicles'] as const).map(n => <label className="form-field" key={n}>Pilih {labels[n]}<select aria-label={`Pilih ${labels[n]}`} key={n} name={n === 'instructors' ? 'instructor_id' : 'vehicle_id'} defaultValue={editing?.[n === 'instructors' ? 'instructor_id' : 'vehicle_id'] || ''} required><option value="">Pilih {labels[n]}</option>{lookups[n]?.filter(x => x.active && selected && (x.transmission === selected.transmission || n === 'instructors' && x.transmission === 'Matic & Manual')).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>)}<p className="form-field">Transmisi: {selected?.transmission || 'Pilih enrollment'}</p>{!editing && <label className="form-field">Status sesi<select aria-label="Status sesi" name="status" defaultValue="Menunggu konfirmasi"><option>Menunggu konfirmasi</option><option>Terkonfirmasi</option><option>Selesai</option><option>Dibatalkan</option><option>Tidak hadir</option></select></label>}</>}</>)}</Modal>}</>}
  </DashboardShell>;
}
