(function () {
  const canvas = document.querySelector("#universe");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });

  const root = document.documentElement;
  const scenes = Array.from(document.querySelectorAll(".scene"));
  const navLinks = Array.from(document.querySelectorAll('.stage-nav a[href^="#"]'));
  const hudItems = Array.from(document.querySelectorAll(".progress-hud li"));
  const progressFill = document.querySelector(".progress-line span");
  const hologram = document.querySelector(".hologram");
  const cube = document.querySelector(".generator-cube");
  const counters = Array.from(document.querySelectorAll("[data-counter]"));
  const frameworkOutput = document.querySelector(".framework-output");
  const caseOutput = document.querySelector(".case-orb-detail");
  const portalSummary = document.querySelector(".portal-summary");
  const serviceOutput = document.querySelector(".service-output");
  const stageTitle = document.querySelector("[data-stage-title]");
  const stageDirective = document.querySelector("[data-stage-directive]");
  const soundToggle = document.querySelector("[data-sound-toggle]");
  const autopilotToggle = document.querySelector("[data-autopilot]");
  const deviceDesktop = document.querySelector(".device-desktop");
  const devicePhone = document.querySelector(".device-phone");
  const deviceCard = document.querySelector(".device-card");

  const state = {
    width: 1,
    height: 1,
    dpr: 1,
    progress: 0,
    targetProgress: 0,
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    time: 0,
    mood: "quality",
    contactBurst: 0,
    portalStage: "Launch",
    portalGoal: "高端品牌定位",
    activeScene: -1,
    soundEnabled: false,
    autopilot: false,
    nextAutoAt: 0,
    audio: null,
  };

  const stageDeck = [
    ["Loading", "Initializing HCF brand growth engine."],
    ["Brand Core", "Scan the origin point: positioning, signal and visual gravity."],
    ["HCF Brand Arena", "Choose the core force: High-End, Creative or Focus."],
    ["Brand Laboratory", "Prototype identity, motion, web and launch assets as one system."],
    ["Growth Framework", "Convert brand strategy into an operating model."],
    ["AI Studio", "Activate AI cores for content, automation and decision support."],
    ["Website Generator", "Tune identity, motion and conversion intensity."],
    ["Case Worlds", "Land on a brand world and inspect its growth role."],
    ["Growth Data Center", "Watch the brand system return to measurable business signals."],
    ["Official V1", "The website, proposal, SEO, AI and brand manual now share one source of truth."],
    ["Brand Portal", "Choose your stage and start a focused growth diagnosis."],
  ];

  const palettes = {
    quality: ["#f8f8f8", "#e7e7e7", "#5cc7ff"],
    creativity: ["#5cc7ff", "#785cff", "#d76bff"],
    responsibility: ["#e7e7e7", "#8fe6ff", "#b8c7d9"],
    gpt: ["#19f2ff", "#5cc7ff", "#f8f8f8"],
    claude: ["#ff9f5c", "#f6d6bc", "#f8f8f8"],
    gemini: ["#785cff", "#d76bff", "#f8f8f8"],
    codex: ["#5cff9d", "#5cc7ff", "#0a0a0a"],
    grok: ["#f8f8f8", "#5cc7ff", "#785cff"],
  };

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const value = parseInt(clean, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((v) => v / 255);
  }

  function mix(a, b, t) {
    return a + (b - a) * t;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "Shader compile failed");
    }
    return shader;
  }

  function createProgram(vertexSource, fragmentSource) {
    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Program link failed");
    }
    return program;
  }

  const vertexSource = `
    precision highp float;

    attribute vec3 a_position;
    attribute vec3 a_color;
    attribute float a_size;
    attribute float a_twinkle;

    uniform float u_time;
    uniform float u_camera;
    uniform float u_aspect;
    uniform float u_dpr;
    uniform vec2 u_mouse;
    uniform float u_burst;

    varying vec3 v_color;
    varying float v_alpha;

    void main() {
      vec3 p = a_position;
      float pulse = sin(u_time * (0.7 + a_twinkle * 1.7) + a_twinkle * 8.0);
      p.x += pulse * 0.55 + u_mouse.x * 7.0;
      p.y += cos(u_time * 0.8 + a_twinkle * 5.0) * 0.38 + u_mouse.y * 4.0;

      float portal = smoothstep(-880.0, -760.0, p.z);
      p.xy *= 1.0 + portal * u_burst * 0.32;

      float depth = -(p.z + u_camera);
      float visible = step(8.0, depth) * step(depth, 980.0);
      float safeDepth = max(depth, 8.0);
      float perspective = 2.15 / safeDepth;
      vec2 clip = vec2(p.x * perspective / u_aspect, p.y * perspective);

      gl_Position = vec4(clip, 1.0 - safeDepth / 980.0, 1.0);
      gl_PointSize = visible * a_size * u_dpr * (130.0 / safeDepth) * (1.0 + pulse * 0.18);
      v_color = a_color;
      v_alpha = visible * (0.45 + 0.55 * smoothstep(980.0, 180.0, safeDepth)) * (1.0 - portal * u_burst * 0.68);
    }
  `;

  const fragmentSource = `
    precision highp float;

    varying vec3 v_color;
    varying float v_alpha;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float d = length(uv);
      float core = smoothstep(0.5, 0.0, d);
      float halo = smoothstep(0.5, 0.18, d) * 0.42;
      float alpha = (core + halo) * v_alpha;
      gl_FragColor = vec4(v_color * (1.0 + core * 0.85), alpha);
    }
  `;

  const program = gl ? createProgram(vertexSource, fragmentSource) : null;
  const attributes = {};
  const uniforms = {};
  const buffers = {};

  if (gl && program) {
    gl.useProgram(program);
    ["a_position", "a_color", "a_size", "a_twinkle"].forEach((name) => {
      attributes[name] = gl.getAttribLocation(program, name);
    });
    ["u_time", "u_camera", "u_aspect", "u_dpr", "u_mouse", "u_burst"].forEach((name) => {
      uniforms[name] = gl.getUniformLocation(program, name);
    });
  }

  function colorFromStage(stage, bias) {
    const set =
      stage === 2
        ? palettes[state.mood]
        : stage === 5
          ? palettes.gpt
          : ["#f8f8f8", "#5cc7ff", "#785cff"];
    const a = hexToRgb(set[Math.floor(bias * set.length) % set.length]);
    const b = hexToRgb(set[(Math.floor(bias * set.length) + 1) % set.length]);
    return [mix(a[0], b[0], bias % 1), mix(a[1], b[1], bias % 1), mix(a[2], b[2], bias % 1)];
  }

  function stagePoint(stage, i, total) {
    const t = i / total;
    const angle = t * Math.PI * 2;
    const z = -stage * 92 - rand(20, 86);
    let x = 0;
    let y = 0;

    if (stage === 0) {
      const r = Math.pow(Math.random(), 0.7) * 34;
      x = Math.cos(angle * 3.0) * r;
      y = Math.sin(angle * 2.0) * r * 0.58;
    } else if (stage === 1) {
      const r = 8 + Math.pow(Math.random(), 0.55) * 80;
      x = Math.cos(angle * 3.4 + r * 0.04) * r;
      y = Math.sin(angle * 2.2) * r * 0.38;
    } else if (stage === 2) {
      const core = Math.floor(t * 3);
      const centers = [-45, 0, 45];
      const r = Math.pow(Math.random(), 0.4) * 18;
      x = centers[core] + Math.cos(angle * 8) * r;
      y = Math.sin(angle * 7) * r;
    } else if (stage === 3) {
      const col = (i % 26) - 13;
      const row = (Math.floor(i / 26) % 13) - 6;
      x = col * 5.3 + rand(-1, 1);
      y = row * 4.2 + rand(-1, 1);
    } else if (stage === 4) {
      const path = t * 2 - 1;
      x = path * 110;
      y = Math.sin(path * Math.PI * 2.5) * 18 + rand(-4, 4);
    } else if (stage === 5) {
      const cluster = Math.floor(t * 5);
      const centers = [-62, -30, 0, 30, 62];
      const r = Math.pow(Math.random(), 0.6) * 14;
      x = centers[cluster] + Math.cos(angle * 9) * r;
      y = Math.sin(angle * 11) * r + Math.sin(cluster) * 10;
    } else if (stage === 6) {
      const face = Math.floor(t * 6);
      const u = rand(-30, 30);
      const v = rand(-30, 30);
      x = face % 2 === 0 ? u : face < 4 ? (face === 1 ? -34 : 34) : u;
      y = face >= 4 ? (face === 4 ? 30 : -30) : v;
    } else if (stage === 7) {
      const planet = Math.floor(t * 4);
      const centers = [
        [-54, 15],
        [-14, -18],
        [26, 20],
        [64, -8],
      ];
      const r = 5 + Math.pow(Math.random(), 0.3) * (planet === 2 ? 16 : 11);
      x = centers[planet][0] + Math.cos(angle * 16) * r;
      y = centers[planet][1] + Math.sin(angle * 16) * r;
    } else if (stage === 8) {
      const col = Math.floor(t * 8);
      const height = 12 + (col % 4) * 9 + Math.sin(col) * 5;
      x = (col - 3.5) * 18 + rand(-2, 2);
      y = rand(-28, height);
    } else {
      const r = 18 + Math.pow(Math.random(), 0.55) * 58;
      x = Math.cos(angle * 4.5) * r;
      y = Math.sin(angle * 4.5) * r;
    }

    return [x, y, z];
  }

  function buildParticles() {
    const stages = scenes.length;
    const perStage = 430;
    const count = stages * perStage;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const twinkles = new Float32Array(count);

    for (let stage = 0; stage < stages; stage += 1) {
      for (let i = 0; i < perStage; i += 1) {
        const index = stage * perStage + i;
        const point = stagePoint(stage, i, perStage);
        const color = colorFromStage(stage, Math.random());
        positions.set(point, index * 3);
        colors.set(color, index * 3);
        sizes[index] = rand(3.6, stage === 9 ? 9.5 : 7.4);
        twinkles[index] = Math.random();
      }
    }

    return { count, positions, colors, sizes, twinkles };
  }

  const particles = gl ? buildParticles() : null;

  function bindBuffer(name, data, size) {
    const buffer = gl.createBuffer();
    buffers[name] = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(attributes[name]);
    gl.vertexAttribPointer(attributes[name], size, gl.FLOAT, false, 0, 0);
  }

  function initGl() {
    if (!gl || !program || !particles) return;
    bindBuffer("a_position", particles.positions, 3);
    bindBuffer("a_color", particles.colors, 3);
    bindBuffer("a_size", particles.sizes, 1);
    bindBuffer("a_twinkle", particles.twinkles, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
  }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function updateScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    state.targetProgress = window.scrollY / max;
    state.progress = state.targetProgress;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function syncScenes() {
    const sceneMax = scenes.length - 1;
    const sceneProgress = state.progress * sceneMax;
    const active = clamp(Math.round(sceneProgress), 0, sceneMax);
    root.style.setProperty("--progress", `${state.progress * 100}%`);
    progressFill.style.height = `${state.progress * 100}%`;

    scenes.forEach((scene, index) => {
      const distance = sceneProgress - index;
      const rawVisible = Math.max(0, 1 - Math.abs(distance) * 1.55);
      const visible = rawVisible > 0.16 ? rawVisible : 0;
      scene.classList.toggle("is-visible", visible > 0.08);
      scene.classList.toggle("is-interactive", visible > 0.62);
      scene.style.opacity = String(visible);
      scene.style.pointerEvents = visible > 0.62 ? "auto" : "none";
      scene.style.transform = `translate3d(0, ${distance * -3}rem, 0) scale(${0.98 + visible * 0.02})`;
    });

    navLinks.forEach((link) => {
      const target = document.querySelector(link.getAttribute("href"));
      const index = target ? Number(target.dataset.scene || 0) : 0;
      link.classList.toggle("is-active", index === active);
    });

    hudItems.forEach((item, index) => {
      const mapped = [1, 2, 3, 5, 8, 9, 10][index];
      item.classList.toggle("is-active", mapped === active);
    });

    updateDeck(active);
    if (active >= 8) animateCounters();
  }

  function updateDeck(active) {
    if (state.activeScene === active) return;
    state.activeScene = active;
    const [title, directive] = stageDeck[active] || stageDeck[0];
    if (stageTitle) stageTitle.textContent = title;
    if (stageDirective) stageDirective.textContent = directive;
    playPulse(180 + active * 28, 0.05, 0.03);
  }

  let countersStarted = false;
  function animateCounters() {
    if (countersStarted) return;
    countersStarted = true;
    const start = performance.now();
    const duration = 1500;
    function frame(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      counters.forEach((counter) => {
        const target = Number(counter.dataset.counter);
        const value = Math.round(target * eased);
        const suffix = counter.textContent.includes("%") ? "%" : target === 128 ? "K" : "";
        counter.textContent = `${value}${suffix}`;
      });
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function render(now) {
    state.time = now * 0.001;
    state.progress += (state.targetProgress - state.progress) * 0.08;
    state.mouseX += (state.targetMouseX - state.mouseX) * 0.08;
    state.mouseY += (state.targetMouseY - state.mouseY) * 0.08;
    state.contactBurst *= 0.94;
    syncScenes();

    if (state.autopilot && now > state.nextAutoAt) {
      const nextScene = (state.activeScene + 1) % scenes.length;
      goToScene(nextScene);
      state.nextAutoAt = now + 4200;
    }

    if (gl && particles) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1f(uniforms.u_time, state.time);
      gl.uniform1f(uniforms.u_camera, state.progress * 92 * (scenes.length - 1));
      gl.uniform1f(uniforms.u_aspect, state.width / Math.max(1, state.height));
      gl.uniform1f(uniforms.u_dpr, state.dpr);
      gl.uniform2f(uniforms.u_mouse, state.mouseX, state.mouseY);
      gl.uniform1f(uniforms.u_burst, state.contactBurst);
      gl.drawArrays(gl.POINTS, 0, particles.count);
    }

    requestAnimationFrame(render);
  }

  function setMood(name) {
    const palette = palettes[name] || palettes.quality;
    state.mood = name;
    root.style.setProperty("--mood-a", palette[0]);
    root.style.setProperty("--mood-b", palette[1]);
    root.style.setProperty("--mood-c", palette[2]);
  }

  function goToScene(sceneIndex) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: (sceneIndex / (scenes.length - 1)) * max, behavior: "smooth" });
  }

  function ensureAudio() {
    if (state.audio) return state.audio;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    const context = new AudioContext();
    const master = context.createGain();
    const hum = context.createOscillator();
    const humGain = context.createGain();
    hum.type = "sine";
    hum.frequency.value = 58;
    humGain.gain.value = 0.018;
    hum.connect(humGain);
    humGain.connect(master);
    master.gain.value = 0.42;
    master.connect(context.destination);
    hum.start();
    state.audio = { context, master };
    return state.audio;
  }

  function playPulse(frequency = 320, duration = 0.08, gain = 0.045) {
    if (!state.soundEnabled) return;
    const audio = ensureAudio();
    if (!audio) return;
    const { context, master } = audio;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.55, context.currentTime + duration);
    envelope.gain.setValueAtTime(gain, context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  async function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
    if (state.soundEnabled) {
      const audio = ensureAudio();
      if (audio?.context.state === "suspended") await audio.context.resume();
      playPulse(420, 0.12, 0.06);
    }
  }

  function toggleAutopilot() {
    state.autopilot = !state.autopilot;
    autopilotToggle.setAttribute("aria-pressed", String(state.autopilot));
    state.nextAutoAt = performance.now() + 1000;
    playPulse(state.autopilot ? 520 : 180, 0.1, 0.05);
  }

  function handleDnaClick(event) {
    const button = event.currentTarget;
    const messages = {
      quality: "HIGH-END CORE: stable structure, precise balance and premium trust signals.",
      creativity: "CREATIVE CORE: cinematic imagination, visual gravity and memorable brand worlds.",
      responsibility: "FOCUS CORE: sharp attention, directional clarity and disciplined growth execution.",
    };
    document.querySelectorAll(".dna-core").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    setMood(button.dataset.mood);
    if (hologram) hologram.textContent = messages[button.dataset.mood];
    playPulse(280, 0.08, 0.04);
  }

  function handleAiClick(event) {
    const ai = event.currentTarget.dataset.ai;
    const lower = ai.toLowerCase();
    setMood(lower);
    const messages = {
      GPT: "GPT CORE: translating positioning into campaign, content and conversion systems.",
      Claude: "CLAUDE CORE: refining brand voice, strategy clarity and high-trust narrative.",
      Gemini: "GEMINI CORE: mapping visual references into multimodal launch directions.",
      Codex: "CODEX CORE: generating interface logic, automation flows and production-ready prototypes.",
      Grok: "GROK CORE: stress-testing cultural timing, message velocity and market signal.",
    };
    hologram.textContent = messages[ai];
    playPulse(360, 0.08, 0.04);
  }

  function handleGeneratorInput(event) {
    const value = Number(event.currentTarget.value);
    const hue = 190 + value * 0.8;
    cube.style.filter = `drop-shadow(0 0 ${14 + value / 3}px hsl(${hue} 100% 66% / 0.42))`;
    playPulse(160 + value * 2, 0.035, 0.018);
  }

  function handleServiceClick(event) {
    const services = {
      identity: {
        output: "把 Logo、色彩、字體、影像與版面規則整理成可擴張的高端識別系統。",
        desktop: "Identity",
        phone: "Guideline",
        card: "Logo",
        mood: "quality",
      },
      website: {
        output: "把品牌故事、內容結構、互動體驗與 CTA 串成真正能產生諮詢的網站引擎。",
        desktop: "Website",
        phone: "Landing",
        card: "CTA",
        mood: "gpt",
      },
      automation: {
        output: "用 AI 建立內容生成、客服回覆、素材迭代與線索追蹤的自動化工作流。",
        desktop: "AI Flow",
        phone: "Bot",
        card: "CRM",
        mood: "codex",
      },
      launch: {
        output: "從主視覺、社群素材、廣告路徑到追蹤指標，規劃完整品牌發射流程。",
        desktop: "Campaign",
        phone: "Motion",
        card: "Launch",
        mood: "creativity",
      },
    };
    const selected = services[event.currentTarget.dataset.service];
    document.querySelectorAll("[data-service]").forEach((button) => {
      button.classList.toggle("is-active", button === event.currentTarget);
    });
    serviceOutput.textContent = selected.output;
    deviceDesktop.textContent = selected.desktop;
    devicePhone.textContent = selected.phone;
    deviceCard.textContent = selected.card;
    setMood(selected.mood);
    state.contactBurst = 0.06;
    playPulse(340, 0.08, 0.04);
  }

  function handleFrameworkClick(event) {
    const messages = {
      "Vision Scan": "定位、受眾、競爭與信任缺口先被掃描，品牌才有真正的成長方向。",
      "Brand DNA": "把 Quality、Creativity、Responsibility 轉成品牌語言、視覺規則與決策標準。",
      "Website Engine": "網站不只是展示頁，而是承接信任、教育市場、產生名單的轉換引擎。",
      "AI Automation": "用 AI 讓內容產出、客戶回覆、素材迭代與數據追蹤變成可持續系統。",
    };
    document.querySelectorAll("[data-framework]").forEach((button) => {
      button.classList.toggle("is-active", button === event.currentTarget);
    });
    frameworkOutput.textContent = messages[event.currentTarget.dataset.framework];
    state.contactBurst = 0.06;
    playPulse(310, 0.07, 0.035);
  }

  function handleCaseClick(event) {
    const cases = {
      core: {
        title: "Brand Core Landing",
        body: "重建定位、品牌承諾與視覺方向，讓新客戶在 8 秒內理解你為什麼值得信任。",
        mood: "quality",
      },
      visual: {
        title: "Visual System Landing",
        body: "把 Logo、色彩、字體、版面與影像語言整理成可複製的高端品牌識別系統。",
        mood: "creativity",
      },
      web: {
        title: "Web Launch Landing",
        body: "用沉浸式網站、銷售路徑與內容架構，把品牌記憶點轉成諮詢與預約。",
        mood: "gpt",
      },
      ai: {
        title: "AI Growth Landing",
        body: "把 AI 導入內容、客服、素材生成與成效追蹤，建立可持續運轉的成長後台。",
        mood: "codex",
      },
    };
    const selected = cases[event.currentTarget.dataset.case];
    document.querySelectorAll("[data-case]").forEach((button) => {
      button.classList.toggle("is-active", button === event.currentTarget);
    });
    document.querySelectorAll(".case-planet").forEach((planet) => {
      planet.classList.toggle("is-active", planet.classList.contains(`planet-${event.currentTarget.dataset.case}`));
    });
    caseOutput.innerHTML = `<strong>${selected.title}</strong><span>${selected.body}</span>`;
    setMood(selected.mood);
    state.contactBurst = 0.08;
    playPulse(460, 0.1, 0.05);
  }

  function updatePortalSummary() {
    portalSummary.textContent = `${state.portalStage} / ${state.portalGoal}`;
  }

  function handlePortalClick(event) {
    state.portalStage = event.currentTarget.dataset.portal;
    document.querySelectorAll("[data-portal]").forEach((button) => {
      button.classList.toggle("is-active", button === event.currentTarget);
    });
    updatePortalSummary();
    playPulse(250, 0.06, 0.03);
  }

  function handleGoalClick(event) {
    state.portalGoal = event.currentTarget.dataset.goal;
    document.querySelectorAll("[data-goal]").forEach((button) => {
      button.classList.toggle("is-active", button === event.currentTarget);
    });
    updatePortalSummary();
    playPulse(300, 0.06, 0.03);
  }

  function handleContact(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = new FormData(form).get("name") || "Your brand";
    form.querySelector(".form-status").textContent =
      `${name} / ${state.portalStage} / ${state.portalGoal} diagnosis initiated.`;
    state.contactBurst = 1;
    playPulse(620, 0.16, 0.07);
  }

  document.querySelectorAll(".dna-core").forEach((button) => {
    button.addEventListener("click", handleDnaClick);
  });

  document.querySelectorAll(".ai-grid button").forEach((button) => {
    button.addEventListener("click", handleAiClick);
  });

  document.querySelectorAll("[data-control]").forEach((input) => {
    input.addEventListener("input", handleGeneratorInput);
  });

  document.querySelectorAll("[data-framework]").forEach((button) => {
    button.addEventListener("click", handleFrameworkClick);
  });

  document.querySelectorAll("[data-service]").forEach((button) => {
    button.addEventListener("click", handleServiceClick);
  });

  document.querySelectorAll("[data-case]").forEach((button) => {
    button.addEventListener("click", handleCaseClick);
  });

  document.querySelectorAll("[data-portal]").forEach((button) => {
    button.addEventListener("click", handlePortalClick);
  });

  document.querySelectorAll("[data-goal]").forEach((button) => {
    button.addEventListener("click", handleGoalClick);
  });

  document.querySelector(".contact-orb").addEventListener("submit", handleContact);

  soundToggle.addEventListener("click", toggleSound);
  autopilotToggle.addEventListener("click", toggleAutopilot);

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      const sceneIndex = Number(target.dataset.scene || 0);
      goToScene(sceneIndex);
      state.autopilot = false;
      autopilotToggle.setAttribute("aria-pressed", "false");
      playPulse(220 + sceneIndex * 20, 0.08, 0.035);
    });
  });

  window.addEventListener("resize", () => {
    resize();
    updateScroll();
  });
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("pointermove", (event) => {
    state.targetMouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    state.targetMouseY = -(event.clientY / window.innerHeight - 0.5) * 2;
    root.style.setProperty("--mx", `${event.clientX}px`);
    root.style.setProperty("--my", `${event.clientY}px`);
  });

  initGl();
  resize();
  updateScroll();
  setMood("quality");
  requestAnimationFrame(render);
})();
