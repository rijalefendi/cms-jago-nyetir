import React, { useEffect, useRef, useState } from 'react';

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window { turnstile?: TurnstileApi; }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => { scriptPromise = null; reject(Error('turnstile_script_failed')); };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

// Cloudflare widget embed; the token is passed to Supabase Auth as captchaToken.
// A single token is single-use, so the parent remounts via `key` after each
// failed attempt to obtain a fresh challenge.
export function TurnstileCaptcha({ siteKey, resetKey, onToken, onExpire, onError }: {
  siteKey: string; resetKey: number; onToken: (token: string) => void; onExpire: () => void; onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const callbacks = useRef({ onToken, onExpire, onError });
  callbacks.current = { onToken, onExpire, onError };
  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;
    setFailed(false);
    loadTurnstile().then(() => {
      if (cancelled || !container.current || !window.turnstile) return;
      widgetId = window.turnstile.render(container.current, {
        sitekey: siteKey,
        callback: (token: string) => callbacks.current.onToken(token),
        'expired-callback': () => callbacks.current.onExpire(),
        'error-callback': () => { callbacks.current.onError(); return true; },
      });
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, resetKey]);
  if (failed) return <p className="auth-captcha-note" role="alert">Verifikasi keamanan gagal dimuat. Muat ulang halaman lalu coba lagi.</p>;
  return <div className="auth-captcha" ref={container} />;
}
