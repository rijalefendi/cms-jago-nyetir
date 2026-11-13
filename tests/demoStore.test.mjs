import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoStore } from '../src/demoStore.mjs';
import { seed } from '../src/seed.mjs';

test('older demo records gain packages without losing students or their session allowance', () => {
  const old = seed();
  delete old.packages;
  old.students.forEach(student => { delete student.packageId; });
  old.students[0].total = 9;
  const store = createDemoStore({ getItem: () => JSON.stringify(old) });
  const data = store.load('school', seed);
  assert.equal(data.packages.length, 3);
  assert.equal(data.students[0].packageId, 'P2');
  assert.equal(data.students[0].total, 9);
  assert.deepEqual(data.sessions, old.sessions);
});

test('demo records remain separate by school', async () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const store = createDemoStore(storage);
  const fixture = () => ({ leads: [], students: [], sessions: [], instructors: [], cars: [] });
  await store.save('one', { ...fixture(), leads: [{ id: 'L1' }] });
  assert.equal((await store.load('one', fixture)).leads.length, 1);
  assert.equal((await store.load('two', fixture)).leads.length, 0);
  await store.reset('one');
  assert.equal((await store.load('one', fixture)).leads.length, 0);
});

test('corrupt demo data falls back to fixture', async () => {
  const store = createDemoStore({ getItem: () => '{bad', setItem() {}, removeItem() {} });
  assert.deepEqual(await store.load('school', () => ({ fixture: true })), { fixture: true });
});
