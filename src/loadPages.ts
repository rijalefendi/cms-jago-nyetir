import type { Api } from './auth';

export async function loadPages(api: Api, path: string, filters: Record<string, string> = {}): Promise<Record<string, any>[]> {
  const items: Record<string, any>[] = [];
  const ids = new Set<string>();
  let total: number | undefined;
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({ ...filters, page: String(page), page_size: '100' });
    const result = await api(`${path}?${params}`);
    if (!Array.isArray(result?.items) || !Number.isSafeInteger(result.total) || result.total < 0 || (total !== undefined && total !== result.total)) throw Error('Daftar berubah atau tidak lengkap. Coba lagi.');
    total = result.total;
    for (const item of result.items) {
      if (!item || typeof item.id !== 'string' || ids.has(item.id)) throw Error('Respons daftar tidak valid. Coba lagi.');
      ids.add(item.id); items.push(item);
    }
    if (items.length === result.total) return items;
    if (items.length > result.total || !result.items.length) throw Error('Daftar tidak lengkap. Coba lagi.');
  }
}
