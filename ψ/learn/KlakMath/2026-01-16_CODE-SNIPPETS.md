# KlakMath Code Snippets

**Date**: 2026-01-16
**Repository**: https://github.com/keijiro/KlakMath

---

## 1. Library Usage Example

### Basic Tweening with XXHash Random Targets

**File**: `Assets/Tween/TweenTest.cs`

```csharp
using Klak.Math;
using Unity.Mathematics;
using UnityEngine;

sealed class TweenTest : MonoBehaviour
{
    [SerializeField] TweenType _type = TweenType.Exp;
    [SerializeField] uint _seed = 100;
    [SerializeField] float _speed = 4;

    (float3 p, quaternion r) _target;
    (float3 p, float4 r) _velocity;

    System.Collections.IEnumerator Start()
    {
        var hash = new XXHash(_seed);
        for (var i = 0u;;)
        {
            _target.p = hash.InSphere(i++) * _radius;
            _target.r = hash.Rotation(i++);
            yield return new WaitForSeconds(_interval);
        }
    }

    void Update()
    {
        var p = transform.localPosition;
        var r = transform.localRotation;

        if (_type == TweenType.Exp)
        {
            p = ExpTween.Step(p, _target.p, _speed);
            r = ExpTween.Step(r, _target.r, _speed);
        }
        else
        {
            (p, _velocity.p) = CdsTween.Step((p, _velocity.p), _target.p, _speed);
            (r, _velocity.r) = CdsTween.Step((r, _velocity.r), _target.r, _speed);
        }

        transform.localPosition = p;
        transform.localRotation = r;
    }
}
```

---

## 2. Core Implementation - Critically Damped Spring

### CdsTween Algorithm

**File**: `Packages/jp.keijiro.klak.math/Runtime/CdsTween.cs`

```csharp
public static class CdsTween
{
    // Core spring physics algorithm - works with tuples of (position, velocity)
    public static (float x, float v)
      Step((float x, float v) state, float target, float speed, float dt)
    {
        var n1 = state.v - (state.x - target) * (speed * speed * dt);
        var n2 = 1 + speed * dt;
        var nv = n1 / (n2 * n2);
        return (state.x + nv * dt, nv);
    }

    // Float2 variant
    public static (float2 x, float2 v)
      Step((float2 x, float2 v) state, float2 target, float speed, float dt)
    {
        var n1 = state.v - (state.x - target) * (speed * speed * dt);
        var n2 = 1 + speed * dt;
        var nv = n1 / (n2 * n2);
        return (state.x + nv * dt, nv);
    }

    // Quaternion variant handles shortest path interpolation
    public static (quaternion x, float4 v)
      Step((quaternion x, float4 v) state, quaternion target, float speed, float dt)
    {
        // Closer pose from target or -target
        if (math.dot(state.x, target) < 0) target.value *= -1;
        var n = Step((state.x.value, state.v), target.value, speed, dt);
        return (math.normalize(math.quaternion(n.x)), n.v);
    }
}
```

**Key Innovation**: Closed-form solution for critical damping that avoids numerical integration. The quaternion variant cleverly handles shortest-path by checking dot product and flipping if needed.

---

## 3. Exponential Interpolation

### ExpTween Implementation

**File**: `Packages/jp.keijiro.klak.math/Runtime/ExpTween.cs`

```csharp
public static class ExpTween
{
    // Simple exponential decay
    public static float Step(float x, float target, float speed, float dt)
      => math.lerp(target, x, math.exp(-speed * dt));

    public static float2 Step(float2 x, float2 target, float speed, float dt)
      => math.lerp(target, x, math.exp(-speed * dt));

    public static float3 Step(float3 x, float3 target, float speed, float dt)
      => math.lerp(target, x, math.exp(-speed * dt));

    public static float4 Step(float4 x, float4 target, float speed, float dt)
      => math.lerp(target, x, math.exp(-speed * dt));

    // For quaternions, uses normalized linear interpolation
    public static quaternion Step(quaternion x, quaternion target, float speed, float dt)
      => math.nlerp(target, x, math.exp(-speed * dt));
}
```

**Pattern**: Single-line implementations leveraging `math.lerp` and `math.nlerp` - stateless and extremely fast.

---

## 4. Gradient Noise Generator

### 1D Gradient Noise with Hermite Spline

**File**: `Packages/jp.keijiro.klak.math/Runtime/Noise.cs`

```csharp
public static partial class Noise
{
    // 1D gradient noise
    public static float Float(float p, uint seed)
    {
        var hash = new XXHash(seed);

        var i = (uint)((int)p + 0x10000000);  // Integer part with offset
        var x = math.frac(p);                  // Fractional part

        // Hermite spline weights: 3t^2 - 2t^3
        var k = math.float2(x, 1 - x);
        k = 1 - k * k;
        k = k * k * k;

        var g = math.float2(hash.Float(-1, 1, i    ),
                            hash.Float(-1, 1, i + 1));

        var n = math.dot(k * g, math.float2(x, x - 1));
        return n * 2 * 32 / 27;
    }

    // Fractal noise combines multiple octaves
    public static float Fractal(float p, int octave, uint seed)
    {
        var f = 0.0f;
        var w = 1.0f;
        for (var i = 0; i < octave; i++)
        {
            f += w * Float(p, seed);
            p *= 2.0f;      // Double frequency
            w *= 0.5f;      // Halve amplitude
        }
        return f;
    }
}
```

**Interesting Pattern**: Uses `k = 1 - k * k` then `k = k * k * k` to create smooth Hermite interpolation weights without explicit polynomial evaluation.

---

## 5. Noise Motion Example

### Procedural Animation with Fractal Noise

**File**: `Assets/Noise/NoiseMotion.cs`

```csharp
sealed class NoiseMotion : MonoBehaviour
{
    [SerializeField] uint _seed = 0;
    [SerializeField] float _frequency = 1;
    [SerializeField] int _octaves = 3;
    [SerializeField] float _radius = 3;
    [SerializeField] float3 _angle = math.PI;

    void Update()
    {
        var hash = new XXHash(_seed + 0x100000);
        var x = (Time.time + 100) * _frequency * hash.Float3(0.95f, 1.05f, 0);
        transform.localPosition = Noise.Fractal3(x, _octaves, _seed) * _radius;
        transform.localRotation = Noise.FractalRotation(x, _octaves, _angle, _seed + 1);
    }
}
```

---

## 6. XXHash - Core Algorithm

### Hash Function Implementation

**File**: `Packages/jp.keijiro.klak.math/Runtime/XXHash.cs`

```csharp
public readonly struct XXHash
{
    const uint PRIME32_1 = 2654435761U;
    const uint PRIME32_2 = 2246822519U;
    const uint PRIME32_3 = 3266489917U;
    const uint PRIME32_4 =  668265263U;
    const uint PRIME32_5 =  374761393U;

    public uint Seed { get; }
    public XXHash(uint seed) => Seed = seed;

    static uint rotl32(uint x, int r) => (x << r) | (x >> (32 - r));

    // Core hash algorithm - implements XXHash with finalization mixing
    static uint CalculateHash(uint data, uint seed)
    {
        var h32 = seed + PRIME32_5;
        h32 += 4U;
        h32 += data * PRIME32_3;
        h32 = rotl32(h32, 17) * PRIME32_4;
        h32 ^= h32 >> 15;
        h32 *= PRIME32_2;
        h32 ^= h32 >> 13;
        h32 *= PRIME32_3;
        h32 ^= h32 >> 16;
        return h32;
    }

    // Vectorized hash operations
    static uint2 CalculateHash(uint2 data, uint2 seed)
      => math.uint2(CalculateHash(data.x, seed.x),
                    CalculateHash(data.y, seed.y));

    static uint3 CalculateHash(uint3 data, uint3 seed)
      => math.uint3(CalculateHash(data.x, seed.x),
                    CalculateHash(data.y, seed.y),
                    CalculateHash(data.z, seed.z));

    static uint4 CalculateHash(uint4 data, uint4 seed)
      => math.uint4(CalculateHash(data.x, seed.x),
                    CalculateHash(data.y, seed.y),
                    CalculateHash(data.z, seed.z),
                    CalculateHash(data.w, seed.w));
}
```

---

## 7. Geometric Random Distributions

### Uniform Sampling on Sphere and Inside Sphere

**File**: `Packages/jp.keijiro.klak.math/Runtime/XXHash.cs`

```csharp
public readonly struct XXHash
{
    // Uniform distribution on unit sphere surface
    public float3 OnSphere(uint data)
    {
        var phi = Float(math.PI * 2, data);
        var z = Float(-1, 1, data + 0x10000000);
        var w = math.sqrt(1 - z * z);
        return math.float3(math.cos(phi) * w, math.sin(phi) * w, z);
    }

    // Uniform distribution inside unit sphere (uses cube root)
    public float3 InSphere(uint data)
      => OnSphere(data) * math.pow(Float(data + 0x20000000), 1.0f / 3);

    // Uniform random rotation using subgroup algorithm
    public quaternion Rotation(uint data)
    {
        var u1 = Float(data);
        var r1 = Float(math.PI * 2, data + 0x10000000);
        var r2 = Float(math.PI * 2, data + 0x20000000);
        var s1 = math.sqrt(1 - u1);
        var s2 = math.sqrt(    u1);
        var v = math.float4(s1 * math.sin(r1), s1 * math.cos(r1),
                            s2 * math.sin(r2), s2 * math.cos(r2));
        return math.quaternion(math.select(v, -v, v.w < 0));
    }
}
```

**Clever Pattern**: Uses `pow(random, 1/3)` for uniform sphere sampling - mathematically correct for 3D volumes.

---

## 8. Hash Rotation Test Example

### Generating Random Rotations

**File**: `Assets/XXHash/HashRotationTest.cs`

```csharp
sealed class HashRotationTest : MonoBehaviour
{
    [SerializeField] uint _seed = 0;
    [SerializeField] int _iteration = 1000;
    [SerializeField] Vector3 _baseVector = Vector3.forward;

    void Start()
    {
        var hash = new XXHash(_seed);
        var mesh = new Mesh();
        var indices = Enumerable.Range(0, _iteration);
        var vertices = indices.Select(i =>
            (Vector3)(math.mul(hash.Rotation((uint)i), (float3)_baseVector)));
        mesh.vertices = vertices.ToArray();
        mesh.SetIndices(indices.ToArray(), MeshTopology.Points, 0);
        GetComponent<MeshFilter>().sharedMesh = mesh;
    }
}
```

---

## 9. Rotation Helper

### Vector-to-Vector Rotation

**File**: `Packages/jp.keijiro.klak.math/Runtime/Rotation.cs`

```csharp
public static class Rotation
{
    // Computes rotation from v1 to v2
    public static quaternion FromTo(float3 v1, float3 v2)
    {
        var a = math.cross(v1, v2);           // Rotation axis
        var v1v2 = math.dot(v1, v1) * math.dot(v2, v2);
        var w = math.sqrt(v1v2) + math.dot(v1, v2);  // Rotation scalar
        return math.normalizesafe(math.quaternion(math.float4(a, w)));
    }
}
```

**Elegant Pattern**: Closed-form solution using cross product for axis and combined magnitude/dot for scalar - avoids explicit angle calculations.

---

## 10. Random Extensions

### Extension Methods for Unity Random

**File**: `Packages/jp.keijiro.klak.math/Runtime/RandomExtensions.cs`

```csharp
public static class RandomExtensions
{
    // Uniform point on unit disk
    public static float2 NextFloat2OnDisk(ref this Random self)
      => self.NextFloat2Direction() * math.sqrt(self.NextFloat());

    // Uniform point inside unit sphere
    public static float3 NextFloat3InSphere(ref this Random self)
      => self.NextFloat3Direction() * math.pow(self.NextFloat(), 1.0f / 3);
}
```

**Pattern**: Uses `ref this` for proper value type extension methods on Unity's `Random` struct. Properly weighted geometric sampling with sqrt/cbrt.

---

## 11. Burst-Compiled Noise Updates

### High-Performance Noise Graph Generation

**File**: `Assets/Noise/NoiseGraph1D.cs`

```csharp
[BurstCompile]
static void UpdateVertices
  (in RawSpan<Vector3> buffer, float freq, int oct, float time, uint seed)
{
    var span = buffer.Span;
    for (var i = 0; i < span.Length; i++)
    {
        var x = math.remap(0, span.Length - 1, -1, 1, i);
        var y = Noise.Fractal((x + time) * freq, oct, seed);
        span[i] = math.float3(x, y, 0);
    }
}

void Update()
{
    UpdateVertices(new RawSpan<Vector3>(_mesh.vertices),
                   _frequency, _octaves, Time.time, _seed);
    _mesh.RecalculateBounds();
}
```

**Pattern**: Separates computation into static Burst-compiled functions for maximum performance.

---

## 12. Smart Seed Offsetting

### Creating Variations from Base Seed

Throughout the codebase, seeds are offset with magic constants:

```csharp
// Different dimensions
var hash = new XXHash(_seed);
var x = hash.Float(data);
var y = hash.Float(data + 0x10000000);
var z = hash.Float(data + 0x20000000);

// Variations
transform.localPosition = Noise.Fractal3(x, _octaves, _seed);
transform.localRotation = Noise.FractalRotation(x, _octaves, _angle, _seed + 1);

// Multiple streams
var hash1 = new XXHash(_seed + 0x100000);
```

**Strategy**: Ensures different but deterministic sequences while maintaining perfect reproducibility.

---

All files are located in: `/Users/liskstryx/Desktop/_Dev_AI/Oracle_lab/ψ/learn/repo/github.com/keijiro/KlakMath/`
