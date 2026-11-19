import assert from 'node:assert/strict';
import { fixture, response, school, session, tick, waitFor } from './auth-fixture.mjs';

let removed = false;
const f = fixture({ initial: session(), url: 'http://localhost/dasbor/staff', fetch: async (url, options) => {
  if (url === '/api/v1/schools') return response([school]);
  if (options.method === 'DELETE') {
    assert.equal(url, '/api/v1/schools/school/members/user-staff');
    removed = true;
    return response(null, 204);
  }
  if (url.endsWith('/members')) return response([
    { user_id: 'owner', email: 'owner@example.com', role: 'owner', created_at: '2026-11-01' },
    ...removed ? [] : [{ user_id: 'user-staff', email: 'aktif@example.com', role: 'staff', created_at: '2026-11-02' }],
  ]);
  return response({ items: [
    { id: 'pending', email: 'baru@example.com', created_at: '2026-11-03', expires_at: '2099-01-01', accepted_at: null, revoked_at: null },
    { id: 'accepted', email: 'aktif@example.com', created_at: '2026-11-01', expires_at: '2099-01-01', accepted_at: '2026-11-02', revoked_at: null },
  ], total: 2, page: 1, pageSize: 100 });
} });
await waitFor(() => f.document.querySelector('input[type="search"]'));
await waitFor(() => f.document.querySelectorAll('.invitation-panel tbody tr').length === 2);
assert.equal(f.document.querySelectorAll('.invitation-panel table').length, 1);
assert.doesNotMatch(f.document.body.textContent, /undangan|owner@example.com/i);
const search = f.document.querySelector('input[type="search"]');
Object.getOwnPropertyDescriptor(f.dom.window.HTMLInputElement.prototype, 'value').set.call(search, 'BARU');
search.dispatchEvent(new f.dom.window.Event('input', { bubbles: true }));
await waitFor(() => f.document.querySelectorAll('tbody tr').length === 1);
assert.match(f.document.querySelector('tbody').textContent, /baru@example.com/);
assert.doesNotMatch(f.document.querySelector('tbody').textContent, /aktif@example.com/);
f.document.querySelector('[aria-label="Hapus pencarian"]').click();
await waitFor(() => f.document.querySelector('[aria-label="Hapus staff aktif@example.com"]'));
f.document.querySelector('[aria-label="Hapus staff aktif@example.com"]').click();
await waitFor(() => f.document.querySelector('[data-action="remove-staff"]'));
assert.equal(removed, false);
f.document.querySelector('[data-action="remove-staff"]').click();
await waitFor(() => removed);
await tick();
await waitFor(() => f.document.querySelectorAll('.invitation-panel tbody tr').length === 1);
assert.doesNotMatch(f.document.querySelector('tbody').textContent, /aktif@example.com/);
f.close();
console.log('Staff UI passed');
