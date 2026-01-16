# KlakMath Quick Reference

**Date**: 2026-01-16
**Repository**: https://github.com/keijiro/KlakMath

---

## What It Does

**KlakMath** is an extension library for the Unity Mathematics package that adds four powerful math utilities:

- **Tweening/Interpolation**: Smooth animations using different mathematical models
- **Noise Generation**: Perlin-like gradient noise for procedural generation
- **Pseudo-random Number Generation**: Deterministic hashing as a fast PRNG
- **Rotation Helpers**: Utilities for working with quaternion rotations

Designed for high-performance, data-oriented code using the Burst compiler and Unity's Mathematics package.

---

## Installation

### Add the Keijiro Scoped Registry

Open `Packages/manifest.json` and add:

```json
{
  "scopedRegistries": [
    {
      "name": "Keijiro",
      "url": "https://registry.npmjs.com",
      "scopes": ["jp.keijiro"]
    }
  ],
  "dependencies": {
    "jp.keijiro.klak.math": "2.1.1"
  }
}
```

Or use Unity Package Manager GUI:
1. Window → Package Manager
2. Add by name: `jp.keijiro.klak.math`

**Requirements:**
- Unity 2022.3+
- Unity Mathematics 1.2.6+

---

## Key Features

### A. Interpolation/Tweening

#### CdsTween - Critically Damped Spring

Physics-based smooth animation with momentum. Best for natural-feeling motion.

```csharp
public static (T x, T v) Step((T x, T v) state, T target, float speed, float dt)
```

**Types**: float, float2, float3, float4, quaternion
**Returns**: Tuple of new position and velocity

#### ExpTween - Exponential Interpolation

Fast, simple exponential decay. Good for UI and simple cases.

```csharp
public static T Step(T x, T target, float speed, float dt)
```

**Types**: float, float2, float3, float4, quaternion
**Returns**: New interpolated value (no velocity tracking)

### B. Noise Generation

1D gradient noise for procedural generation and organic motion:

**Core Methods:**
- `Noise.Float(float p, uint seed)` - 1D noise
- `Noise.Float2(float2 p, uint seed)` - 2D noise vector
- `Noise.Float3(float3 p, uint seed)` - 3D noise vector
- `Noise.Float4(float4 p, uint seed)` - 4D noise vector

**Fractal Versions:**
- `Noise.Fractal(float p, int octave, uint seed)`
- `Noise.Fractal2(float2 p, int octave, uint seed)`
- `Noise.Fractal3(float3 p, int octave, uint seed)`
- `Noise.Fractal4(float4 p, int octave, uint seed)`

**Rotation Helpers:**
- `Noise.Rotation(float3 p, float3 angles, uint seed)`
- `Noise.FractalRotation(float3 p, int octave, float3 angles, uint seed)`

### C. XXHash - Deterministic PRNG

Fast hash function that acts as deterministic random number generator. Same seed always produces same results.

| Method | Returns | Range |
|--------|---------|-------|
| `UInt(uint data)` | `uint` | Full range |
| `Int(uint data)` | `int` | Full range |
| `Float(uint data)` | `float` | [0, 1) |
| `Bool(uint data)` | `bool` | true/false |
| `UInt(uint min, uint max, uint data)` | `uint` | [min, max) |
| `Float(float min, float max, uint data)` | `float` | [min, max] |
| `Int2(uint data)` | `int2` | Full range |
| `Float3(uint data)` | `float3` | [0, 1) |

**Geometric Utilities:**
- `OnCircle(uint data)` - Point on unit circle
- `InCircle(uint data)` - Point inside unit circle
- `OnSphere(uint data)` - Point on unit sphere
- `InSphere(uint data)` - Point inside unit sphere
- `Rotation(uint data)` - Random quaternion rotation

### D. Rotation Helper

```csharp
public static quaternion FromTo(float3 v1, float3 v2)
```

Calculates rotation needed to rotate vector v1 to v2.

### E. Random Extensions

Extensions to Unity's Random class:

- `NextFloat2OnDisk()` - Random point on unit disk
- `NextFloat3InSphere()` - Random point inside unit sphere

---

## Usage Patterns

### Pattern 1: Smooth Camera Following (ExpTween)

```csharp
using UnityEngine;
using Unity.Mathematics;
using Klak.Math;

public class CameraFollower : MonoBehaviour
{
    public Transform target;
    public float speed = 5f;

    void LateUpdate()
    {
        var pos = transform.position;
        pos = ExpTween.Step((float3)pos, (float3)target.position, speed);
        transform.position = pos;
    }
}
```

### Pattern 2: Bouncy Object Animation (CdsTween)

```csharp
using UnityEngine;
using Unity.Mathematics;
using Klak.Math;

public class BouncyObject : MonoBehaviour
{
    public float speed = 3f;

    private (float3 pos, float3 vel) _state;
    private float3 _target;

    void Start()
    {
        _state.pos = transform.position;
        _target = _state.pos + new float3(5, 0, 0);
    }

    void Update()
    {
        _state = CdsTween.Step(_state, _target, speed);
        transform.position = _state.pos;
    }
}
```

### Pattern 3: Procedural Motion with Noise

```csharp
using UnityEngine;
using Unity.Mathematics;
using Klak.Math;

public class NoiseWalk : MonoBehaviour
{
    public uint seed = 42;
    public float frequency = 1f;
    public float amplitude = 2f;
    public int octaves = 3;

    void Update()
    {
        var time = Time.time * frequency;
        var offset = Noise.Fractal3((float3)(time, time + 100, time + 200), octaves, seed);
        transform.position = offset * amplitude;
    }
}
```

### Pattern 4: Deterministic Random Distribution

```csharp
using UnityEngine;
using Unity.Mathematics;
using Klak.Math;

public class RandomSpawner : MonoBehaviour
{
    public void SpawnInSphere(uint seed, int count, float radius)
    {
        var hash = new XXHash(seed);
        for (uint i = 0; i < count; i++)
        {
            var pos = hash.InSphere(i) * radius;
            Instantiate(prefab, pos, Quaternion.identity);
        }
    }
}
```

### Pattern 5: Random Rotation

```csharp
using UnityEngine;
using Unity.Mathematics;
using Klak.Math;

public class RandomRotator : MonoBehaviour
{
    void Start()
    {
        var hash = new XXHash((uint)gameObject.GetInstanceID());
        transform.rotation = (Quaternion)hash.Rotation(0);
    }
}
```

### Pattern 6: Align To Direction

```csharp
using UnityEngine;
using Unity.Mathematics;
using Klak.Math;

public class LookAtObject : MonoBehaviour
{
    public Transform target;

    void Update()
    {
        var direction = (target.position - transform.position);
        var rotation = Rotation.FromTo(Vector3.forward, direction);
        transform.rotation = (Quaternion)rotation;
    }
}
```

### Pattern 7: Mesh Generation with Random Points

```csharp
using UnityEngine;
using Klak.Math;
using Random = Unity.Mathematics.Random;
using System.Linq;

public class PointCloudMesh : MonoBehaviour
{
    void Start()
    {
        var rand = new Random(42);
        var mesh = new Mesh();

        var vertices = Enumerable.Range(0, 1000)
            .Select(_ => (Vector3)rand.NextFloat3InSphere())
            .ToArray();

        var indices = Enumerable.Range(0, 1000).ToArray();

        mesh.vertices = vertices;
        mesh.SetIndices(indices, MeshTopology.Points, 0);
        GetComponent<MeshFilter>().mesh = mesh;
    }
}
```

### Pattern 8: Combining Tweens with Noise

```csharp
using UnityEngine;
using Unity.Mathematics;
using Klak.Math;

public class ComplexMotion : MonoBehaviour
{
    private (float3 pos, float3 vel) _tween;
    private float3 _baseTarget;

    void Update()
    {
        // Generate noisy target
        var noise = Noise.Float3((float3)Time.time * 0.5f, 0) * 2f;
        var target = _baseTarget + noise;

        // Smoothly interpolate to target
        _tween = CdsTween.Step(_tween, target, 2f);
        transform.position = _tween.pos;
    }
}
```

---

## Quick API Cheat Sheet

```csharp
using Klak.Math;
using Unity.Mathematics;

// Tweening
var pos = ExpTween.Step(currentPos, targetPos, speed);
var (newPos, newVel) = CdsTween.Step((pos, vel), target, speed);

// Noise
var n1d = Noise.Float(position, seed);
var n3d = Noise.Fractal3(position, octaves, seed);
var rot = Noise.FractalRotation(position, octaves, angles, seed);

// XXHash (PRNG)
var hash = new XXHash(seed);
var randomPos = hash.InSphere(i);
var randomRot = hash.Rotation(i);
var randomFloat = hash.Float(min, max, i);

// Rotation
var rot = Rotation.FromTo(from, to);

// Random extensions
var disk = random.NextFloat2OnDisk();
var sphere = random.NextFloat3InSphere();
```

---

## Common Pitfalls and Tips

1. **CdsTween requires state tracking**: Store both position and velocity between frames
2. **XXHash is deterministic**: Use unique `uint` data values for different random numbers from same seed
3. **Noise uses continuous positions**: Works best with Time.time or animated positions
4. **All methods are data-oriented**: Works great with Burst compiler and ECS
5. **Quaternion tweening**: Both tweens work with quaternions but CdsTween returns float4 velocity
6. **Import namespace**: Always add `using Klak.Math;` to your scripts

---

Perfect for procedural generation, animations, and high-performance numerical work in Unity. Aligns perfectly with modern data-oriented rendering and the Burst compiler.
