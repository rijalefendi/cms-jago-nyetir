import React, { useEffect, useState } from 'react';
import { DashboardShell } from './DashboardShell';
import { DemoSchoolProfile } from './DemoSchoolProfile';
import { StudentsPage } from './StudentsPage';
import { DemoResourcePage } from './resource';
import { Badge, Button, ConfirmDialog, DemoNotice, EmptyState, Field, Icon, Metric, Modal, PageHeading, showToast, type FieldDef } from './ui';
import { createDemoStore, demoSchools } from './demoStore.mjs';
import { seed } from './seed.mjs';
import { supabase } from './auth';

type Session = ReturnType<typeof seed>['sessions'][number];
const routes: Record<string, string> = { home: 'beranda', sessions: 'jadwal', students: 'murid', instructors: 'instruktur', vehicles: 'mobil', packages: 'paket', reports: 'laporan', settings: 'pengaturan' };
const pageFromUrl = () => Object.keys(routes).find(key => routes[key] === location.pathname.split('/').pop()) || 'home';
const moveDay = (day: string, delta: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0, 10); };
const monday = (day: string) => moveDay(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
const formatDate = (day: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) => new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', ...options }).format(new Date(`${day}T12:00:00Z`));
const ordered = (items: Session[]) => [...items].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
const tone = (s: Session) => ['Terkonfirmasi', 'Selesai'].includes(s.status) ? 'confirmed' : s.status === 'Menunggu konfirmasi' ? 'pending' : 'canceled';

export function DemoDashboard({ authenticated = false }: { authenticated?: boolean }) {
  const store = createDemoStore(localStorage);
  const [schoolId, setSchoolId] = useState(() => demoSchools.find(s => s.id === location.pathname.split('/')[2])?.id || localStorage.getItem('active-demo-school') || demoSchools[0].id);
  const school = demoSchools.find(s => s.id === schoolId) || demoSchools[0];
  const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: school.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [db, setDb] = useState<ReturnType<typeof seed>>(() => store.load(school.id, seed));
  const [page, setPage] = useState(pageFromUrl);
  const [date, setDate] = useState(today);
  const [view, setView] = useState(window.innerWidth <= 690 ? 'hari' : 'minggu');
  const [filter, setFilter] = useState('Semua status');
  const [detail, setDetail] = useState<Session | null>(null);
  const [editing, setEditing] = useState<Session | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [scheduledStudent, setScheduledStudent] = useState('');
  const [confirm, setConfirm] = useState<'reset' | 'cancel' | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  function navigate(next: string) { setPage(next); setDetail(null); setEditing(undefined); setConfirm(null); history.pushState(null, '', `/dasbor/${routes[next]}`); }
  useEffect(() => {
    localStorage.setItem('active-demo-school', school.id);
    setDb(store.load(school.id, seed)); setDate(today()); setDetail(null); setEditing(undefined); setConfirm(null);
  }, [school.id]);
  useEffect(() => {
    history.replaceState(null, '', `/dasbor/${routes[pageFromUrl()]}`);
    const pop = () => { setPage(pageFromUrl()); setEditing(undefined); setDetail(null); setConfirm(null); };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    const reload = () => setDb(store.load(school.id, seed));
    const toast = (e: Event) => showToast((e as CustomEvent<string>).detail);
    window.addEventListener('demo-data-changed', reload); window.addEventListener('demo-toast', toast);
    return () => { window.removeEventListener('demo-data-changed', reload); window.removeEventListener('demo-toast', toast); };
  }, [school.id]);
  function persist(next: typeof db) {
    try { store.save(school.id, next); setDb(next); window.dispatchEvent(new Event('demo-data-changed')); return true; }
    catch { setError('Gagal menyimpan data demo di browser. Coba lagi.'); return false; }
  }
  const studentName = (id: string) => db.students.find(s => s.id === id)?.name || 'Murid dihapus';
  const instructorName = (id: string) => db.instructors.find(i => i.id === id)?.name || 'Belum dipilih';
  const carName = (id: string) => db.cars.find(c => c.id === id)?.name || 'Belum dipilih';
  function validateSession(s: Session) {
    if (!db.students.some(x => x.id === s.studentId) || !/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !/^\d{2}:\d{2}$/.test(s.start) || !/^\d{2}:\d{2}$/.test(s.end) || !s.instructorId || !s.carId) return 'Isi seluruh data sesi, termasuk instruktur dan mobil.';
    if (s.start >= s.end) return 'Jam selesai harus lebih besar dari jam mulai.';
    const instructor = db.instructors.find(i => i.id === s.instructorId), car = db.cars.find(c => c.id === s.carId);
    if (!instructor?.active || !car?.active) return 'Instruktur atau mobil sedang nonaktif. Pilih sumber daya aktif.';
    if (car.trans !== s.trans) return `${car.name} menggunakan transmisi ${car.trans}. Pilih mobil ${s.trans}.`;
    if (instructor.skills !== 'Matic & Manual' && instructor.skills !== s.trans) return `${instructor.name} tidak tersedia untuk transmisi ${s.trans}.`;
    const { hoursFrom, hoursTo } = db.settings;
    if (hoursFrom && hoursTo && (s.start < hoursFrom || s.end > hoursTo)) return `Jam sesi di luar jam layanan demo (${hoursFrom}–${hoursTo}).`;
    const overlap = db.sessions.find(x => x.id !== s.id && x.date === s.date && !['Dibatalkan', 'Tidak hadir'].includes(x.status) && s.start < x.end && s.end > x.start && (x.instructorId === s.instructorId || x.carId === s.carId || x.studentId === s.studentId));
    if (overlap) return `${overlap.instructorId === s.instructorId ? `Instruktur ${instructor.name}` : overlap.carId === s.carId ? `Mobil ${car.name}` : `Murid ${studentName(s.studentId)}`} sudah terjadwal pada ${overlap.start}–${overlap.end}. Pilih waktu atau sumber daya lain.`;
    return '';
  }
  function openEditor(s: Session | null = null) { setScheduledStudent(''); setError(''); setDetail(null); setEditing(s); }
  function saveSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const next: Session = { id: editing?.id || `B${crypto.randomUUID()}`, studentId: data.studentId, date: data.date, start: data.start, end: data.end, trans: data.trans, instructorId: data.instructorId, carId: data.carId, status: data.status };
    const invalid = validateSession(next); if (invalid) { setError(invalid); return; }
    if (!persist({ ...db, sessions: editing ? db.sessions.map(s => s.id === next.id ? next : s) : [...db.sessions, next] })) return;
    setDate(next.date); navigate('sessions'); showToast('Jadwal disimpan di browser (demo), bukan booking nyata.');
  }
  function changeStatus(status: string) {
    if (!detail) return;
    if (status === 'Terkonfirmasi') { const invalid = validateSession(detail); if (invalid) { setError(invalid); return; } }
    const next = { ...db, sessions: db.sessions.map(s => s.id === detail.id ? { ...s, status } : s), students: db.students.map(s => {
      if (s.id !== detail.studentId || status !== 'Selesai' || detail.status === 'Selesai') return s;
      const done = Math.min(s.total, s.done + 1); return { ...s, done, status: done >= s.total ? 'Selesai' : s.status };
    }) };
    if (persist(next)) { setDetail(null); setConfirm(null); showToast(`Status sesi diperbarui menjadi ${status} (demo).`); }
  }
  const agenda = (items: Session[]) => items.length ? items.map(s => <div className="agenda-entry" key={s.id}><div className="agenda-time">{s.start}</div><div className={`agenda-rule ${tone(s)}`} /><div className="agenda-detail"><div className="agenda-primary"><strong>{studentName(s.studentId)}</strong><Badge status={s.status} /></div><div className="agenda-meta"><span>{s.start}–{s.end}</span><span>{s.trans}</span><span>{instructorName(s.instructorId)}</span><span>{carName(s.carId)}</span></div></div><button className="agenda-btn" type="button" data-session={s.id} aria-label={`Lihat sesi ${studentName(s.studentId)}`} onClick={() => { setError(''); setDetail(s); }}><Icon name="chevron-right" extra="sm" /></button></div>) : <div className="day-empty">Belum ada sesi</div>;
  const days = Array.from({ length: view === 'daftar' ? 14 : view === 'hari' ? 1 : 7 }, (_, i) => moveDay(view === 'minggu' ? monday(date) : date, i));
  const filtered = ordered(db.sessions.filter(s => filter === 'Semua status' || s.status === filter));
  const groupedAgenda = <>{days.map(day => <React.Fragment key={day}><div className="date-divider">{formatDate(day)}{day === today() ? ' · Hari ini' : ''}</div>{agenda(filtered.filter(s => s.date === day))}</React.Fragment>)}</>;
  const add = <Button variant="primary" icon="plus" data-action="add-session" onClick={() => openEditor()}>Jadwalkan sesi</Button>;
  const current = editing || { studentId: scheduledStudent || db.students[0]?.id || '', date, start: '', end: '', trans: 'Matic', instructorId: '', carId: '', status: 'Menunggu konfirmasi' };
  const select = (key: string, label: string, options: FieldDef['options']): FieldDef => ({ key, label, type: 'select', required: true, options });
  const sessionFields: FieldDef[] = [
    select('studentId', 'Murid', [{ value: '', label: 'Pilih murid' }, ...db.students.filter(s => s.status === 'Aktif' || s.id === current.studentId).map(s => ({ value: s.id, label: s.name }))]),
    select('trans', 'Transmisi', ['Matic', 'Manual']), { key: 'date', label: 'Tanggal sesi', type: 'date', required: true }, select('status', 'Status', ['Menunggu konfirmasi', 'Terkonfirmasi']),
    { key: 'start', label: 'Mulai (WITA)', type: 'time', required: true }, { key: 'end', label: 'Selesai (WITA)', type: 'time', required: true },
    select('instructorId', 'Instruktur', [{ value: '', label: 'Pilih instruktur' }, ...db.instructors.filter(i => i.active || i.id === current.instructorId).map(i => ({ value: i.id, label: `${i.name} · ${i.skills}` }))]),
    select('carId', 'Mobil', [{ value: '', label: 'Pilih mobil' }, ...db.cars.filter(c => c.active || c.id === current.carId).map(c => ({ value: c.id, label: `${c.name} · ${c.trans}` }))]),
  ];
  const lastDays = Array.from({ length: 7 }, (_, i) => moveDay(today(), i - 6));
  const counts = lastDays.map(day => db.sessions.filter(s => s.date === day && s.status !== 'Dibatalkan').length);
  const pageNames: Record<string, string> = { home: 'OverviewPage', sessions: 'SchedulePage', reports: 'ReportsPage', settings: 'SettingsPage' };
  return <DashboardShell school={{ ...school, role: 'owner', setup_complete: false }} page={page} onNavigate={navigate} demo={{ ...school, schools: demoSchools, onChange: setSchoolId }} loggingOut={loggingOut} onLogout={authenticated ? async () => { setLoggingOut(true); try { const result = await supabase!.auth.signOut(); if (result.error) throw result.error; } catch { showToast('Gagal keluar. Silakan coba lagi.'); } finally { setLoggingOut(false); } } : undefined}>
    <div data-react-page={pageNames[page]}>
      {page === 'students' ? <StudentsPage key={school.id} schoolId={school.id} onSchedule={student => { navigate('sessions'); setScheduledStudent(student.id); setError(''); setEditing(null); }} /> : ['instructors', 'vehicles', 'packages'].includes(page) ? <DemoResourcePage key={`${school.id}-${page}`} page={({ instructors: 'instruktur', vehicles: 'mobil', packages: 'paket' } as const)[page as 'instructors' | 'vehicles' | 'packages']} /> : page === 'settings' ? <DemoSchoolProfile key={school.id} schoolId={school.id} /> : page === 'home' ? <>
        <PageHeading label="Ringkasan" description={`${formatDate(today())} · Aktivitas dan jadwal kursus mengemudi.`} actions={add} /><DemoNotice />
        <div className="metrics"><Metric label="Sesi hari ini" value={db.sessions.filter(s => s.date === today()).length} foot="Agenda hari ini" icon="calendar" /><Metric label="Menunggu konfirmasi" value={db.sessions.filter(s => s.status === 'Menunggu konfirmasi').length} foot="Sesi yang belum final" icon="clock" tone="yellow" /><Metric label="Murid aktif" value={db.students.filter(s => s.status === 'Aktif').length} foot="Data simulasi" icon="users" /></div>
        <section className="panel"><div className="panel-head"><h2 className="panel-title">Agenda hari ini</h2><Button sm onClick={() => navigate('sessions')}>Lihat jadwal</Button></div><div className="panel-body">{db.sessions.some(s => s.date === today()) ? agenda(ordered(db.sessions.filter(s => s.date === today()))) : <EmptyState title="Belum ada sesi hari ini" />}</div></section>
      </> : page === 'sessions' ? <>
        <PageHeading label="Jadwal latihan" description="Atur waktu, instruktur, dan mobil. Penjadwalan di sini hanya simulasi lokal." actions={add} /><DemoNotice />
        <section className="panel"><div className="calendar-tools"><div className="date-nav"><Button sm icon="chevron-left" aria-label="Periode sebelumnya" onClick={() => setDate(moveDay(date, view === 'minggu' ? -7 : view === 'daftar' ? -14 : -1))}>Sebelumnya</Button><Button sm onClick={() => setDate(today())}>Hari ini</Button><Button sm icon="chevron-right" aria-label="Periode berikutnya" onClick={() => setDate(moveDay(date, view === 'minggu' ? 7 : view === 'daftar' ? 14 : 1))}>Berikutnya</Button><h3>{view === 'minggu' ? `${formatDate(days[0], { day: 'numeric', month: 'short' })} – ${formatDate(days[6], { day: 'numeric', month: 'short' })}` : formatDate(date)}</h3></div><div className="segmented" aria-label="Tampilan jadwal">{[['hari', 'Hari'], ['minggu', 'Minggu'], ['daftar', 'Daftar']].map(([key, label]) => <button type="button" key={key} data-view={key} className={view === key ? 'active' : ''} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}</div></div>
        <div className="toolbar"><div className="legend"><span className="legend-item"><i className="legend-dot" />Terkonfirmasi / selesai</span><span className="legend-item"><i className="legend-dot pending" />Menunggu</span><span className="legend-item"><i className="legend-dot canceled" />Dibatalkan</span></div><select id="scheduleFilter" className="field-select" aria-label="Filter status jadwal" value={filter} onChange={e => setFilter(e.target.value)}>{['Semua status', 'Terkonfirmasi', 'Menunggu konfirmasi', 'Selesai', 'Dibatalkan'].map(s => <option key={s}>{s}</option>)}</select></div>
        {view === 'minggu' ? <><div className="week-grid">{days.map(day => <div className="day-col" key={day}><div className="day-head"><small>{formatDate(day, { weekday: 'short' })}</small><span className={`day-number${day === today() ? ' today' : ''}`}>{Number(day.slice(8))}</span></div>{filtered.filter(s => s.date === day).map(s => <button key={s.id} type="button" className={`event-card ${tone(s)}`} data-session={s.id} title={`${studentName(s.studentId)} · ${s.status}`} onClick={() => { setError(''); setDetail(s); }}><span className="event-time">{s.start}–{s.end}</span><strong>{studentName(s.studentId)}</strong><small>{s.trans} · {carName(s.carId)}</small></button>)}</div>)}</div><div className="mobile-week-list">{groupedAgenda}</div></> : <div className="agenda-list-panel">{groupedAgenda}</div>}</section>
        <p className="notice">Konflik instruktur dan mobil dicek pada data di browser ini. Validasi server tetap wajib untuk booking nyata.</p>
      </> : <><PageHeading label="Laporan" description="Ringkasan sederhana berdasarkan data simulasi yang tersimpan di browser." actions={<Button icon="rotate" data-action="reset-demo" onClick={() => setConfirm('reset')}>Atur ulang demo</Button>} /><DemoNotice /><div className="metrics"><Metric label="Sesi dijadwalkan" value={db.sessions.length} foot="Semua tanggal" icon="calendar" /><Metric label="Sesi selesai" value={db.sessions.filter(s => s.status === 'Selesai').length} foot="Status selesai" icon="check" /><Metric label="Sesi dibatalkan" value={db.sessions.filter(s => s.status === 'Dibatalkan').length} foot="Status dibatalkan" icon="alert" /></div><section className="panel panel-pad"><h2 className="panel-title">Sesi terjadwal · 7 hari terakhir</h2><p className="panel-sub">Jumlah sesi yang belum dibatalkan per tanggal (contoh, bukan data operasional nyata)</p><div className="stat-bars">{lastDays.map((day, i) => <div className="stat-col" key={day}><b>{counts[i]}</b><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(1, counts[i] / Math.max(1, ...counts) * 100)}%` }} /></div><small>{formatDate(day, { weekday: 'short' })}</small></div>)}</div></section><p className="notice">Belum ada pelaporan pendapatan. Dashboard ini belum mencatat transaksi nyata.</p></>}
    </div>
    {editing !== undefined && <Modal title={editing ? 'Jadwalkan ulang sesi' : 'Jadwalkan sesi baru'} desc="Pemeriksaan bentrok dilakukan di browser. Tidak membuat reservasi nyata." onClose={() => setEditing(undefined)}><form data-form="save-session" onSubmit={saveSession}><div className="modal-content"><div className="form-grid">{sessionFields.map(f => <Field key={f.key} f={f} row={current} />)}<p className="hint">Durasi diisi manual untuk simulasi. Pastikan kedua sumber daya tersedia.</p></div>{error && <p id="modalError" role="alert" className="form-error visible">{error}</p>}</div><div className="modal-foot"><Button data-action="close-modal" onClick={() => setEditing(undefined)}>Batal</Button><Button variant="primary" type="submit">{editing ? 'Simpan perubahan' : 'Simpan sesi demo'}</Button></div></form></Modal>}
    {detail && !confirm && <Modal title="Detail sesi" desc="Data jadwal simulasi · waktu Asia/Makassar (WITA)" onClose={() => setDetail(null)}><div className="modal-content"><Badge status={detail.status} />{[['Murid', studentName(detail.studentId)], ['Tanggal', formatDate(detail.date)], ['Waktu', `${detail.start}–${detail.end} WITA`], ['Transmisi', detail.trans], ['Instruktur', instructorName(detail.instructorId)], ['Mobil', carName(detail.carId)]].map(([key, value]) => <div className="detail-row" key={key}><span>{key}</span><strong>{value}</strong></div>)}{error && <p role="alert" className="form-error visible">{error}</p>}</div><div className="modal-foot"><Button icon="edit" data-action="edit-session" onClick={() => openEditor(detail)}>Ubah waktu</Button>{detail.status === 'Menunggu konfirmasi' && <Button variant="primary" onClick={() => changeStatus('Terkonfirmasi')}>Konfirmasi demo</Button>}{detail.status === 'Terkonfirmasi' && <Button variant="primary" onClick={() => changeStatus('Selesai')}>Tandai selesai</Button>}{!['Selesai', 'Dibatalkan'].includes(detail.status) && <Button variant="danger" onClick={() => setConfirm('cancel')}>Batalkan</Button>}</div></Modal>}
    {confirm && <ConfirmDialog title={confirm === 'reset' ? 'Reset data demo?' : 'Batalkan sesi contoh?'} desc="Perubahan hanya berlaku pada simulasi lokal di browser ini." body={confirm === 'reset' ? 'Data tambahan pada sekolah demo aktif akan diganti dengan data contoh awal.' : 'Murid tidak menerima notifikasi otomatis.'} confirmLabel={confirm === 'reset' ? 'Ya, lanjutkan' : 'Batalkan sesi'} confirmAction={confirm === 'reset' ? 'do-reset' : 'commit-status'} onClose={() => setConfirm(null)} onConfirm={() => { if (confirm === 'cancel') changeStatus('Dibatalkan'); else if (persist(seed())) { setConfirm(null); showToast('Data demo direset.'); } }} />}
  </DashboardShell>;
}
