/**
 * utils/export.js
 * Handles exporting the presentation as JSON, PDF, or PNG images.
 */

const Exporter = (() => {

  /* ── JSON ─────────────────────────────────────────────────── */
  function toJSON(presentation) {
    const json = JSON.stringify(presentation, null, 2);
    _downloadText(json, `${presentation.title || 'presentation'}.json`, 'application/json');
    showToast('Saved as JSON ✓');
  }

  /* ── PDF ──────────────────────────────────────────────────── */
  async function toPDF(slides, title) {
    const spinner = _showSpinner('Generating PDF…');
    try {
      const { jsPDF } = window.jspdf;
      // A4 landscape ~= 297x210mm; use 16:9 960x540px as page
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [960, 540] });

      for (let i = 0; i < slides.length; i++) {
        if (i > 0) pdf.addPage([960, 540], 'landscape');
        const canvas = await _renderSlideToCanvas(slides[i]);
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 960, 540);
      }

      pdf.save(`${title || 'presentation'}.pdf`);
      showToast('PDF exported ✓');
    } catch (err) {
      console.error(err);
      showToast('PDF export failed', true);
    } finally {
      _hideSpinner(spinner);
    }
  }

  /* ── PNG (all slides, one zip via manual multi-download) ──── */
  async function toPNG(slides, title) {
    const spinner = _showSpinner('Generating images…');
    try {
      for (let i = 0; i < slides.length; i++) {
        const canvas = await _renderSlideToCanvas(slides[i]);
        const link = document.createElement('a');
        link.download = `${title || 'slide'}-${i + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        // Small delay to avoid browser blocking multiple downloads
        await _sleep(300);
      }
      showToast(`${slides.length} PNG(s) exported ✓`);
    } catch (err) {
      console.error(err);
      showToast('PNG export failed', true);
    } finally {
      _hideSpinner(spinner);
    }
  }

  /* ── Render a slide data object to an off-screen HTML canvas ─ */
  async function _renderSlideToCanvas(slide) {
    // Build a temporary DOM node that mirrors the slide
    const host = document.createElement('div');
    host.style.cssText = `
      position: fixed;
      left: -9999px; top: -9999px;
      width: 960px; height: 540px;
      background: ${slide.background || '#ffffff'};
      overflow: hidden;
    `;
    document.body.appendChild(host);

    // Render each element
    (slide.elements || []).forEach(el => {
      const node = _buildDomElement(el);
      host.appendChild(node);
    });

    const canvas = await html2canvas(host, {
      width: 960,
      height: 540,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: slide.background || '#ffffff',
    });

    document.body.removeChild(host);
    return canvas;
  }

  /* Build a plain DOM node from element data (for html2canvas) */
  function _buildDomElement(el) {
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      left: ${el.x}px;
      top: ${el.y}px;
      width: ${el.w}px;
      height: ${el.h}px;
      transform: rotate(${el.rotation || 0}deg);
      opacity: ${el.opacity != null ? el.opacity : 1};
      overflow: hidden;
      box-sizing: border-box;
    `;

    if (el.type === 'text') {
      div.innerHTML = el.content || '';
      div.style.cssText += `
        font-size: ${el.fontSize || 18}px;
        color: ${el.color || '#1a1a2e'};
        font-family: ${el.fontFamily || 'DM Sans, sans-serif'};
        font-weight: ${el.bold ? 'bold' : 'normal'};
        font-style: ${el.italic ? 'italic' : 'normal'};
        text-decoration: ${el.underline ? 'underline' : 'none'};
        text-align: ${el.textAlign || 'left'};
        padding: 4px;
        word-break: break-word;
        white-space: pre-wrap;
        line-height: 1.3;
      `;
    } else if (el.type === 'rect' || el.type === 'circle') {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('viewBox', `0 0 ${el.w} ${el.h}`);
      svg.style.display = 'block';

      const strokeW = el.strokeWidth || 0;
      const half    = strokeW / 2;

      if (el.type === 'rect') {
        const shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        shape.setAttribute('x',  half);
        shape.setAttribute('y',  half);
        shape.setAttribute('width',  el.w - strokeW);
        shape.setAttribute('height', el.h - strokeW);
        shape.setAttribute('rx', el.borderRadius || 0);
        shape.setAttribute('fill',         el.fill   || '#4f86f7');
        shape.setAttribute('stroke',       el.stroke || 'none');
        shape.setAttribute('stroke-width', strokeW);
        svg.appendChild(shape);
      } else {
        const cx = el.w / 2, cy = el.h / 2;
        const rx = (el.w - strokeW) / 2, ry = (el.h - strokeW) / 2;
        const shape = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        shape.setAttribute('cx', cx);
        shape.setAttribute('cy', cy);
        shape.setAttribute('rx', rx);
        shape.setAttribute('ry', ry);
        shape.setAttribute('fill',         el.fill   || '#4f86f7');
        shape.setAttribute('stroke',       el.stroke || 'none');
        shape.setAttribute('stroke-width', strokeW);
        svg.appendChild(shape);
      }
      div.appendChild(svg);
    } else if (el.type === 'image') {
      const img = document.createElement('img');
      img.src = el.src || '';
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
      div.appendChild(img);
    }

    return div;
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _downloadText(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function _showSpinner(msg) {
    const div = document.createElement('div');
    div.className = 'spinner-overlay';
    div.innerHTML = `<div class="spinner"></div><span>${msg}</span>`;
    document.body.appendChild(div);
    return div;
  }
  function _hideSpinner(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { toJSON, toPDF, toPNG };
})();

/* Global toast helper (used across modules) */
function showToast(msg, isError = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2200);
}
