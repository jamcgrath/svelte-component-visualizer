import * as d3 from 'd3';

const svg = d3.select("svg#graph");
const graphContainer = document.getElementById("graph-container");
const width = graphContainer.clientWidth;
const height = graphContainer.clientHeight;

let fullGraphData;
let simulation;
let sortedComponents, sortedRoutes;
let showUnusedImports = true;
let currentSelectedId = null; // Track current selection for re-rendering

// --- UI Elements ---
const searchInput = d3.select("#search-input");
const resultsList = d3.select("#results-list");
const clearSearchBtn = d3.select("#clear-search-btn");
const routeSearchInput = d3.select("#route-search-input");
const routeResultsList = d3.select("#route-results-list");
const routeClearSearchBtn = d3.select("#route-clear-search-btn");
const linkDistanceSlider = d3.select("#link-distance");
const chargeStrengthSlider = d3.select("#charge-strength");
const linkDistanceValue = d3.select("#link-distance-value");
const chargeStrengthValue = d3.select("#charge-strength-value");

// Add arrowhead marker definition
svg
  .append("defs")
  .append("marker")
  .attr("id", "arrow")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 15) // Adjust arrow position
  .attr("refY", 0)
  .attr("markerWidth", 6)
  .attr("markerHeight", 6)
  .attr("orient", "auto")
  .append("path")
  .attr("d", "M0,-5L10,0L0,5")
  .attr("fill", "#999");

// --- Zoom ---
const zoom = d3.zoom()
  .on("zoom", (event) => {
    svg.select("g.graph-group").attr("transform", event.transform);
  })
  .filter((event) => {
    // Disable zoom on double-click, but allow all other zoom interactions
    return !event.button && event.type !== 'dblclick';
  });
svg.call(zoom);

// --- Accessibility ---
const a11yAnnouncer = d3.select("#a11y-announcer");
function announceToScreenReader(message) {
  a11yAnnouncer.text("");
  setTimeout(() => {
    a11yAnnouncer.text(message);
  }, 100);
}

// Listen for messages from the extension
window.addEventListener('message', event => {
  const message = event.data;

  if (message.command === 'updateGraph') {
    initializeGraph(message.data);
  } else if (message.command === 'focusComponent') {
    focusOnComponent(message.componentName, message.nodeType);
  }
});

function initializeGraph(graph) {
  fullGraphData = graph;
  const allSortedNodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
  sortedComponents = allSortedNodes.filter(n => n.type === 'component');
  sortedRoutes = allSortedNodes.filter(n => n.type === 'route');

  populateResults(resultsList, sortedComponents, searchInput, clearSearchBtn);
  populateResults(routeResultsList, sortedRoutes, routeSearchInput, routeClearSearchBtn);

  setupCombobox(searchInput, resultsList, clearSearchBtn, sortedComponents);
  setupCombobox(routeSearchInput, routeResultsList, routeClearSearchBtn, sortedRoutes);
}

function focusOnComponent(componentName, nodeType) {
  // Update the appropriate search input to show the selected component
  if (nodeType === 'route') {
    routeSearchInput.property("value", componentName);
    routeClearSearchBtn.style("display", "block");
    searchInput.property("value", "");
    clearSearchBtn.style("display", "none");
  } else {
    searchInput.property("value", componentName);
    clearSearchBtn.style("display", "block");
    routeSearchInput.property("value", "");
    routeClearSearchBtn.style("display", "none");
  }

  // Focus on this component in the graph
  updateGraph(componentName);
}

function populateResults(listElement, nodes, inputElement, clearBtnElement) {
  listElement.html(""); // Clear previous results
  nodes.forEach((node, index) => {
    listElement
      .append("div")
      .attr("class", "result-item")
      .attr("role", "option")
      .attr("id", `${listElement.attr("id")}-option-${index}`)
      .text(node.id)
      .on("click", () => {
        selectOption(node.id, inputElement, listElement, clearBtnElement);
      });
  });
}

function selectOption(nodeId, inputElement, listElement, clearBtnElement) {
  inputElement.property("value", nodeId);
  listElement.style("display", "none");
  inputElement.attr("aria-expanded", "false");
  if (clearBtnElement) {
    clearBtnElement.style("display", "block");
  }

  // Clear the other combobox
  if (inputElement === searchInput) {
    routeSearchInput.property("value", "");
    routeClearSearchBtn.style("display", "none");
  } else {
    searchInput.property("value", "");
    clearSearchBtn.style("display", "none");
  }

  updateGraph(nodeId);
  announceToScreenReader(`Selected ${nodeId}`);
}

function updateGraph(selectedId) {
  svg.selectAll("g.graph-group").remove(); // Clear previous graph

  // Track current selection for re-rendering
  currentSelectedId = selectedId;

  const graphGroup = svg.append("g").attr("class", "graph-group");

  // Create a deep copy to avoid side effects from D3 mutating the data
  const graphCopy = JSON.parse(JSON.stringify(fullGraphData));
  let nodes, links;

  if (selectedId) {
    // Subgraph for a single component
    links = graphCopy.links.filter(
      (l) => l.source === selectedId || l.target === selectedId
    );
    const relatedNodeIds = new Set([selectedId]);
    links.forEach((l) => {
      relatedNodeIds.add(l.source);
      relatedNodeIds.add(l.target);
    });
    nodes = graphCopy.nodes.filter((n) => relatedNodeIds.has(n.id));

    // Set initial positions for a radial layout to prevent clutter
    const selectedNode = nodes.find((n) => n.id === selectedId);
    if (selectedNode) {
      selectedNode.fx = width / 2;
      selectedNode.fy = height / 2;
    }
    const otherNodes = nodes.filter((n) => n.id !== selectedId);
    const angleStep =
      otherNodes.length > 0 ? (2 * Math.PI) / otherNodes.length : 0;
    const radius = Math.min(width, height) / 3;
    otherNodes.forEach((node, i) => {
      node.x = width / 2 + radius * Math.cos(i * angleStep);
      node.y = height / 2 + radius * Math.sin(i * angleStep);
    });
  } else {
    // Full graph
    nodes = graphCopy.nodes;
    links = graphCopy.links;
  }

  // Filter unused components if toggle is off
  if (!showUnusedImports) {
    const unusedNodeIds = new Set(
      nodes.filter(n => n.unused).map(n => n.id)
    );
    nodes = nodes.filter(n => !n.unused);
    links = links.filter(l => {
      const targetId = l.target.id || l.target;
      const sourceId = l.source.id || l.source;
      return !unusedNodeIds.has(targetId) && !unusedNodeIds.has(sourceId);
    });
  }

  simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(+linkDistanceSlider.property("value"))
    )
    .force(
      "charge",
      d3.forceManyBody().strength(+chargeStrengthSlider.property("value"))
    )
    .force("collide", d3.forceCollide().radius(40)); // Add collision force

  if (!selectedId) {
    simulation.force("center", d3.forceCenter(width / 2, height / 2));
  }

  const link = graphGroup
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("class", (d) => {
      // Check if target node is unused
      const targetNode = nodes.find(n => n.id === (d.target.id || d.target));
      return targetNode && targetNode.unused ? "link--unused" : "";
    })
    .attr("marker-end", "url(#arrow)");

  const node = graphGroup
    .append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", (d) => {
      let classes = "node";
      if (d.type === 'route') {
          classes += " node--route";
      }

      // Add unused class if applicable
      if (d.unused) {
          classes += " node--unused";
      }

      if (!selectedId) {
          if (d.type !== 'route') {
              classes += " node--default";
          }
      } else {
          if (d.id === selectedId) {
              classes += " node--selected";
          } else {
              const isParent = links.some(
                  (l) => l.source.id === d.id && l.target.id === selectedId
              );
              if (isParent) {
                  classes += " node--parent";
              } else {
                  classes += " node--child";
              }
          }
      }
      return classes;
    })
    .call(drag(simulation))
    .on("click", (event, d) => {
      // Cmd/Ctrl+Click switches to this node in the visualizer
      if (event.ctrlKey || event.metaKey) {
        updateGraph(d.id);
      }
    })
    .on("dblclick", (event, d) => {
      // Double-click opens the file
      vscode.postMessage({
        command: 'openFile',
        componentName: d.id,
        nodeType: d.type
      });
    })
    .on("contextmenu", (event, d) => {
      // Right-click shows context menu
      event.preventDefault();
      event.stopPropagation();
      showNodeContextMenu(event, d);
    });

  // Append a circle for components and a rect for routes
  node.each(function(d) {
      const group = d3.select(this);
      if (d.type === 'route') {
          group.append('rect')
              .attr('width', 16)
              .attr('height', 16)
              .attr('x', -8)
              .attr('y', -8);
      } else {
          group.append('circle').attr('r', 8);
      }
  });

  node
    .append("text")
    .text((d) => d.id)
    .attr("class", "node-text")
    .attr("x", 12)
    .attr("y", 3);

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });
}

// --- Help Dialog ---
const helpBtn = d3.select("#help-btn");
const helpDialog = d3.select("#help-dialog");
const helpCloseBtn = d3.select("#help-close-btn");

helpBtn.on("click", () => {
  helpDialog.style("display", "flex");
});

helpCloseBtn.on("click", () => {
  helpDialog.style("display", "none");
});

// Close help dialog when clicking outside the content
helpDialog.on("click", (event) => {
  if (event.target.id === "help-dialog") {
    helpDialog.style("display", "none");
  }
});

// Close help dialog with Escape key
d3.select("body").on("keydown.help", (event) => {
  if (event.key === "Escape" && helpDialog.style("display") === "flex") {
    helpDialog.style("display", "none");
  }
});

// --- Drag and Drop ---
const graphContainerEl = document.getElementById("graph-container");

// Track drag state to prevent dragleave from clearing styles prematurely
let isDragging = false;

// Prevent default drag behavior
graphContainerEl.addEventListener("dragenter", (event) => {
  event.preventDefault();
  event.stopPropagation();
  isDragging = true;
});

graphContainerEl.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.stopPropagation();
  isDragging = true;

  // Visual feedback depends on whether Shift is pressed
  if (event.shiftKey) {
    event.dataTransfer.dropEffect = "copy";
    graphContainerEl.style.backgroundColor = "#e8f4f8";
    graphContainerEl.style.outline = "3px dashed #4682b4";
  } else {
    event.dataTransfer.dropEffect = "none";
    graphContainerEl.style.backgroundColor = "#fff3cd";
    graphContainerEl.style.outline = "3px dashed #ffc107";
  }
});

graphContainerEl.addEventListener("dragleave", (event) => {
  event.stopPropagation();
  // Only clear if we're actually leaving the container (not just moving between child elements)
  if (event.target === graphContainerEl && !graphContainerEl.contains(event.relatedTarget)) {
    isDragging = false;
    graphContainerEl.style.backgroundColor = "";
    graphContainerEl.style.outline = "";
  }
});

graphContainerEl.addEventListener("drop", (event) => {
  isDragging = false;
  graphContainerEl.style.backgroundColor = "";
  graphContainerEl.style.outline = "";

  // Only process drop if Shift key is pressed
  if (!event.shiftKey) {
    return; // Let default behavior happen (open file in editor)
  }

  event.preventDefault();
  event.stopPropagation();

  // Try multiple data formats that VSCode uses
  // Format 1: text/uri-list (primary format used by VSCode explorer)
  let uriList = event.dataTransfer.getData("text/uri-list");

  // Format 2: text/plain (fallback)
  let textPlain = event.dataTransfer.getData("text/plain");

  // Format 3: Check files array
  const filesArray = event.dataTransfer.files;

  let filePath = null;

  // Try extracting file path from uri-list first (most reliable for VSCode)
  if (uriList) {
    // uri-list can contain multiple URIs separated by newlines
    const uris = uriList.split('\n').filter(uri => uri.trim() && !uri.startsWith('#'));
    if (uris.length > 0) {
      const uri = uris[0].trim();
      filePath = extractFilePathFromUri(uri);
    }
  }

  // Fallback to text/plain
  if (!filePath && textPlain) {
    filePath = extractFilePathFromUri(textPlain.trim());
  }

  // Fallback to files array
  if (!filePath && filesArray.length > 0) {
    const file = filesArray[0];
    if (file.name.endsWith('.svelte')) {
      // For files array, we might need to get the full path differently
      // In some contexts, the file.path property exists
      filePath = file.path || file.name;
    }
  }

  if (filePath && filePath.endsWith('.svelte')) {
    // Send message to extension to identify and focus the component
    vscode.postMessage({
      command: 'focusFileInGraph',
      filePath: filePath
    });
  }
});

// Helper function to extract file path from various URI formats
function extractFilePathFromUri(uri) {
  if (!uri) return null;

  // Handle various VSCode URI schemes
  // Format: file:///path/to/file.svelte
  // Format: vscode-remote://ssh-remote+host/path/to/file.svelte
  // Format: vscode-vfs://github/user/repo/file.svelte
  // Format: vscode-resource:///path/to/file.svelte
  // Format: vsls:/path/to/file.svelte (Live Share)

  const uriPatterns = [
    // Standard file:// URIs
    /^file:\/\/(.+\.svelte)$/i,
    // vscode-remote:// URIs (remote SSH, containers, WSL, etc.)
    /^vscode-remote:\/\/[^/]+(.+\.svelte)$/i,
    // vscode-vfs:// URIs (virtual file systems)
    /^vscode-vfs:\/\/[^/]+(.+\.svelte)$/i,
    // vscode-resource:// URIs (webview resources)
    /^vscode-resource:\/\/(.+\.svelte)$/i,
    // vsls:// URIs (Live Share)
    /^vsls:\/(.+\.svelte)$/i,
  ];

  for (const pattern of uriPatterns) {
    const match = uri.match(pattern);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  // Handle workspace-relative paths (common in containerized/cloud environments)
  // Format: /workspaces/project-name/path/to/file.svelte
  if (uri.startsWith('/') && uri.endsWith('.svelte')) {
    return uri;
  }

  // If it's already a plain path ending in .svelte, use it directly
  if (uri.endsWith('.svelte') && !uri.includes('://')) {
    return uri;
  }

  return null;
}

// --- Event Listeners ---
const showAllBtn = d3.select("#show-all-btn");
const refreshBtn = d3.select("#refresh-btn");
const zoomInBtn = d3.select("#zoom-in");
const zoomOutBtn = d3.select("#zoom-out");
const panRecenterBtn = d3.select("#pan-recenter");

zoomInBtn.on("click", () => {
  svg.transition().duration(250).call(zoom.scaleBy, 1.2);
});

zoomOutBtn.on("click", () => {
  svg.transition().duration(250).call(zoom.scaleBy, 0.8);
});

const resetTransform = () => {
  svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);
};

panRecenterBtn.on("click", resetTransform);

showAllBtn.on("click", () => {
  searchInput.property("value", "");
  routeSearchInput.property("value", "");
  clearSearchBtn.style("display", "none");
  routeClearSearchBtn.style("display", "none");
  updateGraph(null);
});

refreshBtn.on("click", () => {
  vscode.postMessage({
    command: 'refresh'
  });
});

// Toggle for showing/hiding unused imports
const showUnusedToggle = d3.select("#show-unused-toggle");
showUnusedToggle.on("change", function() {
  showUnusedImports = this.checked;
  // Re-render graph with current selection
  updateGraph(currentSelectedId);
});

function setupCombobox(input, list, clearBtn, sourceData) {
  let highlightedIndex = -1;

  clearBtn.on("click", () => {
    input.property("value", "");
    input.node().dispatchEvent(new Event("input"));
    svg.selectAll("g.graph-group").remove();
    input.attr("aria-expanded", "false");
    input.node().focus();
  });

  function showResults() {
    // Close the other list before showing the current one
    const otherList = list === resultsList ? routeResultsList : resultsList;
    otherList.style("display", "none");

    const searchTerm = input.property("value").toLowerCase();
    const filteredNodes = sourceData.filter((node) =>
      node.id.toLowerCase().includes(searchTerm)
    );
    populateResults(list, filteredNodes, input, clearBtn);
    list.style("display", "block");
    input.attr("aria-expanded", "true");
    highlightedIndex = -1;
    input.attr("aria-activedescendant", "");
    announceToScreenReader(`${filteredNodes.length} results found`);
  }

  function hideResults() {
    list.style("display", "none");
    input.attr("aria-expanded", "false");
    input.attr("aria-activedescendant", "");
    highlightedIndex = -1;
  }

  function highlightOption(index) {
    const options = list.selectAll(".result-item");
    options.classed("highlighted", false);

    if (index >= 0 && index < options.size()) {
      const option = d3.select(options.nodes()[index]);
      option.classed("highlighted", true);
      input.attr("aria-activedescendant", option.attr("id"));

      // Scroll into view
      const optionNode = option.node();
      if (optionNode) {
        optionNode.scrollIntoView({ block: "nearest" });
      }
    } else {
      input.attr("aria-activedescendant", "");
    }
  }

  input.on("input", function () {
    const searchTerm = this.value.toLowerCase();
    clearBtn.style("display", this.value.length > 0 ? "block" : "none");
    showResults();
  });

  input.on("focus", showResults);
  input.on("click", showResults);

  input.on("keydown", (event) => {
    const options = list.selectAll(".result-item");
    const optionsCount = options.size();

    if (list.style("display") === "none") return;

    switch(event.key) {
      case "ArrowDown":
        event.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, optionsCount - 1);
        highlightOption(highlightedIndex);
        break;

      case "ArrowUp":
        event.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, -1);
        highlightOption(highlightedIndex);
        break;

      case "Home":
        event.preventDefault();
        highlightedIndex = 0;
        highlightOption(highlightedIndex);
        break;

      case "End":
        event.preventDefault();
        highlightedIndex = optionsCount - 1;
        highlightOption(highlightedIndex);
        break;

      case "Enter":
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < optionsCount) {
          const selectedOption = d3.select(options.nodes()[highlightedIndex]);
          const nodeId = selectedOption.text();
          selectOption(nodeId, input, list, clearBtn);
        }
        break;

      case "Escape":
        event.preventDefault();
        hideResults();
        break;

      case "Tab":
        hideResults();
        break;
    }
  });
}


d3.select("body").on("click", function (event) {
  let clickedInsideACombobox = false;
  d3.selectAll(".combobox-container").each(function() {
      if (this.contains(event.target)) {
          clickedInsideACombobox = true;
      }
  });

  if (!clickedInsideACombobox) {
    resultsList.style("display", "none");
    routeResultsList.style("display", "none");
    searchInput.attr("aria-expanded", "false");
    routeSearchInput.attr("aria-expanded", "false");
  }
});

d3.select("body").on("keydown", (event) => {
  if (event.key === "Escape") {
    resultsList.style("display", "none");
    routeResultsList.style("display", "none");
    searchInput.attr("aria-expanded", "false");
    routeSearchInput.attr("aria-expanded", "false");
  }
});

linkDistanceSlider.on("input", function () {
  linkDistanceValue.text(this.value);
  if (simulation) {
    simulation.force("link").distance(+this.value);
    simulation.alpha(0.3).restart();
  }
});

chargeStrengthSlider.on("input", function () {
  chargeStrengthValue.text(this.value);
  if (simulation) {
    simulation.force("charge").strength(+this.value);
    simulation.alpha(0.3).restart();
  }
});

// --- Drag Functionality ---
function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    // By not setting fx and fy to null, we make the node "stick" where it's dragged.
    // d.fx = null;
    // d.fy = null;
  }
  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// --- Theme Handling ---
// Listen for theme changes from VS Code configuration
window.addEventListener('message', event => {
  const message = event.data;

  if (message.command === 'updateTheme') {
    applyTheme(message.theme, message.colorScheme);
  }
});

function applyTheme(theme, colorScheme) {
  document.body.setAttribute('data-theme', theme);
  document.body.setAttribute('data-scheme', colorScheme);

  // Update theme CSS link
  const existingThemeLink = document.querySelector('link[data-theme-link]');
  if (existingThemeLink) {
    const newHref = existingThemeLink.href.replace(/\/themes\/[\w-]+\.css/, `/themes/${theme}.css`);
    existingThemeLink.href = newHref;
  }
}

// --- Context Menu ---
const contextMenu = d3.select("#node-context-menu");
let contextMenuData = null;

function showNodeContextMenu(event, nodeData) {
  contextMenuData = nodeData;

  // Position the menu at cursor
  const x = event.pageX;
  const y = event.pageY;

  contextMenu
    .style("display", "block")
    .style("left", `${x}px`)
    .style("top", `${y}px`);

  // Adjust position if menu goes off-screen
  setTimeout(() => {
    const menuNode = contextMenu.node();
    const menuRect = menuNode.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (menuRect.right > viewportWidth) {
      adjustedX = viewportWidth - menuRect.width - 5;
    }
    if (menuRect.bottom > viewportHeight) {
      adjustedY = viewportHeight - menuRect.height - 5;
    }

    contextMenu
      .style("left", `${adjustedX}px`)
      .style("top", `${adjustedY}px`);
  }, 0);
}

function hideContextMenu() {
  contextMenu.style("display", "none");
  contextMenuData = null;
}

// Handle context menu item clicks
contextMenu.selectAll(".context-menu-item").on("click", function() {
  const action = d3.select(this).attr("data-action");

  if (!contextMenuData) return;

  switch (action) {
    case "open":
      vscode.postMessage({
        command: 'openFile',
        componentName: contextMenuData.id,
        nodeType: contextMenuData.type
      });
      break;

    case "focus":
      updateGraph(contextMenuData.id);
      break;

    case "reveal":
      vscode.postMessage({
        command: 'revealInExplorer',
        componentName: contextMenuData.id,
        nodeType: contextMenuData.type
      });
      break;

    case "copyName":
      vscode.postMessage({
        command: 'copyFileName',
        componentName: contextMenuData.id,
        nodeType: contextMenuData.type
      });
      break;

    case "copyPath":
      vscode.postMessage({
        command: 'copyFilePath',
        componentName: contextMenuData.id,
        nodeType: contextMenuData.type
      });
      break;
  }

  hideContextMenu();
});

// Close context menu when clicking outside or pressing Escape
d3.select("body").on("click.contextmenu", () => {
  hideContextMenu();
});

d3.select("body").on("keydown.contextmenu", (event) => {
  if (event.key === "Escape") {
    hideContextMenu();
  }
});
