// Universal Web Assistant - Background Service Worker

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  blacklist: [],
  preferences: {
    position: 'bottom-right',
    shortcuts: true,
    autoHide: false,
    theme: 'auto'
  }
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  // Set default settings
  const settings = await chrome.storage.sync.get('universalAssistantSettings');
  if (!settings.universalAssistantSettings) {
    await chrome.storage.sync.set({
      universalAssistantSettings: DEFAULT_SETTINGS.preferences,
      blacklist: DEFAULT_SETTINGS.blacklist
    });
  }
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'toggleAssistant',
    title: 'Toggle Universal Assistant',
    contexts: ['all']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'toggleAssistant') {
    chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'pageLoad':
      // Log page load for analytics (if needed)
      console.log('Universal Assistant loaded on:', request.context.url);
      break;
      
    case 'getSettings':
      chrome.storage.sync.get(['universalAssistantSettings', 'blacklist'], (result) => {
        sendResponse({
          settings: result.universalAssistantSettings || DEFAULT_SETTINGS.preferences,
          blacklist: result.blacklist || []
        });
      });
      return true; // Keep channel open for async response
      
    case 'updateBlacklist':
      chrome.storage.sync.get('blacklist', (result) => {
        const blacklist = result.blacklist || [];
        const domain = request.domain;
        
        if (request.action === 'add' && !blacklist.includes(domain)) {
          blacklist.push(domain);
        } else if (request.action === 'remove') {
          const index = blacklist.indexOf(domain);
          if (index > -1) blacklist.splice(index, 1);
        }
        
        chrome.storage.sync.set({ blacklist }, () => {
          sendResponse({ success: true, blacklist });
        });
      });
      return true;
      
    case 'error':
      // Log errors for debugging
      console.error('Universal Assistant Error:', request.error);
      break;
  }
});

// Handle tab updates (for dynamic SPAs)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Notify content script of URL change
    chrome.tabs.sendMessage(tabId, { 
      type: 'urlChanged', 
      url: tab.url 
    }).catch(() => {
      // Content script not loaded yet, ignore
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Toggle the assistant on the current tab
  chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
});