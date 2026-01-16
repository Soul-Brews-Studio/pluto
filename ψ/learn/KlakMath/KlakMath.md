# KlakMath Learning Index

**Repository**: https://github.com/keijiro/KlakMath
**Author**: Keijiro Takahashi
**License**: Unlicense (public domain)

---

## Latest Exploration

**Date**: 2026-01-16

**Files**:
- [2026-01-16_ARCHITECTURE](2026-01-16_ARCHITECTURE.md) - Architecture and design patterns
- [2026-01-16_CODE-SNIPPETS](2026-01-16_CODE-SNIPPETS.md) - Implementation examples and code patterns
- [2026-01-16_QUICK-REFERENCE](2026-01-16_QUICK-REFERENCE.md) - Usage guide and API reference

---

## What is KlakMath?

A high-performance mathematics extension library for Unity that provides:

1. **Tweening** - CdsTween (critically damped spring) and ExpTween (exponential decay)
2. **Noise** - 1D gradient noise with fractal variants for procedural generation
3. **XXHash** - Deterministic hash-based PRNG with geometric distributions
4. **Rotation** - Vector-to-vector quaternion helpers

**Core Philosophy**: Functional, stateless APIs using Unity.Mathematics types for Burst-compatible, high-performance math operations.

---

## Timeline

### 2026-01-16 (First exploration)

**Initial discovery** via `/learn` skill with 3 parallel Haiku agents

**Core findings**:
- Type-generic design with overloads for float/float2/float3/float4/quaternion
- Tuple-based state management for functional programming style
- Deterministic seeding enables reproducible procedural generation
- SIMD-aligned, Burst-compatible, zero-allocation design
- Elegant mathematical implementations (Hermite splines, uniform sphere sampling, closed-form spring physics)

**Key use cases**:
- Smooth camera motion and object tweening
- Procedural animation with noise
- Deterministic particle systems
- Hash-based spatial randomization

**Interesting patterns**:
- Quaternion shortest-path detection using dot product
- Inverse cube root for uniform sphere volume sampling
- Smart seed offsetting strategy for variations
- Burst-compiled static methods for performance

---

## Quick Start

```bash
# Clone location
ψ/learn/repo/github.com/keijiro/KlakMath/

# Add to Unity project
Add scoped registry in Packages/manifest.json:
{
  "scopedRegistries": [{
    "name": "Keijiro",
    "url": "https://registry.npmjs.com",
    "scopes": ["jp.keijiro"]
  }],
  "dependencies": {
    "jp.keijiro.klak.math": "2.1.1"
  }
}
```

---

## Related Projects

Part of the **Klak** series by Keijiro Takahashi:
- KlakMath - Mathematics utilities
- KlakSpout - Spout video sharing
- KlakNDI - NDI video streaming
- KlakHAP - HAP video codec

---

**Documentation Location**: `ψ/learn/KlakMath/`
