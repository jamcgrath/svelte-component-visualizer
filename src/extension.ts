import * as vscode from 'vscode';
import * as path from 'path';
import { generateComponentGraph } from './graphGenerator';

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Svelte Component Visualizer is now active');

    // Register command to show the visualizer
    const showGraphCommand = vscode.commands.registerCommand(
        'svelteVisualizer.showGraph',
        async () => {
            await showVisualizerPanel(context);
        }
    );

    // Register command to refresh the graph
    const refreshGraphCommand = vscode.commands.registerCommand(
        'svelteVisualizer.refreshGraph',
        async () => {
            if (currentPanel) {
                await refreshGraph(context, currentPanel);
            } else {
                vscode.window.showInformationMessage('Please open the visualizer first');
            }
        }
    );

    // Register command to show specific component in graph
    const showComponentInGraphCommand = vscode.commands.registerCommand(
        'svelteVisualizer.showComponentInGraph',
        async (uri: vscode.Uri) => {
            await showComponentInVisualizer(context, uri);
        }
    );

    context.subscriptions.push(showGraphCommand, refreshGraphCommand, showComponentInGraphCommand);
}

async function showVisualizerPanel(context: vscode.ExtensionContext) {
    const columnToShowIn = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;

    if (currentPanel) {
        // If panel already exists, reveal it
        currentPanel.reveal(columnToShowIn);
        await refreshGraph(context, currentPanel);
    } else {
        // Create new panel
        currentPanel = vscode.window.createWebviewPanel(
            'svelteVisualizer',
            'Svelte Component Visualizer',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'webview'))
                ]
            }
        );

        // Set the webview content
        currentPanel.webview.html = getWebviewContent(context, currentPanel.webview);

        // Handle messages from webview
        currentPanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'openFile':
                        await openComponentFile(message.componentName, message.nodeType);
                        break;
                    case 'refresh':
                        await refreshGraph(context, currentPanel!);
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        // Reset when panel is closed
        currentPanel.onDidDispose(
            () => {
                currentPanel = undefined;
            },
            null,
            context.subscriptions
        );

        // Generate and send initial graph data
        await refreshGraph(context, currentPanel);
    }
}

async function showComponentInVisualizer(context: vscode.ExtensionContext, uri: vscode.Uri) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    // Determine component name and type from file path
    const config = vscode.workspace.getConfiguration('svelteVisualizer');
    const routesBasePath = config.get<string>('routesBasePath') || 'routes';
    const filePath = uri.fsPath;

    let componentName: string;
    let nodeType: 'component' | 'route';

    // Check if this file is in a routes directory
    const normalizedFile = filePath.replace(/\\/g, '/');
    const routesMatch = normalizedFile.match(new RegExp(`/(${routesBasePath})/(.*)$`));

    if (routesMatch) {
        const routePath = path.dirname(routesMatch[2]);
        const fileName = path.basename(filePath);
        let fileType = '';

        if (fileName.startsWith('+page')) fileType = '(page)';
        else if (fileName.startsWith('+layout')) fileType = '(layout)';
        else if (fileName.startsWith('+error')) fileType = '(error)';

        if (fileType) {
            componentName = `${fileType} ${routePath.replace(/\\/g, '/') || '/'}`;
            nodeType = 'route';
        } else {
            // It's a component inside the routes folder
            componentName = path.basename(filePath, '.svelte');
            nodeType = 'component';
        }
    } else {
        componentName = path.basename(filePath, '.svelte');
        nodeType = 'component';
    }

    // Open or reveal the visualizer panel
    await showVisualizerPanel(context);

    // Wait a bit for the panel to be ready, then send focus message
    setTimeout(() => {
        if (currentPanel) {
            currentPanel.webview.postMessage({
                command: 'focusComponent',
                componentName: componentName,
                nodeType: nodeType
            });
        }
    }, 100);
}

async function refreshGraph(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    try {
        const graphData = await generateComponentGraph(workspaceFolder.uri.fsPath);

        // Send graph data to webview
        panel.webview.postMessage({
            command: 'updateGraph',
            data: graphData
        });
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to generate graph: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

async function openComponentFile(componentName: string, nodeType: string) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
        return;
    }

    const config = vscode.workspace.getConfiguration('svelteVisualizer');
    const routesBasePath = config.get<string>('routesBasePath') || 'routes';
    let searchPatterns: string[];

    if (nodeType === 'route') {
        searchPatterns = config.get<string[]>('routePaths') || ['**/routes/**/*.svelte'];
    } else {
        searchPatterns = [
            ...(config.get<string[]>('componentPaths') || ['**/*.svelte']),
            ...(config.get<string[]>('routePaths') || ['**/routes/**/*.svelte'])
        ];
    }

    // Search for the component file
    for (const pattern of searchPatterns) {
        const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');

        for (const file of files) {
            const fileName = path.basename(file.fsPath, '.svelte');

            // For routes, match the full route name format
            if (nodeType === 'route') {
                const normalizedFile = file.fsPath.replace(/\\/g, '/');
                const routesMatch = normalizedFile.match(new RegExp(`/(${routesBasePath})/(.*)$`));

                if (routesMatch) {
                    const routePath = path.dirname(routesMatch[2]);
                    const baseName = path.basename(file.fsPath);

                    let fileType = '';
                    if (baseName.startsWith('+page')) fileType = '(page)';
                    else if (baseName.startsWith('+layout')) fileType = '(layout)';
                    else if (baseName.startsWith('+error')) fileType = '(error)';

                    const routeName = `${fileType} ${routePath.replace(/\\/g, '/') || '/'}`;

                    if (routeName === componentName) {
                        const document = await vscode.workspace.openTextDocument(file);
                        await vscode.window.showTextDocument(document);
                        return;
                    }
                }
            } else if (fileName === componentName) {
                const document = await vscode.workspace.openTextDocument(file);
                await vscode.window.showTextDocument(document);
                return;
            }
        }
    }

    vscode.window.showWarningMessage(`Could not find file for component: ${componentName}`);
}

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'webview', 'style.css'))
    );
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'webview', 'script.js'))
    );

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:;">
    <title>Component Dependency Graph</title>
    <link rel="stylesheet" href="${styleUri}" />
  </head>
  <body>
    <div class="sidebar">
      <h1>Component Visualizer</h1>
      <div class="label-wrapper">
        <label for="search-input">Search & Select Component</label>
        <button
          id="clear-search-btn"
          class="clear-search-btn"
          title="Clear search"
        >
          &times;
        </button>
      </div>
      <div class="combobox-container">
        <input
          type="text"
          id="search-input"
          placeholder="Type to search components..."
          autocomplete="off"
        />
        <div id="results-list" class="results-list"></div>
      </div>

      <div class="label-wrapper">
        <label for="route-search-input">Search & Select Route</label>
        <button
          id="route-clear-search-btn"
          class="clear-search-btn"
          title="Clear search"
        >
          &times;
        </button>
      </div>
      <div class="combobox-container">
        <input
          type="text"
          id="route-search-input"
          placeholder="Type to search routes..."
          autocomplete="off"
        />
        <div id="route-results-list" class="results-list"></div>
      </div>

      <button id="show-all-btn">Show All Components</button>
      <button id="refresh-btn">Refresh Graph</button>

      <div class="controls">
        <h2>Graph Controls</h2>
        <div>
          <label for="link-distance">Link Distance</label>
          <input
            type="range"
            id="link-distance"
            min="50"
            max="500"
            value="200"
          />
          <span id="link-distance-value">200</span>
        </div>
        <div>
          <label for="charge-strength">Charge Strength</label>
          <input
            type="range"
            id="charge-strength"
            min="-1000"
            max="-50"
            value="-400"
          />
          <span id="charge-strength-value">-400</span>
        </div>
      </div>

      <div class="legend">
        <h2>Legend</h2>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #ff6347"></div>
          <span>Selected</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #4682b4"></div>
          <span>Parent (Uses Selected)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #32cd32"></div>
          <span>Child (Used by Selected)</span>
        </div>
        <div class="legend-item">
          <div
            class="legend-color"
            style="background-color: #9b59b6; border-radius: 2px"
          ></div>
          <span>Route File</span>
        </div>
      </div>
    </div>
    <div id="graph-container">
      <div id="zoom-controls">
        <button id="zoom-in" title="Zoom In">+</button>
        <button id="zoom-out" title="Zoom Out">-</button>
        <button id="zoom-reset" title="Reset View">⟲</button>
        <div id="pan-controls">
          <button id="pan-up" title="Pan Up">↑</button>
          <button id="pan-left" title="Pan Left">←</button>
          <button id="pan-recenter" title="Recenter View">◎</button>
          <button id="pan-right" title="Pan Right">→</button>
          <button id="pan-down" title="Pan Down">↓</button>
        </div>
      </div>
      <svg id="graph"></svg>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
    </script>
    <script src="${scriptUri}"></script>
  </body>
</html>`;
}

export function deactivate() {
    if (currentPanel) {
        currentPanel.dispose();
    }
}
