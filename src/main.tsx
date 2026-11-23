import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { AccessPage, AuthApp } from './auth-ui';
import { liveConfigured } from './auth';
import { DemoDashboard } from './DemoDashboard';

const oldPath = location.pathname;
const legacyAuth: Record<string, string> = { '/masuk': '/login', '/daftar': '/register', '/regis': '/register', '/lupa-password': '/forgot-password', '/lupa-kata-sandi': '/forgot-password' };
const legacyPages: Record<string, string> = { beranda: 'home', dasbor: 'home', murid: 'students', jadwal: 'sessions', instruktur: 'instructors', mobil: 'vehicles', paket: 'packages', laporan: 'reports', pengaturan: 'settings' };
const newPath = legacyAuth[oldPath] || oldPath.replace(/^(\/schools\/[^/]+)?\/(?:dasbor|dashboard)\/([^/]+)(\/?)$/, (_, school = '', page, trailing) => `${school}/dashboard/${legacyPages[page] || page}${trailing}`).replace(/^\/dasbor(?=\/|$)/, '/dashboard');
if (newPath !== oldPath) history.replaceState(null, '', newPath + location.search + location.hash);

const preview = import.meta.env.DEV && import.meta.env.VITE_AUTH_DASHBOARD_PREVIEW === 'true';
const accessPreview = import.meta.env.DEV && ({ '/preview/akses-ditolak': 'denied', '/preview/tidak-ditemukan': 'not-found' } as const)[location.pathname as '/preview/akses-ditolak' | '/preview/tidak-ditemukan'];
createRoot(document.getElementById('root')!).render(accessPreview ? <AccessPage school={{ id: 'preview', name: 'Sekolah Contoh', location: '', role: 'staff', setup_complete: true }} kind={accessPreview} onNavigate={() => { location.href = '/'; }} /> : liveConfigured ? <AuthApp preview={preview ? <DemoDashboard authenticated /> : undefined} /> : <DemoDashboard />);
