# Quick Start Guide

## Testing Your Extension

1. **Open in VSCode**
   ```bash
   code /Users/jamesmcgrath/Sites/svelte-component-visualizer
   ```

2. **Start Development Mode**
   - Press `F5` or select `Run > Start Debugging`
   - This will open a new VSCode window with your extension loaded

3. **Test the Extension**
   - In the Extension Development Host window, open a Svelte/SvelteKit project
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Svelte: Show Component Visualizer"
   - The visualizer should open!

## Project Structure

```
svelte-component-visualizer/
├── src/                          # Extension source code (TypeScript)
│   ├── extension.ts             # Main extension entry point
│   └── graphGenerator.ts        # Component graph generation logic
├── webview/                      # Webview UI files
│   ├── index.html               # (Generated in extension.ts)
│   ├── script.js                # D3.js visualization code
│   └── style.css                # Styles
├── out/                          # Compiled JavaScript (generated)
├── component-visualizer/         # Original standalone version
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Extension documentation
```

## Key Files

- **[src/extension.ts](src/extension.ts)**: Registers commands, creates webview panel, handles file opening
- **[src/graphGenerator.ts](src/graphGenerator.ts)**: Scans Svelte files and builds dependency graph
- **[webview/script.js](webview/script.js)**: D3.js visualization, handles user interactions
- **[package.json](package.json)**: Extension metadata, commands, settings

## How It Works

1. User activates "Show Component Visualizer" command
2. Extension scans workspace for Svelte files based on configured glob patterns
3. Parser analyzes each file to find component imports and usage
4. Graph data (nodes + links) is generated
5. Data is sent to webview via message passing
6. D3.js renders interactive force-directed graph
7. User can double-click nodes to open files (message sent back to extension)

## Configuration

Edit your workspace or user settings:

```json
{
  "svelteVisualizer.componentPaths": [
    "src/lib/components/**/*.svelte"
  ],
  "svelteVisualizer.routePaths": [
    "src/routes/**/*.svelte"
  ],
  "svelteVisualizer.routesBasePath": "src/routes",
  "svelteVisualizer.terminalPathPrefix": "@"
}
```

To insert plain paths (for tools like Aider), set `"svelteVisualizer.terminalPathPrefix": ""`.

## Development Tips

1. **Make changes to TypeScript**: The watch task (`npm run watch`) will auto-recompile
2. **Make changes to webview files**: Just reload the webview (click refresh button)
3. **Reload extension**: Press `Cmd+R` / `Ctrl+R` in Extension Development Host

## Publishing

When ready to share:

```bash
# Install vsce if needed
npm install -g @vscode/vsce

# Package extension
npm run package

# This creates a .vsix file you can share or publish to marketplace
```

## Next Steps

- Customize the glob patterns in [package.json](package.json) for your project structure
- Add more features (e.g., filter by file type, export graph as image)
- Improve performance for large projects
- Add tests

## Troubleshooting

**Extension doesn't activate**: Check the Output panel (View > Output) and select "Extension Host"

**Graph is empty**: Verify your glob patterns match your project structure

**Files don't open**: Check the console in the Extension Development Host (Help > Toggle Developer Tools)
