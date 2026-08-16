/* Калькулятор учебного года. Считает то, что семья уже тратит сейчас,
   и показывает разницу с полным днём в школе. Ничего не отправляет сам:
   контакт - отдельное осознанное действие в форме ниже. */
(function () {
  var FIELDS = ['prodlenka', 'repetitor', 'kruzhki', 'pitanie', 'doroga'];
  var YEAR_FIELDS = ['lager'];
  var MONTHS = 10;           /* учебный год, сентябрь-июнь */
  var OUR_MONTH = 56000;     /* тариф без школьного транспорта, канон 2026/27 */

  var form = document.getElementById('calcForm');
  if (!form) return;

  var outMonth = document.getElementById('outMonth');
  var outYear = document.getElementById('outYear');
  var outDiff = document.getElementById('outDiff');
  var outWord = document.getElementById('outWord');
  var result = document.getElementById('calcResult');

  function num(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    var v = parseInt(String(el.value).replace(/\s/g, ''), 10);
    return isNaN(v) || v < 0 ? 0 : v;
  }

  function money(n) {
    return n.toLocaleString('ru-RU') + ' ₽';
  }

  function recalc() {
    var perMonth = 0;
    FIELDS.forEach(function (f) { perMonth += num(f); });

    var perYearExtra = 0;
    YEAR_FIELDS.forEach(function (f) { perYearExtra += num(f); });

    var year = perMonth * MONTHS + perYearExtra;
    var monthAvg = Math.round(year / MONTHS);

    outMonth.textContent = money(monthAvg);
    outYear.textContent = money(year);

    var diff = OUR_MONTH - monthAvg;
    if (diff > 0) {
      outWord.textContent = 'Разница с полным днём в Ель School';
      outDiff.textContent = money(diff) + ' в месяц';
    } else {
      outWord.textContent = 'Вы уже тратите больше, чем стоит полный день в Ель School';
      outDiff.textContent = money(Math.abs(diff)) + ' в месяц';
    }

    result.hidden = (monthAvg === 0 && perYearExtra === 0);
  }

  form.addEventListener('input', recalc);
  form.addEventListener('submit', function (e) { e.preventDefault(); recalc(); });
  recalc();
})();
