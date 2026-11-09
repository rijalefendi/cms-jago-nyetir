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
