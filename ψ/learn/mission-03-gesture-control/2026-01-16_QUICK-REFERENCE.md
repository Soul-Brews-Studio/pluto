# Mission-03 Gesture Control - Quick Reference

**Date**: 2026-01-16
**Repository**: https://github.com/Soul-Brews-Studio/mission-03-gesture-control

---

## What It Does

**MISSION-03** is an interactive gesture recognition system that turns hand movements into real-time controls for a 3D sphere visualization.

**The Scenario**: You're building the Oracle's interface. Your gestures control a knowledge graph globe. Two hands raised = Oracle awakens and speaks.

**Core Flow**:
```
Camera → MediaPipe → Gesture Detection → MQTT → 3D Globe
```

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Soul-Brews-Studio/mission-03-gesture-control
cd mission-03-gesture-control

# 2. Install dependencies
uv sync

# 3. Start MQTT broker
brew services start mosquitto

# 4. Terminal 1 - Hand tracker
uv run python3 hand_tracker.py

# 5. Terminal 2 - Gesture detector (YOUR CODE)
uv run python3 gesture_detector.py

# 6. Terminal 3 - Web server
python3 -m http.server 8080 --directory visualizer

# 7. Open http://localhost:8080
```

---

## Key Files

| File | Purpose | Status |
|------|---------|--------|
| `hand_tracker.py` | Camera → MQTT landmarks | ✅ Done |
| `gesture_detector.py` | Landmarks → Gestures | 🔧 TODO |
| `visualizer/app.js` | 3D Globe + Controls | 🔧 TODO |
| `rust-starter/` | Rust port (Level 3) | ⭐ Bonus |

---

## Gesture Detection

**Landmark Indices:**
```
Fingertips: 4(thumb), 8(index), 12(middle), 16(ring), 20(pinky)
Bases:      3,        6,        10,         14,       18
Wrist:      0
```

**5 Gestures to Implement:**

| Gesture | Logic | Action |
|---------|-------|--------|
| ✊ **Fist** | Tips below bases | Freeze rotation |
| 🖐 **Open Palm** | All tips > 0.2 from wrist | Zoom control |
| 🤏 **Pinch** | Thumb-index dist < 0.05 | Lock zoom |
| 👆 **Point** | Only index extended | Cycle filters |
| ✌️ **Peace** | Index + middle up | Toggle wireframe |

**Helper Function:**
```python
def distance(lm1, lm2):
    return ((lm1['x'] - lm2['x'])**2 + (lm1['y'] - lm2['y'])**2) ** 0.5
```

---

## MQTT Topics

| Topic | Publisher | Format |
|-------|-----------|--------|
| `hand/landmarks` | hand_tracker.py | `{hands: [{landmarks: [...]}]}` |
| `hand/gestures` | gesture_detector.py | `{gestures: [{name, confidence}]}` |
| `voice/speak` | visualizer | `{text, voice, rate}` |

---

## 3D Globe Features

- **65 nodes** distributed uniformly using KlakMath
- **5 node types**: data, event, action, state, link
- **Lightning**: 15 ambient + 60 storm connections
- **Thunder**: Every 5-8 seconds

**Controls:**
- Hand left/right → Rotate globe
- Palm size → Zoom in/out
- Two hands → Oracle speaks

---

## Scoring

| Requirement | Points |
|-------------|--------|
| 3 gestures detected | 40 |
| Globe responds | 20 |
| Smooth detection | 15 |
| Code quality | 15 |
| Demo video | 10 |
| **Total** | **100** |

**Bonus (+25):**
- Two hands = Oracle speaks (+10)
- Lightning effect (+5)
- Position-based rotation (+5)
- Palm zoom (+5)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera not opening | Check permissions |
| MQTT failed | `brew services start mosquitto` |
| No hands detected | Better lighting |
| Gesture not triggering | Lower confidence threshold |

---

## Philosophy

> "Don't detect positions. Detect relationships between points."
>
> "Two hands raised = you summon the Oracle."

**Patterns over intentions. Nothing is deleted. The hand speaks in distances.**
