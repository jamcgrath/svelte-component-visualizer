# Svelte Component Visualizer

A VSCode extension that visualizes Svelte component dependencies as an interactive graph, helping you understand and navigate your component architecture.

## Features

- **Interactive Dependency Graph**: Visualize all component relationships in your Svelte project
- **Component Search**: Quickly find and focus on specific components or routes
- **Go to Definition**: Double-click any node to open the component file in the editor
- **JSDoc Display**: View component documentation inline
- **Customizable Layout**: Adjust graph physics with link distance and charge strength controls
- **Route Support**: Visualize SvelteKit routes alongside components

## Usage

### Opening the Visualizer

1. Open the Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
2. Type "Svelte: Show Component Visualizer"
3. The visualizer will open in a new panel

### Interacting with the Graph

- **View Component Details**: Click a node to see its JSDoc
- **Open File**: Double-click a node to open the component file in the editor
- **Focus on Component**: Search for a component to show only its direct dependencies
- **Show All**: Click "Show All Components" to display the entire graph
- **Refresh**: Click "Refresh Graph" to regenerate the graph after making changes
- **Zoom & Pan**: Use mouse wheel to zoom, drag background to pan, or use the control buttons

### Legend

- **Red**: Currently selected component
- **Blue**: Parent components (components that use the selected one)
- **Green**: Child components (components used by the selected one)
- **Purple Square**: Route files

## Configuration

Configure the extension through VSCode settings:

```json
{
  "svelteVisualizer.componentPaths": [
    "src/lib/components/**/*.svelte"
  ],
  "svelteVisualizer.routePaths": [
    "src/routes/**/*.svelte"
  ],
  "svelteVisualizer.routesBasePath": "src/routes"
}
```

### Settings

- `svelteVisualizer.componentPaths`: Glob patterns for component files
- `svelteVisualizer.routePaths`: Glob patterns for route files
- `svelteVisualizer.routesBasePath`: Base path for routes (used for route naming)

## Requirements

- VSCode 1.80.0 or higher
- A Svelte or SvelteKit project

## Installation

### From Source

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press `F5` to open a new VSCode window with the extension loaded

### From VSIX

1. Run `npm run package` to create a `.vsix` file
2. In VSCode, go to Extensions view
3. Click the `...` menu and select "Install from VSIX..."
4. Select the generated `.vsix` file

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package extension
npm run package
```

## Known Issues

- Graph generation may be slow for very large projects
- Only supports default component imports (not named imports)

## Release Notes

### 0.1.0

Initial release:
- Interactive component dependency visualization
- Search and filter components
- Go to definition on double-click
- JSDoc display
- Configurable file paths

## License

ISC
