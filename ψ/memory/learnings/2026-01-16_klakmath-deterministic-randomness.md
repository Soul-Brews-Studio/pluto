# Lesson Learned: KlakMath's Deterministic Randomness Pattern

**Date**: 2026-01-16
**Source**: Session exploring keijiro/KlakMath

---

## The Pattern

KlakMath ใช้ XXHash สำหรับ "deterministic randomness" - random ที่ reproducible 100%

### Why It Matters

1. **Reproducibility** - seed เดียวกัน + data เดียวกัน = ผลลัพธ์เหมือนกันเสมอ
2. **No State** - ไม่ต้อง store random values, คำนวณได้ตอนไหนก็ได้
3. **Parallelizable** - แต่ละ particle คิดอิสระ, ใช้ SIMD/GPU ได้

### Implementation

```javascript
class XXHash {
    constructor(seed) { this.seed = seed >>> 0; }

    hash(data) {
        // 32-bit hash algorithm
        let h = ((this.seed + 374761393) >>> 0);
        h = ((h + (data * 3266489917 >>> 0)) >>> 0);
        // ... more bit operations
        return (h >>> 0) / 4294967296; // normalize to [0,1]
    }

    // Seed offset trick for multiple dimensions
    onSphere(data) {
        const phi = this.float(data, 0, Math.PI * 2);
        const z = this.float(data + 0x10000000, -1, 1); // offset!
        // ...
    }
}
```

### Key Insight: Seed Offset

```javascript
// ❌ Bad: Same hash for x, y, z
const x = hash.float(i);
const y = hash.float(i);  // Same as x!
const z = hash.float(i);  // Same as x!

// ✅ Good: Offset seed for different dimensions
const x = hash.float(i);
const y = hash.float(i + 0x10000000);
const z = hash.float(i + 0x20000000);
```

---

## Use Cases

1. **Particle Systems** - 8,000 particles, same layout every run
2. **Procedural Generation** - dungeons, terrain, with saveable seeds
3. **Networking** - client/server see same "random" events
4. **Testing** - predictable test cases

---

## Applied Today

ใช้ pattern นี้ใน Music Visualizer:
- Map particle index → frequency band
- Deterministic color assignment
- Reproducible sphere distribution

```javascript
const freqIndex = Math.floor(hash.float(particleIndex, 0, 1) * freqData.length);
// Same particle always responds to same frequency band
```

---

**Tags**: #algorithms #randomness #procedural-generation #klakmath
