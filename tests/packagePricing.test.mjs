import assert from 'node:assert/strict';
import test from 'node:test';
import { formatRupiahInput, getPackagePricing, parseRupiahInput, validatePackagePricing } from '../src/packagePricing.mjs';

test('rupiah inputs group thousands and parse Indonesian decimals without changing amounts', () => {
  for (const [raw, display, stored] of [
    ['', '', ''],
    ['0', '0', '0'],
    ['40000', '40.000', '40000'],
    ['800000', '800.000', '800000'],
    ['800.000,50', '800.000,50', '800000.50'],
    ['400000,25', '400.000,25', '400000.25'],
    ['99999999,99', '99.999.999,99', '99999999.99'],
  ]) {
    assert.equal(formatRupiahInput(raw), display);
    assert.equal(parseRupiahInput(display), stored);
  }
  assert.equal(formatRupiahInput('800000,'), '800.000,', 'allow typing a decimal separator');
  for (const raw of ['abc', 'Rp800000', '800a', '1e3', '-1', '+1', '1,234', '1,,2']) {
    assert.equal(formatRupiahInput(raw), null, `reject nonnumeric or invalid input ${raw}`);
  }
  for (const raw of ['1e3', '-1', 'abc', '8.00', '1,234', '800,']) {
    assert.equal(parseRupiahInput(raw), null, `reject ambiguous/invalid amount ${raw}`);
  }
});

const promo = { normal_price: '500000.50', discount_price: '400000.25', start_discount: '2026-11-10', end_discount: '2026-11-12' };

test('package prices respect numeric(10,2), allow zero, and reject missing or malformed normal prices', () => {
  for (const normal_price of ['', null, undefined, '-1', 'NaN', 'Infinity', '1e3', '1.001', '100000000']) {
    assert.ok(validatePackagePricing({ normal_price }).normal_price, `reject ${normal_price}`);
  }
  for (const normal_price of ['0', '0.01', '99999999.99']) {
    assert.deepEqual(validatePackagePricing({ normal_price }), {});
  }
  assert.deepEqual(validatePackagePricing({ ...promo, discount_price: '0' }), {});
});

test('discounts require all three fields, a lower price, and a strictly later valid end date', () => {
  assert.deepEqual(validatePackagePricing(promo), {});
  for (const discount_price of ['500000.50', '600000', '-1', '1.001']) {
    assert.ok(validatePackagePricing({ ...promo, discount_price }).discount_price);
  }
  for (const field of ['discount_price', 'start_discount', 'end_discount']) {
    assert.ok(validatePackagePricing({ ...promo, [field]: '' })[field], `missing ${field}`);
  }
  for (const end_discount of ['2026-11-10', '2026-11-09', '2026-02-30', 'bad']) {
    assert.ok(validatePackagePricing({ ...promo, end_discount }).end_discount);
  }
  assert.deepEqual(validatePackagePricing({ normal_price: '10', discount_price: '', start_discount: '', end_discount: '' }), {});
});

test('discount applies only within its inclusive WITA date window and expires without deleting history', () => {
  const original = { ...promo };
  for (const [instant, status, price] of [
    ['2026-11-09T15:59:59.999Z', 'scheduled', 500000.50],
    ['2026-11-09T16:00:00.000Z', 'active', 400000.25],
    ['2026-11-12T15:59:59.999Z', 'active', 400000.25],
    ['2026-11-12T16:00:00.000Z', 'expired', 500000.50],
  ]) {
    const result = getPackagePricing(promo, new Date(instant));
    assert.equal(result.status, status);
    assert.equal(result.price, price);
  }
  assert.deepEqual(promo, original);
});

test('incomplete or corrupt stored discounts never become the effective price', () => {
  const now = new Date('2026-11-11T00:00:00Z');
  for (const overrides of [{ end_discount: null }, { discount_price: '600000' }, { start_discount: 'bad' }]) {
    const result = getPackagePricing({ ...promo, ...overrides }, now);
    assert.equal(result.status, 'invalid');
    assert.equal(result.price, 500000.50);
  }
  assert.equal(getPackagePricing({}, now).price, null, 'legacy packages must not acquire an invented price');
  assert.equal(getPackagePricing({ normal_price: 0 }, now).price, 0);
});
