import assert from 'node:assert/strict';
import { fixture, session, school, response, waitFor } from './auth-fixture.mjs';

const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const yesterday = new Date(`${today}T12:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const rows = [
  { id: '1', student_id: 's', student_name: 'Ayu', session_date: today, start_time: '08:00', end_time: '09:00', status: 'Menunggu konfirmasi' },
  { id: '2', student_id: 's', student_name: 'Ayu', session_date: yesterday.toISOString().slice(0, 10), start_time: '10:00', end_time: '11:00', status: 'Terkonfirmasi' },
  { id: '3', student_id: 's', student_name: 'Ayu', session_date: today, start_time: '12:00', end_time: '13:00', status: 'Selesai' },
];
let fail = true;
let releaseSchool;
const schoolGate = new Promise(resolve => { releaseSchool = resolve; });
let releaseHome;
const homeGate = new Promise(resolve => { releaseHome = resolve; });
const f = fixture({ initial: session(), fetch: async url => {
  const u = new URL(url, 'http://localhost');
  if (u.pathname === '/api/v1/schools') { await schoolGate; return response([school]); }
  if (u.pathname.endsWith('/home')) {
    await homeGate;
    assert.equal(u.search, '');
    if (fail) return response({ error: 'offline' }, 502);
    return response({ date: today, today_count: 2, pending_count: 1, overdue_count: 1, today_sessions: [rows[0], rows[2]], overdue_sessions: [rows[1]] });
  }
  if (u.pathname.endsWith('/sessions')) return response({ items: [], total: 0 });
  return response([]);
} });
await waitFor(() => f.document.querySelector('.home-metrics.loading-skeleton'));
assert.equal(f.document.querySelector('h1')?.textContent, 'Beranda');
assert.equal(f.document.querySelector('.page-heading .eyebrow'), null);
assert.equal(f.document.querySelector('.page-heading .page-sub'), null);
assert.deepEqual([...f.document.querySelectorAll('.heading-actions button')].map(button => button.textContent), ['Muat ulang', 'Buka jadwal']);
assert.equal(f.document.querySelector('.page-heading .loading-skeleton'), null);
assert.ok(!f.document.body.textContent.includes('Memuat akses sekolah'));
assert.ok(!f.document.body.textContent.includes('Pengaturan Sekolah'));
assert.ok(!f.calls.some(([url]) => url.endsWith('/home')), 'school access must resolve before fetching metrics');
releaseSchool();
await waitFor(() => f.calls.some(([url]) => url.endsWith('/home')));
await waitFor(() => f.document.querySelector('[role="status"]')?.textContent.includes('Memuat beranda'));
assert.equal(f.document.querySelectorAll('.home-metrics.loading-skeleton .metric').length, 2);
assert.equal(f.document.querySelector('.home-metrics.loading-skeleton').getAttribute('aria-hidden'), 'true');
releaseHome();
await waitFor(() => f.document.querySelector('.instructor-load-error'));
assert.equal(f.document.querySelector('.home-metrics'), null);
fail = false;
f.document.querySelector('.instructor-load-error button').click();
await waitFor(() => f.document.querySelector('.home-metrics'));
assert.equal(f.document.querySelector('.home-metrics.loading-skeleton'), null);
assert.deepEqual([...f.document.querySelectorAll('.home-metrics .metric-value')].map(x => x.textContent), ['1', '1']);
assert.ok(Number(f.document.querySelectorAll('.home-metrics .metric-value')[1].textContent) >= 1, 'yesterday’s confirmed session is overdue');
assert.equal(f.calls.filter(([url]) => url.endsWith('/home')).length, 2);
assert.ok(!f.calls.some(([url]) => /\/(students|sessions)(\?|$)/.test(url)));
assert.match(f.document.querySelector('.home-work').textContent, /Ayu/);
assert.match(f.document.querySelector('.home-work section .panel-sub').textContent, /2 sesi/);
assert.equal(f.document.querySelector('.home-work .panel-head button'), null, 'Lihat jadwal CTA is removed from panel headers');
assert.equal(f.document.querySelectorAll('.home-work section')[0].querySelectorAll('button.agenda-entry-link').length, 2);
assert.equal(f.document.querySelectorAll('.home-work section')[1].querySelectorAll('button.agenda-entry-link').length, 1);
assert.equal(f.document.querySelector('.onboarding-guide'), null, 'non-empty home hides onboarding guide');
assert.ok(f.document.querySelectorAll('.home-metrics .metric')[1].classList.contains('hot'));
assert.match(f.document.querySelector('.home-work').textContent, /30 hari terakhir/);
assert.ok(f.document.querySelector('.home-work').textContent.includes(new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${today}T12:00:00Z`))));
[...f.document.querySelectorAll('button')].find(button => button.textContent === 'Muat ulang').click();
await waitFor(() => f.calls.filter(([url]) => url.endsWith('/home')).length === 3 && f.document.querySelector('.home-metrics'));
const yesterdayIso = yesterday.toISOString().slice(0, 10);
f.document.querySelectorAll('.home-work section')[1].querySelector('button.agenda-entry-link').click();
await waitFor(() => f.dom.window.location.pathname === '/dashboard/sessions');
await waitFor(() => f.calls.some(([url]) => url.includes(`date_from=${yesterdayIso}&date_to=${yesterdayIso}`)));
f.close();
const empty = fixture({ initial: session(), fetch: async url => url === '/api/v1/schools' ? response([school]) : response({ date: today, today_count: 0, pending_count: 0, overdue_count: 0, today_sessions: [], overdue_sessions: [] }) });
await waitFor(() => empty.document.querySelector('.home-work'));
assert.match(empty.document.querySelector('.home-work').textContent, /Belum ada sesi hari ini/);
assert.match(empty.document.querySelector('.home-work').textContent, /Tidak ada sesi lewat/);
assert.deepEqual([...empty.document.querySelectorAll('.home-metrics .metric-value')].map(x => x.textContent), ['0', '0']);
assert.ok(!empty.document.querySelectorAll('.home-metrics .metric')[1].classList.contains('hot'));
assert.ok(empty.document.querySelector('.onboarding-guide'), 'empty home shows onboarding guide without extra fetches');
assert.ok([...empty.document.querySelectorAll('.onboarding-guide button')].some(b => b.textContent === 'Buka menu Paket'));
assert.ok(empty.document.querySelector('.onboarding-guide .step-status.unknown'), 'unchecked steps show Belum dicek badge');
assert.match(empty.document.querySelector('.onboarding-guide').textContent, /Belum dicek/);
assert.ok(!empty.calls.some(([url]) => /\/(packages|instructors|vehicles|students)(\?|$)/.test(url)));
empty.close();
console.log('Home UI passed');
