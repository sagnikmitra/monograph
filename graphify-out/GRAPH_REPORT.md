# Graph Report - .  (2026-04-20)

## Corpus Check
- 16 files · ~92,778 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 192 nodes · 209 edges · 21 communities detected
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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `Monograph()` - 6 edges
2. `_renderMathChildren()` - 4 edges
3. `M()` - 4 edges
4. `MathBlock()` - 4 edges
5. `boseMeanOccupation()` - 3 edges
6. `_mathParse()` - 3 edges
7. `_toTexSource()` - 3 edges
8. `_katexHtml()` - 3 edges
9. `_sanitizeArray()` - 3 edges
10. `_sanitizeTraces()` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Hyperedges (group relationships)
- **p3 kernel reused across combinatorics, thermodynamics, field theory, and wave physics** —  [INFERRED]
- **distribution diagnostics and Gaussian comparison** —  [INFERRED]
- **functions called out as core or highly connected in report** —  [INFERRED]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (0): 

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (35): Monograph, Bose-Einstein thermodynamics, Bounded integer partitions, Feynman diagram enumeration, Normal approximation, Three-wave phase matching, Triplet kernel p3(S|M), Young-tableau conjugation (+27 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (0): 

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (0): 

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (0): 

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (0): 

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (0): 

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 0.38
Nodes (7): _katexHtml(), M(), MathBlock(), _mathParse(), _readBraced(), _renderMathChildren(), _toTexSource()

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (7): besteinsteinSpectrum(), boseMeanOccupation(), cayleySylvester(), ehrhart(), Monograph(), normalCDF(), p3Corrected()

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 0.6
Nodes (5): _sanitizeArray(), _sanitizeNumber(), _sanitizeTraces(), _validTarget(), _wrap()

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (2): generateQQ(), normalQuantile()

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (2): AGENTS.md, Memory context

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 14`** (2 nodes): `RouteFallback()`, `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `useInView.js`, `useInView()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `generateQQ()`, `normalQuantile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `LazyMount()`, `LazyMount.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `AGENTS.md`, `Memory context`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Monograph()` connect `Community 11` to `Community 0`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Why does `_renderMathChildren()` connect `Community 10` to `Community 0`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Why does `M()` connect `Community 10` to `Community 0`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._