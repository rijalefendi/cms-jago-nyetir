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
        if (Array.isArray(data.leads) && Array.isArray(data.students) && Array.isArray(data.sessions) && Array.isArray(data.instructors) && Array.isArray(data.cars)) return data;
      } catch { /* Invalid browser data falls back to the demo fixture. */ }
      return seed();
    },
    save(schoolId, data) { storage.setItem(keyFor(schoolId), JSON.stringify(data)); },
    reset(schoolId) { storage.removeItem(keyFor(schoolId)); },
  };
}
