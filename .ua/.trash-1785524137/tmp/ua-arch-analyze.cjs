#!/usr/bin/env node
'use strict';
const fs = require('fs');

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (!inPath || !outPath) { console.error('usage: script <in.json> <out.json>'); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const fileNodes = data.fileNodes || [];
  const importEdges = data.importEdges || [];
  const allEdges = data.allEdges || [];

  const idToNode = new Map(fileNodes.map(n => [n.id, n]));
  const paths = fileNodes.map(n => n.filePath || '').filter(Boolean);

  // Common prefix (by path segments)
  function commonPrefix(ps) {
    if (ps.length === 0) return '';
    const split = ps.map(p => p.split('/'));
    const first = split[0];
    let prefix = [];
    for (let i = 0; i < first.length - 1; i++) {
      const seg = first[i];
      if (split.every(s => s.length > i + 1 && s[i] === seg)) prefix.push(seg);
      else break;
    }
    return prefix.length ? prefix.join('/') + '/' : '';
  }
  const prefix = commonPrefix(paths);

  // A. Directory grouping
  const directoryGroups = {};
  const fileToGroup = {};
  for (const n of fileNodes) {
    let p = n.filePath || '';
    let rel = prefix && p.startsWith(prefix) ? p.slice(prefix.length) : p;
    const segs = rel.split('/');
    let group = segs.length > 1 ? segs[0] : '(root)';
    (directoryGroups[group] = directoryGroups[group] || []).push(n.id);
    fileToGroup[n.id] = group;
  }

  // B. Node type grouping
  const nodeTypeGroups = {};
  for (const n of fileNodes) (nodeTypeGroups[n.type] = nodeTypeGroups[n.type] || []).push(n.id);

  // C. Adjacency, fan-in/out
  const fanOut = {}, fanIn = {};
  for (const n of fileNodes) { fanOut[n.id] = 0; fanIn[n.id] = 0; }
  for (const e of importEdges) {
    if (fanOut[e.source] !== undefined) fanOut[e.source]++;
    if (fanIn[e.target] !== undefined) fanIn[e.target]++;
  }

  // D. Cross-category edges
  const crossMap = {};
  for (const e of allEdges) {
    const s = idToNode.get(e.source), t = idToNode.get(e.target);
    if (!s || !t) continue;
    if (s.type === t.type) continue;
    const k = s.type + '|' + t.type + '|' + e.type;
    crossMap[k] = (crossMap[k] || 0) + 1;
  }
  const crossCategoryEdges = Object.entries(crossMap).map(([k, count]) => {
    const [fromType, toType, edgeType] = k.split('|');
    return { fromType, toType, edgeType, count };
  }).sort((a, b) => b.count - a.count);

  // E. Inter-group imports
  const interMap = {};
  for (const e of importEdges) {
    const a = fileToGroup[e.source], b = fileToGroup[e.target];
    if (a === undefined || b === undefined || a === b) continue;
    const k = a + '|' + b;
    interMap[k] = (interMap[k] || 0) + 1;
  }
  const interGroupImports = Object.entries(interMap).map(([k, count]) => {
    const [from, to] = k.split('|'); return { from, to, count };
  }).sort((a, b) => b.count - a.count);

  // F. Intra-group density
  const intraGroupDensity = {};
  for (const g of Object.keys(directoryGroups)) intraGroupDensity[g] = { internalEdges: 0, totalEdges: 0, density: 0 };
  for (const e of importEdges) {
    const a = fileToGroup[e.source], b = fileToGroup[e.target];
    if (a === undefined || b === undefined) continue;
    if (a === b) { intraGroupDensity[a].internalEdges++; intraGroupDensity[a].totalEdges++; }
    else { intraGroupDensity[a].totalEdges++; intraGroupDensity[b].totalEdges++; }
  }
  for (const g of Object.keys(intraGroupDensity)) {
    const d = intraGroupDensity[g];
    d.density = d.totalEdges ? +(d.internalEdges / d.totalEdges).toFixed(3) : 0;
  }

  // G. Pattern matching
  const dirPatterns = [
    [['routes','api','controllers','endpoints','handlers','controller','routers','serializers','blueprints'],'api'],
    [['services','core','lib','domain','logic','signals','composables','mailers','jobs','channels','internal'],'service'],
    [['models','db','data','persistence','repository','entities','migrations','entity','sql','database'],'data'],
    [['components','views','pages','ui','layouts','screens'],'ui'],
    [['middleware','plugins','interceptors','guards'],'middleware'],
    [['utils','helpers','common','shared','tools','templatetags','pkg'],'utility'],
    [['config','constants','env','settings','management','commands'],'config'],
    [['__tests__','test','tests','spec','specs'],'test'],
    [['types','interfaces','schemas','contracts','dtos','dto','request','response'],'types'],
    [['hooks'],'hooks'],
    [['store','state','reducers','actions','slices'],'state'],
    [['assets','static','public'],'assets'],
    [['cmd','bin'],'entry'],
    [['docs','documentation','wiki'],'documentation'],
    [['deploy','deployment','infra','infrastructure','k8s','kubernetes','helm','charts','terraform','tf','docker'],'infrastructure'],
    [['.github','.gitlab','.circleci'],'ci-cd'],
  ];
  function matchDir(name) {
    const lower = name.toLowerCase();
    for (const [list, label] of dirPatterns) if (list.includes(lower)) return label;
    return null;
  }
  const patternMatches = {};
  for (const g of Object.keys(directoryGroups)) { const m = matchDir(g); if (m) patternMatches[g] = m; }

  // H. Deployment topology
  const infraFiles = [];
  let hasDockerfile = false, hasCompose = false, hasK8s = false, hasTerraform = false, hasCI = false;
  for (const n of fileNodes) {
    const p = (n.filePath || '');
    const base = p.split('/').pop();
    if (/^Dockerfile/i.test(base)) { hasDockerfile = true; infraFiles.push(p); }
    else if (/^docker-compose.*\.ya?ml$/i.test(base)) { hasCompose = true; infraFiles.push(p); }
    else if (/\.tf$|\.tfvars$/i.test(base)) { hasTerraform = true; infraFiles.push(p); }
    else if (/(^|\/)(k8s|kubernetes|helm|charts)(\/|$)/i.test(p)) { hasK8s = true; infraFiles.push(p); }
    else if (/\.github\/workflows\//i.test(p) || /gitlab-ci/i.test(base) || /Jenkinsfile/i.test(base)) { hasCI = true; infraFiles.push(p); }
  }
  const deploymentTopology = { hasDockerfile, hasCompose, hasK8s, hasTerraform, hasCI, infraFiles };

  // I. Data pipeline
  const dataPipeline = { schemaFiles: [], migrationFiles: [], dataModelFiles: [], apiHandlerFiles: [] };
  for (const n of fileNodes) {
    const p = n.filePath || '';
    if (/\.(sql|graphql|gql|proto|prisma)$/i.test(p)) dataPipeline.schemaFiles.push(p);
    if (/migrations?\//i.test(p)) dataPipeline.migrationFiles.push(p);
    if (/(models?|entities|entity)\//i.test(p)) dataPipeline.dataModelFiles.push(p);
    if (/(routes|controllers|handlers|endpoints|api)\//i.test(p)) dataPipeline.apiHandlerFiles.push(p);
  }

  // J. Doc coverage
  const groupsWithDocs = new Set();
  for (const n of fileNodes) {
    if (n.type === 'document' || /\.(md|rst)$/i.test(n.filePath || '')) {
      groupsWithDocs.add(fileToGroup[n.id]);
    }
  }
  const totalGroups = Object.keys(directoryGroups).length;
  const undocumentedGroups = Object.keys(directoryGroups).filter(g => !groupsWithDocs.has(g));
  const docCoverage = {
    groupsWithDocs: groupsWithDocs.size,
    totalGroups,
    coverageRatio: totalGroups ? +(groupsWithDocs.size / totalGroups).toFixed(2) : 0,
    undocumentedGroups,
  };

  // K. Dependency direction
  const pairNet = {};
  for (const { from, to, count } of interGroupImports) {
    const key = [from, to].sort().join('|');
    pairNet[key] = pairNet[key] || {};
    pairNet[key][from + '>' + to] = count;
  }
  const dependencyDirection = [];
  const seen = new Set();
  for (const { from, to } of interGroupImports) {
    const key = [from, to].sort().join('|');
    if (seen.has(key)) continue; seen.add(key);
    const fwd = (interMap[from + '|' + to] || 0);
    const rev = (interMap[to + '|' + from] || 0);
    if (fwd >= rev) dependencyDirection.push({ dependent: from, dependsOn: to });
    else dependencyDirection.push({ dependent: to, dependsOn: from });
  }

  // fileStats
  const filesPerGroup = {}; for (const g of Object.keys(directoryGroups)) filesPerGroup[g] = directoryGroups[g].length;
  const nodeTypeCounts = {}; for (const t of Object.keys(nodeTypeGroups)) nodeTypeCounts[t] = nodeTypeGroups[t].length;

  const result = {
    scriptCompleted: true,
    commonPrefix: prefix,
    directoryGroups,
    nodeTypeGroups,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    deploymentTopology,
    dataPipeline,
    docCoverage,
    dependencyDirection,
    fileStats: { totalFileNodes: fileNodes.length, filesPerGroup, nodeTypeCounts },
    fileFanIn: fanIn,
    fileFanOut: fanOut,
  };
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.error('OK groups=' + totalGroups + ' files=' + fileNodes.length);
}
try { main(); } catch (e) { console.error(e && e.stack || e); process.exit(1); }
