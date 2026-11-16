# Email Auth: Resend dan Supabase

Panduan ini menjelaskan konfigurasi email autentikasi menggunakan domain sendiri, Resend, dan Supabase Auth. Contoh `auth.example.com` dan `noreply@auth.example.com` harus diganti dengan domain milik sendiri.

## Cara kerja

Supabase Auth tetap mengelola akun, password, sesi, dan tautan verifikasi atau pemulihan. Resend mengirim email tersebut melalui SMTP. Login dengan email dan password tidak mengirim email. Tidak perlu menambahkan kode pengiriman email di frontend atau backend.

Jika custom SMTP belum dikonfigurasi, Supabase menggunakan layanan email bawaan untuk pengujian: hanya mengirim ke alamat anggota organisasi proyek, dengan batas 2 email per jam untuk seluruh proyek. Periksa konfigurasi proyek untuk memastikan layanan yang sedang digunakan.

## Integrasi domain, Resend, dan Supabase

1. **Siapkan domain dan DNS.** Pastikan memiliki akses ke pengelola DNS domain. Pilih domain atau subdomain pengirim, misalnya `auth.example.com`.
2. **Tambahkan domain di Resend.** Di dashboard Resend, tambahkan domain pengirim. Salin semua record DNS yang ditampilkan Resend, termasuk record SPF dan DKIM, ke penyedia DNS. Jangan menebak nilai record atau menghapus record yang sudah digunakan layanan lain. Tambahkan DMARC sesuai konfigurasi domain dan panduan penyedia.
3. **Verifikasi domain.** Tunggu propagasi DNS dan pastikan status domain di Resend sudah terverifikasi. Gunakan alamat pengirim pada domain yang diverifikasi, misalnya `noreply@auth.example.com`.
4. **Buat API key Resend.** Buat key untuk pengiriman email, batasi aksesnya sesuai kebutuhan jika tersedia, dan simpan dengan aman. Jangan memasukkannya ke source code, variabel frontend, atau Git.
5. **Konfigurasi SMTP di Supabase.** Buka proyek Supabase → Authentication → Emails → SMTP Settings, aktifkan custom SMTP, lalu isi:
   - Sender email: alamat pada domain terverifikasi; sender name: `AturSetir`.
   - Host: `smtp.resend.com`; port: `465` (SSL).
   - Username: `resend`; password: API key Resend.
6. **Periksa URL Auth.** Di Authentication → URL Configuration, pastikan Site URL dan Redirect URLs mencakup alamat aplikasi yang benar. Alur aplikasi ini memakai `/auth/callback` untuk konfirmasi dan `/lupa-password?reset=1` untuk pemulihan. Pastikan tujuan redirect yang digunakan diizinkan dan uji di lingkungan yang sesuai. Domain pengirim email tidak otomatis mengubah domain tautan Supabase Auth.
7. **Periksa template dan limit.** Pastikan template konfirmasi dan reset menggunakan tautan Supabase yang sesuai. Periksa Authentication → Rate Limits serta kuota dan batas akun Resend. Hindari link tracking jika mengubah tautan autentikasi.
8. **Uji dari awal sampai selesai.** Daftarkan akun uji dengan email yang dapat diakses, buka tautan verifikasi, lalu login. Minta reset password, buka tautannya, simpan password baru, dan login kembali. Uji juga tautan kedaluwarsa dan respons ketika limit tercapai. Periksa inbox/spam, log Supabase Auth, dan status pengiriman Resend jika gagal.

## Rate limit dan keamanan

Nilai berikut adalah default dokumentasi, bukan pembacaan konfigurasi proyek ini. Periksa kembali di dashboard karena konfigurasi dan kebijakan dapat berubah.

| Batas | Default | Cakupan |
| --- | --- | --- |
| Email dengan SMTP bawaan | 2 per jam | Seluruh proyek; penerima terbatas pada anggota organisasi |
| Email dengan custom SMTP | 30 per jam awalnya; dapat diubah | Seluruh proyek; kuota dan batas Resend juga berlaku |
| Permintaan email konfirmasi atau reset | Jeda 60 detik | Per pengguna, untuk masing-masing jenis permintaan |
| Signup dan recovery | 30 request per 5 menit | Per IP, dengan toleransi lonjakan |
| Endpoint token, termasuk login password | 150 request per 5 menit | Per IP, dengan toleransi lonjakan |

Supabase mengembalikan HTTP 429 saat rate limit terlampaui. Batas Supabase dan Resend berlaku bersamaan; menaikkan salah satunya tidak menaikkan batas yang lain. Paket Free Supabase mencakup custom SMTP dan 50.000 monthly active users; angka MAU bukan kuota email. Periksa paket Resend untuk kuota dan biaya terkini.

Pertahankan verifikasi email, pesan reset yang tidak mengungkap keberadaan akun, dan penanganan 429 yang jelas. Pembatasan di frontend membantu pengalaman pengguna, tetapi tidak menggantikan rate limit Supabase. Backend tetap harus memverifikasi token dan hak akses untuk data sekolah. Pertimbangkan CAPTCHA jika ada penyalahgunaan; jangan menambahkannya tanpa kebutuhan yang jelas.

## Referensi

- [Supabase: custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase: harga dan paket](https://supabase.com/pricing)
- [Resend: konfigurasi SMTP](https://resend.com/changelog/smtp-service)
- [Resend: autentikasi domain dan deliverability](https://resend.com/guides/email/deliverability/why-emails-go-to-spam)
