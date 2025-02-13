// Global flag to indicate whether the extension is enabled.
let extensionEnabled = true;

// Read the stored enabled status on load.
chrome.storage.sync.get('enabled', function(data) {
  let extensionEnabled = (data.enabled === undefined) ? true : data.enabled;
});

// Listen for any changes to the storage.
chrome.storage.onChanged.addListener(function(changes, area) {
  if (area === 'sync' && changes.enabled) {
    extensionEnabled = changes.enabled.newValue;
  }
});

// Global objects for the two dictionaries.
let dictionaryBokmaal = {};
let dictionaryNynorsk = {};

// Load the Bokmål dictionary.
fetch(chrome.runtime.getURL('dictionary.json'))
  .then(response => response.json())
  .then(data => { dictionaryBokmaal = data; })
  .catch(error => console.error("Failed to load Bokmål dictionary:", error));

// Load the Nynorsk dictionary.
fetch(chrome.runtime.getURL('nynorsk_dictionary.json'))
  .then(response => response.json())
  .then(data => { dictionaryNynorsk = data; })
  .catch(error => console.error("Failed to load Nynorsk dictionary:", error));

// Create (or reuse) a tooltip element.
let tooltip;
function createTooltip() {
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';

    // Adjust styling based on dark mode:
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      tooltip.style.backgroundColor = '#333';  // Dark background
      tooltip.style.color = '#fff';            // Light text
      tooltip.style.border = '1px solid #555';   // Darker border
    } else {
      tooltip.style.backgroundColor = 'rgba(255, 255, 255, 0.95)'; // Light background
      tooltip.style.color = '#000';             // Dark text
      tooltip.style.border = '1px solid #ccc';   // Light border
    }

    tooltip.style.padding = '6px 8px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    tooltip.style.zIndex = 10000;
    tooltip.style.pointerEvents = 'none';
    tooltip.style.whiteSpace = 'normal';
    document.body.appendChild(tooltip);
  }
}

function showTooltip(x, y, htmlContent) {
  createTooltip();
  // Important: use innerHTML so that the HTML is rendered.
  tooltip.innerHTML = htmlContent;
  tooltip.style.left = x + 'px';
  tooltip.style.top = (y + 20) + 'px';
  tooltip.style.display = 'block';
}

function hideTooltip() {
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

// Utility: Find the word under the pointer.
function getWordAtPoint(x, y) {
  let range;
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if (document.caretPositionFromPoint) {
    let pos = document.caretPositionFromPoint(x, y);
    range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.setEnd(pos.offsetNode, pos.offset);
  }
  if (!range) return null;
  
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  
  const text = node.textContent;
  let offset = range.startOffset;

  if (!/[a-zA-ZæøåÆØÅ]/.test(text[offset])) {
    return null;
  }

  let start = offset, end = offset;
  while (start > 0 && /\p{L}/u.test(text[start - 1])) { start--; }
  while (end < text.length && /\p{L}/u.test(text[end])) { end++; }
  return text.slice(start, end);
}

// Listen for mouse movements.
document.addEventListener('mousemove', (e) => {
  // Only proceed if the extension is enabled.
  if (!extensionEnabled) {
    hideTooltip();
    return;
  }

  const word = getWordAtPoint(e.clientX, e.clientY);
  if (!word) {
    hideTooltip();
    return;
  }
  
  const lookup = word.toLowerCase();
  
  // Retrieve translations from both dictionaries.
  let translationBokmaal = dictionaryBokmaal[lookup];
  let translationNynorsk = dictionaryNynorsk[lookup];
  
  // If translations are stored as arrays, join them.
  if (translationBokmaal && Array.isArray(translationBokmaal)) {
    translationBokmaal = translationBokmaal.join('; ');
  }
  if (translationNynorsk && Array.isArray(translationNynorsk)) {
    translationNynorsk = translationNynorsk.join('; ');
  }
  
  // Build the HTML string with labels and a solid divider.
  let displayHTML = "";
  if (translationBokmaal && translationNynorsk) {
    displayHTML =
      `<div><strong>Bokmål:</strong> ${translationBokmaal}</div>` +
      `<div style="width: 100%; border-top: 1px solid #000; margin: 4px 0;"></div>` +
      `<div><strong>Nynorsk:</strong> ${translationNynorsk}</div>`;
  } else if (translationBokmaal) {
    displayHTML = `<div><strong>Bokmål:</strong> ${translationBokmaal}</div>`;
  } else if (translationNynorsk) {
    displayHTML = `<div><strong>Nynorsk:</strong> ${translationNynorsk}</div>`;
  } else {
    hideTooltip();
    return;
  }
  
  showTooltip(e.pageX, e.pageY, displayHTML);
});
