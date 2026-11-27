# Handoff FE: siswa, pembelian paket, dan kalender

Terakhir diperbarui pada 24 November 2026. Jika disalin ke repo FE, catat commit BE acuannya.
Semua endpoint memerlukan `Authorization: Bearer <access_token>` dan membership sekolah dengan setup lengkap. Owner dan staff sama-sama boleh mengelola operasional.
`school_id` berasal dari URL, bukan body. Zona waktu jadwal adalah `Asia/Makassar`; tanggal/jam merupakan waktu lokal sekolah, bukan UTC.

Perubahan kontrak schema v1 dan checklist lintas repo: [frontend-integration.md](frontend-integration.md).

## Urutan flow operasional

Selesaikan bootstrap/setup pada [frontend-auth.md](frontend-auth.md) sebelum membuka fitur ini.
Semua path singkat di bawah diawali `/api/v1/schools/{school_id}`.

1. Siapkan katalog paket, instruktur, dan mobil. Satu paket hanya satu transmisi, dengan jumlah pertemuan dan durasi tetap per pertemuan.
2. Pilih siswa yang sudah ada atau buat siswa melalui `POST /students` dengan `name` wajib, `phone` opsional teks/null. Sukses HTTP 201 dengan JSON string UUID; ambil ID menggunakan `response.json()`.
3. Pilih paket aktif dan buat pembelian melalui `POST /student_enrollments`, hanya kirim `student_id` dan `package_id`. Sukses HTTP 200 berupa JSON string UUID enrollment.
4. Muat enrollment siswa. Tampilkan snapshot nama paket, harga, kuota, transmisi, dan durasi yang diberikan backend. Pembelian tambahan membuat enrollment baru untuk siswa yang sama, termasuk jika ingin belajar transmisi lain.
5. Pilih enrollment berstatus `Aktif`, lalu instruktur dan mobil aktif yang kompatibel. Hitung jam selesai dari durasi snapshot enrollment; kirim detail sesi lengkap.
6. Setelah simpan/edit/batal, muat ulang kalender dan data yang dipakai untuk menampilkan kuota. Backend tetap menentukan apakah jadwal bisa disimpan.

Enrollment bukan pembayaran: respons enrollment tidak membuktikan pembayaran sudah diterima. Tidak ada endpoint pembayaran dalam kontrak ini.

## Daftar untuk form dan pemilihan resource

| Kebutuhan | Request | Bentuk respons |
| --- | --- | --- |
| Cari siswa | `GET /students?search=Ayu&page=1&page_size=10` | `{items,total,page,pageSize}` |
| Katalog paket | `GET /packages` | Array; pilih `active=true` di FE karena filter active belum didukung endpoint ini |
| Enrollment aktif milik siswa | `GET /student_enrollments?student_id={uuid}&status=Aktif` | Array snapshot enrollment |
| Instruktur kompatibel | `GET /instructors?active=true&transmission=Matic` | Array, termasuk instruktur `Matic & Manual` |
| Mobil kompatibel | `GET /vehicles?active=true&transmission=Matic` | Array |

- Pencarian siswa berupa substring nama literal, tidak peka kapital, maksimal 100 karakter setelah trim; urutan `name ASC, id ASC`.
- Siswa tanpa `page` dan `page_size` menghasilkan array. Salah satu parameter mengaktifkan pagination, default page 1/page_size 10; batas page 1–1000000, page_size 1–100.
- Pagination instruktur aktif hanya jika `page` diberikan (`page_size` saja tidak cukup), default page_size 10. `search` mencari nama/notes; `sort=name|transmission|status`, `direction=asc|desc`.
- Filter equipment menerima `active=true|false`, `transmission=Matic|Manual`; filter bukan jaminan slot tersedia.
- Enrollment menerima status `Aktif`, `Selesai`, `Dibatalkan`. Tanpa `page`/`page_size` respons tetap array maksimal 1000. Salah satu parameter mengaktifkan `{items,total,page,pageSize}`, default page 1/page_size 10, batas page 1–1000000/page_size 1–100, urutan `id ASC`. Status bisa dibaca/difilter, tetapi belum ada endpoint untuk mengubahnya.
- Array dibatasi backend (1000 record); jangan menganggapnya selalu seluruh data. Paket/mobil belum punya pagination. Query yang tidak didukung tidak diteruskan ke data service.
- Respons mobil tidak memiliki `image_url`; hapus gambar mobil dari tipe dan tampilan FE.
- Detail resource melalui `GET /{resource}/{id}` menghasilkan array satu objek jika ditemukan; ID yang tidak ditemukan menghasilkan HTTP 404. List kosong tetap `[]`.

## List kalender

```http
GET /api/v1/schools/{school_id}/sessions?date_from=2026-11-10&date_to=2026-11-16&page=1&page_size=100
```

- Untuk kalender, `date_from` dan `date_to` wajib, format `YYYY-MM-DD`, tanggal valid, urutan tidak terbalik. Khusus riwayat siswa dengan `student_id` valid, hilangkan kedua tanggal untuk membaca seluruh tanggal (lihat bagian progres di bawah).
- Rentang maksimal 31 hari inklusif; kedua batas termasuk hasil.
- Opsional: `student_id`, `instructor_id`, `vehicle_id`, masing-masing UUID.
- `page` default 1, rentang 1-1000000. `page_size` default 100, rentang 1-100.
- Urutan tetap: `session_date ASC, start_time ASC, id ASC`.
- Filter sekolah selalu ditentukan backend. Parameter query lain tidak diteruskan menjadi filter SQL.

Respons HTTP 200:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 100
}
```

`items` berisi objek sesi dengan kolom `id`, `school_id`, `student_id`, `enrollment_id`, `instructor_id`, `vehicle_id`,
`session_date`, `start_time`, `end_time`, `transmission`, dan `status`.
`total` adalah jumlah hasil setelah filter, sebelum pagination. Ambil halaman berikutnya jika masih ada hasil; jangan menganggap halaman pertama memuat seluruh jadwal.
Pagination mengikuti batas hasil backend (1000 record tanpa pagination). Jangan mengubah jadwal menjadi kosong saat request gagal.
Halaman di luar hasil dapat ditolak upstream dengan 416; saat filter berubah, reset `page` ke 1.

List selalu berupa objek pagination. Tanggal wajib untuk kalender; riwayat per siswa boleh tanpa kedua tanggal.

## Detail

Error database yang bukan pesan bisnis dikenal mengembalikan pesan generik `Database request failed`. Field `details` dan `hint` bernilai null; jangan menampilkan atau mengandalkan detail PostgreSQL.

Pada POST enrollment, kirim header opsional `Idempotency-Key` berisi UUID. Simpan key yang sama untuk retry dengan siswa dan paket yang sama, dan buat UUID baru untuk setiap pembelian baru. Penggunaan key yang sama untuk input berbeda menghasilkan 409 `idempotency_key_conflict`. Key disimpan selama enrollment ada. Klien lama tanpa header belum terlindungi dari pembelian ganda saat retry.

`GET /api/v1/schools/{school_id}/sessions/{session_id}` tidak membutuhkan rentang tanggal.
Respons HTTP 200 berupa array satu objek; jika sesi tidak ditemukan pada sekolah tersebut, respons HTTP 404.

## Create dan update

- `POST /api/v1/schools/{school_id}/sessions`
- `PATCH /api/v1/schools/{school_id}/sessions/{session_id}`

Body JSON lengkap untuk create dan update biasa:

```json
{
  "student_id": "22222222-2222-2222-2222-222222222222",
  "enrollment_id": "33333333-3333-3333-3333-333333333333",
  "instructor_id": "44444444-4444-4444-4444-444444444444",
  "vehicle_id": "55555555-5555-5555-5555-555555555555",
  "session_date": "2026-11-10",
  "start_time": "09:00",
  "end_time": "10:00",
  "transmission": "Matic",
  "status": "Terkonfirmasi"
}
```

- Keempat ID wajib UUID. Backend/SQL memeriksa hubungan antarresource dan akses sekolah.
- Jam menerima `HH:MM` atau `HH:MM:SS`, start < end pada hari yang sama; tidak menerima `24:00`.
- Transmisi: `Matic` atau `Manual`, harus sama dengan snapshot enrollment dan mobil; instruktur harus kompatibel.
- Selisih jam wajib tepat `session_duration_minutes` snapshot enrollment, termasuk detik. Gunakan snapshot pembelian, bukan katalog terbaru.
- Status: `Menunggu konfirmasi`, `Terkonfirmasi`, `Selesai`, `Dibatalkan`, `Tidak hadir`.
- POST sesi menerima header opsional `Idempotency-Key` UUID. Simpan key dan input awal yang sama untuk retry, bahkan jika sesi kemudian diubah atau dibatalkan; backend mengembalikan UUID awal. Buat key baru untuk sesi baru. Key yang sama dengan input berbeda menghasilkan 409 `idempotency_key_conflict`. Key bertahan selama sesi ada; POST tanpa key tidak terlindungi.
- Update hanya boleh jika status tersimpan masih `Menunggu konfirmasi` atau `Terkonfirmasi`.
  Setelah `Selesai`, `Dibatalkan`, atau `Tidak hadir`, seluruh data sesi terkunci
  bagi owner maupun staff, termasuk request dengan data/status yang sama.
  Ini berlaku untuk tanggal, jam, siswa/enrollment, transmisi dan pilihan mobil/instruktur
  pada sesi; bukan pengeditan master mobil/instruktur.
- PATCH biasa bukan partial update: kirim seluruh detail di atas, termasuk saat mengubah status menjadi Selesai/Tidak hadir.
- Jangan mengirim identitas/tenant dari body. Backend mengabaikan field ekstra dan hanya membentuk parameter RPC dari field yang didukung.
- Tidak ada DELETE; gunakan pembatalan.

Khusus pembatalan sesi yang sudah ada, PATCH cukup:

```json
{ "status": "Dibatalkan" }
```

Detail jadwal lain diabaikan pada pembatalan. Backend mengirim null untuk parameter RPC yang tidak dipakai, dan SQL hanya mengubah status.
Pembatalan tidak memvalidasi ulang jam/transmisi historis tetapi tetap membutuhkan akses sekolah dan setup lengkap.
Pembatalan juga hanya boleh dari status tersimpan Menunggu konfirmasi/Terkonfirmasi.

Respons sukses create/update/pembatalan: HTTP 200, JSON string UUID sesi, bukan objek sesi.
Setelah sukses, muat ulang kalender pada rentang aktif. Retry otomatis POST hanya aman jika memakai key dan input awal yang sama. Key ini tidak melindungi PATCH; setelah koneksi putus, muat ulang sesi sebelum mengambil tindakan.

## Validasi dan error

- 400: payload/UUID/tanggal/jam/status/transmisi atau parameter kalender tidak valid.
- 401: autentikasi tidak tersedia/ditolak; gangguan layanan Auth menghasilkan 502.
- 403: akses sekolah ditolak atau `code: "school_setup_required"`; jangan logout otomatis.
- 405: method/path tidak didukung.
- 409 `code: "schedule_conflict"`: jadwal siswa/instruktur/mobil bentrok.
- 409 `code: "session_allowance_exhausted"`: kuota sesi enrollment habis.
- 409 `code: "session_status_locked"`: sesi sudah final; jangan ulangi request tulis.
  Tampilkan pesan, muat ulang detail/kalender serta progres enrollment, lalu jadikan sesi read-only.
  FE harus tetap menangani error ini jika status berubah setelah form dibuka.
- 400 `code: "outside_operating_hours"`: sesi di luar jam buka.
- PUT Settings juga mengembalikan 409 `code: "operating_hours_conflict"` jika perubahan jam tidak cocok dengan sesi mendatang.
- 400 `code: "enrollment_transmission_mismatch"`: transmisi berbeda dari snapshot pembelian.
- 400 `code: "enrollment_duration_mismatch"`: durasi berbeda dari snapshot pembelian.
- Error bisnis tersebut berbentuk `{"code":"...","message":"..."}`. Error SQL lainnya tetap dipetakan sesuai kontrak HTTP; baca `message` selain `error`.
- 502: koneksi data gagal atau respons kalender/count tidak valid; tampilkan retry, bukan kalender kosong.

Aturan transaksi, kuota, resource aktif/kompatibel, jam operasional, dan konflik tetap dijaga `save_school_session` dan trigger SQL.
Gunakan schema terbaru pada database baru. ensure tidak memigrasikan schema lama; perubahan ini menambah field wajib paket/enrollment. Jangan reset database berisi data nyata.

## Checklist

- [ ] Edit detail, ubah status dan batalkan hanya tersedia untuk status Menunggu konfirmasi/Terkonfirmasi; tiga status final read-only.
- [ ] Tangani 409 `session_status_locked` dengan muat ulang data tanpa retry otomatis.
- [ ] Siswa lama dipakai ulang untuk pembelian tambahan; POST siswa/paket menangani HTTP 201 dengan JSON string UUID.
- [ ] Enrollment dibuat hanya dari ID siswa/paket dan responsnya dibaca sebagai string UUID.
- [ ] Form jadwal memakai transmisi/durasi snapshot, bukan katalog terbaru; resource difilter aktif/kompatibel.
- [ ] Tidak ada aksi edit/status enrollment; PATCH enrollment ditolak HTTP 405.
- [ ] Rentang tanggal wajib, tanggal valid, maksimal 31 hari; tes batas awal/akhir bulan.
- [ ] Filter siswa/instruktur/mobil dan pagination tidak mencampurkan sekolah.
- [ ] Muat seluruh halaman yang diperlukan sebelum menyimpulkan slot kosong.
- [ ] Update biasa mengirim detail lengkap; cancel mengirim status saja.
- [ ] Error konflik mempertahankan input; error jaringan tidak mengosongkan kalender.
- [ ] Sukses create/update/cancel memuat ulang rentang aktif.


## Katalog paket dan snapshot pembelian

POST `/api/v1/schools/{school_id}/packages` sekarang wajib menyertakan `name`, `total_sessions`,
`normal_price` (angka JSON 0–99999999.99, maksimal dua digit pecahan, tanpa eksponen),
`transmission` (`Manual`/`Matic`), dan `session_duration_minutes` (integer 1–1439).
GET paket mengembalikan field tersebut plus `id`, `school_id`, `description`, dan `active`.
PATCH paket boleh parsial; harga tetap memakai nama field `normal_price`.
Kolom `discount_price`, `start_discount`, dan `end_discount` sudah dihapus dari request/response.
Mengirim field promo pada POST/PATCH menghasilkan HTTP 400, termasuk jika nilainya null.
POST `/api/v1/schools/{school_id}/student_enrollments` hanya membutuhkan `student_id` dan `package_id`.
GET enrollment mengembalikan snapshot `package_name`, `total_sessions`, `agreed_price`,
`transmission`, dan `session_duration_minutes`. Saat pembelian, backend menyalin `normal_price`
paket saat itu menjadi `agreed_price`. Snapshot/tenant kiriman klien diabaikan.
Perubahan katalog tidak mengubah enrollment lama. Pembelian tambahan memakai siswa yang sama dengan
enrollment baru. Hak enrollment tidak dapat diubah melalui endpoint update.
Sesi sekarang memakai transmisi/durasi snapshot. Edit katalog tidak mengubah aturan kalender untuk enrollment lama.

POST paket sukses HTTP 201 dengan JSON string UUID; PATCH `/packages/{id}` sukses HTTP 204 tanpa body. Muat ulang katalog setelah sukses.
Tidak ada DELETE paket/siswa/enrollment; nonaktifkan paket dengan PATCH `{"active":false}` jika tidak dijual lagi.
PATCH enrollment, termasuk pengubahan status, ditolak langsung oleh API dengan HTTP 405; jangan menyediakan aksi tersebut di FE.

## Kuota dan batas flow saat ini

- Sesi `Menunggu konfirmasi`, `Terkonfirmasi`, dan `Selesai` dihitung terhadap kuota snapshot. `Dibatalkan` dan `Tidak hadir` tidak dihitung; ini perilaku backend saat ini.
- Jangan menyimpulkan kuota tersisa dari satu halaman kalender. GET enrollment sekarang menyediakan agregat seluruh tanggal per pembelian; penyimpanan tetap dapat ditolak `session_allowance_exhausted` jika kuota berubah setelah pembacaan.
- Pembatalan hanya mengecualikan validasi historis pada sesi yang sudah ada. POST berstatus Dibatalkan tetap membutuhkan detail lengkap.
- Error `P0002` pada penulisan RPC menghasilkan HTTP 404: siswa pembelian, sesi yang diubah/dibatalkan, atau akun staff tidak ditemukan. GET detail juga menghasilkan HTTP 404 bila tidak ditemukan. Pertahankan fallback `message`/`error` untuk error SQL lain.

## Perubahan yang perlu diperiksa pada FE lama

| Asumsi lama | Kontrak sekarang |
| --- | --- |
| Kalender berupa array tanpa rentang | Tanggal wajib, maksimal 31 hari, respons pagination |
| Paket cukup nama dan jumlah sesi | Harga `normal_price`, transmisi, dan durasi wajib; field promo sudah dihapus |
| Ketentuan jadwal dibaca dari katalog terbaru | Gunakan snapshot enrollment saat pembelian |
| FE menentukan harga/kuota enrollment | Kirim dua ID; backend menyalin harga katalog saat pembelian menjadi snapshot |
| PATCH sesi selalu parsial | Detail lengkap, kecuali pembatalan sesi yang sudah ada |
| Enrollment bisa diedit/status diubah | PATCH ditolak HTTP 405 |

Referensi payload lengkap: `internal/httpapi/docs/openapi.json` (`/openapi.json`, UI `/docs`). Dokumen ini menjelaskan flow; SQL tetap dikelola repo BE.

Penguncian seluruh update tersedia pada schema terbaru. Database yang sudah ada
perlu diperiksa dan diperbarui secara eksplisit oleh pengelola BE; startup tidak
memperbarui schema otomatis. Pastikan database target sudah diperbarui sebelum
menyatakan penguncian server terverifikasi.

## Progres lengkap dan riwayat per siswa (14 November 2026)

Semua path berikut diawali `/api/v1/schools/{school_id}`. Perubahan hanya pada pembacaan; tidak membutuhkan migrasi/reset database.

Untuk progres, gunakan:

```http
GET /student_enrollments?student_id={uuid}&page=1&page_size=100
```

Setiap enrollment, termasuk GET detail, memiliki enam field baru yang dihitung database dari seluruh sesi pembelian itu, tanpa batas tanggal atau halaman kalender:

| Field | Makna |
| --- | --- |
| `completed_sessions` | Sesi berstatus Selesai |
| `scheduled_sessions` | Menunggu konfirmasi + Terkonfirmasi, termasuk sesi lama yang statusnya belum diperbarui |
| `used_sessions` | completed_sessions + scheduled_sessions; kuota terpakai/direservasi |
| `remaining_sessions` | total_sessions - used_sessions |
| `cancelled_sessions` | Sesi Dibatalkan, tidak memakai kuota |
| `missed_sessions` | Sesi Tidak hadir, tidak memakai kuota |

Contoh pada enrollment dengan `total_sessions: 5`:

```json
{
  "completed_sessions": 1,
  "scheduled_sessions": 2,
  "used_sessions": 3,
  "remaining_sessions": 2,
  "cancelled_sessions": 1,
  "missed_sessions": 1
}
```

Untuk total progres murid lintas pembelian, muat semua halaman enrollment tanpa filter `status`, lalu jumlahkan `completed_sessions` dan `total_sessions`. Persentase selesai = completed / total × 100; jika total 0 tampilkan 0. Sisa kuota operasional hanya bisa dipakai dari enrollment berstatus Aktif. Angka sisa tidak otomatis mengaktifkan pembelian yang sudah Selesai/Dibatalkan. Harga dan durasi tetap snapshot pembelian.

Untuk seluruh riwayat, gunakan:

```http
GET /sessions?student_id={uuid}&page=1&page_size=100
```

Hilangkan `date_from` dan `date_to` sepenuhnya, bukan kirim string kosong. Respons tetap `{items,total,page,pageSize}`, mencakup semua status dan sesi mendatang, urutan `session_date ASC,start_time ASC,id ASC`. Lanjutkan halaman sampai seluruh `total` terbaca. Siswa yang tidak memiliki sesi atau ID siswa sekolah lain pada route sekolah sendiri menghasilkan halaman kosong. Akses route sekolah lain tetap 403. Halaman di luar hasil menghasilkan 416.

Jika salah satu tanggal dikirim, kedua tanggal wajib valid dan batas 31 hari tetap berlaku. Kalender umum tanpa siswa tetap wajib tanggal. `total` riwayat adalah jumlah record sesi, bukan jumlah sesi selesai atau kuota terpakai.

Setelah create/update/cancel sesi, muat ulang progres enrollment dan halaman riwayat/kalender yang sedang ditampilkan. Respons adalah snapshot saat query; validasi saat penyimpanan tetap menjadi keputusan akhir untuk kuota dan konflik.


## Beranda

`GET /api/v1/schools/{school_id}/home` memakai Bearer access token dan memerlukan membership serta setup sekolah lengkap. Tidak memerlukan parameter tanggal atau pagination.

```json
{
  "date": "2026-11-14",
  "today_count": 2,
  "pending_count": 1,
  "overdue_count": 0,
  "today_sessions": [{"id": "uuid", "student_id": "uuid", "student_name": "Ayu", "session_date": "2026-11-14", "start_time": "09:00:00", "end_time": "10:00:00", "status": "Menunggu konfirmasi"}],
  "overdue_sessions": []
}
```

Contoh menunjukkan bentuk respons; hitungan `overdue_count` akan sama dengan jumlah `overdue_sessions`. `date` dan batas waktu ditentukan server dalam Asia/Makassar. `today_sessions` memuat semua status hari ini, `pending_count` menghitung status Menunggu konfirmasi hari ini. `overdue_sessions` hanya status Menunggu konfirmasi atau Terkonfirmasi pada 30 hari sebelumnya sampai hari ini; untuk hari ini, `end_time` harus sudah lewat. Array kosong berupa `[]`. Kedua daftar diurutkan berdasarkan tanggal, jam mulai, lalu ID; sesi hari ini yang lewat muncul di kedua daftar. Nama siswa dan semua hitungan dibaca dalam satu snapshot. Muat ulang untuk mendapatkan perubahan terbaru.
