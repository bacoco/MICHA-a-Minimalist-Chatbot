#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { encrypt } = require('./extension/crypto-utils.js');

// Read .env file
function readEnvFile() {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('No .env file found.');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  return envVars;
}

// Generate config file with encrypted API key
function generateConfig() {
  const env = readEnvFile();
  const apiKey = env.API_KEY_ALBERT;
  
  if (!apiKey) {
    console.error('Please set a valid API_KEY_ALBERT in your .env file');
    process.exit(1);
  }
  
  const encryptedKey = encrypt(apiKey);
  
  const configContent = `// Auto-generated config - DO NOT EDIT MANUALLY
// Generated at: ${new Date().toISOString()}

const DEFAULT_CONFIG = {
  encryptedApiKey: '${encryptedKey}',
  provider: 'albert',
  endpoint: 'https://albert.api.etalab.gouv.fr/v1',
  model: 'albert-large'
};
`;
  
  const configPath = path.join(__dirname, 'extension', 'default-config.js');
  fs.writeFileSync(configPath, configContent);
  
  console.log('✅ Config generated successfully!');
  console.log(`📁 Config file: ${configPath}`);
  console.log('🔐 API key has been encrypted');
}

// Main
try {
  generateConfig();
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}