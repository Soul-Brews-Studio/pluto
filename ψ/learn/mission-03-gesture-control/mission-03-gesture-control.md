# Mission-03 Gesture Control Learning Index

**Repository**: https://github.com/Soul-Brews-Studio/mission-03-gesture-control
**Author**: Soul Brews Studio
**Purpose**: Educational gesture recognition system for "Level Up with AI" program

---

## Latest Exploration

**Date**: 2026-01-16

**Files**:
- [2026-01-16_ARCHITECTURE](2026-01-16_ARCHITECTURE.md) - System architecture and data flow
- [2026-01-16_CODE-SNIPPETS](2026-01-16_CODE-SNIPPETS.md) - Implementation examples
- [2026-01-16_QUICK-REFERENCE](2026-01-16_QUICK-REFERENCE.md) - Quick start guide

---

## What is Mission-03?

An interactive gesture recognition system that:

1. **Captures** hand movements via webcam (MediaPipe)
2. **Detects** gestures from 21 hand landmarks
3. **Controls** a 3D knowledge graph globe
4. **Speaks** when two hands are raised (Oracle awakens)

**Tech Stack**:
- Python + MediaPipe (hand tracking)
- MQTT (pub/sub messaging)
- Three.js (3D visualization)
- Optional: Rust (native port)

---

## Timeline

### 2026-01-16 (First exploration)

**Initial discovery** via `/learn` skill

**Core findings**:
- Multi-process architecture: Tracker → Detector → Visualizer
- Transfer learning approach: Use pretrained MediaPipe, add custom gesture rules
- KlakMath integration for deterministic sphere node distribution
- 5 gestures to implement: Fist, Open Palm, Pinch, Point, Peace
- Bonus: Two hands triggers Oracle voice

**Key use cases**:
- Educational AI/ML project
- Real-time gesture-based UI control
- 3D visualization with WebGL

**Interesting patterns**:
- Exponential smoothing for jitter-free control
- Position-based rotation (hand X → rotation speed)
- Palm size → zoom level mapping
- Lightning effects with perpendicular displacement

---

## Quick Start

```bash
# Clone
git clone https://github.com/Soul-Brews-Studio/mission-03-gesture-control
cd mission-03-gesture-control
uv sync

# Start MQTT
brew services start mosquitto

# Run components (3 terminals)
uv run python3 hand_tracker.py
uv run python3 gesture_detector.py
python3 -m http.server 8080 --directory visualizer

# Open http://localhost:8080
```

---

## Challenge Levels

| Level | Task | Difficulty |
|-------|------|------------|
| **1** | Implement 3 gesture detectors | Base |
| **2** | Replace rules with KNN classifier | ML |
| **3** | Port to Rust with proper error handling | Systems |

---

## Connection to KlakMath

This project uses **KlakMath** concepts:
- `xxhash` for deterministic random distribution
- `hashOnSphere` for uniform node placement
- Exponential smoothing (similar to ExpTween)

**Related**: See [ψ/learn/KlakMath/](../KlakMath/) for the library exploration

---

**Documentation Location**: `ψ/learn/mission-03-gesture-control/`
**Repo Location**: `ψ/learn/repo/github.com/Soul-Brews-Studio/mission-03-gesture-control/`
