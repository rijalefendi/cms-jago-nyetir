import React, { useEffect, useRef, useState } from 'react';

const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseDate = (value: string) => new Date(`${value}T12:00:00`);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function DatePicker(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => String(props.defaultValue || today()));
  const [month, setMonth] = useState(() => parseDate(cursor));
  const calendarId = `${props.id}-calendar`;
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(month);
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const start = new Date(first);
  start.setDate(1 - (first.getDay() + 6) % 7);
  const dates = Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
  const selected = input.current ? input.current.value : String(props.defaultValue || '');
  const witaToday = today();
  const unavailable = (value: string) => Boolean((props.min && value < String(props.min)) || (props.max && value > String(props.max)));

  useEffect(() => {
    if (props.disabled) setOpen(false);
  }, [props.disabled]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => {
    if (open) root.current?.querySelector<HTMLButtonElement>(`[data-date="${cursor}"]`)?.focus();
  }, [open, cursor]);

  function close() {
    setOpen(false);
    toggle.current?.focus();
  }
  function choose(value: string) {
    if (!input.current) return;
    // Use the native setter so React's delegated change handler also sees calendar selections.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input.current, value);
    input.current.dispatchEvent(new Event('input', { bubbles: true }));
    close();
  }
  function move(date: Date) {
    const value = isoDate(date);
    if (unavailable(value)) return;
    setCursor(value);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  }
  function changeMonth(offset: number) {
    const date = parseDate(cursor);
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + offset);
    date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
    move(date);
  }

  return (
    <div className="date-picker" ref={root} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }} onKeyDown={event => {
      if (open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
      <div className="date-picker-control">
        <input {...props} type="date" ref={input} />
        <button ref={toggle} type="button" className="date-picker-toggle" disabled={props.disabled}
          aria-label={`Pilih ${props['aria-label'] || 'tanggal'}`} aria-expanded={open} aria-controls={calendarId}
          onClick={() => {
            if (open) { close(); return; }
            const value = input.current?.value || witaToday;
            const bounded = props.min && value < String(props.min) ? String(props.min) : props.max && value > String(props.max) ? String(props.max) : value;
            setCursor(bounded); setMonth(parseDate(bounded)); setOpen(true);
          }}>
          <svg className="icon sm" aria-hidden="true"><use href="#i-calendar" /></svg>
        </button>
      </div>
      {open && !props.disabled && <section id={calendarId} className="date-picker-calendar" role="region" aria-label={`Kalender ${props['aria-label'] || 'tanggal'}`}>
        <div className="date-picker-heading">
          <strong aria-live="polite">{monthLabel}</strong>
          <button type="button" aria-label="Bulan sebelumnya" onClick={() => changeMonth(-1)}>
            <svg className="icon sm" aria-hidden="true" viewBox="0 0 24 24"><path d="m14 6-6 6 6 6" /></svg>
          </button>
          <button type="button" aria-label="Bulan berikutnya" onClick={() => changeMonth(1)}>
            <svg className="icon sm" aria-hidden="true" viewBox="0 0 24 24"><path d="m10 6 6 6-6 6" /></svg>
          </button>
        </div>
        <div className="date-picker-days">
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => <span key={day} aria-hidden="true">{day}</span>)}
          {dates.map(date => {
            const value = isoDate(date);
            return <button key={value} type="button" data-date={value} tabIndex={value === cursor ? 0 : -1}
              className={`${date.getMonth() !== month.getMonth() ? 'outside-month' : ''}${value === selected ? ' selected' : ''}`}
              aria-label={new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(date)}
              aria-pressed={value === selected} aria-current={value === witaToday ? 'date' : undefined}
              disabled={unavailable(value)} onClick={() => choose(value)}
              onKeyDown={event => {
                const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -(date.getDay() + 6) % 7, End: 6 - (date.getDay() + 6) % 7 }[event.key];
                if (offset !== undefined) { event.preventDefault(); const next = new Date(date); next.setDate(date.getDate() + offset); move(next); }
                if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); changeMonth(event.key === 'PageUp' ? -1 : 1); }
              }}>{date.getDate()}</button>;
          })}
        </div>
        <div className="date-picker-footer">
          <button type="button" onClick={() => choose('')}>Kosongkan</button>
          <button type="button" disabled={unavailable(witaToday)} onClick={() => choose(witaToday)}>Hari ini</button>
        </div>
      </section>}
    </div>
  );
}
