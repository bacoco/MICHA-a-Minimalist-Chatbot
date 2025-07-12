# How to Use Albert as the LLM

This document provides instructions on how to configure the Synthesia API to use the Albert LLM for text analysis.

## 1. Prerequisites

- You have access to the project's root directory.
- You have an API key for the Albert LLM service.

## 2. Configuration Steps

To switch the LLM from the default (Olympia) to Albert, you need to edit the `.env` configuration file.

### Step 1: Locate the `.env` File

The configuration file is located in the project root:
```
/data/loic/api-synthesia-prod/Synthesia-API/.env
```
If this file does not exist, you can create it by copying `.env.template` (if available) or creating a new file.

### Step 2: Edit the `.env` File

Open the `.env` file and make the following changes:

1.  **Enable Albert**: Set the `USED_ALBERT` variable to `true`.
2.  **Set the Albert API Key**: Add your `API_KEY_ALBERT`.

```env
# .env

# ... other settings ...

# --- LLM Configuration ---

# Enable Albert LLM (set to true)
USED_ALBERT=true

# Add your Albert API key
API_KEY_ALBERT=your_albert_api_key_here

# You can also customize the Albert model and server URL if needed
# SERVER_URL_ALBERT=https://albert.api.etalab.gouv.fr/v1
# MODEL_ALBERT=albert-large

# ... other settings ...
```

## 3. Restart the API

For the changes to take effect, you must restart the Synthesia API service.

```bash
# Navigate to the project directory
cd /data/loic/api-synthesia-prod/Synthesia-API

# Stop any running instances (example for production)
lsof -ti:8050 | xargs kill -9

# Start the service again
./start_api.sh
```

## 4. Verification

After restarting, you can verify that the API is using the Albert LLM by checking the startup logs.

1.  **Find the latest log file** in the `logs/` directory.
2.  **Search the log file** for the confirmation message.

```bash
# Look for this message in the log files
grep "Using Albert LLM configuration" Synthesia-API/logs/api_*.log
```

If the configuration is successful, you will see an entry confirming that the Albert LLM is in use. The API will now use Albert for all relevant text analysis tasks. 


