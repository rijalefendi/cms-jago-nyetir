import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const liveConfigured = Boolean(url || key);
export const supabase = url && key ? createClient(url, key) : null;

export type School = {
  id: string; name: string; location: string | null; setup_complete: boolean;
  role?: 'owner' | 'staff';
};
export type Api = (path: string, method?: string, body?: Record<string, unknown>) => Promise<any>;
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export async function request(userId: string, path: string, method = 'GET', body?: Record<string, unknown>, retry = false): Promise<any> {
  const { data, error } = await supabase!.auth.getSession();
  if (error || !data.session || data.session.user.id !== userId) throw new ApiError('Sesi tidak tersedia. Silakan masuk ulang.', 401);
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method, headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw new ApiError('Gagal terhubung. Coba lagi; jika sedang menyimpan, periksa data sebelum mengulang.', 0); }
  if (res.status === 401 && retry && method === 'GET') {
    const refreshed = await supabase!.auth.refreshSession();
    if (!refreshed.error && refreshed.data.session?.user.id === userId) return request(userId, path);
  }
  const raw = await res.text();
  let result;
  try { result = raw ? JSON.parse(raw) : null; } catch { result = null; }
  if (!res.ok) {
    const message = res.status === 401 ? 'Akses belum dapat diverifikasi. Coba lagi atau masuk ulang.'
      : res.status === 403 ? 'Akses ditolak. Owner diperlukan untuk tindakan ini.'
      : res.status >= 500 ? 'Layanan belum dapat dihubungi. Silakan coba lagi.'
      : result?.error || result?.message || 'Permintaan gagal. Silakan coba lagi.';
    throw new ApiError(message, res.status, result?.code);
  }
  return result;
}
