import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, type Api } from './auth';
import { Badge, Button, ConfirmDialog, EmptyState, Icon, Modal, PageHeading, showToast } from './ui';

type Invitation = { id: string; email: string; school_name: string; created_at: string; expires_at: string; accepted_at: string | null; revoked_at: string | null };
type Result = { items: Invitation[]; total: number; page: number; pageSize: number };

export function Invitations({ api, schoolId, onAccepted }: { api: Api; schoolId?: string; onAccepted?: () => Promise<void> }) {
  const owner = Boolean(schoolId);
  const path = owner ? `/schools/${schoolId}/invitations` : '/invitations';
  const [page, setPage] = useState(1);
  const [section, setSection] = useState<'active' | 'invitations'>('invitations');
  const [members, setMembers] = useState<{ user_id: string; email: string | null; role: string; created_at: string }[] | null>(null);
  const [memberError, setMemberError] = useState('');
  const [memberAttempt, setMemberAttempt] = useState(0);
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api(`${path}?page=${page}&page_size=10`);
      if (!result || !Array.isArray(result.items) || typeof result.total !== 'number') throw Error('Respons undangan tidak valid.');
      setData(result); setError('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 416 && page > 1) { setPage(page - 1); return; }
      setData(null); setError(e instanceof Error ? e.message : 'Gagal memuat undangan.');
    } finally { setLoading(false); }
  }, [api, path, page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!schoolId || section !== 'active') return; let active = true; setMembers(null); setMemberError(''); api(`/schools/${schoolId}/members?sort=created_at&direction=desc`).then(result => { if (!Array.isArray(result)) throw Error('Respons anggota tidak valid.'); if (active) setMembers(result); }).catch(e => { if (active) setMemberError(e instanceof Error ? e.message : 'Gagal memuat staff.'); }); return () => { active = false; }; }, [api, schoolId, section, memberAttempt]);
  async function action(kind: 'create' | 'revoke' | 'accept', id?: string) {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    try {
      if (kind === 'create') { await api(path, 'POST', { email }); setEmail(''); setCreating(false); showToast('Undangan dibuat.'); }
      if (kind === 'revoke') { await api(`${path}/${id}`, 'DELETE'); showToast('Undangan dibatalkan.'); }
      if (kind === 'accept') { await api(`/invitations/${id}/accept`, 'POST'); await onAccepted?.(); }
      setConfirm(null); await load();
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Permintaan gagal. Silakan coba lagi.';
      if (kind === 'accept' || (e instanceof ApiError && [404, 409].includes(e.status))) {
        if (kind === 'accept') await onAccepted?.();
        await load();
      }
      setError(text);
    } finally { working.current = false; setBusy(false); }
  }
  const status = (row: Invitation) => row.accepted_at ? 'Diterima' : row.revoked_at ? 'Dibatalkan' : Date.parse(row.expires_at) <= Date.now() ? 'Kedaluwarsa' : 'Menunggu konfirmasi';
  const date = (value: string) => new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const createButton = <Button variant="primary" icon="plus" onClick={() => { setError(''); setCreating(true); }}>Buat undangan</Button>;
  return <>
    <PageHeading label={owner ? 'Staff' : 'Inbox Undangan'} description={owner ? 'Kelola staff dan undangan sekolah.' : 'Periksa undangan sekolah untuk akun Anda.'} actions={owner && section === 'invitations' && createButton} />
    {owner && <nav className="segmented staff-sections" aria-label="Bagian staff"><button type="button" className={section === 'active' ? 'active' : ''} aria-pressed={section === 'active'} onClick={() => setSection('active')}>Staff aktif</button><button type="button" className={section === 'invitations' ? 'active' : ''} aria-pressed={section === 'invitations'} onClick={() => setSection('invitations')}>Undangan</button></nav>}
    {owner && section === 'active' ? <section className="panel invitation-panel"><div className="panel-head"><h2 className="panel-title">Staff aktif</h2></div>{memberError ? <div className="instructor-load-error" role="alert">{memberError}<Button onClick={() => setMemberAttempt(n => n + 1)}>Coba lagi</Button></div> : !members ? <p className="instructor-empty" role="status">Memuat staff...</p> : !members.some(member => member.role === 'staff') ? <EmptyState icon="users" title="Belum ada staff" description="Undang staff untuk bergabung ke sekolah." /> : <div className="instructor-table-scroll"><table className="instructor-table"><thead><tr><th>Email</th><th>Bergabung</th></tr></thead><tbody>{members.filter(member => member.role === 'staff').map(member => <tr key={member.user_id}><td data-label="Email">{member.email || 'Email tidak tersedia'}</td><td data-label="Bergabung">{date(member.created_at)}</td></tr>)}</tbody></table></div>}</section> : <>
    {error && !creating && <div role="alert" className="instructor-load-error"><strong>{error}</strong><Button sm onClick={load} disabled={loading || busy}>Coba lagi</Button></div>}
    <section className="panel instructor-panel invitation-panel">
      <div className="panel-head"><div><h2 className="panel-title">{owner ? 'Riwayat undangan' : 'Undangan tersedia'}</h2><p className="panel-sub">{owner ? 'Undangan yang dibuat beserta statusnya.' : 'Terima undangan untuk bergabung sebagai staff.'}</p></div></div>
      {loading ? <div className="instructor-empty" role="status">Memuat undangan...</div> : data && !data.items.length ? <EmptyState icon={owner ? 'users' : 'message'} title="Belum ada undangan" description={owner ? 'Buat undangan untuk menambahkan staff ke sekolah.' : 'Undangan untuk akun ini akan muncul di sini.'} action={owner && createButton} /> : data && <div className="instructor-table-scroll"><table className="instructor-table"><thead><tr>{(owner ? ['Email', 'Dibuat', 'Berlaku hingga', 'Status', 'Aksi'] : ['Sekolah', 'Berlaku hingga', 'Aksi']).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map(row => <tr key={row.id}>
        <td data-label={owner ? 'Email' : 'Sekolah'}><strong>{owner ? row.email : row.school_name}</strong></td>
        {owner && <td data-label="Dibuat">{date(row.created_at)}</td>}<td data-label="Berlaku hingga">{date(row.expires_at)}</td>
        {owner && <td data-label="Status"><Badge status={status(row)} /></td>}
        <td data-label="Aksi">{owner ? status(row) === 'Menunggu konfirmasi' && <Button sm variant="danger" disabled={busy} onClick={() => setConfirm(row.id)}>Batalkan</Button> : <Button sm variant="primary" disabled={busy} onClick={() => action('accept', row.id)}>Terima undangan</Button>}</td>
      </tr>)}</tbody></table></div>}
      {data && !loading && <div className="instructor-footer"><span>Menampilkan {data.total ? (page - 1) * 10 + 1 : 0}?{Math.min(page * 10, data.total)} dari {data.total} undangan</span><div className="instructor-pages"><button type="button" aria-label="Halaman sebelumnya" disabled={busy || page <= 1} onClick={() => setPage(page - 1)}><Icon name="chevron-left" extra="sm" /></button><span aria-current="page">{page}</span><button type="button" aria-label="Halaman berikutnya" disabled={busy || page * 10 >= data.total} onClick={() => setPage(page + 1)}><Icon name="chevron-right" extra="sm" /></button></div></div>}
    </section>
    </>}
    {creating && <Modal title="Buat undangan staff" desc="Undang staff menggunakan alamat email akun mereka." onClose={() => { if (!busy) setCreating(false); }}><form onSubmit={e => { e.preventDefault(); void action('create'); }}><div className="modal-content"><div className="form-field"><label htmlFor="invitation-email">Email staff</label><input id="invitation-email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /><small className="hint">Penerima perlu masuk dan menerima undangan di inbox.</small></div>{error && <p role="alert" className="form-error">{error}</p>}</div><div className="modal-foot"><Button disabled={busy} onClick={() => setCreating(false)}>Batal</Button><Button type="submit" variant="primary" disabled={busy}>{busy ? 'Menyimpan...' : 'Buat undangan'}</Button></div></form></Modal>}
    {confirm && <ConfirmDialog title="Batalkan undangan?" desc={data?.items.find(row => row.id === confirm)?.email || ''} body="Penerima tidak dapat menggunakan undangan ini setelah dibatalkan." confirmLabel="Batalkan undangan" confirmAction="revoke-invitation" busy={busy} onClose={() => { if (!busy) setConfirm(null); }} onConfirm={() => action('revoke', confirm)} />}
  </>;
}
