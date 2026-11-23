import assert from 'node:assert/strict';
import { fixture, session, school, response, waitFor, tick } from './auth-fixture.mjs';

const writes = [];
let patchMode = 'ok';
let calendarLoads = 0;
let enrollLoads = 0;

const enrollment = { id: 'enrollment', student_id: 'student', package_name: 'Paket lama', agreed_price: 600000, total_sessions: 6, remaining_sessions: 1, transmission: 'Matic', session_duration_minutes: 60, status: 'Aktif' };
const available = { ...enrollment, id: 'available', package_name: 'Paket tersedia', remaining_sessions: 2 };
const base = { session_date: '2026-11-10', student_id: 'student', enrollment_id: 'enrollment', instructor_id: 'instructor', vehicle_id: 'vehicle', transmission: 'Matic' };
const sessions = [
  { id: 's-wait', ...base, start_time: '09:00', end_time: '10:00', status: 'Menunggu konfirmasi' },
  { id: 's-conf', ...base, start_time: '10:30', end_time: '11:30', status: 'Terkonfirmasi' },
  { id: 's-done', ...base, start_time: '13:00', end_time: '14:00', status: 'Selesai' },
  { id: 's-cancel', ...base, start_time: '15:00', end_time: '16:00', status: 'Dibatalkan' },
  { id: 's-miss', ...base, start_time: '16:30', end_time: '17:30', status: 'Tidak hadir' },
];

const f = fixture({ initial: session(), url: 'http://localhost/dashboard/sessions', fetch: async (url, options) => {
  const u = new URL(url, 'http://localhost');
  if (url === '/api/v1/schools') return response([{ ...school, role: 'owner' }]);
  if (options.method === 'PATCH' && /\/sessions\/s-/.test(u.pathname) || options.method === 'POST' && u.pathname.endsWith('/sessions')) {
    writes.push({ url: u.pathname, body: JSON.parse(options.body) });
    if (patchMode === 'ok') return response('uuid-session');
    if (patchMode === 'locked') return response({ code: 'session_status_locked', message: 'Session is final' }, 409);
    if (patchMode === 'conflict') return response({ code: 'schedule_conflict', message: 'Schedule conflict' }, 409);
    if (patchMode === 'hours') return response({ code: 'outside_operating_hours', message: 'Session must be within school operating hours' }, 400);
    return response({ code: 'session_allowance_exhausted', message: 'Package session allowance exhausted' }, 409);
  }
  if (options.method && options.method !== 'GET') return response('saved');
  if (u.pathname.endsWith('/sessions')) {
    if (!u.searchParams.get('date_from')) return response({ items: [], total: 0, page: 1, pageSize: 100 });
    calendarLoads++;
    return response({ items: sessions, total: sessions.length, page: 1, pageSize: 100 });
  }
  if (u.pathname.endsWith('/student_enrollments')) {
    enrollLoads++;
    return response({ items: [enrollment, available], total: 2, page: 1, pageSize: 100 });
  }
  if (u.pathname.endsWith('/students')) return response({ items: [{ id: 'student', name: 'Ayu' }], total: 1, page: 1, pageSize: 100 });
  if (u.pathname.endsWith('/packages')) return response([{ id: 'package', name: 'Paket baru', normal_price: 650000, total_sessions: 6, transmission: 'Matic', session_duration_minutes: 60, active: true }]);
  if (u.pathname.endsWith('/instructors')) return response([{ id: 'instructor', name: 'Guru', transmission: 'Matic', active: true }]);
  if (u.pathname.endsWith('/vehicles')) return response([{ id: 'vehicle', name: 'Mobil', transmission: 'Matic', active: true }]);
  if (u.pathname.endsWith('/settings')) return response([{ weekday_closed: false, weekday_open: '08:00:00', weekday_close: '17:00:00', weekend_closed: true, weekend_open: null, weekend_close: null }]);
  return response([]);
} });

const article = status => [...f.document.querySelectorAll('.live-list article')].find(a => a.querySelector('.badge')?.textContent === status);
const buttonIn = (scope, text) => [...scope.querySelectorAll('button')].find(b => b.textContent === text);

await waitFor(() => f.document.querySelectorAll('.live-list article').length === 5);

// Final statuses are read-only; editable statuses keep their actions.
for (const final of ['Selesai', 'Dibatalkan', 'Tidak hadir']) {
  assert.equal(article(final).querySelector('.live-session-actions'), null, `${final} row must be read-only`);
}
for (const editable of ['Menunggu konfirmasi', 'Terkonfirmasi']) {
  assert.ok(buttonIn(article(editable), 'Ubah'), `${editable} row keeps edit`);
  assert.ok(buttonIn(article(editable), 'Batalkan sesi'), `${editable} row keeps cancel`);
}

// Successful cancel sends only the status and reloads the calendar.
let before = { cal: calendarLoads, enroll: enrollLoads };
buttonIn(article('Terkonfirmasi'), 'Batalkan sesi').click();
await waitFor(() => writes.length === 1);
assert.equal(writes[0].url, '/api/v1/schools/school/sessions/s-conf');
assert.deepEqual(writes[0].body, { status: 'Dibatalkan' });
await waitFor(() => calendarLoads === before.cal + 1);
assert.equal(f.document.querySelector('[role="dialog"]'), null);

// 409 session_status_locked on cancel: message + reload, no automatic retry.
patchMode = 'locked';
before = { cal: calendarLoads, enroll: enrollLoads };
buttonIn(article('Menunggu konfirmasi'), 'Batalkan sesi').click();
await waitFor(() => writes.length === 2);
assert.deepEqual(writes[1].body, { status: 'Dibatalkan' });
await waitFor(() => calendarLoads === before.cal + 1);
assert.match(f.document.querySelector('p[role="alert"]').textContent, /final.*tidak dapat diubah.*dimuat ulang/s);
await tick();
assert.equal(writes.length, 2, 'no automatic retry after session_status_locked');

// 409 session_status_locked on a regular edit: student & package stay disabled, editor closes, data reloads, no retry.
before = { cal: calendarLoads, enroll: enrollLoads };
buttonIn(article('Terkonfirmasi'), 'Ubah').click();
const form = await openEditForm();
assert.equal(form.querySelector('[aria-label="Murid untuk jadwal"]').disabled, true, 'student is locked when editing');
assert.equal(form.querySelector('[aria-label="Murid dan paket"]').disabled, true, 'package is locked when editing');
form.dispatchEvent(new f.dom.window.Event('submit', { bubbles: true, cancelable: true }));
await waitFor(() => writes.length === 3);
const full = writes[2].body;
for (const key of ['student_id', 'enrollment_id', 'instructor_id', 'vehicle_id', 'session_date', 'start_time', 'end_time', 'transmission', 'status']) assert.ok(full[key], `full PATCH sends ${key}`);
assert.equal(full.enrollment_id, 'enrollment');
assert.equal(full.transmission, 'Matic');
await waitFor(() => !f.document.querySelector('[role="dialog"]'));
assert.match(f.document.querySelector('p[role="alert"]').textContent, /final.*tidak dapat diubah.*dimuat ulang/s);
await waitFor(() => calendarLoads === before.cal + 1 && enrollLoads === before.enroll + 1);
await tick();
assert.equal(writes.length, 3, 'no automatic retry after session_status_locked');

// 409 schedule_conflict: message shown in the form, inputs preserved, no retry.
patchMode = 'conflict';
buttonIn(article('Terkonfirmasi'), 'Ubah').click();
const conflictForm = await openEditForm();
conflictForm.dispatchEvent(new f.dom.window.Event('submit', { bubbles: true, cancelable: true }));
await waitFor(() => writes.length === 4);
await waitFor(() => conflictForm.querySelector('.modal-foot .form-feedback'));
assert.match(conflictForm.querySelector('.modal-foot .form-feedback').textContent, /bentrok/);
assert.equal(conflictForm.elements.instructor_id.value, 'instructor', 'conflict keeps form input');
assert.ok(f.document.querySelector('[role="dialog"]'), 'conflict keeps the editor open');
await tick();
assert.equal(writes.length, 4, 'no automatic retry after schedule_conflict');
buttonIn(conflictForm, 'Batal').click();
await tick();

// 409 session_allowance_exhausted on create: message shown, input preserved, no retry.
patchMode = 'exhausted';
buttonIn(f.document.body, 'Jadwalkan sesi').click();
await waitFor(() => f.document.querySelector('[role="dialog"]'));
const createForm = f.document.querySelector('form');
const studentSelect = createForm.querySelector('[aria-label="Murid untuk jadwal"]');
studentSelect.value = 'student';
studentSelect.dispatchEvent(new f.dom.window.Event('change', { bubbles: true }));
await waitFor(() => createForm.elements.enrollment_id.querySelector('[value="available"]'));
assert.match(createForm.elements.enrollment_id.querySelector('[value="available"]').textContent, /Sisa kuota: 2/, 'remaining quota comes from the enrollment aggregate');
createForm.elements.enrollment_id.value = 'available';
createForm.elements.enrollment_id.dispatchEvent(new f.dom.window.Event('change', { bubbles: true }));
let date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
while ([0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())) date = new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
createForm.elements.session_date.value = date;
const change = (input, value) => { Object.getOwnPropertyDescriptor(f.dom.window.HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new f.dom.window.Event('input', { bubbles: true })); };
change(createForm.elements.start_time, '11:45');
await tick();
assert.equal(createForm.elements.end_time.value, '12:45');
createForm.elements.instructor_id.value = 'instructor';
createForm.elements.instructor_id.dispatchEvent(new f.dom.window.Event('change', { bubbles: true }));
createForm.elements.vehicle_id.value = 'vehicle';
createForm.elements.vehicle_id.dispatchEvent(new f.dom.window.Event('change', { bubbles: true }));
createForm.dispatchEvent(new f.dom.window.Event('submit', { bubbles: true, cancelable: true }));
await waitFor(() => writes.length === 5);
assert.equal(writes[4].url, '/api/v1/schools/school/sessions');
assert.equal(writes[4].body.status, 'Menunggu konfirmasi');
await waitFor(() => createForm.querySelector('.modal-foot .form-feedback'));
assert.match(createForm.querySelector('.modal-foot .form-feedback').textContent, /Kuota paket telah habis/);
assert.ok(f.document.querySelector('[role="dialog"]'), 'allowance error keeps the editor open');
assert.equal(createForm.elements.instructor_id.value, 'instructor', 'allowance error keeps form input');
await tick();
assert.equal(writes.length, 5, 'no automatic retry after session_allowance_exhausted');

// 400 outside_operating_hours from server: mapped to Indonesian message, input preserved.
patchMode = 'hours';
createForm.dispatchEvent(new f.dom.window.Event('submit', { bubbles: true, cancelable: true }));
await waitFor(() => writes.length === 6);
await waitFor(() => /di luar jam operasional sekolah/.test(createForm.querySelector('.modal-foot .form-feedback')?.textContent || ''));
assert.ok(f.document.querySelector('[role="dialog"]'), 'hours error keeps the editor open');
assert.equal(createForm.elements.instructor_id.value, 'instructor', 'hours error keeps form input');

async function openEditForm() {
  await waitFor(() => f.document.querySelector('[role="dialog"]'));
  const form = f.document.querySelector('form');
  await waitFor(() => form.elements.instructor_id.options.length > 1 && form.elements.instructor_id.value === 'instructor');
  return form;
}

f.close();
console.log('Live session lock UI passed');
