const svg = d3.select("svg#graph");
const graphContainer = document.getElementById("graph-container");
const width = graphContainer.clientWidth;
const height = graphContainer.clientHeight;

let fullGraphData;
let simulation;
let sortedComponents, sortedRoutes;
let currentSelectedJsdoc = "";

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
const jsdocDisplay = d3.select("#jsdoc-display");
const viewInModalBtn = d3.select("#view-in-modal-btn");
const jsdocModal = d3.select("#jsdoc-modal");
const modalJsdocDisplay = d3.select("#modal-jsdoc-display");
const modalCloseBtn = d3.select("#modal-close-btn");

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
const zoom = d3.zoom().on("zoom", (event) => {
  svg.select("g.graph-group").attr("transform", event.transform);
});
svg.call(zoom);

// Fetch the component graph data and setup listeners
d3.json("graph-data.json").then(function (graph) {
  fullGraphData = graph;
  const allSortedNodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
  sortedComponents = allSortedNodes.filter(n => n.type === 'component');
  sortedRoutes = allSortedNodes.filter(n => n.type === 'route');
  
  populateResults(resultsList, sortedComponents, searchInput, clearSearchBtn);
  populateResults(routeResultsList, sortedRoutes, routeSearchInput, routeClearSearchBtn);

  setupCombobox(searchInput, resultsList, clearSearchBtn, sortedComponents);
  setupCombobox(routeSearchInput, routeResultsList, routeClearSearchBtn, sortedRoutes);
});

function populateResults(listElement, nodes, inputElement, clearBtnElement) {
  listElement.html(""); // Clear previous results
  nodes.forEach((node) => {
    listElement
      .append("div")
      .attr("class", "result-item")
      .text(node.id)
      .on("click", () => {
        inputElement.property("value", node.id);
        listElement.style("display", "none");
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

        updateGraph(node.id);
      });
  });
}

function updateGraph(selectedId) {
  svg.selectAll("g.graph-group").remove(); // Clear previous graph

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

  link = graphGroup
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
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
      const fullNodeData = fullGraphData.nodes.find((n) => n.id === d.id);
      currentSelectedJsdoc = (fullNodeData && fullNodeData.jsdoc) || "";
      jsdocDisplay.html(renderJsdoc(currentSelectedJsdoc));
      viewInModalBtn.property("disabled", !currentSelectedJsdoc);
    })
    .on("dblclick", (event, d) => {
      const input = d.type === 'route' ? routeSearchInput : searchInput;
      input.property("value", d.id);
      updateGraph(d.id);
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

// --- Event Listeners ---
const showAllBtn = d3.select("#show-all-btn");
const zoomInBtn = d3.select("#zoom-in");
const zoomOutBtn = d3.select("#zoom-out");
const zoomResetBtn = d3.select("#zoom-reset");
const panRecenterBtn = d3.select("#pan-recenter");
const panUpBtn = d3.select("#pan-up");
const panDownBtn = d3.select("#pan-down");
const panLeftBtn = d3.select("#pan-left");
const panRightBtn = d3.select("#pan-right");
const panStep = 50;

viewInModalBtn.on("click", () => {
  if (currentSelectedJsdoc) {
    modalJsdocDisplay.html(renderJsdoc(currentSelectedJsdoc));
    jsdocModal.classed("visible", true);
  }
});

const closeModal = () => jsdocModal.classed("visible", false);
modalCloseBtn.on("click", closeModal);
jsdocModal.on("click", function (event) {
  if (event.target === this) {
    closeModal();
  }
});

panUpBtn.on("click", () => {
  svg.transition().duration(250).call(zoom.translateBy, 0, panStep);
});
panDownBtn.on("click", () => {
  svg.transition().duration(250).call(zoom.translateBy, 0, -panStep);
});
panLeftBtn.on("click", () => {
  svg.transition().duration(250).call(zoom.translateBy, panStep, 0);
});
panRightBtn.on("click", () => {
  svg.transition().duration(250).call(zoom.translateBy, -panStep, 0);
});

zoomInBtn.on("click", () => {
  svg.transition().duration(250).call(zoom.scaleBy, 1.2);
});

zoomOutBtn.on("click", () => {
  svg.transition().duration(250).call(zoom.scaleBy, 0.8);
});

const resetTransform = () => {
  svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);
};

zoomResetBtn.on("click", resetTransform);
panRecenterBtn.on("click", resetTransform);

showAllBtn.on("click", () => {
  searchInput.property("value", "");
  routeSearchInput.property("value", "");
  clearSearchBtn.style("display", "none");
  routeClearSearchBtn.style("display", "none");
  updateGraph(null);
});

function setupCombobox(input, list, clearBtn, sourceData) {
  clearBtn.on("click", () => {
    input.property("value", "");
    input.node().dispatchEvent(new Event("input"));
    svg.selectAll("g.graph-group").remove();
    jsdocDisplay.html("<span>Click a node to see its JSDoc.</span>");
    viewInModalBtn.property("disabled", true);
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
  }

  input.on("input", function () {
    const searchTerm = this.value.toLowerCase();
    clearBtn.style("display", this.value.length > 0 ? "block" : "none");
    showResults();
  });

  input.on("focus", showResults);
  input.on("click", showResults);
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
  }
});

d3.select("body").on("keydown", (event) => {
  if (event.key === "Escape") {
    resultsList.style("display", "none");
    routeResultsList.style("display", "none");
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

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderJsdoc(jsdocString) {
  if (!jsdocString) {
    return "<span>No JSDoc found for this component.</span>";
  }
  const content = jsdocString
    .replace(/^\/\*\*| \*\//g, "")
    .split("\n")
    .map((line) => line.trim().replace(/^\* ?/, ""))
    .join("\n")
    .trim();

  // Split into description and tags
  const parts = content.split(/(?=@\w+)/g);
  const description = escapeHtml(parts.shift().trim());

  let html = `<div class="jsdoc-description">${description}</div>`;

  const tagRegex =
    /(@\w+)\s*(?:\{([^}]+)\})?\s*(?:([\w.<>|'"`[\]-]+))?\s*([\s\S]*)/;

  parts.forEach((part) => {
    const match = part.match(tagRegex);
    if (match) {
      const [, tag, type, name, desc] = match.map((s) =>
        (s || "").trim()
      );
      html += "<div>";
      html += `<span class="jsdoc-tag">${tag}</span>`;
      if (type)
        html += ` <span class="jsdoc-type">{${escapeHtml(type)}}</span>`;
      if (name)
        html += ` <span class="jsdoc-name">${escapeHtml(name)}</span>`;
      if (desc)
        html += ` <span class="jsdoc-description">${escapeHtml(desc)}</span>`;
      html += "</div>";
    } else {
      html += `<div class="jsdoc-description" style="padding-left: 1em;">${escapeHtml(part)}</div>`;
    }
  });

  return html;
}

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
