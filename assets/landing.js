/* Общий скрипт посадочных elschool.tech.
   Посадочная называет себя через data-landing на <body>:
   <body data-landing="3-klass"> - это значение уезжает в цель Метрики
   и в поле «источник» заявки, чтобы заявки с разных страниц не слиплись. */
(function () {
  document.documentElement.classList.replace('no-js', 'js');

  var LANDING = document.body.getAttribute('data-landing') || location.pathname;
  var FORM_NAME = 'elschool-tech/' + LANDING;
  var COUNTER = 111777976;
  var FORM_GOAL = 'elschool_tech_form_submit';
  var PHONE_GOAL = 'elschool_tech_phone_click';
  var CALLTOUCH_WIDGET_GOAL = 'widget-calltouch';
  var CALLTOUCH_ROUTE_KEY = 'el.school';

  /* ===== приёмник заявки =====
     ЕДИНСТВЕННАЯ точка, где задан адрес получателя. Переезд на форму amoCRM
     меняется здесь и больше нигде: остальной код работает с полями name/phone/source. */
  var FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfmT63R-NLNBKdAzcj40ow7isV72Pcbb5f5rFr9dwrTy4YIGA/formResponse';
  var FIELD_NAME = 'entry.1100695434';
  var FIELD_PHONE = 'entry.419055877';
  var FIELD_SOURCE = 'entry.1850239562';

  /* Форма открыта в этот момент. Человеку нужно время на заполнение, боту - нет. */
  var OPENED_AT = Date.now();
  var MIN_FILL_MS = 2500;

  /* ===== атрибуция: первый и последний входящий канал ===== */
  var ATTRIBUTION_KEY = 'elschoolTechAttributionV1';
  var ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
                          'utm_term', 'yclid', 'gclid', 'fbclid'];

  function attributionSnapshot() {
    var query = new URLSearchParams(location.search);
    var touch = {
      landing_path: location.pathname,
      referrer: document.referrer || '(direct)',
      captured_at: new Date().toISOString()
    };
    ATTRIBUTION_KEYS.forEach(function (key) {
      if (query.get(key)) touch[key] = query.get(key);
    });
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || '{}'); } catch (e) {}
    var next = { first: saved.first || touch, last: touch };
    try { localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  var attribution = attributionSnapshot();

  function reachGoal(goal, params) {
    if (typeof ym === 'function') ym(COUNTER, 'reachGoal', goal, params);
  }

  function registerCalltouchRequest(phone, attemptsRemaining) {
    var bridge = window.ElSchoolCalltouchBridge;

    if (!bridge || typeof bridge.createCallbackRequest !== 'function') return;

    if (!window.ctw || typeof window.ctw.createRequest !== 'function') {
      if (attemptsRemaining > 0) {
        setTimeout(function () {
          registerCalltouchRequest(phone, attemptsRemaining - 1);
        }, 250);
      }
      return;
    }

    bridge.createCallbackRequest({
      ctw: window.ctw,
      routeKey: CALLTOUCH_ROUTE_KEY,
      phone: phone
    }).then(function (outcome) {
      if (outcome.status === 'created') {
        reachGoal(CALLTOUCH_WIDGET_GOAL, { landing: LANDING });
      }
    });
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    var phoneLink = target && target.closest
      ? target.closest('a[href^="tel:"]')
      : null;

    if (phoneLink) reachGoal(PHONE_GOAL, { landing: LANDING });
  });

  /* Источник строкой: посадочная плюс метки. Уезжает вместе с заявкой в поле
     «источник», поэтому видно, откуда пришёл человек, без правки самой формы. */
  function sourceLine() {
    var l = attribution.last || {};
    var parts = [FORM_NAME];
    if (l.utm_source)   parts.push('src=' + l.utm_source);
    if (l.utm_medium)   parts.push('med=' + l.utm_medium);
    if (l.utm_campaign) parts.push('camp=' + l.utm_campaign);
    if (l.utm_content)  parts.push('cont=' + l.utm_content);
    if (l.utm_term)     parts.push('term=' + l.utm_term);
    if (l.yclid)        parts.push('yclid=' + l.yclid);
    if (parts.length === 1) parts.push('ref=' + (l.referrer || '(direct)'));
    return parts.join(' | ').slice(0, 900);
  }

  var leadForm = document.getElementById('leadForm');
  if (!leadForm) return;

  leadForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = leadForm.querySelector('button');
    var note = document.getElementById('leadNote');
    var honey = document.getElementById('leadCompany');
    var consent = document.getElementById('leadConsent');
    var nameVal = leadForm.name.value.trim();
    var digits = leadForm.phone.value.replace(/\D/g, '');
    var phoneOk = (digits.length === 11 && (digits[0] === '7' || digits[0] === '8'))
               || (digits.length === 10 && digits[0] === '9');

    /* Бот заполняет все поля подряд и отправляет мгновенно. Человек - нет.
       Ответ ему показываем обычный: пусть считает, что заявка ушла. */
    if ((honey && honey.value) || (Date.now() - OPENED_AT) < MIN_FILL_MS) {
      btn.disabled = true;
      btn.textContent = 'Заявка отправлена';
      note.textContent = 'Спасибо! Перезвоним в рабочее время.';
      return;
    }

    /* Согласие обязательно: без него сбор телефона незаконен (152-ФЗ). */
    if (consent && !consent.checked) {
      note.textContent = 'Отметьте согласие на обработку данных - без него мы не вправе вам перезвонить.';
      consent.focus();
      return;
    }

    if (nameVal.length < 2) {
      note.textContent = 'Подскажите имя - как к вам обращаться?';
      leadForm.name.focus();
      return;
    }
    if (!phoneOk) {
      note.textContent = 'Проверьте телефон: нужен номер вида +7 900 000-00-00 - иначе не сможем перезвонить.';
      leadForm.phone.focus();
      return;
    }

    var phoneNorm = '+7' + (digits.length === 11 ? digits.slice(1) : digits);
    var fd = new FormData();
    fd.append(FIELD_NAME, nameVal);
    fd.append(FIELD_PHONE, phoneNorm);
    fd.append(FIELD_SOURCE, sourceLine());

    btn.disabled = true;
    btn.textContent = 'Отправляем…';

    fetch(FORM_URL, { method: 'POST', mode: 'no-cors', body: fd }).then(function () {
      var last = attribution.last || {};
      reachGoal(FORM_GOAL, {
        landing: LANDING,
        utm_source: last.utm_source || '(none)',
        utm_medium: last.utm_medium || '(none)',
        utm_campaign: last.utm_campaign || '(none)',
        utm_content: last.utm_content || '(none)',
        utm_term: last.utm_term || '(none)',
        referrer: last.referrer || '(direct)'
      });
      registerCalltouchRequest(phoneNorm, 8);
      btn.textContent = 'Заявка отправлена';
      note.textContent = 'Спасибо! Перезвоним в рабочее время. Если срочно - 388-74-02.';
      leadForm.reset();
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = 'Записаться';
      note.textContent = 'Не получилось отправить - позвоните нам: 388-74-02.';
    });
  });
})();
