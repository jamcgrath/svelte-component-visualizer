# Design Tokens Documentation

This directory contains the design token system for the Svelte Component Visualizer. Design tokens are the visual design atoms of the design system — specifically, they are named entities that store visual design attributes.

## Overview

The design token system provides a centralized, maintainable way to manage all visual properties across the application's themes. By using CSS custom properties (variables), we ensure consistency and make it easy to create new themes or modify existing ones.

## Architecture

### Single-File Approach

We use a **single consolidated design tokens file** (`design-tokens.css`) that contains:

1. **Base Tokens**: Shared values used across all themes (spacing, typography, borders, shadows, etc.)
2. **Semantic Color Tokens**: Theme-aware color values with sensible defaults
3. **Theme Overrides**: Specific color mappings for each theme/scheme combination

### Benefits

- ✅ **Single source of truth** for all design values
- ✅ **Maximum reusability** across themes
- ✅ **Easier maintenance** - update once, affects all themes
- ✅ **Consistent spacing, typography, and structure** across all themes
- ✅ **Simple theme creation** - just override color tokens

## Token Categories

### 1. Spacing Tokens

Consistent spacing scale used throughout the application:

```css
--spacing-xs: 5px;
--spacing-sm: 8px;
--spacing-md: 10px;
--spacing-lg: 15px;
--spacing-xl: 20px;
--spacing-2xl: 24px;
--spacing-3xl: 25px;
```

**Usage:**
```css
.sidebar {
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-md);
}
```

### 2. Typography Tokens

#### Font Families
```css
--font-family-system: -apple-system, BlinkMacSystemFont, "Segoe UI", ...;
--font-family-mono: ui-monospace, "SFMono-Regular", Menlo, ...;
--font-family-code: "SFMono-Regular", Consolas, ...;
```

#### Font Sizes
```css
--font-size-xs: 11px;
--font-size-sm: 12px;
--font-size-md: 13px;
--font-size-base: 0.9em;
--font-size-lg: 1em;
--font-size-xl: 1.1em;
--font-size-2xl: 1.2em;
--font-size-3xl: 1.5em;
/* ... and more */
```

#### Line Heights & Letter Spacing
```css
--line-height-tight: 1;
--line-height-normal: 1.6;
--line-height-relaxed: 1.7;

--letter-spacing-normal: 0;
--letter-spacing-wide: 0.4px;
```

**Usage:**
```css
.help-section p {
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
}
```

### 3. Border Tokens

#### Border Widths
```css
--border-width-thin: 1px;
--border-width-medium: 2px;
--border-width-thick: 4px;
```

#### Border Radii
```css
--radius-none: 0;
--radius-sm: 2px;
--radius-md: 4px;
--radius-lg: 8px;
--radius-xl: 10px;
--radius-2xl: 12px;
--radius-3xl: 16px;
--radius-full: 50%;
```

**Usage:**
```css
.button {
  border: var(--border-width-thin) solid var(--color-border-default);
  border-radius: var(--radius-md);
}
```

### 4. Shadow Tokens

Elevation levels for creating depth:

```css
--shadow-none: none;
--shadow-xs: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.08);
--shadow-xl: 0 10px 24px rgba(0, 0, 0, 0.08);
--shadow-2xl: 0 22px 44px rgba(0, 0, 0, 0.15);

/* Dark mode variants */
--shadow-dark-sm: 0 2px 8px rgba(0, 0, 0, 0.5);
--shadow-dark-md: 0 6px 14px rgba(0, 0, 0, 0.5);
--shadow-dark-lg: 0 8px 16px rgba(0, 0, 0, 0.6);
--shadow-dark-xl: 0 10px 28px rgba(0, 0, 0, 0.45);
```

**Note:** Flat and Retro themes override shadows to `none` for their aesthetic.

### 5. Semantic Color Tokens

These are the most frequently used tokens. They provide semantic meaning and automatically adapt to the current theme.

#### Background Colors
```css
--color-bg-body: /* Main body background */
--color-bg-surface: /* Cards, panels, sidebar */
--color-bg-container: /* Inner containers */
--color-bg-input: /* Input fields */
--color-bg-button: /* Buttons */
--color-bg-graph: /* Graph canvas */
--color-bg-overlay: /* Modal overlays */
--color-bg-hover: /* Hover states */
```

#### Text Colors
```css
--color-text-primary: /* Main text */
--color-text-secondary: /* Secondary text, labels */
--color-text-muted: /* Muted/disabled text */
--color-text-inverse: /* Text on colored backgrounds */
--color-text-on-surface: /* Text on surfaces */
--color-text-node: /* Graph node labels */
```

#### Border Colors
```css
--color-border-default: /* Standard borders */
--color-border-subtle: /* Dividers, separators */
--color-border-emphasis: /* Emphasized borders */
--color-border-input: /* Input borders */
--color-border-input-focus: /* Focused input borders */
```

#### Interactive Colors
```css
--color-interactive-primary: /* Primary interactive elements */
--color-interactive-hover: /* Hover text colors */
--color-focus-ring: /* Focus ring color */
```

#### Node Colors (Graph Visualization)
```css
--color-node-selected: /* Selected node */
--color-node-parent: /* Parent nodes */
--color-node-child: /* Child nodes */
--color-node-default: /* Default nodes */
--color-node-route: /* Route nodes */
--color-node-unused: /* Unused import nodes */
--color-node-unused-selected: /* Selected unused node */
--color-node-unused-parent: /* Parent unused node */
--color-node-unused-child: /* Child unused node */
```

### 6. Other Tokens

#### Sizing
```css
--sidebar-width: 250px;
--control-height-sm: 32px;
--control-height-md: 16px;
--control-height-lg: 18px;
```

#### Opacity
```css
--opacity-disabled: 0.5;
--opacity-muted: 0.6;
--opacity-subtle: 0.7;
```

#### Z-Index
```css
--z-base: 1;
--z-dropdown: 100;
--z-sticky: 10;
--z-modal: 1000;
```

#### Animation
```css
--transition-fast: 0.2s;
--transition-medium: 0.3s;
--easing-standard: ease;
```

## Current Themes

The application supports 3 themes, each with light and dark schemes:

### 1. Modern Theme
- **Style**: Rounded corners, soft shadows, gradients
- **Border Radius**: 12px
- **Shadows**: Soft, layered
- **Aesthetic**: Contemporary, polished

### 2. Flat Theme
- **Style**: Ableton-like, 2px strokes, square corners
- **Border Radius**: 0-2px
- **Shadows**: None
- **Aesthetic**: Minimal, industrial

### 3. Retro Theme
- **Style**: Atari/Commodore-inspired, monospace, CRT effects
- **Border Radius**: 0px
- **Shadows**: None
- **Special**: Scanlines, pixelated rendering, uppercase text
- **Aesthetic**: Vintage computing

## Creating a New Theme

To create a new theme, you only need to override the semantic color tokens:

1. **Create a new theme file**: `/webview/themes/my-theme.css`

2. **Define color overrides**:

```css
/* My Theme - Light Scheme */
body[data-theme="my-theme"][data-scheme="light"] {
  /* Background Colors */
  --color-bg-body: #yourcolor;
  --color-bg-surface: #yourcolor;

  /* Text Colors */
  --color-text-primary: #yourcolor;
  --color-text-secondary: #yourcolor;

  /* Border Colors */
  --color-border-default: #yourcolor;

  /* ... override other colors as needed */
}

/* My Theme - Dark Scheme */
body[data-theme="my-theme"][data-scheme="dark"] {
  /* ... dark scheme colors */
}
```

3. **Optional: Override structural tokens**:

```css
body[data-theme="my-theme"] {
  /* Override spacing, borders, shadows if needed */
  --radius-md: 6px;
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.15);
}
```

4. **Register the theme** in `package.json` configuration.

**That's it!** All spacing, typography, and layout will automatically be inherited from the base tokens.

## Usage Guidelines

### Do's ✅

- **Always use tokens** instead of hardcoded values
- **Use semantic tokens** for colors (e.g., `--color-bg-surface` instead of `--color-bg-surface-gradient-start`)
- **Use base tokens** for spacing, typography, borders
- **Layer tokens** for specificity (e.g., gradients can use gradient-specific tokens)

```css
/* Good */
.card {
  background: var(--color-bg-surface);
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
}

/* Bad */
.card {
  background: #ffffff;
  padding: 15px;
  border-radius: 8px;
}
```

### Don'ts ❌

- **Don't hardcode values** - use tokens instead
- **Don't create theme-specific CSS** outside of theme files
- **Don't use color hex values** directly in component styles
- **Don't override base tokens** unless creating a distinctly different theme style

## File Structure

```
webview/
├── tokens/
│   ├── design-tokens.css    # Main token file
│   └── README.md             # This file
├── themes/
│   ├── modern.css            # Modern theme overrides
│   ├── flat.css              # Flat theme overrides
│   └── retro.css             # Retro theme overrides
└── style.css                 # Base structural styles
```

## Token Naming Conventions

Tokens follow a structured naming pattern:

```
--{category}-{property}-{variant?}

Examples:
--spacing-md
--color-bg-surface
--color-bg-surface-gradient-start
--font-size-xl
--border-width-thin
--shadow-md
```

### Categories:
- `spacing-*`: Spacing values
- `font-*`: Typography values
- `color-*`: All colors
- `border-*`: Border properties
- `radius-*`: Border radius values
- `shadow-*`: Shadow definitions
- `opacity-*`: Opacity values
- `transition-*`: Animation durations
- `z-*`: Z-index layers

### Color Subcategories:
- `color-bg-*`: Backgrounds
- `color-text-*`: Text colors
- `color-border-*`: Borders
- `color-interactive-*`: Interactive elements
- `color-node-*`: Graph nodes
- `color-link-*`: Graph links
- `color-range-*`: Range inputs
- `color-zoom-*`: Zoom controls

## Browser Support

CSS custom properties are supported in all modern browsers:
- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- VS Code Webview: ✅

## Maintenance

When modifying tokens:

1. **Update base tokens** in `:root` if changing shared values
2. **Update theme overrides** if changing theme-specific colors
3. **Test all themes** (modern, flat, retro) in both light and dark schemes
4. **Document changes** in this README if adding new token categories

## Questions?

For questions or suggestions about the design token system, please open an issue in the repository.
