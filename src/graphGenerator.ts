import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import * as svelte from 'svelte/compiler';
import { walk } from 'estree-walker';
import * as vscode from 'vscode';

interface GraphNode {
    id: string;
    type: 'component' | 'route';
    unused?: boolean;
}

interface GraphLink {
    source: string;
    target: string;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

/**
 * Canonical node id: workspace-relative, POSIX-separated path (keeps the `.svelte` extension).
 * This is the single source of truth so a scanned file and an import that points at it always
 * produce the identical id string — otherwise links orphan into phantom duplicate nodes.
 */
function toNodeId(absPath: string, workspaceRoot: string): string {
    return path.relative(workspaceRoot, absPath).split(path.sep).join('/');
}

/**
 * Resolve an import specifier (as written in source) to the same canonical id its target file
 * would get when scanned. Handles relative specifiers and SvelteKit's `$lib` alias; anything
 * else falls back to a best-effort id (a leaf node with no outgoing edges).
 */
function resolveImportId(specifier: string, importingFileAbs: string, workspaceRoot: string): string {
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        return toNodeId(path.resolve(path.dirname(importingFileAbs), specifier), workspaceRoot);
    }
    if (specifier.startsWith('$lib/')) {
        return toNodeId(path.join(workspaceRoot, 'src', 'lib', specifier.slice('$lib/'.length)), workspaceRoot);
    }
    return specifier.replace(/^\.\//, '');
}

/**
 * A node is a `route` only when it is a +page/+layout/+error file under the routes base path;
 * every other `.svelte` file (including components living inside the routes folder) is a component.
 */
function getNodeType(file: string, routesBasePath: string): 'component' | 'route' {
    const normalizedFile = file.replace(/\\/g, '/');
    const routesMatch = normalizedFile.match(new RegExp(`/(${routesBasePath})/(.*)$`));
    if (routesMatch) {
        const fileName = path.basename(file);
        if (fileName.startsWith('+page') || fileName.startsWith('+layout') || fileName.startsWith('+error')) {
            return 'route';
        }
    }
    return 'component';
}

export async function generateComponentGraph(workspacePath: string): Promise<GraphData> {
    const config = vscode.workspace.getConfiguration('svelteVisualizer');

    const componentPatterns = config.get<string[]>('componentPaths') || ['**/*.svelte'];
    const routePatterns = config.get<string[]>('routePaths') || ['**/routes/**/*.svelte'];
    const routesBasePath = config.get<string>('routesBasePath') || 'routes';
    const unconditionalDependencyPaths = config.get<string[]>('unconditionalDependencyPaths') || [];

    // Combine all patterns and resolve relative to workspace
    // Use path.posix.join to ensure forward slashes for glob (works on Windows too)
    const normalizedWorkspace = workspacePath.replace(/\\/g, '/');
    const allPatterns = [...componentPatterns, ...routePatterns].map(pattern =>
        path.posix.join(normalizedWorkspace, pattern)
    );

    // Scan for Svelte files
    const svelteFiles = await glob(allPatterns, { nodir: true, ignore: ['**/node_modules/**', '**/.svelte-kit/**', '**/build/**', '**/dist/**'] });

    const dependencyMap: Record<string, Set<string>> = {};
    const allNodes = new Map<string, GraphNode>();

    for (const file of svelteFiles) {
        const nodeId = toNodeId(file, workspacePath);
        const nodeType = getNodeType(file, routesBasePath);

        if (!allNodes.has(nodeId)) {
            allNodes.set(nodeId, { id: nodeId, type: nodeType });
        }
        dependencyMap[nodeId] = new Set();

        const source = fs.readFileSync(file, 'utf-8');
        // Files matching a configured glob treat all their .svelte imports as dependencies,
        // regardless of template usage (e.g. dynamic renderers that resolve children at runtime).
        const isUnconditional = unconditionalDependencyPaths.some(pattern => minimatch(nodeId, pattern));

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
                        const childId = resolveImportId(node.source.value, file, workspacePath);
                        // Track every specifier's local binding (default + named), not just the
                        // default import — named imports from .svelte files are real dependencies too.
                        for (const specifier of node.specifiers || []) {
                            if (specifier.local?.name) {
                                importedComponents[specifier.local.name] = childId;
                            }
                        }
                    }
                }
            });

            if (isUnconditional) {
                // Unconditional-dependency file: add every imported component as a dependency
                for (const childName of Object.values(importedComponents)) {
                    if (childName !== nodeId) {
                        // Avoid self-reference
                        dependencyMap[nodeId].add(childName);
                        if (!allNodes.has(childName)) {
                            allNodes.set(childName, { id: childName, type: 'component' });
                        }
                    }
                }
            } else {
                // For non-renderer components, find components used in the template
                const usedComponents = new Set<string>();

                walk(ast.html as any, {
                    enter(node: any) {
                        if (node.type !== 'InlineComponent') {
                            return;
                        }
                        // Static usage <Foo/> binds via node.name; dynamic usage
                        // <svelte:component this={Foo}/> binds via the `this` expression when
                        // it is a bare identifier matching an imported component.
                        let localName: string | undefined;
                        if (node.name === 'svelte:component') {
                            if (node.expression?.type === 'Identifier') {
                                localName = node.expression.name;
                            }
                        } else {
                            localName = node.name;
                        }

                        if (localName && importedComponents[localName]) {
                            const childName = importedComponents[localName];
                            usedComponents.add(localName);
                            dependencyMap[nodeId].add(childName);
                            if (!allNodes.has(childName)) {
                                allNodes.set(childName, { id: childName, type: 'component' });
                            }
                        }
                    }
                });

                // Add unused imported components
                for (const [localName, childName] of Object.entries(importedComponents)) {
                    if (!usedComponents.has(localName) && childName !== nodeId) {
                        dependencyMap[nodeId].add(childName);
                        if (!allNodes.has(childName)) {
                            allNodes.set(childName, { id: childName, type: 'component', unused: true });
                        }
                    }
                }
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
