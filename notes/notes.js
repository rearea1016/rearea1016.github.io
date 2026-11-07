// Research notes: same KO/EN switch as the portfolio (shares the saved choice).
(function () {
  function getLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'ko' || q === 'en') return q;
    try { return localStorage.getItem('lang') || 'en'; } catch (e) { return 'en'; }
  }
  function setLang(lang) {
    document.documentElement.lang = lang;
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }
  setLang(getLang());
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('lang');
    if (b) b.addEventListener('click', function () { setLang(document.documentElement.lang === 'ko' ? 'en' : 'ko'); });
    document.querySelectorAll('.doc a[href^="http"]').forEach(function (a) { a.target = '_blank'; a.rel = 'noreferrer'; });
  });
})();
