import React, { useRef, useState } from 'react';
import { supabase } from './auth';
import { LoginLayout } from './LoginLayout';
import { Button } from './ui';

export function PasswordRecovery({ reset, validSession, restoreError, onNavigate }: { reset: boolean; validSession: boolean; restoreError: string; onNavigate: (path: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const unavailable = reset && (!validSession || Boolean(restoreError));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (pending.current) return;
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const errors: Record<string, string> = {};
    if (reset) {
      if (!values.password || values.password.length < 8) errors.password = 'Kata sandi harus minimal 8 karakter.';
      if (values.confirm !== values.password) errors.confirm = 'Konfirmasi kata sandi belum sama.';
    } else {
      const input = form.elements.namedItem('email') as HTMLInputElement;
      if (!values.email?.trim()) errors.email = 'Email wajib diisi.';
      else if (input.validity.typeMismatch) errors.email = 'Format email tidak valid.';
    }
    setFieldErrors(errors); setError('');
    if (Object.keys(errors).length) { (form.elements.namedItem(Object.keys(errors)[0]) as HTMLElement)?.focus(); return; }
    if (unavailable) return;
    pending.current = true; setBusy(true);
    try {
      const result = reset ? await supabase!.auth.updateUser({ password: values.password }) : await supabase!.auth.resetPasswordForEmail(values.email.trim(), { redirectTo: `${location.origin}/lupa-password?reset=1` });
      if (result.error) throw result.error;
      if (reset) setSaved(true); else setSent(true);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setError(code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' ? 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.' : code === 'same_password' ? 'Gunakan kata sandi yang berbeda dari sebelumnya.' : code === 'weak_password' ? 'Kata sandi terlalu lemah. Gunakan sandi yang lebih kuat.' : reset ? 'Kata sandi belum berhasil diperbarui. Coba lagi atau minta tautan baru.' : 'Tautan belum berhasil diminta. Periksa koneksi lalu coba lagi.');
    } finally { pending.current = false; setBusy(false); }
  }
  async function backToLogin() {
    if (pending.current) return;
    if (reset && validSession) {
      pending.current = true; setBusy(true); setError('');
      try { const result = await supabase!.auth.signOut(); if (result.error) throw result.error; }
      catch { setError(saved ? 'Kata sandi sudah tersimpan, tetapi gagal keluar. Coba lagi.' : 'Gagal keluar dari sesi pemulihan. Coba lagi.'); return; }
      finally { pending.current = false; setBusy(false); }
    }
    onNavigate('/login');
  }
  return <LoginLayout><section className="panel panel-pad auth-panel">
    <h1>{saved ? 'Kata sandi diperbarui' : reset ? 'Atur kata sandi baru' : sent ? 'Periksa email Anda' : 'Lupa password?'}</h1>
    <p>{saved ? 'Silakan masuk kembali menggunakan kata sandi baru.' : unavailable ? 'Tautan pemulihan tidak valid atau sudah kedaluwarsa. Minta tautan baru untuk melanjutkan.' : reset ? 'Buat kata sandi baru dengan minimal 8 karakter.' : sent ? 'Jika email terdaftar, tautan pemulihan akan dikirim. Periksa juga folder spam.' : 'Masukkan email akun Anda untuk menerima tautan pemulihan kata sandi.'}</p>
    {!sent && !saved && !unavailable && <form className="auth-form" noValidate onSubmit={submit} aria-busy={busy}>
      {reset ? <><label className="form-field">Kata sandi baru<input name="password" type="password" required minLength={8} autoComplete="new-password" disabled={busy} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'recovery-password-error' : undefined} />{fieldErrors.password && <small id="recovery-password-error" className="field-error" role="alert">{fieldErrors.password}</small>}</label><label className="form-field">Konfirmasi kata sandi<input name="confirm" type="password" required autoComplete="new-password" disabled={busy} aria-invalid={Boolean(fieldErrors.confirm)} aria-describedby={fieldErrors.confirm ? 'recovery-confirm-error' : undefined} />{fieldErrors.confirm && <small id="recovery-confirm-error" className="field-error" role="alert">{fieldErrors.confirm}</small>}</label></> : <label className="form-field">Email<input name="email" type="email" required autoComplete="email" disabled={busy} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'recovery-email-error' : undefined} />{fieldErrors.email && <small id="recovery-email-error" className="field-error" role="alert">{fieldErrors.email}</small>}</label>}
      {error && <p role="alert" className="notice auth-error">{error}</p>}
      <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Memproses…' : reset ? 'Simpan kata sandi' : 'Kirim tautan pemulihan'}</Button>
    </form>}
    {reset && !saved && <Button onClick={() => onNavigate('/lupa-password')}>Minta tautan baru</Button>}
    {(sent || saved || unavailable) && error && <p className="notice auth-error" role="alert">{error}</p>}
    {(sent || saved) && <p role="status" className="sr-only">{saved ? 'Kata sandi berhasil diperbarui.' : 'Permintaan tautan pemulihan berhasil diproses.'}</p>}
    <p className="auth-switch"><Button disabled={busy} onClick={backToLogin}>Kembali ke Masuk</Button></p>
  </section></LoginLayout>;
}
