# Graph Report - .  (2026-04-20)

## Corpus Check
- 4 files · ~36,649 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 91 nodes · 111 edges · 11 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]

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
- `Monograph.jsx` ----> `Monograph`  [EXTRACTED]
   →   _Bridges community 1 → community 2_
- `Monograph.jsx` ----> `besteinsteinSpectrum`  [EXTRACTED]
   →   _Bridges community 1 → community 6_
- `boseMeanOccupation` ----> `Graph report summary`  [EXTRACTED]
   →   _Bridges community 6 → community 2_

## Hyperedges (group relationships)
- **p3 kernel reused across combinatorics, thermodynamics, field theory, and wave physics** —  [INFERRED]
- **distribution diagnostics and Gaussian comparison** —  [INFERRED]
- **functions called out as core or highly connected in report** —  [INFERRED]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (0): 

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (22): Bounded integer partitions, Feynman diagram enumeration, Three-wave phase matching, Young-tableau conjugation, C, FONT_DISPLAY, FONT_MATH, FONT_MONO (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.29
Nodes (10): Monograph, Normal approximation, Triplet kernel p3(S|M), GRAPH_REPORT.md, cayleySylvester, generateQQ, normalCDF, normalQuantile (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (0): 

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (7): besteinsteinSpectrum(), boseMeanOccupation(), cayleySylvester(), ehrhart(), Monograph(), normalCDF(), p3Corrected()

### Community 5 - "Community 5"
Cohesion: 0.5
Nodes (4): M(), _mathParse(), _readBraced(), _renderMathChildren()

### Community 6 - "Community 6"
Cohesion: 1.0
Nodes (3): Bose-Einstein thermodynamics, besteinsteinSpectrum, boseMeanOccupation

### Community 7 - "Community 7"
Cohesion: 1.0
Nodes (2): generateQQ(), normalQuantile()

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (2): AGENTS.md, Memory context

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 7`** (2 nodes): `generateQQ()`, `normalQuantile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (2 nodes): `AGENTS.md`, `Memory context`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Monograph()` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Why does `boseMeanOccupation()` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Why does `_mathParse()` connect `Community 5` to `Community 0`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._