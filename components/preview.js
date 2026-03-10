/**
 * components/preview.js
 * Fullscreen slideshow preview mode.
 */

const Preview = (() => {

  let slides        = [];
  let currentIndex  = 0;

  let overlayEl     = null;
  let slideEl       = null;
  let counterEl     = null;

  /* ── Init ─────────────────────────────────────────────────── */
  function init() {
    overlayEl = document.getElementById('preview-overlay');
    slideEl   = document.getElementById('preview-slide');
    counterEl = document.getElementById('preview-counter');

    document.getElementById('prev-slide-btn').addEventListener('click', prev);
    document.getElementById('next-slide-btn').addEventListener('click', next);
    document.getElementById('exit-preview-btn').addEventListener('click', exit);

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (overlayEl.classList.contains('hidden')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev();
      if (e.key === 'Escape') exit();
    });
  }

  /* ── Enter preview ────────────────────────────────────────── */
  function enter(slidesData, startIndex = 0) {
    slides       = slidesData;
    currentIndex = Math.max(0, Math.min(startIndex, slides.length - 1));

    overlayEl.classList.remove('hidden');
    _renderCurrentSlide();
  }

  /* ── Exit ─────────────────────────────────────────────────── */
  function exit() {
    overlayEl.classList.add('hidden');
    slideEl.innerHTML = '';
  }

  /* ── Navigation ──────────────────────────────────────────── */
  function next() {
    if (currentIndex < slides.length - 1) {
      currentIndex++;
      _renderCurrentSlide();
    }
  }
  function prev() {
    if (currentIndex > 0) {
      currentIndex--;
      _renderCurrentSlide();
    }
  }

  /* ── Render current slide into the preview panel ─────────── */
  function _renderCurrentSlide() {
    const slide = slides[currentIndex];
    if (!slide) return;

    // Scale to fit the window while preserving 16:9
    const maxW = window.innerWidth  - 48;
    const maxH = window.innerHeight - 120;
    const scale = Math.min(maxW / 960, maxH / 540);
    const w = Math.round(960 * scale);
    const h = Math.round(540 * scale);

    slideEl.style.width      = w + 'px';
    slideEl.style.height     = h + 'px';
    slideEl.style.background = slide.background || '#ffffff';
    slideEl.innerHTML        = '';

    // Inner scaler so element px positions remain correct
    const inner = document.createElement('div');
    inner.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 960px; height: 540px;
      transform: scale(${scale});
      transform-origin: top left;
      pointer-events: none;
    `;

    (slide.elements || []).forEach(el => {
      const node = ElementFactory.buildDOM(el);
      node.style.pointerEvents = 'none';
      inner.appendChild(node);
    });

    slideEl.appendChild(inner);

    counterEl.textContent = `${currentIndex + 1} / ${slides.length}`;
  }

  return { init, enter, exit };
})();
