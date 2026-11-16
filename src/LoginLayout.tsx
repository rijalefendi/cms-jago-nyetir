import React from 'react';
import { IconSprite } from './IconSprite';
import { Icon } from './ui';
const drivePath = 'M -80 260 C -80 180 -40 150 40 150 C 200 150 200 70 360 70 H 640';
const wordmark = <div className="auth-wordmark">Jagonyetir<span aria-hidden="true">.</span></div>;
export function LoginLayout({ children }: { children: React.ReactNode }) {
  return <main className="login-layout login-vertical">
    <IconSprite />
    <aside className="login-intro">
      {wordmark}
      <div className="login-intro-content"><div className="login-intro-copy"><h2>Operasional<br /><span className="login-highlight">lebih tertata.</span></h2><p>Atur jadwal latihan, murid, instruktur, dan mobil dalam satu tempat.</p></div></div>
      <div className="login-road-area" aria-hidden="true"><div className="login-route" style={{ '--login-drive-path': `path('${drivePath}')` } as React.CSSProperties}>
        <svg className="login-road" viewBox="0 0 560 180"><path className="login-road-edge" d={drivePath} /><path className="login-road-surface" d={drivePath} /></svg>
        <div className="login-car"><Icon name="car-driving" /></div>
      </div></div>
    </aside>
    <div className="login-form-area">{children}</div>
  </main>;
}
