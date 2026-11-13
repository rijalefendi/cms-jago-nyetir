import assert from 'node:assert/strict';
import test from 'node:test';
import { instructorTablePage } from '../src/instructorTable.mjs';

const rows = [
  { id: '1', name: 'Zaki', transmission: 'Manual', notes: 'Pagi', active: true },
  { id: '2', name: 'Alya', transmission: 'Matic', notes: 'Sore', active: false },
  { id: '3', name: 'Bima', transmission: 'Matic & Manual', notes: 'Malam', active: true },
];

test('search matches instructor name and notes without case sensitivity', () => {
  assert.deepEqual(instructorTablePage(rows, { query: 'sOrE' }).items.map(x => x.id), ['2']);
  assert.deepEqual(instructorTablePage(rows, { query: 'bim' }).items.map(x => x.id), ['3']);
});

test('sorting and page count use filtered rows and clamp stale page', () => {
  const result = instructorTablePage(rows, { query: 'a', sort: 'name', direction: 'asc', page: 9, pageSize: 2 });
  assert.deepEqual(result.items.map(x => x.id), ['1']);
  assert.equal(result.page, 2);
  assert.equal(result.total, 3);
  assert.equal(result.pageCount, 2);
});

const cars = [
  { id: 'C1', name: 'Unit Matic 01', transmission: 'Matic', active: true },
  { id: 'C2', name: 'Unit Manual 01', transmission: 'Manual', active: true },
  { id: 'C3', name: 'Unit Matic 02', transmission: 'Matic', active: false },
];

test('resource table helper works on vehicle rows for search, sort, and status', () => {
  assert.deepEqual(instructorTablePage(cars, { query: 'manual' }).items.map(x => x.id), ['C2']);
  assert.deepEqual(instructorTablePage(cars, { sort: 'status', direction: 'asc' }).items.map(x => x.active), [true, true, false]);
  assert.equal(instructorTablePage(cars, { sort: 'name', direction: 'desc' }).items[0].id, 'C3');
});

test('packages search descriptions and sort session counts numerically', () => {
  const packages = [
    { id: 'P1', name: 'A', description: '- Parkir\n1. Tanjakan', total_sessions: 12 },
    { id: 'P2', name: 'B', description: '', total_sessions: 4 },
    { id: 'P3', name: 'C', description: '', total_sessions: 8 },
  ];
  assert.deepEqual(instructorTablePage(packages, { query: 'TANJAKAN' }).items.map(p => p.id), ['P1']);
  assert.deepEqual(instructorTablePage(packages, { sort: 'total_sessions' }).items.map(p => p.total_sessions), [4, 8, 12]);
  assert.deepEqual(instructorTablePage(packages, { sort: 'total_sessions', direction: 'desc' }).items.map(p => p.total_sessions), [12, 8, 4]);
});
