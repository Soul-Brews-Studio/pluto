# Mission-03 Gesture Control - Code Snippets

**Date**: 2026-01-16
**Repository**: https://github.com/Soul-Brews-Studio/mission-03-gesture-control

---

## 1. Hand Tracker - Camera to MQTT Pipeline

**File**: `hand_tracker.py`

```python
#!/usr/bin/env python3
"""MediaPipe Hand Tracker -> MQTT (Tasks API for v0.10+)"""

def main():
    download_model()

    # Connect to MQTT
    client = mqtt.Client()
    client.connect(BROKER, PORT, 60)
    client.loop_start()
    print(f"✅ MQTT connected to {BROKER}:{PORT}")

    # MediaPipe Hand Landmarker setup
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    detector = vision.HandLandmarker.create_from_options(options)

    # Open camera and process frames
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break

        frame = cv2.flip(frame, 1)  # Selfie view
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        result = detector.detect(mp_image)

        # Prepare MQTT message
        message = {"timestamp": int(time.time() * 1000), "hands": []}

        if result.hand_landmarks:
            for hand_idx, hand_landmarks in enumerate(result.hand_landmarks):
                handedness = result.handedness[hand_idx][0].category_name
                landmarks = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand_landmarks]
                message["hands"].append({
                    "handedness": handedness,
                    "landmarks": landmarks
                })

        client.publish(TOPIC, json.dumps(message))
```

---

## 2. Gesture Detection - Transfer Learning

**File**: `gesture_detector.py`

```python
@dataclass
class Gesture:
    name: str
    confidence: float  # 0.0 to 1.0

def distance(lm1: Dict, lm2: Dict) -> float:
    """Calculate 2D distance between two landmarks."""
    return ((lm1['x'] - lm2['x'])**2 + (lm1['y'] - lm2['y'])**2) ** 0.5

def detect_fist(landmarks: List[Dict]) -> Optional[Gesture]:
    """
    Detect closed fist gesture.
    Fingertips (8, 12, 16, 20) should be BELOW their base joints (6, 10, 14, 18)
    """
    closed_count = 0
    for tip_idx, base_idx in [(8,6), (12,10), (16,14), (20,18)]:
        if landmarks[tip_idx]['y'] > landmarks[base_idx]['y']:
            closed_count += 1

    if closed_count >= 4:
        return Gesture("fist", confidence=0.9)
    return None

def detect_open_palm(landmarks: List[Dict]) -> Optional[Gesture]:
    """All fingertips > 0.2 away from wrist"""
    wrist = landmarks[0]
    extended = sum(1 for tip_idx in [4, 8, 12, 16, 20]
                   if distance(landmarks[tip_idx], wrist) > 0.2)

    if extended == 5:
        return Gesture("open_palm", 0.95)
    return None

def detect_pinch(landmarks: List[Dict]) -> Optional[Gesture]:
    """Thumb tip close to index tip (distance < 0.05)"""
    if distance(landmarks[4], landmarks[8]) < 0.05:
        return Gesture("pinch", 0.9)
    return None

def detect_point(landmarks: List[Dict]) -> Optional[Gesture]:
    """Only index extended, others closed"""
    # Index extended
    index_extended = landmarks[8]['y'] < landmarks[6]['y']
    # Others closed
    others_closed = all(
        landmarks[tip]['y'] > landmarks[base]['y']
        for tip, base in [(12, 10), (16, 14), (20, 18)]
    )

    if index_extended and others_closed:
        return Gesture("point", 0.85)
    return None

def detect_peace(landmarks: List[Dict]) -> Optional[Gesture]:
    """Index + middle extended, ring + pinky closed"""
    index_up = landmarks[8]['y'] < landmarks[6]['y']
    middle_up = landmarks[12]['y'] < landmarks[10]['y']
    ring_down = landmarks[16]['y'] > landmarks[14]['y']
    pinky_down = landmarks[20]['y'] > landmarks[18]['y']

    if index_up and middle_up and ring_down and pinky_down:
        return Gesture("peace", 0.9)
    return None

# Pipeline that runs all detectors
def detect_gestures(landmarks: List[Dict]) -> List[Gesture]:
    gestures = []
    for detector in [detect_fist, detect_open_palm, detect_pinch, detect_point, detect_peace]:
        result = detector(landmarks)
        if result and result.confidence > 0.5:
            gestures.append(result)
    return gestures
```

---

## 3. KlakMath Deterministic Sphere Distribution

**File**: `visualizer/app.js`

```javascript
// KlakMath: Deterministic Random Functions
function xxhash(seed, data) {
    let h = ((seed + 374761393) >>> 0);
    h = ((h + (data * 3266489917 >>> 0)) >>> 0);
    h = ((((h << 17) | (h >>> 15)) * 668265263) >>> 0);
    h ^= h >>> 15;
    h = ((h * 2246822519) >>> 0);
    h ^= h >>> 13;
    h = ((h * 3266489917) >>> 0);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;  // Normalize to [0, 1]
}

function hashOnSphere(seed, data) {
    const phi = xxhash(seed, data) * Math.PI * 2;
    const cosTheta = xxhash(seed, data + 0x10000000) * 2 - 1;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    return new THREE.Vector3(
        sinTheta * Math.cos(phi),
        sinTheta * Math.sin(phi),
        cosTheta
    );
}

// Create 65 evenly-distributed nodes on sphere
function createGlobe() {
    const SPHERE_RADIUS = 3;
    let nodeIndex = 0;

    Object.entries(NODE_TYPES).forEach(([type, config]) => {
        for (let i = 0; i < config.count; i++) {
            const pos = hashOnSphere(42, nodeIndex).multiplyScalar(SPHERE_RADIUS);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            globeGroup.add(mesh);
            nodeIndex++;
        }
    });
}
```

---

## 4. Hand Position → Globe Control

**File**: `visualizer/app.js`

```javascript
function handleHandPosition(landmarks) {
    if (!landmarks || landmarks.length < 21) return;

    const wrist = landmarks[0];
    const middleTip = landmarks[12];
    const thumbTip = landmarks[4];
    const pinkyTip = landmarks[20];

    // === POSITION-BASED ROTATION ===
    handX = (wrist.x + middleTip.x) / 2;
    const offsetFromCenter = handX - 0.5;

    // Speed proportional to distance from center (squared for more control)
    rotationSpeed = offsetFromCenter * Math.abs(offsetFromCenter) * MAX_ROTATION_SPEED * 4;

    // === PALM SIZE → ZOOM ===
    const palmHeight = distance2D(wrist, middleTip);
    const palmWidth = distance2D(thumbTip, pinkyTip);
    const palmSize = (palmHeight + palmWidth) / 2;

    // Smooth the palm size (exponential moving average)
    palmSizeSmooth += (palmSize - palmSizeSmooth) * 0.2;

    // Map palm size to zoom level
    const normalizedSize = (palmSizeSmooth - PALM_SIZE_MIN) / (PALM_SIZE_MAX - PALM_SIZE_MIN);
    const clampedSize = Math.max(0, Math.min(1, normalizedSize));
    zoomLevel = 12 - (clampedSize * 8);
}

// Gesture → Action mapping
function handleGesture(gestureName, confidence) {
    switch (gestureName) {
        case 'fist':
            rotationSpeed = 0;  // Freeze
            break;
        case 'point':
            cycleNodeFilters();  // Cycle visibility
            break;
        case 'peace':
            wireframeMode = !wireframeMode;  // Toggle wireframe
            nodes.forEach(n => n.mesh.material.wireframe = wireframeMode);
            break;
    }
}
```

---

## 5. Lightning Animation

**File**: `visualizer/app.js`

```javascript
function createLightningPath(start, end, segments = 8) {
    const points = [];
    const direction = end.clone().sub(start);
    const length = direction.length();
    direction.normalize();

    // Perpendicular vectors for random displacement
    const up = new THREE.Vector3(0, 1, 0);
    const perp1 = direction.clone().cross(up).normalize();
    const perp2 = direction.clone().cross(perp1).normalize();

    points.push(start.clone());

    for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const basePoint = start.clone().lerp(end, t);

        // Random perpendicular displacement (jagged effect)
        const displacement = (Math.random() - 0.5) * length * 0.15;
        const displacement2 = (Math.random() - 0.5) * length * 0.15;

        basePoint.add(perp1.clone().multiplyScalar(displacement));
        basePoint.add(perp2.clone().multiplyScalar(displacement2));
        points.push(basePoint);
    }

    points.push(end.clone());
    return points;
}

function triggerThunder() {
    thunderActive = true;
    thunderFlash = 1.0;

    // Flash all nodes bright
    nodes.forEach(node => {
        node.mesh.material.emissiveIntensity = 0.8;
    });

    // Regenerate lightning paths
    lightnings.forEach(lightning => {
        const newPoints = createLightningPath(
            nodes[lightning.nodeA].mesh.position,
            nodes[lightning.nodeB].mesh.position,
            10
        );
        lightning.line.geometry.setFromPoints(newPoints);
    });

    // Multi-flash effect
    setTimeout(() => { thunderFlash = 0.8; }, 50);
    setTimeout(() => { thunderFlash = 1.0; }, 100);
    setTimeout(() => { thunderFlash = 0.6; }, 150);
    setTimeout(() => { thunderActive = false; }, 400);
}
```

---

## 6. MQTT Message Handling

**File**: `visualizer/app.js`

```javascript
function connectMQTT() {
    client = mqtt.connect(BROKER);

    client.on('message', (topic, message) => {
        const data = JSON.parse(message.toString());

        if (topic === 'hand/gestures') {
            // Handle gestures from gesture_detector.py
            const gestures = data.gestures || [];
            if (gestures.length > 0) {
                const best = gestures.reduce((a, b) =>
                    a.confidence > b.confidence ? a : b
                );
                handleGesture(best.name, best.confidence);
            }
        } else if (topic === 'hand/landmarks') {
            // Handle hand position for continuous control
            const hands = data.hands || [];
            if (hands.length >= 2) {
                // Two hands = Oracle awakens
                rotationSpeed = 0;
                announceOracle();
            } else if (hands.length === 1) {
                handleHandPosition(hands[0].landmarks);
            }
        }
    });
}

// Voice announcement (bonus)
function announceOracle() {
    client.publish('voice/speak', JSON.stringify({
        text: "Hey, I am the Oracle. Are you ready to see the future?",
        voice: "Samantha",
        rate: 200
    }));
}
```

---

## 7. Rust KNN Gesture Classification

**File**: `rust-starter/src/main.rs`

```rust
#[derive(Clone)]
struct GestureTemplate {
    name: &'static str,
    features: [f32; 5], // [thumb, index, middle, ring, pinky] extension
}

const GESTURE_TEMPLATES: [GestureTemplate; 5] = [
    GestureTemplate { name: "fist",      features: [0.0, 0.0, 0.0, 0.0, 0.0] },
    GestureTemplate { name: "open_palm", features: [1.0, 1.0, 1.0, 1.0, 1.0] },
    GestureTemplate { name: "point",     features: [0.0, 1.0, 0.0, 0.0, 0.0] },
    GestureTemplate { name: "peace",     features: [0.0, 1.0, 1.0, 0.0, 0.0] },
    GestureTemplate { name: "pinch",     features: [0.5, 0.5, 1.0, 1.0, 1.0] },
];

fn classify_gesture(features: [f32; 5]) -> &'static str {
    GESTURE_TEMPLATES
        .iter()
        .min_by(|a, b| {
            let dist_a: f32 = a.features.iter()
                .zip(features.iter())
                .map(|(a, b)| (a - b).powi(2))
                .sum();
            let dist_b: f32 = b.features.iter()
                .zip(features.iter())
                .map(|(a, b)| (a - b).powi(2))
                .sum();
            dist_a.partial_cmp(&dist_b).unwrap()
        })
        .map(|t| t.name)
        .unwrap_or("unknown")
}
```

---

## Key Patterns Summary

| Pattern | Purpose |
|---------|---------|
| **Transfer Learning** | Use MediaPipe's pretrained model, add custom gesture rules |
| **KlakMath xxhash** | Deterministic uniform node layout on sphere |
| **Dual MQTT Topics** | Separate discrete (gestures) vs continuous (landmarks) |
| **Exponential Smoothing** | `smooth += (value - smooth) * 0.2` for jitter-free control |
| **Perpendicular Displacement** | Create realistic jagged lightning |
| **KNN Classification** | Distance-based gesture matching in Rust |
