/**
 * utils/import.js
 * Handles importing a .json presentation file.
 */

const Importer = (() => {

  /**
   * Read a File object, parse JSON and call callback(presentationObject).
   * @param {File}     file
   * @param {Function} callback  receives parsed presentation or null on error
   */
  function fromJSON(file, callback) {
    if (!file) { callback(null); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Minimal validation
        if (!Array.isArray(data.slides)) {
          showToast('Invalid presentation file', true);
          callback(null);
          return;
        }
        // Ensure every slide has required fields
        data.slides = data.slides.map((slide, idx) => ({
          id:         slide.id         || _uid(),
          background: slide.background || '#ffffff',
          elements:   (slide.elements || []).map(el => _sanitizeElement(el)),
        }));
        callback(data);
      } catch (err) {
        console.error('Import error:', err);
        showToast('Failed to parse JSON file', true);
        callback(null);
      }
    };
    reader.readAsText(file);
  }

  /** Fill in any missing fields on an element to prevent runtime errors. */
  function _sanitizeElement(el) {
    return {
      id:           el.id           || _uid(),
      type:         el.type         || 'text',
      x:            el.x            ?? 50,
      y:            el.y            ?? 50,
      w:            el.w            ?? 200,
      h:            el.h            ?? 60,
      rotation:     el.rotation     || 0,
      opacity:      el.opacity      ?? 1,
      zIndex:       el.zIndex       || 1,
      // Text
      content:      el.content      || '',
      fontSize:     el.fontSize     || 18,
      color:        el.color        || '#1a1a2e',
      fontFamily:   el.fontFamily   || 'DM Sans, sans-serif',
      bold:         el.bold         || false,
      italic:       el.italic       || false,
      underline:    el.underline    || false,
      textAlign:    el.textAlign    || 'left',
      // Shape
      fill:         el.fill         || '#4f86f7',
      stroke:       el.stroke       || 'transparent',
      strokeWidth:  el.strokeWidth  || 0,
      borderRadius: el.borderRadius || 0,
      // Image
      src:          el.src          || '',
    };
  }

  function _uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  return { fromJSON };
})();
