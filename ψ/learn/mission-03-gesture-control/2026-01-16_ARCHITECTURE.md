# Mission-03 Gesture Control - Architecture Overview

**Date**: 2026-01-16
**Repository**: https://github.com/Soul-Brews-Studio/mission-03-gesture-control

---

## Directory Structure

```
mission-03-gesture-control/
├── hand_tracker.py          # ✅ Complete - Camera input → MQTT
├── gesture_detector.py      # 🔧 Incomplete - MQTT → Gesture classification
├── visualizer/
│   ├── index.html          # ✅ Complete - 3D HTML/WebGL interface
│   └── app.js              # ✅ Complete - Three.js scene + MQTT client
├── rust-starter/           # Level 3 bonus - Rust implementation
│   ├── Cargo.toml
│   └── src/main.rs         # 🔧 Incomplete - Canvas rendering + gesture detection
├── pyproject.toml          # UV package manager config
├── requirements.txt        # Python dependencies
└── README.md              # Mission specification
```

---

## Execution Flow

**Multi-process Pipeline:**

```
[Camera Feed]
    ↓
hand_tracker.py (Python - MediaPipe)
    ↓ (MQTT: hand/landmarks)
    ├→ gesture_detector.py (Python - Rule-based classification)
    │   ↓ (MQTT: hand/gestures)
    │
    └→ visualizer/app.js (Browser - WebSocket/MQTT client)
        ↓
    [3D Globe Display + Voice Events]
```

**Startup Sequence:**
1. Start MQTT broker: `brew services start mosquitto`
2. Run hand tracker: `uv run python3 hand_tracker.py`
3. Run gesture detector: `uv run python3 gesture_detector.py`
4. Start web server: `python3 -m http.server 8080 --directory visualizer`
5. Open: http://localhost:8080

---

## Core Components

### A. Hand Tracking (hand_tracker.py)

**Architecture:**
- **Input:** Webcam (640x480 @ 30fps)
- **Model:** MediaPipe Hand Landmarker (21 landmarks per hand, up to 2 hands)
- **Output:** MQTT JSON with landmarks + handedness

**Landmark Reference Model:**
```
Fingertips: 4(thumb), 8(index), 12(middle), 16(ring), 20(pinky)
Base joints: 5,9,13,17 (finger bases), 0(wrist)

        8   12  16  20     <- Fingertips
        |   |   |   |
        7   11  15  19
        |   |   |   |
        6   10  14  18     <- Base joints
        |   |   |   |
        5---9---13--17
             \  |  /
              \ | /
               \|/
                0          <- Wrist
```

### B. Gesture Detection (gesture_detector.py)

**Architecture:**
- **Type:** Transfer learning (frozen MediaPipe model + rule-based classifier)
- **Input:** MQTT `hand/landmarks` topic
- **Classification:** 5 gesture detectors (each returns confidence 0.0-1.0)
- **Output:** MQTT `hand/gestures` topic

**Gesture Detectors (TO IMPLEMENT):**

| Gesture | Detection Logic |
|---------|-----------------|
| **Fist** | All fingertips below base joints |
| **Open Palm** | All fingertips extended far from wrist (dist > 0.2) |
| **Pinch** | Thumb tip close to index tip (dist < 0.05) |
| **Point** | Only index extended, others closed |
| **Peace** | Index + middle extended, ring + pinky closed |

### C. 3D Visualizer (visualizer/app.js)

**Scene Setup:**
- **Camera:** Perspective, position z=8, FOV=60°
- **Lighting:** Ambient + Directional + Rim light
- **Background:** Dark void #0a0a14

**3D Globe Structure:**
- 65 nodes distributed on sphere using KlakMath deterministic hashing
- **Node Types:**
  - data: 20 nodes, #4ade80 (green)
  - event: 15 nodes, #f472b6 (pink)
  - action: 12 nodes, #60a5fa (blue)
  - state: 10 nodes, #fbbf24 (yellow)
  - link: 8 nodes, #a78bfa (purple)

**Lightning System:**
- Ambient Lightning (15 connections): Always visible
- Storm Lightning (60 connections): Visible only during thunder
- Thunder Trigger: Random every 5-8 seconds

**Gesture Controls:**

| Gesture | Action |
|---------|--------|
| **Fist** | Stop rotation |
| **Open Palm** | Zoom control via palm size |
| **Pinch** | Lock zoom |
| **Point** | Cycle node type visibility |
| **Peace** | Toggle wireframe mode |
| **Two Hands** | STOP + Oracle voice trigger |

---

## Dependencies

### Python Stack
```toml
mediapipe>=0.10.0     # Hand landmark detection
opencv-python>=4.8.0  # Camera input + visualization
paho-mqtt>=2.0.0      # MQTT client
```

### JavaScript Stack
```html
<script src="three.js/r128">    <!-- 3D rendering -->
<script src="mqtt.min.js">      <!-- MQTT WebSocket client -->
```

### Rust Stack (Level 3)
```toml
rumqttc = "0.24"        # Async MQTT client
tokio = "1"             # Async runtime
minifb = "0.27"         # Framebuffer canvas
glam = "0.25"           # 3D math
```

---

## MQTT Message Formats

### Topic: `hand/landmarks`
```json
{
  "timestamp": 1673456789123,
  "hands": [
    {
      "handedness": "Right",
      "landmarks": [
        {"x": 0.5, "y": 0.4, "z": 0.1},
        ... // 21 landmarks
      ]
    }
  ]
}
```

### Topic: `hand/gestures`
```json
{
  "handedness": "Right",
  "gestures": [
    {"name": "fist", "confidence": 0.87}
  ]
}
```

### Topic: `voice/speak` (Bonus)
```json
{
  "text": "Oracle awakens",
  "voice": "Samantha",
  "rate": 280
}
```

---

## Design Patterns

1. **Transfer Learning:** Frozen MediaPipe embeddings + rule-based classifiers
2. **MQTT Pub/Sub:** Decoupled multi-process architecture
3. **Deterministic Hashing:** KlakMath xxhash for reproducible sphere layout
4. **Exponential Smoothing:** Smooth camera zoom and node animations
5. **Confidence Thresholds:** Multi-channel gesture detection with 50% filter

---

## Challenge Levels

**Level 1 (Base):**
- Rule-based gesture detection (3-5 gestures)
- Globe responds to hand tracking

**Level 2 (ML):**
- Replace rules with KNN classifier
- Train on 50+ samples per gesture
- Accuracy target: >90%

**Level 3 (Systems):**
- Port visualizer to Rust
- Zero `.unwrap()` calls
- MQTT + 3D rendering in native code
