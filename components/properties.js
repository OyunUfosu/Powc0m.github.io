/**
 * components/properties.js
 * Manages the right properties panel.
 * Syncs form inputs with the selected element's data.
 */

const Properties = (() => {

  let onPropChange = () => {};

  /* ── Init ─────────────────────────────────────────────────── */
  function init(callbacks = {}) {
    onPropChange = callbacks.onPropChange || onPropChange;

    // Bind all property inputs
    const inputs = [
      'prop-x', 'prop-y', 'prop-w', 'prop-h', 'prop-rot',
      'prop-opacity', 'prop-fill', 'prop-stroke', 'prop-stroke-width',
      'prop-border-radius', 'prop-fontsize', 'prop-fontcolor', 'prop-fontfamily',
    ];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', _onInputChange);
    });

    // Align buttons
    document.querySelectorAll('.align-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onPropChange({ textAlign: btn.dataset.align });
      });
    });
  }

  /* ── Show panel for selected element ─────────────────────── */
  function showElement(el) {
    document.getElementById('panel-no-selection').classList.add('hidden');
    document.getElementById('panel-element').classList.remove('hidden');

    _setValue('prop-x',   el.x);
    _setValue('prop-y',   el.y);
    _setValue('prop-w',   el.w);
    _setValue('prop-h',   el.h);
    _setValue('prop-rot', el.rotation || 0);
    _setValue('prop-opacity', el.opacity != null ? el.opacity : 1);

    // Shape props
    const shapeSec = document.getElementById('panel-shape-props');
    const textSec  = document.getElementById('panel-text-props');

    if (el.type === 'text') {
      shapeSec.style.display = 'none';
      textSec.style.display  = 'block';
      _setValue('prop-fontsize',   el.fontSize    || 18);
      _setValue('prop-fontcolor',  el.color       || '#1a1a2e');
      _setValue('prop-fontfamily', el.fontFamily  || 'DM Sans, sans-serif');
      _setAlign(el.textAlign || 'left');
    } else {
      textSec.style.display  = 'none';
      shapeSec.style.display = 'block';
      _setValue('prop-fill',         el.fill         || '#4f86f7');
      _setValue('prop-stroke',       el.stroke       || '#000000');
      _setValue('prop-stroke-width', el.strokeWidth  || 0);
      _setValue('prop-border-radius',el.borderRadius || 0);
    }
  }

  /* ── Show "no selection" state ────────────────────────────── */
  function showEmpty() {
    document.getElementById('panel-no-selection').classList.remove('hidden');
    document.getElementById('panel-element').classList.add('hidden');
  }

  /* ── Sync element data → form fields ─────────────────────── */
  function update(el) {
    if (!el) { showEmpty(); return; }
    showElement(el);
  }

  /* ── Update slide background in panel ────────────────────── */
  function setSlideBackground(color) {
    _setValue('panel-slide-bg', color);
  }

  /* ── Internal: read all form inputs and build a patch object  */
  function _onInputChange(e) {
    const id    = e.target.id;
    const value = e.target.type === 'range' || e.target.type === 'number'
      ? parseFloat(e.target.value)
      : e.target.value;

    const map = {
      'prop-x':             'x',
      'prop-y':             'y',
      'prop-w':             'w',
      'prop-h':             'h',
      'prop-rot':           'rotation',
      'prop-opacity':       'opacity',
      'prop-fill':          'fill',
      'prop-stroke':        'stroke',
      'prop-stroke-width':  'strokeWidth',
      'prop-border-radius': 'borderRadius',
      'prop-fontsize':      'fontSize',
      'prop-fontcolor':     'color',
      'prop-fontfamily':    'fontFamily',
    };

    const key = map[id];
    if (key) onPropChange({ [key]: value });
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function _setAlign(align) {
    document.querySelectorAll('.align-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === align);
    });
  }

  return { init, showElement, showEmpty, update, setSlideBackground };
})();
