import React, { useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ApiError, request, supabase } from './auth';
import { LoginLayout } from './LoginLayout';
import { Button } from './ui';

export function AcceptInvitation({ session, invitationId, restoreError, onComplete }: { session: Session | null; invitationId: string; restoreError: string; onComplete: () => void }) {
  const [busy, setBusy] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitationId);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current || !session || !validId) return;
    const values = new FormData(e.currentTarget);
    const password = String(values.get('password') || '');
    if (!passwordSaved && (password.length < 8 || password !== values.get('confirm'))) {
      setError(password.length < 8 ? 'Kata sandi harus minimal 8 karakter.' : 'Konfirmasi kata sandi belum sama.'); return;
    }
    pending.current = true; setBusy(true); setError('');
    try {
      if (!passwordSaved) {
        const result = await supabase!.auth.updateUser({ password });
        if (result.error) throw result.error;
        setPasswordSaved(true);
      }
      if (!accepted) { await request(session.user.id, `/invitations/${invitationId}/accept`, 'POST'); setAccepted(true); }
      const schools = await request(session.user.id, '/schools', 'GET', undefined, true);
      if (!Array.isArray(schools) || schools.length !== 1 || !schools[0]?.id || typeof schools[0].setup_complete !== 'boolean' || !['owner', 'staff'].includes(schools[0].role)) throw Error('Membership belum tersedia.');
      onComplete();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? 'Undangan tidak lagi berlaku atau akun sudah memiliki sekolah. Hubungi owner.' : e instanceof ApiError && e.status === 404 ? 'Undangan tidak ditemukan atau tidak sesuai dengan akun ini. Hubungi owner.' : 'Proses belum berhasil. Periksa koneksi atau hubungi owner sebelum mencoba lagi.');
    } finally { pending.current = false; setBusy(false); }
  }
  const unavailable = !session || !validId || Boolean(restoreError);
  return <LoginLayout><section className="panel panel-pad auth-panel"><div className="auth-intro"><h1>Terima undangan staff</h1><p>{unavailable ? 'Tautan undangan tidak valid atau kedaluwarsa. Hubungi owner untuk bantuan.' : `Anda masuk sebagai ${session.user.email || 'akun undangan'}. Atur kata sandi untuk melanjutkan.`}</p></div>
    {!unavailable && <form className="auth-form" onSubmit={submit} aria-busy={busy}>
      {!passwordSaved && <><label className="form-field">Kata sandi<input name="password" type="password" minLength={8} required autoComplete="new-password" disabled={busy} /></label><label className="form-field">Konfirmasi kata sandi<input name="confirm" type="password" required autoComplete="new-password" disabled={busy} /></label></>}
      {passwordSaved && <p>Kata sandi tersimpan. Lanjutkan untuk menerima undangan.</p>}
      {error && <p role="alert" className="notice auth-error">{error}</p>}
      <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Memproses…' : 'Terima undangan'}</Button>
    </form>}
  </section></LoginLayout>;
}
