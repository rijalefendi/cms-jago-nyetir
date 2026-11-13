import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createDemoStore, demoSchools } from './demoStore.mjs';
import { seed, isoDay } from './seed.mjs';
import { instructorTablePage } from './instructorTable.mjs';
import { getPackagePricing, validatePackagePricing } from './packagePricing.mjs';
import { Badge, BlockedDialog, Button, ConfirmDialog, DemoNotice, EmptyState, FormModal, Icon, PageHeading, Panel, SearchField } from './ui';
import type { FieldDef, Row } from './ui';

export type { FieldDef, Row };
export type ColumnDef = { key: 'name' | 'transmission' | 'notes' | 'status' | 'description' | 'total_sessions' | 'price'; label: string; sortable?: boolean };
export type ResourceForm = { name: string; transmission: string; notes: string; active: boolean; description?: string; total_sessions?: string; normal_price?: string; discount_price?: string; start_discount?: string; end_discount?: string };
export type ResourceConfig = {
  actionKey: string;
  label: string;
  singular: string;
  plural: string;
  description: string;
  formDesc: string;
  searchPlaceholder: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  validateForm?: (values: Record<string, string>) => Record<string, string>;
  collection: 'instructors' | 'cars' | 'packages';
  idPrefix: string;
  nameAttr?: string;
  blockedTitle: string;
  demoValidate: (form: ResourceForm, existing: Row | null, db: any) => { message: string; field: string } | null;
  deleteBlocked: (row: Row, db: any) => string;
};

const uid = (prefix: string) => prefix + Math.random().toString(36).slice(2, 8);
const demoStore = createDemoStore(localStorage);

export const packageConfig: ResourceConfig = {
  actionKey: 'package',
  label: 'Paket',
  singular: 'Paket',
  plural: 'paket',
  description: 'Kelola harga, diskon, deskripsi, jumlah sesi, dan status paket kursus contoh.',
  formDesc: 'Data hanya tersimpan di browser ini. Perubahan paket tidak mengubah jatah sesi murid yang sudah tercatat.',
  searchPlaceholder: 'Cari nama atau deskripsi...',
  columns: [
    { key: 'name', label: 'Nama', sortable: true },
    { key: 'description', label: 'Deskripsi' },
    { key: 'total_sessions', label: 'Jumlah sesi', sortable: true },
    { key: 'price', label: 'Harga berlaku' },
    { key: 'status', label: 'Status', sortable: true },
  ],
  fields: [
    { key: 'name', label: 'Nama paket', required: true, maxLength: 70 },
    { key: 'total_sessions', label: 'Jumlah sesi', type: 'number', required: true, min: 1, max: 2147483647, step: 1 },
    { key: 'normal_price', label: 'Harga normal (Rp)', type: 'currency', required: true },
    { key: 'discount_price', label: 'Harga diskon (Rp, opsional)', type: 'currency', hint: 'Isi harga diskon untuk mengaktifkan tanggal. Kosongkan untuk menonaktifkan diskon.' },
    { key: 'start_discount', label: 'Tanggal awal diskon', type: 'date', enabledBy: 'discount_price', hint: 'Wajib jika ada diskon. Mulai pukul 00.00 WITA.' },
    { key: 'end_discount', label: 'Tanggal akhir diskon', type: 'date', enabledBy: 'discount_price', hint: 'Wajib jika ada diskon. Berlaku hingga akhir tanggal ini (WITA).' },
    { key: 'active', label: 'Status', type: 'select', options: [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }] },
    { key: 'description', label: 'Deskripsi (opsional)', type: 'textarea', hint: 'Teks bebas. Gunakan Enter untuk baris baru, • atau - untuk bullet, dan 1. 2. untuk daftar bernomor. Bukan HTML.' },
  ],
  collection: 'packages',
  validateForm: validatePackagePricing,
  idPrefix: 'P',
  blockedTitle: 'Paket masih dipakai',
  demoValidate: (form) => {
    if (!form.name) return { field: 'name', message: 'Nama paket wajib diisi.' };
    const count = Number(form.total_sessions);
    if (!Number.isInteger(count) || count < 1 || count > 2147483647)
      return { field: 'total_sessions', message: 'Jumlah sesi harus berupa bilangan bulat positif.' };
    const invalid = Object.entries(validatePackagePricing(form))[0];
    if (invalid) return { field: invalid[0], message: invalid[1] };
    return null;
  },
  deleteBlocked: (row, db) => db.students.some((student: Row) => student.packageId === row.id)
    ? 'Paket ini sudah dipakai murid. Nonaktifkan paket agar riwayat dan jatah sesi murid tetap tersimpan.'
    : '',
};

export const instructorConfig: ResourceConfig = {
  actionKey: 'instructor',
  label: 'Instruktur',
  singular: 'Instruktur',
  plural: 'instruktur',
  description: 'Daftar simulasi kompetensi mengemudi dan status penugasan.',
  formDesc: 'Data hanya tersimpan di browser ini.',
  searchPlaceholder: 'Cari nama atau catatan...',
  columns: [
    { key: 'name', label: 'Nama', sortable: true },
    { key: 'transmission', label: 'Kompetensi', sortable: true },
    { key: 'notes', label: 'Catatan' },
    { key: 'status', label: 'Status', sortable: true },
  ],
  fields: [
    { key: 'name', label: 'Nama instruktur', required: true, maxLength: 70 },
    { key: 'transmission', label: 'Kompetensi', type: 'select', options: ['Matic', 'Manual', 'Matic & Manual'] },
    { key: 'active', label: 'Status', type: 'select', options: [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }] },
    { key: 'notes', label: 'Catatan (opsional)', type: 'textarea', maxLength: 300 },
  ],
  collection: 'instructors',
  idPrefix: 'I',
  nameAttr: 'instructor',
  blockedTitle: 'Instruktur masih dipakai',
  demoValidate: (form, existing, db) => {
    if (!form.name) return { field: 'name', message: 'Nama instruktur wajib diisi.' };
    const assigned = existing ? db.sessions.filter((s: Row) => s.instructorId === existing.id) : [];
    if (assigned.some((s: Row) => form.transmission !== 'Matic & Manual' && s.trans !== form.transmission))
      return { field: 'transmission', message: 'Kompetensi tidak cocok dengan sesi yang sudah tercatat. Sesuaikan sesi terlebih dahulu.' };
    if (existing?.active && !form.active && assigned.some((s: Row) => s.date >= isoDay() && !['Dibatalkan', 'Selesai'].includes(s.status)))
      return { field: 'active', message: 'Instruktur masih memiliki sesi mendatang. Pindahkan sesi sebelum menonaktifkan.' };
    return null;
  },
  deleteBlocked: (row, db) => db.sessions.some((s: Row) => s.instructorId === row.id)
    ? 'Instruktur ini tercatat pada sesi. Hapus atau pindahkan sesi terkait lebih dulu.'
    : '',
};

export const vehicleConfig: ResourceConfig = {
  actionKey: 'car',
  label: 'Mobil',
  singular: 'Mobil',
  plural: 'mobil',
  description: 'Ketersediaan unit latihan. Setiap mobil maksimal untuk satu peserta per sesi.',
  formDesc: 'Foto dikompres dan hanya tersimpan di browser ini (demo).',
  searchPlaceholder: 'Cari nama mobil...',
  columns: [
    { key: 'name', label: 'Nama', sortable: true },
    { key: 'transmission', label: 'Transmisi', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
  ],
  fields: [
    { key: 'name', label: 'Nama mobil', required: true, maxLength: 70 },
    { key: 'transmission', label: 'Transmisi', type: 'select', options: ['Matic', 'Manual'] },
    { key: 'active', label: 'Status', type: 'select', options: [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }] },
    { key: 'image', label: 'Foto mobil (opsional)', upload: true },
  ],
  collection: 'cars',
  idPrefix: 'C',
  nameAttr: 'car',
  blockedTitle: 'Mobil masih terpakai',
  demoValidate: (form, existing, db) => {
    if (!form.name) return { field: 'name', message: 'Nama mobil wajib diisi.' };
    const assigned = existing ? db.sessions.filter((s: Row) => s.carId === existing.id) : [];
    if (assigned.some((s: Row) => s.trans !== form.transmission))
      return { field: 'transmission', message: 'Transmisi tidak cocok dengan sesi yang sudah tercatat. Sesuaikan sesi terlebih dahulu.' };
    if (existing?.active && !form.active && assigned.some((s: Row) => s.date >= isoDay() && !['Dibatalkan', 'Selesai'].includes(s.status)))
      return { field: 'active', message: 'Mobil masih memiliki sesi mendatang. Pindahkan sesi sebelum menonaktifkan.' };
    return null;
  },
  deleteBlocked: (row, db) => db.sessions.some((s: Row) => s.carId === row.id)
    ? 'Mobil ini tercatat pada sesi. Hapus atau pindahkan sesi terkait lebih dulu.'
    : '',
};

type DialogState = { type: 'form'; row: Row | null } | { type: 'confirm'; row: Row } | { type: 'blocked'; row: Row; reason: string } | null;

const tableCache: Record<string, { query: string; sort: string; direction: 'asc' | 'desc'; page: number }> = {};

function useTableState(actionKey: string, rows: Row[]) {
  const cached = tableCache[actionKey] || { query: '', sort: 'name', direction: 'asc' as 'asc', page: 1 };
  const [query, setQuery] = useState(cached.query);
  const [sort, setSort] = useState(cached.sort);
  const [direction, setDirection] = useState<'asc' | 'desc'>(cached.direction);
  const [page, setPage] = useState(cached.page);
  useEffect(() => { tableCache[actionKey] = { query, sort, direction, page }; }, [actionKey, query, sort, direction, page]);
  const result = useMemo(() => instructorTablePage(rows, { query, sort, direction, page, pageSize: 10 }), [rows, query, sort, direction, page]);
  const toggleSort = (key: string) => { setDirection(sort === key && direction === 'asc' ? 'desc' : 'asc'); setSort(key); setPage(1); };
  return { query, setQuery, sort, direction, toggleSort, page: result.page, setPage, result };
}

function ResourceView({ variant, config, heading, banner, state, busy, loadError, actionError, onRetry, onAdd, onEdit, onDelete, canDelete = true }: {
  variant: 'demo' | 'live';
  config: ResourceConfig;
  heading: React.ReactNode;
  banner?: React.ReactNode;
  state: ReturnType<typeof useTableState>;
  busy?: boolean;
  loadError?: string;
  actionError?: string;
  onRetry?: () => void;
  onAdd: () => void;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
  canDelete?: boolean;
}) {
  const { query, setQuery, sort, direction, toggleSort, page, setPage, result } = state;
  const [now, setNow] = useState(() => new Date());
  const today = isoDay(now);
  useEffect(() => {
    if (config.collection !== 'packages') return;
    const refresh = () => setNow(new Date());
    const timer = window.setTimeout(refresh, 86400000 - (Date.now() + 8 * 3600000) % 86400000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [config.collection, today]);
  const priceCell = (row: Row) => {
    const pricing = getPackagePricing(row, now);
    const rupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
    const labels: Record<string, string> = { active: 'Diskon aktif', scheduled: 'Diskon terjadwal', expired: 'Diskon berakhir', invalid: 'Diskon tidak berlaku' };
    if (pricing.price === null) return <span className="muted">Harga belum diisi</span>;
    return <div className="package-price">
      {pricing.status === 'active' && <s aria-label="Harga normal">{rupiah(pricing.normalPrice!)}</s>}
      <strong>{rupiah(pricing.price)}</strong>
      {pricing.status !== 'none' && <small>{labels[pricing.status]}
        {['active', 'scheduled', 'expired'].includes(pricing.status) && <><br />{row.start_discount} – {row.end_discount} (WITA)</>}
      </small>}
    </div>;
  };
  const nameCell = (r: Row) => {
    if (variant === 'live' || !config.nameAttr) return <strong>{r.name}</strong>;
    const name = <button className="instructor-name" {...{ [`data-${config.nameAttr}`]: r.id }}>{r.name}</button>;
    if (config.fields.some(f => f.upload)) {
      return <div className="car-cell">
        {r.image
          ? <img className="resource-thumb" src={r.image} alt={`Foto ${r.name}`} />
          : <span className="resource-thumb resource-thumb-empty"><Icon name="car" extra="sm" /></span>}
        {name}
      </div>;
    }
    return name;
  };
  const cell = (r: Row, key: string) => key === 'name' ? nameCell(r)
    : key === 'transmission' ? r.transmission
    : key === 'notes' ? <span className="instructor-note">{r.notes || '—'}</span>
    : key === 'description' ? <span className="package-description">{r.description || '—'}</span>
    : key === 'total_sessions' ? `${r.total_sessions} sesi`
    : key === 'price' ? priceCell(r)
    : <Badge status={r.active ? 'Aktif' : 'Nonaktif'} />;
  return (
    <>
      {heading}
      {banner}
      {actionError && <div className="instructor-action-error" role="alert">{actionError}</div>}
      <Panel className="instructor-panel">
        <div className="instructor-toolbar">
          <SearchField
            id={variant === 'live' ? `live${config.actionKey.charAt(0).toUpperCase()}${config.actionKey.slice(1)}Search` : `${config.actionKey}Search`}
            placeholder={config.searchPlaceholder}
            ariaLabel={`Cari ${config.singular.toLowerCase()}`}
            value={query}
            onChange={setQuery}
          />
        </div>
        {variant === 'live' && busy ? <div className="instructor-empty" role="status">Memuat {config.singular.toLowerCase()}…</div>
          : loadError ? <div className="instructor-load-error" role="alert"><strong>{loadError}</strong><Button sm onClick={onRetry}>Coba lagi</Button></div>
          : result.total ? (
            <div className="instructor-table-scroll">
              <table className="instructor-table">
                <thead>
                  <tr>
                    {config.columns.map(c => c.sortable ? (
                      <th key={c.key} aria-sort={sort === c.key ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" className="table-sort" data-action={`sort-${config.actionKey}`} data-sort={c.key} aria-label={`Urutkan ${c.label}`} onClick={() => toggleSort(c.key)}>
                          {c.label} <Icon name={sort === c.key ? (direction === 'asc' ? 'sort-up' : 'sort-down') : 'sort'} extra="sm" />
                        </button>
                      </th>
                    ) : <th key={c.key}>{c.label}</th>)}
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map(r => (
                    <tr key={r.id}>
                      {config.columns.map(c => <td key={c.key}>{cell(r, c.key)}</td>)}
                      <td>
                        <div className="instructor-actions">
                          <button type="button" className="table-icon-action" data-action={`edit-${config.actionKey}`} data-id={r.id} aria-label={`Ubah ${r.name}`} title="Ubah" onClick={() => onEdit(r)}><Icon name="edit" extra="sm" /></button>
                          {canDelete && <button type="button" className="table-icon-action danger" data-action={`delete-${config.actionKey}`} data-id={r.id} aria-label={`Hapus ${r.name}`} title="Hapus" onClick={() => onDelete(r)}><Icon name="trash" extra="sm" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : variant === 'demo' ? (
            <EmptyState
              title={query ? `${config.singular} tidak ditemukan` : `Belum ada ${config.singular.toLowerCase()}`}
              action={!query && <Button variant="primary" sm data-action={`add-${config.actionKey}`} onClick={onAdd}>Tambah {config.singular.toLowerCase()}</Button>}
            />
          ) : <div className="instructor-empty">{query ? `${config.singular} tidak ditemukan.` : `Belum ada ${config.singular.toLowerCase()}.`}</div>}
        <div className="instructor-footer" hidden={variant === 'live' && (Boolean(busy) || Boolean(loadError))}>
          <span>Menampilkan {result.total ? (result.page - 1) * 10 + 1 : 0}–{Math.min(result.page * 10, result.total)} dari {result.total} {config.plural}</span>
          <div className="instructor-pages">
            <button type="button" data-action={`${config.actionKey}-page`} data-page-number="1" aria-label="Halaman pertama" disabled={result.page === 1} onClick={() => setPage(1)}><Icon name="first-page" extra="sm" /></button>
            <button type="button" data-action={`${config.actionKey}-page`} data-page-number={result.page - 1} aria-label="Halaman sebelumnya" disabled={result.page === 1} onClick={() => setPage(result.page - 1)}><Icon name="chevron-left" extra="sm" /></button>
            <span aria-current="page">{result.page}</span>
            <button type="button" data-action={`${config.actionKey}-page`} data-page-number={result.page + 1} aria-label="Halaman berikutnya" disabled={result.page === result.pageCount} onClick={() => setPage(result.page + 1)}><Icon name="chevron-right" extra="sm" /></button>
            <button type="button" data-action={`${config.actionKey}-page`} data-page-number={result.pageCount} aria-label="Halaman terakhir" disabled={result.page === result.pageCount} onClick={() => setPage(result.pageCount)}><Icon name="last-page" extra="sm" /></button>
          </div>
        </div>
      </Panel>
    </>
  );
}

function resolveDemoSchool() {
  return demoSchools.find(s => s.id === location.pathname.split('/')[2])
    || demoSchools.find(s => s.id === localStorage.getItem('active-demo-school'))
    || demoSchools[0];
}

export function DemoResourcePage({ page }: { page: string }) {
  const config = page === 'paket' ? packageConfig : page === 'mobil' ? vehicleConfig : instructorConfig;
  const school = resolveDemoSchool();
  const [db, setDb] = useState<any>(() => demoStore.load(school.id, seed));
  const [dialog, setDialog] = useState<DialogState>(null);
  useEffect(() => { setDb(demoStore.load(school.id, seed)); }, [school.id]);
  useEffect(() => {
    const onChanged = () => setDb(demoStore.load(school.id, seed));
    window.addEventListener('demo-data-changed', onChanged);
    return () => window.removeEventListener('demo-data-changed', onChanged);
  }, [school.id]);
  const rows = useMemo(
    () => config.collection === 'cars'
      ? db.cars.map((c: Row) => ({ ...c, transmission: c.trans }))
      : config.collection === 'packages' ? db.packages
      : db.instructors.map((i: Row) => ({ ...i, transmission: i.skills })),
    [db, config.collection]
  );
  useEffect(() => {
    const onEdit = (e: Event) => {
      const { kind, id } = (e as CustomEvent).detail || {};
      if (kind !== config.nameAttr) return;
      const row = rows.find((r: Row) => r.id === id);
      if (row) setDialog({ type: 'form', row });
    };
    window.addEventListener('resource-edit', onEdit);
    return () => window.removeEventListener('resource-edit', onEdit);
  }, [rows, config.nameAttr]);
  const state = useTableState(config.actionKey, rows);
  const heading = (
    <PageHeading
      label={config.label}
      description={config.description}
      actions={<Button variant="primary" data-action={`add-${config.actionKey}`} icon="plus" onClick={() => setDialog({ type: 'form', row: null })}>Tambah {config.singular.toLowerCase()}</Button>}
    />
  );
  const save = (form: any, image: string, setError: (msg: string, field?: string) => void) => {
    const existing = dialog?.type === 'form' && dialog.row ? db[config.collection].find((x: Row) => x.id === dialog.row!.id) : null;
    const error = config.demoValidate(form, existing, db);
    if (error) { setError(error.message, error.field); return; }
    const shared = config.collection === 'cars'
      ? { name: form.name, trans: form.transmission, active: form.active, image: image || '' }
      : config.collection === 'packages'
      ? { name: form.name, description: form.description || '', total_sessions: Number(form.total_sessions), active: form.active,
        normal_price: Number(form.normal_price), discount_price: form.discount_price === '' ? null : Number(form.discount_price),
        start_discount: form.start_discount || null, end_discount: form.end_discount || null }
      : { name: form.name, skills: form.transmission, notes: form.notes, active: form.active };
    if (existing) Object.assign(existing, shared);
    else db[config.collection].unshift({ id: uid(config.idPrefix), ...shared });
    demoStore.save(school.id, db);
    window.dispatchEvent(new CustomEvent('demo-data-changed'));
    window.dispatchEvent(new CustomEvent('demo-toast', { detail: `${config.singular} tersimpan di browser ini.` }));
    setDialog(null);
  };
  const confirmDelete = () => {
    if (dialog?.type !== 'confirm') return;
    const row = dialog.row;
    if (config.deleteBlocked(row, db)) { setDialog(null); return; }
    db[config.collection] = db[config.collection].filter((x: Row) => x.id !== row.id);
    demoStore.save(school.id, db);
    window.dispatchEvent(new CustomEvent('demo-data-changed'));
    window.dispatchEvent(new CustomEvent('demo-toast', { detail: `${config.singular} dihapus dari browser ini.` }));
    setDialog(null);
  };
  return (
    <>
      <ResourceView
        variant="demo"
        config={config}
        heading={heading}
        banner={<DemoNotice />}
        state={state}
        onAdd={() => setDialog({ type: 'form', row: null })}
        onEdit={row => setDialog({ type: 'form', row })}
        onDelete={row => {
          const reason = config.deleteBlocked(row, db);
          setDialog(reason ? { type: 'blocked', row, reason } : { type: 'confirm', row });
        }}
      />
      {dialog?.type === 'form' && (
        <FormModal
          title={dialog.row ? `Ubah ${config.singular.toLowerCase()}` : `Tambah ${config.singular.toLowerCase()}`}
          desc={config.formDesc}
          formName={`save-${config.actionKey}`}
          fields={config.fields}
          validateForm={config.validateForm}
          row={dialog.row}
          submitLabel={`Simpan ${config.singular.toLowerCase()}`}
          onClose={() => setDialog(null)}
          onSubmit={save}
        />
      )}
      {dialog?.type === 'confirm' && (
        <ConfirmDialog
          title={`Hapus ${config.singular.toLowerCase()}?`}
          desc={dialog.row.name}
          body={`Data ${config.singular.toLowerCase()} ini akan dihapus dari browser ini.`}
          confirmLabel={`Hapus ${config.singular.toLowerCase()}`}
          confirmAction={`confirm-delete-${config.actionKey}`}
          confirmId={dialog.row.id}
          testId={`confirm-delete-${config.actionKey}`}
          onClose={() => setDialog(null)}
          onConfirm={confirmDelete}
        />
      )}
      {dialog?.type === 'blocked' && (
        <BlockedDialog
          title={config.blockedTitle}
          desc={dialog.reason}
          note={`Riwayat sesi tetap memakai nama ${config.singular.toLowerCase()} ini.`}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}

export function ServerCrudPage({ config, fetchPage, fields, canDelete = true, onSave, onDelete, deleteError, saveError }: {
  config: ResourceConfig;
  fetchPage: (params: { search: string; sort: string; direction: 'asc' | 'desc'; page: number }) => Promise<{ items: Row[]; total: number }>;
  fields?: FieldDef[];
  canDelete?: boolean;
  onSave: (form: ResourceForm, editing: Row | null) => Promise<void>;
  onDelete: (row: Row) => Promise<void>;
  deleteError?: (message: string, row: Row) => string;
  saveError?: (message: string) => string;
}) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const serial = useRef(0);
  const state = {
    query: search, setQuery: setSearch, sort, direction,
    toggleSort: (key: string) => { setDirection(sort === key && direction === 'asc' ? 'desc' : 'asc'); setSort(key); setPage(1); },
    page, setPage,
    result: { items, total, page, pageCount: Math.max(1, Math.ceil(total / 10)) },
  };
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const serialNow = ++serial.current;
    setBusy(true);
    fetchPage({ search: query, sort, direction, page })
      .then(result => {
        if (serialNow !== serial.current) return;
        setItems(result.items);
        setTotal(result.total);
        setLoadError('');
      })
      .catch((e: unknown) => {
        if (serialNow !== serial.current) return;
        if (page > 1 && /range|PGRST103/i.test(String(e))) { setPage(1); setLoadError(''); }
        else setLoadError(`Gagal memuat ${config.singular.toLowerCase()}. Periksa koneksi lalu coba lagi.`);
      })
      .finally(() => { if (serialNow === serial.current) setBusy(false); });
  }, [fetchPage, query, sort, direction, page, reloadKey]);
  useEffect(() => {
    const onReload = () => setReloadKey(k => k + 1);
    window.addEventListener('resources-reload', onReload);
    return () => window.removeEventListener('resources-reload', onReload);
  }, []);
  const reload = () => setReloadKey(k => k + 1);
  const save = async (form: any, _image: string, setError: (msg: string, field?: string) => void) => {
    const editing = dialog?.type === 'form' ? dialog.row : null;
    setSaving(true);
    try {
      await onSave(form, editing);
      setDialog(null);
      setActionError('');
      if (page !== 1) setPage(1); else reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(saveError ? saveError(message) : message);
    } finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    if (dialog?.type !== 'confirm') return;
    const row = dialog.row;
    setSaving(true);
    try {
      await onDelete(row);
      setDialog(null);
      setActionError('');
      if (page !== 1) setPage(1); else reload();
    } catch (e) {
      setActionError(deleteError ? deleteError(String(e), row) : String(e));
      setDialog(null);
    } finally { setSaving(false); }
  };
  const heading = (
    <div className="live-instructor-heading">
      <h2>{config.label}</h2>
      <Button variant="primary" data-action={`add-${config.actionKey}`} onClick={() => { setActionError(''); setDialog({ type: 'form', row: null }); }}>+ Tambah {config.singular.toLowerCase()}</Button>
    </div>
  );
  return (
    <>
      <ResourceView
        variant="live"
        config={config}
        heading={heading}
        state={state as any}
        busy={busy}
        loadError={loadError}
        actionError={actionError}
        onRetry={reload}
        onAdd={() => { setActionError(''); setDialog({ type: 'form', row: null }); }}
        onEdit={row => { setActionError(''); setDialog({ type: 'form', row }); }}
        onDelete={row => setDialog({ type: 'confirm', row })}
        canDelete={canDelete}
      />
      {dialog?.type === 'form' && (
        <FormModal
          title={dialog.row ? `Ubah ${config.singular.toLowerCase()}` : `Tambah ${config.singular.toLowerCase()}`}
          desc={config.formDesc}
          formName={`save-${config.actionKey}`}
          fields={fields || config.fields}
          row={dialog.row}
          submitLabel={`Simpan ${config.singular.toLowerCase()}`}
          busy={saving}
          onClose={() => setDialog(null)}
          onSubmit={save}
        />
      )}
      {dialog?.type === 'confirm' && (
        <ConfirmDialog
          title={`Hapus ${config.singular.toLowerCase()}?`}
          desc={dialog.row.name}
          body={`Data ${config.singular.toLowerCase()} ini akan dihapus dari browser ini.`}
          confirmLabel={`Hapus ${config.singular.toLowerCase()}`}
          confirmAction={`confirm-delete-${config.actionKey}`}
          confirmId={dialog.row.id}
          testId={`confirm-delete-${config.actionKey}`}
          busy={saving}
          onClose={() => setDialog(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
