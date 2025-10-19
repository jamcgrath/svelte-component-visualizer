# Changelog

All notable changes to the Svelte Component Visualizer extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-19

### Added

- Interactive component dependency visualization using D3.js force-directed graph
- Search and filter functionality for components and routes
- Multiple visual themes:
  - Modern theme with rounded corners and gradients
  - Flat theme with Ableton-like minimal design
  - Retro theme with early Mac System 6/7 (light) and green monochrome (dark)
  - Retro Alt theme with Windows 3.1 (light) and amber monochrome (dark)
- Auto, light, and dark color scheme support
- SvelteKit route support for +page.svelte, +layout.svelte, and +error.svelte files
- Unused import detection and visualization (orange dashed borders)
- Drag and drop support for .svelte files onto the graph (desktop VSCode only)
- Context menu integration in Explorer sidebar and editor tabs
- Double-click nodes to open component files in the editor
- Cmd/Ctrl+Click to focus on specific nodes and their dependencies
- Customizable graph physics controls (link distance and charge strength)
- Toggle to show/hide unused imports
- Refresh button to regenerate the graph after file changes
- Configurable glob patterns for component and route file paths
- Support for custom routes base path configuration
- Cross-platform support (Windows, macOS, Linux)

### Known Limitations

- Graph generation may be slow for very large projects (500+ components)
- Only supports default component imports (not named imports)
- Dynamic imports via `<svelte:component>` are not tracked
- Drag and drop not supported in browser-based VSCode environments (Code OSS, vscode.dev, GitHub Codespaces)

[0.1.0]: https://github.com/jamcgrath/svelte-component-visualizer/releases/tag/v0.1.0
