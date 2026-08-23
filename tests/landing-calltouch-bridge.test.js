'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const {
  createCallbackRequest,
  normalisePhone,
} = require('../assets/calltouch-bridge.js');

function createLandingHarness(ctw, bridge) {
  const root = path.resolve(__dirname, '..');
  const landing = fs.readFileSync(path.join(root, 'assets', 'landing.js'), 'utf8');
  const formFields = [];
  const goals = [];
  const requests = [];
  const timers = [];
  let now = 0;
  let submitHandler;

  const button = { disabled: false, textContent: '' };
  const note = { textContent: '' };
  const consent = { checked: true, focus() {} };
  const form = {
    name: { value: 'Тест' },
    phone: { value: '+7 900 000-00-00' },
    addEventListener(type, listener) {
      if (type === 'submit') submitHandler = listener;
    },
    querySelector(selector) {
      return selector === 'button' ? button : null;
    },
    reset() {},
  };
  const elements = {
    leadCompany: { value: '' },
    leadConsent: consent,
    leadForm: form,
    leadNote: note,
  };
  const FakeDate = function () { return new Date(0); };
  FakeDate.now = function () { return now; };
  const sandbox = {
    Date: FakeDate,
    FormData: class {
      append(name, value) { formFields.push({ name, value }); }
    },
    URLSearchParams,
    clearTimeout(id) { timers[id - 1].cancelled = true; },
    document: {
      addEventListener() {},
      body: { getAttribute() { return 'test'; } },
      documentElement: { classList: { replace() {} } },
      getElementById(id) { return elements[id] || null; },
      referrer: '',
    },
    fetch(url, init) {
      requests.push({ url, method: init.method });
      return Promise.resolve({ ok: true });
    },
    localStorage: { getItem() { return null; }, setItem() {} },
    location: { pathname: '/', search: '' },
    setTimeout(fn, ms) {
      timers.push({ cancelled: false, fn, ms });
      return timers.length;
    },
    window: {
      ElSchoolCalltouchBridge: bridge || { createCallbackRequest },
      ctw,
    },
    ym(_counter, _command, goal) { goals.push(goal); },
  };

  vm.runInNewContext(landing, sandbox, { filename: 'assets/landing.js' });
  now = 3000;

  return {
    formFields,
    goals,
    requests,
    runNextTimer() {
      const timer = timers.find((candidate) => !candidate.cancelled);
      assert.ok(timer, 'expected a scheduled timer');
      timer.cancelled = true;
      timer.fn();
    },
    setCalltouch(value) { sandbox.window.ctw = value; },
    submit() { submitHandler({ preventDefault() {} }); },
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

test('normalisePhone converts accepted Russian input to Calltouch format', () => {
  assert.equal(normalisePhone('+7 900 000-00-00'), '79000000000');
  assert.equal(normalisePhone('8 (900) 000-00-00'), '79000000000');
  assert.equal(normalisePhone('900 000-00-00'), '79000000000');
  assert.equal(normalisePhone('900'), null);
  assert.equal(normalisePhone('611 000-00-00'), null);
});

test('createCallbackRequest uses the verified route key and resolves only after Calltouch accepts it', async () => {
  const requests = [];
  const ctw = {
    createRequest(routeKey, phone, fields, callback) {
      requests.push({ routeKey, phone, fields, callback });
    },
  };

  const outcome = createCallbackRequest({
    ctw,
    routeKey: 'el.school',
    phone: '+7 900 000-00-00',
  });

  assert.equal(requests.length, 1);
  assert.deepEqual(
    { routeKey: requests[0].routeKey, phone: requests[0].phone, fields: requests[0].fields },
    { routeKey: 'el.school', phone: '79000000000', fields: [] },
  );

  requests[0].callback(true, { callbackRequestId: 'synthetic' });
  assert.deepEqual(await outcome, { status: 'created' });
});

test('createCallbackRequest never reports a rejected or unavailable request as created', async () => {
  const rejected = await createCallbackRequest({
    ctw: { createRequest(_routeKey, _phone, _fields, callback) { callback(false, {}); } },
    routeKey: 'el.school',
    phone: '+7 900 000-00-00',
  });
  assert.deepEqual(rejected, { status: 'rejected' });

  const unavailable = await createCallbackRequest({
    ctw: null,
    routeKey: 'el.school',
    phone: '+7 900 000-00-00',
  });
  assert.deepEqual(unavailable, { status: 'unavailable' });
});

test('createCallbackRequest times out without a provider callback', async () => {
  const outcome = await Promise.race([
    createCallbackRequest({
      ctw: { createRequest() {} },
      routeKey: 'el.school',
      phone: '+7 900 000-00-00',
      callbackTimeoutMs: 1,
    }),
    new Promise((resolve) => setTimeout(() => resolve('still-pending'), 25)),
  ]);

  assert.deepEqual(outcome, { status: 'timeout' });
});

test('landing waits for a late Calltouch API then emits only the confirmed widget goal', async () => {
  const calltouchRequests = [];
  const harness = createLandingHarness(undefined);

  harness.submit();
  await flushPromises();
  assert.deepEqual(harness.goals, ['elschool_tech_form_submit']);
  assert.equal(harness.requests.length, 1);
  assert.deepEqual(harness.formFields.slice(0, 2), [
    { name: 'entry.1100695434', value: 'Тест' },
    { name: 'entry.419055877', value: '+79000000000' },
  ]);

  harness.setCalltouch({
    createRequest(routeKey, phone, fields, callback) {
      calltouchRequests.push({ fields, phone, routeKey });
      callback(true, { callbackRequestId: 'synthetic' });
    },
  });
  harness.runNextTimer();
  await flushPromises();

  assert.deepEqual(calltouchRequests, [{ fields: [], phone: '79000000000', routeKey: 'el.school' }]);
  assert.deepEqual(harness.goals, ['elschool_tech_form_submit', 'widget-calltouch']);
  assert.equal(harness.goals.includes('form-calltouch'), false);
});

test('landing does not emit the widget goal when Calltouch rejects the request', async () => {
  const harness = createLandingHarness({
    createRequest(_routeKey, _phone, _fields, callback) { callback(false, {}); },
  });

  harness.submit();
  await flushPromises();

  assert.deepEqual(harness.goals, ['elschool_tech_form_submit']);
});

test('landing does not emit the widget goal when Calltouch never responds', async () => {
  let requestCount = 0;
  const harness = createLandingHarness(
    { createRequest() { requestCount += 1; } },
    {
      createCallbackRequest(options) {
        return createCallbackRequest({ ...options, callbackTimeoutMs: 1 });
      },
    },
  );

  harness.submit();
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(harness.goals, ['elschool_tech_form_submit']);
  assert.equal(requestCount, 1);
});

test('landing stops waiting after the bounded Calltouch availability window', async () => {
  const harness = createLandingHarness(undefined);

  harness.submit();
  await flushPromises();
  for (let attempt = 0; attempt < 8; attempt += 1) harness.runNextTimer();

  assert.throws(() => harness.runNextTimer(), /expected a scheduled timer/);
  assert.deepEqual(harness.goals, ['elschool_tech_form_submit']);
});

test('landing wires the verified Calltouch route to widget-calltouch only after provider acceptance', () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const landing = fs.readFileSync(path.join(root, 'assets', 'landing.js'), 'utf8');

  assert.match(html, /assets\/calltouch-bridge\.js/);
  assert.match(landing, /CALLTOUCH_ROUTE_KEY\s*=\s*'el\.school'/);
  assert.match(landing, /function registerCalltouchRequest\(phone, attemptsRemaining\)/);
  assert.match(landing, /setTimeout\(function \(\) \{\s*registerCalltouchRequest\(phone, attemptsRemaining - 1\);/);
  assert.match(landing, /createCallbackRequest\(/);
  assert.match(landing, /outcome\.status\s*===\s*'created'/);
  assert.match(landing, /reachGoal\(CALLTOUCH_WIDGET_GOAL,/);
  assert.doesNotMatch(landing, /reachGoal\(['"]form-calltouch['"]\)/);
});
