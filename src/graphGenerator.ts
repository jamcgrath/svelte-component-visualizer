import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as svelte from 'svelte/compiler';
import { walk } from 'estree-walker';
import * as vscode from 'vscode';

interface GraphNode {
    id: string;
    type: 'component' | 'route';
}

interface GraphLink {
    source: string;
    target: string;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export async function generateComponentGraph(workspacePath: string): Promise<GraphData> {
    const config = vscode.workspace.getConfiguration('svelteVisualizer');

    const componentPatterns = config.get<string[]>('componentPaths') || ['**/*.svelte'];
    const routePatterns = config.get<string[]>('routePaths') || ['**/routes/**/*.svelte'];
    const routesBasePath = config.get<string>('routesBasePath') || 'routes';

    // Combine all patterns and resolve relative to workspace
    const allPatterns = [...componentPatterns, ...routePatterns].map(pattern =>
        path.join(workspacePath, pattern)
    );

    // Scan for Svelte files
    const svelteFiles = await glob(allPatterns, { nodir: true, ignore: ['**/node_modules/**', '**/.svelte-kit/**', '**/build/**', '**/dist/**'] });

    const dependencyMap: Record<string, Set<string>> = {};
    const allNodes = new Map<string, GraphNode>();

    for (const file of svelteFiles) {
        let nodeName: string;
        let nodeType: 'component' | 'route';

        // Check if this file is in a routes directory
        const normalizedFile = file.replace(/\\/g, '/');
        const routesMatch = normalizedFile.match(new RegExp(`/(${routesBasePath})/(.*)$`));

        if (routesMatch) {
            const routePath = path.dirname(routesMatch[2]);
            const fileName = path.basename(file);
            let fileType = '';

            if (fileName.startsWith('+page')) fileType = '(page)';
            else if (fileName.startsWith('+layout')) fileType = '(layout)';
            else if (fileName.startsWith('+error')) fileType = '(error)';

            if (fileType) {
                nodeName = `${fileType} ${routePath.replace(/\\/g, '/') || '/'}`;
                nodeType = 'route';
            } else {
                // It's a component inside the routes folder
                nodeName = path.basename(file, '.svelte');
                nodeType = 'component';
            }
        } else {
            nodeName = path.basename(file, '.svelte');
            nodeType = 'component';
        }

        if (!allNodes.has(nodeName)) {
            allNodes.set(nodeName, { id: nodeName, type: nodeType });
        }
        dependencyMap[nodeName] = new Set();

        const source = fs.readFileSync(file, 'utf-8');
        const isRenderer = file.toLowerCase().includes('renderer');

        if (!source.includes('<script')) continue; // Skip files without scripts

        try {
            const ast = svelte.parse(source);
            const importedComponents: Record<string, string> = {};

            // Find all component imports
            walk(ast as any, {
                enter(node: any) {
                    if (
                        node.type === 'ImportDeclaration' &&
                        node.source?.value?.endsWith('.svelte')
                    ) {
                        const importedComponentName = path.basename(
                            node.source.value,
                            '.svelte'
                        );
                        for (const specifier of node.specifiers || []) {
                            if (specifier.type === 'ImportDefaultSpecifier') {
                                importedComponents[specifier.local.name] = importedComponentName;
                            }
                        }
                    }
                }
            });

            if (isRenderer) {
                // For renderer components, add all imported components as dependencies
                for (const childName of Object.values(importedComponents)) {
                    if (childName !== nodeName) {
                        // Avoid self-reference
                        dependencyMap[nodeName].add(childName);
                        if (!allNodes.has(childName)) {
                            allNodes.set(childName, { id: childName, type: 'component' });
                        }
                    }
                }
            } else {
                // For non-renderer components, find components used in the template
                walk(ast.html as any, {
                    enter(node: any) {
                        if (
                            node.type === 'InlineComponent' &&
                            importedComponents[node.name]
                        ) {
                            const childName = importedComponents[node.name];
                            dependencyMap[nodeName].add(childName);
                            if (!allNodes.has(childName)) {
                                allNodes.set(childName, { id: childName, type: 'component' });
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.error(`Could not parse ${file}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    // Format data for D3.js
    const graph: GraphData = {
        nodes: Array.from(allNodes.values()),
        links: []
    };

    for (const parent in dependencyMap) {
        for (const child of dependencyMap[parent]) {
            graph.links.push({ source: parent, target: child });
        }
    }

    return graph;
}
