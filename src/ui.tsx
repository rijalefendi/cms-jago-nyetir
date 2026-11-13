import React, { useEffect, useRef, useState } from 'react';
import { formatRupiahInput, parseRupiahInput } from './packagePricing.mjs';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';

export type FieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'select' | 'textarea' | 'number' | 'date' | 'time' | 'currency';
  options?: (string | { value: string; label: string })[];
  required?: boolean;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number;
  hint?: string;
  upload?: boolean;
  enabledBy?: string;
  disabled?: boolean;
};
export type Row = Record<string, any>;

export const Icon = ({ name, extra = '' }: { name: string; extra?: string }) => (
  <svg className={`icon ${extra}`} aria-hidden="true"><use href={`#i-${name}`} /></svg>
);

export function Button({ variant = 'quiet', sm, icon, type = 'button', children, ...rest }: {
  variant?: 'primary' | 'quiet' | 'soft' | 'danger';
  sm?: boolean;
  icon?: string;
  type?: 'button' | 'submit';
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={`btn btn-${variant}${sm ? ' btn-sm' : ''}`} {...rest}>
      {icon && <Icon name={icon} extra="sm" />}
      {children}
    </button>
  );
}

const badgeTones: Record<string, string> = {
  'Baru': 'warning', 'Menunggu keputusan': 'warning', 'Menunggu konfirmasi': 'warning',
  'Dihubungi': 'info', 'Aktif': 'info', 'Dikonversi': 'success', 'Terkonfirmasi': 'success',
  'Selesai': 'success', 'Tidak lanjut': 'neutral', 'Batal': 'danger', 'Dibatalkan': 'danger', 'Tidak hadir': 'danger',
};
export const Badge = ({ status }: { status: string }) => (
  <span className={`badge ${badgeTones[status] || 'neutral'}`}>{status}</span>
);

export function Field({ f, row, error }: { f: FieldDef; row?: Row | null; error?: string }) {
  const id = `f-${f.key}`;
  const initial = f.key === 'active' ? String(row?.active ?? true) : row?.[f.key] ?? '';
  const display = f.type === 'currency' ? formatRupiahInput(String(initial).replace('.', ',')) ?? String(initial) : initial;
  const lastCurrencyValue = useRef(String(display));
  const label = <label htmlFor={id}>{f.label}{f.required ? ' *' : ''}</label>;
  const validation = { 'aria-invalid': Boolean(error), 'aria-describedby': [f.hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined };
  const feedback = <>{f.hint && <span id={`${id}-hint`} className="hint">{f.hint}</span>}{error && <small id={`${id}-error`} className="field-error" role="alert">{error}</small>}</>;
  if (f.type === 'select') {
    return (
      <div className="form-field">
        {label}
        <select id={id} name={f.key} defaultValue={initial as string} required={f.required} disabled={f.disabled} {...validation}>
          {(f.options || []).map(o => { const v = typeof o === 'string' ? o : o.value; const l = typeof o === 'string' ? o : o.label; return <option key={v} value={v}>{l}</option>; })}
        </select>
        {feedback}
      </div>
    );
  }
  if (f.type === 'textarea') {
    return (
      <div className="form-field span-2">
        <label htmlFor={id}>{f.label}</label>
        <textarea id={id} name={f.key} maxLength={f.maxLength} defaultValue={initial as string} disabled={f.disabled} {...validation} />
        {feedback}
      </div>
    );
  }
  if (f.type === 'time') {
    return <div className="form-field">
      {label}
      <TimePicker id={id} name={f.key} aria-label={f.label} defaultValue={initial as string}
        min={f.min} max={f.max} step={f.step} required={f.required} disabled={f.disabled} {...validation} />
      {feedback}
    </div>;
  }
  if (f.type === 'date') {
    return <div className="form-field">
      {label}
      <DatePicker id={id} name={f.key} aria-label={f.label} defaultValue={initial as string}
        min={f.min} max={f.max} required={f.required} disabled={f.disabled} {...validation} />
      {feedback}
    </div>;
  }
  return (
    <div className="form-field">
      {label}
      <input id={id} name={f.key} type={f.type === 'currency' ? 'text' : f.type || 'text'} inputMode={f.type === 'currency' ? 'decimal' : undefined}
        min={f.min} max={f.max} step={f.step} maxLength={f.maxLength} defaultValue={display as string} required={f.required} disabled={f.disabled}
        onChange={f.type === 'currency' ? event => {
          const input = event.currentTarget;
          const formatted = formatRupiahInput(input.value);
          if (formatted === null) {
            input.value = lastCurrencyValue.current;
            return;
          }
          const position = input.value.slice(0, input.selectionStart ?? input.value.length).replaceAll('.', '').length;
          input.value = formatted;
          lastCurrencyValue.current = formatted;
          let cursor = 0;
          let characters = 0;
          while (cursor < input.value.length && characters < position) {
            if (input.value[cursor] !== '.') characters++;
            cursor++;
          }
          input.setSelectionRange(cursor, cursor);
        } : undefined} {...validation} />
      {feedback}
    </div>
  );
}

export const FormError = ({ id = 'formError', message }: { id?: string; message: string }) => (
  <div id={id} className={`form-error${message ? ' visible' : ''}`} role="alert">{message}</div>
);

export function SearchField({ id, placeholder, ariaLabel, value, onChange }: {
  id: string; placeholder: string; ariaLabel: string; value: string; onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="field-search">
      <Icon name="search" extra="sm" />
      <input ref={inputRef} id={id} type="search" placeholder={placeholder} aria-label={ariaLabel} value={value} onChange={e => onChange(e.target.value)} />
      {value !== '' && <button type="button" className="search-clear" data-clear-search={id} aria-label="Hapus pencarian" onClick={() => { onChange(''); inputRef.current?.focus(); }}><Icon name="x" extra="sm" /></button>}
    </div>
  );
}

export const Panel = ({ className = '', children }: { className?: string; children: React.ReactNode }) => (
  <section className={`panel ${className}`.trim()}>{children}</section>
);

export const PanelHead = ({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) => (
  <div className="panel-head">
    <div>
      <h2 className="panel-title">{title}</h2>
      {sub && <p className="panel-sub">{sub}</p>}
    </div>
    {children}
  </div>
);

export const Metric = ({ label, value, foot, icon, tone = '' }: { label: string; value: React.ReactNode; foot: React.ReactNode; icon: string; tone?: '' | 'hot' | 'yellow' }) => (
  <div className={`metric ${tone}`.trim()}>
    <div className="metric-top"><span className="metric-label">{label}</span><span className="metric-icon"><Icon name={icon} /></span></div>
    <div className="metric-value">{value}</div>
    <div className="metric-foot">{foot}</div>
  </div>
);

export const PageHeading = ({ label, description, actions, eyebrow = 'OPERASIONAL' }: { label: string; description: string; actions?: React.ReactNode; eyebrow?: string }) => (
  <div className="page-heading">
    <div>
      <div className="eyebrow">{eyebrow}</div>
      <h1>{label}</h1>
      <p className="page-sub">{description}</p>
    </div>
    {actions && <div className="heading-actions">{actions}</div>}
  </div>
);

export const EmptyState = ({ title, description = 'Belum ada data yang sesuai. Periksa filter atau tambahkan data baru untuk mencoba prototipe.', action }: { title: string; description?: string; action?: React.ReactNode }) => (
  <div className="empty">
    <span className="empty-illustration"><Icon name="clipboard" extra="lg" /></span>
    <strong>{title}</strong>
    <p>{description}</p>
    {action}
  </div>
);

export function Modal({ title, desc, onClose, children, role = 'dialog' }: { title: string; desc: string; onClose: () => void; children: React.ReactNode; role?: string }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const invoker = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const first = ref.current?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')
      || ref.current?.querySelector<HTMLElement>('button:not(:disabled)');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (ref.current?.querySelector('.date-picker [aria-expanded="true"]')) return;
        e.stopPropagation(); onClose(); return;
      }
      if (e.key !== 'Tab') return;
      const items = ref.current ? [...ref.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')] : [];
      if (!items.length) return;
      const firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      if (invoker && invoker.isConnected) invoker.focus();
    };
  }, []);
  return (
    <div className="modal-wrap" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal" role={role} aria-modal="true" aria-labelledby="modalTitle" ref={ref as any}>
        <div className="modal-head">
          <div><h2 id="modalTitle">{title}</h2><p>{desc}</p></div>
          <Button className="icon-control" data-action="close-modal" aria-label="Tutup dialog" onClick={onClose}><Icon name="x" extra="sm" /></Button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function ConfirmDialog({ title, desc, body, confirmLabel, confirmAction, confirmId, testId, busy, onClose, onConfirm }: {
  title: string; desc: string; body: string; confirmLabel: string; confirmAction: string; confirmId?: string; testId?: string;
  busy?: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <Modal title={title} desc={desc} onClose={onClose} role="alertdialog">
      <div className="modal-content"><p className="muted">{body}</p></div>
      <div className="modal-foot">
        <Button data-action="close-modal" onClick={onClose}>Batal</Button>
        <Button variant="danger" data-action={confirmAction} data-id={confirmId} data-testid={testId} disabled={busy} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function BlockedDialog({ title, desc, note, onClose }: { title: string; desc: string; note: string; onClose: () => void }) {
  return (
    <Modal title={title} desc={desc} onClose={onClose} role="alertdialog">
      <div className="modal-content"><p className="muted">{note}</p></div>
      <div className="modal-foot"><Button variant="primary" data-action="close-modal" onClick={onClose}>Tutup</Button></div>
    </Modal>
  );
}

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { reject('Format foto harus JPG, PNG, atau WebP.'); return; }
    if (file.size > 8 * 1024 * 1024) { reject('Ukuran file maksimal 8 MB.'); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    const fail = (msg: string) => { URL.revokeObjectURL(url); reject(msg); };
    img.onerror = () => fail('File tidak dapat dibaca sebagai gambar.');
    img.onload = () => {
      try {
        const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
        const scale = Math.min(1, 800 / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        let out = canvas.toDataURL('image/jpeg', 0.82);
        if (out.length > 200 * 1024) out = canvas.toDataURL('image/jpeg', 0.6);
        if (out.length > 200 * 1024) { reject('Foto terlalu besar setelah dikompresi. Gunakan foto lain.'); return; }
        resolve(out);
      } catch { fail('Foto tidak dapat diproses di browser ini.'); }
    };
    img.src = url;
  });
}

export function UploadField({ label, value, onChange, onError, error }: { label: string; value: string; onChange: (v: string) => void; onError: (msg: string) => void; error?: string }) {
  const [busy, setBusy] = useState(false);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try { onChange(await compressImage(file)); } catch (msg) { onError(String(msg)); } finally { setBusy(false); }
  };
  return (
    <div className="form-field span-2">
      <label htmlFor="carImageInput">{label}</label>
      <div className="upload-box">
        {value
          ? <img id="imagePreview" className="upload-preview" src={value} alt="Pratinjau foto mobil" />
          : <span id="imagePreview" className="upload-empty"><Icon name="car" extra="lg" /></span>}
        <div className="upload-meta">
          <label className="upload-pick" htmlFor="carImageInput"><Icon name="plus" extra="sm" /> Pilih foto</label>
          <input type="file" id="carImageInput" name="image" accept="image/jpeg,image/png,image/webp" onChange={onFile} aria-invalid={Boolean(error)} aria-describedby={`imageHint${error ? ' carImageError' : ''}`} />
          <span className="hint" id="imageHint">{busy ? 'Memproses foto…' : 'JPG, PNG, atau WebP · maks 8 MB · otomatis dikompres.'}</span>
          <Button sm data-action="remove-car-image" disabled={!value} onClick={() => onChange('')}>Hapus foto</Button>
        </div>
      </div>
      {error && <small id="carImageError" className="field-error" role="alert">{error}</small>}
    </div>
  );
}

export function FormModal({ title, desc, formName, fields, row, submitLabel, busy, onClose, onSubmit, validateForm }: {
  title: string; desc: string; formName: string; fields: FieldDef[]; row?: Row | null; submitLabel: string;
  busy?: boolean; onClose: () => void;
  onSubmit: (form: { name: string; transmission: string; notes: string; active: boolean; description?: string; total_sessions?: string; normal_price?: string; discount_price?: string; start_discount?: string; end_discount?: string }, image: string, setError: (msg: string, field?: string) => void) => void | Promise<void>;
  validateForm?: (values: Record<string, string>) => Record<string, string>;
}) {
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [image, setImage] = useState(row?.image || '');
  const [dependencyValues, setDependencyValues] = useState<Row>(row || {});
  const effectiveFields = fields.map(field => {
    if (!field.enabledBy) return field;
    const enabled = Boolean(String(dependencyValues[field.enabledBy] ?? '').trim());
    return { ...field, disabled: !enabled, required: enabled };
  });
  const formRef = useRef<HTMLFormElement>(null);
  const pending = useRef(false);
  const focusField = useRef('');
  useEffect(() => {
    if (busy || !focusField.current) return;
    (formRef.current?.elements.namedItem(focusField.current) as HTMLElement | null)?.focus();
    focusField.current = '';
  }, [fieldErrors, busy]);
  function showError(message: string, field?: string) {
    if (!field) { setError(message); return; }
    focusField.current = field;
    setFieldErrors(current => ({ ...current, [field]: message }));
  }
  function validate(field: FieldDef, value: string) {
    if (field.required && !value.trim()) return `${field.label} wajib diisi.`;
    if (field.type === 'number' && value && (!Number.isFinite(Number(value)) || (field.step === 1 && !Number.isInteger(Number(value))) || (field.min !== undefined && Number(value) < Number(field.min)) || (field.max !== undefined && Number(value) > Number(field.max))))
      return `${field.label} harus berupa ${field.step === 1 ? 'bilangan bulat' : 'angka'} antara ${field.min} dan ${field.max}.`;
    if (field.maxLength && value.length > field.maxLength) return `${field.label.replace(' (opsional)', '')} maksimal ${field.maxLength} karakter.`;
    if (field.type === 'select' && !field.options?.some(option => (typeof option === 'string' ? option : option.value) === value)) return `Pilih ${field.label.toLowerCase()} yang valid.`;
    return '';
  }
  function readValues(form: HTMLFormElement) {
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>;
    for (const field of fields) {
      if (field.type === 'currency') values[field.key] = parseRupiahInput(values[field.key] || '') ?? 'invalid';
      if (field.enabledBy && !values[field.enabledBy]?.trim()) delete values[field.key];
    }
    return values;
  }
  function update(event: React.FocusEvent<HTMLFormElement> | React.ChangeEvent<HTMLFormElement>) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement)) return;
    const field = effectiveFields.find(field => field.key === input.name && !field.upload);
    if (event.type === 'change') {
      setError('');
      if (fields.some(field => field.enabledBy === input.name))
        setDependencyValues(current => ({ ...current, [input.name]: input.value }));
    }
    if (!field) return;
    if (event.type === 'blur') {
      if (!input.value.trim() || fieldErrors[field.key]) return;
    } else if (!fieldErrors[field.key]) return;
    const values = readValues(event.currentTarget);
    setFieldErrors(current => ({ ...current, [field.key]: validate(field, values[field.key] || '') || validateForm?.(values)[field.key] || '' }));
  }
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || pending.current) return;
    const data = readValues(e.currentTarget);
    const errors = { ...Object.fromEntries(effectiveFields.filter(field => !field.upload && !field.disabled).map(field => [field.key, validate(field, String(data[field.key] || ''))])), ...validateForm?.(data) };
    setFieldErrors(errors); setError('');
    const invalid = effectiveFields.find(field => !field.disabled && errors[field.key]);
    if (invalid) { (e.currentTarget.elements.namedItem(invalid.key) as HTMLElement | null)?.focus(); return; }
    pending.current = true;
    try {
      await onSubmit({
        ...data as Record<string, string>,
        name: String(data.name || '').trim(),
        transmission: String(data.transmission || ''),
        notes: String(data.notes || '').trim(),
        active: data.active === 'true',
      }, image, showError);
    } catch (error) { setError(error instanceof Error ? error.message : 'Gagal menyimpan. Silakan coba lagi.'); }
    finally { pending.current = false; }
  };
  return (
    <Modal title={title} desc={desc} onClose={onClose}>
      <form ref={formRef} data-form={formName} noValidate onSubmit={submit} onBlur={update} onChange={update} aria-busy={busy}>
        <div className="modal-content">
          <fieldset className="form-grid resource-form-fields" disabled={busy}>
            {effectiveFields.map(f => f.upload
              ? <UploadField key={f.key} label={f.label} value={image} error={fieldErrors[f.key]} onChange={value => { setImage(value); setFieldErrors(current => ({ ...current, [f.key]: '' })); }} onError={message => showError(message, f.key)} />
              : <Field key={f.key} f={f} row={row} error={f.disabled ? undefined : fieldErrors[f.key]} />)}
          </fieldset>
        </div>
        <div className="modal-foot">
          {error && <div id="modalError" className="notice form-feedback" role="alert">{error}</div>}
          <Button data-action="close-modal" onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" disabled={busy}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

export const DemoNotice = () => (
  <div className="demo-banner">
    <Icon name="info" />
    <p><strong>Mode demo — data simulasi.</strong> Nama murid, instruktur, unit, angka, dan jadwal di bawah hanya contoh tampilan. Data baru tersimpan lokal di browser ini; belum ada API, WhatsApp sync, atau konfirmasi nyata.</p>
    <span className="demo-tag"><Icon name="check" extra="sm" /> SIMULASI</span>
  </div>
);

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function showToast(message: string) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el!.classList.remove('show'), 3600);
}
