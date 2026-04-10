// selector.js — Content script that lets the user pick a CSS selector
// by clicking on a page element.  Activated from the popup via a message.

let picking = false;
let highlightEl = null;

const HIGHLIGHT_STYLE = 'outline: 2px solid #5865F2 !important; outline-offset: 2px !important;';

function getSelector(el) {
  const parts = [];
  while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
    let seg = el.tagName.toLowerCase();
    if (el.id) {
      seg += `#${CSS.escape(el.id)}`;
      parts.unshift(seg);
      break;
    }
    const siblings = Array.from(el.parentNode?.children || []).filter(
      (c) => c.tagName === el.tagName
    );
    if (siblings.length > 1) {
      seg += `:nth-of-type(${siblings.indexOf(el) + 1})`;
    }
    parts.unshift(seg);
    el = el.parentElement;
  }
  return parts.join(' > ');
}

function clearHighlight() {
  if (highlightEl) {
    highlightEl.style.removeProperty('outline');
    highlightEl.style.removeProperty('outline-offset');
    highlightEl = null;
  }
}

function onMouseOver(e) {
  if (!picking) return;
  clearHighlight();
  e.target.setAttribute('style', HIGHLIGHT_STYLE);
  highlightEl = e.target;
}

function onClick(e) {
  if (!picking) return;
  e.preventDefault();
  e.stopPropagation();
  picking = false;
  clearHighlight();
  document.removeEventListener('mouseover', onMouseOver, true);
  document.removeEventListener('click', onClick, true);

  const selector = getSelector(e.target);
  const text = e.target.textContent.trim();
  chrome.runtime.sendMessage({ type: 'SELECTOR_PICKED', selector, text });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'START_PICKING') {
    picking = true;
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('click', onClick, true);
  }
});
