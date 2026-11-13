type Field = 'email' | 'password';
export type AuthFormError = {
  message: string; fields: Partial<Record<Field, string>>; code?: string; status?: number;
};

const errors: Record<string, { message: string; fields?: Field[] }> = {
  invalid_credentials: { message: 'Email atau kata sandi salah. Periksa kembali keduanya.', fields: ['email', 'password'] },
  email_not_confirmed: { message: 'Verifikasi email terlebih dahulu melalui tautan di kotak masuk atau folder spam.', fields: ['email'] },
  email_address_invalid: { message: 'Alamat email tidak valid. Periksa kembali penulisannya.', fields: ['email'] },
  weak_password: { message: 'Kata sandi terlalu lemah. Gunakan kata sandi lebih panjang dan ikuti kebijakan keamanan akun.', fields: ['password'] },
  over_email_send_rate_limit: { message: 'Batas pengiriman email tercapai. Tunggu beberapa saat sebelum mendaftar lagi.' },
  over_request_rate_limit: { message: 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.' },
  email_address_not_authorized: { message: 'Layanan pengiriman email belum mengizinkan alamat ini. Hubungi pengelola untuk memeriksa konfigurasi SMTP.' },
  signup_disabled: { message: 'Pendaftaran akun sedang dinonaktifkan. Hubungi pengelola sekolah.' },
  email_provider_disabled: { message: 'Login melalui email sedang dinonaktifkan. Hubungi pengelola sekolah.' },
  user_already_exists: { message: 'Pendaftaran belum dapat dilanjutkan. Coba masuk atau periksa email verifikasi.' },
  email_exists: { message: 'Pendaftaran belum dapat dilanjutkan. Coba masuk atau periksa email verifikasi.' },
  request_timeout: { message: 'Layanan terlalu lama merespons. Periksa koneksi dan coba lagi.' },
};

export function authFormError(error: unknown, action: 'login' | 'signup', credentials: { email: string; password: string }): AuthFormError {
  const detail = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = typeof detail.code === 'string' && /^[a-z0-9_]{1,80}$/.test(detail.code) ? detail.code : 'unknown_error';
  const status = typeof detail.status === 'number' && Number.isInteger(detail.status) && detail.status >= 0 && detail.status <= 599 ? detail.status : undefined;
  const name = typeof detail.name === 'string' && /^[A-Za-z0-9_]{1,80}$/.test(detail.name) ? detail.name : 'Error';
  let diagnostic = typeof detail.message === 'string' ? detail.message : typeof error === 'string' ? error : 'Tidak ada pesan dari penyedia autentikasi.';
  // Log only selected diagnostics, never the SDK object, request body or callback URL.
  for (const value of [credentials.email, credentials.password]) {
    if (value) diagnostic = diagnostic.split(value).join('[REDACTED]');
  }
  diagnostic = diagnostic
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL REDACTED]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL REDACTED]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b(access_token|refresh_token|password|apikey|authorization)\s*[:=]\s*["']?[^,\s"'}]+/gi, '$1=[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[TOKEN REDACTED]')
    .replace(/[\r\n\t]/g, ' ').slice(0, 2000);
  console.error(`[auth:${action}]`, { name, code, status, message: diagnostic });

  const failure = errors[code] || (status === 429 ? { message: 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.' }
    : status && status >= 500 ? { message: 'Layanan autentikasi bermasalah. Silakan coba lagi nanti.' }
    : name === 'AuthRetryableFetchError' || name === 'TypeError' || status === 0 ? { message: 'Gagal terhubung ke layanan autentikasi. Periksa koneksi internet dan coba lagi.' }
    : { message: action === 'login' ? 'Belum berhasil masuk. Coba lagi atau hubungi pengelola dengan kode error di bawah.' : 'Pendaftaran belum berhasil. Coba lagi atau hubungi pengelola dengan kode error di bawah.' });
  return { message: failure.message, fields: Object.fromEntries((failure.fields || []).map(field => [field, failure.message])), code, status };
}
