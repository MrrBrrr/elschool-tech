/* Общий скрипт посадочных elschool.tech.
   Посадочная называет себя через data-landing на <body>:
   <body data-landing="3-klass"> - это значение уезжает в цель Метрики
   и в поле «источник» заявки, чтобы заявки с разных страниц не слиплись. */
(function () {
  document.documentElement.classList.replace('no-js', 'js');

  var LANDING = document.body.getAttribute('data-landing') || location.pathname;
  var COUNTER = 80492089;
  var GOAL = 'elschool_tech_form_submit';
  var FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfmT63R-NLNBKdAzcj40ow7isV72Pcbb5f5rFr9dwrTy4YIGA/formResponse';
  var FIELD_NAME = 'entry.1100695434';
  var FIELD_PHONE = 'entry.419055877';
  var FIELD_SOURCE = 'entry.1850239562';

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

  /* Источник строкой: посадочная плюс метки. Уезжает вместе с заявкой в поле
     «источник», поэтому видно, откуда пришёл человек, без правки самой формы. */
  function sourceLine() {
    var l = attribution.last || {};
    var parts = [LANDING];
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
    var nameVal = leadForm.name.value.trim();
    var digits = leadForm.phone.value.replace(/\D/g, '');
    var phoneOk = (digits.length === 11 && (digits[0] === '7' || digits[0] === '8'))
               || (digits.length === 10 && digits[0] === '9');

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
      if (typeof ym === 'function') {
        var last = attribution.last || {};
        ym(COUNTER, 'reachGoal', GOAL, {
          landing: LANDING,
          utm_source: last.utm_source || '(none)',
          utm_medium: last.utm_medium || '(none)',
          utm_campaign: last.utm_campaign || '(none)',
          utm_content: last.utm_content || '(none)',
          utm_term: last.utm_term || '(none)',
          referrer: last.referrer || '(direct)'
        });
      }
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
