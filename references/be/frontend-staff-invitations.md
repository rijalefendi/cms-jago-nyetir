# Handoff FE: Undangan Staff

Dokumen ini berdiri sendiri untuk implementasi menu undangan staff. Backend
menyediakan create, list, revoke, inbox penerima, dan accept. Pengiriman email
serta login magic link belum tersedia; jangan menampilkan pesan “email terkirim”.

## Akses dan autentikasi

- Semua endpoint memakai `Authorization: Bearer <access_token pengguna>` dari
  login Supabase Auth. Email akun wajib terverifikasi.
- Data bisnis dibaca/ditulis melalui API Go, bukan langsung ke tabel Supabase.
- Role berasal dari respons `GET /api/v1/schools`, bukan user metadata atau input FE.
- Menu kelola undangan hanya untuk `role: "owner"` dengan `setup_complete: true`.
  Staff tidak boleh mengelola undangan. Sekolah belum lengkap diarahkan ke Settings.
- Satu akun hanya boleh mempunyai satu membership sekolah, termasuk staff.
- Undangan dapat dibuat sebelum penerima punya akun. Penerima harus login/signup
  dengan email yang diundang dan memverifikasi email sebelum konfirmasi.
- Role hasil penerimaan selalu `staff`; tidak ada pilihan role pada form.

## Flow owner

1. Buka menu “Undangan Staff”; ambil daftar beserta riwayat dengan GET collection.
2. Tampilkan form email dan tombol “Buat undangan”. Submit ke POST collection.
3. Setelah 201, muat ulang daftar dan tampilkan “Undangan dibuat”. Jangan menganggap
   penerima sudah menjadi staff atau sudah mendapat email.
4. Tampilkan email, tanggal dibuat, masa berlaku, status, dan aksi pembatalan.
5. Setelah pembatalan berhasil, muat ulang daftar. Riwayat tetap disimpan.
6. Untuk mengundang ulang setelah dibatalkan/kedaluwarsa, POST email yang sama.
   Backend membatalkan row kedaluwarsa sebelumnya secara atomik. Tidak ada endpoint
   resend; pending duplikat masih ditolak 409.

Status diturunkan FE dari field berikut; API tidak memiliki field `status`:

| Kondisi (periksa berurutan) | Label |
| --- | --- |
| `accepted_at !== null` | Diterima |
| `revoked_at !== null` | Dibatalkan |
| `expires_at <= waktu sekarang` | Kedaluwarsa |
| Selain itu | Menunggu konfirmasi |

Timestamp memakai ISO 8601 dengan zona waktu. Parse sebagai timestamp; jangan
membandingkan teks tanggal. Backend tetap menentukan validitas saat menerima.

## Flow penerima

1. Setelah login, panggil `GET /api/v1/schools` dan `GET /api/v1/invitations`.
   Jangan memblokir halaman undangan hanya karena akun belum mempunyai sekolah.
2. Jika schools berupa `[]`, tawarkan undangan yang tersedia sebelum mengarahkan
   pengguna membuat sekolah baru. Membuat sekolah sendiri akan membuat membership
   owner dan menghalangi penerimaan undangan sekolah lain.
3. Tampilkan nama sekolah dan tombol “Terima undangan”. Inbox hanya berisi undangan
   aktif untuk email terverifikasi pengguna, dari sekolah yang setup-nya lengkap.
4. Terima hanya setelah klik konfirmasi pengguna. Jangan menerima otomatis ketika
   login, membuka halaman, atau mendapatkan ID undangan.
5. Setelah accept berhasil, muat ulang `GET /api/v1/schools`, gunakan role `staff`
   dari respons, lalu masuk ke sekolah. Muat ulang inbox untuk menghapus undangan
   yang sudah diterima dari tampilan.
6. Jika inbox gagal dimuat, tampilkan error dan retry; jangan menganggap hasilnya `[]`.

Tidak ada endpoint menolak undangan oleh penerima. Aksi pembatalan hanya untuk owner.
Menu ini mengelola undangan; endpoint daftar/hapus anggota aktif belum tersedia.

## Endpoint

Semua path di bawah sudah mencakup prefix `/api/v1`. Ganti placeholder UUID
dengan ID asli. `school_id` berasal dari sekolah yang dapat diakses pengguna.

| Method | Path | Akses | Respons sukses |
| --- | --- | --- | --- |
| POST | `/api/v1/schools/{school_id}/invitations` | Owner | 201, JSON string UUID undangan |
| GET | `/api/v1/schools/{school_id}/invitations` | Owner | 200, daftar termasuk riwayat |
| DELETE | `/api/v1/schools/{school_id}/invitations/{id}` | Owner | 204, tanpa body |
| GET | `/api/v1/invitations` | Pengguna login, tanpa syarat membership | 200, daftar undangan aktif milik penerima |
| POST | `/api/v1/invitations/{id}/accept` | Penerima dengan email cocok | 200, JSON string UUID sekolah |

Body create, dengan `Content-Type: application/json`:

```json
{"email":"staff@example.com"}
```

Backend melakukan trim/lowercase dan memvalidasi email, maksimum 254 karakter.
Jangan mengirim role, user_id, atau school_id dalam body. Masa berlaku tetap 7 hari;
FE tidak mengatur expiry. DELETE dan accept tidak membutuhkan body.

Contoh respons create (string, bukan `{ "id": ... }`):

```json
"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
```

Contoh row pada kedua endpoint list:

```json
{
  "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "school_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "school_name": "Sekolah Mengemudi",
  "email": "staff@example.com",
  "invited_by": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  "created_at": "2026-11-15T09:00:00Z",
  "expires_at": "2026-11-22T09:00:00Z",
  "accepted_at": null,
  "revoked_at": null
}
```

`accepted_at` dan `revoked_at` berupa string timestamp atau null. Tidak ada nama
pengundang dalam respons; `invited_by` adalah UUID, bukan nama untuk ditampilkan.

## Pagination

Kedua GET list mempunyai kontrak yang sama:

- Tanpa parameter pagination: array row atau `[]`, maksimal 1000 row.
- Dengan `?page=1&page_size=10`: objek `{items,total,page,pageSize}`.
- Jika hanya satu parameter diberikan, parameter lainnya default page 1/page_size 10.
- `page`: 1–1000000; `page_size`: 1–100. Nilai invalid atau berulang menghasilkan 400.
- Urutan `created_at DESC, id DESC`; `total` sesuai scope list owner/penerima.
- Halaman pertama kosong tetap 200; halaman berikutnya yang kosong menghasilkan 416.
- Belum ada filter status/search. FE jangan menganggap filter lokal satu halaman
  mencakup seluruh data sekolah.

Contoh respons paginated kosong:

```json
{"items":[],"total":0,"page":1,"pageSize":10}
```

## Error dan perilaku UI

| HTTP | Penyebab relevan | Penanganan FE |
| --- | --- | --- |
| 400 | Email/JSON/pagination invalid | Tampilkan validasi; pertahankan input |
| 401 | Token tidak ada/tidak valid | Gunakan flow pemulihan sesi/login yang sudah ada |
| 403 | Bukan owner, akses sekolah ditolak, email belum terverifikasi, atau setup belum lengkap | Tampilkan alasan sesuai respons; arahkan verifikasi email/Settings bila sesuai |
| 404 | Undangan tidak ditemukan, email penerima tidak cocok, atau ID/path invalid | Jangan membuka akses; muat ulang daftar |
| 409 saat create | Pending untuk sekolah/email yang sama sudah ada | Muat ulang daftar; jangan membuat duplikat |
| 409 saat accept | Undangan expired/dibatalkan/diterima sebelumnya, atau akun sudah punya membership | Tampilkan alasan; muat ulang inbox dan schools |
| 409 saat revoke | Undangan sudah diterima | Muat ulang riwayat; pembatalan tidak mencabut membership |
| 410 | Memakai `POST .../members` lama | Ganti pemanggilan ke flow invitations |
| 416 | Halaman lanjutan tidak mempunyai hasil | Kembali ke halaman sebelumnya/pertama |
| 502/503 | Gangguan dependency/database | Tampilkan retry; jangan logout otomatis |

Error dapat berbentuk `{"error":"..."}` atau
`{"code":"...","message":"...","details":null,"hint":null}`.
Ambil pesan dari `message`, lalu `error`, dengan fallback pesan umum. Untuk error
database, 409 memakai code SQLSTATE `23505`, 404 memakai `P0002`; code tersebut
tidak membedakan semua penyebab, jadi jangan memetakan seluruh 409 menjadi duplikat.
Error setup pada boundary sekolah dapat memakai `code: "school_setup_required"`;
email belum terverifikasi memakai `code: "verified_email_required"`.

Nonaktifkan tombol selama request berlangsung. Pembatalan ulang aman (204).
Accept ulang menghasilkan 409; pada timeout, muat ulang schools/inbox sebelum
menawarkan retry karena request pertama mungkin sudah berhasil.

## Prasyarat dan batas saat ini

- Backend harus sudah menerapkan migrasi `db/migrations/20261115_school_invitations.sql`
  pada database lama; startup tidak memigrasikan otomatis. Ini tugas backend/admin,
  bukan SQL yang dijalankan dari FE.
- Akun baru maupun akun yang sudah ada bisa menerima selama belum punya membership.
- Undangan hanya menyimpan email dan menunggu konfirmasi; tidak membuat akun Auth.
- Pengiriman email, tombol kirim ulang email, dan integrasi magic link belum dibuat.
  Untuk tahap ini, penerima login lewat flow yang sudah ada dan membuka inbox undangan.
- Semua request bisnis memakai backend Go; jangan mengakses tabel `school_invitations`
  langsung, memakai service-role key, atau mengganti konfirmasi dengan insert membership.
