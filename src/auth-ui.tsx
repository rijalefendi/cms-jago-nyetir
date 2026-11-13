import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ApiError, request, supabase, type Api, type School } from './auth';
import { LiveApp } from './live';
import { authFormError, type AuthFormError } from './auth-errors';
import { TimePicker } from './TimePicker';

const menu = ['Murid', 'Paket', 'Instruktur', 'Mobil', 'Jadwal'];
const message = (error: unknown) => error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.';

export function AuthApp({ preview }: { preview?: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!supabase) { setRestoring(false); return; }
    let active = true;
    let changed = false;
    const callback = location.pathname === '/auth/callback';
    const params = new URLSearchParams(location.hash.slice(1));
    const invalid = callback && (params.has('error') || new URLSearchParams(location.search).has('error'));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      changed = true;
      if (active && !invalid) setSession(next);
    });
    setRestoring(true);
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (!changed && !invalid) setSession(data.session);
      if (invalid || (callback && (error || !data.session))) setError('Link verifikasi tidak valid atau kedaluwarsa. Silakan masuk atau daftar kembali.');
      else if (error) setError('Sesi gagal dipulihkan. Coba lagi atau masuk ulang.');
    }).catch(() => { if (active) setError('Sesi gagal dipulihkan. Coba lagi atau masuk ulang.'); })
      .finally(() => {
        if (!active) return;
        if (callback) history.replaceState(null, '', '/');
        setRestoring(false);
      });
    return () => { active = false; subscription.unsubscribe(); };
  }, [attempt]);

  if (!supabase) return <main className="auth-wrap"><p role="alert">Konfigurasi auth belum lengkap. Isi URL dan publishable key Supabase.</p></main>;
  if (restoring) return <main className="auth-wrap"><p role="status">Memulihkan sesi…</p></main>;
  if (!session) return <Login error={error} clearError={() => setError('')} retry={() => setAttempt(n => n + 1)} />;
  return preview ?? <SchoolWorkspace key={session.user.id} userId={session.user.id} />;
}

function Login({ error: restoreError, clearError, retry }: { error: string; clearError: () => void; retry: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<AuthFormError | null>(null);
  const [clientFields, setClientFields] = useState<AuthFormError['fields']>({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLength, setPasswordLength] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);
  const fields = { ...clientFields, ...error?.fields };
  const passwordState = passwordLength >= 8 ? 'valid' : fields.password ? 'invalid' : 'pending';
  const formError = error && !Object.values(error.fields).some(Boolean) ? error.message : restoreError;
  useEffect(() => {
    const field = Object.keys(error?.fields || {})[0];
    if (!busy && field) (formRef.current?.elements.namedItem(field) as HTMLInputElement | null)?.focus();
  }, [error, busy]);
  function validate(input: HTMLInputElement) {
    if (input.name === 'email') {
      if (!input.value.trim()) return 'Email wajib diisi.';
      if (input.validity.typeMismatch) return 'Format email tidak valid. Contoh: nama@domain.com.';
    } else {
      if (!input.value) return 'Kata sandi wajib diisi.';
      if (mode === 'signup' && input.value.length < 8) return 'Kata sandi harus minimal 8 karakter.';
    }
    return '';
  }
  function blur(event: React.FocusEvent<HTMLFormElement>) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const name = input.name as keyof AuthFormError['fields'];
    if (!input.value && !clientFields[name]) return;
    setClientFields(current => ({ ...current, [name]: validate(input) }));
  }
  function change(event: React.ChangeEvent<HTMLFormElement>) {
    const input = event.target;
    setError(null); clearError();
    if (!(input instanceof HTMLInputElement)) return;
    const name = input.name as keyof AuthFormError['fields'];
    if (name === 'password') setPasswordLength(input.value.length);
    if (clientFields[name]) setClientFields(current => ({ ...current, [name]: validate(input) }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const data = new FormData(event.currentTarget);
    const credentials = { email: String(data.get('email')).trim(), password: String(data.get('password')) };
    const inputs = Array.from(event.currentTarget.querySelectorAll('input'));
    const nextFields = Object.fromEntries(inputs.map(input => [input.name, validate(input)]));
    setClientFields(nextFields); setPasswordLength(credentials.password.length); setError(null);
    clearError();
    const invalid = inputs.find(input => nextFields[input.name]);
    if (invalid) { invalid.focus(); return; }
    pending.current = true; setBusy(true); setError(null);
    try {
      const result = mode === 'login' ? await supabase!.auth.signInWithPassword(credentials)
        : await supabase!.auth.signUp({ ...credentials, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (result.error) {
        setError(authFormError(result.error, mode, credentials));
      } else if (mode === 'signup' && !result.data.session) setSent(true);
    } catch (error) { setError(authFormError(error, mode, credentials)); }
    finally { pending.current = false; setBusy(false); }
  }
  return <main className="auth-wrap"><div className="auth-wordmark">Jagonyetir<span aria-hidden="true">.</span></div><section className="panel panel-pad auth-panel">
    <h1>{sent ? 'Verifikasi email' : mode === 'login' ? 'Masuk' : 'Daftar akun'}</h1>
    <p>{sent ? 'Periksa email untuk memverifikasi akun. Setelah terverifikasi, kembali untuk masuk.' : 'Kelola operasional sekolah mengemudi Anda.'}</p>
    {!sent && <form ref={formRef} noValidate onSubmit={submit} onBlur={blur} onChange={change} className="auth-form" aria-busy={busy}>
      <label className="form-field">Email<input name="email" type="email" autoComplete="email" required disabled={busy} aria-invalid={Boolean(fields.email)} aria-describedby={fields.email ? 'auth-email-error' : undefined} />{fields.email && <small id="auth-email-error" className="auth-field-error" role="alert">{fields.email}</small>}</label>
      <div className="form-field">
        <label htmlFor="auth-password">Kata sandi</label>
        <div className="auth-password-control">
          <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required disabled={busy} aria-invalid={Boolean(fields.password)} aria-describedby={[mode === 'signup' ? 'auth-password-hint' : '', fields.password ? 'auth-password-error' : ''].filter(Boolean).join(' ') || undefined} />
          <button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-controls="auth-password" aria-pressed={showPassword} disabled={busy} onClick={() => setShowPassword(value => !value)}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</svg>
          </button>
        </div>
        {fields.password && <small id="auth-password-error" className="auth-field-error" role="alert">{fields.password}</small>}
        {mode === 'signup' && <small id="auth-password-hint" className="auth-password-rule" data-state={passwordState}>
          <svg className="icon sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>
          Minimal 8 karakter<span className="sr-only">{passwordState === 'valid' ? ' — Terpenuhi' : ' — Belum terpenuhi'}</span>
        </small>}
      </div>
      {formError && <div className="notice auth-error" role="alert"><p>{formError}</p>{error?.code && <small>Kode: {error.code}{error.status !== undefined && error.status > 0 ? ` · HTTP ${error.status}` : ''}</small>}{restoreError && <button type="button" className="btn btn-quiet" onClick={retry}>Coba lagi</button>}</div>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar akun'}</button>
    </form>}
    <p className="auth-switch">{!sent && (mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? ')}<button className="inline-link" disabled={busy} data-auth-mode={mode === 'login' ? 'signup' : 'login'} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setSent(false); setError(null); setClientFields({}); setShowPassword(false); clearError(); }}>{mode === 'login' && !sent ? 'Daftar gratis' : sent ? 'Kembali ke Masuk' : 'Masuk'}</button></p>
  </section></main>;
}

function SchoolWorkspace({ userId }: { userId: string }) {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [settings, setSettings] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const serial = useRef(0);
  const api: Api = useCallback(async (path, method, body) => {
    try { return await request(userId, path, method, body); }
    catch (error) {
      if (error instanceof ApiError && error.status === 403 && error.code === 'school_setup_required') {
        setSchool(current => current ? { ...current, setup_complete: false } : current);
        setSettings(true);
      }
      throw error;
    }
  }, [userId]);
  const load = useCallback(async () => {
    const current = ++serial.current;
    setLoading(true); setError('');
    try {
      const schools = await request(userId, '/schools', 'GET', undefined, true) as School[];
      if (!Array.isArray(schools) || schools.length > 1 || schools.some(s => !s.id || typeof s.setup_complete !== 'boolean')) throw Error('Respons sekolah tidak valid. Silakan coba lagi.');
      if (current === serial.current) { setSchool(schools[0] || null); setUnauthorized(false); }
    } catch (error) {
      if (current !== serial.current) return;
      setError(message(error)); setUnauthorized(error instanceof ApiError && error.status === 401);
    } finally { if (current === serial.current) setLoading(false); }
  }, [userId]);
  useEffect(() => { void load(); return () => { serial.current++; }; }, [load, attempt]);
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const { error } = await supabase!.auth.signOut();
      if (error) throw error;
    } catch { setError('Gagal keluar. Silakan coba lagi.'); }
    finally { setLoggingOut(false); }
  }
  const locked = !school?.setup_complete;
  return <main className="live-wrap"><header className="live-header"><h1>Jagonyetir</h1><button className="btn btn-quiet" disabled={loggingOut} onClick={logout}>{loggingOut ? 'Memproses…' : 'Keluar'}</button></header>
    {loading ? <p role="status">Memuat akses sekolah…</p> : error ? <section className="panel panel-pad"><p role="alert">{error}</p><button className="btn btn-primary" onClick={load}>Coba lagi</button>{unauthorized && <button className="btn btn-quiet" onClick={logout}>Masuk ulang</button>}</section>
      : !locked && !settings ? <><button className="inline-link" onClick={() => setSettings(true)}>Pengaturan Sekolah</button><LiveApp school={school!} api={api} /></>
      : <>{locked ? <><p id="setup-reason" className="notice">Lengkapi data sekolah terlebih dahulu.</p><nav className="live-nav" aria-label="Menu operasional">{menu.map(label => <button key={label} className="btn btn-quiet" disabled aria-describedby="setup-reason">{label}</button>)}</nav></> : <button className="inline-link" onClick={() => { setSettings(false); setSaved(false); }}>Kembali ke operasional</button>}
        <SchoolProfile key={school?.id || 'new'} school={school} api={api} saved={saved} onSaved={async () => { setSettings(true); setSaved(true); await load(); }} retryAccess={() => setAttempt(n => n + 1)} />
      </>}
  </main>;
}

export function SchoolProfile({ school, api, saved, onSaved, retryAccess, showHeading = true, successMessage = 'Perubahan berhasil disimpan.' }: { school: School | null; api: Api; saved: boolean; onSaved: () => Promise<void>; retryAccess: () => void; showHeading?: boolean; successMessage?: string }) {
  const fieldPrefix = React.useId();
  const submitted = useRef(false);
  const [profile, setProfile] = useState<Record<string, any> | null>(school ? null : {});
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    if (!school) return;
    let active = true;
    setError(''); setProfile(null);
    api(`/schools/${school.id}/settings`).then(data => {
      if (!Array.isArray(data) || data.length !== 1) throw Error('Profil sekolah tidak valid.');
      if (active) setProfile(data[0]);
    }).catch(error => { if (active) setError(message(error)); });
    return () => { active = false; };
  }, [school?.id, api, attempt]);
  const canSave = !school || school.role === 'owner';
  function validate(form: HTMLFormElement) {
    const data = new FormData(form);
    const errors: Record<string, string> = {};
    if (!String(data.get('name') || '').trim()) errors.name = 'Nama sekolah wajib diisi.';
    if (!String(data.get('location') || '').trim()) errors.location = 'Alamat wajib diisi.';
    for (const group of ['weekday', 'weekend']) {
      if (data.has(`${group}_closed`)) continue;
      for (const [suffix, label] of [['open', 'buka'], ['close', 'tutup']]) {
        const key = `${group}_${suffix}`;
        const input = form.elements.namedItem(key) as HTMLInputElement | null;
        if (!input || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.value) || !input.validity.valid) {
          errors[key] = !input?.value && !input?.validity.customError
            ? `Jam ${label} wajib diisi lengkap.`
            : `Isi jam ${label} yang valid (jam 00–23, menit 00–59).`;
        }
      }
      if (!errors[`${group}_open`] && !errors[`${group}_close`] && String(data.get(`${group}_open`)) >= String(data.get(`${group}_close`))) {
        errors[`${group}_close`] = 'Jam tutup harus setelah jam buka.';
      }
    }
    if (data.has('weekday_closed') && data.has('weekend_closed')) errors.hours = 'Minimal satu kelompok hari harus buka.';
    return errors;
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !canSave) return;
    submitted.current = true;
    const errors = validate(event.currentTarget);
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length) {
      const first = Object.keys(errors)[0];
      (event.currentTarget.elements.namedItem(first === 'hours' ? 'weekday_closed' : first) as HTMLInputElement | null)?.focus();
      return;
    }
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim(), location = String(data.get('location')).trim();
    const hours = (group: string) => data.has(`${group}_closed`) ? { closed: true as const }
      : { open: String(data.get(`${group}_open`)), close: String(data.get(`${group}_close`)) };
    const weekday = hours('weekday'), weekend = hours('weekend');
    pending.current = true; setBusy(true); setError('');
    try {
      const id = await api(school ? `/schools/${school.id}/settings` : '/schools', school ? 'PUT' : 'POST', { name, location, weekday, weekend });
      if (typeof id !== 'string' || !id) throw Error('Respons penyimpanan tidak valid. Periksa data sebelum mencoba lagi.');
      await onSaved();
    } catch (error) { setError(message(error)); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="panel panel-pad">
    {showHeading && <><h2>Pengaturan Sekolah</h2><p>{school ? 'Semua jam dalam WITA (Asia/Makassar).' : 'Buat sekolah dengan mengisi profil dan jam operasional (WITA).'}</p></>}
    {school && <p role="status" className="notice">{school.setup_complete ? 'Profil lengkap.' : 'Profil belum lengkap. Isi semua kolom wajib.'}</p>}
    {saved && <p role="status">{successMessage}</p>}
    {school && !canSave && <p className="notice">Owner perlu melengkapi data sekolah. {school.role === 'staff' ? 'Anda hanya dapat membaca pengaturan.' : 'Role akun belum tersedia dari server; akses simpan belum dapat diverifikasi.'}{!school.role && <button className="btn btn-quiet" onClick={retryAccess}>Coba lagi</button>}</p>}
    {error && <p role="alert" className="notice form-feedback">{error}</p>}
    {!profile ? error ? <button className="btn btn-quiet" onClick={() => setAttempt(n => n + 1)}>Coba lagi</button> : <p role="status">Memuat profil sekolah…</p>
      : <form className="school-profile" noValidate onSubmit={save} aria-busy={busy}
        onChange={event => {
          if (submitted.current) setFieldErrors(validate(event.currentTarget));
          if (error) setError('');
        }}><fieldset disabled={busy || !canSave} className="form-grid">
        <label className="form-field">Nama sekolah<input name="name" defaultValue={profile.name || ''} required
          aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? `${fieldPrefix}-name-error` : undefined} />
          {fieldErrors.name && <small className="field-error" id={`${fieldPrefix}-name-error`}>{fieldErrors.name}</small>}</label>
        <label className="form-field">Alamat<input name="location" defaultValue={profile.location || ''} required
          aria-invalid={Boolean(fieldErrors.location)} aria-describedby={fieldErrors.location ? `${fieldPrefix}-location-error` : undefined} />
          {fieldErrors.location && <small className="field-error" id={`${fieldPrefix}-location-error`}>{fieldErrors.location}</small>}</label>
        <Hours group="weekday" label="Senin–Jumat" profile={profile} errors={fieldErrors} fieldPrefix={fieldPrefix} />
        <Hours group="weekend" label="Sabtu–Minggu" profile={profile} errors={fieldErrors} fieldPrefix={fieldPrefix} />
        {fieldErrors.hours && <small className="field-error hours-error" id={`${fieldPrefix}-hours-error`}>{fieldErrors.hours}</small>}
      </fieldset><button type="submit" className="btn btn-primary" disabled={busy || !canSave}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button></form>}
  </section>;
}

function Hours({ group, label, profile, errors, fieldPrefix }: { group: string; label: string; profile: Record<string, any>; errors: Record<string, string>; fieldPrefix: string }) {
  const [closed, setClosed] = useState(Boolean(profile[`${group}_closed`] ?? group === 'weekend'));
  return <fieldset className="hours-fields" aria-invalid={Boolean(errors.hours)} aria-describedby={errors.hours ? `${fieldPrefix}-hours-error` : undefined}><legend>{label}</legend>
    <label><input type="checkbox" name={`${group}_closed`} checked={closed} onChange={event => setClosed(event.target.checked)} /> Tutup</label>
    {!closed && <div className="hours-times">{[['open', 'Buka'], ['close', 'Tutup']].map(([suffix, title]) => {
      const key = `${group}_${suffix}`;
      const errorId = `${fieldPrefix}-${key}-error`;
      return <div className="form-field" key={key}><span>{title}</span>
        <TimePicker aria-label={`Jam ${title.toLowerCase()} ${label}`} name={key} defaultValue={profile[key]?.slice(0, 5) || ''} required
          aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? errorId : undefined} />
        {errors[key] && <small className="field-error" id={errorId}>{errors[key]}</small>}
      </div>;
    })}</div>}
  </fieldset>;
}
