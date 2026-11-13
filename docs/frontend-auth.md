# Handoff FE: autentikasi email dan bootstrap sekolah

Kontrak backend per 10 November 2026. Salin dokumen ini ke repo FE untuk integrasi awal.
Scope: register/login email + password, konfirmasi email, session, logout, dan routing setelah login.
Tidak mencakup OAuth, passwordless login, reset password, atau undangan staff.

## 1. Batas tanggung jawab

- FE memakai Supabase Auth untuk autentikasi. Tidak ada endpoint `/api/login` atau `/api/register` di backend Go.
- FE memanggil API Go `/api/...` untuk data bisnis, memakai access token pengguna dari Supabase.
- Backend memverifikasi token melalui Supabase Auth, memeriksa membership, dan meneruskan token pengguna ke PostgREST agar RLS berlaku.
- Login tidak otomatis membuat sekolah atau membership. Pembuatan sekolah melalui API membuat membership owner dalam transaksi yang sama.
- Satu akun maksimal memiliki satu membership sekolah, termasuk staff.
- Jangan menganggap `user_metadata`, email, atau state FE sebagai bukti role/membership.

### Apakah FE perlu `db/schema.sql`?

Tidak untuk integrasi ini. Kontrak FE adalah Supabase Auth dan HTTP API, bukan struktur tabel internal.
Schema, RLS, trigger, dan migrasi tetap dikelola repo backend sebagai satu sumber kebenaran.
Jangan menyalin atau menjalankan `db/schema.sql` dari repo FE, dan jangan membuat tabel user/password sendiri.
Schema boleh dibaca sebagai referensi saat debugging lintas repo, tetapi bukan dependency runtime FE.
Jika nanti ada kebutuhan akses tabel langsung atau Realtime, sepakati kontrak dan RLS secara terpisah.

## 2. Konfigurasi sebelum mulai

Contoh placeholder untuk FE Vite, simpan di `.env.example` FE:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-or-legacy-anon-key
```

- Gunakan proyek Supabase yang sama dengan backend. Nama variabel di atas adalah konvensi FE; backend tetap memakai `SUPABASE_URL` dan `SUPABASE_ANON_KEY`.
- Publishable key atau legacy anon key boleh dipakai di browser. Jangan kirim secret key, service-role key, `DATABASE_URL`, password database, atau kredensial akun tes ke bundle FE.
- Key publik untuk inisialisasi SDK bukan access token pengguna untuk header API Go.
- Gunakan client Supabase yang sudah ada; jika belum ada, gunakan `@supabase/supabase-js`. Jangan membuat penyimpanan/refresh token paralel sendiri.
- Contoh ini menargetkan browser SPA/Vite. Jika repo FE memakai SSR, ikuti panduan Supabase SSR untuk cookie dan callback PKCE; jangan menyalin pola SPA ke server.

Konfigurasi Supabase yang harus dikonfirmasi oleh pengelola proyek:

- Provider email/password dan pendaftaran akun diaktifkan.
- Rekomendasi: Confirm Email aktif; jangan menonaktifkannya hanya agar demo berhasil.
- Site URL menunjuk origin FE production.
- Daftarkan URL konfirmasi lokal dan production pada Redirect URLs. Usulan route FE: `/auth/callback`, misalnya `http://localhost:5173/auth/callback`. Sesuaikan port/domain sebenarnya.
- Atur pengiriman email yang bisa dipakai penerima uji; periksa batas layanan email bawaan dan siapkan SMTP untuk production.
- Backend dan migrasi school setup sudah diterapkan pada environment tujuan.

API Go dipanggil lewat origin FE yang sama:

- Development: proxy Vite `/api` ke `http://localhost:8080`.
- Production: reverse proxy/rewrite `/api` ke service Go.
- Jangan menganggap backend sudah mendukung request browser lintas origin/CORS.
- `/auth/callback` adalah route FE, bukan endpoint yang disediakan backend Go; hosting SPA harus bisa membuka route tersebut langsung.

## 3. Register, konfirmasi, login, dan logout

Gunakan method SDK berikut pada client Supabase yang sama:

| Aksi | Method |
| --- | --- |
| Register | `supabase.auth.signUp({ email, password, options: { emailRedirectTo: callbackUrl } })` |
| Login | `supabase.auth.signInWithPassword({ email, password })` |
| Restore session browser | `supabase.auth.getSession()` |
| Perubahan session | `supabase.auth.onAuthStateChange(...)` |
| Logout | `supabase.auth.signOut()` |

`callbackUrl` harus URL FE yang sudah diizinkan, bukan URL bebas dari input pengguna.

Register:

1. Validasi input dan cegah submit ganda saat request berjalan.
2. Periksa `error` dari SDK; jangan menganggap adanya `data.user` berarti sudah login.
3. Jika `data.session` belum tersedia, tampilkan instruksi memeriksa email. Jangan panggil API bisnis sebelum session tersedia.
4. Route callback menyelesaikan flow konfirmasi sesuai mode SDK yang dipakai. Tunggu session sebelum bootstrap sekolah; jika tidak ada session, arahkan ke login.
5. Link tidak valid/kedaluwarsa harus menampilkan pesan dan jalan kembali ke login, bukan loading tanpa akhir.

Login:

- Periksa `error`; untuk kredensial salah, tampilkan pesan umum, bukan memastikan suatu email terdaftar.
- Setelah session tersedia, jalankan bootstrap di bagian 4.
- Jangan mencatat password, access token, refresh token, atau URL callback bertoken ke log/analytics.

Session dan logout:

- Saat aplikasi dibuka, tampilkan loading sampai restore session selesai; jangan langsung redirect ke login.
- Pakai session terbaru untuk request, bukan token yang disalin sekali saat login.
- Listener auth cukup memperbarui state; jangan `await` method Supabase lain di dalam callback. Jalankan bootstrap di effect/alur terpisah dan unsubscribe saat cleanup.
- Hindari bootstrap berulang untuk event session pengguna yang sama. Ambil ulang sekolah setelah create/update dan ketika konteks akses perlu dimuat ulang.
- Saat logout berhasil atau session berakhir, kosongkan cache data bisnis/konteks sekolah. Abaikan atau batalkan request bootstrap lama agar respons akun sebelumnya tidak mengisi state akun baru.
- Restore session di browser bukan otorisasi server; backend tetap memeriksa setiap request.

## 4. Bootstrap setelah session tersedia

Login menjawab identitas pengguna. `GET /api/schools` menjawab sekolah yang bisa diakses dan status setup-nya.
Panggil saat session pertama dipulihkan atau pengguna berubah, bukan setiap perpindahan halaman.

```http
GET /api/schools
Authorization: Bearer <session.access_token>
```

Respons sukses HTTP 200 berupa array langsung, bukan `{ "data": [...] }`:

```json
[
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Sekolah Mengemudi",
    "logo_url": null,
    "location": "Jl. Contoh No. 10, Samarinda",
    "setup_complete": true
  }
]
```

`logo_url` dan `location` bisa null pada data lama. Maksimal satu sekolah; respons `[]` adalah kondisi valid.

| Kondisi | Tujuan FE |
| --- | --- |
| Tidak ada session | Login |
| Sedang restore session / load sekolah | Loading |
| HTTP 200, array kosong | Onboarding pembuatan sekolah |
| Sekolah ada, `setup_complete: false` | Settings / informasi perlu dilengkapi owner |
| Sekolah ada, `setup_complete: true` | Dashboard |
| Request gagal | Error dan tombol coba lagi; jangan diperlakukan sebagai array kosong |

Catatan role: respons sekolah dan Settings belum menyediakan role pengguna saat ini.
Jangan menganggap semua pengguna adalah owner, menebak role dari metadata, atau menjanjikan UI berbasis role dari kontrak ini.
Staff boleh membaca Settings tetapi hanya owner boleh menyimpan; jika PUT ditolak, tampilkan pesan bahwa owner harus melengkapi data.
UI yang harus menyembunyikan aksi berdasarkan role membutuhkan kontrak role tambahan dari backend.

## 5. API minimum untuk onboarding dan Settings

Semua request membutuhkan Bearer access token. Request dengan body JSON memakai `Content-Type: application/json`.

| Method dan path | Kontrak |
| --- | --- |
| `GET /api/schools` | HTTP 200, array sekolah seperti bagian 4 |
| `POST /api/schools` | Membuat sekolah lengkap dan owner; HTTP 200, JSON string UUID sekolah |
| `GET /api/schools/{school_id}/settings` | HTTP 200, array satu objek sekolah; owner/staff boleh baca walau setup belum lengkap |
| `PUT /api/schools/{school_id}/settings` | Mengganti basic info lengkap; hanya owner; HTTP 200, JSON string UUID sekolah |

POST dan PUT memakai payload yang sama:

```json
{
  "name": "Sekolah Mengemudi",
  "location": "Jl. Contoh No. 10, Samarinda",
  "weekday": { "open": "08:00", "close": "17:00" },
  "weekend": { "closed": true }
}
```

- `location` adalah alamat teks. Nama dan alamat wajib tidak kosong.
- Weekday = Senin-Jumat; weekend = Sabtu-Minggu; zona waktu jadwal `Asia/Makassar`.
- Kedua kelompok wajib diisi. Yang buka memakai `HH:MM`, open < close dalam hari yang sama; yang tutup memakai `{"closed":true}` tanpa jam.
- Minimal satu kelompok buka. Tidak mendukung lintas tengah malam, jam istirahat terpisah, atau hari libur khusus.
- Jangan kirim `setup_complete`, `user_id`, atau `role`. Untuk Settings, `school_id` berasal dari URL.
- GET Settings mengembalikan kolom datar `weekday_closed/open/close` dan `weekend_closed/open/close`, bukan objek `weekday/weekend`. Jam berupa `HH:MM:SS` atau null; konversi ke `HH:MM` untuk input/PUT.
- Setelah POST/PUT sukses, muat ulang konteks sekolah. Jangan mengharapkan respons berisi objek sekolah.
- Perubahan jam bisa ditolak jika bertentangan dengan sesi mendatang; pertahankan input dan tampilkan error.

## 6. Penanganan error

Error middleware/validasi Go berbentuk `{"error":"pesan"}`; error PostgREST diteruskan dan bisa berbentuk
`{"code":"...","message":"...","details":null,"hint":null}`. Jangan mengasumsikan semua error punya `error` atau kode aplikasi yang sama.

| Kondisi | Perilaku FE |
| --- | --- |
| 401 | Periksa session terbaru; untuk bootstrap GET, refresh melalui SDK dan retry maksimal sekali. Jika tetap ditolak, tawarkan login ulang, tanpa loop |
| 403, `code: "school_setup_required"` | Arahkan ke Settings; bukan logout |
| 403 lainnya | Tampilkan akses ditolak / owner diperlukan; jangan logout otomatis |
| 400 / 409 dari validasi atau constraint | Pertahankan input dan tampilkan pesan aman dari `error` atau `message` |
| 502 / error jaringan | Tampilkan gagal terhubung dan aksi coba lagi; jangan buat sekolah otomatis |

Backend saat ini juga dapat mengembalikan 401 jika pemeriksaan ke Supabase Auth gagal, termasuk gangguan upstream.
Jangan mengklaim setiap 401 pasti berarti token kedaluwarsa.
Jangan otomatis mengulang request tulis saat koneksi putus karena hasil transaksi mungkin sudah tersimpan.

## 7. Checklist penerimaan FE

- [ ] Register, email konfirmasi, callback, dan login diuji dengan proyek Supabase tujuan.
- [ ] Register tanpa session menampilkan instruksi cek email, bukan dashboard.
- [ ] Kredensial salah dan link tidak valid/kedaluwarsa punya error yang dapat ditindaklanjuti.
- [ ] Reload/deep link memulihkan session tanpa kilatan redirect ke login.
- [ ] Akun tanpa membership masuk onboarding hanya setelah respons GET sukses `[]`.
- [ ] Sekolah belum lengkap masuk Settings; staff tidak diasumsikan boleh menyimpan.
- [ ] POST sekolah mengirim profil lengkap, membaca respons string UUID, lalu memuat ulang konteks.
- [ ] Sekolah lengkap masuk dashboard; request API memakai token terbaru.
- [ ] 401 tidak berulang tanpa batas; 403 setup tidak menghapus session.
- [ ] Jaringan gagal tidak dianggap sebagai sekolah kosong.
- [ ] Logout/pergantian akun membersihkan cache dan menolak respons request akun lama.
- [ ] Bundle/env FE tidak memuat service-role key, secret key, password, atau connection URI database.

## 8. Referensi dan batas implementasi

Sumber kontrak backend: `README.md` bagian Menghubungkan frontend dan School setup dan Settings,
`internal/httpapi/server.go`, `internal/httpapi/schools.go`, dan `internal/httpapi/resources.go`.
Jika dokumen disalin ke repo FE, sinkronkan saat kontrak API backend berubah.

Referensi resmi Supabase (diverifikasi saat penulisan; konfigurasi proyek nyata belum diperiksa):

- Password auth: `https://supabase.com/docs/guides/auth/passwords`
- Signup/session: `https://supabase.com/docs/reference/javascript/auth-signup`
- Auth events: `https://supabase.com/docs/reference/javascript/auth-onauthstatechange`
- Redirect URLs: `https://supabase.com/docs/guides/auth/redirect-urls`
- API keys: `https://supabase.com/docs/guides/getting-started/api-keys`
- Jika FE memakai SSR: `https://supabase.com/docs/guides/auth/server-side`

Undangan staff via magic link belum tersedia. Endpoint members lama langsung memberi akses pada akun terverifikasi,
bukan invitation yang menunggu persetujuan. Jangan mengimplementasikan UI penerimaan undangan berdasarkan endpoint tersebut.
