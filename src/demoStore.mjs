export const demoSchools = Object.freeze([
  { id: 'radja', name: 'radjamengemudi', location: 'Samarinda', timeZone: 'Asia/Makassar', logo: '' },
  { id: 'demo-b', name: 'Sekolah Mengemudi Contoh', location: 'Jakarta', timeZone: 'Asia/Jakarta', logo: '' },
]);

const keyFor = (schoolId) => `driving-school-demo-v1:${schoolId}`;

export function createDemoStore(storage) {
  return {
    load(schoolId, seed) {
      const raw = storage.getItem(keyFor(schoolId));
      if (!raw) return seed();
      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data.leads) && Array.isArray(data.students) && Array.isArray(data.sessions) && Array.isArray(data.instructors) && Array.isArray(data.cars)) {
          if (!Array.isArray(data.packages)) data.packages = seed().packages || [];
          // shortcut: demo students store a package label, use enrollment IDs when wiring the database.
          for (const student of data.students) {
            if (!student.packageId) student.packageId = data.packages.find(p => p.name === student.package?.split(' · ')[0])?.id;
          }
          data.leads = [];
          for (const car of data.cars) delete car.image;
          for (const pack of data.packages) {
            delete pack.discount_price; delete pack.start_discount; delete pack.end_discount;
            pack.transmission ||= 'Matic'; pack.session_duration_minutes ||= 60;
          }
          return data;
        }
      } catch { /* Invalid browser data falls back to the demo fixture. */ }
      return seed();
    },
    save(schoolId, data) { storage.setItem(keyFor(schoolId), JSON.stringify(data)); },
    reset(schoolId) { storage.removeItem(keyFor(schoolId)); },
  };
}
