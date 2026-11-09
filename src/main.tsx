import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import shell from './shell.html?raw';
import { initDashboard } from './legacy.js';
import './style.css';
import { LiveApp } from './live';

const pageNames: Record<string, string> = {
  dashboard: 'OverviewPage', permintaan: 'RequestsPage', jadwal: 'SchedulePage',
  murid: 'StudentsPage', instruktur: 'InstructorsPage', mobil: 'CarsPage',
  paket: 'PackagesPage', laporan: 'ReportsPage', pengaturan: 'SettingsPage',
};

function DashboardPage({ page, html }: { page: string; html: string }) {
  return <div data-react-page={pageNames[page]} dangerouslySetInnerHTML={{ __html: html }} />;
}

function App() {
  React.useEffect(() => {
    const pageRoot = createRoot(document.getElementById('main')!);
    initDashboard((page: string, html: string) => {
      flushSync(() => pageRoot.render(<DashboardPage page={page} html={html} />));
    });
  }, []);
  return <div dangerouslySetInnerHTML={{ __html: shell }} />;
}

createRoot(document.getElementById('root')!).render(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY ? <LiveApp /> : <App />);


