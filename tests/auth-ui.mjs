import assert from 'node:assert/strict';
import { fixture, response, school, session, submit, tick, waitFor } from './auth-fixture.mjs';

// Restore must finish before either login or business content is shown.
let restore;
let f = fixture({ restore: () => new Promise(resolve => { restore = resolve; }) });
await waitFor(() => restore);
assert.match(f.document.body.textContent, /Memulihkan sesi/);
assert.equal(f.document.querySelector('form'), null);
restore({ data: { session: null }, error: null });
await waitFor(() => f.document.querySelector('form'));
assert.match(f.document.querySelector('h1').textContent, /Masuk/);
submit(f, { email: 'owner@example.com', password: 'wrong-password' });
await waitFor(() => f.document.querySelector('[role="alert"]'));
assert.match(f.document.querySelector('[role="alert"]').textContent, /Email atau kata sandi salah/);
assert.equal(f.document.querySelector('[name="email"]').getAttribute('aria-invalid'), 'true');
assert.equal(f.document.querySelector('[name="password"]').getAttribute('aria-invalid'), 'true');
await waitFor(() => f.document.activeElement === f.document.querySelector('[name="email"]'));
assert.equal(f.document.activeElement, f.document.querySelector('[name="email"]'));
assert.match(f.document.getElementById(f.document.querySelector('[name="email"]').getAttribute('aria-describedby')).textContent, /Periksa/);
assert.equal(f.document.querySelector('.auth-panel > [role="alert"]'), null);
assert.equal(f.document.querySelector('.auth-form > .auth-error'), null, 'field errors are not duplicated');
assert.equal(f.errors[0][0], '[auth:login]');
assert.equal(f.errors[0][1].message, 'Invalid login credentials');
assert.equal(f.errors[0][1].status, 400);
f.document.querySelector('[data-auth-mode="signup"]').click();
await waitFor(() => f.document.querySelector('h1')?.textContent === 'Daftar akun');
let signup;
let signupCount = 0;
let finishSignup;
f.auth.signUp = async args => { signup = args; signupCount++; return new Promise(resolve => { finishSignup = resolve; }); };
submit(f, { email: 'owner@example.com', password: 'long-password' });
submit(f, { email: 'owner@example.com', password: 'long-password' });
await waitFor(() => finishSignup);
assert.equal(signupCount, 1);
assert.equal(f.document.querySelector('button[type="submit"]').disabled, true);
finishSignup({ data: { session: null }, error: null });
await waitFor(() => f.document.body.textContent.includes('Periksa email untuk memverifikasi akun'));
assert.match(f.document.body.textContent, /Periksa email untuk memverifikasi akun/);
assert.equal(signup.options.emailRedirectTo, 'http://localhost/auth/callback');
assert.equal(f.calls.length, 0);
f.close();

// Password visibility is always available; signup shows a live length checklist.
f = fixture();
await waitFor(() => f.document.querySelector('form'));
assert.match(f.document.querySelector('.auth-switch').textContent, /Belum punya akun\?\s*Daftar gratis/);
const visibilityPassword = f.document.querySelector('[name="password"]');
let eye = f.document.querySelector('[aria-controls="auth-password"]');
assert.ok(eye?.querySelector('svg path'), 'eye is rendered without dashboard icon sprites');
assert.equal(eye.type, 'button');
assert.equal(eye.getAttribute('aria-label'), 'Tampilkan kata sandi');
assert.equal(eye.getAttribute('aria-pressed'), 'false');
assert.equal(visibilityPassword.type, 'password');
eye.click();
await waitFor(() => visibilityPassword.type === 'text');
assert.equal(eye.getAttribute('aria-label'), 'Sembunyikan kata sandi');
assert.equal(eye.getAttribute('aria-pressed'), 'true');
eye.click();
await waitFor(() => visibilityPassword.type === 'password');
assert.equal(f.document.querySelector('[role="alert"]'), null, 'eye does not submit');
f.document.querySelector('[data-auth-mode="signup"]').click();
await waitFor(() => f.document.querySelector('h1')?.textContent === 'Daftar akun');
const rule = f.document.getElementById('auth-password-hint');
assert.match(rule.textContent, /Minimal 8 karakter/);
assert.ok(rule.querySelector('svg path'));
assert.equal(rule.dataset.state, 'pending');
const setPassword = value => {
  Object.getOwnPropertyDescriptor(f.dom.window.HTMLInputElement.prototype, 'value').set.call(visibilityPassword, value);
  visibilityPassword.dispatchEvent(new f.dom.window.Event('input', { bubbles: true }));
};
setPassword('1234567');
await tick();
assert.equal(rule.dataset.state, 'pending', 'first edit is neutral');
visibilityPassword.focus();
f.document.querySelector('[name="email"]').focus();
await waitFor(() => rule.dataset.state === 'invalid');
setPassword('12345678');
await waitFor(() => rule.dataset.state === 'valid');
assert.match(rule.textContent, /Terpenuhi/);
setPassword('short');
await waitFor(() => rule.dataset.state === 'pending', 'length status updates in both directions');
eye = f.document.querySelector('[aria-controls="auth-password"]');
eye.click();
await waitFor(() => visibilityPassword.type === 'text');
assert.equal(visibilityPassword.value, 'short');
f.document.querySelector('[data-auth-mode="login"]').click();
await waitFor(() => visibilityPassword.type === 'password');
assert.equal(f.document.getElementById('auth-password-hint'), null);
assert.equal(f.document.querySelector('[aria-controls="auth-password"]').getAttribute('aria-pressed'), 'false');
f.close();

// First edits stay quiet; blur validates without stealing focus.
f = fixture();
await waitFor(() => f.document.querySelector('form'));
const email = f.document.querySelector('[name="email"]');
const password = f.document.querySelector('[name="password"]');
const edit = (input, value) => {
  Object.getOwnPropertyDescriptor(f.dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new f.dom.window.Event('input', { bubbles: true }));
};
email.focus();
password.focus();
await tick();
assert.equal(f.document.querySelector('[aria-invalid="true"]'), null, 'blank blur stays quiet');
email.focus();
edit(email, 'not-an-email');
await tick();
assert.equal(f.document.querySelector('[aria-invalid="true"]'), null, 'first edit stays quiet');
password.focus();
await waitFor(() => email.getAttribute('aria-invalid') === 'true');
assert.match(f.document.getElementById(email.getAttribute('aria-describedby')).textContent, /Format email/);
assert.equal(f.document.activeElement, password, 'blur must not move focus back');
assert.equal(f.document.querySelector('.auth-panel > [role="alert"]'), null, 'blur only shows the inline error');
edit(password, 'typing');
await tick();
assert.equal(email.getAttribute('aria-invalid'), 'true', 'editing another field preserves errors');
email.focus();
edit(email, 'still-invalid');
await tick();
assert.equal(email.getAttribute('aria-invalid'), 'true', 'error stays until valid');
edit(email, 'owner@example.com');
await waitFor(() => email.getAttribute('aria-invalid') === 'false');
assert.equal(email.hasAttribute('aria-describedby'), false);
edit(email, 'bad-again');
await tick();
assert.equal(email.getAttribute('aria-invalid'), 'false', 'a new error waits for blur');

// Submit (including Enter's submit event) validates untouched fields and focuses the first error.
let validationCalls = 0;
f.auth.signInWithPassword = async () => { validationCalls++; throw Error('should not call SDK'); };
submit(f, { email: 'bad-again', password: '' });
await waitFor(() => password.getAttribute('aria-invalid') === 'true');
assert.equal(f.document.activeElement, email);
edit(email, 'owner@example.com');
await waitFor(() => email.getAttribute('aria-invalid') === 'false');
assert.equal(password.getAttribute('aria-invalid'), 'true');
assert.equal(f.document.querySelector('.auth-form > .auth-error'), null, 'submit errors stay at the fields');
assert.match(f.document.getElementById('auth-password-error').textContent, /wajib diisi/);
edit(password, 'short');
await waitFor(() => password.getAttribute('aria-invalid') === 'false');
assert.equal(f.document.querySelector('[role="alert"]'), null);
assert.equal(f.document.activeElement, email, 'fixing a field must not focus another field');
assert.equal(validationCalls, 0);

f.document.querySelector('[data-auth-mode="signup"]').click();
await waitFor(() => f.document.querySelector('h1')?.textContent === 'Daftar akun');
password.focus();
email.focus();
await waitFor(() => password.getAttribute('aria-invalid') === 'true');
assert.match(f.document.getElementById('auth-password-error').textContent, /minimal 8 karakter/);
assert.equal(f.document.activeElement, email);
edit(password, '1234567');
await tick();
assert.equal(password.getAttribute('aria-invalid'), 'true');
edit(password, '12345678');
await waitFor(() => password.getAttribute('aria-invalid') === 'false');
assert.equal(password.getAttribute('aria-describedby'), 'auth-password-hint');
password.focus();
edit(password, 'short');
email.focus();
await waitFor(() => password.getAttribute('aria-invalid') === 'true');
f.document.querySelector('[data-auth-mode="login"]').click();
await waitFor(() => f.document.querySelector('h1')?.textContent === 'Masuk');
assert.equal(f.document.querySelector('[aria-invalid="true"]'), null, 'mode switch clears errors');
assert.deepEqual(f.errors, []);
f.close();

// Required/invalid fields are explained inline before any SDK call.
f = fixture();
await waitFor(() => f.document.querySelector('form'));
let loginCalls = 0;
f.auth.signInWithPassword = async () => { loginCalls++; throw Error('should not call SDK'); };
submit(f, { email: '', password: '' });
await waitFor(() => f.document.querySelector('[role="alert"]'));
assert.match(f.document.body.textContent, /Email wajib diisi/);
assert.match(f.document.body.textContent, /Kata sandi wajib diisi/);
assert.equal(loginCalls, 0);
submit(f, { email: 'not-an-email', password: 'password' });
await waitFor(() => f.document.body.textContent.includes('Format email'));
assert.equal(loginCalls, 0);
f.document.querySelector('[data-auth-mode="signup"]').click();
await waitFor(() => f.document.querySelector('h1')?.textContent === 'Daftar akun');
let validationSignupCalls = 0;
f.auth.signUp = async () => { validationSignupCalls++; throw Error('should not call SDK'); };
submit(f, { email: 'owner@example.com', password: 'short' });
await waitFor(() => f.document.body.textContent.includes('Kata sandi harus minimal 8 karakter'));
assert.equal(validationSignupCalls, 0);
assert.equal(f.document.querySelector('[name="email"]').getAttribute('aria-invalid'), 'false');
assert.equal(f.document.querySelector('[name="password"]').getAttribute('aria-invalid'), 'true');
assert.deepEqual(f.errors, []);
f.close();

// Backend failures are specific without marking unrelated fields invalid.
for (const [mode, code, status, text, invalid] of [
  ['login', 'email_not_confirmed', 400, /Verifikasi email/, ['email']],
  ['signup', 'weak_password', 422, /Kata sandi terlalu lemah/, ['password']],
  ['signup', 'email_address_invalid', 422, /Alamat email tidak valid/, ['email']],
  ['signup', 'over_email_send_rate_limit', 429, /Batas pengiriman email/, []],
  ['signup', 'email_address_not_authorized', 403, /pengiriman email/, []],
  ['signup', 'signup_disabled', 422, /Pendaftaran akun sedang dinonaktifkan/, []],
  ['signup', 'email_exists', 422, /Coba masuk atau periksa email verifikasi/, []],
  ['login', 'unexpected_failure', 500, /Layanan autentikasi bermasalah/, []],
  ['signup', 'new_provider_code', 400, /Pendaftaran belum berhasil/, []],
]) {
  f = fixture();
  await waitFor(() => f.document.querySelector('form'));
  if (mode === 'signup') {
    f.document.querySelector('[data-auth-mode="signup"]').click();
    await waitFor(() => f.document.querySelector('h1')?.textContent === 'Daftar akun');
  }
  f.auth[mode === 'login' ? 'signInWithPassword' : 'signUp'] = async () => ({
    data: { session: null }, error: { code, status, message: 'Provider diagnostic', access_token: 'must-not-log', user: { email: 'private@example.com' } },
  });
  submit(f, { email: 'owner@example.com', password: 'long-password' });
  await waitFor(() => f.document.querySelector('[role="alert"]'));
  assert.match(f.document.querySelector('[role="alert"]').textContent, text, code);
  assert.equal(f.document.querySelector('.auth-panel > [role="alert"]'), null, code);
  if (!invalid.length) {
    assert.match(f.document.querySelector('.auth-form > [role="alert"]').textContent, new RegExp(code));
  } else {
    assert.equal(f.document.querySelector('.auth-form > .auth-error'), null, 'field errors are not duplicated');
  }
  assert.deepEqual([...f.document.querySelectorAll('[aria-invalid="true"]')].map(input => input.name), invalid, code);
  assert.equal(f.errors[0][1].code, code);
  assert.equal(f.errors[0][1].message, 'Provider diagnostic');
  assert.doesNotMatch(JSON.stringify(f.errors), /must-not-log|private@example.com/);
  assert.equal(f.document.querySelector('[name="email"]').value, 'owner@example.com');
  // Editing clears the outdated server error; switching modes clears it too.
  const input = f.document.querySelector('[name="email"]');
  Object.getOwnPropertyDescriptor(f.dom.window.HTMLInputElement.prototype, 'value').set.call(input, 'changed@example.com');
  input.dispatchEvent(new f.dom.window.Event('input', { bubbles: true }));
  await waitFor(() => !f.document.querySelector('[role="alert"]'));
  assert.equal(f.document.querySelector('[aria-invalid="true"]'), null);
  f.close();
}

// Keep the diagnostic message, but redact credentials, callback URLs and tokens.
f = fixture();
await waitFor(() => f.document.querySelector('form'));
f.auth.signInWithPassword = async () => { throw {
  name: 'AuthRetryableFetchError', status: 0,
  message: 'Failed to fetch owner@example.com long-password https://example.com/auth/callback#access_token=secret access_token=raw-secret Bearer header-secret',
  stack: 'private stack', password: 'long-password',
}; };
submit(f, { email: 'owner@example.com', password: 'long-password' });
await waitFor(() => f.document.querySelector('[role="alert"]'));
assert.match(f.document.body.textContent, /Gagal terhubung/);
assert.ok(f.document.querySelector('.auth-form > [role="alert"]'), 'network failures remain visible near submit');
assert.equal(f.document.querySelector('[aria-invalid="true"]'), null);
assert.match(f.errors[0][1].message, /Failed to fetch/);
assert.doesNotMatch(JSON.stringify(f.errors), /owner@example|long-password|https:|raw-secret|header-secret|private stack/);
f.close();

f = fixture({ url: 'http://localhost/auth/callback#error=access_denied&error_code=otp_expired&error_description=secret' });
await waitFor(() => f.document.querySelector('[role="alert"]'));
assert.match(f.document.querySelector('[role="alert"]').textContent, /tidak valid atau kedaluwarsa/);
assert.ok(f.document.querySelector('.auth-form > [role="alert"]'), 'callback failures are shown near submit');
assert.equal(f.dom.window.location.hash, '');
assert.doesNotMatch(f.document.body.textContent, /secret/);
f.close();

// Login and confirmation callbacks both enter the same authenticated bootstrap.
f = fixture();
await waitFor(() => f.document.querySelector('form'));
f.auth.signInWithPassword = async () => { const next = session(); f.emit(next); return { data: { session: next }, error: null }; };
submit(f, { email: 'owner@example.com', password: 'long-password' });
await waitFor(() => f.document.querySelector('.live-nav'));
assert.equal(f.calls.filter(([url]) => url === '/api/schools').length, 1);
f.auth.signOut = async () => ({ error: Error('Network error') });
[...f.document.querySelectorAll('button')].find(button => button.textContent === 'Keluar').click();
await waitFor(() => f.document.querySelector('[role="alert"]'));
assert.match(f.document.body.textContent, /Gagal keluar/);
f.auth.signOut = async () => { f.emit(null); return { error: null }; };
[...f.document.querySelectorAll('button')].find(button => button.textContent === 'Keluar').click();
await waitFor(() => f.document.querySelector('h1')?.textContent === 'Masuk');
assert.equal(f.document.querySelector('.live-nav'), null);
f.close();

f = fixture({ initial: session(), url: 'http://localhost/auth/callback#access_token=sensitive' });
await waitFor(() => f.document.querySelector('.live-nav'));
assert.equal(f.dom.window.location.pathname, '/');
assert.equal(f.dom.window.location.hash, '');
f.close();

// Failed bootstrap is not onboarding. A 401 gets only one SDK refresh/retry.
let attempts = 0;
let refreshes = 0;
f = fixture({ initial: session(), fetch: async () => { attempts++; return response({ error: 'Auth upstream unavailable' }, 401); } });
f.auth.refreshSession = async () => { refreshes++; return { data: { session: session() }, error: null }; };
await waitFor(() => f.document.body.textContent.includes('Masuk ulang'));
assert.equal(attempts, 2);
assert.equal(refreshes, 1);
assert.match(f.document.body.textContent, /Masuk ulang/);
assert.equal(f.document.querySelector('[name="name"]'), null);
f.close();

f = fixture({ initial: session(), fetch: async () => { throw Error('offline'); } });
await waitFor(() => f.document.querySelector('[role="alert"]'));
assert.match(f.document.body.textContent, /Gagal terhubung/);
assert.equal(f.document.querySelector('form'), null);
assert.ok([...f.document.querySelectorAll('button')].some(button => button.textContent === 'Coba lagi'));
f.close();

// Only a successful empty list permits creation, with the complete profile payload.
let created;
let exists = false;
f = fixture({ initial: session(), fetch: async (url, options) => {
  if (options.method === 'POST') { created = JSON.parse(options.body); exists = true; return response('school'); }
  if (url.endsWith('/settings')) return response([{ ...school, weekday_closed: false, weekday_open: '08:00:00', weekday_close: '17:00:00', weekend_closed: true }]);
  return response(exists ? [school] : []);
} });
await waitFor(() => f.document.querySelector('[name="name"]'));
assert.match(f.document.body.textContent, /Pengaturan Sekolah/);
const openingTime = f.document.querySelector('.time-picker input[name="weekday_open"]');
assert.ok(openingTime, 'school hours use the shared time picker');
assert.equal(openingTime.type, 'time');
assert.equal(openingTime.required, true);
assert.match(openingTime.getAttribute('aria-label'), /Jam buka/);
assert.ok(openingTime.closest('.time-picker').querySelector('svg[aria-hidden="true"]'));
assert.equal(f.document.querySelectorAll('.time-picker').length, 2, 'closed days omit time inputs');
assert.equal(f.document.querySelector('.live-nav button:not(:disabled)'), null);
const schoolForm = f.document.querySelector('.school-profile');
assert.equal(schoolForm.noValidate, true, 'school settings use inline errors instead of browser tooltips');
submit(f, { name: '', location: '', weekday_open: '', weekday_close: '' });
await tick();
for (const name of ['name', 'location', 'weekday_open', 'weekday_close']) {
  const input = schoolForm.elements.namedItem(name);
  assert.equal(input.getAttribute('aria-invalid'), 'true', `${name} has a visible invalid state`);
  const feedback = f.document.getElementById(input.getAttribute('aria-describedby'));
  assert.ok(feedback?.classList.contains('field-error'), `${name} links to inline feedback`);
}
assert.equal(created, undefined, 'invalid settings are never sent');
submit(f, { name: 'Sekolah', location: 'Samarinda', weekday_open: '08:00', weekday_close: '07:00' });
await tick();
const closingTime = schoolForm.elements.namedItem('weekday_close');
assert.equal(schoolForm.elements.namedItem('name').getAttribute('aria-invalid'), 'false');
assert.equal(openingTime.getAttribute('aria-invalid'), 'false', 'valid opening time stays neutral');
assert.equal(closingTime.getAttribute('aria-invalid'), 'true');
assert.match(f.document.getElementById(closingTime.getAttribute('aria-describedby')).textContent, /setelah jam buka/);
assert.equal(f.document.activeElement, closingTime.closest('.time-picker').querySelector('[role="combobox"]'));
submit(f, { weekday_close: '08:00' });
await tick();
assert.equal(closingTime.getAttribute('aria-invalid'), 'true', 'equal opening and closing times are invalid');
const closeParts = closingTime.closest('.time-picker').querySelectorAll('[role="combobox"]');
for (const [index, value] of ['09', '00'].entries()) {
  Object.getOwnPropertyDescriptor(f.dom.window.HTMLInputElement.prototype, 'value').set.call(closeParts[index], value);
  closeParts[index].dispatchEvent(new f.dom.window.Event('input', { bubbles: true }));
  await tick();
}
assert.equal(closingTime.getAttribute('aria-invalid'), 'false', 'correcting the time clears its error without another submit');
assert.equal(closingTime.getAttribute('aria-describedby'), null);
assert.equal(f.document.querySelector('.school-profile .field-error'), null);
schoolForm.elements.namedItem('weekday_closed').click();
await tick();
assert.match(f.document.querySelector('.hours-error').textContent, /Minimal satu kelompok hari/);
assert.equal(f.document.querySelector('.hours-fields').getAttribute('aria-invalid'), 'true');
assert.equal(created, undefined);
schoolForm.elements.namedItem('weekday_closed').click();
await tick();
submit(f, { name: 'Sekolah', location: 'Samarinda', weekday_open: '08:00', weekday_close: '' });
await tick();
assert.equal(openingTime.isConnected, false, 'reopening a day group remounts its inputs');
assert.equal(schoolForm.elements.namedItem('weekday_open').getAttribute('aria-invalid'), 'false');
assert.equal(schoolForm.elements.namedItem('weekday_close').getAttribute('aria-invalid'), 'true', 'only the missing time is marked');
submit(f, { name: ' Sekolah ', location: ' Samarinda ', weekday_open: '08:00', weekday_close: '17:00' });
await waitFor(() => f.document.body.textContent.includes('berhasil disimpan') && f.document.querySelector('[name="name"]'));
assert.deepEqual(created, { name: 'Sekolah', location: 'Samarinda', weekday: { open: '08:00', close: '17:00' }, weekend: { closed: true } });
assert.match(f.document.body.textContent, /berhasil disimpan/);
assert.match(f.document.querySelector('h2').textContent, /Pengaturan Sekolah/);
f.close();

// Unknown role never enables updates; setup gate does not fetch operational data.
f = fixture({ initial: session(), fetch: async url => response(url.endsWith('/settings')
  ? [{ ...school, weekday_closed: false, weekday_open: '08:00:00', weekday_close: '17:00:00', weekend_closed: true }]
  : [{ ...school, setup_complete: false }]) });
await waitFor(() => f.document.querySelector('[name="weekday_open"]'));
assert.match(f.document.body.textContent, /Owner perlu melengkapi/);
assert.equal(f.document.querySelector('[name="weekday_open"]').value, '08:00');
assert.equal(f.document.querySelector('.time-picker input').matches(':disabled'), true, 'inherited fieldset permissions are preserved');
assert.equal(f.document.querySelector('button[type="submit"]').disabled, true);
assert.ok(f.calls.every(([url]) => url.endsWith('/schools') || url.endsWith('/settings')));
f.close();

// Token refresh doesn't bootstrap again; every request reads the newest token.
f = fixture({ initial: session(), fetch: async url => response(url === '/api/schools' ? [school] : []) });
await waitFor(() => f.document.querySelector('.live-nav'));
f.emit(session('user-a', 'token-new'));
await tick();
assert.equal(f.calls.filter(([url]) => url === '/api/schools').length, 1);
f.document.querySelector('.live-nav button').click();
await tick();
f.document.querySelectorAll('.live-nav button')[1].click();
await tick();
assert.equal(f.calls.at(-1)[1].headers.Authorization, 'Bearer token-new');
f.emit(null);
await tick();
assert.match(f.document.querySelector('h1').textContent, /Masuk/);
assert.doesNotMatch(f.document.body.textContent, /Sekolah/);
f.close();

// A write conflict retains input and is not retried; ownership is server-provided.
let writes = 0;
f = fixture({ initial: session(), fetch: async (url, options) => {
  if (options.method === 'PUT') { writes++; return response({ message: 'Jam bentrok dengan sesi mendatang' }, 409); }
  return response(url.endsWith('/settings')
    ? [{ ...school, weekday_closed: false, weekday_open: '08:00:00', weekday_close: '17:00:00', weekend_closed: true }]
    : [{ ...school, setup_complete: false, role: 'owner' }]);
} });
await waitFor(() => f.document.querySelector('[name="name"]'));
submit(f, { name: 'Nama baru', location: 'Alamat baru', weekday_open: '09:00', weekday_close: '16:00' });
await waitFor(() => f.document.querySelector('[role="alert"]'));
assert.equal(writes, 1);
assert.equal(f.document.querySelector('[name="name"]').value, 'Nama baru');
assert.match(f.document.body.textContent, /Jam bentrok/);
assert.ok(f.calls.every(([url]) => url.endsWith('/schools') || url.endsWith('/settings')));
f.close();

// Server setup invalidation removes operational content without logging out.
let needsSetup = false;
f = fixture({ initial: session(), fetch: async url => {
  if (url === '/api/schools') return response([school]);
  if (url.endsWith('/settings')) return response([{ ...school, weekday_closed: false, weekday_open: '08:00:00', weekday_close: '17:00:00', weekend_closed: true }]);
  return needsSetup ? response({ code: 'school_setup_required', error: 'Setup required' }, 403) : response([]);
} });
await waitFor(() => f.document.querySelector('.live-nav'));
needsSetup = true;
f.document.querySelectorAll('.live-nav button')[1].click();
await waitFor(() => f.document.getElementById('setup-reason') && f.document.querySelector('.school-profile'));
assert.match(f.document.body.textContent, /Lengkapi data sekolah terlebih dahulu/);
assert.equal(f.document.querySelector('h1').textContent, 'Jagonyetir');
assert.equal(f.document.querySelector('.live-nav button:not(:disabled)'), null);
f.close();

// A late bootstrap response from account A cannot populate account B.
let release;
let first = true;
f = fixture({ initial: session(), fetch: async () => {
  if (first) { first = false; return new Promise(resolve => { release = resolve; }); }
  return response([]);
} });
await waitFor(() => release);
f.emit(session('user-b', 'token-b'));
await waitFor(() => f.document.body.textContent.includes('Buat sekolah'));
assert.match(f.document.body.textContent, /Buat sekolah/, JSON.stringify(f.calls));
release(response([{ ...school, name: 'Private school A' }]));
await tick();
assert.doesNotMatch(f.document.body.textContent, /Private school A/);
assert.match(f.document.body.textContent, /Buat sekolah/);
f.close();

// Development preview still requires auth, then uses only the existing local demo.
f = fixture({ preview: true, fetch: async () => { throw Error('preview must never call the backend'); } });
await waitFor(() => f.document.querySelector('form'));
assert.equal(f.document.getElementById('main'), null);
submit(f, { email: 'owner@example.com', password: 'wrong-password' });
await waitFor(() => f.document.getElementById('auth-email-error'));
assert.equal(f.document.getElementById('main'), null);
assert.equal(f.calls.length, 0);
f.auth.signInWithPassword = async () => { const next = session(); f.emit(next); return { data: { session: next }, error: null }; };
submit(f, { email: 'owner@example.com', password: 'long-password' });
await waitFor(() => f.document.querySelector('[data-react-page="OverviewPage"]'));
assert.match(f.document.getElementById('main').textContent, /Mode demo.*data simulasi/);
f.document.querySelector('[data-page="instruktur"]').click();
await waitFor(() => f.document.querySelector('.instructor-table'));
assert.equal(f.calls.length, 0);
const previewErrors = [];
f.dom.window.addEventListener('error', event => { previewErrors.push(event.message); event.preventDefault(); });
f.emit(null);
await waitFor(() => f.document.querySelector('h1')?.textContent === 'Masuk');
assert.equal(f.document.getElementById('main'), null);
f.document.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
f.dom.window.dispatchEvent(new f.dom.window.PopStateEvent('popstate'));
assert.deepEqual(previewErrors, [], 'demo listeners must be removed when auth ends');
f.emit(session());
await waitFor(() => f.document.querySelector('.instructor-table'));
assert.equal(f.calls.length, 0);
assert.deepEqual(f.errors.filter(([label]) => label !== '[auth:login]'), []);
f.close();

// Restored sessions also preview locally; production ignores the flag entirely.
f = fixture({ preview: true, initial: session() });
await waitFor(() => f.document.querySelector('[data-react-page="OverviewPage"]'));
assert.equal(f.calls.length, 0);
f.close();
f = fixture({ preview: true, production: true, initial: session(), fetch: async () => response({ error: 'unavailable' }, 503) });
await waitFor(() => f.document.querySelector('[role="alert"]'));
assert.match(f.document.body.textContent, /Layanan belum dapat dihubungi/);
assert.equal(f.calls.length, 1);
assert.equal(f.document.getElementById('main'), null);
f.close();
console.log('Auth UI passed');
