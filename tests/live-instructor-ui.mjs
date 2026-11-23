import assert from 'node:assert/strict';
import { fixture, session, school, response, waitFor } from './auth-fixture.mjs';

const emptyLists = fixture({ initial: session(), fetch: async url => {
  if (url === '/api/v1/schools') return response([school]);
  return response(url.includes('/students?') || url.includes('/instructors?') ? { items: [], total: 0, page: 1, pageSize: 10 } : []);
} });
await waitFor(() => emptyLists.document.querySelector('#sidebar [data-live-page="students"]:not(:disabled)'));
for (const [page, icon] of [['students', 'student'], ['instructors', 'teacher'], ['vehicles', 'car'], ['packages', 'package']]) {
  emptyLists.document.querySelector(`#sidebar [data-live-page="${page}"]`)?.click();
  await waitFor(() => emptyLists.document.querySelector(`.${page === 'students' ? 'student' : page === 'instructors' ? 'instructor' : page === 'vehicles' ? 'car' : 'package'}-panel .empty use`));
  assert.equal(emptyLists.document.querySelector('.empty use').getAttribute('href'), `#i-${icon}`);
  const input = emptyLists.document.querySelector('.instructor-toolbar input');
  assert.equal(input.value, '', `search for ${page} must start empty`);
  Object.getOwnPropertyDescriptor(emptyLists.dom.window.HTMLInputElement.prototype, 'value').set.call(input, 'tidak ada');
  input.dispatchEvent(new emptyLists.dom.window.Event('input', { bubbles: true }));
}
emptyLists.close();

const routing = fixture({ initial: session(), url: 'http://localhost/dashboard/instructors' });
await waitFor(() => routing.document.querySelector('.live-nav [data-live-page="instructors"][aria-current="page"]'));
routing.document.querySelector('.live-nav [data-live-page="vehicles"]').click();
await waitFor(() => routing.document.querySelector('.live-nav [data-live-page="vehicles"][aria-current="page"]'));
assert.equal(routing.dom.window.location.pathname, '/dashboard/vehicles');
routing.dom.window.history.back();
await waitFor(() => routing.document.querySelector('.live-nav [data-live-page="instructors"][aria-current="page"]'));
assert.equal(routing.dom.window.location.pathname, '/dashboard/instructors');
routing.document.querySelector('#sidebar [data-live-page="settings"]').click();
await waitFor(() => routing.document.querySelector('#sidebar [data-live-page="settings"][aria-current="page"]'));
assert.equal(routing.dom.window.location.pathname, '/dashboard/settings');
routing.close();

const initialRoute = fixture({ initial: session() });
await waitFor(() => initialRoute.document.querySelector('.live-nav [data-live-page="home"][aria-current="page"]'));
await waitFor(() => initialRoute.dom.window.location.pathname === '/dashboard/home');
initialRoute.close();

const { dom } = fixture({ initial: session() });
const instructors = [
  { id: 'a', name: 'Alya', transmission: 'Matic', notes: 'Pagi', active: true },
  { id: 'b', name: 'Bima', transmission: 'Manual', notes: 'Sore', active: false },
];
const calls = [];
let rejectDelete = false;
let pauseNextList = false;
let releaseList;
let failNextList = false;
let rejectSave = false;
dom.window.fetch = async (url, options = {}) => {
  calls.push([url, options.method || 'GET']);
  if (rejectSave && options.method === 'POST') return { ok: false, status: 503, text: async () => JSON.stringify({ error: 'unavailable' }) };
  if (rejectDelete && options.method === 'DELETE') return { ok: false, text: async () => JSON.stringify({ code: '23503', message: 'foreign key violation' }) };
  const parsed = new URL(url, 'http://localhost');
  if (parsed.pathname.endsWith('/instructors') && parsed.searchParams.has('page')) {
    if (pauseNextList) { pauseNextList = false; await new Promise(resolve => { releaseList = resolve; }); }
    if (failNextList) { failNextList = false; return { ok: false, text: async () => JSON.stringify({ error: 'Data service unavailable' }) }; }
  }
  const search = (parsed.searchParams.get('search') || '').toLowerCase();
  const filtered = instructors.filter(row => `${row.name} ${row.notes}`.toLowerCase().includes(search));
  const body = url.endsWith('/schools') ? [school]
    : parsed.pathname.endsWith('/instructors') && parsed.searchParams.has('page') ? { items: filtered.slice((Number(parsed.searchParams.get('page')) - 1) * 10, Number(parsed.searchParams.get('page')) * 10), total: filtered.length, page: Number(parsed.searchParams.get('page')), pageSize: 10 }
    : parsed.pathname.endsWith('/instructors') ? instructors
    : [];
  return { ok: true, text: async () => JSON.stringify(body) };
};
await waitFor(() => dom.window.document.querySelector('.live-nav [data-live-page="instructors"]:not(:disabled)'));
const { document, Event, MouseEvent } = dom.window;
assert.ok(!calls.some(([url]) => url.endsWith('/instructors')));
const callsBeforeInstructor = calls.length;
document.querySelector('.live-nav [data-live-page="instructors"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 100));
assert.equal(document.querySelectorAll('.instructor-table tbody tr').length, 2);
assert.ok(calls.some(([url]) => url.includes('/instructors?page=1')));
assert.ok(!calls.slice(callsBeforeInstructor).some(([url]) => url.endsWith('/instructors')));
const search = document.getElementById('liveInstructorSearch');
Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(search, 'sore');
search.dispatchEvent(new Event('input', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 350));
assert.equal(document.querySelectorAll('.instructor-table tbody tr').length, 1);
assert.match(document.querySelector('.instructor-table tbody').textContent, /Bima/);
assert.ok(calls.some(([url]) => new URL(url, 'http://localhost').searchParams.get('search') === 'sore'));
document.querySelector('.instructor-table [aria-label="Ubah Bima"]').click();
await new Promise(resolve => setTimeout(resolve, 20));
const editForm = document.querySelector('form[data-form="save-instructor"]');
assert.equal(editForm.querySelector('[name="notes"]').value, 'Sore');
editForm.querySelector('[name="notes"]').value = 'Akhir pekan';
editForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await new Promise(resolve => setTimeout(resolve, 30));
assert.ok(calls.some(([url, method]) => url.endsWith('/instructors/b') && method === 'PATCH'));
document.querySelector('.instructor-table [aria-label="Hapus Bima"]').click();
await new Promise(resolve => setTimeout(resolve, 20));
assert.match(document.querySelector('[role="alertdialog"]').textContent, /Hapus instruktur\?/);
assert.match(document.querySelector('[role="alertdialog"]').textContent, /Bima/);
document.querySelector('[data-testid="confirm-delete-instructor"]').click();
await new Promise(resolve => setTimeout(resolve, 30));
assert.ok(calls.some(([url, method]) => url.endsWith('/instructors/b') && method === 'DELETE'));
rejectDelete = true;
document.querySelector('.instructor-table [aria-label="Hapus Bima"]').click();
await new Promise(resolve => setTimeout(resolve, 20));
document.querySelector('[data-testid="confirm-delete-instructor"]').click();
await new Promise(resolve => setTimeout(resolve, 30));
assert.ok(document.querySelector('.instructor-action-error[role="alert"]'));
assert.match(document.querySelector('.instructor-action-error[role="alert"]').textContent, /masih tercatat pada sesi/);
document.querySelector('[data-action="add-instructor"]').click();
await new Promise(resolve => setTimeout(resolve, 20));
assert.ok(!document.querySelector('.instructor-action-error'));
const addForm = document.querySelector('form[data-form="save-instructor"]');
assert.equal(document.activeElement, addForm.querySelector('[name="name"]'));
const writesBefore = calls.filter(([, method]) => method === 'POST').length;
addForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await new Promise(resolve => setTimeout(resolve, 30));
assert.match(document.getElementById('f-name-error').textContent, /Nama instruktur wajib diisi/);
assert.equal(calls.filter(([, method]) => method === 'POST').length, writesBefore);
assert.equal(document.getElementById('modalError'), null);
rejectSave = true;
addForm.querySelector('[name="name"]').value = 'Citra';
addForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await new Promise(resolve => setTimeout(resolve, 30));
assert.match(document.getElementById('modalError').textContent, /Layanan belum dapat dihubungi/);
assert.ok(document.getElementById('modalError').classList.contains('form-feedback'));
assert.doesNotMatch(document.getElementById('modalError').textContent, /^Error:/);
assert.equal(addForm.querySelector('[name="name"]').value, 'Citra');
assert.equal(addForm.querySelector('[aria-invalid="true"]'), null, 'network errors must not blame a field');
Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(addForm.querySelector('[name="name"]'), 'Citra Baru');
addForm.querySelector('[name="name"]').dispatchEvent(new Event('input', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 20));
assert.equal(document.getElementById('modalError'), null);
rejectSave = false;
addForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await new Promise(resolve => setTimeout(resolve, 30));
assert.ok(calls.some(([url, method]) => url.endsWith('/instructors') && method === 'POST'));
// Wait for the dialog and its deferred focus-restore cleanup to finish before interacting again.
for (let i = 0; i < 5; i++) { await new Promise(r => setTimeout(r, 40)); if (!document.querySelector('[role="dialog"], [role="alertdialog"]') && document.body.style.overflow !== 'hidden') break; }
await waitFor(() => !document.querySelector('[role="dialog"]') && document.body.style.overflow !== 'hidden');
for (let i = 0; i < 10; i++) instructors.push({ id: `extra-${i}`, name: `Extra ${i}`, transmission: 'Matic', notes: '', active: true });
const searchAgain = document.getElementById('liveInstructorSearch');
const clearSearch = document.querySelector('[data-clear-search="liveInstructorSearch"]');
assert.ok(clearSearch, 'live search exposes an explicit clear button');
clearSearch.click();
await new Promise(resolve => setTimeout(resolve, 20));
assert.equal(searchAgain.value, '');
assert.equal(document.activeElement, searchAgain);
await new Promise(resolve => setTimeout(resolve, 350));
assert.equal(document.querySelectorAll('.instructor-table tbody tr').length, 10);
document.querySelector('[aria-label="Halaman berikutnya"]').click();
await waitFor(() => document.querySelectorAll('.instructor-table tbody tr').length === 2);
assert.equal(document.querySelectorAll('.instructor-table tbody tr').length, 2);
assert.ok(calls.some(([url]) => url.includes('/instructors?page=2')));
document.querySelector('.instructor-table .table-sort').click();
await waitFor(() => calls.some(([url]) => { const params = new URL(url, 'http://localhost').searchParams; return params.get('sort') === 'name' && params.get('direction') === 'asc' && params.get('page') === '1'; }));
pauseNextList = true;
document.querySelector('.instructor-table .table-sort').click();
await new Promise(resolve => setTimeout(resolve, 20));
assert.match(document.querySelector('[role="status"]').textContent, /Memuat instruktur/);
assert.doesNotMatch(document.querySelector('.instructor-empty').textContent, /Belum ada instruktur/);
releaseList();
await new Promise(resolve => setTimeout(resolve, 30));
failNextList = true;
document.querySelector('.instructor-table .table-sort').click();
await new Promise(resolve => setTimeout(resolve, 30));
assert.ok(document.querySelector('.instructor-load-error[role="alert"]'));
assert.match(document.querySelector('.instructor-load-error[role="alert"]').textContent, /Gagal memuat/);
document.querySelector('.instructor-load-error button').click();
await new Promise(resolve => setTimeout(resolve, 30));
assert.equal(document.querySelectorAll('.instructor-table tbody tr').length, 10);
document.querySelector('.live-nav [data-live-page="vehicles"]').click();
await new Promise(resolve => setTimeout(resolve, 40));
document.querySelector('[data-action="add-car"]').click();
await new Promise(resolve => setTimeout(resolve, 20));
const vehicleForm = document.querySelector('form[data-form="save-car"]');
vehicleForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await new Promise(resolve => setTimeout(resolve, 20));
assert.match(document.getElementById('f-name-error').textContent, /Nama mobil wajib diisi/);
assert.equal(vehicleForm.elements.namedItem('name').getAttribute('aria-invalid'), 'true');
assert.equal(document.getElementById('modalError'), null);
console.log('Live instructor UI passed');
dom.window.close();
