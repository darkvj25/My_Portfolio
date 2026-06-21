
class ThreeDModel {
  constructor(containerId, modelPath, config = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.modelPath = modelPath;
    this.config = {
      autoRotate: true,
      autoRotateSpeed: 2.0,
      enableControls: true,
      scale: 14.0,
      yOffset: 0,
      yRotation: 0,
      cameraZ: 10,
      loopAnimations: true,
      onFinished: null,
      ...config
    };

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, logarithmicDepthBuffer: true });
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Controls
    if (this.config.enableControls && typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.enableZoom = false;
      this.controls.autoRotate = this.config.autoRotate;
      this.controls.autoRotateSpeed = this.config.autoRotateSpeed;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x6366f1, 2, 10);
    pointLight.position.set(-2, 2, 2);
    this.scene.add(pointLight);

    this.camera.position.z = this.config.cameraZ;

    this.loadModel();
    this.animate();

    this.resizeHandler = () => this.onWindowResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  loadModel() {
    const isFBX = this.modelPath.toLowerCase().endsWith('.fbx');
    const loader = isFBX ? new THREE.FBXLoader() : new THREE.GLTFLoader();

    loader.load(this.modelPath, (result) => {
      const object = isFBX ? result : result.scene;

      // Reset transform
      object.position.set(0, 0, 0);
      object.scale.set(1, 1, 1);
      object.rotation.set(0, this.config.yRotation, 0);

      // 1. Calculate size and scale
      let box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = this.config.scale / maxDim;
      object.scale.set(scale, scale, scale);

      // 2. Recalculate box after scaling to get accurate center
      object.updateMatrixWorld(true);
      box.setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());

      // 3. Center the model exactly
      object.position.x = -center.x;
      object.position.y = -center.y + this.config.yOffset;
      object.position.z = -center.z;

      this.model = object;
      this.scene.add(object);

      // Handle Animations
      if (result.animations && result.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(object);
        result.animations.forEach(clip => {
          const action = this.mixer.clipAction(clip);
          if (!this.config.loopAnimations) {
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
          }
          action.play();
        });

        if (this.config.onFinished) {
          this.mixer.addEventListener('finished', () => {
            this.config.onFinished();
          });
        }
      }

      // Update controls target to the new center
      if (this.controls) {
        this.controls.target.set(0, 0, 0);
      }
    },
    (xhr) => {
      // Progress
    },
    (error) => {
      console.error('An error happened while loading the 3D model:', error);
    });
  }

  onWindowResize() {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  animate() {
    this.rafId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    if (this.mixer) {
      this.mixer.update(delta);
    }

    if (this.controls) {
      this.controls.update();
    }

    if (!this.controls && this.model) {
      this.model.rotation.y += 0.01;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
    }
    window.removeEventListener('resize', this.resizeHandler);
  }
}


class LiveWallpaper {
  constructor({ reduceMotion = false } = {}) {
    this.canvas = document.getElementById('live-wallpaper-canvas');
    this.root = document.getElementById('live-wallpaper');
    if (!this.canvas || !this.root) return;

    this.ctx = this.canvas.getContext('2d');
    this.reduceMotion = reduceMotion;
    this.particles = [];
    this.mouse = { x: null, y: null, active: false };
    this.rafId = null;
    this.themeObserver = null;

    this.resize = this.resize.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);
    this.tick = this.tick.bind(this);

    this.resize();
    this.initParticles();
    this.bindEvents();
    this.applyTheme();
    // Delay start if loader is present
    if (!document.body.classList.contains('is-intro-loading')) {
      this.tick();
    }
  }

  start() {
    if (this.rafId) return;
    this.tick();
  }

  getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  getPalette() {
    const dark = this.getTheme() === 'dark';
    return dark
      ? {
          particle: 'rgba(65, 242, 255, 0.85)',
          particleDim: 'rgba(167, 139, 250, 0.55)',
          line: 'rgba(65, 242, 255, 0.14)',
          lineBright: 'rgba(167, 139, 250, 0.22)',
          glow: 'rgba(65, 242, 255, 0.35)',
          lineAlpha: 0.9,
          glowBlur: 8,
        }
      : {
          particle: 'rgba(79, 70, 229, 0.95)',
          particleDim: 'rgba(124, 58, 237, 0.8)',
          line: 'rgba(99, 102, 241, 0.22)',
          lineBright: 'rgba(139, 92, 246, 0.32)',
          glow: 'rgba(99, 102, 241, 0.45)',
          lineAlpha: 0.95,
          glowBlur: 10,
        };
  }

  initParticles() {
    const isMobile = window.innerWidth < 768;
    const area = this.width * this.height;
    const density = this.reduceMotion ? 0.000015 : (isMobile ? 0.00003 : 0.000055);
    const count = Math.min(isMobile ? 60 : 140, Math.max(isMobile ? 20 : 35, Math.floor(area * density)));

    this.particles = Array.from({ length: count }, () => this.createParticle(true));
  }

  createParticle(randomPos = false) {
    const isMobile = window.innerWidth < 768;
    return {
      x: randomPos ? Math.random() * this.width : Math.random() * this.width,
      y: randomPos ? Math.random() * this.height : Math.random() * this.height,
      vx: (Math.random() - 0.5) * (this.reduceMotion ? 0.1 : (isMobile ? 0.25 : 0.45)),
      vy: (Math.random() - 0.5) * (this.reduceMotion ? 0.1 : (isMobile ? 0.25 : 0.45)),
      radius: isMobile ? (Math.random() * 1.2 + 0.6) : (Math.random() * 1.6 + 0.8),
      pulse: Math.random() * Math.PI * 2,
      hue: Math.random() > 0.5 ? 'cyan' : 'violet',
    };
  }

  resize() {
    const isMobile = window.innerWidth < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.particles.length) this.initParticles();
  }

  bindEvents() {
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerleave', this.onPointerLeave);

    this.themeObserver = new MutationObserver(() => this.applyTheme());
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  applyTheme() {
    this.root.dataset.theme = this.getTheme();
  }

  onPointerMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
    this.mouse.active = true;
  }

  onPointerLeave() {
    this.mouse.active = false;
    this.mouse.x = null;
    this.mouse.y = null;
  }

  tick() {
    this.draw();
    if (!this.reduceMotion) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  draw() {
    const { ctx, width, height } = this;
    const palette = this.getPalette();
    const isMobile = width < 768;

    ctx.clearRect(0, 0, width, height);

    const linkDist = isMobile ? 80 : 140;
    const mouseRadius = isMobile ? 100 : 160;

    // Optimization: Draw lines first to avoid changing globalAlpha too often
    ctx.lineWidth = 0.7;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!this.reduceMotion) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        if (this.mouse.active && this.mouse.x != null) {
          const dx = this.mouse.x - p.x;
          const dy = this.mouse.y - p.y;
          const dist = dx * dx + dy * dy; // Use squared distance for optimization
          const rSq = mouseRadius * mouseRadius;
          if (dist < rSq && dist > 0) {
            const d = Math.sqrt(dist);
            const force = (mouseRadius - d) / mouseRadius;
            p.x -= (dx / d) * force * 1.8;
            p.y -= (dy / d) * force * 1.8;
          }
        }
      }

      // $O(N^2)$ but optimized distance check
      for (let j = i + 1; j < this.particles.length; j++) {
        const other = this.particles[j];
        const dx = p.x - other.x;
        const dy = p.y - other.y;
        const distSq = dx * dx + dy * dy;
        const linkDistSq = linkDist * linkDist;

        if (distSq < linkDistSq) {
          const dist = Math.sqrt(distSq);
          const alpha = 1 - dist / linkDist;
          ctx.beginPath();
          ctx.strokeStyle = alpha > 0.6 ? palette.lineBright : palette.line;
          ctx.globalAlpha = alpha * palette.lineAlpha;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    for (const p of this.particles) {
      const glow = Math.sin(p.pulse) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.fillStyle = p.hue === 'cyan' ? palette.particle : palette.particleDim;

      // ShadowBlur is very expensive on mobile
      if (!isMobile) {
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = this.reduceMotion ? 0 : 4 + glow * palette.glowBlur;
      }

      ctx.arc(p.x, p.y, p.radius + glow * 0.4, 0, Math.PI * 2);
      ctx.fill();

      if (!isMobile) {
        ctx.shadowBlur = 0;
      }
    }
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerleave', this.onPointerLeave);
    this.themeObserver?.disconnect();
  }
}

class IntroLoader {
  constructor({ reduceMotion = false } = {}) {
    this.reduceMotion = reduceMotion;
    this.loader = document.getElementById('loader');
    this.bar = document.getElementById('loader-bar');
    this.glitchBar = document.getElementById('loader-glitch-bar');
    this.statusEl = document.getElementById('loader-status');
    this.percentageEl = document.getElementById('loader-percentage');
    this.modulesEl = document.getElementById('loader-modules');
    this.parallaxEl = document.getElementById('loader-parallax');
    this.loaderBg = document.getElementById('loader-bg');
    this.scanSweep = document.querySelector('.loader-scan-sweep');
    this.barContainer = document.querySelector('.loader-bar-container');
    this.accessGranted = document.getElementById('loader-access-granted');
    this.particlesCanvas = document.getElementById('loader-particles');
    this.hero = document.querySelector('[data-intro-hero]');
    this.audioGate = document.getElementById('loader-audio-gate');

    this.robotModel = new ThreeDModel('loader-robot-container', 'glb/robot.glb', {
      enableControls: false,
      scale: 12.0,
      yRotation: -Math.PI / 2, // Rotate 90 degrees to face forward
      autoRotate: false,
      loopAnimations: false,
      onFinished: () => {
        this.animationFinished = true;
        this.checkReadyToEnter();
      }
    });

    this.soundEnabled = true;
    this.introStarted = false;
    this.audioUnlocked = false;
    this.soundQueue = [];
    this.audioCtx = null;
    this.matrixMode = false;
    this.typeTimer = null;
    this.scrambleTimer = null;
    this.progress = 0;
    this.displayProgress = 0;
    this.milestonesHit = new Set();
    this.verifying = false;
    this.finished = false;
    this.animationFinished = false; // New flag
    this.particleRaf = null;
    this.particles = [];

    this.statuses = [
      'INITIALIZING SYSTEM...',
      'LOADING ASSETS...',
      'COMPILING SCRIPTS...',
      'READYING PORTFOLIO...',
      'OPTIMIZING INTERFACE...',
      'SYSTEM READY'
    ];

    this.modules = [
      { name: 'core.styles', at: 6 },
      { name: 'hero.layout', at: 14 },
      { name: 'workspace.png', at: 22 },
      { name: 'prof.jpg', at: 30 },
      { name: 'projects.grid', at: 42 },
      { name: 'skills.data', at: 54 },
      { name: 'contact.form', at: 66 },
      { name: 'animations.lib', at: 78 },
      { name: 'interface.hud', at: 88 },
    ];

    this.preloadUrls = [
      'workspace.png',
      'prof.jpg',
      'pension_grid.png',
      'pension_login.png',
    ];

    this.konami = [];
    this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  }

  start() {
    if (!this.loader) return;

    document.body.classList.add('is-intro-loading');
    this.setupAudioGate();
    this.setupEasterEggs();

    if (!this.reduceMotion) {
      this.initParticles();
      this.setupParallax();
    }

    this.typeStatus(this.statuses[0]);
    this.playZoom('boot');

    if (navigator.userActivation?.isActive) {
      this.enableAudio();
    }

    if (this.reduceMotion) {
      this.runReducedMotion();
      return;
    }

    this.runFullIntro();
  }

  setupAudioGate() {
    const enable = () => this.enableAudio();

    this.audioGate?.addEventListener('click', (e) => {
      e.preventDefault();
      enable();
    });

    this.audioGate?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') enable();
    });
  }

  async enableAudio() {
    if (this.introStarted) {
      this.skipToEnd();
      return;
    }
    this.introStarted = true;

    this.audioGate?.classList.add('is-dismissed');

    // Allow clicking anywhere on the loader to skip once it has started
    this.loader?.addEventListener('click', (e) => {
      if (e.target.closest('.loader-audio-gate')) return;
      this.skipToEnd();
    });

    await this.unlockAudio();
  }

  skipToEnd() {
    if (this.finished) return;

    // Fast-forward progress
    this.progress = 100;
    this.animationFinished = true;
    this.setProgress(100);

    // Trigger the exit sequence
    this.playCrackSequence();
  }

  async unlockAudio() {
    if (this.audioUnlocked) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const g = this.audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      osc.connect(g);
      g.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.02);
      this.audioUnlocked = this.audioCtx.state === 'running';
      if (this.audioUnlocked) {
        const queue = [...this.soundQueue];
        this.soundQueue = [];
        queue.forEach((type) => this.playZoom(type, true));
      }
    } catch {
      /* blocked until gesture */
    }
  }

  getAudioCtx() {
    if (!this.soundEnabled) return null;
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioCtx;
  }

  playZoom(type, fromQueue = false) {
    if (!this.soundEnabled) return;

    if (!this.audioUnlocked) {
      if (!fromQueue) this.soundQueue.push(type);
      return;
    }

    const ctx = this.getAudioCtx();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const presets = {
      boot: { duration: 0.55, gain: 0.22, startFreq: 120, endFreq: 2200, curve: 'in' },
      tick: { duration: 0.28, gain: 0.14, startFreq: 280, endFreq: 1400, curve: 'in' },
      milestone: { duration: 0.38, gain: 0.18, startFreq: 200, endFreq: 2800, curve: 'in' },
      verify: { duration: 0.5, gain: 0.16, startFreq: 400, endFreq: 3200, curve: 'in' },
      crack: { duration: 0.45, gain: 0.24, startFreq: 1800, endFreq: 80, curve: 'out' },
      exit: { duration: 1.05, gain: 0.32, startFreq: 2400, endFreq: 60, curve: 'out' },
    };
    const p = presets[type] || presets.tick;
    const duration = p.duration;

    const bufferSize = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const env = Math.sin(Math.PI * t) * (1 - t * 0.15);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (p.curve === 'in') {
      filter.frequency.setValueAtTime(p.startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(p.endFreq, 40), now + duration * 0.92);
    } else {
      filter.frequency.setValueAtTime(p.startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(p.endFreq, 40), now + duration);
    }

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration + 0.05);
  }

  setupEasterEggs() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.konami.push(key);
      if (this.konami.length > this.konamiCode.length) this.konami.shift();
      if (this.konami.join(',') === this.konamiCode.join(',')) {
        this.matrixMode = true;
        this.loader?.classList.add('loader--matrix');
        const mem = document.getElementById('loader-hud-mem');
        if (mem) mem.textContent = 'MODE: MATRIX';
        this.typeStatus('BREACH PROTOCOL ACTIVE...');
      }
    });

    let rapidKeys = 0;
    let rapidTimer;
    document.addEventListener('keydown', () => {
      if (this.finished) return;
      rapidKeys += 1;
      clearTimeout(rapidTimer);
      rapidTimer = setTimeout(() => { rapidKeys = 0; }, 400);
      if (rapidKeys >= 6) {
        rapidKeys = 0;
        this.triggerScanSweep();
        this.playZoom('milestone');
      }
    });
  }

  setupParallax() {
    this.loader?.addEventListener('pointermove', (e) => {
      if (!this.parallaxEl) return;
      const rect = this.loader.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      this.parallaxEl.style.transform = `translate(${x * 14}px, ${y * 10}px)`;
    });
    this.loader?.addEventListener('pointerleave', () => {
      if (this.parallaxEl) this.parallaxEl.style.transform = '';
    });
  }

  initParticles() {
    if (!this.particlesCanvas) return;
    const ctx = this.particlesCanvas.getContext('2d');
    const isMobile = window.innerWidth < 768;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      this.particlesCanvas.width = window.innerWidth * dpr;
      this.particlesCanvas.height = window.innerHeight * dpr;
      this.particlesCanvas.style.width = `${window.innerWidth}px`;
      this.particlesCanvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.pw = window.innerWidth;
      this.ph = window.innerHeight;
      if (!this.particles.length) {
        const n = isMobile ? 25 : 40;
        this.particles = Array.from({ length: n }, () => ({
          x: Math.random() * this.pw,
          y: Math.random() * this.ph,
          vx: (Math.random() - 0.5) * (isMobile ? 0.25 : 0.35),
          vy: (Math.random() - 0.5) * (isMobile ? 0.25 : 0.35),
          r: Math.random() * (isMobile ? 1.2 : 1.5) + 0.5,
          a: Math.random() * 0.5 + 0.2,
        }));
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const matrixCols = [];
    const initMatrix = () => {
      matrixCols.length = 0;
      const step = 18;
      for (let x = 0; x < this.pw; x += step) {
        matrixCols.push({ x, y: Math.random() * this.ph, speed: 2 + Math.random() * 4 });
      }
    };

    const tick = () => {
      if (this.finished || !this.loader || this.loader.classList.contains('loaded')) {
        return;
      }
      ctx.clearRect(0, 0, this.pw, this.ph);

      if (this.matrixMode) {
        if (!matrixCols.length) initMatrix();
        ctx.font = '12px monospace';
        matrixCols.forEach((col) => {
          col.y += col.speed;
          if (col.y > this.ph) col.y = -20;
          const ch = String.fromCharCode(0x30a0 + Math.random() * 96);
          ctx.fillStyle = `rgba(0,255,100,${0.15 + Math.random() * 0.35})`;
          ctx.fillText(ch, col.x, col.y);
        });
      } else {
        const color = 'rgba(99,102,241,';
        this.particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = this.pw;
          if (p.x > this.pw) p.x = 0;
          if (p.y < 0) p.y = this.ph;
          if (p.y > this.ph) p.y = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `${color}${p.a})`;
          ctx.fill();
        });
      }

      this.particleRaf = requestAnimationFrame(tick);
    };
    tick();
  }

  typeStatus(text) {
    if (!this.statusEl) return;
    clearTimeout(this.typeTimer);
    this.statusEl.textContent = '';
    let i = 0;
    const type = () => {
      if (i <= text.length) {
        this.statusEl.textContent = text.slice(0, i);
        i += 1;
        this.typeTimer = setTimeout(type, 28);
      }
    };
    type();
  }

  scrambleTo(target) {
    if (!this.percentageEl) return;
    clearInterval(this.scrambleTimer);
    this.percentageEl.classList.add('is-scrambling');
    const chars = '0123456789%';
    let frames = 0;
    this.scrambleTimer = setInterval(() => {
      frames += 1;
      if (frames > 6) {
        clearInterval(this.scrambleTimer);
        this.percentageEl.textContent = `${target}%`;
        this.percentageEl.classList.remove('is-scrambling');
        return;
      }
      let s = '';
      for (let j = 0; j < 3; j++) s += chars[Math.floor(Math.random() * chars.length)];
      this.percentageEl.textContent = s;
    }, 40);
  }

  triggerScanSweep() {
    if (!this.scanSweep) return;
    this.scanSweep.classList.remove('is-sweeping');
    void this.scanSweep.offsetWidth;
    this.scanSweep.classList.add('is-sweeping');
    setTimeout(() => this.scanSweep?.classList.remove('is-sweeping'), 1200);
  }

  updateModules(progress) {
    if (!this.modulesEl) return;
    this.modules.forEach((mod) => {
      const existing = this.modulesEl.querySelector(`[data-module="${mod.name}"]`);
      if (progress >= mod.at && !existing) {
        const li = document.createElement('li');
        li.dataset.module = mod.name;
        li.className = 'is-load';
        li.textContent = `${mod.name} …`;
        this.modulesEl.appendChild(li);
        if (this.modulesEl.children.length > 4) {
          this.modulesEl.removeChild(this.modulesEl.firstChild);
        }
      }
      if (progress >= mod.at + 8 && existing && existing.classList.contains('is-load')) {
        existing.className = 'is-ok';
        existing.textContent = `${mod.name} … OK`;
      }
    });
  }

  setProgress(value) {
    const next = Math.floor(value);
    if (this.loaderBg) {
      this.loaderBg.style.setProperty('--loader-grid-opacity', (value / 100).toFixed(2));
    }
    if (this.loader) {
      this.loader.style.setProperty('--loader-chroma', (value / 100).toFixed(2));
    }
    if (this.bar) this.bar.style.width = `${value}%`;
    if (this.glitchBar) {
      this.glitchBar.style.width = `${value}%`;
      this.glitchBar.classList.toggle('is-active', value > 5 && value < 100);
    }
    if (next !== this.displayProgress) {
      this.displayProgress = next;
      this.scrambleTo(next);
    }

    [25, 50, 75].forEach((m) => {
      if (value >= m && !this.milestonesHit.has(m)) {
        this.milestonesHit.add(m);
        this.barContainer?.classList.add('milestone-pop');
        setTimeout(() => this.barContainer?.classList.remove('milestone-pop'), 400);
        this.triggerScanSweep();
        this.playZoom('milestone');
      }
    });

    const statusIndex = Math.min(
      this.statuses.length - 1,
      Math.floor((value / 100) * (this.statuses.length - 1))
    );
    const nextStatus = this.matrixMode && value > 80
      ? 'MATRIX LINK ESTABLISHED...'
      : this.statuses[statusIndex];
    if (this.statusEl && this.statusEl.textContent !== nextStatus && !this.verifying) {
      this.typeStatus(nextStatus);
    }

    this.updateModules(value);

  }

  preloadAssets() {
    const fontReady = document.fonts?.ready ?? Promise.resolve();
    const images = this.preloadUrls.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve(src);
          img.src = src;
        })
    );
    return Promise.all([fontReady, ...images]);
  }

  runReducedMotion() {
    this.preloadAssets().then(() => {
      this.setProgress(100);
      if (this.statusEl) this.statusEl.textContent = this.statuses[this.statuses.length - 1];
      this.playZoom('exit');
      setTimeout(() => this.dismissLoader(false), 280);
    });
  }

  async runFullIntro() {
    let assetPct = 0;
    const assetPromise = this.preloadAssets();

    const assetRamp = setInterval(() => {
      if (assetPct < 68) assetPct = Math.min(68, assetPct + 1.8);
      this.progress = assetPct;
      if (!this.verifying && !this.finished) this.setProgress(assetPct);
    }, 60);

    await assetPromise;
    clearInterval(assetRamp);
    assetPct = 68;
    this.progress = 68;
    this.setProgress(68);

    const mainLoop = setInterval(() => {
      if (this.finished || this.verifying) return;

      this.progress = Math.min(97, this.progress + 0.6 + Math.random() * 1.4);
      this.setProgress(this.progress);

      if (this.progress >= 97) {
        clearInterval(mainLoop);
        this.verifying = true;
        this.typeStatus('VERIFYING INTEGRITY...');
        this.playZoom('verify');

        setTimeout(() => {
          this.progress = 100;
          this.setProgress(100);
          this.typeStatus(this.statuses[this.statuses.length - 1]);
          this.checkReadyToEnter();
        }, 900);
      }
    }, 55);
  }

  checkReadyToEnter() {
    // Only enter if progress is 100% AND the robot animation is done
    if (this.progress >= 100 && this.animationFinished && !this.finished) {
      setTimeout(() => this.playCrackSequence(), 450);
    } else if (this.progress >= 100 && !this.animationFinished) {
      // Optional: keep the user informed if assets are ready but animation is still playing
      if (this.statusEl) this.statusEl.textContent = "SYNCHRONIZING ANIMATION...";
    }
  }

  playCrackSequence() {
    if (this.finished) return;
    this.finished = true;
    if (this.particleRaf) cancelAnimationFrame(this.particleRaf);

    this.typeStatus('SYSTEM BREACH');
    this.playZoom('crack');

    this.loader?.classList.add('crack-heal');
    setTimeout(() => {
      this.loader?.classList.remove('crack-heal');
      this.loader?.classList.add('cracking');
      this.accessGranted?.classList.add('is-visible');

      setTimeout(() => {
        this.playZoom('exit');
        this.loader?.classList.add('zoom-through');
        this.hero?.classList.add('hero--intro-reveal');

        // Start live wallpaper here to save resources during loading
        if (window.app?.liveWallpaper) {
          window.app.liveWallpaper.start();
        }

        document.body.classList.add('intro-hud-handoff');
        setTimeout(() => document.body.classList.remove('intro-hud-handoff'), 1200);
      }, 750);

      setTimeout(() => this.dismissLoader(true), 1650);
    }, 220);
  }

  dismissLoader(animated) {
    this.robotModel?.destroy();
    document.body.classList.remove('is-intro-loading');
    this.loader?.classList.remove('cracking', 'crack-heal', 'zoom-through');
    this.loader?.classList.add('loaded');
    this.accessGranted?.classList.remove('is-visible');
    clearInterval(this.scrambleTimer);
    clearTimeout(this.typeTimer);

    setTimeout(() => {
      if (typeof AOS !== 'undefined') AOS.refresh();
    }, 600);

    setTimeout(() => {
      this.hero?.classList.remove('hero--intro-reveal');
    }, animated ? 2000 : 0);
  }

}

class PortfolioApp {
  constructor() {
    this.navbar = document.getElementById('navbar');
    this.hamburger = document.getElementById('hamburger');
    this.navMenu = document.getElementById('nav-menu');
    this.themeToggle = document.getElementById('theme-toggle');
    this.contactForm = document.getElementById('contact-form');
    
    this.currentTheme = localStorage.getItem('theme') || 'light';

    this.reduceMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduceMotion = this.reduceMotionMql.matches;
    
    this.init();
  }

  init() {
    this.setupReducedMotion();
    this.setupPageEntrance();
    this.setupEventListeners();
    this.setupTheme();
    this.setupScrollAnimations();
    this.setupSkillBars();
    this.setupFormValidation();
    this.setupSmoothScrolling();
    this.initAOS();
    this.setupParallax();
    this.setupTiltEffect();
    this.setupMagneticEffect();
    this.setupCustomCursor();
    this.setupLightbox();
    this.setupNavReticle();
    this.setupLiveWallpaper();
    this.setupThreeDModel();
  }

  setupReducedMotion() {
    const apply = () => {
      this.reduceMotion = this.reduceMotionMql.matches;
      document.documentElement.toggleAttribute('data-reduce-motion', this.reduceMotion);
    };
    apply();
    this.reduceMotionMql.addEventListener?.('change', apply);
  }

  setupPageEntrance() {
    this.introLoader = new IntroLoader({ reduceMotion: this.reduceMotion });
    this.introLoader.start();
  }

  setupEventListeners() {
    // Scroll event for navbar
    window.addEventListener('scroll', this.handleScroll.bind(this));
    
    // Mobile menu toggle
    this.hamburger?.addEventListener('click', this.toggleMobileMenu.bind(this));
    
    // Theme toggle
    this.themeToggle?.addEventListener('click', this.toggleTheme.bind(this));
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', this.handleNavClick.bind(this));
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.navMenu?.contains(e.target) && !this.hamburger?.contains(e.target)) {
        this.closeMobileMenu();
      }
    });
    
    // Form submission
    this.contactForm?.addEventListener('submit', this.handleFormSubmit.bind(this));
    
    // Intersection Observer for nav link highlighting
    this.setupIntersectionObserver();
    
    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  handleScroll() {
    const scrolled = window.scrollY > 50;
    this.navbar?.classList.toggle('scrolled', scrolled);
    
    // Update scroll progress
    this.updateScrollProgress();
  }

  updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) : 0;
    document.documentElement.style.setProperty('--scroll-progress', String(Math.max(0, Math.min(1, progress))));
  }

  toggleMobileMenu() {
    this.hamburger?.classList.toggle('active');
    this.navMenu?.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = this.navMenu?.classList.contains('active') ? 'hidden' : '';
  }

  closeMobileMenu() {
    this.hamburger?.classList.remove('active');
    this.navMenu?.classList.remove('active');
    document.body.style.overflow = '';
  }

  handleNavClick(e) {
    const href = e.target.getAttribute('href');
    
    if (href?.startsWith('#')) {
      e.preventDefault();
      const targetId = href.slice(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        const offsetTop = targetElement.offsetTop - (this.navbar?.offsetHeight || 0);
        
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
        
        this.closeMobileMenu();
      }
    }
  }

  setupIntersectionObserver() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Remove active class from all nav links
          navLinks.forEach(link => link.classList.remove('active'));
          
          // Add active class to current nav link
          const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
          activeLink?.classList.add('active');
        }
      });
    }, {
      threshold: 0.3,
      rootMargin: '-100px 0px -100px 0px'
    });
    
    sections.forEach(section => observer.observe(section));
  }

  setupTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.updateThemeToggle();
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);
    this.updateThemeToggle();
    
    // Add a subtle animation effect
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
  }

  updateThemeToggle() {
    const sunIcon = this.themeToggle?.querySelector('.fa-sun');
    const moonIcon = this.themeToggle?.querySelector('.fa-moon');
    
    if (this.currentTheme === 'dark') {
      sunIcon?.style.setProperty('opacity', '0.5');
      moonIcon?.style.setProperty('opacity', '1');
    } else {
      sunIcon?.style.setProperty('opacity', '1');
      moonIcon?.style.setProperty('opacity', '0.5');
    }
  }

  setupScrollAnimations() {
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    animateElements.forEach(el => observer.observe(el));
  }

  setupSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const progressBar = entry.target;
          const width = progressBar.getAttribute('data-width');
          
          // Animate the progress bar
          setTimeout(() => {
            progressBar.style.width = width;
          }, 200);
          
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.5
    });
    
    skillBars.forEach(bar => observer.observe(bar));
  }

  setupFormValidation() {
    if (!this.contactForm) return;
    
    const inputs = this.contactForm.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.getAttribute('name');
    let isValid = true;
    let errorMessage = '';
    
    // Remove existing error
    this.clearFieldError(field);
    
    switch (fieldName) {
      case 'name':
        if (value.length < 2) {
          isValid = false;
          errorMessage = 'Name must be at least 2 characters long';
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          isValid = false;
          errorMessage = 'Please enter a valid email address';
        }
        break;
      case 'subject':
        if (value.length < 5) {
          isValid = false;
          errorMessage = 'Subject must be at least 5 characters long';
        }
        break;
      case 'message':
        if (value.length < 10) {
          isValid = false;
          errorMessage = 'Message must be at least 10 characters long';
        }
        break;
    }
    
    if (!isValid) {
      this.showFieldError(field, errorMessage);
    }
    
    return isValid;
  }

  showFieldError(field, message) {
    field.style.borderColor = '#ef4444';
    
    let errorElement = field.parentNode.querySelector('.field-error');
    if (!errorElement) {
      errorElement = document.createElement('span');
      errorElement.className = 'field-error';
      errorElement.style.cssText = `
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: block;
      `;
      field.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
  }

  clearFieldError(field) {
    field.style.borderColor = '';
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(this.contactForm);
    const inputs = this.contactForm.querySelectorAll('input, textarea');
    let isFormValid = true;
    
    // Validate all fields
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isFormValid = false;
      }
    });
    
    if (!isFormValid) {
      this.showNotification('Please fix the errors in the form', 'error');
      return;
    }
    
    // Show loading state
    const submitButton = this.contactForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitButton.disabled = true;
    
    try {
      // Note: Replace with your actual Formspree endpoint
      const response = await fetch(this.contactForm.action, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        this.showNotification('Message sent successfully! I\'ll get back to you soon.', 'success');
        this.contactForm.reset();
        
        // Clear floating labels
        inputs.forEach(input => {
          input.dispatchEvent(new Event('blur'));
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.showNotification('Failed to send message. Please try again or contact me directly.', 'error');
    } finally {
      // Restore button state
      submitButton.innerHTML = originalButtonText;
      submitButton.disabled = false;
    }
  }

  showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 400px;
    `;
    
    notification.querySelector('.notification-content').style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.75rem;
    `;
    
    notification.querySelector('.notification-close').style.cssText = `
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0.25rem;
      margin-left: auto;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    const timeoutId = setTimeout(() => {
      this.removeNotification(notification);
    }, 5000);
    
    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
      clearTimeout(timeoutId);
      this.removeNotification(notification);
    });
  }

  removeNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }

  setupSmoothScrolling() {
    // Add smooth scrolling to all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
          const offsetTop = target.offsetTop - (this.navbar?.offsetHeight || 0);
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  setupCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    const follower = document.querySelector('.cursor-follower');
    const links = document.querySelectorAll('a, button, .theme-toggle, .project-card');

    if (!cursor || !follower) return;
    if (this.reduceMotion) return;

    window.addEventListener('mousemove', (e) => {
      const { clientX: x, clientY: y } = e;

      // Update main cursor immediately
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';

      // Follower with slight lag (handled by CSS transition or RAF)
      follower.style.left = x + 'px';
      follower.style.top = y + 'px';
    });

    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        cursor.classList.add('cursor-hover');
        follower.classList.add('cursor-hover');
      });
      link.addEventListener('mouseleave', () => {
        cursor.classList.remove('cursor-hover');
        follower.classList.remove('cursor-hover');
      });
    });
  }

  setupLightbox() {
    const modal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    const openButtons = document.querySelectorAll('.project-open');

    let currentImages = [];
    let currentIndex = 0;
    let lastFocused = null;

    if (!modal || !lightboxImg) return;

    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');

    const updateLightboxImage = () => {
      lightboxImg.style.opacity = '0';
      setTimeout(() => {
        lightboxImg.src = currentImages[currentIndex];
        lightboxImg.style.opacity = '1';
      }, 200);

      // Show/Hide nav buttons based on image count
      const showNav = currentImages.length > 1;
      prevBtn.style.display = showNav ? 'flex' : 'none';
      nextBtn.style.display = showNav ? 'flex' : 'none';
    };

    const openFromCard = (card) => {
      // Find all images in the card
      const cardImages = Array.from(card.querySelectorAll('img')).map(img => img.src).filter(Boolean);
      if (cardImages.length === 0) return;

      currentImages = cardImages;
      currentIndex = 0;
      updateLightboxImage();

      // Add Title and Description to Lightbox
      const title = card.querySelector('.project-title')?.textContent?.trim() || '';
      const desc = card.querySelector('.project-description')?.textContent?.trim() || '';
      const titleEl = document.getElementById('lightbox-title');
      const descEl = document.getElementById('lightbox-desc');
      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = desc;

      lastFocused = document.activeElement;
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeBtn?.focus?.();
    };

    openButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('.project-card');
        if (!card) return;
        openFromCard(card);
      });
    });

    const nextImage = () => {
      currentIndex = (currentIndex + 1) % currentImages.length;
      updateLightboxImage();
    };

    const prevImage = () => {
      currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
      updateLightboxImage();
    };

    nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });
    prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });

    const closeModal = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      modal.setAttribute('aria-hidden', 'true');
      setTimeout(() => { lightboxImg.src = ''; currentImages = []; }, 300);
      lastFocused?.focus?.();
    };

    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowRight' && currentImages.length > 1) nextImage();
      if (e.key === 'ArrowLeft' && currentImages.length > 1) prevImage();
    });
  }

  setupParallax() {
    if (this.reduceMotion) return;

    const parallaxShapes = Array.from(document.querySelectorAll('.parallax-shape'));
    const heroContent = document.querySelector('.hero-content');
    const outlineTexts = Array.from(document.querySelectorAll('.section-outline-text'));
    const heroSection = document.querySelector('.hero');

    if (!parallaxShapes.length && !heroContent && !outlineTexts.length) return;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const state = { mx: 0, my: 0, ticking: false };

    const requestTick = () => {
      if (state.ticking) return;
      state.ticking = true;
      requestAnimationFrame(update);
    };

    const update = () => {
      state.ticking = false;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const vh = window.innerHeight || 1;

      // Mouse + scroll parallax for background shapes
      for (const shape of parallaxShapes) {
        const speed = parseFloat(shape.getAttribute('data-speed')) || 0.1;
        const tx = clamp(state.mx * speed * 18, -26, 26);
        const ty = clamp(state.my * speed * 18 + scrollY * speed * 0.12, -44, 44);
        shape.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      }

      // Hero panel parallax: small + fades slightly, but clamped
      if (heroContent) {
        const speed = parseFloat(heroContent.getAttribute('data-speed')) || 0.15;
        const ty = clamp(scrollY * speed * 0.2, 0, 40);
        heroContent.style.transform = `translate3d(0, ${ty}px, 0)`;
        heroContent.style.opacity = String(clamp(1 - (scrollY / 900), 0.65, 1));
      }

      // Outline texts: gentle horizontal drift while visible
      outlineTexts.forEach((text, index) => {
        const parent = text.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        if (rect.top < vh && rect.bottom > 0) {
          const direction = index % 2 === 0 ? 1 : -1;
          const progress = (vh - rect.top) / vh; // 0..~2
          const moveX = clamp((progress - 0.5) * 42, -40, 40) * direction;
          text.style.transform = `translate(calc(-50% + ${moveX}px), -50%) skewX(${moveX * 0.06}deg)`;
        }
      });
    };

    const onMouseMove = (e) => {
      // normalize to [-1..1]
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      state.mx = clamp(x, -1, 1);
      state.my = clamp(y, -1, 1);
      requestTick();
    };

    const onScroll = () => requestTick();
    const onResize = () => requestTick();

    heroSection?.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    requestTick();
  }

  setupTiltEffect() {
    if (this.reduceMotion) return;
    // 1. Special Handling for Hero Card (uses container for max stability)
    const heroContainer = document.querySelector('.hero-visual');
    const heroCard = document.querySelector('.floating-card');

    if (heroContainer && heroCard) {
      heroContainer.addEventListener('mousemove', (e) => {
        const rect = heroContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (centerY - y) / 10;
        const rotateY = (x - centerX) / 10;

        heroCard.style.transition = 'none'; // Disable transition during mouse move
        heroCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
      });

      heroContainer.addEventListener('mouseleave', () => {
        heroCard.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
        heroCard.style.transform = 'rotateX(10deg) rotateY(-10deg) scale3d(1, 1, 1)';
      });
    }

    // 2. Generic Tilt for other elements
    const otherCards = document.querySelectorAll('.skill-category, .image-container');

    otherCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (centerY - y) / 20;
        const rotateY = (x - centerX) / 20;

        card.style.transition = 'none';
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        if (card.classList.contains('project-card')) {
          const lightX = (x / rect.width) * 100;
          const lightY = (y / rect.height) * 100;
          card.style.backgroundImage = `radial-gradient(circle at ${lightX}% ${lightY}%, rgba(255,255,255,0.05) 0%, transparent 80%)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
        card.style.transform = '';
        card.style.backgroundImage = '';
      });
    });
  }



  setupMagneticEffect() {
    if (this.reduceMotion) return;
    const magneticElements = document.querySelectorAll('.btn, .social-link, .nav-logo');

    magneticElements.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = `translate(0px, 0px)`;
      });
    });
  }

  initAOS() {
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 1000,
        easing: 'ease-out-expo',
        once: true,
        offset: 50,
        delay: 0,
        anchorPlacement: 'top-bottom',
        disable: this.reduceMotion
      });
    }
  }

  setupNavReticle() {
    const menu = this.navMenu;
    if (!menu) return;

    const reticle = menu.querySelector('.nav-reticle');
    const links = Array.from(menu.querySelectorAll('.nav-link'));
    if (!reticle || links.length === 0) return;

    const moveTo = (link) => {
      const menuRect = menu.getBoundingClientRect();
      const rect = link.getBoundingClientRect();
      const x = rect.left - menuRect.left - 10;
      const w = rect.width + 20;
      reticle.style.width = `${w}px`;
      reticle.style.transform = `translate3d(${x}px, -50%, 0)`;
    };

    const active = () => links.find(l => l.classList.contains('active')) || links[0];
    const sync = () => moveTo(active());

    // show reticle after first layout
    requestAnimationFrame(() => {
      menu.classList.add('is-ready');
      sync();
    });

    links.forEach(link => {
      link.addEventListener('mouseenter', () => moveTo(link), { passive: true });
      link.addEventListener('focus', () => moveTo(link));
    });

    menu.addEventListener('mouseleave', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });

    // watch active class changes (IntersectionObserver updates it)
    const mo = new MutationObserver(sync);
    mo.observe(menu, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  setupLiveWallpaper() {
    this.liveWallpaper = new LiveWallpaper({ reduceMotion: this.reduceMotion });
  }

  setupThreeDModel() {
    this.threeDModel = new ThreeDModel('canvas3d-container', 'glb/pc.fbx', {
      scale: 14.0,
      yOffset: 0,
      cameraZ: 10
    });
  }

  handleKeydown(e) {
    // Handle keyboard navigation
    if (e.key === 'Escape') {
      this.closeMobileMenu();
      
      // Close any open notifications
      const notification = document.querySelector('.notification');
      if (notification) {
        this.removeNotification(notification);
      }
    }
    
    // Tab navigation for accessibility
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  }

  removeLoadingStates() {
    // Remove loading classes after initial load
    setTimeout(() => {
      document.querySelectorAll('.loading').forEach(el => {
        el.classList.remove('loading');
      });
    }, 1000);
  }

  // Utility methods
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PortfolioApp();
});

// Add some additional interactive features
document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Add typing animation to hero section
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    // Add cursor blink animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      .typing-cursor {
        animation: blink 1s infinite;
      }
    `;
    document.head.appendChild(style);
  }

  // Add click animation to buttons (skip on reduced motion)
  if (!reduceMotion) document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function (e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
      `;
      
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
  
  // Add the ripple animation
  if (!reduceMotion && !document.querySelector('#ripple-animation')) {
    const rippleStyle = document.createElement('style');
    rippleStyle.id = 'ripple-animation';
    rippleStyle.textContent = `
      @keyframes ripple {
        to {
          transform: scale(2);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(rippleStyle);
  }
});

// Performance optimization: Lazy load images
document.addEventListener('DOMContentLoaded', () => {
  const images = document.querySelectorAll('img[data-src]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('loading');
          imageObserver.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  } else {
    // Fallback for older browsers
    images.forEach(img => {
      img.src = img.dataset.src;
    });
  }
});

console.log('🚀 Portfolio website loaded successfully!');
console.log('Made with ❤️ by Van Jasper Benzon');
