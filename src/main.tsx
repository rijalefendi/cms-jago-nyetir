import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { AuthApp } from './auth-ui';
import { liveConfigured } from './auth';
import { DemoDashboard } from './DemoDashboard';

const preview = import.meta.env.DEV && import.meta.env.VITE_AUTH_DASHBOARD_PREVIEW === 'true';
createRoot(document.getElementById('root')!).render(liveConfigured ? <AuthApp preview={preview ? <DemoDashboard authenticated /> : undefined} /> : <DemoDashboard />);
