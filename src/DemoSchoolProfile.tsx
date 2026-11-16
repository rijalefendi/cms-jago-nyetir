import React from 'react';
import { SchoolProfile } from './auth-ui';
import type { Api } from './auth';
import { Icon, PageHeading } from './ui';
import { createDemoStore, demoSchools } from './demoStore.mjs';
import { seed } from './seed.mjs';

export function DemoSchoolProfile({ schoolId }: { schoolId: string }) {
  const [revision, setRevision] = React.useState(0);
  const [saved, setSaved] = React.useState(false);
  const store = createDemoStore(localStorage);
  const fixture = demoSchools.find(school => school.id === schoolId) || demoSchools[0];
  const defaults = { name: fixture.name, location: fixture.location, setup_complete: false, weekday_closed: false, weekday_open: '', weekday_close: '', weekend_closed: true };
  const profile = store.load(schoolId, seed).schoolProfile || defaults;
  const api = React.useCallback<Api>(async (_path, method, body) => {
    const data = store.load(schoolId, seed);
    if (method === 'PUT') {
      const next: Record<string, unknown> = { name: body!.name, location: body!.location, setup_complete: true };
      for (const group of ['weekday', 'weekend']) {
        const hours = body![group] as { closed?: boolean; open?: string; close?: string };
        next[`${group}_closed`] = Boolean(hours.closed);
        next[`${group}_open`] = hours.closed ? null : hours.open;
        next[`${group}_close`] = hours.closed ? null : hours.close;
      }
      data.schoolProfile = next;
      store.save(schoolId, data);
      window.dispatchEvent(new CustomEvent('demo-data-changed'));
      return schoolId;
    }
    return [data.schoolProfile || defaults];
  }, [schoolId]);
  return <>
    <PageHeading label="Pengaturan Sekolah" description="Semua jam dalam WITA (Asia/Makassar)." />
    <div className="demo-banner"><Icon name="info" /><p>Simulasi lokal di browser ini. Tidak mengubah data atau akses live.</p></div>
    <SchoolProfile key={revision} school={{ id: schoolId, name: profile.name, location: profile.location, setup_complete: profile.setup_complete, role: 'owner' }} api={api} saved={saved}
      showHeading={false}
      successMessage="Perubahan demo berhasil disimpan."
      onSaved={async () => { setSaved(true); setRevision(value => value + 1); }} retryAccess={() => setRevision(value => value + 1)} />
  </>;
}
