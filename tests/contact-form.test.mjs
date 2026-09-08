import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/scripts/contact-form.js', import.meta.url), 'utf8').replace('export function', 'function');
function fixture(fetchImpl) {
  const handlers = {};
  const fields = Object.fromEntries(['name', 'email', 'company', 'message', '_gotcha'].map(name => [name, {
    value: name === '_gotcha' ? '' : 'Test', error: '',
    setCustomValidity(value) { this.error = value; }, addEventListener() {},
  }]));
  const status = { dataset: {}, textContent: '' };
  const button = { disabled: false, textContent: 'Send message' };
  const secure = { hidden: true, addEventListener(type, fn) { this.click = fn; } };
  let calls = 0;
  const form = {
    action: 'https://formspree.io/f/moeqpkyz',
    elements: { namedItem: name => fields[name] },
    querySelector: selector => selector === '#form-status' ? status : selector === '#secure-submit' ? secure : button,
    addEventListener(type, fn) { handlers[type] = fn; },
    reportValidity: () => Object.values(fields).every(field => !field.error),
    reset() { this.resets = (this.resets || 0) + 1; },
    setAttribute() {}, removeAttribute() {},
    requestSubmit() { const event = { preventDefault() { this.prevented = true; } }; handlers.submit(event); this.native = !event.prevented; },
  };
  vm.runInNewContext(source + '\nsetupContactForm(form);', {
    form, AbortController, setTimeout: fn => { form.timeout = fn; return 1; }, clearTimeout() {},
    FormData: class { constructor() { this.fields = Object.keys(fields); } },
    fetch: (...args) => { calls++; return fetchImpl(...args); },
  });
  return { form, fields, status, button, secure, calls: () => calls, submit: () => handlers.submit({ preventDefault() {} }) };
}

test('success posts form data to the ID endpoint and resets once', async () => {
  const f = fixture(async (url, options) => {
    assert.match(url, /^https:\/\/formspree.io\/f\//);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Accept, 'application/json');
    assert.deepEqual(Array.from(options.body.fields), ['name', 'email', 'company', 'message', '_gotcha']);
    return { ok: true };
  });
  await f.submit();
  assert.equal(f.form.resets, 1);
  assert.equal(f.status.dataset.state, 'success');
  assert.equal(f.button.disabled, false);
});

test('HTTP failures preserve content and enable hosted verification; rate limits ask to wait', async () => {
  for (const code of [400, 403, 422, 429, 500]) {
    const f = fixture(async () => ({ ok: false, status: code }));
    await f.submit();
    assert.equal(f.form.resets, undefined);
    assert.equal(f.fields.message.value, 'Test');
    assert.equal(f.status.dataset.state, 'error');
    assert.equal(f.secure.hidden, code === 429);
    assert.equal(f.button.disabled, false);
  }
});

test('offline and timed-out submissions restore controls without claiming delivery', async () => {
  const offline = fixture(async () => { throw new Error('offline'); });
  await offline.submit();
  assert.match(offline.status.textContent, /could not be confirmed/);
  assert.equal(offline.form.resets, undefined);
  assert.equal(offline.button.disabled, false);
  const timed = fixture((url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')))));
  const pending = timed.submit();
  timed.form.timeout();
  await pending;
  assert.equal(timed.status.dataset.state, 'error');
  assert.equal(timed.button.disabled, false);
});

test('duplicate submissions are blocked during a pending request', async () => {
  let finish;
  const f = fixture(() => new Promise(resolve => { finish = resolve; }));
  const pending = f.submit();
  assert.equal(f.button.disabled, true);
  await f.submit();
  assert.equal(f.calls(), 1);
  finish({ ok: true });
  await pending;
});

test('whitespace, honeypot, and invalid endpoint never send', async () => {
  for (const kind of ['name', 'message', 'honeypot', 'endpoint']) {
    const f = fixture(async () => ({ ok: true }));
    if (kind === 'honeypot') f.fields._gotcha.value = 'spam';
    else if (kind === 'endpoint') f.form.action = 'https://example.invalid/';
    else f.fields[kind].value = '   ';
    await f.submit();
    assert.equal(f.calls(), 0);
  }
});

test('hosted fallback uses normal validated submission', async () => {
  const f = fixture(async () => ({ ok: false, status: 403 }));
  await f.submit();
  f.secure.click();
  assert.equal(f.form.native, true);
  assert.equal(f.calls(), 1);
});

test('built HTML has native validation, accessible feedback, and no email literals', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /action="https:\/\/formspree.io\/f\/moeqpkyz"/);
  for (const id of ['name', 'email', 'message']) assert.match(html, new RegExp('<(?:input|textarea)[^>]*id="' + id + '"[^>]*required'));
  assert.doesNotMatch(html.match(/<input[^>]*id="company"[^>]*>/)[0], /required/);
  assert.match(html, /type="email"/);
  assert.match(html, /name="_gotcha"/);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /mailto:|[\w.%+-]+@[\w.-]+\.[a-z]{2,}/i);
});
