# MiCha Logo Setup Instructions

To complete the logo integration with the new blue branding, please follow these steps:

## 1. Save the Logo Files

Save the MiCha logo image (blue version) in the following locations:

### Main Logo
- Save the full blue logo as: `extension/icons/micha-logo.png`
- This should include both the speech bubble icon and "Micha" text

### Extension Icons
Create resized versions of just the blue speech bubble icon (without the "Micha" text) for the Chrome extension:

- `extension/icons/icon-16.png` - 16x16 pixels
- `extension/icons/icon-48.png` - 48x48 pixels  
- `extension/icons/icon-128.png` - 128x128 pixels

### Brand Colors
The MiCha blue color appears to be: `#1E4D7B` (deep blue)
This can be used throughout the extension for consistent branding.

## 2. Icon Creation Steps

### Using Photopea (Free Online Tool):
1. Go to https://www.photopea.com
2. Open your blue MiCha logo image
3. Use the Crop tool to select just the speech bubble part
4. Go to Image → Image Size
5. Create three versions:
   - 16x16 (for small toolbar icon)
   - 48x48 (for medium displays)
   - 128x128 (for Chrome Web Store and large displays)
6. Export as PNG with transparent background

### Using Preview (Mac):
1. Open the logo in Preview
2. Use the selection tool to select just the speech bubble
3. Copy (⌘+C) and create new from clipboard (⌘+N)
4. Tools → Adjust Size → Set to required dimensions
5. Save as PNG

## 3. Update Extension Colors

To match the new blue branding, you may want to update the extension's color scheme:

### In styles.css:
- Replace purple gradient (`#667EEA`, `#764BA2`) with blue shades
- Use `#1E4D7B` as primary color
- Use lighter blue `#2E6DAB` for hover states

### Example gradient:
```css
background: linear-gradient(135deg, #1E4D7B 0%, #2E6DAB 100%);
```

## 4. Verify Integration

After adding the images:
1. Reload the extension in Chrome (`chrome://extensions/`)
2. The blue icon should appear in the Chrome toolbar
3. The logo should display at the top of the README when viewing on GitHub

## 5. Optional: Create Favicon

Create a favicon version:
- `extension/icons/favicon.ico` - 16x16 or 32x32 ICO format
- Use online tool: https://favicon.io/favicon-converter/

This completes the MiCha branding with the friendly blue chatbot logo! 💙