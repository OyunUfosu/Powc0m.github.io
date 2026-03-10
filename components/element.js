/**
 * components/element.js
 * Factory and helpers for individual slide elements (text, shape, image).
 */

const ElementFactory = (() => {

  /** Generate a short unique id */
  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  /* ── Default element templates ──────────────────────────── */
  const DEFAULTS = {
    text: {
      type: 'text', w: 300, h: 80,
      content: 'Double-click to edit',
      fontSize: 18, color: '#1a1a2e',
      fontFamily: 'DM Sans, sans-serif',
      bold: false, italic: false, underline: false,
      textAlign: 'left',
    },
    rect: {
      type: 'rect', w: 200, h: 120,
      fill: '#4f86f7', stroke: 'transparent', strokeWidth: 0, borderRadius: 0,
    },
    circle: {
      type: 'circle', w: 150, h: 150,
      fill: '#e74c3c', stroke: 'transparent', strokeWidth: 0, borderRadius: 0,
    },
    image: {
      type: 'image', w: 300, h: 200, src: '',
    },
  };

  /** Create a new element data object centred on the slide. */
  function create(type, overrides = {}) {
    const base = Object.assign({}, DEFAULTS[type] || DEFAULTS.text);
    return Object.assign({
      id:       uid(),
      x:        100,
      y:        100,
      rotation: 0,
      opacity:  1,
      zIndex:   1,
    }, base, overrides);
  }

  /* ── Build a DOM node from element data ─────────────────── */
  function buildDOM(el) {
    const outer = document.createElement('div');
    outer.className  = 'slide-element';
    outer.dataset.id = el.id;
    outer.style.cssText = _outerStyle(el);

    if (el.type === 'text') {
      outer.classList.add('el-text');
      outer.innerHTML  = el.content || '';
      outer.setAttribute('contenteditable', 'false');
      _applyTextStyle(outer, el);
    } else if (el.type === 'rect' || el.type === 'circle') {
      outer.classList.add('el-shape');
      outer.appendChild(_buildShapeSVG(el));
    } else if (el.type === 'image') {
      outer.classList.add('el-image');
      const img = document.createElement('img');
      img.src = el.src || '';
      img.draggable = false;
      outer.appendChild(img);
    }

    return outer;
  }

  /** Sync the DOM node's visual style to the data object. */
  function updateDOM(node, el) {
    node.style.cssText = _outerStyle(el);

    if (el.type === 'text') {
      _applyTextStyle(node, el);
      // Only update innerHTML when not actively editing to avoid caret loss
      if (node.getAttribute('contenteditable') !== 'true') {
        node.innerHTML = el.content || '';
      }
    } else if (el.type === 'rect' || el.type === 'circle') {
      const old = node.querySelector('svg');
      if (old) old.remove();
      node.appendChild(_buildShapeSVG(el));
    } else if (el.type === 'image') {
      const img = node.querySelector('img');
      if (img) img.src = el.src || '';
    }
  }

  /* ── SVG shape builder ──────────────────────────────────── */
  function _buildShapeSVG(el) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('width',  '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${el.w} ${el.h}`);
    svg.style.display = 'block';
    svg.style.overflow = 'visible';

    const strokeW = el.strokeWidth || 0;
    const half    = strokeW / 2;

    if (el.type === 'rect') {
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x',      half);
      rect.setAttribute('y',      half);
      rect.setAttribute('width',  Math.max(0, el.w - strokeW));
      rect.setAttribute('height', Math.max(0, el.h - strokeW));
      rect.setAttribute('rx',     el.borderRadius || 0);
      rect.setAttribute('fill',         el.fill   || '#4f86f7');
      rect.setAttribute('stroke',       el.stroke || 'transparent');
      rect.setAttribute('stroke-width', strokeW);
      svg.appendChild(rect);
    } else {
      const cx = el.w / 2, cy = el.h / 2;
      const rx = Math.max(0, (el.w - strokeW) / 2);
      const ry = Math.max(0, (el.h - strokeW) / 2);
      const ellipse = document.createElementNS(svgNS, 'ellipse');
      ellipse.setAttribute('cx', cx);
      ellipse.setAttribute('cy', cy);
      ellipse.setAttribute('rx', rx);
      ellipse.setAttribute('ry', ry);
      ellipse.setAttribute('fill',         el.fill   || '#e74c3c');
      ellipse.setAttribute('stroke',       el.stroke || 'transparent');
      ellipse.setAttribute('stroke-width', strokeW);
      svg.appendChild(ellipse);
    }
    return svg;
  }

  /* ── Style helpers ──────────────────────────────────────── */
  function _outerStyle(el) {
    return [
      `left:${el.x}px`,
      `top:${el.y}px`,
      `width:${el.w}px`,
      `height:${el.h}px`,
      `transform:rotate(${el.rotation || 0}deg)`,
      `opacity:${el.opacity != null ? el.opacity : 1}`,
      `z-index:${el.zIndex || 1}`,
    ].join(';');
  }

  function _applyTextStyle(node, el) {
    node.style.fontSize     = (el.fontSize || 18) + 'px';
    node.style.color        = el.color      || '#1a1a2e';
    node.style.fontFamily   = el.fontFamily || 'DM Sans, sans-serif';
    node.style.fontWeight   = el.bold       ? 'bold'   : 'normal';
    node.style.fontStyle    = el.italic     ? 'italic' : 'normal';
    node.style.textDecoration = el.underline ? 'underline' : 'none';
    node.style.textAlign    = el.textAlign  || 'left';
  }

  /* ── Selection handles ──────────────────────────────────── */
  const HANDLE_DIRS = ['nw','n','ne','w','e','sw','s','se'];
  function addHandles(node) {
    removeHandles(node);
    // Resize handles
    HANDLE_DIRS.forEach(dir => {
      const h = document.createElement('div');
      h.className = `resize-handle rh-${dir}`;
      h.dataset.dir = dir;
      node.appendChild(h);
    });
    // Rotation handle
    const rot = document.createElement('div');
    rot.className = 'rotate-handle';
    rot.title = 'Rotate';
    rot.textContent = '↻';
    rot.dataset.role = 'rotate';
    node.appendChild(rot);
  }

  function removeHandles(node) {
    node.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
  }

  return { create, buildDOM, updateDOM, addHandles, removeHandles, uid };
})();
