export const demoSchools = Object.freeze([
  { id: 'radja', name: 'radjamengemudi', location: 'Samarinda', timeZone: 'Asia/Makassar', logo: '/logo.png' },
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
          return data;
        }
      } catch { /* Invalid browser data falls back to the demo fixture. */ }
      return seed();
    },
    save(schoolId, data) { storage.setItem(keyFor(schoolId), JSON.stringify(data)); },
    reset(schoolId) { storage.removeItem(keyFor(schoolId)); },
  };
}
