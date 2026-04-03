# Changelog

All notable changes to the Svelte Component Visualizer extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-04-03

### Added

- Terminal file path insertion command: `Svelte: Insert File Path in Terminal`
- Explorer and editor context menu actions for terminal file path insertion
- Visualizer node context menu action: `Insert File Path in Terminal`
- Configurable terminal prefix via `svelteVisualizer.terminalPathPrefix` (default `@`, empty string for plain paths)
- Updated in-UI help dialog with terminal file reference instructions

### Changed

- Terminal insertion now targets only the active terminal session
- Terminal insertion is silent (no success toast), with warnings only for missing prerequisites
- File reference format now uses configurable `<prefix><relative/path>` (default `@path/to/file`)

## [0.2.1] - 2026-02-28

### Changed

- Documentation and packaging updates for the 0.2.x line
- Dependency lockfile updates

## [0.2.0] - 2026-02-28

### Added

- Interactive legend filters: click legend items to show/hide node categories (parents, children, routes, unused imports)
- Improved keyboard accessibility for legend controls

### Changed

- Parent/child node classification and focus behavior improvements
- Visual polish updates for graph styling and link color contrast
- README updates for 0.2.0 behavior

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
[0.2.0]: https://github.com/jamcgrath/svelte-component-visualizer/releases/tag/0.2.0
[0.2.1]: https://github.com/jamcgrath/svelte-component-visualizer/releases/tag/v0.2.1
[0.3.0]: https://github.com/jamcgrath/svelte-component-visualizer/releases/tag/v0.3.0
