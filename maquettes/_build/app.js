/* MOTIQ — comportements partagés des maquettes (Phase 1)
   Volontairement minimal : thème, groupes de choix, animation de génération.
   Tout est inerte si `prefers-reduced-motion` est actif (voir le CSS). */

(function () {
  var root = document.documentElement;
  var KEY = 'motiq-theme';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Thème : sombre par défaut, choix mémorisé (§9.1) --- */
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  root.setAttribute('data-theme', saved || 'dark');

  function mountThemeButton() {
    var b = document.getElementById('theme');
    if (!b) return;
    var sync = function () {
      var dark = root.getAttribute('data-theme') === 'dark';
      b.textContent = dark ? 'Clair' : 'Sombre';
      b.setAttribute('aria-label', dark ? 'Passer en mode clair' : 'Passer en mode sombre');
    };
    b.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      sync();
    });
    sync();
  }

  /* --- Groupes de choix exclusifs (chips de filtre, galerie de templates) --- */
  function mountGroups() {
    document.querySelectorAll('[data-group]').forEach(function (g) {
      var single = g.getAttribute('data-group') !== 'multi';
      g.addEventListener('click', function (ev) {
        var el = ev.target.closest('[aria-pressed]');
        if (!el || !g.contains(el)) return;
        if (single) {
          g.querySelectorAll('[aria-pressed="true"]').forEach(function (o) {
            if (o !== el) o.setAttribute('aria-pressed', 'false');
          });
          el.setAttribute('aria-pressed', 'true');
        } else {
          el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        }
      });
    });
  }

  /* --- Écran de génération : progression animée, pas une barre basique (§9.2) --- */
  function mountGeneration() {
    var wrap = document.querySelector('[data-gen]');
    if (!wrap) return;
    var pctEl = wrap.querySelector('[data-pct]');
    var steps = wrap.querySelectorAll('.step');
    var total = 9000, t0 = performance.now(), target = 100;

    if (reduce) { /* animation désactivée : on montre l'état final */
      if (pctEl) pctEl.textContent = target + '\u00A0%';
      steps.forEach(function (s) { s.classList.remove('now'); s.classList.add('done'); });
      return;
    }

    function frame(now) {
      var p = Math.min(1, (now - t0) / total);
      var eased = 1 - Math.pow(1 - p, 2.2);
      if (pctEl) pctEl.textContent = Math.round(eased * target) + '\u00A0%';
      steps.forEach(function (s, i) {
        var at = (i + 1) / (steps.length + 0.6);
        s.classList.toggle('done', eased >= at);
        s.classList.toggle('now', eased < at && eased >= (i) / (steps.length + 0.6));
      });
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener('DOMContentLoaded', function () {
    mountThemeButton(); mountGroups(); mountGeneration();
  });
})();
