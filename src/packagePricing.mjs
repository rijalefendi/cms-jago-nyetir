import { isoDay } from './seed.mjs';

const text = value => value == null ? '' : String(value).trim();
const discountFields = ['discount_price', 'start_discount', 'end_discount'];

export function formatRupiahInput(value) {
  if (!/^[\d.]*(?:,\d{0,2})?$/.test(value)) return null;
  const [whole, fraction] = value.split(',');
  const digits = whole.replaceAll('.', '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction === undefined ? '' : `,${fraction}`);
}

export function parseRupiahInput(value) {
  if (!value.trim()) return '';
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)) return null;
  return value.replaceAll('.', '').replace(',', '.');
}

function cents(value) {
  const raw = text(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const amount = Math.round(Number(raw) * 100);
  return Number.isSafeInteger(amount) && amount <= 9999999999 ? amount : null;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

/** @returns {Record<string, string>} */
export function validatePackagePricing(form) {
  const errors = {};
  const normal = cents(form.normal_price);
  if (normal === null) errors.normal_price = 'Isi harga normal antara Rp0 dan Rp99.999.999,99, maksimal 2 angka desimal.';
  if (!discountFields.some(field => text(form[field]))) return errors;
  const discount = cents(form.discount_price);
  if (discount === null) errors.discount_price = 'Isi harga diskon yang valid, maksimal 2 angka desimal.';
  else if (normal !== null && discount >= normal) errors.discount_price = 'Harga diskon harus lebih kecil dari harga normal.';
  if (!validDate(text(form.start_discount))) errors.start_discount = 'Isi tanggal awal diskon yang valid.';
  if (!validDate(text(form.end_discount))) errors.end_discount = 'Isi tanggal akhir diskon yang valid.';
  if (!errors.start_discount && !errors.end_discount && form.end_discount <= form.start_discount)
    errors.end_discount = 'Tanggal akhir diskon harus setelah tanggal awal.';
  return errors;
}

// shortcut: demo uses the browser clock, calculate effective prices server-side before live use.
export function getPackagePricing(row, now = new Date()) {
  const normal = cents(row.normal_price);
  const normalPrice = normal === null ? null : normal / 100;
  if (Object.keys(validatePackagePricing(row)).length) return { price: normalPrice, normalPrice, status: 'invalid' };
  if (!discountFields.some(field => text(row[field]))) return { price: normalPrice, normalPrice, status: 'none' };
  const today = isoDay(now);
  const status = today < row.start_discount ? 'scheduled' : today > row.end_discount ? 'expired' : 'active';
  return { price: status === 'active' ? cents(row.discount_price) / 100 : normalPrice, normalPrice, status };
}
