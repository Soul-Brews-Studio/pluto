# KlakMath Architecture Overview

**Date**: 2026-01-16
**Repository**: https://github.com/keijiro/KlakMath

---

## Directory Structure

```
KlakMath/
├── Packages/
│   └── jp.keijiro.klak.math/          # Main UPM package
│       ├── Runtime/                    # Core library implementations
│       │   ├── CdsTween.cs
│       │   ├── ExpTween.cs
│       │   ├── Noise.cs
│       │   ├── Rotation.cs
│       │   ├── XXHash.cs
│       │   ├── RandomExtensions.cs
│       │   └── Klak.Math.asmdef      # Assembly definition
│       ├── package.json
│       ├── README.md
│       └── CHANGELOG.md
├── Assets/                             # Example scenes and test implementations
│   ├── Tween/                          # Interpolation examples
│   ├── Noise/                          # Noise generation examples
│   ├── XXHash/                         # Hash-based PRNG examples
│   ├── Random/                         # Random extensions examples
│   └── Misc/
├── ProjectSettings/                    # Unity project configuration
├── README.md
└── CHANGELOG.md
```

## Package Metadata

- **Name**: `jp.keijiro.klak.math`
- **Version**: 2.1.1 (December 2025)
- **Unity Version**: 2022.3+
- **License**: Unlicense (public domain)
- **Author**: Keijiro Takahashi
- **Core Dependency**: `com.unity.mathematics 1.2.6+`

## Core Components

### 1. CdsTween - Critically Damped Spring Interpolation

**File**: `Runtime/CdsTween.cs`

**Purpose**: Physics-based smooth interpolation using critically damped spring mechanics.

**Design Pattern**: State-based tuple return with velocity tracking
- **Supported Types**: float, float2, float3, float4, quaternion
- **Parameters**: Current state (position + velocity), target, speed coefficient, time delta
- **Returns**: New state tuple with updated position and velocity
- **Physics Model**: Critically damped spring mechanics with empirical formula

**Usage**: Smooth animation without overshoot, suitable for UI and camera motion.

### 2. ExpTween - Exponential Interpolation

**File**: `Runtime/ExpTween.cs`

**Purpose**: Simple exponential decay toward target value.

**Design Pattern**: Stateless lerp using exponential decay
- **Supported Types**: float, float2, float3, float4, quaternion
- **Formula**: `lerp(target, x, exp(-speed * dt))`
- **For Quaternions**: Uses normalized lerp (nlerp) instead of standard lerp
- **Characteristics**: No velocity tracking, simple exponential decay toward target

**Usage**: Lightweight tweening for positions, rotations, camera focus.

### 3. Noise - 1D Gradient Noise Generator

**File**: `Runtime/Noise.cs`

**Purpose**: Generate Perlin-like gradient noise for procedural generation.

**Structure**:
- **Base Generators**: `Float()`, `Float2()`, `Float3()`, `Float4()` - single octave 1D gradient noise
- **Fractal Generators**: `Fractal()`, `Fractal2()`, `Fractal3()`, `Fractal4()` - multi-octave layered noise
- **Rotation Generators**: `Rotation()`, `FractalRotation()` - quaternion generators using noise values as Euler angles

**Algorithm**:
- Uses XXHash internally for deterministic gradient generation
- Perlin-like gradient interpolation with quintic curve
- Fractal implementation: octave-based summation with halving amplitude

**Key Features**:
- Seed-based deterministic output (reproducible across runs)
- Linear interpolation of gradients with smooth falloff
- Amplitude normalization: `2 * 32 / 27` to scale output

### 4. XXHash - Deterministic Hash-based PRNG

**File**: `Runtime/XXHash.cs`

**Purpose**: Fast, deterministic pseudo-random number generation using hash functions.

**Structure**:
```csharp
public readonly struct XXHash {
    public uint Seed { get; }
    public XXHash(uint seed)
}
```

**Method Categories**:

1. **Unsigned Integer Generators**: `UInt()`, `UInt2()`, `UInt3()`, `UInt4()`
2. **Signed Integer Generators**: `Int()`, `Int2()`, `Int3()`, `Int4()`
3. **Float Generators**: `Float()`, `Float2()`, `Float3()`, `Float4()`
4. **Geometric Utilities**:
   - `OnCircle(uint data)` - Random point on unit circle
   - `InCircle(uint data)` - Random point in unit disk
   - `OnSphere(uint data)` - Random point on unit sphere
   - `InSphere(uint data)` - Random point in unit sphere
   - `Rotation(uint data)` - Random quaternion

**Algorithm**: XXHash32-based hash algorithm with XOR-folding finalization
- Deterministic: Same seed + data always produces same output
- Fast: Uses bitwise operations and prime multipliers
- Parallelizable: SIMD-friendly (works with vector types)

### 5. Rotation - Rotation Helpers

**File**: `Runtime/Rotation.cs`

**Purpose**: Utilities for computing quaternion rotations.

**Algorithm**: Vector-to-vector rotation computation
- Computes rotation quaternion from v1 to v2
- Uses cross product for axis and dot product for angle
- Formula: `q = normalize(cross(v1, v2), sqrt(|v1||v2|) + dot(v1, v2))`
- Handles degenerate cases with `normalizesafe()`

### 6. RandomExtensions - Extension Methods

**File**: `Runtime/RandomExtensions.cs`

**Purpose**: Extension methods for Unity.Mathematics.Random.

**Design**: Extension methods for Unity.Mathematics.Random
- Builds on Unity's built-in Random generator
- Properly weighted geometric sampling (using sqrt for disk, cbrt for sphere)

## Dependencies

**Runtime Dependencies**:
- **com.unity.mathematics 1.2.6+**: Provides SIMD-friendly math types (float2, float3, float4, quaternion, etc.)
- **UnityEngine**: Core Unity runtime (Time, Transform, etc.)

**No External Dependencies**: Pure mathematical library with no third-party dependencies beyond Unity core

## Architecture Patterns & Design Principles

### Type-Generic Design
All core classes provide overloads for scalar and vector types:
- Scalar: `float`, `int`, `uint`, `quaternion`
- Vectors: `float2`, `float3`, `float4`, `int2`, `int3`, `int4`, `uint2`, `uint3`, `uint4`

This allows single code path for both CPU scalar and vectorized operations.

### Stateless Functional API
- CdsTween: Returns tuple `(value, velocity)` - caller manages state
- ExpTween: Pure function - no state needed
- All methods are static, no class instantiation needed

### Deterministic Randomization
XXHash seed-based approach enables:
- Reproducible procedural generation
- Deterministic particle systems
- Hash-based spatial randomization

### SIMD-Aligned Design
- Uses Unity.Mathematics primitives (intrinsic SIMD types)
- No heap allocations
- Burst-compatible (can be compiled to native code)

### Performance Optimization
- Inline-friendly static methods
- Minimal branching in hot paths
- Vectorized operations for GPU-like parallelism

## Usage Patterns

**Interpolation Pattern**:
```csharp
// ExpTween: Simple frame-by-frame interpolation
position = ExpTween.Step(position, target, speed);

// CdsTween: With velocity tracking
(position, velocity) = CdsTween.Step((position, velocity), target, speed);
```

**Noise Pattern**:
```csharp
// Fractal noise generation
float3 position = Noise.Fractal3(inputCoord, octaves, seed) * scale;
```

**Hash-based Randomization Pattern**:
```csharp
var hash = new XXHash(seed);
var randomPoint = hash.InSphere(index);
var randomRotation = hash.Rotation(index);
```

**Rotation Pattern**:
```csharp
var rotation = Rotation.FromTo(upVector, targetDirection);
```

## Project Maturity

- **Current Version**: 2.1.1 (December 2025)
- **Stable API**: Core features unchanged since early versions
- **Recent Changes**: Unity 6.3 signing support added
- **Documentation**: README with feature overview, examples in Assets directory
- **Test Coverage**: Visual examples covering all major features

---

**Summary**: KlakMath is a focused, high-performance mathematical utility library for Unity that extends the mathematics package with animation, noise, and randomization primitives. It uses functional, type-generic design patterns with deterministic seeding for reproducibility, making it ideal for procedural generation, animation, and physics simulations in game development.
