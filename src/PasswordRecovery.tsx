import React, { useRef, useState } from 'react';
import { supabase, turnstileSiteKey } from './auth';
import { isRateLimitError, useRateLimitCooldown, RATE_LIMIT_COOLDOWN_SECONDS } from './auth-errors';
import { LoginLayout } from './LoginLayout';
import { Button } from './ui';
import { TurnstileCaptcha } from './Turnstile';

export function PasswordRecovery({ reset, validSession, restoreError, onNavigate }: { reset: boolean; validSession: boolean; restoreError: string; onNavigate: (path: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const cooldown = useRateLimitCooldown();
  const captchaRequired = Boolean(turnstileSiteKey);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const resetCaptcha = () => { setCaptchaToken(''); setCaptchaKey(key => key + 1); };
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
    if (!reset && captchaRequired && !captchaToken) { setError('Selesaikan verifikasi keamanan terlebih dahulu.'); return; }
    pending.current = true; setBusy(true);
    try {
      const result = reset ? await supabase!.auth.updateUser({ password: values.password })
        : await supabase!.auth.resetPasswordForEmail(values.email.trim(), { redirectTo: `${location.origin}/forgot-password?reset=1`, ...(captchaRequired ? { captchaToken } : {}) });
      if (result.error) throw result.error;
      if (reset) setSaved(true); else setSent(true);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setError(code === 'same_password' ? 'Gunakan kata sandi yang berbeda dari sebelumnya.' : code === 'weak_password' ? 'Kata sandi terlalu lemah. Gunakan sandi yang lebih kuat.' : reset ? 'Kata sandi belum berhasil diperbarui. Coba lagi atau minta tautan baru.' : 'Tautan belum berhasil diminta. Periksa koneksi lalu coba lagi.');
      resetCaptcha();
      if (isRateLimitError(e)) cooldown.start(RATE_LIMIT_COOLDOWN_SECONDS);
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
    <div className="auth-intro"><h1>{saved ? 'Kata sandi diperbarui' : reset ? 'Atur kata sandi baru' : sent ? 'Periksa email Anda' : 'Lupa kata sandi?'}</h1>
    <p>{saved ? 'Silakan masuk kembali menggunakan kata sandi baru.' : unavailable ? 'Tautan pemulihan tidak valid atau sudah kedaluwarsa. Minta tautan baru untuk melanjutkan.' : reset ? 'Buat kata sandi baru dengan minimal 8 karakter.' : sent ? 'Jika email terdaftar, tautan pemulihan akan dikirim. Periksa juga folder spam.' : 'Masukkan email akun Anda untuk menerima tautan pemulihan kata sandi.'}</p></div>
    {!sent && !saved && !unavailable && <form className="auth-form" noValidate onSubmit={submit} aria-busy={busy} onChange={e => {
      const form = e.currentTarget;
      const password = (form.elements.namedItem('password') as HTMLInputElement | null)?.value || '';
      const confirm = (form.elements.namedItem('confirm') as HTMLInputElement | null)?.value || '';
      const email = form.elements.namedItem('email') as HTMLInputElement | null;
      setFieldErrors(current => ({ ...current, ...(password.length >= 8 ? { password: '' } : {}), ...(confirm && confirm === password ? { confirm: '' } : {}), ...(email?.value.trim() && email.validity.valid ? { email: '' } : {}) }));
    }}>
      {reset ? <><label className="form-field">Kata sandi baru<input name="password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" disabled={busy} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'recovery-password-error' : undefined} />{fieldErrors.password && <small id="recovery-password-error" className="field-error" role="alert">{fieldErrors.password}</small>}</label><label className="form-field">Konfirmasi kata sandi<input name="confirm" type={showPassword ? "text" : "password"} required autoComplete="new-password" disabled={busy} aria-invalid={Boolean(fieldErrors.confirm)} aria-describedby={fieldErrors.confirm ? 'recovery-confirm-error' : undefined} />{fieldErrors.confirm && <small id="recovery-confirm-error" className="field-error" role="alert">{fieldErrors.confirm}</small>}</label></> : <label className="form-field">Email<input name="email" type="email" required autoComplete="email" disabled={busy} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'recovery-email-error' : undefined} />{fieldErrors.email && <small id="recovery-email-error" className="field-error" role="alert">{fieldErrors.email}</small>}</label>}
      {reset && <label><input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} disabled={busy} /> Tampilkan kata sandi</label>}
      {error && <p role="alert" className="notice auth-error">{error}</p>}
      {!reset && captchaRequired && <TurnstileCaptcha siteKey={turnstileSiteKey} resetKey={captchaKey} onToken={setCaptchaToken} onExpire={() => setCaptchaToken('')} onError={() => setCaptchaToken('')} />}
      {cooldown.active && <p className="auth-cooldown">Coba lagi dalam {cooldown.seconds} detik.</p>}
      <Button variant="primary" type="submit" disabled={busy || cooldown.active}>{busy ? 'Memproses…' : reset ? 'Simpan kata sandi' : 'Kirim tautan pemulihan'}</Button>
    </form>}
    {(unavailable || (reset && !saved && error)) && <Button onClick={() => onNavigate('/forgot-password')}>Minta tautan baru</Button>}
    {(sent || saved || unavailable) && error && <p className="notice auth-error" role="alert">{error}</p>}
    {(sent || saved) && <p role="status" className="sr-only">{saved ? 'Kata sandi berhasil diperbarui.' : 'Permintaan tautan pemulihan berhasil diproses.'}</p>}
    <p className="auth-switch"><button type="button" className="inline-link" disabled={busy} onClick={backToLogin}>Kembali ke Masuk</button></p>
  </section></LoginLayout>;
}
