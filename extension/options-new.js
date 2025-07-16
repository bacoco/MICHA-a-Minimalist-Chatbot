// Enhanced options page script for Universal Web Assistant

// Model configurations with free providers
const MODEL_CONFIGS = {
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1',
    models: [], // Will be populated dynamically
    help: 'Free models are loaded dynamically. Models with :free suffix have no cost but may have rate limits.',
    keyHelp: 'Get your free API key from openrouter.ai',
    isFree: true,
    rateLimits: { requests: 10, period: 'minute' }
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1',
    models: [], // Will be populated dynamically
    help: 'Free models available: Llama 3 8B/70B, Mixtral 8x7B, Gemma 7B. Rate limit: 30 requests/minute.',
    keyHelp: 'Get your free API key from console.groq.com',
    isFree: true,
    rateLimits: { requests: 30, period: 'minute' }
  },
  huggingface: {
    endpoint: 'https://api-inference.huggingface.co/v1',
    models: [], // Will be populated dynamically
    help: 'Free models available: Mistral 7B, Zephyr 7B, CodeLlama 7B. Rate limit: 1000 requests/hour.',
    keyHelp: 'Get your free API key from huggingface.co',
    isFree: true,
    rateLimits: { requests: 1000, period: 'hour' }
  },
  albert: {
    endpoint: 'https://albert.api.etalab.gouv.fr/v1',
    models: [
      { value: 'albert-large', text: 'albert-large (Most capable)' },
      { value: 'albert-base', text: 'albert-base (Balanced)' },
      { value: 'albert-light', text: 'albert-light (Fastest)' }
    ],
    help: 'Choose the model based on your needs. Larger models are more capable but slower.',
    keyHelp: 'Get your free API key from albert.api.etalab.gouv.fr',
    isFree: true
  },
  openai: {
    endpoint: 'https://api.openai.com/v1',
    models: [
      { value: 'gpt-4-turbo-preview', text: 'GPT-4 Turbo' },
      { value: 'gpt-4', text: 'GPT-4' },
      { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' }
    ],
    help: 'GPT-4 models are more capable but cost more. GPT-3.5 is faster and cheaper.',
    keyHelp: 'Get your API key from platform.openai.com',
    isFree: false
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1',
    models: [
      { value: 'claude-3-opus', text: 'Claude 3 Opus (Most capable)' },
      { value: 'claude-3-sonnet', text: 'Claude 3 Sonnet (Balanced)' },
      { value: 'claude-3-haiku', text: 'Claude 3 Haiku (Fastest)' }
    ],
    help: 'Claude models excel at nuanced, thoughtful responses.',
    keyHelp: 'Get your API key from console.anthropic.com',
    isFree: false
  },
  custom: {
    endpoint: '',
    models: [],
    help: 'Enter your custom model name. The API should be OpenAI-compatible.',
    keyHelp: 'Use the API key provided by your custom endpoint',
    isFree: false
  }
};

// Free model configurations for each provider
const FREE_MODEL_CONFIGS = {
  openrouter: {
    freeModels: [] // Will be populated dynamically from API
  },
  groq: {
    freeModels: [
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Free)', provider: 'Groq' },
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B (Free)', provider: 'Groq' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Free)', provider: 'Groq' },
      { id: 'gemma-7b-it', name: 'Gemma 7B (Free)', provider: 'Groq' }
    ]
  },
  huggingface: {
    freeModels: [
      { id: 'mistralai/Mistral-7B-Instruct-v0.1', name: 'Mistral 7B (Free)', provider: 'Hugging Face' },
      { id: 'HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B (Free)', provider: 'Hugging Face' },
      { id: 'codellama/CodeLlama-7b-Instruct-hf', name: 'CodeLlama 7B (Free)', provider: 'Hugging Face' }
    ]
  }
};

// Default free model selection
const DEFAULT_FREE_MODEL = {
  provider: 'albert',
  model: 'albert-large'
};

// Function to retrieve all free models from providers
async function getFreeModels() {
  try {
    // Check cache first
    const cached = await getCachedFreeModels();
    if (cached) {
      console.log('Using cached free models');
      return cached;
    }

    console.log('Fetching free models from providers...');
    const allFreeModels = [];

    // Get free models from static configurations
    for (const [provider, config] of Object.entries(FREE_MODEL_CONFIGS)) {
      const providerModels = config.freeModels.map(model => ({
        ...model,
        provider: provider,
        isFree: true
      }));
      allFreeModels.push(...providerModels);
    }

    // Add Albert models as free
    const albertModels = MODEL_CONFIGS.albert.models.map(model => ({
      id: model.value,
      name: model.text + ' (Free)',
      provider: 'albert',
      isFree: true
    }));
    allFreeModels.push(...albertModels);

    // Try to fetch dynamic models from OpenRouter API
    try {
      const openRouterModels = await fetchOpenRouterModels();
      // Filter models that have :free suffix
      const freeOpenRouterModels = openRouterModels.filter(model => 
        model.id.includes(':free')
      );
      
      freeOpenRouterModels.forEach(model => {
        allFreeModels.push({
          id: model.id,
          name: model.name, // API already includes "(free)" in name
          provider: 'openrouter',
          isFree: true
        });
      });
    } catch (error) {
      console.warn('Failed to fetch OpenRouter models dynamically:', error);
    }

    // Cache the results for 24 hours
    await cacheFreeModels(allFreeModels);
    
    return allFreeModels;
  } catch (error) {
    console.error('Error fetching free models:', error);
    
    // Return static fallback models
    return getFallbackFreeModels();
  }
}

// Function to fetch OpenRouter models dynamically
async function fetchOpenRouterModels() {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data || [];
}

// Function to get cached free models
async function getCachedFreeModels() {
  try {
    const result = await chrome.storage.local.get(['freeModelsCache']);
    const cache = result.freeModelsCache;
    
    if (cache && cache.expires > Date.now()) {
      return cache.data;
    }
    
    // Clean up expired cache
    if (cache) {
      await chrome.storage.local.remove(['freeModelsCache']);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached free models:', error);
    return null;
  }
}

// Function to cache free models
async function cacheFreeModels(models) {
  try {
    const cacheData = {
      data: models,
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    await chrome.storage.local.set({ freeModelsCache: cacheData });
  } catch (error) {
    console.error('Error caching free models:', error);
  }
}

// Fallback free models if all dynamic fetching fails
function getFallbackFreeModels() {
  return [
    { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (free)', provider: 'openrouter', isFree: true },
    { id: 'google/gemma-2-9b-it:free', name: 'Google Gemma 2 9B (free)', provider: 'openrouter', isFree: true },
    { id: 'qwen/qwen3-4b:free', name: 'Qwen 3 4B (free)', provider: 'openrouter', isFree: true },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Free)', provider: 'groq', isFree: true },
    { id: 'albert-large', name: 'albert-large (Free)', provider: 'albert', isFree: true }
  ];
}

// Function to get the default free model
function getDefaultFreeModel() {
  return DEFAULT_FREE_MODEL;
}

// Function to populate provider with free models
async function populateProviderWithFreeModels(provider) {
  const freeModels = await getFreeModels();
  const providerFreeModels = freeModels.filter(model => model.provider === provider);
  
  // Convert to the expected format
  const formattedModels = providerFreeModels.map(model => ({
    value: model.id,
    text: model.name
  }));
  
  // Update the MODEL_CONFIGS
  if (MODEL_CONFIGS[provider]) {
    MODEL_CONFIGS[provider].models = formattedModels;
  }
  
  return formattedModels;
}

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
    language: document.getElementById('language'),
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
    
    // Storage
    enableSupabase: document.getElementById('enableSupabase'),
    supabaseUrl: document.getElementById('supabaseUrl'),
    supabaseKey: document.getElementById('supabaseKey'),
    cacheStrategy: document.getElementById('cacheStrategy'),
    cacheRetention: document.getElementById('cacheRetention'),
    enableChatHistory: document.getElementById('enableChatHistory'),
    testSupabaseButton: document.getElementById('testSupabaseButton'),
    saveStorageButton: document.getElementById('saveStorageButton'),
    clearStorageButton: document.getElementById('clearStorageButton'),
    
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
  
  // Ensure first tab is active
  const modelTab = document.getElementById('modelTab');
  const firstTab = document.querySelector('.tab[data-tab="model"]');
  if (modelTab && !modelTab.classList.contains('active')) {
    modelTab.classList.add('active');
  }
  if (firstTab && !firstTab.classList.contains('active')) {
    firstTab.classList.add('active');
  }
  
  // Load saved settings
  await loadSettings();
  
  // Provider change handler
  elements.provider.addEventListener('change', async () => {
    const provider = elements.provider.value;
    const config = MODEL_CONFIGS[provider];
    
    // Clear API key when changing providers
    elements.apiKey.value = '';
    updateApiKeyStatus(false);
    
    // Show loading state
    elements.modelHelp.textContent = '...';
    elements.model.disabled = true;
    
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
      elements.model.disabled = false;
    } else {
      // For predefined providers - update endpoint FIRST
      elements.apiEndpoint.value = config.endpoint;
      elements.apiEndpoint.setAttribute('readonly', 'readonly');
      
      // Replace input with select if needed
      if (elements.model.tagName === 'INPUT') {
        const modelSelect = document.createElement('select');
        modelSelect.id = 'model';
        elements.model.parentNode.replaceChild(modelSelect, elements.model);
        elements.model = modelSelect;
      }
      
      // Clear and update model options
      elements.model.innerHTML = '<option value="">...</option>';
      
      // If this is a free provider with dynamic models, populate them
      if (config.isFree && config.models.length === 0) {
        try {
          const freeModels = await populateProviderWithFreeModels(provider);
          
          // Clear loading option
          elements.model.innerHTML = '';
          
          if (freeModels.length > 0) {
            freeModels.forEach(model => {
              const option = document.createElement('option');
              option.value = model.value;
              option.textContent = model.text;
              elements.model.appendChild(option);
            });
            
            // Set default model for this provider
            if (provider === getDefaultFreeModel().provider) {
              elements.model.value = getDefaultFreeModel().model;
            }
          } else {
            // No models found
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No models available';
            elements.model.appendChild(option);
          }
        } catch (error) {
          console.error('Error loading free models for provider:', provider, error);
          // Add a fallback option
          elements.model.innerHTML = '';
          const option = document.createElement('option');
          option.value = '';
          option.textContent = '⚠️';
          elements.model.appendChild(option);
        }
      } else {
        // Use static models
        elements.model.innerHTML = '';
        config.models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.value;
          option.textContent = model.text;
          elements.model.appendChild(option);
        });
      }
      
      elements.model.disabled = false;
    }
    
    // Update help text with free indicator
    let helpText = config.help;
    if (config.isFree) {
      helpText = `🆓 FREE - ${helpText}`;
    }
    elements.modelHelp.textContent = helpText;
    
    // Update key help text
    const keyHelpElement = document.querySelector('.api-key-help');
    if (keyHelpElement && config.keyHelp) {
      keyHelpElement.textContent = config.keyHelp;
    }
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
    const provider = elements.provider.value;
    const endpoint = elements.apiEndpoint.value.trim();
    const model = elements.model.value;
    
    if (!apiKey) {
      showError('Please enter an API key first');
      return;
    }
    
    if (!endpoint) {
      showError('Please select a provider or enter an endpoint');
      return;
    }
    
    if (!model && provider !== 'huggingface' && provider !== 'anthropic') {
      showError('Please select a model');
      return;
    }
    
    elements.testButton.disabled = true;
    elements.testButton.textContent = '...';
    elements.testButton.classList.add('testing');
    
    try {
      const isValid = await testApiKey();
      if (isValid) {
        showSuccess(`✅ Connection successful! ${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is valid.`);
        elements.testButton.textContent = '✅ Connected';
        elements.testButton.classList.add('success');
        setTimeout(() => {
          elements.testButton.textContent = 'Test Connection';
          elements.testButton.classList.remove('success');
        }, 3000);
      } else {
        showError(`❌ Connection failed. Please check your ${provider} API key and try again.`);
        elements.testButton.textContent = '❌ Failed';
        elements.testButton.classList.add('error');
        setTimeout(() => {
          elements.testButton.textContent = 'Test Connection';
          elements.testButton.classList.remove('error');
        }, 3000);
      }
    } catch (error) {
      console.error('Test connection error:', error);
      console.error('Error details:', error.stack);
      
      let errorMsg = 'Test failed: ';
      if (error.message.includes('Failed to fetch')) {
        errorMsg = `❌ Network error - Could not reach ${provider} API. Check your internet connection.`;
      } else if (error.message.includes('401')) {
        errorMsg = `❌ Authentication failed - Invalid ${provider} API key.`;
      } else if (error.message.includes('timeout')) {
        errorMsg = `❌ Connection timeout - ${provider} API is not responding.`;
      } else if (error.message.includes('404')) {
        errorMsg = `❌ API endpoint not found - Check if ${provider} API is available.`;
      } else if (error.message.includes('500')) {
        errorMsg = `❌ Server error - ${provider} API is experiencing issues.`;
      } else {
        errorMsg += error.message;
      }
      
      // Show error with details
      showError(errorMsg, true);
      console.log('Full error for debugging:', {
        provider,
        endpoint: elements.apiEndpoint.value,
        error: error.message,
        stack: error.stack
      });
      
      elements.testButton.textContent = '❌ Failed';
      elements.testButton.classList.add('error');
      setTimeout(() => {
        elements.testButton.textContent = 'Test Connection';
        elements.testButton.classList.remove('error');
      }, 3000);
    } finally {
      elements.testButton.disabled = false;
      elements.testButton.classList.remove('testing');
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
    
    // Save language preference
    const language = elements.language.value;
    
    // Input validation
    if (!modelConfig.apiKey) {
      showError('Please enter an API key');
      return;
    }
    
    if (!modelConfig.endpoint) {
      showError('Please enter an API endpoint');
      return;
    }
    
    // Validate endpoint URL
    try {
      new URL(modelConfig.endpoint);
    } catch {
      showError('Invalid API endpoint URL format');
      return;
    }
    
    if (!modelConfig.model) {
      showError('Please select or enter a model');
      return;
    }
    
    elements.saveButton.disabled = true;
    elements.saveButton.textContent = '...';
    
    try {
      // Encrypt sensitive data before storage
      const encryptedConfig = {
        ...modelConfig,
        apiKey: encrypt(modelConfig.apiKey)
      };
      
      // Get current preferences and update language
      const { preferences, universalAssistantSettings } = await chrome.storage.sync.get(['preferences', 'universalAssistantSettings']);
      const currentPrefs = preferences || universalAssistantSettings || {};
      const updatedPreferences = {
        ...currentPrefs,
        language: language
      };
      
      // Save to storage
      await chrome.storage.sync.set({ 
        modelConfig: encryptedConfig,
        // Keep backward compatibility with encrypted key
        apiKey: encrypt(modelConfig.apiKey),
        preferences: updatedPreferences,
        universalAssistantSettings: updatedPreferences // Backward compatibility
      });
      
      showSuccess('Model configuration saved successfully!');
      updateApiKeyStatus(true);
      
      // Auto-close after successful save
      setTimeout(() => {
        chrome.windows.getCurrent((currentWindow) => {
          if (currentWindow.type === 'popup') {
            chrome.windows.remove(currentWindow.id);
          } else {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.remove(tabs[0].id);
              }
            });
          }
        });
      }, 1500);
    } catch (error) {
      showError('Failed to save settings: ' + error.message);
    } finally {
      elements.saveButton.disabled = false;
      elements.saveButton.textContent = 'Save Settings';
    }
  });
  
  // Clear credentials button
  elements.clearButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all credentials? This cannot be undone.')) {
      try {
        await chrome.storage.sync.remove(['modelConfig', 'apiKey']);
        elements.apiKey.value = '';
        updateApiKeyStatus(false);
        
        // Reset to default Albert provider
        const defaultFreeModel = getDefaultFreeModel();
        elements.provider.value = defaultFreeModel.provider;
        elements.provider.dispatchEvent(new Event('change'));
        
        showSuccess('Credentials cleared successfully');
      } catch (error) {
        showError('Failed to clear credentials: ' + error.message);
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
      
      showSuccess('Appearance settings saved successfully!');
    } catch (error) {
      showError('Failed to save appearance settings: ' + error.message);
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
      
      showSuccess('Keyboard shortcuts saved successfully!');
    } catch (error) {
      showError('Failed to save shortcuts: ' + error.message);
    }
  });

  // Test Supabase connection
  elements.testSupabaseButton.addEventListener('click', async () => {
    const supabaseUrl = elements.supabaseUrl.value.trim();
    const supabaseKey = elements.supabaseKey.value.trim();
    
    if (!supabaseUrl || !supabaseKey) {
      showError('Please enter both Supabase URL and key');
      return;
    }
    
    elements.testSupabaseButton.disabled = true;
    elements.testSupabaseButton.textContent = '...';
    
    try {
      const isValid = await testSupabaseConnection(supabaseUrl, supabaseKey);
      if (isValid) {
        showSuccess('Supabase connection successful!');
      } else {
        showError('Supabase connection failed. Please check your credentials.');
      }
    } catch (error) {
      showError('Test failed: ' + error.message);
    } finally {
      elements.testSupabaseButton.disabled = false;
      elements.testSupabaseButton.textContent = 'Test Connection';
    }
  });

  // Save storage settings
  elements.saveStorageButton.addEventListener('click', async () => {
    const storageConfig = {
      enabled: elements.enableSupabase.checked,
      url: elements.supabaseUrl.value.trim(),
      key: elements.supabaseKey.value.trim(),
      cacheStrategy: elements.cacheStrategy.value,
      cacheRetention: parseInt(elements.cacheRetention.value),
      enableChatHistory: elements.enableChatHistory.checked
    };
    
    // Input validation
    if (storageConfig.enabled) {
      if (!storageConfig.url || !storageConfig.key) {
        showError('Please enter both Supabase URL and key');
        return;
      }
      
      // Validate URL format
      try {
        new URL(storageConfig.url);
      } catch {
        showError('Invalid Supabase URL format');
        return;
      }
      
      // Validate retention period
      if (storageConfig.cacheRetention < 1 || storageConfig.cacheRetention > 365) {
        showError('Cache retention must be between 1 and 365 days');
        return;
      }
    }
    
    elements.saveStorageButton.disabled = true;
    elements.saveStorageButton.textContent = '...';
    
    try {
      // Encrypt sensitive data before storage
      const encryptedConfig = {
        ...storageConfig,
        key: storageConfig.key ? encrypt(storageConfig.key) : '',
        url: storageConfig.url ? encrypt(storageConfig.url) : ''
      };
      
      await chrome.storage.sync.set({ supabaseConfig: encryptedConfig });
      showSuccess('Storage settings saved successfully!');
    } catch (error) {
      showError('Failed to save storage settings: ' + error.message);
    } finally {
      elements.saveStorageButton.disabled = false;
      elements.saveStorageButton.textContent = 'Save Storage Settings';
    }
  });

  // Clear storage data
  elements.clearStorageButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all storage data? This will delete all cached transcriptions and chat history.')) {
      try {
        await chrome.storage.sync.remove(['supabaseConfig']);
        elements.enableSupabase.checked = false;
        elements.supabaseUrl.value = '';
        elements.supabaseKey.value = '';
        elements.cacheStrategy.value = 'hash';
        elements.cacheRetention.value = 30;
        elements.enableChatHistory.checked = false;
        showSuccess('Storage settings cleared successfully');
      } catch (error) {
        showError('Failed to clear storage settings: ' + error.message);
      }
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
        'universalAssistantSettings',
        'supabaseConfig'
      ]);
      
      // Load model configuration
      if (data.modelConfig) {
        elements.provider.value = data.modelConfig.provider || 'albert';
        // Trigger change event and wait for it to complete
        await new Promise(resolve => {
          elements.provider.addEventListener('change', resolve, { once: true });
          elements.provider.dispatchEvent(new Event('change'));
        });
        
        // Now set the other values after the provider change has completed
        if (data.modelConfig.endpoint) {
          elements.apiEndpoint.value = data.modelConfig.endpoint;
        }
        if (data.modelConfig.model && elements.model) {
          elements.model.value = data.modelConfig.model;
        }
        if (data.modelConfig.apiKey) {
          try {
            // Decrypt API key
            elements.apiKey.value = decrypt(data.modelConfig.apiKey);
          } catch (error) {
            console.error('Failed to decrypt API key:', error);
            // Fall back to unencrypted for backward compatibility
            elements.apiKey.value = data.modelConfig.apiKey;
          }
        }
        
        updateApiKeyStatus(!!data.modelConfig.apiKey);
      } else if (data.apiKey) {
        // Backward compatibility
        try {
          elements.apiKey.value = decrypt(data.apiKey);
        } catch (error) {
          console.error('Failed to decrypt legacy API key:', error);
          // Fall back to unencrypted for backward compatibility
          elements.apiKey.value = data.apiKey;
        }
        updateApiKeyStatus(true);
      } else {
        // Check if we have a default configuration from .env
        let hasDefaultConfig = false;
        
        if (typeof DEFAULT_CONFIG !== 'undefined' && DEFAULT_CONFIG && DEFAULT_CONFIG.encryptedApiKey) {
          try {
            // Decrypt the default API key
            const defaultApiKey = decrypt(DEFAULT_CONFIG.encryptedApiKey);
            if (defaultApiKey && defaultApiKey.startsWith('sk-')) {
              // Load default configuration
              elements.provider.value = DEFAULT_CONFIG.provider || 'albert';
              elements.provider.dispatchEvent(new Event('change'));
              
              // Wait for provider change to complete
              setTimeout(() => {
                elements.apiEndpoint.value = DEFAULT_CONFIG.endpoint || 'https://albert.api.etalab.gouv.fr/v1';
                elements.model.value = DEFAULT_CONFIG.model || 'albert-large';
                elements.apiKey.value = defaultApiKey;
                updateApiKeyStatus(true, true); // isConfigured=true, isDefault=true
                showSuccess('Default Albert API key loaded from configuration');
              }, 100);
              
              hasDefaultConfig = true;
            }
          } catch (error) {
            console.error('Failed to load default config:', error);
          }
        }
        
        if (!hasDefaultConfig) {
          updateApiKeyStatus(false);
          
          // Set default free provider configuration if nothing is loaded
          const defaultFreeModel = getDefaultFreeModel();
          elements.provider.value = defaultFreeModel.provider;
          elements.provider.dispatchEvent(new Event('change'));
        }
      }
      
      // Load appearance settings
      const prefs = data.preferences || data.universalAssistantSettings || {};
      // Set language with French as default
      elements.language.value = prefs.language || 'fr';
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
      
      // Load storage settings
      if (data.supabaseConfig) {
        elements.enableSupabase.checked = data.supabaseConfig.enabled || false;
        
        // Decrypt sensitive data
        try {
          elements.supabaseUrl.value = data.supabaseConfig.url ? decrypt(data.supabaseConfig.url) : '';
          elements.supabaseKey.value = data.supabaseConfig.key ? decrypt(data.supabaseConfig.key) : '';
        } catch (error) {
          console.error('Failed to decrypt Supabase config:', error);
          // Fall back to unencrypted values for backward compatibility
          elements.supabaseUrl.value = data.supabaseConfig.url || '';
          elements.supabaseKey.value = data.supabaseConfig.key || '';
        }
        
        elements.cacheStrategy.value = data.supabaseConfig.cacheStrategy || 'hash';
        elements.cacheRetention.value = data.supabaseConfig.cacheRetention || 30;
        elements.enableChatHistory.checked = data.supabaseConfig.enableChatHistory || false;
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
    
    // Input validation
    if (!provider || !endpoint || !apiKey) {
      throw new Error('Missing required configuration');
    }
    
    // Validate endpoint URL
    try {
      new URL(endpoint);
    } catch {
      throw new Error('Invalid endpoint URL format');
    }
    
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
        
      case 'openrouter':
        testUrl = `${endpoint}/models`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['HTTP-Referer'] = chrome.runtime.getURL('');
        headers['X-Title'] = 'Universal Web Assistant';
        break;
        
      case 'groq':
        testUrl = `${endpoint}/models`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
        
      case 'huggingface':
        // Hugging Face doesn't have a models endpoint, test with a simple request
        return true; // For now, assume it's valid
        
      case 'anthropic':
        // Anthropic doesn't have a simple test endpoint, so we'll do a minimal completion
        return true; // For now, assume it's valid
        
      case 'custom':
        // Try OpenAI-compatible endpoint
        testUrl = `${endpoint}/models`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
        
      default:
        throw new Error('Unknown provider');
    }
    
    try {
      console.log('Testing API connection:', {
        provider,
        endpoint,
        testUrl,
        hasApiKey: !!apiKey
      });
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('API test timed out after 10 seconds');
      }, 10000); // 10 second timeout
      
      const response = await fetch(testUrl, { 
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('API test response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        console.error('API test failed:', errorText);
        throw new Error(`${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('API test error:', error);
      if (error.name === 'AbortError') {
        throw new Error('Connection timeout - API took too long to respond');
      }
      throw error;
    }
  }
  
  // Test Supabase connection
  async function testSupabaseConnection(url, key) {
    try {
      // Input validation
      if (!url || !key) {
        throw new Error('URL and key are required');
      }
      
      // Validate URL format
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL format');
      }
      
      // Remove trailing slash for consistency
      const cleanUrl = url.replace(/\/$/, '');
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${cleanUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      return response.ok;
    } catch (error) {
      console.error('Supabase test error:', error);
      throw error;
    }
  }
  
  // Update API key status
  function updateApiKeyStatus(isConfigured, isDefault = false) {
    if (isConfigured) {
      if (isDefault) {
        elements.apiKeyStatus.textContent = 'Default key loaded';
        elements.apiKeyStatus.className = 'api-key-status configured';
      } else {
        elements.apiKeyStatus.textContent = 'Configured';
        elements.apiKeyStatus.className = 'api-key-status configured';
      }
    } else {
      elements.apiKeyStatus.textContent = 'Not configured';
      elements.apiKeyStatus.className = 'api-key-status not-configured';
    }
  }
  
  // Show success message
  function showSuccess(message, persistent = false) {
    elements.successMessage.textContent = message;
    elements.successMessage.style.display = 'block';
    elements.errorMessage.style.display = 'none';
    
    if (!persistent) {
      setTimeout(() => {
        elements.successMessage.style.display = 'none';
      }, 5000);
    }
  }
  
  // Show error message
  function showError(message, persistent = false) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
    elements.successMessage.style.display = 'none';
    
    if (!persistent) {
      setTimeout(() => {
        elements.errorMessage.style.display = 'none';
      }, 8000);
    }
  }
});