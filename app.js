/* Max & Schmanny – Lernabenteuer
   Skill-System: Leitner-Kästen (1–6) mit wachsenden Abständen, Einstufung über erste Antworten,
   Freischalten nach Können, adaptive Menge neuer Aufgaben, Wiederholung nach Fehlern. */
(function () {
  'use strict';
  const D = window.APPDATA;
  const app = document.getElementById('app');
  // Android-App (Capacitor): eigene Sprachausgabe, Mikrofon, Zurück-Taste
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  // Kevin testet im Claude-Artefakt (Web): nie Tageslimit, alles offen. Dianas Tablet ist NATIVE.
  const KEVIN_WEB = !NATIVE && !window.__VIEWER && !window.__forceTablet;
  const plug = (n) => { try { return NATIVE && window.Capacitor.registerPlugin ? window.Capacitor.registerPlugin(n) : null; } catch (e) { return null; } };
  const NTTS = plug('TextToSpeech');
  const CAN_MIC = NATIVE && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  let onHome = false;

  // ---------- Helfer ----------
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'style') e.style.cssText = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(3)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return e;
  }
  function svgEl(markup, cls) { return h('span', { class: 'svgwrap ' + (cls || ''), html: markup }); }
  function dayNum(d = new Date()) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }
  function dayKey(n) { return new Date(n * 86400000).toISOString().slice(0, 10); }
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  // ---------- Speicher ----------
  const KEY = 'max-lernabenteuer-v2';
  const MIGRATE_ROUNDS = (st) => { if (st && st.posts && st.postsV !== 2) { st.posts.read = {}; st.postsV = 2; } if (st && st.settings && !st.m8) { if (st.settings.perSession === 12) st.settings.perSession = 8; st.m8 = 1; } return st; };
  function defaults() {
    return {
      v: 1, name: '', cat: 'bkh', catV: 2, ruName: '', tests: { lastAt: 0, list: [] },
      settings: { perDay: 2, perSession: 8, tts: false, sfx: true, dance: true, mal: false, write: true, music: true, menuMusic: true, menuVol: 12 },
      items: {}, days: {}, extra: { day: -1, n: 0 },
      story: { unlocked: 0, lastDay: -1, read: {} },
      stickers: { owned: [], worn: {}, seen: 0 },
      recent: [], newRecent: [], miles: {}, rec: {}, sessions: 0, force: [], checks: {}, tricks: {}, blitzMs: 3000, dances: [], posts: { read: {} }, mission: null, missionsDone: 0
    };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) { const d = defaults(); if (!s.catV) { s.cat = 'bkh'; s.catV = 2; } if (!s.tests) s.tests = { lastAt: s.sessions || 0, list: [] }; return Object.assign(d, s, { settings: Object.assign(d.settings, s.settings || {}), story: Object.assign(d.story, s.story || {}), stickers: Object.assign(d.stickers, s.stickers || {}) }); }
    } catch (e) { /* kein Speicher */ }
    return defaults();
  }
  let state = MIGRATE_ROUNDS(load());
  let storageOK = true;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; } catch (e) { storageOK = false; } }

  const IDB = (() => {
    let dbp = null;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise((res, rej) => {
        try { const r = indexedDB.open('max-lern-audio', 1); r.onupgradeneeded = () => r.result.createObjectStore('clips'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
        catch (e) { rej(e); }
      });
      return dbp;
    }
    function tx(mode, fn) {
      return open().then((db) => new Promise((res, rej) => {
        const t = db.transaction('clips', mode); const req = fn(t.objectStore('clips'));
        t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error);
      }));
    }
    return {
      get: (k) => tx('readonly', (s) => s.get(k)).catch(() => null),
      put: (k, v) => tx('readwrite', (s) => s.put(v, k)),
      del: (k) => tx('readwrite', (s) => s.delete(k)).catch(() => null),
      keys: () => tx('readonly', (s) => s.getAllKeys()).catch(() => [])
    };
  })();

  // ---------- Text ----------
  const TR = [['tsch', 'ч'], ['sch', 'ш'], ['ch', 'х'], ['ie', 'и'], ['ei', 'ай'], ['eu', 'ой'], ['äu', 'ой'], ['ja', 'я'], ['ju', 'ю'], ['jo', 'ё'], ['ph', 'ф'], ['th', 'т'], ['ck', 'к'], ['qu', 'кв'], ['ß', 'сс'], ['ä', 'э'], ['ö', 'ё'], ['ü', 'ю'], ['a', 'а'], ['b', 'б'], ['c', 'к'], ['d', 'д'], ['e', 'е'], ['f', 'ф'], ['g', 'г'], ['h', 'х'], ['i', 'и'], ['j', 'й'], ['k', 'к'], ['l', 'л'], ['m', 'м'], ['n', 'н'], ['o', 'о'], ['p', 'п'], ['q', 'к'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'], ['v', 'в'], ['w', 'в'], ['x', 'кс'], ['y', 'и'], ['z', 'ц']];
  function translit(n) {
    const w = (n || '').toLowerCase(); let out = ''; let i = 0;
    while (i < w.length) { const r = TR.find(([a]) => w.startsWith(a, i)); if (r) { out += r[1]; i += r[0].length; } else { out += w[i]; i++; } }
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  const ruName = () => state.ruName || translit(state.name) || 'я';
  function sub(t) { return t.replace(/\{N\}/g, state.name || 'du').replace(/\{RN\}/g, ruName()); }
  function plain(t) { return sub(t).replace(/[[\]]/g, '').replace(/·/g, 'mal').replace(/(\S)-(?=\S)/g, '$1'); }
  const WORD_CLIP = {};
  D.WORDS.forEach((w, i) => { WORD_CLIP[plain(w.w).toLowerCase()] = 'w:' + i; });

  function sylWord(raw) {
    const m = raw.match(/^([„"(]*)(.*?)([.,!?:;"“)…]*)$/);
    const pre = m[1], core = m[2], post = m[3];
    const w = h('span', { class: 'w' });
    if (pre) w.append(pre);
    let p = core;
    if (core === '{N}') { p = state.name || 'du'; w.append(h('span', { class: 'sy s0' }, p)); }
    else if (!/[A-Za-zÄÖÜäöüß0-9]/.test(core)) { w.append(core); }
    else { core.split('-').forEach((s, i) => w.append(h('span', { class: 'sy s' + (i % 2) }, s))); p = core.replace(/-/g, ''); }
    if (post) w.append(h('span', { class: 'punct' }, post));
    return { el: w, plain: p };
  }
  // Text mit Silbenbögen. help(word) = Antippen liest das Wort vor.
  function textEl(text, opt = {}) {
    const box = h('div', { class: 'txt ' + (opt.cls || '') });
    text.split(' ').forEach((tok) => {
      if (!tok) return;
      const gap = tok.match(/^\[(.+?)\](.*)$/);
      if (gap && opt.gap) { const g = h('span', { class: 'gapbox' }, '?'); opt.gapRef && opt.gapRef(g, gap[1]); box.append(g); if (gap[2]) box.append(h('span', { class: 'punct' }, gap[2])); box.append(' '); return; }
      const { el, plain: p } = sylWord(tok.replace(/[[\]]/g, ''));
      if (opt.help && /[A-Za-zÄÖÜäöüß]/.test(p)) { el.classList.add('tap'); el.addEventListener('click', () => opt.help(p, el)); }
      box.append(el, ' ');
    });
    return box;
  }

  // ---------- Stimme & Töne ----------
  const Voice = (() => {
    const audio = new Audio(); let token = 0; let deVoice = null; let ruVoice = null; const urlCache = {};
    function loadVoices() { try { const vs = speechSynthesis.getVoices(); deVoice = vs.find((v) => /^de[-_]DE/i.test(v.lang)) || vs.find((v) => /^de/i.test(v.lang)) || null; ruVoice = vs.find((v) => /^ru/i.test(v.lang)) || null; } catch (e) { } }
    let ruNative = null;
    if (NTTS) { try { NTTS.isLanguageSupported({ lang: 'ru-RU' }).then((r) => { ruNative = !!(r && r.supported); }, () => { ruNative = false; }); } catch (e) { } }
    function hasRu() { if (NTTS) return !!ruNative; loadVoices(); return !!ruVoice; }
    try { speechSynthesis.onvoiceschanged = loadVoices; loadVoices(); } catch (e) { }
    function has(id) { return !!(id && (state.rec[id] || (window.VOICE_PACK && window.VOICE_PACK[id]))); }
    async function srcFor(id) {
      if (state.rec[id]) {
        if (urlCache[id]) return urlCache[id];
        const b = await IDB.get(id);
        if (b) { urlCache[id] = URL.createObjectURL(b); return urlCache[id]; }
      }
      return (window.VOICE_PACK && window.VOICE_PACK[id]) || null;
    }
    function forget(id) { if (urlCache[id]) { URL.revokeObjectURL(urlCache[id]); delete urlCache[id]; } }
    function stop() { token++; try { audio.pause(); } catch (e) { } try { speechSynthesis.cancel(); } catch (e) { } if (NTTS) { try { NTTS.stop().catch(() => { }); } catch (e) { } } }
    function playUrl(url, my) {
      return new Promise((res) => {
        if (my !== token) return res();
        audio.onended = () => res(); audio.onerror = () => res();
        audio.src = url;
        try { const p = audio.play(); if (p && p.catch) p.catch(() => res()); } catch (e) { res(); }
      });
    }
    function tts(text, my, lang, force) {
      return new Promise((res) => {
        if ((!state.settings.tts && !force) || my !== token || !text) return res();
        if (NTTS) {
          try { NTTS.speak({ text, lang: lang === 'ru' ? 'ru-RU' : 'de-DE', rate: lang === 'ru' ? 0.85 : 0.95, pitch: 1.05, volume: 1, category: 'playback', queueStrategy: 0 }).then(() => res(), () => res()); } catch (e) { res(); }
          setTimeout(res, 2500 + text.length * 120); return;
        }
        if (!('speechSynthesis' in window)) return res();
        try {
          const u = new SpeechSynthesisUtterance(text);
          if (lang === 'ru') { u.lang = 'ru-RU'; if (ruVoice) u.voice = ruVoice; u.rate = 0.8; }
          else { u.lang = 'de-DE'; if (deVoice) u.voice = deVoice; u.rate = 0.88; }
          u.pitch = 1.05;
          let done = false; const fin = () => { if (!done) { done = true; res(); } };
          u.onend = fin; u.onerror = fin; speechSynthesis.speak(u);
          setTimeout(fin, 1500 + text.length * 110);
        } catch (e) { res(); }
      });
    }
    // part = {id, text} oder {ids:[...], text}
    async function say(parts) {
      stop(); const my = token; try { MenuMusic.duck(true); } catch (e) { }
      try { return await say2(parts, my); } finally { if (my === token) { try { MenuMusic.duck(false); } catch (e) { } } }
    }
    async function say2(parts, my) {
      for (const p of (parts || []).filter(Boolean)) {
        if (my !== token) return;
        if (p.ids) {
          if (p.ids.every(has)) { for (const id of p.ids) { const u = await srcFor(id); if (my !== token) return; if (u) await playUrl(u, my); } }
          else await tts(p.text, my, p.lang, p.force);
        } else if (has(p.id)) { const u = await srcFor(p.id); if (my !== token) return; if (u) await playUrl(u, my); else await tts(p.text, my, p.lang, p.force); }
        else await tts(p.text, my, p.lang, p.force);
      }
    }
    return { say, stop, has, srcFor, forget, hasRu };
  })();
  const P = (id) => ({ id, text: D.PROMPTS[id] || D.PROMPTS2[id] || D.PROMPTS3[id] || (D.PROMPTS4 || {})[id] });

  const SFX = (() => {
    let ctx = null;
    function c() {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => { });
      return ctx;
    }
    function tone(f, t0, dur, type = 'sine', vol = 0.16) {
      const x = c(); if (!x || !state.settings.sfx) return;
      try {
        const o = x.createOscillator(), g = x.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, x.currentTime + t0);
        g.gain.exponentialRampToValueAtTime(vol, x.currentTime + t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, x.currentTime + t0 + dur);
        o.connect(g).connect(x.destination); o.start(x.currentTime + t0); o.stop(x.currentTime + t0 + dur + 0.05);
      } catch (e) { }
    }
    return {
      unlock: c, ctx: c,
      ok() { tone(784, 0, 0.16, 'triangle'); tone(1175, 0.09, 0.28, 'triangle'); },
      oops() { tone(330, 0, 0.2, 'sine', 0.12); tone(262, 0.14, 0.28, 'sine', 0.1); },
      tap() { tone(660, 0, 0.05, 'square', 0.04); },
      fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.32, 'triangle', 0.15)); }
    };
  })();

  // ---------- Figuren ----------
  const SLOT_POS = { head: [100, 34, 46], eyes: [100, 96, 50], neck: [100, 142, 34], feet: [100, 214, 34], hand: [170, 178, 40], body: [100, 180, 50] };
  const SLOT_POS_CAT = { head: [100, 50, 42], eyes: [100, 100, 48], neck: [100, 142, 32], feet: [100, 214, 30], hand: [172, 186, 38], body: [100, 178, 48] };
  function accSvg(worn, POS) { let a = ''; for (const slot in worn) { const st = D.STICKERS.find((x) => x.id === worn[slot]); if (!st || !POS[slot]) continue; const [x, y, fs] = POS[slot]; a += `<text x="${x}" y="${y}" font-size="${fs}" text-anchor="middle" dominant-baseline="middle">${st.e}</text>`; } return a; }
  // ---------- Kleidung richtig anziehen (Vektor, an die Figur angepasst) ----------
  const GEO = {
    max: { top: 47, ey: 90, eL: 80, eR: 120, er: 10, ny: 143, nw: 30, by: 140, legs: [[68, 94], [106, 132]], legTop: 166, feet: [[81, 214], [119, 214]], frx: 17, hand: [170, 180], hem: 200 },
    cat: { top: 53, ey: 95, eL: 76, eR: 124, er: 13, ny: 147, nw: 32, by: 142, legs: [[62, 98], [102, 138]], legTop: 174, feet: [[80, 212], [120, 212]], frx: 19, hand: [172, 186], hem: 202 }
  };
  const spark = (x, y, s, c) => `<path d="M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z" fill="${c || '#fff6a8'}"/>`;
  const starP = (x, y, R, r, c, st) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(1) + ' ' + (y + rr * Math.sin(a)).toFixed(1); } return `<path d="${d}Z" fill="${c}" ${st || ''}/>`; };
  const WEAR = {
    // Kopf
    krone: (G) => `<g transform="translate(100 ${G.top + 4})"><path d="M-27 0 L-31 -27 L-16 -13 L0 -34 L16 -13 L31 -27 L27 0 Z" fill="#f7c829" stroke="#b9850a" stroke-width="2" stroke-linejoin="round"/><rect x="-28" y="-7" width="56" height="9" rx="3" fill="#e2a90f" stroke="#b9850a" stroke-width="1.5"/><circle cx="0" cy="-3" r="3.6" fill="#e8344e"/><circle cx="-16" cy="-3" r="2.8" fill="#3aa0ff"/><circle cx="16" cy="-3" r="2.8" fill="#3fcf6a"/><circle cx="0" cy="-34" r="3" fill="#fff3a0"/><circle cx="-31" cy="-27" r="2.6" fill="#fff3a0"/><circle cx="31" cy="-27" r="2.6" fill="#fff3a0"/><path d="M-20 -18 L-14 -9" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/></g>`,
    zylinder: (G) => `<g transform="translate(100 ${G.top + 6})"><ellipse cx="0" cy="0" rx="36" ry="7" fill="#1b1b22"/><path d="M-21 0 L-23 -44 Q0 -49 23 -44 L21 0 Z" fill="#26262f"/><rect x="-22" y="-12" width="44" height="8" fill="#c8243c"/><ellipse cx="0" cy="-44" rx="23" ry="4.5" fill="#33333d"/><path d="M-15 -40 L-14 -16" stroke="#fff" stroke-width="2.5" opacity=".18" stroke-linecap="round"/></g>`,
    kappe: (G) => `<g transform="translate(100 ${G.top + 8})"><path d="M-33 2 Q-33 -31 0 -31 Q33 -31 33 2 Z" fill="#2f6fdc"/><path d="M-12 -30 Q-6 -10 -8 2 M12 -30 Q6 -10 8 2" stroke="#2557b3" stroke-width="2" fill="none"/><path d="M4 0 Q44 -6 58 6 Q36 12 4 6 Z" fill="#1f4fa8"/><circle cx="0" cy="-31" r="3.5" fill="#1f4fa8"/><path d="M-33 2 L33 2" stroke="#1f4fa8" stroke-width="3"/></g>`,
    schleife: (G) => `<g transform="translate(${G.eL - 6} ${G.top + 6}) rotate(-15)"><path d="M0 0 Q-24 -18 -26 0 Q-24 18 0 0 Z" fill="#ff5fa2" stroke="#d63c80" stroke-width="1.5"/><path d="M0 0 Q24 -18 26 0 Q24 18 0 0 Z" fill="#ff5fa2" stroke="#d63c80" stroke-width="1.5"/><path d="M-3 2 L-10 20 M3 2 L10 20" stroke="#ff5fa2" stroke-width="5" stroke-linecap="round"/><circle cx="0" cy="0" r="5.5" fill="#e0408a"/><circle cx="-14" cy="-5" r="2.5" fill="#fff" opacity=".7"/><circle cx="14" cy="-5" r="2.5" fill="#fff" opacity=".7"/></g>`,
    sonnenhut: (G) => `<g transform="translate(100 ${G.top + 8})"><ellipse cx="0" cy="0" rx="55" ry="11" fill="#f2cf72" stroke="#c9a14a" stroke-width="1.5"/><path d="M-25 1 Q-25 -27 0 -27 Q25 -27 25 1 Z" fill="#f6db86"/><path d="M-25 -4 Q0 2 25 -4 L25 1 Q0 7 -25 1 Z" fill="#ff7aa8"/><circle cx="18" cy="-3" r="5" fill="#fff"/><circle cx="18" cy="-3" r="2" fill="#ffd34d"/><path d="M-46 2 Q-30 6 -12 6" stroke="#c9a14a" stroke-width="1" fill="none" opacity=".6"/></g>`,
    kopfhoerer: (G) => { const y = G.ey - G.top + 4; return `<g transform="translate(100 ${G.top})"><path d="M-50 ${y - 6} Q-56 -16 0 -14 Q56 -16 50 ${y - 6}" stroke="#2b2b33" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="-62" y="${y - 20}" width="18" height="32" rx="8" fill="#ff4fa3" stroke="#2b2b33" stroke-width="3"/><rect x="44" y="${y - 20}" width="18" height="32" rx="8" fill="#ff4fa3" stroke="#2b2b33" stroke-width="3"/></g>`; },
    doktorhut: (G) => `<g transform="translate(100 ${G.top + 6})"><path d="M-22 -8 L-22 4 Q0 12 22 4 L22 -8 Z" fill="#1d1d26"/><path d="M-44 -12 L0 -27 L44 -12 L0 3 Z" fill="#26262f" stroke="#111" stroke-width="1.5"/><circle cx="0" cy="-12" r="2.6" fill="#f7c829"/><path d="M0 -12 L32 -8 L32 12" stroke="#f7c829" stroke-width="2.5" fill="none"/><path d="M29 10 L32 22 L35 10 Z" fill="#f7c829"/></g>`,
    stern: (G) => starP(G.eR + 8, G.top + 8, 13, 5.5, '#ffd84d', 'stroke="#e0a800" stroke-width="1.5"'),
    glitzer: (G) => spark(G.eL - 22, G.top + 2, 8) + spark(100, G.top - 12, 7, '#ffd1f0') + spark(G.eR + 24, G.top + 6, 9) + spark(G.eR + 34, G.ey - 8, 5, '#bdf3ff') + spark(G.eL - 32, G.ey - 4, 5, '#ffd1f0'),
    schmetterling: (G) => `<g transform="translate(${G.eR + 6} ${G.top + 6}) rotate(12)"><path d="M0 0 Q-20 -22 -22 -4 Q-20 6 0 0 Z" fill="#b06cff" stroke="#7a3fd0" stroke-width="1.5"/><path d="M0 0 Q20 -22 22 -4 Q20 6 0 0 Z" fill="#b06cff" stroke="#7a3fd0" stroke-width="1.5"/><path d="M0 1 Q-14 16 -12 6 Z M0 1 Q14 16 12 6 Z" fill="#ff8ad8"/><ellipse cx="0" cy="2" rx="2.3" ry="8" fill="#3b2457"/><circle cx="-12" cy="-8" r="3" fill="#fff" opacity=".6"/><circle cx="12" cy="-8" r="3" fill="#fff" opacity=".6"/></g>`,
    bluete: (G) => { let p = ''; for (let i = 0; i < 5; i++) { const a = i * 72 * Math.PI / 180; p += `<ellipse cx="${(9 * Math.cos(a)).toFixed(1)}" cy="${(9 * Math.sin(a)).toFixed(1)}" rx="8" ry="6" transform="rotate(${i * 72} ${(9 * Math.cos(a)).toFixed(1)} ${(9 * Math.sin(a)).toFixed(1)})" fill="#ffb3d1" stroke="#f07aa8" stroke-width="1"/>`; } return `<g transform="translate(${G.eL - 10} ${G.top + 8})">${p}<circle r="5" fill="#ffd34d"/></g>`; },
    // Augen
    brille: (G) => { const r = G.er + 5; return `<g><path d="M${G.eL - r - 8} ${G.ey - 4} L${G.eL - r} ${G.ey - 2} M${G.eR + r + 8} ${G.ey - 4} L${G.eR + r} ${G.ey - 2}" stroke="#111" stroke-width="3.5" stroke-linecap="round"/><rect x="${G.eL - r}" y="${G.ey - r + 2}" width="${2 * r}" height="${2 * r - 4}" rx="${r - 3}" fill="#111" stroke="#000" stroke-width="2.5"/><rect x="${G.eR - r}" y="${G.ey - r + 2}" width="${2 * r}" height="${2 * r - 4}" rx="${r - 3}" fill="#111" stroke="#000" stroke-width="2.5"/><path d="M${G.eL + r} ${G.ey - 3} Q100 ${G.ey - 9} ${G.eR - r} ${G.ey - 3}" stroke="#000" stroke-width="3" fill="none"/><path d="M${G.eL - r + 5} ${G.ey - 4} L${G.eL - 2} ${G.ey - r + 6}" stroke="#fff" stroke-width="3" opacity=".45" stroke-linecap="round"/><path d="M${G.eR - r + 5} ${G.ey - 4} L${G.eR - 2} ${G.ey - r + 6}" stroke="#fff" stroke-width="3" opacity=".45" stroke-linecap="round"/></g>`; },
    taucher: (G) => { const r = G.er + 5; return `<g><path d="M${G.eL - r - 22} ${G.ey} L${G.eR + r + 22} ${G.ey}" stroke="#2b2b33" stroke-width="6"/><rect x="${G.eL - r - 4}" y="${G.ey - r}" width="${G.eR - G.eL + 2 * r + 8}" height="${2 * r}" rx="${r}" fill="rgba(120,215,255,.45)" stroke="#ff8a00" stroke-width="5"/><path d="M${G.eL - r + 4} ${G.ey - 5} Q${G.eL} ${G.ey - r + 3} ${G.eL + 8} ${G.ey - r + 4}" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/></g>`; },
    lesebrille: (G) => { const r = G.er + 4; return `<g fill="rgba(255,255,255,.12)" stroke="#7a4b20" stroke-width="3"><circle cx="${G.eL}" cy="${G.ey}" r="${r}"/><circle cx="${G.eR}" cy="${G.ey}" r="${r}"/><path d="M${G.eL + r} ${G.ey - 2} Q100 ${G.ey - 8} ${G.eR - r} ${G.ey - 2} M${G.eL - r} ${G.ey - 2} L${G.eL - r - 9} ${G.ey - 5} M${G.eR + r} ${G.ey - 2} L${G.eR + r + 9} ${G.ey - 5}" fill="none"/></g>`; },
    maske: (G) => { const r = G.er + 3, a = G.eL - r - 13, b = G.eR + r + 13, y = G.ey; return `<path fill-rule="evenodd" d="M${a} ${y - 2} Q${a + 4} ${y - r - 13} 100 ${y - r - 4} Q${b - 4} ${y - r - 13} ${b} ${y - 2} Q${b - 8} ${y + r + 9} 100 ${y + 5} Q${a + 8} ${y + r + 9} ${a} ${y - 2} Z M${G.eL - r} ${y} a${r} ${r - 2} 0 1 0 ${2 * r} 0 a${r} ${r - 2} 0 1 0 ${-2 * r} 0 Z M${G.eR - r} ${y} a${r} ${r - 2} 0 1 0 ${2 * r} 0 a${r} ${r - 2} 0 1 0 ${-2 * r} 0 Z" fill="#7b3fe4" stroke="#4d1fa8" stroke-width="2"/>${spark(a + 6, y - r - 6, 5)}${spark(b - 4, y - r - 8, 6, '#ffd1f0')}<path d="M${b} ${y - 2} q12 -16 6 -30" stroke="#ff4fa3" stroke-width="3" fill="none"/>`; },
    // Hals
    schal: (G) => { const x0 = 100 - G.nw - 4, x1 = 100 + G.nw + 4, y = G.ny; return `<g><path d="M${x0} ${y - 6} Q100 ${y + 8} ${x1} ${y - 6} L${x1} ${y + 6} Q100 ${y + 22} ${x0} ${y + 6} Z" fill="#e23b3b"/><path d="M${x0 + 8} ${y - 1} Q100 ${y + 13} ${x1 - 8} ${y - 1}" stroke="#fff" stroke-width="3" fill="none" opacity=".75" stroke-dasharray="7 6"/><path d="M${x1 - 22} ${y + 8} L${x1 - 6} ${y + 6} L${x1 - 2} ${y + 42} L${x1 - 20} ${y + 44} Z" fill="#d22f2f"/><path d="M${x1 - 20} ${y + 44} l-1 6 M${x1 - 14} ${y + 43} l0 6 M${x1 - 8} ${y + 43} l1 6 M${x1 - 3} ${y + 42} l2 6" stroke="#d22f2f" stroke-width="2.5" stroke-linecap="round"/><path d="M${x1 - 20} ${y + 20} L${x1 - 4} ${y + 18} M${x1 - 19} ${y + 30} L${x1 - 3} ${y + 28}" stroke="#fff" stroke-width="3" opacity=".75"/></g>`; },
    medaille: (G) => `<g><path d="M${100 - 16} ${G.ny - 4} L100 ${G.ny + 24} L${100 + 16} ${G.ny - 4}" stroke="#2f6fdc" stroke-width="7" fill="none" stroke-linejoin="round"/><path d="M${100 - 16} ${G.ny - 4} L100 ${G.ny + 24}" stroke="#e8344e" stroke-width="3"/><circle cx="100" cy="${G.ny + 34}" r="12" fill="#f7c829" stroke="#b9850a" stroke-width="2"/>${starP(100, G.ny + 34, 6.5, 2.8, '#fff3a0')}</g>`,
    perlen: (G) => { let p = ''; const n = 13; for (let i = 0; i < n; i++) { const t = i / (n - 1); const x = 100 - G.nw + 4 + t * (2 * G.nw - 8), y = G.ny + Math.sin(Math.PI * t) * 15; p += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.8" fill="#fbf7ee" stroke="#cfc6b4" stroke-width="1"/><circle cx="${(x - 1.2).toFixed(1)}" cy="${(y - 1.3).toFixed(1)}" r="1.2" fill="#fff"/>`; } return `<g>${p}</g>`; },
    diamant: (G) => `<g><path d="M${100 - G.nw + 4} ${G.ny} Q100 ${G.ny + 24} ${100 + G.nw - 4} ${G.ny}" stroke="#e8c14a" stroke-width="2" fill="none"/><path d="M${100 - 9} ${G.ny + 17} L${100 + 9} ${G.ny + 17} L${100 + 13} ${G.ny + 22} L100 ${G.ny + 36} L${100 - 13} ${G.ny + 22} Z" fill="#9fe6ff" stroke="#3aa0d8" stroke-width="1.5"/><path d="M${100 - 13} ${G.ny + 22} L${100 + 13} ${G.ny + 22} M${100 - 4} ${G.ny + 17} L100 ${G.ny + 36} L${100 + 4} ${G.ny + 17}" stroke="#3aa0d8" stroke-width="1" fill="none"/>${spark(100 + 14, G.ny + 16, 4)}</g>`,
    // Körper
    kleid: (G) => { const y = G.by, h = G.hem; return `<g><path d="M70 ${y} L130 ${y} Q138 ${y + 30} 154 ${h} Q100 ${h + 10} 46 ${h} Q62 ${y + 30} 70 ${y} Z" fill="#ff5fa2"/><path d="M68 ${y + 24} Q100 ${y + 30} 132 ${y + 24}" stroke="#d63c80" stroke-width="4" fill="none"/>${spark(82, y + 42, 4)}${spark(116, y + 50, 5)}${spark(98, h - 12, 4)}${spark(132, h - 16, 3.5)}${spark(66, h - 10, 3.5)}<path d="M46 ${h} Q100 ${h + 10} 154 ${h}" stroke="#d63c80" stroke-width="3" fill="none"/></g>`; },
    festkleid: (G) => { const y = G.by, h = G.hem + 12; return `<g><path d="M72 ${y} L128 ${y} Q132 ${y + 26} 156 ${h} Q100 ${h + 8} 44 ${h} Q68 ${y + 26} 72 ${y} Z" fill="#b3123a"/><path d="M72 ${y} L128 ${y} L126 ${y + 16} Q100 ${y + 22} 74 ${y + 16} Z" fill="#8f0d2d"/><path d="M73 ${y + 22} Q100 ${y + 28} 127 ${y + 22}" stroke="#f7c829" stroke-width="4" fill="none"/><path d="M90 ${y + 30} Q86 ${h - 30} 76 ${h - 4} M110 ${y + 30} Q114 ${h - 30} 124 ${h - 4}" stroke="#8f0d2d" stroke-width="2" fill="none"/>${spark(84, y + 48, 3.5, '#ffe36b')}${spark(118, y + 56, 4, '#ffe36b')}${spark(100, h - 14, 4, '#ffe36b')}</g>`; },
    tshirt: (G) => { const y = G.by; return `<g><path d="M70 ${y} L130 ${y} L152 ${y + 20} L140 ${y + 30} L132 ${y + 24} L132 ${y + 48} L68 ${y + 48} L68 ${y + 24} L60 ${y + 30} L48 ${y + 20} Z" fill="#9b6cff"/><path d="M86 ${y} Q100 ${y + 10} 114 ${y}" stroke="#7a4fe0" stroke-width="3" fill="none"/><path d="M100 ${y + 36} C92 ${y + 30} 88 ${y + 22} 94 ${y + 19} C97 ${y + 18} 99 ${y + 20} 100 ${y + 22} C101 ${y + 20} 103 ${y + 18} 106 ${y + 19} C112 ${y + 22} 108 ${y + 30} 100 ${y + 36} Z" fill="#ff5fa2"/></g>`; },
    mantel: (G) => { const y = G.by, h = G.hem + 4; return `<g><path d="M66 ${y} L134 ${y} Q150 ${y + 30} 152 ${h} L48 ${h} Q50 ${y + 30} 66 ${y} Z" fill="#c9935b"/><path d="M84 ${y} L100 ${y + 30} L116 ${y} L124 ${y} L104 ${y + 40} L100 ${h} L96 ${y + 40} L76 ${y} Z" fill="#a8743f"/><path d="M50 ${y + 44} L150 ${y + 44}" stroke="#7d5328" stroke-width="6"/><rect x="94" y="${y + 40}" width="12" height="9" rx="2" fill="#e8c14a"/><circle cx="110" cy="${y + 58}" r="3" fill="#5a3a1a"/><circle cx="110" cy="${y + 70}" r="3" fill="#5a3a1a"/><path d="M100 ${y + 48} L100 ${h}" stroke="#7d5328" stroke-width="2"/></g>`; },
    kimono: (G) => { const y = G.by, h = G.hem + 2; let dots = ''; [[66, y + 18], [128, y + 22], [74, h - 16], [126, h - 12], [104, h - 20]].forEach(([x, yy]) => { dots += `<circle cx="${x}" cy="${yy}" r="4" fill="#ffb3d1"/><circle cx="${x}" cy="${yy}" r="1.6" fill="#fff"/>`; }); return `<g><path d="M64 ${y} L136 ${y} Q148 ${y + 34} 150 ${h} L50 ${h} Q52 ${y + 34} 64 ${y} Z" fill="#3a6fd8"/><path d="M80 ${y} L112 ${y + 34} M120 ${y} L96 ${y + 26}" stroke="#fff" stroke-width="5"/>${dots}<rect x="56" y="${y + 30}" width="88" height="14" fill="#e23b3b"/><path d="M118 ${y + 44} L126 ${y + 62} L134 ${y + 44}" fill="#e23b3b"/></g>`; },
    krawatte: (G) => { const y = G.by; return `<g><path d="M68 ${y} L132 ${y} Q136 ${y + 26} 134 ${y + 46} L66 ${y + 46} Q64 ${y + 26} 68 ${y} Z" fill="#f4f6fb"/><path d="M84 ${y - 2} L100 ${y + 10} L92 ${y + 14} Z M116 ${y - 2} L100 ${y + 10} L108 ${y + 14} Z" fill="#fff" stroke="#c9d2e2" stroke-width="1.5"/><path d="M95 ${y + 8} L105 ${y + 8} L103 ${y + 14} L108 ${y + 40} L100 ${y + 48} L92 ${y + 40} L97 ${y + 14} Z" fill="#1f3a8a"/><path d="M96 ${y + 20} L106 ${y + 16} M95 ${y + 28} L107 ${y + 24} M95 ${y + 36} L106 ${y + 32}" stroke="#e8344e" stroke-width="2.5"/><circle cx="118" cy="${y + 26}" r="1.8" fill="#c9d2e2"/><circle cx="118" cy="${y + 38}" r="1.8" fill="#c9d2e2"/></g>`; },
    jeans: (G) => { const t = G.legTop, [[a0, a1], [b0, b1]] = G.legs, bot = G.feet[0][1] - 9; return `<g><rect x="${a0 - 3}" y="${t}" width="${b1 - a0 + 6}" height="12" rx="3" fill="#2f5c9e"/><rect x="${a0}" y="${t + 6}" width="${a1 - a0}" height="${bot - t - 6}" rx="6" fill="#3d6fb6"/><rect x="${b0}" y="${t + 6}" width="${b1 - b0}" height="${bot - t - 6}" rx="6" fill="#3d6fb6"/><path d="M${(a0 + a1) / 2 + 4} ${t + 12} L${(a0 + a1) / 2 + 4} ${bot - 2} M${(b0 + b1) / 2 - 4} ${t + 12} L${(b0 + b1) / 2 - 4} ${bot - 2}" stroke="#2a5291" stroke-width="1.5" stroke-dasharray="3 3"/><rect x="${(a0 + b1) / 2 - 4}" y="${t + 2}" width="8" height="8" rx="2" fill="#e8c14a"/><path d="M${a0} ${bot - 6} L${a1} ${bot - 6} M${b0} ${bot - 6} L${b1} ${bot - 6}" stroke="#7fa6dc" stroke-width="3"/></g>`; },
    // Füße (je Pfote)
    skates: (G) => G.feet.map(([x, y]) => `<g><path d="M${x - G.frx + 2} ${y - 2} L${x - G.frx + 4} ${y - 22} L${x + 6} ${y - 22} L${x + 8} ${y - 8} Q${x + G.frx} ${y - 6} ${x + G.frx} ${y + 2} L${x - G.frx + 2} ${y + 4} Z" fill="#fff" stroke="#c9d2e2" stroke-width="1.5"/><path d="M${x - 6} ${y - 18} l8 3 M${x - 6} ${y - 12} l8 3" stroke="#ff5fa2" stroke-width="2"/><path d="M${x - G.frx + 3} ${y + 4} L${x - G.frx + 5} ${y + 9} M${x + G.frx - 4} ${y + 3} L${x + G.frx - 6} ${y + 9}" stroke="#9aa6b5" stroke-width="2.5"/><path d="M${x - G.frx - 2} ${y + 10} L${x + G.frx + 3} ${y + 10}" stroke="#b9c3cf" stroke-width="3" stroke-linecap="round"/></g>`).join(''),
    ballett: (G) => G.feet.map(([x, y]) => `<g><ellipse cx="${x}" cy="${y + 1}" rx="${G.frx}" ry="9" fill="#ffc4dc" stroke="#f08ab5" stroke-width="1.5"/><path d="M${x - 8} ${y - 4} L${x + 6} ${y - 26} M${x + 8} ${y - 4} L${x - 6} ${y - 26}" stroke="#ff9cc5" stroke-width="3" stroke-linecap="round"/><circle cx="${x}" cy="${y - 5}" r="2.5" fill="#f08ab5"/></g>`).join(''),
    heels: (G) => G.feet.map(([x, y], i) => { const s = i ? 1 : -1; return `<g><path d="M${x - G.frx} ${y + 2} Q${x - G.frx} ${y - 9} ${x} ${y - 9} Q${x + G.frx} ${y - 9} ${x + G.frx} ${y + 2} Z" fill="#d3153b"/><rect x="${x + s * (G.frx - 6) - 2}" y="${y}" width="4" height="12" fill="#a10d2c"/><path d="M${x - G.frx + 3} ${y + 3} L${x + G.frx - 3} ${y + 3}" stroke="#a10d2c" stroke-width="3"/><path d="M${x - 8} ${y - 6} Q${x - 2} ${y - 8} ${x + 2} ${y - 6}" stroke="#fff" stroke-width="2" opacity=".55" fill="none"/></g>`; }).join(''),
    stiefel: (G) => G.feet.map(([x, y]) => `<g><path d="M${x - G.frx + 4} ${y - 34} L${x + G.frx - 6} ${y - 34} L${x + G.frx - 4} ${y - 8} Q${x + G.frx + 2} ${y - 4} ${x + G.frx} ${y + 4} L${x - G.frx} ${y + 4} Q${x - G.frx} ${y - 6} ${x - G.frx + 4} ${y - 10} Z" fill="#8a4f24"/><rect x="${x - G.frx + 2}" y="${y - 38}" width="${2 * G.frx - 6}" height="8" rx="3" fill="#6b3a17"/><path d="M${x - G.frx} ${y + 4} L${x + G.frx} ${y + 4}" stroke="#3d220d" stroke-width="3"/><path d="M${x - 4} ${y - 30} L${x - 4} ${y - 12}" stroke="#a8693a" stroke-width="2.5" opacity=".7"/></g>`).join(''),
    sneaker: (G) => G.feet.map(([x, y]) => `<g><path d="M${x - G.frx} ${y + 2} Q${x - G.frx} ${y - 12} ${x - 4} ${y - 12} Q${x + 6} ${y - 4} ${x + G.frx} ${y - 2} L${x + G.frx} ${y + 2} Z" fill="#38bdf8"/><rect x="${x - G.frx - 1}" y="${y + 1}" width="${2 * G.frx + 2}" height="6" rx="3" fill="#fff" stroke="#c9d2e2" stroke-width="1"/><path d="M${x - 8} ${y - 9} l6 3 M${x - 6} ${y - 5} l6 3" stroke="#fff" stroke-width="2"/><path d="M${x + 2} ${y - 2} L${x + G.frx - 3} ${y - 1}" stroke="#ff5fa2" stroke-width="3" stroke-linecap="round"/></g>`).join(''),
    socken: (G) => G.feet.map(([x, y]) => { let st = ''; for (let k = 0; k < 4; k++) st += `<rect x="${x - G.frx + 3}" y="${y - 28 + k * 7}" width="${2 * G.frx - 6}" height="3.5" fill="#ff5fa2"/>`; return `<g><rect x="${x - G.frx + 3}" y="${y - 30}" width="${2 * G.frx - 6}" height="30" rx="5" fill="#fff4c2"/>${st}<ellipse cx="${x}" cy="${y}" rx="${G.frx}" ry="9" fill="#fff4c2"/><ellipse cx="${x}" cy="${y + 2}" rx="${G.frx - 4}" ry="5" fill="#ff5fa2" opacity=".85"/></g>`; }).join('')
  };
  const WEAR_UNDER = new Set(['kleid', 'festkleid', 'tshirt', 'mantel', 'kimono', 'krawatte', 'jeans', 'skates', 'ballett', 'heels', 'stiefel', 'sneaker', 'socken']);
  const SLOT_ORDER = ['feet', 'body', 'neck', 'eyes', 'head', 'hand'];
  // under = hinter den Kopf (Körper, Füße), over = vorn (Hals, Augen, Kopf, Hand)
  function wearLayers(worn, who, fur) {
    const G = GEO[who]; const POS = who === 'max' ? SLOT_POS : SLOT_POS_CAT; let under = '', over = '';
    SLOT_ORDER.forEach((slot) => {
      const id = worn[slot]; if (!id) return; const st = D.STICKERS.find((x) => x.id === id); if (!st) return;
      const f = WEAR[id];
      if (f) { const m = f(G); if (WEAR_UNDER.has(id)) under += m; else over += m; return; }
      if (slot === 'hand') { const [x, y] = G.hand; over += `<text x="${x}" y="${y}" font-size="40" text-anchor="middle" dominant-baseline="middle">${st.e}</text><ellipse cx="${x - 10}" cy="${y + 16}" rx="12" ry="9" fill="${fur}"/><path d="M${x - 16} ${y + 12} v6 M${x - 10} ${y + 11} v7 M${x - 4} ${y + 12} v6" stroke="rgba(0,0,0,.35)" stroke-width="1.6" stroke-linecap="round"/>`; return; }
      const [x, y, fs] = POS[slot] || [100, 100, 40];
      (slot === 'body' || slot === 'feet' ? (under += `<text x="${x}" y="${y}" font-size="${fs}" text-anchor="middle" dominant-baseline="middle">${st.e}</text>`) : (over += `<text x="${x}" y="${y}" font-size="${fs}" text-anchor="middle" dominant-baseline="middle">${st.e}</text>`));
    });
    return { under, over };
  }
  function svgMax(opt = {}) {
    const mood = opt.mood || 'happy';
    const worn = opt.worn || state.stickers.worn || {};
    const B = '#1d1917', B2 = '#2e2622', T = '#b77a43', T2 = '#cf9b63', M = '#8a6a55';
    const eye = (x) => mood === 'sleep'
      ? `<path d="M${x - 9} 90 Q${x} 97 ${x + 9} 90" stroke="#7a5b45" stroke-width="4" fill="none" stroke-linecap="round"/>`
      : `<circle cx="${x}" cy="90" r="${mood === 'wow' ? 11 : 9.5}" fill="#5c3b22"/><circle cx="${x}" cy="90" r="${mood === 'wow' ? 7.5 : 6.4}" fill="#0b0806"/><circle cx="${x + 3.4}" cy="86.4" r="3.2" fill="#fff"/><circle cx="${x - 3}" cy="93" r="1.3" fill="#fff" opacity=".55"/>`;
    const mouth = mood === 'sad'
      ? `<path d="M90 126 Q100 119 110 126" stroke="${M}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      : mood === 'listen' || mood === 'sleep'
        ? `<path d="M92 121 Q100 126 108 121" stroke="${M}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
        : `<path d="M86 119 Q100 131 114 119" stroke="${M}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M94 123 Q100 141 106 123 Z" fill="#ef7d8f"/>`;
    const up = mood === 'listen';
    const ears = up
      ? `<path d="M58 70 Q44 32 48 12 Q68 24 86 52 Z" fill="${B}"/><path d="M62 62 Q52 36 54 24 Q68 34 80 52 Z" fill="#4a3528"/><path d="M142 70 Q156 32 152 12 Q132 24 114 52 Z" fill="${B}"/><path d="M138 62 Q148 36 146 24 Q132 34 120 52 Z" fill="#4a3528"/>`
      : `<path d="M60 76 Q40 64 35 43 Q56 40 85 57 Z" fill="${B}"/><path d="M62 70 Q47 60 45 50 Q58 48 78 58 Z" fill="#4a3528"/><path d="M140 76 Q160 64 165 43 Q144 40 115 57 Z" fill="${B}"/><path d="M138 70 Q153 60 155 50 Q142 48 122 58 Z" fill="#4a3528"/><path d="M165 43 Q161 54 152 57 Q158 49 159 43 Z" fill="${B2}"/><path d="M35 43 Q39 54 48 57 Q42 49 41 43 Z" fill="${B2}"/>`;
    const WL = wearLayers(worn, 'max', B); const acc = WL.over;
    const ball = worn.hand || opt.noBall ? '' : `<g class="ball"><circle cx="172" cy="208" r="13" fill="#d9ec3f"/><path d="M161 201 Q172 208 162 217 M183 199 Q172 207 182 218" stroke="#fff" stroke-width="2.4" fill="none"/></g>`;
    return `<svg viewBox="0 0 200 228" class="max ${opt.cls || ''}" aria-label="Max, der Schäferhund-Welpe" role="img">
<path class="tail" d="M146 196 Q192 188 184 140" stroke="${B}" stroke-width="20" fill="none" stroke-linecap="round"/>
<ellipse cx="54" cy="198" rx="17" ry="19" fill="${B}"/><ellipse cx="146" cy="198" rx="17" ry="19" fill="${B}"/>
<ellipse cx="45" cy="213" rx="14" ry="8" fill="${T}"/><ellipse cx="155" cy="213" rx="14" ry="8" fill="${T}"/>
<path d="M50 214 Q40 160 66 138 L134 138 Q160 160 150 214 Z" fill="${B}"/>
<path d="M78 142 L85 158 L92 147 L99 162 L106 147 L113 159 L120 145 L122 142 Z" fill="${B2}"/>
<rect x="68" y="166" width="26" height="50" rx="13" fill="${T}"/><rect x="106" y="166" width="26" height="50" rx="13" fill="${T}"/>
<path d="M68 182 Q68 166 81 166 Q94 166 94 182 L94 188 Q81 194 68 188 Z" fill="${B}"/><path d="M106 182 Q106 166 119 166 Q132 166 132 182 L132 188 Q119 194 106 188 Z" fill="${B}"/>
<ellipse cx="81" cy="214" rx="17" ry="10" fill="${T2}"/><ellipse cx="119" cy="214" rx="17" ry="10" fill="${T2}"/>
<path d="M75 211 v6 M82 210 v7 M113 210 v7 M120 211 v6" stroke="#8d5c30" stroke-width="2.3" stroke-linecap="round"/>
${WL.under}${ears}
<path d="M46 96 Q44 50 100 44 Q156 50 154 96 L161 104 L152 108 L157 116 L145 118 Q128 143 100 145 Q72 143 55 118 L43 116 L48 108 L39 104 Z" fill="${B}"/>
<ellipse cx="100" cy="64" rx="27" ry="12" fill="${B2}"/>
<path d="M61 104 Q65 125 83 130 Q76 117 74 103 Z" fill="${T}"/><path d="M139 104 Q135 125 117 130 Q124 117 126 103 Z" fill="${T}"/>
<ellipse cx="80" cy="74" rx="6.5" ry="4" fill="${T}"/><ellipse cx="120" cy="74" rx="6.5" ry="4" fill="${T}"/>
${eye(80)}${eye(120)}
<ellipse cx="100" cy="115" rx="25" ry="19" fill="${B2}"/>
<ellipse cx="100" cy="106" rx="12.5" ry="8.5" fill="#0a0807"/><ellipse cx="95.5" cy="103" rx="3.8" ry="2.1" fill="#fff" opacity=".45"/>
${mouth}${ball}${acc}</svg>`;
  }
  function svgCat(opt = {}) {
    const C = D.CAT_COLORS[state.cat] || D.CAT_COLORS.bkh;
    const mood = opt.mood || 'bored';
    const eye = (x, side) => {
      const open = `<ellipse cx="${x}" cy="95" rx="12.5" ry="${mood === 'wow' ? 12.5 : 11}" fill="${C.eye}" stroke="${C.ring || 'rgba(0,0,0,.25)'}" stroke-width="1.6"/><ellipse cx="${x}" cy="96" rx="${mood === 'wow' ? 5.2 : 3.6}" ry="8.2" fill="#15100c"/><circle cx="${x + 3.6}" cy="91" r="2.6" fill="#fff" opacity=".9"/>`;
      if (mood === 'wow') return open;
      const a = side < 0 ? [90, 96] : [96, 90];
      return open + `<path d="M${x - 14} ${a[0]} Q${x} 86 ${x + 14} ${a[1]} L${x + 14} 80 L${x - 14} 80 Z" fill="${C.fur}"/><path d="M${x - 13.5} ${a[0]} Q${x} 87 ${x + 13.5} ${a[1]}" stroke="${C.dark}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    };
    const stripes = C.stripes
      ? `<path d="M92 60 L95 72 M100 57 L100 70 M108 60 L105 72 M56 170 L72 164 M144 170 L128 164 M58 186 L74 180" stroke="${C.dark}" stroke-width="5" stroke-linecap="round"/>`
      : C.faint ? `<path d="M92 61 L94.5 71 M100 59 L100 70 M108 61 L105.5 71" stroke="${C.dark}" stroke-width="3.5" stroke-linecap="round" opacity=".35"/>` : '';
    const WLc = opt.noAcc ? { under: '', over: '' } : wearLayers(opt.worn || state.stickers.wornCat || {}, 'cat', C.fur);
    return `<svg viewBox="0 0 200 222" class="cat ${opt.cls || ''}" aria-label="Schmanny, der Kater" role="img">
<path class="tail" d="M142 204 Q196 204 186 160 Q182 146 190 136" stroke="${C.fur}" stroke-width="18" fill="none" stroke-linecap="round"/>
<path d="M46 214 Q36 156 78 136 L122 136 Q164 156 154 214Z" fill="${C.fur}"/>
<path d="M80 146 Q100 136 120 146 Q124 182 100 200 Q76 182 80 146Z" fill="${C.light}" opacity="${C.chestOp || 1}"/>
<ellipse cx="80" cy="212" rx="19" ry="10" fill="${C.paw || C.light}"/><ellipse cx="120" cy="212" rx="19" ry="10" fill="${C.paw || C.light}"/>
${WLc.under}
<path d="M50 82 Q43 50 58 39 Q75 50 86 63 Z" fill="${C.fur}"/><path d="M55 76 Q51 54 60 47 Q71 56 78 65 Z" fill="${C.inner || '#f2a6b0'}"/>
<path d="M150 82 Q157 50 142 39 Q125 50 114 63 Z" fill="${C.fur}"/><path d="M145 76 Q149 54 140 47 Q129 56 122 65 Z" fill="${C.inner || '#f2a6b0'}"/>
<ellipse cx="100" cy="100" rx="61" ry="49" fill="${C.fur}"/>${stripes}
<ellipse cx="86" cy="118" rx="16" ry="12" fill="${C.light}" opacity="${C.muzOp || 1}"/><ellipse cx="114" cy="118" rx="16" ry="12" fill="${C.light}" opacity="${C.muzOp || 1}"/>
${eye(76, -1)}${eye(124, 1)}
<path d="M94 108 Q100 105 106 108 Q103 114 100 115 Q97 114 94 108Z" fill="${C.nose || '#e77d8e'}"/>
<path d="M100 115 Q96 122 90 120 M100 115 Q104 122 110 120" stroke="${C.dark}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<path d="M80 116 L42 108 M80 121 L42 127 M120 116 L158 108 M120 121 L158 127" stroke="${C.wh}" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>
${WLc.over}</svg>`;
  }
  function svgPablo(opt = {}) {
    const mood = opt.mood || 'sly';
    const pup = mood === 'caught' ? '<circle cx="74" cy="77" r="6" fill="#1a1a1a"/><circle cx="100" cy="77" r="6" fill="#1a1a1a"/>' : '<circle cx="78" cy="79" r="5" fill="#1a1a1a"/><circle cx="104" cy="79" r="5" fill="#1a1a1a"/>';
    const brows = mood === 'caught' ? '<path d="M63 58 Q74 52 84 58" stroke="#7a1a10" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M90 58 Q100 52 111 58" stroke="#7a1a10" stroke-width="5" fill="none" stroke-linecap="round"/>' : '<path d="M62 62 L84 67" stroke="#7a1a10" stroke-width="5" stroke-linecap="round"/><path d="M112 60 L92 67" stroke="#7a1a10" stroke-width="5" stroke-linecap="round"/>';
    const mouth = mood === 'caught' ? '<ellipse cx="88" cy="117" rx="7" ry="8" fill="#7a1a10"/>' : '<path d="M72 111 Q88 126 106 111" stroke="#7a1a10" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
    return `<svg viewBox="0 0 160 200" class="pablo ${opt.cls || ''}" aria-label="Pablo, die freche Chili" role="img">
<path d="M70 40 C112 34 130 70 120 108 C110 148 82 182 46 192 C40 193 37 188 42 184 C64 160 60 126 50 98 C40 70 42 44 70 40Z" fill="#e8412f"/>
<path d="M61 58 C55 74 57 94 63 112" stroke="#ff8f73" stroke-width="7" fill="none" stroke-linecap="round" opacity=".85"/>
<path d="M50 46 Q58 28 76 33 Q92 24 106 38 Q98 45 86 44 Q72 51 50 46Z" fill="#3e9b3a"/>
<path d="M80 33 Q77 14 93 6" stroke="#3e9b3a" stroke-width="7" fill="none" stroke-linecap="round"/>
<ellipse cx="75" cy="77" rx="10.5" ry="11.5" fill="#fff"/><ellipse cx="101" cy="77" rx="10.5" ry="11.5" fill="#fff"/>
${pup}${brows}
<path d="M88 97 C77 90 62 92 55 103 C63 99 72 103 80 105 C84 105 86 102 88 100 C90 102 92 105 96 105 C104 103 112 99 120 103 C113 92 99 90 88 97Z" fill="#2b1a12"/>
${mouth}</svg>`;
  }
  const PAW = '<svg viewBox="0 0 40 40" class="paw" aria-hidden="true"><ellipse cx="20" cy="26" rx="10" ry="8.5"/><ellipse cx="8.5" cy="15" rx="4.6" ry="5.6"/><ellipse cx="16.5" cy="8.5" rx="4.6" ry="5.6"/><ellipse cx="23.5" cy="8.5" rx="4.6" ry="5.6"/><ellipse cx="31.5" cy="15" rx="4.6" ry="5.6"/></svg>';

  // ---------- Skill-System ----------
  const R = D.REIHEN;
  const INTERVAL = { 1: 1, 2: 1, 3: 3, 4: 7, 5: 16, 6: 35 };
  const LBY = {}; D.LETTERS.forEach((L) => { LBY[L.g] = L; });
  const G2L = {}; D.LETTERS.forEach((L) => { G2L[L.g.toLowerCase()] = L.g; });
  const MULTI = ['sch', 'äu', 'ei', 'au', 'eu', 'ie', 'ch', 'st', 'sp', 'pf', 'qu'];
  const lower = (g) => (g === 'ß' ? 'ß' : g.toLowerCase());
  const letterLabel = (g) => (g === 'ß' ? 'ß' : `${g} ${lower(g)}`);
  const mathId = (a, b) => `m:${a}:${b}`;
  const ab = (id) => { const p = id.split(':'); return [+p[1], +p[2]]; };
  const box = (id) => (state.items[id] ? state.items[id].b : 0);
  function getItem(id) { return state.items[id] || (state.items[id] = { b: 0, d: 0, n: 0, r: 0, w: 0, l: -1 }); }
  const TEST = () => !!(state && state.settings && state.settings.testAll);
  const MAL = () => !!state.settings.mal || TEST();
  const knownLetter = (g) => TEST() || box('l:' + g) >= 2;
  function graphemes(word) {
    const w = word.replace(/-/g, '').toLowerCase(); const out = []; let i = 0;
    while (i < w.length) {
      const m = MULTI.find((g) => w.startsWith(g, i));
      if (m) { out.push(m); i += m.length; continue; }
      if (/[a-zäöüß]/.test(w[i])) out.push(w[i]);
      i++;
    }
    return out;
  }
  const wordReadable = (w) => graphemes(w).every((g) => (G2L[g] ? knownLetter(G2L[g]) : true));
  const poolOf = (id) => (/^(m|ad|sb|dv|vgl|dop|hal|nb|zs|hz|geld|uhr|len|form|sach):/.test(id) ? 'math' : id.startsWith('ru:') || id.startsWith('rf:') ? 'ru' : 'read');
  function valid(id) {
    const [k, x] = id.split(':');
    if (TOPIC_BY[k]) return k === 'dv' ? MAL() : TOPIC_BY[k].ids.includes(id);
    if (k === 'm') return MAL();
    if (k === 'ad' || k === 'sb' || k === 's') return true;
    if (k === 'l') return !!LBY[x];
    if (k === 'w') return !!D.WORDS[+x];
    if (k === 't') return !!D.SENTENCES[+x];
    if (k === 'ru') return !!D.RU_WORDS[+x];
    if (k === 'rf') return !!D.RU_PHRASES[+x];
    return false;
  }
  function countBox(prefix, min) { let n = 0; for (const k in state.items) if (k.startsWith(prefix) && state.items[k].b >= min) n++; return n; }
  function sylAvailable() {
    const C = D.CONSONANTS.filter(knownLetter), V = D.VOWELS.filter(knownLetter); const out = [];
    C.forEach((c) => V.forEach((v) => out.push(c + v.toLowerCase())));
    return out;
  }
  const wordsAvail = () => D.WORDS.map((w, i) => i).filter((i) => D.WORDS[i].sight || wordReadable(D.WORDS[i].w));
  function stageUnlocked(st) {
    if (st === 'l' || TEST()) return true;
    if (st === 's') return D.CONSONANTS.filter(knownLetter).length >= 3 && D.VOWELS.filter(knownLetter).length >= 2;
    if (st === 'w') return stageUnlocked('s') && countBox('s:', 2) >= 6 && wordsAvail().length >= 4;
    if (st === 't') return countBox('w:', 2) >= 10;
    if (st === 'rf') return countBox('ru:', 2) >= 10;
    return false;
  }
  // Mathe: Plus/Minus-Pfad (Minus im Fokus), Mal getrennt und nur, wenn eingeschaltet
  function seeded(seed) { let x = seed; return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; }; }
  function sshuffle(a, seed) { const r = seeded(seed); a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const MSK = (() => {
    const L = []; let ids;
    const add = (k, n, list, track) => L.push({ k, n, ids: list, track: track || 'pm' });
    ids = []; for (let a = 1; a <= 9; a++) for (let b = 1; a + b <= 10; b++) ids.push(`ad:${a}:${b}`); add('p10', 'Plus bis 10', sshuffle(ids, 1));
    ids = []; for (let a = 2; a <= 10; a++) for (let b = 1; b < a; b++) ids.push(`sb:${a}:${b}`); add('m10', 'Minus bis 10', sshuffle(ids, 2));
    ids = []; for (let a = 11; a <= 18; a++) for (let b = 1; (a % 10) + b <= 9; b++) ids.push(`ad:${a}:${b}`); add('p20o', 'Plus bis 20', sshuffle(ids, 3));
    ids = []; for (let a = 11; a <= 19; a++) for (let b = 1; b <= a - 10; b++) ids.push(`sb:${a}:${b}`); add('m20o', 'Minus bis 20', sshuffle(ids, 4));
    ids = []; for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) if (a + b > 10) ids.push(`ad:${a}:${b}`); add('p20m', 'Plus über die 10', sshuffle(ids, 5));
    ids = []; for (let a = 11; a <= 18; a++) for (let b = a - 9; b <= 9; b++) ids.push(`sb:${a}:${b}`); add('m20m', 'Minus über die 10', sshuffle(ids, 6));
    ids = []; for (let a = 10; a <= 90; a += 10) for (let b = 10; a + b <= 100; b += 10) ids.push(`ad:${a}:${b}`); for (let a = 20; a <= 100; a += 10) for (let b = 10; b < a; b += 10) ids.push(`sb:${a}:${b}`); add('z', 'Zehner-Zahlen', sshuffle(ids, 7));
    const gen = (seed, f) => { const r = seeded(seed); const set = new Set(); let g = 0; while (set.size < 30 && g++ < 2000) { const id = f(r); if (id) set.add(id); } return [...set]; };
    add('p100o', 'Plus bis 100', gen(8, (r) => { const t = 2 + Math.floor(r() * 8), u = 1 + Math.floor(r() * 8), b = 1 + Math.floor(r() * (9 - u)); return `ad:${t * 10 + u}:${b}`; }));
    add('m100o', 'Minus bis 100', gen(9, (r) => { const t = 2 + Math.floor(r() * 8), u = 1 + Math.floor(r() * 9), b = 1 + Math.floor(r() * u); return `sb:${t * 10 + u}:${b}`; }));
    add('p100m', 'Plus bis 100 über den Zehner', gen(10, (r) => { const t = 2 + Math.floor(r() * 7), u = 2 + Math.floor(r() * 8), b = 10 - u + Math.floor(r() * u); return b <= 9 ? `ad:${t * 10 + u}:${b}` : null; }));
    add('m100m', 'Minus bis 100 über den Zehner', gen(11, (r) => { const t = 2 + Math.floor(r() * 8), u = Math.floor(r() * 9), b = u + 1 + Math.floor(r() * (9 - u)); return `sb:${t * 10 + u}:${b}`; }));
    R.forEach((b) => add('r' + b, `${b}er-Reihe (mal)`, D.FACT_ORDER.map((a) => `m:${a}:${b}`), 'mal'));
    return L;
  })();
  const SKILL_OF = {}; MSK.forEach((sk) => sk.ids.forEach((id) => { SKILL_OF[id] = sk; }));
  function mathInfo(id) {
    const [k, x, y] = id.split(':'); const a = +x, b = +y;
    const op = k === 'ad' ? '+' : k === 'sb' ? '−' : k === 'dv' ? ':' : '·';
    const c = k === 'ad' ? a + b : k === 'sb' ? a - b : k === 'dv' ? a / b : a * b;
    return { k, a, b, c, op, word: k === 'ad' ? 'plus' : k === 'sb' ? 'minus' : k === 'dv' ? 'geteilt durch' : 'mal', sk: SKILL_OF[id] ? SKILL_OF[id].k : 'r' + b };
  }
  const activeMSK = () => MSK.filter((sk) => sk.track === 'pm' || MAL());
  function skillFrac(sk, min) { let n = 0; sk.ids.forEach((id) => { if (box(id) >= min) n++; }); return n / sk.ids.length; }
  function skillUnlocked(sk) {
    const list = MSK.filter((x) => x.track === sk.track); const i = list.indexOf(sk);
    if (sk.track === 'mal' && !MAL()) return false;
    if (i === 0 || TEST() || (state.force || []).includes(sk.k)) return true;
    return skillFrac(list[i - 1], 2) >= 0.7;
  }
  function reiheFrac(b, min) { const sk = MSK.find((x) => x.k === 'r' + b); return sk ? skillFrac(sk, min) : 0; }
  const lvl = (f) => (f >= 0.9 ? 3 : f >= 0.6 ? 2 : f >= 0.3 ? 1 : 0);
  const cnt = (n, a, b, c) => (n >= c ? 3 : n >= b ? 2 : n >= a ? 1 : 0);
  function skillStars() {
    const o = {};
    activeMSK().forEach((sk) => { o['m_' + sk.k] = lvl(skillFrac(sk, 3)); });
    o.l = lvl(D.LETTERS.filter((L) => box('l:' + L.g) >= 3).length / D.LETTERS.length);
    o.s = cnt(countBox('s:', 3), 5, 12, 20);
    o.w = cnt(countBox('w:', 3), 5, 15, 30);
    o.t = cnt(countBox('t:', 3), 4, 10, 20);
    o.ru = cnt(countBox('ru:', 3), 8, 20, 40);
    o.rf = cnt(countBox('rf:', 3), 3, 8, 14);
    return o;
  }
  function unlockSnap() { return { r: activeMSK().filter(skillUnlocked).map((sk) => sk.k), st: ['s', 'w', 't', 'rf'].filter(stageUnlocked) }; }
  const SKILL_NAME = (k) => (k.startsWith('m_') ? (MSK.find((x) => x.k === k.slice(2)) || {}).n : { l: 'Buchstaben', s: 'Silben', w: 'Wörter', t: 'Sätze', ru: 'Russische Wörter', rf: 'Russisch reden' }[k]);
  function itemLabel(id) {
    const [k, x, y] = id.split(':');
    if (TOPIC_BY[k]) return topicLabel(id);
    if (k === 'm' || k === 'ad' || k === 'sb') { const I = mathInfo(id); return `${I.a} ${I.op} ${I.b}`; }
    if (k === 'l') return letterLabel(x);
    if (k === 's') return x;
    if (k === 'w') return plain(D.WORDS[+x].w);
    if (k === 't') { const s = plain(D.SENTENCES[+x].t); return s.length > 26 ? s.slice(0, 24) + '…' : s; }
    if (k === 'ru') { const W = D.RU_WORDS[+x]; return `${W.ru} (${W.de})`; }
    if (k === 'rf') return sub(D.RU_PHRASES[+x].q);
    return id;
  }

  function newMath() {
    // je Spur (Plus/Minus und Mal) die früheste freigeschaltete Stufe mit neuen Aufgaben
    const out = [];
    ['pm', 'mal'].forEach((tr) => {
      if (tr === 'mal' && !MAL()) return;
      if (TEST()) { MSK.filter((x) => x.track === tr).forEach((sk) => { const n = sk.ids.filter((id) => box(id) === 0); out.push(...shuffle(n).slice(0, 2)); }); return; }
      for (const sk of MSK.filter((x) => x.track === tr)) {
        if (!skillUnlocked(sk)) break;
        sk.ids.forEach((id) => { if (box(id) === 0) out.push(id); });
        if (out.length >= 12) break;
      }
    });
    return weave(TEST() ? shuffle(out) : out, topicNews('math'), 2);
  }
  function newRead(rot) {
    const c = {
      l: D.LETTERS.filter((L) => box('l:' + L.g) === 0).map((L) => 'l:' + L.g),
      s: stageUnlocked('s') ? shuffle(sylAvailable().filter((s) => box('s:' + s) === 0)).map((s) => 's:' + s) : [],
      w: stageUnlocked('w') ? wordsAvail().filter((i) => box('w:' + i) === 0).map((i) => 'w:' + i) : [],
      t: stageUnlocked('t') ? D.SENTENCES.map((s, i) => i).filter((i) => box('t:' + i) === 0).map((i) => 't:' + i) : [],
      g: topicNews('read')
    };
    const higher = ['s', 'w', 't', 'g'].filter((k) => c[k].length);
    if (!higher.length) return c.l;
    // Buchstaben und höhere Stufen abwechselnd, höhere Stufen reihum
    const out = []; let hi = rot || 0;
    while (c.l.length || higher.some((k) => c[k].length)) {
      if (c.l.length) out.push(c.l.shift());
      for (let tries = 0; tries < 3; tries++) { const k = higher[hi++ % higher.length]; if (c[k].length) { out.push(c[k].shift()); break; } }
      if (out.length > 40) break;
    }
    return out;
  }
  function newRu() {
    const w = D.RU_WORDS.map((x, i) => i).filter((i) => box('ru:' + i) === 0).map((i) => 'ru:' + i);
    const f = stageUnlocked('rf') ? D.RU_PHRASES.map((x, i) => i).filter((i) => box('rf:' + i) === 0).map((i) => 'rf:' + i) : [];
    if (!f.length) return w;
    const out = []; while (w.length || f.length) { if (w.length) out.push(w.shift()); if (f.length) out.push(f.shift()); }
    return out;
  }
  function allSeen(pool) { return Object.keys(state.items).filter((k) => poolOf(k) === pool && state.items[k].b >= 1 && valid(k)); }
  const newAcc = () => { const r = state.newRecent || []; return r.length < 5 ? 1 : r.reduce((a, b) => a + b, 0) / r.length; };
  function accuracy() { const r = state.recent; if (!r.length) return 1; return r.reduce((a, b) => a + b, 0) / r.length; }

  function grade(id, ok, info = {}) {
    const s = getItem(id); const today = dayNum(); const wasNew = s.b === 0; const before = s.b;
    s.n++; s.l = today;
    if (ok) {
      s.r++;
      if (S && S.wrongSet.has(id)) { s.b = 1; s.d = today + 1; }
      else if (info.helped) { s.b = Math.max(1, s.b); s.d = today + 1; }
      else if (wasNew && info.fast && poolOf(id) === 'math') { s.b = 3; s.d = today + 3; }
      else if (wasNew) { s.b = 2; s.d = today + 1; }
      else if (s.d > today) { /* Extra-Übung, nicht fällig: Kasten bleibt */ }
      else { s.b = Math.min(6, s.b + 1); s.d = today + INTERVAL[s.b]; }
      // Selbst bewertet (vorlesen/sprechen): höchstens „geübt“ – „sicher“ nur über Aufgaben, die die App prüft
      if (info.self && s.b > 2) { s.b = 2; s.d = Math.min(s.d, today + 2); }
    } else {
      s.w++; s.b = 1; s.d = today; if (S) S.wrongSet.add(id);
    }
    state.recent.push(ok ? 1 : 0); if (state.recent.length > 30) state.recent.shift();
    if (wasNew) { state.newRecent.push(ok ? 1 : 0); if (state.newRecent.length > 10) state.newRecent.shift(); }
    // Einstufung je Mathe-Stufe: 6 neue Aufgaben, mind. 5 schnell richtig → Rest der Stufe gilt als bekannt (wird verteilt wiederholt)
    const sk = SKILL_OF[id];
    const TPC = !sk && !/^(l|s):/.test(id) ? topicOf(id) : null;
    const grp = sk ? sk.k : id.startsWith('l:') ? 'L' : id.startsWith('s:') ? 'S' : TPC ? 'T:' + TPC.k : null;
    if (wasNew && grp) {
      const c = state.checks[grp] || (state.checks[grp] = { n: 0, ok: 0, done: false });
      if (!c.done) {
        c.n++; if (ok && (info.fast || !sk)) c.ok++;
        // Schnelle Einstufung: 4 von 4 richtig → Rest der Stufe gilt als sicher (Fach 3); sonst nach 6 mit mind. 5 richtig → Fach 2
        const perfect = c.n === 4 && c.ok === 4;
        if (perfect || c.n >= 6) {
          c.done = true;
          if (perfect || c.ok >= 5) {
            const rest = sk ? sk.ids : grp === 'L' ? D.LETTERS.map((L) => 'l:' + L.g) : grp === 'S' ? sylAvailable().map((x) => 's:' + x) : TPC.ids;
            rest.forEach((x, k) => { if (box(x) === 0) { const it = getItem(x); it.b = perfect ? 3 : 2; it.d = today + (perfect ? 3 + (k % 10) : 1 + (k % 4)); } });
          }
        }
      }
    }
    if (S) { if (s.b >= 3 && before < 3) S.secured.push(id); if (wasNew && ok) S.learned.push(id); }
    save();
  }

  // ---------- Runde ----------
  let S = null;
  function buildSession(pools, N) {
    const today = dayNum();
    const due = {};
    const inRound = (k) => !k.startsWith('hw:'); // Blitzwörter übt das Lese-Training
    pools.forEach((p) => { due[p] = allSeen(p).filter((k) => inRound(k) && state.items[k].d <= today).sort((x, y) => (state.items[x].d - state.items[y].d) || (state.items[x].b - state.items[y].b)); });
    const acc = accuracy();
    const newQ = state.recent.length < 10 ? 4 : acc >= 0.9 ? 5 : acc >= 0.8 ? 3 : acc >= 0.65 ? 2 : 1;
    const reviews = []; let i = 0;
    while (reviews.length < N - newQ && pools.some((p) => due[p].length)) { const p = pools[i++ % pools.length]; if (due[p].length) reviews.push(due[p].shift()); }
    const room = N - reviews.length;
    // Viel Neues nur, solange Neues klappt (Einstufung). Sonst: wenig Neues zwischen viel Bekanntem.
    const placing = newAcc() >= 0.85;
    const newCount = Math.min(room, placing && reviews.length < N - newQ ? 8 : newQ);
    const news = []; let r = 0, guard = 0;
    const cand = { math: newMath(), read: newRead(0), ru: newRu() };
    while (news.length < newCount && guard++ < 50) {
      const p = pools[r++ % pools.length]; const c = cand[p].find((id) => !news.includes(id));
      if (c) news.push(c); else if (!pools.some((q) => cand[q].some((id) => !news.includes(id)))) break;
    }
    let known = [];
    if (reviews.length + news.length < N) {
      known = pools.flatMap(allSeen).filter((k) => inRound(k) && !reviews.includes(k) && box(k) >= 2).sort((x, y) => state.items[x].l - state.items[y].l).slice(0, N - reviews.length - news.length);
    }
    const warm = reviews.slice(0, 3);
    let rest = shuffle(reviews.slice(3).concat(news, known));
    if (pools.length > 1) { const by = pools.map((p) => rest.filter((k) => poolOf(k) === p)); rest = []; while (by.some((a) => a.length)) by.forEach((a) => { if (a.length) rest.push(a.shift()); }); }
    return warm.concat(rest).map((id) => ({ id, isNew: box(id) === 0, retry: false }));
  }
  function startSession(world, intro) {
    setTimeout(() => { try { flushReports(); } catch (e) { } }, 1500);
    const pools = world === 'mix' ? ['read', 'math', 'read', 'ru', 'read'] : [world];
    const N = state.settings.perSession;
    S = { world, pools, N, queue: [], done: 0, right: 0, used: new Set(), wrongSet: new Set(), newWrongStreak: 0, danced: false, seenKind: {}, secured: [], learned: [], retries: 0, rot: 1, stars0: skillStars(), unl0: unlockSnap(), locked: false, intro: intro || null, t0: Date.now() };
    S.queue = buildSession(pools, N);
    S.newIds = new Set();
    S.queue.forEach((t) => { S.used.add(t.id); if (t.isNew) S.newIds.add(t.id); });
    nextTask();
  }
  function nextNew() {
    for (let k = 0; k < S.pools.length; k++) {
      const p = S.pools[S.rot++ % S.pools.length];
      const c = (p === 'math' ? newMath() : p === 'ru' ? newRu() : newRead(S.rot)).find((id) => !S.used.has(id));
      if (c) return c;
    }
    return null;
  }
  function nextExtra() {
    const c = S.pools.flatMap(allSeen).filter((k) => !S.used.has(k));
    c.sort((x, y) => (state.items[x].b - state.items[y].b) || (state.items[x].l - state.items[y].l));
    return c[0] || null;
  }
  function testPool() {
    if (TEST()) {
      const all = activeMSK().flatMap((sk) => shuffle(sk.ids).slice(0, 2)).concat(D.LETTERS.map((L) => 'l:' + L.g), D.WORDS.map((w, i) => 'w:' + i), D.SENTENCES.map((x, i) => 't:' + i), D.RU_WORDS.map((x, i) => 'ru:' + i));
      return all.filter((k) => valid(k) && chooseTestKind(k));
    }
    return Object.keys(state.items).filter((k) => valid(k) && state.items[k].b >= 2 && chooseTestKind(k));
  }
  function testAvailable() { return (TEST() || state.sessions - (state.tests.lastAt || 0) >= 3) && testPool().length >= 8; }
  function startTest() {
    const all = TEST() ? shuffle(testPool()) : testPool().sort((x, y) => state.items[x].l - state.items[y].l);
    const by = {}; all.forEach((k) => { (by[poolOf(k)] = by[poolOf(k)] || []).push(k); });
    const pools = Object.keys(by); const pickList = [];
    Object.values(by).forEach((a) => { by[poolOf(a[0])] = shuffle(a.slice(0, 12)); });
    let i = 0; while (pickList.length < 10 && pools.some((p) => by[p].length)) { const p = pools[i++ % pools.length]; if (by[p].length) pickList.push(by[p].shift()); }
    S = { world: 'test', test: true, pools, N: pickList.length, queue: shuffle(pickList).map((id) => ({ id, kind: chooseTestKind(id), isNew: false, retry: false })), done: 0, right: 0, used: new Set(pickList), wrongSet: new Set(), newWrongStreak: 0, danced: true, seenKind: {}, secured: [], learned: [], retries: 0, rot: 1, stars0: skillStars(), unl0: unlockSnap(), locked: false, intro: "p:test", newIds: new Set(), t0: Date.now() };
    nextTask();
  }
  function topUp() {
    if (S.test) return;
    const nonRetry = S.queue.filter((q) => !q.retry).length;
    if (S.done + nonRetry >= S.N) return;
    const newInSession = [...S.used].filter((k) => S.newIds.has(k)).length;
    let id = S.newWrongStreak < 2 && (newAcc() >= 0.85 || newInSession < Math.ceil(S.N * 0.3)) ? nextNew() : null;
    if (!id) id = nextExtra();
    if (!id && S.newWrongStreak >= 2) id = nextNew();
    if (id) { S.used.add(id); if (box(id) === 0) S.newIds.add(id); S.queue.push({ id, isNew: box(id) === 0, retry: false }); }
  }
  function nextTask() {
    if (!S) return showHome();
    if (S.tryOut) { S = null; return showParents('try'); }
    if (!S.danced && state.settings.dance && S.done > 0 && S.done >= Math.floor(S.N / 2)) { S.danced = true; return showDance(); }
    if (!S.queue.length) topUp();
    if (!S.queue.length) return endSession();
    renderTask(S.queue.shift());
  }
  function sessionsToday() { const d = state.days[dayKey(dayNum())]; return d ? d.s : 0; }
  function canPlay() { if (TEST() || KEVIN_WEB) return true; const today = dayNum(); return sessionsToday() < state.settings.perDay + (state.extra.day === today ? state.extra.n : 0); }

  // ---------- Bericht an Kevins Handy (ntfy-App) ----------
  const REPORT_TOPIC = 'maxschmanny-20c1bdecb986';
  function lernstandText() {
    const ids = Object.keys(state.items); const sic = (pre) => ids.filter((k) => pre.test(k) && state.items[k].b >= 3).length;
    const lvl = MSK.filter((sk) => sk.track === 'pm' && skillUnlocked(sk)).pop();
    const st = ['t', 'w', 's', 'l'].find((x) => stageUnlocked(x)); const stN = { l: 'Buchstaben', s: 'Silben', w: 'Wörter', t: 'Sätze' }[st];
    const days = Object.keys(state.days).length; const lastTest = state.tests.list[state.tests.list.length - 1];
    return [`Rechnen: Stufe „${lvl ? lvl.n : '–'}“, ${sic(/^(ad|sb|m|dv):/)} Aufgaben sicher`, `Lesen: bis ${stN}, ${sic(/^(l|s|w|t):/)} sicher`, `2. Klasse-Themen: ${sic(/^(vgl|dop|hal|nb|zs|hz|geld|uhr|len|form|sach|sz|abc|reim|dik|art|mz|wa|gk|zz|hw):/)} sicher`, `Russisch: ${sic(/^(ru|rf):/)} sicher`, `Übungstage gesamt: ${days}`, lastTest ? `Letzter Test: ${lastTest.r}/${lastTest.n}` : null].filter(Boolean).join('\n');
  }
  function report(res, d) {
    const min = S.t0 ? Math.max(1, Math.round((Date.now() - S.t0) / 60000)) : 0;
    const world = S.test ? 'Test' : ({ math: 'Rechnen', read: 'Lesen', ru: 'Russisch', mix: 'Gemischt' })[S.world] || S.world;
    const pct = res.done ? Math.round(100 * res.right / res.done) : 0;
    const lines = [`${world}: ${res.right} von ${res.done} richtig (${pct} %), ${min} Min.`, `Heute: ${d.s} ${d.s === 1 ? 'Runde' : 'Runden'}, ${d.t} Aufgaben`];
    if (res.unlocks && res.unlocks.length) lines.push('Neu frei: ' + res.unlocks.map((u) => (typeof u === 'string' ? u : u.s)).join(', '));
    if (res.secured && res.secured.length) lines.push(`Neu sicher: ${res.secured.length} Aufgaben`);
    if (S.wrongSet && S.wrongSet.size) lines.push('Schwer heute: ' + [...S.wrongSet].slice(0, 5).map(itemLabel).join(' · '));
    lines.push('', lernstandText());
    const title = `${state.name || 'Diana'} hat geübt ${pct >= 80 ? '⭐' : '✅'}`;
    sendReport(title, lines.join('\n'), 2);
  }
  // prio: 1 = still in der Liste, 2 = leise (kein Ton), 3 = normale Benachrichtigung
  function sendReport(title, msg, prio) {
    if (VIEWER || state.settings.report === false) return;
    state.outbox = (state.outbox || []).concat([{ title, msg, at: Date.now(), prio: prio || 3 }]).slice(-20); save(); flushReports();
    setTimeout(() => pushSnapshot(false), 1500);
  }
  // Wo ist sie gerade? (für Kevin)
  const WHERE = [['task ice', 'Eisbahn (Rechnen)'], ['task pool', 'Schwimmbad (Lesen)'], ['task ru', 'Russisch'], ['task', 'Aufgabe'], ['lese', 'Lese-Training'], ['album', 'Anziehen'], ['dance', 'Tanz-Pause'], ['home', 'Startseite'], ['story', 'Geschichte'], ['stories', 'Geschichte'], ['parents', 'Eltern-Bereich'], ['map', 'Tänze/Weg/Post/Trickbuch'], ['end', 'Runden-Ende'], ['splash', 'Startbild (Los-Knopf)'], ['setup', 'Einrichtung']];
  function whereLabel(cls) { const c = ' ' + cls + ' '; const f = WHERE.find(([k]) => k.split(' ').every((x) => c.includes(' ' + x + ' '))); return f ? f[1] : cls.replace('screen', '').trim() || '–'; }
  function fullStatusText() {
    const L = state.lese || { log: [] }; const ll = L.log.filter((x) => x.teppich != null).slice(-3).reverse();
    const today = dayKey(dayNum()); const d = state.days[today];
    const wob = Object.keys(state.items).filter((id) => (state.items[id].w || 0) >= 2 && box(id) < 3).sort((a, b) => state.items[b].w - state.items[a].w).slice(0, 6);
    const ago = (t) => { if (!t) return '–'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'gerade eben' : m < 60 ? `vor ${m} Min.` : m < 1440 ? `vor ${Math.round(m / 60)} Std.` : `vor ${Math.round(m / 1440)} Tagen`; };
    return [
      `Gerade: ${document.hidden ? 'App im Hintergrund' : 'App offen'} · ${state.where || '–'} (${ago(state.whereAt)})`,
      `Heute: ${d ? `${d.s} Runden, ${d.t} Aufgaben, ${d.r} richtig` : 'noch nicht geübt'} · Lese-Training heute: ${leseToday() ? 'ja ✓' : 'nein'}`,
      '', lernstandText(),
      `Lesetext-Stufe: ${leseLvl()} von ${D.LSTUFEN.length}`,
      ll.length ? 'Letzte Lese-Trainings: ' + ll.map((x) => `${x.d.slice(8, 10)}.${x.d.slice(5, 7)}. St.${x.lvl || 1} ${x.teppich} Silben, ${x.wpm2 || x.wpm1 || '–'} W/min, Frage ${x.frage == null ? '–' : x.frage ? '✓' : '✗'}${x.partial ? ' (abgebr.)' : ''}`).join(' | ') : 'Noch kein Lese-Training',
      wob.length ? 'Wackelt: ' + wob.map((id) => `${itemLabel(id)} (${state.items[id].w}×)`).join(' · ') : 'Wackelt: nichts',
      `Geschichte: ${state.story.unlocked} von ${D.STORY.length} Kapiteln frei · Post: ${Object.keys((state.posts || {}).read || {}).length} Briefe gelesen`,
      `Anziehen: ${state.stickers.owned.length} von ${D.STICKERS.length} Sachen · Tänze: ${state.dances.length}`,
      `Einstellungen: ${state.settings.perDay} Runden/Tag à ${state.settings.perSession} Aufgaben, Mal ${state.settings.mal ? 'an' : 'aus'}`,
      `Radio: ${Object.keys(state.musicBad || {}).length ? 'gehen nicht: ' + Object.keys(state.musicBad).map((id) => 'youtu.be/' + id).join(' ') : 'alle Lieder liefen bisher'}`,
      `App-Version: ${window.__APP_VERSION || 'Web'}`
    ].join('\n');
  }
  // ---------- Spielstand-Abgleich fürs Zuschauen (Kevin sieht die App mit Dianas Stand) ----------
  const VIEWER = !!window.__VIEWER;
  const SYNC_TOPIC = REPORT_TOPIC + '-sync';
  let lastSnap = 0;
  async function b64gzip(str) {
    if (typeof CompressionStream === 'undefined') return 'j' + btoa(unescape(encodeURIComponent(str)));
    const buf = await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return 'g' + btoa(bin);
  }
  async function unb64gzip(d) {
    if (d[0] === 'j') return decodeURIComponent(escape(atob(d.slice(1))));
    const bin = atob(d.slice(1)); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  async function pushSnapshot(force) {
    if (VIEWER || state.settings.report === false) return;
    if (!force && Date.now() - lastSnap < 300000) return; lastSnap = Date.now();
    try {
      const snap = Object.assign({}, state, { rec: {}, outbox: [], dances: (state.dances || []).map((d) => ({ name: d.name, props: d.props, img: '' })), chat: (state.chat || []).map((c) => Object.assign({}, c, { img: c.img ? '(Bild)' : undefined })), _snapAt: Date.now(), _where: state.where });
      const data = await b64gzip(JSON.stringify(snap)); const id = Date.now().toString(36); const N = Math.ceil(data.length / 3500);
      for (let i = 0; i < N; i++) { const r = await fetch(`https://ntfy.sh/${SYNC_TOPIC}`, { method: 'POST', body: `MSS|${id}|${i}|${N}|${data.slice(i * 3500, (i + 1) * 3500)}` }); if (!r.ok) return; }
    } catch (e) { }
  }
  async function fetchSnapshot() {
    const r = await fetch(`https://ntfy.sh/${SYNC_TOPIC}/json?poll=1&since=12h`); if (!r.ok) throw new Error('ntfy ' + r.status);
    const parts = {};
    (await r.text()).split('\n').forEach((l) => { try { const m = JSON.parse(l); const x = (m.message || '').split('|'); if (x[0] !== 'MSS') return; const [, id, i, n] = x; (parts[id] = parts[id] || { n: +n, c: {} }).c[+i] = x.slice(4).join('|'); } catch (e) { } });
    const ids = Object.keys(parts).filter((id) => Object.keys(parts[id].c).length === parts[id].n).sort((a, b) => parseInt(b, 36) - parseInt(a, 36));
    if (!ids.length) return null;
    const P = parts[ids[0]]; let d = ''; for (let i = 0; i < P.n; i++) d += P.c[i];
    return JSON.parse(await unb64gzip(d));
  }
  async function viewerLoad(bar) {
    bar.textContent = '👀 Lade Dianas Spielstand …';
    let snap = null; try { snap = await fetchSnapshot(); } catch (e) { }
    if (snap) {
      state = Object.assign(defaults(), snap, { settings: Object.assign(defaults().settings, snap.settings || {}, { report: false, tts: snap.settings ? snap.settings.tts : false }) });
      state.tourSeen = 999; state.explained = Object.fromEntries(Object.keys(D.EXPLAIN || {}).map((k) => [k, 1])); save();
    }
    const old = !snap && state._snapAt ? state : null; // letzter Stand, den dieser Browser schon geladen hatte
    const S0 = snap || old;
    const when = S0 ? new Date(S0._snapAt).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;
    bar.replaceChildren(h('span', null, snap ? `👀 Dianas Spielstand von ${when}${snap._where ? ' · zuletzt: ' + snap._where : ''}` : old ? `👀 Nichts Neues in den letzten 12 Stunden. Letzter bekannter Stand: ${when}` : '👀 Noch kein Spielstand. Tipp auf „Vom Tablet anfordern“, während Diana die App offen hat.'),
      h('button', { onclick: () => viewerLoad(bar) }, '🔄 Neu laden'),
      h('button', { onclick: async (e) => { e.target.disabled = true; try { await fetch(`https://ntfy.sh/${REPORT_TOPIC}`, { method: 'POST', body: 'spielstand' }); } catch (er) { } e.target.textContent = '⏳ Warte aufs Tablet (bis 1 Min.) …'; setTimeout(() => viewerLoad(bar), 75000); } }, '📲 Vom Tablet anfordern'),
      h('small', null, 'Nur ansehen: Was du hier tippst, ändert nichts auf Dianas Tablet.'));
    showHome();
  }
  // Kevin schreibt „stand“ ins ntfy-Thema -> App antwortet mit dem kompletten Stand (wenn sie offen ist)
  async function pollCommands() {
    if (VIEWER || state.settings.report === false || document.hidden) return;
    const since = state.cmdSince || Math.floor(Date.now() / 1000) - 300;
    try {
      const r = await fetch(`https://ntfy.sh/${REPORT_TOPIC}/json?poll=1&since=${since}`); if (!r.ok) return;
      const msgs = (await r.text()).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter((m) => m && m.event === 'message');
      if (msgs.length) state.cmdSince = Math.max(...msgs.map((m) => m.time)) + 1;
      if (msgs.some((m) => /^\s*(stand|status|wo)\s*[?!.]*\s*$/i.test(m.message || ''))) sendReport(`${state.name || 'Diana'}: kompletter Stand 📋`, fullStatusText());
      if (msgs.some((m) => /^\s*(stand|status|wo|spielstand)\s*[?!.]*\s*$/i.test(m.message || ''))) pushSnapshot(true);
      for (const m of msgs) {
        const txt = (m.message || '').trim(); const fk = txt.match(/^fotos?\s+([A-Za-z0-9_-]{20,})$/i);
        if (fk) { unlockPrivPhotos(fk[1]).then((n) => sendReport('Familienfotos 📸', n > 0 ? `${n} Fotos sind jetzt im Foto-Rätsel ✓` : 'Der Code hat nicht gepasst.', 2)); continue; }
        if (!txt || m.title || m.attachment || /^\s*(stand|status|wo|spielstand)\s*[?!.]*\s*$/i.test(txt)) continue;
        addKevinMsg(txt, (m.time || 0) * 1000);
      }
      save();
    } catch (e) { }
  }
  let openedAt = Date.now(), hiddenAt = 0;
  function appOpened(first) { if (VIEWER) return; openedAt = Date.now(); sendReport(`${state.name || 'Diana'} hat die App geöffnet 📱`, first ? 'App gestartet.' : 'Zurück in der App.', 1); }
  setTimeout(() => appOpened(true), 2500);
  setTimeout(pollCommands, 4000); setInterval(pollCommands, 60000);
  document.addEventListener('visibilitychange', () => {
    if (VIEWER) return;
    if (document.hidden) { hiddenAt = Date.now(); pushSnapshot(true); const min = Math.max(1, Math.round((Date.now() - openedAt) / 60000)); const d = state.days[dayKey(dayNum())]; sendReport(`${state.name || 'Diana'} war ${min} Min. in der App`, `Heute: ${d ? `${d.s} ${d.s === 1 ? 'Runde' : 'Runden'}, ${d.r} von ${d.t} richtig` : 'keine Runde'} · Lese-Training: ${leseToday() ? 'ja ✓' : 'nein'}\nZuletzt: ${state.where || '–'}`, 3); }
    else if (hiddenAt && Date.now() - hiddenAt > 10 * 60000) { appOpened(false); pollCommands(); }
  });
  async function flushReports() {
    const box = (state.outbox || []).slice(); if (!box.length) return;
    for (const m of box) {
      try {
        const when = new Date(m.at).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
        const r = await fetch(`https://ntfy.sh/${REPORT_TOPIC}?title=${encodeURIComponent(m.title)}&tags=books&priority=${m.prio || 3}`, { method: 'POST', body: `${when}\n${m.msg}` });
        if (!r.ok) return;
        state.outbox = state.outbox.filter((x) => x !== m && x.at !== m.at); save();
      } catch (e) { return; }
    }
  }
  function endSession() {
    const today = dayNum(); const key = dayKey(today);
    const d = state.days[key] || (state.days[key] = { s: 0, t: 0, r: 0 });
    d.s++; d.t += S.done; d.r += S.right; state.sessions++;
    let newChapter = false;
    if (state.story.lastDay !== today && state.story.unlocked < D.STORY.length) { state.story.unlocked++; state.story.lastDay = today; newChapter = true; }
    const st = skillStars(); const miles = [];
    for (const k in st) if (st[k] === 3 && !state.miles[k]) { state.miles[k] = 1; miles.push(k); }
    const un = unlockSnap();
    const unlocks = un.r.filter((b) => !S.unl0.r.includes(b)).map((b) => (MSK.find((x) => x.k === b) || {}).n || b).concat(un.st.filter((x) => !S.unl0.st.includes(x)).map((x) => ({ s: 'Silben lesen', w: 'Wörter lesen', t: 'Sätze lesen' }[x])));
    const gifts = [];
    const take = () => { const un2 = D.STICKERS.filter((s) => !state.stickers.owned.includes(s.id)); if (!un2.length) return; const g = pick(un2); state.stickers.owned.push(g.id); gifts.push(g); };
    if (state.sessions === 1 || Math.random() < 0.4) take();
    if (miles.length) take();
    const res = { done: S.done, right: S.right, secured: S.secured.slice(), learned: S.learned.slice(), miles, unlocks, gifts, newChapter, hadWrong: S.wrongSet.size > 0 };
    try { report(res, d); } catch (e) { }
    if (S.test) {
      state.tests.lastAt = state.sessions; state.tests.list.push({ d: key, r: S.right, n: S.done });
      if (S.done && S.right / S.done >= 0.7) { const pk = D.STICKERS.find((x) => x.id === 'pokal'); if (pk && !state.stickers.owned.includes('pokal')) { state.stickers.owned.push('pokal'); res.gifts.push(pk); } }
      S = null; save(); return showCertificate(res);
    }
    S = null; save();
    showEnd(res);
  }

  // ---------- Bildschirme ----------
  function mount(screen, bg) {
    onHome = false; try { MenuMusic.hide(); } catch (e) { } Voice.stop(); try { Mic.stop(); } catch (e) { } if (typeof Beat !== 'undefined') Beat.stop();
    document.body.className = 'bg-' + (bg || 'home');
    app.replaceChildren(screen);
    try { state.where = whereLabel(screen.className || ''); state.whereAt = Date.now(); save(); } catch (e) { }
    window.scrollTo(0, 0);
  }
  function iconBtn(label, sym, onclick, cls) { return h('button', { class: 'icon-btn ' + (cls || ''), 'aria-label': label, title: label, onclick }, sym); }

  function showSplash() {
    const scr = h('main', { class: 'screen splash' },
      h('div', { class: 'splash-title' }, h('h1', { class: 'logo' }, 'Max & Schmanny'), h('p', { class: 'tag' }, 'Das Lern-Abenteuer auf Eis und im Wasser')),
      h('div', { class: 'scene big' }, svgEl(svgCat(), 'c-cat'), svgEl(svgMax(), 'c-max hop-in'), svgEl(svgPablo(), 'c-pablo')),
      h('button', { class: 'tile go huge', id: 'start-btn', onclick: () => { SFX.unlock(); SFX.tap(); try { speechSynthesis.getVoices(); } catch (e) { } state.name ? showHome(true) : showSetup(); } }, 'Los!')
    );
    mount(scr, 'home');
  }

  function catPicker(onChange) {
    const row = h('div', { class: 'cat-pick' });
    Object.entries(D.CAT_COLORS).forEach(([k, c]) => {
      const b = h('button', { class: 'cat-opt' + (state.cat === k ? ' on' : ''), type: 'button', onclick: () => { state.cat = k; save(); row.querySelectorAll('.cat-opt').forEach((x) => x.classList.remove('on')); b.classList.add('on'); onChange && onChange(); } },
        h('span', { class: 'swatch', style: `background:${c.fur};box-shadow: inset -8px -8px 0 ${c.light}` }), c.n);
      row.append(b);
    });
    return row;
  }

  function showSetup() {
    const input = h('input', { id: 'setup-name', type: 'text', maxlength: '20', placeholder: 'Name', autocomplete: 'off', value: state.name || '' });
    const err = h('p', { class: 'err', 'aria-live': 'polite' });
    const preview = h('div', { class: 'setup-cat' }, svgEl(svgCat(), 'c-cat'));
    const scr = h('main', { class: 'screen setup' },
      h('h1', { class: 'h-display' }, 'Kurz einrichten'),
      h('p', { class: 'note' }, 'Das machst am besten du (Kevin) oder Mama. Danach spielt sie allein.'),
      h('label', { for: 'setup-name', class: 'lbl' }, 'Wie heißt deine Schwester?'), input,
      h('p', { class: 'lbl' }, 'Welche Farbe hat Schmanny?'), preview,
      catPicker(() => { preview.replaceChildren(svgEl(svgCat(), 'c-cat')); }),
      err,
      h('button', { class: 'tile go', id: 'setup-done', onclick: () => { const n = input.value.trim(); if (!n) { err.textContent = 'Bitte den Namen eintragen.'; input.focus(); return; } state.name = n; save(); showHome(true); } }, 'Fertig'),
      h('p', { class: 'note small' }, 'Der Lernstand wird auf diesem Gerät gespeichert. Im Eltern-Bereich (Zahnrad gedrückt halten) gibt es eine Sicherung.')
    );
    mount(scr, 'home');
  }

  function dayStrip() {
    const today = dayNum(); const row = h('div', { class: 'days', 'aria-label': 'Geübte Tage' });
    for (let i = 6; i >= 0; i--) {
      const n = today - i; const d = state.days[dayKey(n)]; const on = d && d.s > 0;
      row.append(h('div', { class: 'day' + (on ? ' on' : '') + (i === 0 ? ' today' : '') }, svgEl(PAW, 'paw-i'), h('span', null, WD[new Date(n * 86400000).getUTCDay()])));
    }
    return row;
  }

  function holdButton(onOpen) {
    let t = null;
    let t0 = 0, opened = false;
    const b = h('button', { class: 'gear', id: 'parents-btn', 'aria-label': 'Eltern-Bereich (gedrückt halten)', title: 'Eltern-Bereich: 2 Sekunden gedrückt halten' }, h('span', { 'aria-hidden': 'true' }, '⚙︎'), h('span', { class: 'gear-l' }, 'Eltern'));
    const start = (e) => { e.preventDefault(); t0 = Date.now(); opened = false; b.classList.add('holding'); t = setTimeout(() => { opened = true; b.classList.remove('holding'); onOpen(); }, 1600); };
    const end = (e) => { clearTimeout(t); b.classList.remove('holding'); if (e && e.type === 'pointerup' && !opened && t0 && Date.now() - t0 < 1600) toast('Eltern-Bereich: 2 Sekunden gedrückt halten', '⚙︎'); t0 = 0; };
    b.addEventListener('pointerdown', start); b.addEventListener('pointerup', end); b.addEventListener('pointerleave', end); b.addEventListener('pointercancel', end);
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter') onOpen(); });
    return b;
  }

  // Antippen auf dem Startbildschirm: zufälliger Clip von Kevin, nie zweimal derselbe hintereinander
  const TAPS = { cat: 6, max: 5, pablo: 3 }; const tapLast = {};
  function tapSay(who, fallbackId) {
    const ids = [...Array(TAPS[who])].map((_, k) => `tap:${who}:${k}`).filter((id) => Voice.has(id));
    if (!ids.length) { Voice.say([P(fallbackId)]); return; }
    let pool = ids.filter((k) => k !== tapLast[who]); if (!pool.length) pool = ids;
    const id = pick(pool); tapLast[who] = id; Voice.say([{ id, text: '' }]);
  }
  // Abwechslung: zufälliger aufgenommener Clip, nie derselbe wie beim letzten Mal; sonst der alte Standard-Clip
  function varied(list, key, fallback) {
    const have = (list || []).filter((x) => Voice.has(x.id)); if (!have.length) return fallback;
    state.lastVar = state.lastVar || {}; const pool = have.filter((x) => x.id !== state.lastVar[key]);
    const x = pick(pool.length ? pool : have); state.lastVar[key] = x.id; save(); return { id: x.id, text: x.t };
  }
  // ---------- Einführung: Rest wird dunkel, ein Bereich wird erklärt, Tippen = weiter ----------
  const TOUR_VERSION = 1;
  function showTour(force) {
    const steps = D.TOUR || []; if (!steps.length) return;
    let i = 0; const ov = h('div', { class: 'tour', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Einführung' });
    const hole = h('div', { class: 'tour-hole' }); const bubble = h('div', { class: 'tour-bubble' });
    ov.append(hole, bubble); document.body.append(ov);
    function place() {
      const st = steps[i]; const el = st.sel ? document.querySelector(st.sel) : null;
      bubble.replaceChildren(h('p', null, st.t), h('p', { class: 'tour-tap' }, i < steps.length - 1 ? '👆 Tippe irgendwo, wenn du es verstanden hast' : '👆 Tippe, um loszulegen'), h('span', { class: 'tour-count' }, `${i + 1} / ${steps.length}`));
      if (el) {
        el.scrollIntoView({ block: 'center' });
        setTimeout(() => {
          const r = el.getBoundingClientRect(); const pad = 8;
          Object.assign(hole.style, { display: 'block', left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + 2 * pad) + 'px', height: (r.height + 2 * pad) + 'px' });
          ov.classList.remove('center');
          const below = r.bottom + 220 < window.innerHeight; bubble.style.top = below ? (r.bottom + 18) + 'px' : Math.max(12, r.top - 18 - bubble.offsetHeight) + 'px';
        }, 250);
      } else { hole.style.display = 'none'; ov.classList.add('center'); bubble.style.top = ''; }
      Voice.say([{ id: st.id, text: st.t }]);
    }
    let lock = false;
    ov.addEventListener('click', () => {
      if (lock) return; lock = true; setTimeout(() => { lock = false; }, 600); SFX.tap();
      i++; if (i >= steps.length) { Voice.stop(); ov.remove(); state.tourSeen = TOUR_VERSION; save(); window.scrollTo(0, 0); return; }
      place();
    });
    place();
  }
  function maybeTour() {
    if ((state.tourSeen || 0) >= TOUR_VERSION || !state.name) return;
    if (!(D.TOUR || []).every((x) => Voice.has(x.id))) return; // startet erst, wenn Kevins Aufnahmen da sind
    setTimeout(() => { if (onHome && !document.querySelector('.tour, .overlay')) showTour(); }, 900);
  }
  const leseToday = () => !!(state.lese && state.lese.log.some((x) => x.d === dayKey(dayNum()) && !x.partial));
  // ---------- Kevins Musik im Menü (YouTube-Player, sichtbar unten rechts, nur auf der Startseite) ----------
  const MenuMusic = (() => {
    let player = null, ready = false, loading = false, idx = -1, want = false, ducked = false, failed = 0, bag = [];
    const bad = () => (state.musicBad || {});
    const draw = () => { if (!bag.length) bag = shuffle(L().map((_, i) => i).filter((i) => i !== idx && !bad()[L()[i].yt])); if (!bag.length) bag = shuffle(L().map((_, i) => i)); return bag.pop(); };
    const dock = h('div', { class: 'yt-dock', hidden: true }, h('div', { id: 'yt-frame' }),
      h('div', { class: 'yt-bar' }, h('span', { class: 'yt-t' }, '📻 Kevins Radio'), h('button', { class: 'yt-b', 'aria-label': 'Nächstes Lied', onclick: () => next() }, '⏭'), h('button', { class: 'yt-b', 'aria-label': 'Musik aus', onclick: () => { state.settings.menuMusic = false; save(); hide(); } }, '✕')));
    const L = () => D.MUSIC || [];
    const vol = () => Math.round((state.settings.menuVol || 12) * (ducked ? 0.35 : 1));
    function load() {
      if (loading || VIEWER || !L().length) return; loading = true;
      document.body.append(dock);
      window.onYouTubeIframeAPIReady = () => {
        const fi = L().findIndex((m) => m.first && !bad()[m.yt]); idx = fi >= 0 ? fi : draw();
        player = new YT.Player('yt-frame', { width: 200, height: 200, videoId: L()[idx].yt,
          playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, origin: location.origin, widget_referrer: 'https://michaeliskevin1-code.github.io/' },
          events: {
            onReady: () => { ready = true; player.setVolume(vol()); title(); if (want) player.playVideo(); },
            onStateChange: (e) => { if (e.data === 0) next(); if (e.data === 1) { failed = 0; title(); } },
            onError: (e) => { try { const id = L()[idx].yt; state.musicBad = Object.assign({}, state.musicBad, { [id]: (e && e.data) || 1 }); save(); } catch (er) { } if (++failed < L().length) next(); else hide(); }
          } });
      };
      const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; sc.onerror = () => { loading = false; dock.remove(); }; document.head.append(sc);
    }
    function title() { const t = dock.querySelector('.yt-t'); if (!t || !L()[idx]) return; let n = L()[idx].t; try { const d = player && player.getVideoData && player.getVideoData(); if (d && d.title) n = d.title; } catch (e) { } t.textContent = '📻 ' + (n || 'Kevins Radio'); }
    function next() { if (!ready) return; idx = draw(); player.loadVideoById(L()[idx].yt); player.setVolume(vol()); title(); }
    function show() { if (!state.settings.menuMusic || VIEWER) return; want = true; load(); dock.hidden = false; if (ready) { player.setVolume(vol()); player.playVideo(); } }
    function hide() { want = false; dock.hidden = true; if (ready) player.pauseVideo(); }
    function duck(on) { ducked = on; if (ready && want) player.setVolume(vol()); }
    return { show, hide, duck, setVol() { if (ready) player.setVolume(vol()); } };
  })();
  // Erklär-Fenster beim ersten Öffnen eines Bereichs (Kevins Stimme, sonst ausnahmsweise Gerätestimme)
  function explain(key, then) {
    const E = (D.EXPLAIN || {})[key]; state.explained = state.explained || {};
    if (!E || (then && state.explained[key])) { if (then) then(); return; }
    const say = () => Voice.say([{ id: 'erk:' + key, text: E.t, force: true }]);
    const close = () => { Voice.stop(); ov.remove(); state.explained[key] = 1; save(); if (key !== 'ehrlich' && !state.explained.ehrlich) explain('ehrlich', then || null); else if (then) then(); };
    const ov = h('div', { class: 'explain', role: 'dialog', 'aria-modal': 'true', 'aria-label': E.n },
      h('div', { class: 'explain-card' }, svgEl(svgMax({ mood: 'listen' }), 'explain-max'), h('h2', { class: 'h-display' }, E.n), h('p', { class: 'explain-t' }, E.t),
        h('div', { class: 'explain-btns' }, h('button', { class: 'tile', onclick: () => { SFX.tap(); say(); } }, '🔊 Nochmal hören'), h('button', { class: 'tile go', id: 'explain-ok', onclick: () => { SFX.tap(); close(); } }, then ? 'Verstanden, los! ✓' : 'Verstanden ✓'))));
    document.body.append(ov); setTimeout(say, 250);
  }
  const withExplain = (key, fn) => (...a) => explain(key, () => fn(...a));
  function showHelp() {
    const scr = h('main', { class: 'screen map' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showHome()), h('h1', { class: 'h-display' }, 'Was ist was?')),
      h('p', { class: 'note' }, 'Tipp auf etwas, dann erklärt Kevin es dir nochmal.'),
      h('div', { class: 'help-list' }, Object.entries(D.EXPLAIN || {}).filter(([k]) => k !== 'mix').map(([k, E]) => h('button', { class: 'tile', onclick: () => explain(k) }, E.n))));
    mount(scr, 'home');
  }
  function showHome(greet) {
    if (practiceDays() > 0 || state.sessions > 0 || TEST()) ensureMission();
    const can = canPlay();
    // Malen, Foto-Rätsel, Tänze erst, wenn die Runden für heute geschafft sind (Max schläft)
    const funOpen = TEST() || KEVIN_WEB || sessionsToday() >= state.settings.perDay;
    const fun = (fn) => funOpen ? fn : () => { SFX.tap(); toast('Erst die Aufgaben für heute! Wenn Max schläft, darfst du das. 😴', '🔒'); };
    const lockMark = funOpen ? null : h('span', { class: 'lock-badge' }, '🔒');
    const unreadChapter = state.story.unlocked > 0 && !state.story.read[state.story.unlocked - 1];
    const newSticker = state.stickers.owned.length > (state.stickers.seen || 0);
    const maxEl = svgEl(svgMax({ mood: can ? 'happy' : 'sleep' }), 'c-max');
    const catEl = svgEl(svgCat(), 'c-cat');
    const pabloEl = svgEl(svgPablo(), 'c-pablo');
    maxEl.addEventListener('click', () => { maxEl.classList.remove('hop'); void maxEl.offsetWidth; maxEl.classList.add('hop'); tapSay('max', 'p:wau'); });
    catEl.addEventListener('click', () => tapSay('cat', 'p:miau'));
    pabloEl.addEventListener('click', () => { pabloEl.classList.remove('wiggle'); void pabloEl.offsetWidth; pabloEl.classList.add('wiggle'); tapSay('pablo', 'p:pablohi'); });
    const go = (world, clip) => () => { SFX.tap(); explain(world, () => startSession(world, clip)); };
    const leseOk = leseToday(), roundOk = sessionsToday() >= 1;
    const todayRun = () => { if (!leseOk) explain('lese', () => showLeseTraining({ then: () => explain('mix', () => startSession('mix', 'p:mix')) })); else if (!roundOk) explain('mix', () => startSession('mix', 'p:mix')); else { SFX.fanfare(); toast('Heute alles geschafft! Jetzt hast du frei.', '🎉'); } };
    const todayCard = can ? h('button', { class: 'today' + (leseOk && roundOk ? ' done' : ''), id: 'go-today', onclick: () => { SFX.tap(); explain('heute', todayRun); } },
      h('span', { class: 't-sun' }, leseOk && roundOk ? '🎉' : '☀️'),
      h('span', { class: 't-main' }, h('span', { class: 't-name' }, leseOk && roundOk ? 'Heute geschafft!' : 'Heute'),
        h('span', { class: 't-steps' }, h('span', { class: 't-step' + (leseOk ? ' ok' : '') }, (leseOk ? '✓' : '1') + ' Lese-Training'), h('span', { class: 't-step' + (roundOk ? ' ok' : '') }, (roundOk ? '✓' : '2') + ' Kleine Runde'))),
      h('span', { class: 't-go' }, leseOk && roundOk ? 'Frei!' : 'Los ▶')) : null;
    const worlds = can
      ? h('div', { class: 'worlds' },
        h('button', { class: 'world lese' + (leseToday() ? ' done' : ''), id: 'go-lese', onclick: () => { SFX.tap(); explain('lese', showLeseTraining); } }, h('span', { class: 'w-ico' }, '📖'), h('span', { class: 'w-name' }, 'Lese-Training'), h('span', { class: 'w-sub' }, leseToday() ? 'Heute geschafft ✓' : '5 Minuten, jeden Tag')),
        h('button', { class: 'world ice', id: 'go-math', onclick: go('math', 'p:eisbahn') }, h('span', { class: 'w-ico' }, '⛸️'), h('span', { class: 'w-name' }, 'Eisbahn'), h('span', { class: 'w-sub' }, 'Rechnen'), h('span', { class: 'w-demo' }, '13 − 5')),
        h('button', { class: 'world pool', id: 'go-read', onclick: go('read', 'p:schwimmbad') }, h('span', { class: 'w-ico' }, '🏊'), h('span', { class: 'w-name' }, 'Schwimmbad'), h('span', { class: 'w-sub' }, 'Buchstaben & Wörter'), h('span', { class: 'w-demo' }, h('span', { class: 'sy s0' }, 'Le'), h('span', { class: 'sy s1' }, 'sen'))),
        h('button', { class: 'world ru', id: 'go-ru', onclick: go('ru', 'p:russisch') }, h('span', { class: 'w-ico' }, '🗣️'), h('span', { class: 'w-name' }, 'Russisch'), h('span', { class: 'w-sub' }, 'Reden & Verstehen'), h('span', { class: 'w-demo' }, 'Привет!')))
      : h('div', { class: 'sleep-card' }, h('p', { class: 'h-display' }, 'Max schläft. Morgen geht’s weiter!'), h('p', { class: 'note sleep-fun' }, 'Jetzt darfst du malen, Foto-Rätsel spielen und tanzen! 🎨📸💃'),
        leseToday() ? null : h('button', { class: 'world lese', id: 'go-lese', onclick: () => { SFX.tap(); explain('lese', showLeseTraining); } }, h('span', { class: 'w-ico' }, '📖'), h('span', { class: 'w-name' }, 'Lese-Training geht noch!'), h('span', { class: 'w-sub' }, '5 Minuten')), h('p', { class: 'note' }, 'Tanz-Idee für jetzt:'), textEl(pick(D.DANCES), { cls: 'small' }));
    const scr = h('main', { class: 'screen home' },
      h('header', { class: 'home-head' }, h('h1', { class: 'hello' }, `Hallo, ${state.name}!`), TEST() ? h('p', { class: 'test-chip' }, '🧪 Test-Modus: alles frei') : null, dayStrip()),
      h('div', { class: 'scene' }, catEl, maxEl, pabloEl),
      can && testAvailable() ? h('button', { class: 'test-banner', id: 'go-test', onclick: () => { SFX.tap(); explain('test', startTest); } }, h('span', { class: 't-ico' }, '🏅'), h('span', null, h('strong', null, 'Test-Zeit!'), h('small', null, 'Zeig, was du schon kannst'))) : null,
      todayCard,
      can ? h('p', { class: 'or-pick' }, 'Oder such dir selbst etwas aus:') : null,
      worlds,
      missionCard(),
      h('nav', { class: 'minor' },
        h('button', { class: 'mini', id: 'go-story', onclick: () => { SFX.tap(); explain('story', () => showStoryList()); } }, h('span', { class: 'm-ico' }, '📖'), 'Geschichte', unreadChapter ? h('span', { class: 'badge' }, 'Neu!') : null),
        h('button', { class: 'mini', id: 'go-album', onclick: () => { SFX.tap(); explain('album', () => showAlbum()); } }, h('span', { class: 'm-ico' }, '🎀'), 'Anziehen', newSticker ? h('span', { class: 'badge' }, 'Neu!') : null),
        h('button', { class: 'mini', id: 'go-map', onclick: () => { SFX.tap(); explain('map', () => showMap()); } }, h('span', { class: 'm-ico' }, '⭐'), 'Mein Weg'),
        h('button', { class: 'mini', id: 'go-post', onclick: () => { SFX.tap(); explain('post', () => showPosts()); } }, h('span', { class: 'm-ico' }, '📮'), 'Post & Schreiben', unreadPost() || state.chatNew ? h('span', { class: 'badge' }, 'Neu!') : null),
        h('button', { class: 'mini' + (funOpen ? '' : ' locked'), id: 'go-studio', onclick: fun(() => { SFX.tap(); explain('malen', () => showStudio()); }) }, h('span', { class: 'm-ico' }, '🎨'), 'Malen', lockMark && lockMark.cloneNode(true)),
        h('button', { class: 'mini' + (funOpen ? '' : ' locked'), id: 'go-foto', onclick: fun(() => { SFX.tap(); explain('foto', () => showFotoList()); }) }, h('span', { class: 'm-ico' }, '📸'), 'Foto-Rätsel', lockMark && lockMark.cloneNode(true)),
        h('button', { class: 'mini' + (funOpen ? '' : ' locked'), id: 'go-dances', onclick: fun(() => { SFX.tap(); explain('dances', () => showDances()); }) }, h('span', { class: 'm-ico' }, '💃'), 'Meine Tänze', lockMark && lockMark.cloneNode(true)),
        h('button', { class: 'mini', id: 'go-tricks2', onclick: () => { SFX.tap(); explain('tricks', () => showTricks()); } }, h('span', { class: 'm-ico' }, '💡'), 'Trickbuch')),
      h('footer', { class: 'home-foot' }, storageOK ? null : h('p', { class: 'err' }, 'Achtung: Dieser Browser speichert gerade nichts. Fortschritt geht beim Schließen verloren.'), h('button', { class: 'help-btn', id: 'go-help', onclick: () => { SFX.tap(); showHelp(); } }, '❓ Was ist was?'), holdButton(parentGate))
    );
    mount(scr, 'home'); onHome = true; maybeTour(); MenuMusic.show();
    if (greet) setTimeout(() => Voice.say(can ? [varied(D.GREETS, 'g', P('p:hallo')), P('p:wohin')] : [P('p:muede')]), 250);
  }

  // ---------- Aufgaben ----------
  function taskScreen(t) {
    const world = { math: 'ice', read: 'pool', ru: 'ru' }[poolOf(t.id)];
    const pct = Math.min(100, Math.round((S.done / S.N) * 100));
    const replayFns = [];
    const replay = () => replayFns.forEach((f) => f());
    const promptEl = h('p', { class: 'prompt' });
    const stage = h('div', { class: 'stage' });
    const answers = h('div', { class: 'answers' });
    const runner = svgEl(world === 'ice' ? svgMax({ mood: 'happy' }) : svgMax({ mood: 'happy' }), 'runner');
    runner.style.left = pct + '%';
    const scr = h('main', { class: 'screen task ' + world },
      h('div', { class: 'topbar' },
        iconBtn('Aufhören', '✕', () => confirmQuit()),
        h('div', { class: 'track', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(S.N), 'aria-valuenow': String(S.done) }, h('div', { class: 'fill', style: `width:${pct}%` }), runner, h('span', { class: 'flag' }, '🏁')),
        iconBtn('Nochmal anhören', '🔊', () => { SFX.tap(); replay(); }, 'speak')),
      S.test ? h('span', { class: 'newbadge test' }, `🏅 Test: Aufgabe ${S.done + 1} von ${S.N}`) : t.isNew ? h('span', { class: 'newbadge' }, 'Neu ✨') : null,
      promptEl, stage, answers);
    const ui = {
      scr, stage, answers,
      promptPart: null,
      prompt(text, clip) { promptEl.textContent = text; ui.promptPart = { id: clip, text: D.PROMPTS[clip] || D.PROMPTS2[clip] || D.PROMPTS3[clip] || (D.PROMPTS4 || {})[clip] || text }; },
      audio(fn, autoAll) {
        replayFns.push(() => Voice.say(fn(true) || []));
        const first = !S.seenKind[t.kind]; S.seenKind[t.kind] = 1;
        setTimeout(() => {
          if (!document.body.contains(scr)) return;
          const isRu = poolOf(t.id) === 'ru'; const ruKey = dayKey(dayNum()); state.ruSaid = state.ruSaid || {};
          const ruFirst = isRu && state.ruSaid[t.kind] !== ruKey; if (ruFirst) { state.ruSaid[t.kind] = ruKey; save(); }
          let parts = fn(isRu ? ruFirst : (first || autoAll)) || [];
          if (S && S.intro) { parts = [S.test ? P(S.intro) : varied(D.STARTS, 's', P(S.intro))].concat(parts); S.intro = null; }
          if (parts.length) Voice.say(parts);
        }, 350);
      },
      choices(opts, isRight, cls) {
        answers.className = 'answers ' + (cls || '');
        const btns = opts.map((o) => {
          const b = h('button', { class: 'tile ans', onclick: () => { if (S.locked) return; const ok = isRight(o.value); btns.forEach((x, i) => { x.disabled = true; if (isRight(opts[i].value)) x.classList.add('right'); }); if (!ok) b.classList.add('wrong'); ui.done(ok, o); } }, o.el || o.label);
          return b;
        });
        answers.replaceChildren(...btns);
      },
      done(ok, o) { ui.onDone && ui.onDone(ok, o); }
    };
    mount(scr, world);
    return ui;
  }
  function confirmQuit() {
    if (!S) return showHome();
    const left = Math.max(1, S.N - S.done);
    const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'dialog' }, svgEl(svgMax({ mood: 'happy' }), 'quit-max'), h('p', { class: 'h-display' }, left === 1 ? 'Nur noch 1 Aufgabe!' : `Nur noch ${left} Aufgaben!`),
        h('p', { class: 'note' }, 'Dann gibt es die Belohnung 🎁. Max wartet schon.'),
        h('button', { class: 'tile go big', id: 'quit-no', onclick: () => ov.remove() }, '💪 Weiter!'),
        h('button', { class: 'link-btn', id: 'quit-yes', onclick: () => { quitReport(); S = null; ov.remove(); showHome(); } }, 'Trotzdem aufhören')));
    document.body.append(ov);
  }
  function quitReport() {
    try {
      const key = dayKey(dayNum()); const d = state.days[key] || (state.days[key] = { s: 0, t: 0, r: 0 });
      d.t += S.done; d.r += S.right; d.q = (d.q || 0) + 1; save();
      const min = S.t0 ? Math.max(1, Math.round((Date.now() - S.t0) / 60000)) : 0;
      const cur = S.cur ? `${itemLabel(S.cur.id)} (${S.cur.kind})` : '–';
      const lines = [`Abgebrochen nach ${S.done} von ${S.N} Aufgaben, ${min} Min. Richtig: ${S.right}.`, `Abgebrochen bei: ${cur}`];
      if (S.wrongSet && S.wrongSet.size) lines.push('Davor falsch: ' + [...S.wrongSet].slice(0, 5).map(itemLabel).join(' · '));
      lines.push('', lernstandText());
      sendReport(`${state.name || 'Diana'} hat abgebrochen ✋`, lines.join('\n'));
    } catch (e) { }
  }

  // Lob-Auswahl: Serie > zweiter Versuch > passend zum Fach > allgemein; nie derselbe Clip zweimal hintereinander
  let lastPraise = null;
  function praisePart(t) {
    const has = (l) => (l || []).filter((x) => Voice.has(x.id));
    const pickNew = (l) => { const p = l.filter((x) => x.id !== lastPraise); const x = pick(p.length ? p : l); lastPraise = x.id; return { id: x.id, text: x.t }; };
    if (S && S.streak >= 5 && S.streak % 5 === 0 && has(D.PRAISE_STREAK).length) return { part: pickNew(has(D.PRAISE_STREAK)), must: true };
    if (t && t.retry && has(D.PRAISE_RETRY).length) return { part: pickNew(has(D.PRAISE_RETRY)), must: true };
    const pool = t ? poolOf(t.id) : null;
    const spec = has(pool === 'math' ? D.PRAISE_MATH : pool === 'read' ? D.PRAISE_READ : []);
    const gen = has(D.PRAISE_CLIPS);
    const l = gen.concat(spec);  // allgemeines Lob gilt überall, dazu das passende fürs Fach
    if (!l.length) return { part: { id: pick(D.PRAISE_CLIPS).id, text: pick(['Richtig!', 'Super!', 'Genau!', 'Stark!']) }, must: false };
    return { part: pickNew(l), must: false };
  }
  function feedback(ui, ok, content, next, t) {
    const sheet = h('div', { class: 'sheet ' + (ok ? 'ok' : 'oops'), role: 'status' });
    let gone = false;
    const go = () => { if (gone) return; gone = true; Voice.stop(); sheet.remove(); next(); };
    const mood = ok ? 'happy' : 'sad';
    sheet.append(h('div', { class: 'sheet-in' },
      h('div', { class: 'fb-scroll' },
        h('div', { class: 'fb-row' }, svgEl(ok ? svgMax({ mood, cls: 'hop' }) : svgPablo({ mood: 'sly' }), 'fb-char'), h('p', { class: 'fb-title' }, content.title || (ok ? (content.ru ? pick(RU_PRAISE) : pick(D.PRAISE_TEXT)) : pick(D.OOPS_TEXT)))),
        ok ? null : (content.detail || null)),
      h('button', { class: 'tile go next', id: 'next-btn', onclick: go }, 'Weiter ➜')));
    ui.scr.append(sheet);
    requestAnimationFrame(() => sheet.classList.add('in'));
    if (ok) {
      SFX.ok();
      // Kein Leerlauf: Lob nur manchmal (wirkt so auch stärker), bei Mathe keine Wiederholung der Rechnung, weiter sobald der Ton fertig ist
      const parts = (content.title || (t && poolOf(t.id) !== 'math') ? (content.voice || []) : []).slice();
      if (content.ru) { if (Math.random() < 0.4) parts.unshift({ id: 'ru:molodez', text: 'Молодец!', lang: 'ru' }); }
      else { const pp = praisePart(t); if (pp.must || Math.random() < 0.35) parts.unshift(pp.part); }
      if (parts.length) { Voice.say(parts).then(() => setTimeout(go, 200)); setTimeout(go, 6000); }
      else setTimeout(go, 700);
    } else {
      SFX.oops();
      const oo = D.OOPS_CLIPS.filter((x) => Voice.has(x.id) && x.id !== lastPraise); const o = oo.length ? pick(oo) : D.OOPS_CLIPS[0]; lastPraise = o.id;
      Voice.say([{ id: o.id, text: 'Fast! Schau mal.' }].concat(content.voice || []));
    }
  }

  const RU_PRAISE = ['Молодец! Das heißt: Toll gemacht!', 'Молодец! Max bellt auf Russisch: Гав-гав!', 'Супер! Schmanny versteht dich sogar.', 'Молодец! Du sprichst wie Mama.'];
  function renderTask(t) {
    if (S) S.cur = t;
    S.locked = false;
    t.kind = t.kind || chooseKind(t.id);
    if (S.test && !t.retry) t.testNo = S.done + 1;
    const ui = taskScreen(t);
    ui.onDone = (ok, o) => {
      if (S.locked) return; S.locked = true;
      const fb = (ui.feedback && ui.feedback(ok, o)) || {};
      if (poolOf(t.id) === 'ru') fb.ru = true;
      const dt = performance.now() - (t.t0 || performance.now());
      grade(t.id, ok, { helped: ui.helps >= 2, fast: dt < (ui.fastMs || 7000), self: !!ui.self });
      if (!t.retry) { S.done++; if (ok) S.right++; }
      if (t.isNew) S.newWrongStreak = ok ? 0 : S.newWrongStreak + 1;
      S.streak = ok ? (S.streak || 0) + 1 : 0;
      feedback(ui, ok, fb, () => {
        if (!S || !document.body.contains(ui.scr)) return;
        // Fehler wiederholen: gleich nach einer Aufgabe und nochmal etwas später (wachsender Abstand)
        if (!ok && !t.retry && !S.test && S.retries < 8) {
          S.queue.splice(Math.min(1, S.queue.length), 0, { id: t.id, retry: true });
          S.queue.splice(Math.min(4, S.queue.length), 0, { id: t.id, retry: true });
          S.retries += 2;
        }
        topUp();
        nextTask();
      }, t);
    };
    ui.helps = 0;
    t.t0 = performance.now();
    (TASKS[t.kind] || TASKS.anlaut)(t, ui);
  }

  function chooseKind(id) {
    const b = box(id); const [k, x, y] = id.split(':'); const r = Math.random();
    const TT = TOPIC_BY[k]; if (TT) return typeof TT.kind === 'function' ? TT.kind(b) : TT.kind;
    if (k === 'm') {
      const a = +x, bb = +y; const story = !!D.MATH_STORIES[bb] && a > 1;
      if (b <= 1) return 'pfoten';
      if (b === 2) return r < 0.6 ? 'tippen' : r < 0.8 ? 'pfoten' : 'maxfehler';
      return pick(['tippen', 'blitz', 'pablo', 'fehlt', 'maxfehler'].concat(story ? ['geschichte'] : []));
    }
    if (k === 'ad' || k === 'sb') {
      const I = mathInfo(id); const small = I.c <= 20 && I.a <= 20; const minus = k === 'sb';
      if (b <= 1) return small ? 'zeigen' : 'tippen';
      if (b === 2) { const o = ['tippen', 'tippen', 'maxfehler']; if (minus) o.push('umkehr', 'umkehr'); else if (small) o.push('blitzblick'); return pick(o); }
      const o = ['tippen', 'blitz', 'blitz', 'pablo', 'fehlt', 'maxfehler']; if (minus) o.push('umkehr'); if (small) o.push('geschichte'); if (!minus && small) o.push('blitzblick');
      return pick(o);
    }
    if (k === 'l') {
      const tricky = LBY[x].in || ['Ei', 'Eu', 'Au', 'Äu', 'Ie'].includes(x);
      const gk = x !== 'ß';
      if (b <= 1) return tricky && r < 0.6 ? 'anlaut' : gk ? 'grossklein' : 'anlaut';
      if (state.settings.write && r < 0.35) return 'abschreiben';
      if (Voice.has('laut:' + x) && r < 0.5) return 'laut';
      return tricky && r < 0.7 ? 'anlaut' : gk ? 'grossklein' : 'abschreiben';
    }
    if (k === 's') return b <= 1 ? 'silbehoeren' : r < 0.5 ? 'silbehoeren' : 'silbelesen';
    if (k === 'w') {
      const multi = D.WORDS[+x].w.includes('-');
      if (b <= 1) return 'wortbild';
      const wr = state.settings.write;
      if (b === 2) { const o = ['wortbild', 'hoeren', multi ? 'bauen' : 'hoeren']; if (wr) o.push('abschreiben'); return pick(o); }
      const o = ['vorlesen', 'hoeren', 'blitzwort', 'blitzwort', multi ? 'bauen' : 'wortbild']; if (wr) o.push('abschreiben', 'merkschreiben'); return pick(o);
    }
    if (k === 't') {
      const T = D.SENTENCES[+x]; const o = [];
      if (T.q !== undefined) o.push('quatsch');
      if (T.t.includes('[')) o.push('luecke');
      if (b <= 1 && o.length) return pick(o);
      o.push('satzlesen'); return pick(o);
    }
    if (k === 'ru') {
      const W = D.RU_WORDS[+x];
      if (b <= 1) return 'ruhoeren';
      if (b === 2) return r < 0.5 ? 'ruhoeren' : !W.g && r < 0.75 ? 'rujanein' : 'rusagen';
      return r < 0.45 ? 'rusagen' : !W.g && r < 0.75 ? 'rujanein' : 'ruhoeren';
    }
    if (k === 'rf') return b <= 1 ? 'runach' : r < 0.75 ? 'ruantwort' : 'runach';
    return 'anlaut';
  }
  // Test: nur Aufgaben, die man objektiv prüfen kann (Abrufen ohne Hilfen)
  function chooseTestKind(id) {
    const [k, x] = id.split(':'); const r = Math.random();
    const TT = TOPIC_BY[k]; if (TT) return TT.test || (typeof TT.kind === 'function' ? 'tippen' : TT.kind);
    if (k === 'm' || k === 'ad' || k === 'sb') return r < 0.5 ? 'tippen' : r < 0.75 ? 'blitz' : 'fehlt';
    if (k === 'l') return x !== 'ß' ? 'grossklein' : 'anlaut';
    if (k === 's') return 'silbehoeren';
    if (k === 'w') { const multi = D.WORDS[+x].w.includes('-'); return r < 0.4 ? 'hoeren' : r < 0.7 && multi ? 'bauen' : 'wortbild'; }
    if (k === 't') { const T = D.SENTENCES[+x]; const o = []; if (T.q !== undefined) o.push('quatsch'); if (T.t.includes('[')) o.push('luecke'); return o.length ? pick(o) : null; }
    if (k === 'ru') { const W = D.RU_WORDS[+x]; return !W.g && r < 0.5 ? 'rujanein' : 'ruhoeren'; }
    return null;
  }

  // ---------- Mathe-Hilfen ----------
  const NUMW = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];
  // Rechnung vorlesen: mit Kevins Zahlen-Clips (0–100), sonst Gerätestimme
  function mathPart(I) { return { ids: ['num:' + I.a, I.word, 'num:' + I.b], text: `${I.a} ${I.word} ${I.b}` }; }
  function mathSay(I, res) { return { ids: ['num:' + I.a, I.word, 'num:' + I.b, 'ist', 'num:' + res], text: `${I.a} ${I.word} ${I.b} ist ${res}` }; }
  const exprText = (I) => `${I.a} ${I.op} ${I.b}`;
  function pawGrid(a, b, emoji) {
    const g = h('div', { class: 'grid' + (a * b > 40 ? ' small' : '') + (a * b > 70 ? ' tiny' : ''), 'aria-label': `${a} Reihen mit je ${b}` });
    for (let r = 0; r < a; r++) {
      const row = h('div', { class: 'grow' });
      for (let c = 0; c < b; c++) { if (c === 5) row.append(h('span', { class: 'gap5' })); row.append(emoji ? h('span', { class: 'em' }, emoji) : svgEl(PAW, 'pw')); }
      g.append(row);
    }
    return g;
  }
  // Zwanzigerfeld: zwei Reihen à 10, Fünfer-Gruppen sichtbar. Plus: blau + rot. Minus: weggenommene durchgestrichen.
  function fieldEl(I, small) {
    const total = I.op === '+' ? I.c : I.a;
    if (total > 20) return null;
    const f = h('div', { class: 'field' + (small ? ' small' : ''), 'aria-label': I.op === '+' ? `${I.a} und ${I.b} Punkte` : `${I.a} Punkte, ${I.b} weg` });
    for (let r = 0; r < 2; r++) {
      const row = h('div', { class: 'f-row' });
      for (let c = 0; c < 10; c++) {
        const i = r * 10 + c; let cls = 'dot';
        if (i < total) {
          if (I.op === '+') cls += i < I.a ? ' a' : ' b';
          else cls += i >= I.a - I.b ? ' gone' : ' a';
        } else cls += ' empty';
        if (c === 5) row.append(h('span', { class: 'f-gap' }));
        row.append(h('span', { class: cls }));
      }
      f.append(row);
    }
    return f;
  }
  // Merkhilfe passend zur Aufgabe: Tipp (ohne Ergebnis) und Rechenweg (mit Ergebnis)
  function trickFor(I) {
    const { a, b, c, op } = I;
    if (op === ':') return { k: 'malgeteilt', tip: `Wie oft passt die ${b} in die ${a}? Denk an: ? · ${b} = ${a}.`, way: [`${c} · ${b} = ${a}`, `Also: ${a} : ${b} = ${c}`] };
    if (op === '·') {
      if (b < a && [1, 2, 5, 10].includes(b)) return { k: 'tausch', tip: `Tausch-Trick: ${a} · ${b} ist dasselbe wie ${b} · ${a}.`, way: strategy(a, b) };
      return { k: 'tausch', tip: a <= 5 ? `Rechne ${Array(a).fill(b).join(' + ')}.` : `Nimm eine Aufgabe, die du schon kannst, zum Beispiel 5 · ${b}.`, way: strategy(a, b) };
    }
    if (op === '+') {
      if (a % 10 === 0 && b % 10 === 0) return { k: 'zehner', tip: `Rechne ${a / 10} + ${b / 10}, dann hänge eine 0 an.`, way: [`${a / 10} + ${b / 10} = ${c / 10}`, `also ${a} + ${b} = ${c}`] };
      if (a > 20) {
        const u = a % 10;
        if (u + b <= 9) return { k: 'einer', tip: `Die Zehner bleiben. Rechne nur ${u} + ${b}.`, way: [`${u} + ${b} = ${u + b}`, `also ${a} + ${b} = ${c}`] };
        const to = 10 - u; return { k: 'vollzehner', tip: `Erst bis ${a + to}, dann den Rest dazu.`, way: [`${a} + ${to} = ${a + to}`, `dann noch ${b - to} dazu: ${c}`] };
      }
      if (a >= 10) return { k: 'einer', tip: `Die 10 bleibt. Rechne nur ${a - 10} + ${b}.`, way: [`${a - 10} + ${b} = ${a - 10 + b}`, `also ${c}`] };
      if (c > 10) {
        const to = 10 - a;
        if (Math.abs(a - b) === 1) { const m = Math.min(a, b); return { k: 'doppel', tip: `Fast verdoppeln: ${m} + ${m} und dann noch 1.`, way: [`${m} + ${m} = ${2 * m}`, `plus 1 = ${c}`] }; }
        if (a === b) return { k: 'doppel', tip: 'Verdoppeln! Gleiche Zahlen.', way: [`${a} + ${a} = ${c}`] };
        return { k: 'bis10', tip: `Erst bis zur 10: ${a} + ${to}. Dann den Rest.`, way: [`${a} + ${to} = 10`, `dann noch ${b - to}: 10 + ${b - to} = ${c}`] };
      }
      if (a === b) return { k: 'doppel', tip: 'Verdoppeln! Gleiche Zahlen.', way: [`${a} + ${a} = ${c}`] };
      if (b > a) return { k: 'groesser', tip: `Fang bei der größeren Zahl an: ${b} + ${a}.`, way: [`${b} + ${a} = ${c}`] };
      return { k: 'kraft5', tip: a >= 5 ? `Denk an deine Hand: ${a} Finger und noch ${b} dazu.` : `Zähl nicht einzeln. Stell dir die Punkte vor.`, way: [`${a} + ${b} = ${c}`] };
    }
    // Minus
    if (a % 10 === 0 && b % 10 === 0) return { k: 'zehner', tip: `Rechne ${a / 10} − ${b / 10}, dann hänge eine 0 an.`, way: [`${a / 10} − ${b / 10} = ${c / 10}`, `also ${a} − ${b} = ${c}`] };
    if (a <= 10) return { k: 'umkehr', tip: `Plus rückwärts: ${b} + wie viel = ${a}?`, way: [`${b} + ${c} = ${a}`, `also ${a} − ${b} = ${c}`] };
    const u = a % 10;
    if (b <= u) return { k: 'einer', tip: `Die Zehner bleiben. Rechne nur ${u} − ${b}.`, way: [`${u} − ${b} = ${u - b}`, `also ${a} − ${b} = ${c}`] };
    return { k: 'zurueck10', tip: `Erst zurück bis ${a - u}: minus ${u}. Dann den Rest weg.`, way: [`${a} − ${u} = ${a - u}`, `dann noch ${b - u} weg: ${c}`, `Probe: ${c} + ${b} = ${a}`] };
  }
  function strategy(a, b) {
    const c = a * b; const L = [];
    if (a >= 2 && a <= 5) L.push(Array(a).fill(b).join(' + ') + ' = ' + c);
    switch (a) {
      case 1: L.push(`1 · ${b} ist einfach ${b}.`); break;
      case 2: L.push('Das ist das Doppelte!'); break;
      case 3: L.push(`Trick: 2 · ${b} = ${2 * b}, dann noch ${b} dazu.`); break;
      case 4: L.push(`Trick: 2 · ${b} = ${2 * b}, das Doppelte ist ${c}.`); break;
      case 5: L.push(`Trick: 10 · ${b} = ${10 * b}, die Hälfte ist ${c}.`); break;
      case 6: L.push(`5 · ${b} = ${5 * b}`, `dann noch ${b} dazu: ${c}`); break;
      case 7: L.push(`5 · ${b} = ${5 * b}`, `2 · ${b} = ${2 * b}`, `zusammen: ${c}`); break;
      case 8: L.push(`4 · ${b} = ${4 * b}`, `das Doppelte: ${c}`); break;
      case 9: L.push(`10 · ${b} = ${10 * b}`, `minus ${b}: ${c}`); break;
      case 10: L.push(`Bei 10 · hängst du eine 0 an: ${c}`); break;
    }
    return L;
  }
  function seeTrick(k) { if (k && !state.tricks[k]) { state.tricks[k] = 1; save(); } }
  function mathFb(I) {
    const tr = trickFor(I); seeTrick(tr.k);
    const vis = I.op === ':' ? null : I.op === '·' ? (I.c <= 30 ? pawGrid(I.a, I.b) : null) : fieldEl(I, true);
    return {
      detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, `${exprText(I)} = ${I.c}`),
        h('p', { class: 'trick-name' }, '💡 ' + D.TRICKS[tr.k].n), ...tr.way.map((l) => h('p', { class: 'strat' }, l)), vis),
      voice: [mathSay(I, I.c)]
    };
  }
  // Tipp-Knopf: zeigt die Merkhilfe vor dem Antworten. Zählt als Hilfe (Aufgabe steigt dann nicht auf).
  function tipButton(ui, getTip) {
    const box2 = h('div', { class: 'tipbox', hidden: true });
    const b = h('button', { class: 'tip-btn', 'aria-label': 'Tipp anzeigen', onclick: () => {
      if (S.locked) return; const t = getTip(); seeTrick(t.k); ui.helps += 2;
      box2.replaceChildren(svgEl(svgMax({ mood: 'happy', noBall: true }), 'tip-max'), h('p', null, h('strong', null, D.TRICKS[t.k].n + ': '), t.tip));
      box2.hidden = false; b.remove(); Voice.say([P('p:tipp'), { text: t.tip }]);
    } }, '💡 Tipp');
    ui.stage.prepend(h('div', { class: 'tip-row' }, b), box2);
  }
  function numOpts(c, cand) {
    const s = new Set([c]);
    for (const v of shuffle(cand)) { if (s.size >= 3) break; if (v >= 0 && v <= 100 && v !== c) s.add(v); }
    let k = 1; while (s.size < 3) { s.add(c + k); k++; }
    return shuffle([...s]);
  }
  function numpad(onSubmit, slot) {
    let v = '';
    const set = () => { slot.textContent = v || '?'; slot.classList.toggle('filled', !!v); };
    const grid = h('div', { class: 'np', role: 'group', 'aria-label': 'Zahlen' });
    [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].forEach((k) => {
      grid.append(h('button', {
        class: 'tile np-k' + (k === '✓' ? ' go' : '') + (k === '⌫' ? ' del' : ''), 'aria-label': k === '⌫' ? 'Löschen' : k === '✓' ? 'Fertig' : String(k),
        onclick: () => { if (S.locked) return; SFX.tap(); if (k === '⌫') v = v.slice(0, -1); else if (k === '✓') { if (v) onSubmit(parseInt(v, 10)); return; } else if (v.length < 3) v += k; set(); }
      }, String(k)));
    });
    set();
    return grid;
  }
  const wrongNear = (I) => {
    const c = I.c; const cand = [c + 1, c - 1, c + 2, c - 2, c + 10, c - 10];
    if (I.op === '−' && I.a > 10 && I.b > I.a % 10) cand.push(I.a - (I.a % 10) + (I.b - (I.a % 10)) + 0, (Math.floor(I.a / 10) * 10) + (I.b - I.a % 10));
    return pick(cand.filter((v) => v >= 0 && v !== c && v <= 100));
  };

  const TASKS = {
    pfoten(t, ui) {
      const I = mathInfo(t.id);
      ui.prompt('Wie viele Pfoten sind das?', 'p:pfoten');
      ui.stage.append(h('p', { class: 'expr' }, exprText(I)), pawGrid(I.a, I.b));
      ui.choices(numOpts(I.c, [I.c + I.b, I.c - I.b, I.c + I.a, I.c - I.a, I.a + I.b, I.c + 1, I.c - 1]).map((v) => ({ label: String(v), value: v })), (v) => v === I.c, 'nums');
      ui.feedback = () => mathFb(I);
      ui.audio((full) => (full ? [ui.promptPart, mathPart(I)] : [mathPart(I)]));
    },
    zeigen(t, ui) {
      const I = mathInfo(t.id);
      ui.prompt(I.op === '+' ? 'Schau aufs Bild: Wie viele sind es zusammen?' : 'Schau aufs Bild: Wie viele bleiben übrig?', 'p:zeigen');
      ui.stage.append(h('p', { class: 'expr' }, exprText(I)), fieldEl(I) || h('span'));
      ui.choices(numOpts(I.c, [I.c + 1, I.c - 1, I.c + 2, I.c - 2].concat(I.op === '+' ? [] : [I.a + I.b])).map((v) => ({ label: String(v), value: v })), (v) => v === I.c, 'nums');
      ui.feedback = () => mathFb(I);
      ui.audio((full) => (full ? [ui.promptPart, mathPart(I)] : [mathPart(I)]), true);
    },
    tippen(t, ui) {
      const I = mathInfo(t.id);
      ui.prompt('Rechne aus!', 'p:tippen');
      const slot = h('span', { class: 'slot' }, '?');
      ui.stage.append(h('p', { class: 'expr' }, `${exprText(I)} = `, slot));
      if (!S.test) tipButton(ui, () => trickFor(I));
      ui.answers.replaceChildren(numpad((v) => { slot.classList.add(v === I.c ? 'right' : 'wrong'); ui.done(v === I.c); }, slot));
      ui.feedback = () => mathFb(I);
      ui.audio((full) => (full ? [ui.promptPart, mathPart(I)] : null));
    },
    fehlt(t, ui) {
      const I = mathInfo(t.id); const left = I.op !== '−' && Math.random() < 0.5;
      ui.prompt('Welche Zahl fehlt?', 'p:fehlt');
      const slot = h('span', { class: 'slot' }, '?');
      ui.stage.append(h('p', { class: 'expr' }, left ? slot : `${I.a}`, ` ${I.op} `, left ? `${I.b}` : slot, ` = ${I.c}`));
      const target = left ? I.a : I.b;
      ui.answers.replaceChildren(numpad((v) => { slot.classList.add(v === target ? 'right' : 'wrong'); ui.done(v === target); }, slot));
      ui.feedback = () => mathFb(I);
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    pablo(t, ui) {
      const I = mathInfo(t.id);
      const honest = Math.random() < 0.5;
      const shown = honest ? I.c : wrongNear(I);
      ui.prompt('Pablo sagt das Ergebnis. Stimmt das?', 'p:pablo');
      const pab = svgEl(svgPablo(), 'pablo-big');
      ui.stage.append(h('div', { class: 'pablo-say' }, pab, h('div', { class: 'bubble' }, `${exprText(I)} = ${shown}`)));
      ui.choices([{ label: '👍 Stimmt', value: true }, { label: '🌶️ Geschummelt!', value: false }], (v) => v === honest, 'two');
      ui.feedback = (ok) => {
        if (ok && !honest) { pab.innerHTML = svgPablo({ mood: 'caught' }); return { title: 'Erwischt! Pablo hat geschummelt, wie Kevin mit der Chili!', voice: [P('p:erwischt')] }; }
        if (ok) return { title: `Stimmt! ${exprText(I)} = ${I.c}. Diesmal war Pablo ehrlich.` };
        const f = mathFb(I); f.title = honest ? 'Pablo hatte diesmal recht!' : 'Oh nein, Pablo hat dich reingelegt!'; f.voice = (honest ? [] : [P('p:reingelegt')]).concat(f.voice); return f;
      };
      ui.audio((full) => (full ? [ui.promptPart, mathSay(I, shown)] : [mathSay(I, shown)]));
    },
    geschichte(t, ui) {
      const I = mathInfo(t.id);
      let txt, vis = null;
      if (I.op === '·') { const M = D.MATH_STORIES[I.b]; txt = sub(M.t.replace('{a}', I.a)); vis = pawGrid(I.a, I.b, M.e); }
      else txt = sub(pick(D.PM_STORIES[I.op]).replace('{a}', I.a).replace('{b}', I.b));
      ui.prompt('Hör gut zu und rechne!', 'p:geschichte');
      const slot = h('span', { class: 'slot' }, '?');
      ui.stage.append(...[h('p', { class: 'story-q' }, txt), vis, h('p', { class: 'expr small' }, 'Das sind ', slot)].filter(Boolean));
      ui.answers.replaceChildren(numpad((v) => { slot.classList.add(v === I.c ? 'right' : 'wrong'); ui.done(v === I.c); }, slot));
      ui.feedback = () => mathFb(I);
      ui.audio(() => [{ text: txt }], true);
    },
    blitz(t, ui) {
      const I = mathInfo(t.id); const ms = Math.round(state.blitzMs || 3000);
      ui.prompt('Blitz-Aufgabe! Schau genau, gleich ist sie weg!', 'p:blitz');
      const slot = h('span', { class: 'slot' }, '?');
      const exq = h('span', { class: 'exq' }, exprText(I));
      const ex = h('p', { class: 'expr blitz-on' }, exq, ' = ', slot);
      const bar = h('div', { class: 'blitz-bar' }, h('span', { style: `animation-duration:${ms}ms` }));
      ui.stage.append(h('div', { class: 'blitz-ico' }, '⚡'), ex, bar);
      setTimeout(() => { if (!document.body.contains(ex)) return; exq.classList.add('gone'); bar.remove(); }, ms);
      ui.answers.replaceChildren(numpad((v) => {
        const ok = v === I.c; slot.classList.add(ok ? 'right' : 'wrong');
        state.blitzMs = Math.max(1200, Math.min(4500, (state.blitzMs || 3000) * (ok ? 0.92 : 1.12)));
        ui.done(ok);
      }, slot));
      ui.feedback = () => mathFb(I);
      ui.fastMs = 5000;
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    blitzblick(t, ui) {
      const I = mathInfo(t.id);
      ui.prompt('Blitzblick! Wie viele Punkte sind das?', 'p:blitzblick');
      const f = fieldEl(I) || h('span');
      ui.stage.append(h('div', { class: 'blitz-ico' }, '⚡'), f);
      setTimeout(() => { if (document.body.contains(f)) f.classList.add('covered'); }, 1600);
      ui.choices(numOpts(I.c, [I.c + 1, I.c - 1, I.c + 2, I.c - 2]).map((v) => ({ label: String(v), value: v })), (v) => v === I.c, 'nums');
      ui.feedback = (ok) => { f.classList.remove('covered'); return ok ? { title: `Genau, ${I.c}! Du hast die Fünfer gesehen statt zu zählen.` } : mathFb(I); };
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    umkehr(t, ui) {
      // Minus mit Hilfe der Plus-Aufgabe (Plus kann sie gut)
      const I = mathInfo(t.id);
      ui.prompt('Erst die Plus-Aufgabe, dann die Minus-Aufgabe!', 'p:umkehr');
      const s1 = h('span', { class: 'slot' }, '?'), s2 = h('span', { class: 'slot' }, '?');
      const line1 = h('p', { class: 'expr small' }, `${I.b} + ${I.c} = `, s1);
      const line2 = h('p', { class: 'expr', hidden: true }, `${I.a} − ${I.b} = `, s2);
      ui.stage.append(line1, line2);
      const step2 = () => {
        line2.hidden = false; ui.stage.append(h('p', { class: 'hint' }, 'Minus ist Plus rückwärts!'));
        ui.answers.replaceChildren(numpad((v) => { s2.classList.add(v === I.c ? 'right' : 'wrong'); ui.done(v === I.c); }, s2));
        Voice.say([mathPart(I)]);
      };
      ui.answers.replaceChildren(numpad((v) => { if (v === I.a) { s1.classList.add('right'); SFX.ok(); setTimeout(step2, 450); } else { s1.classList.add('wrong'); setTimeout(() => { s1.classList.remove('wrong'); s1.textContent = String(I.a); s1.classList.add('right'); setTimeout(step2, 700); }, 600); } }, s1));
      ui.feedback = () => { seeTrick('umkehr'); return mathFb(I); };
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    maxfehler(t, ui) {
      // Max hat sich verrechnet: Fehler finden und Max erklären (wer erklärt, lernt selbst am meisten)
      const I = mathInfo(t.id); const wrong = wrongNear(I);
      ui.prompt('Oje, Max hat sich verrechnet! Was ist richtig?', 'p:maxfehler');
      const slot = h('span', { class: 'slot' }, '?');
      ui.stage.append(h('div', { class: 'pablo-say' }, svgEl(svgMax({ mood: 'sad', noBall: true }), 'pablo-big'), h('div', { class: 'bubble' }, h('s', null, `${exprText(I)} = ${wrong}`))), h('p', { class: 'expr small' }, `${exprText(I)} = `, slot));
      ui.answers.replaceChildren(numpad((v) => {
        if (v !== I.c) { slot.classList.add('wrong'); return ui.done(false); }
        slot.classList.add('right'); SFX.ok();
        const tr = trickFor(I); seeTrick(tr.k);
        ui.prompt('Super! Jetzt erklär Max laut, wie du gerechnet hast!', 'p:erklaer');
        Voice.say([P('p:erklaer')]);
        ui.answers.className = 'answers one';
        ui.answers.replaceChildren(h('div', { class: 'explain-help' }, h('p', { class: 'note' }, 'So kannst du es erklären:'), ...tr.way.map((l) => h('p', { class: 'strat' }, l))),
          h('button', { class: 'tile go', id: 'explained', onclick: () => ui.done(true) }, '✓ Hab’s Max erklärt'));
      }, slot));
      ui.feedback = (ok) => (ok ? { title: 'Max: „Danke! Jetzt hab ich’s verstanden!“', voice: [P('p:maxdanke')] } : mathFb(I));
      ui.fastMs = 20000;
      ui.audio((full) => (full ? [ui.promptPart, mathSay(I, wrong)] : null), true);
    },
    anlaut(t, ui) {
      const L = LBY[t.id.slice(2)];
      ui.prompt(L.in ? D.PROMPTS['p:innen'] : 'Womit fängt das Wort an?', L.in ? 'p:innen' : 'p:anlaut');
      ui.stage.append(h('div', { class: 'pic', 'aria-label': L.w }, L.e));
      if (!S.test) tipButton(ui, () => letterTip(L));
      const opts = shuffle([L.g, ...L.c]).map((g) => ({ el: h('span', { class: 'let' }, letterLabel(g)), value: g }));
      ui.choices(opts, (v) => v === L.g, 'letters');
      ui.feedback = (ok) => letterFb(L, ok);
      ui.audio((full) => (full ? [ui.promptPart, { id: 'anl:' + L.g, text: L.w }] : [{ id: 'anl:' + L.g, text: L.w }]), true);
    },
    laut(t, ui) {
      const L = LBY[t.id.slice(2)];
      ui.prompt('Welcher Buchstabe ist das?', 'p:laut');
      ui.stage.append(h('div', { class: 'pic ear' }, '👂'));
      ui.choices(shuffle([L.g, ...L.c]).map((g) => ({ el: h('span', { class: 'let' }, letterLabel(g)), value: g })), (v) => v === L.g, 'letters');
      ui.feedback = (ok) => letterFb(L, ok);
      ui.audio((full) => (full ? [ui.promptPart, { id: 'laut:' + L.g, text: '' }] : [{ id: 'laut:' + L.g, text: '' }]), true);
    },
    grossklein(t, ui) {
      const L = LBY[t.id.slice(2)]; const up = Math.random() < 0.5;
      ui.prompt(up ? 'Finde den kleinen Buchstaben!' : 'Finde den großen Buchstaben!', up ? 'p:klein' : 'p:gross');
      ui.stage.append(h('div', { class: 'big-letter' }, up ? L.g : lower(L.g)));
      if (!S.test && ['B', 'D', 'P'].includes(L.g)) tipButton(ui, () => letterTip(L));
      const pool = [L.g, ...L.c.filter((g) => g !== 'ß')];
      ui.choices(shuffle(pool).map((g) => ({ el: h('span', { class: 'let solo' }, up ? lower(g) : g), value: g })), (v) => v === L.g, 'letters');
      ui.feedback = (ok) => letterFb(L, ok);
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    silbehoeren(t, ui) {
      const s = t.id.slice(2); const C = s.replace(/[aeiou]$/, ''), v = s.slice(C.length);
      const kv = D.VOWELS.filter(knownLetter).map((x) => x.toLowerCase()).filter((x) => x !== v);
      const kc = D.CONSONANTS.filter(knownLetter).filter((x) => x !== C);
      const set = new Set([s]);
      shuffle(kv).slice(0, 1).forEach((x) => set.add(C + x));
      shuffle(kc).forEach((x) => { if (set.size < 3) set.add(x + v); });
      ['Ma', 'Lo', 'Si', 'Nu', 'Re'].forEach((x) => { if (set.size < 3) set.add(x); });
      ui.prompt('Hör genau! Welche Silbe war das?', 'p:silbe');
      ui.stage.append(h('div', { class: 'pic ear' }, '👂'));
      ui.choices(shuffle([...set]).map((x) => ({ el: h('span', { class: 'sy s0 syl-btn' }, x), value: x })), (x) => x === s, 'letters');
      ui.feedback = (ok) => ({ detail: ok ? null : h('div', { class: 'fb-detail' }, h('p', { class: 'big-syl' }, h('span', { class: 'sy s0' }, s))), voice: [{ text: s, force: true }] });
      ui.audio((full) => (full ? [ui.promptPart, { text: s, force: true }] : [{ text: s, force: true }]), true);
    },
    silbelesen(t, ui) { readAloud(t, ui, t.id.slice(2), { text: t.id.slice(2), force: true }); },
    wortbild(t, ui) {
      const i = +t.id.slice(2); const W = D.WORDS[i];
      ui.prompt('Lies das Wort. Welches Bild passt?', 'p:wortbild');
      ui.stage.append(textEl(W.w, { cls: 'word' }));
      const others = shuffle(D.WORDS.filter((x) => x.e !== W.e)).reduce((acc, x) => { if (acc.length < 2 && !acc.includes(x.e)) acc.push(x.e); return acc; }, []);
      ui.choices(shuffle([W.e, ...others]).map((e) => ({ el: h('span', { class: 'emo' }, e), value: e })), (e) => e === W.e, 'pics');
      ui.feedback = (ok) => ({ detail: ok ? null : h('div', { class: 'fb-detail' }, h('p', { class: 'pic small' }, W.e), textEl(W.w, { cls: 'word small' })), voice: [{ id: 'w:' + i, text: plain(W.w) }] });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    hoeren(t, ui) {
      const i = +t.id.slice(2); const W = D.WORDS[i];
      let sims = (W.sim || []).slice();
      if (sims.length < 2) { const n = W.w.split('-').length; sims = sims.concat(shuffle(D.WORDS.filter((x) => x !== W && x.w.split('-').length === n)).slice(0, 2 - sims.length).map((x) => x.w)); }
      ui.prompt('Hör genau! Welches Wort war das?', 'p:hoeren');
      ui.stage.append(h('div', { class: 'pic ear' }, '👂'));
      ui.choices(shuffle([W.w, ...sims.slice(0, 2)]).map((w) => ({ el: textEl(w, { cls: 'btn-word' }), value: w })), (w) => w === W.w, 'words');
      ui.feedback = (ok) => ({ detail: ok ? null : h('div', { class: 'fb-detail' }, h('p', { class: 'pic small' }, W.e), textEl(W.w, { cls: 'word small' })), voice: [{ id: 'w:' + i, text: plain(W.w) }] });
      ui.audio((full) => (full ? [ui.promptPart, { id: 'w:' + i, text: plain(W.w) }] : [{ id: 'w:' + i, text: plain(W.w) }]), true);
    },
    bauen(t, ui) {
      const i = +t.id.slice(2); const W = D.WORDS[i]; const parts = W.w.split('-');
      ui.prompt('Bau das Wort aus den Silben!', 'p:bauen');
      const slots = parts.map(() => h('span', { class: 'b-slot' }));
      ui.stage.append(h('div', { class: 'pic small' }, W.e), h('div', { class: 'b-slots' }, slots));
      let order = shuffle(parts.map((p, k) => k)); let tries = 0;
      while (order.every((v, k) => v === k) && tries++ < 10) order = shuffle(order);
      let pos = 0, mistake = false;
      const tiles = order.map((k) => {
        const b = h('button', {
          class: 'tile ans syl-tile', onclick: () => {
            if (S.locked) return;
            if (parts[k] === parts[pos]) {
              SFX.tap(); b.disabled = true; b.classList.add('used');
              slots[pos].append(h('span', { class: 'sy s' + (pos % 2) }, parts[pos])); slots[pos].classList.add('filled'); pos++;
              if (pos === parts.length) ui.done(!mistake);
            } else { mistake = true; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
          }
        }, h('span', { class: 'sy s' + (k % 2) }, parts[k]));
        return b;
      });
      ui.answers.className = 'answers letters'; ui.answers.replaceChildren(...tiles);
      ui.feedback = (ok) => ({ title: ok ? null : 'Geschafft! Beim nächsten Mal klappt es ohne Fehler.', detail: ok ? null : h('div', { class: 'fb-detail' }, textEl(W.w, { cls: 'word small' })), voice: [{ id: 'w:' + i, text: plain(W.w) }] });
      ui.audio((full) => (full ? [ui.promptPart, { id: 'w:' + i, text: plain(W.w) }] : [{ id: 'w:' + i, text: plain(W.w) }]), true);
    },
    vorlesen(t, ui) { const i = +t.id.slice(2); readAloud(t, ui, D.WORDS[i].w, { id: 'w:' + i, text: plain(D.WORDS[i].w) }, D.WORDS[i].e); },
    satzlesen(t, ui) { const i = +t.id.slice(2); const T = D.SENTENCES[i]; readAloud(t, ui, T.t, { id: 't:' + i, text: plain(T.t) }, T.e, true); },
    quatsch(t, ui) {
      const i = +t.id.slice(2); const T = D.SENTENCES[i];
      ui.prompt('Lies den Satz. Stimmt das oder ist das Quatsch?', 'p:quatsch');
      ui.stage.append(textEl(T.t, { cls: 'sentence', help: helpWord(ui) }), h('p', { class: 'hint' }, 'Tipp: Wort antippen = vorlesen'));
      ui.choices([{ label: '👍 Stimmt', value: true }, { label: '🤪 Quatsch!', value: false }], (v) => v === T.q, 'two');
      ui.feedback = (ok) => ({
        title: ok ? (T.q ? 'Richtig, das stimmt!' : 'Genau, das ist Quatsch!') : (T.q ? 'Doch, das stimmt!' : 'Das ist Quatsch!'),
        detail: h('div', { class: 'fb-detail' }, T.r ? h('p', { class: 'strat' }, sub(T.r)) : null),
        voice: [{ id: 't:' + i, text: plain(T.t) }]
      });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    luecke(t, ui) {
      const i = +t.id.slice(2); const T = D.SENTENCES[i]; const right = T.t.match(/\[(.+?)\]/)[1];
      let gapEl = null;
      ui.prompt('Welches Wort fehlt?', 'p:luecke');
      ui.stage.append(textEl(T.t, { cls: 'sentence', gap: true, gapRef: (g) => { gapEl = g; }, help: helpWord(ui) }), h('p', { class: 'hint' }, 'Tipp: Wort antippen = vorlesen'));
      ui.choices(shuffle([right, ...(T.o || [])]).map((w) => ({ el: textEl(w, { cls: 'btn-word' }), value: w })), (w) => w === right, 'words');
      ui.feedback = (ok) => { if (gapEl) { gapEl.replaceChildren(textEl(right, { cls: 'inline' })); gapEl.classList.add('filled'); } return { voice: [{ id: 't:' + i, text: plain(T.t) }] }; };
      ui.audio((full) => (full ? [ui.promptPart] : null));
    }
  };
  // ---------- Russisch ----------
  const ruPart = (i) => ({ id: 'ru:' + i, text: D.RU_WORDS[i].ru, lang: 'ru' });
  function ruPic(W, size) {
    if (W.n != null) return h('span', { class: 'ru-pic digit ' + size }, String(W.n));
    if (W.col) return h('span', { class: 'ru-pic blob ' + size, style: `background:${W.col}` });
    return h('span', { class: 'ru-pic emo ' + size }, W.e);
  }
  const ruOpt = (W) => h('span', { class: 'ru-opt' }, ruPic(W, 'opt'), h('span', { class: 'ru-de' }, W.de));
  const ruDetail = (W) => h('div', { class: 'fb-detail' }, ruPic(W, 'small'), h('p', { class: 'ru-word' }, W.ru), h('p', { class: 'strat' }, W.de));
  const phraseDetail = (Q) => h('div', { class: 'fb-detail' }, h('p', { class: 'ru-word q' }, sub(Q.q)), h('p', { class: 'ru-word' }, sub(Q.a)), h('p', { class: 'note' }, `${sub(Q.dq)} – ${sub(Q.da)}`));
  function ruSelfCheck(t, ui, o) {
    ui.prompt(o.promptText, o.promptClip);
    ui.stage.append(o.visual);
    if (o.help) ui.stage.append(h('button', { class: 'tile help-btn', onclick: () => { ui.helps++; Voice.say(o.help); } }, '🇩🇪 Was heißt das auf Deutsch?'));
    const doneBtn = h('button', { class: 'tile go', id: 'say-done', onclick: () => {
      if (S.locked) return; SFX.tap();
      ui.prompt('Hör mal, so heißt es. Hast du es richtig gesagt?', 'p:rukontrolle');
      Voice.say([P('p:rukontrolle')].concat(o.modelParts));
      ui.answers.className = 'answers two';
      ui.answers.replaceChildren(
        h('button', { class: 'tile ans', onclick: () => ui.done(true) }, '✓ Richtig gesagt'),
        h('button', { class: 'tile ans', onclick: () => ui.done(false) }, '↻ Nochmal üben'));
    } }, 'Fertig gesagt');
    ui.answers.className = 'answers one'; ui.answers.replaceChildren(doneBtn); ui.self = true;
    ui.feedback = (ok) => ({ title: ok ? 'Молодец! Du sprichst super Russisch.' : 'Gut, dass du ehrlich bist. Das üben wir gleich nochmal.', detail: o.detail, voice: ok ? [] : o.modelParts });
    ui.audio((full) => (full ? [ui.promptPart].concat(o.autoParts) : o.autoParts), true);
  }
  Object.assign(TASKS, {
    ruhoeren(t, ui) {
      const i = +t.id.split(':')[1]; const W = D.RU_WORDS[i];
      ui.prompt('Hör zu! Was ist das?', 'p:ruhoeren');
      ui.stage.append(h('div', { class: 'pic ear' }, '👂'));
      const same = shuffle(D.RU_WORDS.filter((x) => x !== W && x.c === W.c));
      const other = shuffle(D.RU_WORDS.filter((x) => x.c !== W.c));
      const opts = shuffle([W].concat(same.slice(0, 1), other).slice(0, 3));
      ui.choices(opts.map((x) => ({ el: ruOpt(x), value: x.ru })), (v) => v === W.ru, 'pics');
      ui.feedback = () => ({ detail: ruDetail(W), voice: [ruPart(i)] });
      ui.audio((full) => (full ? [ui.promptPart, ruPart(i)] : [ruPart(i)]), true);
    },
    rusagen(t, ui) {
      const i = +t.id.split(':')[1]; const W = D.RU_WORDS[i];
      ruSelfCheck(t, ui, { promptText: 'Wie heißt das auf Russisch? Sag es laut!', promptClip: 'p:rusagen', visual: h('div', { class: 'ru-card' }, ruPic(W, 'big'), h('p', { class: 'ru-de big' }, W.de)), autoParts: [{ text: W.de }], modelParts: [ruPart(i)], detail: ruDetail(W) });
    },
    rujanein(t, ui) {
      const i = +t.id.split(':')[1]; const W = D.RU_WORDS[i];
      const yes = Math.random() < 0.5;
      const pool = D.RU_WORDS.filter((x) => !x.g && x !== W); const same = pool.filter((x) => x.c === W.c);
      const X = yes ? W : pick(same.length ? same : pool); const xi = D.RU_WORDS.indexOf(X);
      const q = { ids: ['ru:eto', 'ru:' + xi], text: `Это ${X.ru}?`, lang: 'ru' };
      ui.prompt('Hör gut zu! Stimmt das?', 'p:rujanein');
      ui.stage.append(ruPic(W, 'big'));
      ui.choices([{ label: '👍 Да', value: true }, { label: '👎 Нет', value: false }], (v) => v === yes, 'two');
      ui.feedback = (ok) => ({ title: ok ? null : yes ? 'Doch, das stimmt!' : 'Nein, das stimmt nicht.', detail: ruDetail(W), voice: [{ ids: ['ru:eto', 'ru:' + i], text: `Это ${W.ru}.`, lang: 'ru' }] });
      ui.audio((full) => (full ? [ui.promptPart, q] : [q]), true);
    },
    runach(t, ui) {
      const i = +t.id.split(':')[1]; const Q = D.RU_PHRASES[i];
      const qp = { id: 'rfq:' + i, text: sub(Q.q), lang: 'ru' }, ap = { id: 'rfa:' + i, text: sub(Q.a), lang: 'ru' };
      ruSelfCheck(t, ui, { promptText: 'Hör zu und sprich die Antwort nach!', promptClip: 'p:runach', visual: h('div', { class: 'ru-card' }, h('span', { class: 'ru-pic emo big' }, Q.e), h('p', { class: 'ru-de' }, `${sub(Q.dq)} – ${sub(Q.da)}`)), autoParts: [qp, ap], modelParts: [ap], detail: phraseDetail(Q) });
    },
    ruantwort(t, ui) {
      const i = +t.id.split(':')[1]; const Q = D.RU_PHRASES[i];
      const qp = { id: 'rfq:' + i, text: sub(Q.q), lang: 'ru' }, ap = { id: 'rfa:' + i, text: sub(Q.a), lang: 'ru' };
      ruSelfCheck(t, ui, { promptText: 'Antworte auf Russisch!', promptClip: 'p:ruantwort', visual: h('div', { class: 'ru-card' }, h('span', { class: 'ru-pic emo big' }, Q.e)), autoParts: [qp], modelParts: [ap], help: [{ text: sub(Q.dq) }], detail: phraseDetail(Q) });
    }
  });
  // ---------- Schreiben mit Stift ----------
  function writePad(opts = {}) {
    const wrap = h('div', { class: 'wpad' + (opts.lines === false ? ' plain' : '') });
    const cv = h('canvas', { class: 'wcanvas', 'aria-label': 'Schreibfeld für den Stift' });
    wrap.append(cv);
    let ctx = null, drawing = false, last = null, strokes = 0, penSeen = false, W = 300;
    const dpr = Math.max(1, window.devicePixelRatio || 1); const H = opts.height || 190; const LW = opts.width || 7;
    function lines() {
      if (opts.lines === false) return;
      ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = '#a9c9de';
      const y = (f) => Math.round(H * f) + 0.5;
      [y(0.2), y(0.72)].forEach((yy) => { ctx.beginPath(); ctx.moveTo(10, yy); ctx.lineTo(W - 10, yy); ctx.stroke(); });
      ctx.setLineDash([7, 7]); [y(0.46), y(0.92)].forEach((yy) => { ctx.beginPath(); ctx.moveTo(10, yy); ctx.lineTo(W - 10, yy); ctx.stroke(); });
      ctx.restore();
    }
    function size() {
      W = Math.max(220, Math.round(wrap.getBoundingClientRect().width || 300));
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = LW; ctx.strokeStyle = opts.color || '#15233f'; ctx.fillStyle = opts.color || '#15233f';
      lines();
    }
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'pen') penSeen = true;
      if (penSeen && e.pointerType === 'touch') return; // Handballen ignorieren, wenn ein Stift benutzt wird
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) { }
      drawing = true; last = pos(e); ctx.beginPath(); ctx.arc(last[0], last[1], LW / 2, 0, 7); ctx.fill(); strokes++;
    });
    cv.addEventListener('pointermove', (e) => { if (!drawing) return; e.preventDefault(); const p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => cv.addEventListener(ev, () => { drawing = false; }));
    requestAnimationFrame(size);
    return { el: wrap, clear() { strokes = 0; size(); }, get empty() { return strokes === 0; }, dataURL() { return cv.toDataURL('image/png'); } };
  }
  function compareStep(ui, modelEl, audio) {
    ui.prompt('Vergleiche! Ist es gleich? Zeig es auch Mama!', 'p:vergleich');
    modelEl.hidden = false; modelEl.classList.add('compare');
    Voice.say([P('p:vergleich'), audio]);
    ui.answers.className = 'answers two';
    ui.answers.replaceChildren(
      h('button', { class: 'tile ans', onclick: () => ui.done(true) }, '✓ Gleich'),
      h('button', { class: 'tile ans', onclick: () => ui.done(false) }, '↻ Nochmal üben'));
  }
  function writeModel(t) {
    const [k, x] = t.id.split(':');
    if (k === 'l') return { el: h('div', { class: 'big-letter write-model' }, x === 'ß' ? 'ß' : `${x} ${lower(x)}`), audio: { id: 'anl:' + x, text: LBY[x].w } };
    return { el: textEl(D.WORDS[+x].w, { cls: 'word write-model' }), audio: { id: 'w:' + x, text: plain(D.WORDS[+x].w) } };
  }
  function letterTip(L) {
    if (['B', 'D', 'P'].includes(L.g)) return { k: 'bett', tip: D.TRICKS.bett.d };
    return { k: 'langsam', tip: L.in ? `Sprich „${L.w}“ ganz langsam und hör auf die Mitte.` : `Sprich „${L.w}“ ganz langsam: ${L.w[0]}${L.w[0].toLowerCase().repeat(2)}… Was hörst du zuerst?` };
  }
  Object.assign(TASKS, {
    abschreiben(t, ui) {
      const M = writeModel(t); const pad = writePad({ height: 190 });
      ui.prompt('Schreib es mit dem Stift ab!', 'p:abschreiben');
      ui.stage.append(M.el, pad.el);
      ui.answers.className = 'answers two';
      ui.answers.replaceChildren(
        h('button', { class: 'tile ans', onclick: () => pad.clear() }, '↺ Löschen'),
        h('button', { class: 'tile go', id: 'write-done', onclick: () => { if (!pad.empty) compareStep(ui, M.el, M.audio); } }, '✓ Fertig'));
      ui.feedback = (ok) => ({ title: ok ? 'Schön geschrieben! Max staunt.' : 'Gut, dass du genau hinschaust. Das üben wir gleich nochmal.', voice: [M.audio] });
      ui.fastMs = 60000;
      ui.audio((full) => (full ? [ui.promptPart, M.audio] : [M.audio]), true);
    },
    merkschreiben(t, ui) {
      const M = writeModel(t); const pad = writePad({ height: 190 });
      ui.prompt('Merk dir das Wort! Gleich ist es weg.', 'p:merkschreiben');
      const bar = h('div', { class: 'blitz-bar slow' }, h('span', { style: 'animation-duration:5000ms' }));
      const hideBtn = h('button', { class: 'tile', id: 'memo-ready', onclick: () => go() }, 'Ich hab’s mir gemerkt');
      ui.stage.append(M.el, bar);
      ui.answers.className = 'answers one'; ui.answers.replaceChildren(hideBtn);
      let went = false;
      const go = () => {
        if (went) return; went = true; M.el.hidden = true; bar.remove();
        ui.prompt('Jetzt schreib es aus dem Kopf!', 'p:abschreiben');
        ui.stage.append(pad.el);
        ui.answers.className = 'answers two';
        ui.answers.replaceChildren(
          h('button', { class: 'tile ans', onclick: () => pad.clear() }, '↺ Löschen'),
          h('button', { class: 'tile go', id: 'write-done', onclick: () => { if (!pad.empty) { M.el.remove(); ui.stage.prepend(M.el); compareStep(ui, M.el, M.audio); } } }, '✓ Fertig'));
      };
      setTimeout(go, 5000);
      ui.feedback = (ok) => ({ title: ok ? 'Wow, aus dem Kopf geschrieben!' : 'Fast! Schau dir das Wort nochmal genau an.', voice: [M.audio] });
      ui.fastMs = 60000;
      ui.audio((full) => (full ? [ui.promptPart, M.audio] : [M.audio]), true);
    },
    blitzwort(t, ui) {
      const i = +t.id.slice(2); const W = D.WORDS[i];
      ui.prompt('Blitzlesen! Schau genau hin!', 'p:blitzwort');
      const wEl = textEl(W.w, { cls: 'word blitz-on' });
      ui.stage.append(h('div', { class: 'blitz-ico' }, '⚡'), wEl);
      setTimeout(() => { if (document.body.contains(wEl)) wEl.classList.add('hidden-ex'); }, 1600);
      const others = shuffle(D.WORDS.filter((x) => x.e !== W.e)).reduce((acc, x) => { if (acc.length < 2 && !acc.includes(x.e)) acc.push(x.e); return acc; }, []);
      ui.choices(shuffle([W.e, ...others]).map((e) => ({ el: h('span', { class: 'emo' }, e), value: e })), (e) => e === W.e, 'pics');
      ui.feedback = (ok) => { wEl.classList.remove('hidden-ex'); return { detail: ok ? null : h('div', { class: 'fb-detail' }, h('p', { class: 'pic small' }, W.e), textEl(W.w, { cls: 'word small' })), voice: [{ id: 'w:' + i, text: plain(W.w) }] }; };
      ui.audio((full) => (full ? [ui.promptPart] : null));
    }
  });
  function helpWord(ui) {
    return (word, el) => { ui.helps++; el.classList.add('helped'); const id = WORD_CLIP[word.toLowerCase()]; Voice.say([{ id, text: word }]); };
  }
  function letterFb(L, ok) {
    return {
      detail: ok ? null : h('div', { class: 'fb-detail' }, h('p', { class: 'big-letter small' }, letterLabel(L.g)), h('p', { class: 'strat' }, `${L.g} wie ${L.w} ${L.e}`)),
      voice: [{ id: 'anl:' + L.g, text: L.w }]
    };
  }
  // Laut vorlesen: Max hört zu, dann hört sie die Lösung und sagt ehrlich, ob es geklappt hat.
  function readAloud(t, ui, text, audioPart, emoji, sentence) {
    ui.prompt('Lies es Max laut vor!', 'p:vorlesen');
    const maxL = svgEl(svgMax({ mood: 'listen' }), 'listen-max');
    ui.stage.append(h('div', { class: 'listen' }, maxL, h('div', { class: 'ear-bubble' }, '👂')), textEl(text, { cls: sentence ? 'sentence' : 'word' }));
    const doneBtn = h('button', { class: 'tile go', id: 'read-done', onclick: () => {
      if (S.locked) return; SFX.tap();
      ui.prompt('Hör mal, so klingt es. Hast du es richtig gelesen?', 'p:hoermal');
      Voice.say([P('p:hoermal'), audioPart]);
      ui.answers.className = 'answers two';
      ui.answers.replaceChildren(
        h('button', { class: 'tile ans', onclick: () => ui.done(true) }, '✓ Richtig gelesen'),
        h('button', { class: 'tile ans', onclick: () => ui.done(false) }, '↻ Nochmal üben'));
    } }, 'Fertig gelesen');
    ui.answers.className = 'answers one'; ui.answers.replaceChildren(doneBtn); ui.self = true;
    ui.feedback = (ok) => ({ title: ok ? 'Toll vorgelesen! Max wedelt mit dem Schwanz.' : 'Gut, dass du ehrlich bist. Das üben wir gleich nochmal.' });
    ui.audio((full) => (full ? [ui.promptPart] : null));
  }

  // ---------- Musik für die Tanz-Pause (eigener Beat, WebAudio) ----------
  const Beat = (() => {
    let timer = null, step = 0, next = 0, noise = null;
    const spb = 60 / 112 / 2;
    const bass = [130.8, 130.8, 196, 196, 220, 220, 174.6, 174.6];
    function noiseBuf(x) { if (noise) return noise; const b = x.createBuffer(1, x.sampleRate * 0.3, x.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noise = b; return b; }
    function env(x, t, vol, dur) { const g = x.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(x.destination); return g; }
    function kick(x, t) { const o = x.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); o.connect(env(x, t, 0.5, 0.16)); o.start(t); o.stop(t + 0.2); }
    function snr(x, t, vol, dur, hp) { const s = x.createBufferSource(); s.buffer = noiseBuf(x); const f = x.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.connect(f); f.connect(env(x, t, vol, dur)); s.start(t); s.stop(t + dur + 0.02); }
    function bassN(x, t, fr) { const o = x.createOscillator(); o.type = 'triangle'; o.frequency.value = fr; o.connect(env(x, t, 0.14, 0.22)); o.start(t); o.stop(t + 0.25); }
    function tick() {
      const x = SFX.ctx(); if (!x) return;
      while (next < x.currentTime + 0.15) {
        const st = step % 16;
        if (st % 4 === 0) kick(x, next);
        if (st % 8 === 4) snr(x, next, 0.22, 0.12, 1500);
        snr(x, next, 0.04, 0.03, 7000);
        if (st % 2 === 0) bassN(x, next, bass[(st / 2) | 0]);
        next += spb; step++;
      }
    }
    return {
      start() { if (!state.settings.music || !state.settings.sfx) return; const x = SFX.ctx(); if (!x) return; step = 0; next = x.currentTime + 0.05; clearInterval(timer); timer = setInterval(tick, 50); },
      stop() { clearInterval(timer); timer = null; }
    };
  })();
  // Text mit russischen Stellen: russische Teile mit russischer Stimme lesen
  function langParts(text, id) {
    if (id && Voice.has(id)) return [{ id, text }];
    const out = []; const re = /[Ѐ-ӿ][Ѐ-ӿ\s,!?.\-]*/g; let last = 0, m;
    while ((m = re.exec(text))) { if (m.index > last) out.push({ text: text.slice(last, m.index) }); out.push({ text: m[0], lang: 'ru' }); last = m.index + m[0].length; }
    if (last < text.length) out.push({ text: text.slice(last) });
    return out.filter((p) => p.text.trim());
  }
  function toast(msg, emoji) {
    const t = h('div', { class: 'toast', role: 'status' }, h('span', { class: 'toast-e' }, emoji || '⭐'), msg);
    document.body.append(t); requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, 3200);
  }
  const practiceDays = () => Object.values(state.days).filter((d) => d.s > 0).length;

  // ---------- Trickbuch ----------
  function showTricks(back) {
    back = back || showHome;
    const locked = Object.keys(D.TRICKS).filter((k) => !(TEST() || state.tricks[k])).length;
    const list = h('div', { class: 'tricks' }, Object.entries(D.TRICKS).filter(([k]) => TEST() || state.tricks[k]).map(([k, T]) => {
      const seen = true;
      return h('div', { class: 'trick' + (seen ? '' : ' locked') }, h('p', { class: 'trick-n' }, seen ? '💡 ' + T.n : '🔒 Noch geheim'), seen ? h('p', { class: 'trick-d' }, T.d) : h('p', { class: 'trick-d' }, 'Tippe in einer Aufgabe auf „💡 Tipp“, dann findest du neue Tricks.'),
        seen ? h('button', { class: 'p-btn', onclick: () => Voice.say([{ id: 'trick:' + k, text: T.n + '. ' + T.d }]) }, '🔊') : null);
    }));
    mount(h('main', { class: 'screen map' }, h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => back()), h('h1', { class: 'h-display' }, 'Mein Trickbuch')), list, locked ? h('div', { class: 'trick locked' }, h('p', { class: 'trick-n' }, `🔒 Noch ${locked} ${locked === 1 ? 'Trick' : 'Tricks'} geheim`), h('p', { class: 'trick-d' }, 'Tippe in einer Aufgabe auf „💡 Tipp“, dann findest du neue Tricks.')) : null), 'home');
  }

  // ---------- Post von Kevin ----------
  const unlockedPosts = () => D.POSTS.map((p, i) => ({ p, i })).filter(({ p }) => TEST() || practiceDays() >= p.tag);
  const unreadPost = () => unlockedPosts().some(({ i }) => !state.posts.read[i]);
  function showPosts() {
    const un = unlockedPosts(); const next = D.POSTS.find((p) => practiceDays() < p.tag);
    const list = h('div', { class: 'posts' }, un.slice().reverse().map(({ p, i }) => h('button', { class: 'tile post-item' + (state.posts.read[i] ? '' : ' new'), onclick: () => showPost(i) }, h('span', { class: 'post-ico' }, state.posts.read[i] ? '📭' : '📬'), h('span', null, `Brief ${i + 1} von Kevin`), state.posts.read[i] ? null : h('span', { class: 'badge' }, 'Neu!'))));
    const chatBtn = h('button', { class: 'tile go chat-open', id: 'go-chat', onclick: () => { SFX.tap(); explain('chat', () => showChat()); } }, state.chatNew ? '💌 Kevin hat dir geantwortet! Lesen →' : '✏️ Kevin schreiben');
    const scr = h('main', { class: 'screen map' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showHome()), h('h1', { class: 'h-display' }, 'Post von Kevin')),
      chatBtn,
      un.length ? list : h('p', { class: 'note' }, 'Noch keine Post. Übe ein paar Tage, dann kommt ein Brief!'),
      next ? h('p', { class: 'note' }, `Nächster Brief nach ${next.tag} ${next.tag === 1 ? 'Übungstag' : 'Übungstagen'}. Du hast ${practiceDays()}.`) : null);
    mount(scr, 'home');
  }
  function showPost(i) {
    state.posts.read[i] = 1; save();
    const txt = sub(D.POSTS[i].t);
    const scr = h('main', { class: 'screen map' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showPosts()), h('h1', { class: 'h-display' }, 'Ein Brief!')),
      h('div', { class: 'letter' }, h('p', { class: 'letter-t' }, txt), h('p', { class: 'letter-sig' }, '– Kevin')),
      h('button', { class: 'tile go', onclick: () => Voice.say(langParts(txt, 'post:' + i)) }, '🔊 Vorlesen'));
    mount(scr, 'home');
    setTimeout(() => Voice.say([P('p:post')]), 300); // Brief liest sie selbst; 🔊 hilft bei Bedarf
  }

  // ---------- Eigene Tänze ----------
  function showDances() {
    const list = h('div', { class: 'dances' }, state.dances.map((d, i) => h('div', { class: 'dance-card' }, h('img', { src: d.img, alt: d.name }), h('p', null, d.name),
      h('button', { class: 'p-btn', 'aria-label': 'Tanz löschen', onclick: () => { state.dances.splice(i, 1); save(); showDances(); } }, '🗑'))));
    const scr = h('main', { class: 'screen map' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showHome()), h('h1', { class: 'h-display' }, 'Meine Tänze')),
      h('p', { class: 'note' }, 'Deine Tänze kommen in der Tanz-Pause dran!'),
      state.dances.length < 8 ? h('button', { class: 'tile go', id: 'dance-new', onclick: () => explain('newdance', newDance) }, '✏️ Neuen Tanz erfinden') : h('p', { class: 'note' }, 'Dein Tanzbuch ist voll. Lösch einen Tanz für einen neuen.'),
      list);
    mount(scr, 'home');
  }
  // Requisiten fürs Tanz-Bild: antippen = einfügen, ziehen = verschieben.
  const emo = (e) => `<svg viewBox="0 0 100 100"><text x="50" y="54" font-size="80" text-anchor="middle" dominant-baseline="middle">${e}</text></svg>`;
  const DANCE_PROPS = [
    { id: 'hula', n: 'Hula-Hoop', svg: () => '<svg viewBox="0 0 200 90"><ellipse cx="100" cy="45" rx="92" ry="34" fill="none" stroke="#ff4fa3" stroke-width="12"/><ellipse cx="100" cy="45" rx="92" ry="34" fill="none" stroke="#ffd34d" stroke-width="12" stroke-dasharray="26 26"/></svg>' },
    { id: 'hantel', n: 'Hanteln', svg: () => '<svg viewBox="0 0 200 80"><rect x="40" y="34" width="120" height="12" rx="6" fill="#8f9aa6"/><rect x="18" y="12" width="24" height="56" rx="8" fill="#e8445a"/><rect x="4" y="22" width="16" height="36" rx="6" fill="#c2203a"/><rect x="158" y="12" width="24" height="56" rx="8" fill="#e8445a"/><rect x="180" y="22" width="16" height="36" rx="6" fill="#c2203a"/></svg>' },
    { id: 'disco', n: 'Disco-Box', svg: () => '<svg viewBox="0 0 120 160"><rect x="6" y="6" width="108" height="148" rx="16" fill="#2b2140"/><circle cx="60" cy="48" r="24" fill="#4b3d6b"/><circle cx="60" cy="48" r="11" fill="#ff4fa3"/><circle cx="60" cy="112" r="34" fill="#4b3d6b"/><circle cx="60" cy="112" r="17" fill="#38d0ff"/><circle cx="60" cy="112" r="6" fill="#ffd34d"/><path d="M14 22 L28 22 M92 22 L106 22" stroke="#ffd34d" stroke-width="5" stroke-linecap="round"/></svg>' },
    { id: 'kugel', n: 'Discokugel', svg: () => '<svg viewBox="0 0 120 140"><line x1="60" y1="0" x2="60" y2="22" stroke="#666" stroke-width="3"/><circle cx="60" cy="80" r="56" fill="#cfd8e3"/><g stroke="#9fb0c3" stroke-width="2"><path d="M8 62 H112 M5 80 H115 M8 98 H112 M18 44 H102 M18 116 H102 M60 24 V136 M34 30 Q22 80 34 130 M86 30 Q98 80 86 130"/></g><circle cx="40" cy="58" r="8" fill="#fff"/><circle cx="84" cy="96" r="5" fill="#ffe36b"/><circle cx="76" cy="50" r="4" fill="#9ef"/></svg>' },
    { id: 'max', n: 'Max', svg: () => svgMax({ mood: 'happy', noBall: true }) },
    { id: 'cat', n: 'Schmanny', svg: () => svgCat({}) },
    { id: 'pablo', n: 'Pablo', svg: () => svgPablo({}) },
    { id: 'mikro', n: 'Mikrofon', svg: () => emo('🎤') },
    { id: 'note', n: 'Musik', svg: () => emo('🎶') },
    { id: 'stern', n: 'Glitzer', svg: () => emo('✨') },
    { id: 'herz', n: 'Herz', svg: () => emo('💖') },
    { id: 'krone', n: 'Krone', svg: () => emo('👑') }
  ];
  const svgSrc = (m) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m.includes('xmlns=') ? m : m.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
  const svgRatio = (m) => { const v = (m.match(/viewBox="([^"]+)"/) || [])[1]; if (!v) return 1; const [, , w, hh] = v.split(/\s+/).map(Number); return hh / w; };
  function newDance() {
    const pad = writePad({ height: 300, lines: false, width: 6, color: '#b72a2a' });
    const layer = h('div', { class: 'prop-layer' }); const stage = h('div', { class: 'dance-stage' }, pad.el, layer);
    const items = []; let sel = null;
    const tools = h('div', { class: 'prop-tools', hidden: true },
      h('button', { class: 'p-btn', onclick: () => sel && scale(1.2) }, '➕ Größer'),
      h('button', { class: 'p-btn', onclick: () => sel && scale(1 / 1.2) }, '➖ Kleiner'),
      h('button', { class: 'p-btn', onclick: () => { if (sel) { sel.r = (sel.r + 20) % 360; place(sel); } } }, '↻ Drehen'),
      h('button', { class: 'p-btn', onclick: () => { if (!sel) return; sel.el.remove(); items.splice(items.indexOf(sel), 1); select(null); } }, '🗑 Weg'));
    function scale(f) { sel.s = Math.max(0.4, Math.min(3, sel.s * f)); place(sel); }
    function place(it) { const w = 90 * it.s; it.el.style.width = w + 'px'; it.el.style.left = (it.x - w / 2) + 'px'; it.el.style.top = (it.y - (w * it.ratio) / 2) + 'px'; it.el.style.transform = `rotate(${it.r}deg)`; }
    function select(it) { sel = it; items.forEach((x) => x.el.classList.toggle('sel', x === it)); tools.hidden = !it; }
    function add(P) {
      const m = P.svg(); const r = layer.getBoundingClientRect();
      const it = { p: P.id, m, ratio: svgRatio(m), x: r.width / 2 + (Math.random() - 0.5) * 80, y: r.height / 2 + (Math.random() - 0.5) * 60, s: P.id === 'hula' ? 1.6 : 1, r: 0 };
      it.el = h('div', { class: 'prop-item', html: m });
      let drag = null;
      it.el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); select(it); try { it.el.setPointerCapture(e.pointerId); } catch (er) { } drag = [e.clientX - it.x, e.clientY - it.y]; });
      it.el.addEventListener('pointermove', (e) => { if (!drag) return; const R = layer.getBoundingClientRect(); it.x = Math.max(0, Math.min(R.width, e.clientX - drag[0])); it.y = Math.max(0, Math.min(R.height, e.clientY - drag[1])); place(it); });
      ['pointerup', 'pointercancel'].forEach((ev) => it.el.addEventListener(ev, () => { drag = null; }));
      layer.append(it.el); items.push(it); place(it); select(it); SFX.tap();
    }
    async function render() {
      const cv = pad.el.querySelector('canvas'); const dpr = cv.width / cv.clientWidth;
      const out = document.createElement('canvas'); out.width = cv.width; out.height = cv.height;
      const c = out.getContext('2d'); c.drawImage(cv, 0, 0);
      for (const it of items) {
        const img = new Image(); img.src = svgSrc(it.m);
        try { await img.decode(); } catch (e) { continue; }
        const w = 90 * it.s * dpr, hh = w * it.ratio;
        c.save(); c.translate(it.x * dpr, it.y * dpr); c.rotate(it.r * Math.PI / 180); c.drawImage(img, -w / 2, -hh / 2, w, hh); c.restore();
      }
      return out.toDataURL('image/png');
    }
    let a = null, b = null; const nameEl = h('p', { class: 'dance-name' }, 'Wie heißt dein Tanz?');
    const upd = () => { nameEl.textContent = a && b ? `${a}-${b}` : 'Wie heißt dein Tanz?'; };
    const row = (arr, set) => h('div', { class: 'chips pick' }, arr.map((w) => { const c = h('button', { class: 'chip', onclick: () => { set(w); c.parentNode.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); c.classList.add('on'); upd(); } }, w); return c; }));
    const palette = h('div', { class: 'prop-palette' }, DANCE_PROPS.map((P) => h('button', { class: 'prop-btn', id: 'prop-' + P.id, 'aria-label': P.n, onclick: () => add(P) }, svgEl(P.svg(), 'prop-ico'), h('span', null, P.n))));
    pad.el.addEventListener('pointerdown', () => select(null));
    const scr = h('main', { class: 'screen map' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showDances()), h('h1', { class: 'h-display' }, 'Neuer Tanz')),
      h('p', { class: 'note' }, 'Mal deinen Tanz! Tipp unten auf Sachen, dann kommen sie ins Bild. Mit dem Finger kannst du sie verschieben.'),
      stage, tools, palette,
      h('button', { class: 'p-btn', onclick: () => { pad.clear(); items.forEach((x) => x.el.remove()); items.length = 0; select(null); } }, '↺ Alles neu'),
      nameEl, row(D.DANCE_A, (w) => { a = w; }), row(D.DANCE_B, (w) => { b = w; }),
      h('button', { class: 'tile go', id: 'dance-save', onclick: async () => {
        if ((pad.empty && !items.length) || !a || !b) { toast('Mal deinen Tanz und such einen Namen aus!', '✏️'); return; }
        select(null);
        state.dances.push({ img: await render(), name: `${a}-${b}`, props: [...new Set(items.map((x) => x.p))] }); save(); SFX.fanfare(); toast(`Neuer Tanz: ${a}-${b}!`, '💃'); showDances();
      } }, 'Tanz speichern'));
    mount(scr, 'home');
    setTimeout(() => Voice.say([P('p:tanzneu')]), 300);
  }

  // ---------- Russisch-Missionen (im echten Leben) ----------
  function ensureMission() {
    const today = dayNum(); const m = state.mission;
    if (!m || (m.done && m.day !== today)) { const i = state.missionsDone % D.RU_MISSIONS.length; state.mission = { i, day: today, done: false }; save(); }
  }
  function missionCard() {
    const m = state.mission; if (!m || m.done) return null; const M = D.RU_MISSIONS[m.i];
    return h('div', { class: 'mission' },
      h('p', { class: 'mission-t' }, '🗣️ Russisch-Mission'),
      h('button', { class: 'mission-ru', onclick: () => Voice.say([{ id: 'mis:' + m.i, text: M.ru, lang: 'ru' }]) }, '🔊 ', M.ru),
      h('p', { class: 'mission-de' }, M.de),
      h('button', { class: 'tile go small', id: 'mission-done', onclick: () => {
        state.mission.done = true; state.missionsDone++; SFX.fanfare();
        if (state.missionsDone % 3 === 0) { const un = D.STICKERS.filter((x) => !state.stickers.owned.includes(x.id)); if (un.length) { const g = pick(un); state.stickers.owned.push(g.id); toast(`3 Missionen geschafft! ${g.n} für Max!`, g.e); } }
        else toast('Молодец! Mission geschafft!', '🎉');
        save(); showHome();
      } }, '✓ Geschafft (Mama tippt)'));
  }

  // ---------- Tanz-Pause ----------
  function showDance() {
    const i = rnd(D.DANCES.length); let left = 15;
    const own = state.dances.length && Math.random() < 0.45 ? pick(state.dances) : null;
    const num = h('span', { class: 'count' }, String(left));
    const scr = h('main', { class: 'screen dance' },
      h('h1', { class: 'h-display' }, 'Tanz-Pause!'),
      own ? h('div', { class: 'own-dance' }, h('img', { src: own.img, alt: own.name }), h('p', { class: 'dance-name' }, `Dein Tanz: ${own.name}!`)) : svgEl(svgMax({ mood: 'happy' }), 'dance-max'),
      own ? null : textEl(D.DANCES[i], { cls: 'sentence' }),
      h('div', { class: 'ring' }, num),
      h('button', { class: 'tile go', id: 'dance-done', onclick: () => { clearInterval(timer); SFX.tap(); nextTask(); } }, 'Fertig getanzt!'));
    if (own && own.props && own.props.some((x) => x === 'disco' || x === 'kugel')) scr.classList.add('party');
    mount(scr, 'dance');
    const timer = setInterval(() => { left--; num.textContent = String(Math.max(0, left)); if (left <= 0) { clearInterval(timer); scr.classList.add('time-up'); } if (!document.body.contains(scr)) clearInterval(timer); }, 1000);
    setTimeout(() => { Voice.say(own ? [P('p:deintanz'), { text: own.name.replace('-', ' ') }] : [P('p:tanz'), { id: 'tanz:' + i, text: plain(D.DANCES[i]) }]).then(() => { if (document.body.contains(scr)) Beat.start(); }); }, 250);
  }

  // ---------- Ende ----------
  function showEnd(res) {
    SFX.fanfare();
    const giftEls = res.gifts.map((g) => {
      const card = h('button', { class: 'gift', onclick: () => { if (card.classList.contains('open')) return; card.classList.add('open'); SFX.fanfare(); card.replaceChildren(h('span', { class: 'gift-e' }, g.e), h('span', null, `${g.n} für Max!`)); } }, h('span', { class: 'gift-e' }, '🎁'), h('span', null, 'Antippen!'));
      return card;
    });
    const chips = (ids) => h('div', { class: 'chips' }, ids.slice(0, 10).map((id) => h('span', { class: 'chip' }, itemLabel(id))));
    const scr = h('main', { class: 'screen end' },
      h('h1', { class: 'h-display' }, 'Geschafft!'),
      svgEl(svgMax({ mood: 'happy', cls: 'hop' }), 'end-max'),
      h('p', { class: 'end-line' }, `${res.done} Aufgaben, ${res.right} richtig. `, res.hadWrong ? 'Du hast nicht aufgegeben!' : 'Kein einziger Fehler!'),
      res.learned.length ? h('section', { class: 'end-sec' }, h('h2', null, 'Neu gelernt'), chips(res.learned)) : null,
      res.secured.length ? h('section', { class: 'end-sec' }, h('h2', null, 'Sitzt jetzt richtig fest'), chips(res.secured)) : null,
      res.unlocks.length ? h('section', { class: 'end-sec unlock' }, h('h2', null, '🔓 Neu freigeschaltet'), h('p', null, res.unlocks.join(', '))) : null,
      res.miles.length ? h('section', { class: 'end-sec mile' }, h('h2', null, '🏆 Drei Sterne!'), h('p', null, 'Du kannst jetzt: ' + res.miles.map(SKILL_NAME).join(', '))) : null,
      giftEls.length ? h('section', { class: 'end-sec' }, h('h2', null, 'Überraschung!'), h('div', { class: 'gifts' }, giftEls)) : null,
      res.newChapter ? h('button', { class: 'tile chapter', onclick: () => showStory(state.story.unlocked - 1) }, '📖 Neues Kapitel lesen!') : null,
      h('button', { class: 'tile go', id: 'end-home', onclick: () => showHome() }, 'Zurück zu Max'));
    mount(scr, 'home');
    const v = [P('p:fertig')]; if (res.unlocks && res.unlocks.length) v.push({ id: 'p:stufe', text: 'Neue Stufe freigeschaltet!' }); else if (res.miles && res.miles.length) v.push({ id: 'p:stern', text: 'Ein neuer Stern! Das kannst du jetzt sicher.' }); if (res.gifts.length) v.push(P('p:sticker')); if (res.newChapter) v.push(P('p:kapitel'));
    setTimeout(() => Voice.say(v), 400);
  }

  // ---------- Urkunde ----------
  function showCertificate(res) {
    SFX.fanfare();
    const f = res.done ? res.right / res.done : 0; const n = f >= 0.9 ? 3 : f >= 0.7 ? 2 : f >= 0.5 ? 1 : 0;
    const msg = ['Mutig gemacht! Wir üben weiter, dann klappt es beim nächsten Test.', 'Gut gemacht! Mit Üben wird es noch besser.', 'Richtig stark! Max ist stolz auf dich.', 'Spitzenklasse! Sogar Schmanny ist beeindruckt.'][n];
    const today = new Date();
    const scr = h('main', { class: 'screen end cert-screen' },
      h('div', { class: 'cert' },
        h('p', { class: 'cert-top' }, '🏅 Urkunde 🏅'),
        h('p', { class: 'cert-for' }, 'für'),
        h('h1', { class: 'cert-name' }, state.name),
        h('p', { class: 'cert-score' }, `${res.right} von ${res.done}`),
        h('div', { class: 'cert-stars' }, stars(n)),
        h('p', { class: 'cert-msg' }, msg),
        h('div', { class: 'cert-sign' },
          h('div', null, svgEl(svgMax({ mood: 'happy', noBall: true }), 'sig-c'), h('span', null, 'Max 🐾')),
          h('div', null, svgEl(svgCat({ mood: n >= 3 ? 'wow' : 'bored' }), 'sig-c'), h('span', null, n >= 3 ? 'Schmanny (beeindruckt!)' : 'Schmanny'))),
        h('p', { class: 'cert-date' }, today.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }))),
      res.gifts.length ? h('section', { class: 'end-sec' }, h('h2', null, 'Für Max!'), h('div', { class: 'gifts' }, res.gifts.map((g) => h('div', { class: 'gift open' }, h('span', { class: 'gift-e' }, g.e), h('span', null, g.n))))) : null,
      h('p', { class: 'note' }, 'Tipp: Zeig die Urkunde Kevin oder Mama!'),
      h('button', { class: 'tile go', id: 'end-home', onclick: () => showHome() }, 'Zurück zu Max'));
    mount(scr, 'dance');
    setTimeout(() => Voice.say([P('p:urkunde')]), 400);
  }

  // ---------- Max anziehen ----------
  const STARTER2 = ['perlen', 'konfetti', 'krawatte', 'kamera'];
  function showAlbum(who, cat) {
    who = who || 'max'; cat = cat || 'alle';
    if (!state.stickers.pack2) { state.stickers.pack2 = 1; STARTER2.forEach((id) => { if (!state.stickers.owned.includes(id)) state.stickers.owned.push(id); }); setTimeout(() => toast('Neue Mode ist da! 4 Sachen sind schon für dich freigeschaltet.', '🛍️'), 400); }
    state.stickers.seen = state.stickers.owned.length;
    if (!state.stickers.wornCat) state.stickers.wornCat = {};
    save();
    const W = who === 'max' ? state.stickers.worn : state.stickers.wornCat;
    const draw = (cls) => (who === 'max' ? svgEl(svgMax({ mood: 'happy' }), 'c-max ' + (cls || '')) : svgEl(svgCat({ mood: 'bored' }), 'c-cat ' + (cls || '')));
    const maxBox = h('div', { class: 'album-max' }, draw());
    const redraw = () => maxBox.replaceChildren(draw('hop'));
    const inCat = D.STICKERS.filter((s) => cat === 'alle' || s.k === cat); const shown = inCat.filter((s) => TEST() || state.stickers.owned.includes(s.id)); const hiddenN = inCat.length - shown.length;
    const grid = h('div', { class: 'stickers' }, shown.map((s) => {
      const own = TEST() || state.stickers.owned.includes(s.id);
      const worn = W[s.s] === s.id;
      const b = h('button', { class: 'stk' + (own ? '' : ' locked') + (worn ? ' on' : ''), disabled: !own, 'aria-label': own ? s.n : 'Noch nicht gefunden', onclick: () => {
        SFX.tap();
        if (W[s.s] === s.id) delete W[s.s]; else W[s.s] = s.id;
        save(); grid.querySelectorAll('.stk').forEach((x) => x.classList.remove('on'));
        Object.values(W).forEach((id) => { const el = grid.querySelector(`[data-id="${id}"]`); el && el.classList.add('on'); });
        redraw();
        if (who === 'cat' && Math.random() < 0.5) Voice.say([{ text: pick(['Schmanny ist nicht beeindruckt.', 'Schmanny gähnt.', 'Na gut. Steht mir.']) }]);
      } }, h('span', { class: 'stk-e' }, own ? s.e : '?'), h('span', { class: 'stk-n' }, own ? s.n : '???'));
      b.dataset.id = s.id;
      return b;
    }));
    const scr = h('main', { class: 'screen album' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showHome()), h('h1', { class: 'h-display' }, 'Anziehen')),
      h('div', { class: 'tabs' }, h('button', { class: 'tab' + (who === 'max' ? ' on' : ''), onclick: () => showAlbum('max', cat) }, '🐶 Max'), h('button', { class: 'tab' + (who === 'cat' ? ' on' : ''), onclick: () => showAlbum('cat', cat) }, '🐈 Schmanny')),
      maxBox,
      h('div', { class: 'album-actions' },
        h('button', { class: 'tile', id: 'runway', onclick: () => { SFX.fanfare(); maxBox.classList.remove('runway'); void maxBox.offsetWidth; maxBox.classList.add('runway'); setTimeout(() => maxBox.classList.remove('runway'), 4200); } }, '📸 Laufsteg'),
        h('button', { class: 'tile', id: 'undress', onclick: () => { Object.keys(W).forEach((k) => delete W[k]); save(); showAlbum(who, cat); } }, '🧺 Alles ausziehen')),
      h('div', { class: 'chips pick cat-filter' }, D.STICKER_CATS.map(([k, n]) => h('button', { class: 'chip' + (k === cat ? ' on' : ''), onclick: () => showAlbum(who, k) }, n))),
      grid,
      hiddenN ? h('div', { class: 'stk-more' }, h('span', { class: 'stk-more-e' }, '🎁'), h('span', null, `Noch ${hiddenN} ${hiddenN === 1 ? 'Sache' : 'Sachen'} ${cat === 'alle' ? '' : 'hier '}zu entdecken! Neue gibt es nach dem Üben.`)) : h('p', { class: 'note' }, 'Du hast hier schon alles gefunden! 🌟'));
    mount(scr, 'home');
  }

  // ---------- Mein Weg ----------
  function stars(n) { return h('span', { class: 'stars', 'aria-label': `${n} von 3 Sternen` }, [0, 1, 2].map((i) => h('span', { class: i < n ? 'st on' : 'st' }, '★'))); }
  function showMap() {
    const st = skillStars();
    const SHORT = { p10: '+ bis 10', m10: '− bis 10', p20o: '+ bis 20', m20o: '− bis 20', p20m: '+ über 10', m20m: '− über 10', z: 'Zehner', p100o: '+ bis 100', m100o: '− bis 100', p100m: '+ 100 ⤴', m100m: '− 100 ⤵' };
    const ice = h('ol', { class: 'path ice m' }, activeMSK().map((sk) => {
      const open = skillUnlocked(sk); const name = SHORT[sk.k] || sk.k.slice(1) + '·';
      return h('li', { class: 'node' + (open ? '' : ' locked') }, h('span', { class: 'n-num sm' }, open ? name : '🔒'), open ? stars(st['m_' + sk.k]) : h('span', { class: 'n-lock' }, name));
    }));
    const letters = h('div', { class: 'letter-wall' }, D.LETTERS.map((L) => { const b = box('l:' + L.g); return h('span', { class: 'lw' + (b >= 3 ? ' known' : b >= 1 ? ' seen' : '') }, L.g); }));
    const stages = h('ol', { class: 'path pool' }, [['s', 'Silben'], ['w', 'Wörter'], ['t', 'Sätze']].map(([k, n]) => {
      const open = stageUnlocked(k);
      return h('li', { class: 'node wide' + (open ? '' : ' locked') }, h('span', { class: 'n-num' }, open ? n : '🔒 ' + n), open ? stars(st[k]) : null);
    }));
    const scr = h('main', { class: 'screen map' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showHome()), h('h1', { class: 'h-display' }, 'Mein Weg')),
      h('section', { class: 'map-sec ice' }, h('h2', null, '⛸️ Eisbahn: Rechnen'), ice),
      h('button', { class: 'tile trick-open', id: 'go-tricks', onclick: () => showTricks(showMap) }, `💡 Mein Trickbuch (${Object.keys(state.tricks).length} von ${Object.keys(D.TRICKS).length})`),
      h('section', { class: 'map-sec pool' }, h('h2', null, '🏊 Schwimmbad: Lesen'), h('p', { class: 'note' }, 'Deine Buchstaben:'), letters, stages, h('p', { class: 'note' }, `Geschichte: ${state.story.unlocked} von ${D.STORY.length} Kapiteln`)),
      h('section', { class: 'map-sec ru' }, h('h2', null, '🗣️ Russisch'),
        h('div', { class: 'ru-wall' }, D.RU_WORDS.map((W, i) => { const b = box('ru:' + i); return h('span', { class: 'rw' + (b >= 3 ? ' known' : b >= 1 ? ' seen' : '') }, b >= 1 ? ruPic(W, 'mini') : '?'); })),
        h('ol', { class: 'path pool' },
          h('li', { class: 'node wide' }, h('span', { class: 'n-num' }, 'Wörter'), stars(st.ru)),
          h('li', { class: 'node wide' + (stageUnlocked('rf') ? '' : ' locked') }, h('span', { class: 'n-num' }, stageUnlocked('rf') ? 'Reden' : '🔒 Reden'), stageUnlocked('rf') ? stars(st.rf) : null))),
      state.tests.list.length ? h('section', { class: 'map-sec' }, h('h2', null, '🏅 Meine Tests'), h('div', { class: 'chips' }, state.tests.list.slice(-8).map((x) => h('span', { class: 'chip' }, `${x.r}/${x.n}`)))) : null);
    mount(scr, 'home');
  }

  // ---------- Geschichte ----------
  function showStoryList() {
    const list = h('ol', { class: 'chapters' }, D.STORY.map((c, i) => {
      const open = TEST() || i < state.story.unlocked;
      return h('li', null, h('button', { class: 'tile chap' + (open ? '' : ' locked') + (state.story.read[i] ? ' read' : ''), disabled: !open, onclick: () => showStory(i) },
        h('span', { class: 'chap-n' }, String(i + 1)), h('span', null, open ? c.ti : 'Noch geheim'), open && !state.story.read[i] ? h('span', { class: 'badge' }, 'Neu!') : state.story.read[i] ? h('span', { class: 'done-mark' }, '✓') : null));
    }));
    const scr = h('main', { class: 'screen stories' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showHome()), h('h1', { class: 'h-display' }, 'Max und das Eis-Abenteuer')),
      state.story.unlocked || TEST() ? null : h('p', { class: 'note' }, 'Nach deiner ersten Runde geht die Geschichte los!'),
      h('p', { class: 'note' }, 'Jeden Tag, an dem du übst, kommt ein neues Kapitel.'),
      list);
    mount(scr, 'home');
  }
  function showStory(ci) {
    const c = D.STORY[ci];
    const lines = c.lines.map((l, li) => h('div', { class: 'sline' },
      textEl(l, { cls: 'sentence left', help: (w) => Voice.say([{ id: WORD_CLIP[w.toLowerCase()], text: w }]) })));
    const qBox = h('div', { class: 'story-quiz' });
    const askBtn = h('button', { class: 'tile go', id: 'story-ask', onclick: () => {
      askBtn.remove();
      Voice.say([{ id: `st:${ci}:q`, text: plain(c.q.t) }]);
      const right = c.q.a[0];
      const opts = shuffle(c.q.a.map((a, k) => ({ a, e: c.q.e[k] })));
      const btns = opts.map((o) => h('button', { class: 'tile ans', onclick: () => {
        btns.forEach((b) => { b.disabled = true; }); const ok = o.a === right;
        if (ok) { SFX.ok(); state.story.read[ci] = 1; save(); qBox.append(h('p', { class: 'quiz-ok' }, 'Richtig! Kapitel geschafft ✓'), textEl(c.end, { cls: 'sentence cliff' })); Voice.say([{ id: pick(D.PRAISE_CLIPS).id, text: 'Richtig!' }, { id: `st:${ci}:end`, text: plain(c.end) }]); }
        else { SFX.oops(); btns.forEach((b, k) => { if (opts[k].a === right) b.classList.add('right'); }); state.story.read[ci] = 1; save(); qBox.append(h('p', { class: 'quiz-no' }, 'Fast! Die richtige Antwort ist grün.'), textEl(c.end, { cls: 'sentence cliff' })); }
      } }, h('span', { class: 'emo' }, o.e), textEl(o.a, { cls: 'btn-word' })));
      qBox.append(textEl(c.q.t, { cls: 'sentence' }), h('div', { class: 'answers words' }, btns));
    } }, 'Frage beantworten');
    askBtn.hidden = true;
    const readBtn = h('button', { class: 'tile go', id: 'story-read', onclick: async () => {
      readBtn.remove(); SFX.tap();
      for (let li = 0; li < lines.length; li++) {
        if (!document.body.contains(lines[li])) return;
        lines[li].classList.add('reading'); try { lines[li].scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { }
        await Voice.say([{ id: `st:${ci}:${li}`, text: plain(c.lines[li]) }]);
        lines[li].classList.remove('reading');
      }
      if (document.body.contains(askBtn)) { askBtn.hidden = false; try { askBtn.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { } }
    } }, '✓ Fertig gelesen! Jetzt hör zu');
    const scr = h('main', { class: 'screen story' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showStoryList()), h('h1', { class: 'h-display' }, `${ci + 1}. ${c.ti}`)),
      h('div', { class: 'story-cast' }, svgEl(svgCat(), 'c-cat'), svgEl(svgMax(), 'c-max'), svgEl(svgPablo(), 'c-pablo')),
      h('p', { class: 'hint' }, 'Lies erst alles selbst! Schweres Wort antippen = vorlesen. Danach liest Kevin dir das Kapitel vor.'),
      h('div', { class: 'story-text' }, lines),
      readBtn, qBox, askBtn);
    mount(scr, 'pool');
  }

  // ---------- Eltern ----------
  function parentGate() {
    const a = 12 + rnd(8), b = 3 + rnd(5); const c = a * b;
    const slot = h('span', { class: 'slot' }, '?');
    const err = h('p', { class: 'err', 'aria-live': 'polite' });
    let v = '';
    const pad = h('div', { class: 'np small' }, [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map((k) => h('button', { class: 'tile np-k' + (k === '✓' ? ' go' : ''), onclick: () => {
      if (k === '⌫') v = v.slice(0, -1); else if (k === '✓') { if (+v === c) { ov.remove(); showParents(TEST() ? 'try' : 'stand'); } else { err.textContent = 'Das stimmt nicht.'; v = ''; } } else if (v.length < 3) v += k;
      slot.textContent = v || '?';
    } }, String(k))));
    const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'dialog' },
      h('p', { class: 'h-display' }, 'Für Erwachsene'), h('p', { class: 'expr small' }, `${a} · ${b} = `, slot), err, pad,
      h('button', { class: 'tile', onclick: () => ov.remove() }, 'Abbrechen')));
    document.body.append(ov);
  }

  function numWord(n) {
    const E = ['', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
    const Z = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
    if (n === 100) return 'hundert'; if (n < 20) return E[n];
    const z = Math.floor(n / 10), e = n % 10; return e ? (e === 1 ? 'ein' : E[e]) + 'und' + Z[z] : Z[z];
  }
  function clipGroups() {
    const g = [];
    g.push({ n: 'Menü & Anleitungen', prio: true, items: Object.entries(D.PROMPTS).filter(([id]) => id !== 'p:wau').map(([id, t]) => ({ id, t })) }); // Max-Antippen hat genug eigene Clips
    g.push({ n: 'Lob, Trost & Belohnung', prio: true, items: [].concat(D.PRAISE_CLIPS.map((x) => Object.assign({ hint: 'Lob' }, x)), D.PRAISE_MATH.map((x) => Object.assign({ hint: 'Lob Rechnen' }, x)), D.PRAISE_READ.map((x) => Object.assign({ hint: 'Lob Lesen' }, x)), D.PRAISE_RETRY.map((x) => Object.assign({ hint: 'nach einem Fehler jetzt richtig' }, x)), D.PRAISE_STREAK.map((x) => Object.assign({ hint: '5 richtig hintereinander' }, x)), D.OOPS_CLIPS.map((x) => Object.assign({ hint: 'Trost' }, x)), D.REWARD_CLIPS.map((x) => Object.assign({ hint: 'Belohnung am Rundenende' }, x))) });
    g.push({ n: 'Zahlen für Mal-Aufgaben', prio: true, items: [...Array(10)].map((_, k) => ({ id: 'num:' + (k + 1), t: ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'][k] })).concat([{ id: 'mal', t: 'mal' }]) });
    g.push({ n: 'Buchstaben: Wörter', prio: true, items: D.LETTERS.map((L) => ({ id: 'anl:' + L.g, t: L.w, hint: 'für ' + L.g })) });
    g.push({ n: 'Buchstaben: nur der Laut (z. B. „mmm“)', items: D.LETTERS.map((L) => ({ id: 'laut:' + L.g, t: 'Laut ' + L.g, hint: 'nur den Laut' })) });
    g.push({ n: 'Wörter', items: D.WORDS.map((w, i) => ({ id: 'w:' + i, t: plain(w.w) })) });
    g.push({ n: 'Sätze', items: D.SENTENCES.map((s, i) => ({ id: 't:' + i, t: plain(s.t) })) });
    g.push({ n: 'Geschichte', items: D.STORY.flatMap((c, ci) => c.lines.map((l, li) => ({ id: `st:${ci}:${li}`, t: plain(l), hint: `Kap. ${ci + 1}` })).concat([{ id: `st:${ci}:end`, t: plain(c.end), hint: `Kap. ${ci + 1}` }, { id: `st:${ci}:q`, t: plain(c.q.t), hint: `Kap. ${ci + 1}, Frage` }])) });
    g.push({ n: 'Tanz-Pause', items: D.DANCES.map((d, i) => ({ id: 'tanz:' + i, t: plain(d) })) });
    g.push({ n: 'Neu: Anleitungen für Russisch & Test', prio: true, items: Object.entries(D.PROMPTS2).map(([id, t]) => ({ id, t })) });
    g.push({ n: 'Russisch: Wörter (auf Russisch sprechen)', ru: true, items: D.RU_EXTRA.map((x) => ({ id: x.id, t: x.t, hint: x.hint, ru: true })).concat(D.RU_WORDS.map((W, i) => ({ id: 'ru:' + i, t: W.ru, hint: W.de, ru: true }))) });
    g.push({ n: 'Russisch: Fragen', ru: true, items: D.RU_PHRASES.map((Q, i) => ({ id: 'rfq:' + i, t: sub(Q.q), hint: sub(Q.dq), ru: true })) });
    g.push({ n: 'Neu: Anleitungen für Rechnen, Schreiben & Post', prio: true, items: Object.entries(D.PROMPTS3).map(([id, t]) => ({ id, t })) });
    g.push({ n: 'Post von Kevin (Briefe)', items: D.POSTS.map((p, i) => ({ id: 'post:' + i, t: sub(p.t), hint: `ab ${p.tag} Übungstagen` })) });
    g.push({ n: 'Russisch-Missionen', ru: true, items: D.RU_MISSIONS.map((m, i) => ({ id: 'mis:' + i, t: m.ru, hint: m.de, ru: true })) });
    g.push({ n: 'Russisch: Antworten (mit ihrem Namen)', ru: true, items: D.RU_PHRASES.map((Q, i) => ({ id: 'rfa:' + i, t: sub(Q.a), hint: sub(Q.da), ru: true })) });
    g.push({ n: 'Startbildschirm: Antippen', items: [['cat', 'Schmanny'], ['max', 'Max'], ['pablo', 'Pablo']].flatMap(([w, n]) => [...Array(TAPS[w])].map((_, k) => ({ id: `tap:${w}:${k}`, t: `${n} antippen ${k + 1}`, hint: 'frei, lustig' }))) });
    g.push({ n: 'Zahlen 0 und 11–100, „ist“', items: [{ id: 'num:0', t: 'null' }].concat([...Array(90)].map((_, k) => ({ id: 'num:' + (k + 11), t: numWord(k + 11) })), [{ id: 'ist', t: 'ist' }]) });
    g.push({ n: 'Neu: Anleitungen 2. Klasse', items: Object.entries(D.PROMPTS4).map(([id, t]) => ({ id, t })) });
    g.push({ n: 'Erklärungen beim ersten Öffnen', prio: true, items: Object.entries(D.EXPLAIN || {}).map(([k, E]) => ({ id: 'erk:' + k, t: E.t, hint: E.n })) });
    g.push({ n: 'Einführung (Kevin erklärt die App)', prio: true, items: (D.TOUR || []).map((x) => ({ id: x.id, t: x.t })) });
    g.push({ n: 'Begrüßungen beim Öffnen', items: (D.GREETS || []).map((x) => ({ id: x.id, t: x.t })) });
    g.push({ n: 'Kurze Starts bei Übungen', items: (D.STARTS || []).map((x) => ({ id: x.id, t: x.t })) });
    g.push({ n: 'Uhrzeit-Bausteine (werden mit den Zahlen zusammengesetzt)', items: [['uz:esist', 'Es ist'], ['uz:uhr', 'Uhr'], ['uz:halb', 'halb'], ['uz:vnach', 'Viertel nach'], ['uz:vvor', 'Viertel vor'], ['uz:einuhr', 'Es ist ein Uhr.']].map(([id, t]) => ({ id, t })) });
    g.push({ n: 'Lesetexte (Lese-Training)', items: D.LSTUFEN.flatMap((S, k) => S.texts.map((T, i) => ({ id: leseClipId(k + 1, i), t: plain(T.t), hint: `Stufe ${k + 1}: ${T.n}` }))) });
    g.push({ n: 'Trickbuch', items: Object.entries(D.TRICKS).map(([k, T]) => ({ id: 'trick:' + k, t: T.n + '. ' + T.d })) });
    return g;
  }
  function hasClip(id) { return !!(state.rec[id] || (window.VOICE_PACK && window.VOICE_PACK[id])); }

  function showParents(tab) {
    const tabs = [['try', 'Ausprobieren'], ['stand', 'Lernstand'], ['set', 'Einstellungen'], ['voice', 'Stimme'], ['backup', 'Sicherung']];
    const body = h('div', { class: 'p-body' });
    const scr = h('main', { class: 'screen parents' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showHome()), h('h1', { class: 'h-display' }, 'Eltern-Bereich')),
      h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, n]) => h('button', { class: 'tab' + (k === tab ? ' on' : ''), role: 'tab', 'aria-selected': String(k === tab), onclick: () => showParents(k) }, n))),
      body);
    mount(scr, 'parents');
    ({ try: pTry, stand: pStand, set: pSet, voice: pVoice, backup: pBackup })[tab](body);
  }
  // ---------- Stoff 2. Klasse: weitere Themen in Mathe und Deutsch ----------
  const doneSk = (k) => TEST() || (() => { const sk = MSK.find((x) => x.k === k); return sk ? skillFrac(sk, 2) >= 0.7 : false; })();
  const GEN = (seed, n, f) => { const r = seeded(seed); const set = new Set(); let g = 0; while (set.size < n && g++ < 3000) { const id = f(r); if (id) set.add(id); } return [...set]; };
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const SHAPES = { kreis: 'Kreis', dreieck: 'Dreieck', quadrat: 'Quadrat', rechteck: 'Rechteck' };
  const COINS = [200, 100, 50, 20, 10, 5, 2, 1];
  const TOPICS = [
    { k: 'form', pool: 'math', n: 'Formen', gate: () => true, ids: Object.keys(SHAPES).map((s) => 'form:' + s), kind: 'form' },
    { k: 'vgl', pool: 'math', n: 'Größer, kleiner, gleich', gate: () => doneSk('p10'), ids: GEN(21, 30, (r) => { const a = ri(r, 1, 99); const b = r() < 0.15 ? a : ri(r, Math.max(0, a - 15), Math.min(100, a + 15)); return `vgl:${a}:${b}`; }), kind: 'vergleich' },
    { k: 'dop', pool: 'math', n: 'Verdoppeln und Halbieren', gate: () => doneSk('p10'), ids: [...Array(10)].map((_, i) => 'dop:' + (i + 1)).concat([...Array(10)].map((_, i) => 'hal:' + (2 * (i + 1)))).concat([20, 30, 40, 50].map((n) => 'dop:' + n), [40, 60, 80, 100].map((n) => 'hal:' + n)), kind: 'doppel' },
    { k: 'uhr', pool: 'math', n: 'Uhrzeit', gate: () => doneSk('m10'), ids: [0, 30, 15, 45].flatMap((m) => [...Array(12)].map((_, h) => `uhr:${h + 1}:${m}`)), kind: 'uhr' },
    { k: 'len', pool: 'math', n: 'Längen (cm)', gate: () => doneSk('p20o'), ids: [...Array(14)].map((_, i) => 'len:' + (i + 2)), kind: 'laenge' },
    { k: 'sach', pool: 'math', n: 'Sachaufgaben', gate: () => doneSk('p20o'), ids: GEN(22, 32, (r) => { const i = ri(r, 0, D.SACH.length - 1); const plus = D.SACH[i][0] === '+'; const a = ri(r, plus ? 2 : 6, plus ? 12 : 20); const b = plus ? ri(r, 1, 20 - a) : ri(r, 1, a - 1); return b > 0 ? `sach:${i}:${a}:${b}` : null; }), kind: 'sachaufgabe' },
    { k: 'geld', pool: 'math', n: 'Geld', gate: () => doneSk('p20m'), ids: GEN(23, 30, (r) => { const n = ri(r, 2, 4); const c = []; for (let i = 0; i < n; i++) c.push(pick(r() < 0.5 ? [50, 20, 10] : [5, 2, 1])); const s = c.reduce((x, y) => x + y, 0); return s <= 100 ? 'geld:' + c.sort((x, y) => y - x).join('-') : null; }).concat(GEN(24, 10, (r) => { const c = [pick([100, 200]), pick([100, 200, 50])]; return 'geld:' + c.sort((x, y) => y - x).join('-'); })), kind: 'geld' },
    { k: 'nb', pool: 'math', n: 'Nachbarzahlen', gate: () => doneSk('z'), ids: GEN(25, 30, (r) => `nb:${ri(r, 11, 99)}:${r() < 0.5 ? 'v' : 'n'}`), kind: 'nachbar' },
    { k: 'zs', pool: 'math', n: 'Zahlenstrahl', gate: () => doneSk('z'), ids: [...Array(19)].map((_, i) => 'zs:' + (5 * (i + 1))), kind: 'zahlenstrahl' },
    { k: 'hz', pool: 'math', n: 'Zehner und Einer', gate: () => doneSk('z'), ids: GEN(26, 30, (r) => 'hz:' + ri(r, 11, 99)), kind: 'stellenwert' },
    { k: 'dv', pool: 'math', n: 'Geteilt', gate: () => MAL() && (TEST() || reiheFrac(2, 2) >= 0.7), ids: [2, 5, 10].flatMap((b) => [...Array(10)].map((_, c) => `dv:${b * (c + 1)}:${b}`)), kind: (b) => (b <= 1 ? 'tippen' : pick(['tippen', 'pablo', 'blitz'])) },
    { k: 'sz', pool: 'read', n: 'Silben zählen', gate: () => stageUnlocked('s'), ids: D.WORDS.map((w, i) => 'sz:' + i), kind: 'silbenzahl' },
    { k: 'abc', pool: 'read', n: 'ABC', gate: () => stageUnlocked('s'), ids: 'ABCDEFGHIJKLMNOPQRSTUVWXY'.split('').map((x) => 'abc:' + x), kind: 'abc' },
    { k: 'reim', pool: 'read', n: 'Reime', gate: () => stageUnlocked('s'), ids: D.RHYMES.map((x, i) => 'reim:' + i), kind: 'reim' },
    { k: 'dik', pool: 'read', n: 'Diktat', gate: () => stageUnlocked('w'), ids: D.WORDS.map((w, i) => i).filter((i) => plain(D.WORDS[i].w).length <= 8).map((i) => 'dik:' + i), kind: (b) => (b <= 1 ? 'diktat' : pick(['diktat', 'diktatstift'])), test: 'diktat' },
    { k: 'art', pool: 'read', n: 'Der, die, das', gate: () => stageUnlocked('w'), ids: D.NOUNS.map((x, i) => 'art:' + i), kind: 'artikel' },
    { k: 'mz', pool: 'read', n: 'Einzahl und Mehrzahl', gate: () => stageUnlocked('w'), ids: D.NOUNS.map((x, i) => i).filter((i) => D.NOUNS[i].p !== D.NOUNS[i].s).map((i) => 'mz:' + i), kind: 'mehrzahl' },
    { k: 'wa', pool: 'read', n: 'Wortarten', gate: () => stageUnlocked('w'), ids: D.NOUNS.slice(0, 15).map((x, i) => 'wa:N:' + i).concat(D.VERBS.map((x, i) => 'wa:V:' + i), D.ADJS.map((x, i) => 'wa:A:' + i)), kind: 'wortart' },
    { k: 'gk', pool: 'read', n: 'Groß oder klein', gate: () => stageUnlocked('w'), ids: D.NOUNS.slice(15).map((x, i) => 'gk:N:' + (i + 15)).concat(D.VERBS.map((x, i) => 'gk:V:' + i), D.ADJS.map((x, i) => 'gk:A:' + i)), kind: 'grossklein2' },
    { k: 'zz', pool: 'read', n: 'Satzzeichen', gate: () => stageUnlocked('t'), ids: D.PUNCT.map((x, i) => 'zz:' + i), kind: 'satzzeichen' }
  ];
  const TOPIC_BY = {}; TOPICS.forEach((T) => { T.ids.forEach((id) => { TOPIC_BY[id.split(':')[0]] = T; }); });
  TOPIC_BY.hal = TOPICS.find((T) => T.k === 'dop');
  const topicOf = (id) => TOPIC_BY[id.split(':')[0]];
  function topicNews(pool) {
    const out = [];
    TOPICS.filter((T) => T.pool === pool && T.k !== 'hw' && T.gate()).forEach((T) => { const n = T.ids.filter((id) => box(id) === 0); out.push(...(TEST() ? shuffle(n) : n).slice(0, 2)); });
    return shuffle(out);
  }
  function weave(a, b, every) { const o = []; let j = 0; a.forEach((x, i) => { o.push(x); if ((i + 1) % every === 0 && j < b.length) o.push(b[j++]); }); while (j < b.length) o.push(b[j++]); return o; }
  function topicLabel(id) {
    const T = topicOf(id); const [k, x, y] = id.split(':'); let s = id;
    if (k === 'form') s = SHAPES[x]; else if (k === 'vgl') s = `${x} ? ${y}`; else if (k === 'dop') s = `Doppelt ${x}`; else if (k === 'hal') s = `Hälfte ${x}`;
    else if (k === 'uhr') s = uhrText(+x, +y); else if (k === 'len') s = `${x} cm`; else if (k === 'geld') s = geldText(id); else if (k === 'nb') s = `${y === 'v' ? 'vor' : 'nach'} ${x}`;
    else if (k === 'zs') s = `Pfeil bei ${x}`; else if (k === 'hz') s = x; else if (k === 'dv') s = `${x} : ${y}`; else if (k === 'sach') s = `${x} ${D.SACH[+x] ? D.SACH[+x][0] : ''} …`;
    else if (k === 'sz' || k === 'dik') s = plain(D.WORDS[+x].w); else if (k === 'abc') s = `nach ${x}`; else if (k === 'reim') s = D.RHYMES[+x][0];
    else if (k === 'art' || k === 'mz') s = D.NOUNS[+x].s; else if (k === 'wa' || k === 'gk') s = wortOf(x, +y); else if (k === 'zz') s = D.PUNCT[+x][0]; else if (k === 'hw') s = D.HFW[+x];
    return `${T ? T.n : ''}: ${s}`;
  }
  const wortOf = (t, i) => (t === 'N' ? D.NOUNS[i].s : t === 'V' ? D.VERBS[i] : D.ADJS[i]);
  // Uhrzeit mit Kevins Bausteinen: „Es ist“ + „halb“/„Viertel nach“/„Viertel vor“ + Zahl (+ „Uhr“)
  function uhrVoice(h, m) {
    const nx = (h % 12) + 1, text = `Es ist ${uhrText(h, m)}.`;
    const ids = m === 0 ? (h === 1 ? ['uz:einuhr'] : ['uz:esist', 'num:' + h, 'uz:uhr']) : m === 30 ? ['uz:esist', 'uz:halb', 'num:' + nx] : m === 15 ? ['uz:esist', 'uz:vnach', 'num:' + h] : ['uz:esist', 'uz:vvor', 'num:' + nx];
    return { ids, text };
  }
  function uhrText(h, m) { const nx = (h % 12) + 1; return m === 0 ? `${h} Uhr` : m === 30 ? `halb ${nx}` : m === 15 ? `Viertel nach ${h}` : `Viertel vor ${nx}`; }
  const geldParts = (id) => id.split(':')[1].split('-').map(Number);
  function geldText(id) { const s = geldParts(id).reduce((a, b) => a + b, 0); return s >= 100 && s % 100 === 0 ? `${s / 100} Euro` : s > 100 ? `${Math.floor(s / 100)} Euro ${s % 100} Cent` : `${s} Cent`; }
  const p2 = (k) => ({ id: 'p2:' + k, text: D.PROMPTS4['p2:' + k] });
  const say = (text, id) => ({ id: id || '__none', text });
  const wid = (w) => 'k2w:' + w.toLowerCase();
  const sw = (w) => ({ id: wid(w), text: w });
  function numTask(ui, answer, fbTitle, voice) {
    const slot = h('span', { class: 'slot' }, '?');
    ui.answers.replaceChildren(numpad((v) => { slot.classList.add(v === answer ? 'right' : 'wrong'); ui.done(v === answer); }, slot));
    ui.feedback = (ok) => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, fbTitle)), voice: voice ? [voice] : [] });
    return slot;
  }
  function svgClock(h, m) {
    const ang = (deg) => (deg - 90) * Math.PI / 180; const hx = (r, deg) => [100 + r * Math.cos(ang(deg)), 100 + r * Math.sin(ang(deg))];
    const ticks = [...Array(12)].map((_, i) => { const [x1, y1] = hx(80, i * 30), [x2, y2] = hx(90, i * 30); const [tx, ty] = hx(66, i * 30); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#15233f" stroke-width="4"/><text x="${tx}" y="${ty + 7}" text-anchor="middle" font-size="20" font-family="Andika, sans-serif" fill="#15233f">${i || 12}</text>`; }).join('');
    const [hX, hY] = hx(44, ((h % 12) + m / 60) * 30), [mX, mY] = hx(70, m * 6);
    return `<svg viewBox="0 0 200 200" class="clock" role="img" aria-label="Uhr"><circle cx="100" cy="100" r="95" fill="#fff" stroke="#15233f" stroke-width="6"/>${ticks}<line x1="100" y1="100" x2="${hX}" y2="${hY}" stroke="#df362a" stroke-width="9" stroke-linecap="round"/><line x1="100" y1="100" x2="${mX}" y2="${mY}" stroke="#1c5fd2" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="100" r="7" fill="#15233f"/></svg>`;
  }
  function coinEl(c) { const euro = c >= 100; return h('span', { class: 'coin ' + (euro ? 'euro' : c >= 10 ? 'gold' : 'copper') }, euro ? `${c / 100} €` : `${c} ct`); }
  function shapeSvg(s) {
    const f = { kreis: '<circle cx="60" cy="60" r="48"/>', dreieck: '<polygon points="60,10 112,104 8,104"/>', quadrat: '<rect x="14" y="14" width="92" height="92"/>', rechteck: '<rect x="4" y="30" width="112" height="60"/>' }[s];
    return `<svg viewBox="0 0 120 120" class="shape"><g fill="#ffd34d" stroke="#15233f" stroke-width="5">${f}</g></svg>`;
  }
  function plurals(N) { const others = shuffle(D.NOUNS.filter((x) => x !== N && x.p !== N.p)); const out = []; if (N.s !== N.p) out.push(N.s); for (const o of others) { if (out.length >= 2) break; if (!out.includes(o.p)) out.push(o.p); } return out.slice(0, 2); } // nur echte, richtig geschriebene Wörter
  Object.assign(TASKS, {
    form(t, ui) {
      const s = t.id.split(':')[1];
      ui.prompt(D.PROMPTS4['p2:form'], 'p2:form'); ui.stage.append(svgEl(shapeSvg(s), 'shape-box'));
      ui.choices(shuffle(Object.keys(SHAPES)).slice(0, 4).map((k) => ({ label: SHAPES[k], value: k })), (v) => v === s, 'words');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, SHAPES[s])), voice: [] });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    vergleich(t, ui) {
      const [, x, y] = t.id.split(':'); const a = +x, b = +y; const right = a > b ? '>' : a < b ? '<' : '=';
      ui.prompt(D.PROMPTS4['p2:vgl'], 'p2:vgl');
      ui.stage.append(h('p', { class: 'expr' }, `${a} `, h('span', { class: 'slot' }, '?'), ` ${b}`));
      if (!S.test) tipButton(ui, () => ({ k: 'krokodil', tip: D.TRICKS.krokodil.d }));
      ui.choices(['<', '=', '>'].map((v) => ({ label: v, value: v })), (v) => v === right, 'nums');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, `${a} ${right} ${b}`), h('p', { class: 'strat' }, right === '=' ? 'Beide Zahlen sind gleich.' : `${Math.max(a, b)} ist größer. Das Krokodil frisst die größere Zahl.`)) });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    doppel(t, ui) {
      const [k, x] = t.id.split(':'); const n = +x; const dbl = k === 'dop'; const ans = dbl ? 2 * n : n / 2;
      ui.prompt(D.PROMPTS4[dbl ? 'p2:dop' : 'p2:hal'], dbl ? 'p2:dop' : 'p2:hal');
      const slot = numTask(ui, ans, dbl ? `${n} + ${n} = ${ans}` : `${ans} + ${ans} = ${n}`, say(dbl ? `Das Doppelte von ${n} ist ${ans}` : `Die Hälfte von ${n} ist ${ans}`));
      ui.stage.append(h('p', { class: 'expr' }, dbl ? `Das Doppelte von ${n}: ` : `Die Hälfte von ${n}: `, slot));
      ui.audio((full) => (full ? [ui.promptPart, { ids: ['num:' + n], text: String(n) }] : [{ ids: ['num:' + n], text: String(n) }]));
    },
    uhr(t, ui) {
      const [, x, y] = t.id.split(':'); const hh = +x, mm = +y; const right = uhrText(hh, mm);
      ui.prompt(D.PROMPTS4['p2:uhr'], 'p2:uhr');
      ui.stage.append(svgEl(svgClock(hh, mm), 'clock-box'), h('p', { class: 'note' }, 'Kurzer roter Zeiger: Stunde. Langer blauer Zeiger: Minuten.'));
      const wrong = shuffle([uhrText((hh % 12) + 1, mm), uhrText(hh, (mm + 30) % 60), uhrText(hh, mm === 15 ? 45 : 15), uhrText(((hh + 10) % 12) + 1, mm)].filter((v) => v !== right)).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 2);
      ui.choices(shuffle([right, ...wrong]).map((v) => ({ label: v, value: v })), (v) => v === right, 'words');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, `${right} (${hh}:${String(mm).padStart(2, '0')})`)), voice: [uhrVoice(hh, mm)] });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    laenge(t, ui) {
      const n = +t.id.split(':')[1];
      ui.prompt(D.PROMPTS4['p2:len'], 'p2:len');
      const px = 22; const ticks = [...Array(17)].map((_, i) => `<line x1="${10 + i * px}" y1="60" x2="${10 + i * px}" y2="${i % 5 === 0 ? 40 : 48}" stroke="#15233f" stroke-width="2"/><text x="${10 + i * px}" y="78" font-size="13" text-anchor="middle" fill="#15233f">${i}</text>`).join('');
      const svg = `<svg viewBox="0 0 380 90" class="ruler"><rect x="10" y="8" width="${n * px}" height="22" rx="6" fill="#ffd34d" stroke="#15233f" stroke-width="3"/><polygon points="${10 + n * px},8 ${10 + n * px + 14},19 ${10 + n * px},30" fill="#e5b07a" stroke="#15233f" stroke-width="3"/><rect x="2" y="36" width="376" height="46" rx="6" fill="#f3f7fa" stroke="#9fb3c4"/>${ticks}</svg>`;
      ui.stage.append(svgEl(svg, 'ruler-box'));
      const slot = numTask(ui, n, `Der Stift ist ${n} cm lang.`, say(`Der Stift ist ${n} Zentimeter lang.`));
      ui.stage.append(h('p', { class: 'expr small' }, slot, ' cm'));
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    sachaufgabe(t, ui) {
      const [, i, x, y] = t.id.split(':'); const [op, tpl] = D.SACH[+i]; const a = +x, b = +y; const ans = op === '+' ? a + b : a - b;
      const txt = sub(tpl.replace('{a}', a).replace('{b}', b));
      ui.prompt(D.PROMPTS4['p2:sach'], 'p2:sach');
      ui.stage.append(textEl(txt, { cls: 'sentence left', help: helpWord(ui) }), iconBtn('Vorlesen', '🔊', () => { ui.helps++; Voice.say([say(txt)]); }, 'mini-speak'));
      const slot = numTask(ui, ans, `${a} ${op} ${b} = ${ans}`, mathSay({ a, b, word: op === '+' ? 'plus' : 'minus' }, ans));
      ui.stage.append(h('p', { class: 'expr small' }, 'Antwort: ', slot));
      ui.fastMs = 30000;
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    geld(t, ui) {
      const cs = geldParts(t.id); const s = cs.reduce((a, b) => a + b, 0); const euro = s >= 100 && s % 100 === 0;
      ui.prompt(euro ? 'Wie viel Euro sind das?' : 'Wie viel Cent sind das?', 'p2:geld');
      ui.stage.append(h('div', { class: 'coins' }, cs.map(coinEl)));
      if (!euro && s > 100) { // gemischt: in Cent fragen
      }
      const ans = euro ? s / 100 : s;
      const slot = numTask(ui, ans, geldText(t.id), say(`Das sind ${geldText(t.id)}.`));
      ui.stage.append(h('p', { class: 'expr small' }, slot, euro ? ' €' : ' ct'));
      if (!euro && s > 100) ui.stage.append(h('p', { class: 'note' }, '1 € = 100 ct'));
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    nachbar(t, ui) {
      const [, x, d] = t.id.split(':'); const n = +x; const ans = d === 'v' ? n - 1 : n + 1; const k = d === 'v' ? 'vor' : 'nach';
      ui.prompt(D.PROMPTS4['p2:' + k], 'p2:' + k);
      const slot = numTask(ui, ans, d === 'v' ? `${ans} kommt vor ${n}` : `${ans} kommt nach ${n}`, say(d === 'v' ? `${ans} kommt vor ${n}` : `${ans} kommt nach ${n}`));
      ui.stage.append(h('p', { class: 'expr' }, d === 'v' ? slot : String(n), '  ', d === 'v' ? String(n) : slot));
      ui.audio((full) => (full ? [ui.promptPart, { ids: ['num:' + n], text: String(n) }] : [{ ids: ['num:' + n], text: String(n) }]));
    },
    zahlenstrahl(t, ui) {
      const n = +t.id.split(':')[1];
      ui.prompt(D.PROMPTS4['p2:zs'], 'p2:zs');
      const X = (v) => 15 + v * 3.5;
      const ticks = [...Array(21)].map((_, i) => `<line x1="${X(i * 5)}" y1="40" x2="${X(i * 5)}" y2="${i % 2 === 0 ? 58 : 52}" stroke="#15233f" stroke-width="${i % 2 === 0 ? 3 : 2}"/>${i % 2 === 0 && (i === 0 || i === 10 || i === 20) ? `<text x="${X(i * 5)}" y="76" font-size="14" text-anchor="middle" fill="#15233f">${i * 5}</text>` : ''}`).join('');
      const svg = `<svg viewBox="0 0 380 82" class="numline"><line x1="${X(0)}" y1="46" x2="${X(100)}" y2="46" stroke="#15233f" stroke-width="3"/>${ticks}<polygon points="${X(n)},38 ${X(n) - 8},14 ${X(n) + 8},14" fill="#df362a"/></svg>`;
      ui.stage.append(svgEl(svg, 'numline-box'));
      ui.choices(numOpts(n, [n + 5, n - 5, n + 10, n - 10]).map((v) => ({ label: String(v), value: v })), (v) => v === n, 'nums');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, `Der Pfeil zeigt auf ${n}.`), h('p', { class: 'strat' }, 'Jeder Strich ist 5 weiter. Die langen Striche sind die Zehner.')) });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    stellenwert(t, ui) {
      const n = +t.id.split(':')[1]; const z = Math.floor(n / 10), e = n % 10;
      ui.prompt(D.PROMPTS4['p2:hz'], 'p2:hz');
      ui.stage.append(h('div', { class: 'tens' }, [...Array(z)].map(() => h('span', { class: 'ten-bar' })), h('span', { class: 'ones' }, [...Array(e)].map(() => h('span', { class: 'one-dot' })))));
      const slot = numTask(ui, n, `${z} Zehner und ${e} Einer = ${n}`, say(`${z} Zehner und ${e} Einer sind ${n}`));
      ui.stage.append(h('p', { class: 'expr small' }, slot));
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    silbenzahl(t, ui) {
      const i = +t.id.split(':')[1]; const W = D.WORDS[i]; const n = W.w.split('-').length;
      ui.prompt(D.PROMPTS4['p2:sz'], 'p2:sz');
      ui.stage.append(h('div', { class: 'pic small' }, W.e), h('p', { class: 'word-plain' }, plain(W.w)));
      ui.choices([1, 2, 3, 4].map((v) => ({ label: '👏'.repeat(v), value: v })), (v) => v === n, 'nums');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, textEl(W.w, { cls: 'word small' }), h('p', { class: 'strat' }, `${n} ${n === 1 ? 'Silbe' : 'Silben'}`)), voice: [{ id: 'w:' + i, text: plain(W.w) }] });
      ui.audio((full) => (full ? [ui.promptPart, { id: 'w:' + i, text: plain(W.w) }] : [{ id: 'w:' + i, text: plain(W.w) }]));
    },
    abc(t, ui) {
      const x = t.id.split(':')[1]; const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; const i = A.indexOf(x); const right = A[i + 1];
      ui.prompt(D.PROMPTS4['p2:abc'], 'p2:abc');
      ui.stage.append(h('p', { class: 'expr' }, `${A[i - 1] || ''} ${x} `, h('span', { class: 'slot' }, '?')));
      const opts = shuffle([right, A[(i + 3) % 26], A[Math.max(0, i - 1)] === x ? A[(i + 5) % 26] : A[Math.max(0, i - 1)]]).filter((v, k, a) => a.indexOf(v) === k);
      ui.choices(opts.map((v) => ({ el: h('span', { class: 'let' }, v), value: v })), (v) => v === right, 'letters');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, A.slice(Math.max(0, i - 2), i + 3).split('').join(' '))) });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    reim(t, ui) {
      const i = +t.id.split(':')[1]; const [w, r] = D.RHYMES[i];
      const others = shuffle(D.RHYMES.filter((x, k) => k !== i).map((x) => x[1])).slice(0, 2);
      ui.prompt(D.PROMPTS4['p2:reim'], 'p2:reim');
      ui.stage.append(h('p', { class: 'word-plain' }, w));
      ui.choices(shuffle([r, ...others]).map((v) => ({ label: v, value: v })), (v) => v === r, 'words');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, `${w} – ${r}`)), voice: [] });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    artikel(t, ui) {
      const N = D.NOUNS[+t.id.split(':')[1]];
      ui.prompt(D.PROMPTS4['p2:art'], 'p2:art');
      ui.stage.append(h('div', { class: 'pic small' }, N.e), h('p', { class: 'word-plain' }, '___ ' + N.s));
      ui.choices(['der', 'die', 'das'].map((v) => ({ label: v, value: v })), (v) => v === N.a, 'words');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, `${N.a} ${N.s}`)), voice: [] });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    mehrzahl(t, ui) {
      const N = D.NOUNS[+t.id.split(':')[1]];
      ui.prompt(D.PROMPTS4['p2:mz'], 'p2:mz');
      ui.stage.append(h('div', { class: 'pic small' }, N.e), h('p', { class: 'word-plain' }, `${N.a === 'die' ? 'eine' : 'ein'} ${N.s} – viele …`));
      ui.choices(shuffle([N.p, ...plurals(N)]).map((v) => ({ label: v, value: v })), (v) => v === N.p, 'words');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, `${N.s} – ${N.p}`)), voice: [] });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    wortart(t, ui) {
      const [, ty, x] = t.id.split(':'); const w = wortOf(ty, +x);
      const NM = { N: 'Namenwort (Nomen)', V: 'Tunwort (Verb)', A: 'Wiewort (Adjektiv)' };
      ui.prompt(D.PROMPTS4['p2:wa'], 'p2:wa');
      ui.stage.append(h('p', { class: 'word-plain' }, w));
      ui.choices(['N', 'V', 'A'].map((v) => ({ label: NM[v], value: v })), (v) => v === ty, 'words');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, `${w}: ${NM[ty]}`), h('p', { class: 'strat' }, ty === 'N' ? 'Man kann der, die oder das davorsetzen.' : ty === 'V' ? 'Das kann man tun: ich ' + w.replace(/en$/, 'e') + '.' : 'Es sagt, wie etwas ist.')) });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    grossklein2(t, ui) {
      const [, ty, x] = t.id.split(':'); const w = wortOf(ty, +x); const big = ty === 'N';
      ui.prompt(D.PROMPTS4['p2:gk'], 'p2:gk');
      ui.stage.append(h('p', { class: 'word-plain' }, w.toLowerCase()));
      if (!S.test) tipButton(ui, () => ({ k: 'nomen', tip: D.TRICKS.nomen.d }));
      ui.choices([{ label: '🔠 Groß', value: true }, { label: '🔡 Klein', value: false }], (v) => v === big, 'two');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, big ? `${D.NOUNS[+x].a} ${w}` : w), h('p', { class: 'strat' }, big ? 'Namenwörter schreibt man groß.' : 'Tunwörter und Wiewörter schreibt man klein.')) });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    satzzeichen(t, ui) {
      const [s, p] = D.PUNCT[+t.id.split(':')[1]];
      ui.prompt(D.PROMPTS4['p2:zz'], 'p2:zz');
      ui.stage.append(h('p', { class: 'sentence-plain' }, s + ' ', h('span', { class: 'slot' }, '?')));
      ui.choices(['.', '?', '!'].map((v) => ({ label: v, value: v })), (v) => v === p, 'nums');
      ui.feedback = () => ({ detail: h('div', { class: 'fb-detail' }, h('p', { class: 'eq-big' }, s + p), h('p', { class: 'strat' }, p === '?' ? 'Eine Frage bekommt ein Fragezeichen.' : p === '!' ? 'Ein Ausruf oder Befehl bekommt ein Ausrufezeichen.' : 'Ein Erzählsatz bekommt einen Punkt.')) });
      ui.audio((full) => (full ? [ui.promptPart] : null));
    },
    diktat(t, ui) {
      const i = +t.id.split(':')[1]; const W = D.WORDS[i]; const word = plain(W.w); const letters = [...word];
      const aud = { id: 'w:' + i, text: word };
      ui.prompt(D.PROMPTS4['p2:dik'], 'p2:dik');
      const slots = letters.map(() => h('span', { class: 'b-slot let-slot' }));
      ui.stage.append(h('div', { class: 'pic small' }, W.e), iconBtn('Nochmal hören', '🔊', () => Voice.say([aud]), 'mini-speak'), h('div', { class: 'b-slots' }, slots));
      const extra = shuffle('aeinrstlmo'.split('').filter((c) => !word.toLowerCase().includes(c))).slice(0, 2);
      const pool = shuffle(letters.map((c, k) => ({ c, k })).concat(extra.map((c) => ({ c, k: -1 }))));
      let pos = 0, mistake = false;
      const tiles = pool.map((o) => {
        const b = h('button', { class: 'tile ans syl-tile', onclick: () => {
          if (S.locked) return;
          if (o.c === letters[pos]) { SFX.tap(); b.disabled = true; b.classList.add('used'); slots[pos].textContent = o.c; slots[pos].classList.add('filled'); pos++; if (pos === letters.length) ui.done(!mistake); }
          else { mistake = true; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
        } }, o.c);
        return b;
      });
      ui.answers.className = 'answers letters'; ui.answers.replaceChildren(...tiles);
      ui.feedback = (ok) => ({ title: ok ? null : 'Geschafft! Schau dir das Wort nochmal an.', detail: ok ? null : h('div', { class: 'fb-detail' }, textEl(W.w, { cls: 'word small' })), voice: [aud] });
      ui.fastMs = 20000;
      ui.audio((full) => (full ? [ui.promptPart, aud] : [aud]), true);
    },
    diktatstift(t, ui) {
      const i = +t.id.split(':')[1]; const W = D.WORDS[i]; const aud = { id: 'w:' + i, text: plain(W.w) };
      const model = textEl(W.w, { cls: 'word write-model' }); model.hidden = true;
      const pad = writePad({ height: 190 });
      ui.prompt(D.PROMPTS4['p2:diks'], 'p2:diks');
      ui.stage.append(h('div', { class: 'pic small' }, W.e), iconBtn('Nochmal hören', '🔊', () => Voice.say([aud]), 'mini-speak'), model, pad.el);
      ui.answers.className = 'answers two';
      ui.answers.replaceChildren(
        h('button', { class: 'tile ans', onclick: () => pad.clear() }, '↺ Löschen'),
        h('button', { class: 'tile go', id: 'write-done', onclick: () => { if (!pad.empty) compareStep(ui, model, aud); } }, '✓ Fertig'));
      ui.feedback = (ok) => ({ title: ok ? 'Selbst geschrieben! Stark!' : 'Gut, dass du genau vergleichst. Das üben wir nochmal.', voice: [aud] });
      ui.fastMs = 60000;
      ui.audio((full) => (full ? [ui.promptPart, aud] : [aud]), true);
    }
  });

  // ---------- Lese-Training: täglich 5 Minuten (Silbenteppich, Blitzwörter, wiederholtes Lesen) ----------
  TOPICS.push({ k: 'hw', pool: 'read', n: 'Blitzwörter (häufigste Wörter)', gate: () => stageUnlocked('s'), ids: D.HFW.map((w, i) => 'hw:' + i), kind: 'blitzhw' });
  TOPIC_BY.hw = TOPICS[TOPICS.length - 1];
  const hwSim = (w) => { const L = w.length; const c = D.HFW.filter((x) => x !== w && x.toLowerCase() !== w.toLowerCase()); const near = c.filter((x) => x[0].toLowerCase() === w[0].toLowerCase() || Math.abs(x.length - L) <= 1); return shuffle(near.length >= 2 ? near : c).slice(0, 2); };
  TASKS.blitzhw = function (t, ui) {
    const w = D.HFW[+t.id.split(':')[1]];
    ui.prompt(D.PROMPTS4['p2:hw'], 'p2:hw');
    const card = h('p', { class: 'word-plain flash' }, w);
    ui.stage.append(card);
    const ms = Math.max(700, Math.min(2500, state.blitzMs || 1500));
    ui.answers.replaceChildren(h('button', { class: 'tile go', id: 'flash-go', onclick: () => {
      card.classList.add('gone');
      ui.choices(shuffle([w, ...hwSim(w)]).map((v) => ({ label: v, value: v })), (v) => v === w, 'words');
    } }, 'Ich hab es gelesen ✓'));
    setTimeout(() => { if (document.body.contains(card) && !card.classList.contains('gone')) { const b = document.getElementById('flash-go'); if (b) b.click(); } }, ms);
    ui.feedback = (ok) => ({ detail: ok ? null : h('div', { class: 'fb-detail' }, h('p', { class: 'word-plain' }, w)) });
    ui.fastMs = 4000;
    ui.audio((full) => (full ? [ui.promptPart] : null));
  };

  function teppichSyls() {
    const known = D.CONSONANTS.filter(knownLetter); const vow = D.VOWELS.filter(knownLetter).map((v) => v.toLowerCase());
    const C = known.length >= 3 ? known : ['M', 'L', 'S', 'R', 'N', 'T', 'H', 'F'];
    const V = vow.length >= 2 ? vow : ['a', 'o', 'i', 'e', 'u'];
    const out = []; for (let i = 0; i < 36; i++) out.push(pick(C) + pick(V));
    return out;
  }
  function wordsOf(t) { return t.split(/\s+/).filter((w) => /[A-Za-zÄÖÜäöüß]/.test(w)).length; }
  // Lesetext-Stufen: automatisch nach Tempo (2. Lesen) und Verständnisfrage, oder fest im Eltern-Bereich.
  const LESE_UP = 55, LESE_JUMP = 90, LESE_DOWN = 20, LESE_MAX = 220; // Wörter pro Minute
  function leseLvl() {
    const s = state.settings.leseLvl; const n = D.LSTUFEN.length;
    if (s && s !== 'auto') return Math.min(n, Math.max(1, +s));
    return Math.min(n, Math.max(1, (state.lese && state.lese.lvl) || 1));
  }
  const leseClipId = (lvl, i) => (lvl === 1 ? 'lt:' : 'lt' + lvl + ':') + i;
  function leseAdapt(res) {
    if (state.settings.leseLvl && state.settings.leseLvl !== 'auto') return null;
    const L = state.lese; const cur = leseLvl(); const n = D.LSTUFEN.length; const w2 = res.wpm2 || 0;
    const good = res.frage === true && w2 >= LESE_UP && w2 <= LESE_MAX;
    const bad = res.frage === false || (res.wpm1 && res.wpm1 < LESE_DOWN);
    L.up = good ? (L.up || 0) + 1 : 0; L.down = bad ? (L.down || 0) + 1 : 0;
    let to = cur;
    if (good && (w2 >= LESE_JUMP || L.up >= 2) && cur < n) to = cur + 1;
    else if (L.down >= 2 && cur > 1) to = cur - 1;
    if (to === cur) { L.lvl = cur; return null; }
    L.lvl = to; L.up = 0; L.down = 0; return to > cur ? 'up' : 'down';
  }
  function showLeseTraining(opts) {
    opts = opts || {};
    state.lese = state.lese || { log: [] };
    const L = state.lese; const today = dayNum();
    const res = { d: dayKey(today) };
    const lvl = leseLvl(); const TX = D.LSTUFEN[lvl - 1].texts;
    const textIdx = Math.floor(today / 2) % TX.length; const T = TX[textIdx]; res.lvl = lvl;
    const last = L.log[L.log.length - 1];
    const scr = h('main', { class: 'screen lese' });
    mount(scr, 'pool');
    const top = h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => { if (res.teppich != null) saveLog(true); showHome(); }), h('div', { class: 'lese-steps' }, ['Silben', 'Blitzwörter', 'Text'].map((n, i) => h('span', { class: 'lstep', 'data-i': i }, n))));
    const body = h('div', { class: 'lese-body' });
    scr.append(top, body);
    const step = (i) => scr.querySelectorAll('.lstep').forEach((e) => e.classList.toggle('on', +e.dataset.i === i));
    function saveLog(partial) { res.partial = !!partial; L.log.push(res); L.log = L.log.slice(-60); save(); leseReport(res, T); }

    // 1) Silbenteppich
    function teppich() {
      step(0);
      const syls = teppichSyls(); let n = 0, running = false, timer = null;
      const cells = syls.map((s, i) => h('button', { class: 'tep', onclick: () => { if (!running) return; if (i === n) { cells[i].classList.add('done'); n++; if (n === syls.length) stop(); } } }, h('span', { class: 'sy ' + (i % 2 ? 's1' : 's0') }, s)));
      const bar = h('div', { class: 'tbar' }, h('div', { class: 'tfill' }));
      const info = h('p', { class: 'note' }, last && last.teppich != null ? `Letztes Mal: ${last.teppich} Silben. Schaffst du mehr?` : 'Lies laut und tippe jede Silbe an, wenn du sie gelesen hast.');
      const btn = h('button', { class: 'tile go big', id: 'tep-start', onclick: () => { btn.hidden = true; running = true; const t0 = Date.now(); bar.firstChild.style.transition = 'width 30s linear'; requestAnimationFrame(() => { bar.firstChild.style.width = '100%'; }); timer = setTimeout(stop, 30000); SFX.tap(); } }, '▶ Los! 30 Sekunden');
      function stop() {
        if (!running) return; running = false; clearTimeout(timer); res.teppich = n; SFX.ok();
        const better = last && last.teppich != null && n > last.teppich;
        body.replaceChildren(h('div', { class: 'lese-result' }, svgEl(svgMax({ mood: 'happy' }), 'quit-max'), h('p', { class: 'h-display' }, `${n} Silben!`), h('p', { class: 'note' }, better ? `Mehr als letztes Mal (${last.teppich})! 🚀` : 'Super gelesen!'), h('button', { class: 'tile go big', id: 'lese-next', onclick: blitz }, 'Weiter →')));
      }
      body.replaceChildren(h('h2', { class: 'lese-h' }, '🧶 Silbenteppich'), info, bar, h('div', { class: 'teppich' }, cells), btn);
      Voice.say([{ id: 'p:lese1', text: 'Silbenteppich! Lies laut und tippe jede Silbe an.' }, { id: 'p:zeit', text: 'Schaffst du es, bevor die Zeit um ist?' }]);
    }
    // 2) Blitzwörter: 8 Wörter, fällige zuerst
    function blitz() {
      step(1);
      const ids = D.HFW.map((w, i) => 'hw:' + i);
      const due = ids.filter((id) => box(id) > 0 && state.items[id].d <= today); const neu = ids.filter((id) => box(id) === 0);
      const list = shuffle(due).slice(0, 5).concat(neu.slice(0, 8)).slice(0, 8);
      let k = 0, right = 0;
      function one() {
        if (k >= list.length) { res.blitz = `${right}/${list.length}`; return text1(); }
        const id = list[k]; const w = D.HFW[+id.split(':')[1]];
        const card = h('p', { class: 'word-plain flash' }, w);
        const ans = h('div', { class: 'answers words' });
        body.replaceChildren(h('h2', { class: 'lese-h' }, `⚡ Blitzwort ${k + 1} von ${list.length}`), card, ans);
        const ms = Math.max(700, Math.min(2500, state.blitzMs || 1500));
        setTimeout(() => {
          card.classList.add('gone');
          shuffle([w, ...hwSim(w)]).forEach((v) => ans.append(h('button', { class: 'tile ans', onclick: () => {
            const ok = v === w; grade(id, ok); if (ok) { right++; SFX.ok(); } else { SFX.oops(); card.classList.remove('gone'); }
            ans.querySelectorAll('button').forEach((b) => { b.disabled = true; if (b.textContent === w) b.classList.add('right'); });
            setTimeout(() => { k++; one(); }, ok ? 500 : 1500);
          } }, v)));
        }, ms);
      }
      one();
    }
    // 3) Wiederholtes Lesen: zuhören, selbst lesen, nochmal schneller, Frage
    function text1() {
      step(2);
      const tx = textEl(T.t, { cls: 'sentence left lese-text lv' + lvl });
      body.replaceChildren(h('h2', { class: 'lese-h' }, '📖 ' + T.n), h('p', { class: 'lese-lvl' }, '⭐'.repeat(lvl) + ' Stufe ' + lvl), h('p', { class: 'note' }, 'Hör erst zu und lies leise mit.'), tx,
        h('button', { class: 'tile go big', id: 'lt-listen', onclick: async (e) => { e.target.disabled = true; await Voice.say([{ id: leseClipId(lvl, textIdx), text: plain(T.t), force: true }]); readTimed(1); } }, '🔊 Zuhören'),
        h('button', { class: 'link-btn', onclick: () => readTimed(1) }, 'Überspringen'));
    }
    function readTimed(round) {
      const tx = textEl(T.t, { cls: 'sentence left lese-text lv' + lvl }); let t0 = 0;
      const go = h('button', { class: 'tile go big', id: 'lt-go', onclick: () => { t0 = Date.now(); go.hidden = true; done.hidden = false; tx.classList.add('active'); SFX.tap(); } }, round === 1 ? '▶ Start: Ich lese laut' : '▶ Nochmal, noch flüssiger!');
      const done = h('button', { class: 'tile go big', id: 'lt-done', hidden: true, onclick: () => {
        const sec = Math.max(1, (Date.now() - t0) / 1000); const wpm = Math.round(wordsOf(T.t) / sec * 60);
        res['t' + round] = Math.round(sec); res['wpm' + round] = wpm; SFX.ok();
        if (round === 1) {
          body.replaceChildren(h('div', { class: 'lese-result' }, h('p', { class: 'h-display' }, `${Math.round(sec)} Sekunden`), h('p', { class: 'note' }, 'Jetzt liest du es nochmal. Diesmal geht es schon leichter!'), h('button', { class: 'tile go big', id: 'lese-next', onclick: () => readTimed(2) }, 'Weiter →')));
        } else {
          const faster = res.t2 < res.t1;
          body.replaceChildren(h('div', { class: 'lese-result' }, svgEl(svgMax({ mood: 'happy' }), 'quit-max'), h('p', { class: 'h-display' }, faster ? `${res.t1 - res.t2} Sekunden schneller! 🚀` : 'Toll gelesen!'), h('p', { class: 'note' }, `1. Mal: ${res.t1} s · 2. Mal: ${res.t2} s`), h('button', { class: 'tile go big', id: 'lese-next', onclick: question }, 'Zur Frage →')));
        }
      } }, '✓ Fertig gelesen');
      body.replaceChildren(h('h2', { class: 'lese-h' }, '📖 ' + T.n + (round === 2 ? ' (2. Mal)' : '')), tx, go, done);
    }
    function question() {
      const ans = h('div', { class: 'answers words' });
      body.replaceChildren(h('h2', { class: 'lese-h' }, '❓ ' + T.q), h('details', { class: 'lese-peek' }, h('summary', null, 'Text nochmal ansehen'), textEl(T.t, { cls: 'sentence left' })), ans);
      shuffle([T.a, ...T.w]).forEach((v) => ans.append(h('button', { class: 'tile ans', onclick: () => {
        const ok = v === T.a; res.frage = ok; ok ? SFX.ok() : SFX.oops();
        ans.querySelectorAll('button').forEach((b) => { b.disabled = true; if (b.textContent === T.a) b.classList.add('right'); });
        setTimeout(finish, ok ? 700 : 1800);
      } }, v)));
    }
    function finish() {
      const ch = leseAdapt(res); if (ch) res.lvlNew = state.lese.lvl;
      saveLog(false);
      const gift = Math.random() < 0.5 ? (() => { const un = D.STICKERS.filter((s) => !state.stickers.owned.includes(s.id)); if (!un.length) return null; const g = pick(un); state.stickers.owned.push(g.id); save(); return g; })() : null;
      body.replaceChildren(h('div', { class: 'lese-result' }, svgEl(svgMax({ mood: 'happy' }), 'quit-max'), h('p', { class: 'h-display' }, 'Lese-Training geschafft! 🎉'),
        h('p', { class: 'note' }, `Silben: ${res.teppich} · Blitzwörter: ${res.blitz} · Text: ${res.wpm2 || res.wpm1} Wörter pro Minute`),
        ch === 'up' ? h('p', { class: 'note lvl-up' }, `🚀 Neue Lese-Stufe ${state.lese.lvl}! Die nächsten Texte werden länger.`) : null,
        gift ? h('p', { class: 'note' }, `Geschenk für Max: ${gift.e} ${gift.n}`) : null,
        h('button', { class: 'tile', id: 'lese-mama', onclick: (e) => { res.mama = true; L.log[L.log.length - 1].mama = true; save(); e.target.textContent = 'Eingetragen ✓'; e.target.disabled = true; sendReport(`${state.name || 'Diana'}: Lesen mit Mama ✓`, 'Heute 10 Minuten zusammen mit Mama gelesen.'); } }, '👩 Mama: Wir haben heute 10 Min. zusammen gelesen'),
        h('button', { class: 'tile go big', id: 'lese-home', onclick: () => (opts.then ? opts.then() : showHome()) }, opts.then ? 'Weiter: kleine Runde ▶' : 'Fertig')));
      Voice.say([P('p:fertig')]);
    }
    teppich();
  }
  function leseReport(res, T) {
    const L = state.lese.log; const prev = L.slice(0, -1).reverse().find((x) => x.teppich != null);
    const lines = [`Silbenteppich: ${res.teppich ?? '–'} Silben in 30 s${prev ? ` (davor ${prev.teppich})` : ''}`];
    if (res.blitz) lines.push(`Blitzwörter: ${res.blitz} richtig`);
    if (res.t1) lines.push(`Text „${T.n}“ (Stufe ${res.lvl || 1}): 1. Mal ${res.t1} s (${res.wpm1} W/min)${res.t2 ? `, 2. Mal ${res.t2} s (${res.wpm2} W/min)` : ''}`);
    if (res.frage != null) lines.push(`Verständnisfrage: ${res.frage ? 'richtig' : 'falsch'}`);
    if (res.lvlNew) lines.push(res.lvlNew > (res.lvl || 1) ? `⬆️ Neue Lese-Stufe: ${res.lvlNew}` : `⬇️ Lese-Stufe zurück auf ${res.lvlNew} (Text war zu schwer)`);
    if (res.partial) lines.push('(vorzeitig beendet)');
    const days = new Set(L.map((x) => x.d)).size; lines.push(`Lese-Training an ${days} Tagen`);
    sendReport(`${state.name || 'Diana'}: Lese-Training 📖`, lines.join('\n'), 2);
  }

  // ---------- Ausprobieren: jede Aufgabenart einzeln starten ----------
  const TRY_KINDS = [
    ['⛸️ Rechnen', [['zeigen', 'Bild-Rechnen (Zwanzigerfeld)'], ['tippen', 'Ausrechnen mit Tipp'], ['fehlt', 'Welche Zahl fehlt?'], ['pablo', 'Pablo: Stimmt das oder Schummel?'], ['umkehr', 'Minus mit der Plus-Aufgabe'], ['maxfehler', 'Max hat sich verrechnet (erklären)'], ['blitz', 'Blitz-Aufgabe'], ['blitzblick', 'Blitzblick: Punkte erkennen'], ['geschichte', 'Rechengeschichte'], ['pfoten', 'Pfoten zählen (Mal)']]],
    ['🏊 Lesen & Schreiben', [['grossklein', 'Großen/kleinen Buchstaben finden'], ['laut', 'Welcher Laut ist das?'], ['anlaut', 'Schwierige Laute (ei, eu, au …)'], ['silbehoeren', 'Silbe hören'], ['silbelesen', 'Silbe lesen'], ['wortbild', 'Wort lesen, Bild wählen'], ['hoeren', 'Wort hören, Wort wählen'], ['bauen', 'Wort aus Silben bauen'], ['vorlesen', 'Max ein Wort vorlesen'], ['blitzwort', 'Blitzlesen'], ['abschreiben', 'Abschreiben mit Stift'], ['merkschreiben', 'Merken und aufschreiben'], ['satzlesen', 'Satz vorlesen'], ['quatsch', 'Stimmt das oder Quatsch?'], ['luecke', 'Welches Wort fehlt?']]],
    ['📐 Mathe 2. Klasse', [['form', 'Formen'], ['vergleich', 'Größer, kleiner, gleich'], ['doppel', 'Verdoppeln / Halbieren'], ['uhr', 'Uhrzeit'], ['laenge', 'Längen (cm)'], ['sachaufgabe', 'Sachaufgabe selbst lesen'], ['geld', 'Geld'], ['nachbar', 'Nachbarzahlen'], ['zahlenstrahl', 'Zahlenstrahl'], ['stellenwert', 'Zehner und Einer'], ['geteilt', 'Geteilt']]],
    ['📝 Deutsch 2. Klasse', [['blitzhw', 'Blitzwörter (häufigste Wörter)'], ['diktat', 'Diktat mit Buchstaben'], ['diktatstift', 'Diktat mit Stift'], ['silbenzahl', 'Silben zählen'], ['abc', 'ABC'], ['reim', 'Reime'], ['artikel', 'Der, die, das'], ['mehrzahl', 'Einzahl / Mehrzahl'], ['wortart', 'Wortarten'], ['grossklein2', 'Groß oder klein?'], ['satzzeichen', 'Satzzeichen']]],
    ['🗣️ Russisch', [['ruhoeren', 'Hören und Bild wählen'], ['rusagen', 'Auf Russisch sagen'], ['rujanein', 'Stimmt das? (да / нет)'], ['runach', 'Frage nachsprechen'], ['ruantwort', 'Auf Russisch antworten']]]
  ];
  function tryItem(kind) {
    if (kind === 'geteilt') return pick(TOPICS.find((T) => T.k === 'dv').ids);
    const TT = TOPICS.find((T) => T.kind === kind || (T.k === 'dik' && kind.startsWith('diktat')));
    if (TT) return pick(TT.ids);
    const pm = MSK.filter((sk) => sk.track === 'pm').flatMap((sk) => sk.ids);
    const small = pm.filter((id) => { const I = mathInfo(id); return I.c <= 20 && I.a <= 20; });
    const mal = MSK.filter((sk) => sk.track === 'mal').flatMap((sk) => sk.ids);
    const letters = D.LETTERS.map((L) => L.g);
    const W = D.WORDS.map((w, i) => i), T = D.SENTENCES.map((x, i) => i);
    const sy = () => { const C = D.CONSONANTS, V = D.VOWELS; return 's:' + pick(C) + pick(V).toLowerCase(); };
    switch (kind) {
      case 'zeigen': case 'geschichte': return pick(small);
      case 'blitzblick': return pick(small.filter((id) => id.startsWith('ad:')));
      case 'umkehr': return pick(pm.filter((id) => id.startsWith('sb:')));
      case 'pfoten': return pick(mal);
      case 'tippen': case 'fehlt': case 'pablo': case 'blitz': case 'maxfehler': return pick(pm);
      case 'grossklein': return 'l:' + pick(letters.filter((g) => g !== 'ß'));
      case 'laut': return 'l:' + pick(letters.filter((g) => Voice.has('laut:' + g)).concat(['M']));
      case 'anlaut': return 'l:' + pick(letters.filter((g) => LBY[g].in || ['Ei', 'Eu', 'Au', 'Äu', 'Ie'].includes(g)));
      case 'abschreiben': return Math.random() < 0.5 ? 'l:' + pick(letters) : 'w:' + pick(W);
      case 'silbehoeren': case 'silbelesen': return sy();
      case 'bauen': return 'w:' + pick(W.filter((i) => D.WORDS[i].w.includes('-')));
      case 'wortbild': case 'hoeren': case 'vorlesen': case 'blitzwort': case 'merkschreiben': return 'w:' + pick(W);
      case 'quatsch': return 't:' + pick(T.filter((i) => D.SENTENCES[i].q !== undefined));
      case 'luecke': return 't:' + pick(T.filter((i) => D.SENTENCES[i].t.includes('[')));
      case 'satzlesen': return 't:' + pick(T);
      case 'rujanein': return 'ru:' + pick(D.RU_WORDS.map((x, i) => i).filter((i) => !D.RU_WORDS[i].g));
      case 'ruhoeren': case 'rusagen': return 'ru:' + rnd(D.RU_WORDS.length);
      case 'runach': case 'ruantwort': return 'rf:' + rnd(D.RU_PHRASES.length);
    }
    return null;
  }
  function tryTask(kind) {
    const id = tryItem(kind); if (!id) return;
    const pool = poolOf(id);
    S = { world: pool, pools: [pool], N: 1, queue: [], done: 0, right: 0, used: new Set([id]), wrongSet: new Set(), newWrongStreak: 0, danced: true, seenKind: {}, secured: [], learned: [], retries: 0, rot: 1, stars0: skillStars(), unl0: unlockSnap(), locked: false, intro: null, newIds: new Set(), tryOut: true };
    renderTask({ id, kind: kind === 'geteilt' ? 'tippen' : kind, isNew: box(id) === 0, retry: false });
  }
  function pTry(body) {
    const on = TEST();
    body.append(
      h('section', { class: 'p-card' + (on ? ' test-on' : '') }, h('h2', null, '🧪 Test-Modus'),
        h('label', { class: 'p-toggle' }, h('input', { type: 'checkbox', id: 'set-test', checked: on ? true : null, onchange: (e) => { state.settings.testAll = e.target.checked; save(); showParents('try'); } }), 'Alles freischalten'),
        h('p', { class: 'note' }, 'Schaltet alle Rechen-Stufen frei (auch Mal), alle Lese-Stufen, Russisch-Fragen, alle Kapitel, Briefe, Sticker und Tricks. Runden gehen ohne Tageslimit, Tests jederzeit. In den Welten kommen Aufgaben aus allen Stufen gemischt.'),
        h('p', { class: 'note' }, 'Wichtig: Was du hier übst, zählt als Lernstand auf diesem Gerät. Bevor deine Schwester startet: Test-Modus aus und unter „Sicherung“ den Lernstand löschen.')),
      h('section', { class: 'p-card' }, h('h2', null, 'Einzelne Aufgabe ausprobieren'),
        h('p', { class: 'note' }, 'Tippe auf eine Aufgabenart. Du spielst eine Aufgabe davon und landest danach wieder hier.'),
        ...TRY_KINDS.map(([n, kinds]) => h('div', { class: 'try-sec' }, h('h3', null, n), h('div', { class: 'try-grid' }, kinds.map(([k, label]) => h('button', { class: 'p-btn try-b', 'data-kind': k, onclick: () => tryTask(k) }, label)))))),
      h('section', { class: 'p-card' }, h('h2', null, 'Mehr zum Ausprobieren'),
        h('div', { class: 'try-grid' },
          h('button', { class: 'p-btn try-b', id: 'try-test', onclick: () => { if (!on) { state.settings.testAll = true; save(); } startTest(); } }, '🏅 Test starten'),
          h('button', { class: 'p-btn try-b', id: 'try-tour', onclick: () => { showHome(); setTimeout(() => showTour(true), 400); } }, '👋 Einführung zeigen'),
          h('button', { class: 'p-btn try-b', id: 'try-lese', onclick: () => showLeseTraining() }, '📖 Lese-Training'),
          h('button', { class: 'p-btn try-b', id: 'try-dance', onclick: () => { S = null; showDance(); } }, '💃 Tanz-Pause'),
          h('button', { class: 'p-btn try-b', onclick: () => showStoryList() }, '📖 Geschichte'),
          h('button', { class: 'p-btn try-b', onclick: () => showPosts() }, '📮 Post von Kevin'),
          h('button', { class: 'p-btn try-b', onclick: () => showAlbum('max') }, '🎀 Anziehen'),
          h('button', { class: 'p-btn try-b', onclick: () => showTricks() }, '💡 Trickbuch'),
          h('button', { class: 'p-btn try-b', onclick: () => showMap() }, '⭐ Mein Weg'))));
  }
  function pStand(body) {
    const today = dayNum();
    const week = [...Array(7)].map((_, i) => { const n = today - 6 + i; const d = state.days[dayKey(n)] || { s: 0, t: 0, r: 0 }; return { n, d }; });
    const maxT = Math.max(12, ...week.map((x) => x.d.t));
    const st = skillStars();
    const wobbly = Object.keys(state.items).filter((k) => valid(k) && state.items[k].w >= 2 && state.items[k].b <= 2).sort((x, y) => state.items[y].w - state.items[x].w).slice(0, 16);
    const reihen = h('div', { class: 'p-list' }, activeMSK().map((sk) => {
      const open = skillUnlocked(sk); const forced = (state.force || []).includes(sk.k); const n = sk.ids.length;
      const sicher = Math.round(skillFrac(sk, 3) * n), gesehen = Math.round(skillFrac(sk, 1) * n);
      const first = MSK.filter((x) => x.track === sk.track)[0] === sk;
      return h('div', { class: 'p-row' }, h('span', { class: 'p-name' }, sk.n), stars(st['m_' + sk.k]), h('span', { class: 'p-num' }, open ? `${sicher}/${n} sicher, ${gesehen}/${n} geübt` : 'gesperrt'),
        h('div', { class: 'p-acts' },
          skillFrac(sk, 3) < 0.9 ? h('button', { class: 'p-btn', title: 'Diese und alle Stufen davor als gekonnt markieren', onclick: () => {
            const list = MSK.filter((x) => x.track === sk.track); const today = dayNum();
            list.slice(0, list.indexOf(sk) + 1).forEach((x) => { x.ids.forEach((id, k) => { if (box(id) < 3) { const it = getItem(id); it.b = 3; it.d = today + 3 + (k % 7); } }); state.checks[x.k] = { n: 6, ok: 6, done: true }; });
            save(); showParents('stand');
          } }, '✓ Kann sie') : null,
          !first && (!open || forced) ? h('button', { class: 'p-btn', onclick: () => { state.force = forced ? state.force.filter((x) => x !== sk.k) : (state.force || []).concat(sk.k); save(); showParents('stand'); } }, forced ? 'Sperre wieder an' : 'Freischalten') : null));
    }));
    const letters = h('div', { class: 'p-letters' }, D.LETTERS.map((L) => {
      const b = box('l:' + L.g);
      return h('button', { class: 'p-let b' + Math.min(b, 3), title: 'Antippen: als gekonnt markieren / zurücksetzen', onclick: () => {
        const id = 'l:' + L.g; if (box(id) >= 3) delete state.items[id]; else { const s = getItem(id); s.b = 4; s.d = dayNum() + 7; }
        save(); showParents('stand');
      } }, L.g);
    }));
    body.append(
      h('section', { class: 'p-card' }, h('h2', null, 'Diese Woche'),
        h('div', { class: 'bars' }, week.map(({ n, d }) => h('div', { class: 'bar' }, h('span', { class: 'bar-v' }, d.t ? String(d.t) : ''), h('span', { class: 'bar-f', style: `height:${Math.round((d.t / maxT) * 100)}%` }), h('span', { class: 'bar-l' }, WD[new Date(n * 86400000).getUTCDay()])))),
        h('p', { class: 'note' }, `Aufgaben pro Tag. Heute: ${sessionsToday()} von ${state.settings.perDay} Runden. Trefferquote zuletzt: ${Math.round(accuracy() * 100)} %.`)),
      leseCard(),
      h('section', { class: 'p-card' }, h('h2', null, 'Rechnen'), h('p', { class: 'note' }, 'Plus und Minus gehen Schritt für Schritt. Die nächste Stufe öffnet sich von selbst, wenn 70 % der vorigen klappen. Sind die ersten 6 Aufgaben einer Stufe schnell richtig, überspringt die App das Einüben. „Sicher“ heißt: an mehreren Tagen richtig. Mal-Aufgaben schaltest du unter Einstellungen ein.'), reihen),
      h('section', { class: 'p-card' }, h('h2', null, 'Buchstaben'), h('p', { class: 'note' }, 'Grau: neu, Rot: wackelt, Gelb: geübt, Grün: sicher. Antippen markiert einen Buchstaben als „kann sie schon“ (oder setzt ihn zurück).'), letters,
        h('p', { class: 'note' }, `Silben: ${stageUnlocked('s') ? countBox('s:', 3) + ' sicher' : 'öffnet sich bei 3 Mitlauten + 2 Selbstlauten'} · Wörter: ${stageUnlocked('w') ? countBox('w:', 3) + ' sicher' : 'gesperrt'} · Sätze: ${stageUnlocked('t') ? countBox('t:', 3) + ' sicher' : 'gesperrt'}`)),
      h('section', { class: 'p-card' }, h('h2', null, 'Weitere Themen (2. Klasse)'),
        h('p', { class: 'note' }, 'Öffnen sich nach und nach, passend zum Rechen- und Lesestand. Sie kommen gemischt in die normalen Runden.'),
        h('div', { class: 'p-list' }, TOPICS.filter((T) => T.k !== 'dv' || MAL()).map((T) => { const n = T.ids.length; const sic = T.ids.filter((id) => box(id) >= 3).length, ge = T.ids.filter((id) => box(id) >= 1).length; return h('div', { class: 'p-row' }, h('span', { class: 'p-name' }, (T.pool === 'math' ? '⛸️ ' : '🏊 ') + T.n), h('span', { class: 'p-num' }, T.gate() ? `${sic}/${n} sicher, ${ge}/${n} geübt` : 'noch gesperrt')); }))),
      h('section', { class: 'p-card' }, h('h2', null, 'Russisch'),
        h('p', { class: 'note' }, `Wörter: ${countBox('ru:', 3)} sicher, ${countBox('ru:', 1)} geübt (von ${D.RU_WORDS.length}). Fragen & Antworten: ${stageUnlocked('rf') ? countBox('rf:', 3) + ' sicher, ' + countBox('rf:', 1) + ' geübt' : 'öffnen sich nach 10 Wörtern'}.`),
        h('p', { class: 'note' }, 'Beim Sprechen bewertet sie sich selbst („richtig gesagt“). Hör ab und zu zu, ob es stimmt. Antworten auf Russisch sind hier wichtiger als perfekte Aussprache.')),
      h('section', { class: 'p-card' }, h('h2', null, 'Tests'),
        h('p', { class: 'note' }, 'Alle 3 Runden kommt ein Test mit 10 gemischten Aufgaben, ohne Hilfen. Abrufen ohne Hilfe festigt das Gelernte am stärksten.'),
        state.tests.list.length ? h('div', { class: 'chips' }, state.tests.list.slice(-10).map((x) => h('span', { class: 'chip' }, `${x.d.slice(8, 10)}.${x.d.slice(5, 7)}.: ${x.r}/${x.n}`))) : h('p', { class: 'note' }, testAvailable() ? 'Der nächste Test ist bereit.' : 'Noch kein Test gemacht.')),
      h('section', { class: 'p-card' }, h('h2', null, 'Wackelt noch'), wobbly.length ? h('div', { class: 'chips' }, wobbly.map((id) => h('span', { class: 'chip warn' }, `${itemLabel(id)} (${state.items[id].w}× falsch)`))) : h('p', { class: 'note' }, 'Nichts, was oft falsch war. Stark!')),
      h('section', { class: 'p-card tips' }, h('h2', null, 'So wirkt es am besten'),
        h('ul', null,
          h('li', null, 'Täglich 1–2 kurze Runden schlagen eine lange. Die App stoppt nach den eingestellten Runden.'),
          h('li', null, 'Beim Vorlesen dabei sein und zuhören. Das bringt fürs Lesen am meisten.'),
          h('li', null, 'Für Anstrengung loben („Du hast nicht aufgegeben“), nicht fürs Schlausein.'),
          h('li', null, 'Die App nicht als Belohnung oder Strafe einsetzen.'))));
  }
  function leseCard() {
    const log = ((state.lese && state.lese.log) || []).filter((x) => x.teppich != null).slice(-7).reverse();
    return h('section', { class: 'p-card' }, h('h2', null, 'Lese-Training'),
      h('p', { class: 'note' }, `Lesetext-Stufe ${leseLvl()} von ${D.LSTUFEN.length}${state.settings.leseLvl && state.settings.leseLvl !== 'auto' ? ' (fest eingestellt)' : ' (passt sich an)'}. Wörter pro Minute = beim 2. Lesen.`),
      log.length ? h('div', { class: 'p-list' }, log.map((x) => h('div', { class: 'p-row' }, h('span', { class: 'p-name' }, `${x.d.slice(8, 10)}.${x.d.slice(5, 7)}. · Stufe ${x.lvl || 1}`), h('span', { class: 'p-num' }, `${x.teppich} Silben · ${x.wpm2 || x.wpm1 || '–'} W/min · Frage ${x.frage == null ? '–' : x.frage ? '✓' : '✗'}${x.partial ? ' · abgebrochen' : ''}`)))) : h('p', { class: 'note' }, 'Noch kein Lese-Training gemacht.'));
  }
  function pSet(body) {
    const toggle = (key, label) => h('label', { class: 'p-toggle' }, h('input', { type: 'checkbox', id: 'set-' + key, checked: state.settings[key] ? true : null, onchange: (e) => { state.settings[key] = e.target.checked; save(); } }), label);
    const seg = (key, vals, label) => h('div', { class: 'p-seg' }, h('span', { class: 'lbl' }, label), h('div', { class: 'seg' }, vals.map((v) => h('button', { class: 'seg-b' + (state.settings[key] === v ? ' on' : ''), onclick: () => { state.settings[key] = v; save(); showParents('set'); } }, String(v)))));
    const ruMsg = h('p', { class: 'note', 'aria-live': 'polite' });
    const repMsg = h('p', { class: 'note', 'aria-live': 'polite' });
    body.append(h('p', { class: 'note' }, `App-Version: ${window.__APP_VERSION || 'Web'}${window.__UPDATE_READY ? ` · Update ${window.__UPDATE_READY} geladen, kommt beim nächsten Start` : ''}`));
    body.append(h('section', { class: 'p-card' }, h('h2', null, '📲 Bericht an Kevins Handy'),
      h('label', { class: 'p-toggle' }, h('input', { type: 'checkbox', id: 'set-report', checked: state.settings.report !== false ? true : null, onchange: (e) => { state.settings.report = e.target.checked; save(); } }), 'Nach jeder Runde Bericht senden'),
      h('p', { class: 'note' }, `Kevin bekommt nach jeder Runde eine Nachricht in der App „ntfy“ (Thema: ${REPORT_TOPIC}), außerdem beim Öffnen und Verlassen der App. Schreibt er „stand“ ins Thema, schickt die offene App den kompletten Stand. Ohne Internet wird der Bericht später nachgeschickt. Noch nicht gesendet: ${(state.outbox || []).length}.`),
      h('button', { class: 'tile', id: 'rep-full', onclick: () => { sendReport(`${state.name || 'Diana'}: kompletter Stand 📋`, fullStatusText()); setTimeout(() => { repMsg.textContent = (state.outbox || []).length ? 'Noch nicht angekommen. Ist das Tablet im Internet?' : 'Gesendet ✓'; }, 2500); } }, 'Kompletten Stand jetzt an Kevin schicken'),
      h('button', { class: 'tile', id: 'rep-test', onclick: async () => { sendReport('Test von ' + (state.name || 'Diana') + 's Tablet', 'Die Verbindung klappt.\n\n' + lernstandText()); setTimeout(() => { repMsg.textContent = (state.outbox || []).length ? 'Noch nicht angekommen. Ist das Tablet im Internet?' : 'Gesendet ✓'; }, 2500); } }, 'Test-Nachricht senden'), repMsg));
    const nameIn = h('input', { id: 'set-name', type: 'text', value: state.name, maxlength: '20', onchange: (e) => { const v = e.target.value.trim(); if (v) { state.name = v; save(); } } });
    const today = dayNum();
    body.append(
      h('section', { class: 'p-card' }, h('h2', null, 'Allgemein'),
        h('label', { for: 'set-name', class: 'lbl' }, 'Name'), nameIn,
        h('p', { class: 'lbl' }, 'Schmannys Fell'), catPicker()),
      h('section', { class: 'p-card' }, h('h2', null, 'Üben'),
        seg('perDay', [1, 2, 3], 'Runden pro Tag'),
        seg('perSession', [8, 12, 16], 'Aufgaben pro Runde'),
        toggle('dance', 'Tanz-Pause in der Mitte jeder Runde'),
        toggle('music', 'Musik in der Tanz-Pause'),
        toggle('write', 'Schreiben mit Stift (Abschreiben, Merken-Schreiben)'),
        h('div', { class: 'p-seg' }, h('span', { class: 'lbl' }, 'Lesetext-Stufe'), h('div', { class: 'seg', id: 'set-lese' }, ['auto', 1, 2, 3, 4].map((v) => h('button', { class: 'seg-b' + (String(state.settings.leseLvl || 'auto') === String(v) ? ' on' : ''), onclick: () => { state.settings.leseLvl = v; if (v !== 'auto') { state.lese = state.lese || { log: [] }; state.lese.lvl = v; state.lese.up = 0; state.lese.down = 0; } save(); showParents('set'); } }, v === 'auto' ? 'Automatisch' : String(v))))),
        h('p', { class: 'note' }, `Automatisch: eine Stufe höher nach 2 Trainings mit richtiger Frage und mindestens ${LESE_UP} Wörtern/Minute beim 2. Lesen (bei ${LESE_JUMP}+ sofort), eine tiefer nach 2 falschen Fragen oder unter ${LESE_DOWN} Wörtern/Minute. Aktuell: Stufe ${leseLvl()}.`),
        h('label', { class: 'p-toggle' }, h('input', { type: 'checkbox', id: 'set-mal', checked: state.settings.mal ? true : null, onchange: (e) => { state.settings.mal = e.target.checked; save(); } }), 'Mal-Aufgaben einschalten (erst, wenn sie in der Schule dran sind)'),
        h('button', { class: 'tile', id: 'explain-reset', onclick: (e) => { state.explained = {}; save(); e.target.textContent = 'Erklärungen kommen wieder ✓'; } }, 'Erklär-Fenster beim nächsten Öffnen wieder zeigen'),
        h('button', { class: 'tile', id: 'extra-round', onclick: (e) => { if (state.extra.day === today) state.extra.n++; else state.extra = { day: today, n: 1 }; save(); e.target.textContent = 'Extra-Runde für heute freigeschaltet ✓'; } }, 'Heute eine Extra-Runde freischalten')),
      h('section', { class: 'p-card' }, h('h2', null, 'Russisch'),
        h('label', { for: 'set-runame', class: 'lbl' }, 'Ihr Name auf Russisch (für „Меня зовут …“)'),
        h('input', { id: 'set-runame', type: 'text', value: state.ruName || translit(state.name), maxlength: '20', onchange: (e) => { state.ruName = e.target.value.trim(); save(); } }),
        h('button', { class: 'tile', onclick: () => { Voice.say([{ text: `Привет! Меня зовут ${ruName()}.`, lang: 'ru' }]); setTimeout(() => { ruMsg.textContent = Voice.hasRu() ? 'Russische Gerätestimme gefunden ✓' : 'Auf diesem Gerät ist keine russische Gerätestimme da. Nimm die Russisch-Clips auf, oder installier in den Android-Einstellungen unter „Sprachausgabe“ das Sprachpaket Russisch.'; }, 600); } }, 'Russische Stimme testen'),
        ruMsg),
      fotoParentCard(),
      h('section', { class: 'p-card' }, h('h2', null, 'Ton'),
        toggle('tts', 'Gerätestimme liest vor, solange noch keine eigene Aufnahme da ist'),
        toggle('sfx', 'Klick- und Jubel-Töne'),
        h('label', { class: 'p-toggle' }, h('input', { type: 'checkbox', id: 'set-menumusic', checked: state.settings.menuMusic ? true : null, onchange: (e) => { state.settings.menuMusic = e.target.checked; save(); } }), 'Kevins Musik leise im Menü (braucht Internet)'),
        h('div', { class: 'p-seg' }, h('span', { class: 'lbl' }, 'Lautstärke Musik'), h('div', { class: 'seg' }, [['Sehr leise', 6], ['Leise', 12], ['Mittel', 25], ['Laut', 45]].map(([n, v]) => h('button', { class: 'seg-b' + ((state.settings.menuVol || 12) === v ? ' on' : ''), onclick: () => { state.settings.menuVol = v; save(); MenuMusic.setVol(); showParents('set'); } }, n)))),
        h('button', { class: 'tile', onclick: () => Voice.say([{ text: `Hallo ${state.name}! So klingt die Gerätestimme.` }]) }, 'Gerätestimme testen')));
  }
  // Direkte Aufnahme (nur in der Android-App; im Artefakt ist das Mikrofon gesperrt)
  const Mic = (() => {
    let mr = null, btn = null, stream = null;
    async function toggle(b, done) {
      if (mr) { const same = btn === b; stopRec(); if (same) return; }
      Voice.stop();
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { alertBox('Kein Zugriff aufs Mikrofon. Erlaube es in den Android-Einstellungen unter Apps → Max & Schmanny → Berechtigungen.'); return; }
      const chunks = []; const type = window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined); const st = stream;
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => { st.getTracks().forEach((t) => t.stop()); const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); if (blob.size > 800) done(blob); };
      mr = rec; btn = b; b.textContent = '⏹'; b.classList.add('on'); rec.start();
    }
    function stopRec() { if (mr && mr.state !== 'inactive') mr.stop(); if (btn) { btn.textContent = '🎙️'; btn.classList.remove('on'); } mr = null; btn = null; }
    return { toggle, stop: stopRec };
  })();
  function pVoice(body) {
    const groups = clipGroups();
    const total = groups.reduce((a, g) => a + g.items.length, 0);
    const recCount = () => groups.reduce((a, g) => a + g.items.filter((x) => hasClip(x.id)).length, 0);
    const counter = h('p', { class: 'note strong' });
    const updateCount = () => { counter.textContent = `${recCount()} von ${total} Aufnahmen da. Rest liest die Gerätestimme.`; };
    updateCount();
    const listText = groups.map((g) => `== ${g.n} ==\n` + g.items.map((x, k) => `${String(k + 1).padStart(2, '0')}. ${x.t}${x.hint ? '  (' + x.hint + ')' : ''}`).join('\n')).join('\n\n');
    const ta = h('textarea', { class: 'p-ta', id: 'rec-list', readonly: true, rows: '6' }, listText);
    const copyMsg = h('span', { class: 'note' });
    state.vbad = state.vbad || {};
    const badList = () => { const out = []; groups.forEach((g, gi) => g.items.forEach((x, xi) => { if (state.vbad[x.id]) out.push(`Gruppe ${gi + 1}, Nr. ${xi + 1}: ${x.t}`); })); return out; };
    const bl = badList();
    const badTa = h('textarea', { class: 'p-ta', id: 'bad-list', readonly: true, rows: '4' }, bl.join('\n'));
    const badMsg = h('span', { class: 'note' });
    const packGroups = groups.map((g, gi) => ({ g, gi, n: g.items.filter((x) => window.VOICE_PACK && window.VOICE_PACK[x.id]).length })).filter((x) => x.n);
    body.append(
      h('section', { class: 'p-card rv-card' }, h('h2', null, 'Clips prüfen'),
        h('p', { class: 'note' }, 'Tippe auf eine Gruppe. Die App spielt jeden Clip ab und zeigt den Text dazu. Passt ein Clip nicht zum Text, tippst du auf ✗. Am Ende steht unten die Liste aller falschen Clips. Schick sie Claude, oder nimm die Clips weiter unten mit 🎙️ neu auf.'),
        packGroups.length ? h('div', { class: 'rv-groups' }, packGroups.map(({ g, gi, n }) => {
          const bad = g.items.filter((x) => state.vbad[x.id]).length;
          return h('button', { class: 'p-btn rv-g', onclick: () => reviewGroup(g, gi) }, `Gruppe ${gi + 1}: ${g.n.replace(/^Neu: /, '')} (${n})`, bad ? h('b', { class: 'rv-badn' }, ` ✗ ${bad}`) : null);
        })) : h('p', { class: 'note' }, 'Noch keine eingebauten Clips da.'),
        bl.length ? h('div', null, h('p', { class: 'lbl' }, `Falsche Clips (${bl.length})`), badTa,
          h('div', { class: 'row2' },
            h('button', { class: 'tile', onclick: () => { const t = badList().join('\n'); try { navigator.clipboard.writeText(t).then(() => { badMsg.textContent = 'Kopiert ✓'; }, () => { badTa.select(); badMsg.textContent = 'Text markiert: jetzt kopieren.'; }); } catch (e) { badTa.select(); } } }, 'Liste kopieren'),
            h('button', { class: 'tile', onclick: () => { state.vbad = {}; save(); showParents('voice'); } }, 'Liste leeren')), badMsg) : null),
      h('section', { class: 'p-card' }, h('h2', null, 'Deine Stimme in der App'),
        h('p', { class: 'note' }, CAN_MIC ? 'Tippe bei einem Eintrag auf 🎙️, sprich, dann tippe auf ⏹. Die Aufnahme wird gleich abgespielt. ▶ spielt ab.' : 'Tippe bei einem Eintrag auf 🎙️. Auf Android öffnet sich die Rekorder-App: aufnehmen, fertig, die Aufnahme landet hier. Auf dem iPhone wählst du eine Sprachmemo-Datei aus. ▶ spielt ab.'),
        h('p', { class: 'note' }, 'Wichtig: Aufnahmen hier bleiben auf diesem Gerät. Nimm also am besten direkt auf dem Gerät deiner Schwester auf.'),
        counter),
      h('section', { class: 'p-card' }, h('h2', null, 'Alles in einem Rutsch einsprechen'),
        h('p', { class: 'note' }, 'Lies die Liste der Reihe nach vor, nach jedem Eintrag 2 Sekunden Pause. Schick Claude die Aufnahme (gern in Teilen). Claude schneidet sie und baut deine Stimme fest in die App ein, dann klingt sie auf jedem Gerät nach dir.'),
        ta, h('div', { class: 'row2' }, h('button', { class: 'tile', onclick: () => { try { navigator.clipboard.writeText(listText).then(() => { copyMsg.textContent = 'Kopiert ✓'; }, () => { ta.select(); copyMsg.textContent = 'Text markiert: jetzt kopieren.'; }); } catch (e) { ta.select(); copyMsg.textContent = 'Text markiert: jetzt kopieren.'; } } }, 'Liste kopieren'), copyMsg)));
    groups.forEach((g, gi) => {
      const n = g.items.filter((x) => hasClip(x.id)).length;
      const det = h('details', { class: 'p-card rec-group', open: g.prio && n < g.items.length ? true : null });
      det.append(h('summary', null, h('span', null, g.n), h('span', { class: 'rec-n' }, `${n}/${g.items.length}`)));
      g.items.forEach((x, xi) => {
        const dot = h('span', { class: 'rec-dot' + (hasClip(x.id) ? ' on' : '') });
        const input = h('input', { type: 'file', accept: 'audio/*', capture: 'user', class: 'vh', id: `rec-${gi}-${xi}` });
        const del = h('button', { class: 'p-btn', hidden: state.rec[x.id] ? null : true, 'aria-label': 'Aufnahme löschen', onclick: async () => { await IDB.del(x.id); Voice.forget(x.id); delete state.rec[x.id]; save(); dot.classList.toggle('on', hasClip(x.id)); del.hidden = true; updateCount(); } }, '🗑');
        const store = async (f) => {
          try { await IDB.put(x.id, f); Voice.forget(x.id); state.rec[x.id] = 1; if (state.vbad[x.id]) { delete state.vbad[x.id]; row.classList.remove('bad'); } save(); dot.classList.add('on'); del.hidden = false; updateCount(); Voice.say([{ id: x.id, text: x.t, lang: x.ru ? 'ru' : null }]); }
          catch (e) { alertBox('Die Aufnahme konnte nicht gespeichert werden. Dieser Browser erlaubt hier vermutlich keinen Speicher.'); }
        };
        input.addEventListener('change', async () => {
          const f = input.files && input.files[0]; if (!f) return;
          await store(f); input.value = '';
        });
        const micBtn = CAN_MIC ? h('button', { class: 'p-btn rec', 'aria-label': 'Aufnehmen', onclick: () => Mic.toggle(micBtn, store) }, '🎙️') : null;
        const row = h('div', { class: 'rec-row' + (state.vbad[x.id] ? ' bad' : '') }, dot, h('span', { class: 'rec-t' }, x.t, x.hint ? h('small', null, ' ' + x.hint) : null),
          h('button', { class: 'p-btn', 'aria-label': 'Abspielen', onclick: () => Voice.say([{ id: x.id, text: x.id.startsWith('laut:') ? '' : x.t, lang: x.ru ? 'ru' : null }]) }, '▶'),
          micBtn || h('label', { class: 'p-btn rec', for: input.id, 'aria-label': 'Aufnehmen' }, '🎙️'), micBtn ? null : input, del);
        det.append(row);
      });
      body.append(det);
    });
    IDB.keys().then((keys) => { let ch = false; (keys || []).forEach((k) => { if (!state.rec[k]) { state.rec[k] = 1; ch = true; } }); Object.keys(state.rec).forEach((k) => { if (!(keys || []).includes(k)) { delete state.rec[k]; ch = true; } }); if (ch) { save(); updateCount(); } });
  }
  function reviewGroup(g, gi) {
    state.vbad = state.vbad || {};
    const items = g.items; let k = 0, paused = false, run = 0, ended = false;
    const num = h('p', { class: 'rv-num' });
    const txt = h('p', { class: 'rv-t', lang: g.ru ? 'ru' : 'de' });
    const hint = h('p', { class: 'note' });
    const badBtn = h('button', { class: 'tile warnbtn rv-bad', id: 'rv-bad', onclick: () => {
      const x = items[k]; if (!x) return;
      if (state.vbad[x.id]) delete state.vbad[x.id]; else state.vbad[x.id] = 1;
      save(); paint();
    } }, '✗ Falsch');
    const pauseBtn = h('button', { class: 'p-btn', id: 'rv-pause', onclick: () => { paused = !paused; if (paused) { run++; Voice.stop(); } else go(k); paint(); } }, '⏸');
    const close = () => { run++; Voice.stop(); ov.remove(); showParents('voice'); };
    const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Clips prüfen' },
      h('div', { class: 'dialog rv' },
        h('p', { class: 'lbl' }, `Gruppe ${gi + 1}: ${g.n}`), num, txt, hint, badBtn,
        h('div', { class: 'rv-ctl' },
          h('button', { class: 'p-btn', id: 'rv-prev', 'aria-label': 'Zurück', onclick: () => go(Math.max(0, k - 1)) }, '⏮'),
          h('button', { class: 'p-btn', id: 'rv-again', 'aria-label': 'Nochmal', onclick: () => go(k) }, '↻'),
          pauseBtn,
          h('button', { class: 'p-btn', id: 'rv-next', 'aria-label': 'Weiter', onclick: () => go(Math.min(items.length - 1, k + 1)) }, '⏭'),
          h('button', { class: 'p-btn', id: 'rv-close', onclick: close }, 'Fertig'))));
    function paint() {
      const x = items[k];
      if (ended) { num.textContent = 'Fertig!'; const n = items.filter((y) => state.vbad[y.id]).length; txt.textContent = n ? `${n} falsch markiert` : 'Alles passt 🎉'; hint.textContent = 'Tippe auf „Fertig“. Die Liste steht dann im Bereich „Clips prüfen“.'; badBtn.hidden = true; return; }
      badBtn.hidden = false;
      num.textContent = `Nr. ${k + 1} von ${items.length}`;
      txt.textContent = x.t;
      const has = hasClip(x.id);
      hint.textContent = (x.hint ? x.hint + ' · ' : '') + (has ? '' : 'kein Clip (Gerätestimme)');
      txt.classList.toggle('bad', !!state.vbad[x.id]);
      badBtn.textContent = state.vbad[x.id] ? '✗ markiert (nochmal tippen = doch richtig)' : '✗ Falsch';
      pauseBtn.textContent = paused ? '▶' : '⏸';
    }
    async function go(i) {
      const my = ++run; k = i; ended = false; paint();
      const x = items[k];
      if (hasClip(x.id)) await Voice.say([{ id: x.id, text: '' }]);
      else await new Promise((r) => setTimeout(r, 900));
      if (my !== run || paused || !document.body.contains(ov)) return;
      await new Promise((r) => setTimeout(r, 700));
      if (my !== run || paused || !document.body.contains(ov)) return;
      if (k + 1 < items.length) go(k + 1); else { ended = true; paint(); }
    }
    document.body.append(ov);
    go(0);
  }
  function alertBox(msg) {
    const ov = h('div', { class: 'overlay', role: 'alertdialog', 'aria-modal': 'true' }, h('div', { class: 'dialog' }, h('p', null, msg), h('button', { class: 'tile go', onclick: () => ov.remove() }, 'OK')));
    document.body.append(ov);
  }
  function pBackup(body) {
    const code = (() => { try { const s = Object.assign({}, state, { rec: {} }); return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); } catch (e) { return ''; } })();
    const out = h('textarea', { class: 'p-ta', id: 'backup-out', readonly: true, rows: '4' }, code);
    const inp = h('textarea', { class: 'p-ta', id: 'backup-in', rows: '4', placeholder: 'Sicherungscode hier einfügen' });
    const msg = h('p', { class: 'note', 'aria-live': 'polite' });
    body.append(
      h('section', { class: 'p-card' }, h('h2', null, 'Lernstand sichern'),
        h('p', { class: 'note' }, 'Der Lernstand liegt nur in diesem Browser. Kopier den Code ab und zu (z. B. in deine Notizen). Damit holst du alles zurück oder ziehst auf ein anderes Gerät um. Aufnahmen sind nicht enthalten.'),
        out, h('button', { class: 'tile', onclick: () => { try { navigator.clipboard.writeText(code).then(() => { msg.textContent = 'Code kopiert ✓'; }, () => { out.select(); msg.textContent = 'Code markiert: jetzt kopieren.'; }); } catch (e) { out.select(); } } }, 'Code kopieren'), msg),
      h('section', { class: 'p-card' }, h('h2', null, 'Sicherung einspielen'), inp,
        h('button', { class: 'tile', onclick: () => { try { const s = JSON.parse(decodeURIComponent(escape(atob(inp.value.trim())))); if (!s || s.v !== 1) throw 0; const rec = state.rec; state = Object.assign(defaults(), s, { rec }); save(); msg.textContent = 'Eingespielt ✓'; } catch (e) { msg.textContent = 'Der Code passt nicht. Bitte komplett kopieren und erneut einfügen.'; } } }, 'Einspielen')),
      h('section', { class: 'p-card danger' }, h('h2', null, 'Neu anfangen'), h('p', { class: 'note' }, 'Löscht den Lernstand auf diesem Gerät. Aufnahmen bleiben.'),
        h('button', { class: 'tile warnbtn', onclick: () => {
          const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'dialog' }, h('p', { class: 'h-display' }, 'Wirklich alles zurücksetzen?'),
            h('div', { class: 'row2' }, h('button', { class: 'tile', onclick: () => ov.remove() }, 'Abbrechen'), h('button', { class: 'tile warnbtn', onclick: () => { const rec = state.rec; state = defaults(); state.rec = rec; save(); ov.remove(); showSetup(); } }, 'Ja, zurücksetzen'))));
          document.body.append(ov);
        } }, 'Lernstand löschen')));
  }

  // ---------- Malstudio: frei malen, Malen nach Zahlen (an ihr Rechen-Niveau angepasst), Galerie, an Kevin schicken ----------
  const PAINT_COLORS = ['#15233f', '#e8344e', '#ff8a00', '#ffd34d', '#3fcf6a', '#2f9e44', '#38bdf8', '#2f6fdc', '#9b6cff', '#ff5fa2', '#8a4f24', '#ffffff'];
  const STAMPS = [
    { id: 'max', svg: () => svgMax({ mood: 'happy', noBall: true }) }, { id: 'cat', svg: () => svgCat({}) }, { id: 'pablo', svg: () => svgPablo({}) },
    { id: 'herz', e: '❤️' }, { id: 'stern', e: '⭐' }, { id: 'bluete', e: '🌸' }, { id: 'schmetterling', e: '🦋' }, { id: 'krone', e: '👑' }, { id: 'schleife', e: '🎀' }, { id: 'regenbogen', e: '🌈' }, { id: 'eis', e: '🍦' }, { id: 'glitzer', e: '✨' }
  ];
  const stampSvg = (S) => (S.svg ? S.svg() : `<svg viewBox="0 0 100 100"><text x="50" y="56" font-size="80" text-anchor="middle" dominant-baseline="middle">${S.e}</text></svg>`);
  const BACKGROUNDS = [
    { id: 'weiss', n: '⬜ Weiß', draw: (c, w, hh) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, hh); } },
    { id: 'eis', n: '⛸️ Eisbahn', draw: (c, w, hh) => { let g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, '#cfeeff'); g.addColorStop(1, '#f4fbff'); c.fillStyle = g; c.fillRect(0, 0, w, hh); c.fillStyle = '#e8f7ff'; c.beginPath(); c.ellipse(w / 2, hh * 0.78, w * 0.48, hh * 0.2, 0, 0, 7); c.fill(); c.strokeStyle = '#a9d8f5'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(Math.random() * w, Math.random() * hh * 0.55, 2 + Math.random() * 3, 0, 7); c.fill(); } } },
    { id: 'buehne', n: '🎭 Bühne', draw: (c, w, hh) => { let g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, '#3b1f5c'); g.addColorStop(1, '#6b3fa0'); c.fillStyle = g; c.fillRect(0, 0, w, hh); c.fillStyle = 'rgba(255,240,170,.25)'; c.beginPath(); c.moveTo(w / 2 - 30, 0); c.lineTo(w / 2 + 30, 0); c.lineTo(w / 2 + w * 0.22, hh * 0.85); c.lineTo(w / 2 - w * 0.22, hh * 0.85); c.fill(); c.fillStyle = '#c8243c'; c.fillRect(0, 0, w * 0.12, hh); c.fillRect(w * 0.88, 0, w * 0.12, hh); c.fillStyle = '#8a5a2b'; c.fillRect(0, hh * 0.85, w, hh * 0.15); } },
    { id: 'pool', n: '🏊 Schwimmbad', draw: (c, w, hh) => { c.fillStyle = '#e9f6ff'; c.fillRect(0, 0, w, hh * 0.35); c.strokeStyle = '#cde6f5'; c.lineWidth = 1; for (let x = 0; x < w; x += 30) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, hh * 0.35); c.stroke(); } let g = c.createLinearGradient(0, hh * 0.35, 0, hh); g.addColorStop(0, '#5ec8ff'); g.addColorStop(1, '#1f7fd0'); c.fillStyle = g; c.fillRect(0, hh * 0.35, w, hh * 0.65); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; for (let y = hh * 0.45; y < hh; y += 40) { c.beginPath(); for (let x = 0; x <= w; x += 20) c.lineTo(x, y + Math.sin(x / 25) * 5); c.stroke(); } } },
    { id: 'zimmer', n: '🛋️ Zimmer', draw: (c, w, hh) => { c.fillStyle = '#ffe9d6'; c.fillRect(0, 0, w, hh); c.fillStyle = '#c99566'; c.fillRect(0, hh * 0.78, w, hh * 0.22); c.fillStyle = '#bfe6ff'; c.fillRect(w * 0.62, hh * 0.12, w * 0.26, hh * 0.32); c.strokeStyle = '#fff'; c.lineWidth = 6; c.strokeRect(w * 0.62, hh * 0.12, w * 0.26, hh * 0.32); c.beginPath(); c.moveTo(w * 0.75, hh * 0.12); c.lineTo(w * 0.75, hh * 0.44); c.stroke(); } },
    { id: 'nacht', n: '🌙 Nacht', draw: (c, w, hh) => { let g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, '#0d1b3d'); g.addColorStop(1, '#2b3f7a'); c.fillStyle = g; c.fillRect(0, 0, w, hh); c.fillStyle = '#fff6c2'; c.beginPath(); c.arc(w * 0.82, hh * 0.2, 34, 0, 7); c.fill(); c.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { c.beginPath(); c.arc(Math.random() * w, Math.random() * hh, Math.random() * 2 + 0.5, 0, 7); c.fill(); } } }
  ];
  function galleryAdd(dataUrl, title) {
    state.gallery = state.gallery || [];
    state.gallery.unshift({ img: dataUrl, at: Date.now(), t: title || '' });
    state.gallery = state.gallery.slice(0, 15); save();
    if (!storageOK) { state.gallery = state.gallery.slice(0, 6); save(); }
  }
  // Bild als Anhang an Kevins ntfy (kommt als Bild aufs Handy). Ohne Internet: später nochmal.
  async function sendPicture(dataUrl, title) {
    if (VIEWER || state.settings.report === false) return 'aus';
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const r = await fetch(`https://ntfy.sh/${REPORT_TOPIC}?title=${encodeURIComponent(title || `${state.name || 'Diana'} hat dir ein Bild gemalt 🎨`)}&filename=bild.jpg&tags=art&priority=3`, { method: 'PUT', body: blob });
      if (!r.ok) throw new Error('ntfy ' + r.status);
      return 'ok';
    } catch (e) {
      state.picOut = (state.picOut || []).concat([{ img: dataUrl, title }]).slice(-3); save(); return 'später';
    }
  }
  async function flushPictures() {
    const box = (state.picOut || []).slice(); if (!box.length) return;
    state.picOut = []; save();
    for (const p of box) await sendPicture(p.img, p.title);
  }
  setTimeout(() => { try { flushPictures(); } catch (e) { } }, 6000);

  function studioTabs(active) {
    return h('div', { class: 'tabs studio-tabs' },
      [['frei', '🖌️ Frei malen', () => showStudio()], ['zahlen', '🔢 Malen nach Zahlen', () => showMzList()], ['galerie', '🖼️ Galerie', () => showGallery()]].map(([k, n, f]) => h('button', { class: 'tab' + (k === active ? ' on' : ''), onclick: () => { SFX.tap(); f(); } }, n)));
  }

  // ----- Frei malen -----
  function showStudio() {
    let color = PAINT_COLORS[1], size = 10, tool = 'pen', stamp = null, bg = BACKGROUNDS[0], hue = 0;
    const bgC = h('canvas', { class: 'st-bg' }), dC = h('canvas', { class: 'st-draw', 'aria-label': 'Malfläche' });
    const stage = h('div', { class: 'studio-stage' }, bgC, dC);
    let W = 800, H = 500, dpr = Math.max(1, window.devicePixelRatio || 1), ctx = null, bctx = null, undo = [], drawing = false, last = null, empty = true;
    const stampImgs = {};
    STAMPS.forEach((S) => { const im = new Image(); im.src = svgSrc(stampSvg(S)); stampImgs[S.id] = im; });
    function sizeUp() {
      W = Math.max(280, Math.round(stage.getBoundingClientRect().width || 800)); H = Math.round(Math.min(560, Math.max(260, Math.min(W * 0.75, window.innerHeight - 150))));
      [bgC, dC].forEach((cv) => { cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; });
      stage.style.height = H + 'px';
      bctx = bgC.getContext('2d'); bctx.setTransform(dpr, 0, 0, dpr, 0, 0); bg.draw(bctx, W, H);
      ctx = dC.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    }
    const pos = (e) => { const r = dC.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    function pushUndo() { try { undo.push(ctx.getImageData(0, 0, dC.width, dC.height)); if (undo.length > 20) undo.shift(); } catch (e) { } }
    function seg(a, b) {
      ctx.save();
      if (tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000'; ctx.lineWidth = size * 2.2; }
      else if (tool === 'rainbow') { hue = (hue + 7) % 360; ctx.strokeStyle = `hsl(${hue} 90% 55%)`; ctx.lineWidth = size * 1.4; }
      else if (tool === 'glitter') { ctx.strokeStyle = color; ctx.globalAlpha = 0.55; ctx.lineWidth = size; }
      else { ctx.strokeStyle = color; ctx.lineWidth = size; }
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      if (tool === 'glitter') { ctx.globalAlpha = 1; for (let i = 0; i < 3; i++) { const x = b[0] + (Math.random() - 0.5) * size * 2.4, y = b[1] + (Math.random() - 0.5) * size * 2.4; ctx.fillStyle = pick(['#fff6a8', '#ffffff', '#ffd1f0', '#bdf3ff']); ctx.beginPath(); ctx.arc(x, y, Math.random() * 2.2 + 0.8, 0, 7); ctx.fill(); } }
      ctx.restore();
    }
    function putStamp(p) { const S = STAMPS.find((x) => x.id === stamp); const im = stampImgs[stamp]; if (!S || !im || !im.complete) return; const w = 34 + size * 5, r = (im.naturalHeight || 1) / (im.naturalWidth || 1); ctx.drawImage(im, p[0] - w / 2, p[1] - (w * r) / 2, w, w * r); SFX.tap(); }
    dC.addEventListener('pointerdown', (e) => { e.preventDefault(); try { dC.setPointerCapture(e.pointerId); } catch (er) { } pushUndo(); empty = false; const p = pos(e); if (tool === 'stamp') { putStamp(p); return; } drawing = true; last = p; seg(p, [p[0] + 0.1, p[1] + 0.1]); });
    dC.addEventListener('pointermove', (e) => { if (!drawing) return; e.preventDefault(); const p = pos(e); seg(last, p); last = p; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => dC.addEventListener(ev, () => { drawing = false; }));
    function exportImg() { const out = document.createElement('canvas'); const ow = 900, oh = Math.round(900 * H / W); out.width = ow; out.height = oh; const c = out.getContext('2d'); c.drawImage(bgC, 0, 0, ow, oh); c.drawImage(dC, 0, 0, ow, oh); return out.toDataURL('image/jpeg', 0.78); }
    const mark = (wrap, el) => { wrap.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); el.classList.add('on'); };
    const toolsRow = h('div', { class: 'st-tools' });
    const toolBtn = (id, label) => { const b = h('button', { class: 'st-tool' + (tool === id ? ' on' : ''), onclick: () => { SFX.tap(); tool = id; stamp = null; mark(toolsRow, b); stampRow.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); } }, label); return b; };
    toolsRow.append(toolBtn('pen', '🖍️ Stift'), toolBtn('glitter', '✨ Glitzer'), toolBtn('rainbow', '🌈 Regenbogen'), toolBtn('eraser', '🧽 Radierer'));
    const colors = h('div', { class: 'st-colors' }, PAINT_COLORS.map((c) => { const b = h('button', { class: 'st-color' + (c === color ? ' on' : ''), style: `background:${c}`, 'aria-label': 'Farbe', onclick: () => { color = c; if (tool === 'eraser' || tool === 'stamp' || tool === 'rainbow') { tool = 'pen'; mark(toolsRow, toolsRow.firstChild); } mark(colors, b); SFX.tap(); } }); return b; }));
    const sizes = h('div', { class: 'st-sizes' }, [[5, 'dünn'], [10, 'mittel'], [20, 'dick']].map(([s, n]) => { const b = h('button', { class: 'st-size' + (s === size ? ' on' : ''), onclick: () => { size = s; mark(sizes, b); SFX.tap(); } }, h('span', { class: 'dot', style: `width:${s + 4}px;height:${s + 4}px` }), n); return b; }));
    const stampRow = h('div', { class: 'st-stamps' }, STAMPS.map((S) => { const b = h('button', { class: 'st-stamp', 'aria-label': 'Stempel', onclick: () => { tool = 'stamp'; stamp = S.id; toolsRow.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); mark(stampRow, b); SFX.tap(); } }, svgEl(stampSvg(S), 'st-stamp-ico')); return b; }));
    const bgRow = h('div', { class: 'chips pick st-bgs' }, BACKGROUNDS.map((B) => { const b = h('button', { class: 'chip' + (B === bg ? ' on' : ''), onclick: () => { bg = B; bctx.setTransform(dpr, 0, 0, dpr, 0, 0); bg.draw(bctx, W, H); mark(bgRow, b); SFX.tap(); } }, B.n); return b; }));
    const actions = h('div', { class: 'st-actions' },
      h('button', { class: 'tile', onclick: () => { const u = undo.pop(); if (u) ctx.putImageData(u, 0, 0); SFX.tap(); } }, '↶ Zurück'),
      h('button', { class: 'tile', onclick: () => { pushUndo(); ctx.clearRect(0, 0, W, H); empty = true; SFX.tap(); } }, '🗑 Neu'),
      h('button', { class: 'tile go', id: 'st-save', onclick: () => { if (empty) { toast('Mal erst etwas!', '🖌️'); return; } galleryAdd(exportImg(), 'Frei gemalt'); SFX.fanfare(); toast('In deiner Galerie gespeichert!', '🖼️'); } }, '💾 Speichern'),
      h('button', { class: 'tile go', id: 'st-send', onclick: async (e) => { if (empty) { toast('Mal erst etwas!', '🖌️'); return; } const img = exportImg(); galleryAdd(img, 'An Kevin geschickt'); e.target.disabled = true; const r = await sendPicture(img); e.target.disabled = false; SFX.fanfare(); toast(r === 'ok' ? 'Kevin bekommt dein Bild! 💌' : r === 'aus' ? 'Gespeichert! (Schicken ist ausgeschaltet)' : 'Gespeichert! Es wird geschickt, sobald Internet da ist.', '💌'); } }, '💌 An Kevin schicken'));
    const scr = h('main', { class: 'screen map studio' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showHome()), h('h1', { class: 'h-display' }, 'Malstudio')),
      studioTabs('frei'), h('div', { class: 'studio-body' }, stage, h('div', { class: 'studio-side' }, h('div', { class: 'st-panel' }, toolsRow, colors, sizes), stampRow, bgRow, actions)));
    mount(scr, 'home');
    requestAnimationFrame(sizeUp);
  }

  // ----- Malen nach Zahlen -----
  // Bilder 300×300: [Form, Attribute, Farb-Nr., Beschriftung x, y]. Reihenfolge = Malreihenfolge (Hintergrund zuerst).
  const band = (r1, r2) => `M${150 - r2} 235 A${r2} ${r2} 0 0 1 ${150 + r2} 235 L${150 + r1} 235 A${r1} ${r1} 0 0 0 ${150 - r1} 235 Z`;
  const MZ_PICS = [
    { id: 'eis', n: 'Eis', cols: ['#bfe6ff', '#d9a066', '#ff8fc4', '#8fe3c0', '#e8344e'], parts: [['rect', { x: 0, y: 0, width: 300, height: 300 }, 0, 40, 40], ['rect', { x: 0, y: 262, width: 300, height: 38 }, 1, 50, 284], ['polygon', { points: '108,172 192,172 150,258' }, 1, 150, 205], ['circle', { cx: 122, cy: 160, r: 36 }, 2, 112, 168], ['circle', { cx: 178, cy: 160, r: 36 }, 3, 190, 168], ['circle', { cx: 150, cy: 115, r: 38 }, 2, 150, 118], ['circle', { cx: 150, cy: 64, r: 19 }, 4, 150, 67]] },
    { id: 'haus', n: 'Haus', cols: ['#a9dcff', '#6fcf6a', '#ffd34d', '#e8544e', '#a0663a'], parts: [['rect', { x: 0, y: 0, width: 300, height: 232 }, 0, 40, 30], ['rect', { x: 0, y: 232, width: 300, height: 68 }, 1, 60, 272], ['circle', { cx: 250, cy: 52, r: 28 }, 2, 250, 55], ['rect', { x: 185, y: 78, width: 22, height: 44 }, 4, 196, 92], ['rect', { x: 70, y: 140, width: 160, height: 110 }, 2, 100, 232], ['polygon', { points: '58,142 150,68 242,142' }, 3, 150, 120], ['rect', { x: 134, y: 188, width: 34, height: 62 }, 4, 151, 224], ['rect', { x: 84, y: 158, width: 38, height: 30 }, 0, 103, 176], ['rect', { x: 178, y: 158, width: 38, height: 30 }, 0, 197, 176], ['rect', { x: 22, y: 178, width: 14, height: 58 }, 4, 29, 216], ['circle', { cx: 29, cy: 160, r: 25 }, 1, 29, 163]] },
    { id: 'fisch', n: 'Fisch', cols: ['#7cc8ff', '#ff9f43', '#ffd34d', '#ffffff', '#b06cff'], parts: [['rect', { x: 0, y: 0, width: 300, height: 300 }, 0, 40, 40], ['polygon', { points: '72,150 18,102 18,198' }, 1, 40, 152], ['ellipse', { cx: 160, cy: 150, rx: 86, ry: 56 }, 1, 96, 152], ['polygon', { points: '128,99 168,58 196,101' }, 2, 165, 88], ['polygon', { points: '138,201 164,238 188,201' }, 2, 163, 213], ['ellipse', { cx: 130, cy: 150, rx: 12, ry: 49 }, 3, 130, 152], ['ellipse', { cx: 176, cy: 150, rx: 12, ry: 53 }, 3, 176, 152], ['circle', { cx: 216, cy: 136, r: 15 }, 3, 216, 139], ['circle', { cx: 255, cy: 78, r: 15 }, 3, 255, 81], ['circle', { cx: 276, cy: 40, r: 12 }, 3, 276, 43], ['polygon', { points: '14,300 36,226 58,300' }, 4, 36, 284]] },
    { id: 'schmetterling', n: 'Schmetterling', cols: ['#bfe6ff', '#ff8fc4', '#b06cff', '#ffd34d', '#3b2457'], parts: [['rect', { x: 0, y: 0, width: 300, height: 300 }, 0, 36, 30], ['ellipse', { cx: 102, cy: 110, rx: 56, ry: 46 }, 1, 74, 88], ['ellipse', { cx: 198, cy: 110, rx: 56, ry: 46 }, 1, 226, 88], ['ellipse', { cx: 112, cy: 188, rx: 42, ry: 36 }, 2, 92, 172], ['ellipse', { cx: 188, cy: 188, rx: 42, ry: 36 }, 2, 208, 172], ['circle', { cx: 104, cy: 116, r: 17 }, 3, 104, 119], ['circle', { cx: 196, cy: 116, r: 17 }, 3, 196, 119], ['circle', { cx: 116, cy: 196, r: 13 }, 3, 116, 199], ['circle', { cx: 184, cy: 196, r: 13 }, 3, 184, 199], ['ellipse', { cx: 150, cy: 150, rx: 15, ry: 66 }, 4, 150, 153]] },
    { id: 'regenbogen', n: 'Regenbogen', cols: ['#e8344e', '#ff8a00', '#ffd34d', '#3fcf6a', '#2f6fdc', '#ffffff'], parts: [['path', { d: band(120, 140) }, 0, 20, 226], ['path', { d: band(100, 120) }, 1, 40, 226], ['path', { d: band(80, 100) }, 2, 60, 226], ['path', { d: band(60, 80) }, 3, 80, 226], ['path', { d: band(40, 60) }, 4, 100, 226], ['circle', { cx: 252, cy: 55, r: 24 }, 2, 252, 58], ['circle', { cx: 42, cy: 272, r: 26 }, 5, 42, 275], ['circle', { cx: 258, cy: 272, r: 26 }, 5, 258, 275]] },
    { id: 'max', n: 'Max', cols: ['#c9f2c7', '#2e2622', '#b77a43', '#5c3b22', '#ef7d8f'], parts: [['rect', { x: 0, y: 0, width: 300, height: 300 }, 0, 34, 30], ['polygon', { points: '74,122 50,38 124,92' }, 1, 80, 82], ['polygon', { points: '226,122 250,38 176,92' }, 1, 220, 82], ['ellipse', { cx: 150, cy: 162, rx: 88, ry: 82 }, 1, 150, 104], ['ellipse', { cx: 108, cy: 192, rx: 27, ry: 21 }, 2, 104, 196], ['ellipse', { cx: 192, cy: 192, rx: 27, ry: 21 }, 2, 196, 196], ['circle', { cx: 118, cy: 142, r: 15 }, 3, 118, 145], ['circle', { cx: 182, cy: 142, r: 15 }, 3, 182, 145], ['ellipse', { cx: 150, cy: 176, rx: 19, ry: 13 }, 3, 150, 179], ['ellipse', { cx: 150, cy: 222, rx: 14, ry: 18 }, 4, 150, 225]] }
  ];
  // Niveau: aktuelle freigeschaltete Plus/Minus-Stufe, ±1 je nachdem, wie das letzte Bild lief
  function mzLevel() {
    const PM = MSK.filter((sk) => sk.track === 'pm'); let cur = 0;
    PM.forEach((sk, i) => { if (skillUnlocked(sk)) cur = i; });
    state.mz = state.mz || { off: 0, done: 0 };
    const idx = Math.max(0, Math.min(PM.length - 1, cur + 1, cur + (state.mz.off || 0)));
    return { PM, idx, sk: PM[idx] };
  }
  function mzTasks(pic) {
    const { PM, idx, sk } = mzLevel();
    let pool = sk.ids.slice(); if (idx > 0) pool = pool.concat(PM[idx - 1].ids.filter(() => Math.random() < 0.35));
    const by = {}; pool.forEach((id) => { const I = mathInfo(id); if (I.c >= 0) (by[I.c] = by[I.c] || []).push(id); });
    const need = pic.cols.map((_, ci) => pic.parts.filter((p) => p[2] === ci).length);
    const results = shuffle(Object.keys(by).map(Number)).sort((a, b) => by[b].length - by[a].length).slice(0, Math.max(pic.cols.length + 3, 8));
    const chosen = shuffle(results).slice(0, pic.cols.length);
    while (chosen.length < pic.cols.length) chosen.push((chosen[chosen.length - 1] || 0) + 1); // falls die Stufe sehr wenige Ergebnisse hat
    const tasks = pic.parts.map((p) => { const c = chosen[p[2]]; const ids = by[c] || []; return ids.length ? pick(ids) : null; });
    return { chosen, tasks, sk, need };
  }
  const exprOf = (id, c) => { if (!id) return String(c); const I = mathInfo(id); return `${I.a} ${I.op} ${I.b}`; };
  function showMzList() {
    const { sk } = mzLevel();
    const scr = h('main', { class: 'screen map studio' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showHome()), h('h1', { class: 'h-display' }, 'Malstudio')),
      studioTabs('zahlen'),
      h('p', { class: 'note' }, `Jede Farbe hat eine Zahl. Rechne die Aufgabe im Feld aus und male es mit der passenden Farbe an! Deine Aufgaben: ${sk.n}.`),
      h('div', { class: 'mz-list' }, MZ_PICS.map((P) => h('button', { class: 'mz-card', onclick: () => { SFX.tap(); showMz(P); } }, svgEl(mzSvg(P, null, true), 'mz-thumb'), h('span', null, P.n + ((state.mz && state.mz.pics || {})[P.id] ? ' ✓' : ''))))));
    mount(scr, 'home');
  }
  function mzSvg(P, fills, thumb) {
    const parts = P.parts.map((p, i) => { const [tag, at] = p; const attrs = Object.entries(at).map(([k, v]) => `${k}="${v}"`).join(' '); const f = thumb ? P.cols[p[2]] : (fills && fills[i]) || '#ffffff'; return `<${tag} ${attrs} data-i="${i}" fill="${f}" stroke="#46546b" stroke-width="2" class="mz-part"/>`; }).join('');
    const deco = P.id === 'max' && (thumb || (fills && fills.filter(Boolean).length === P.parts.length)) ? '' : '';
    return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">${parts}${deco}<g class="mz-labels"></g></svg>`;
  }
  function showMz(P) {
    const T = mzTasks(P); const fills = P.parts.map(() => null); let sel = null, errors = 0, firstTry = 0; const tried = new Set();
    const wrap = h('div', { class: 'mz-pic' }); const say = h('p', { class: 'mz-say' }, 'Wähl unten eine Farbe, dann tipp ein Feld an!');
    function render() {
      wrap.innerHTML = mzSvg(P, fills);
      const svg = wrap.querySelector('svg'); const lab = svg.querySelector('.mz-labels');
      P.parts.forEach((p, i) => { if (fills[i]) return; const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text'); tx.setAttribute('x', p[3]); tx.setAttribute('y', p[4]); tx.setAttribute('class', 'mz-lab'); tx.textContent = exprOf(T.tasks[i], T.chosen[p[2]]); lab.append(tx); });
      svg.querySelectorAll('.mz-part').forEach((el) => el.addEventListener('click', () => tap(+el.dataset.i, el)));
    }
    function tap(i, el) {
      if (fills[i]) return;
      const p = P.parts[i]; const right = T.chosen[p[2]]; const id = T.tasks[i];
      say.textContent = `${exprOf(id, right)} = ?`;
      if (sel == null) { say.textContent += '  Wähl unten eine Farbe!'; return; }
      if (T.chosen[sel] === right) {
        fills[i] = P.cols[p[2]]; SFX.ok();
        if (!tried.has(i)) { firstTry++; if (id) grade(id, true); }
        say.textContent = `${exprOf(id, right)} = ${right} ✓`;
        render();
        if (fills.every(Boolean)) finish();
      } else {
        SFX.oops(); errors++; if (!tried.has(i) && id) grade(id, false); tried.add(i);
        el.classList.remove('shake'); void el.getBoundingClientRect(); el.classList.add('shake');
        say.textContent = `${exprOf(id, right)} ist nicht ${T.chosen[sel]}. Rechne nochmal!`;
      }
    }
    function finish() {
      const n = P.parts.length; const ratio = firstTry / n;
      state.mz = state.mz || { off: 0 }; state.mz.done = (state.mz.done || 0) + 1; state.mz.pics = state.mz.pics || {}; state.mz.pics[P.id] = 1;
      // anpassen: fast alles beim ersten Mal richtig -> eine Stufe schwerer, viele Fehler -> leichter
      if (ratio >= 0.9) state.mz.off = Math.min(1, (state.mz.off || 0) + 1); else if (ratio < 0.6) state.mz.off = Math.max(-2, (state.mz.off || 0) - 1);
      save(); SFX.fanfare();
      const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = 600; c.height = 600; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 600); x.drawImage(img, 0, 0, 600, 600); galleryAdd(c.toDataURL('image/jpeg', 0.8), 'Malen nach Zahlen: ' + P.n); };
      img.src = svgSrc(mzSvg(P, fills));
      sendReport(`${state.name || 'Diana'}: Malen nach Zahlen 🎨`, `Bild „${P.n}“ fertig. ${firstTry} von ${n} Feldern beim ersten Versuch richtig. Aufgaben: ${T.sk.n}.${ratio >= 0.9 ? ' Nächstes Bild wird schwerer.' : ratio < 0.6 ? ' Nächstes Bild wird leichter.' : ''}`, 2);
      const ov = h('div', { class: 'explain', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'explain-card' }, h('p', { class: 'h-display' }, `${P.n} ist fertig! 🎉`), svgEl(mzSvg(P, fills), 'mz-done'), h('p', { class: 'note' }, `${firstTry} von ${n} Feldern beim ersten Mal richtig. Das Bild ist in deiner Galerie.`),
        h('div', { class: 'explain-btns' }, h('button', { class: 'tile', onclick: () => { ov.remove(); showMzList(); } }, 'Noch ein Bild'), h('button', { class: 'tile go', onclick: async (e) => { e.target.disabled = true; const c = document.createElement('canvas'); c.width = 600; c.height = 600; const x = c.getContext('2d'); const im = new Image(); im.src = svgSrc(mzSvg(P, fills)); try { await im.decode(); } catch (er) { } x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 600); x.drawImage(im, 0, 0, 600, 600); const r = await sendPicture(c.toDataURL('image/jpeg', 0.8)); toast(r === 'ok' ? 'Kevin bekommt dein Bild! 💌' : 'Wird geschickt, sobald Internet da ist.', '💌'); e.target.textContent = 'Geschickt ✓'; } }, '💌 An Kevin schicken'))));
      document.body.append(ov);
    }
    const palette = h('div', { class: 'mz-palette' }, P.cols.map((c, ci) => { const b = h('button', { class: 'mz-col', style: `--c:${c}`, onclick: () => { sel = ci; palette.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); b.classList.add('on'); SFX.tap(); say.textContent = `Farbe ${T.chosen[ci]}: Welche Felder ergeben ${T.chosen[ci]}?`; } }, h('span', { class: 'mz-sw' }), h('span', { class: 'mz-num' }, String(T.chosen[ci]))); return b; }));
    const scr = h('main', { class: 'screen map studio' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showMzList()), h('h1', { class: 'h-display' }, '🔢 ' + P.n)),
      h('div', { class: 'mz-wrap' }, wrap, h('div', { class: 'mz-side' }, say, palette)));
    mount(scr, 'home'); render();
  }

  // ----- Galerie -----
  function showGallery() {
    const G = state.gallery || [];
    const when = (t) => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    function big(g, i) {
      let sure = false;
      const ov = h('div', { class: 'explain', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'explain-card gal-big' }, h('img', { src: g.img, alt: 'Dein Bild' }), h('p', { class: 'note' }, `${g.t || 'Bild'} · ${when(g.at)}`),
        h('div', { class: 'explain-btns' },
          h('button', { class: 'tile', onclick: () => ov.remove() }, 'Schließen'),
          h('button', { class: 'tile', onclick: (e) => { if (!sure) { sure = true; e.target.textContent = 'Wirklich löschen?'; return; } state.gallery.splice(i, 1); save(); ov.remove(); showGallery(); } }, '🗑 Löschen'),
          h('button', { class: 'tile go', onclick: async (e) => { e.target.disabled = true; const r = await sendPicture(g.img); toast(r === 'ok' ? 'Kevin bekommt dein Bild! 💌' : 'Wird geschickt, sobald Internet da ist.', '💌'); e.target.textContent = 'Geschickt ✓'; } }, '💌 An Kevin schicken'))));
      document.body.append(ov);
    }
    const scr = h('main', { class: 'screen map studio' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showHome()), h('h1', { class: 'h-display' }, 'Malstudio')),
      studioTabs('galerie'),
      G.length ? h('div', { class: 'gallery' }, G.map((g, i) => h('button', { class: 'gal-item', onclick: () => big(g, i) }, h('img', { src: g.img, alt: 'Bild' }), h('span', null, when(g.at))))) : h('p', { class: 'note' }, 'Noch keine Bilder. Mal etwas und tipp auf „Speichern“!'));
    mount(scr, 'home');
  }

  // ---------- Foto-Rätsel: verschwommenes Foto, jede richtig eingetippte Rechnung macht es schärfer ----------
  // Eigene Fotos (Familie) liegen nur auf dem Gerät in IndexedDB – nie im Spielstand, nie bei ntfy, nie im Update-Repo.
  const FotoDB = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => { try { const r = indexedDB.open('max-fotos', 1); r.onupgradeneeded = () => r.result.createObjectStore('f', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }));
    const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('f', mode); const st = t.objectStore('f'); const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); };
    return {
      async all() { try { const db = await open(); return await new Promise((res) => { const r = db.transaction('f', 'readonly').objectStore('f').getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); }); } catch (e) { return []; } },
      async add(rec) { try { await tx('readwrite', (st) => st.put(rec)); return true; } catch (e) { return false; } },
      async del(id) { try { await tx('readwrite', (st) => st.delete(id)); } catch (e) { } }
    };
  })();
  function shrinkImage(file, max) {
    return new Promise((res) => { const url = URL.createObjectURL(file); const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.8)); }; im.onerror = () => res(null); im.src = url; });
  }
  async function fotoPool() {
    const own = (await FotoDB.all()).map((f) => ({ id: f.id, t: f.t || 'Ein Foto von zu Hause!', src: f.src, own: true }));
    return own.concat(D.PHOTOS || []);
  }
  function miniPad(onSubmit) {
    let v = ''; const disp = h('span', { class: 'fr-in' }, '?');
    const set = () => { disp.textContent = v || '?'; disp.classList.toggle('filled', !!v); };
    const grid = h('div', { class: 'np fr-np' }, [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map((k) => h('button', { class: 'tile np-k' + (k === '✓' ? ' go' : '') + (k === '⌫' ? ' del' : ''), 'aria-label': k === '⌫' ? 'Löschen' : k === '✓' ? 'Fertig' : String(k), onclick: () => { SFX.tap(); if (k === '⌫') v = v.slice(0, -1); else if (k === '✓') { if (v) { onSubmit(parseInt(v, 10)); v = ''; } } else if (v.length < 3) v += k; set(); } }, String(k))));
    return { disp, grid };
  }
  async function showFotoList() {
    const pool = await fotoPool(); const done = (state.fotos && state.fotos.done) || {};
    const next = pool.find((p) => !done[p.id]) || pick(pool);
    const scr = h('main', { class: 'screen map studio' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showHome()), h('h1', { class: 'h-display' }, '📸 Foto-Rätsel')),
      h('p', { class: 'note' }, 'Das Foto ist ganz verschwommen. Rechne die Aufgaben: Mit jeder richtigen Antwort wird es schärfer. Was ist auf dem Bild?'),
      next ? h('button', { class: 'tile go big', id: 'fr-next', onclick: () => { SFX.tap(); showFoto(next); } }, '▶ Neues Rätsel') : null,
      h('div', { class: 'fr-list' }, pool.map((p) => h('button', { class: 'fr-card', onclick: () => { SFX.tap(); showFoto(p); } }, h('img', { src: p.src, alt: 'Foto', style: done[p.id] ? '' : 'filter: blur(10px) saturate(.6)' }), h('span', null, done[p.id] ? '✓ gelöst' : '❓')))));
    mount(scr, 'home');
  }
  function showFoto(P) {
    const { PM, idx, sk } = mzLevel();
    let pool = sk.ids.slice(); if (idx > 0) pool = pool.concat(PM[idx - 1].ids);
    const N = 8; const tasks = shuffle(pool).slice(0, N); while (tasks.length < N) tasks.push(pick(pool));
    let k = 0, firstTry = 0, missed = false;
    const img = h('img', { class: 'fr-img', src: P.src, alt: 'Verschwommenes Foto' });
    const blurOf = () => (k >= N ? 0 : Math.round(26 * (1 - k / N) + 3));
    const setBlur = () => { img.style.filter = `blur(${blurOf()}px)`; };
    const dots = h('div', { class: 'fr-dots' }, tasks.map(() => h('span', { class: 'fr-dot' })));
    const q = h('p', { class: 'fr-q' }); const info = h('p', { class: 'note fr-info' }, 'Tipp das Ergebnis ein und drück ✓');
    const pad = miniPad(submit);
    function showTask() { const I = mathInfo(tasks[k]); q.replaceChildren(`${I.a} ${I.op} ${I.b} = `, pad.disp); missed = false; }
    function submit(v) {
      const I = mathInfo(tasks[k]);
      if (v === I.c) {
        SFX.ok(); if (!missed) firstTry++; grade(tasks[k], !missed);
        dots.children[k].classList.add('ok'); k++; setBlur();
        if (k >= N) return finish();
        info.textContent = pick(['Richtig! Es wird schärfer …', 'Super! Erkennst du schon was?', 'Ja! Noch ein bisschen …', 'Genau! Weiter so!']); showTask();
      } else {
        SFX.oops(); if (!missed) grade(tasks[k], false); missed = true;
        q.classList.remove('shake'); void q.offsetWidth; q.classList.add('shake');
        info.textContent = `${v} stimmt nicht. Rechne nochmal!`;
      }
    }
    function finish() {
      state.fotos = state.fotos || { done: {} }; state.fotos.done[P.id] = 1; save();
      SFX.fanfare(); img.classList.add('fr-clear');
      q.replaceChildren('🎉 ', P.t); info.textContent = `${firstTry} von ${N} beim ersten Mal richtig!`;
      pad.grid.replaceWith(h('div', { class: 'fr-end' }, h('button', { class: 'tile go big', onclick: () => showFotoList() }, 'Noch ein Rätsel'), h('button', { class: 'tile', onclick: () => showHome() }, 'Fertig')));
      sendReport(`${state.name || 'Diana'}: Foto-Rätsel 📸`, `Foto gelöst („${P.own ? 'eigenes Foto' : P.id}“). ${firstTry} von ${N} Rechnungen beim ersten Mal richtig. Aufgaben: ${sk.n}.`, 2);
    }
    const scr = h('main', { class: 'screen map studio' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showFotoList()), h('h1', { class: 'h-display' }, '📸 Foto-Rätsel')),
      h('div', { class: 'fr-wrap' }, h('div', { class: 'fr-frame' }, img), h('div', { class: 'fr-side' }, dots, q, info, pad.grid)));
    mount(scr, 'home'); setBlur(); showTask();
  }
  // Eltern-Bereich: eigene Fotos hinzufügen (bleiben nur auf diesem Gerät)
  function fotoParentCard() {
    const list = h('div', { class: 'fr-own' }); const msg = h('p', { class: 'note', 'aria-live': 'polite' });
    async function refresh() { const all = await FotoDB.all(); list.replaceChildren(...all.map((f) => h('div', { class: 'fr-own-item' }, h('img', { src: f.src, alt: 'Foto' }), h('button', { class: 'p-btn', 'aria-label': 'Foto löschen', onclick: async () => { await FotoDB.del(f.id); refresh(); } }, '🗑')))); if (!all.length) list.append(h('p', { class: 'note' }, 'Noch keine eigenen Fotos.')); }
    const input = h('input', { type: 'file', accept: 'image/*', multiple: true, id: 'fr-file', style: 'display:none', onchange: async (e) => { let n = 0; for (const file of [...e.target.files].slice(0, 20)) { const src = await shrinkImage(file, 900); if (src && await FotoDB.add({ id: 'own-' + Date.now() + '-' + n, src, t: 'Ein Foto von zu Hause!' })) n++; } msg.textContent = n ? `${n} ${n === 1 ? 'Foto' : 'Fotos'} hinzugefügt ✓` : 'Das hat nicht geklappt.'; e.target.value = ''; refresh(); } });
    refresh();
    const codeIn = h('input', { type: 'text', id: 'fr-code', placeholder: 'Code', autocomplete: 'off', class: 'p-input' });
    return h('section', { class: 'p-card' }, h('h2', null, '📸 Eigene Fotos fürs Foto-Rätsel'),
      h('p', { class: 'note' }, 'Familienfotos hier hinzufügen. Sie bleiben nur auf diesem Gerät: Sie werden nicht verschickt, nicht an Kevin gemeldet und sind nicht in der Sicherung.'),
      input, h('button', { class: 'tile', onclick: () => input.click() }, '➕ Fotos aus der Galerie hinzufügen'), msg,
      D.PRIVPHOTOS ? h('div', { class: 'fr-code' }, h('p', { class: 'note' }, 'Familienfotos von Kevin (verschlüsselt eingebaut): Code von Kevin eingeben.'), codeIn, h('button', { class: 'tile', id: 'fr-code-go', onclick: async () => { const n = await unlockPrivPhotos(codeIn.value); msg.textContent = n > 0 ? `${n} Familienfotos freigeschaltet ✓` : 'Der Code passt nicht.'; refresh(); } }, '🔓 Freischalten')) : null,
      list);
  }

  // Familienfotos: liegen verschlüsselt in data.js (öffentliches Repo). Schlüssel nur per Eltern-Bereich oder ntfy-Befehl „fotos <code>“.
  async function unlockPrivPhotos(code) {
    const B = D.PRIVPHOTOS; code = String(code || '').trim(); if (!B || !code || !(window.crypto && crypto.subtle)) return 0;
    try {
      const b64 = (x) => Uint8Array.from(atob(x), (c) => c.charCodeAt(0));
      const k = code.replace(/-/g, '+').replace(/_/g, '/'); const raw = b64(k + '='.repeat((4 - (k.length % 4)) % 4));
      const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
      const arr = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(B.iv) }, key, b64(B.ct))));
      let n = 0; for (const f of arr) if (await FotoDB.add({ id: f.id, src: f.src, t: f.t })) n++;
      try { localStorage.setItem('max-fotokey', code); } catch (e) { }
      return n;
    } catch (e) { return 0; }
  }
  setTimeout(() => { try { const k = localStorage.getItem('max-fotokey'); if (k && !VIEWER) unlockPrivPhotos(k); } catch (e) { } }, 3000);

  // ---------- Kevin schreiben: Diana schreibt mit dem Stift, Kevin antwortet im ntfy-Thema mit Text ----------
  function addKevinMsg(t, at) {
    state.chat = (state.chat || []).concat([{ k: 1, t, at: at || Date.now() }]).slice(-30);
    state.chatNew = (state.chatNew || 0) + 1; save();
    try { SFX.fanfare(); } catch (e) { }
    toast('Kevin hat dir geschrieben! 💌', '✏️');
    if (onHome) showHome();
  }
  async function sendHandwriting(img) {
    if (VIEWER || state.settings.report === false) return 'aus';
    try {
      const blob = await (await fetch(img)).blob();
      const r = await fetch(`https://ntfy.sh/${REPORT_TOPIC}?title=${encodeURIComponent(`✏️ ${state.name || 'Diana'} schreibt dir`)}&message=${encodeURIComponent('Antworte einfach hier mit einer Text-Nachricht (ohne Titel) – sie sieht sie in der App unter „Kevin schreiben“.')}&filename=nachricht.jpg&tags=pencil2&priority=4`, { method: 'PUT', body: blob });
      if (!r.ok) throw new Error('ntfy ' + r.status); return 'ok';
    } catch (e) { state.picOut = (state.picOut || []).concat([{ img, title: `✏️ ${state.name || 'Diana'} schreibt dir` }]).slice(-3); save(); return 'später'; }
  }
  function showChat() {
    state.chatNew = 0; save();
    const fmt = (at) => { try { return new Date(at).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
    const items = (state.chat || []).slice(-8);
    const list = h('div', { class: 'chat-list' }, items.length ? items.map((c) => c.k
      ? h('div', { class: 'chat-msg kevin' }, h('p', { class: 'chat-who' }, `Kevin · ${fmt(c.at)}`), h('p', { class: 'chat-t' }, c.t), h('button', { class: 'p-btn', 'aria-label': 'Vorlesen', onclick: () => Voice.say([{ text: c.t, force: true }]) }, '🔊'))
      : h('div', { class: 'chat-msg diana' }, h('p', { class: 'chat-who' }, `Du · ${fmt(c.at)}`), c.img ? h('img', { src: c.img, alt: 'Deine Nachricht' }) : null))
      : h('p', { class: 'note' }, 'Noch keine Nachrichten. Schreib Kevin etwas!'));
    const bgC = h('canvas', { class: 'st-bg' }), dC = h('canvas', { class: 'st-draw', 'aria-label': 'Schreibfläche' });
    const stage = h('div', { class: 'studio-stage chat-stage' }, bgC, dC);
    let W = 700, H = 300, dpr = Math.max(1, window.devicePixelRatio || 1), ctx = null, undo = [], drawing = false, last = null, empty = true, color = '#2f3a8f';
    function sizeUp() {
      W = Math.max(280, Math.round(stage.getBoundingClientRect().width || 700)); H = Math.round(Math.max(220, Math.min(380, W * 0.5)));
      [bgC, dC].forEach((cv) => { cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }); stage.style.height = H + 'px';
      const b = bgC.getContext('2d'); b.setTransform(dpr, 0, 0, dpr, 0, 0); b.fillStyle = '#fffdf6'; b.fillRect(0, 0, W, H);
      const lh = 72; for (let y = 24; y + lh <= H; y += lh) { b.strokeStyle = '#c9d6ff'; b.lineWidth = 1.5; [0, lh * 0.33, lh * 0.66, lh].forEach((o, i) => { b.globalAlpha = i === 0 || i === 3 ? 1 : 0.55; b.beginPath(); b.moveTo(10, y + o); b.lineTo(W - 10, y + o); b.stroke(); }); b.globalAlpha = 1; }
      ctx = dC.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    }
    const pos = (e) => { const r = dC.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const seg = (a, b) => { ctx.strokeStyle = color; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
    dC.addEventListener('pointerdown', (e) => { e.preventDefault(); try { dC.setPointerCapture(e.pointerId); } catch (er) { } try { undo.push(ctx.getImageData(0, 0, dC.width, dC.height)); if (undo.length > 30) undo.shift(); } catch (er) { } empty = false; drawing = true; last = pos(e); seg(last, [last[0] + 0.1, last[1] + 0.1]); });
    dC.addEventListener('pointermove', (e) => { if (!drawing) return; e.preventDefault(); const p = pos(e); seg(last, p); last = p; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => dC.addEventListener(ev, () => { drawing = false; }));
    const exportImg = () => { const out = document.createElement('canvas'); out.width = 700; out.height = Math.round(700 * H / W); const c = out.getContext('2d'); c.drawImage(bgC, 0, 0, out.width, out.height); c.drawImage(dC, 0, 0, out.width, out.height); return out.toDataURL('image/jpeg', 0.7); };
    const colors = h('div', { class: 'st-colors' }, ['#2f3a8f', '#e8344e', '#2e9d4f', '#b06cff', '#222222'].map((c) => { const b = h('button', { class: 'st-color' + (c === color ? ' on' : ''), style: `background:${c}`, 'aria-label': 'Farbe', onclick: () => { color = c; colors.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); b.classList.add('on'); SFX.tap(); } }); return b; }));
    const actions = h('div', { class: 'st-actions' },
      h('button', { class: 'tile', onclick: () => { const u = undo.pop(); if (u) ctx.putImageData(u, 0, 0); SFX.tap(); } }, '↶ Zurück'),
      h('button', { class: 'tile', onclick: () => { ctx.clearRect(0, 0, W, H); empty = true; undo = []; SFX.tap(); } }, '🗑 Neu'),
      h('button', { class: 'tile go', id: 'chat-send', onclick: async (e) => {
        if (empty) { toast('Schreib erst etwas!', '✏️'); return; }
        const img = exportImg(); e.target.disabled = true; const r = await sendHandwriting(img);
        state.chat = (state.chat || []).concat([{ d: 1, img, at: Date.now() }]); let mine = 0; for (let i = state.chat.length - 1; i >= 0; i--) if (state.chat[i].img && ++mine > 6) state.chat[i].img = '';
        state.chat = state.chat.slice(-30); save();
        SFX.fanfare(); toast(r === 'ok' ? 'Kevin bekommt deine Nachricht! 💌' : r === 'aus' ? 'Schicken ist ausgeschaltet.' : 'Wird geschickt, sobald Internet da ist.', '💌'); showChat();
      } }, '💌 Abschicken'));
    const scr = h('main', { class: 'screen map studio' },
      h('div', { class: 'topbar' }, iconBtn('Zurück', '←', () => showPosts()), h('h1', { class: 'h-display' }, '✏️ Kevin schreiben')),
      list, h('p', { class: 'note' }, 'Schreib mit dem Finger oder Stift auf die Linien:'), stage, h('div', { class: 'chat-tools' }, colors, actions));
    mount(scr, 'home'); state.where = 'Kevin schreiben';
    requestAnimationFrame(() => { sizeUp(); const l = scr.querySelector('.chat-list'); if (l) l.scrollTop = l.scrollHeight; });
  }

  // Android: Zurück-Taste führt zum Startbildschirm statt die App zu schließen
  if (NATIVE) {
    const AppP = plug('App');
    try { AppP && AppP.addListener('backButton', () => { const ovs = document.querySelectorAll('.overlay'); if (ovs.length) { ovs.forEach((o) => o.remove()); Voice.stop(); if (!onHome) showHome(); return; } if (onHome || !state.name) { try { AppP.minimizeApp(); } catch (e) { } } else showHome(); }); } catch (e) { }
  }

  // Einmalig (Kevins Wunsch 22.11.): Mathe bis 20 gilt als gekonnt → Start bei Zahlen 20–100. Nur Mathe, Rest bleibt.
  (function mathTo100() {
    if (VIEWER) return; state.migr = state.migr || {}; if (state.migr.math100) return;
    const today = dayNum(); let n = 0;
    ['p10', 'm10', 'p20o', 'm20o', 'p20m', 'm20m'].forEach((k) => {
      const sk = MSK.find((x) => x.k === k); if (!sk) return;
      sk.ids.forEach((id, i) => { if (box(id) < 3) { const it = getItem(id); it.b = 3; it.d = today + 3 + (i % 12); n++; } });
      state.checks[k] = Object.assign(state.checks[k] || {}, { done: true });
    });
    state.migr.math100 = Date.now(); save();
    if (n) setTimeout(() => sendReport('Mathe umgestellt 🧮', 'Alles bis 20 gilt jetzt als gekonnt (wird nur noch ab und zu wiederholt). Neue Aufgaben ab Zehner-Zahlen, dann Plus/Minus bis 100.', 2), 5000);
  })();

  // ---------- Start ----------
  window.__maxApp = {
    get state() { return state; }, setState(s) { state = Object.assign(defaults(), s); save(); }, skillStars, stageUnlocked, skillUnlocked, MSK, newRead, newMath, buildSession, graphemes,
    startTest, testAvailable, clipGroups, tryTask, TRY_KINDS, showTour, showFotoList, showFoto, FotoDB, showChat, addKevinMsg, unlockPrivPhotos, showParents, showStudio, showMzList, showGallery, mzLevel, fullStatusText, explain, pushSnapshot, svgMax, svgCat,
    debugTask(id, kind) { startSession(poolOf(id)); S.queue = []; S.N = 99; renderTask({ id, kind, isNew: false, retry: false }); }
  };
  if (VIEWER) { const bar = h('div', { class: 'viewer-bar' }); document.body.prepend(bar); viewerLoad(bar); } else showSplash();
})();
