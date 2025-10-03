# Svelte Component Visualizer

This tool scans the Svelte components in the `pages-mamamia-com-au` project, generates a dependency map, and visualizes it as an interactive graph using D3.js.

## How to Use

1.  **Install Dependencies:**
    If you have just pulled changes or this is your first time running the tool, ensure all dependencies are installed from the project root:
    ```bash
    pnpm install
    ```

2.  **Run the Visualizer:**
    From the project's root directory, run the following command:
    ```bash
    pnpm run docs:visualizer
    ```
    This command performs two actions:
    -   It runs the `generate-graph-data.mjs` script to analyze your components and create an updated `graph-data.json`.
    -   It starts a local web server to host the `index.html` visualization page.

3.  **Open in Browser:**
    The terminal will display a URL, typically `http://localhost:3000`. Open this URL in your web browser to access the visualizer.

## Features

### Sidebar Controls

-   **Search & Select Component:** Use the combobox to search for and select a specific component. The graph will automatically update to show that component and its direct parent/child relationships.
-   **Show All Components:** Click this button to display the entire component dependency graph.
-   **Graph Controls:** Adjust the "Link Distance" and "Charge Strength" sliders to modify the graph's physics and improve readability, especially for dense graphs.
-   **Legend:** Explains the color-coding for the nodes in the graph:
    -   **Red:** The currently selected component.
    -   **Blue:** Parent components (components that use the selected one).
    -   **Green:** Child components (components used by the selected one).
-   **JSDoc Viewer:** Displays the JSDoc for the last clicked node. Click the "View Full" button to see the documentation in a larger modal window.

### Graph Interaction

-   **Focus on a Node:** Double-click any node in the graph to make it the new selected component.
-   **View JSDoc:** Single-click any node to view its JSDoc in the sidebar.
-   **Rearrange Layout:** Click and drag any node to manually reposition it. The node will remain in its new position, allowing you to organize the layout for better clarity.
-   **Zoom & Pan:**
    -   Use the mouse wheel or trackpad to zoom in and out.
    -   Click and drag the background to pan the graph.
    -   Use the `+`, `-`, `⟲`, and directional arrow buttons for fine-grained control.
