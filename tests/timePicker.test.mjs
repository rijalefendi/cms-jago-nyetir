import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSync } from 'esbuild';
import { JSDOM } from 'jsdom';

test('editable time dropdowns support direct selection, typing and independent cyclic navigation', async () => {
  const bundle = buildSync({
    stdin: {
      contents: `import React from 'react'; import { createRoot } from 'react-dom/client';
        import { TimePicker } from './src/TimePicker';
        createRoot(document.getElementById('root')).render(<form><fieldset>
          <TimePicker name="opening" aria-label="Jam buka" defaultValue="23:59" required />
        </fieldset></form>);`,
      resolveDir: process.cwd(), loader: 'tsx',
    },
    bundle: true, write: false, format: 'iife', platform: 'browser',
  }).outputFiles[0].text;
  const dom = new JSDOM('<div id="root"></div>', { runScripts: 'dangerously', pretendToBeVisual: true });
  try {
    dom.window.eval(bundle);
    const tick = () => new Promise(resolve => setTimeout(resolve, 30));
    await tick();
    const { document, Event, KeyboardEvent, HTMLInputElement, FormData } = dom.window;
    const picker = document.querySelector('.time-picker');
    const native = picker.querySelector('[name="opening"]');
    const hour = picker.querySelector('[aria-label="Jam buka: jam"]');
    const minute = picker.querySelector('[aria-label="Jam buka: menit"]');
    assert.ok(hour && minute, 'both segments are editable');
    const press = async (input, key) => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await tick();
    };
    const type = async (input, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await tick();
    };
    for (const value of ['ab', '1x', '-1', '1e', ' 7', '1.']) {
      await type(hour, value);
      assert.equal(hour.value, '23', `reject nonnumeric typing or paste: ${value}`);
      assert.equal(native.value, '23:59', 'rejected input leaves the saved value untouched');
    }
    await type(minute, 'x5');
    assert.equal(minute.value, '59', 'minute input rejects mixed text too');
    const checkScrollLoop = async (input, count) => {
      await type(input, '00');
      input.click();
      await tick();
      const list = picker.querySelector('.time-picker-list');
      const zero = list.querySelector('[role="option"][data-value="0"]');
      assert.equal(zero.previousElementSibling.textContent, String(count - 1).padStart(2, '0'), 'last value is immediately before zero visually');
      const last = list.querySelector(`[role="option"][data-value="${count - 1}"]`);
      assert.equal(last.nextElementSibling.textContent, '00', 'zero follows the last value visually');
      const initialScroll = list.scrollTop;
      assert.ok(initialScroll > 0, 'opening zero leaves room to scroll backward');
      list.scrollTop = 0;
      list.dispatchEvent(new Event('scroll'));
      assert.equal(list.scrollTop, count * 44, 'scrolling above zero wraps into the preceding cycle');
      list.scrollTop = count * 44 * 2;
      list.dispatchEvent(new Event('scroll'));
      assert.equal(list.scrollTop, count * 44, 'scrolling past the last value wraps into the next cycle');
      const previous = zero.previousElementSibling;
      previous.click();
      await tick();
      assert.equal(input.value, String(count - 1).padStart(2, '0'), 'wrapped value is clickable without traversing the full list');
    };
    await checkScrollLoop(hour, 24);
    assert.equal(native.value, '23:59', 'clicking a wrapped hour preserves minutes');
    await checkScrollLoop(minute, 60);
    assert.equal(native.value, '23:59', 'clicking a wrapped minute preserves hours');
    const choose = async (input, value, count) => {
      input.click();
      await tick();
      assert.equal(input.getAttribute('role'), 'combobox');
      assert.equal(input.getAttribute('aria-expanded'), 'true');
      assert.equal(picker.querySelectorAll('[role="option"]').length, count);
      picker.querySelector(`[role="option"][data-value="${value}"]`).click();
      await tick();
      assert.equal(input.getAttribute('aria-expanded'), 'false');
      assert.equal(document.activeElement, input);
    };
    await choose(hour, 0, 24);
    assert.equal(native.value, '00:59', 'hour wraps without changing minutes');
    await choose(hour, 23, 24);
    assert.equal(native.value, '23:59');
    await choose(minute, 0, 60);
    assert.equal(native.value, '23:00', 'minute wraps without changing hours');
    await choose(minute, 59, 60);
    assert.equal(native.value, '23:59');
    await press(minute, 'ArrowDown');
    assert.equal(document.getElementById(minute.getAttribute('aria-activedescendant')).textContent, '00');
    assert.equal(native.value, '23:59', 'navigation previews an option without committing it');
    await press(minute, 'Enter');
    assert.equal(native.value, '23:00', 'keyboard selection wraps minutes independently');
    await press(minute, 'ArrowUp');
    await press(minute, 'Enter');
    assert.equal(native.value, '23:59');
    await press(hour, 'ArrowDown');
    await press(hour, 'Enter');
    assert.equal(native.value, '00:59', 'keyboard selection wraps hours independently');
    await press(hour, 'ArrowUp');
    await press(hour, 'Enter');
    assert.equal(native.value, '23:59');
    minute.click();
    await tick();
    await press(minute, 'ArrowDown');
    await press(minute, 'Escape');
    assert.equal(native.value, '23:59', 'Escape does not commit the pending option');
    assert.equal(minute.getAttribute('aria-expanded'), 'false');
    await type(hour, '');
    assert.equal(hour.value, '', 'clearing a segment must not force it to zero');
    assert.equal(native.value, '');
    assert.equal(document.querySelector('form').checkValidity(), false);
    await type(hour, '7');
    await type(minute, '12');
    assert.equal(new FormData(document.querySelector('form')).get('opening'), '07:12');
    assert.equal(minute.getAttribute('aria-expanded'), 'true', 'manual entry keeps the full list available');
    assert.equal(picker.querySelectorAll('[role="option"]').length, 60, 'typing never filters out other allowed values');
    document.body.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true }));
    await tick();
    assert.equal(minute.getAttribute('aria-expanded'), 'false', 'outside pointer closes the list');
    const toggle = picker.querySelector('[aria-label="Pilih menit Jam buka"]');
    toggle.click();
    await tick();
    assert.equal(minute.getAttribute('aria-expanded'), 'true', 'chevron opens the same editable dropdown');
    toggle.click();
    await tick();
    assert.equal(minute.getAttribute('aria-expanded'), 'false', 'chevron also closes the dropdown');
    hour.focus();
    hour.click();
    await tick();
    minute.focus();
    document.querySelector('form').tabIndex = 0;
    document.querySelector('form').focus();
    await tick();
    assert.equal(hour.getAttribute('aria-expanded'), 'false', 'focus leaving the picker closes the list');
    await type(hour, '24');
    assert.equal(native.value, '', 'out-of-range typing cannot become a valid form value');
    assert.equal(document.querySelector('form').checkValidity(), false);
    await type(hour, '9');
    native.min = '10:00';
    assert.equal(native.validity.rangeUnderflow, true, 'native time bounds are preserved');
    native.removeAttribute('min');
    await press(hour, 'Tab');
    assert.equal(hour.getAttribute('aria-expanded'), 'false', 'Tab closes without trapping focus');
    assert.equal(native.value, '09:12');
    document.querySelector('form').reset();
    await tick();
    assert.equal(hour.value, '23');
    assert.equal(minute.value, '59');
    document.querySelector('fieldset').disabled = true;
    assert.ok([...picker.querySelectorAll('input,button')].every(control => control.matches(':disabled')));
    const before = native.value;
    await press(minute, 'ArrowDown');
    await press(minute, 'Enter');
    assert.equal(native.value, before, 'disabled controls cannot change the value');
  } finally {
    dom.window.close();
  }
});
