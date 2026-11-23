import React, { useEffect, useState } from 'react';
import { instructorConfig, ResourceView, useTableState, type ResourceConfig, type Row } from './resource';
import { Badge, Button, DemoNotice, FormModal, Icon, Modal, PageHeading, SearchSelect } from './ui';
import { createDemoStore } from './demoStore.mjs';
import { seed, isoDay } from './seed.mjs';
import type { Api } from './auth';
import { loadPages } from './loadPages';

const config: ResourceConfig = {
  ...instructorConfig, actionKey: 'student', label: 'Murid', singular: 'Murid', plural: 'murid',
  searchPlaceholder: 'Cari nama murid...', nameAttr: undefined,
  fields: [{ key: 'name', label: 'Nama murid', required: true, maxLength: 70 }, { key: 'phone', label: 'Telepon (opsional)' }],
  columns: [{ key: 'name', label: 'Murid', sortable: true }, { key: 'phone', label: 'Telepon' }, { key: 'package', label: 'Paket' }, { key: 'progress', label: 'Progres sesi' }, { key: 'status', label: 'Status' }, { key: 'next_session', label: 'Sesi berikutnya' }],
};

export function StudentsPage({ schoolId, api, onSchedule, onOpenPackages, onProgress }: { schoolId: string; api?: Api; onSchedule?: (student: Row, enrollmentId: string) => void; onOpenPackages?: () => void; onProgress?: (patch: { students?: boolean; packages?: boolean }) => void }) {
  const [db, setDb] = useState(() => api ? { students: [], sessions: [] } : createDemoStore(localStorage).load(schoolId, seed));
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [newest, setNewest] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [detail, setDetail] = useState<Row | null>(null);
  const [createdStudent, setCreatedStudent] = useState<Row | null>(null);
  const [enrollments, setEnrollments] = useState<Row[]>([]);
  const [packages, setPackages] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyRevision, setHistoryRevision] = useState(0);
  const [packageId, setPackageId] = useState('');
  const [purchaseError, setPurchaseError] = useState('');
  const [purchased, setPurchased] = useState('');
  const purchaseLock = React.useRef(false);
  const purchaseFeedback = React.useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const demoRows = db.students.map((s: Row) => ({ ...s, description: s.package }));
  const demoState = useTableState(`student-${schoolId}`, demoRows);
  const reload = () => setRevision(n => n + 1);
  useEffect(() => {
    const changed = () => { if (!api) setDb(createDemoStore(localStorage).load(schoolId, seed)); reload(); };
    window.addEventListener('demo-data-changed', changed);
    window.addEventListener('resources-reload', changed);
    return () => { window.removeEventListener('demo-data-changed', changed); window.removeEventListener('resources-reload', changed); };
  }, [schoolId, api]);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim().slice(0, 100)); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!api) return;
    let active = true;
    setBusy(true); setError('');
    if (!newest && direction === 'desc') {
      // shortcut: load all matching students for descending order until the API supports sorting.
      loadPages(api, `/schools/${schoolId}/students`, { search: query }).then(rows => {
        if (!active) return;
        if (page > Math.max(1, Math.ceil(rows.length / 10))) { setPage(1); return; }
        setItems(rows.reverse().slice((page - 1) * 10, page * 10)); setTotal(rows.length);
        onProgress?.({ students: rows.length > 0 });
      }).catch(e => { if (active) setError(e instanceof Error ? e.message : String(e)); }).finally(() => { if (active) setBusy(false); });
      return () => { active = false; };
    }
    const params = new URLSearchParams({ search: query, page: String(page), page_size: '10' });
    if (newest) { params.set('sort', 'created_at'); params.set('direction', 'desc'); }
    api(`/schools/${schoolId}/students?${params}`).then(result => {
      if (!active) return;
      if (!Array.isArray(result?.items) || !Number.isInteger(result.total) || result.total < 0) throw Error('Respons murid tidak valid.');
      if (page > Math.max(1, Math.ceil(result.total / 10))) { setPage(1); return; }
      setItems(result.items); setTotal(result.total);
      onProgress?.({ students: result.total > 0 });
    }).catch(e => { if (active) { if (page > 1 && e.status === 416) setPage(1); else setError(e instanceof Error ? e.message : String(e)); } })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [api, schoolId, page, query, revision, direction, newest]);
  useEffect(() => {
    if (!api || !detail) return;
    let active = true;
    setDetailBusy(true); setDetailError(''); setEnrollments([]); setPackages([]);
    Promise.all([loadPages(api, `/schools/${schoolId}/student_enrollments`, { student_id: detail.id }), api(`/schools/${schoolId}/packages`)]).then(([enrollments, packages]) => {
      if (!Array.isArray(packages)) throw Error('Respons paket tidak valid.');
      if (active) { setEnrollments(enrollments); setPackages(packages); onProgress?.({ packages: packages.some(p => p.active) }); }
    }).catch(e => { if (active) setDetailError(e instanceof Error ? e.message : String(e)); }).finally(() => { if (active) setDetailBusy(false); });
    return () => { active = false; };
  }, [api, detail?.id, schoolId, revision]);
  useEffect(() => {
    if (!api || !detail) return;
    let active = true;
    setHistoryBusy(true); setHistoryError(''); setSessions([]);
    // shortcut: load complete student history for the small pilot; paginate the history UI when it grows.
    const loadSessions = async () => {
      const all = await loadPages(api, `/schools/${schoolId}/sessions`, { student_id: detail.id });
      if (all.some(s => s.student_id !== detail.id || typeof s.enrollment_id !== 'string' || typeof s.session_date !== 'string' || typeof s.start_time !== 'string' || typeof s.end_time !== 'string' || !['Menunggu konfirmasi', 'Terkonfirmasi', 'Selesai', 'Dibatalkan', 'Tidak hadir'].includes(s.status))) throw Error('Respons riwayat sesi tidak valid.');
      return all;
    };
    loadSessions().then(sessions => { if (active) setSessions(sessions); })
      .catch(e => { if (active) setHistoryError(e instanceof Error ? e.message : String(e)); }).finally(() => { if (active) setHistoryBusy(false); });
    return () => { active = false; };
  }, [api, detail?.id, schoolId, revision, historyRevision]);
  useEffect(() => { setPackageId(''); setPurchaseError(''); setPurchased(''); }, [detail?.id, schoolId]);
  useEffect(() => { if (purchaseError) purchaseFeedback.current?.focus(); }, [purchaseError]);
  const chosenPackage = packages.find(p => p.id === packageId && p.active);
  const openAdd = () => setEditing(null);
  const columns = api ? config.columns.filter(c => ['name', 'phone'].includes(c.key)) : config.columns;
  const state = api ? { query: search, setQuery: setSearch, sort: newest ? 'created_at' : 'name', direction, toggleSort: () => { if (newest) { setNewest(false); setDirection('asc'); } else setDirection(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); }, page, setPage, result: { items, total, page, pageCount: Math.max(1, Math.ceil(total / 10)) } } : { ...demoState, setQuery: (value: React.SetStateAction<string>) => { demoState.setQuery(value); demoState.setPage(1); } };
  return <>
    <ResourceView variant={api ? 'live' : 'demo'} config={{ ...config, columns }} state={state} busy={busy} loadError={error} onRetry={reload}
      heading={<PageHeading label="Murid" actions={<Button variant="primary" data-action="add-student" icon="plus" onClick={openAdd}>Tambah murid</Button>} />}
      banner={!api ? <DemoNotice /> : undefined} onAdd={openAdd} onEdit={() => {}} onDelete={() => {}} canDelete={false}
      renderCell={(row, key) => {
        if (key === 'phone') return row.phone || 'Belum diisi';
        if (key === 'package') return row.package || 'Belum ada paket';
        if (key === 'progress') return `${row.done}/${row.total} sesi`;
        if (key === 'status') return <Badge status={row.status} />;
        if (key === 'next_session') {
          const next = db.sessions.filter((s: Row) => s.studentId === row.id && s.date >= isoDay() && !['Dibatalkan', 'Selesai'].includes(s.status)).sort((a: Row, b: Row) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`))[0];
          return next ? `${next.date}, ${next.start}` : 'Belum dijadwalkan';
        }
      }}
      renderActions={row => <><button type="button" className="table-icon-action" data-student={api ? undefined : row.id} aria-label={`Lihat detail ${row.name}`} title="Lihat detail" onClick={() => { if (api) { setDetailBusy(true); setHistoryBusy(true); setDetailError(''); setHistoryError(''); setDetail(row); } else setDetail(row); }}><Icon name="info" extra="sm" /></button>{api && <button type="button" className="table-icon-action" aria-label={`Ubah data ${row.name}`} title="Ubah data" onClick={() => setEditing(row)}><Icon name="edit" extra="sm" /></button>}</>} />
    {!api && editing !== undefined && <FormModal title="Tambah murid" desc="Input peserta untuk simulasi penjadwalan." formName="add-student" fields={[
      { key: 'name', label: 'Nama murid', required: true, maxLength: 70 }, { key: 'phone', label: 'WhatsApp (opsional)' },
      { key: 'package', label: 'Paket contoh', type: 'select', search: true, options: ['Pemanasan ? Matic', 'Pemanasan ? Manual', 'Makin Lancar ? Matic', 'Makin Lancar ? Manual', 'Siap Jalan ? Matic', 'Siap Jalan ? Manual'] },
      { key: 'total', label: 'Jumlah sesi paket (contoh)', type: 'number', required: true, min: 1, max: 100, step: 1 }
    ]} row={{ total: 4 }} submitLabel="Tambah murid" onClose={() => setEditing(undefined)} onSubmit={async (form, _image, setError) => {
      const values = form as typeof form & { phone: string; package: string; total: string };
      if (values.phone && !/^(?:62|0)8\d{8,12}$/.test(String(values.phone).replace(/\D/g, ''))) { setError('Nomor WhatsApp tidak sesuai format.'); return; }
      const store = createDemoStore(localStorage), data = store.load(schoolId, seed);
      try { data.students.unshift({ id: `S${crypto.randomUUID()}`, name: form.name.trim(), phone: values.phone || '', package: values.package, total: Number(values.total), done: 0, status: 'Aktif' }); store.save(schoolId, data); window.dispatchEvent(new Event('demo-data-changed')); setEditing(undefined); }
      catch { setError('Gagal menyimpan data demo di browser.'); }
    }} />}
    {!api && detail && <Modal title={detail.name} desc="Data peserta simulasi" onClose={() => setDetail(null)}><div className="modal-content">
      {[['Paket', detail.package], ['Status', detail.status], ['Progres tercatat', `${detail.done} dari ${detail.total} sesi (demo)`], ['WhatsApp', detail.phone || 'Belum disimpan']].map(([key, value]) => <div className="detail-row" key={key}><span>{key}</span><strong>{value}</strong></div>)}
      <h3 className="panel-title">Riwayat jadwal</h3>{db.sessions.filter((s: Row) => s.studentId === detail.id).sort((a: Row, b: Row) => (a.date + a.start).localeCompare(b.date + b.start)).map((s: Row) => <div className="detail-row" key={s.id}><span>{s.date} ? {s.start}</span><Badge status={s.status} /></div>)}
    </div><div className="modal-foot"><Button data-action="close-modal" onClick={() => setDetail(null)}>Tutup</Button><Button variant="primary" icon="plus" onClick={() => { const student = detail; setDetail(null); onSchedule?.(student, ''); }}>Jadwalkan sesi</Button></div></Modal>}
    {api && editing !== undefined && <FormModal title={editing ? 'Ubah murid' : 'Tambah murid'} desc="Nama wajib diisi. Telepon opsional." formName="save-student" fields={config.fields} row={editing} submitLabel="Simpan murid" busy={saving} onClose={() => setEditing(undefined)} onSubmit={async (form, _image, setError) => {
      setSaving(true);
      try {
        const body = { name: form.name, phone: (form as any).phone || null };
        const id = await api(`/schools/${schoolId}/students${editing ? `/${editing.id}` : ''}`, editing ? 'PATCH' : 'POST', body);
        if (!editing) setCreatedStudent({ ...body, id: typeof id === 'string' && id ? id : null });
        if (!editing) onProgress?.({ students: true });
        setEditing(undefined); setDetail(null); reload();
      }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
    }} />}
    {api && createdStudent && <Modal title="Murid berhasil ditambahkan" desc={createdStudent.id ? 'Mau tambahkan paket sekarang?' : 'ID murid belum tersedia. Buka detail murid dari daftar untuk menambahkan paket.'} onClose={() => setCreatedStudent(null)}>
      <div className="modal-content"><div className="student-detail-actions">
        {createdStudent.id && <Button variant="primary" onClick={() => { setDetailBusy(true); setHistoryBusy(true); setDetail(createdStudent); setCreatedStudent(null); }}>Tambah paket</Button>}
        <Button onClick={() => setCreatedStudent(null)}>Nanti saja</Button>
      </div></div>
    </Modal>}
    {api && detail && editing === undefined && <Modal title={detail.name} desc="Paket, progres, dan riwayat sesi. Pembayaran dicatat terpisah." onClose={() => { if (!purchaseLock.current) setDetail(null); }}>
      <div className="modal-content student-detail">
        <div className="detail-row"><span>Telepon</span><strong>{detail.phone || 'Belum diisi'}</strong></div>
        {purchased && <div className="student-purchase-success" role="status"><strong>Paket berhasil ditambahkan.</strong><p>Jadwal dapat dibuat sekarang atau nanti.</p><div className="student-detail-actions">{onSchedule && <Button variant="primary" onClick={() => onSchedule(detail, purchased)}>Buat jadwal</Button>}<Button onClick={() => setDetail(null)}>Nanti saja</Button></div></div>}
        <section className="student-detail-section" aria-labelledby="student-packages-title" aria-busy={detailBusy}>
        <h3 id="student-packages-title">Paket murid</h3>
        {detailBusy ? <div className="instructor-empty" role="status">Memuat paket…</div> : detailError ? <div className="instructor-load-error" role="alert"><strong>{detailError}</strong><Button sm onClick={reload}>Coba lagi</Button></div> : <>
          {enrollments.length ? enrollments.map(e => {
            const own = sessions.filter(s => s.enrollment_id === e.id);
            const done = e.completed_sessions;
            const booked = e.scheduled_sessions;
            const hasProgress = [done, booked, e.remaining_sessions, e.total_sessions].every(n => Number.isSafeInteger(n) && n >= 0) && done + booked + e.remaining_sessions === e.total_sessions;
            const next = own.find(s => ['Menunggu konfirmasi', 'Terkonfirmasi'].includes(s.status) && `${s.session_date}T${s.start_time.slice(0, 5)}` >= new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar', dateStyle: 'short', timeStyle: 'short' }).format(new Date()).replace(' ', 'T'));
            return <section className="student-enrollment" key={e.id} aria-label={`Paket ${e.package_name}`}>
              <div className="student-enrollment-heading"><h4>{e.package_name}</h4><Badge status={e.status} /></div>
              <p className="student-package-meta">{e.total_sessions} pertemuan · {e.transmission} · {e.session_duration_minutes} menit</p>
              <div className="detail-row"><span>Harga kesepakatan</span><strong>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(e.agreed_price)}</strong></div>
              {hasProgress ? <>
                <div className="detail-row"><span>Selesai: </span><strong>{done}/{e.total_sessions}</strong></div>
                <div className="detail-row"><span>Sisa belum selesai: </span><strong>{e.total_sessions - done}</strong></div>
                <div className="detail-row"><span>Terjadwal belum selesai: </span><strong>{booked}</strong></div>
                <div className="detail-row"><span>Belum dijadwalkan: </span><strong>{e.remaining_sessions}</strong></div>
              </> : <p className="notice" role="status">Progres belum tersedia dari server.</p>}
              {e.status !== 'Aktif' && <p className="student-package-meta">Paket ini tidak aktif untuk penjadwalan baru.</p>}
              <div className="detail-row"><span>Sesi berikutnya</span><strong>{historyBusy ? 'Memuat…' : historyError ? 'Belum dapat dimuat' : next ? `${next.session_date}, ${next.start_time.slice(0, 5)} WITA` : 'Belum ada jadwal mendatang'}</strong></div>
            </section>;
          }) : <div className="instructor-empty"><strong>Belum ada paket</strong><p>Tambahkan paket di bawah untuk mencatat hak sesi murid.</p></div>}
          {enrollments.length > 0 && <p className="student-package-meta">Sesi menunggu konfirmasi dan terkonfirmasi mencadangkan kuota. Sesi dibatalkan atau tidak hadir tidak memakai kuota.</p>}
          {!purchased && <form className="student-purchase" aria-busy={saving} aria-labelledby="student-purchase-title" onSubmit={async event => {
            event.preventDefault();
            if (!chosenPackage || purchaseLock.current) return;
            purchaseLock.current = true; setSaving(true); setPurchaseError('');
            try {
              const id = await api(`/schools/${schoolId}/student_enrollments`, 'POST', { student_id: detail.id, package_id: packageId });
              if (typeof id !== 'string' || !id) throw Error('Respons pembelian tidak valid. Periksa paket murid sebelum mengulang.');
              setPurchased(id); setPackageId(''); reload();
            } catch (e) { setPurchaseError(e instanceof Error ? e.message : String(e)); } finally { purchaseLock.current = false; setSaving(false); }
          }}>
            <h4 id="student-purchase-title">Tambah paket</h4>
            <div className="form-field"><label htmlFor="student-package">Paket</label><SearchSelect id="student-package" aria-label="Paket untuk murid" disabled={saving || !packages.some(p => p.active)} value={packageId} onChange={event => { setPackageId(event.target.value); setPurchaseError(''); }} required placeholder="Pilih paket aktif" aria-describedby="student-package-hint" options={[{ value: '', label: 'Pilih paket aktif' }, ...packages.filter(p => p.active).map(p => ({ value: p.id, label: p.name }))]} /><span className="hint" id="student-package-hint">Menambahkan paket mencatat hak sesi, bukan penerimaan pembayaran.</span></div>
            {!packages.some(p => p.active) && <div className="instructor-empty"><strong>Belum ada paket aktif</strong><p>Siapkan paket aktif melalui menu Paket terlebih dahulu.</p>{onOpenPackages && <div className="student-detail-actions"><Button sm onClick={() => { setDetail(null); onOpenPackages(); }}>Buka menu Paket</Button></div>}</div>}
            {chosenPackage && <div className="student-package-preview"><strong>{chosenPackage.name}</strong><p>{chosenPackage.total_sessions} pertemuan · {chosenPackage.transmission} · {chosenPackage.session_duration_minutes} menit</p><strong>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(chosenPackage.normal_price)}</strong></div>}
            {purchaseError && <div ref={purchaseFeedback} className="notice form-feedback" role="alert" tabIndex={-1}>{purchaseError}</div>}
            <Button variant="primary" type="submit" disabled={saving || !chosenPackage}>{saving ? 'Menyimpan...' : 'Tambahkan paket'}</Button>
          </form>}
        </>}
        </section>
        <section className="student-detail-section" aria-labelledby="student-history-title" aria-busy={historyBusy}>
        <h3 id="student-history-title">Riwayat sesi</h3>
        {historyBusy ? <div className="instructor-empty" role="status">Memuat riwayat sesi…</div> : historyError ? <div className="instructor-load-error" role="alert"><strong>{historyError}</strong><Button sm onClick={() => setHistoryRevision(n => n + 1)}>Coba lagi</Button></div> : sessions.length ? <ol className="student-session-history">{sessions.map(s => <li key={s.id}><div><strong>{s.session_date} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} WITA</strong><p>{enrollments.find(e => e.id === s.enrollment_id)?.package_name || (detailBusy || detailError ? 'Informasi paket belum dimuat' : 'Paket tidak tersedia')}</p></div><Badge status={s.status} /></li>)}</ol> : <div className="instructor-empty"><strong>Belum ada sesi</strong><p>Paket dapat dijadwalkan nanti melalui menu Jadwal.</p></div>}
        </section>
      </div>
    </Modal>}
  </>;
}
