#!/usr/bin/env node
"use strict";
const fs = require("fs");

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (!inPath || !outPath) {
    console.error("usage: node ua-tour-analyze.js <input.json> <output.json>");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(inPath, "utf8"));
  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const layers = data.layers || [];

  const byId = new Map();
  nodes.forEach((n) => byId.set(n.id, n));

  // fan-in / fan-out over ALL edge types
  const fanIn = new Map();
  const fanOut = new Map();
  nodes.forEach((n) => { fanIn.set(n.id, 0); fanOut.set(n.id, 0); });
  edges.forEach((e) => {
    if (fanOut.has(e.source)) fanOut.set(e.source, fanOut.get(e.source) + 1);
    if (fanIn.has(e.target)) fanIn.set(e.target, fanIn.get(e.target) + 1);
  });

  const nm = (id) => (byId.get(id) ? byId.get(id).name : id);

  const fanInRanking = [...fanIn.entries()]
    .map(([id, c]) => ({ id, fanIn: c, name: nm(id) }))
    .sort((a, b) => b.fanIn - a.fanIn)
    .slice(0, 20);
  const fanOutRanking = [...fanOut.entries()]
    .map(([id, c]) => ({ id, fanOut: c, name: nm(id) }))
    .sort((a, b) => b.fanOut - a.fanOut)
    .slice(0, 20);

  // percentile helpers for entry-point scoring
  const fanOutVals = [...fanOut.values()].sort((a, b) => a - b);
  const fanInVals = [...fanIn.values()].sort((a, b) => a - b);
  const pct = (arr, p) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] : 0;
  const fanOutTop10 = pct(fanOutVals, 0.9);
  const fanInBottom25 = pct(fanInVals, 0.25);

  const entryNames = new Set([
    "index.ts","index.js","main.ts","main.js","app.ts","app.js","server.ts","server.js",
    "mod.rs","main.go","main.py","main.rs","manage.py","app.py","wsgi.py","asgi.py","run.py",
    "__main__.py","Application.java","Main.java","Program.cs","config.ru","index.php",
    "App.swift","Application.kt","main.cpp","main.c",
  ]);

  const entryScores = nodes.map((n) => {
    let score = 0;
    const name = n.name || "";
    const fp = n.filePath || "";
    const depth = fp.split("/").length;
    if (n.type === "document") {
      if (name === "README.md" && depth === 1) score += 5;
      else if (/\.md$/i.test(name) && depth === 1) score += 2;
    } else if (n.type === "file") {
      if (entryNames.has(name)) score += 3;
      if (depth <= 2) score += 1;
      if (fanOut.get(n.id) >= fanOutTop10 && fanOutTop10 > 0) score += 1;
      if (fanIn.get(n.id) <= fanInBottom25) score += 1;
    }
    return { id: n.id, score, name, summary: n.summary || "", type: n.type };
  });
  const entryPointCandidates = entryScores
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((e) => ({ id: e.id, score: e.score, name: e.name, summary: e.summary }));

  // BFS from top CODE entry point, following imports+calls forward
  const topCodeEntry = entryScores
    .filter((e) => e.type !== "document" && e.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  const adj = new Map();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    if ((e.type === "imports" || e.type === "calls") && adj.has(e.source)) {
      adj.get(e.source).push(e.target);
    }
  });
  const bfs = { startNode: null, order: [], depthMap: {}, byDepth: {} };
  if (topCodeEntry) {
    const start = topCodeEntry.id;
    bfs.startNode = start;
    const seen = new Set([start]);
    let frontier = [start];
    let depth = 0;
    while (frontier.length) {
      const next = [];
      for (const id of frontier) {
        bfs.order.push(id);
        bfs.depthMap[id] = depth;
        (bfs.byDepth[depth] = bfs.byDepth[depth] || []).push(id);
        for (const t of (adj.get(id) || [])) {
          if (!seen.has(t)) { seen.add(t); next.push(t); }
        }
      }
      frontier = next;
      depth++;
    }
  }

  // non-code inventory
  const mkEntry = (n) => ({ id: n.id, name: n.name, type: n.type, summary: n.summary || "" });
  const nonCodeFiles = { documentation: [], infrastructure: [], data: [], config: [] };
  nodes.forEach((n) => {
    if (n.type === "document") nonCodeFiles.documentation.push(mkEntry(n));
    else if (["service", "pipeline", "resource"].includes(n.type)) nonCodeFiles.infrastructure.push(mkEntry(n));
    else if (["table", "schema", "endpoint"].includes(n.type)) nonCodeFiles.data.push(mkEntry(n));
    else if (n.type === "config") nonCodeFiles.config.push(mkEntry(n));
  });

  // clusters: bidirectional imports/calls pairs, expanded
  const pairKey = (a, b) => [a, b].sort().join("|||");
  const dirEdges = new Set();
  edges.forEach((e) => {
    if (e.type === "imports" || e.type === "calls") dirEdges.add(e.source + ">>>" + e.target);
  });
  const biPairs = [];
  const seenPair = new Set();
  edges.forEach((e) => {
    if (e.type !== "imports" && e.type !== "calls") return;
    if (dirEdges.has(e.target + ">>>" + e.source)) {
      const k = pairKey(e.source, e.target);
      if (!seenPair.has(k)) { seenPair.add(k); biPairs.push([e.source, e.target]); }
    }
  });
  // adjacency for expansion (undirected, imports/calls)
  const undirected = new Map();
  nodes.forEach((n) => undirected.set(n.id, new Set()));
  edges.forEach((e) => {
    if (e.type === "imports" || e.type === "calls") {
      if (undirected.has(e.source)) undirected.get(e.source).add(e.target);
      if (undirected.has(e.target)) undirected.get(e.target).add(e.source);
    }
  });
  const edgeCountBetween = (set) => {
    let c = 0;
    const arr = [...set];
    for (let i = 0; i < arr.length; i++)
      for (let j = i + 1; j < arr.length; j++) {
        if (dirEdges.has(arr[i] + ">>>" + arr[j])) c++;
        if (dirEdges.has(arr[j] + ">>>" + arr[i])) c++;
      }
    return c;
  };
  const clusters = [];
  const usedSig = new Set();
  biPairs.forEach(([a, b]) => {
    const cluster = new Set([a, b]);
    // expand: add nodes connected to 2+ members
    let grew = true;
    while (grew && cluster.size < 5) {
      grew = false;
      const candidates = new Map();
      cluster.forEach((m) => {
        (undirected.get(m) || new Set()).forEach((t) => {
          if (!cluster.has(t)) candidates.set(t, (candidates.get(t) || 0) + 1);
        });
      });
      for (const [c, cnt] of candidates) {
        if (cnt >= 2 && cluster.size < 5) { cluster.add(c); grew = true; break; }
      }
    }
    const sig = [...cluster].sort().join("|||");
    if (!usedSig.has(sig)) {
      usedSig.add(sig);
      clusters.push({ nodes: [...cluster], edgeCount: edgeCountBetween(cluster) });
    }
  });
  clusters.sort((a, b) => b.edgeCount - a.edgeCount);
  const topClusters = clusters.slice(0, 10);

  const nodeSummaryIndex = {};
  nodes.forEach((n) => {
    nodeSummaryIndex[n.id] = { name: n.name, type: n.type, summary: n.summary || "" };
  });

  const out = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal: bfs,
    nonCodeFiles,
    clusters: topClusters,
    layers: { count: layers.length, list: layers },
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length,
  };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("done. nodes=%d edges=%d entry=%s bfsReached=%d clusters=%d",
    nodes.length, edges.length, bfs.startNode, bfs.order.length, topClusters.length);
}

try { main(); } catch (e) { console.error(e.stack || String(e)); process.exit(1); }
