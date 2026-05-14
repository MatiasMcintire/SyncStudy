/* ==========================================================
   SyncStudy — Animaciones sobrias y seguras
   Solo agrega clases/estilos visuales. No toca datos ni lógica.
   ========================================================== */
(function () {
  const animatedSelector = [
    '.task-item',
    '.peer-card',
    '.member-card',
    '.weekly-card',
    '.cal-day',
    '.cal-month__day',
    '.group__stat',
    '.hero__group-progress'
  ].join(',');

  const interactiveSelector = [
    '.btn',
    '.btn-icon',
    '.nav-item',
    '.switch-btn',
    '.task-item',
    '.peer-card',
    '.member-card',
    '.weekly-card',
    '.cal-day',
    '.cal-month__day'
  ].join(',');

  function markReady() {
    requestAnimationFrame(() => document.body.classList.add('ui-ready'));
  }

  function setPointerPosition(event) {
    const target = event.target.closest(interactiveSelector);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    target.style.setProperty('--x', `${event.clientX - rect.left}px`);
    target.style.setProperty('--y', `${event.clientY - rect.top}px`);
  }

  function pressFeedback(event) {
    const target = event.target.closest(interactiveSelector);
    if (!target) return;

    target.classList.add('is-pressing');
    window.setTimeout(() => target.classList.remove('is-pressing'), 170);
  }

  function animateExistingAndFutureElements() {
    const seen = new WeakSet();

    const reveal = (element) => {
      if (seen.has(element)) return;
      seen.add(element);
      element.classList.add('is-visible');
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.06, rootMargin: '0px 0px -28px 0px' });

      const attach = () => {
        document.querySelectorAll(animatedSelector).forEach((element) => {
          if (!seen.has(element)) observer.observe(element);
        });
      };

      attach();

      const mutationObserver = new MutationObserver(() => attach());
      mutationObserver.observe(document.body, { childList: true, subtree: true });
      return;
    }

    document.querySelectorAll(animatedSelector).forEach(reveal);
  }

  function animateViewChanges() {
    document.addEventListener('click', (event) => {
      const nav = event.target.closest('[data-view], .switch-btn, #prevPeriod, #nextPeriod');
      if (!nav) return;

      window.setTimeout(() => {
        document.querySelectorAll(animatedSelector).forEach((element) => {
          element.classList.remove('is-visible');
          void element.offsetWidth;
          element.classList.add('is-visible');
        });
      }, 90);
    });
  }

  document.addEventListener('pointermove', setPointerPosition, { passive: true });
  document.addEventListener('pointerdown', pressFeedback, { passive: true });
  window.addEventListener('DOMContentLoaded', () => {
    markReady();
    animateExistingAndFutureElements();
    animateViewChanges();
  });
})();
