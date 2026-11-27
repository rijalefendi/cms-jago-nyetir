import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const liveConfigured = Boolean(url || key);
export const supabase = url && key ? createClient(url, key) : null;
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
export const turnstileSiteKey = typeof siteKey === 'string' && siteKey.trim() ? siteKey.trim() : '';

export type School = {
  id: string; name: string; location: string | null; setup_complete: boolean;
  role?: 'owner' | 'staff';
};
export type Api = (path: string, method?: string, body?: Record<string, unknown>) => Promise<any>;
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

const pendingWrites = new Set<string>();

export async function request(userId: string, path: string, method = 'GET', body?: Record<string, unknown>, retry = false): Promise<any> {
  const { data, error } = await supabase!.auth.getSession();
  if (error || !data.session || data.session.user.id !== userId) throw new ApiError('Sesi tidak tersedia. Silakan masuk ulang.', 401);
  const protectedPost = method === 'POST' && /\/schools\/[^/]+\/(sessions|student_enrollments)$/.test(path);
  const storageKey = `idempotency:${userId}:${path}:${JSON.stringify(body)}`;
  if (protectedPost && pendingWrites.has(storageKey)) throw new ApiError('Permintaan masih diproses.', 0);
  let idempotencyKey: string | undefined;
  if (protectedPost) {
    idempotencyKey = sessionStorage.getItem(storageKey) || crypto.randomUUID();
    sessionStorage.setItem(storageKey, idempotencyKey);
    pendingWrites.add(storageKey);
  }
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method, headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw new ApiError(method === 'PATCH' ? 'Hasil perubahan belum diketahui. Muat ulang data sebelum mengambil tindakan.' : 'Gagal terhubung. Coba lagi; jika sedang menyimpan, periksa data sebelum mengulang.', 0); }
  finally { if (protectedPost) pendingWrites.delete(storageKey); }
  if (res.status === 401 && retry && method === 'GET') {
    const refreshed = await supabase!.auth.refreshSession();
    if (!refreshed.error && refreshed.data.session?.user.id === userId) return request(userId, path);
  }
  let raw: string;
  try { raw = await res.text(); } catch { throw new ApiError('Hasil permintaan belum diketahui. Periksa data sebelum mengambil tindakan.', 0); }
  let result;
  try { result = raw ? JSON.parse(raw) : null; } catch { result = null; }
  if (protectedPost && res.status < 500 && result?.code !== 'idempotency_key_conflict' && (!res.ok || typeof result === 'string')) sessionStorage.removeItem(storageKey);
  if (!res.ok) {
    const message = res.status === 409 && result?.code === 'idempotency_key_conflict' ? 'Permintaan bertentangan dengan aksi sebelumnya. Muat ulang data dan periksa hasilnya sebelum mencoba lagi.'
      : res.status === 401 ? 'Akses belum dapat diverifikasi. Coba lagi atau masuk ulang.'
      : res.status === 403 && result?.code === 'verified_email_required' ? 'Periksa email untuk memverifikasi akun sebelum melanjutkan.'
      : res.status === 403 ? (result?.message || result?.error || 'Akses ditolak.')
      : res.status >= 500 ? 'Layanan belum dapat dihubungi. Silakan coba lagi.'
      : result?.message || result?.error || 'Permintaan gagal. Silakan coba lagi.';
    throw new ApiError(message, res.status, result?.code);
  }
  return result;
}
