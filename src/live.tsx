import React, { useCallback, useEffect, useRef, useState } from 'react';
import { instructorConfig, vehicleConfig, ServerCrudPage } from './resource';
import { instructorTablePage } from './instructorTable.mjs';
import type { Api, School } from './auth';

type Row = Record<string, any>;
const fields: Record<string, { key: string; label: string; type?: string }[]> = {
  students: [{ key: 'name', label: 'Nama murid' }, { key: 'phone', label: 'WhatsApp' }],
  packages: [{ key: 'name', label: 'Nama paket' }, { key: 'total_sessions', label: 'Jumlah pertemuan', type: 'number' }],
};
const labels: Record<string, string> = { students: 'Murid', packages: 'Paket', instructors: 'Instruktur', vehicles: 'Mobil', sessions: 'Jadwal' };
const kitPages = ['instructors', 'vehicles'];

export function LiveApp({ school: profile, api }: { school: School; api: Api }) {
  const school = profile.id;
  const [page, setPage] = useState('students');
  const [rows, setRows] = useState<Row[]>([]);
  const [lookups, setLookups] = useState<Record<string, Row[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const requestSerial = useRef(0);

  async function refresh() {
    if (!school || kitPages.includes(page)) return;
    const serial = ++requestSerial.current;
    setBusy(true);
    try {
      const names = page === 'sessions' ? ['students', 'packages', 'instructors', 'vehicles', 'student_enrollments', 'sessions']
        : page === 'students' ? ['students', 'packages', 'student_enrollments', 'sessions']
        : [page];
      const all = await Promise.all(names.map(n => api(`/schools/${school}/${n}`)));
      if (serial !== requestSerial.current) return;
      const next = Object.fromEntries(names.map((n, i) => [n, all[i] as Row[]]));
      setLookups(next);
      setRows(next[page] || []);
      setError('');
    } catch (e) {
      if (serial === requestSerial.current) setError(String(e));
    }
    finally { if (serial === requestSerial.current) setBusy(false); }
  }
  useEffect(() => { refresh(); return () => { requestSerial.current++; }; }, [school, page, api]);
  async function seedDemo() {
    setBusy(true);
    try { await api(`/schools/${school}/seed-demo`, 'POST'); window.dispatchEvent(new CustomEvent('resources-reload')); if (!kitPages.includes(page)) await refresh(); setError('Data contoh tersedia.'); }
    catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function saveRecord(form: FormData) {
    if (!school) return;
    setBusy(true);
    try {
      const body: Row = Object.fromEntries(form.entries());
      if (page === 'packages') { body.total_sessions = Number(body.total_sessions); body.active = body.active === 'true'; }
      if (page === 'sessions') {
        const enrollment = lookups.student_enrollments?.find(e => e.id === body.enrollment_id);
        body.student_id = enrollment?.student_id;
      }
      const path = `/schools/${school}/${page}${editing?.id ? `/${editing.id}` : ''}`;
      await api(path, editing ? 'PATCH' : 'POST', body);
      setEditing(null);
      await refresh();
      setError('');
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function enroll(studentId: string, packageId: string) {
    if (!packageId) return;
    setBusy(true);
    try { await api(`/schools/${school}/student_enrollments`, 'POST', { student_id: studentId, package_id: packageId }); await refresh(); setError(''); }
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
  const form = (onSubmit: (f: FormData) => void, children: React.ReactNode) => <form key={editing?.id || 'new'} onSubmit={e => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}>{children}<button className="btn btn-primary" disabled={busy}>Simpan</button></form>;
  return <><h2>{profile.name}</h2>{error && <p role="alert" className="notice">{error}</p>}
    {profile.name === 'Sekolah Demo Jago Nyetir' && <div className="notice"><strong>Mode demo · data simulasi</strong><button className="btn btn-quiet" disabled={busy} onClick={seedDemo}>Muat data contoh</button></div>}<nav className="live-nav">{Object.entries(labels).map(([key, label]) => <button className="btn btn-quiet" aria-current={page === key ? 'page' : undefined} key={key} onClick={() => { setPage(key); setEditing(null); }}>{label}</button>)}</nav><section className="panel panel-pad">
      {page === 'instructors' ? <ServerCrudPage config={instructorConfig} fetchPage={fetchInstructors} onSave={saveInstructor} onDelete={deleteInstructor} deleteError={message => /23503|foreign key|referenced/i.test(message) ? 'Instruktur masih tercatat pada sesi. Data riwayat harus tetap disimpan.' : message} />
      : page === 'vehicles' ? <ServerCrudPage config={vehicleConfig} fetchPage={fetchVehicles} fields={vehicleConfig.fields.filter(f => !f.upload)} canDelete={false} onSave={saveVehicle} onDelete={async () => {}} />
      : <><h2>{labels[page]}</h2>{busy && <p>Memuat…</p>}
      <div className="live-list">{rows.map(r => <article key={r.id}><strong>{r.name || `${r.session_date} ${r.start_time}`}</strong><span>{page === 'students' ? enrollmentSummary(r.id) : page === 'sessions' ? `${lookups.students?.find(s => s.id === r.student_id)?.name || 'Murid'} · ${r.status} · ${r.start_time?.slice(0,5)}–${r.end_time?.slice(0,5)}` : `${r.active === false ? 'Nonaktif · ' : ''}${r.status || r.transmission || (r.total_sessions ? `${r.total_sessions} pertemuan` : '')}`}</span><button className="inline-link" onClick={() => setEditing(r)}>Ubah</button>{page === 'students' && <select aria-label={`Tambahkan paket untuk ${r.name}`} defaultValue="" onChange={e => { enroll(r.id, e.target.value); e.target.value = ''; }}><option value="">Tambah paket</option>{lookups.packages?.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</article>)}</div>
      {form(saveRecord, <>{fields[page]?.map(f => <label key={`${page}-${editing?.id}-${f.key}`}>{f.label}<input name={f.key} type={f.type || 'text'} defaultValue={editing?.[f.key] ?? ''} required={f.key !== 'phone'} /></label>)}{page === 'packages' && <label>Status<select name="active" defaultValue={String(editing?.active ?? true)}><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>}{page === 'sessions' && <><select name="enrollment_id" defaultValue={editing?.enrollment_id || ''} required><option value="">Pilih murid dan paket</option>{lookups.student_enrollments?.filter(e => e.status === 'Aktif').map(e => <option key={e.id} value={e.id}>{lookups.students?.find(s => s.id === e.student_id)?.name} · {e.package_name}</option>)}</select><input name="session_date" type="date" defaultValue={editing?.session_date || ''} required /><input name="start_time" type="time" defaultValue={editing?.start_time?.slice(0, 5) || ''} required /><input name="end_time" type="time" defaultValue={editing?.end_time?.slice(0, 5) || ''} required />{(['instructors', 'vehicles'] as const).map(n => <select key={n} name={n === 'instructors' ? 'instructor_id' : 'vehicle_id'} defaultValue={editing?.[n === 'instructors' ? 'instructor_id' : 'vehicle_id'] || ''} required><option value="">Pilih {labels[n]}</option>{lookups[n]?.filter(x => x.active).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>)}<select name="transmission" defaultValue={editing?.transmission || 'Matic'}><option>Matic</option><option>Manual</option></select><select name="status" defaultValue={editing?.status || 'Menunggu konfirmasi'}><option>Menunggu konfirmasi</option><option>Terkonfirmasi</option><option>Selesai</option><option>Dibatalkan</option></select></>}</>)}{editing && <button className="btn btn-quiet" onClick={() => setEditing(null)}>Batal ubah</button>}</>}</section>
  </>;
}
