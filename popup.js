document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('toggle');
  
    // Request the current state from storage.
    chrome.storage.sync.get('enabled', function(data) {
      // If there is no stored value, default to true and update storage.
      if (typeof data.enabled === 'undefined') {
        chrome.storage.sync.set({ enabled: true }, function() {
          toggle.checked = true;
        });
      } else {
        toggle.checked = data.enabled;
      }
    });
  
    // Listen for toggle changes.
    toggle.addEventListener('change', function() {
      chrome.storage.sync.set({ enabled: toggle.checked }, function() {
        console.log('Extension enabled state set to:', toggle.checked);
      });
    });
  });
  