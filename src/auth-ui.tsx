import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ApiError, request, supabase, turnstileSiteKey, type Api, type School } from './auth';
import { LiveApp, emptyProgress, OnboardingGuide, type OnboardingProgress } from './live';
import { HomeHeading, HomeMetricsSkeleton } from './ui';
import { DashboardShell, SidebarStateProvider } from './DashboardShell';
import { authFormError, isRateLimitError, useRateLimitCooldown, RATE_LIMIT_COOLDOWN_SECONDS, type AuthFormError } from './auth-errors';
import { PasswordRecovery } from './PasswordRecovery';
import { TurnstileCaptcha } from './Turnstile';
import { LoginLayout } from './LoginLayout';
import { TimePicker } from './TimePicker';
import { Invitations } from './Invitations';
import { AcceptInvitation } from './AcceptInvitation';

const message = (error: unknown) => error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.';
const pageSlugs: Record<string, string> = { home: 'home', students: 'students', sessions: 'sessions', instructors: 'instructors', vehicles: 'vehicles', packages: 'packages', settings: 'settings', invitations: 'staff' };
const pageFromUrl = () => ['/', '/login', '/register'].includes(location.pathname) ? 'home' : Object.keys(pageSlugs).find(page => location.pathname.match(/^(?:\/schools\/[^/]+)?\/dashboard\/([^/]+)\/?$/)?.[1] === pageSlugs[page]) || 'not-found';
const progressStorageKey = (schoolId: string) => `atursetir-onboarding:${schoolId}`;

function readProgress(schoolId: string | undefined): OnboardingProgress {
  if (!schoolId) return emptyProgress;
  try {
    const raw = sessionStorage.getItem(progressStorageKey(schoolId));
    if (raw) {
      const cached = JSON.parse(raw);
      return Object.fromEntries(Object.entries(emptyProgress).map(([key, fallback]) => [key,
        typeof cached?.[key] === 'boolean' ? cached[key] : fallback,
      ])) as OnboardingProgress;
    }
  } catch { /* Corrupt storage falls back to unchecked steps. */ }
  return emptyProgress;
}

// Cached progress guides navigation; it never grants operational access.
function useOnboardingProgress(schoolId: string | undefined) {
  const [state, setState] = useState(() => ({ schoolId, progress: readProgress(schoolId) }));
  const progress = state.schoolId === schoolId ? state.progress : readProgress(schoolId);
  if (state.schoolId !== schoolId) setState({ schoolId, progress });
  const markProgress = useCallback((patch: Partial<OnboardingProgress>) => {
    setState(current => {
      const next = { ...(current.schoolId === schoolId ? current.progress : readProgress(schoolId)), ...patch };
      if (schoolId) { try { sessionStorage.setItem(progressStorageKey(schoolId), JSON.stringify(next)); } catch { /* Guidance only; ignore storage failures. */ } }
      return { schoolId, progress: next };
    });
  }, [schoolId]);
  return [progress, markProgress] as const;
}

export function AccessPage({ school, locked = false, kind, userEmail, onNavigate, loggingOut = false, onLogout }: { school: School; locked?: boolean; kind: 'denied' | 'not-found' | 'setup'; userEmail?: string; onNavigate: (page: string) => void; loggingOut?: boolean; onLogout?: () => void }) {
  return <DashboardShell school={school} page="" userEmail={userEmail} locked={locked} loggingOut={loggingOut} onLogout={onLogout} onNavigate={onNavigate}>
    <section className="access-page">
      <div className="access-page-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{kind === 'not-found' ? <><path d="M2 2L22 22" /><path d="M19.8478 14.9369C20 14.5694 20 14.1606 20 13.3431V10C20 6.22876 20 4.34315 18.8284 3.17157C17.6569 2 15.7712 2 12 2C9.33333 2 7.60948 2 6.41421 2.41421M4.41421 4.41421C4 5.60948 4 7.33333 4 10L4 14.5442C4 17.7892 4 19.4117 4.88607 20.5107C5.06508 20.7327 5.26731 20.9349 5.48933 21.1139C6.58831 22 8.21082 22 11.4558 22C12.1614 22 12.5141 22 12.8372 21.886C12.9044 21.8623 12.9702 21.835 13.0345 21.8043C13.3436 21.6564 13.593 21.407 14.0919 20.9081L17.5 17.5" /><path d="M13 21.5L13 20.7487C13 17.9203 13 16.5061 13.8787 15.6274C14.1785 15.3276 14.5406 15.1301 15 15" /></> : <><path d="M11 22C7.06358 22.0975 4 18.8075 4 15C4 11.134 7.11877 8 10.966 8C13.5444 8 15.7956 9.4077 17 11.5" /><path d="M15.5 9.5V6.5C15.5 4.01472 13.4853 2 11 2C8.51472 2 6.5 4.01472 6.5 6.5V9.5" /><path d="M12 17H20" /></>}</svg></div>
      <h1>{kind === 'not-found' ? 'Halaman tidak ditemukan' : kind === 'setup' ? 'Sekolah belum siap' : 'Akses ditolak'}</h1><p id="setup-reason">{kind === 'not-found' ? 'Halaman yang Anda cari tidak tersedia.' : kind === 'setup' ? 'Owner perlu melengkapi data sekolah.' : 'Anda tidak memiliki akses ke halaman ini.'}</p>{!locked && <button className="btn btn-primary" onClick={() => onNavigate('home')}>Kembali ke beranda</button>}
    </section>
  </DashboardShell>;
}

export function AuthApp({ preview }: { preview?: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState('');
  const [authPath, setAuthPath] = useState(location.pathname);
  const [invitationId] = useState(() => new URLSearchParams(location.search).get('invitation_id') || '');
  const [recovery, setRecovery] = useState(() => location.pathname === '/forgot-password' && new URLSearchParams(location.search).get('reset') === '1');
  const [attempt, setAttempt] = useState(0);
  function navigateAuth(path: string) { history.pushState(null, '', path); setAuthPath(path); setRecovery(false); setError(''); }
  useEffect(() => {
    const pop = () => { setAuthPath(location.pathname); setRecovery(location.pathname === '/forgot-password' && new URLSearchParams(location.search).get('reset') === '1'); };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    if (!supabase) { setRestoring(false); return; }
    let active = true;
    let changed = false;
    const callback = location.pathname === '/auth/callback';
    const invitation = location.pathname === '/auth/invitation';
    const params = new URLSearchParams(location.hash.slice(1));
    const recoveryLink = location.pathname === '/forgot-password' && new URLSearchParams(location.search).get('reset') === '1';
    const invalid = (callback || recoveryLink || invitation) && (params.has('error') || new URLSearchParams(location.search).has('error'));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      changed = true;
      if (_event === 'PASSWORD_RECOVERY' && active) { setRecovery(true); setAuthPath('/forgot-password'); history.replaceState(null, '', '/forgot-password?reset=1'); }
      if (active && !invalid) setSession(next);
    });
    setRestoring(true);
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (!changed && !invalid) setSession(data.session);
      if (invitation && (invalid || error || !data.session)) setError('Tautan undangan tidak valid atau kedaluwarsa.');
      else if (recoveryLink && (invalid || error || !data.session)) setError('Tautan pemulihan tidak valid atau kedaluwarsa.');
      else if (invalid || (callback && (error || !data.session))) setError('Link verifikasi tidak valid atau kedaluwarsa. Silakan masuk atau daftar kembali.');
      else if (error) setError('Sesi gagal dipulihkan. Coba lagi atau masuk ulang.');
    }).catch(() => { if (active) setError('Sesi gagal dipulihkan. Coba lagi atau masuk ulang.'); })
      .finally(() => {
        if (!active) return;
        if (invitation) history.replaceState(null, '', `/auth/invitation${location.search}`);
        if (callback) history.replaceState(null, '', '/');
        if (recoveryLink) history.replaceState(null, '', '/forgot-password?reset=1');
        setRestoring(false);
      });
    return () => { active = false; subscription.unsubscribe(); };
  }, [attempt]);

  useEffect(() => {
    if (!restoring && session && ['/login', '/register'].includes(location.pathname)) history.replaceState(null, '', '/dashboard/home');
  }, [restoring, session]);

  if (!supabase) return <main className="auth-wrap"><p role="alert">Konfigurasi auth belum lengkap. Isi URL dan publishable key Supabase.</p></main>;
  if (restoring) return <main className="auth-wrap"><p role="status">Memulihkan sesi…</p></main>;
  if (authPath === '/auth/invitation') return <AcceptInvitation session={session} invitationId={invitationId} restoreError={error} onComplete={() => { history.replaceState(null, '', '/dashboard/home'); setAuthPath('/dashboard/home'); }} />;
  if (authPath === '/forgot-password' || recovery) return <PasswordRecovery key={String(recovery)} reset={recovery} validSession={Boolean(session)} restoreError={error} onNavigate={navigateAuth} />;
  if (!session) return <Login onForgot={() => navigateAuth('/forgot-password')} error={error} clearError={() => setError('')} retry={() => setAttempt(n => n + 1)} />;
  if (preview) return React.isValidElement(preview) ? React.cloneElement(preview as React.ReactElement<{ userEmail?: string }>, { userEmail: session.user.email }) : preview;
  return <SidebarStateProvider key={session.user.id}><SchoolWorkspace userId={session.user.id} userEmail={session.user.email} /></SidebarStateProvider>;
}

function Login({ error: restoreError, clearError, retry, onForgot }: { onForgot: () => void; error: string; clearError: () => void; retry: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>(() => location.pathname === '/register' ? 'signup' : 'login');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<AuthFormError | null>(null);
  const [clientFields, setClientFields] = useState<AuthFormError['fields']>({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLength, setPasswordLength] = useState(0);
  const cooldown = useRateLimitCooldown();
  const captchaRequired = Boolean(turnstileSiteKey);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const resetCaptcha = () => { setCaptchaToken(''); setCaptchaKey(key => key + 1); };
  const formRef = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);
  const fields = { ...clientFields, ...error?.fields };
  const passwordState = passwordLength >= 8 ? 'valid' : fields.password ? 'invalid' : 'pending';
  const formError = error && !Object.values(error.fields).some(Boolean) ? error.message : restoreError;
  useEffect(() => {
    const field = Object.keys(error?.fields || {})[0];
    if (!busy && field) (formRef.current?.elements.namedItem(field) as HTMLInputElement | null)?.focus();
  }, [error, busy]);
  function changeMode(next: 'login' | 'signup') {
    setMode(next); setSent(false); setError(null); setClientFields({}); setShowPassword(false); clearError(); cooldown.reset();
  }
  useEffect(() => {
    if (location.pathname === '/forgot-password') return;
    const path = location.pathname === '/register' ? '/register' : '/login';
    if (location.pathname + location.search + location.hash !== path) history.replaceState(null, '', path);
    const pop = () => {
      const next = location.pathname === '/register' ? 'signup' : 'login';
      if (location.pathname === '/forgot-password') return;
      if (location.pathname !== '/register' && location.pathname !== '/login') history.replaceState(null, '', '/login');
      changeMode(next);
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
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
    if (captchaRequired && !captchaToken) { setError({ message: 'Selesaikan verifikasi keamanan terlebih dahulu.', fields: {} }); return; }
    pending.current = true; setBusy(true); setError(null);
    try {
      const captcha = captchaRequired ? { captchaToken } : {};
      const result = mode === 'login' ? await supabase!.auth.signInWithPassword({ ...credentials, options: { ...captcha } })
        : await supabase!.auth.signUp({ ...credentials, options: { emailRedirectTo: `${location.origin}/auth/callback`, ...captcha } });
      if (result.error) {
        setError(authFormError(result.error, mode, credentials));
        resetCaptcha();
        if (isRateLimitError(result.error)) cooldown.start(RATE_LIMIT_COOLDOWN_SECONDS);
      } else if (mode === 'signup' && !result.data.session) setSent(true);
    } catch (error) {
      setError(authFormError(error, mode, credentials));
      resetCaptcha();
      if (isRateLimitError(error)) cooldown.start(RATE_LIMIT_COOLDOWN_SECONDS);
    }
    finally { pending.current = false; setBusy(false); }
  }
  return <LoginLayout><section className="panel panel-pad auth-panel">
    <div className="auth-intro"><h1>{sent ? 'Verifikasi email' : mode === 'login' ? 'Masuk' : 'Daftar akun'}</h1>
    <p>{sent ? 'Periksa email untuk memverifikasi akun. Setelah terverifikasi, kembali untuk masuk.' : mode === 'signup' ? 'Daftar sebagai pemilik untuk menyiapkan sekolah. Staf bergabung melalui undangan.' : 'Masuk untuk melanjutkan pengelolaan sekolah Anda.'}</p></div>
    {!sent && <form ref={formRef} noValidate onSubmit={submit} onBlur={blur} onChange={change} className="auth-form" aria-busy={busy}>
      <label className="form-field">Email<input name="email" type="email" autoComplete="email" required disabled={busy} aria-invalid={Boolean(fields.email)} aria-describedby={fields.email ? 'auth-email-error' : undefined} />{fields.email && <small id="auth-email-error" className="auth-field-error" role="alert">{fields.email}</small>}</label>
      <div className="form-field">
        <div className="auth-password-label"><label htmlFor="auth-password">Kata sandi</label>{mode === 'login' && <a href="/forgot-password" className="inline-link" aria-disabled={busy} onClick={e => { e.preventDefault(); if (!busy) onForgot(); }}>Lupa kata sandi?</a>}</div>
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
      {captchaRequired && <TurnstileCaptcha siteKey={turnstileSiteKey} resetKey={captchaKey} onToken={setCaptchaToken} onExpire={() => setCaptchaToken('')} onError={() => setCaptchaToken('')} />}
      {cooldown.active && <p className="auth-cooldown">Coba lagi dalam {cooldown.seconds} detik.</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || cooldown.active}>{busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar akun'}</button>
    </form>}
    <p className="auth-switch">{!sent && (mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? ')}<button className="inline-link" disabled={busy} data-auth-mode={mode === 'login' ? 'signup' : 'login'} onClick={() => { const next = mode === 'login' && !sent ? 'signup' : 'login'; history.pushState(null, '', next === 'signup' ? '/register' : '/login'); changeMode(next); }}>{mode === 'login' && !sent ? 'Daftar gratis' : sent ? 'Kembali ke Masuk' : 'Masuk'}</button></p>
  </section></LoginLayout>;
}

function SchoolWorkspace({ userId, userEmail }: { userId: string; userEmail?: string }) {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [settings, setSettings] = useState(() => pageFromUrl() === 'settings');
  const [operationPage, setOperationPage] = useState(() => pageFromUrl() === 'settings' ? 'students' : pageFromUrl());
  const [showCreate, setShowCreate] = useState(() => pageFromUrl() === 'settings');
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [progress, markProgress] = useOnboardingProgress(school?.id);
  const serial = useRef(0);
  const bootstrapped = useRef(false);
  const api: Api = useCallback(async (path, method, body) => {
    try { return await request(userId, path, method, body); }
    catch (error) {
      if (error instanceof ApiError && error.status === 403 && error.code === 'school_setup_required') {
        setSchool(current => current ? { ...current, setup_complete: false } : current);
        setSettings(true);
      }
      if (error instanceof ApiError && error.status === 403 && method === 'PUT') {
        try {
          const schools = await request(userId, '/schools');
          if (Array.isArray(schools) && schools.length === 1 && schools[0].id) setSchool(schools[0]);
        } catch { /* Keep the form and the original access error available. */ }
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
      if (current === serial.current) {
        const next = schools[0] || null;
        if (!bootstrapped.current && (!next || (next.role === 'owner' && !next.setup_complete))) {
          history.replaceState(null, '', '/dashboard/settings');
          setSettings(true); setShowCreate(true); setOperationPage('home');
        }
        bootstrapped.current = true;
        setSchool(next); setUnauthorized(false);
      }
      return schools[0] || null;
    } catch (error) {
      if (current !== serial.current) return;
      setError(message(error)); setUnauthorized(error instanceof ApiError && error.status === 401);
    } finally { if (current === serial.current) setLoading(false); }
  }, [userId]);
  useEffect(() => { void load(); return () => { serial.current++; }; }, [load, attempt]);
  useEffect(() => {
    if (!loading && !error && school?.setup_complete && (location.pathname === '/' || (operationPage !== 'not-found' && /^\/schools\/[^/]+\/dashboard\//.test(location.pathname)))) {
      history.replaceState(null, '', `/dashboard/${pageSlugs[settings ? 'settings' : operationPage]}`);
    }
  }, [loading, error, school, settings, operationPage]);
  useEffect(() => {
    const onPopState = () => {
      const page = pageFromUrl();
      setSettings(page === 'settings');
      setShowCreate(page === 'settings');
      setOperationPage(page === 'settings' ? 'home' : page);
      setSaved(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  function navigate(page: string) {
    if (!pageSlugs[page] || (page === 'settings' && school && school.role !== 'owner') || (page === 'invitations' && (school?.role !== 'owner' || !school.setup_complete))) return;
    const path = `/dashboard/${pageSlugs[page]}`;
    if (location.pathname !== path) history.pushState(null, '', path);
    setSettings(page === 'settings');
    setShowCreate(page === 'settings');
    if (page !== 'settings') setOperationPage(page);
    else if (operationPage === 'not-found') setOperationPage('home');
    setSaved(false);
  }
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
  const invitationPage = operationPage === 'invitations';
  const denied = school && school.role !== 'owner' && (settings || operationPage === 'invitations');
  if (!loading && !error && school && (denied || operationPage === 'not-found' || (locked && school.role === 'staff'))) return <AccessPage school={school} locked={locked} kind={operationPage === 'not-found' ? 'not-found' : locked && !denied ? 'setup' : 'denied'} userEmail={userEmail} loggingOut={loggingOut} onLogout={logout} onNavigate={navigate} />;
  if (!loading && !error && school?.role === 'owner' && school.setup_complete && !settings && invitationPage) return <DashboardShell school={school} page="invitations" userEmail={userEmail} loggingOut={loggingOut} onLogout={logout} onNavigate={navigate}><Invitations api={api} schoolId={school.id} /></DashboardShell>;
  if (!loading && !error && !locked && !settings) return <LiveApp school={school!} api={api} initialPage={operationPage} userEmail={userEmail} onNavigate={navigate} loggingOut={loggingOut} onLogout={logout} progress={progress} markProgress={markProgress} />;
  return <DashboardShell school={school} page={loading ? 'home' : 'settings'} userEmail={userEmail} locked={loading || !!error || locked} loggingOut={loggingOut} onLogout={logout} onNavigate={navigate}>
    {loading ? <><HomeHeading busy /><HomeMetricsSkeleton /></> : error ? <section className="panel panel-pad"><p id="setup-reason" role="alert">{error}</p><button className="btn btn-primary" onClick={load}>Coba lagi</button>{unauthorized && <button className="btn btn-quiet" onClick={logout}>Masuk ulang</button>}</section>
      : <><div className="page-heading"><div><h1>Pengaturan Sekolah</h1><p className="page-sub">{school ? 'Profil dan jam operasional sekolah dalam WITA.' : 'Buat sekolah dengan mengisi profil dan jam operasional (WITA).'}</p></div></div>
        {locked ? <p id="setup-reason" className="notice">Lengkapi data sekolah terlebih dahulu untuk mengakses menu operasional.</p>
          : <OnboardingGuide settings progress={progress} onNavigate={navigate} />}
        <SchoolProfile showHeading={false} key={school?.id || 'new'} school={school} api={api} saved={saved} onSaved={async () => { setSettings(true); setSaved(true); await load(); }} retryAccess={() => setAttempt(n => n + 1)} />
      </>}
  </DashboardShell>;
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
    {school && !canSave && <p className="notice">{!school.setup_complete && 'Owner perlu melengkapi data sekolah. '}{school.role === 'staff' ? 'Anda hanya dapat membaca pengaturan.' : 'Role akun belum tersedia dari server; akses simpan belum dapat diverifikasi.'}{!school.role && <button className="btn btn-quiet" onClick={retryAccess}>Coba lagi</button>}</p>}
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
