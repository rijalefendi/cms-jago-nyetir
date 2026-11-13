import React, { useEffect, useId, useRef, useState } from 'react';

export function TimePicker(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const generatedId = useId();
  const id = props.id || generatedId;
  const native = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const segments = useRef<(HTMLInputElement | null)[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const writing = useRef(false);
  const [parts, setParts] = useState(() => String(props.value ?? props.defaultValue ?? '').split(':'));
  const label = props['aria-label'] || props.name || 'Waktu';
  useEffect(() => {
    if (props.value !== undefined) setParts(String(props.value).split(':'));
  }, [props.value]);
  useEffect(() => {
    const input = native.current!;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      timer = setTimeout(() => { input.setCustomValidity(''); setParts(input.value.split(':')); setOpen(null); }, 0);
    };
    const form = input.form;
    form?.addEventListener('reset', reset);
    return () => { form?.removeEventListener('reset', reset); clearTimeout(timer); };
  }, []);
  useEffect(() => {
    if (open === null) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => {
    const option = document.getElementById(`${id}-option-${open}-${active}`);
    if (open !== null && list.current && option) {
      const rowHeight = option.offsetHeight || 44;
      const offset = option.offsetTop || 4 + ((open === 0 ? 24 : 60) + active) * rowHeight;
      list.current.scrollTop = offset - ((list.current.clientHeight || 224) - rowHeight) / 2;
    }
  }, [open, active, id]);
  useEffect(() => {
    if (open !== null && (native.current?.matches(':disabled') || props.readOnly)) setOpen(null);
  });

  function update(next: string[]) {
    const input = native.current!;
    if (input.matches(':disabled') || props.readOnly) return;
    setParts(next);
    const complete = next.length === 2 && next.every((part, index) => /^\d{1,2}$/.test(part) && Number(part) < (index === 0 ? 24 : 60));
    const value = complete ? next.map(part => part.padStart(2, '0')).join(':') : '';
    input.setCustomValidity(!complete && next.some(Boolean) ? 'Lengkapi jam (00–23) dan menit (00–59).' : '');
    // Keep the named native input and its change event as the form contract.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    writing.current = true;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    writing.current = false;
  }
  function show(index: number) {
    if (native.current?.matches(':disabled') || props.readOnly) return;
    setActive(Math.max(0, Math.min(index === 0 ? 23 : 59, Number(parts[index]) || 0)));
    setOpen(index);
  }
  function choose(index: number, value: number) {
    if (native.current?.matches(':disabled') || props.readOnly) return;
    segments.current[index]?.focus();
    const next = [...parts];
    next[index] = String(value).padStart(2, '0');
    update(next);
    setOpen(null);
  }

  return <div ref={root} className="time-picker" role="group" aria-label={label} aria-describedby={props['aria-describedby']}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null); }}>
    <div className="time-picker-control">
    <input {...props} id={id} ref={native} type="time" className="time-picker-value" tabIndex={-1} aria-hidden="true"
      onFocus={event => { props.onFocus?.(event); segments.current[0]?.focus(); }}
      onChange={event => {
        if (!writing.current) setParts(event.currentTarget.value.split(':'));
        props.onChange?.(event);
      }} />
    {['jam', 'menit'].map((segment, index) => <React.Fragment key={segment}>
      {index === 1 && <span className="time-picker-separator" aria-hidden="true">:</span>}
      <span className="time-picker-segment">
        <input ref={element => { segments.current[index] = element; }} type="text" inputMode="numeric" autoComplete="off"
          role="combobox" aria-autocomplete="none" aria-haspopup="listbox" aria-expanded={open === index}
          aria-controls={open === index ? `${id}-list-${index}` : undefined}
          aria-activedescendant={open === index ? `${id}-option-${index}-${active}` : undefined}
          aria-label={`${label}: ${segment}`} aria-describedby={props['aria-describedby']} aria-invalid={props['aria-invalid']}
          pattern="[0-9]{1,2}" maxLength={2} placeholder={index === 0 ? 'JJ' : 'MM'}
          required={props.required} disabled={props.disabled} readOnly={props.readOnly} value={parts[index] || ''}
          onFocus={event => event.currentTarget.select()}
          onClick={() => show(index)}
          onChange={event => {
            if (!/^\d{0,2}$/.test(event.currentTarget.value)) return;
            const next = [...parts]; next[index] = event.currentTarget.value; update(next);
            if (!native.current?.matches(':disabled') && !props.readOnly) {
              setOpen(index);
              setActive(Math.max(0, Math.min(index === 0 ? 23 : 59, Number(event.currentTarget.value) || 0)));
            }
          }}
          onBlur={() => {
            const part = parts[index];
            if (part?.length === 1 && Number(part) >= 0 && Number(part) < (index === 0 ? 24 : 60)) {
              const next = [...parts]; next[index] = part.padStart(2, '0'); update(next);
            }
          }}
          onKeyDown={event => {
            if (native.current?.matches(':disabled') || props.readOnly) return;
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              const limit = index === 0 ? 24 : 60;
              const current = open === index ? active : Number(parts[index]) || 0;
              setActive(((current + (event.key === 'ArrowDown' ? 1 : -1)) % limit + limit) % limit);
              setOpen(index);
            } else if (event.key === 'Enter' && open === index) {
              event.preventDefault(); choose(index, active);
            } else if (event.key === 'Escape' && open === index) {
              event.preventDefault(); event.stopPropagation(); setOpen(null);
            } else if (event.key === 'Tab') {
              setOpen(null);
            }
          }} />
        <button className="time-picker-toggle" type="button" tabIndex={-1}
          disabled={props.disabled || props.readOnly} aria-label={`Pilih ${segment} ${label}`} aria-expanded={open === index}
          onClick={() => {
            segments.current[index]?.focus();
            if (open === index) setOpen(null); else show(index);
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </span>
    </React.Fragment>)}
    </div>
    {open !== null && <div ref={list} className="time-picker-list" role="listbox" id={`${id}-list-${open}`} aria-label={`${label}: pilihan ${open === 0 ? 'jam' : 'menit'}`}
      onScroll={event => {
        const element = event.currentTarget;
        const rowHeight = (element.firstElementChild as HTMLElement).offsetHeight || 44;
        const cycle = (open === 0 ? 24 : 60) * rowHeight;
        const halfHeight = (element.clientHeight || 224) / 2;
        if (element.scrollTop < cycle - halfHeight) element.scrollTop += cycle;
        else if (element.scrollTop >= cycle * 2 - halfHeight) element.scrollTop -= cycle;
      }}>
      {/* Visual copies allow continuous scrolling; assistive technology gets one set of options. */}
      {[-1, 0, 1].flatMap(copy => Array.from({ length: open === 0 ? 24 : 60 }, (_, value) => {
        const selected = parts[open] !== '' && parts[open] !== undefined && value === Number(parts[open]);
        return <div role={copy === 0 ? 'option' : undefined} aria-hidden={copy !== 0 ? true : undefined} key={`${copy}-${value}`}
          id={copy === 0 ? `${id}-option-${open}-${value}` : undefined} data-value={value}
          className={`time-picker-option${value === active ? ' active' : ''}`} data-selected={selected}
          aria-selected={copy === 0 ? selected : undefined}
          onPointerDown={event => event.preventDefault()} onClick={() => choose(open, value)}>
          {String(value).padStart(2, '0')}
        </div>;
      }))}
    </div>}
  </div>;
}
