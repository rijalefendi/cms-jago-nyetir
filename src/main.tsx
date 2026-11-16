import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { AccessPage, AuthApp } from './auth-ui';
import { liveConfigured } from './auth';
import { DemoDashboard } from './DemoDashboard';

const preview = import.meta.env.DEV && import.meta.env.VITE_AUTH_DASHBOARD_PREVIEW === 'true';
const accessPreview = import.meta.env.DEV && ({ '/preview/akses-ditolak': 'denied', '/preview/tidak-ditemukan': 'not-found' } as const)[location.pathname as '/preview/akses-ditolak' | '/preview/tidak-ditemukan'];
createRoot(document.getElementById('root')!).render(accessPreview ? <AccessPage school={{ id: 'preview', name: 'Sekolah Contoh', location: '', role: 'staff', setup_complete: true }} kind={accessPreview} onNavigate={() => { location.href = '/'; }} /> : liveConfigured ? <AuthApp preview={preview ? <DemoDashboard authenticated /> : undefined} /> : <DemoDashboard />);
