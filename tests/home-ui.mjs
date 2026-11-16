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
const f = fixture({ initial: session(), fetch: async url => {
  const u = new URL(url, 'http://localhost');
  if (u.pathname === '/api/v1/schools') return response([school]);
  if (u.pathname.endsWith('/home')) {
    assert.equal(u.search, '');
    if (fail) return response({ error: 'offline' }, 502);
    return response({ date: today, today_count: 2, pending_count: 1, overdue_count: 1, today_sessions: [rows[0], rows[2]], overdue_sessions: [rows[1]] });
  }
  return response([]);
} });
await waitFor(() => f.document.querySelector('.instructor-load-error'));
assert.equal(f.document.querySelector('.home-metrics'), null);
fail = false;
f.document.querySelector('.instructor-load-error button').click();
await waitFor(() => f.document.querySelector('.home-metrics'));
assert.deepEqual([...f.document.querySelectorAll('.home-metrics .metric-value')].slice(0, 2).map(x => x.textContent), ['2', '1']);
assert.ok(Number(f.document.querySelectorAll('.home-metrics .metric-value')[2].textContent) >= 1, 'yesterday’s confirmed session is overdue');
assert.equal(f.calls.filter(([url]) => url.endsWith('/home')).length, 2);
assert.ok(!f.calls.some(([url]) => /\/(students|sessions)(\?|$)/.test(url)));
assert.match(f.document.querySelector('.home-work').textContent, /Ayu/);
assert.match(f.document.querySelector('.home-work').textContent, /30 hari terakhir/);
assert.match(f.document.querySelector('.home-work').textContent, new RegExp(today));
[...f.document.querySelectorAll('button')].find(button => button.textContent === 'Muat ulang').click();
await waitFor(() => f.calls.filter(([url]) => url.endsWith('/home')).length === 3 && f.document.querySelector('.home-metrics'));
f.document.querySelector('.home-work button').click();
await waitFor(() => f.dom.window.location.pathname === '/dashboard/jadwal');
f.close();
const empty = fixture({ initial: session(), fetch: async url => url === '/api/v1/schools' ? response([school]) : response({ date: today, today_count: 0, pending_count: 0, overdue_count: 0, today_sessions: [], overdue_sessions: [] }) });
await waitFor(() => empty.document.querySelector('.home-work'));
assert.match(empty.document.querySelector('.home-work').textContent, /Belum ada sesi hari ini/);
assert.match(empty.document.querySelector('.home-work').textContent, /Tidak ada sesi lewat/);
assert.deepEqual([...empty.document.querySelectorAll('.home-metrics .metric-value')].map(x => x.textContent), ['0', '0', '0']);
empty.close();
console.log('Home UI passed');
