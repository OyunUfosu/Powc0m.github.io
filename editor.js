/**
 * editor.js
 * Root orchestrator. Wires all components together and owns the
 * presentation state object.
 */

/* ════════════════════════════════════════════════════════════
   PRESENTATION STATE
════════════════════════════════════════════════════════════ */
let presentation = {
  title:  'Untitled Presentation',
  slides: [],
};
let currentSlideIndex = 0;

/* ════════════════════════════════════════════════════════════
   BOOTSTRAP
════════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {

  /* ── Init subsystems ────────────────────────────────────── */
  Canvas.init({
    onSelectionChange: _onSelectionChange,
    onElementChange:   _onElementChange,
    onHistoryPush:     () => History.push(_snapshot()),
  });

  Sidebar.init({
    onSlideSelect:  _goToSlide,
    onSlideReorder: _reorderSlides,
    onSlideDelete:  _deleteSlide,
    onSlideDup:     _duplicateSlide,
  });

  Properties.init({
    onPropChange: _onPropChange,
  });

  Preview.init();

  Toolbar.init({
    onNew:              _newPresentation,
    onSave:             _saveJSON,
    onImport:           _importJSON,
    onExportJSON:       _exportJSON,
    onExportPDF:        _exportPDF,
    onExportPNG:        _exportPNG,
    onPreview:          _startPreview,
    onToolChange:       tool => Canvas.setTool(tool),
    onFormat:           _applyFormat,
    onPropChange:       _onPropChange,
    onBgChange:         _onBgChange,
    onBringFront:       () => { Canvas.bringToFront(); _refreshCurrentThumb(); },
    onSendBack:         () => { Canvas.sendToBack();   _refreshCurrentThumb(); },
    onDeleteElement:    _deleteSelectedElement,
    onDuplicateElement: _duplicateSelectedElement,
    onInsertImage:      src => Canvas.addImage(src),
    onAddSlide:         () => _addSlide(currentSlideIndex),
    onDuplicateSlide:   () => _duplicateSlide(currentSlideIndex),
    onDeleteSlide:      () => _deleteSlide(currentSlideIndex),
    onUndo:             _undo,
    onRedo:             _redo,
  });

  // Presentation title sync
  document.getElementById('presentation-title').addEventListener('input', e => {
    presentation.title = e.target.value;
  });

  /* ── Start with one blank slide ─────────────────────────── */
  _newPresentation(true);
});

/* ════════════════════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════════════════════ */
function _goToSlide(index) {
  if (index < 0 || index >= presentation.slides.length) return;
  currentSlideIndex = index;
  const slide = presentation.slides[index];
  Canvas.renderSlide(slide);
  Canvas.setTool('select');
  Sidebar.setActive(index);
  Properties.showEmpty();
  Properties.setSlideBackground(slide.background || '#ffffff');
  _updateSlideStatus();
}

/* ════════════════════════════════════════════════════════════
   SLIDE OPERATIONS
════════════════════════════════════════════════════════════ */
function _addSlide(afterIndex) {
  History.push(_snapshot());
  const result = SlideManager.addSlide(presentation.slides, afterIndex);
  presentation.slides = result.slides;
  Sidebar.render(presentation.slides, result.newIndex);
  _goToSlide(result.newIndex);
}

function _duplicateSlide(index) {
  History.push(_snapshot());
  const result = SlideManager.duplicateSlide(presentation.slides, index);
  presentation.slides = result.slides;
  Sidebar.render(presentation.slides, result.newIndex);
  _goToSlide(result.newIndex);
}

function _deleteSlide(index) {
  if (presentation.slides.length <= 1) {
    showToast('Cannot delete the last slide', true);
    return;
  }
  History.push(_snapshot());
  const result = SlideManager.deleteSlide(presentation.slides, index);
  presentation.slides = result.slides;
  Sidebar.render(presentation.slides, result.newIndex);
  _goToSlide(result.newIndex);
}

function _reorderSlides(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  History.push(_snapshot());
  const result = SlideManager.reorderSlides(presentation.slides, fromIndex, toIndex);
  presentation.slides = result.slides;
  currentSlideIndex   = result.newIndex;
  Sidebar.setActive(result.newIndex);
  _updateSlideStatus();
}

/* ════════════════════════════════════════════════════════════
   ELEMENT CALLBACKS
════════════════════════════════════════════════════════════ */
function _onSelectionChange(elData) {
  if (elData) {
    Properties.showElement(elData);
    Toolbar.syncFontSize(elData.fontSize || 18);
  } else {
    Properties.showEmpty();
  }
}

function _onElementChange(elData) {
  Properties.update(elData);
  _refreshCurrentThumb();
}

function _onPropChange(patch) {
  const el = Canvas.getSelectedData();
  if (!el) return;
  History.push(_snapshot());
  Object.assign(el, patch);
  Canvas.refreshElement(el);
  Properties.update(el);
  _refreshCurrentThumb();
}

function _applyFormat(cmd) {
  const el = Canvas.getSelectedData();
  if (!el || el.type !== 'text') return;
  History.push(_snapshot());
  if (cmd === 'bold')      el.bold      = !el.bold;
  if (cmd === 'italic')    el.italic    = !el.italic;
  if (cmd === 'underline') el.underline = !el.underline;
  Canvas.refreshElement(el);
  Properties.update(el);
  _refreshCurrentThumb();
}

function _onBgChange(color) {
  History.push(_snapshot());
  Canvas.setBackground(color);
  Properties.setSlideBackground(color);
  _refreshCurrentThumb();
}

function _deleteSelectedElement() {
  Canvas.deleteSelected();
  Properties.showEmpty();
  _refreshCurrentThumb();
}

function _duplicateSelectedElement() {
  Canvas.duplicateSelected();
  _refreshCurrentThumb();
}

/* ════════════════════════════════════════════════════════════
   SAVE / IMPORT / EXPORT
════════════════════════════════════════════════════════════ */
function _saveJSON() {
  Exporter.toJSON(presentation);
}

function _importJSON(file) {
  Importer.fromJSON(file, data => {
    if (!data) return;
    History.clear();
    presentation = data;
    document.getElementById('presentation-title').value = data.title || 'Untitled Presentation';
    currentSlideIndex = 0;
    Sidebar.render(presentation.slides, 0);
    _goToSlide(0);
    showToast('Presentation imported ✓');
  });
}

function _exportJSON()   { Exporter.toJSON(presentation); }
function _exportPDF()    { Exporter.toPDF(presentation.slides, presentation.title); }
function _exportPNG()    { Exporter.toPNG(presentation.slides, presentation.title); }

/* ════════════════════════════════════════════════════════════
   NEW PRESENTATION
════════════════════════════════════════════════════════════ */
function _newPresentation(skipConfirm = false) {
  function _create() {
    History.clear();
    presentation = {
      title:  'Untitled Presentation',
      slides: [],
    };
    document.getElementById('presentation-title').value = 'Untitled Presentation';

    // Create first slide
    const result = SlideManager.addSlide(presentation.slides, -1);
    presentation.slides = result.slides;
    currentSlideIndex   = 0;

    Sidebar.render(presentation.slides, 0);
    _goToSlide(0);
  }

  if (skipConfirm) {
    _create();
  } else {
    Modal.confirm('Start a new presentation? Unsaved changes will be lost.', _create);
  }
}

/* ════════════════════════════════════════════════════════════
   PREVIEW
════════════════════════════════════════════════════════════ */
function _startPreview() {
  Preview.enter(presentation.slides, currentSlideIndex);
}

/* ════════════════════════════════════════════════════════════
   UNDO / REDO
════════════════════════════════════════════════════════════ */
function _undo() {
  const prev = History.undo(_snapshot());
  if (!prev) return;
  _restoreSnapshot(prev);
}

function _redo() {
  const next = History.redo(_snapshot());
  if (!next) return;
  _restoreSnapshot(next);
}

function _snapshot() {
  return {
    presentation:      JSON.parse(JSON.stringify(presentation)),
    currentSlideIndex,
  };
}

function _restoreSnapshot(snap) {
  presentation      = snap.presentation;
  currentSlideIndex = snap.currentSlideIndex;
  document.getElementById('presentation-title').value = presentation.title || 'Untitled';
  Sidebar.render(presentation.slides, currentSlideIndex);
  _goToSlide(currentSlideIndex);
}

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */
function _refreshCurrentThumb() {
  Sidebar.refreshThumb(currentSlideIndex, presentation.slides[currentSlideIndex]);
}

function _updateSlideStatus() {
  const el = document.getElementById('status-slide-info');
  if (el) el.textContent = `Slide ${currentSlideIndex + 1} / ${presentation.slides.length}`;
}
