# Handoff FE: penghapusan requests, gambar, dan promo

Kontrak backend schema v1, diperbarui 14 November 2026. Dokumen ini menyertai revisi kerja yang belum di-commit; setelah perubahan BE di-commit, catat SHA commit tersebut pada PR integrasi FE. Jangan menganggap HEAD sebelum perubahan ini sebagai kontrak v1.

Sumber kontrak payload: [OpenAPI](../internal/httpapi/docs/openapi.json), tersedia melalui `GET /openapi.json` dan UI `/docs`. Flow autentikasi: [frontend-auth.md](frontend-auth.md). Flow operasional: [frontend-sessions.md](frontend-sessions.md).

## Perubahan yang memutus kompatibilitas

Mulai 14 November 2026, base URL API bisnis menjadi `/api/v1`. Ganti base URL client FE, semua URL hardcoded, mock, dan tes FE dari prefix lama ke prefix ini. Route lama tanpa versi tidak disediakan sebagai alias; request terautentikasi ke route lama menghasilkan HTTP 404.

Proxy Vite dan reverse proxy production harus meneruskan `/api/v1/...` ke Go dengan path utuh, tanpa menghapus `/api/v1` atau menambahkannya dua kali. Proxy yang sudah meneruskan seluruh `/api` tanpa rewrite tetap dapat dipakai. `/healthz`, `/readyz`, `/docs`, dan `/openapi.json` tetap berada di root. Versi route API ini terpisah dari versi schema database; tidak membutuhkan migrasi atau reset data.

Semua endpoint bisnis memakai prefix `/api/v1/schools/{school_id}` dan Bearer access token. Perubahan ini tidak mengubah autentikasi, membership, atau aturan tenant.

| Bagian | Kontrak v1 | Perubahan FE |
| --- | --- | --- |
| `/requests` dan `/requests/{id}` | Dihapus; request terautentikasi dengan route valid menghasilkan 404 | Hapus menu, halaman, form, API client, query, cache, mock, dan tipe calon siswa yang hanya dipakai fitur ini |
| `GET /api/v1/schools` dan GET Settings | Tidak memiliki `logo_url` | Hapus properti dan pembacaan logo; gunakan nama sekolah |
| GET mobil, list maupun detail | Tidak memiliki `image_url` | Hapus properti dan pembacaan gambar mobil; gunakan nama/transmisi |
| POST/PATCH paket | `discount_price`, `start_discount`, `end_discount` tidak diterima; HTTP 400 walaupun null | Hapus form promo dan ketiga field dari serializer; jangan mengirim seluruh objek form lama |
| GET paket | Ketiga field promo tidak ada | Hapus badge promo, harga coret, hitungan diskon, dan logika tanggal promo |
| Harga katalog | Tetap `normal_price`, bukan `price` | Pertahankan nama field API; label UI boleh "Harga" |
| Harga pembelian | `student_enrollments.agreed_price` | Tampilkan snapshot pada detail/riwayat pembelian, bukan harga katalog terbaru |

Hapus juga konfigurasi upload/storage yang khusus melayani logo sekolah atau gambar mobil apabila tidak dipakai fitur FE lain. Tidak ada endpoint pengganti untuk requests atau promo pada revisi ini.

## Payload paket dan enrollment

Contoh POST paket:

```json
{
  "name": "Paket Matic",
  "total_sessions": 6,
  "normal_price": 600000,
  "transmission": "Matic",
  "session_duration_minutes": 60,
  "active": true
}
```

`name`, `total_sessions`, `normal_price`, `transmission`, dan `session_duration_minutes` wajib. `description` opsional teks/null; `active` opsional boolean, default true. Harga berupa angka JSON 0-99999999.99, maksimal dua digit pecahan, tanpa eksponen atau string. PATCH boleh parsial, misalnya `{"normal_price":650000}`.

POST paket sukses 201 tanpa body; PATCH sukses 204 tanpa body. Jangan memanggil `response.json()` pada respons kosong; muat ulang katalog setelah berhasil.

Contoh POST enrollment:

```json
{
  "student_id": "22222222-2222-2222-2222-222222222222",
  "package_id": "33333333-3333-3333-3333-333333333333"
}
```

Sukses HTTP 200 berisi JSON string UUID enrollment. Backend menyalin harga, nama, kuota, transmisi, dan durasi dari paket aktif saat pembelian; FE tidak menentukan snapshot. Setelah sukses, muat ulang enrollment.

Contoh: pembelian A dibuat saat `normal_price=600000`, lalu katalog berubah menjadi 650000. `agreed_price` pembelian A tetap 600000; pembelian B setelah perubahan mendapat 650000. Snapshot ini bukan log seluruh perubahan harga dan bukan bukti pembayaran.

Jika harga berubah sejak katalog dimuat FE, backend memakai harga saat enrollment dibuat. Belum ada mekanisme penguncian harga dari preview FE. Tampilkan harga hasil enrollment sebagai nilai tersimpan; jangan menimpa snapshot dengan katalog atau mengirim `agreed_price` untuk memaksa harga lama.

## Checklist integrasi lintas repo

- [ ] Catat commit BE yang memuat kontrak ini pada PR FE; salin/perbarui OpenAPI dan dokumen handoff yang dipakai repo FE.
- [ ] Perbarui tipe, validator respons, serializer request, mock, dan fixture FE; field yang dihapus harus hilang, bukan sekadar nullable.
- [ ] Hapus UI dan request jaringan untuk requests, gambar, serta promo; periksa juga state/form yang dipersistenkan di browser.
- [ ] Uji bootstrap sekolah, Settings, dan daftar mobil saat field gambar tidak ada.
- [ ] Uji create/edit paket tanpa promo dan tangani respons kosong 201/204.
- [ ] Uji harga pembelian lama tetap sama setelah katalog diubah, sedangkan pembelian baru memakai harga baru.
- [ ] Pertahankan penanganan autentikasi/error dan pemisahan cache per akun/sekolah dari handoff sebelumnya.
- [ ] Koordinasikan aktivasi BE dan FE yang kompatibel; FE lama yang mengirim promo akan gagal 400 pada BE v1.

Database v1 disiapkan oleh repo BE. Database development lama yang datanya boleh dibuang membutuhkan reset eksplisit; startup/ensure tidak melakukan upgrade otomatis. Belum ada migrasi preservasi data ke v1. Repo FE tidak perlu menyalin atau menjalankan SQL.

Dokumen ini tidak membuktikan integrasi FE sudah lulus: perubahan kode dan smoke test FE tetap dilakukan di repo FE menggunakan backend v1.
