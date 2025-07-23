// Simple encryption/decryption for API key
// Note: This is basic obfuscation, not secure encryption
// For production, consider using more robust encryption

const CRYPTO_KEY = 'UniversalAssistant2024!@#';

// Simple XOR encryption
function encrypt(text) {
  if (!text) return '';
  
  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
    encrypted += String.fromCharCode(charCode);
  }
  
  // Convert to base64 for storage
  return btoa(encrypted);
}

// Simple XOR decryption
function decrypt(encryptedText) {
  if (!encryptedText) return '';
  
  try {
    // Decode from base64
    const encrypted = atob(encryptedText);
    
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const charCode = encrypted.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    return decrypted;
  } catch (e) {
    console.error('Failed to decrypt:', e);
    return '';
  }
}

// Simplified export for service worker context (fix circular dependencies)
if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  // Service worker context - direct assignment
  self.encrypt = encrypt;
  self.decrypt = decrypt;
} else if (typeof window !== 'undefined') {
  // Window context
  window.encrypt = encrypt;
  window.decrypt = decrypt;
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js context
  module.exports = { encrypt, decrypt };
}