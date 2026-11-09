export function instructorTablePage(rows, { query = '', sort = 'name', direction = 'asc', page = 1, pageSize = 10 } = {}) {
  const search = query.trim().toLocaleLowerCase('id');
  const filtered = rows.filter(row => `${row.name || ''} ${row.notes || ''}`.toLocaleLowerCase('id').includes(search));
  const getValue = row => sort === 'status' ? (row.active ? 'Aktif' : 'Nonaktif') : sort === 'transmission' ? (row.transmission || row.skills || '') : (row.name || '');
  const ordered = [...filtered].sort((a, b) => direction === 'desc'
    ? String(getValue(b)).localeCompare(String(getValue(a)), 'id', { sensitivity: 'base' })
    : String(getValue(a)).localeCompare(String(getValue(b)), 'id', { sensitivity: 'base' }));
  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  return { items: ordered.slice((currentPage - 1) * pageSize, currentPage * pageSize), page: currentPage, total: ordered.length, pageCount };
}
