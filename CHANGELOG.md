# Changelog

All notable changes to the Svelte Component Visualizer extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-06-28

### Added

- Named `.svelte` imports are now tracked as dependencies (previously only default imports were)
- `<svelte:component this={Component}>` dynamic usage is tracked when `this` is a direct component identifier
- `svelteVisualizer.unconditionalDependencyPaths` setting (array of glob patterns): files matching a pattern treat all of their `.svelte` imports as dependencies regardless of template usage — useful for dynamic renderer components
- Incremental parsing: per-file parse results are cached by mtime and size, and a `.svelte` file watcher invalidates them, so refreshes only re-parse files that actually changed

### Changed

- Graph node ids are now workspace-relative file paths instead of basenames, so two same-named components (e.g. two `Button.svelte` in different folders) no longer collapse into a single node with misrouted edges
- Colliding display labels are disambiguated with the shortest distinguishing directory suffix (e.g. `Button (lib)` / `Button (widgets)`, going deeper only when needed), for both components and routes; unique names are unchanged. On the graph, colliding nodes show just the short name and reveal the full label in a tooltip on hover; the search list shows the full label
- Bumped Svelte to 5.56.4

### Removed

- The implicit "renderer" filename heuristic (any file with "renderer" in its path). Files that need all imports treated as dependencies must now be listed explicitly via `svelteVisualizer.unconditionalDependencyPaths`

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
