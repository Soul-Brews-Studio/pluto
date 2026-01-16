// KlakMath JavaScript Implementation
// Based on https://github.com/keijiro/KlakMath

// ============================================================================
// ExpTween - Exponential Interpolation
// ============================================================================
const ExpTween = {
    step: (current, target, speed, dt = 1/60) => {
        const t = Math.exp(-speed * dt);
        return current + (target - current) * (1 - t);
    },

    step2D: (current, target, speed, dt = 1/60) => {
        return {
            x: ExpTween.step(current.x, target.x, speed, dt),
            y: ExpTween.step(current.y, target.y, speed, dt)
        };
    }
};

// ============================================================================
// CdsTween - Critically Damped Spring
// ============================================================================
const CdsTween = {
    step: (state, target, speed, dt = 1/60) => {
        const n1 = state.v - (state.x - target) * (speed * speed * dt);
        const n2 = 1 + speed * dt;
        const nv = n1 / (n2 * n2);
        return {
            x: state.x + nv * dt,
            v: nv
        };
    },

    step2D: (state, target, speed, dt = 1/60) => {
        const x = CdsTween.step(
            {x: state.pos.x, v: state.vel.x},
            target.x,
            speed,
            dt
        );
        const y = CdsTween.step(
            {x: state.pos.y, v: state.vel.y},
            target.y,
            speed,
            dt
        );
        return {
            pos: {x: x.x, y: y.x},
            vel: {x: x.v, y: y.v}
        };
    }
};

// ============================================================================
// XXHash - Deterministic Hash Function
// ============================================================================
class XXHash {
    constructor(seed) {
        this.seed = seed >>> 0;
    }

    static PRIME32_1 = 2654435761;
    static PRIME32_2 = 2246822519;
    static PRIME32_3 = 3266489917;
    static PRIME32_4 = 668265263;
    static PRIME32_5 = 374761393;

    static rotl32(x, r) {
        return ((x << r) | (x >>> (32 - r))) >>> 0;
    }

    hash(data) {
        data = data >>> 0;
        let h32 = (this.seed + XXHash.PRIME32_5) >>> 0;
        h32 = (h32 + 4) >>> 0;
        h32 = (h32 + data * XXHash.PRIME32_3) >>> 0;
        h32 = (XXHash.rotl32(h32, 17) * XXHash.PRIME32_4) >>> 0;
        h32 ^= h32 >>> 15;
        h32 = (h32 * XXHash.PRIME32_2) >>> 0;
        h32 ^= h32 >>> 13;
        h32 = (h32 * XXHash.PRIME32_3) >>> 0;
        h32 ^= h32 >>> 16;
        return h32 >>> 0;
    }

    float(data, min = 0, max = 1) {
        const h = this.hash(data);
        const normalized = h / 0xFFFFFFFF;
        return min + (max - min) * normalized;
    }

    onCircle(data) {
        const angle = this.float(data, 0, Math.PI * 2);
        return {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }

    inCircle(data) {
        const p = this.onCircle(data);
        const r = Math.sqrt(this.float(data + 0x10000000));
        return {
            x: p.x * r,
            y: p.y * r
        };
    }

    onSphere(data) {
        const phi = this.float(data, 0, Math.PI * 2);
        const z = this.float(data + 0x10000000, -1, 1);
        const w = Math.sqrt(1 - z * z);
        return {
            x: Math.cos(phi) * w,
            y: Math.sin(phi) * w,
            z: z
        };
    }

    inSphere(data) {
        const p = this.onSphere(data);
        const r = Math.pow(this.float(data + 0x20000000), 1/3);
        return {
            x: p.x * r,
            y: p.y * r,
            z: p.z * r
        };
    }
}

// ============================================================================
// Noise - 1D Gradient Noise
// ============================================================================
const Noise = {
    float: (p, seed) => {
        const hash = new XXHash(seed);
        const i = Math.floor(p) + 0x10000000;
        const x = p - Math.floor(p);

        // Hermite spline weights
        let k = [x, 1 - x];
        k = k.map(v => 1 - v * v);
        k = k.map(v => v * v * v);

        const g = [
            hash.float(i, -1, 1),
            hash.float(i + 1, -1, 1)
        ];

        const n = k[0] * g[0] * x + k[1] * g[1] * (x - 1);
        return n * 2 * 32 / 27;
    },

    fractal: (p, octaves, seed) => {
        let f = 0;
        let w = 1;
        for (let i = 0; i < octaves; i++) {
            f += w * Noise.float(p, seed + i);
            p *= 2;
            w *= 0.5;
        }
        return f;
    },

    fractal2D: (x, y, octaves, seed) => {
        return {
            x: Noise.fractal(x, octaves, seed),
            y: Noise.fractal(y, octaves, seed + 0x10000)
        };
    }
};

// ============================================================================
// Utilities
// ============================================================================
function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// ============================================================================
// Demo 1: Tweening
// ============================================================================
class TweenDemo {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();

        this.mode = 'exp'; // 'exp' or 'cds'
        this.speed = 5;

        this.pos = {x: this.width / 2, y: this.height / 2};
        this.vel = {x: 0, y: 0};
        this.target = {x: this.width * 0.7, y: this.height * 0.3};

        this.trail = [];
        this.maxTrail = 50;

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    setTarget(x, y) {
        this.target = {x, y};
        this.trail = [];
    }

    randomTarget() {
        this.setTarget(
            Math.random() * this.width * 0.8 + this.width * 0.1,
            Math.random() * this.height * 0.8 + this.height * 0.1
        );
    }

    update(dt) {
        if (this.mode === 'exp') {
            this.pos = ExpTween.step2D(this.pos, this.target, this.speed, dt);
            // Calculate velocity for display
            this.vel = {
                x: (this.target.x - this.pos.x) * this.speed,
                y: (this.target.y - this.pos.y) * this.speed
            };
        } else {
            const state = CdsTween.step2D(
                {pos: this.pos, vel: this.vel},
                this.target,
                this.speed,
                dt
            );
            this.pos = state.pos;
            this.vel = state.vel;
        }

        this.trail.push({...this.pos});
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }
    }

    draw() {
        const dpr = window.devicePixelRatio;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw trail
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i < this.trail.length; i++) {
            const p = this.trail[i];
            if (i === 0) {
                this.ctx.moveTo(p.x / dpr, p.y / dpr);
            } else {
                this.ctx.lineTo(p.x / dpr, p.y / dpr);
            }
        }
        this.ctx.stroke();

        // Draw target
        this.ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(this.target.x / dpr, this.target.y / dpr, 15, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 100, 100, 1)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw current position
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.pos.x / dpr, this.pos.y / dpr, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw velocity vector
        const velScale = 5;
        this.ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(this.pos.x / dpr, this.pos.y / dpr);
        this.ctx.lineTo(
            (this.pos.x + this.vel.x * velScale) / dpr,
            (this.pos.y + this.vel.y * velScale) / dpr
        );
        this.ctx.stroke();
    }

    getStats() {
        const dist = distance(this.pos, this.target);
        return {
            pos: `${(this.pos.x / window.devicePixelRatio).toFixed(2)}, ${(this.pos.y / window.devicePixelRatio).toFixed(2)}`,
            vel: `${this.vel.x.toFixed(2)}, ${this.vel.y.toFixed(2)}`,
            dist: dist.toFixed(2)
        };
    }
}

// ============================================================================
// Demo 2: Noise
// ============================================================================
class NoiseDemo {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();

        this.frequency = 2;
        this.octaves = 3;
        this.seed = 42;
        this.time = 0;
        this.animate = false;

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    update(dt) {
        if (this.animate) {
            this.time += dt * 0.5;
        }
    }

    draw() {
        const dpr = window.devicePixelRatio;
        this.ctx.clearRect(0, 0, this.width, this.height);

        const imageData = this.ctx.createImageData(this.width / dpr, this.height / dpr);

        for (let y = 0; y < imageData.height; y++) {
            for (let x = 0; x < imageData.width; x++) {
                const nx = x / imageData.width * this.frequency + this.time;
                const ny = y / imageData.height * this.frequency + this.time;

                const noise = Noise.fractal(nx + ny, this.octaves, this.seed);
                const value = Math.floor((noise + 1) * 127.5);

                const idx = (y * imageData.width + x) * 4;
                imageData.data[idx] = value;
                imageData.data[idx + 1] = value;
                imageData.data[idx + 2] = value;
                imageData.data[idx + 3] = 255;
            }
        }

        this.ctx.putImageData(imageData, 0, 0);
    }
}

// ============================================================================
// Demo 3: XXHash Distribution
// ============================================================================
class HashDemo {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();

        this.count = 500;
        this.seed = 123;
        this.mode = 'circle'; // 'circle', 'disk', 'sphere'
        this.points = [];

        this.regenerate();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    regenerate() {
        const hash = new XXHash(this.seed);
        this.points = [];

        for (let i = 0; i < this.count; i++) {
            let p;
            if (this.mode === 'circle') {
                p = hash.onCircle(i);
            } else if (this.mode === 'disk') {
                p = hash.inCircle(i);
            } else {
                const p3d = hash.inSphere(i);
                // Project 3D to 2D
                p = {x: p3d.x, y: p3d.y, z: p3d.z};
            }
            this.points.push(p);
        }
    }

    draw() {
        const dpr = window.devicePixelRatio;
        this.ctx.clearRect(0, 0, this.width, this.height);

        const cx = this.width / dpr / 2;
        const cy = this.height / dpr / 2;
        const radius = Math.min(cx, cy) * 0.8;

        // Draw circle outline
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw points
        for (const p of this.points) {
            let alpha = 0.6;
            let size = 3;

            if (this.mode === 'sphere') {
                // Size based on z-depth
                alpha = 0.3 + (p.z + 1) * 0.35;
                size = 2 + (p.z + 1) * 2;
            }

            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(
                cx + p.x * radius,
                cy + p.y * radius,
                size,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
    }
}

// ============================================================================
// Demo 4: Rotation & Motion
// ============================================================================
class RotationDemo {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();

        this.objects = [];
        this.objectCount = 20;
        this.motionSpeed = 1;
        this.smoothing = 5;
        this.time = 0;

        this.lastTime = performance.now();
        this.fps = 60;

        this.init();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    init() {
        const hash = new XXHash(999);
        this.objects = [];

        for (let i = 0; i < this.objectCount; i++) {
            const color = `hsl(${hash.float(i * 3, 0, 360)}, 70%, 60%)`;
            this.objects.push({
                id: i,
                pos: {x: this.width / 2, y: this.height / 2},
                vel: {x: 0, y: 0},
                target: {x: 0, y: 0},
                angle: 0,
                color: color,
                size: 8 + hash.float(i * 7, 0, 8)
            });
        }
    }

    update(dt) {
        this.time += dt * this.motionSpeed;

        // Calculate FPS
        const now = performance.now();
        const frameDt = (now - this.lastTime) / 1000;
        this.fps = Math.round(1 / frameDt);
        this.lastTime = now;

        const dpr = window.devicePixelRatio;
        const cx = this.width / dpr / 2;
        const cy = this.height / dpr / 2;
        const radius = Math.min(cx, cy) * 0.7;

        for (const obj of this.objects) {
            // Generate target from noise
            const offset = obj.id * 100;
            const noise = Noise.fractal2D(
                this.time + offset,
                this.time + offset + 50,
                3,
                obj.id
            );

            obj.target = {
                x: (cx + noise.x * radius) * dpr,
                y: (cy + noise.y * radius) * dpr
            };

            // Smooth movement
            const state = CdsTween.step2D(
                {pos: obj.pos, vel: obj.vel},
                obj.target,
                this.smoothing,
                dt
            );
            obj.pos = state.pos;
            obj.vel = state.vel;

            // Rotation based on velocity
            obj.angle = Math.atan2(obj.vel.y, obj.vel.x);
        }
    }

    draw() {
        const dpr = window.devicePixelRatio;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw objects
        for (const obj of this.objects) {
            const x = obj.pos.x / dpr;
            const y = obj.pos.y / dpr;

            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(obj.angle);

            // Draw arrow shape
            this.ctx.fillStyle = obj.color;
            this.ctx.beginPath();
            this.ctx.moveTo(obj.size, 0);
            this.ctx.lineTo(-obj.size, obj.size / 2);
            this.ctx.lineTo(-obj.size, -obj.size / 2);
            this.ctx.closePath();
            this.ctx.fill();

            // Glow effect
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = obj.color;
            this.ctx.fill();

            this.ctx.restore();
        }
    }

    reset() {
        this.time = 0;
        this.init();
    }
}

// ============================================================================
// Initialize Demos
// ============================================================================
let tweenDemo, noiseDemo, hashDemo, rotationDemo;

function init() {
    // Tween Demo
    tweenDemo = new TweenDemo(document.getElementById('tweenCanvas'));

    document.getElementById('tweenSpeedSlider').addEventListener('input', (e) => {
        tweenDemo.speed = parseFloat(e.target.value);
        document.getElementById('tweenSpeed').textContent = tweenDemo.speed.toFixed(1);
    });

    document.getElementById('tweenExpBtn').addEventListener('click', (e) => {
        tweenDemo.mode = 'exp';
        document.getElementById('tweenExpBtn').classList.add('active');
        document.getElementById('tweenCdsBtn').classList.remove('active');
    });

    document.getElementById('tweenCdsBtn').addEventListener('click', (e) => {
        tweenDemo.mode = 'cds';
        document.getElementById('tweenCdsBtn').classList.add('active');
        document.getElementById('tweenExpBtn').classList.remove('active');
    });

    document.getElementById('tweenResetBtn').addEventListener('click', () => {
        tweenDemo.randomTarget();
    });

    // Noise Demo
    noiseDemo = new NoiseDemo(document.getElementById('noiseCanvas'));

    document.getElementById('noiseFreqSlider').addEventListener('input', (e) => {
        noiseDemo.frequency = parseFloat(e.target.value);
        document.getElementById('noiseFreq').textContent = noiseDemo.frequency.toFixed(1);
    });

    document.getElementById('noiseOctSlider').addEventListener('input', (e) => {
        noiseDemo.octaves = parseInt(e.target.value);
        document.getElementById('noiseOct').textContent = noiseDemo.octaves;
    });

    document.getElementById('noiseSeedSlider').addEventListener('input', (e) => {
        noiseDemo.seed = parseInt(e.target.value);
        document.getElementById('noiseSeed').textContent = noiseDemo.seed;
    });

    document.getElementById('noiseAnimateBtn').addEventListener('click', (e) => {
        noiseDemo.animate = !noiseDemo.animate;
        e.target.textContent = noiseDemo.animate ? 'Stop' : 'Animate';
        e.target.classList.toggle('active');
    });

    // Hash Demo
    hashDemo = new HashDemo(document.getElementById('hashCanvas'));

    document.getElementById('hashCountSlider').addEventListener('input', (e) => {
        hashDemo.count = parseInt(e.target.value);
        document.getElementById('hashCount').textContent = hashDemo.count;
        hashDemo.regenerate();
    });

    document.getElementById('hashSeedSlider').addEventListener('input', (e) => {
        hashDemo.seed = parseInt(e.target.value);
        document.getElementById('hashSeed').textContent = hashDemo.seed;
        hashDemo.regenerate();
    });

    document.getElementById('hashCircleBtn').addEventListener('click', (e) => {
        hashDemo.mode = 'circle';
        hashDemo.regenerate();
        document.querySelectorAll('#hashCanvas ~ .controls button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
    });

    document.getElementById('hashDiskBtn').addEventListener('click', (e) => {
        hashDemo.mode = 'disk';
        hashDemo.regenerate();
        document.querySelectorAll('#hashCanvas ~ .controls button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
    });

    document.getElementById('hashSphereBtn').addEventListener('click', (e) => {
        hashDemo.mode = 'sphere';
        hashDemo.regenerate();
        document.querySelectorAll('#hashCanvas ~ .controls button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
    });

    // Rotation Demo
    rotationDemo = new RotationDemo(document.getElementById('rotationCanvas'));

    document.getElementById('motionSpeedSlider').addEventListener('input', (e) => {
        rotationDemo.motionSpeed = parseFloat(e.target.value);
        document.getElementById('motionSpeed').textContent = rotationDemo.motionSpeed.toFixed(1);
    });

    document.getElementById('rotationSmoothSlider').addEventListener('input', (e) => {
        rotationDemo.smoothing = parseFloat(e.target.value);
        document.getElementById('rotationSmooth').textContent = rotationDemo.smoothing.toFixed(1);
    });

    document.getElementById('rotationResetBtn').addEventListener('click', () => {
        rotationDemo.reset();
    });

    // Start animation loop
    animate();
}

// Animation loop
let lastTime = performance.now();
function animate() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Update and draw all demos
    tweenDemo.update(dt);
    tweenDemo.draw();

    const stats = tweenDemo.getStats();
    document.getElementById('tweenPos').textContent = stats.pos;
    document.getElementById('tweenVel').textContent = stats.vel;
    document.getElementById('tweenDist').textContent = stats.dist;

    noiseDemo.update(dt);
    noiseDemo.draw();

    hashDemo.draw();

    rotationDemo.update(dt);
    rotationDemo.draw();

    document.getElementById('rotationCount').textContent = rotationDemo.objectCount;
    document.getElementById('rotationFps').textContent = rotationDemo.fps;

    requestAnimationFrame(animate);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
