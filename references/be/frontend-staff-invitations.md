# Undangan staff melalui Supabase Auth Admin

Owner POST `/api/v1/schools/{school_id}/invitations` dengan `{"email":"staff@example.com"}`. Respons 201 tetap berupa string UUID undangan. Supabase mengirim email undangan akun baru; 201 hanya menjamin request diterima, bukan email diterima di inbox.

## Konfigurasi backend dan Supabase

Isi `SUPABASE_SECRET_KEY` khusus backend dan `SUPABASE_INVITE_REDIRECT_URL` dengan URL callback frontend, misalnya `http://localhost:5173/auth/invitation`. Keduanya wajib diisi bersamaan; bila kosong fitur create mengembalikan 503, endpoint lain tetap berjalan. Tambahkan URL callback beserta query `invitation_id` pada allowlist redirect Supabase. Gunakan allowlist sesuai origin/path deployment, bukan wildcard global. Untuk pengiriman ke pengguna umum, konfigurasi SMTP di Supabase diperlukan.

## Callback frontend

1. Supabase memverifikasi token email dan mengembalikan sesi sesuai flow Auth frontend. Frontend menangani sesi Supabase dan membaca `invitation_id` dari URL callback.
2. Tampilkan form setup password dan simpan melalui Supabase Auth. Jangan mengirim password atau token email Supabase ke API bisnis.
3. Setelah sesi dan password siap, POST `/api/v1/invitations/{id}/accept` tanpa body, dengan `Authorization: Bearer <access_token>` Supabase.
4. Respons 200 berupa string school_id; muat ulang GET `/api/v1/schools` sebelum masuk halaman sekolah. ID atau role dari callback tidak menjadi sumber otorisasi.

Membuka link dan membuat akun tidak langsung memberi membership. Email terverifikasi harus cocok dengan undangan; transaksi SQL menjaga expiry, pembatalan, penerimaan sekali saja dan satu membership per akun. Penerimaan ulang menghasilkan 409. Setup password ditangani frontend/Supabase; backend tidak mengetahui apakah password telah dipasang.

## Daftar dan pembatalan

GET collection sekolah tetap tersedia bagi owner, mendukung pagination yang didokumentasikan OpenAPI. DELETE `/api/v1/schools/{school_id}/invitations/{id}` membatalkan akses sekolah, tidak membatalkan akun atau token Auth global Supabase. GET `/api/v1/invitations` ditutup dengan 410; tidak ada halaman inbox penerima lagi. RPC daftar dengan school_id null juga ditolak.

## Kegagalan dan batas saat ini

- 503 `invitation_delivery_not_configured`: perbaiki konfigurasi backend.
- 409 `account_already_registered`: email sudah mempunyai akun Supabase; alur undangan akun ini belum mendukung pengguna terkonfirmasi. Jangan meminta pengguna menghapus akun atau membuat akun duplikat. Belum ada fallback magic link.
- 502 `invitation_delivery_failed`: respons berisi invitation_id. Backend mencoba revoke undangan lokal; periksa riwayat owner dan batalkan jika masih aktif sebelum membuat undangan lagi. Timeout bisa berarti email/akun Auth sudah dibuat. Jangan menghapus akun sebagai kompensasi.
- Undangan membership lokal berlaku tujuh hari; masa berlaku token email mengikuti konfigurasi Supabase dan bisa lebih pendek.

Secret hanya berada di backend, tidak di bundle FE atau log. FE tetap memakai public/anon key. Akun terverifikasi tanpa membership tidak boleh otomatis membuat sekolah pada callback undangan.

## Database lama dan pengujian

Terapkan `db/migrations/20261117_remove_school_staff.sql` pada database bisnis PostgreSQL, bukan Supabase SQL Editor. Migrasi sekarang juga memperbarui daftar owner agar hanya kolom publik yang keluar dan menutup jalur inbox SQL. Tidak menghapus row undangan lama; undangan lama tetap dibatasi email, expiry dan status bila ID-nya digunakan untuk konfirmasi.

Jalankan `scripts/test.ps1` untuk suite lokal dengan Auth Admin tiruan dan database tes terpisah. Pengiriman email nyata dan callback FE memerlukan uji tersendiri setelah konfigurasi diisi.
