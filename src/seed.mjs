const isoDay = (d = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export { isoDay };
const moveDay = (day, delta) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0, 10); };

export function seed() {
  const t = isoDay();
  return {
    leads: [
      { id: 'L1', name: 'Dinda Maharani', phone: '', interest: 'Matic · Pemanasan', time: 'Pagi', status: 'Baru', source: 'WhatsApp (manual)', date: t, notes: 'Ingin mulai dari dasar.' },
      { id: 'L2', name: 'Andi Pratama', phone: '', interest: 'Manual', time: 'Sore', status: 'Baru', source: 'Input admin', date: t, notes: '' },
      { id: 'L3', name: 'Nadia Putri', phone: '', interest: 'Matic · Makin Lancar', time: 'Akhir pekan', status: 'Dihubungi', source: 'WhatsApp (manual)', date: moveDay(t, -1), notes: 'Preferensi instruktur perempuan, sesuai ketersediaan.' },
      { id: 'L4', name: 'Reza Firdaus', phone: '', interest: 'Kombinasi', time: 'Malam', status: 'Menunggu keputusan', source: 'Input admin', date: moveDay(t, -1), notes: '' },
      { id: 'L5', name: 'Siti Aulia', phone: '', interest: 'Matic', time: 'Siang', status: 'Dikonversi', source: 'WhatsApp (manual)', date: moveDay(t, -2), notes: '' },
      { id: 'L6', name: 'Fajar Hidayat', phone: '', interest: 'Manual', time: 'Pagi', status: 'Tidak lanjut', source: 'Input admin', date: moveDay(t, -3), notes: '' }
    ],
    students: [
      { id: 'S1', name: 'Alya Ramadhani', phone: '', packageId: 'P2', package: 'Makin Lancar · Matic', done: 3, total: 8, status: 'Aktif' },
      { id: 'S2', name: 'Bima Saputra', phone: '', packageId: 'P1', package: 'Pemanasan · Manual', done: 1, total: 4, status: 'Aktif' },
      { id: 'S3', name: 'Nabila Zahra', phone: '', packageId: 'P3', package: 'Siap Jalan · Matic', done: 7, total: 12, status: 'Aktif' },
      { id: 'S4', name: 'Rizky Firmansyah', phone: '', packageId: 'P2', package: 'Makin Lancar · Manual', done: 5, total: 8, status: 'Aktif' },
      { id: 'S5', name: 'Putri Ananda', phone: '', packageId: 'P1', package: 'Pemanasan · Matic', done: 4, total: 4, status: 'Selesai' },
      { id: 'S6', name: 'Siti Aulia', phone: '', packageId: 'P1', package: 'Pemanasan · Matic', done: 0, total: 4, status: 'Aktif' }
    ],
    packages: [
      { id: 'P1', name: 'Pemanasan', description: 'Simulasi paket untuk peserta yang baru mulai belajar.', normal_price: 400000, discount_price: null, start_discount: null, end_discount: null, total_sessions: 4, active: true },
      { id: 'P2', name: 'Makin Lancar', description: 'Simulasi paket untuk latihan bertahap dan konsisten.', normal_price: 800000, discount_price: null, start_discount: null, end_discount: null, total_sessions: 8, active: true },
      { id: 'P3', name: 'Siap Jalan', description: 'Simulasi paket untuk latihan dengan sesi lebih banyak.', normal_price: 1200000, discount_price: null, start_discount: null, end_discount: null, total_sessions: 12, active: true }
    ],
    instructors: [
      { id: 'I1', name: 'Instruktur A', skills: 'Matic & Manual', active: true, notes: 'Identitas dan jadwal belum diverifikasi' },
      { id: 'I2', name: 'Instruktur B', skills: 'Matic', active: true, notes: 'Identitas dan jadwal belum diverifikasi' },
      { id: 'I3', name: 'Instruktur C', skills: 'Manual', active: true, notes: 'Identitas dan jadwal belum diverifikasi' }
    ],
    cars: [
      { id: 'C1', name: 'Unit Matic 01', trans: 'Matic', active: true },
      { id: 'C2', name: 'Unit Manual 01', trans: 'Manual', active: true },
      { id: 'C3', name: 'Unit Matic 02', trans: 'Matic', active: true }
    ],
    sessions: [
      { id: 'B1', studentId: 'S1', date: t, start: '08:00', end: '09:00', trans: 'Matic', instructorId: 'I1', carId: 'C1', status: 'Terkonfirmasi' },
      { id: 'B2', studentId: 'S2', date: t, start: '10:00', end: '11:00', trans: 'Manual', instructorId: 'I3', carId: 'C2', status: 'Terkonfirmasi' },
      { id: 'B3', studentId: 'S3', date: t, start: '13:00', end: '14:00', trans: 'Matic', instructorId: 'I2', carId: 'C3', status: 'Menunggu konfirmasi' },
      { id: 'B4', studentId: 'S4', date: t, start: '15:30', end: '16:30', trans: 'Manual', instructorId: 'I1', carId: 'C2', status: 'Terkonfirmasi' },
      { id: 'B5', studentId: 'S6', date: moveDay(t, 1), start: '09:00', end: '10:00', trans: 'Matic', instructorId: 'I2', carId: 'C1', status: 'Menunggu konfirmasi' },
      { id: 'B6', studentId: 'S1', date: moveDay(t, 2), start: '08:00', end: '09:00', trans: 'Matic', instructorId: 'I1', carId: 'C1', status: 'Terkonfirmasi' },
      { id: 'B7', studentId: 'S2', date: moveDay(t, -1), start: '10:00', end: '11:00', trans: 'Manual', instructorId: 'I3', carId: 'C2', status: 'Selesai' }
    ],
    settings: { hoursFrom: '', hoursTo: '', businessPhone: '6282358777800' }
  };
}
