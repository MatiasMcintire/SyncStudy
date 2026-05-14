/* ==========================================================
   SyncStudy — microinteracciones visuales
   Seguro: no modifica datos ni lógica; solo gestiona efectos UI.
   ========================================================== */
(function () {
  const interactiveSelector = '.btn, .btn-icon, .nav-item, .switch-btn, .task-item, .peer-card, .member-card, .weekly-card, .cal-day, .cal-month__day';

  function updatePointerGlow(event) {
    const target = event.target.closest(interactiveSelector);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    target.style.setProperty('--x', `${event.clientX - rect.left}px`);
    target.style.setProperty('--y', `${event.clientY - rect.top}px`);
  }

  function addPressFeedback(event) {
    const target = event.target.closest(interactiveSelector);
    if (!target) return;
    target.classList.add('is-pressing');
    window.setTimeout(() => target.classList.remove('is-pressing'), 180);
  }

  function observeDynamicCards() {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    const attach = () => {
      document.querySelectorAll('.task-item, .peer-card, .member-card, .weekly-card, .cal-day, .cal-month__day')
        .forEach((el) => observer.observe(el));
    };

    attach();

    const mutationObserver = new MutationObserver(() => attach());
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('pointermove', updatePointerGlow, { passive: true });
  document.addEventListener('pointerdown', addPressFeedback, { passive: true });
  window.addEventListener('load', observeDynamicCards);
})();
