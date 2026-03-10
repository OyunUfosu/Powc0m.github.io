/**
 * components/toolbar.js
 * Top-bar and canvas-toolbar button wiring.
 * Also wires global keyboard shortcuts.
 */

const Toolbar = (() => {

  let callbacks = {};

  /* ── Init ─────────────────────────────────────────────────── */
  function init(cb = {}) {
    callbacks = cb;

    /* ── Top toolbar ──────────────────────────────────────────── */
    _on('btn-new',     () => _confirm('Start a new presentation? Unsaved changes will be lost.', callbacks.onNew));
    _on('btn-save',    callbacks.onSave);
    _on('btn-preview', callbacks.onPreview);

    // Import button opens file picker
    _on('btn-import', () => document.getElementById('file-import').click());
    document.getElementById('file-import').addEventListener('change', e => {
      const file = e.target.files[0];
      e.target.value = ''; // reset so same file can be re-imported
      if (file && callbacks.onImport) callbacks.onImport(file);
    });

    // Export dropdown toggle
    _on('btn-export', () => {
      document.getElementById('export-menu').classList.toggle('open');
    });
    // Close dropdown on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('.tb-dropdown-wrap')) {
        document.getElementById('export-menu').classList.remove('open');
      }
    });

    _on('export-json', () => { _closeDropdown(); callbacks.onExportJSON && callbacks.onExportJSON(); });
    _on('export-pdf',  () => { _closeDropdown(); callbacks.onExportPDF  && callbacks.onExportPDF();  });
    _on('export-png',  () => { _closeDropdown(); callbacks.onExportPNG  && callbacks.onExportPNG();  });

    /* ── Canvas toolbar — tool buttons ───────────────────────── */
    document.querySelectorAll('.ctb-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        if (tool === 'image') {
          document.getElementById('file-image').click();
        } else {
          if (callbacks.onToolChange) callbacks.onToolChange(tool);
        }
      });
    });

    // Image file picker
    document.getElementById('file-image').addEventListener('change', e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) _readImageFile(file);
    });

    /* ── Formatting buttons ──────────────────────────────────── */
    document.querySelectorAll('.fmt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (callbacks.onFormat) callbacks.onFormat(btn.dataset.cmd);
      });
    });

    // Font size select
    document.getElementById('fmt-fontsize').addEventListener('change', e => {
      if (callbacks.onPropChange) callbacks.onPropChange({ fontSize: parseInt(e.target.value) });
    });

    // Font color picker
    document.getElementById('fmt-color').addEventListener('input', e => {
      document.getElementById('font-color-bar').setAttribute('fill', e.target.value);
      if (callbacks.onPropChange) callbacks.onPropChange({ color: e.target.value });
    });

    /* ── Slide background color ──────────────────────────────── */
    document.getElementById('slide-bg-color').addEventListener('input', e => {
      document.getElementById('bg-color-rect').setAttribute('fill', e.target.value);
      if (callbacks.onBgChange) callbacks.onBgChange(e.target.value);
    });
    document.getElementById('panel-slide-bg').addEventListener('input', e => {
      if (callbacks.onBgChange) callbacks.onBgChange(e.target.value);
    });

    /* ── Z-index / delete ────────────────────────────────────── */
    _on('btn-bring-front', callbacks.onBringFront);
    _on('btn-send-back',   callbacks.onSendBack);
    _on('btn-delete-el',   callbacks.onDeleteElement);

    /* ── Undo / Redo ─────────────────────────────────────────── */
    _on('btn-undo', callbacks.onUndo);
    _on('btn-redo', callbacks.onRedo);

    /* ── Properties panel buttons ────────────────────────────── */
    _on('prop-delete',    callbacks.onDeleteElement);
    _on('prop-duplicate', callbacks.onDuplicateElement);
    _on('panel-dup-slide',callbacks.onDuplicateSlide);
    _on('panel-del-slide',() => _confirm('Delete this slide?', callbacks.onDeleteSlide));

    /* ── Add slide ───────────────────────────────────────────── */
    _on('btn-add-slide', callbacks.onAddSlide);

    /* ── Keyboard shortcuts ──────────────────────────────────── */
    document.addEventListener('keydown', e => {
      // Ignore shortcuts when typing in inputs
      const tag = document.activeElement.tagName;
      const isEditing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
                     || document.activeElement.getAttribute('contenteditable') === 'true';

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z': e.preventDefault(); callbacks.onUndo && callbacks.onUndo(); break;
          case 'y': e.preventDefault(); callbacks.onRedo && callbacks.onRedo(); break;
          case 's': e.preventDefault(); callbacks.onSave && callbacks.onSave(); break;
          case 'd': if (!isEditing) { e.preventDefault(); callbacks.onDuplicateElement && callbacks.onDuplicateElement(); } break;
        }
        return;
      }

      if (isEditing) return;

      switch (e.key) {
        case 'Delete':
        case 'Backspace': callbacks.onDeleteElement && callbacks.onDeleteElement(); break;
        case 'v': case 'V': callbacks.onToolChange && callbacks.onToolChange('select'); break;
        case 't': case 'T': callbacks.onToolChange && callbacks.onToolChange('text'); break;
        case 'r': case 'R': callbacks.onToolChange && callbacks.onToolChange('rect'); break;
        case 'c': case 'C': callbacks.onToolChange && callbacks.onToolChange('circle'); break;
      }
    });
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _on(id, fn) {
    const el = document.getElementById(id);
    if (el && fn) el.addEventListener('click', fn);
  }

  function _closeDropdown() {
    document.getElementById('export-menu').classList.remove('open');
  }

  function _confirm(message, fn) {
    if (!fn) return;
    Modal.confirm(message, fn);
  }

  function _readImageFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      if (callbacks.onInsertImage) callbacks.onInsertImage(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  /* ── Update font-size select to match selected element ───── */
  function syncFontSize(size) {
    const sel = document.getElementById('fmt-fontsize');
    if (sel) sel.value = size;
  }

  return { init, syncFontSize };
})();

/* ── Modal helper (simple confirm/alert) ─────────────────── */
const Modal = (() => {
  function confirm(message, onOk, onCancel) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-message').textContent = message;
    overlay.classList.remove('hidden');

    const okBtn  = document.getElementById('modal-confirm');
    const canBtn = document.getElementById('modal-cancel');

    function cleanup() {
      overlay.classList.add('hidden');
      okBtn.removeEventListener('click', handleOk);
      canBtn.removeEventListener('click', handleCancel);
    }
    function handleOk()     { cleanup(); if (onOk) onOk(); }
    function handleCancel() { cleanup(); if (onCancel) onCancel(); }

    okBtn.addEventListener('click',  handleOk);
    canBtn.addEventListener('click', handleCancel);
  }
  return { confirm };
})();
