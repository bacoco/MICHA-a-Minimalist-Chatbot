// Options page script for Universal Web Assistant

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('saveButton');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  
  // Load existing API key
  const { apiKey } = await chrome.storage.sync.get(['apiKey']);
  if (apiKey) {
    apiKeyInput.value = apiKey;
    updateApiKeyStatus(true);
  } else {
    updateApiKeyStatus(false);
  }
  
  // Save button handler
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showError('Veuillez entrer une clé API');
      return;
    }
    
    // Disable button during save
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    try {
      // Test the API key first
      const isValid = await testApiKey(apiKey);
      
      if (isValid) {
        // Save to storage
        await chrome.storage.sync.set({ apiKey });
        
        showSuccess('Clé API sauvegardée avec succès!');
        updateApiKeyStatus(true);
      } else {
        showError('Clé API invalide. Veuillez vérifier et réessayer.');
      }
    } catch (error) {
      showError('Échec de la sauvegarde des paramètres. Veuillez réessayer.');
      console.error('Save error:', error);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save Settings';
    }
  });
  
  // Test API key validity
  async function testApiKey(apiKey) {
    try {
      const response = await fetch('https://albert.api.etalab.gouv.fr/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('API test error:', error);
      return false;
    }
  }
  
  // Update API key status indicator
  function updateApiKeyStatus(isConfigured) {
    if (isConfigured) {
      apiKeyStatus.textContent = 'Configured';
      apiKeyStatus.className = 'api-key-status configured';
    } else {
      apiKeyStatus.textContent = 'Not configured';
      apiKeyStatus.className = 'api-key-status not-configured';
    }
  }
  
  // Show success message
  function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    
    // Hide after 3 seconds
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 3000);
  }
  
  // Show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  }
  
  // Handle Enter key in input
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveButton.click();
    }
  });
});