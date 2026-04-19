# Graph Report - .  (2026-04-20)

## Corpus Check
- Corpus is ~35,918 words - fits in a single context window. You may not need a graph.

## Summary
- 54 nodes · 60 edges · 7 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_bbnAbundanceEvolution|bbnAbundanceEvolution]]
- [[_COMMUNITY_getBatchProgress|getBatchProgress]]
- [[_COMMUNITY_besteinsteinSpectrum|besteinsteinSpectrum]]
- [[_COMMUNITY_M|M]]
- [[_COMMUNITY_generateQQ|generateQQ]]
- [[_COMMUNITY_vite config js|vite config js]]
- [[_COMMUNITY_main jsx|main jsx]]

## God Nodes (most connected - your core abstractions)
1. `Monograph()` - 6 edges
2. `boseMeanOccupation()` - 3 edges
3. `_mathParse()` - 3 edges
4. `_renderMathChildren()` - 3 edges
5. `cayleySylvester()` - 2 edges
6. `p3Corrected()` - 2 edges
7. `ehrhart()` - 2 edges
8. `normalCDF()` - 2 edges
9. `normalQuantile()` - 2 edges
10. `generateQQ()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "bbnAbundanceEvolution"
Cohesion: 0.07
Nodes (0): 

### Community 1 - "getBatchProgress"
Cohesion: 0.22
Nodes (0): 

### Community 2 - "besteinsteinSpectrum"
Cohesion: 0.29
Nodes (7): besteinsteinSpectrum(), boseMeanOccupation(), cayleySylvester(), ehrhart(), Monograph(), normalCDF(), p3Corrected()

### Community 3 - "M"
Cohesion: 0.5
Nodes (4): M(), _mathParse(), _readBraced(), _renderMathChildren()

### Community 4 - "generateQQ"
Cohesion: 1.0
Nodes (2): generateQQ(), normalQuantile()

### Community 5 - "vite config js"
Cohesion: 1.0
Nodes (0): 

### Community 6 - "main jsx"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `generateQQ`** (2 nodes): `generateQQ()`, `normalQuantile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `vite config js`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `main jsx`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Monograph()` connect `besteinsteinSpectrum` to `bbnAbundanceEvolution`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `boseMeanOccupation()` connect `besteinsteinSpectrum` to `bbnAbundanceEvolution`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Why does `_mathParse()` connect `M` to `bbnAbundanceEvolution`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Should `bbnAbundanceEvolution` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._