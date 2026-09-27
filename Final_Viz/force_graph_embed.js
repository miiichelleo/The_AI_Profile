(() => {
  async function renderForceGraph(host, options = {}) {
    if (!host || typeof window.d3 === "undefined") {
      return;
    }

    const d3 = window.d3;
    const dataUrl = options.dataUrl || "./Final_Viz/Final_AI_Biometrics.json";

    const width = Math.max(320, Math.floor(host.clientWidth || 1048));
    const height = Math.max(260, Math.floor(host.clientHeight || 760));
    const clampMargin = 10;

    host.innerHTML = "";
    host.style.position = "relative";

    const raw = await d3.json(dataUrl);
    if (!Array.isArray(raw)) {
      return;
    }

    const clean = raw
      .map((d) => {
        const nr = (d["Nr."] || "").toString().trim();
        return {
          nr,
          biometric: (d["Biometric Analysis"] || "Unspecified").toString().trim() || "Unspecified",
          aiClassification: (d["AI Classification"] || "Unclassified").toString().trim() || "Unclassified",
          harm: (d["Harm"] || "Unclear or systemic harm").toString().trim() || "Unclear or systemic harm",
          incident: (d["Incident"] || "No incident title").toString().trim() || "No incident title",
          description: (d["Description"] || "No description").toString().trim() || "No description",
          date: (d.date || "Unknown").toString().trim() || "Unknown"
        };
      })
      .filter((d) => d.nr !== "");

    const linksCount = new Map();
    const nodesMap = new Map();
    const aiCaseCounts = new Map();
    const harmCaseCounts = new Map();

    function addNode(node) {
      if (!nodesMap.has(node.id)) {
        nodesMap.set(node.id, node);
        return;
      }
      Object.assign(nodesMap.get(node.id), node);
    }

    function addCountedLink(source, target) {
      const key = source + "|||" + target;
      linksCount.set(key, (linksCount.get(key) || 0) + 1);
    }

    clean.forEach((d) => {
      const caseId = "Case " + d.nr;
      const aiId = d.biometric + " | AI: " + d.aiClassification;
      const harmId = d.biometric + " | Harm: " + d.harm;

      aiCaseCounts.set(aiId, (aiCaseCounts.get(aiId) || 0) + 1);
      harmCaseCounts.set(harmId, (harmCaseCounts.get(harmId) || 0) + 1);

      addNode({
        id: caseId,
        label: caseId,
        group: d.biometric,
        layer: "case",
        nr: d.nr,
        incident: d.incident,
        description: d.description,
        date: d.date,
        aiClassification: d.aiClassification,
        harm: d.harm
      });

      addNode({
        id: aiId,
        label: d.aiClassification,
        group: d.biometric,
        layer: "ai",
        caseCount: aiCaseCounts.get(aiId)
      });

      addNode({
        id: harmId,
        label: d.harm,
        group: d.biometric,
        layer: "harm",
        caseCount: harmCaseCounts.get(harmId)
      });

      addCountedLink(caseId, aiId);
      addCountedLink(aiId, harmId);
    });

    const data = {
      nodes: Array.from(nodesMap.values()),
      links: Array.from(linksCount.entries()).map(([key, value]) => {
        const [source, target] = key.split("|||");
        return { source, target, value };
      })
    };

    const biometricTypes = Array.from(new Set(clean.map((d) => d.biometric))).sort((a, b) => a.localeCompare(b));
    // Case colors 
    const biometricPalette = ["#8CE4FF", "#569A4C", "#AF7AA1", "#FEEE91", "#FF5656", "#FFA239", "#ff7db5"];
    const color = d3.scaleOrdinal(biometricPalette).domain(biometricTypes);

    const layerCenters = {
      case: width * 0.11,
      ai: width * 0.5,
      harm: width * 0.89
    };

    function nodeRadius(d) {
      return d.layer === "case" ? 6 : d.layer === "ai" ? 5 : 4;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    const tooltip = document.createElement("div");
    tooltip.className = "viz-tooltip";
    tooltip.setAttribute("aria-hidden", "true");

    const links = data.links.map((d) => ({ ...d }));
    const nodes = data.nodes.map((d) => ({ ...d }));

    function resolveLayer(nodeLike) {
      if (nodeLike && typeof nodeLike === "object" && nodeLike.layer) {
        return nodeLike.layer;
      }
      if (typeof nodeLike === "string") {
        if (nodeLike.startsWith("Case ")) {
          return "case";
        }
        if (nodeLike.includes(" | AI: ")) {
          return "ai";
        }
      }
      return "harm";
    }

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(250))
      .force("charge", d3.forceManyBody().strength(-42))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "x",
        d3
          .forceX((d) => {
            if (d.layer === "case") return layerCenters.case;
            if (d.layer === "ai") return layerCenters.ai;
            return layerCenters.harm;
          })
            .strength(0.52)
      )
      .force(
        "y",
        d3
          .forceY((d) => {
            if (d.layer === "case") return height * 0.5;
            if (d.layer === "ai") return height * 0.42;
            return height * 0.58;
          })
          .strength(0.08)
      )
      .force("collide", d3.forceCollide().radius((d) => nodeRadius(d) + 1));

    const svg = d3
      .create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "width:100%;height:100%;display:block;background:transparent;");

    const link = svg
      .append("g")
      .attr("stroke", "#9ca3af")
      .attr("stroke-opacity", 0.45)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => (resolveLayer(d.source) === "case" ? "#60a5fa" : "#f59e0b"))
      .attr("stroke-opacity", (d) => (resolveLayer(d.source) === "case" ? 0.35 : 0.58))
      .attr("stroke-width", (d) => Math.max(0.6, Math.sqrt(d.value) * 0.42));

    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => nodeRadius(d))
      .attr("stroke", (d) => (d.layer === "case" ? "none" : "#ffffff"))
      .attr("stroke-width", 1)
      .attr("fill", (d) => {
        if (d.layer === "case") return color(d.group);
        // Match the legend's AI Classification (#4f79a7) and AI Harm (#f38e2c) line colors.
        if (d.layer === "ai") return "#4f79a7";
        return "#f38e2c";
      });

    // Seed nodes near their target lanes so first render already has visible links.
    nodes.forEach((d) => {
      if (!Number.isFinite(d.x) || !Number.isFinite(d.y)) {
        const laneX = d.layer === "case" ? layerCenters.case : d.layer === "ai" ? layerCenters.ai : layerCenters.harm;
        const laneY = d.layer === "case" ? height * 0.5 : d.layer === "ai" ? height * 0.42 : height * 0.58;
        d.x = laneX + (Math.random() - 0.5) * 24;
        d.y = laneY + (Math.random() - 0.5) * 24;
      }
    });

    node.append("title").text((d) => {
      if (d.layer === "case") {
        return `${d.id} (${d.group})`;
      }
      return `${d.label} (${d.group})`;
    });

    node.call(
      d3
        .drag()
        .on("start", (event) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on("drag", (event) => {
          const r = nodeRadius(event.subject);
          event.subject.fx = clamp(event.x, r, width - r);
          event.subject.fy = clamp(event.y, r, height - r);
        })
        .on("end", (event) => {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        })
    );

    function tooltipHtml(d) {
      if (d.layer === "case") {
        return `
          <p><strong>Case ${d.nr}</strong></p>
          <p><strong>Incident:</strong> ${d.incident}</p>
          <p><strong>Description:</strong> ${d.description}</p>
          <p><strong>Date:</strong> ${d.date}</p>
        `;
      }
      if (d.layer === "ai") {
        return `
          <p><strong>AI Classification</strong></p>
          <p>${d.label}</p>
          <p><strong>Related Cases:</strong> ${d.caseCount || 0}</p>
        `;
      }
      return `
        <p><strong>Harm</strong></p>
        <p>${d.label}</p>
        <p><strong>Related Cases:</strong> ${d.caseCount || 0}</p>
      `;
    }

    node
      .on("mouseover", (event, d) => {
        tooltip.innerHTML = tooltipHtml(d);
        tooltip.style.opacity = "1";
        tooltip.setAttribute("aria-hidden", "false");
        positionTooltip(event);
      })
      .on("mousemove", (event) => {
        positionTooltip(event);
      })
      .on("mouseout", () => {
        tooltip.style.opacity = "0";
        tooltip.setAttribute("aria-hidden", "true");
      });

    function positionTooltip(event) {
      const bounds = host.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      const margin = 14;

      // Flip above/left of the pointer when the tooltip would overflow the viz bounds.
      let left = pointerX + margin;
      if (left + tooltipWidth > bounds.width) {
        left = pointerX - margin - tooltipWidth;
      }
      left = clamp(left, 0, Math.max(0, bounds.width - tooltipWidth));

      let top = pointerY + margin;
      if (top + tooltipHeight > bounds.height) {
        top = pointerY - margin - tooltipHeight;
      }
      top = clamp(top, 0, Math.max(0, bounds.height - tooltipHeight));

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }

    function renderPositions() {
      nodes.forEach((d) => {
        const r = nodeRadius(d);
        d.x = clamp(d.x, r + clampMargin, width - r - clampMargin);
        d.y = clamp(d.y, r + clampMargin, height - r - clampMargin);
      });

      // Center the whole node cloud horizontally without changing scale, shifted right to clear the legend.
      const minX = Math.min(...nodes.map((d) => d.x));
      const maxX = Math.max(...nodes.map((d) => d.x));
      const targetCenterX = width / 2 + 50;
      const currentCenterX = (minX + maxX) / 2;
      const desiredShift = targetCenterX - currentCenterX;

      const leftSlack = Math.min(...nodes.map((d) => d.x - (nodeRadius(d) + clampMargin)));
      const rightSlack = Math.min(...nodes.map((d) => (width - nodeRadius(d) - clampMargin) - d.x));
      const boundedShift = clamp(desiredShift, -leftSlack, rightSlack);

      if (Math.abs(boundedShift) > 0.001) {
        nodes.forEach((d) => {
          d.x += boundedShift;
        });
      }

      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    }

    simulation.on("tick", () => {
      renderPositions();
    });

    // Force an initial settled layout so visuals render even in throttled/hidden tabs.
    simulation.tick(180);
    renderPositions();

    renderBiometricLegend(host, biometricTypes, color);

    host.appendChild(svg.node());
    host.appendChild(tooltip);
  }

  function renderBiometricLegend(host, biometricTypes, color) {
    const grid = host.parentElement ? host.parentElement.querySelector("[data-legend-bio-grid]") : null;
    if (!grid) {
      return;
    }

    grid.innerHTML = biometricTypes
      .map((value) => {
        const label = value.charAt(0).toUpperCase() + value.slice(1);
        return `
          <span class="legend-item legend-item-bio">
            <span class="legend-dot" style="background:${color(value)}"></span>${label}
          </span>
        `;
      })
      .join("");
  }

  window.renderForceGraph = renderForceGraph;
})();
