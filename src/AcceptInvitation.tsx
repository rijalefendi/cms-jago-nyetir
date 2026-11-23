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
  const [visible, setVisible] = useState({ password: false, confirm: false });
  const [passwordLength, setPasswordLength] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const pending = useRef(false);
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invitationId);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current || !session || !validId) return;
    const values = new FormData(e.currentTarget);
    const password = String(values.get('password') || '');
    if (!passwordSaved) {
      const errors: Record<string, string> = {};
      if (password.length < 8) errors.password = 'Kata sandi harus minimal 8 karakter.';
      if (!values.get('confirm') || password !== values.get('confirm')) errors.confirm = 'Konfirmasi kata sandi belum sama.';
      setFieldErrors(errors);
      if (Object.keys(errors).length) { (e.currentTarget.elements.namedItem(Object.keys(errors)[0]) as HTMLElement)?.focus(); return; }
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
    {!unavailable && <form className="auth-form" noValidate onSubmit={submit} aria-busy={busy} onChange={e => {
      const form = e.currentTarget;
      const password = (form.elements.namedItem('password') as HTMLInputElement | null)?.value || '';
      const confirm = (form.elements.namedItem('confirm') as HTMLInputElement | null)?.value || '';
      setPasswordLength(password.length);
      setFieldErrors(current => ({ ...current, ...(password.length >= 8 ? { password: '' } : {}), ...(confirm && confirm === password ? { confirm: '' } : {}) }));
    }}>
      {!passwordSaved && (['password', 'confirm'] as const).map(name => <div className="form-field" key={name}>
        <label htmlFor={`invitation-${name}`}>{name === 'password' ? 'Kata sandi' : 'Konfirmasi kata sandi'}</label>
        <div className="auth-password-control">
          <input id={`invitation-${name}`} name={name} type={visible[name] ? 'text' : 'password'} minLength={name === 'password' ? 8 : undefined} required autoComplete="new-password" disabled={busy} aria-invalid={Boolean(fieldErrors[name])} aria-describedby={[name === 'password' ? 'invitation-password-hint' : '', fieldErrors[name] ? `invitation-${name}-error` : ''].filter(Boolean).join(' ') || undefined} />
          <button type="button" className="auth-password-toggle" aria-label={`${visible[name] ? 'Sembunyikan' : 'Tampilkan'} ${name === 'password' ? 'kata sandi' : 'konfirmasi kata sandi'}`} aria-controls={`invitation-${name}`} aria-pressed={visible[name]} disabled={busy} onClick={() => setVisible(current => ({ ...current, [name]: !current[name] }))}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible[name] && <path d="m3 3 18 18" />}</svg>
          </button>
        </div>
        {fieldErrors[name] && <small id={`invitation-${name}-error`} className="auth-field-error" role="alert">{fieldErrors[name]}</small>}
        {name === 'password' && <small id="invitation-password-hint" className="auth-password-rule" data-state={passwordLength >= 8 ? 'valid' : fieldErrors.password ? 'invalid' : 'pending'}><svg className="icon sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>Minimal 8 karakter<span className="sr-only">{passwordLength >= 8 ? ' ? Terpenuhi' : ' ? Belum terpenuhi'}</span></small>}
      </div>)}
      {passwordSaved && <p>Kata sandi tersimpan. Lanjutkan untuk menerima undangan.</p>}
      {error && <p role="alert" className="notice auth-error">{error}</p>}
      <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Memproses…' : 'Terima undangan'}</Button>
    </form>}
  </section></LoginLayout>;
}
