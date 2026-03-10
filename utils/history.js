/**
 * utils/history.js
 * Undo / Redo stack for the editor.
 * Snapshots are deep-copies of the full presentations state.
 */

const History = (() => {
  const MAX_STACK = 50;
  let undoStack = [];
  let redoStack = [];

  /** Push a new snapshot (call BEFORE making a change). */
  function push(state) {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > MAX_STACK) undoStack.shift();
    redoStack = []; // clear redo on new action
    _updateButtons();
  }

  /** Undo: returns the previous state (parsed object) or null. */
  function undo(currentState) {
    if (undoStack.length === 0) return null;
    redoStack.push(JSON.stringify(currentState));
    const prev = undoStack.pop();
    _updateButtons();
    return JSON.parse(prev);
  }

  /** Redo: returns the next state or null. */
  function redo(currentState) {
    if (redoStack.length === 0) return null;
    undoStack.push(JSON.stringify(currentState));
    const next = redoStack.pop();
    _updateButtons();
    return JSON.parse(next);
  }

  function clear() {
    undoStack = [];
    redoStack = [];
    _updateButtons();
  }

  function _updateButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  return { push, undo, redo, clear };
})();
