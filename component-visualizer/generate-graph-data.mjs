import fs from "fs";
import path from "path";
import { glob } from "glob";
import * as svelte from "svelte/compiler";
import { walk } from "estree-walker";

async function generateComponentGraph() {
  // Scan both components and routes directories
  const svelteFiles = await glob([
    "../pages-mamamia-com-au/src/lib/components/**/*.svelte",
    "../pages-mamamia-com-au/src/routes/**/*.svelte",
  ]);
  const dependencyMap = {};
  const allNodes = new Map();
  const jsdocMap = new Map();
  const routesBasePath = path.normalize("../pages-mamamia-com-au/src/routes");

  for (const file of svelteFiles) {
    let nodeName;
    let nodeType;

    if (file.includes("/routes/")) {
      const routePath = path.relative(routesBasePath, path.dirname(file));
      const fileName = path.basename(file);
      let fileType = "";

      if (fileName.startsWith("+page")) fileType = "(page)";
      else if (fileName.startsWith("+layout")) fileType = "(layout)";
      else if (fileName.startsWith("+error")) fileType = "(error)";

      if (fileType) {
        nodeName = `${fileType} ${routePath.replace(/\\/g, "/") || "/"}`;
        nodeType = "route";
      } else {
        // It's a component inside the routes folder
        nodeName = path.basename(file, ".svelte");
        nodeType = "component";
      }
    } else {
      nodeName = path.basename(file, ".svelte");
      nodeType = "component";
    }

    if (!allNodes.has(nodeName)) {
      allNodes.set(nodeName, { id: nodeName, type: nodeType });
    }
    dependencyMap[nodeName] = new Set();

    const source = fs.readFileSync(file, "utf-8");
    const isRenderer = file.toLowerCase().includes("renderer");

    // Extract JSDoc from the main script tag (that doesn't have context="module")
    const mainScriptRegex =
      /<script(?![^>]*context="module")[^>]*>([\s\S]*?)<\/script>/;
    const scriptMatch = source.match(mainScriptRegex);

    if (scriptMatch && scriptMatch[1]) {
      const scriptContent = scriptMatch[1];
      const jsdocRegex = /\/\*\*([\s\S]*?)\*\//;
      const match = scriptContent.match(jsdocRegex);

      if (match && match[1]) {
        const cleanedJsdoc = match[1]
          .split("\n")
          .map((line) => line.trim().replace(/^\* ?/, ""))
          .join("\n")
          .trim();
        jsdocMap.set(
          nodeName,
          `/**\n * ${cleanedJsdoc.replace(/\n/g, "\n * ")}\n */`
        );
      }
    }

    if (!source.includes("<script")) continue; // Skip files without scripts for simplicity

    try {
      const ast = svelte.parse(source);
      const importedComponents = {};

      // Find all component imports
      walk(ast, {
        enter(node) {
          if (
            node.type === "ImportDeclaration" &&
            node.source.value.endsWith(".svelte")
          ) {
            const importedComponentName = path.basename(
              node.source.value,
              ".svelte"
            );
            for (const specifier of node.specifiers) {
              if (specifier.type === "ImportDefaultSpecifier") {
                importedComponents[specifier.local.name] =
                  importedComponentName;
              }
            }
          }
        },
      });

      if (isRenderer) {
        // For renderer components, add all imported components as dependencies
        for (const childName of Object.values(importedComponents)) {
          if (childName !== nodeName) {
            // Avoid self-reference
            dependencyMap[nodeName].add(childName);
            if (!allNodes.has(childName)) {
              allNodes.set(childName, { id: childName, type: "component" });
            }
          }
        }
      } else {
        // For non-renderer components, find components used in the template
        walk(ast.html, {
          enter(node) {
            if (
              node.type === "InlineComponent" &&
              importedComponents[node.name]
            ) {
              const childName = importedComponents[node.name];
              dependencyMap[nodeName].add(childName);
              if (!allNodes.has(childName)) {
                allNodes.set(childName, { id: childName, type: "component" });
              }
            }
          },
        });
      }
    } catch (e) {
      console.error(`Could not parse ${file}: ${e.message}`);
    }
  }

  // Format data for D3.js
  const graph = {
    nodes: Array.from(allNodes.values()).map((node) => ({
      ...node,
      jsdoc: jsdocMap.get(node.id) || "",
    })),
    links: [],
  };

  for (const parent in dependencyMap) {
    for (const child of dependencyMap[parent]) {
      graph.links.push({ source: parent, target: child });
    }
  }

  fs.writeFileSync("graph-data.json", JSON.stringify(graph, null, 2));
  console.log("Component graph data generated in graph-data.json");
}

generateComponentGraph();
