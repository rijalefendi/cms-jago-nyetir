import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { JSDOM } from 'jsdom';

const bundle = buildSync({ entryPoints: ['src/main.tsx'], bundle: true, outfile: 'qa-live.js', write: false, loader: { '.html': 'text' }, format: 'iife', platform: 'browser', define: { 'import.meta.env.VITE_SUPABASE_URL': '"http://supabase"', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '"anon"' } });
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true });
dom.window.sessionStorage.setItem('school-token', 'token');
const instructors = [
  { id: 'a', name: 'Alya', transmission: 'Matic', notes: 'Pagi', active: true },
  { id: 'b', name: 'Bima', transmission: 'Manual', notes: 'Sore', active: false },
];
const calls = [];
let rejectDelete = false;
let pauseNextList = false;
let releaseList;
let failNextList = false;
dom.window.fetch = async (url, options = {}) => {
  calls.push([url, options.method || 'GET']);
  if (rejectDelete && options.method === 'DELETE') return { ok: false, text: async () => JSON.stringify({ code: '23503', message: 'foreign key violation' }) };
  const parsed = new URL(url, 'http://localhost');
  if (parsed.pathname.endsWith('/instructors') && parsed.searchParams.has('page')) {
    if (pauseNextList) { pauseNextList = false; await new Promise(resolve => { releaseList = resolve; }); }
    if (failNextList) { failNextList = false; return { ok: false, text: async () => JSON.stringify({ error: 'Data service unavailable' }) }; }
  }
  const search = (parsed.searchParams.get('search') || '').toLowerCase();
  const filtered = instructors.filter(row => `${row.name} ${row.notes}`.toLowerCase().includes(search));
  const body = url.endsWith('/schools') ? [{ id: 'school', name: 'Sekolah', time_zone: 'Asia/Jakarta' }]
    : parsed.pathname.endsWith('/instructors') && parsed.searchParams.has('page') ? { items: filtered.slice((Number(parsed.searchParams.get('page')) - 1) * 10, Number(parsed.searchParams.get('page')) * 10), total: filtered.length, page: Number(parsed.searchParams.get('page')), pageSize: 10 }
    : parsed.pathname.endsWith('/instructors') ? instructors
    : [];
  return { ok: true, text: async () => JSON.stringify(body) };
};
dom.window.eval(bundle.outputFiles.find(file => file.path.endsWith('.js')).text);
await new Promise(resolve => setTimeout(resolve, 150));
const { document, Event, MouseEvent } = dom.window;
assert.ok(!calls.some(([url]) => url.endsWith('/instructors')));
const callsBeforeInstructor = calls.length;
document.querySelectorAll('.live-nav button')[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
const editForm = document.querySelector('.instructor-form');
assert.equal(editForm.querySelector('[name="notes"]').value, 'Sore');
editForm.querySelector('[name="notes"]').value = 'Akhir pekan';
editForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await new Promise(resolve => setTimeout(resolve, 30));
assert.ok(calls.some(([url, method]) => url.endsWith('/instructors/b') && method === 'PATCH'));
document.querySelector('.instructor-table [aria-label="Hapus Bima"]').click();
await new Promise(resolve => setTimeout(resolve, 20));
assert.match(document.body.textContent, /Hapus instruktur Bima/);
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
document.querySelector('.live-instructor-heading button').click();
await new Promise(resolve => setTimeout(resolve, 20));
assert.ok(!document.querySelector('.instructor-action-error'));
const addForm = document.querySelector('.instructor-form');
assert.ok(addForm.compareDocumentPosition(document.querySelector('.instructor-table')) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
assert.equal(document.activeElement, addForm.querySelector('[name="name"]'));
addForm.querySelector('[name="name"]').value = 'Citra';
addForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await new Promise(resolve => setTimeout(resolve, 30));
assert.ok(calls.some(([url, method]) => url.endsWith('/instructors') && method === 'POST'));
for (let i = 0; i < 10; i++) instructors.push({ id: `extra-${i}`, name: `Extra ${i}`, transmission: 'Matic', notes: '', active: true });
const searchAgain = document.getElementById('liveInstructorSearch');
Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(searchAgain, '');
searchAgain.dispatchEvent(new Event('input', { bubbles: true }));
await new Promise(resolve => setTimeout(resolve, 350));
assert.equal(document.querySelectorAll('.instructor-table tbody tr').length, 10);
document.querySelector('[aria-label="Halaman berikutnya"]').click();
await new Promise(resolve => setTimeout(resolve, 30));
assert.equal(document.querySelectorAll('.instructor-table tbody tr').length, 2);
assert.ok(calls.some(([url]) => url.includes('/instructors?page=2')));
document.querySelector('.instructor-table .table-sort').click();
await new Promise(resolve => setTimeout(resolve, 30));
assert.ok(calls.some(([url]) => { const params = new URL(url, 'http://localhost').searchParams; return params.get('sort') === 'name' && params.get('direction') === 'desc' && params.get('page') === '1'; }));
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
console.log('Live instructor UI passed');
dom.window.close();
