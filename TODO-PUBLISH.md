# Publishing Checklist for Svelte Component Visualizer

## 🔴 Critical - Must Complete Before Publishing

### 1. Create Publisher Account
- [ ] Go to https://marketplace.visualstudio.com/manage
- [ ] Sign in with Microsoft account or GitHub account
- [ ] Click "Create publisher"
- [ ] Choose a unique publisher ID (lowercase, no spaces, e.g., "jamesmcgrath" or "jmcgrath-dev")
- [ ] Fill in display name and other details
- [ ] Save your publisher ID for the next step

### 2. Update package.json with Publisher ID
- [ ] Open `package.json`
- [ ] Replace `YOUR-PUBLISHER-ID-HERE` on line 6 with your actual publisher ID from step 1
- [ ] Example: `"publisher": "jamesmcgrath"`

### 3. Update package.json with GitHub Info
- [ ] Replace `YOUR-USERNAME` in the repository URL (line 10) with your GitHub username
- [ ] Replace `YOUR-USERNAME` in the bugs URL (line 13) with your GitHub username
- [ ] Example: `"url": "https://github.com/jamesmcgrath/svelte-component-visualizer"`

### 4. Create Extension Icon
- [ ] Create a 128x128 pixel PNG image for your extension icon
- [ ] Save it as `icon.png` in the root directory
- [ ] Add `"icon": "icon.png",` to package.json after the license field (around line 7)
- [ ] Tip: The icon should be simple, recognizable, and look good at small sizes

## 🟡 Important - Recommended Before Publishing

### 5. Create Screenshots or Demo GIF
- [ ] Take screenshots of the extension in action showing:
  - The component visualizer graph
  - The search functionality
  - A component with JSDoc displayed
  - The different themes (optional)
- [ ] Or create an animated GIF showing the extension workflow
- [ ] Save screenshots in a `screenshots/` or `images/` folder
- [ ] Recommended tools: Gifox, LICEcap, or ScreenToGif for GIFs

### 6. Update README with Screenshots
- [ ] Add a "Screenshots" section to README.md
- [ ] Include images using: `![Description](./screenshots/image.png)`
- [ ] Add the screenshots/GIF after the feature list (around line 12)

### 7. Create CHANGELOG.md
- [ ] Create a `CHANGELOG.md` file in the root directory
- [ ] Document the initial 0.1.0 release features
- [ ] Use the format from https://keepachangelog.com/
- [ ] This file will be displayed on the marketplace

## 🟢 Final Steps - Before Publishing

### 8. Test the Extension Locally
- [ ] Run `npm run package` to create the .vsix file
- [ ] Install it locally with: `code --install-extension svelte-component-visualizer-0.1.0.vsix`
- [ ] Test all features in VS Code:
  - [ ] Open a Svelte project
  - [ ] Run "Svelte: Show Component Visualizer"
  - [ ] Test search functionality
  - [ ] Double-click nodes to open files
  - [ ] Test refresh
  - [ ] Try different themes in settings
- [ ] Uninstall after testing if needed

### 9. Commit and Push to GitHub
- [ ] Create a GitHub repository for the project (if not already done)
- [ ] Commit all changes
- [ ] Push to GitHub
- [ ] Make sure the repository URL in package.json matches

### 10. Publish to VS Code Marketplace
- [ ] Run `npx vsce publish` (or `npm run publish` if you add that script)
- [ ] Enter your Personal Access Token when prompted (create one at https://dev.azure.com if needed)
- [ ] Wait for the extension to be processed (usually takes a few minutes)
- [ ] Check the marketplace listing at: `https://marketplace.visualstudio.com/items?itemName=YOUR-PUBLISHER-ID.svelte-component-visualizer`

## 📋 Optional - Nice to Have

### 11. Additional Improvements
- [ ] Add badges to README (downloads, version, rating)
- [ ] Create a CONTRIBUTING.md file
- [ ] Add GitHub Actions for automated testing/packaging
- [ ] Set up semantic versioning workflow
- [ ] Add more configuration examples for different project structures

## 📝 Quick Reference Commands

```bash
# Package the extension
npm run package

# Install locally for testing
code --install-extension svelte-component-visualizer-0.1.0.vsix

# Publish to marketplace (after setup)
npx vsce publish

# Publish with version bump
npx vsce publish patch   # 0.1.0 -> 0.1.1
npx vsce publish minor   # 0.1.0 -> 0.2.0
npx vsce publish major   # 0.1.0 -> 1.0.0
```

## 🔗 Helpful Links

- VS Code Publishing Guide: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- Marketplace Management: https://marketplace.visualstudio.com/manage
- Personal Access Token Setup: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token
- Extension Guidelines: https://code.visualstudio.com/api/references/extension-guidelines

---

**Current Status**: Extension is ready for packaging. Complete items 1-4 (Critical) before you can publish.
