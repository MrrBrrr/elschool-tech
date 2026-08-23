(function (global, factory) {
  'use strict';

  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (global) {
    global.ElSchoolCalltouchBridge = api;
  }
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function normalisePhone(value) {
    var digits = String(value || '').replace(/\D/g, '');

    if (digits.length === 10 && digits.charAt(0) === '9') {
      return '7' + digits;
    }

    if (digits.length === 11 && (digits.charAt(0) === '7' || digits.charAt(0) === '8') && digits.charAt(1) === '9') {
      return '7' + digits.slice(1);
    }

    return null;
  }

  function createCallbackRequest(options) {
    var ctw = options && options.ctw;
    var routeKey = options && options.routeKey;
    var phone = normalisePhone(options && options.phone);
    var callbackTimeoutMs = options && options.callbackTimeoutMs;

    if (typeof callbackTimeoutMs !== 'number' || callbackTimeoutMs < 0) {
      callbackTimeoutMs = 5000;
    }

    if (!ctw || typeof ctw.createRequest !== 'function' || !routeKey || !phone) {
      return Promise.resolve({ status: 'unavailable' });
    }

    return new Promise(function (resolve) {
      var settled = false;
      var timeoutId = setTimeout(function () {
        finish('timeout');
      }, callbackTimeoutMs);

      function finish(status) {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve({ status: status });
        }
      }

      try {
        ctw.createRequest(routeKey, phone, [], function (success) {
          finish(success ? 'created' : 'rejected');
        });
      } catch (_error) {
        finish('error');
      }
    });
  }

  return {
    createCallbackRequest: createCallbackRequest,
    normalisePhone: normalisePhone,
  };
}));
