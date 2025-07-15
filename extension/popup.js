// Universal Web Assistant - Popup Script

// DOM elements
const enableToggle = document.getElementById('enableToggle');
const shortcutsToggle = document.getElementById('shortcutsToggle');
const positionSelect = document.getElementById('positionSelect');
const themeSelect = document.getElementById('themeSelect');
const blacklistInput = document.getElementById('blacklistInput');
const addBlacklistButton = document.getElementById('addBlacklistButton');
const blacklistItems = document.getElementById('blacklistItems');
const configureApiKeyButton = document.getElementById('configureApiKey');
const quickConfig = document.getElementById('quickConfig');
const quickApiKey = document.getElementById('quickApiKey');
const saveApiKeyButton = document.getElementById('saveApiKey');
const advancedConfigButton = document.getElementById('advancedConfig');
const apiKeySection = document.getElementById('apiKeySection');

// Storage keys
const SETTINGS_KEY = 'universalAssistantSettings';
const BLACKLIST_KEY = 'blacklist';

// Load settings on popup open
async function loadSettings() {
  const data = await chrome.storage.sync.get([SETTINGS_KEY, BLACKLIST_KEY, 'apiKey']);
  
  // Check if API key is configured
  if (data.apiKey) {
    // Hide API key warning if configured
    apiKeySection.style.display = 'none';
  } else {
    // Show API key warning if not configured
    apiKeySection.style.display = 'block';
  }
  
  // Load preferences
  const settings = data[SETTINGS_KEY] || {
    enabled: true,
    position: 'bottom-right',
    shortcuts: true,
    theme: 'auto'
  };
  
  enableToggle.checked = settings.enabled;
  shortcutsToggle.checked = settings.shortcuts;
  positionSelect.value = settings.position;
  themeSelect.value = settings.theme;
  
  // Load blacklist
  const blacklist = data[BLACKLIST_KEY] || [];
  renderBlacklist(blacklist);
}

// Save settings
async function saveSettings() {
  const settings = {
    enabled: enableToggle.checked,
    position: positionSelect.value,
    shortcuts: shortcutsToggle.checked,
    theme: themeSelect.value
  };
  
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
  
  // Notify all tabs about settings change
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, { 
      type: 'settingsUpdated', 
      settings 
    }).catch(() => {
      // Ignore errors for tabs without content script
    });
  });
}

// Render blacklist
function renderBlacklist(blacklist) {
  blacklistItems.innerHTML = '';
  
  if (blacklist.length === 0) {
    blacklistItems.innerHTML = '<div style="text-align: center; color: #9CA3AF; padding: 20px;">No blacklisted sites</div>';
    return;
  }
  
  blacklist.forEach(domain => {
    const item = document.createElement('div');
    item.className = 'blacklist-item';
    item.innerHTML = `
      <span>${domain}</span>
      <button class="remove-button" data-domain="${domain}">×</button>
    `;
    blacklistItems.appendChild(item);
  });
  
  // Add remove listeners
  blacklistItems.querySelectorAll('.remove-button').forEach(button => {
    button.addEventListener('click', () => removeDomain(button.dataset.domain));
  });
}

// Add domain to blacklist
async function addDomain() {
  const domain = blacklistInput.value.trim().toLowerCase();
  
  if (!domain) return;
  
  // Basic domain validation
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    alert('Please enter a valid domain (e.g., example.com)');
    return;
  }
  
  const data = await chrome.storage.sync.get(BLACKLIST_KEY);
  const blacklist = data[BLACKLIST_KEY] || [];
  
  if (blacklist.includes(domain)) {
    alert('This domain is already blacklisted');
    return;
  }
  
  blacklist.push(domain);
  await chrome.storage.sync.set({ [BLACKLIST_KEY]: blacklist });
  
  blacklistInput.value = '';
  renderBlacklist(blacklist);
  
  // Notify current tab if it matches the blacklisted domain
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab && activeTab.url) {
    const tabDomain = new URL(activeTab.url).hostname;
    if (tabDomain === domain || tabDomain.endsWith('.' + domain)) {
      chrome.tabs.sendMessage(activeTab.id, { type: 'blacklistUpdated' });
    }
  }
}

// Remove domain from blacklist
async function removeDomain(domain) {
  const data = await chrome.storage.sync.get(BLACKLIST_KEY);
  const blacklist = data[BLACKLIST_KEY] || [];
  
  const index = blacklist.indexOf(domain);
  if (index > -1) {
    blacklist.splice(index, 1);
    await chrome.storage.sync.set({ [BLACKLIST_KEY]: blacklist });
    renderBlacklist(blacklist);
    
    // Notify current tab if it matches the removed domain
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url) {
      const tabDomain = new URL(activeTab.url).hostname;
      if (tabDomain === domain || tabDomain.endsWith('.' + domain)) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'blacklistUpdated' });
      }
    }
  }
}

// Add current site to blacklist
async function addCurrentSite() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (activeTab && activeTab.url) {
    try {
      const url = new URL(activeTab.url);
      const domain = url.hostname;
      
      if (domain) {
        blacklistInput.value = domain;
        await addDomain();
      }
    } catch (error) {
      console.error('Invalid URL:', error);
    }
  }
}

// Event listeners
enableToggle.addEventListener('change', saveSettings);
shortcutsToggle.addEventListener('change', saveSettings);
positionSelect.addEventListener('change', saveSettings);
themeSelect.addEventListener('change', saveSettings);
addBlacklistButton.addEventListener('click', addDomain);

// Enter key on blacklist input
blacklistInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addDomain();
  }
});

// Add context menu for current site (removed to avoid conflicts)
// document.addEventListener('contextmenu', (e) => {
//   e.preventDefault();
//   addCurrentSite();
//   return false;
// });

// Configure API Key button handler - show quick config
if (configureApiKeyButton) {
  configureApiKeyButton.addEventListener('click', () => {
    configureApiKeyButton.style.display = 'none';
    quickConfig.style.display = 'block';
    quickApiKey.focus();
  });
}

// Save API key directly from popup
if (saveApiKeyButton) {
  saveApiKeyButton.addEventListener('click', async () => {
    const apiKey = quickApiKey.value.trim();
    
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }
    
    try {
      // Save API key with default Albert configuration
      await chrome.storage.sync.set({ 
        apiKey: apiKey,
        modelConfig: {
          provider: 'albert',
          endpoint: 'https://albert.api.etalab.gouv.fr/v1',
          model: 'albert-large',
          apiKey: apiKey
        }
      });
      
      // Hide the API key section
      apiKeySection.style.display = 'none';
      
      // Notify content scripts
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          type: 'apiKeyConfigured' 
        }).catch(() => {});
      });
      
    } catch (error) {
      alert('Failed to save API key: ' + error.message);
    }
  });
}

// Advanced configuration button
if (advancedConfigButton) {
  advancedConfigButton.addEventListener('click', () => {
    // Open options page in a popup window for better UX
    chrome.windows.create({
      url: chrome.runtime.getURL('options.html'),
      type: 'popup',
      width: 800,
      height: 700,
      left: Math.round((screen.width - 800) / 2),
      top: Math.round((screen.height - 700) / 2)
    });
    // Close the extension popup
    window.close();
  });
}

// Enter key on API key input
if (quickApiKey) {
  quickApiKey.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveApiKeyButton.click();
    }
  });
}

// Initialize
loadSettings();