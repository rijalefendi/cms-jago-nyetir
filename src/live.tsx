import React, { useEffect, useRef, useState } from 'react';

type Row = Record<string, any>;
type School = { id: string; name: string; location?: string; time_zone: string };
const authUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function authRequest(path: string, body: Row) {
  const res = await fetch(`${authUrl}/auth/v1/${path}`, { method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw Error(data.msg || data.error_description || data.error || 'Authentication failed');
  return data;
}
async function api(token: string, path: string, method = 'GET', body?: Row) {
  const res = await fetch(`/api${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const raw = await res.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!res.ok) throw Error(data?.message || data?.error || (typeof data === 'string' ? data : 'Request failed'));
  return data;
}
const fields: Record<string, { key: string; label: string; type?: string }[]> = {
  students: [{ key: 'name', label: 'Nama murid' }, { key: 'phone', label: 'WhatsApp' }],
  packages: [{ key: 'name', label: 'Nama paket' }, { key: 'total_sessions', label: 'Jumlah pertemuan', type: 'number' }],
  instructors: [{ key: 'name', label: 'Nama instruktur' }, { key: 'transmission', label: 'Transmisi' }],
  vehicles: [{ key: 'name', label: 'Nama mobil' }, { key: 'transmission', label: 'Transmisi' }],
};
const labels: Record<string, string> = { students: 'Murid', packages: 'Paket', instructors: 'Instruktur', vehicles: 'Mobil', sessions: 'Jadwal' };
function ActionIcon({ kind }: { kind: 'edit' | 'trash' }) {
  return <svg className="icon sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'edit' ? <path d="M12 20h9M4 16.5 15.5 5a2.1 2.1 0 0 1 3 3L7 19.5 3 21z" /> : <path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m5 4v7m4-7v7" />}
  </svg>;
}

export function LiveApp() {
  const [token, setToken] = useState(sessionStorage.getItem('school-token') || '');
  const [schools, setSchools] = useState<School[]>([]);
  const [school, setSchool] = useState('');
  const [page, setPage] = useState('students');
  const [rows, setRows] = useState<Row[]>([]);
  const [lookups, setLookups] = useState<Record<string, Row[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [instructorQuery, setInstructorQuery] = useState('');
  const [instructorSearch, setInstructorSearch] = useState('');
  const [instructorTotal, setInstructorTotal] = useState(0);
  const [instructorLoadError, setInstructorLoadError] = useState('');
  const [instructorActionError, setInstructorActionError] = useState('');
  const [instructorSort, setInstructorSort] = useState('name');
  const [instructorDirection, setInstructorDirection] = useState<'asc' | 'desc'>('asc');
  const [instructorPage, setInstructorPage] = useState(1);
  const [showInstructorForm, setShowInstructorForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const requestSerial = useRef(0);
  const instructorResult = { items: rows, total: instructorTotal, page: instructorPage, pageCount: Math.max(1, Math.ceil(instructorTotal / 10)) };
  function sortInstructors(key: string) {
    setInstructorDirection(instructorSort === key && instructorDirection === 'asc' ? 'desc' : 'asc');
    setInstructorSort(key);
    setInstructorPage(1);
  }

  async function refreshSchools(currentToken = token) {
    const result = await api(currentToken, '/schools') as School[];
    setSchools(result);
    setSchool(s => result.some(x => x.id === s) ? s : result[0]?.id || '');
  }
  async function refresh() {
    if (!school) return;
    const serial = ++requestSerial.current;
    setBusy(true);
    try {
      if (page === 'instructors') {
        setInstructorLoadError('');
        setRows([]);
        setInstructorTotal(0);
        const params = new URLSearchParams({ page: String(instructorPage), page_size: '10', search: instructorQuery, sort: instructorSort, direction: instructorDirection });
        const result = await api(token, `/schools/${school}/instructors?${params}`) as { items: Row[]; total: number };
        if (serial !== requestSerial.current) return;
        setRows(result.items);
        setInstructorTotal(result.total);
        setInstructorLoadError('');
        setError('');
        return;
      }
      const names = page === 'sessions' ? ['students', 'packages', 'instructors', 'vehicles', 'student_enrollments', 'sessions']
        : page === 'students' ? ['students', 'packages', 'student_enrollments', 'sessions']
        : [page];
      const all = await Promise.all(names.map(n => api(token, `/schools/${school}/${n}`)));
      if (serial !== requestSerial.current) return;
      const next = Object.fromEntries(names.map((n, i) => [n, all[i] as Row[]]));
      setLookups(next);
      setRows(next[page] || []);
      setError('');
    } catch (e) {
      if (serial === requestSerial.current) {
        if (page === 'instructors' && instructorPage > 1 && /range|PGRST103/i.test(String(e))) { setInstructorPage(1); setInstructorLoadError(''); }
        else if (page === 'instructors') setInstructorLoadError('Gagal memuat instruktur. Periksa koneksi lalu coba lagi.');
        else setError(String(e));
      }
    }
    finally { if (serial === requestSerial.current) setBusy(false); }
  }
  useEffect(() => { if (token) refreshSchools().catch(e => setError(String(e))); }, [token]);
  useEffect(() => { const timer = setTimeout(() => { setInstructorQuery(instructorSearch.trim()); setInstructorPage(1); }, 250); return () => clearTimeout(timer); }, [instructorSearch]);
  useEffect(() => { refresh(); }, [school, page, instructorQuery, instructorSort, instructorDirection, instructorPage]);
  useEffect(() => { if (page === 'instructors' && showInstructorForm) document.querySelector<HTMLInputElement>('.instructor-form [name="name"]')?.focus(); }, [page, showInstructorForm, editing]);

  async function login(form: FormData) {
    setBusy(true);
    try {
      const email = String(form.get('email')); const password = String(form.get('password'));
      const data = await authRequest('token?grant_type=password', { email, password });
      sessionStorage.setItem('school-token', data.access_token);
      setToken(data.access_token); setError('');
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function signup(form: FormData) {
    setBusy(true);
    try {
      await authRequest('signup', { email: String(form.get('email')), password: String(form.get('password')) });
      setError('Account created. Confirm your email, then sign in.');
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function createSchool(form: FormData) {
    setBusy(true);
    try { await api(token, '/schools', 'POST', { name: String(form.get('name')), location: String(form.get('location')), time_zone: String(form.get('time_zone')) }); await refreshSchools(); setError(''); }
    catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function addStaff(form: FormData) {
    setBusy(true);
    try { await api(token, `/schools/${school}/members`, 'POST', { email: String(form.get('email')) }); setError('Staf ditambahkan. Akun tersebut kini bisa masuk ke sekolah ini.'); }
    catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function seedDemo() {
    setBusy(true);
    try { await api(token, `/schools/${school}/seed-demo`, 'POST'); if (page === 'instructors' && instructorPage !== 1) setInstructorPage(1); else await refresh(); setError('Data contoh tersedia.'); }
    catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function saveRecord(form: FormData) {
    if (!school) return;
    const addingInstructor = page === 'instructors' && !editing;
    if (page === 'instructors') setInstructorActionError('');
    setBusy(true);
    try {
      const body: Row = Object.fromEntries(form.entries());
      if (page === 'packages') body.total_sessions = Number(body.total_sessions);
      if (['packages', 'instructors', 'vehicles'].includes(page)) body.active = body.active === 'true';
      if (page === 'sessions') {
        const enrollment = lookups.student_enrollments?.find(e => e.id === body.enrollment_id);
        body.student_id = enrollment?.student_id;
      }
      const path = `/schools/${school}/${page}${editing?.id ? `/${editing.id}` : ''}`;
      await api(token, path, editing ? 'PATCH' : 'POST', body);
      setEditing(null); setShowInstructorForm(false);
      if (addingInstructor && instructorPage !== 1) setInstructorPage(1); else await refresh();
      if (page === 'instructors') setInstructorActionError('');
      setError('');
    } catch (e) { if (page === 'instructors') setInstructorActionError(String(e)); else setError(String(e)); } finally { setBusy(false); }
  }
  async function deleteInstructor() {
    if (!deleteTarget || !school) return;
    setInstructorActionError('');
    setBusy(true);
    try {
      await api(token, `/schools/${school}/instructors/${deleteTarget.id}`, 'DELETE');
      if (editing?.id === deleteTarget.id) { setEditing(null); setShowInstructorForm(false); }
      setDeleteTarget(null);
      if (instructorPage !== 1) setInstructorPage(1); else await refresh();
      setError('');
    } catch (e) {
      const message = String(e);
      setInstructorActionError(/23503|foreign key|referenced/i.test(message) ? 'Instruktur masih tercatat pada sesi. Data riwayat harus tetap disimpan.' : message);
      setDeleteTarget(null);
    } finally { setBusy(false); }
  }
  async function enroll(studentId: string, packageId: string) {
    if (!packageId) return;
    setBusy(true);
    try { await api(token, `/schools/${school}/student_enrollments`, 'POST', { student_id: studentId, package_id: packageId }); await refresh(); setError(''); }
    catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  function enrollmentSummary(studentId: string) {
    const enrollments = lookups.student_enrollments?.filter(e => e.student_id === studentId) || [];
    if (!enrollments.length) return 'Belum ada paket';
    return enrollments.map(e => {
      const done = (lookups.sessions || []).filter(s => s.enrollment_id === e.id && s.status === 'Selesai').length;
      return `${e.package_name}: ${done}/${e.total_sessions} pertemuan selesai`;
    }).join(' · ');
  }
  const form = (onSubmit: (f: FormData) => void, children: React.ReactNode) => <form key={editing?.id || 'new'} onSubmit={e => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}>{children}<button className="btn btn-primary" disabled={busy}>Simpan</button></form>;
  function instructorPanel() {
    const sortHeader = (key: string, label: string) => <th aria-sort={instructorSort === key ? (instructorDirection === 'asc' ? 'ascending' : 'descending') : 'none'}><button className="table-sort" onClick={() => sortInstructors(key)}>{label} <span aria-hidden="true">{instructorSort === key ? (instructorDirection === 'asc' ? '↑' : '↓') : '↕'}</span></button></th>;
    return <>
      <div className="live-instructor-heading"><h2>Instruktur</h2><button className="btn btn-primary" onClick={() => { setEditing(null); setInstructorActionError(''); setShowInstructorForm(true); }}>+ Tambah instruktur</button></div>
      {instructorActionError && <div className="instructor-action-error" role="alert">{instructorActionError}</div>}
      {showInstructorForm && <form className="instructor-form" key={editing?.id || 'new-instructor'} onSubmit={e => { e.preventDefault(); saveRecord(new FormData(e.currentTarget)); }}><h3>{editing ? 'Ubah instruktur' : 'Tambah instruktur'}</h3><label>Nama instruktur<input name="name" maxLength={70} defaultValue={editing?.name || ''} required /></label><label>Transmisi<select name="transmission" defaultValue={editing?.transmission || 'Matic'}><option>Matic</option><option>Manual</option><option>Matic &amp; Manual</option></select></label><label>Catatan<textarea name="notes" maxLength={300} defaultValue={editing?.notes || ''} /></label><label>Status<select name="active" defaultValue={String(editing?.active ?? true)}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label><div className="instructor-form-actions"><button type="button" className="btn btn-quiet" onClick={() => { setEditing(null); setShowInstructorForm(false); }}>Batal</button><button className="btn btn-primary" disabled={busy}>Simpan instruktur</button></div></form>}
      <div className="instructor-toolbar"><label className="field-search"><svg className="icon sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="liveInstructorSearch" type="search" placeholder="Cari nama atau catatan..." aria-label="Cari instruktur" value={instructorSearch} onChange={e => setInstructorSearch(e.target.value)} /></label></div>
      {busy ? <div className="instructor-empty" role="status">Memuat instruktur…</div> : instructorLoadError ? <div className="instructor-load-error" role="alert"><strong>{instructorLoadError}</strong><button type="button" className="btn btn-quiet btn-sm" onClick={() => refresh()}>Coba lagi</button></div> : instructorResult.total ? <div className="instructor-table-scroll"><table className="instructor-table"><thead><tr>{sortHeader('name', 'Nama')}{sortHeader('transmission', 'Transmisi')}<th>Catatan</th>{sortHeader('status', 'Status')}<th>Aksi</th></tr></thead><tbody>{instructorResult.items.map((r: Row) => <tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.transmission}</td><td className="instructor-note">{r.notes || '—'}</td><td><span className={`badge ${r.active ? 'info' : 'neutral'}`}>{r.active ? 'Aktif' : 'Nonaktif'}</span></td><td><div className="instructor-actions"><button className="table-icon-action" aria-label={`Ubah ${r.name}`} title="Ubah" onClick={() => { setEditing(r); setInstructorActionError(''); setShowInstructorForm(true); }}><ActionIcon kind="edit" /></button><button className="table-icon-action danger" aria-label={`Hapus ${r.name}`} title="Hapus" onClick={() => setDeleteTarget(r)}><ActionIcon kind="trash" /></button></div></td></tr>)}</tbody></table></div> : <div className="instructor-empty">{instructorQuery ? 'Instruktur tidak ditemukan.' : 'Belum ada instruktur.'}</div>}
      <div className="instructor-footer" hidden={busy || !!instructorLoadError}><span>Menampilkan {instructorResult.total ? (instructorResult.page - 1) * 10 + 1 : 0}–{Math.min(instructorResult.page * 10, instructorResult.total)} dari {instructorResult.total} instruktur</span><div className="instructor-pages"><button aria-label="Halaman pertama" disabled={instructorResult.page === 1} onClick={() => setInstructorPage(1)}>«</button><button aria-label="Halaman sebelumnya" disabled={instructorResult.page === 1} onClick={() => setInstructorPage(instructorResult.page - 1)}>‹</button><span aria-current="page">{instructorResult.page}</span><button aria-label="Halaman berikutnya" disabled={instructorResult.page === instructorResult.pageCount} onClick={() => setInstructorPage(instructorResult.page + 1)}>›</button><button aria-label="Halaman terakhir" disabled={instructorResult.page === instructorResult.pageCount} onClick={() => setInstructorPage(instructorResult.pageCount)}>»</button></div></div>
      {deleteTarget && <div className="live-dialog-backdrop" onClick={() => setDeleteTarget(null)}><div className="live-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deleteInstructorTitle" onClick={e => e.stopPropagation()}><h3 id="deleteInstructorTitle">Hapus instruktur {deleteTarget.name}?</h3><p>Data instruktur akan dihapus. Instruktur yang tercatat pada sesi tidak dapat dihapus.</p><div className="instructor-form-actions"><button className="btn btn-quiet" onClick={() => setDeleteTarget(null)}>Batal</button><button className="btn btn-danger" data-testid="confirm-delete-instructor" disabled={busy} onClick={deleteInstructor}>Hapus instruktur</button></div></div></div>}
    </>;
  }
  if (!token) return <main className="live-wrap"><h1>Jago Nyetir</h1><p>Masuk untuk mengelola sekolah mengemudi.</p>{error && <p role="alert">{error}</p>}{form(login, <><input name="email" type="email" placeholder="Email" required /><input name="password" type="password" placeholder="Kata sandi" required /></>)}<button className="btn btn-quiet" onClick={() => { const f = document.querySelector('form'); if (f) signup(new FormData(f)); }}>Daftar akun</button></main>;
  return <main className="live-wrap"><header className="live-header"><h1>Jago Nyetir</h1><button className="btn btn-quiet" onClick={() => { sessionStorage.removeItem('school-token'); setToken(''); }}>Keluar</button></header>{error && <p role="alert" className="notice">{error}</p>}
    {!schools.length ? <section className="panel panel-pad"><h2>Buat sekolah</h2>{form(createSchool, <><input name="name" placeholder="Nama sekolah" required /><input name="location" placeholder="Kota" /><select name="time_zone"><option value="Asia/Jakarta">WIB</option><option value="Asia/Makassar">WITA</option><option value="Asia/Jayapura">WIT</option></select></>)}</section> : <><select aria-label="Sekolah aktif" value={school} onChange={e => { setSchool(e.target.value); setEditing(null); setShowInstructorForm(false); setDeleteTarget(null); setInstructorActionError(''); setInstructorSearch(''); setInstructorQuery(''); setInstructorPage(1); }}>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{schools.find(s => s.id === school)?.name === 'Sekolah Demo Jago Nyetir' && <div className="notice"><strong>Mode demo · data simulasi</strong><button className="btn btn-quiet" disabled={busy} onClick={seedDemo}>Muat data contoh</button></div>}<details><summary>Tambah staf</summary><p>Staf harus mendaftar dan mengonfirmasi email lebih dulu.</p>{form(addStaff, <input name="email" type="email" placeholder="Email staf" required />)}</details><nav className="live-nav">{Object.entries(labels).map(([key, label]) => <button className="btn btn-quiet" aria-current={page === key ? 'page' : undefined} key={key} onClick={() => { setPage(key); setEditing(null); setShowInstructorForm(false); setDeleteTarget(null); setInstructorActionError(''); }}>{label}</button>)}</nav><section className="panel panel-pad">{page === 'instructors' ? instructorPanel() : <><h2>{labels[page]}</h2>{busy && <p>Memuat…</p>}
      <div className="live-list">{rows.map(r => <article key={r.id}><strong>{r.name || `${r.session_date} ${r.start_time}`}</strong><span>{page === 'students' ? enrollmentSummary(r.id) : page === 'sessions' ? `${lookups.students?.find(s => s.id === r.student_id)?.name || 'Murid'} · ${r.status} · ${r.start_time?.slice(0,5)}–${r.end_time?.slice(0,5)}` : `${r.active === false ? 'Nonaktif · ' : ''}${r.status || r.transmission || (r.total_sessions ? `${r.total_sessions} pertemuan` : '')}`}</span><button className="inline-link" onClick={() => setEditing(r)}>Ubah</button>{page === 'students' && <select aria-label={`Tambahkan paket untuk ${r.name}`} defaultValue="" onChange={e => { enroll(r.id, e.target.value); e.target.value = ''; }}><option value="">Tambah paket</option>{lookups.packages?.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</article>)}</div>
      {form(saveRecord, <>{fields[page]?.map(f => <label key={`${page}-${editing?.id}-${f.key}`}>{f.label}<input name={f.key} type={f.type || 'text'} defaultValue={editing?.[f.key] ?? ''} required={f.key !== 'phone'} /></label>)}{['packages', 'instructors', 'vehicles'].includes(page) && <label>Status<select name="active" defaultValue={String(editing?.active ?? true)}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>}{page === 'sessions' && <><select name="enrollment_id" defaultValue={editing?.enrollment_id || ''} required><option value="">Pilih murid dan paket</option>{lookups.student_enrollments?.filter(e => e.status === 'Aktif').map(e => <option key={e.id} value={e.id}>{lookups.students?.find(s => s.id === e.student_id)?.name} · {e.package_name}</option>)}</select><input name="session_date" type="date" defaultValue={editing?.session_date || ''} required /><input name="start_time" type="time" defaultValue={editing?.start_time?.slice(0, 5) || ''} required /><input name="end_time" type="time" defaultValue={editing?.end_time?.slice(0, 5) || ''} required />{(['instructors', 'vehicles'] as const).map(n => <select key={n} name={n === 'instructors' ? 'instructor_id' : 'vehicle_id'} defaultValue={editing?.[n === 'instructors' ? 'instructor_id' : 'vehicle_id'] || ''} required><option value="">Pilih {labels[n]}</option>{lookups[n]?.filter(x => x.active).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>)}<select name="transmission" defaultValue={editing?.transmission || 'Matic'}><option>Matic</option><option>Manual</option></select><select name="status" defaultValue={editing?.status || 'Menunggu konfirmasi'}><option>Menunggu konfirmasi</option><option>Terkonfirmasi</option><option>Selesai</option><option>Dibatalkan</option></select></>}</>)}{editing && <button className="btn btn-quiet" onClick={() => setEditing(null)}>Batal ubah</button>}</>}</section></>}
  </main>;
}
