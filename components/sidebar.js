/**
 * components/sidebar.js
 * Manages the left slide thumbnail sidebar.
 * Uses Sortable.js for drag-and-drop reordering.
 */

const Sidebar = (() => {

  let listEl        = null;
  let sortable      = null;
  let slides        = [];
  let activeIndex   = 0;

  let onSlideSelect  = () => {};
  let onSlideReorder = () => {};
  let onSlideDelete  = () => {};
  let onSlideDup     = () => {};

  const THUMB_W = 188; // thumbnail inner width (sidebar width minus padding)
  const SLIDE_W = 960;
  const SLIDE_H = 540;
  const SCALE   = THUMB_W / SLIDE_W;

  /* ── Init ─────────────────────────────────────────────────── */
  function init(callbacks = {}) {
    listEl = document.getElementById('slide-list');
    onSlideSelect  = callbacks.onSlideSelect  || onSlideSelect;
    onSlideReorder = callbacks.onSlideReorder || onSlideReorder;
    onSlideDelete  = callbacks.onSlideDelete  || onSlideDelete;
    onSlideDup     = callbacks.onSlideDup     || onSlideDup;

    // Drag-and-drop with Sortable.js
    sortable = Sortable.create(listEl, {
      animation:  150,
      ghostClass: 'sortable-ghost',
      dragClass:  'sortable-drag',
      onEnd(evt) {
        onSlideReorder(evt.oldIndex, evt.newIndex);
      },
    });
  }

  /* ── Render all thumbnails ────────────────────────────────── */
  function render(slidesData, currentIndex) {
    slides      = slidesData;
    activeIndex = currentIndex;
    listEl.innerHTML = '';

    slides.forEach((slide, idx) => {
      listEl.appendChild(_buildThumb(slide, idx));
    });
  }

  /* ── Update only the active indicator ────────────────────── */
  function setActive(index) {
    activeIndex = index;
    listEl.querySelectorAll('.slide-thumb').forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });
  }

  /* ── Rebuild a single thumbnail (after edits) ─────────────── */
  function refreshThumb(index, slide) {
    const thumbs = listEl.querySelectorAll('.slide-thumb');
    if (!thumbs[index]) return;
    const newThumb = _buildThumb(slide, index);
    listEl.replaceChild(newThumb, thumbs[index]);
    newThumb.classList.toggle('active', index === activeIndex);
  }

  /* ── Add a single thumb at the end ───────────────────────── */
  function addThumb(slide, index) {
    const thumb = _buildThumb(slide, index);
    listEl.appendChild(thumb);
    // Re-number all
    _renumber();
  }

  /* ── Remove a thumb ──────────────────────────────────────── */
  function removeThumb(index) {
    const thumbs = listEl.querySelectorAll('.slide-thumb');
    if (thumbs[index]) thumbs[index].remove();
    _renumber();
  }

  /* ── Build a thumbnail DOM node ──────────────────────────── */
  function _buildThumb(slide, idx) {
    const wrap = document.createElement('div');
    wrap.className   = 'slide-thumb' + (idx === activeIndex ? ' active' : '');
    wrap.dataset.idx = idx;

    // Header: slide number + action buttons
    const header = document.createElement('div');
    header.className = 'thumb-header';

    const num = document.createElement('span');
    num.className   = 'thumb-num';
    num.textContent = idx + 1;

    const actions = document.createElement('div');
    actions.className = 'thumb-actions';

    const dupBtn = document.createElement('button');
    dupBtn.className   = 'thumb-action-btn';
    dupBtn.title       = 'Duplicate';
    dupBtn.textContent = '⧉';
    dupBtn.addEventListener('click', e => { e.stopPropagation(); onSlideDup(idx); });

    const delBtn = document.createElement('button');
    delBtn.className   = 'thumb-action-btn danger';
    delBtn.title       = 'Delete';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', e => { e.stopPropagation(); onSlideDelete(idx); });

    actions.append(dupBtn, delBtn);
    header.append(num, actions);

    // Mini preview
    const preview = document.createElement('div');
    preview.className = 'thumb-preview';

    const inner = document.createElement('div');
    inner.className = 'thumb-preview-inner';
    inner.style.cssText = `
      background: ${slide.background || '#ffffff'};
      width: ${SLIDE_W}px;
      height: ${SLIDE_H}px;
      transform: scale(${SCALE});
      transform-origin: top left;
    `;

    // Render elements inside thumbnail
    (slide.elements || []).forEach(el => {
      const node = ElementFactory.buildDOM(el);
      // Thumbnails are non-interactive
      node.style.pointerEvents = 'none';
      inner.appendChild(node);
    });

    preview.appendChild(inner);
    wrap.append(header, preview);

    wrap.addEventListener('click', () => onSlideSelect(idx));

    return wrap;
  }

  /* ── Re-number all thumbs after reorder / delete ─────────── */
  function _renumber() {
    listEl.querySelectorAll('.slide-thumb .thumb-num').forEach((el, i) => {
      el.textContent = i + 1;
    });
    listEl.querySelectorAll('.slide-thumb').forEach((el, i) => {
      el.dataset.idx = i;
    });
  }

  return { init, render, setActive, refreshThumb, addThumb, removeThumb };
})();
