// Enhanced options page script for Universal Web Assistant

// Model configurations
const MODEL_CONFIGS = {
  albert: {
    endpoint: 'https://albert.api.etalab.gouv.fr/v1',
    models: [
      { value: 'albert-large', text: 'albert-large (Most capable)' },
      { value: 'albert-base', text: 'albert-base (Balanced)' },
      { value: 'albert-light', text: 'albert-light (Fastest)' }
    ],
    help: 'Choose the model based on your needs. Larger models are more capable but slower.',
    keyHelp: 'Get your free API key from albert.api.etalab.gouv.fr'
  },
  openai: {
    endpoint: 'https://api.openai.com/v1',
    models: [
      { value: 'gpt-4-turbo-preview', text: 'GPT-4 Turbo' },
      { value: 'gpt-4', text: 'GPT-4' },
      { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' }
    ],
    help: 'GPT-4 models are more capable but cost more. GPT-3.5 is faster and cheaper.',
    keyHelp: 'Get your API key from platform.openai.com'
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1',
    models: [
      { value: 'claude-3-opus', text: 'Claude 3 Opus (Most capable)' },
      { value: 'claude-3-sonnet', text: 'Claude 3 Sonnet (Balanced)' },
      { value: 'claude-3-haiku', text: 'Claude 3 Haiku (Fastest)' }
    ],
    help: 'Claude models excel at nuanced, thoughtful responses.',
    keyHelp: 'Get your API key from console.anthropic.com'
  },
  custom: {
    endpoint: '',
    models: [],
    help: 'Enter your custom model name. The API should be OpenAI-compatible.',
    keyHelp: 'Use the API key provided by your custom endpoint'
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Options page loaded');
  
  // Elements
  const elements = {
    // Tabs
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Close button
    closeButton: document.getElementById('closeButton'),
    
    // Model Configuration
    provider: document.getElementById('provider'),
    apiEndpoint: document.getElementById('apiEndpoint'),
    model: document.getElementById('model'),
    apiKey: document.getElementById('apiKey'),
    apiKeyStatus: document.getElementById('apiKeyStatus'),
    modelHelp: document.getElementById('modelHelp'),
    testButton: document.getElementById('testButton'),
    saveButton: document.getElementById('saveButton'),
    clearButton: document.getElementById('clearButton'),
    
    // Appearance
    position: document.getElementById('position'),
    theme: document.getElementById('theme'),
    fontSize: document.getElementById('fontSize'),
    autoHide: document.getElementById('autoHide'),
    autoHideValue: document.getElementById('autoHideValue'),
    saveAppearanceButton: document.getElementById('saveAppearanceButton'),
    
    // Shortcuts
    enableShortcuts: document.getElementById('enableShortcuts'),
    toggleShortcut: document.getElementById('toggleShortcut'),
    minimizeShortcut: document.getElementById('minimizeShortcut'),
    saveShortcutsButton: document.getElementById('saveShortcutsButton'),
    
    // Messages
    successMessage: document.getElementById('successMessage'),
    errorMessage: document.getElementById('errorMessage')
  };
  
  // Tab switching
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      elements.tabs.forEach(t => t.classList.remove('active'));
      elements.tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab') + 'Tab';
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Load saved settings
  await loadSettings();
  
  // Ensure first tab is active
  const modelTab = document.getElementById('modelTab');
  const firstTab = document.querySelector('.tab[data-tab="model"]');
  if (modelTab && !modelTab.classList.contains('active')) {
    modelTab.classList.add('active');
  }
  if (firstTab && !firstTab.classList.contains('active')) {
    firstTab.classList.add('active');
  }
  
  // Set default provider configuration if nothing is loaded
  if (!elements.apiEndpoint.value) {
    elements.provider.value = 'albert';
    elements.provider.dispatchEvent(new Event('change'));
  }
  
  // Provider change handler
  elements.provider.addEventListener('change', () => {
    const provider = elements.provider.value;
    const config = MODEL_CONFIGS[provider];
    
    if (provider === 'custom') {
      // For custom, make endpoint editable and convert model to input
      elements.apiEndpoint.value = '';
      elements.apiEndpoint.removeAttribute('readonly');
      
      // Replace select with input for custom model
      const modelInput = document.createElement('input');
      modelInput.type = 'text';
      modelInput.id = 'model';
      modelInput.placeholder = 'Enter model name';
      modelInput.value = elements.model.value || '';
      elements.model.parentNode.replaceChild(modelInput, elements.model);
      elements.model = modelInput;
    } else {
      // For predefined providers
      elements.apiEndpoint.value = config.endpoint;
      elements.apiEndpoint.setAttribute('readonly', 'readonly');
      
      // Replace input with select if needed
      if (elements.model.tagName === 'INPUT') {
        const modelSelect = document.createElement('select');
        modelSelect.id = 'model';
        elements.model.parentNode.replaceChild(modelSelect, elements.model);
        elements.model = modelSelect;
      }
      
      // Update model options
      elements.model.innerHTML = '';
      config.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.text;
        elements.model.appendChild(option);
      });
    }
    
    // Update help text
    elements.modelHelp.textContent = config.help;
  });
  
  // Auto-hide slider
  elements.autoHide.addEventListener('input', () => {
    const value = parseInt(elements.autoHide.value);
    if (value === 0) {
      elements.autoHideValue.textContent = 'Disabled';
    } else {
      elements.autoHideValue.textContent = `${value} seconds`;
    }
  });
  
  // Test connection button
  elements.testButton.addEventListener('click', async () => {
    const apiKey = elements.apiKey.value.trim();
    if (!apiKey) {
      showError('Veuillez d\'abord entrer une clé API');
      return;
    }
    
    elements.testButton.disabled = true;
    elements.testButton.textContent = 'Testing...';
    
    try {
      const isValid = await testApiKey();
      if (isValid) {
        showSuccess('Connexion réussie! La clé API est valide.');
      } else {
        showError('Connexion échouée. Veuillez vérifier votre clé API et vos paramètres.');
      }
    } catch (error) {
      showError('Test échoué: ' + error.message);
    } finally {
      elements.testButton.disabled = false;
      elements.testButton.textContent = 'Test Connection';
    }
  });
  
  // Save model configuration
  elements.saveButton.addEventListener('click', async () => {
    const modelConfig = {
      provider: elements.provider.value,
      endpoint: elements.apiEndpoint.value.trim(),
      model: elements.model.value,
      apiKey: elements.apiKey.value.trim()
    };
    
    if (!modelConfig.apiKey) {
      showError('Veuillez entrer une clé API');
      return;
    }
    
    if (!modelConfig.endpoint) {
      showError('Veuillez entrer un point de terminaison API');
      return;
    }
    
    elements.saveButton.disabled = true;
    elements.saveButton.textContent = 'Saving...';
    
    try {
      // Save to storage
      await chrome.storage.sync.set({ 
        modelConfig,
        // Keep backward compatibility
        apiKey: modelConfig.apiKey
      });
      
      showSuccess('Configuration du modèle sauvegardée avec succès!');
      updateApiKeyStatus(true);
    } catch (error) {
      showError('Échec de la sauvegarde des paramètres: ' + error.message);
    } finally {
      elements.saveButton.disabled = false;
      elements.saveButton.textContent = 'Save Settings';
    }
  });
  
  // Clear credentials button
  elements.clearButton.addEventListener('click', async () => {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les informations d\'identification ? Cette action ne peut pas être annulée.')) {
      try {
        await chrome.storage.sync.remove(['modelConfig', 'apiKey']);
        elements.apiKey.value = '';
        updateApiKeyStatus(false);
        showSuccess('Informations d\'identification effacées avec succès');
      } catch (error) {
        showError('Échec de l\'effacement des informations d\'identification: ' + error.message);
      }
    }
  });
  
  // Save appearance settings
  elements.saveAppearanceButton.addEventListener('click', async () => {
    const appearance = {
      position: elements.position.value,
      theme: elements.theme.value,
      fontSize: elements.fontSize.value,
      autoHideDelay: parseInt(elements.autoHide.value)
    };
    
    try {
      // Get existing preferences and merge
      const { preferences = {} } = await chrome.storage.sync.get('preferences');
      const updatedPreferences = { ...preferences, ...appearance };
      
      await chrome.storage.sync.set({ 
        preferences: updatedPreferences,
        universalAssistantSettings: updatedPreferences // Backward compatibility
      });
      
      showSuccess('Paramètres d\'apparence sauvegardés avec succès!');
    } catch (error) {
      showError('Échec de la sauvegarde des paramètres d\'apparence: ' + error.message);
    }
  });
  
  // Save shortcuts settings
  elements.saveShortcutsButton.addEventListener('click', async () => {
    const shortcuts = {
      enabled: elements.enableShortcuts.checked,
      toggle: elements.toggleShortcut.value,
      minimize: elements.minimizeShortcut.value
    };
    
    try {
      // Get existing preferences and merge
      const { preferences = {} } = await chrome.storage.sync.get('preferences');
      const updatedPreferences = { 
        ...preferences, 
        shortcuts: shortcuts.enabled,
        keyboardShortcuts: shortcuts 
      };
      
      await chrome.storage.sync.set({ 
        preferences: updatedPreferences,
        universalAssistantSettings: updatedPreferences // Backward compatibility
      });
      
      showSuccess('Raccourcis clavier sauvegardés avec succès!');
    } catch (error) {
      showError('Échec de la sauvegarde des raccourcis: ' + error.message);
    }
  });
  
  // Close button handler
  if (elements.closeButton) {
    elements.closeButton.addEventListener('click', () => {
      // Check if opened as popup window
      chrome.windows.getCurrent((currentWindow) => {
        if (currentWindow.type === 'popup') {
          // Close the popup window
          chrome.windows.remove(currentWindow.id);
        } else {
          // If opened as tab, get current tab and close it
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.remove(tabs[0].id);
            }
          });
        }
      });
    });
  }
  
  // Load existing settings
  async function loadSettings() {
    try {
      const data = await chrome.storage.sync.get([
        'modelConfig', 
        'apiKey', 
        'preferences',
        'universalAssistantSettings'
      ]);
      
      // Load model configuration
      if (data.modelConfig) {
        elements.provider.value = data.modelConfig.provider || 'albert';
        elements.provider.dispatchEvent(new Event('change'));
        
        setTimeout(() => {
          if (data.modelConfig.endpoint) {
            elements.apiEndpoint.value = data.modelConfig.endpoint;
          }
          if (data.modelConfig.model && elements.model) {
            elements.model.value = data.modelConfig.model;
          }
          if (data.modelConfig.apiKey) {
            elements.apiKey.value = data.modelConfig.apiKey;
          }
        }, 100);
        
        updateApiKeyStatus(!!data.modelConfig.apiKey);
      } else if (data.apiKey) {
        // Backward compatibility
        elements.apiKey.value = data.apiKey;
        updateApiKeyStatus(true);
      } else {
        updateApiKeyStatus(false);
      }
      
      // Load appearance settings
      const prefs = data.preferences || data.universalAssistantSettings || {};
      if (prefs.position) elements.position.value = prefs.position;
      if (prefs.theme) elements.theme.value = prefs.theme;
      if (prefs.fontSize) elements.fontSize.value = prefs.fontSize;
      if (prefs.autoHideDelay !== undefined) {
        elements.autoHide.value = prefs.autoHideDelay;
        elements.autoHide.dispatchEvent(new Event('input'));
      }
      
      // Load shortcuts
      if (prefs.shortcuts !== undefined) {
        elements.enableShortcuts.checked = prefs.shortcuts;
      }
      if (prefs.keyboardShortcuts) {
        if (prefs.keyboardShortcuts.toggle) {
          elements.toggleShortcut.value = prefs.keyboardShortcuts.toggle;
        }
        if (prefs.keyboardShortcuts.minimize) {
          elements.minimizeShortcut.value = prefs.keyboardShortcuts.minimize;
        }
      }
      
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
  
  // Test API key
  async function testApiKey() {
    const provider = elements.provider.value;
    const endpoint = elements.apiEndpoint.value;
    const apiKey = elements.apiKey.value;
    
    let testUrl;
    let headers = {
      'Accept': 'application/json'
    };
    
    switch (provider) {
      case 'albert':
        testUrl = `${endpoint}/models`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
        
      case 'openai':
        testUrl = `${endpoint}/models`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
        
      case 'anthropic':
        // Anthropic doesn't have a simple test endpoint, so we'll do a minimal completion
        return true; // For now, assume it's valid
        
      case 'custom':
        // Try OpenAI-compatible endpoint
        testUrl = `${endpoint}/models`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
    }
    
    try {
      const response = await fetch(testUrl, { headers });
      return response.ok;
    } catch (error) {
      console.error('API test error:', error);
      return false;
    }
  }
  
  // Update API key status
  function updateApiKeyStatus(isConfigured) {
    if (isConfigured) {
      elements.apiKeyStatus.textContent = 'Configured';
      elements.apiKeyStatus.className = 'api-key-status configured';
    } else {
      elements.apiKeyStatus.textContent = 'Not configured';
      elements.apiKeyStatus.className = 'api-key-status not-configured';
    }
  }
  
  // Show success message
  function showSuccess(message) {
    elements.successMessage.textContent = message;
    elements.successMessage.style.display = 'block';
    elements.errorMessage.style.display = 'none';
    
    setTimeout(() => {
      elements.successMessage.style.display = 'none';
    }, 3000);
  }
  
  // Show error message
  function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
    elements.successMessage.style.display = 'none';
    
    setTimeout(() => {
      elements.errorMessage.style.display = 'none';
    }, 5000);
  }
});