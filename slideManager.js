/**
 * slideManager.js
 * Pure data manager for the slides array.
 * No DOM — returns new state.
 */

const SlideManager = (() => {

  /** Create a blank slide data object */
  function createSlide(overrides = {}) {
    return Object.assign({
      id:         ElementFactory.uid(),
      background: '#ffffff',
      elements:   [],
    }, overrides);
  }

  /** Add a new blank slide after the given index */
  function addSlide(slides, afterIndex) {
    const newSlide = createSlide();
    const idx      = afterIndex != null ? afterIndex + 1 : slides.length;
    const copy     = [...slides];
    copy.splice(idx, 0, newSlide);
    return { slides: copy, newIndex: idx };
  }

  /** Duplicate a slide */
  function duplicateSlide(slides, index) {
    const src  = slides[index];
    if (!src) return { slides, newIndex: index };
    const copy = JSON.parse(JSON.stringify(src));
    copy.id    = ElementFactory.uid();
    // Give all elements new IDs to avoid conflicts
    copy.elements = copy.elements.map(el => Object.assign({}, el, { id: ElementFactory.uid() }));
    const arr  = [...slides];
    arr.splice(index + 1, 0, copy);
    return { slides: arr, newIndex: index + 1 };
  }

  /** Delete a slide (at least one must remain) */
  function deleteSlide(slides, index) {
    if (slides.length <= 1) return { slides, newIndex: 0 };
    const arr     = slides.filter((_, i) => i !== index);
    const newIndex = Math.min(index, arr.length - 1);
    return { slides: arr, newIndex };
  }

  /** Reorder (from Sortable drag) */
  function reorderSlides(slides, fromIndex, toIndex) {
    const arr  = [...slides];
    const [el] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, el);
    return { slides: arr, newIndex: toIndex };
  }

  return { createSlide, addSlide, duplicateSlide, deleteSlide, reorderSlides };
})();
