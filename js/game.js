(() => {
  "use strict";

  const VIEW_W = 1280;
  const VIEW_H = 720;
  const TOUCH_SAFE = 140;
  const CHAR_H = 96;
  const HIT_W = 28;
  const HIT_H = 50;
  const SAVE_KEY = "moon-academy-demo-v1";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const touchRoot = document.getElementById("touch");

  const input = {
    left: false, right: false, up: false, down: false,
    jump: false, jumpPressed: false,
    attack: false, attackPressed: false,
    dash: false, dashPressed: false,
    interact: false, interactPressed: false,
    pausePressed: false, mutePressed: false, helpPressed: false, confirmPressed: false,
    dirTap: { dir: 0, t: 0 }
  };

  const keys = new Set();
  const heldBtns = new Set();

  function bindButton(el, on, off) {
    const start = (e) => { e.preventDefault(); on(); el.classList.add("held"); };
    const end = (e) => { e.preventDefault(); off(); el.classList.remove("held"); };
    el.addEventListener("pointerdown", start);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerleave", (e) => { if (el.classList.contains("held")) end(e); });
  }

  document.querySelectorAll("[data-dir]").forEach((el) => {
    const dir = el.dataset.dir;
    const set = (v) => {
      if (dir === "left") input.left = v;
      if (dir === "right") input.right = v;
      if (dir === "up") { input.up = v; if (v) { input.jump = true; input.jumpPressed = true; } else input.jump = input.jump || keysHasJump(); }
      if (dir === "down") { input.down = v; if (v) { input.interact = true; input.interactPressed = true; } }
      if (v && (dir === "left" || dir === "right")) maybeDashTap(dir === "right" ? 1 : -1);
    };
    bindButton(el, () => set(true), () => set(false));
  });
  document.querySelectorAll("[data-act]").forEach((el) => {
    const act = el.dataset.act;
    bindButton(el, () => {
      if (act === "jump") { input.jump = true; input.jumpPressed = true; }
      if (act === "attack") { input.attack = true; input.attackPressed = true; }
      if (act === "interact") { input.interact = true; input.interactPressed = true; }
      if (act === "dash") { input.dash = true; input.dashPressed = true; }
    }, () => {
      if (act === "jump") input.jump = keysHasJump();
      if (act === "attack") input.attack = false;
      if (act === "interact") input.interact = false;
      if (act === "dash") input.dash = false;
    });
  });

  function keysHasJump() {
    return keys.has(" ") || keys.has("arrowup") || keys.has("w") || keys.has("z") || heldBtns.has("jump");
  }
  function maybeDashTap(dir) {
    const now = performance.now();
    if (input.dirTap.dir === dir && now - input.dirTap.t < 280) {
      input.dash = true;
      input.dashPressed = true;
    }
    input.dirTap = { dir, t: now };
  }

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowleft","arrowright","arrowup","arrowdown"," ","w","a","s","d","z","j","k","l","e","shift","escape","p","m","h","r","enter"].includes(k)) e.preventDefault();
    if (keys.has(k) && e.repeat) return;
    keys.add(k);
    if (k === "arrowleft" || k === "a") { input.left = true; maybeDashTap(-1); }
    if (k === "arrowright" || k === "d") { input.right = true; maybeDashTap(1); }
    if (k === "arrowup" || k === "w" || k === " " || k === "z") { input.jump = true; input.jumpPressed = true; input.up = true; }
    if (k === "arrowdown" || k === "s") { input.down = true; }
    if (k === "j" || k === "f") { input.attack = true; input.attackPressed = true; }
    if (k === "shift" || k === "l" || k === "x" || k === "k") { input.dash = true; input.dashPressed = true; }
    if (k === "e") { input.interact = true; input.interactPressed = true; }
    if (k === "escape" || k === "p") input.pausePressed = true;
    if (k === "m") input.mutePressed = true;
    if (k === "h") input.helpPressed = true;
    if (k === "enter" || k === " ") input.confirmPressed = true;
  });
  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    keys.delete(k);
    if (k === "arrowleft" || k === "a") input.left = keys.has("arrowleft") || keys.has("a");
    if (k === "arrowright" || k === "d") input.right = keys.has("arrowright") || keys.has("d");
    if (k === "arrowup" || k === "w" || k === " " || k === "z") { input.jump = keysHasJump(); input.up = keys.has("arrowup") || keys.has("w"); }
    if (k === "arrowdown" || k === "s") input.down = keys.has("arrowdown") || keys.has("s");
    if (k === "j" || k === "f") input.attack = false;
    if (k === "shift" || k === "l" || k === "x" || k === "k") input.dash = false;
    if (k === "e") input.interact = false;
  });

  ["touchmove","gesturestart"].forEach((ev) => {
    document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  });
  window.addEventListener("contextmenu", (e) => e.preventDefault());

  const audio = { ok: false, muted: false, ctx: null };
  const bgm = { started: false, master: null, timer: null };
  function ensureAudio() {
    if (audio.ctx) return;
    try { audio.ctx = new AudioContext(); audio.ok = true; } catch (_) {}
  }
  function beep(freq, dur, type, gain) {
    if (audio.muted) return;
    ensureAudio();
    if (!audio.ok || !audio.ctx) return;
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    const t = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain ?? 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audio.ctx.destination);
    o.start(t); o.stop(t + dur);
    return o;
  }
  function beepSlide(freq0, freq1, dur, type, gain) {
    if (audio.muted) return;
    ensureAudio();
    if (!audio.ok || !audio.ctx) return;
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    const t = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, freq1), t + dur);
    g.gain.setValueAtTime(gain ?? 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audio.ctx.destination);
    o.start(t); o.stop(t + dur);
  }
  function noiseBurst(dur, gain, freq) {
    if (audio.muted) return;
    ensureAudio();
    if (!audio.ok || !audio.ctx) return;
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    const ctx = audio.ctx;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq || 1400;
    filter.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain ?? 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + dur);
  }
  function duk(when, gain) {
    if (audio.muted) return;
    ensureAudio();
    if (!audio.ok || !audio.ctx) return;
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    const ctx = audio.ctx;
    const t = ctx.currentTime + (when || 0);
    const vol = gain || 0.14;
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.08);
    og.gain.setValueAtTime(vol, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(og); og.connect(ctx.destination);
    o.start(t); o.stop(t + 0.1);
    const len = Math.max(1, Math.floor(ctx.sampleRate * 0.04));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 620;
    filter.Q.value = 0.5;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vol * 0.65, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    src.connect(filter); filter.connect(ng); ng.connect(ctx.destination);
    src.start(t); src.stop(t + 0.045);
  }
  const sfx = {
    jump: () => beep(420, 0.08, "square", 0.04),
    djump: () => beep(560, 0.08, "square", 0.04),
    dash: () => { beep(240, 0.12, "sawtooth", 0.04); beep(480, 0.08, "square", 0.03); },
    atk: () => beep(260, 0.04, "sine", 0.03),
    hit: () => { duk(0, 0.2); duk(0.065, 0.13); },
    hurt: () => beep(140, 0.2, "sawtooth", 0.05),
    pickup: () => { beep(520, 0.12, "square", 0.05); setTimeout(() => beep(780, 0.18, "square", 0.05), 80); },
    bench: () => beep(360, 0.15, "triangle", 0.04),
    win: () => { beep(523, 0.15, "triangle", 0.05); setTimeout(() => beep(659, 0.15, "triangle", 0.05), 120); setTimeout(() => beep(784, 0.3, "sine", 0.05), 240); }
  };
  function setMuted(on) {
    audio.muted = on;
    if (bgm.master) {
      const ctx = audio.ctx;
      if (ctx) bgm.master.gain.setTargetAtTime(on ? 0 : 0.08, ctx.currentTime, 0.05);
    }
  }
  function startBgm() {
    ensureAudio();
    if (!audio.ok || !audio.ctx || bgm.started) return;
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    const ctx = audio.ctx;
    const master = ctx.createGain();
    master.gain.value = audio.muted ? 0 : 0.08;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 720;
    lp.Q.value = 0.4;
    master.connect(lp);
    lp.connect(ctx.destination);
    bgm.master = master;
    bgm.started = true;
    const drone = (freq, type, gain) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g);
      g.connect(master);
      o.start();
    };
    // D minor drones — dark, low, not bright
    drone(73.42, "sine", 0.45);
    drone(110, "triangle", 0.16);
    drone(146.83, "sine", 0.08);
    const bell = () => {
      if (!audio.ctx || audio.muted) return;
      const t0 = audio.ctx.currentTime;
      const notes = [146.83, 174.61, 220, 130.81, 98];
      const f = notes[Math.floor(Math.random() * notes.length)];
      const o = audio.ctx.createOscillator();
      const g = audio.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(f, t0);
      o.frequency.exponentialRampToValueAtTime(f * 0.97, t0 + 1.6);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + 1.85);
    };
    bell();
    bgm.timer = setInterval(bell, 2600);
  }

  const SPRITE = {
    frameW: 252, frameH: 200,
    anchorX: 116, anchorY: 184,
    charH: 148.5, cols: 8,
    counts: { idle: 8, walk: 16, jump: 8, attack: 20, dash: 4 }
  };
  const ATK_DUR = 1.10;
  const ATK_CD = 1.28;
  const ATK_HIT_START = 4 / 20;
  const ATK_HIT_END = 12 / 20;
  let mapData = null;
  const images = { player: { idle: [], walk: [], jump: [], attack: [], dash: [] }, front: null, title: null, bg: {}, enemies: {} };
  let state = "boot";
  let world = null;

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = (typeof ASSET_DATA !== "undefined" && ASSET_DATA[src]) || src;
    });
  }
  async function loadAll() {
    const res = await fetch("maps/rooms.json");
    mapData = await res.json();
    const jobs = [];
    const loadSheet = (name) => loadImage(`assets/player/${name}_sheet.webp`).then((im) => {
      if (!im) return;
      const n = SPRITE.counts[name], cols = SPRITE.cols, fw = SPRITE.frameW, fh = SPRITE.frameH;
      const frames = [];
      for (let i = 0; i < n; i++) {
        frames.push({ img: im, sx: (i % cols) * fw, sy: Math.floor(i / cols) * fh, sw: fw, sh: fh });
      }
      images.player[name] = frames;
    });
    for (const name of ["idle", "walk", "jump", "attack", "dash"]) jobs.push(loadSheet(name));
    jobs.push(loadImage("assets/player/front.webp").then((im) => { if (im) images.front = im; }));
    jobs.push(loadImage("assets/player/title.webp").then((im) => { if (im) images.title = im; }));
    for (const name of ["gargoyle", "armor", "robe", "bell"]) {
      jobs.push(loadImage(`assets/enemies/${name}.webp`).then((im) => { if (im) images.enemies[name] = im; }));
    }
    for (const room of mapData.rooms) {
      if (room.background) jobs.push(loadImage(room.background).then((im) => { if (im) images.bg[room.background] = im; }));
      if (room.parallax) jobs.push(loadImage(room.parallax).then((im) => { if (im) images.bg[room.parallax] = im; }));
    }
    await Promise.all(jobs);
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function rect(x, y, w, h) { return { x, y, w, h }; }

  function subtractRect(solid, hole) {
    const x = Math.max(solid.x, hole.x);
    const y = Math.max(solid.y, hole.y);
    const r = Math.min(solid.x + solid.w, hole.x + hole.w);
    const b = Math.min(solid.y + solid.h, hole.y + hole.h);
    if (r <= x || b <= y) return [solid];
    const out = [];
    if (x > solid.x) out.push({ x: solid.x, y: solid.y, w: x - solid.x, h: solid.h });
    if (r < solid.x + solid.w) out.push({ x: r, y: solid.y, w: solid.x + solid.w - r, h: solid.h });
    if (y > solid.y) out.push({ x, y: solid.y, w: r - x, h: y - solid.y });
    if (b < solid.y + solid.h) out.push({ x, y: b, w: r - x, h: solid.y + solid.h - b });
    return out.filter((s) => s.w > 0 && s.h > 0);
  }

  function roomSolids(room) {
    let solids = (room.solids || []).map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
    const holes = [...(room.pits || []), ...(room.gaps || [])];
    for (const hole of holes) {
      const next = [];
      for (const s of solids) next.push(...subtractRect(s, hole));
      solids = next;
    }
    return solids;
  }

  const ENCOUNTERS = {
    R2: [
      { type: "wisp", x: 900, y: 592, hp: 2 },
      { type: "wisp", x: 1400, y: 592, hp: 2 }
    ],
    R3: [
      { type: "imp", x: 500, y: 640, hp: 3 },
      { type: "imp", x: 900, y: 480, hp: 3 },
      { type: "elite", x: 1500, y: 832, hp: 6 }
    ],
    R4: [
      { type: "boss", x: 640, y: 240, hp: 12 }
    ],
    R5: [
      { type: "wisp", x: 700, y: 592, hp: 2 },
      { type: "heart", x: 1360, y: 400 }
    ]
  };

  function makeEnemy(def, room) {
    const specs = {
      wisp: { w: 70, h: 100, hp: 2, dmg: 1, color: "#3d4a44", name: "學袍殘影", sprite: "robe" },
      imp: { w: 90, h: 84, hp: 3, dmg: 1, color: "#3a2c26", name: "碎石石像鬼", sprite: "gargoyle" },
      elite: { w: 72, h: 108, hp: 6, dmg: 1, color: "#2c2a30", name: "空洞鎧甲", sprite: "armor" },
      boss: { w: 92, h: 132, hp: 12, dmg: 1, color: "#2a2624", name: "鐘樓鈴魂", sprite: "bell" }
    };
    const s = specs[def.type];
    if (!s) return null;
    const feet = def.y;
    return {
      type: def.type, name: s.name, room: room.id,
      x: def.x - s.w / 2, y: feet - s.h, w: s.w, h: s.h,
      vx: def.type === "boss" ? 70 : (Math.random() < 0.5 ? -50 : 50),
      vy: 0, hp: def.hp ?? s.hp, maxHp: def.hp ?? s.hp, dmg: s.dmg,
      color: s.color, sprite: s.sprite, alive: true, hurt: 0, cd: 0, phase: 1, t: 0,
      shots: []
    };
  }

  function defaultSave() {
    return {
      hp: 5, maxHp: 5,
      abilities: { dash: false, doubleJump: false },
      checkpoint: { room: mapData.start.room, x: mapData.start.x, y: mapData.start.y, kind: "start" },
      discovered: { [mapData.start.room]: true },
      got: {}, hearts: {},
      bossDown: false
    };
  }

  function createWorld(save) {
    const rooms = {};
    for (const r of mapData.rooms) {
      rooms[r.id] = {
        ...r,
        solids: roomSolids(r),
        enemies: (ENCOUNTERS[r.id] || []).map((d) => {
          if (d.type === "heart") return { type: "heart", x: d.x - 12, y: d.y - 24, w: 24, h: 24, alive: !save.hearts[r.id], room: r.id };
          const e = makeEnemy(d, r);
          if (e && e.type === "boss" && save.bossDown) { e.alive = false; e.hp = 0; }
          return e;
        }).filter(Boolean)
      };
    }
    return {
      rooms,
      roomId: save.checkpoint.room,
      save,
      cam: { x: 0, y: 0, sx: 0, sy: 0 },
      hitstop: 0, shakeT: 0, shakeMag: 0,
      fade: 0, fadeDir: 0, pending: null,
      banner: null, bannerT: 0,
      hint: "", hintT: 0,
      time: 0
    };
  }

  function spawnFrom(pos, kind) {
    const feetY = (kind === "start" || kind === "door" || kind === "pit") ? pos.y + CHAR_H : pos.y;
    return { x: pos.x + 24 - HIT_W / 2, y: feetY - HIT_H };
  }

  function createPlayer(save) {
    const p = spawnFrom(save.checkpoint, save.checkpoint.kind || "start");
    return {
      x: p.x, y: p.y, w: HIT_W, h: HIT_H,
      vx: 0, vy: 0, facing: 1,
      onGround: false, jumps: 0, coyote: 0, buffer: 0,
      dashing: 0, dashCd: 0, dashDir: 1,
      attacking: 0, attackCd: 0,
      hurt: 0, dead: false, invuln: 0,
      anim: "idle", frame: 0, animT: 0,
      sitting: 0
    };
  }

  let player = null;
  const fx = [];

  function currentRoom() { return world.rooms[world.roomId]; }

  function solidsAtRoom(room) { return room.solids; }

  function moveActor(a, dt, solids, opts = {}) {
    const steps = Math.max(1, Math.ceil((Math.abs(a.vx) + Math.abs(a.vy)) * dt / 8));
    const sdt = dt / steps;
    let onGround = false;
    for (let i = 0; i < steps; i++) {
      a.x += a.vx * sdt;
      const box = rect(a.x, a.y, a.w, a.h);
      for (const s of solids) {
        if (!aabb(box, s)) continue;
        if (a.vx > 0) a.x = s.x - a.w;
        else if (a.vx < 0) a.x = s.x + s.w;
        a.vx = 0;
        box.x = a.x;
        if (opts.wall && a.type) a.vx = -(opts.wallDir || 1) * Math.abs(opts.speed || 50);
      }
      a.y += a.vy * sdt;
      box.x = a.x; box.y = a.y;
      for (const s of solids) {
        if (!aabb(box, s)) continue;
        if (a.vy > 0) { a.y = s.y - a.h; onGround = true; }
        else if (a.vy < 0) a.y = s.y + s.h;
        a.vy = 0;
        box.y = a.y;
      }
    }
    a.x = Math.max(-20, Math.min((opts.roomW ?? 1e9) - a.w + 20, a.x));
    return onGround;
  }

  function tryInteract() {
    const room = currentRoom();
    const box = rect(player.x, player.y, player.w, player.h);
    for (const b of room.checkpoints || []) {
      const r = rect(b.x - 20, b.y - 40, 72, 80);
      if (aabb(box, r)) {
        world.save.checkpoint = { room: room.id, x: b.x, y: b.y - CHAR_H + 32, kind: "start" };
        world.save.hp = world.save.maxHp;
        persist();
        player.sitting = 0.4;
        world.hint = "已在長椅休息，生命值回滿。";
        world.hintT = 2.2;
        sfx.bench();
        return;
      }
    }
  }

  function grantAbility(id, label) {
    if (world.save.abilities[id]) return;
    world.save.abilities[id] = true;
    world.save.got[id] = true;
    persist();
    world.banner = { title: "獲得能力", body: label, id };
    world.bannerT = 2.4;
    state = "banner";
    sfx.pickup();
    ensureDashButton();
  }

  function ensureDashButton() {
    if (!world?.save.abilities.dash) return;
    if (document.getElementById("btn-dash")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btn-dash";
    btn.dataset.act = "dash";
    btn.textContent = "衝刺";
    btn.style.background = "rgba(90, 80, 160, 0.95)";
    document.querySelector(".actions")?.insertBefore(btn, document.getElementById("btn-jump"));
    bindButton(btn, () => { input.dash = true; input.dashPressed = true; }, () => { input.dash = false; });
  }

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(world.save)); } catch (_) {}
  }

  function enterRoom(id, spawn, kind) {
    world.pending = { id, spawn, kind };
    world.fadeDir = 1;
    world.fade = Math.max(world.fade, 0.01);
  }

  function applyEnter() {
    const p = world.pending;
    if (!p) return;
    world.roomId = p.id;
    world.save.discovered[p.id] = true;
    const pos = spawnFrom(p.spawn, p.kind || "door");
    player.x = pos.x; player.y = pos.y; player.vx = 0; player.vy = 0; player.dashing = 0;
    world.pending = null;
    persist();
  }

  function attackBox() {
    if (player.attacking <= 0) return null;
    const p = (ATK_DUR - player.attacking) / ATK_DUR;
    if (p < ATK_HIT_START || p >= ATK_HIT_END) return null;
    const reach = 92;
    const x = player.facing > 0 ? player.x + player.w : player.x - reach;
    return rect(x, player.y + 8, reach, player.h - 10);
  }

  function damagePlayer(amt, fromX) {
    if (player.invuln > 0 || player.dashing > 0 || player.dead) return;
    world.save.hp -= amt;
    player.hurt = 0.25;
    player.invuln = 0.85;
    player.vx = (player.x + player.w / 2 < fromX ? -1 : 1) * 220;
    player.vy = -280;
    sfx.hurt();
    if (world.save.hp <= 0) {
      world.save.hp = 0;
      player.dead = true;
      state = "dead";
    }
  }

  function updatePlayer(dt) {
    const room = currentRoom();
    const solids = room.solids;
    if (player.dead) return;

    if (player.hurt > 0) player.hurt -= dt;
    if (player.invuln > 0) player.invuln -= dt;
    if (player.sitting > 0) player.sitting -= dt;
    if (player.dashCd > 0) player.dashCd -= dt;
    if (player.attackCd > 0) player.attackCd -= dt;
    if (player.attacking > 0) player.attacking -= dt;
    if (player.dashing > 0) player.dashing -= dt;

    const speed = 280;
    const accel = player.onGround ? 2200 : 1400;
    const want = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    if (want) player.facing = want;
    if (player.dashing <= 0 && player.sitting <= 0) {
      const target = want * speed;
      if (player.vx < target) player.vx = Math.min(target, player.vx + accel * dt);
      else player.vx = Math.max(target, player.vx - accel * dt);
    } else if (player.dashing <= 0) {
      player.vx *= Math.pow(0.02, dt);
    }

    if (player.onGround) { player.coyote = 0.1; player.jumps = 0; }
    else player.coyote -= dt;
    if (input.jumpPressed) player.buffer = 0.12;
    else player.buffer -= dt;

    if (player.buffer > 0 && player.dashing <= 0) {
      if (player.coyote > 0) {
        player.vy = -960;
        player.onGround = false;
        player.coyote = 0;
        player.buffer = 0;
        player.jumps = 0;
        sfx.jump();
      } else if (world.save.abilities.doubleJump && player.jumps < 1) {
        player.vy = -960;
        player.jumps = 1;
        player.buffer = 0;
        sfx.djump();
      }
    }

    if (!input.jump && player.vy < -240) player.vy += 1800 * dt;

    if (input.dashPressed && world.save.abilities.dash && player.dashCd <= 0 && player.dashing <= 0) {
      player.dashing = 0.16;
      player.dashCd = 0.55;
      player.dashDir = want || player.facing;
      player.facing = player.dashDir;
      player.vx = player.dashDir * 2000;
      player.vy = 0;
      player.invuln = Math.max(player.invuln, 0.16);
      sfx.dash();
      for (let i = 0; i < 4; i++) fx.push({ t: 0.18, x: player.x, y: player.y, kind: "dash" });
    }

    if (input.attackPressed && player.attackCd <= 0 && player.dashing <= 0) {
      player.attacking = ATK_DUR;
      player.attackCd = ATK_CD;
      player.animT = 0;
      sfx.atk();
    }

    if (input.interactPressed) tryInteract();

    if (player.dashing > 0) {
      player.vy = 0;
    } else {
      player.vy += 2200 * dt;
      if (player.vy > 980) player.vy = 980;
    }

    player.onGround = moveActor(player, dt, solids, { roomW: room.width });

    // doors
    const pbox = rect(player.x, player.y, player.w, player.h);
    for (const d of room.doors || []) {
      if (!aabb(pbox, d)) continue;
      if (d.need && !world.save.abilities[d.need]) {
        if (world.hintT <= 0) { world.hint = d.need === "dash" ? "這道門需要衝刺才能通過。" : "這道門需要二段跳才能到達。"; world.hintT = 1.6; }
        continue;
      }
      enterRoom(d.to, d.spawn, "door");
      break;
    }
    for (const pit of room.pits || []) {
      const fall = rect(pit.x, pit.y - 8, pit.w, pit.h + 40);
      if (aabb(pbox, fall) && player.vy >= 0 && player.dashing <= 0) {
        enterRoom(pit.to, pit.spawn, "pit");
        break;
      }
    }
    for (const pk of room.pickups || []) {
      if (world.save.abilities[pk.ability]) continue;
      const r = rect(pk.x - 16, pk.y - 16, 40, 40);
      if (aabb(pbox, r)) grantAbility(pk.ability, mapData.abilities[pk.ability]?.label || pk.ability);
    }

    if (player.y > room.height + 80) {
      if (player.dashing > 0) { /* might recover */ }
      damagePlayer(1, player.x);
      const c = world.save.checkpoint;
      const pos = spawnFrom(c, c.kind || "start");
      if (world.roomId !== c.room) enterRoom(c.room, c, c.kind || "start");
      else { player.x = pos.x; player.y = pos.y; player.vx = 0; player.vy = 0; }
    }

    // animation
    player.animT += dt;
    if (player.dashing > 0) player.anim = "dash";
    else if (player.attacking > 0) player.anim = "attack";
    else if (!player.onGround) player.anim = "jump";
    else if (Math.abs(player.vx) > 30) player.anim = "walk";
    else player.anim = "idle";
    const len = (images.player[player.anim] || []).filter(Boolean).length || 1;
    const spd = player.anim === "walk" ? 16 : player.anim === "idle" ? 8 : 24;
    let frameF;
    if (player.anim === "jump") {
      const t = (player.vy + 960) / 1760;
      frameF = Math.max(1, Math.min(len - 1, 1 + t * (len - 1)));
    } else if (player.anim === "attack") {
      frameF = Math.min(len - 1 - 1e-6, (ATK_DUR - player.attacking) / ATK_DUR * len);
    } else if (player.anim === "dash") {
      frameF = Math.min(len - 1 - 1e-6, (0.16 - player.dashing) / 0.16 * len);
    } else {
      frameF = (player.animT * spd) % len;
    }
    player.frame = Math.floor(frameF) % len;
    player.frameBlend = frameF - Math.floor(frameF);
  }


  function updateEnemies(dt) {
    const room = currentRoom();
    const solids = room.solids;
    const pbox = rect(player.x, player.y, player.w, player.h);
    const ab = attackBox();
    for (const e of room.enemies) {
      if (e.type === "heart") {
        if (!e.alive) continue;
        if (aabb(pbox, e)) {
          e.alive = false;
          world.save.maxHp += 1;
          world.save.hp = world.save.maxHp;
          world.save.hearts[room.id] = true;
          persist();
          world.hint = "生命上限提升了。";
          world.hintT = 2;
          sfx.pickup();
        }
        continue;
      }
      if (!e.alive) continue;
      e.t += dt;
      if (e.hurt > 0) e.hurt -= dt;
      if (e.cd > 0) e.cd -= dt;
      e.vy += 2200 * dt;
      if (e.type === "wisp") {
        e.vy = Math.sin(e.t * 3) * 20;
        const on = moveActor(e, dt, solids, { roomW: room.width, wall: true, speed: 50 });
        if (on) e.vy = Math.min(e.vy, 0);
        if (e.x < 40 || e.x + e.w > room.width - 40) e.vx *= -1;
      } else if (e.type === "imp" || e.type === "elite") {
        const on = moveActor(e, dt, solids, { roomW: room.width });
        if (on && Math.random() < 0.008) e.vy = -620;
        if (e.x < 30 || e.x + e.w > room.width - 30) e.vx *= -1;
        if (player.x + player.w / 2 < e.x) e.vx = -Math.abs(e.vx) || -60;
        else e.vx = Math.abs(e.vx) || 60;
        e.vx = Math.max(-90, Math.min(90, e.vx));
      } else if (e.type === "boss") {
        if (e.hp <= e.maxHp * 0.5) e.phase = 2;
        const cx = 240 + 400;
        const target = cx + Math.sin(e.t * 0.6) * 220;
        e.vx = Math.max(-140, Math.min(140, (target - (e.x + e.w / 2)) * 2));
        // stay on top platform y=240
        const on = moveActor(e, dt, solids, { roomW: room.width });
        if (e.cd <= 0) {
          e.cd = e.phase === 2 ? 1.4 : 2.0;
          const dir = player.x > e.x ? 1 : -1;
          e.shots.push({ x: e.x + e.w / 2, y: e.y + 40, vx: dir * 220, vy: -40, life: 3 });
          if (e.phase === 2) e.shots.push({ x: e.x + e.w / 2, y: e.y + 40, vx: dir * 160, vy: -180, life: 3 });
        }
      }
      e.shots = (e.shots || []).filter((s) => {
        s.life -= dt; s.vy += 400 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        const sb = rect(s.x - 7, s.y - 7, 14, 14);
        if (aabb(pbox, sb)) { damagePlayer(1, s.x); return false; }
        return s.life > 0 && s.y < room.height + 40;
      });

      if (ab && aabb(ab, e) && e.hurt <= 0) {
        e.hp -= 1;
        e.hurt = 0.28;
        e.vx += player.facing * 180;
        e.vy = Math.min(e.vy, -140);
        sfx.hit();
        world.hitstop = Math.max(world.hitstop, e.type === "boss" ? 0.1 : 0.07);
        world.shakeT = 0.2;
        world.shakeMag = e.type === "boss" ? 10 : 7;
        for (let i = 0; i < 6; i++) {
          fx.push({
            t: 0.18 + Math.random() * 0.1,
            x: e.x + e.w * Math.random(),
            y: e.y + e.h * (0.2 + Math.random() * 0.6),
            vx: player.facing * (80 + Math.random() * 140),
            vy: -40 - Math.random() * 120,
            kind: "hit"
          });
        }
        if (e.hp <= 0) {
          e.alive = false;
          if (e.type === "boss") {
            world.save.bossDown = true;
            persist();
            sfx.win();
            state = "ending";
          }
        }
      }
      if (e.alive && e.hurt <= 0 && aabb(pbox, e)) damagePlayer(e.dmg, e.x + e.w / 2);
    }
  }

  function updateCamera() {
    const room = currentRoom();
    const safeH = VIEW_H; // world space always 720 logical, touch is CSS overlay in landscape; in portrait canvas letterboxes
    let tx = player.x + player.w / 2 - VIEW_W / 2;
    let ty = player.y + player.h / 2 - VIEW_H / 2;
    tx = Math.max(0, Math.min(Math.max(0, room.width - VIEW_W), tx));
    ty = Math.max(0, Math.min(Math.max(0, room.height - VIEW_H), ty));
    world.cam.x += (tx - world.cam.x) * 0.14;
    world.cam.y += (ty - world.cam.y) * 0.14;
    if (world.shakeT > 0) {
      const m = world.shakeMag * (world.shakeT / 0.2);
      world.cam.sx = (Math.random() * 2 - 1) * m;
      world.cam.sy = (Math.random() * 2 - 1) * m * 0.6;
    } else {
      world.cam.sx = 0;
      world.cam.sy = 0;
    }
  }

  function drawCreature(e, x, y, w, h, flash) {
    const spr = e.sprite && images.enemies[e.sprite];
    if (spr) {
      const scale = h / spr.height;
      const dw = spr.width * scale, dh = h;
      const px = x + w / 2, py = y + h;
      ctx.save();
      ctx.translate(px, py);
      if (e.vx < 0) ctx.scale(-1, 1);
      if (flash) ctx.filter = "brightness(1.8) contrast(1.15)";
      ctx.drawImage(spr, -dw / 2, -dh, dw, dh);
      ctx.filter = "none";
      ctx.restore();
      return;
    }
    const body = flash ? "#f3ead4" : e.color;
    const eye = flash ? "#6a1010" : "#c8b48a";
    const ink = flash ? "#5a2018" : "#0c0a10";
    ctx.fillStyle = body;
    if (e.type === "wisp") {
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w * 0.42, h * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + 10, w * 0.28, h * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = eye;
      ctx.beginPath(); ctx.arc(x + w * 0.35, y + h * 0.42, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w * 0.65, y + h * 0.42, 2.2, 0, Math.PI * 2); ctx.fill();
      return;
    }
    // hooded / armored body
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + 2);
    ctx.lineTo(x + w - 2, y + h * 0.28);
    ctx.lineTo(x + w * 0.86, y + h);
    ctx.lineTo(x + w * 0.14, y + h);
    ctx.lineTo(x + 2, y + h * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (e.type === "elite" || e.type === "boss") {
      ctx.fillStyle = flash ? "#e8dcc0" : "#4a4550";
      ctx.fillRect(x + w * 0.18, y + 4, w * 0.64, h * 0.22);
      ctx.fillStyle = ink;
      ctx.fillRect(x + w * 0.22, y + h * 0.12, w * 0.56, 4);
    }
    if (e.type === "boss") {
      ctx.fillStyle = flash ? "#f0e0b0" : "#6a5a28";
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + w * 0.5, y - 14);
      ctx.lineTo(x + w - 8, y + 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = eye;
    ctx.fillRect(x + w * 0.28, y + h * 0.32, 5, 3);
    ctx.fillRect(x + w * 0.62, y + h * 0.32, 5, 3);
  }

  function drawRoundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function drawBackground(room) {
    const pal = room.palette || ["#14122a", "#6b7ea8"];
    ctx.fillStyle = pal[0];
    ctx.fillRect(world.cam.x, world.cam.y, VIEW_W, VIEW_H);
    const far = room.parallax && images.bg[room.parallax];
    const near = room.background && images.bg[room.background];
    const drawCover = (img, factor) => {
      const x = world.cam.x * factor;
      const y = world.cam.y * Math.min(1, factor + 0.4);
      const dw = room.width, dh = room.height;
      const scale = Math.max(dw / img.width, dh / img.height);
      const sw = dw / scale, sh = dh / scale;
      const sx = (img.width - sw) / 2;
      const sy = 0;
      ctx.drawImage(img, sx, sy, sw, sh, x, y, dw, dh);
    };
    if (far) {
      ctx.globalAlpha = 1;
      drawCover(far, 0.35);
    }
    if (near) {
      ctx.globalAlpha = 1;
      drawCover(near, 0.08);
    } else {
      // procedural fallback
      ctx.fillStyle = pal[1] || "#334";
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 8; i++) ctx.fillRect(i * 280 + 40, 80, 40, room.height);
      ctx.globalAlpha = 1;
    }
  }

  function drawWorld() {
    const room = currentRoom();
    ctx.save();
    ctx.translate(-(world.cam.x + (world.cam.sx || 0)), -(world.cam.y + (world.cam.sy || 0)));
    drawBackground(room);
    ctx.fillStyle = "rgba(6, 4, 12, 0.10)";
    ctx.fillRect(world.cam.x, world.cam.y, VIEW_W, VIEW_H);

    // solids — thin walkable ledges so background art stays visible
    for (const s of room.solids) {
      const isFloor = s.y + s.h >= room.height - 8;
      const isWall = s.h > 64 && s.w <= 96;
      if (isWall) {
        const grd = ctx.createLinearGradient(s.x, 0, s.x + s.w, 0);
        grd.addColorStop(0, "rgba(28, 26, 48, 0.55)");
        grd.addColorStop(1, "rgba(28, 26, 48, 0.15)");
        ctx.fillStyle = grd;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "rgba(230, 220, 190, 0.45)";
        ctx.fillRect(s.x + s.w - 3, s.y, 3, s.h);
        continue;
      }
      if (isFloor) {
        ctx.fillStyle = "rgba(12, 10, 24, 0.35)";
        ctx.fillRect(s.x, s.y + 8, s.w, s.h - 8);
        ctx.fillStyle = "rgba(168, 150, 120, 0.9)";
        ctx.fillRect(s.x, s.y, s.w, 5);
        ctx.fillStyle = "rgba(70, 66, 96, 0.55)";
        ctx.fillRect(s.x, s.y + 5, s.w, 8);
        continue;
      }
      // floating / mid platforms: stone ledge
      const grd = ctx.createLinearGradient(0, s.y, 0, s.y + Math.min(s.h, 36));
      grd.addColorStop(0, "rgba(150, 132, 108, 0.95)");
      grd.addColorStop(0.2, "rgba(120, 114, 150, 0.92)");
      grd.addColorStop(1, "rgba(46, 42, 70, 0.88)");
      ctx.fillStyle = grd;
      const visH = Math.min(s.h, 28);
      ctx.fillRect(s.x, s.y, s.w, visH);
      ctx.fillStyle = "rgba(190, 170, 130, 0.7)";
      ctx.fillRect(s.x, s.y, s.w, 3);
      ctx.fillStyle = "rgba(10, 8, 20, 0.35)";
      ctx.fillRect(s.x + 2, s.y + visH, s.w - 4, 4);
    }

    // locked gap shimmer
    for (const g of room.gaps || []) {
      if (g.need && !world.save.abilities[g.need]) {
        ctx.fillStyle = "rgba(140, 180, 255, 0.12)";
        ctx.fillRect(g.x, g.y - 80, g.w, 80);
        ctx.strokeStyle = "rgba(180, 210, 255, 0.5)";
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(g.x + 4, g.y - 76, g.w - 8, 72);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(230, 236, 255, 0.85)";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(g.need === "dash" ? "需要衝刺" : "需要二段跳", g.x + g.w / 2, g.y - 40);
      }
    }

    for (const d of room.doors || []) {
      const locked = d.need && !world.save.abilities[d.need];
      drawRoundRect(d.x, d.y, d.w, d.h, 8, locked ? "rgba(40,30,50,0.8)" : "rgba(40, 50, 90, 0.85)", locked ? "#8a6a8a" : "#d8c07a");
      if (locked) {
        ctx.fillStyle = "#d8c07a";
        ctx.font = "18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("鎖", d.x + d.w / 2, d.y + d.h / 2 + 6);
      }
    }

    for (const b of room.checkpoints || []) {
      ctx.fillStyle = "#5a4030";
      ctx.fillRect(b.x, b.y + 8, 44, 10);
      ctx.fillRect(b.x + 6, b.y - 6, 6, 20);
      ctx.fillRect(b.x + 32, b.y - 6, 6, 20);
      ctx.fillStyle = "#e8d4a8";
      ctx.fillRect(b.x + 2, b.y, 40, 8);
    }

    for (const pk of room.pickups || []) {
      if (world.save.abilities[pk.ability]) continue;
      const bounce = Math.sin(world.time * 4) * 6;
      ctx.save();
      ctx.translate(pk.x + 8, pk.y + bounce);
      ctx.fillStyle = "rgba(226, 197, 108, 0.25)";
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e2c56c";
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff8d8";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(mapData.abilities[pk.ability]?.label || "", 0, 28);
      ctx.restore();
    }

    for (const e of room.enemies) {
      if (!e.alive && e.type !== "heart") continue;
      if (e.type === "heart") {
        if (!e.alive) continue;
        ctx.fillStyle = "#e07080";
        ctx.beginPath();
        ctx.moveTo(e.x + 12, e.y + 20);
        ctx.bezierCurveTo(e.x - 8, e.y + 4, e.x + 4, e.y - 8, e.x + 12, e.y + 4);
        ctx.bezierCurveTo(e.x + 20, e.y - 8, e.x + 32, e.y + 4, e.x + 12, e.y + 20);
        ctx.fill();
        continue;
      }
      ctx.save();
      const x = e.x, y = e.y, w = e.w, h = e.h;
      const flash = e.hurt > 0 && Math.floor(e.hurt * 24) % 2 === 0;
      drawCreature(e, x, y, w, h, flash);
      if (e.type === "boss") {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(x, y - 22, w, 7);
        ctx.fillStyle = "#8a2020";
        ctx.fillRect(x, y - 22, w * (e.hp / e.maxHp), 7);
        ctx.strokeStyle = "rgba(200, 170, 110, 0.5)";
        ctx.strokeRect(x, y - 22, w, 7);
      }
      for (const s of e.shots || []) {
        ctx.fillStyle = flash ? "#fff0d0" : "#7a5a22";
        ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255, 210, 120, 0.55)";
        ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    // player
    drawPlayer();

    const ab = attackBox();
    if (ab) {
      const midY = ab.y + ab.h * 0.45;
      const from = player.facing > 0 ? ab.x : ab.x + ab.w;
      const to = player.facing > 0 ? ab.x + ab.w : ab.x;
      const g = ctx.createLinearGradient(from, midY, to, midY);
      g.addColorStop(0, "rgba(255, 244, 210, 0)");
      g.addColorStop(0.55, "rgba(255, 236, 190, 0.55)");
      g.addColorStop(1, "rgba(255, 252, 230, 0.9)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(from, midY + 6);
      ctx.lineTo(to, midY - 2);
      ctx.stroke();
    }

    for (const f of fx) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.t * 5));
      if (f.kind === "hit") {
        ctx.fillStyle = "#e8dcb0";
        ctx.fillRect(f.x, f.y, 3, 8);
      } else {
        ctx.fillStyle = "rgba(200, 210, 230, 0.7)";
        ctx.fillRect(f.x, f.y, 16, 28);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // vignette in screen space
    const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H * 0.55, VIEW_H * 0.22, VIEW_W / 2, VIEW_H * 0.55, VIEW_H * 0.82);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.30)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawPlayer() {
    const flick = (player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0) ? 0.45 : 1;
    const frames = images.player[player.anim] || [];
    const fr = frames[player.frame] || frames[0];
    const wrap = player.anim === "walk" || player.anim === "idle";
    const next = (player.frame + 1 < frames.length) ? frames[player.frame + 1] : (wrap ? frames[0] : null);
    const blend = Math.max(0, Math.min(1, player.frameBlend || 0));
    const scale = 128 / SPRITE.charH;
    const dw = SPRITE.frameW * scale;
    const dh = SPRITE.frameH * scale;
    const ax = SPRITE.anchorX * scale;
    const ay = SPRITE.anchorY * scale;
    const px = player.x + player.w / 2;
    const py = player.y + player.h;
    ctx.save();
    if (fr && fr.img) {
      ctx.translate(px, py);
      if (player.facing < 0) ctx.scale(-1, 1);
      const blit = (frame, alpha) => {
        if (!frame || !frame.img || alpha < 0.02) return;
        ctx.globalAlpha = flick * alpha;
        ctx.drawImage(frame.img, frame.sx, frame.sy, frame.sw, frame.sh, -ax, -ay, dw, dh);
      };
      if (next && next.img && blend > 0.02) {
        blit(fr, 1 - blend);
        blit(next, blend);
      } else {
        blit(fr, 1);
      }
      ctx.globalAlpha = 1;
    } else if (images.front) {
      const img = images.front;
      const h = 128, w = img.width * (h / img.height);
      ctx.drawImage(img, px - w / 2, py - h, w, h);
    } else {
      ctx.fillStyle = "#f0d48a";
      ctx.fillRect(player.x, player.y, player.w, player.h);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    // hearts
    for (let i = 0; i < world.save.maxHp; i++) {
      ctx.fillStyle = i < world.save.hp ? "#e07080" : "rgba(80,40,50,0.7)";
      const x = 24 + i * 28, y = 18;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 14);
      ctx.bezierCurveTo(x - 6, y + 2, x + 2, y - 6, x + 8, y + 2);
      ctx.bezierCurveTo(x + 14, y - 6, x + 22, y + 2, x + 8, y + 14);
      ctx.fill();
    }
    ctx.font = "16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#e2c56c";
    const abs = [];
    if (world.save.abilities.dash) abs.push("衝刺");
    if (world.save.abilities.doubleJump) abs.push("二段跳");
    ctx.fillText(abs.length ? abs.join(" · ") : "尚未取得新能力", 24, 56);
    const room = currentRoom();
    ctx.fillStyle = "#f3ead7";
    ctx.fillText(room.name, 24, 80);

    if (world.hintT > 0) {
      ctx.globalAlpha = Math.min(1, world.hintT);
      drawRoundRect(VIEW_W / 2 - 280, 92, 560, 40, 8, "rgba(16,14,36,0.78)", "rgba(226,197,108,0.4)");
      ctx.fillStyle = "#f3ead7";
      ctx.textAlign = "center";
      ctx.font = "18px sans-serif";
      ctx.fillText(world.hint, VIEW_W / 2, 118);
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";
    }
    drawMinimap();
  }

  function drawMinimap() {
    const layout = {
      R4: { x: 96, y: 0, w: 48, h: 36 },
      R2: { x: 0, y: 44, w: 72, h: 28 },
      R1: { x: 76, y: 44, w: 88, h: 28 },
      R3: { x: 168, y: 44, w: 72, h: 28 },
      R5: { x: 86, y: 80, w: 68, h: 24 }
    };
    const bw = 260, bh = 122, bx = VIEW_W - bw - 18, by = 14;
    drawRoundRect(bx, by, bw, bh, 10, "rgba(12,10,28,0.78)", "rgba(226,197,108,0.35)");
    ctx.fillStyle = "#e2c56c";
    ctx.font = "12px sans-serif";
    ctx.fillText("地圖", bx + 12, by + 16);
    const ox = bx + 10, oy = by + 24;
    for (const [id, r] of Object.entries(layout)) {
      const known = world.save.discovered[id];
      const current = world.roomId === id;
      ctx.globalAlpha = known ? 1 : 0.25;
      ctx.fillStyle = current ? "#e2c56c" : known ? "#4d5d8a" : "#2a2a40";
      ctx.fillRect(ox + r.x, oy + r.y, r.w, r.h);
      ctx.strokeStyle = current ? "#fff4c8" : "rgba(255,255,255,0.25)";
      ctx.strokeRect(ox + r.x, oy + r.y, r.w, r.h);
      if (known) {
        ctx.fillStyle = "#f3ead7";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        const names = { R1: "中庭", R2: "西廊", R3: "圖書館", R4: "鐘樓", R5: "地下" };
        ctx.fillText(names[id], ox + r.x + r.w / 2, oy + r.y + r.h / 2 + 4);
      }
      ctx.globalAlpha = 1;
    }
    // player dot
    const room = currentRoom();
    const lr = layout[world.roomId];
    if (lr && room) {
      const px = ox + lr.x + (player.x / room.width) * lr.w;
      const py = oy + lr.y + (player.y / room.height) * lr.h;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.textAlign = "left";
  }

  function drawOverlayText(title, lines, footer) {
    ctx.fillStyle = "rgba(8,7,18,0.72)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#f3ead7";
    ctx.textAlign = "center";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(title, VIEW_W / 2, 220);
    ctx.font = "22px sans-serif";
    ctx.fillStyle = "#c9d2e8";
    (lines || []).forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, 290 + i * 36));
    if (footer) {
      ctx.fillStyle = "#e2c56c";
      ctx.font = "20px sans-serif";
      ctx.fillText(footer, VIEW_W / 2, 560);
    }
    ctx.textAlign = "left";
  }

  function drawTitle() {
    ctx.fillStyle = "#14122a";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const bg = images.bg["art/bg-courtyard-far-dark.jpg"] || images.bg["art/bg-courtyard-dark.jpg"];
    if (bg) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(bg, 0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "rgba(10,8,24,0.45)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f3ead7";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText("月下學園", VIEW_W / 2, 92);
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#c9d2e8";
    ctx.fillText("2D 類銀河惡魔城　開頭試玩版", VIEW_W / 2, 128);
    const port = images.title || images.front;
    if (port) {
      const ph = 300, pw = port.width * (ph / port.height);
      ctx.drawImage(port, VIEW_W / 2 - pw / 2, 150, pw, ph);
    }
    ctx.fillStyle = "#e2c56c";
    ctx.font = "22px sans-serif";
    ctx.fillText("點擊畫面或按 Enter 開始", VIEW_W / 2, 640);
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#b7c0d8";
    ctx.fillText("手機：左方向　右跳／攻擊／互動　取得衝刺後可點衝刺或連點方向", VIEW_W / 2, 676);
    ctx.textAlign = "left";
  }

  function drawHelp() {
    drawOverlayText("操作說明", [
      "見到暫時過不去的路，取得新能力後再走回頭打開。",
      "鍵盤：方向鍵／WASD 移動，空白或 W 跳躍，J 攻擊，E 互動",
      "衝刺：Shift／L，或短時間連按同一方向",
      "手機：左側虛擬方向，右側跳躍、攻擊、互動",
      "長椅可回復生命並設為檢查點。Esc 暫停，M 靜音，H 說明。"
    ], "再點一次或按 H／Enter 關閉");
  }

  let last = 0;
  function loop(ts) {
    const dt = Math.min(0.033, (ts - last) / 1000 || 0.016);
    last = ts;
    tick(dt);
    render();
    requestAnimationFrame(loop);
  }

  function tick(dt) {
    if (input.mutePressed) { setMuted(!audio.muted); input.mutePressed = false; }
    if (state === "playing") {
      if (input.pausePressed) { state = "paused"; input.pausePressed = false; }
      if (input.helpPressed) { state = "help"; input.helpPressed = false; }
      world.time += dt;
      if (world.hintT > 0) world.hintT -= dt;
      if (world.shakeT > 0) world.shakeT = Math.max(0, world.shakeT - dt);
      let adt = dt;
      if (world.hitstop > 0) {
        world.hitstop -= dt;
        adt = 0;
      }
      if (world.fadeDir !== 0) {
        world.fade += world.fadeDir * dt * 4;
        if (world.fade >= 1) { world.fade = 1; applyEnter(); world.fadeDir = -1; }
        if (world.fade <= 0) { world.fade = 0; world.fadeDir = 0; }
      } else {
        updatePlayer(adt);
        updateEnemies(adt);
        // teases
        maybeTease();
      }
      updateCamera();
      for (const f of fx) {
        f.t -= dt;
        if (f.vx) f.x += f.vx * dt;
        if (f.vy) { f.y += f.vy * dt; f.vy += 400 * dt; }
      }
      for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t <= 0) fx.splice(i, 1);
    } else if (state === "title") {
      if (input.confirmPressed || input.attackPressed || input.jumpPressed) startGame(false);
      if (input.helpPressed) { state = "help-title"; input.helpPressed = false; }
    } else if (state === "help" || state === "help-title" || state === "paused" || state === "banner" || state === "dead" || state === "ending") {
      if (state === "banner") {
        world.bannerT -= dt;
        if (world.bannerT <= 0 || input.confirmPressed || input.jumpPressed || input.attackPressed) state = "playing";
      } else if (state === "paused") {
        if (input.pausePressed || input.confirmPressed) { state = "playing"; input.pausePressed = false; }
        if (input.helpPressed) { state = "help"; input.helpPressed = false; }
      } else if (state === "help") {
        if (input.helpPressed || input.confirmPressed || input.jumpPressed) { state = "playing"; input.helpPressed = false; }
      } else if (state === "help-title") {
        if (input.helpPressed || input.confirmPressed || input.jumpPressed) { state = "title"; input.helpPressed = false; }
      } else if (state === "dead") {
        if (input.confirmPressed || input.jumpPressed || keys.has("r")) respawn();
      } else if (state === "ending") {
        if (input.confirmPressed || input.jumpPressed) state = "title";
      }
    }
    input.jumpPressed = false;
    input.attackPressed = false;
    input.dashPressed = false;
    input.interactPressed = false;
    input.pausePressed = false;
    input.helpPressed = false;
    input.confirmPressed = false;
  }

  function maybeTease() {
    const room = currentRoom();
    if (room.id !== "R1" || world.hintT > 0) return;
    if (!world.save.abilities.doubleJump && player.x < 500 && player.y < 400) {
      world.hint = "西側高台通往鐘樓，現在還跳不上去。";
      world.hintT = 2.5;
    } else if (!world.save.abilities.dash && player.x > 1600 && player.y > 400) {
      world.hint = "東側斷橋太寬，普通跳躍過不去。";
      world.hintT = 2.5;
    }
  }

  function render() {
    ctx.imageSmoothingEnabled = true;
    if (state === "boot") {
      ctx.fillStyle = "#14122a";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#c9d2e8";
      ctx.font = "24px sans-serif";
      ctx.fillText("載入中…", 40, 80);
      return;
    }
    if (state === "title" || state === "help-title") {
      drawTitle();
      if (state === "help-title") drawHelp();
      return;
    }
    drawWorld();
    drawHud();
    if (world.fade > 0) {
      ctx.fillStyle = `rgba(8,7,18,${world.fade})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (state === "paused") drawOverlayText("暫停", ["按 Enter 或 Esc 繼續", "H 查看操作說明"], "");
    if (state === "help") drawHelp();
    if (state === "banner" && world.banner) {
      drawRoundRect(VIEW_W / 2 - 260, 240, 520, 160, 16, "rgba(16,14,36,0.92)", "#e2c56c");
      ctx.textAlign = "center";
      ctx.fillStyle = "#e2c56c";
      ctx.font = "20px sans-serif";
      ctx.fillText(world.banner.title, VIEW_W / 2, 290);
      ctx.fillStyle = "#f3ead7";
      ctx.font = "bold 40px sans-serif";
      ctx.fillText(world.banner.body, VIEW_W / 2, 340);
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#c9d2e8";
      ctx.fillText(world.banner.id === "dash" ? "連點方向或按衝刺，越過斷橋。" : "在空中再跳一次，登上鐘樓高台。", VIEW_W / 2, 376);
      ctx.textAlign = "left";
    }
    if (state === "dead") drawOverlayText("倒下了", ["從最近的長椅重新出發。"], "點擊或按 R／跳躍 重試");
    if (state === "ending") drawOverlayText("鐘樓的夜鳴停了", ["開頭切片到此結束。", "你已用衝刺與二段跳打開先前過不去的路。"], "點擊返回標題");
  }

  function startGame(fresh) {
    ensureAudio();
    if (audio.ctx && audio.ctx.state === "suspended") audio.ctx.resume();
    startBgm();
    let save = defaultSave();
    if (!fresh) {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) save = { ...defaultSave(), ...JSON.parse(raw), abilities: { ...defaultSave().abilities, ...(JSON.parse(raw).abilities || {}) } };
      } catch (_) {}
    }
    world = createWorld(save);
    player = createPlayer(save);
    state = "playing";
    ensureDashButton();
    updateCamera();
    world.cam.x = player.x + player.w / 2 - VIEW_W / 2;
    world.cam.y = player.y + player.h / 2 - VIEW_H / 2;
  }
  function respawn() {
    player.dead = false;
    world.save.hp = world.save.maxHp;
    const c = world.save.checkpoint;
    if (world.roomId !== c.room) {
      world.roomId = c.room;
      world.save.discovered[c.room] = true;
    }
    const pos = spawnFrom(c, c.kind || "start");
    player.x = pos.x; player.y = pos.y; player.vx = 0; player.vy = 0; player.invuln = 1;
    state = "playing";
  }

  canvas.addEventListener("pointerdown", () => {
    ensureAudio();
    if (state === "title") startGame(false);
    else if (state === "dead") respawn();
    else if (state === "ending") state = "title";
    else if (state === "banner") state = "playing";
    else if (state === "paused") state = "playing";
    else if (state === "help") state = "playing";
    else if (state === "help-title") state = "title";
  });

  loadAll().then(() => {
    state = "title";
    if (/[?&]play=1\b/.test(location.search)) startGame(true);
  }).catch((err) => {
    state = "title";
    console.error(err);
  });
  requestAnimationFrame(loop);
})();
