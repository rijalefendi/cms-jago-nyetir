import { buildSync } from 'esbuild';
import { JSDOM } from 'jsdom';

// Keep the real SDK in the production bundle; UI tests control only its public API.
const buildAuthBundle = (preview = false, production = false) => buildSync({
  entryPoints: ['src/main.tsx'], bundle: true, write: false, outfile: 'qa-auth.js',
  loader: { '.html': 'text' }, format: 'iife', platform: 'browser',
  define: {
    'import.meta.env.VITE_SUPABASE_URL': '"https://test.supabase.co"',
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '"public-test-key"',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': 'null',
    'import.meta.env.VITE_AUTH_DASHBOARD_PREVIEW': JSON.stringify(String(preview)),
    'import.meta.env.DEV': String(!production),
  },
  alias: { '@supabase/supabase-js': './tests/supabase-stub.mjs' },
}).outputFiles.find(file => file.path.endsWith('.js')).text;
export const authBundle = buildAuthBundle();
const bundles = new Map([['false:false', authBundle]]);

export const session = (id = 'user-a', token = 'token-a') => ({ user: { id }, access_token: token });
export const school = { id: 'school', name: 'Sekolah', location: 'Samarinda', setup_complete: true };
export const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) });
export const tick = () => new Promise(resolve => setTimeout(resolve, 40));
export async function waitFor(predicate) {
  for (let i = 0; i < 75; i++) {
    if (predicate()) return;
    await tick();
  }
  throw Error('Timed out waiting for UI state');
}

export function fixture({ initial = null, url = 'http://localhost/', fetch = async () => response([school]), restore, preview = false, production = false } = {}) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url, runScripts: 'dangerously', pretendToBeVisual: true });
  let current = initial;
  let listener;
  const calls = [];
  const auth = {
    getSession: async () => restore ? restore() : ({ data: { session: current }, error: null }),
    onAuthStateChange: callback => { listener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
    signInWithPassword: async () => ({ data: { session: null }, error: { name: 'AuthApiError', code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' } }),
    signUp: async () => ({ data: { session: null }, error: null }),
    refreshSession: async () => ({ data: { session: current }, error: null }),
    signOut: async () => { emit(null); return { error: null }; },
  };
  function emit(next) { current = next; listener?.(next ? 'SIGNED_IN' : 'SIGNED_OUT', next); }
  const errors = [];
  dom.window.console.error = (...args) => { errors.push(args); };
  dom.window.__auth = auth;
  dom.window.fetch = async (url, options = {}) => { calls.push([url, options]); return fetch(url, options); };
  dom.window.scrollTo = () => {};
  const bundleKey = `${preview}:${production}`;
  if (!bundles.has(bundleKey)) bundles.set(bundleKey, buildAuthBundle(preview, production));
  dom.window.eval(bundles.get(bundleKey));
  return { dom, auth, calls, errors, emit, document: dom.window.document, close: () => dom.window.close() };
}

export function submit(f, values) {
  const form = f.document.querySelector('form');
  for (const [name, value] of Object.entries(values)) form.elements.namedItem(name).value = value;
  form.dispatchEvent(new f.dom.window.Event('submit', { bubbles: true, cancelable: true }));
}
