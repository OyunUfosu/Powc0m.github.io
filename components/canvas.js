/**
 * components/canvas.js
 * Manages the main editing canvas:
 *   - Rendering elements from slide data
 *   - Select / move / resize / rotate
 *   - Double-click to edit text inline
 *   - Alignment guides
 */

const Canvas = (() => {

  // DOM refs
  let canvasEl      = null;   // #slide-canvas
  let viewportEl    = null;   // #canvas-viewport

  // State
  let currentSlide  = null;   // slide data object (reference)
  let selectedId    = null;   // id of selected element
  let activeTool    = 'select';

  // Drag/resize/rotate state
  let _drag   = null;
  let _resize = null;
  let _rotate = null;

  // Callbacks set by editor.js
  let onSelectionChange = () => {};
  let onElementChange   = () => {};
  let onHistoryPush     = () => {};

  /* ────────────────────────────────────────────────────────────
     INIT
  ──────────────────────────────────────────────────────────── */
  function init(callbacks = {}) {
    canvasEl   = document.getElementById('slide-canvas');
    viewportEl = document.getElementById('canvas-viewport');

    onSelectionChange = callbacks.onSelectionChange || onSelectionChange;
    onElementChange   = callbacks.onElementChange   || onElementChange;
    onHistoryPush     = callbacks.onHistoryPush     || onHistoryPush;

    // Selection box element
    const selBox = document.createElement('div');
    selBox.id = 'selection-box';
    canvasEl.appendChild(selBox);

    // Pointer events on canvas
    canvasEl.addEventListener('pointerdown', _onCanvasPointerDown);
    document.addEventListener('pointermove', _onPointerMove);
    document.addEventListener('pointerup',   _onPointerUp);

    // Double-click to edit text
    canvasEl.addEventListener('dblclick', _onCanvasDblClick);
  }

  /* ────────────────────────────────────────────────────────────
     RENDER SLIDE
  ──────────────────────────────────────────────────────────── */
  function renderSlide(slide) {
    currentSlide = slide;
    selectedId   = null;

    // Clear canvas (keep selection box)
    const selBox = canvasEl.querySelector('#selection-box');
    canvasEl.innerHTML = '';
    if (selBox) canvasEl.appendChild(selBox);

    if (!slide) {
      canvasEl.style.background = '#ffffff';
      return;
    }

    canvasEl.style.background = slide.background || '#ffffff';

    // Sort by zIndex, then render
    const sorted = [...(slide.elements || [])].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
    sorted.forEach(el => {
      const node = ElementFactory.buildDOM(el);
      canvasEl.appendChild(node);
    });

    onSelectionChange(null);
  }

  /* Refresh just one element's DOM after a data change */
  function refreshElement(elData) {
    const node = canvasEl.querySelector(`[data-id="${elData.id}"]`);
    if (!node) return;
    ElementFactory.updateDOM(node, elData);
    if (elData.id === selectedId) {
      ElementFactory.addHandles(node);
    }
  }

  /* Update slide background */
  function setBackground(color) {
    if (currentSlide) currentSlide.background = color;
    canvasEl.style.background = color;
    _updateBGColorUI(color);
  }

  /* ────────────────────────────────────────────────────────────
     TOOL MANAGEMENT
  ──────────────────────────────────────────────────────────── */
  function setTool(tool) {
    activeTool = tool;
    document.querySelectorAll('.ctb-btn[data-tool]').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === tool);
    });
    canvasEl.style.cursor = tool === 'select' ? 'default' : 'crosshair';
  }

  /* ────────────────────────────────────────────────────────────
     SELECTION
  ──────────────────────────────────────────────────────────── */
  function selectElement(id) {
    // Deselect old
    const old = canvasEl.querySelector('.slide-element.selected');
    if (old) {
      old.classList.remove('selected');
      ElementFactory.removeHandles(old);
    }

    selectedId = id;
    if (!id) { onSelectionChange(null); _updateStatusBar(); return; }

    const node = canvasEl.querySelector(`[data-id="${id}"]`);
    if (!node) return;
    node.classList.add('selected');
    ElementFactory.addHandles(node);
    onSelectionChange(_getElData(id));
    _updateStatusBar();
  }

  function getSelectedId()   { return selectedId; }
  function getSelectedData() { return _getElData(selectedId); }

  /* ────────────────────────────────────────────────────────────
     POINTER DOWN — dispatch to drag / resize / rotate or place
  ──────────────────────────────────────────────────────────── */
  function _onCanvasPointerDown(e) {
    if (!currentSlide) return;

    const target = e.target;

    // Click on resize handle?
    if (target.classList.contains('resize-handle')) {
      e.stopPropagation();
      _startResize(e, target.dataset.dir);
      return;
    }

    // Click on rotation handle?
    if (target.dataset.role === 'rotate') {
      e.stopPropagation();
      _startRotate(e);
      return;
    }

    // Click on an element?
    const elNode = target.closest('.slide-element');
    if (elNode) {
      e.preventDefault();
      const id = elNode.dataset.id;
      if (id !== selectedId) selectElement(id);

      if (activeTool === 'select') {
        _startDrag(e, elNode);
      }
      return;
    }

    // Click on blank canvas — deselect or place new element
    selectElement(null);

    if (activeTool !== 'select') {
      _placeElement(e);
    }
  }

  /* ────────────────────────────────────────────────────────────
     PLACE NEW ELEMENT
  ──────────────────────────────────────────────────────────── */
  function _placeElement(e) {
    if (!currentSlide) return;
    const rect = canvasEl.getBoundingClientRect();
    const x    = Math.round(e.clientX - rect.left);
    const y    = Math.round(e.clientY - rect.top);

    onHistoryPush();

    let newEl;
    if (activeTool === 'text') {
      newEl = ElementFactory.create('text', { x, y });
    } else if (activeTool === 'rect') {
      newEl = ElementFactory.create('rect', { x, y });
    } else if (activeTool === 'circle') {
      newEl = ElementFactory.create('circle', { x, y });
    } else {
      return; // image is handled separately
    }

    // Assign a reasonable zIndex
    const maxZ = Math.max(0, ...(currentSlide.elements || []).map(el => el.zIndex || 1));
    newEl.zIndex = maxZ + 1;

    currentSlide.elements.push(newEl);
    const node = ElementFactory.buildDOM(newEl);
    canvasEl.appendChild(node);

    selectElement(newEl.id);
    onElementChange(newEl);
    setTool('select');
  }

  /* ────────────────────────────────────────────────────────────
     DRAG (MOVE)
  ──────────────────────────────────────────────────────────── */
  function _startDrag(e, node) {
    const el   = _getElData(node.dataset.id);
    if (!el) return;
    const rect = canvasEl.getBoundingClientRect();
    onHistoryPush();
    _drag = {
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origX:  el.x,
      origY:  el.y,
      canvasRect: rect,
    };
    node.setPointerCapture(e.pointerId);
  }

  /* ────────────────────────────────────────────────────────────
     RESIZE
  ──────────────────────────────────────────────────────────── */
  function _startResize(e, dir) {
    const el = _getElData(selectedId);
    if (!el) return;
    const rect = canvasEl.getBoundingClientRect();
    onHistoryPush();
    _resize = {
      id: el.id,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      origX:  el.x,
      origY:  el.y,
      origW:  el.w,
      origH:  el.h,
    };
    document.body.setPointerCapture && document.body.setPointerCapture(e.pointerId);
  }

  /* ────────────────────────────────────────────────────────────
     ROTATE
  ──────────────────────────────────────────────────────────── */
  function _startRotate(e) {
    const el = _getElData(selectedId);
    if (!el) return;
    const node = canvasEl.querySelector(`[data-id="${el.id}"]`);
    const rect = node.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    onHistoryPush();
    _rotate = { id: el.id, cx, cy, startAngle: el.rotation || 0 };
  }

  /* ────────────────────────────────────────────────────────────
     POINTER MOVE
  ──────────────────────────────────────────────────────────── */
  function _onPointerMove(e) {
    if (_drag) {
      const dx = e.clientX - _drag.startX;
      const dy = e.clientY - _drag.startY;
      const el = _getElData(_drag.id);
      if (!el) return;

      el.x = Math.round(_drag.origX + dx);
      el.y = Math.round(_drag.origY + dy);

      const node = canvasEl.querySelector(`[data-id="${el.id}"]`);
      if (node) {
        node.style.left = el.x + 'px';
        node.style.top  = el.y + 'px';
      }
      _showGuides(el);
      onElementChange(el);
      return;
    }

    if (_resize) {
      const dx  = e.clientX - _resize.startX;
      const dy  = e.clientY - _resize.startY;
      const el  = _getElData(_resize.id);
      if (!el) return;
      const MIN = 20;

      const dir = _resize.dir;
      let { origX: x, origY: y, origW: w, origH: h } = _resize;

      if (dir.includes('e'))  { w = Math.max(MIN, w + dx); }
      if (dir.includes('s'))  { h = Math.max(MIN, h + dy); }
      if (dir.includes('w'))  { const nw = Math.max(MIN, w - dx); x = x + (w - nw); w = nw; }
      if (dir.includes('n'))  { const nh = Math.max(MIN, h - dy); y = y + (h - nh); h = nh; }

      el.x = Math.round(x);
      el.y = Math.round(y);
      el.w = Math.round(w);
      el.h = Math.round(h);

      const node = canvasEl.querySelector(`[data-id="${el.id}"]`);
      if (node) {
        node.style.left   = el.x + 'px';
        node.style.top    = el.y + 'px';
        node.style.width  = el.w + 'px';
        node.style.height = el.h + 'px';
        // Re-draw shape SVG if shape element
        if (el.type === 'rect' || el.type === 'circle') {
          ElementFactory.updateDOM(node, el);
        }
      }
      onElementChange(el);
      return;
    }

    if (_rotate) {
      const el  = _getElData(_rotate.id);
      if (!el) return;
      const angle = Math.atan2(e.clientY - _rotate.cy, e.clientX - _rotate.cx);
      const deg   = Math.round(angle * (180 / Math.PI) + 90);
      el.rotation = (deg + 360) % 360;
      const node = canvasEl.querySelector(`[data-id="${el.id}"]`);
      if (node) node.style.transform = `rotate(${el.rotation}deg)`;
      onElementChange(el);
    }
  }

  /* ────────────────────────────────────────────────────────────
     POINTER UP
  ──────────────────────────────────────────────────────────── */
  function _onPointerUp() {
    _drag   = null;
    _resize = null;
    _rotate = null;
    _hideGuides();
  }

  /* ────────────────────────────────────────────────────────────
     DOUBLE-CLICK: inline text editing
  ──────────────────────────────────────────────────────────── */
  function _onCanvasDblClick(e) {
    const elNode = e.target.closest('.slide-element');
    if (!elNode) return;
    const el = _getElData(elNode.dataset.id);
    if (!el || el.type !== 'text') return;

    // Make contenteditable
    elNode.setAttribute('contenteditable', 'true');
    elNode.focus();

    // Place caret at end
    const range = document.createRange();
    const sel   = window.getSelection();
    range.selectNodeContents(elNode);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    // Stop editing on blur
    function stopEdit() {
      elNode.removeEventListener('blur', stopEdit);
      elNode.setAttribute('contenteditable', 'false');
      el.content = elNode.innerHTML;
      onElementChange(el);
    }
    elNode.addEventListener('blur', stopEdit);
  }

  /* ────────────────────────────────────────────────────────────
     ALIGNMENT GUIDES
  ──────────────────────────────────────────────────────────── */
  const SNAP_THRESHOLD = 8; // px

  function _showGuides(el) {
    const CWIDTH  = 960;
    const CHEIGHT = 540;
    const cx      = el.x + el.w / 2;
    const cy      = el.y + el.h / 2;

    const guideH = document.getElementById('guide-h');
    const guideV = document.getElementById('guide-v');

    // Center horizontal
    if (Math.abs(cy - CHEIGHT / 2) < SNAP_THRESHOLD) {
      guideH.style.display = 'block';
      guideH.style.top = (CHEIGHT / 2) + 'px';
    } else {
      guideH.style.display = 'none';
    }
    // Center vertical
    if (Math.abs(cx - CWIDTH / 2) < SNAP_THRESHOLD) {
      guideV.style.display = 'block';
      guideV.style.left = (CWIDTH / 2) + 'px';
    } else {
      guideV.style.display = 'none';
    }
  }

  function _hideGuides() {
    document.getElementById('guide-h').style.display = 'none';
    document.getElementById('guide-v').style.display = 'none';
  }

  /* ────────────────────────────────────────────────────────────
     Z-INDEX HELPERS
  ──────────────────────────────────────────────────────────── */
  function bringToFront() {
    if (!selectedId || !currentSlide) return;
    const el = _getElData(selectedId);
    if (!el) return;
    const maxZ = Math.max(...currentSlide.elements.map(e => e.zIndex || 1));
    onHistoryPush();
    el.zIndex = maxZ + 1;
    refreshElement(el);
    onElementChange(el);
  }

  function sendToBack() {
    if (!selectedId || !currentSlide) return;
    const el = _getElData(selectedId);
    if (!el) return;
    onHistoryPush();
    el.zIndex = Math.max(1, Math.min(...currentSlide.elements.map(e => e.zIndex || 1)) - 1);
    refreshElement(el);
    onElementChange(el);
  }

  /* ────────────────────────────────────────────────────────────
     DELETE ELEMENT
  ──────────────────────────────────────────────────────────── */
  function deleteSelected() {
    if (!selectedId || !currentSlide) return;
    onHistoryPush();
    currentSlide.elements = currentSlide.elements.filter(e => e.id !== selectedId);
    const node = canvasEl.querySelector(`[data-id="${selectedId}"]`);
    if (node) node.remove();
    selectedId = null;
    onSelectionChange(null);
    _updateStatusBar();
  }

  /* ────────────────────────────────────────────────────────────
     DUPLICATE ELEMENT
  ──────────────────────────────────────────────────────────── */
  function duplicateSelected() {
    if (!selectedId || !currentSlide) return;
    const src = _getElData(selectedId);
    if (!src) return;
    onHistoryPush();
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = ElementFactory.uid();
    copy.x += 20;
    copy.y += 20;
    const maxZ = Math.max(...currentSlide.elements.map(e => e.zIndex || 1));
    copy.zIndex = maxZ + 1;
    currentSlide.elements.push(copy);
    const node = ElementFactory.buildDOM(copy);
    canvasEl.appendChild(node);
    selectElement(copy.id);
    onElementChange(copy);
  }

  /* ────────────────────────────────────────────────────────────
     ADD IMAGE
  ──────────────────────────────────────────────────────────── */
  function addImage(src) {
    if (!currentSlide) return;
    onHistoryPush();
    const maxZ = Math.max(0, ...(currentSlide.elements || []).map(e => e.zIndex || 1));
    const newEl = ElementFactory.create('image', { x: 80, y: 80, src, zIndex: maxZ + 1 });
    currentSlide.elements.push(newEl);
    const node = ElementFactory.buildDOM(newEl);
    canvasEl.appendChild(node);
    selectElement(newEl.id);
    onElementChange(newEl);
  }

  /* ────────────────────────────────────────────────────────────
     STATUS BAR
  ──────────────────────────────────────────────────────────── */
  function _updateStatusBar() {
    const info = document.getElementById('status-element-info');
    if (!info) return;
    if (selectedId) {
      const el = _getElData(selectedId);
      if (el) info.textContent = `${el.type} · ${el.w}×${el.h} @ (${el.x},${el.y})`;
    } else {
      info.textContent = '';
    }
  }

  /* ────────────────────────────────────────────────────────────
     HELPERS
  ──────────────────────────────────────────────────────────── */
  function _getElData(id) {
    if (!id || !currentSlide) return null;
    return (currentSlide.elements || []).find(e => e.id === id) || null;
  }

  function _updateBGColorUI(color) {
    const input = document.getElementById('slide-bg-color');
    if (input) input.value = color;
    const rect = document.getElementById('bg-color-rect');
    if (rect) rect.setAttribute('fill', color);
    const panelBg = document.getElementById('panel-slide-bg');
    if (panelBg) panelBg.value = color;
  }

  function getCurrentSlide() { return currentSlide; }

  return {
    init, renderSlide, refreshElement, setBackground,
    setTool, getSelectedId, getSelectedData,
    bringToFront, sendToBack,
    deleteSelected, duplicateSelected, addImage,
    getCurrentSlide,
  };
})();
