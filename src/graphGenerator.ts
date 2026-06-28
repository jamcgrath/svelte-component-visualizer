import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { Minimatch } from 'minimatch';
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
export function toNodeId(absPath: string, workspaceRoot: string): string {
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
 * Exported so the extension host reuses this exact logic instead of re-implementing it.
 */
export function getNodeType(file: string, routesBasePath: string): 'component' | 'route' {
    // Plain substring test (not a RegExp) so a routesBasePath containing regex
    // metacharacters can never throw or alter matching.
    const normalizedFile = file.replace(/\\/g, '/');
    if (normalizedFile.includes(`/${routesBasePath}/`)) {
        const fileName = path.basename(file);
        if (fileName.startsWith('+page') || fileName.startsWith('+layout') || fileName.startsWith('+error')) {
            return 'route';
        }
    }
    return 'component';
}

/**
 * The setting-independent result of parsing one file: which local names map to which child node
 * ids, and which of those locals are referenced in the template. The unconditional/unused decision
 * is intentionally NOT cached here — it depends on the unconditionalDependencyPaths setting, which
 * can change without the file's mtime changing, so it is applied fresh at graph-assembly time.
 */
interface ParseResult {
    importsByLocal: Record<string, string>;
    usedLocals: Set<string>;
}

const parseCache = new Map<string, { mtimeMs: number; size: number; parsed: ParseResult }>();

// Cache keys are normalized to POSIX separators so the glob-produced paths used when
// populating the cache and the `uri.fsPath` used to invalidate it match on Windows too.
function cacheKey(p: string): string {
    return p.replace(/\\/g, '/');
}

/** Drop a single file's cached parse (called by the extension's file-system watcher). */
export function invalidateParseCache(absPath: string): void {
    parseCache.delete(cacheKey(absPath));
}

function parseSvelteFile(file: string, workspacePath: string): ParseResult {
    const result: ParseResult = { importsByLocal: {}, usedLocals: new Set() };

    let source: string;
    try {
        source = fs.readFileSync(file, 'utf-8');
    } catch {
        return result;
    }
    if (!source.includes('<script')) {
        return result; // No script → no imports to track
    }

    try {
        const ast = svelte.parse(source);

        // Collect component imports (default + named) keyed by local binding.
        walk(ast as any, {
            enter(node: any) {
                if (
                    node.type === 'ImportDeclaration' &&
                    node.source?.value?.endsWith('.svelte')
                ) {
                    const childId = resolveImportId(node.source.value, file, workspacePath);
                    for (const specifier of node.specifiers || []) {
                        if (specifier.local?.name) {
                            result.importsByLocal[specifier.local.name] = childId;
                        }
                    }
                }
            }
        });

        // Collect which imported locals are referenced in the template (static <Foo/> or
        // dynamic <svelte:component this={Foo}/>).
        walk(ast.html as any, {
            enter(node: any) {
                if (node.type !== 'InlineComponent') {
                    return;
                }
                let localName: string | undefined;
                if (node.name === 'svelte:component') {
                    if (node.expression?.type === 'Identifier') {
                        localName = node.expression.name;
                    }
                } else {
                    localName = node.name;
                }
                if (localName && result.importsByLocal[localName]) {
                    result.usedLocals.add(localName);
                }
            }
        });
    } catch (e) {
        console.error(`Could not parse ${file}: ${e instanceof Error ? e.message : String(e)}`);
    }

    // The cached result is shared by reference with every caller — treat it as read-only.
    // Freeze the imports map so an accidental future write is caught instead of silently
    // poisoning the cache (the Set can't be frozen meaningfully; assembly only reads it).
    Object.freeze(result.importsByLocal);
    return result;
}

/**
 * Cache-aware parse: re-reads a file only when its mtime OR size has changed since the last
 * parse. Size is a cheap second signal that catches content changes which preserve mtime
 * (e.g. a `git checkout` that restores a stale timestamp); the file watcher is the primary
 * invalidator for edits made inside the editor.
 */
function getParsedFile(file: string, workspacePath: string): ParseResult {
    let mtimeMs: number;
    let size: number;
    try {
        const stat = fs.statSync(file);
        mtimeMs = stat.mtimeMs;
        size = stat.size;
    } catch {
        return { importsByLocal: {}, usedLocals: new Set() };
    }

    const key = cacheKey(file);
    const cached = parseCache.get(key);
    if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
        return cached.parsed;
    }

    const parsed = parseSvelteFile(file, workspacePath);
    parseCache.set(key, { mtimeMs, size, parsed });
    return parsed;
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

    // Compile the unconditional-dependency globs once, not once per file.
    const unconditionalMatchers = unconditionalDependencyPaths.map(pattern => new Minimatch(pattern));

    for (const file of svelteFiles) {
        const nodeId = toNodeId(file, workspacePath);
        const nodeType = getNodeType(file, routesBasePath);

        if (!allNodes.has(nodeId)) {
            allNodes.set(nodeId, { id: nodeId, type: nodeType });
        }
        dependencyMap[nodeId] = new Set();

        const { importsByLocal, usedLocals } = getParsedFile(file, workspacePath);

        // Files matching a configured glob treat all their .svelte imports as dependencies,
        // regardless of template usage (e.g. dynamic renderers that resolve children at runtime).
        const isUnconditional = unconditionalMatchers.some(matcher => matcher.match(nodeId));

        const addChild = (childName: string, unused: boolean) => {
            if (childName === nodeId) {
                return; // Avoid self-reference
            }
            dependencyMap[nodeId].add(childName);
            if (!allNodes.has(childName)) {
                allNodes.set(childName, unused
                    ? { id: childName, type: 'component', unused: true }
                    : { id: childName, type: 'component' });
            }
        };

        // Classify each import; add the used/unconditional ones first so a child that is used
        // under one binding is never demoted to "unused" by another binding of the same file.
        const unusedChildren: string[] = [];
        for (const [localName, childName] of Object.entries(importsByLocal)) {
            if (isUnconditional || usedLocals.has(localName)) {
                addChild(childName, false);
            } else {
                unusedChildren.push(childName);
            }
        }
        for (const childName of unusedChildren) {
            addChild(childName, true);
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
