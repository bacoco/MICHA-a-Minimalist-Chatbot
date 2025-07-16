// Universal Web Assistant - Popup Script

// DOM elements - with null checks
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
const apiConfiguredSection = document.getElementById('apiConfiguredSection');
const changeApiKeyButton = document.getElementById('changeApiKey');
const openAdvancedSettingsButton = document.getElementById('openAdvancedSettings');
const settingsButton = document.getElementById('settingsButton');

// Loading state tracking
let isLoadingSettings = false;

// Storage keys
const SETTINGS_KEY = 'universalAssistantSettings';
const BLACKLIST_KEY = 'blacklist';

/**
 * Opens the options page in a popup window with consistent positioning
 * @description Reusable function to avoid code duplication
 */
function openOptionsPage() {
  chrome.windows.create({
    url: chrome.runtime.getURL('options.html'),
    type: 'popup',
    width: 800,
    height: 700,
    left: Math.round((screen.width - 800) / 2),
    top: Math.round((screen.height - 700) / 2)
  });
  window.close();
}

/**
 * Validates Albert API key format
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // Basic validation: should be a non-empty string with reasonable length
  const trimmed = apiKey.trim();
  if (trimmed.length < 10 || trimmed.length > 200) {
    return false;
  }
  
  // Check for suspicious patterns that might indicate invalid keys
  if (trimmed.includes(' ') || trimmed.includes('\n') || trimmed.includes('\t')) {
    return false;
  }
  
  return true;
}

/**
 * Shows loading state for a button
 * @param {HTMLElement} button - The button element
 * @param {string} loadingText - Text to show during loading
 */
function showLoadingState(button, loadingText = '...') {
  if (!button) return;
  
  button.dataset.originalText = button.textContent;
  button.textContent = loadingText;
  button.disabled = true;
}

/**
 * Hides loading state for a button
 * @param {HTMLElement} button - The button element
 */
function hideLoadingState(button) {
  if (!button) return;
  
  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
  delete button.dataset.originalText;
}

// Load settings on popup open
async function loadSettings() {
  // Prevent race conditions by checking if already loading
  if (isLoadingSettings) {
    return;
  }
  
  isLoadingSettings = true;
  
  try {
    const data = await chrome.storage.sync.get([SETTINGS_KEY, BLACKLIST_KEY, 'apiKey', 'modelConfig']);
    
    // Check if API key is configured with null checks
    if (data.apiKey || data.modelConfig?.apiKey) {
      // Hide API key warning if configured
      if (apiKeySection) apiKeySection.style.display = 'none';
      if (apiConfiguredSection) apiConfiguredSection.style.display = 'block';
    } else {
      // Show API key warning if not configured
      if (apiKeySection) apiKeySection.style.display = 'block';
      if (apiConfiguredSection) apiConfiguredSection.style.display = 'none';
    }
  
    // Load preferences with null checks
    const settings = data[SETTINGS_KEY] || {
      enabled: true,
      position: 'bottom-right',
      shortcuts: true,
      theme: 'auto'
    };
    
    if (enableToggle) enableToggle.checked = settings.enabled;
    if (shortcutsToggle) shortcutsToggle.checked = settings.shortcuts;
    if (positionSelect) positionSelect.value = settings.position;
    if (themeSelect) themeSelect.value = settings.theme;
    
    // Load blacklist
    const blacklist = data[BLACKLIST_KEY] || [];
    renderBlacklist(blacklist);
  } catch (error) {
    console.error('Failed to load settings:', error);
  } finally {
    isLoadingSettings = false;
  }
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
  if (!blacklistItems) return;
  
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

// Event listeners with null checks
if (enableToggle) enableToggle.addEventListener('change', saveSettings);
if (shortcutsToggle) shortcutsToggle.addEventListener('change', saveSettings);
if (positionSelect) positionSelect.addEventListener('change', saveSettings);
if (themeSelect) themeSelect.addEventListener('change', saveSettings);
if (addBlacklistButton) addBlacklistButton.addEventListener('click', addDomain);

// Enter key on blacklist input
if (blacklistInput) {
  blacklistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addDomain();
    }
  });
}

// Add context menu for current site (removed to avoid conflicts)
// document.addEventListener('contextmenu', (e) => {
//   e.preventDefault();
//   addCurrentSite();
//   return false;
// });

// Configure API Key button handler - show quick config
if (configureApiKeyButton) {
  configureApiKeyButton.addEventListener('click', () => {
    if (configureApiKeyButton) configureApiKeyButton.style.display = 'none';
    if (quickConfig) quickConfig.style.display = 'block';
    if (quickApiKey) quickApiKey.focus();
  });
}

// Save API key directly from popup
if (saveApiKeyButton) {
  saveApiKeyButton.addEventListener('click', async () => {
    if (!quickApiKey) {
      alert('API key input not found');
      return;
    }
    
    const apiKey = quickApiKey.value.trim();
    
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }
    
    // Validate API key format
    if (!validateApiKey(apiKey)) {
      alert('Invalid API key format. Please ensure it is a valid Albert API key (10-200 characters, no spaces or special characters).');
      return;
    }
    
    showLoadingState(saveApiKeyButton, '...');
    
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
      
      // Hide the API key section and show configured section
      if (apiKeySection) apiKeySection.style.display = 'none';
      if (apiConfiguredSection) apiConfiguredSection.style.display = 'block';
      
      // Notify content scripts
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          type: 'apiKeyConfigured' 
        }).catch(() => {});
      });
      
    } catch (error) {
      console.error('Failed to save API key:', error);
      
      // Provide specific error messages
      let errorMessage = 'Failed to save API key';
      if (error.message.includes('quota')) {
        errorMessage = 'Storage quota exceeded. Please free up space and try again.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = `Failed to save API key: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      hideLoadingState(saveApiKeyButton);
    }
  });
}

// Advanced configuration button
if (advancedConfigButton) {
  advancedConfigButton.addEventListener('click', openOptionsPage);
}

// Enter key on API key input
if (quickApiKey && saveApiKeyButton) {
  quickApiKey.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveApiKeyButton.click();
    }
  });
}

// Settings button handler
if (settingsButton) {
  settingsButton.addEventListener('click', openOptionsPage);
}

// Change API Key button handler
if (changeApiKeyButton) {
  changeApiKeyButton.addEventListener('click', () => {
    // Show the API key configuration section with null checks
    if (apiConfiguredSection) apiConfiguredSection.style.display = 'none';
    if (apiKeySection) apiKeySection.style.display = 'block';
    if (configureApiKeyButton) configureApiKeyButton.style.display = 'none';
    if (quickConfig) quickConfig.style.display = 'block';
    if (quickApiKey) quickApiKey.focus();
  });
}

// Open Advanced Settings button handler
if (openAdvancedSettingsButton) {
  openAdvancedSettingsButton.addEventListener('click', openOptionsPage);
}

// Initialize
loadSettings();