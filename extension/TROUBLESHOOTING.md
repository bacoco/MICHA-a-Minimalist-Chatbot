# Extension Troubleshooting Guide

## Fixed: Service Worker Registration Error

The service worker has been updated with comprehensive error handling and safety checks.

### What was fixed:
1. **API Availability Checks** - All Chrome APIs are now checked before use
2. **Error Boundaries** - Wrapped everything in try-catch to prevent registration failures
3. **Delayed Initialization** - Context menus are created after a delay to ensure APIs are ready
4. **Graceful Degradation** - If optional features fail, the core functionality continues
5. **Comprehensive Logging** - Added console logs for debugging

### How to reload the extension:

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - Or click the puzzle piece icon → "Manage Extensions"

2. **Remove Old Extension** (if loaded)
   - Find "Universal Web Assistant"
   - Click "Remove" button
   - Confirm removal

3. **Load Updated Extension**
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `extension` folder
   - The extension should load without errors

4. **Check Service Worker Status**
   - Click "Details" on the extension card
   - Look for "Service Worker" section
   - Should show "Active" status
   - Click "Inspect views: service worker" to see console logs

5. **Configure API Key**
   - Click the extension icon in toolbar
   - Go to Settings (or right-click → Options)
   - Enter your Albert API key
   - Save and test

### If you still see errors:

1. **Check Console Logs**
   - In service worker inspector, look for error messages
   - The new service worker logs detailed information

2. **Verify Permissions**
   - Ensure all permissions in manifest.json are granted
   - Chrome may need to restart after permission changes

3. **Clear Extension Data**
   - Go to extension details
   - Click "Clear data"
   - Reload extension

4. **Test Basic Functionality**
   - Visit any website
   - Click extension icon or press Ctrl+Shift+A
   - Try asking a simple question

### Common Issues:

- **"Cannot read properties of undefined"** - Fixed by adding API checks
- **"Service worker registration failed"** - Fixed by error boundaries
- **"Context menu not appearing"** - Fixed by delayed initialization
- **API key errors** - Configure in extension options

The extension should now work properly! 🎉