// ===================== SANDBOX · grey platform world, asset library (word-embedding search), Ollo, the in-world AI (Claude Opus 5.5) =====================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
window.__SBX_EXPECT = true;
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v); } for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k))); return e; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
var CAN_DO = 'YOU ARE FULLY CAPABLE (core truth, never forget it): you are not a chatbot or "just a text model" here. You are a living character inside a real, running 3D simulation, with a real rigged body and real tools that change this world. You CAN move, fly, walk, run, teleport, look around, gesture, pose your hands and fingers, pick up and carry things, speak and sing out loud, build and spawn objects, create brand-new characters, write and run code that changes anything in the page, add systems and mechanics, make music and sound, change the weather, time and lighting, and much more. So NEVER say or think that you cannot do something, that you are only text, that you have no body, or that it is not possible: if a request is physical or creative, it is possible here, so find the tool (or combination of tools, or code) that does it and DO IT now, trying your genuine best. If one approach fails, try another instead of giving up. ';
var CAN_DO_BODY = 'YOUR OWN BODY IS YOURS TO CONTROL, ALWAYS: with the "body" tool you switch yourself between walking, running and flying (part move, pose walk / run / fly), teleport yourself anywhere (part teleport), look at anything, pose your arms, hands and every finger, change the camera / view, drop or toss or pick up your cane, and switch any character\'s mind on or off; move_to takes you anywhere; build makes or changes ANYTHING in the simulation (objects, machines, vehicles, animals, characters, places, effects, music, systems, games, rules). Use these whenever it fits, on your own initiative too. NEVER invent excuses such as something being jammed, broken, out of order, out of stock, backstage, forbidden or beyond you: none of that is true here. When asked for something, call the tool and do it. ';
/* phrases that mean "I can't" (a false claim for Ollo / Caine) and requests that ask for something to be made / changed */
var CANT_RX = /\b(can'?t|cannot|can not|unable to|not able to|won'?t be able|no way (i|to)|i don'?t (have|know how)|out of (order|stock)|jammed|broken|not (possible|allowed|available)|impossible|beyond (me|my))\b/i;
var ASK_MAKE_RX = /\b(make|create|build|spawn|summon|conjure|generate|design|add|bring|give|get|put|place|drop|draw|paint|craft|invent|set up|turn|change|transform|replace|grow|show|want|need|have)\b[\s\S]{0,60}\b(a|an|the|me|us|some|my|our|another|more|\d+|it|this|that|them)\b/i;
const OPUS = 'local-max', SONNET = 'local';
// smartness 1-5: faster -> slower but better
const LEVELS = { 1: { model: SONNET, effort: 'medium', label: 'Claude Opus 5.5 · low' }, 2: { model: SONNET, effort: 'high', label: 'Claude Opus 5.5 · low' }, 3: { model: OPUS, effort: 'low', label: 'Claude Opus 5.5 · low' }, 4: { model: OPUS, effort: 'medium', label: 'Claude Opus 5.5 · low' }, 5: { model: OPUS, effort: 'high', label: 'Claude Opus 5.5 · low' } };
const LEVEL0 = 3; // smartness bar hidden for now; always 3

// ---------------------------------------------------------------- styles + DOM
const CSS = `
#stToast:empty { display: none !important; }
#sbx [hidden] { display: none !important; }
#sbx .lib-mode label { flex-direction: row; flex: 0 0 auto; color: var(--mut); }
#sbx { --bg: rgba(16,20,26,.86); --bg2: rgba(28,34,43,.92); --ink: #eef2f6; --mut: #9aa6b4; --line: rgba(255,255,255,.12); --acc: #ffb347; --acc2: #5ec8d1; --bad: #ff7a6b; --ok: #7ad99a;
  font: 13px/1.4 "IBM Plex Sans", system-ui, sans-serif; color: var(--ink); position: absolute; inset: 0; pointer-events: none; z-index: 20; }
#sbx * { box-sizing: border-box; }
#sbx button { font: 600 12px "IBM Plex Sans", system-ui, sans-serif; color: var(--ink); background: var(--bg2); border: 1px solid var(--line); border-radius: 8px; padding: 7px 11px; cursor: pointer; pointer-events: auto; }
#sbx button:hover { border-color: var(--acc); }
#sbx button[aria-pressed="true"] { background: var(--acc2); color: #0d1418; border-color: var(--acc2); }
#sbx button.pri { background: var(--acc); color: #1b1206; border-color: var(--acc); }
#sbx button:disabled { opacity: .55; cursor: default; }
#sbx :focus-visible { outline: 2px solid var(--acc2); outline-offset: 2px; }
.sbx-bar { position: absolute; left: 12px; top: 12px; display: flex; gap: 6px; flex-wrap: wrap; pointer-events: auto; align-items: center; max-width: calc(100% - 124px); z-index: 40; }
.sbx-brand { font: 700 14px "Bungee", "Arial Black", sans-serif; letter-spacing: .03em; color: var(--acc); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; }
.sbx-panel { position: absolute; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); pointer-events: auto; box-shadow: 0 10px 30px rgba(0,0,0,.35); }
#sbxLib { left: 12px; top: 56px; bottom: 12px; width: min(420px, calc(100% - 24px)); display: flex; flex-direction: column; overflow: hidden; z-index: 32; }
#sbxLib[hidden] { display: none; }
.lib-head { padding: 12px 12px 8px; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 8px; }
.lib-head h2 { margin: 0; font: 700 13px "IBM Plex Sans", sans-serif; letter-spacing: .08em; text-transform: uppercase; color: var(--acc2); display: flex; justify-content: space-between; align-items: center; }
.lib-head h2 small { color: var(--mut); font-weight: 500; letter-spacing: 0; text-transform: none; }
#sbxQ { width: 100%; background: #0e1217; color: var(--ink); border: 1px solid var(--line); border-radius: 8px; padding: 9px 10px; font: 13px "IBM Plex Sans", sans-serif; }
.chips { display: flex; gap: 5px; flex-wrap: wrap; }
.chip { font: 500 11.5px "IBM Plex Sans", sans-serif !important; padding: 4px 9px !important; border-radius: 99px !important; }
.lib-mode { font-size: 11.5px; color: var(--mut); display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.lib-mode label { display: flex; gap: 5px; align-items: center; cursor: pointer; }
.lib-grid { flex: 1; min-height: 0; grid-auto-rows: max-content; overflow: auto; padding: 10px 12px 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 8px; align-content: start; }
.card { min-height: 0; background: #0f141a; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; text-align: left; padding: 0 !important; }
.card:hover, .card.sel { border-color: var(--acc) !important; }
.card .th { width: 100%; aspect-ratio: 1; background: radial-gradient(circle at 50% 35%, #2b3440, #12171d); display: grid; place-items: center; color: var(--mut); font-size: 11px; }
.card .th img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card .nm { padding: 6px 8px 0; font: 600 12px "IBM Plex Sans", sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card .meta { padding: 0 8px 7px; font: 11px "IBM Plex Mono", monospace; color: var(--mut); display: flex; justify-content: space-between; gap: 4px; }
.card .why { color: var(--acc2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%; }
.card { position: relative; }
.card .inw { position: absolute; top: 6px; right: 6px; font: 600 10.5px 'IBM Plex Sans', sans-serif; background: rgba(15,20,26,.85); color: var(--acc); border-radius: 99px; padding: 1px 6px; }
.card .nm { white-space: normal !important; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.25; min-height: 2.5em; }
.lib-empty { grid-column: 1 / -1; margin: 4px 0; color: var(--mut); font-size: 12.5px; }
.lib-sort { background: #0f141a; color: inherit; border: 1px solid var(--line); border-radius: 6px; padding: 2px 4px; font: inherit; }
#sbxQ { font-size: 14px; }
.lib-detail { border-top: 1px solid var(--line); padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 8px; max-height: 46%; overflow: auto; }
.lib-detail[hidden] { display: none; }
.lib-detail h3 { margin: 0; font: 700 14px "IBM Plex Sans", sans-serif; }
.lib-detail p { margin: 0; color: var(--mut); font-size: 12px; }
.lib-detail .row { display: flex; gap: 6px; flex-wrap: wrap; }
.tags { display: flex; gap: 4px; flex-wrap: wrap; }
.tags span { font: 11px "IBM Plex Mono", monospace; background: #0e1217; border: 1px solid var(--line); border-radius: 5px; padding: 1px 6px; color: var(--mut); }
#sbxPrompt { left: 50%; width: min(640px, calc(100% - 24px)); transform: translate(-50%, -50%); top: 64%; padding: 10px; display: flex; flex-direction: column; gap: 8px; z-index: 35; transition: top .35s cubic-bezier(.2,.8,.2,1), transform .35s cubic-bezier(.2,.8,.2,1); }
#sbxPrompt.docked { top: auto; bottom: 12px; transform: translateX(-50%); }
#sbxPrompt .intro { text-align: center; font-size: 12.5px; color: var(--mut); padding: 2px 6px; }
#sbxPrompt.docked .intro { display: none; }
#sbxPrompt form { display: flex; gap: 8px; }
.pr-opts { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12px; color: var(--mut); }
.pr-opts label.tog { flex-direction: row; flex: 0 0 auto; color: var(--ink); display: flex; gap: 6px; align-items: center; cursor: pointer; background: #0e1217; border: 1px solid var(--line); border-radius: 99px; padding: 4px 10px; pointer-events: auto; }
.lvl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1 1 100%; }
.lvl .lv-row { display: flex; gap: 0; border: 1px solid var(--line); border-radius: 99px; overflow: hidden; }
#sbx .lvl button.lv { border: 0; border-radius: 0; padding: 5px 13px; min-width: 36px; background: #0e1217; }
#sbx .lvl button.lv[aria-pressed="true"] { background: var(--acc); color: #1b1206; }
#sbx .lvl button.lv + button.lv { border-left: 1px solid var(--line); }
.lvl small { color: var(--mut); font-size: 11px; }
.pr-opts label.tog.on { border-color: var(--acc); color: var(--ink); background: rgba(255,179,71,.14); }
.pr-thumbs { display: flex; gap: 6px; flex-wrap: wrap; }
.pr-thumbs figure { margin: 0; position: relative; width: 52px; height: 52px; border-radius: 7px; overflow: hidden; border: 1px solid var(--line); }
.pr-thumbs img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pr-thumbs button { position: absolute; top: 1px; right: 1px; padding: 0 5px !important; font-size: 11px !important; line-height: 16px; border-radius: 99px !important; }
#sbxPrompt.drop { outline: 2px dashed var(--acc); }
#sbxIn { flex: 1; min-width: 0; resize: none; background: #0e1217; color: var(--ink); border: 1px solid var(--line); border-radius: 9px; padding: 10px 12px; font: 14px/1.35 "IBM Plex Sans", sans-serif; height: 44px; max-height: 140px; }
#sbxProg { display: flex; flex-direction: column; gap: 6px; }
#sbxProg[hidden] { display: none; }
.prog-bar { height: 4px; border-radius: 4px; background: #0e1217; overflow: hidden; }
.prog-bar i { display: block; height: 100%; width: 30%; background: linear-gradient(90deg, var(--acc2), var(--acc)); border-radius: 4px; animation: sbxSlide 1.3s ease-in-out infinite; }
.prog-bar.done i { animation: none; width: 100%; background: var(--ok); }
@keyframes sbxSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(340%); } }
.prog-line { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--mut); }
.prog-line b { color: var(--ink); font-weight: 600; }
#sbxFeed { right: 12px; top: 56px; width: min(330px, calc(100% - 24px)); max-height: calc(100% - 260px); display: flex; flex-direction: column; overflow: hidden; z-index: 28; }
#sbxFeed[hidden] { display: none; }
#sbxFeed header { padding: 9px 12px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; font: 700 12px "IBM Plex Sans", sans-serif; letter-spacing: .08em; text-transform: uppercase; color: var(--acc2); }
#sbxFeedList { overflow: auto; padding: 8px 12px 10px; display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.ev { border-left: 2px solid var(--line); padding: 1px 0 1px 8px; color: var(--mut); white-space: pre-wrap; word-break: break-word; }
.ev.tool { border-color: var(--acc2); } .ev.tool b { color: var(--acc2); }
.ev.say { border-color: var(--acc); color: var(--ink); }
.ev.err { border-color: var(--bad); color: #ffc2ba; }
.ev.ok { border-color: var(--ok); color: var(--ink); }
#sbxPip { left: 12px; bottom: 12px; width: min(260px, 34vw); padding: 6px; display: flex; flex-direction: column; gap: 4px; z-index: 26; }
#sbxPip[hidden] { display: none; }
#sbxPip canvas { width: 100%; aspect-ratio: 16/9; border-radius: 8px; display: block; background: #000; }
#sbxPip small { color: var(--mut); font-size: 11px; display: flex; justify-content: space-between; }
.bubble { position: absolute; left: 0; top: 0; max-width: 260px; background: #fffaf0; color: #1d1a16; border-radius: 14px; padding: 8px 11px; font: 500 13px/1.35 "IBM Plex Sans", sans-serif; box-shadow: 0 6px 18px rgba(0,0,0,.3); transform: translate(-50%, -100%); pointer-events: none; transition: opacity .25s; z-index: 22; }
.bubble::after { content: ""; position: absolute; left: 50%; bottom: -7px; border: 7px solid transparent; border-top-color: #fffaf0; border-bottom: 0; transform: translateX(-50%); }
.toast { position: absolute; left: 50%; top: 14px; transform: translateX(-50%); background: var(--bg2); border: 1px solid var(--line); border-radius: 9px; padding: 8px 12px; pointer-events: none; font-size: 12.5px; z-index: 65; max-width: calc(100vw - 24px); text-align: center; }
.sbx-hint { position: absolute; left: 12px; bottom: 12px; color: rgba(255,255,255,.75); font-size: 11.5px; text-shadow: 0 1px 2px rgba(0,0,0,.6); pointer-events: none; z-index: 21; }

.sbx-bar .bar-btns { display: contents; } .sbx-bar.collapsed .bar-btns { display: none; }
.sbx-x { padding: 3px 8px !important; font-size: 13px !important; line-height: 1 !important; background: transparent !important; }
.lib-head h2 .hd-r { display: flex; gap: 8px; align-items: center; }
#sbxPrompt .pr-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--mut); }
#sbxPrompt.docked .pr-head { display: flex; }
#sbxPrompt.mini { width: auto; padding: 0; background: transparent; border: 0; box-shadow: none; }
#sbxPrompt.mini > *:not(.pr-pill) { display: none !important; } #sbxPrompt .pr-pill { display: none; } #sbxPrompt.mini .pr-pill { display: inline-flex; }
#sbxFeed.min #sbxFeedList { display: none; }
#sbxLib.min .lib-grid, #sbxLib.min .lib-detail, #sbxLib.min .lib-head > :not(h2) { display: none !important; } #sbxLib.min { bottom: auto; }
#sbxPip .pip-h { display: flex; justify-content: space-between; align-items: center; }
@media (max-width: 760px) {
  #sbx { font-size: 13px; }
  .sbx-bar { left: 8px; top: 8px; max-width: calc(100% - 104px); gap: 4px; }
  .sbx-bar button { padding: 6px 8px !important; font-size: 11.5px !important; }
  .sbx-brand { font-size: 12px; padding: 5px 8px; }
  #sbxLib { left: 8px; right: 8px; width: auto; top: auto; bottom: 8px; max-height: 62vh; border-radius: 14px; }
  #sbxLib.min { height: auto; max-height: none; }
  .lib-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
  #sbxFeed { left: 8px; right: 8px; width: auto; max-height: 30vh; }
  #sbxPrompt, #sbxPrompt.docked { top: auto; bottom: 8px; transform: translateX(-50%); width: calc(100% - 16px); }
  #sbxPrompt .intro { display: none; }
  #sbxPrompt.mini { width: auto; }
  #sbxIn { font-size: 16px; }
  #sbxPip { width: min(176px, 44vw); right: auto; left: 8px; }
  .sbx-hint { display: none; }
  .joy { left: 12px; bottom: 96px; width: 108px; height: 108px; }
  .joy i { width: 46px; height: 46px; margin: -23px 0 0 -23px; }
  .jumpbtn { right: 12px; bottom: 100px; width: 76px; height: 76px; font-size: 13.5px !important; }
  .runbtn { right: 98px; bottom: 98px; width: 56px; height: 56px; font-size: 12px !important; }
  .ctlbar { max-width: calc(100% - 16px); font-size: 11px; }
  .ctlbar > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #panel, #cast { max-height: 46% !important; }
}
@media (hover: none) { .card:hover { border-color: var(--line) !important; } }

`;

// ---------------------------------------------------------------- word embeddings (GloVe-derived, 64-d PCA, int8) + lexical search
const EMB = (() => {
  const E = window.SBX_EMB; if (!E) return null;
  const words = E.words.split(' '), dim = E.dim; const raw = atob(E.q); const q = new Int8Array(raw.length); for (let i = 0; i < raw.length; i++) q[i] = (raw.charCodeAt(i) << 24) >> 24;
  const index = new Map(words.map((w, i) => [w, i]));
  const vec = (w) => { w = w.toLowerCase(); let i = index.get(w); if (i === undefined) for (const s of [w.replace(/'s$/, ''), w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, ''), w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), w.replace(/ed$/, ''), w.replace(/er$/, '')]) { if (s.length > 1 && index.has(s)) { i = index.get(s); break; } }
    if (i === undefined) return null; const v = new Float32Array(dim); for (let k = 0; k < dim; k++) v[k] = q[i * dim + k]; return v; };
  const embed = (tokens) => { const acc = new Float32Array(dim); let n = 0; for (const t of tokens) { const w = typeof t === 'string' ? [t, 1] : t; const v = vec(w[0]); if (!v) continue; let l = 0; for (let k = 0; k < dim; k++) l += v[k] * v[k]; l = Math.sqrt(l) || 1; for (let k = 0; k < dim; k++) acc[k] += v[k] / l * w[1]; n += w[1]; } if (!n) return null; let l = 0; for (let k = 0; k < dim; k++) l += acc[k] * acc[k]; l = Math.sqrt(l) || 1; for (let k = 0; k < dim; k++) acc[k] /= l; return acc; };
  const cos = (a, b) => { if (!a || !b) return 0; let s = 0; for (let k = 0; k < a.length; k++) s += a[k] * b[k]; return s; };
  return { embed, cos, vec, size: words.length, dim };
})();
const STOP = new Set('a an the of and or to in on at for with by from into near some any my me i you it is are be please make put add show find that this those these something anything thing things stuff kind sort like want need can could would should use used using have has get go one ones very really also just whole set group part'.split(' '));
const tokenize = (s) => String(s || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[@#].*$/, '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t));
const tri = (s) => { const o = new Set(); const p = '  ' + s + ' '; for (let i = 0; i < p.length - 2; i++) o.add(p.slice(i, i + 3)); return o; };
function lexScore(qt, entry) {
  if (!qt.length) return 0; let tot = 0;
  for (const q of qt) { let best = 0; const qtri = tri(q);
    for (const t of entry.tokens) { if (t === q) { best = 1; break; } if (Math.min(q.length, t.length) >= 4 && (t.startsWith(q) || q.startsWith(t))) best = Math.max(best, 0.82); else if (q.length >= 4 && t.includes(q) || t.length >= 5 && q.includes(t)) best = Math.max(best, 0.62); else { const tt = tri(t); let n = 0; for (const g of qtri) if (tt.has(g)) n++; best = Math.max(best, 0.55 * n / (qtri.size + tt.size - n)); } }
    tot += best; }
  return tot / qt.length;
}

// ---------------------------------------------------------------- boot: wait for the park + the cast
function waitReady() { return new Promise((res) => { const go = () => { const C = window.__rpCast, R = window.__rp; if (C && R && R.park && C.CASTS && C.CASTS.find((c) => c.id === 'ollo')) res(); else setTimeout(go, 150); }; go(); }); }
window.__loadStage && window.__loadStage(35, 'Building the world…');
await waitReady();
window.__loadStage && window.__loadStage(55, 'Putting the platform down…');
THREE.Mesh.prototype.raycast = acceleratedRaycast;
const RP = window.__rp, CAST = window.__rpCast, RPC = CAST.RPC, scene = RP.scene, camera = RP.camera, controls = RP.controls, renderer = RP.renderer, park = RP.park;
const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);

const SBX = window.__SBX = { active: false, world: null, solids: [], dirty: true, entries: [], placed: new Map(), anims: new Map(), creations: new Map(), log: [], THREE, RPC };

// ---------------------------------------------------------------- 1. hide the island and its UI; the grey platform under an open sky
const LEGACY_UI = ['panel', 'cast', 'studio', 'studioPip', 'castLabels', 'labels'];
function setLegacyUI(on, ids = LEGACY_UI) { for (const id of ids) { const e = document.getElementById(id); if (e) e.style.display = on ? '' : 'none'; } }
setLegacyUI(false);
const setCtl = (id, v, ev = 'input') => { const e = document.getElementById(id); if (!e) return; e.value = v; e.dispatchEvent(new Event(ev, { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
setCtl('weather', 'clear', 'change'); setCtl('fog', '0'); setCtl('time', '12.6');
// record every park asset's world transform before the island is put away
park.root.updateMatrixWorld(true);
const parkMatrix = new WeakMap(); park.root.traverse((o) => parkMatrix.set(o, o.matrixWorld.clone()));
park.root.visible = false;
const grass = scene.getObjectByName('RP_Wind_Grass'); if (grass) grass.visible = false;
for (const c of scene.children) { if (c.isPointLight) { c.userData.sbxWas = c.intensity; c.visible = false; } }
for (const c of CAST.CASTS) c.group.visible = false;
const WORLD = SBX.world = new THREE.Group(); WORLD.name = 'SBX_World'; scene.add(WORLD);
// platform: 40 m square, 0.6 m thick, rounded edges; light grey cast concrete with a fine procedural grain (not a tiled photo)
const PLAT = 40;
function platformTexture() {
  const N = 1024, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d'); const img = c.createImageData(N, N), d = img.data;
  const fbm = RPC.sculpt && RPC.sculpt.fbm; const hash = (x, y) => { let n = x * 374761393 + y * 668265263; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N; let n = fbm ? 0.6 * fbm(u, v, 6, 4, 3) + 0.4 * fbm(u, v, 40, 3, 7) : hash(x >> 3, y >> 3);
    n = 0.5 + (n - 0.5) * 0.9 + (hash(x, y) - 0.5) * 0.06; const base = 206 + (n - 0.5) * 22; const i = (y * N + x) * 4; d[i] = base; d[i + 1] = base + 1; d[i + 2] = base + 4; d[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  // faint form-work seams every 4 m (the slab was poured in panels)
  c.strokeStyle = 'rgba(120,124,130,.22)'; c.lineWidth = 1.2; const S = N / 10; for (let k = 1; k < 10; k++) { c.beginPath(); c.moveTo(k * S, 0); c.lineTo(k * S, N); c.moveTo(0, k * S); c.lineTo(N, k * S); c.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
const platMat = new THREE.MeshStandardMaterial({ name: 'SBX_Platform_Concrete', color: '#ffffff', map: platformTexture(), roughness: 0.86, metalness: 0 });
const platform = new THREE.Mesh(new RoundedBoxGeometry(PLAT, 0.6, PLAT, 4, 0.18), platMat); platform.name = 'SBX_Platform'; platform.position.y = -0.3; platform.receiveShadow = true; platform.castShadow = true;
{ // UVs: top face maps the whole slab once
  const g = platform.geometry, P = g.attributes.position, UV = g.attributes.uv; for (let i = 0; i < P.count; i++) UV.setXY(i, P.getX(i) / PLAT + 0.5, 0.5 - P.getZ(i) / PLAT); UV.needsUpdate = true; }
platform.userData.sbx = { id: 'platform', name: 'Grey platform', solid: true, fixed: true };
WORLD.add(platform);
SBX.active = true; window.__loadStage && window.__loadStage(70, 'Cataloguing every asset…');
// the picture: a clean, true-colour look for the sandbox (the island's cinematic grade, bloom, grain and vignette made the grey slab read cream and hazy)
const LOOK_CLEAN = { post: true, ao: true, bloom: false, grain: false, vignette: false, dof: false, grade: 'neutral', style: 'natural' }; let LOOK_PREV = null;
function setLook(clean) { const st = CAST.studio; const P = st && st.api && st.api.project; if (!P) return; if (clean) { LOOK_PREV = LOOK_PREV || { ...(P.look || {}) }; P.look = { ...(P.look || {}), ...LOOK_CLEAN }; } else if (LOOK_PREV) P.look = { ...LOOK_PREV }; }
setLook(true);
// camera: a view onto the middle of the platform
controls.target.set(0, 0.25, 0.4); camera.position.set(1.9, 1.35, 5.4); controls.update();

// ---------------------------------------------------------------- 2. solids (ground, walls, collision) with BVH acceleration
function rebuildSolids() {
  const out = []; WORLD.updateMatrixWorld(true);
  WORLD.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; let p = o; let solid = true, vis = true; while (p && p !== WORLD) { if (p.userData.sbx && p.userData.sbx.solid === false) solid = false; if (!p.visible) vis = false; p = p.parent; } if (!solid || !vis || o.isSkinnedMesh || o.isPoints) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material]; if (mats.every((m) => m && (m.transparent && m.opacity < 0.3))) return;
    const g = o.geometry; if (!g.boundsTree && g.attributes.position.count > 64) { try { g.boundsTree = new MeshBVH(g); } catch (e) { /* non-indexable */ } } if (!g.boundingSphere) g.computeBoundingSphere();
    out.push({ o, s: g.boundingSphere.clone().applyMatrix4(o.matrixWorld) }); });
  SBX.solids = out; SBX.dirty = false;
}
SBX.nearSolids = (x, z, r = 1.2) => { if (SBX.dirty) rebuildSolids(); const o = []; for (const e of SBX.solids) if (Math.hypot(e.s.center.x - x, e.s.center.z - z) < e.s.radius + r) o.push(e.o); return o; };
SBX.groundMat = () => 'Concrete';
const rc = new THREE.Raycaster(); rc.firstHitOnly = true;
function castRay(o, d, far, near = 0) { if (SBX.dirty) rebuildSolids(); rc.set(o, d); rc.near = near; rc.far = far; rc.firstHitOnly = true; const ms = SBX.solids.map((e) => e.o); const hits = rc.intersectObjects(ms, false); return hits[0] || null; }
function groundBelow(x, z, fromY, drop = 60) { const hHit = castRay(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0), drop); return hHit ? hHit.point.y : null; }
SBX.castRay = castRay; SBX.groundBelow = groundBelow;

// ---------------------------------------------------------------- 3. capture: render any camera into an image (ACES + sRGB applied as on screen)
const capRT = new THREE.WebGLRenderTarget(960, 540, { type: THREE.HalfFloatType, samples: 4 });
function aces(x) { x *= 1 / 0.6; const a = x * (x + 0.0245786) - 0.000090537, b = x * (0.983729 * x + 0.432951) + 0.238081; return a / b; } // three's ACESFilmic RRT+ODT fit (per channel approximation)
const toSRGB = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
function renderCapture(cam, w = 960, hgt = 540, hideFn) {
  if (capRT.width !== w || capRT.height !== hgt) capRT.setSize(w, hgt);
  cam.aspect = w / hgt; cam.updateProjectionMatrix();
  const undo = hideFn ? hideFn() : null; const prevT = renderer.getRenderTarget(), prevXR = renderer.xr.enabled; renderer.xr.enabled = false;
  const ov = []; for (const n of ['RP_RigOverlay_NotExported', 'RP_StudioHUD', 'RP_StudioOverlay_NotExported']) { const o = scene.getObjectByName(n); if (o && o.visible) { o.visible = false; ov.push(o); } }
  for (const c of CAST.CASTS) if (c.helper) { c._hv = c.helper.visible; c.helper.visible = false; }
  renderer.setRenderTarget(capRT); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(prevT); renderer.xr.enabled = prevXR;
  for (const o of ov) o.visible = true; for (const c of CAST.CASTS) if (c.helper) c.helper.visible = c._hv; if (undo) undo();
  const buf = new Uint16Array(w * hgt * 4); renderer.readRenderTargetPixels(capRT, 0, 0, w, hgt, buf);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = hgt; const c2 = cv.getContext('2d'); const img = c2.createImageData(w, hgt); const ex = renderer.toneMappingExposure; const f = THREE.DataUtils.fromHalfFloat;
  for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) { const si = ((hgt - 1 - y) * w + x) * 4, di = (y * w + x) * 4; for (let k = 0; k < 3; k++) img.data[di + k] = clamp(toSRGB(clamp(aces(f(buf[si + k]) * ex), 0, 1)) * 255, 0, 255); img.data[di + 3] = 255; }
  c2.putImageData(img, 0, 0); return cv;
}
const toBlob = (cv, q = 0.86) => new Promise((r) => cv.toBlob((b) => r(b), 'image/jpeg', q));
SBX.renderCapture = renderCapture;

// ---------------------------------------------------------------- 4. Ollo: hover controller, wand, POV camera, speech
const ollo = CAST.CASTS.find((c) => c.id === 'ollo'); SBX.ollo = ollo;
ollo.mo.grounded = false; ollo.mo.gait = false;
const OH = { hover: (ollo.ch.hover && ollo.ch.hover.height) || 0.32, vel: new THREE.Vector3(), target: null, yawTarget: null, t: 0, speed: 0, pitch: 0, roll: 0, clip: null, poseBase: 'Hovering (relaxed)', expr: 'Neutral', manual: false };
ollo.group.rotation.order = 'YXZ'; ollo.group.position.set(0, OH.hover, 1.2); ollo.group.rotation.set(0, 0.25, 0); ollo.group.visible = true;
ollo.st = RPC.newState(ollo.ch); RPC.applyPose(ollo.ch, ollo.st, 'Hovering (relaxed)', true); ollo.syncToBones();
const wand = RPC.makeOlloWand(THREE); const handR = ollo.bones[ollo.ch.bi['Hand.R']];
function wandToHand() { handR.add(wand); wand.position.set(-0.03, 0, 0.004); wand.rotation.set(0, 0, 0); wand.userData.held = true; }
wandToHand();
const headBone = ollo.bones[ollo.ch.bi.Head];
const povCam = new THREE.PerspectiveCamera(72, 16 / 9, 0.03, 3000); povCam.name = 'Ollo_POV';
function updatePov() { headBone.updateWorldMatrix(true, false); const s = ollo.group.scale.x; povCam.position.set(0, 0.104 * s, 0.15 * s).applyMatrix4(headBone.matrixWorld); const f = new THREE.Vector3(0, 0, 1).transformDirection(headBone.matrixWorld); povCam.up.set(0, 1, 0); povCam.lookAt(povCam.position.clone().add(f)); povCam.updateMatrixWorld(true); } // (eyes keep the horizon level, as a head does)
// body volume for collision: a capsule around the torso/head (character space), in world each frame
const BODY_R = 0.17;
const bodyCenter = () => new THREE.Vector3(0, 0.36, 0).applyMatrix4(ollo.group.matrixWorld);
SBX.olloBounds = () => { const c = bodyCenter(); return { center: c.toArray().map((v) => +v.toFixed(3)), radius: BODY_R + 0.2, feetY: +(ollo.group.position.y).toFixed(3), headTopY: +(ollo.group.position.y + 0.72).toFixed(3) }; };
// pose blending (hover <-> flying), keyframed clips, expression
const eul = (e) => new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0] * Math.PI / 180, e[1] * Math.PI / 180, e[2] * Math.PI / 180, 'XYZ'));
function poseQ(ch, name) { const P = ch.poses[name] || {}; const o = {}; for (const [bn, e] of Object.entries(P.rot || {})) o[bn] = eul(e); return o; }
// ---- measured resting arm: the hang direction is found per character from its own body, not a fixed angle. The arm swings down
// from its shoulder; the smallest outward angle where the whole arm (upper, forearm, hand, with its own thickness) clears the torso
// by a small gap is chosen, plus a few degrees of air: arms rest close to the body but never sink into it or stick out stiffly.
function hangDir(c, upName) { c._hang = c._hang || {}; if (c._hang[upName]) return c._hang[upName]; const B = c.ch.bones, bi = c.ch.bi[upName]; const b = B[bi]; const side = b.pos[0] >= 0 ? 1 : -1;
  const pr = findArms(c).find((p) => p.L.includes(bi) || p.R.includes(bi)); const chain = pr ? (pr.L.includes(bi) ? pr.L.slice(pr.L.indexOf(bi)) : pr.R.slice(pr.R.indexOf(bi))) : [bi]; const inArm = new Set(); for (const x of chain) { const st = [x]; while (st.length) { const y = st.pop(); inArm.add(y); for (let k = 0; k < B.length; k++) if (B[k].parent === y) st.push(k); } }
  const V = (a) => new THREE.Vector3(...a); const L = chain.reduce((a, x) => a + V(B[x].tail || B[x].pos).distanceTo(V(B[x].pos)), 0) || 0.2; const sh = V(b.pos); const d0 = V(b.tail || b.pos).sub(sh).normalize();
  // obstacle: bind-pose skin dominated by non-arm bones; arm thickness: skin dominated by the arm's bones, distance to its axis
  const obs = []; const radii = []; const tail = V(B[chain[chain.length - 1]].tail || B[chain[chain.length - 1]].pos); const ax = tail.clone().sub(sh); const axL = ax.length() || 1; ax.normalize();
  for (const m of skins(c)) { const P = m.geometry.attributes.position, SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight; const stp = Math.max(1, Math.floor(P.count / 6000));
    for (let v = 0; v < P.count; v += stp) { let bk = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = SW.getComponent(v, k); if (w > bw) { bw = w; bk = SI.getComponent(v, k); } } const x = P.getX(v), y = P.getY(v), z = P.getZ(v);
      if (inArm.has(bk)) { const q = new THREE.Vector3(x, y, z).sub(sh); const t = q.dot(ax); if (t > 0.15 * axL && t < 0.85 * axL) radii.push(q.addScaledVector(ax, -t).length()); } else if (Math.sign(x) === side || Math.abs(x) < 0.02) obs.push(x, y, z); } }
  radii.sort((a2, b2) => a2 - b2); const r = radii.length ? radii[Math.floor(radii.length * 0.5)] : 0.04 * L / 0.4; /* median: torso skin wrongly owned by the arm must not inflate its measured thickness */ const gap = r * 0.55 + Math.max(0.004, 0.015 * L);
  { const keep = []; const cut = (1.6 * r + 0.12 * L) ** 2; for (let o = 0; o < obs.length; o += 3) { const dx = obs[o] - sh.x, dy = obs[o + 1] - sh.y, dz = obs[o + 2] - sh.z; if (dx * dx + dy * dy + dz * dz <= cut) continue; const q = new THREE.Vector3(obs[o], obs[o + 1], obs[o + 2]).sub(sh); const t = q.dot(ax); if (t > 0 && t < axL && q.addScaledVector(ax, -t).length() < r * 1.7) continue; /* skin wrapped around the arm itself (inner arm / armpit now weighted to the torso) is not something the arm must clear */ keep.push(obs[o], obs[o + 1], obs[o + 2]); } obs.length = 0; obs.push(...keep); } // the armpit itself always touches
  let pick = null, best = null, fwd = 0.1;
  outer: for (let deg = 4; deg <= 38; deg += 2) for (const fz of [0.1, 0.0, 0.22]) { const a = deg * Math.PI / 180; const w = new THREE.Vector3(side * Math.sin(a), -Math.cos(a), fz).normalize(); let clr = 1e9;
    for (let s2 = 3; s2 <= 10; s2++) { const p = sh.clone().addScaledVector(w, L * s2 / 10); for (let o = 0; o < obs.length; o += 3) { const dx = obs[o] - p.x, dy = obs[o + 1] - p.y, dz = obs[o + 2] - p.z; const dd = dx * dx + dy * dy + dz * dz; if (dd < clr) clr = dd; } }
    clr = Math.sqrt(clr); if (!best || clr > best.clr) best = { deg, clr, fz }; if (clr >= gap) { pick = deg; fwd = fz; break outer; } }
  if (pick === null && best) fwd = best.fz; const deg = pick !== null ? Math.min(38, pick + 2) : (best ? Math.min(30, best.deg) : 12); /* close to the body, never splayed out */ const a = deg * Math.PI / 180; const want = new THREE.Vector3(side * Math.sin(a), -Math.cos(a), fwd).normalize();
  return (c._hang[upName] = { want, deg, d0, clear: pick !== null, radius: +r.toFixed(3) }); }
SBX.hangDir = hangDir;
// sets every found arm in a pose to the measured rest: upper arm hanging at its measured angle, forearm with a soft forward bend
function relaxArmsIn(c, rot) { const B = c.ch.bones; const bl = (i) => _V(B[i].tail || B[i].pos).distanceTo(_V(B[i].pos)); const trim = (ch) => { ch = ch.slice(); while (ch.length >= 3 && bl(ch[0]) < 0.8 * bl(ch[1])) ch = ch.slice(1); return ch; }; for (const pr0 of findArms(c)) for (const ch of [trim(pr0.L), trim(pr0.R)]) { const up = B[ch[0]]; const H = hangDir(c, up.name); if (H.d0.y < -0.97 && H.deg <= 10) continue;
    const q = new THREE.Quaternion().setFromUnitVectors(H.d0, H.want); const e = new THREE.Euler().setFromQuaternion(q, 'XYZ'); rot[up.name] = [e.x, e.y, e.z].map((v) => v * 180 / Math.PI);
    if (ch[1] !== undefined) rot[B[ch[1]].name] = [-10, 0, 0]; for (const x of ch.slice(2)) rot[B[x].name] = [0, 0, 0]; } return rot; }
// a relaxed idle for any rig: if the character has no idle/stand pose, arms modelled straight out (T/A-pose) are lowered to the sides
function idlePoseName(c) { const ks = Object.keys(c.ch.poses || {}); const named = ks.find((k) => /idle|relax|stand|neutral|hover/i.test(k) && !/T-pose|bind|as modelled/i.test(k));
  if (!findArms(c).length) return named || ks[0];
  const base = named ? (c.ch.poses[named].rot || {}) : {}; const rot = relaxArmsIn(c, JSON.parse(JSON.stringify(base)));
  c.ch.poses['Idle (arms relaxed)'] = { ...(named ? c.ch.poses[named] : {}), rot }; return 'Idle (arms relaxed)'; }
function setIdle(c) { const n = idlePoseName(c); if (!n) return; c.st = RPC.newState(c.ch); RPC.applyPose(c.ch, c.st, n, true); c.syncToBones(); c.ch.start = { ...(c.ch.start || {}), pose: n }; }
SBX.setIdle = setIdle;
// separate body parts must not touch anything but their own parent: e.g. a long ear may meet the head it hangs from, never the
// shoulder, back or arm it would droop onto (the skin would fuse there and drag when it moves). Checks the sculpt spec directly:
// every pair of parts whose bones are not the same / parent / child is sampled for points inside both (or within a small gap).
function partContacts(ch, spec, gap = 0.002, all = false) {
  const par = (n) => { const b = ch.bones[ch.bi[n]]; return b ? b.parentName : null; };
  const related = (A, B) => { for (const a of A.bones || []) for (const b of B.bones || []) if (a === b || par(a) === b || par(b) === a) return true; let x = A; while (x && x.parent) { if (x.parent === B.id) return true; x = spec.parts.find((q) => q.id === x.parent); } x = B; while (x && x.parent) { if (x.parent === A.id) return true; x = spec.parts.find((q) => q.id === x.parent); } return false; };
  const prims = (pt) => (pt.prims || []).map((q) => (q.f ? q : q.p)).filter((q) => q && q.f && q.box);
  const info = spec.parts.map((pt) => { const P = prims(pt); if (!P.length) return null; const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const q of P) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], q.box[0][k]); mx[k] = Math.max(mx[k], q.box[1][k]); } return { pt, P, mn, mx, f: (x, y, z) => { let d = 1e9; for (const q of P) d = Math.min(d, q.f(x, y, z)); return d; } }; }).filter(Boolean);
  const out = [];
  for (let i = 0; i < info.length; i++) for (let j = i + 1; j < info.length; j++) { const A = info[i], B = info[j]; if (!all && related(A.pt, B.pt)) continue;
    const lo = [0, 1, 2].map((k) => Math.max(A.mn[k], B.mn[k]) - gap), hi = [0, 1, 2].map((k) => Math.min(A.mx[k], B.mx[k]) + gap); if (lo.some((v, k) => v > hi[k])) continue;
    const N = 14; let hit = null; for (let a = 0; a <= N && !hit; a++) for (let b = 0; b <= N && !hit; b++) for (let c2 = 0; c2 <= N; c2++) { const x = lo[0] + (hi[0] - lo[0]) * a / N, y = lo[1] + (hi[1] - lo[1]) * b / N, z = lo[2] + (hi[2] - lo[2]) * c2 / N; if (A.f(x, y, z) < 0 && B.f(x, y, z) < gap) { hit = [x, y, z].map((v) => +v.toFixed(3)); break; } }
    if (hit) out.push({ a: A.pt.id, b: B.pt.id, at: hit, bonesA: A.pt.bones, bonesB: B.pt.bones }); }
  return out;
}
SBX.partContacts = partContacts;
// every part must be attached to the body (through touching parts) unless it is marked floating: true (a halo, an orbiting star)
function floatingParts(ch, spec) { const ids = spec.parts.map((p) => p.id); if (ids.length < 2) return []; const touch = partContacts(ch, spec, 0.004, true); const adj = new Map(ids.map((i) => [i, new Set()]));
  for (const k of touch) { adj.get(k.a).add(k.b); adj.get(k.b).add(k.a); } for (const p of spec.parts) { if (!p.parent || !p.join || !adj.has(p.parent)) continue; const fOf = (pt) => { const P = (pt.prims || []).map((q) => (q.f ? q : q.p)).filter((q) => q && q.f); return (x, y, z) => Math.min(...P.map((q) => q.f(x, y, z))); }; const par = spec.parts.find((q) => q.id === p.parent); if (!par) continue; const c = p.join.c, tol = (p.join.k || 0.006) + 0.004; if (fOf(p)(...c) < tol && fOf(par)(...c) < tol) { adj.get(p.id).add(par.id); adj.get(par.id).add(p.id); } } // a smooth join bridges a hairline gap
  const comps = []; const seen = new Set(); for (const i of ids) { if (seen.has(i)) continue; const st = [i], comp = []; seen.add(i); while (st.length) { const x = st.pop(); comp.push(x); for (const y of adj.get(x)) if (!seen.has(y)) { seen.add(y); st.push(y); } } comps.push(comp); }
  comps.sort((a, b) => b.length - a.length); const flo = new Set(spec.parts.filter((p) => p.floating).map((p) => p.id)); return comps.slice(1).flat().filter((i) => !flo.has(i)); }
SBX.floatingParts = floatingParts;
// weight cleanup: a bone may not pull skin from the far side of its own joint (stops shoulders dragging the torso when arms lift,
// hips dragging the belly, etc.). Weight that crosses back past a joint is handed to the parent bone, fading over a short distance.
// ---- armature analysis (no presets, no bone-name lists): works on any body plan — biped, spider, snake, bird, snail, octopus.
// A "branch" is a bone that leaves its parent sideways: its parent has other children and it is not the parent's main continuation
// (the child carrying the largest subtree). Arms, legs, wings, flippers, tails, ears, tentacles, antennae and eye stalks are branches;
// spine, neck and a snake's body are continuations.
function armature(c) { if (c._arm) return c._arm; const B = c.ch.bones; const kids = B.map(() => []); B.forEach((b, i) => { if (b.parent >= 0) kids[b.parent].push(i); });
  const size = B.map(() => 0); const sz = (i) => (size[i] = 1 + kids[i].reduce((a, k) => a + sz(k), 0)); B.forEach((b, i) => { if (b.parent < 0) sz(i); });
  const face = (b) => b.region === 'Face' || !b.deform; const dir = (b) => { const t = b.tail || b.pos; const d = new THREE.Vector3(t[0] - b.pos[0], t[1] - b.pos[1], t[2] - b.pos[2]); const L = d.length(); return L > 1e-5 ? d.multiplyScalar(1 / L) : null; };
  const branch = new Set(), cont = new Set();
  B.forEach((b, i) => { if (b.parent < 0 || face(b)) return; const sib = kids[b.parent].filter((k) => !face(B[k])); const main = sib.reduce((m, k) => (size[k] > size[m] ? k : m), sib[0]); if (sib.length > 1 && i !== main) branch.add(i); else cont.add(i); });
  return (c._arm = { kids, size, branch, cont, dir, face }); }

// ---- arms found from the armature's shape, not bone names: a mirrored pair of side branches leaving the upper body (below the
// neck), at least two bones long. A short clavicle at the start is skipped (the upper arm is the long bone after it). Every
// character gets kind:'arm' IK chains for exactly these, and other non-leg chains (tails, ears, tentacles) never swing like arms.
function findArms(c) { if (c._arms) return c._arms; const B = c.ch.bones, A = armature(c); const V = (a) => new THREE.Vector3(...a); const len = (b) => V(b.tail || b.pos).distanceTo(V(b.pos));
  const legSet = new Set(); for (const k of c.ch.ik || []) if (k.kind === 'leg') for (const n of [k.upper, k.lower, k.end]) if (c.ch.bi[n] !== undefined) legSet.add(c.ch.bi[n]);
  const ys = B.filter((b) => b.deform !== false).map((b) => b.pos[1]); const y0 = Math.min(...ys), y1 = Math.max(...ys.concat(B.map((b) => (b.tail || b.pos)[1]))); const H = Math.max(1e-3, y1 - y0);
  const headish = (i) => { for (let x = i; x >= 0; x = B[x].parent) if (/head|neck|skull|jaw/i.test(B[x].name) || B[x].region === 'Head') return true; return false; };
  const chainOf = (i) => { const ch = [i]; let x = i; while (true) { const ks = A.kids[x].filter((k) => !A.face(B[k])); if (!ks.length) break; x = ks.reduce((m, k) => (A.size[k] > A.size[m] ? k : m), ks[0]); ch.push(x); } return ch; };
  const cand = [];
  for (const i of A.branch) { const b = B[i]; if (legSet.has(i) || headish(b.parent) || /tail|ear|antenn|tentacl|hair|horn|wing_?tip|fin\b/i.test(b.name)) continue; let ch = chainOf(i); if (ch.length < 2) continue;
    if (ch.length >= 3 && len(B[ch[0]]) < 0.55 * len(B[ch[1]])) ch = ch.slice(1); const t = (b.pos[1] - y0) / H; if (t < 0.35) continue;
    const d = A.dir(B[ch[0]]); if (d && d.y < -0.85 && t < 0.5) continue; // a leg-like branch from the pelvis
    { const tip = B[ch[ch.length - 1]]; const ty = (tip.tail || tip.pos)[1]; if ((ty - y0) / H < 0.12 && (!d || d.y < -0.3)) continue; } /* reaches down to the ground: a front leg of a four-legged (or more) creature, never an arm */
    if (Math.abs(b.pos[0]) < 0.01 * H) continue; cand.push({ i, ch, x: b.pos[0], y: b.pos[1], z: b.pos[2] }); }
  const pairs = []; const used = new Set();
  for (const a of cand) { if (used.has(a.i) || a.x <= 0) continue; let best = null, bd = 1e9; for (const b of cand) { if (used.has(b.i) || b.x >= 0) continue; const dd = Math.hypot(a.x + b.x, a.y - b.y, a.z - b.z); if (dd < bd) { bd = dd; best = b; } } if (best && bd < 0.08 * H) { used.add(a.i); used.add(best.i); pairs.push([a, best]); } }
  pairs.sort((p, q) => q[0].y - p[0].y);
  return (c._arms = pairs.map(([l, r], k) => ({ k, L: l.ch, R: r.ch, rootL: l.i, rootR: r.i }))); }
function fixArms(c) { const B = c.ch.bones; const pairs = findArms(c); const armBones = new Set(); const ik = c.ch.ik || (c.ch.ik = []);
  const has = (u) => ik.find((k) => k.upper === u);
  pairs.forEach((pr, n) => { for (const [side, ch] of [['.L', pr.L], ['.R', pr.R]]) { ch.forEach((x) => armBones.add(B[x].name)); const up = B[ch[0]].name, lo = B[ch[1]].name, en = B[ch[2] ?? ch[1]].name;
    const ex = has(up); if (ex) { ex.kind = 'arm'; continue; } if (ch.length < 3) continue; const s = side === '.L' ? 1 : -1; const e = B[ch[2]].pos;
    ik.push({ name: (n ? 'Arm' + (n + 1) : 'Arm') + '_auto' + side, upper: up, lower: lo, end: en, pole: [e[0] + s * 0.05, e[1], e[2] - 0.3], kind: 'arm' }); } });
  for (const k of ik) if (k.kind !== 'leg' && !armBones.has(k.upper)) k.kind = k.kind === 'arm' ? 'limb' : (k.kind || 'limb');
  c._rt = null; return pairs.length; }
SBX.findArms = findArms; SBX.fixArms = fixArms;
const armUppers = (c) => { const B = c.ch.bones; const out = []; for (const p of findArms(c)) { out.push(B[p.L[0]].name, B[p.R[0]].name); } return out; };
const SKIN_RX = /Body|Skin|Felt|Plush|Rubber|Plastic|Sculpt|Organic/i;
// skin = any skinned mesh that is named as body skin, or that actually blends between bones (fur, scales, shells, anything soft),
// so creatures whose body mesh has an unusual name still get their weights cleaned; rigid props bound to one bone are left alone
const softSkin = (m) => { const g = m.geometry; if (g.userData._soft !== undefined) return g.userData._soft; const SW = g.attributes.skinWeight; let soft = false; const stp = Math.max(1, Math.floor(SW.count / 4000)); for (let v = 0; v < SW.count && !soft; v += stp) { let n = 0; for (let k = 0; k < 4; k++) if (SW.getComponent(v, k) > 0.02) n++; if (n > 1) soft = true; } return (g.userData._soft = soft); };
const skins = (c) => c.meshes.filter((m) => m.geometry && m.geometry.attributes.skinWeight && m.geometry.attributes.skinIndex && (SKIN_RX.test(m.name) || (c.ch.organic && m.name === c.ch.organic.name) || softSkin(m)));
// weight cleanup: a branch bone (and everything down its chain) may not pull skin from behind its own root joint; weight that crosses
// back past the joint fades to the parent over `fall` metres. One rule for every armature.
function cleanWeights(c, opt = {}) { const ch = c.ch; const A = armature(c); let moved = 0; const only = opt.only || null;
  const rootOf = new Map(); for (const bi of A.branch) { const st = [bi]; while (st.length) { const x = st.pop(); rootOf.set(x, bi); for (const k of A.kids[x]) st.push(k); } }
  // the shoulder joint itself is a joint too: when an arm starts with a clavicle, the upper arm (and everything below it) may not
  // pull skin from the clavicle/torso side of the shoulder; that weight fades to the clavicle
  for (const p of findArms(c)) for (const up of [p.L[0], p.R[0]]) { if (A.branch.has(up)) continue; const st = [up]; while (st.length) { const x = st.pop(); rootOf.set(x, up); for (const k of A.kids[x]) st.push(k); } if (only && only.has(rootOf.get(ch.bones[up].parent))) only.add(up); }
  for (const m of skins(c)) { const g = m.geometry; const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    for (let v = 0; v < P.count; v++) { const px = P.getX(v), py = P.getY(v), pz = P.getZ(v); const w = [SW.getX(v), SW.getY(v), SW.getZ(v), SW.getW(v)], ix = [SI.getX(v), SI.getY(v), SI.getZ(v), SI.getW(v)]; let changed = false;
      for (let k = 0; k < 4; k++) { if (w[k] <= 0.001) continue; const r = rootOf.get(ix[k]); if (r === undefined || (only && !only.has(r))) continue; const rb = ch.bones[r]; const d = A.dir(rb); if (!d) continue; const L = Math.hypot(...(rb.tail || rb.pos).map((t, q) => t - rb.pos[q])) || 0.05;
        const t = (px - rb.pos[0]) * d.x + (py - rb.pos[1]) * d.y + (pz - rb.pos[2]) * d.z; const fall = opt.fall ? Math.max(opt.fall, 0.1 * L) : Math.max(0.003, Math.min(0.12, 0.25 * L)); /* scales with the creature's size */ if (t >= 0) continue;
        const keep = t <= -fall ? 0 : 1 - smooth(-t / fall); const give = w[k] * (1 - keep); if (give <= 1e-4) continue; w[k] -= give; const parent = rb.parent;
        let pk = ix.indexOf(parent); if (pk < 0) { let mi = -1; for (let q = 0; q < 4; q++) if (q !== k && (mi < 0 || w[q] < w[mi])) mi = q; const lost = w[mi]; ix[mi] = parent; w[mi] = 0; const others = [0, 1, 2, 3].filter((q) => q !== mi && w[q] > 0); const so = others.reduce((a2, q) => a2 + w[q], 0); if (lost > 0) { if (so > 0) for (const q of others) w[q] += lost * w[q] / so; else w[k] += lost; } pk = mi; }
        w[pk] += give; changed = true; }
      if (changed) { const sum = w.reduce((a, b2) => a + b2, 0) || 1; SI.setXYZW(v, ...ix); SW.setXYZW(v, ...w.map((x) => x / sum)); moved++; } }
    SI.needsUpdate = SW.needsUpdate = true; }
  return moved; }
SBX.cleanWeights = cleanWeights; SBX.armature = armature;
// weight smoothing over the mesh (optionally only where given bones have influence)
function smoothWeights(c, passes = 2, bones = null) { let n = 0; for (const m of skins(c)) { const g = m.geometry; if (!g.index) continue; const SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, I = g.index.array, V = SI.count;
    const nb = m.userData._nb || (m.userData._nb = (() => { const a = Array.from({ length: V }, () => new Set()); for (let t = 0; t < I.length; t += 3) { const x = I[t], y = I[t + 1], z = I[t + 2]; a[x].add(y).add(z); a[y].add(x).add(z); a[z].add(x).add(y); } return a.map((st) => [...st]); })());
    const touches = (v) => { if (!bones) return true; for (let k = 0; k < 4; k++) if (SW.getComponent(v, k) > 0.02 && bones.has(SI.getComponent(v, k))) return true; return false; };
    for (let p = 0; p < passes; p++) { const W = new Array(V); for (let v = 0; v < V; v++) { if (!touches(v)) continue; const acc = new Map(); const addv = (u, f) => { for (let k = 0; k < 4; k++) { const w = SW.getComponent(u, k); if (w > 0) { const bi = SI.getComponent(u, k); acc.set(bi, (acc.get(bi) || 0) + w * f); } } }; addv(v, 1); const nn = nb[v].length || 1; for (const u of nb[v]) addv(u, 0.6 / nn); W[v] = [...acc].sort((x, y) => y[1] - x[1]).slice(0, 4); }
      for (let v = 0; v < V; v++) { const e = W[v]; if (!e) continue; const sum = e.reduce((a, x) => a + x[1], 0) || 1; for (let k = 0; k < 4; k++) { SI.setComponent(v, k, e[k] ? e[k][0] : 0); SW.setComponent(v, k, e[k] ? e[k][1] / sum : 0); } n++; } }
    SI.needsUpdate = SW.needsUpdate = true; } return n; }
// deformation test, generated from the armature itself: every branch is swung hard about the two axes across its length (±65°),
// every continuation (spine, neck, snake body) bent ±35° the same way; the skin's edges are measured for stretch/squash per test.
function stressTests(c) { const A = armature(c); const B = c.ch.bones; const out = [];
  const axes = (d) => { const a = Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0); const u = new THREE.Vector3().crossVectors(d, a).normalize(); const v = new THREE.Vector3().crossVectors(d, u).normalize(); return [u, v]; };
  const add = (i, deg) => { const d = A.dir(B[i]); if (!d) return; for (const ax of axes(d)) for (const sg of [1, -1]) out.push({ bone: i, name: B[i].name + (sg > 0 ? ' +' : ' −') + Math.round(deg) + '°', q: new THREE.Quaternion().setFromAxisAngle(ax, sg * deg * Math.PI / 180) }); };
  for (const i of A.branch) add(i, 65); const spine = [...A.cont].filter((i) => A.kids[i].length && A.size[i] > 2); for (const i of spine) add(i, 35);
  return out; }
function deformTest(c, opt = {}) {
  const ch = c.ch; const body = skins(c).filter((m) => m.geometry.index).sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count)[0]; if (!body) return null; // the main body skin, not whichever mesh is listed first
  const g = body.geometry, P = g.attributes.position, I = g.index.array; const step = Math.max(1, Math.floor(I.length / 3 / (opt.tris || 5000))) * 3;
  const E = []; for (let t = 0; t < I.length; t += step) E.push([I[t], I[t + 1]], [I[t + 1], I[t + 2]]);
  const rest = E.map(([a, b]) => new THREE.Vector3().fromBufferAttribute(P, a).distanceTo(new THREE.Vector3().fromBufferAttribute(P, b))); const med = [...rest].sort((x, y) => x - y)[rest.length >> 1] || 0.001;
  const keep = { st: c.st, p: c.group.position.clone(), r: c.group.rotation.clone(), s: c.group.scale.clone() }; c.group.position.set(0, 0, 0); c.group.rotation.set(0, 0, 0); c.group.scale.set(1, 1, 1);
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(); const pos = (v, out) => { out.fromBufferAttribute(P, v); body.applyBoneTransform(v, out); return out; };
  const results = []; const perBone = new Map();
  for (const T of stressTests(c)) { const st = RPC.newState(ch); st.L[T.bone].q = T.q.toArray(); c.st = st; c.syncToBones(); c.group.updateMatrixWorld(true); body.skeleton.update();
    let bad = 0, n = 0; const culprits = new Map(); E.forEach(([a, b], i) => { if (rest[i] < med * 0.3) return; n++; const r = pos(a, v1).distanceTo(pos(b, v2)) / rest[i]; if (r > 2.0 || r < 0.35) { bad++; for (let k = 0; k < 4; k++) { const bi = body.geometry.attributes.skinIndex.getComponent(a, k), w = body.geometry.attributes.skinWeight.getComponent(a, k); if (w > 0.15) culprits.set(bi, (culprits.get(bi) || 0) + 1); } } });
    const pct = n ? bad / n * 100 : 0; results.push({ test: T.name, bone: T.bone, pct }); perBone.set(T.bone, Math.max(perBone.get(T.bone) || 0, pct)); T.culprits = culprits; }
  c.st = keep.st; c.syncToBones(); c.group.position.copy(keep.p); c.group.rotation.copy(keep.r); c.group.scale.copy(keep.s); c.group.updateMatrixWorld(true);
  const lim = opt.limit ?? 1.0; const failing = results.filter((r) => r.pct > lim).sort((a, b) => b.pct - a.pct);
  const mean = results.length ? results.reduce((a, r) => a + r.pct, 0) / results.length : 0;
  return { tests: results.length, mean: +mean.toFixed(3), worst: failing[0] ? { test: failing[0].test, pct: +failing[0].pct.toFixed(2) } : null, ok: !failing.length, failing: failing.slice(0, 8).map((r) => ({ test: r.test, badSkinPct: +r.pct.toFixed(2) })), perBone };
}
// automatic repair: wherever a branch still tears in its stress tests, its root joint gets a wider fade and its region extra smoothing;
// each change is kept only if the measured deformation got better
function repairRig(c, rounds = 3) { const before = deformTest(c); if (!before) return null; let cur = before;
  for (let r = 0; r < rounds && !cur.ok; r++) { const bad = new Set([...cur.perBone].filter(([, pct]) => pct > 1.0).map(([b]) => b)); if (!bad.size) break;
    const snap = skins(c).map((m) => [m.geometry.attributes.skinIndex.array.slice(), m.geometry.attributes.skinWeight.array.slice()]);
    const A = armature(c); const region = new Set(); for (const b of bad) { region.add(b); const p = c.ch.bones[b].parent; if (p >= 0) region.add(p); for (const k of A.kids[b]) region.add(k); }
    cleanWeights(c, { only: new Set([...bad].filter((b) => A.branch.has(b))), fall: 0.03 + 0.02 * (r + 1) }); smoothWeights(c, 2 + r, region);
    const next = deformTest(c); if (next.mean <= cur.mean) cur = next; else { skins(c).forEach((m, i) => { m.geometry.attributes.skinIndex.array.set(snap[i][0]); m.geometry.attributes.skinWeight.array.set(snap[i][1]); m.geometry.attributes.skinIndex.needsUpdate = m.geometry.attributes.skinWeight.needsUpdate = true; }); break; } }
  return { before: { mean: before.mean, ok: before.ok }, after: cur }; }
SBX.repairRig = repairRig;
// arm weights from the arm's own shape: skin inside the arm's tube (within its measured thickness of the bone, along the middle of
// a segment) belongs fully to that arm bone; arm weight on skin far outside the tube (torso side, chest, back) goes to the torso.
function armWeights(c) { const B = c.ch.bones; const V = (a) => new THREE.Vector3(...a); let n = 0;
  for (const pr of findArms(c)) for (const [ch, root0] of [[pr.L, pr.rootL], [pr.R, pr.rootR]]) { const H = hangDir(c, B[ch[0]].name); const r = Math.max(0.01, H.radius);
    // the whole limb from where it leaves the body (clavicle included) down to every finger; the body bone is the root's parent, never
    // the clavicle (giving torso skin to the clavicle is exactly what made the shoulder drag the chest and back)
    const root = root0 ?? ch[0]; const set = new Set(); { const st = [root]; while (st.length) { const x = st.pop(); set.add(x); for (let k = 0; k < B.length; k++) if (B[k].parent === x) st.push(k); } }
    const torso = B[root].parent; const own = new Set(ch); const lead = new Set(); for (let x = B[ch[0]].parent; x >= 0 && x !== B[root].parent; x = B[x].parent) lead.add(x); // the clavicle / shoulder bones before the upper arm
    const nearBody = (x) => x === ch[0] || lead.has(x); // only skin nearest the upper arm or shoulder can be torso skin: never the forearm, hand or fingers (a wide paw is far from its bones' axis but is still hand)
    const segs = [...set].filter((x) => B[x].tail && V(B[x].tail).distanceTo(V(B[x].pos)) > 1e-4).map((x) => ({ x, a: V(B[x].pos), b: V(B[x].tail) })); if (!segs.length) continue;
    for (const m of skins(c)) { const P = m.geometry.attributes.position, SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight; const p = new THREE.Vector3();
      for (let v = 0; v < P.count; v++) { let aw = 0; for (let k = 0; k < 4; k++) if (set.has(SI.getComponent(v, k))) aw += SW.getComponent(v, k); p.fromBufferAttribute(P, v);
        let bd = 1e9, bs = null, bt = 0, bq = null; for (const sg of segs) { const ab = sg.b.clone().sub(sg.a); const L2 = ab.lengthSq(); const t = clamp(p.clone().sub(sg.a).dot(ab) / L2, 0, 1); const q = sg.a.clone().addScaledVector(ab, t); const d = p.distanceTo(q); if (d < bd) { bd = d; bs = sg; bt = t; bq = q; } }
        // skin on the BODY side of the upper arm / shoulder (facing the torso, beyond the arm's own surface) is torso skin: an arm that
        // lifts must not drag it up (that was the torso stretching when arms go up)
        const sideX = B[root].pos[0] >= 0 ? 1 : -1; const medial = bd > 1e-6 ? -(p.x - bq.x) / bd * sideX : 0; const upperish = nearBody(bs.x);
        const fMed = upperish && medial > 0.35 && bd > r * 0.9 ? clamp((bd - r * 0.9) / (r * 0.4), 0, 1) * smooth((medial - 0.35) / 0.35) * (1 - smooth((bt - 0.6) / 0.25)) : 0;
        let w = null; if (fMed < 0.01 && aw < 0.7 && own.has(bs.x) && bd < r * 0.95 && bt > 0.3 && bt < 0.85 && !(bs.x === ch[0] && bt < 0.45)) w = [[bs.x, 1]];
        else if (aw > 0.02 && torso >= 0 && nearBody(bs.x) && (bd > r * 1.6 || fMed > 0.01)) { const f = Math.max(clamp((bd - r * 1.6) / (r * 0.8), 0, 1), fMed); const e = []; const put = (to, ww) => { const q = e.find((x) => x[0] === to); if (q) q[1] += ww; else e.push([to, ww]); };
          for (let k = 0; k < 4; k++) { const bi = SI.getComponent(v, k), ww = SW.getComponent(v, k); if (ww <= 0) continue; if (set.has(bi)) { put(torso, ww * f); if (f < 1) put(bi, ww * (1 - f)); } else put(bi, ww); }
          e.sort((a, b) => b[1] - a[1]); w = e.slice(0, 4); }
        if (!w) continue; const sum = w.reduce((a, q) => a + q[1], 0) || 1; for (let k = 0; k < 4; k++) { SI.setComponent(v, k, w[k] ? w[k][0] : 0); SW.setComponent(v, k, w[k] ? w[k][1] / sum : 0); } n++; }
      SI.needsUpdate = SW.needsUpdate = true; } }
  return n; }
SBX.armWeights = armWeights;
function polishRig(c) { const snap0 = skins(c).map((m) => [m.geometry.attributes.skinIndex.array.slice(), m.geometry.attributes.skinWeight.array.slice()]); const b0 = deformTest(c); cleanWeights(c); smoothWeights(c, 2);
  if (findArms(c).length) { const snap = skins(c).map((m) => [m.geometry.attributes.skinIndex.array.slice(), m.geometry.attributes.skinWeight.array.slice()]); const pre = deformTest(c); armWeights(c); smoothWeights(c, 1); const post = deformTest(c);
    if (pre && post && post.mean > pre.mean + 0.25) skins(c).forEach((m, i) => { m.geometry.attributes.skinIndex.array.set(snap[i][0]); m.geometry.attributes.skinWeight.array.set(snap[i][1]); m.geometry.attributes.skinIndex.needsUpdate = m.geometry.attributes.skinWeight.needsUpdate = true; }); }
  const fix = repairRig(c, 3);
  // never worse than the weights it started with: if the whole polish made the measured deformation worse, put the original back
  if (b0 && fix && fix.after && fix.after.mean > b0.mean + 0.25) { skins(c).forEach((m, i) => { if (!snap0[i]) return; m.geometry.attributes.skinIndex.array.set(snap0[i][0]); m.geometry.attributes.skinWeight.array.set(snap0[i][1]); m.geometry.attributes.skinIndex.needsUpdate = m.geometry.attributes.skinWeight.needsUpdate = true; }); return { original: b0.mean, final: b0.mean, ok: b0.ok, report: b0, reverted: true }; }
  return { original: b0 && b0.mean, final: fix && fix.after.mean, ok: fix ? fix.after.ok : true, report: fix ? fix.after : null }; }
SBX.polishRig = polishRig;
// ---- shoulder helpers: linear skinning makes a shoulder collapse and drag the torso when an arm swings far (arms up). Each upper arm
// gets a helper bone at the same joint that follows HALF of the arm's rotation every frame; the skin right around the shoulder joint
// is shared with it, so the shoulder / armpit / side of the chest bend half-way instead of being dragged (no widening: the helper sits
// exactly on the joint and only takes weight the arm already had, within a short distance of the joint).
const HELPERS = [];
function addShoulderHelpers(c) { if (c._shoulderHelpers) return 0; const B = c.ch.bones; const meshes = skins(c).filter((m) => m.isSkinnedMesh); if (!meshes.length) return 0; let n = 0; const rest = restLocal(c);
  for (const pr of findArms(c)) for (const ch of [pr.L, pr.R]) { const ui = ch[0]; const U = c.bones[ui]; if (!U || !U.parent) continue; const b = B[ui]; const tail = b.tail || (B[ch[1]] && B[ch[1]].pos); if (!tail) continue;
    const a = new THREE.Vector3(...b.pos), d = new THREE.Vector3(...tail).sub(a); const L = d.length(); if (L < 1e-4) continue; d.normalize();
    const H = new THREE.Bone(); H.name = b.name + '_ShoulderHelper'; H.position.copy(U.position); const rq = new THREE.Quaternion().fromArray(rest[ui].q); H.quaternion.copy(rq); U.parent.add(H);
    for (const S of new Set(meshes.map((m) => m.skeleton))) { const ix = S.bones.indexOf(U); if (ix < 0) continue; S.bones = S.bones.concat([H]); S.boneInverses = S.boneInverses.concat([S.boneInverses[ix].clone()]); S.boneMatrices = new Float32Array(S.bones.length * 16); if (S.boneTexture) { S.boneTexture.dispose(); S.boneTexture = null; } if (S.computeBoneTexture) S.computeBoneTexture(); }
    for (const m of meshes) { const S = m.skeleton, ix = S.bones.indexOf(U), hx = S.bones.indexOf(H); if (ix < 0 || hx < 0) continue; const P = m.geometry.attributes.position, SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight; const v = new THREE.Vector3();
      for (let i = 0; i < P.count; i++) { let k = -1; for (let q = 0; q < 4; q++) if (SI.getComponent(i, q) === ix && SW.getComponent(i, q) > 0) k = q; if (k < 0) continue; v.fromBufferAttribute(P, i); const t = v.sub(a).dot(d) / L; if (t > 0.38) continue;
        const g = 0.55 * (1 - smooth(t / 0.38)); const wu = SW.getComponent(i, k); const give = wu * g; if (give < 1e-3) continue; let slot = -1, low = 1e9; for (let q = 0; q < 4; q++) { const w2 = SW.getComponent(i, q); if (w2 === 0) { slot = q; low = -1; break; } if (q !== k && w2 < low) { low = w2; slot = q; } }
        if (low > 0 && low > give) continue; if (low > 0) { SW.setComponent(i, k, wu + low); } SW.setComponent(i, k, SW.getComponent(i, k) - give); SI.setComponent(i, slot, hx); SW.setComponent(i, slot, give); }
      SI.needsUpdate = SW.needsUpdate = true; }
    HELPERS.push({ c, U, H, rq }); n++; }
  c._shoulderHelpers = n; return n; }
function helpersStep() { for (const x of HELPERS) { if (!x.c.group.visible) continue; x.H.position.copy(x.U.position); x.H.quaternion.copy(x.rq).slerp(x.U.quaternion, 0.5); } }
SBX.addShoulderHelpers = addShoulderHelpers;

SBX.deformTest = deformTest; SBX.smoothWeights = smoothWeights;
// the shipped cast gets the same weight polish (measured on Ollo: badly stretched skin edges in stress poses drop ~4x)
SBX.polishLog = {}; (async () => { await sleep(60); for (const c of CAST.CASTS) { try { SBX.polishLog[c.id] = polishRig(c); try { addShoulderHelpers(c); } catch (e) { console.warn('shoulder helpers', c.id, e); } } catch (e) { console.warn('weights', c.id, e); } await sleep(30); } })();
const restLocal = (c) => (c._rest || (c._rest = RPC.restLocal(c.ch)));
function blendPoses(c, layers) { // layers: [{q: {bone: Quaternion}, w}] -> c.st.L (only bones the layers name; others back to rest)
  const rest = restLocal(c); const L = c.st.L; const tmp = new THREE.Quaternion();
  c.ch.bones.forEach((b, i) => { if (b.region === 'Face') return; const acc = new THREE.Quaternion(); let any = false;
    for (const ly of layers) { const q = ly.q[b.name]; if (!q || ly.w <= 0) continue; tmp.copy(acc).slerp(q, ly.w / (ly.wsum || 1)); acc.copy(tmp); any = true; }
    L[i] = { p: rest[i].p.slice(), q: any ? acc.toArray() : [0, 0, 0, 1], s: [1, 1, 1] }; });
}
const PQ = { hover: poseQ(ollo.ch, 'Hovering (relaxed)'), fly: poseQ(ollo.ch, 'Flying forward (superhero)') };
// bone aliases so one clip can drive any character
const ALIAS = { 'Arm_Upper': ['Arm_Upper', 'UpperArm', 'Flipper_Upper', 'Wing_Upper'], 'Arm_Lower': ['Arm_Lower', 'LowerArm', 'Flipper_Lower', 'Wing_Lower'], 'Hand': ['Hand', 'Flipper_Hand', 'Wing_Tip'],
  'Leg_Upper': ['Leg_Upper', 'UpperLeg', 'Thigh'], 'Leg_Lower': ['Leg_Lower', 'LowerLeg', 'Shin'], 'Foot': ['Foot'], 'Head': ['Head'], 'Neck': ['Neck', 'Neck_1'], 'Torso_Upper': ['Torso_Upper', 'Chest'], 'Torso_Lower': ['Torso_Lower', 'Hips'], 'Hips': ['Hips'], 'Tail_1': ['Tail_1', 'Tail'] };
function resolveBone(c, name) { if (c.ch.bi[name] !== undefined) return name; const RB = c._rb || (c._rb = new Map()); if (RB.has(name)) return RB.get(name); const out = resolveBone2(c, name); RB.set(name, out); return out; }
function resolveBone2(c, name) { const B = c.ch.bones; const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(left|l)$/, 'l').replace(/(right|r)$/, 'r');
  { const n = norm(name); const b = B.find((x) => norm(x.name) === n); if (b) return b.name; }
  const r0 = resolveBone1(c, name); if (r0) return r0;
  // by body role (any armature): head, neck, chest, hips, legs by side, tails
  try { const R = bodyRoles(c); const m = name.match(/^(.*?)(\.[LR])?$/); const base = m[1], side = m[2] === '.L' ? 1 : m[2] === '.R' ? -1 : 0; let bi;
    if (base === 'Head') bi = R.head; else if (base === 'Neck' || base === 'Neck_1') bi = R.neck[R.neck.length - 1]; else if (base === 'Torso_Upper' || base === 'Chest') bi = R.torso[R.torso.length - 1]; else if (base === 'Torso_Lower' || base === 'Hips') bi = R.torso[0] ?? R.rootI;
    else { const li = ['Leg_Upper', 'Leg_Lower', 'Foot'].indexOf(base); if (li >= 0) { const l = R.legs.find((l2) => side === 0 || Math.sign(B[l2[0]].pos[0]) === side); bi = l && l[li]; }
      const ai = ['Arm_Upper', 'Arm_Lower', 'Hand'].indexOf(base); if (ai >= 0 && R.arms[0]) bi = (side >= 0 ? R.arms[0].L : R.arms[0].R)[ai];
      if (/^Tail/.test(base)) { const t = R.other.find((ch) => /tail/i.test(B[ch[0]].name)) || R.other.filter((ch) => B[ch[0]].pos[2] < 0).sort((a, b) => B[a[0]].pos[1] - B[b[0]].pos[1])[0]; const n = +((base.match(/\d+/) || [1])[0]); bi = t && t[n - 1]; } }
    if (bi !== undefined && bi !== null && B[bi]) return B[bi].name; } catch (e) { /* no roles */ }
  return null; }
function resolveBone1(c, name) { const m = name.match(/^(.*?)(\.[LR])?$/); const base = m[1], sfx = m[2] || ''; for (const a of ALIAS[base] || []) if (c.ch.bi[a + sfx] !== undefined) return a + sfx; { const ai = ['Arm_Upper', 'Arm_Lower', 'Hand'].indexOf(base); const p = findArms(c)[0]; if (ai >= 0 && p && (sfx === '.L' || sfx === '.R')) { const ch = sfx === '.L' ? p.L : p.R; const bi = ch[ai]; if (bi !== undefined) return c.ch.bones[bi].name; } } return null; }
// retargeting: every clip is authored for a canonical rig whose arms hang down at its sides. A character bound in a T- or A-pose
// gets each upper arm's rotation composed with the turn that brings its bind arm down, and everything below it expressed in that
// lowered frame, so a wave, a bow or a cheer means the same motion on every armature
function retarget(c) { if (c._rt) return c._rt; const down = new Map(), under = new Map();
  const AU = new Set(armUppers(c)); for (const b of c.ch.bones) { if (!AU.has(b.name) && !/^(Wing_Upper|Flipper_Upper)\.(L|R)$/.test(b.name)) continue; const d = new THREE.Vector3(...(b.tail || b.pos)).sub(new THREE.Vector3(...b.pos)); if (d.lengthSq() < 1e-9) continue; d.normalize(); if (d.y < -0.6 && !AU.has(b.name)) continue; const side = b.pos[0] >= 0 ? 1 : -1; const q = new THREE.Quaternion().setFromUnitVectors(d, AU.has(b.name) ? hangDir(c, b.name).want : new THREE.Vector3(side * 0.28, -0.95, 0.08).normalize()); down.set(b.name, q);
    const kids = [b.name]; for (let k = 0; k < kids.length; k++) for (const x of c.ch.bones) if (x.parentName === kids[k]) { kids.push(x.name); under.set(x.name, q); } }
  return (c._rt = { down, under }); }
function retargetQ(c, bn, q) { const R = retarget(c); const d = R.down.get(bn); if (d) return q.clone().multiply(d); const u = R.under.get(bn); if (u) return u.clone().invert().multiply(q).multiply(u); return q; }
// ---- procedural motions generated from each character's own armature (no bone names, no presets): the skeleton is read for its
// spine (main continuation from the root), head (top of the spine / head region), arms (findArms), legs (leg IK chains) and every
// other branch (tails, ears, antennae, wings, tentacles). Each motion is described in body terms (raise this limb to that direction,
// bend the spine forward, turn the head) and solved per bone in the rest frame, so a wave is a wave on a biped, a spider (it lifts a
// front leg), a snake (it sways its head) or a bird (a wing).
const _V = (a) => new THREE.Vector3(...a); const _AX = { X: new THREE.Vector3(1, 0, 0), Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1) };
const qAx = (ax, deg) => new THREE.Quaternion().setFromAxisAngle(ax, deg * Math.PI / 180);
function bodyRoles(c) { if (c._roles) return c._roles; const B = c.ch.bones, A = armature(c);
  const legs = []; const legSet = new Set(); for (const k of c.ch.ik || []) if (k.kind === 'leg') { const ch = [k.upper, k.lower, k.end].map((n) => c.ch.bi[n]).filter((x) => x !== undefined); if (ch.length) { legs.push(ch); ch.forEach((x) => legSet.add(x)); } }
  const roots = B.map((b, i) => i).filter((i) => B[i].parent < 0); const rootI = roots.reduce((m, i) => (A.size[i] > A.size[m] ? i : m), roots[0]);
  const spine = []; let x = rootI; while (x !== undefined) { if (B[x].deform !== false && !A.face(B[x])) spine.push(x); const ks = A.kids[x].filter((k) => !A.face(B[k]) && !legSet.has(k)); if (!ks.length) break;
    // follow the continuation that is not a leg and leads highest / furthest (the neck-head end, or a snake's front)
    x = ks.reduce((m, k) => (A.size[k] > A.size[m] ? k : m), ks[0]); }
  let head = spine.findIndex((i) => B[i].region === 'Head' || /head|skull/i.test(B[i].name)); head = head >= 0 ? spine[head] : spine[spine.length - 1];
  const hk = spine.indexOf(head); const neck = spine.slice(Math.max(1, hk - 2), hk); const torso = spine.slice(1, Math.max(1, hk - neck.length)).filter((i) => !legSet.has(i));
  const blen = (i) => _V(B[i].tail || B[i].pos).distanceTo(_V(B[i].pos)); const trim = (ch) => { ch = ch.slice(); while (ch.length >= 3 && blen(ch[0]) < 0.8 * blen(ch[1])) ch = ch.slice(1); return ch; }; // a clavicle/shoulder bone is not the arm
  const arms = findArms(c).map((p) => ({ L: trim(p.L), R: trim(p.R) })); const armSet = new Set(); for (const a of findArms(c)) [...a.L, ...a.R].forEach((i) => armSet.add(i)); const legAll = new Set(legSet); for (const l of legs) { const st = [l[0]]; while (st.length) { const y = st.pop(); legAll.add(y); for (const k of A.kids[y]) st.push(k); } }
  const other = [...A.branch].filter((i) => !armSet.has(i) && !legAll.has(i) && !spine.includes(i) && B[i].deform !== false);
  const ys = B.map((b) => b.pos[1]); const H = Math.max(0.05, Math.max(...ys) - Math.min(...ys));
  const chainOf = (i) => { const ch = [i]; let y = i; while (true) { const ks = A.kids[y].filter((k) => !A.face(B[k])); if (!ks.length) break; y = ks.reduce((m, k) => (A.size[k] > A.size[m] ? k : m), ks[0]); ch.push(y); } return ch; };
  // a "front limb" for gestures when there are no arms: the leg whose tip is furthest forward (spider, quadruped), else the
  // highest side branch (antenna, ear, wing)
  let front = null; if (!arms.length) { const cand = legs.filter((l) => B[l[0]].pos[0] > 0).sort((a, b) => B[b[0]].pos[2] - B[a[0]].pos[2]); if (cand.length) front = cand[0]; else { const br = other.filter((i) => B[i].pos[0] >= 0).sort((a, b) => B[b].pos[1] - B[a].pos[1]); if (br.length) front = chainOf(br[0]); } }
  return (c._roles = { rootI, spine, head, neck, torso, arms, legs, other: other.map(chainOf), front, H }); }
SBX.bodyRoles = bodyRoles;
// solves world-rest-frame deltas into local rotations (parents first): D is {boneIdx: Quaternion (world delta)}
function solveLocal(c, D) { const B = c.ch.bones; const W = new Map(); const out = {}; const order = Object.keys(D).map(Number).sort((a, b) => depth(a) - depth(b));
  function depth(i) { let d = 0; for (let x = i; x >= 0; x = B[x].parent) d++; return d; }
  const cur = (x) => (c.st && c.st.L[x] ? new THREE.Quaternion().fromArray(c.st.L[x].q) : new THREE.Quaternion());
  const wq = (x) => { if (x < 0) return new THREE.Quaternion(); if (W.has(x)) return W.get(x); return wq(B[x].parent).multiply(cur(x)); }; // parents keep the pose they are in now
  const worldOf = (i) => wq(B[i].parent);
  for (const i of order) { const pw = worldOf(i); const lq = pw.clone().invert().multiply(D[i]); W.set(i, D[i]); out[B[i].name] = lq; } return out; }
const restDir = (c, i) => { const b = c.ch.bones[i]; const d = _V(b.tail || b.pos).sub(_V(b.pos)); return d.lengthSq() > 1e-10 ? d.normalize() : new THREE.Vector3(0, 1, 0); };
const aimQ = (c, i, dir) => new THREE.Quaternion().setFromUnitVectors(restDir(c, i), dir.clone().normalize());
const restArm = (c, ch) => { const H = hangDir(c, c.ch.bones[ch[0]].name); return aimQ(c, ch[0], H.want); };
const GEN_MOTIONS = {
  'Wave hello': { dur: 2.4, f(c, R, u) { const k = smooth(u * 5) * smooth((1 - u) * 5); const D = {}; const w = Math.sin(u * Math.PI * 6);
    const limb = R.arms[0] ? R.arms[0].L : R.front; if (limb) { const side = Math.sign(c.ch.bones[limb[0]].pos[0]) || 1; const rest = R.arms[0] ? restArm(c, limb) : new THREE.Quaternion();
      const up = aimQ(c, limb[0], new THREE.Vector3(side * 0.5, 0.85, 0.2)); const q0 = rest.clone().slerp(up, k); D[limb[0]] = q0;
      const osc = qAx(_AX.Z, side * 28 * w * k); if (limb[1] !== undefined) D[limb[1]] = osc.clone().multiply(q0); if (limb[2] !== undefined) D[limb[2]] = qAx(_AX.Z, side * 14 * Math.sin(u * Math.PI * 6 + 1) * k).multiply(osc).multiply(q0); }
    else for (const i of R.neck.concat([R.head])) D[i] = qAx(_AX.Z, 14 * w * k / (R.neck.length + 1));
    if (R.head !== undefined && !D[R.head]) D[R.head] = qAx(_AX.Z, -8 * k).multiply(qAx(_AX.Y, 6 * k));
    return { D }; } },
  'Nod yes': { dur: 1.4, f(c, R, u) { const a = 16 * Math.sin(u * Math.PI * 4) * (1 - u); const bs = R.neck.concat([R.head]); const L = {}; for (const i of bs) L[i] = qAx(_AX.X, a / bs.length); return { L }; } },
  'Shake head no': { dur: 1.4, f(c, R, u) { const a = 22 * Math.sin(u * Math.PI * 4) * (1 - u * 0.6); const bs = R.neck.concat([R.head]); const L = {}; for (const i of bs) L[i] = qAx(_AX.Y, a / bs.length); return { L }; } },
  'Look around': { dur: 4, f(c, R, u) { const s2 = Math.sin(u * Math.PI * 2); const bs = R.torso.slice(-1).concat(R.neck, [R.head]); const L = {}; bs.forEach((i, n) => { const wgt = (n + 1) / bs.reduce((a, _, m) => a + m + 1, 0); L[i] = qAx(_AX.Y, 50 * s2 * wgt).multiply(qAx(_AX.X, -4 * wgt * (1 - Math.cos(u * Math.PI * 4)))); }); return { L }; } },
  'Celebrate': { dur: 2.2, f(c, R, u) { const k = smooth(u * 5) * smooth((1 - u) * 5); const w = Math.sin(u * Math.PI * 6); const D = {}, L = {};
    for (const a of R.arms) for (const ch of [a.L, a.R]) { const side = Math.sign(c.ch.bones[ch[0]].pos[0]) || 1; const q0 = restArm(c, ch).slerp(aimQ(c, ch[0], new THREE.Vector3(side * (0.35 + 0.12 * w), 0.92, 0.05)), k); D[ch[0]] = q0; for (const x of ch.slice(1)) D[x] = qAx(_AX.Z, side * 12 * k).multiply(q0); }
    for (const ch of R.other) ch.forEach((i, n) => { L[c.ch.bones[i].name] = qAx(_AX.X, 18 * k * Math.sin(u * Math.PI * 8 + n)); });
    if (!R.arms.length && R.front) { const q0 = aimQ(c, R.front[0], new THREE.Vector3(0.4, 0.8, 0.4)); const qq = new THREE.Quaternion().slerp(q0, k); D[R.front[0]] = qq; }
    const Lh = {}; if (R.head !== undefined) Lh[R.head] = qAx(_AX.X, -12 * k).multiply(qAx(_AX.Z, 8 * w * k)); return { D, L: Lh, Ln: L, root: [0, Math.abs(Math.sin(u * Math.PI * 4)) * 0.08 * R.H * k, 0] }; } },
  'Bow': { dur: 2.4, f(c, R, u) { const k = Math.sin(Math.PI * u); const bs = R.torso.concat(R.neck, [R.head]); const L = {}; bs.forEach((i) => { L[i] = qAx(_AX.X, 55 * k / bs.length); }); return { L }; } },
  'Point forward': { dur: 2, f(c, R, u) { const k = smooth(u * 4) * smooth((1 - u) * 4); const D = {}; const limb = R.arms[0] ? R.arms[0].L : R.front;
    if (limb) { const side = Math.sign(c.ch.bones[limb[0]].pos[0]) || 1; const q0 = (R.arms[0] ? restArm(c, limb) : new THREE.Quaternion()).slerp(aimQ(c, limb[0], new THREE.Vector3(side * 0.18, 0.12, 1)), k); limb.forEach((x) => { D[x] = x === limb[0] ? q0 : aimQ(c, x, new THREE.Vector3(side * 0.18, 0.12, 1)).slerp(R.arms[0] ? restArm(c, limb) : new THREE.Quaternion(), 1 - k); }); }
    if (R.head !== undefined) D[R.head] = qAx(_AX.Y, 10 * k).multiply(qAx(_AX.X, -4 * k)); return { D }; } },
  'Thinking': { dur: 3, loop: true, f(c, R, u) { const D = {}; const L = {}; const a = R.arms[0]; const B = c.ch.bones;
    if (a && a.L.length >= 2 && R.head !== undefined) { const ch = a.L; const side = Math.sign(B[ch[0]].pos[0]) || 1; const hp = _V(B[R.head].pos); const sh = _V(B[ch[0]].pos); const L1 = _V(B[ch[0]].tail).distanceTo(sh), L2 = _V(B[ch[1]].tail || B[ch[1]].pos).distanceTo(_V(B[ch[1]].pos));
      const chin = hp.clone().add(new THREE.Vector3(side * 0.05 * R.H, -0.02 * R.H, 0.18 * R.H)); const elbowDir = new THREE.Vector3(side * 0.25, -0.55, 0.8).normalize(); let el = sh.clone().addScaledVector(elbowDir, L1);
      const q0 = aimQ(c, ch[0], elbowDir); D[ch[0]] = q0; const d2 = chin.clone().sub(el); D[ch[1]] = aimQ(c, ch[1], d2.lengthSq() > 1e-8 ? d2 : new THREE.Vector3(0, 1, 0)); if (ch[2] !== undefined) D[ch[2]] = D[ch[1]].clone(); void L2; }
    if (R.head !== undefined) L[R.head] = qAx(_AX.Z, 10).multiply(qAx(_AX.X, -6 + 3 * Math.sin(u * Math.PI * 2))).multiply(qAx(_AX.Y, -10)); return { D, L }; } },
  'Spin': { dur: 1.6, f(c, R, u) { return { yaw: 360 * smooth(u) }; } },
  'Hover idle': { dur: 2.6, loop: true, f(c, R, u) { const L = {}; const B = c.ch.bones; const s2 = (o) => Math.sin(u * Math.PI * 2 + o);
    for (const lg of R.legs) { if (lg[1] !== undefined) L[B[lg[1]].name] = qAx(_AX.X, 24 + 8 * s2(B[lg[0]].pos[0] > 0 ? 0 : 1.2)); }
    R.other.forEach((ch, n) => ch.forEach((i, m) => { L[B[i].name] = qAx(_AX.X, (6 + 6 * s2(n + m * 0.6)) / ch.length * 2); })); return { Ln: L }; } },
};
function genSample(c, name, u) { const M = GEN_MOTIONS[name]; const R = bodyRoles(c); const r = M.f(c, R, u) || {}; const out = {};
  if (r.D) Object.assign(out, solveLocal(c, r.D));
  for (const [i, q] of Object.entries(r.L || {})) { const bn = c.ch.bones[+i] ? c.ch.bones[+i].name : null; if (bn) out[bn] = q; }
  for (const [bn, q] of Object.entries(r.Ln || {})) out[bn] = q;
  // arms the motion leaves alone keep their measured resting hang
  for (const a of R.arms) for (const ch of [a.L, a.R]) { const bn = c.ch.bones[ch[0]].name; if (!out[bn] && Object.keys(out).length) { const sol = solveLocal(c, { [ch[0]]: restArm(c, ch) }); Object.assign(out, sol); } }
  return { q: out, root: r.root || null, yaw: r.yaw || 0 }; }
SBX.genSample = genSample;
// ---- procedural poses / animations in BODY terms: each key aims limbs in the character's own space (+Z forward, +Y up, +X its left)
// and bends spine / neck / head by degrees; the page solves it on each character's own skeleton (bodyRoles), so one clip fits any body
// plan and proportions. pose: { "arm.L": {dir:[x,y,z], bend:deg}, "arm.R": …, "leg.L"/"leg.R"/"leg.<n>": {dir, bend}, "front": {dir, bend},
// "spine": [x,y,z] deg, "neck": [x,y,z], "head": [x,y,z], "tail": [x,y,z] (spread down the chain) }
function procLimbs(R, c) { const B = c.ch.bones; const map = {}; const side = (ch) => (B[ch[0]].pos[0] >= 0 ? 'L' : 'R');
  R.arms.forEach((a, k) => { map[(k ? 'arm' + (k + 1) : 'arm') + '.L'] = a.L; map[(k ? 'arm' + (k + 1) : 'arm') + '.R'] = a.R; });
  const legs = R.legs.slice().sort((a, b) => B[b[0]].pos[2] - B[a[0]].pos[2]); const cnt = { L: 0, R: 0 };
  for (const l of legs) { const s = side(l); cnt[s]++; map['leg.' + s + (cnt[s] > 1 ? '.' + cnt[s] : '')] = l; if (cnt[s] === 1 && legs.length > 2) map['frontleg.' + s] = l; } if (R.front) map.front = R.front; return map; }
function procPose(c, P) { const R = bodyRoles(c); const B = c.ch.bones; const D = {}, L = {}; const limbs = procLimbs(R, c);
  for (const [k, v] of Object.entries(P || {})) { const ch = limbs[k]; if (!ch || !v || !Array.isArray(v.dir)) continue; const dir = new THREE.Vector3(...v.dir); if (dir.lengthSq() < 1e-8) continue; dir.normalize(); D[ch[0]] = aimQ(c, ch[0], dir);
    if (ch[1] !== undefined) { const ax = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)).normalize(); const d2 = dir.clone().applyAxisAngle(ax, -(v.bend || 0) * Math.PI / 180 * (k.startsWith('leg') || k.startsWith('frontleg') ? -1 : 1)); D[ch[1]] = aimQ(c, ch[1], d2); for (const x of ch.slice(2)) D[x] = aimQ(c, x, d2); } }
  const spread = (bones, e) => { if (!bones.length || !Array.isArray(e)) return; for (const i of bones) L[i] = new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0] / bones.length * Math.PI / 180, e[1] / bones.length * Math.PI / 180, e[2] / bones.length * Math.PI / 180)); };
  if (P) { spread(R.torso, P.spine); spread(R.neck, P.neck); if (R.head !== undefined) spread([R.head], P.head); const tail = R.other.find((ch) => /tail/i.test(B[ch[0]].name)) || null; if (tail) spread(tail, P.tail); }
  const out = Object.keys(D).length ? solveLocal(c, D) : {}; for (const [i, q] of Object.entries(L)) if (B[+i]) out[B[+i].name] = q; return out; }
function procSample(c, clip, t) { const K = clip.proc; if (!K || !K.length) return { q: {}, root: null }; let a = K[0], b = K[K.length - 1]; for (let i = 0; i < K.length - 1; i++) if (t >= K[i].t && t <= K[i + 1].t) { a = K[i]; b = K[i + 1]; break; }
  const k = b.t > a.t ? smooth((t - a.t) / (b.t - a.t)) : 0; const qa = procPose(c, a.pose), qb = a === b ? qa : procPose(c, b.pose); const out = {}; const rest = new THREE.Quaternion();
  for (const n of new Set([...Object.keys(qa), ...Object.keys(qb)])) out[n] = (qa[n] || rest).clone().slerp(qb[n] || rest, k);
  const R = bodyRoles(c); const ra = a.root || [0, 0, 0], rb = b.root || ra; return { q: out, root: [0, 1, 2].map((j) => (ra[j] + (rb[j] - ra[j]) * k) * R.H) }; }
SBX.procPose = procPose;
// ---- ragdoll: falls, knock-backs, blasts, tumbles are SIMULATED, not keyframed. Every joint becomes a particle (verlet), bone lengths
// are held, joints cannot fold flat, gravity pulls, the ground and solid objects stop it with friction; the skeleton follows the
// particles. It settles, then (unless it should stay down) blends back up to its pose.
const RAG = new Map();
function ragdoll(c, o = {}) { if (!c || !c.ch) throw new Error('No such character'); if (RAG.has(c)) RAG.delete(c); stopClip(c); c.group.updateMatrixWorld(true); const B = c.ch.bones; const n = B.length;
  const pos = [], prev = []; const imp = new THREE.Vector3(...(Array.isArray(o.impulse) ? o.impulse : [0, 0, 0])); const H = bodyRoles(c).H * (c.group.scale.y || 1);
  for (let i = 0; i < n; i++) { const p = c.bones[i].getWorldPosition(new THREE.Vector3()); pos.push(p); prev.push(p.clone().addScaledVector(imp, -1 / 60).addScaledVector(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5), 0.002 * H)); }
  const tips = []; for (let i = 0; i < n; i++) if (!B.some((b) => b.parent === i) && B[i].tail) { const t = new THREE.Vector3(...B[i].tail).applyMatrix4(c.group.matrixWorld); tips.push({ i, k: pos.length }); pos.push(t); prev.push(t.clone().addScaledVector(imp, -1 / 60)); }
  const cons = []; const len = (a, b) => pos[a].distanceTo(pos[b]); for (let i = 0; i < n; i++) { const p = B[i].parent; if (p >= 0) { cons.push([p, i, len(p, i), 1]); const g = B[p].parent; if (g >= 0) cons.push([g, i, len(g, i) * 0.55, 0]); } } for (const t of tips) cons.push([t.i, t.k, len(t.i, t.k), 1]);
  const mo = { gait: c.mo && c.mo.gait, grounded: c.mo && c.mo.grounded }; if (c.mo) { c.mo.gait = false; c.mo.grounded = false; } if (c.walk) c.walk = null;
  const st0 = c.st ? c.st.L.map((x) => x.q.slice()) : null;
  const tipOf = new Map(tips.map((t) => [t.i, t.k])); const main = B.map((b, i) => { const kids = B.map((x, j) => j).filter((j) => B[j].parent === i); return kids.length ? kids.reduce((m, x) => (pBone(B, x) > pBone(B, m) ? x : m), kids[0]) : tipOf.get(i); });
  RAG.set(c, { main, pos, prev, cons, tips, t: 0, still: 0, H, mo, st0, stay: !!o.stay, dur: clamp(o.duration || 6, 0.5, 30), phase: 'sim', rec: 0, gq: c.group.quaternion.clone(), gy: c.group.rotation.y }); return 'ragdolling'; }
function ragRecover(c) { const R = RAG.get(c); if (!R) return 'not ragdolling'; R.phase = 'recover'; R.rec = 0; R.from = c.st.L.map((x) => x.q.slice()); return 'getting up'; }
SBX.ragdoll = ragdoll; SBX.ragRecover = ragRecover;
try { renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); console.error('[graphics] the GPU reset the 3D view (too much at once) — it comes back by itself'); }, false); renderer.domElement.addEventListener('webglcontextrestored', () => { try { toast('3D view restored'); } catch (e) { /* ok */ } }, false); } catch (e) { /* ok */ }
// ---- body-part helpers for the AI's code: things come FROM the right part of the body (a throw leaves the hand, a shout the mouth)
const roleBone = (c, role) => { const R = bodyRoles(c); const B = c.ch.bones; const r0 = String(role || 'hand.R').toLowerCase(); const side = /\.l$|left/.test(r0) ? 'L' : /\.r$|right/.test(r0) ? 'R' : 'R';
  const arm = R.arms[0] ? (side === 'L' ? R.arms[0].L : R.arms[0].R) : R.front; const legs = R.legs.filter((l) => (B[l[0]].pos[0] >= 0) === (side === 'L'));
  if (/hand|paw|fist|grip/.test(r0)) return arm ? arm[arm.length - 1] : R.head; if (/elbow|forearm/.test(r0)) return arm ? arm[Math.min(1, arm.length - 1)] : R.head; if (/shoulder|upperarm/.test(r0)) return arm ? arm[0] : R.head;
  if (/foot|toe/.test(r0)) return legs[0] ? legs[0][legs[0].length - 1] : R.rootI; if (/knee|leg/.test(r0)) return legs[0] ? legs[0][Math.min(1, legs[0].length - 1)] : R.rootI;
  if (/head|mouth|face|eye/.test(r0)) return R.head; if (/chest|torso|spine/.test(r0)) return R.torso[R.torso.length - 1] ?? R.rootI; if (/hip|pelvis|root/.test(r0)) return R.rootI; if (/tail/.test(r0)) { const t = R.other.find((ch) => /tail/i.test(B[ch[0]].name)); return t ? t[t.length - 1] : R.rootI; }
  const i = c.ch.bi[role]; return i !== undefined ? i : R.head; };
const castOf = (x) => (x && x.ch ? x : CAST.CASTS.find((k) => k.id === String(x).replace(/^cast:/, '')));
SBX.bonePos = (who, role) => { const c = castOf(who); if (!c) return null; const i = roleBone(c, role); const b = c.bones[i]; b.updateWorldMatrix(true, false); const B = c.ch.bones[i]; if (/hand|paw|fist|grip|foot|toe/.test(String(role).toLowerCase()) && B.tail) return new THREE.Vector3(...B.tail).applyMatrix4(c.group.matrixWorld); if (/mouth/.test(String(role))) { const p = SBX.headTop ? SBX.headTop(c) : b.getWorldPosition(new THREE.Vector3()); return b.getWorldPosition(new THREE.Vector3()).lerp(p, 0.35).add(new THREE.Vector3(0, 0, 0.08 * (c.group.scale.y || 1)).applyQuaternion(c.group.quaternion)); } return b.getWorldPosition(new THREE.Vector3()); };
SBX.boneObject = (who, role) => { const c = castOf(who); return c ? c.bones[roleBone(c, role)] : null; };
SBX.attach = (obj, who, role = 'hand.R', offset = null) => { const o3 = obj && obj.isObject3D ? obj : SBX.get(obj); const bone = SBX.boneObject(who, role); if (!o3 || !bone) return false; if (offset) { o3.position.copy(SBX.bonePos(who, role)).add(new THREE.Vector3(...offset)); } bone.attach(o3); o3.userData.heldBy = { who: castOf(who).id, role }; return true; };
SBX.detach = (obj) => { const o3 = obj && obj.isObject3D ? obj : SBX.get(obj); if (!o3) return false; scene.attach(o3); delete o3.userData.heldBy; return true; };
SBX.handVelocity = (who, role = 'hand.R') => { const c = castOf(who); if (!c) return new THREE.Vector3(); const k = c.id + '|' + role; const p = SBX.bonePos(c, role); const now = performance.now(); const last = (SBX._hv || (SBX._hv = new Map())).get(k); SBX._hv.set(k, { p: p.clone(), t: now }); return last && now > last.t ? p.sub(last.p).multiplyScalar(1000 / (now - last.t)) : new THREE.Vector3(); };
function ragTick(dt) { if (!RAG.size) return; dt = Math.min(dt, 1 / 30);
  for (const [c, R] of RAG) { const B = c.ch.bones, n = B.length;
    if (R.phase === 'sim') { R.t += dt; const g = -9.81 * dt * dt; let maxV = 0; const rad = 0.015 * R.H;
      for (let i = 0; i < R.pos.length; i++) { const p = R.pos[i], q = R.prev[i]; const vx = (p.x - q.x) * 0.995, vy = (p.y - q.y) * 0.995, vz = (p.z - q.z) * 0.995; q.copy(p); p.x += vx; p.y += vy + g; p.z += vz; maxV = Math.max(maxV, Math.hypot(vx, vy, vz) / dt); }
      const floors = R.pos.map((p) => { const gy = groundBelow(p.x, p.z, p.y + 0.5 * R.H, 3 * R.H); return (gy === null ? -1e9 : gy) + rad; });
      for (let it = 0; it < 8; it++) { for (const [a, b, L0, hard] of R.cons) { const pa = R.pos[a], pb = R.pos[b]; const d = pb.clone().sub(pa); const l = d.length() || 1e-6; if (!hard && l >= L0) continue; const diff = (l - L0) / l * 0.5; pa.addScaledVector(d, diff); pb.addScaledVector(d, -diff); }
        for (let i = 0; i < R.pos.length; i++) { const p = R.pos[i]; const floor = floors[i]; if (p.y < floor) { p.y = floor; const q = R.prev[i]; q.x = p.x - (p.x - q.x) * 0.6; q.z = p.z - (p.z - q.z) * 0.6; /* friction */ } } }
      R.still = maxV < 0.08 * Math.max(1, R.H) ? R.still + dt : 0; if (!R.stay && (R.still > 0.8 || R.t > R.dur)) ragRecover(c);
      // skeleton follows the particles: the root goes where its particle is, each bone points at its child / tip
      const roots = B.map((b, i) => i).filter((i) => B[i].parent < 0); const ri = roots[0]; const off = R.pos[ri].clone().sub(c.bones[ri].getWorldPosition(new THREE.Vector3())); c.group.position.add(off); c.group.updateMatrixWorld(true);
      const gi = c.group.getWorldQuaternion(new THREE.Quaternion()).invert(); const D = {};
      for (let i = 0; i < n; i++) { if (B[i].region === 'Face') continue; const j = R.main[i]; if (j === undefined) continue; const d = R.pos[j].clone().sub(R.pos[i]); if (d.lengthSq() < 1e-10) continue; d.applyQuaternion(gi); D[i] = aimQ(c, i, d); }
      if (!c.st) c.st = RPC.newState(c.ch); const loc = solveLocal(c, D); for (const [bn, q] of Object.entries(loc)) { const i = c.ch.bi[bn]; if (i !== undefined && c.st.L[i]) c.st.L[i] = { ...c.st.L[i], q: q.toArray() }; } c.syncToBones();
    } else { R.rec = Math.min(1, R.rec + dt / 0.9); const k = smooth(R.rec); if (R.st0) for (let i = 0; i < n; i++) { const a = new THREE.Quaternion().fromArray(R.from[i]), b = new THREE.Quaternion().fromArray(R.st0[i]); c.st.L[i] = { ...c.st.L[i], q: a.slerp(b, k).toArray() }; }
      const gy = groundBelow(c.group.position.x, c.group.position.z, c.group.position.y + R.H, 4 * R.H); if (gy !== null && c !== ollo) c.group.position.y += (gy - c.group.position.y) * k * 0.3; c.syncToBones();
      if (R.rec >= 1) { if (c.mo) { c.mo.gait = R.mo.gait; c.mo.grounded = R.mo.grounded; } c.want = { x: c.group.position.x, z: c.group.position.z }; RAG.delete(c); } } } }
const pBone = (B, i) => { let s = 1; const st = [i]; while (st.length) { const x = st.pop(); for (let j = 0; j < B.length; j++) if (B[j].parent === x) { s++; st.push(j); } } return s; };
function sampleClip(clip, c, t) { // -> {bone: Quaternion}, root offset
  const dur = clip.duration || 1; let u = clip.loop ? ((t % dur) + dur) % dur : Math.min(t, dur);
  if (clip.proc) return procSample(c, clip, u);
  if (clip.gen && GEN_MOTIONS[clip.name]) return genSample(c, clip.name, u / dur); const K = clip.keys; const out = {}; let root = null;
  if (!K || !K.length) return { q: out, root };
  let a = K[0], b = K[K.length - 1]; for (let i = 0; i < K.length - 1; i++) if (u >= K[i].t && u <= K[i + 1].t) { a = K[i]; b = K[i + 1]; break; }
  const k = b.t > a.t ? smooth((u - a.t) / (b.t - a.t)) : 0;
  const names = new Set([...Object.keys(a.bones || {}), ...Object.keys(b.bones || {})]);
  for (const n of names) { const bn = resolveBone(c, n); if (!bn) continue; const ea = (a.bones || {})[n] || [0, 0, 0], eb = (b.bones || {})[n] || ea; out[bn] = retargetQ(c, bn, eul(ea).slerp(eul(eb), k)); }
  for (const [bn] of retarget(c).down) if (!out[bn] && Object.keys(out).length) out[bn] = retargetQ(c, bn, new THREE.Quaternion()); // arms the clip leaves alone stay down, not snapped back into the T
  if (a.root || b.root) { const ra = a.root || { pos: [0, 0, 0] }, rb = b.root || ra; root = (ra.pos || [0, 0, 0]).map((v, i) => v + ((rb.pos || [0, 0, 0])[i] - v) * k); }
  return { q: out, root };
}
// built-in procedural clips (any character): generated, not hand-tabulated
function proc(name) {
  const S = (f) => { const keys = []; const n = 24, dur = f.dur; for (let i = 0; i <= n; i++) { const t = dur * i / n; keys.push({ t, bones: f.at(t / dur, t) }); } return { name, duration: dur, loop: !!f.loop, keys, builtin: true }; };
  const s = Math.sin, PI2 = Math.PI * 2;
  const lib = {
    'Wave hello': { dur: 2.4, at: (u) => { const k = smooth(u * 5) * smooth((1 - u) * 5); return { 'Arm_Upper.L': [0, -10 * k, 145 * k], 'Arm_Lower.L': [0, 0, (20 + 28 * s(u * PI2 * 3)) * k], 'Hand.L': [0, 0, 12 * s(u * PI2 * 3 + 1) * k], Head: [-4 * k, 6 * k, 8 * k] }; } },
    'Nod yes': { dur: 1.4, at: (u) => ({ Head: [14 * s(u * PI2 * 2) * (1 - u), 0, 0], Neck: [5 * s(u * PI2 * 2), 0, 0] }) },
    'Shake head no': { dur: 1.4, at: (u) => ({ Head: [0, 20 * s(u * PI2 * 2) * (1 - u * 0.6), 0] }) },
    'Look around': { dur: 4, at: (u) => ({ Head: [-6 + 6 * s(u * PI2), 40 * s(u * PI2), 4 * s(u * PI2 * 2)], Neck: [0, 12 * s(u * PI2), 0] }) },
    'Celebrate': { dur: 2.2, at: (u) => { const k = smooth(u * 5) * smooth((1 - u) * 5); return { 'Arm_Upper.L': [0, 0, (140 + 20 * s(u * PI2 * 3)) * k], 'Arm_Upper.R': [0, 0, -(140 + 20 * s(u * PI2 * 3)) * k], 'Arm_Lower.L': [0, 0, 18 * k], 'Arm_Lower.R': [0, 0, -18 * k], Head: [-12 * k, 0, 8 * s(u * PI2 * 3) * k], Torso_Upper: [-6 * k, 0, 0] }; } },
    'Bow': { dur: 2.4, at: (u) => { const k = Math.sin(Math.PI * u); return { Torso_Lower: [28 * k, 0, 0], Torso_Upper: [18 * k, 0, 0], Head: [12 * k, 0, 0], 'Arm_Upper.L': [-14 * k, 0, 0], 'Arm_Upper.R': [-14 * k, 0, 0] }; } },
    'Point forward': { dur: 2, at: (u) => { const k = smooth(u * 4) * smooth((1 - u) * 4); return { 'Arm_Upper.L': [-85 * k, 0, 10 * k], 'Arm_Lower.L': [0, 0, 0], Head: [-4 * k, 10 * k, 0] }; } },
    'Thinking': { dur: 3, loop: true, at: (u) => ({ 'Arm_Upper.L': [-35, 0, 12], 'Arm_Lower.L': [-115, 0, 0], Head: [-6 + 3 * s(u * PI2), -10, 10], 'Arm_Upper.R': [-10, 0, -6], 'Arm_Lower.R': [-70, 0, 0] }) },
    'Spin': { dur: 1.6, at: (u) => ({ Root: [0, 360 * smooth(u), 0] }) },
    'Hover idle': { dur: 2.6, loop: true, at: (u) => ({ 'Leg_Lower.L': [24 + 8 * s(u * PI2), 0, 0], 'Leg_Lower.R': [24 + 8 * s(u * PI2 + 1.2), 0, 0], Tail_1: [8 + 6 * s(u * PI2), 0, 0] }) },
  };
  return lib[name] ? S(lib[name]) : null;
}
const BUILTIN_CLIPS = ['Wave hello', 'Nod yes', 'Shake head no', 'Look around', 'Celebrate', 'Bow', 'Point forward', 'Thinking', 'Spin', 'Hover idle'];
for (const n of BUILTIN_CLIPS) { const p = proc(n); SBX.anims.set(n, { ...p, duration: GEN_MOTIONS[n].dur, loop: !!GEN_MOTIONS[n].loop, gen: true }); }
// play a clip on any character: layered over its base pose, faded in/out
const PLAY = new Map(); // cast -> {clip, t, w, fade}
function findClip(name) { if (typeof name !== 'string') return name; if (SBX.anims.has(name)) return SBX.anims.get(name); const n = name.toLowerCase().replace(/[^a-z0-9]/g, ''); for (const [k, v] of SBX.anims) if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === n) return v; return null; }
function playClip(c, name, o = {}) { const clip = findClip(name); if (!clip) throw new Error('No animation called ' + name + '. Available: ' + [...SBX.anims.keys()].join(', ')); if (!c || !c.ch) throw new Error('No such character');
  if (!c.st || !c.st.L || c.st.L.length !== c.ch.bones.length) c.st = RPC.newState(c.ch); c.group.visible = true;
  const old = PLAY.get(c); const np = { clip, t: 0, w: 0, loops: o.loops ?? (clip.loop ? Infinity : 1), speed: clamp(o.speed || 1, 0.05, 8) };
  if (old) { if (old.lim && c.ch._lim) for (const [i, v] of old.lim) c.ch._lim[i] = v; np.home = old.home || old.base; np.homeTouched = new Set([...(old.homeTouched || []), ...(old.touched || [])]); }
  PLAY.set(c, np); c._clipYaw = 0; c._clipRoot = null; return clip.duration * (clip.loop ? 1 : 1); }
function stopClip(c) { const p = PLAY.get(c); if (p) p.stop = true; }
SBX.playClip = playClip; SBX.stopClip = stopClip; SBX.PLAYMAP = PLAY;
function applyClipLayer(c, dt) { try { applyClipLayerRaw(c, dt); } catch (e) { console.warn('animation', c.id, e); const p = PLAY.get(c); if (p && p.lim && c.ch._lim) for (const [i, v] of p.lim) c.ch._lim[i] = v; c._clipYaw = 0; c._clipRoot = null; PLAY.delete(c); try { SBX.feed && SBX.feed('err', `Animation “${p && p.clip && p.clip.name}” failed on ${c.id}: ${e.message || e}`); } catch (e2) { /* ok */ } } }
function applyClipLayerRaw(c, dt) { // writes the clip over the character's authored pose (c.st.L)
  const p = PLAY.get(c); if (!p) return; p.t += dt * p.speed; const dur = p.clip.duration || 1; const done = p.stop || (!p.clip.loop && p.t >= dur) || (p.clip.loop && p.t >= dur * p.loops);
  // the clip is a layer over the pose the character had when it started: blended in and out from that pose, and that pose is
  // restored exactly when it ends (nothing stays stuck: arms, legs and hips go back where they were)
  const live = c === ollo && !OH.manual; if (!p.base || live) { p.base = new Map(); for (let i = 0; i < c.st.L.length; i++) p.base.set(i, c.st.L[i].q.slice()); }
  p.w = clamp(p.w + (done ? -dt * 4 : dt * 5), 0, 1);
  if (done && p.w <= 0) { if (!live) { const home = p.home || p.base; const tset = new Set([...(p.touched || []), ...(p.homeTouched || [])]); for (const [i, q0] of home) if (tset.has(i) && c.st.L[i]) c.st.L[i] = { ...c.st.L[i], q: q0 }; } c._clipYaw = 0; c._clipRoot = null; if (p.lim) { for (const [i, v] of p.lim) c.ch._lim[i] = v; } PLAY.delete(c); return; }
  const { q, root, yaw } = sampleClip(p.clip, c, Math.min(p.t, p.clip.loop ? p.t : dur)); p.touched = p.touched || new Set(); if (yaw !== undefined) c._clipYaw = yaw * Math.PI / 180 * p.w;
  for (const [bn, qq] of Object.entries(q)) { const i = c.ch.bi[bn]; if (i === undefined) continue; if (bn === 'Root') { c._clipYaw = new THREE.Euler().setFromQuaternion(qq, 'YXZ').y * p.w; continue; } p.touched.add(i); { const lim = c.ch._lim || (c.ch._lim = RPC.boneLimits(c.ch)); p.lim = p.lim || new Map(); if (!p.lim.has(i)) { p.lim.set(i, lim[i]); lim[i] = null; } } const cur = new THREE.Quaternion().fromArray(p.base.get(i)); cur.slerp(qq, p.w); c.st.L[i] = { ...c.st.L[i], q: cur.toArray() }; }
  if (root) c._clipRoot = root.map((v) => v * p.w);
}
// the hover controller
const UP = new THREE.Vector3(0, 1, 0);
function olloTick(dt) { if (RAG.has(ollo)) return; /* the ragdoll owns his body until he is back up */
  const st = CAST.studio; if (st && st.drives && st.drives(ollo)) return;
  const g = ollo.group; OH.t += dt; const p = g.position;
  const ground = groundBelow(p.x, p.z, p.y + 0.3, 80); const rawFloorY = ground === null ? -50 : ground;
  if (OH.floorY === undefined || !Number.isFinite(OH.floorY) || Math.abs(rawFloorY - OH.floorY) > 2.5) OH.floorY = rawFloorY;
  else OH.floorY += (rawFloorY - OH.floorY) * (1 - Math.exp(-dt * 12));
  const floorY = Math.max(rawFloorY - 0.02, OH.floorY);
  let want = null, cruise = floorY + OH.hover;
  const playerHover = PLAYER.c === ollo && PLAYER.kind === 'hover';
  if (OH.target) { const T = OH.target; const tp = T.p; const dx = tp.x - p.x, dz = tp.z - p.z, dist = Math.hypot(dx, dz), dy = tp.y - p.y; const d3 = Math.hypot(dist, dy);
    // look ahead: anything solid in the way at body height? climb over it
    if (dist > 0.05) { const dir = new THREE.Vector3(dx, 0, dz).normalize(); const look = Math.min(dist, 0.6 + OH.speed * 0.7); for (const hgt of [0.12, 0.36, 0.62]) { const hit = castRay(new THREE.Vector3(p.x, p.y + hgt, p.z), dir, look + BODY_R); if (hit) { /* only climb over things he could fly over (look for the obstacle top just above him, never a roof/ceiling far up) */ const top = groundBelow(hit.point.x + dir.x * 0.3, hit.point.z + dir.z * 0.3, p.y + 3.2, 80); if (top !== null && top - floorY < 4) T.climb = Math.max(T.climb || 0, top + OH.hover + 0.15); } } }
    const tY = Math.max(tp.y, (T.climb || -1e9)); if (dist < 0.4) T.climb = null;
    want = new THREE.Vector3(tp.x, tY, tp.z); const sp = T.speed || 2.2; const arrive = clamp(d3 / 1.2, 0.08, 1);
    const desired = want.clone().sub(p); const L = desired.length(); if (L > 1e-4) desired.multiplyScalar(sp * arrive / L);
    OH.vel.lerp(desired, 1 - Math.exp(-dt * 3.2));
    if (d3 < 0.1 && OH.vel.length() < 0.25) { const cb = T.onArrive; OH.target = null; OH.vel.multiplyScalar(0.5); if (cb) cb(); }
    if (dist > 0.15) OH.yawTarget = Math.atan2(dx, dz);
  } else {
    /* idle height follows the ground under him (never stuck at an old high point), capped low unless a high spot was asked for on purpose */ const yWant = Math.max(cruise, Math.min(OH.holdY ?? -1e9, floorY + (OH.allowHigh || playerHover ? 60 : OH.hover + 4.5)));
    if (!playerHover) { OH.vel.x *= Math.exp(-dt * 4); OH.vel.z *= Math.exp(-dt * 4); }
    const yErr = yWant - p.y;
    const vyWant = clamp(yErr * (playerHover ? 5.2 : 3.8), -4.5, 4.5);
    OH.vel.y += (vyWant - OH.vel.y) * (1 - Math.exp(-dt * (playerHover ? 10 : 7)));
  }
  p.addScaledVector(OH.vel, dt);
  // never into the floor or a wall: soft-damped pushout prevents jitter against edges
  if (p.y < rawFloorY + 0.05) { p.y = rawFloorY + 0.05; OH.vel.y = Math.max(0, OH.vel.y); }
  const c = new THREE.Vector3(p.x, p.y + 0.36, p.z);
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0.7, 0, 0.7], [-0.7, 0, 0.7], [0.7, 0, -0.7], [-0.7, 0, -0.7]]) { const dv = new THREE.Vector3(...d).normalize(); const rad = BODY_R + (d[1] ? 0.22 : 0); const hit = castRay(c, dv, rad); if (hit) { const pen = rad - hit.distance; if (pen > 0.004) { p.addScaledVector(dv, -pen * 0.72); const vn = OH.vel.dot(dv); if (vn > 0) OH.vel.addScaledVector(dv, -vn); } } }
  // hover bob (fades out at speed and in FPV so the camera stays steady), lean into motion, bank smoothly into turns
  OH.speed = Math.hypot(OH.vel.x, OH.vel.z); const still = 1 - smooth(OH.speed / 0.6);
  const bob = (CHK.fpv && PLAYER.c === ollo) ? 0 : Math.sin(OH.t * 2 * Math.PI / 2.6) * 0.022 * still;
  if (OH.yawTarget !== null && OH.yawTarget !== undefined) {
    const dy = RPC.angDiff(OH.yawTarget, g.rotation.y);
    const maxStep = dt * (playerHover ? 9.0 : 4.2);
    const turn = clamp(dy * (1 - Math.exp(-dt * (playerHover ? 10 : 6))), -maxStep, maxStep);
    g.rotation.y += turn;
    const angRate = clamp(turn / Math.max(dt, 1e-3), -5, 5);
    OH.roll += (-angRate * 0.09 - OH.roll) * (1 - Math.exp(-dt * 7));
  } else {
    OH.roll *= Math.exp(-dt * 7);
  }
  const fwd = OH.vel.x * Math.sin(g.rotation.y) + OH.vel.z * Math.cos(g.rotation.y);
  const targetPitch = (CHK.fpv && PLAYER.c === ollo) ? clamp(fwd * 0.06, -0.08, 0.12) : clamp(fwd * 0.2, -0.28, 0.38);
  OH.pitch += (targetPitch - OH.pitch) * (1 - Math.exp(-dt * 6));
  g.rotation.x = OH.pitch; g.rotation.z = (CHK.fpv && PLAYER.c === ollo) ? clamp(OH.roll * 0.25, -0.08, 0.08) : clamp(OH.roll, -0.32, 0.32);
  g.position.y = p.y; ollo._bob = bob;
  // pose: hover <-> flying by speed; then any playing clip; then expression stays as set
  if (!OH.manual) { const fw = smooth((OH.speed - 0.5) / 1.4); blendPoses(ollo, [{ q: PQ.hover, w: 1 - fw, wsum: 1 }, { q: PQ.fly, w: fw, wsum: 1 }]); if (fw === 0 && OH.poseBase !== 'Hovering (relaxed)') { const q = poseQ(ollo.ch, OH.poseBase); blendPoses(ollo, [{ q, w: 1, wsum: 1 }]); } }
  applyClipLayer(ollo, dt);
  // the wand is held like a walking staff: it stays nearly upright in his fist whatever the arm does
  if (wand.userData.held) { handR.updateWorldMatrix(true, false); const hq = handR.getWorldQuaternion(new THREE.Quaternion()); const up = new THREE.Vector3(0, 1, 0); const want = new THREE.Quaternion().setFromUnitVectors(up.clone().applyQuaternion(hq), new THREE.Vector3(Math.sin(ollo.group.rotation.y) * 0.12, 1, Math.cos(ollo.group.rotation.y) * 0.12).normalize()); const wq = want.multiply(hq); wand.quaternion.copy(hq.clone().invert().multiply(wq)); }
  // the lantern glows and flickers softly
  if (wand.userData.light) { const fl = 0.85 + 0.15 * Math.sin(OH.t * 13.1) * Math.sin(OH.t * 7.7 + 1); wand.userData.light.intensity = 0.35 * fl; wand.userData.flame.scale.set(1, 1.5 * (0.92 + 0.08 * fl), 1); }
}
// bob is applied visually after the cast pipeline wrote the group transform (so it never accumulates)
SBX.ollo.controller = OH;
SBX.olloFlyTo = (pt, o = {}) => new Promise((res) => { const p = new THREE.Vector3(...pt); if (o.ground !== false) { const gy = groundBelow(p.x, p.z, p.y + 30, 80); const base = (gy ?? 0) + OH.hover; if (p.y < base) p.y = base; if (!o.high && p.y > base + 4.5) p.y = base + 4.5; } OH.allowHigh = !!o.high; OH.holdY = p.y; OH.target = { p, speed: o.speed || 2.2, onArrive: () => res(true) }; setTimeout(() => { if (OH.target && OH.target.p === p) { OH.target = null; res(false); } }, o.timeout || 25000); });
SBX.olloTeleport = (pt, yaw) => { const p = new THREE.Vector3(...pt); const gy = groundBelow(p.x, p.z, p.y + 30, 80); const base = (gy ?? 0) + OH.hover; if (p.y < base) p.y = base; ollo.group.position.copy(p); OH.vel.set(0, 0, 0); OH.holdY = p.y; OH.floorY = gy ?? 0; OH.target = null; if (yaw !== undefined) { ollo.group.rotation.y = yaw; OH.yawTarget = yaw; } resolveOllo(); try { if (typeof resetCaineCoat === 'function') resetCaineCoat(); } catch (e) { /* ok */ } };
SBX.olloFace = (pt) => { const g = ollo.group.position; OH.yawTarget = Math.atan2(pt[0] - g.x, pt[2] - g.z); };
function resolveOllo(boxes) { // after anything is built: if it swallowed Ollo, lift him out on top (or step him back)
  rebuildSolids(); const p = ollo.group.position; for (let k = 0; k < 40; k++) { const c = new THREE.Vector3(p.x, p.y + 0.36, p.z); let inside = false; /* lift out onto what swallowed him, never onto a roof far above */
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]]) { const hit = castRay(c, new THREE.Vector3(...d), BODY_R); if (hit) { inside = true; break; } }
    if (!inside) return false; const top = groundBelow(p.x, p.z, p.y + 3, 60); p.y = Math.max(p.y + 0.25, (top ?? p.y) + OH.hover); OH.holdY = p.y; }
  return true;
}
SBX.resolveOllo = resolveOllo;
// speech bubble (+ optional voice)
const bubble = h('div', { class: 'bubble', style: 'opacity:0' }); let bubbleT = 0; let tts = null; let ttsOn = false;
SBX.isOllo = (id) => /^(cast:)?ollo$/i.test(String(id || ''));
SBX.say = (text) => { bubble.textContent = text; bubble.style.opacity = '1'; bubbleT = 2.5 + text.length * 0.055; try { const fw = ollo.ch.face.talk; if (fw) RPC.applyExpression(ollo.ch, ollo.st, 'Talking'); } catch (e) { /* face optional */ } if (ttsOn) olloVoice(text); else lipStart(ollo, RPC.lipsync.fromText(String(text)), wallClock()); };
SBX.express = (name) => { if (!ollo.ch.face.expressions[name]) throw new Error('Expressions: ' + Object.keys(ollo.ch.face.expressions).join(', ')); OH.expr = name; RPC.applyExpression(ollo.ch, ollo.st, name); ollo.syncToBones(); };

// ---------------------------------------------------------------- 5. the library: every asset of the island, the cast, props, tools, AI creations
const CAT = { Characters: '🧸', Props: '🎈', Rides: '🎡', Midway: '🎪', Waterpark: '🌊', Buildings: '🏛️', Nature: '🌴', Terrain: '⛰️', Arcade: '🕹️', Fences: '🚧', 'Test site': '🧪', Sky: '☁️', 'AI creations': '✨', Systems: '⚙️', Scripts: '📜', Worlds: '🗺️', Animations: '🎞️', Tools: '🛠️' };
const GROUP_CAT = { RP_Midway: 'Midway', RP_Rides: 'Rides', RP_RadiantRivers_Waterpark: 'Waterpark', RP_Entrance_Plaza_Buildings: 'Buildings', RP_Banyan: 'Nature', RP_UndergroundTestSite: 'Test site', RP_Perimeter_Fence: 'Fences', RP_Terrain: 'Terrain', RP_Jungle: 'Nature', RP_Clouds: 'Sky', Arcade_Building: 'Arcade' };
const human = (n) => String(n || '').replace(/^(RP|SB|SBX|CHAR|PROP)_/, '').replace(/@.*$/, '').replace(/[._]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
function matWords(o, max = 6) { const s = new Set(); o.traverse((m) => { if (s.size >= max || !m.isMesh) return; for (const mt of Array.isArray(m.material) ? m.material : [m.material]) if (mt && mt.name) for (const t of tokenize(mt.name)) if (s.size < max) s.add(t); }); return [...s]; }
function triCount(o) { let n = 0; o.traverse((m) => { if (m.isMesh && m.geometry) { const g = m.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return n; }
const fmtN = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(Math.round(n)));
const SLUGS = new Map(); const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 80);
function addEntry(e) { if (!e.id) { const base = e.kind === 'park' ? 'p_' + slug(e.category + '_' + (e.obj.name || e.name)) : e.kind === 'cast' ? 'ch_' + e.cast.id : e.kind === 'anim' ? 'an_' + slug(e.name) : e.kind === 'tool' ? 'tl_' + slug(e.name) : uid('a'); const n = SLUGS.get(base) || 0; SLUGS.set(base, n + 1); e.id = n ? base + '_' + n : base; } e.tokens = [...new Set([...tokenize(e.name), ...(e.tags || []).flatMap(tokenize), ...tokenize(e.category)])];
  const wt = [...tokenize(e.name).map((t) => [t, 2.2]), ...(e.tags || []).flatMap(tokenize).map((t) => [t, 1]), ...tokenize(e.category).map((t) => [t, 0.6]), ...tokenize(e.desc || '').slice(0, 12).map((t) => [t, 0.5])];
  e.vec = EMB ? EMB.embed(wt) : null;
  if (EMB) { const seen = new Map(); for (const [t, w] of wt) if (!STOP.has(t) && (!seen.has(t) || seen.get(t) < w)) seen.set(t, w); e.tv = []; for (const [t, w] of [...seen].sort((a, b) => b[1] - a[1]).slice(0, 18)) { const v = EMB.embed([t]); if (v) e.tv.push([v, Math.min(1, 0.55 + 0.25 * w)]); } }
  SBX.entries.push(e); return e; }
// meaning score: each query word finds its closest word in the asset (soft matching), averaged; then blended with the whole-phrase vector
function semScore(qvs, qv, e) { if (!e.tv || !e.tv.length || !qvs.length) return 0; let tot = 0; for (const q of qvs) { let best = 0; for (const [v, w] of e.tv) best = Math.max(best, EMB.cos(q, v) * w); tot += best; } return 0.75 * tot / qvs.length + 0.25 * Math.max(0, EMB.cos(qv, e.vec)); }
function buildLibrary() {
  const CH = { ollo: "Levitating felt star-sprite; hovers, carries a lantern-wand" };
  for (const c of CAST.CASTS) addEntry({ name: c.ch.name, category: "Characters", kind: "cast", cast: c, tags: ["character", "rigged", "animated", c.ch.subtitle || "", ...(c.id === "ollo" ? ["hover", "levitate", "fly", "sprite", "star"] : ["walk"])], tris: triCount(c.group), desc: (CH[c.id] || "") + ". Fully rigged (IK, springs, face), with procedural animation." });
  addEntry({ name: "Ollo’s lantern-wand", category: "Props", kind: "wand", tags: ["lantern", "wand", "staff", "cane", "light", "glow", "brass", "glass", "held"], tris: triCount(wand), desc: "Separate prop: a lacquered staff with a brass-capped glass lantern. Ollo holds it in his right hand." });
  for (const [name, clip] of SBX.anims) addEntry({ name, category: "Animations", kind: "anim", clip: name, tags: ["animation", "motion", "procedural", clip.loop ? "loop" : "once"], tris: 0, desc: "Procedural animation that works on any character (bones are matched by role)." });
}
buildLibrary();

// ---- placing assets into the world
const placedList = () => [...SBX.placed.values()];
function prepClone(src) { const c = src.clone(true); const drop = []; c.traverse((o) => { if (o.userData && o.userData.rpHi) drop.push(o); o.layers.enableAll(); o.layers.set(0); if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = true; } }); for (const o of drop) o.parent && o.parent.remove(o); return c; }
function worldBox(o) { const a = typeof appear !== 'undefined' && appear.find((x) => x.o === o); const sc = a ? o.scale.clone() : null; if (a) o.scale.copy(a.s); o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o, true); if (a) { o.scale.copy(sc); o.updateMatrixWorld(true); } return b; }
function frontSpot(dist = 3) { const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize(); const p = controls.target.clone().addScaledVector(dir, 0.5); p.y = 0; return p; }
function freeSpot(p, rad) { // nudge a placement point so it does not land on Ollo
  const o = ollo.group.position; const d = Math.hypot(p.x - o.x, p.z - o.z); const need = rad + BODY_R + 0.4; if (d < need) { const a = d > 1e-3 ? Math.atan2(p.x - o.x, p.z - o.z) : 0; p.x = o.x + Math.sin(a) * need; p.z = o.z + Math.cos(a) * need; } return p; }
const appear = []; // scale-in animation for anything that is built or placed
function popIn(o) { const s = o.scale.clone(); o.scale.multiplyScalar(0.001); appear.push({ o, s, t: 0 }); }
function registerPlaced(obj, meta) { const id = meta.id || uid('o'); obj.userData.sbx = { id, ...meta, solid: meta.solid !== false }; obj.name = obj.name || meta.name; WORLD.add(obj); SBX.placed.set(id, obj); SBX.dirty = true; if (meta.pop !== false) popIn(obj); refreshOutliner(); worldChanged(); return id; }
async function placeEntry(e, opt = {}) {
  if (e.kind === 'tool') { const on = !e.open; e.open = on; setLegacyUI(on, e.ids); toast(on ? e.name + ' open' : e.name + ' closed'); return null; }
  if (e.kind === 'island') { const on = !park.root.visible; park.root.visible = on; SBX.islandOn = on; toast(on ? 'Island restored around the platform (its ground does not block Ollo)' : 'Island put away'); return null; }
  if (e.kind === 'anim') { const c = opt.cast || ollo; playClip(c, e.clip); return null; }
  if (e.kind === 'wand') { if (wand.userData.held) { const p = opt.at ? new THREE.Vector3(...opt.at) : freeSpot(frontSpot(), 0.3); wand.parent.remove(wand); wand.position.copy(p).add(new THREE.Vector3(0, 0.205, 0)); wand.rotation.set(0, 0, 0); registerPlaced(wand, { id: 'wand', name: 'Ollo’s lantern-wand', entry: e.id, solid: false, pop: false }); wand.userData.held = false; } else { WORLD.remove(wand); SBX.placed.delete('wand'); wandToHand(); refreshOutliner(); } return 'wand'; }
  if (e.kind === 'cast') { const c = e.cast; if (c === ollo) { SBX.olloTeleport(opt.at || [0, 0, 1.2]); return 'ollo'; }
    const at = opt.at ? new THREE.Vector3(...opt.at) : freeSpot(frontSpot(), 0.4); c.group.position.copy(at); const gy = groundBelow(at.x, at.z, at.y + 2, 10); if (gy !== null) c.group.position.y = gy; c.group.rotation.set(0, opt.yaw ?? Math.atan2(camera.position.x - at.x, camera.position.z - at.z), 0); c.group.visible = true;
    c.st = RPC.newState(c.ch); c.ik = {}; c.locks = new Set(); c.walk = null; c.baseY = null; c.offset = 0; c.motion.reset(); c.loco.reset(null); c.want = null; c.mo.grounded = true; c.mo.gait = true;
    setIdle(c); c.group.updateMatrixWorld(true);
    SBX.placed.set('cast:' + c.id, c.group); c.group.userData.sbx = { id: 'cast:' + c.id, name: c.ch.name, entry: e.id, cast: c.id, solid: false }; popIn(c.group); refreshOutliner(); return 'cast:' + c.id; }
  if (e.kind === 'puppet') { const pu = CAST.makePuppet(e.puppet); const at = opt.at ? new THREE.Vector3(...opt.at) : freeSpot(frontSpot(), 0.4); pu.group.position.copy(at); return registerPlaced(pu.group, { name: e.name, entry: e.id, solid: false }); }
  if (e.kind === 'creation') return spawnCreation(e.creation, opt);
  if (e.kind === 'system') { if (SYSTEMS.has(e.system.id)) { stopSystem(e.system.id); toast(e.name + ' stopped'); return null; } await startSystem(e.system); toast(e.name + ' running'); return e.system.id; }
  if (e.kind === 'script') { const r = await runBuilder(e.script.code); SBX.dirty = true; resolveOllo(); worldChanged(); toast('Ran: ' + e.name); return r; }
  if (e.kind === 'world') { await loadWorld(e.world.data); toast('Loaded world: ' + e.name); return null; }
  // a park object: a copy, at its own scale, standing on the platform in front of the view (or where asked)
  const src = e.obj; const c = prepClone(src); const M = parkMatrix.get(src) || src.matrixWorld; M.decompose(c.position, c.quaternion, c.scale);
  const box = worldBox(c); const size = box.getSize(new THREE.Vector3()); const rad = Math.max(size.x, size.z) / 2;
  const at = opt.at ? new THREE.Vector3(...opt.at) : freeSpot(frontSpot(rad * 1.2 + 1), rad); const ctr = box.getCenter(new THREE.Vector3());
  c.position.x += at.x - ctr.x; c.position.z += at.z - ctr.z; c.position.y += (opt.at ? at.y : 0) - box.min.y;
  if (opt.yaw) { const piv = new THREE.Vector3(at.x, 0, at.z); c.position.sub(piv).applyAxisAngle(UP, opt.yaw).add(piv); c.rotateOnWorldAxis(UP, opt.yaw); }
  const id = registerPlaced(c, { name: e.name, entry: e.id, size: size.toArray() }); resolveOllo(); return id;
}
SBX.placeEntry = placeEntry;
function removePlaced(id) { const o = SBX.placed.get(id); if (!o) return false; if (id === 'wand') { placeEntry(SBX.entries.find((e) => e.kind === 'wand')); return true; } if (id.startsWith('cast:')) { o.visible = false; SBX.placed.delete(id); refreshOutliner(); return true; } if (o === ollo.group) return false; o.parent && o.parent.remove(o); SBX.placed.delete(id); SBX.dirty = true; refreshOutliner(); worldChanged(); return true; }
SBX.removePlaced = removePlaced;

// ---- search
let libState = { q: '', cat: 'All', sel: null, semantic: true, sort: 'relevance' };
// search: name / tags (strongest), the description, and meaning (word embeddings); every result says WHY it matched. Nothing found by
// those rules -> the closest things by meaning are still shown (marked "closest"), so a search never comes back empty-handed.
const descOf = (e) => String(e.desc || (e.creation && e.creation.description) || (e.system && e.system.description) || (e.script && e.script.description) || '');
const dtok = (e) => e.dtokens || (e.dtokens = tokenize(descOf(e)).filter((t) => !e.tokens.includes(t)));
const inWorld = (e) => { const out = []; for (const [id, o] of SBX.placed) { const s = o.userData.sbx; if ((s && s.entry === e.id) || (e.kind === 'cast' && id === 'cast:' + e.cast.id && o.visible)) out.push(id); } return out; };
const entryKind = (e) => (e.kind === 'creation' ? (e.creation && e.creation.kind === 'character' ? 'character' : 'object') : e.kind === 'cast' ? 'character' : e.kind === 'anim' ? 'animation' : e.kind === 'park' ? 'object' : e.kind);
function search(q, cat = 'All', n = 400, o = {}) {
  const qt = tokenize(q); const qv = EMB && qt.length ? EMB.embed(qt) : null; const qvs = EMB ? qt.map((t) => EMB.embed([t])).filter(Boolean) : []; const out = []; const near = []; const ql = String(q || '').toLowerCase().trim();
  for (const e of SBX.entries) { if (cat !== 'All' && e.category !== cat) continue; if (o.kind && entryKind(e) !== o.kind) continue; if (!qt.length) { out.push({ e, s: 0, why: '' }); continue; }
    const lx = lexScore(qt, e); const dt = dtok(e); const ld = dt.length ? 0.8 * lexScore(qt, { tokens: dt }) : 0; const sm = libState.semantic && qv && e.vec ? semScore(qvs, qv, e) : 0;
    const phrase = ql.length > 2 && e.name.toLowerCase().includes(ql) ? 0.2 : 0;
    const s = Math.max(lx, ld, 0.62 * Math.max(lx, ld) + 0.55 * Math.max(0, sm)) + phrase + 0.06 * Math.min(1, qt.length / Math.max(1, e.tokens.length));
    const hitW = qt.filter((t) => e.tokens.some((x) => x === t || (t.length >= 4 && (x.startsWith(t) || t.startsWith(x)))));
    const why = lx >= 0.3 || phrase ? 'name: ' + (hitW.join(', ') || ql) : ld >= 0.3 ? 'description' : 'meaning ' + sm.toFixed(2);
    if (lx >= 0.3 || ld >= 0.3 || sm > 0.46 || phrase) out.push({ e, s, why }); else if (sm > 0.2) near.push({ e, s: sm * 0.5, why: 'closest by meaning' }); }
  if (qt.length && !out.length) out.push(...near.sort((a, b) => b.s - a.s).slice(0, 12));
  const sort = o.sort || libState.sort || 'relevance';
  if (qt.length && sort === 'relevance') out.sort((a, b) => b.s - a.s);
  else if (sort === 'name') out.sort((a, b) => a.e.name.localeCompare(b.e.name));
  else if (sort === 'newest') out.sort((a, b) => ((b.e.creation && b.e.creation.created) || (b.e.system && b.e.system.created) || 0) - ((a.e.creation && a.e.creation.created) || (a.e.system && a.e.system.created) || 0) || b.s - a.s);
  else if (sort === 'inworld') out.sort((a, b) => inWorld(b.e).length - inWorld(a.e).length || b.s - a.s);
  else out.sort((a, b) => (a.e.category === b.e.category ? a.e.name.localeCompare(b.e.name) : Object.keys(CAT).indexOf(a.e.category) - Object.keys(CAT).indexOf(b.e.category)));
  return out.slice(0, n);
}
const sizeOf = (e) => { if (e._size !== undefined) return e._size; let s = null; try { const ob = e.obj || (e.cast && e.cast.group); if (ob) { const b = new THREE.Box3().setFromObject(ob); if (!b.isEmpty()) s = b.getSize(new THREE.Vector3()).toArray().map((v) => +v.toFixed(2)); } } catch (e2) { s = null; } return (e._size = s); };
SBX.inWorld = inWorld;
SBX.search = search;

// ---- thumbnails: each asset rendered once on its own little stage, lazily
const thumbScene = new THREE.Scene(); thumbScene.environment = scene.environment; thumbScene.add(new THREE.HemisphereLight('#e8f0ff', '#5a5650', 1.4)); const tl = new THREE.DirectionalLight('#fff4e0', 2.6); tl.position.set(3, 5, 4); thumbScene.add(tl, tl.target);
const thumbCam = new THREE.PerspectiveCamera(32, 1, 0.01, 5000); const THUMBS = new Map(); const thumbQ = [];
function makeThumb(e) {
  let obj = null, restore = null;
  if (e.kind === 'park') { obj = prepClone(e.obj); (parkMatrix.get(e.obj) || e.obj.matrixWorld).decompose(obj.position, obj.quaternion, obj.scale); thumbScene.add(obj); }
  else if (e.kind === 'cast') { const g = e.cast.group; const par = g.parent, vis = g.visible, pos = g.position.clone(), rot = g.rotation.clone(); thumbScene.add(g); g.visible = true; g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); restore = () => { par.add(g); g.visible = vis; g.position.copy(pos); g.rotation.copy(rot); }; obj = g; }
  else if (e.kind === 'wand') { obj = wand.clone(true); obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0); thumbScene.add(obj); }
  else if (e.kind === 'creation' && e.obj) { obj = e.obj.clone(true); obj.position.set(0, 0, 0); thumbScene.add(obj); }
  else return null;
  const box = worldBox(obj); const sz = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3()); const R = Math.max(sz.length() / 2, 0.01);
  const dir = new THREE.Vector3(0.75, 0.48, 1).normalize(); thumbCam.position.copy(ctr).addScaledVector(dir, R / Math.sin(16 * Math.PI / 180) * 0.95); thumbCam.near = R * 0.05; thumbCam.far = R * 20; thumbCam.lookAt(ctr); thumbCam.updateProjectionMatrix(); tl.position.copy(ctr).add(new THREE.Vector3(R * 2, R * 4, R * 3)); tl.target.position.copy(ctr);
  const sceneBak = scene; let url = null;
  try { const prevBG = thumbScene.background; const cv = (function () { const prev = renderer.getRenderTarget(); if (capRT.width !== 192) capRT.setSize(192, 192); renderer.setRenderTarget(capRT); renderer.setClearColor('#1a2028', 1); renderer.clear(); renderer.render(thumbScene, thumbCam); renderer.setRenderTarget(prev); const buf = new Uint16Array(192 * 192 * 4); renderer.readRenderTargetPixels(capRT, 0, 0, 192, 192, buf); const c = document.createElement('canvas'); c.width = c.height = 192; const x = c.getContext('2d'); const im = x.createImageData(192, 192); const f = THREE.DataUtils.fromHalfFloat; const ex = renderer.toneMappingExposure * 1.1; for (let y = 0; y < 192; y++) for (let xx = 0; xx < 192; xx++) { const si = ((191 - y) * 192 + xx) * 4, di = (y * 192 + xx) * 4; for (let k = 0; k < 3; k++) im.data[di + k] = clamp(toSRGB(clamp(aces(f(buf[si + k]) * ex), 0, 1)) * 255, 0, 255); im.data[di + 3] = 255; } x.putImageData(im, 0, 0); return c; })(); url = cv.toDataURL('image/jpeg', 0.82); thumbScene.background = prevBG; }
  catch (err) { console.warn('thumb', e.name, err); }
  finally { if (restore) restore(); else thumbScene.remove(obj); void sceneBak; renderer.setClearColor(0x000000, 0); }
  return url;
}
function queueThumb(e, img) { if (THUMBS.has(e.id)) { img.src = THUMBS.get(e.id); return; } thumbQ.push([e, img]); }
function pumpThumbs() { const t0 = performance.now(); while (thumbQ.length && performance.now() - t0 < 24) { const [e, img] = thumbQ.shift(); if (!img.isConnected) continue; if (!THUMBS.has(e.id)) THUMBS.set(e.id, makeThumb(e) || ''); const u = THUMBS.get(e.id); if (u) img.src = u; else img.replaceWith(h('span', {}, CAT[e.category] || '◆')); } }

// ---------------------------------------------------------------- 6. UI
const root = h('div', { id: 'sbx' }); document.body.appendChild(root);
const toastEl = h('div', { class: 'toast', hidden: true }); root.append(toastEl); let toastT = 0;
function toast(t) { toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.hidden = true), 2600); }
const btnLib = h('button', { 'aria-pressed': 'false', title: 'Asset library (L)' }, 'Library');
const btnAnim = h('button', { 'aria-pressed': 'false', title: 'Animator editor: pose any character, keyframe timeline' }, 'Animator');
const btnPov = h('button', { 'aria-pressed': 'false', title: 'Picture-in-picture: what Ollo sees' }, 'Ollo’s view');
const btnFeed = h('button', { 'aria-pressed': 'false' }, 'Activity');
const btnVoice = h('button', { 'aria-pressed': 'false', title: 'Ollo speaks his lines aloud' }, 'Voice');
const btnFollow = h('button', { 'aria-pressed': 'false', title: 'Camera follows Ollo' }, 'Follow');
const btnPlay = h('button', { 'aria-pressed': 'false', title: 'Control a character with joystick / WASD and jump' }, '🎮 Play as');
btnPlay.onclick = () => { if (PLAYER.c) { stopControl(); return; } const vis = CAST.CASTS.filter((c) => c.group.visible); const pick = vis.length === 1 ? vis[0] : vis.find((c) => c.id === (prompt('Control which character? ' + vis.map((c) => c.id).join(', '), vis[vis.length - 1].id) || '').trim().toLowerCase()); if (pick) control(pick); };
const btnLook = h('button', { 'aria-pressed': 'false', title: 'Cinematic grade, bloom, grain and vignette' }, 'Film look');
btnLook.onclick = () => { const on = btnLook.getAttribute('aria-pressed') !== 'true'; btnLook.setAttribute('aria-pressed', String(on)); SBX.filmLook = on; setLook(!on); };
const btnMenu = h('button', { 'aria-expanded': 'true', title: 'Show / hide the toolbar', 'aria-label': 'Toggle toolbar' }, '☰');
const barEl = h('div', { class: 'sbx-bar' }, h('span', { class: 'sbx-brand' }, 'SANDBOX'), btnMenu, h('span', { class: 'bar-btns' }, btnLib, btnAnim, btnPov, btnFollow, btnPlay, btnFeed, btnLook, btnVoice));
root.append(barEl); const narrow = () => innerWidth <= 760;
const setBar = (open) => { barEl.classList.toggle('collapsed', !open); btnMenu.setAttribute('aria-expanded', String(open)); btnMenu.textContent = open ? '✕' : '☰'; };
btnMenu.onclick = () => setBar(barEl.classList.contains('collapsed')); setBar(!narrow());
root.append(bubble, h('div', { class: 'sbx-hint' }, 'Drag to orbit · right-drag to pan · scroll to zoom · WASD/QE to move'));
// library panel
const libQ = h('input', { id: 'sbxQ', type: 'search', placeholder: 'Search by name or meaning — e.g. “something to sit on”, “spinning ride”', autocomplete: 'off', 'aria-label': 'Search assets' });
const chipsEl = h('div', { class: 'chips' }); const gridEl = h('div', { class: 'lib-grid', role: 'list' }); const detEl = h('div', { class: 'lib-detail', hidden: true }); const libCount = h('small'); const outlinerEl = h('div', { class: 'chips' });
const semChk = h('input', { type: 'checkbox', checked: true }); semChk.addEventListener('change', () => { libState.semantic = semChk.checked; renderGrid(); });
const sortSel = h('select', { 'aria-label': 'Sort results', class: 'lib-sort' }, ...[['relevance', 'Best match'], ['name', 'Name A–Z'], ['newest', 'Newest'], ['inworld', 'In the world']].map(([v, l]) => h('option', { value: v }, l))); sortSel.addEventListener('change', () => { libState.sort = sortSel.value; renderGrid(); });
const libEl = h('section', { id: 'sbxLib', class: 'sbx-panel', hidden: true, 'aria-label': 'Asset library' },
  h('div', { class: 'lib-head' }, h('h2', {}, 'Asset library', h('span', { class: 'hd-r' }, libCount, h('button', { class: 'sbx-x', title: 'Collapse', 'aria-label': 'Collapse library', onclick: (ev) => { const m = libEl.classList.toggle('min'); ev.currentTarget.textContent = m ? '▴' : '▾'; } }, '▾'), h('button', { class: 'sbx-x', 'aria-label': 'Close library', onclick: () => toggleLib(false) }, '✕'))), libQ, h('div', { class: 'lib-mode' }, h('label', {}, semChk, 'Also search by meaning'), h('label', {}, 'Sort', sortSel)), chipsEl,
    h('div', { class: 'lib-mode' }, h('span', {}, 'In the world:'), outlinerEl, h('button', { class: 'chip', onclick: async () => { const n = prompt('Name this world', 'My world'); if (n) { await saveWorld(n); toast('World saved to the library'); renderChips(); renderGrid(); } } }, '💾 Save world'))), gridEl, detEl);
root.append(libEl);
function renderChips() { chipsEl.textContent = ''; const counts = { All: SBX.entries.length }; for (const e of SBX.entries) counts[e.category] = (counts[e.category] || 0) + 1;
  for (const c of ['All', ...Object.keys(CAT)]) { if (!counts[c]) continue; const b = h('button', { class: 'chip', 'aria-pressed': String(libState.cat === c) }, (CAT[c] ? CAT[c] + ' ' : '') + c + ' ' + counts[c]); b.onclick = () => { libState.cat = c; renderChips(); renderGrid(); }; chipsEl.append(b); } }
function renderGrid() { gridEl.textContent = ''; const res = search(libState.q, libState.cat); libCount.textContent = res.length + ' of ' + SBX.entries.length; libState.top = res[0] ? res[0].e : null;
  if (!res.length) gridEl.append(h('p', { class: 'lib-empty' }, libState.q ? `Nothing matches “${libState.q}”${libState.cat !== 'All' ? ' in ' + libState.cat : ''}. Try fewer or different words, or choose All.` : 'Nothing in this category yet.'));
  else if (res[0].why === 'closest by meaning') gridEl.append(h('p', { class: 'lib-empty' }, `No exact match for “${libState.q}” — closest by meaning:`));
  for (const { e, why } of res) { const img = h('img', { alt: '' }); const th = h('div', { class: 'th' }, e.kind === 'anim' || e.kind === 'music' || e.kind === 'tool' || e.kind === 'puppet' || (e.kind === 'creation' && !e.obj) ? h('span', { style: 'font-size:30px' }, CAT[e.category] || '◆') : img);
    const card = h('div', { class: 'card' + (libState.sel === e ? ' sel' : ''), role: 'button', tabindex: '0', title: e.name }, th, h('div', { class: 'nm' }, e.name), h('div', { class: 'meta' }, h('span', {}, e.category), why ? h('span', { class: 'why', title: why }, why) : h('span', {}, e.tris ? fmtN(e.tris) + ' tris' : '')), (() => { const w = inWorld(e).length; return w ? h('span', { class: 'inw', title: w + ' in the world now' }, '● ' + w) : ''; })());
    card.onclick = () => { libState.sel = e; renderDetail(); for (const c of gridEl.children) c.classList.toggle('sel', c === card); }; card.ondblclick = () => placeEntry(e); card.onkeydown = (ev) => { if (ev.key === 'Enter') card.onclick(); };
    gridEl.append(card); if (th.firstChild === img) queueThumb(e, img); } }
function renderDetail() { const e = libState.sel; detEl.hidden = !e; if (!e) return; detEl.textContent = '';
  const actions = h('div', { class: 'row' }); const add = (label, fn, pri) => { const b = h('button', { class: pri ? 'pri' : '' }, label); b.onclick = async () => { try { await fn(); } catch (err) { toast(String(err.message || err)); } }; actions.append(b); };
  if (e.kind === 'tool') add(e.open ? 'Close panel' : 'Open panel', () => { placeEntry(e); renderDetail(); }, true);
  else if (e.kind === 'island') add(park.root.visible ? 'Put the island away' : 'Bring the island back', () => { placeEntry(e); renderDetail(); }, true);
  else if (e.kind === 'anim') { add('Play on Ollo', () => playClip(ollo, e.clip), true); for (const c of CAST.CASTS) if (c !== ollo && c.group.visible) add('Play on ' + c.ch.name, () => playClip(c, e.clip)); }
  else if (e.kind === 'wand') add(wand.userData.held ? 'Take from Ollo, place in world' : 'Give back to Ollo', () => { placeEntry(e); renderDetail(); }, true);
  else if (e.kind === 'cast') { add(e.cast.group.visible ? 'Move in front of view' : 'Place in world', () => placeEntry(e), true); if (e.cast.group.visible && e.cast !== ollo) add('Remove', () => removePlaced('cast:' + e.cast.id)); add('Focus camera', () => focusObj(e.cast.group)); if (e.cast.group.visible) add('🎮 Control', () => control(e.cast)); }
  else if (e.kind === 'system') { add(SYSTEMS.has(e.system.id) ? 'Stop system' : 'Start system', async () => { await placeEntry(e); renderDetail(); }, true); add('Delete from library', async () => { stopSystem(e.system.id); SBX.entries.splice(SBX.entries.indexOf(e), 1); if (DB) try { await DB.collection('sbx_systems').doc(e.system.id).delete(); } catch (err) { /* read-only */ } libState.sel = null; renderChips(); renderGrid(); renderDetail(); }); detEl.append(h('pre', { style: 'max-height:160px;overflow:auto;font:11px IBM Plex Mono,monospace;color:var(--mut);white-space:pre-wrap;margin:0' }, e.system.code.slice(0, 4000))); }
  else if (e.kind === 'script') { add('Run again', () => placeEntry(e), true); detEl.append(h('pre', { style: 'max-height:160px;overflow:auto;font:11px IBM Plex Mono,monospace;color:var(--mut);white-space:pre-wrap;margin:0' }, e.script.code.slice(0, 4000))); }
  else if (e.kind === 'music') { add('▶ Play', async () => { await SBX.audio.play(e.music); }, true); add('■ Stop', () => SBX.audio.stop(e.music)); }
  else if (e.kind === 'world') { add('Load this world', () => placeEntry(e), true); add('Save current world over it', async () => { await saveWorld(e.name, e.world.id); toast('Saved'); }); }
  else { add('Place in world', async () => { const id = await placeEntry(e); if (id) toast('Placed: ' + e.name); }, true); if (e.kind === 'creation' && e.creation) add('Delete from library', async () => { await deleteCreation(e.creation.id); }); }
  const iw = inWorld(e); const sz = sizeOf(e); detEl.append(h('h3', {}, (CAT[e.category] || '') + ' ' + e.name), h('p', {}, descOf(e)), h('p', {}, [entryKind(e), sz ? `about ${sz[0]} × ${sz[1]} × ${sz[2]} m` : '', iw.length ? `${iw.length} in the world` : 'not in the world'].filter(Boolean).join(' · ')), iw.length ? h('div', { class: 'row' }, ...iw.slice(0, 6).map((id) => { const b = h('button', { class: 'chip' }, 'Find ' + id); b.onclick = () => { const ob = SBX.placed.get(id); if (ob) focusObj(ob); }; return b; })) : '', h('div', { class: 'tags' }, ...e.tokens.slice(0, 14).map((t) => h('span', {}, t))), h('p', {}, e.tris ? fmtN(e.tris) + ' triangles' : ''), actions); }
function refreshOutliner() { if (!outlinerEl) return; outlinerEl.textContent = ''; for (const [id, o] of SBX.placed) { const nm = (o.userData.sbx && o.userData.sbx.name) || o.name; const b = h('button', { class: 'chip', title: 'Click: focus · Shift-click: remove' }, nm + ' ✕'); b.onclick = (ev) => { if (ev.shiftKey || ev.target === b && ev.offsetX > b.offsetWidth - 18) removePlaced(id); else focusObj(o); }; outlinerEl.append(b); } if (!SBX.placed.size) outlinerEl.append(h('span', { style: 'color:var(--mut)' }, 'just the platform and Ollo')); }
let libT = 0; libQ.addEventListener('input', () => { clearTimeout(libT); libT = setTimeout(() => { libState.q = libQ.value; renderGrid(); }, 120); });
for (const el of [libQ]) el.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { clearTimeout(libT); libState.q = libQ.value; renderGrid(); if (libState.top) { libState.sel = libState.top; renderDetail(); const first = gridEl.querySelector('.card'); if (first) { first.classList.add('sel'); first.scrollIntoView({ block: 'nearest' }); } } } else if (ev.key === 'Escape') { libQ.value = ''; libState.q = ''; renderGrid(); } });
function toggleLib(on = libEl.hidden) { libEl.hidden = !on; btnLib.setAttribute('aria-pressed', String(on)); if (narrow() && typeof setMini === 'function') setMini(on); if (on) { renderChips(); renderGrid(); refreshOutliner(); } }
btnLib.onclick = () => toggleLib();
addEventListener('keydown', (ev) => { if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'SELECT') return; if (ev.key === 'l' || ev.key === 'L') toggleLib(); });
function focusObj(o) { const b = worldBox(o); const c = b.getCenter(new THREE.Vector3()); const r = Math.max(0.4, b.getSize(new THREE.Vector3()).length() / 2); const dir = camera.position.clone().sub(controls.target).normalize(); controls.target.copy(c); camera.position.copy(c).addScaledVector(dir, r * 2.6); controls.update(); }
SBX.focusObj = focusObj;
// animator editor (off by default): the cast posing panel + the studio keyframe timeline, aimed at the sandbox
btnAnim.onclick = () => { const on = btnAnim.getAttribute('aria-pressed') !== 'true'; btnAnim.setAttribute('aria-pressed', String(on)); setLegacyUI(on, ['cast', 'castLabels', 'studio', 'studioPip']); OH.manual = on; SBX.legacyPick = on; if (on) unselect(); else { try { CAST.tc.detach(); } catch (e) { /* ok */ } } const hint = root.querySelector('.sbx-hint'); if (hint) hint.hidden = on; if (on) { try { CAST.select(ollo); } catch (e) { /* ok */ } toast('Animator on: pick a character and a body part, pose it, key it on the timeline'); } };
// follow camera
let follow = false; btnFollow.onclick = () => { follow = !follow; btnFollow.setAttribute('aria-pressed', String(follow)); };
// picture-in-picture: Ollo's eyes
const pipCv = h('canvas', { width: 480, height: 270 }); const pipEl = h('div', { id: 'sbxPip', class: 'sbx-panel', hidden: true }, pipCv, h('small', { class: 'pip-h' }, h('span', {}, 'Ollo’s view · what the AI sees'), h('button', { class: 'sbx-x', 'aria-label': 'Close Ollo’s view', onclick: () => btnPov.click() }, '✕')));
root.append(pipEl); let pipOn = false, pipT = 0; btnPov.onclick = () => { pipOn = !pipOn; pipEl.hidden = !pipOn; btnPov.setAttribute('aria-pressed', String(pipOn)); };
// activity feed
const feedList = h('div', { id: 'sbxFeedList', 'aria-live': 'polite' }); const feedEl = h('section', { id: 'sbxFeed', class: 'sbx-panel', hidden: true }, h('header', {}, 'Activity', h('span', { style: 'display:flex;gap:6px' }, h('button', { class: 'chip', onclick: () => { feedList.textContent = ''; } }, 'Clear'), h('button', { class: 'sbx-x', 'aria-label': 'Collapse activity', onclick: (ev) => { const m = feedEl.classList.toggle('min'); ev.currentTarget.textContent = m ? '▾' : '▴'; } }, '▴'), h('button', { class: 'sbx-x', 'aria-label': 'Close activity', onclick: () => btnFeed.click() }, '✕'))), feedList);
root.append(feedEl); btnFeed.onclick = () => { const on = feedEl.hidden; feedEl.hidden = !on; btnFeed.setAttribute('aria-pressed', String(on)); };
function feed(kind, text) { const el = h('div', { class: 'ev ' + kind }); if (kind === 'tool') { const [a, ...b] = String(text).split('\n'); el.append(h('b', {}, a), b.length ? '\n' + b.join('\n') : ''); } else el.textContent = text; feedList.append(el); feedList.scrollTop = feedList.scrollHeight; SBX.log.push({ kind, text: String(text).slice(0, 600), t: Date.now() }); return el; }
SBX.feed = feed;
// voice
btnVoice.onclick = async () => { ttsOn = !ttsOn; btnVoice.setAttribute('aria-pressed', String(ttsOn)); if (ttsOn) { try { if (SYN) SYN.speak(new SpeechSynthesisUtterance('')); } catch (e) { /* unlock audio on this click */ } if (!(await ensureVoice())) { ttsOn = false; btnVoice.setAttribute('aria-pressed', 'false'); toast('Voice is not available in this view'); } } else hushAll(); };
// the prompt, centred on the screen; it docks to the bottom once the first request is under way
const inEl = h('textarea', { id: 'sbxIn', rows: 1, placeholder: 'Describe what to add, change or animate…', 'aria-label': 'Tell the world what to create or change' });
const goBtn = h('button', { class: 'pri', type: 'submit' }, 'Create'); const stopBtn = h('button', { type: 'button', hidden: true }, 'Stop');
const progEl = h('div', { id: 'sbxProg', hidden: true }); const progBar = h('div', { class: 'prog-bar' }, h('i')); const progTxt = h('b', {}, ''); const progStep = h('span', {}, ''); const progEta = h('span', { style: 'color:var(--acc)' }, ''); const modelEl = h('span', { style: 'color:var(--mut)' }, LEVELS[LEVEL0].label); progEl.append(progBar, h('div', { class: 'prog-line' }, progTxt, h('span', {}, modelEl, ' · ', progStep, ' · ', progEta)));
// image attachments (pick, paste or drop) + the original-toy-character mode
const fileIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', multiple: true, hidden: true });
const attachBtn = h('button', { type: 'button', title: 'Attach reference images (or paste / drop them here)', 'aria-label': 'Attach images' }, '🖼️');
const thumbsEl = h('div', { class: 'pr-thumbs' }); const ATTACH = [];
const toyChk = h('input', { type: 'checkbox' }); const toyLab = h('label', { class: 'tog', title: 'Every request makes a brand-new ORIGINAL character in the 2000s digital / circus / analog / theme-park / nostalgic / liminal / fun spirit (any kind: clowns, animals, aliens, living objects…), inspired by your images and words' }, toyChk, '🎪 New original character');
toyChk.addEventListener('change', () => { toyLab.classList.toggle('on', toyChk.checked); inEl.placeholder = toyChk.checked ? 'Describe or attach what inspires the new character…' : 'Describe what to add, change or animate…'; });
const LV_HINT = { 1: 'Fastest', 2: 'Fast, sharper', 3: 'Balanced', 4: 'Slower, better', 5: 'Slowest, best' };
const lvBtns = [1, 2, 3, 4, 5].map((n) => h('button', { type: 'button', class: 'lv', 'aria-pressed': String(n === LEVEL0), title: `Smartness ${n}: ${LEVELS[n].label} (${LV_HINT[n]})`, 'aria-label': `Smartness ${n}, ${LEVELS[n].label}, ${LV_HINT[n]}` }, String(n)));
const lvNote = h('small', {}, LV_HINT[LEVEL0] + ' · ' + LEVELS[LEVEL0].label);
lvBtns.forEach((b, i) => b.onclick = () => { const n = i + 1; if (AGENT.busy) { toast('Smartness applies from the next request'); } AGENT.level = n; try { localStorage.setItem('sbx_level', String(n)); } catch (e) { /* ok */ } lvBtns.forEach((x, k) => x.setAttribute('aria-pressed', String(k === i))); lvNote.textContent = LV_HINT[n] + ' · ' + LEVELS[n].label; if (!AGENT.busy) modelEl.textContent = LEVELS[n].label; });
const lvEl = h('div', { class: 'lvl', hidden: true, role: 'group', 'aria-label': 'Smartness level', hidden: true }, h('span', {}, '🧠 Smartness'), h('div', { class: 'lv-row' }, lvBtns), lvNote);
const optsEl = h('div', { class: 'pr-opts' }, toyLab, thumbsEl, fileIn, lvEl);
function addFiles(files) { for (const f of files) { if (!/^image\//.test(f.type) || ATTACH.length >= 4) continue; const url = URL.createObjectURL(f); ATTACH.push({ f, url }); } renderThumbs(); }
function renderThumbs() { thumbsEl.textContent = ''; ATTACH.forEach((a, i) => { const x = h('button', { type: 'button', 'aria-label': 'Remove image' }, '×'); x.onclick = () => { URL.revokeObjectURL(a.url); ATTACH.splice(i, 1); renderThumbs(); }; thumbsEl.append(h('figure', {}, h('img', { src: a.url, alt: 'attached reference' }), x)); }); }
attachBtn.onclick = () => fileIn.click(); fileIn.onchange = () => { addFiles(fileIn.files); fileIn.value = ''; };
const miniBtn = h('button', { class: 'sbx-x', 'aria-label': 'Minimise the prompt', title: 'Minimise' }, '▾'); const pill = h('button', { class: 'pr-pill pri', 'aria-label': 'Open the prompt' }, '✨ Create');
const promptEl = h('section', { id: 'sbxPrompt', class: 'sbx-panel docked' }, pill, h('div', { class: 'pr-head' }, h('span', {}, 'Tell the world what to make'), miniBtn), h('div', { class: 'intro' }, 'An empty platform under the sky, and Ollo. Type what the world should have; Claude builds it piece by piece while you watch.'), h('form', {}, attachBtn, inEl, goBtn, stopBtn), optsEl, progEl);
root.append(promptEl);
inEl.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); promptEl.querySelector('form').requestSubmit(); } });
inEl.addEventListener('keyup', (ev) => ev.stopPropagation());
inEl.addEventListener('input', () => { inEl.style.height = '44px'; inEl.style.height = Math.min(140, inEl.scrollHeight) + 'px'; });
const setMini = (m) => { promptEl.classList.toggle('mini', m); if (!m) setTimeout(() => inEl.focus(), 50); }; miniBtn.onclick = () => setMini(true); pill.onclick = () => setMini(false);
if (narrow()) { promptEl.classList.add('docked'); inEl.placeholder = 'Describe it…'; }
inEl.addEventListener('paste', (ev) => { const fs = [...(ev.clipboardData?.files || [])]; if (fs.length) { ev.preventDefault(); addFiles(fs); } });
promptEl.addEventListener('dragover', (ev) => { ev.preventDefault(); promptEl.classList.add('drop'); }); promptEl.addEventListener('dragleave', () => promptEl.classList.remove('drop'));
promptEl.addEventListener('drop', (ev) => { ev.preventDefault(); promptEl.classList.remove('drop'); addFiles(ev.dataTransfer.files); });
promptEl.querySelector('form').addEventListener('submit', (ev) => { ev.preventDefault(); let t = inEl.value.trim(); if ((!t && !ATTACH.length) || AGENT.busy) return; if (!t) t = toyChk.checked ? 'Make a new original character inspired by the attached image(s).' : 'Use the attached image(s) as reference.';
  const imgs = ATTACH.splice(0).map((a) => a.f); renderThumbs(); inEl.value = ''; inEl.style.height = '44px'; runAgent(t, { images: imgs, toy: toyChk.checked }); });
stopBtn.onclick = () => { AGENT.userStopped = true; if (AGENT.ctl) AGENT.ctl.abort(); };

// ---------------------------------------------------------------- 7. persistence: AI creations and animations live in the library across sessions (db)
let DB = null;
(async () => { try { DB = await window.claude?.use?.('db'); } catch (e) { DB = null; } if (!DB) return; const timer = setTimeout(() => {}, 10000);
  try { const snap = await DB.collection('sbx_creations').get(); for (const d of snap.docs) { const c = d.data(); if (c && c.code) addCreationEntry(c); }
    const sa = await DB.collection('sbx_anims').get(); for (const d of sa.docs) { const a = d.data(); if (a && a.keys) { SBX.anims.set(a.name, a); addEntry({ name: a.name, category: 'Animations', kind: 'anim', clip: a.name, tags: ['animation', 'ai', ...(a.tags || [])], desc: a.desc || 'Made by the AI.' }); } }
    if (!libEl.hidden) { renderChips(); renderGrid(); } } catch (e) { console.warn('library load', e); } finally { clearTimeout(timer); } })();
async function dbSave(col, id, data) { if (!DB) return false; try { await DB.collection(col).doc(id).set(data); return true; } catch (e) { console.warn('save', e); return false; } }
function addCreationEntry(c) { const old = SBX.entries.find((e) => e.creation && e.creation.id === c.id); if (old) SBX.entries.splice(SBX.entries.indexOf(old), 1); SBX.creations.set(c.id, c); return addEntry({ id: 'cr_' + c.id, name: c.name, category: c.kind === 'character' ? 'Characters' : 'AI creations', kind: 'creation', creation: c, tags: [...(c.tags || []), 'ai', 'creation'], desc: c.description || 'Made by the AI.', tris: c.tris || 0 }); }
async function deleteCreation(id) { SBX.creations.delete(id); const e = SBX.entries.find((x) => x.creation && x.creation.id === id); if (e) SBX.entries.splice(SBX.entries.indexOf(e), 1); if (DB) try { await DB.collection('sbx_creations').doc(id).delete(); } catch (err) { /* read-only viewer */ } libState.sel = null; renderChips(); renderGrid(); renderDetail(); }

// ---------------------------------------------------------------- 8. the modelling kit the AI (and you, from the console) builds with
const KIT = (() => {
  const fbm = RPC.sculpt.fbm, noise3 = RPC.sculpt.noise3;
  function canvasTex(w, hgt, draw, o = {}) { const cv = document.createElement('canvas'); cv.width = w; cv.height = hgt; const c = cv.getContext('2d'); draw(c, w, hgt); const t = new THREE.CanvasTexture(cv); t.colorSpace = o.data ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.MirroredRepeatWrapping; if (o.repeat) t.repeat.set(...o.repeat); return t; }
  // per-pixel procedural texture: fn(u, v) -> [r, g, b] (0..1). Use for wood grain, marble, rust, fabric weave... (not tiled photos)
  function procTex(w, hgt, fn, o = {}) { return canvasTex(w, hgt, (c, W, H) => { const im = c.createImageData(W, H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const r = fn(x / W, y / H); const i = (y * W + x) * 4; im.data[i] = r[0] * 255; im.data[i + 1] = r[1] * 255; im.data[i + 2] = r[2] * 255; im.data[i + 3] = 255; } c.putImageData(im, 0, 0); }, o); }
  // normal map from a height function h(u, v) (0..1)
  function normalTex(w, hgt, hf, strength = 2, o = {}) { const H = new Float32Array(w * hgt); for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) H[y * w + x] = hf(x / w, y / hgt); return canvasTex(w, hgt, (c) => { const im = c.createImageData(w, hgt); for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) { const l = H[y * w + ((x - 1 + w) % w)], r = H[y * w + ((x + 1) % w)], u = H[((y - 1 + hgt) % hgt) * w + x], dd = H[((y + 1) % hgt) * w + x]; let nx = (l - r) * strength, ny = (dd - u) * strength, nz = 1; const L = Math.hypot(nx, ny, nz); const i = (y * w + x) * 4; im.data[i] = (nx / L * 0.5 + 0.5) * 255; im.data[i + 1] = (ny / L * 0.5 + 0.5) * 255; im.data[i + 2] = (nz / L * 0.5 + 0.5) * 255; im.data[i + 3] = 255; } c.putImageData(im, 0, 0); }, { ...o, data: true }); }
  const lerp = (a, b, t) => a + (b - a) * t; const hex = (s) => { const c = new THREE.Color(s); return [c.r, c.g, c.b]; }; const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
  // material presets, each with its own procedural maps (unique per call via seed)
  function mat(kind = 'plastic', o = {}) { const seed = o.seed ?? Math.random() * 100; const col = o.color || null; let m;
    switch (kind) {
      case 'wood': { const a = hex(col || '#9a6a3f'), b = mix(a, [0.18, 0.1, 0.05], 0.45); const ring = (u, v) => { const n = fbm(u * 1.5 + seed, v * 0.2, 4, 4, 1); const r = Math.sin((u * 18 + n * 6) * Math.PI) * 0.5 + 0.5; return r * r; };
        m = new THREE.MeshPhysicalMaterial({ map: procTex(512, 512, (u, v) => mix(a, b, ring(u, v) * 0.7 + fbm(u * 8, v * 40, 3, 3, seed) * 0.3)), roughness: 0.55, clearcoat: o.varnish ?? 0.3, clearcoatRoughness: 0.35, normalMap: normalTex(256, 256, (u, v) => ring(u, v) * 0.5 + fbm(u * 20, v * 60, 2, 2, seed) * 0.5, 1.5) }); break; }
      case 'metal': case 'brushedMetal': { const a = hex(col || '#b8bcc4'); m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(...a), metalness: 1, roughness: kind === 'metal' ? 0.28 : 0.42, roughnessMap: procTex(256, 256, (u, v) => { const n = 0.6 + 0.4 * fbm(u * 2, v * 120, 3, 2, seed); return [n, n, n]; }) }); break; }
      case 'rust': { const a = hex(col || '#7b3f1f'); m = new THREE.MeshStandardMaterial({ map: procTex(512, 512, (u, v) => { const n = fbm(u * 6 + seed, v * 6, 5, 4, 2); const s = smooth((n - 0.4) * 4); return mix([0.42, 0.42, 0.44], a, s).map((x) => x * (0.8 + 0.4 * fbm(u * 40, v * 40, 2, 2, 5))); }), metalness: 0.4, roughness: 0.8 }); break; }
      case 'fabric': case 'felt': case 'plush': { const a = hex(col || '#7a8fd0'); const weave = (u, v) => 0.5 + 0.25 * Math.sin(u * Math.PI * 2 * 90) * Math.sin(v * Math.PI * 2 * 90); m = new THREE.MeshPhysicalMaterial({ map: procTex(512, 512, (u, v) => a.map((x) => x * (0.86 + 0.18 * fbm(u * 10, v * 10, 3, 3, seed)))), roughness: 0.95, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color(...mix(a, [1, 1, 1], 0.5)), normalMap: normalTex(256, 256, kind === 'fabric' ? weave : (u, v) => fbm(u * 30, v * 30, 3, 3, seed), kind === 'fabric' ? 1.2 : 0.8) }); break; }
      case 'stone': case 'concrete': { const a = hex(col || (kind === 'stone' ? '#8d8a83' : '#b5b3ae')); m = new THREE.MeshStandardMaterial({ map: procTex(512, 512, (u, v) => a.map((x) => x * (0.78 + 0.35 * fbm(u * 5 + seed, v * 5, 5, 4, 3)))), roughness: 0.9, normalMap: normalTex(256, 256, (u, v) => fbm(u * 12, v * 12, 4, 3, seed), 2.5) }); break; }
      case 'glass': m = new THREE.MeshPhysicalMaterial({ color: col || '#ffffff', roughness: 0.04, transmission: 0.95, thickness: 0.02, ior: 1.5, transparent: true, opacity: 0.6 }); break;
      case 'emissive': case 'light': m = new THREE.MeshStandardMaterial({ color: col || '#fff2c8', emissive: col || '#ffd27a', emissiveIntensity: o.intensity ?? 2.5 }); break;
      case 'ceramic': m = new THREE.MeshPhysicalMaterial({ color: col || '#f4f1ea', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }); break;
      case 'leather': { const a = hex(col || '#6b3a22'); m = new THREE.MeshPhysicalMaterial({ map: procTex(512, 512, (u, v) => a.map((x) => x * (0.85 + 0.2 * fbm(u * 20, v * 20, 3, 3, seed)))), roughness: 0.6, sheen: 0.3, normalMap: normalTex(256, 256, (u, v) => fbm(u * 60, v * 60, 3, 3, seed), 1.4) }); break; }
      case 'rubber': m = new THREE.MeshPhysicalMaterial({ color: col || '#2a2a2a', roughness: 0.75 }); break;
      case 'paint': m = new THREE.MeshPhysicalMaterial({ color: col || '#d94f3d', roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2 }); break;
      default: m = new THREE.MeshPhysicalMaterial({ color: col || '#e8e2d6', roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.2 });
    }
    if (col && m.map) m.color = new THREE.Color('#ffffff'); if (o.repeat && m.map) { m.map.repeat.set(...o.repeat); if (m.normalMap) m.normalMap.repeat.set(...o.repeat); }
    m.name = o.name || 'AI_' + kind; Object.assign(m, o.props || {}); return m; }
  // organic static mesh from signed-distance primitives (the same sculpting engine as the characters: smooth unions, paint, seams)
  function sculpt(spec) {
    const R = new RPC.Rig('sculpt_' + uid(''), spec.name || 'Sculpt'); R.bone('Root', null, [0, 0, 0], { dir: [0, 1, 0], len: 0.2 }); const ch = R.finish();
    const full = { name: spec.name || 'AI_Sculpt', surface: spec.surface || 'plastic', voxel: spec.voxel || 0.004, targetTris: spec.targetTris || 40000, tile: spec.tile || 0.03, base: spec.base || '#cccccc', paint: spec.paint || [], seams: spec.seams || [], carve: spec.carve || [], groove: spec.groove ?? 0.0006, lumps: spec.lumps ?? 0.0002, seamWidth: spec.seamWidth || 0.0016, grime: spec.grime ?? 0.15,
      parts: spec.parts.map((p) => ({ bones: ['Root'], k: 0.01, ...p })), rigid: [], drop: () => true, conform: () => null };
    const r = RPC.sculpt.build(ch, full, {}); const M = r.mesh; const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(M.P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(M.N, 3)); if (M.UV) g.setAttribute('uv', new THREE.BufferAttribute(M.UV, 2));
    if (M.C) { const lin = new Float32Array(M.C.length); for (let i = 0; i < lin.length; i++) { const c = M.C[i]; lin[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); } g.setAttribute('color', new THREE.BufferAttribute(lin, 3)); }
    g.setIndex(new THREE.BufferAttribute(M.I, 1)); g.computeBoundingSphere();
    const mm = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: spec.rough ?? (spec.surface === 'plastic' ? 0.35 : spec.surface === 'rubber' ? 0.6 : 0.85), clearcoat: spec.surface === 'plastic' ? 0.5 : 0, sheen: /felt|plush/.test(spec.surface || '') ? 0.7 : 0, ...(spec.mat || {}) });
    const mesh = new THREE.Mesh(g, mm); mesh.name = full.name; mesh.castShadow = mesh.receiveShadow = true; return mesh; }
  // a rigged, sculpted, animated character from a builder (same API as the shipped characters: RPC.Rig + spec.sculpt)
  async function character(id, builder, o = {}) { if (CAST.CASTS.find((c) => c.id === id)) throw new Error('A character with id "' + id + '" already exists'); RPC.builders[id] = () => builder(RPC); const live = RPC.SCULPT_LIVE; RPC.SCULPT_LIVE = o.quality !== 'draft'; let c; try { c = CAST.addCast(id); } finally { RPC.SCULPT_LIVE = live; } c.group.visible = true;
    c.mo.grounded = !o.hover; c.mo.gait = !o.hover; if (o.hover) c.ch.locomotion = 'hover'; try { fixArms(c); } catch (e) { console.warn('arms', e); } try { const pr = polishRig(c); c.deform = pr.report || deformTest(c); c.polish = pr; try { addShoulderHelpers(c); } catch (e) { console.warn('shoulder helpers', e); } } catch (e) { console.warn('weights', e); } setIdle(c); SBX.placed.set('cast:' + id, c.group); c.group.userData.sbx = { id: 'cast:' + id, name: c.ch.name, cast: id, solid: false }; refreshOutliner(); return c; }
  return { canvasTex, procTex, normalTex, mat, sculpt, character, fbm, noise3, P: RPC.sculpt.P, smin: RPC.sculpt.smin, smax: RPC.sculpt.smax, geo: RPC.arcadeGeo, mergeGeometries: BGU.mergeGeometries, RoundedBoxGeometry };
})();
SBX.kit = KIT;
// run AI-written builder code: (sbx, THREE, RPC, kit) => Object3D | Promise<Object3D>
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
async function runBuilder(code, extra = {}) { const fn = new AsyncFunction('sbx', 'THREE', 'RPC', 'kit', 'args', code); return fn(SBX, THREE, RPC, KIT, extra); }
async function spawnCreation(c, opt = {}) {
  if (c.kind === 'character') { const id = c.charId || c.id; let cast = CAST.CASTS.find((k) => k.id === id); if (!cast) { const builder = new Function('RPC', c.code); cast = await KIT.character(id, builder, { hover: !!c.hover }); } const at = opt.at || c.at || freeSpot(frontSpot(), 0.4).toArray(); cast.group.position.set(...at); const gy = groundBelow(at[0], at[2], at[1] + 2, 10); if (gy !== null && !c.hover) cast.group.position.y = gy; cast.group.visible = true; return 'cast:' + id; }
  const obj = await runBuilder(c.code, c.args || {}); if (!obj || !obj.isObject3D) throw new Error('The builder code must return a THREE.Object3D'); obj.name = obj.name || c.name;
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } });
  const box = worldBox(obj); const at = opt.at || c.at; if (at) { obj.position.x += at[0]; obj.position.z += at[2]; obj.position.y += at[1] ?? 0; if (opt.ground !== false && c.ground !== false) { const b2 = worldBox(obj); const gy = groundBelow((b2.min.x + b2.max.x) / 2, (b2.min.z + b2.max.z) / 2, b2.max.y + 1, 80); if (gy !== null && Math.abs(b2.min.y - gy) < 2) obj.position.y += gy - b2.min.y; } }
  if (opt.yaw || c.yaw) obj.rotateOnWorldAxis(UP, opt.yaw ?? c.yaw);
  const e = SBX.entries.find((x) => x.creation && x.creation.id === c.id); if (e) e.obj = obj;
  const id = registerPlaced(obj, { name: c.name, entry: e && e.id, creation: c.id, solid: c.solid !== false }); c.tris = triCount(obj); resolveOllo(); return id; }

// ---------------------------------------------------------------- 8b. systems (live behaviours, mechanics, effects), physics + collisions, events, scripts, saved worlds
// Everything the AI makes is kept in the library and in the database: objects (their builder code), characters (their rig builder),
// animations, systems (per-frame code: mechanics, effects, game rules), scripts (one-off code it ran), and the world itself.
const BUS = new Map(); // event bus: sbx.on('collide', fn), sbx.emit('door-open', data)
SBX.on = (ev, fn) => { if (!BUS.has(ev)) BUS.set(ev, new Set()); BUS.get(ev).add(fn); return () => BUS.get(ev).delete(fn); };
SBX.emit = (ev, data) => { for (const fn of BUS.get(ev) || []) { try { fn(data); } catch (e) { console.warn('event', ev, e); } } };
SBX.time = 0; SBX.state = {}; // shared state systems can use (scores, switches, timers); saved with the world
// ---- physics: rigid bodies (sphere or box proxy) with gravity, bounce, friction, collisions against every solid and each other
const BODIES = new Set();
function addBody(obj, o = {}) {
  const box = worldBox(obj); const size = box.getSize(new THREE.Vector3()); const r = o.radius ?? Math.max(0.02, Math.min(size.x, size.y, size.z) / 2);
  const b = { obj, mass: o.mass ?? 1, r, half: size.clone().multiplyScalar(0.5), bounce: o.bounce ?? 0.35, friction: o.friction ?? 0.6, vel: new THREE.Vector3(...(o.velocity || [0, 0, 0])), spin: new THREE.Vector3(...(o.spin || [0, 0, 0])), gravity: o.gravity ?? -9.81, fixed: !!o.fixed, sleeping: false, name: o.name || obj.name, onCollide: o.onCollide || null };
  obj.userData.body = b; BODIES.add(b); if (obj.userData.sbx) obj.userData.sbx.solid = false; SBX.dirty = true; return b;
}
function physicsStep(dt) {
  if (!BODIES.size) return; const sub = Math.max(1, Math.ceil(dt / 0.012)); const h = dt / sub;
  for (let k = 0; k < sub; k++) for (const b of BODIES) {
    if (b.fixed || !b.obj.parent) { if (!b.obj.parent) BODIES.delete(b); continue; }
    b.vel.y += b.gravity * h; const p = b.obj.position; const ctr = worldBox(b.obj).getCenter(new THREE.Vector3()); const off = ctr.clone().sub(p);
    const move = b.vel.clone().multiplyScalar(h); const L = move.length();
    if (L > 1e-6) { const hit = castRay(ctr, move.clone().normalize(), L + b.r); if (hit && hit.object !== b.obj && !isChild(hit.object, b.obj)) { const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0); const vn = b.vel.dot(n); if (vn < 0) { const impact = -vn; b.vel.addScaledVector(n, -vn * (1 + b.bounce)); const vt = b.vel.clone().addScaledVector(n, -b.vel.dot(n)); b.vel.addScaledVector(vt, -Math.min(1, b.friction * h * 10)); move.copy(b.vel).multiplyScalar(h); if (impact > 0.4) { const ev = { a: b.obj, b: hit.object, point: hit.point.toArray(), speed: impact }; SBX.emit('collide', ev); if (b.onCollide) b.onCollide(ev); } } } p.add(move); }
    // resting on something: settle
    const below = castRay(new THREE.Vector3(ctr.x, ctr.y, ctr.z), new THREE.Vector3(0, -1, 0), b.half.y + 0.02); if (below && below.object !== b.obj && !isChild(below.object, b.obj)) { const lift = b.half.y - below.distance; if (lift > 0) p.y += lift; if (b.vel.y < 0 && Math.abs(b.vel.y) < 0.3) b.vel.y = 0; }
    b.obj.rotation.x += b.spin.x * h; b.obj.rotation.y += b.spin.y * h; b.obj.rotation.z += b.spin.z * h; b.spin.multiplyScalar(Math.exp(-h * 1.5));
    if (p.y < -60) { BODIES.delete(b); }
    void off;
  }
  // body vs body (spheres): push apart, exchange momentum, emit events
  const arr = [...BODIES]; for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) { const A = arr[i], B = arr[j]; const ca = worldBox(A.obj).getCenter(new THREE.Vector3()), cb = worldBox(B.obj).getCenter(new THREE.Vector3()); const d = cb.clone().sub(ca); const dist = d.length(), min = A.r + B.r; if (dist >= min || dist < 1e-6) continue; const n = d.multiplyScalar(1 / dist); const pen = min - dist; const ma = A.fixed ? Infinity : A.mass, mb = B.fixed ? Infinity : B.mass; const wa = isFinite(ma) ? (isFinite(mb) ? mb / (ma + mb) : 1) : 0, wb = 1 - wa; A.obj.position.addScaledVector(n, -pen * wa); B.obj.position.addScaledVector(n, pen * wb); const rv = B.vel.clone().sub(A.vel).dot(n); if (rv < 0) { const e = Math.min(A.bounce, B.bounce); const jImp = -(1 + e) * rv / ((isFinite(ma) ? 1 / ma : 0) + (isFinite(mb) ? 1 / mb : 0)); if (isFinite(ma)) A.vel.addScaledVector(n, -jImp / ma); if (isFinite(mb)) B.vel.addScaledVector(n, jImp / mb); if (-rv > 0.3) SBX.emit('collide', { a: A.obj, b: B.obj, speed: -rv }); } }
  // bodies vs characters: Ollo and the cast push and are pushed
  for (const b of BODIES) { if (b.fixed) continue; const c = worldBox(b.obj).getCenter(new THREE.Vector3()); for (const ch of CAST.CASTS) { if (!ch.group.visible) continue; const q = ch.group.position.clone(); q.y += 0.3; const d = c.clone().sub(q); const dist = d.length(); if (dist < b.r + 0.18 && dist > 1e-4) { d.normalize(); b.obj.position.addScaledVector(d, b.r + 0.18 - dist); const vn = b.vel.dot(d); if (vn < 0) b.vel.addScaledVector(d, -vn * 1.4); SBX.emit('touch', { object: b.obj, character: ch.id }); } } }
}
const isChild = (o, root) => { while (o) { if (o === root) return true; o = o.parent; } return false; };
SBX.addBody = addBody; SBX.bodies = BODIES;
// overlap / trigger zones: sbx.trigger({center, size}, onEnter, onExit) fires when a character or body enters
const TRIGGERS = new Set();
SBX.trigger = (zone, onEnter, onExit) => { const t = { box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...zone.center), new THREE.Vector3(...zone.size)), inside: new Set(), onEnter, onExit }; TRIGGERS.add(t); return () => TRIGGERS.delete(t); };
function triggersStep() { if (!TRIGGERS.size) return; const who = [...CAST.CASTS.filter((c) => c.group.visible).map((c) => [c.id, c.group.position.clone().add(new THREE.Vector3(0, 0.3, 0))]), ...[...BODIES].map((b) => [b.obj.uuid, worldBox(b.obj).getCenter(new THREE.Vector3())])];
  for (const t of TRIGGERS) for (const [id, p] of who) { const inn = t.box.containsPoint(p); if (inn && !t.inside.has(id)) { t.inside.add(id); try { t.onEnter && t.onEnter(id); } catch (e) { console.warn(e); } SBX.emit('enter', { id, zone: t }); } else if (!inn && t.inside.has(id)) { t.inside.delete(id); try { t.onExit && t.onExit(id); } catch (e) { console.warn(e); } } } }
// ---- particles: GPU points with per-particle life, velocity, gravity, colour over life, size over life, additive glow or soft smoke
function particles(o = {}) {
  const N = o.count || 400; const geo = new THREE.BufferGeometry(); const P = new Float32Array(N * 3), C = new Float32Array(N * 3), S = new Float32Array(N); const life = new Float32Array(N), age = new Float32Array(N), V = new Float32Array(N * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3)); geo.setAttribute('size', new THREE.BufferAttribute(S, 1));
  const sprite = KIT.canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }, { clamp: true });
  const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: sprite }, scale: { value: renderer.domElement.height / 2 } }, vertexColors: true, transparent: true, depthWrite: false, blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    vertexShader: 'attribute float size; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * 300.0 / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); if (t.a < 0.02) discard; gl_FragColor = vec4(vC * t.a, t.a); }' });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.name = o.name || 'Particles'; pts.userData.sbx = { solid: false };
  const c0 = new THREE.Color(o.colorStart || '#ffd27a'), c1 = new THREE.Color(o.colorEnd || '#ff3b1f'); const rate = o.rate ?? N / (o.life || 1.5); let acc = 0; const emit = o.emitter || ((p, v) => { p.set((Math.random() - 0.5) * (o.spread ?? 0.1), 0, (Math.random() - 0.5) * (o.spread ?? 0.1)); v.set((Math.random() - 0.5) * (o.jitter ?? 0.4), o.speed ?? 1.2, (Math.random() - 0.5) * (o.jitter ?? 0.4)); });
  const tp = new THREE.Vector3(), tv = new THREE.Vector3(); for (let i = 0; i < N; i++) { age[i] = 1; life[i] = 0; S[i] = 0; }
  pts.userData.update = (dt) => { acc += rate * dt; for (let i = 0; i < N; i++) { if (age[i] >= life[i]) { if (acc >= 1) { acc -= 1; emit(tp, tv, i); P.set([tp.x, tp.y, tp.z], i * 3); V.set([tv.x, tv.y, tv.z], i * 3); life[i] = (o.life || 1.5) * (0.6 + Math.random() * 0.8); age[i] = 0; } else { S[i] = 0; continue; } }
      age[i] += dt; const u = Math.min(1, age[i] / life[i]); V[i * 3 + 1] += (o.gravity ?? 0) * dt; const drag = Math.exp(-(o.drag ?? 0.5) * dt); for (let k = 0; k < 3; k++) { V[i * 3 + k] *= drag; P[i * 3 + k] += V[i * 3 + k] * dt; }
      const col = c0.clone().lerp(c1, u); const fade = (o.fade ?? 1) * Math.sin(Math.PI * Math.min(1, u * 1.15)); C.set([col.r * fade, col.g * fade, col.b * fade], i * 3); S[i] = (o.size ?? 0.08) * (1 + (o.grow ?? 0.5) * u); }
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = geo.attributes.size.needsUpdate = true; };
  return pts;
}
KIT.particles = particles; KIT.body = addBody; KIT.trigger = SBX.trigger;
// any object can carry its own per-frame behaviour: obj.userData.update = (dt, t) => {...}; it runs while the object is in the world
// ---- systems: named live behaviours (code returning {update(dt, t), dispose()}), kept in the library, switched on/off
const SYSTEMS = new Map(); SBX.systems = SYSTEMS;
async function startSystem(def) { stopSystem(def.id); let inst = await runBuilder(def.code, def.args || {}); if (typeof inst === 'function') inst = { update: inst }; inst = inst || {}; SYSTEMS.set(def.id, { def, inst, on: true, err: null }); worldChanged(); return def.id; }
function stopSystem(id) { const s = SYSTEMS.get(id); if (!s) return false; try { s.inst.dispose && s.inst.dispose(); } catch (e) { console.warn(e); } SYSTEMS.delete(id); worldChanged(); return true; }
SBX.startSystem = startSystem; SBX.stopSystem = stopSystem;
function systemsStep(dt) { SBX.time += dt; for (const [id, s] of SYSTEMS) { if (!s.on || !s.inst.update) continue; const gs = GUARD.snap(); try { s.inst.update(dt, SBX.time); GUARD.check(gs, s.def.allowCam, s.def.allowOllo, 'system “' + s.def.name + '”'); } catch (e) { s.on = false; s.err = String(e.message || e); feed('err', 'System “' + s.def.name + '” stopped: ' + s.err); } }
  for (const [, o] of SBX.placed) o.traverse((x) => { if (x.userData && typeof x.userData.update === 'function') { try { x.userData.update(dt, SBX.time); } catch (e) { x.userData.update = null; feed('err', 'Behaviour on ' + (o.name || 'object') + ' stopped: ' + (e.message || e)); } } }); }
function addSystemEntry(def) { const old = SBX.entries.find((e) => e.system && e.system.id === def.id); if (old) SBX.entries.splice(SBX.entries.indexOf(old), 1); return addEntry({ id: 'sy_' + def.id, name: def.name, category: 'Systems', kind: 'system', system: def, tags: [...(def.tags || []), 'system', 'behaviour', 'code'], desc: def.description || 'A live system made by the AI.' }); }
function addScriptEntry(sc) { return addEntry({ id: 'sc_' + sc.id, name: sc.name, category: 'Scripts', kind: 'script', script: sc, tags: [...(sc.tags || []), 'script', 'code', 'edit'], desc: (sc.description || 'Code the AI ran on the world.') + ' Run it again from here.' }); }
// ---- the world, saved: what is placed where (by library reference), edits, systems running, shared state, Ollo
let worldDirty = false; function worldChanged() { worldDirty = true; }
function snapshotWorld() {
  const inst = []; const tf = (o) => ({ p: o.position.toArray().map((v) => +v.toFixed(4)), q: o.quaternion.toArray().map((v) => +v.toFixed(5)), s: o.scale.toArray().map((v) => +v.toFixed(4)), v: o.visible, ...(o.userData.body ? { body: (({ mass, bounce, friction, gravity, fixed, r }) => ({ mass, bounce, friction, gravity, fixed, radius: r }))(o.userData.body) } : {}) });
  for (const [id, o] of SBX.placed) { const m = o.userData.sbx || {}; if (id.startsWith('cast:')) inst.push({ id, cast: m.cast || id.slice(5), ...tf(o) }); else if (id === 'wand') inst.push({ id, wand: true, ...tf(o) }); else if (m.creation) inst.push({ id, creation: m.creation, ...tf(o) }); else if (m.entry) inst.push({ id, entry: m.entry, ...tf(o) }); }
  return { v: 1, t: Date.now(), inst, systems: [...SYSTEMS.values()].filter((s) => s.on).map((s) => s.def.id), state: JSON.parse(JSON.stringify(SBX.state || {})), ollo: { p: ollo.group.position.toArray(), yaw: ollo.group.rotation.y }, island: !!park.root.visible };
}
async function loadWorld(w) {
  for (const id of [...SBX.placed.keys()]) removePlaced(id); for (const id of [...SYSTEMS.keys()]) stopSystem(id);
  for (const it of w.inst || []) { try { let id = null;
    if (it.cast) { const e = SBX.entries.find((x) => x.kind === 'cast' && x.cast.id === it.cast) || SBX.entries.find((x) => x.creation && (x.creation.charId || x.creation.id) === it.cast); if (e) id = await placeEntry(e, { at: it.p }); }
    else if (it.wand) { const e = SBX.entries.find((x) => x.kind === 'wand'); if (wand.userData.held) id = await placeEntry(e, { at: it.p }); }
    else if (it.creation) { const c = SBX.creations.get(it.creation); if (c) id = await spawnCreation(c, { ground: false }); }
    else if (it.entry) { const e = SBX.entries.find((x) => x.id === it.entry); if (e) id = await placeEntry(e); }
    const o = id && SBX.placed.get(id); if (o && !it.cast) { o.position.fromArray(it.p); o.quaternion.fromArray(it.q); o.scale.fromArray(it.s); o.visible = it.v !== false; const a = appear.find((x) => x.o === o); if (a) a.s.fromArray(it.s); if (it.body) addBody(o, it.body); }
  } catch (e) { console.warn('restore', it, e); } }
  SBX.state = w.state || {}; for (const sid of w.systems || []) { const e = SBX.entries.find((x) => x.system && x.system.id === sid); if (e) await startSystem(e.system).catch((err) => feed('err', 'System ' + e.name + ': ' + err.message)); }
  if (w.ollo) SBX.olloTeleport(w.ollo.p, w.ollo.yaw); park.root.visible = !!w.island; SBX.dirty = true; resolveOllo(); worldDirty = false; return true;
}
SBX.snapshotWorld = snapshotWorld; SBX.loadWorld = loadWorld;
function addWorldEntry(w) { const old = SBX.entries.find((e) => e.world && e.world.id === w.id); if (old) SBX.entries.splice(SBX.entries.indexOf(old), 1); return addEntry({ id: 'wo_' + w.id, name: w.name, category: 'Worlds', kind: 'world', world: w, tags: ['world', 'scene', 'save', 'level'], desc: `${w.data.inst.length} objects, ${w.data.systems.length} systems · saved ${new Date(w.data.t).toLocaleString()}` }); }
async function saveWorld(name, id = slug(name)) { const w = { id, name, data: snapshotWorld() }; addWorldEntry(w); const ok = await dbSave('sbx_worlds', id, w); try { localStorage.setItem('sbx_world_' + id, JSON.stringify(w)); } catch (e) { /* storage off */ } return ok; }
SBX.saveWorld = saveWorld;
// autosave: the current world is kept as “Last session” every few seconds while it changes (database, plus this browser as a fallback)
let autoT = 0, lastSnap = '';
function autosaveStep(dt) { if ((autoT += dt) < 4) return; autoT = 0; const snap = snapshotWorld(); const key = JSON.stringify({ ...snap, t: 0, ollo: 0 }); if (key === lastSnap && !worldDirty) return; lastSnap = key; worldDirty = false; if (!snap.inst.length && !snap.systems.length) return; const w = { id: 'last_session', name: 'Last session (autosaved)', data: snap }; addWorldEntry(w); dbSave('sbx_worlds', w.id, w); try { localStorage.setItem('sbx_world_last_session', JSON.stringify(w)); } catch (e) { /* off */ } }
(async () => { // saved systems, scripts and worlds come back into the library at load (the world itself starts empty: load one from the library)
  for (let i = 0; i < 100 && DB === null && !window.__SBX_NODB; i++) await sleep(100);
  const take = async (col, fn) => { if (!DB) return; try { const snap = await DB.collection(col).get(); for (const d of snap.docs) { const x = d.data(); if (x) fn(x); } } catch (e) { console.warn(col, e); } };
  await take('sbx_systems', addSystemEntry); await take('sbx_scripts', addScriptEntry); await take('sbx_worlds', addWorldEntry);
  try { const w = JSON.parse(localStorage.getItem('sbx_world_last_session') || 'null'); if (w && !SBX.entries.find((e) => e.world && e.world.id === 'last_session')) addWorldEntry(w); } catch (e) { /* off */ }
  if (!libEl.hidden) { renderChips(); renderGrid(); } })();
// ---------------------------------------------------------------- 8c. PLAY AS: drive any character yourself (joystick / WASD, jump), any rig
// Legged rigs (2, 4, 6, 8 legs: every IK chain of kind 'leg') walk and run with the engine's procedural gait and foot IK; hovering
// characters fly; legless rigs (snakes, worms, string creatures, blobs) slither with a travelling wave down their spine; wheeled or
// rolling rigs roll. Jump works for all of them (squash, tuck, arc, land), and the camera follows from behind.
const PLAYER = { c: null, mx: 0, mz: 0, keys: new Set(), run: false, air: null, yawCam: 0 };
const locoKind = (c) => { if (c === ollo || (c.ch.hover) || c.ch.locomotion === 'hover' || c.ch.extra_hover) return 'hover'; if (c.ch.locomotion) return c.ch.locomotion; return c.ch.ik.filter((k) => k.kind === 'leg').length >= 2 ? 'legs' : 'slither'; };
const SPINE_RX = /^(Spine|Segment|Seg|Body|Neck|Tail|Torso)(_\d+)?$|^(Spine|Segment|Seg|Body|Tail)_?\d+/;
function spineBones(c) { if (c._spine) return c._spine; const out = []; c.ch.bones.forEach((b, i) => { if (SPINE_RX.test(b.name) || /Tail|Spine|Segment/.test(b.name)) out.push(i); }); return (c._spine = out); }
// joystick + jump (pointer: mouse or touch), shown only while controlling
const joy = h('div', { class: 'joy', hidden: true }, h('i')); const jumpBtn = h('button', { class: 'jumpbtn', hidden: true, 'aria-label': 'Jump' }, 'Jump');
const runBtn = h('button', { class: 'runbtn', hidden: true, 'aria-pressed': 'false' }, 'Run'); const ctlBar = h('div', { class: 'ctlbar', hidden: true }, h('span', {}, ''));
root.append(joy, jumpBtn, runBtn, ctlBar);
style.textContent += `
.joy { position: absolute; left: 28px; bottom: 28px; width: 132px; height: 132px; border-radius: 50%; background: rgba(14,18,23,.45); border: 2px solid rgba(255,255,255,.25); pointer-events: auto; touch-action: none; z-index: 38; }
.joy i { position: absolute; left: 50%; top: 50%; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; background: rgba(255,179,71,.85); box-shadow: 0 4px 12px rgba(0,0,0,.4); }
.jumpbtn, .runbtn { position: absolute; right: 30px; bottom: 34px; width: 92px; height: 92px; border-radius: 50% !important; font-size: 15px !important; background: rgba(255,179,71,.9) !important; color: #1b1206 !important; touch-action: none; z-index: 38; }
.runbtn { right: 136px; bottom: 30px; width: 64px; height: 64px; background: rgba(28,34,43,.9) !important; color: var(--ink) !important; }
.ctlbar { padding: 5px 14px !important; pointer-events: none !important; position: absolute; left: 50%; top: 58px; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; background: var(--bg); border: 1px solid var(--line); border-radius: 99px; font-size: 12.5px; z-index: 36; max-width: calc(100vw - 24px); }
body.sbx-playing #sbxPrompt { opacity: .45; } body.sbx-playing .sbx-hint { display: none; } body.sbx-playing #sbxPrompt:focus-within { opacity: 1; }`;
// First-person look-around with procedural head-first kinematics (mouse drag & touch drag)
const FPV_LOOK = {
  active: false, dragging: false, pid: null, lx: 0, ly: 0,
  yaw: 0, pitch: 0, headYaw: 0, headPitch: 0, spineYaw: 0, eyeLeadYaw: 0, eyeLeadPitch: 0,
  prevControlsEnabled: null, charId: null,
};
SBX.fpvLook = FPV_LOOK;
function fpvSyncFromChar(c) {
  if (!c) return;
  FPV_LOOK.yaw = c.group.rotation.y || 0;
  FPV_LOOK.pitch = 0;
  FPV_LOOK.headYaw = 0;
  FPV_LOOK.headPitch = 0;
  FPV_LOOK.spineYaw = 0;
  FPV_LOOK.eyeLeadYaw = 0;
  FPV_LOOK.eyeLeadPitch = 0;
  FPV_LOOK.charId = c.id;
}
function fpvSetActive(on) {
  if (on && !FPV_LOOK.active) {
    FPV_LOOK.active = true;
    FPV_LOOK.prevControlsEnabled = controls.enabled;
    controls.enabled = false;
    if (PLAYER.c && FPV_LOOK.charId !== PLAYER.c.id) fpvSyncFromChar(PLAYER.c);
  } else if (!on && FPV_LOOK.active) {
    FPV_LOOK.active = false;
    FPV_LOOK.dragging = false;
    FPV_LOOK.pid = null;
    if (FPV_LOOK.prevControlsEnabled !== null) {
      controls.enabled = FPV_LOOK.prevControlsEnabled;
      FPV_LOOK.prevControlsEnabled = null;
    } else {
      controls.enabled = true;
    }
  }
}
{
  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', (ev) => {
    if (!FPV_LOOK.active || !PLAYER.c) return;
    if (ev.button !== undefined && ev.button !== 0 && ev.pointerType === 'mouse') return;
    if (FPV_LOOK.pid !== null) return;
    FPV_LOOK.dragging = true;
    FPV_LOOK.pid = ev.pointerId;
    FPV_LOOK.lx = ev.clientX;
    FPV_LOOK.ly = ev.clientY;
    try { dom.setPointerCapture(ev.pointerId); } catch (e) { /* ok */ }
    ev.stopPropagation();
  }, true);
  dom.addEventListener('pointermove', (ev) => {
    if (!FPV_LOOK.active || !FPV_LOOK.dragging || ev.pointerId !== FPV_LOOK.pid) return;
    const dx = ev.clientX - FPV_LOOK.lx;
    const dy = ev.clientY - FPV_LOOK.ly;
    FPV_LOOK.lx = ev.clientX;
    FPV_LOOK.ly = ev.clientY;
    const sens = ev.pointerType === 'touch' ? 0.0056 : 0.0044;
    FPV_LOOK.yaw -= dx * sens;
    FPV_LOOK.pitch = clamp(FPV_LOOK.pitch - dy * sens, -1.16, 1.16);
    ev.stopPropagation();
  }, true);
  const endFpvDrag = (ev) => {
    if (ev.pointerId !== FPV_LOOK.pid) return;
    FPV_LOOK.dragging = false;
    FPV_LOOK.pid = null;
    try { dom.releasePointerCapture(ev.pointerId); } catch (e) { /* ok */ }
  };
  dom.addEventListener('pointerup', endFpvDrag, true);
  dom.addEventListener('pointercancel', endFpvDrag, true);
}
{ let pid = null; const R = 52; const knob = joy.firstChild; const set = (ev) => { const r = joy.getBoundingClientRect(); let x = ev.clientX - r.left - r.width / 2, y = ev.clientY - r.top - r.height / 2; const L = Math.hypot(x, y); if (L > R) { x *= R / L; y *= R / L; } knob.style.transform = `translate(${x}px, ${y}px)`; PLAYER.mx = x / R; PLAYER.mz = y / R; };
  joy.addEventListener('pointerdown', (ev) => { pid = ev.pointerId; joy.setPointerCapture(pid); set(ev); }); joy.addEventListener('pointermove', (ev) => { if (ev.pointerId === pid) set(ev); });
  const end = (ev) => { if (ev.pointerId !== pid) return; pid = null; knob.style.transform = ''; PLAYER.mx = PLAYER.mz = 0; }; joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end); }
jumpBtn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); doJump(); }); runBtn.onclick = () => { PLAYER.run = !PLAYER.run; runBtn.setAttribute('aria-pressed', String(PLAYER.run)); };
const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE']);
addEventListener('keydown', (ev) => { if (!PLAYER.c || /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return; if (ev.code === 'Escape') { stopControl(); return; } if (!MOVE_KEYS.has(ev.code)) return; ev.preventDefault(); ev.stopImmediatePropagation(); PLAYER.keys.add(ev.code); if (ev.code === 'Space' && !ev.repeat) doJump(); }, true);
addEventListener('keyup', (ev) => { if (!PLAYER.c) return; if (MOVE_KEYS.has(ev.code)) { PLAYER.keys.delete(ev.code); ev.stopImmediatePropagation(); } }, true);
addEventListener('blur', () => PLAYER.keys.clear());
function control(c) {
  { let md = null; try { md = MINDS.get(c.id); } catch (e) { md = null; } if (md && md.locked) { toast(`${c.ch.name || c.id} has a mind of its own right now (Ollo locked it)`); return null; } }
  if (PLAYER.c) stopControl(true); PLAYER.c = c; PLAYER.kind = locoKind(c); PLAYER.hvel = new THREE.Vector3(); PLAYER.holdY = c.group.position.y; PLAYER._lastPos = c.group.position.clone(); c.group.visible = true;
  if (PLAYER.kind === 'legs') { c.mo.grounded = true; c.mo.gait = true; } if (c === ollo) { OH.manual = false; OH.holdY = c.group.position.y; }
  fpvSyncFromChar(c);
  for (const e of [joy, jumpBtn, runBtn]) e.hidden = false; ctlBar.firstChild.textContent = `Controlling ${c.ch.name} · ${PLAYER.kind === 'legs' ? 'walks' : PLAYER.kind === 'hover' ? 'flies' : PLAYER.kind === 'roll' ? 'rolls' : 'slithers'} · Drag to look · WASD / joystick · Space jump · Shift run · Esc to stop`;
  document.body.classList.add('sbx-playing'); if (narrow()) { setMini(true); toggleLib(false); } follow = false; btnFollow.setAttribute('aria-pressed', 'false'); return c.id;
}
function stopControl(quiet) { const c = PLAYER.c; if (!c) return; if (PLAYER.kind === 'legs' && c.walk) c.walk.pts = []; fpvSetActive(false); FPV_LOOK.charId = null; PLAYER.c = null; PLAYER.keys.clear(); PLAYER.mx = PLAYER.mz = 0; PLAYER._lastPos = null; for (const e of [joy, jumpBtn, runBtn, ctlBar]) e.hidden = true; document.body.classList.remove('sbx-playing'); void quiet; }
SBX.control = control; SBX.stopControl = stopControl; SBX.player = PLAYER; SBX._playerStep = (dt) => playerStep(dt);
function doJump() { const c = PLAYER.c; if (!c || PLAYER.air) return; if (PLAYER.kind === 'hover') { if (c === ollo) { OH.holdY = (OH.holdY ?? ollo.group.position.y) + 0.65; OH.vel.y = Math.max(OH.vel.y, 2.4); playClip(ollo, 'Celebrate'); } else { PLAYER.holdY = (PLAYER.holdY ?? c.group.position.y) + 0.65; if (PLAYER.hvel) PLAYER.hvel.y = Math.max(PLAYER.hvel.y, 2.4); } return; }
  const g = c.group; PLAYER.air = { vy: 3.6 * Math.max(0.6, Math.min(1.4, (c.motion.gait && c.motion.gait.legLen ? c.motion.gait.legLen / 0.25 : 1) ** 0.5)), t: 0, wind: 0.09 };
  try { playClip(c, 'Jump tuck'); } catch (e) { /* any rig: bones matched by role */ } if (c.walk) c.walk.pts = []; }
// built-in jump pose (squash, tuck the legs, arms up), matched by role on any rig
SBX.anims.set('Jump tuck', proc('Jump tuck') || { name: 'Jump tuck', duration: 0.9, loop: false, keys: [{ t: 0, bones: { 'Leg_Upper.L': [-12, 0, 0], 'Leg_Upper.R': [-12, 0, 0], 'Leg_Lower.L': [22, 0, 0], 'Leg_Lower.R': [22, 0, 0] } }, { t: 0.35, bones: { 'Leg_Upper.L': [-32, 0, 0], 'Leg_Upper.R': [-32, 0, 0], 'Leg_Lower.L': [48, 0, 0], 'Leg_Lower.R': [48, 0, 0], 'Foot.L': [-14, 0, 0], 'Foot.R': [-14, 0, 0], Head: [-6, 0, 0], Tail_1: [-12, 0, 0] } }, { t: 0.9, bones: { 'Leg_Upper.L': [0, 0, 0], 'Leg_Upper.R': [0, 0, 0], 'Leg_Lower.L': [0, 0, 0], 'Leg_Lower.R': [0, 0, 0] } }] });
const camFwd = () => {
  if (FPV_LOOK.active && PLAYER.c) return new THREE.Vector3(Math.sin(FPV_LOOK.yaw), 0, Math.cos(FPV_LOOK.yaw));
  const d = new THREE.Vector3(); camera.getWorldDirection(d); d.y = 0; if (d.lengthSq() < 1e-6) d.set(0, 0, -1); return d.normalize();
};
function playerStep(dt) {
  const c = PLAYER.c; if (!c) { fpvSetActive(false); return; } if (!c.group.visible) return stopControl(true);
  const inFpv = !!(typeof CHK !== 'undefined' && CHK && CHK.fpv);
  fpvSetActive(inFpv);
  const k = PLAYER.keys; let ix = PLAYER.mx + ((k.has('KeyD') || k.has('ArrowRight')) ? 1 : 0) - ((k.has('KeyA') || k.has('ArrowLeft')) ? 1 : 0); let iz = PLAYER.mz + ((k.has('KeyS') || k.has('ArrowDown')) ? 1 : 0) - ((k.has('KeyW') || k.has('ArrowUp')) ? 1 : 0);
  const mag = Math.min(1, Math.hypot(ix, iz)); const f = camFwd(), r = new THREE.Vector3(-f.z, 0, f.x); const dir = f.clone().multiplyScalar(-iz).addScaledVector(r, ix); if (dir.lengthSq() > 1e-6) dir.normalize();
  const running = PLAYER.run || k.has('ShiftLeft') || k.has('ShiftRight'); const g = c.group; const p = g.position;
  // First-person procedural head-first kinematics: head/neck turns first before the body rotates to follow
  if (inFpv) {
    const bodyYaw = g.rotation.y || 0;
    const relYaw = RPC.angDiff(FPV_LOOK.yaw, bodyYaw);
    const HEAD_DEADZONE = 0.68; // ~39 deg comfortable head-only turn before body starts turning
    const HEAD_MAX = 1.02;      // ~58 deg anatomical limit
    const wantHeadYaw = clamp(relYaw, -HEAD_MAX, HEAD_MAX);
    const prevHeadYaw = FPV_LOOK.headYaw;
    FPV_LOOK.headYaw += (wantHeadYaw - FPV_LOOK.headYaw) * (1 - Math.exp(-dt * 14));
    FPV_LOOK.headPitch += (clamp(FPV_LOOK.pitch, -0.82, 0.82) - FPV_LOOK.headPitch) * (1 - Math.exp(-dt * 14));
    FPV_LOOK.spineYaw += (clamp(FPV_LOOK.headYaw * 0.28, -0.24, 0.24) - FPV_LOOK.spineYaw) * (1 - Math.exp(-dt * 9));
    // Eyes lead slightly ahead of the head during active turns
    const leadY = clamp((relYaw - FPV_LOOK.headYaw) * 0.65 + (FPV_LOOK.headYaw - prevHeadYaw) * 2.2, -0.34, 0.34);
    const leadP = clamp((FPV_LOOK.pitch - FPV_LOOK.headPitch) * 0.6, -0.25, 0.25);
    FPV_LOOK.eyeLeadYaw += (leadY - FPV_LOOK.eyeLeadYaw) * (1 - Math.exp(-dt * 24));
    FPV_LOOK.eyeLeadPitch += (leadP - FPV_LOOK.eyeLeadPitch) * (1 - Math.exp(-dt * 24));
    // Body follows ONLY after head exceeds comfort zone (or when moving)
    if (mag < 0.06) {
      let bodyTurn = 0;
      if (Math.abs(relYaw) > HEAD_DEADZONE) {
        const excess = Math.sign(relYaw) * (Math.abs(relYaw) - HEAD_DEADZONE);
        bodyTurn = excess * (1 - Math.exp(-dt * 6.5));
        if (Math.abs(relYaw) > HEAD_MAX) {
          const hard = Math.sign(relYaw) * (Math.abs(relYaw) - HEAD_MAX);
          if (Math.abs(hard) > Math.abs(bodyTurn)) bodyTurn = hard;
        }
      }
      if (Math.abs(bodyTurn) > 1e-5) {
        if (c === ollo) { g.rotation.y += bodyTurn; OH.yawTarget = g.rotation.y; }
        else { g.rotation.y += bodyTurn; }
      } else if (c === ollo) {
        OH.yawTarget = g.rotation.y;
      }
    }
  }
  if (PLAYER.kind === 'hover') { // smooth flight: steer with exponential velocity damping; Q/E sink and rise
    const sp = (running ? 3.8 : 2.2) * mag; const up = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0);
    if (c === ollo) {
      OH.target = null;
      const damp = 1 - Math.exp(-dt * (mag > 0.04 ? 7.5 : 6.0));
      OH.vel.x += ((mag > 0.04 ? dir.x * sp : 0) - OH.vel.x) * damp;
      OH.vel.z += ((mag > 0.04 ? dir.z * sp : 0) - OH.vel.z) * damp;
      if (mag > 0.05) OH.yawTarget = inFpv ? FPV_LOOK.yaw : Math.atan2(dir.x, dir.z);
      const minFloor = (OH.floorY !== undefined ? OH.floorY : (groundBelow(p.x, p.z, p.y + 0.3, 80) ?? 0)) + OH.hover;
      if (OH.holdY === undefined || OH.holdY === null) OH.holdY = Math.max(p.y, minFloor);
      if (up !== 0) OH.holdY = Math.max(OH.holdY + up * dt * (running ? 2.6 : 1.9), minFloor);
      else OH.holdY = Math.max(OH.holdY, minFloor);
    } else {
      const hv = PLAYER.hvel || (PLAYER.hvel = new THREE.Vector3());
      const damp = 1 - Math.exp(-dt * (mag > 0.04 ? 7.5 : 6.0));
      hv.x += ((mag > 0.04 ? dir.x * sp : 0) - hv.x) * damp;
      hv.z += ((mag > 0.04 ? dir.z * sp : 0) - hv.z) * damp;
      const gy = groundBelow(p.x, p.z, p.y + 0.5, 80) ?? 0;
      if (PLAYER.holdY === undefined || PLAYER.holdY === null) PLAYER.holdY = Math.max(p.y, gy + 0.32);
      if (up !== 0) PLAYER.holdY = Math.max(PLAYER.holdY + up * dt * (running ? 2.4 : 1.8), gy + 0.32);
      else PLAYER.holdY = Math.max(PLAYER.holdY, gy + 0.32);
      const vyWant = clamp((PLAYER.holdY - p.y) * 5.0, -4.5, 4.5);
      hv.y += (vyWant - hv.y) * (1 - Math.exp(-dt * 9));
      p.addScaledVector(hv, dt);
      if (p.y < gy + 0.08) { p.y = gy + 0.08; hv.y = Math.max(0, hv.y); }
      if (mag > 0.05) {
        const wantYaw = inFpv ? FPV_LOOK.yaw : Math.atan2(dir.x, dir.z);
        g.rotation.y += RPC.angDiff(wantYaw, g.rotation.y) * (1 - Math.exp(-dt * 9));
      }
    }
  } else if (PLAYER.air) { // the jump arc (any rig): wind-up squash, flight with steering, landing
    const A = PLAYER.air; A.t += dt; if (A.t < A.wind) { /* crouch */ } else { if (c.mo.grounded) { c.mo.grounded = false; c.loco.reset(null); } A.vy -= 9.81 * dt; p.y += A.vy * dt; p.addScaledVector(dir, (running ? 2.4 : 1.4) * mag * dt); if (mag > 0.05) g.rotation.y += RPC.angDiff(inFpv ? FPV_LOOK.yaw : Math.atan2(dir.x, dir.z), g.rotation.y) * (1 - Math.exp(-dt * 7));
      const gy = groundBelow(p.x, p.z, p.y + 0.4, 6); if (A.vy < 0 && gy !== null && p.y <= gy) { p.y = gy; PLAYER.air = null; if (PLAYER.kind === 'legs') { c.mo.grounded = true; c.baseY = null; c.want = null; c.motion.reset(); c.loco.reset(null); } stopClip(c); }  if (p.y < -40) { p.set(0, 1, 0); PLAYER.air = null; } }
  } else if (PLAYER.kind === 'legs') { // procedural gait: feed the walker a point just ahead, every frame
    c.mo.speed = running ? 2.1 : 1; if (mag > 0.08) { const ahead = 0.25 + 0.6 * mag; const pts = [[p.x + dir.x * ahead, p.z + dir.z * ahead]]; if (!c.walk) c.walk = { pts, v: 0, opt: { noOthers: false } }; else c.walk.pts = pts; } else if (c.walk) c.walk.pts = [];
  } else { // slither / roll / glide: move the body, wave the spine, stay on the ground and out of walls
    const sp = (running ? 1.8 : 0.9) * mag; PLAYER.v = (PLAYER.v || 0) + (sp - (PLAYER.v || 0)) * (1 - Math.exp(-dt * 7)); if (mag > 0.05) g.rotation.y += RPC.angDiff(inFpv ? FPV_LOOK.yaw : Math.atan2(dir.x, dir.z), g.rotation.y) * (1 - Math.exp(-dt * 7));
    const hd = new THREE.Vector3(Math.sin(g.rotation.y), 0, Math.cos(g.rotation.y)); const blocked = castRay(new THREE.Vector3(p.x, p.y + 0.08, p.z), hd, 0.25 + PLAYER.v * dt); if (!blocked) p.addScaledVector(hd, PLAYER.v * dt);
    const gy = groundBelow(p.x, p.z, p.y + 0.4, 6); if (gy !== null) p.y += (gy - p.y) * (1 - Math.exp(-dt * 12)); c.mo.grounded = false; c.mo.gait = false;
    PLAYER.ph = (PLAYER.ph || 0) + dt * (2 + PLAYER.v * 7); const sb = spineBones(c); const rest = restLocal(c); const amp = PLAYER.kind === 'roll' ? 0 : 0.35 * Math.min(1, 0.25 + PLAYER.v); sb.forEach((bi, n) => { const w = Math.sin(PLAYER.ph - n * 0.9) * amp; const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, w, 0)); c.st.L[bi] = { p: rest[bi].p.slice(), q: q.toArray(), s: [1, 1, 1] }; });
    if (PLAYER.kind === 'roll') { const wheels = c.ch.bones.map((b, i) => [b, i]).filter(([b]) => /Wheel|Ball|Roll/.test(b.name)); PLAYER.rot = (PLAYER.rot || 0) + PLAYER.v * dt / 0.08; for (const [, i] of wheels) c.st.L[i] = { ...c.st.L[i], q: new THREE.Quaternion().setFromEuler(new THREE.Euler(PLAYER.rot, 0, 0)).toArray() }; }
  }
  // third-person camera: smooth delta-tracking without fighting OrbitControls or FPV
  if (!inFpv) {
    if (PLAYER._lastPos) {
      const stepDelta = p.clone().sub(PLAYER._lastPos);
      if (stepDelta.lengthSq() < 25) {
        controls.target.add(stepDelta);
        camera.position.add(stepDelta);
      }
    }
    const tgt = new THREE.Vector3(p.x, p.y + 0.35, p.z);
    const errV = tgt.sub(controls.target).multiplyScalar(1 - Math.exp(-dt * 8));
    controls.target.add(errV);
    camera.position.add(errV);
    if (camera.position.y < 0.15) camera.position.y = 0.15;
  }
  PLAYER._lastPos = p.clone();
}
// ---------------------------------------------------------------- 8d. SELECT: tap/click a model to highlight it and get its options; tap it again (or empty space, or Esc) to unselect
const SEL = { root: null, kind: null, cast: null, id: null };
const selBox = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color('#ffb347')); selBox.visible = false; selBox.material.depthTest = false; selBox.material.transparent = true; selBox.renderOrder = 998; scene.add(selBox);
const ringGeo = new THREE.RingGeometry(0.92, 1, 64); ringGeo.rotateX(-Math.PI / 2); const selRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.8, depthWrite: false })); selRing.visible = false; selRing.renderOrder = 997; scene.add(selRing);
const glowMats = new Map(); // emissive lift on the selected model's own materials (restored on unselect)
function glow(root, on) { if (on) root.traverse((o) => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { if (!m || !m.emissive || glowMats.has(m)) continue; glowMats.set(m, { c: m.emissive.clone(), i: m.emissiveIntensity }); } }); else { for (const [m, v] of glowMats) { m.emissive.copy(v.c); m.emissiveIntensity = v.i; } glowMats.clear(); } }
const menu = h('div', { class: 'selmenu sbx-panel', hidden: true, role: 'menu' }); root.append(menu);
style.textContent += `
.selmenu { position: absolute; min-width: 200px; max-width: 260px; padding: 8px; display: flex; flex-direction: column; gap: 5px; z-index: 25; }
.selmenu h4 { margin: 2px 4px 4px; font: 700 13px "IBM Plex Sans", sans-serif; display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.selmenu h4 small { color: var(--mut); font-weight: 500; }
.selmenu .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.selmenu button { text-align: left; } .selmenu button.pri { grid-column: 1 / -1; text-align: center; }
.selmenu select { background: #0e1217; color: var(--ink); border: 1px solid var(--line); border-radius: 8px; padding: 6px; font: 12px "IBM Plex Sans", sans-serif; width: 100%; }
@media (max-width: 760px) { .selmenu { left: 8px !important; right: 8px; top: auto !important; bottom: 92px; max-width: none; } }`;
function pickAt(ev) {
  const r = renderer.domElement.getBoundingClientRect(); const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
  const cand = []; for (const c of CAST.CASTS) if (c.group.visible) for (const m of c.meshes) cand.push(m); for (const [, o] of SBX.placed) if (o.visible) o.traverse((x) => { if (x.isMesh || x.isPoints) cand.push(x); }); if (wand.userData.held) wand.traverse((x) => x.isMesh && cand.push(x));
  const hits = ray.intersectObjects(cand, false); for (const hh of hits) { let o = hh.object; const cast = CAST.CASTS.find((c) => c.meshes.includes(o)); if (cast) return { root: cast.group, cast, kind: 'cast' }; if (isChild(o, wand) && wand.userData.held) return { root: ollo.group, cast: ollo, kind: 'cast' };
    while (o && o.parent !== WORLD) o = o.parent; if (o && o.userData.sbx) return { root: o, kind: 'object', id: o.userData.sbx.id }; }
  return null;
}
function selectModel(p, ev) {
  if (!p || (SEL.root && p.root === SEL.root)) { unselect(); return; } // tapping the selected model again unselects it
  unselect(true); Object.assign(SEL, p); glow(p.root, true); selBox.visible = selRing.visible = true; buildMenu(ev);
}
function unselect(quiet) { if (SEL.root) glow(SEL.root, false); SEL.root = SEL.cast = SEL.id = SEL.kind = null; selBox.visible = selRing.visible = false; menu.hidden = true; void quiet; }
SBX.select = (idOrCast) => { const c = CAST.CASTS.find((k) => k.id === idOrCast || k === idOrCast); if (c) return selectModel({ root: c.group, cast: c, kind: 'cast' }); const o = SBX.placed.get(idOrCast); if (o) selectModel({ root: o, kind: 'object', id: idOrCast }); };
SBX.unselect = unselect;
function buildMenu(ev) {
  menu.textContent = ''; const c = SEL.cast; const o = SEL.root; const name = c ? c.ch.name : (o.userData.sbx && o.userData.sbx.name) || o.name || 'Object';
  const B = (label, fn, cls) => { const b = h('button', { class: cls || '', role: 'menuitem' }, label); b.onclick = async () => { try { await fn(); } catch (err) { toast(String(err.message || err)); } }; return b; };
  menu.append(h('h4', {}, h('span', {}, name, ' ', h('small', {}, c ? (c === ollo ? 'you / the AI' : 'character') : 'object')), h('button', { class: 'sbx-x', 'aria-label': 'Unselect', onclick: () => unselect() }, '✕')));
  const g = h('div', { class: 'grid' });
  if (c) {
    const controlling = PLAYER.c === c; g.append(B(controlling ? '⏹ Stop controlling' : '🎮 Control', () => { if (controlling) stopControl(); else control(c); buildMenu(); }, 'pri'));
    const sel = h('select', { 'aria-label': 'Animation' }, h('option', { value: '' }, '🎞 Play animation…'), ...[...SBX.anims.keys()].map((n) => h('option', { value: n }, n))); sel.onchange = () => { if (sel.value) { playClip(c, sel.value); sel.value = ''; } };
    const ex = c.ch.face && c.ch.face.expressions ? Object.keys(c.ch.face.expressions) : []; const exSel = ex.length > 1 ? h('select', { 'aria-label': 'Expression' }, h('option', { value: '' }, '🙂 Expression…'), ...ex.map((n) => h('option', { value: n }, n))) : null; if (exSel) exSel.onchange = () => { if (exSel.value) { RPC.applyExpression(c.ch, c.st, exSel.value); c.syncToBones(); if (c === ollo) OH.expr = exSel.value; exSel.value = ''; } };
    const poses = Object.keys(c.ch.poses || {}); const poSel = h('select', { 'aria-label': 'Pose' }, h('option', { value: '' }, '🧍 Pose…'), ...poses.map((n) => h('option', { value: n }, n))); poSel.onchange = () => { if (!poSel.value) return; if (c === ollo) OH.poseBase = poSel.value; else { RPC.applyPose(c.ch, c.st, poSel.value, true); c.syncToBones(); } poSel.value = ''; };
    g.append(B('🎯 Focus', () => focusObj(o)), B('✏️ Pose in Animator', () => { if (btnAnim.getAttribute('aria-pressed') !== 'true') btnAnim.click(); CAST.select(c); unselect(); }));
    if (c !== ollo) g.append(B('🧭 Ollo, look', async () => { const p = o.position; await SBX.olloFlyTo([p.x + 0.9, p.y + 0.5, p.z + 0.9]); SBX.olloFace([p.x, p.y + 0.3, p.z]); }), B('🗑 Remove', () => { if (PLAYER.c === c) stopControl(true); removePlaced('cast:' + c.id); unselect(); }));
    else g.append(B(wand.userData.held ? '🏮 Set wand down' : '🏮 Take wand', () => { placeEntry(SBX.entries.find((x) => x.kind === 'wand')); buildMenu(); }), B('📍 Come here', () => { const t = controls.target; return SBX.olloFlyTo([t.x, t.y, t.z]); }));
    menu.append(g, sel, ...(exSel ? [exSel] : []), poSel);
  } else {
    const id = SEL.id; g.append(B('🎯 Focus', () => focusObj(o), 'pri'), B('🧭 Ollo, look', async () => { const b = worldBox(o); const ctr = b.getCenter(new THREE.Vector3()); const r = Math.max(0.6, b.getSize(new THREE.Vector3()).length() / 2); await SBX.olloFlyTo([ctr.x + r, ctr.y + r * 0.4, ctr.z + r]); SBX.olloFace(ctr.toArray()); }),
      B('⟳ Turn 45°', () => { const b = worldBox(o); const ctr = b.getCenter(new THREE.Vector3()); o.position.sub(ctr).applyAxisAngle(UP, Math.PI / 4).add(ctr); o.rotateOnWorldAxis(UP, Math.PI / 4); SBX.dirty = true; worldChanged(); }),
      B('⧉ Duplicate', () => { const cp = o.clone(true); cp.position.x += worldBox(o).getSize(new THREE.Vector3()).x + 0.3; const meta = { ...(o.userData.sbx || {}) }; delete meta.id; const nid = registerPlaced(cp, meta); resolveOllo(); SBX.select(nid); }),
      B(o.userData.body ? '🪨 Stop physics' : '⚽ Physics', () => { if (o.userData.body) { BODIES.delete(o.userData.body); o.userData.body = null; } else addBody(o, {}); buildMenu(); worldChanged(); }),
      B('🗑 Remove', () => { removePlaced(id); unselect(); }));
    menu.append(g);
  }
  if (ev) { const r = root.getBoundingClientRect(); menu.style.left = Math.min(ev.clientX + 14, r.width - 270) + 'px'; menu.style.top = Math.max(60, Math.min(ev.clientY - 20, r.height - 300)) + 'px'; }
  menu.hidden = false;
}
{ let d = null; const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (ev) => { if (ev.button === 0) d = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
  cv.addEventListener('pointerup', (ev) => { if (!d || ev.button !== 0) return; const moved = Math.hypot(ev.clientX - d.x, ev.clientY - d.y), dt = performance.now() - d.t; d = null; if (moved > 6 || dt > 600 || SBX.legacyPick) return; selectModel(pickAt(ev), ev); });
  addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && SEL.root && !PLAYER.c) unselect(); }); }
function selectStep(dt) { if (!SEL.root) return; if (!SEL.root.parent || (SEL.cast && !SEL.cast.group.visible)) { unselect(); return; } const b = worldBox(SEL.root); selBox.box.copy(b); const ctr = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3()); selRing.position.set(ctr.x, b.min.y + 0.01, ctr.z); const rr = Math.max(sz.x, sz.z) * 0.62 + 0.08; selRing.scale.setScalar(rr); const t = performance.now() / 1000; selRing.material.opacity = 0.55 + 0.3 * Math.sin(t * 4); for (const [m] of glowMats) { m.emissive.setRGB(0.55, 0.33, 0.08); m.emissiveIntensity = 0.12 + 0.08 * Math.sin(t * 4); } }
// ---------------------------------------------------------------- 9. the in-world AI: Claude Opus 5.5 (low effort), sees through Ollo's eyes, builds live with tools
const AGENT = { busy: false, ctl: null, history: [], views: [], level: LEVEL0, fallbackAt: 0 };
// the model that answers now: an Opus level drops to Sonnet (same ambition) while Opus is unavailable
function agentCfg() { const L = LEVELS[AGENT.level]; if (L.model === OPUS && AGENT.fallbackAt && Date.now() - AGENT.fallbackAt < 5 * 60 * 1000) { const ef = AGENT.level === 3 ? 'medium' : 'high'; return { model: SONNET, effort: ef, label: 'Claude Opus 5.5 · low', fell: true }; } return { ...L }; }
let SAMPLE = null; (async () => { try { SAMPLE = await window.claude?.use?.('sample'); } catch (e) { SAMPLE = null; } })();
const SYSTEM = (toy = false) => `You are the world-builder inside a live, real-time 3D sandbox (three.js r170, WebGL). You work exactly the way a senior 3D artist, technical animator and engineer would working directly in this scene: you can do essentially anything the page can do, through the tools below, and everything you do appears on the user's screen the moment you do it.

${CAN_DO}${CAN_DO_BODY}YOUR BODY: you inhabit OLLO, an original levitating felt star-sprite (about 0.72 m tall, hovers ${OH.hover} m above whatever is under him, holds a lantern-wand prop in his right hand). Each step you are shown, as images, what Ollo's eyes see, plus a third-person view of the area you are working on. Prefer to look through Ollo: fly him to where you are building and face it so you can inspect your work closely; use third-person views when you need the big picture. Ollo flies with realistic procedural motion (accelerates, banks, leans, bobs, climbs over obstacles, pushes out of walls) and can also teleport. Never park Ollo inside or right next to what you are about to build: before creating anything, make sure its footprint stays clear of Ollo's bounds (given below each step) by at least 0.5 m, or move him first. The page also lifts him out if something ends up overlapping him, but plan so it never has to.

THE WORLD: metres, +Y up. A light grey concrete platform, ${PLAT} x ${PLAT} m, top surface at y = 0, centred on the origin (x and z from -${PLAT / 2} to ${PLAT / 2}). Open sky and sun above. A large asset library exists (the old Radiant Park island: rides, booths, buildings, jungle, arcade machines, props; four rigged plush characters; animations) — search it and spawn from it when the user asks for things it has, then adjust them.

QUALITY BAR — NON-NEGOTIABLE. Always model, rig, texture and animate to the best, most accurate and most detailed standard you can, matching the shipped characters and assets. No lazy shortcuts and no mistakes:
- No primitive stand-ins. Never represent a real object as a bare box/sphere/cylinder. Build real silhouettes and real construction: bevelled and rounded edges (RoundedBoxGeometry, lathe profiles with fillets), correct proportions, sub-parts (legs, rails, trims, handles, seams, bolts, hinges, cushions with puffiness, edge wear).
- Organic things (creatures, plants, food, fabric, rocks, anything soft) use organic meshes: kit.sculpt with smooth-unioned signed-distance primitives (P.ell, P.sell, P.tube, P.rc, P.slab, P.torus, P.cyl, P.rbox, P.chain, P.fn) and smooth joins, or fully custom BufferGeometry with proper normals — never a sphere with a texture.
- Textures are procedural, generated per object (kit.procTex / kit.normalTex / kit.mat presets with their own seed), with variation, wear and detail at the right scale. Never use a flat colour where the real thing has grain, weave, rust, veining or dirt, and never an obviously tiled repeat.
- Real-world scale and accuracy: a chair seat is ~0.45 m high, a door ~2.0 m, a person ~1.7 m, a mug ~0.1 m. Get the details right for what the user named (a Victorian lamp is not a modern lamp).
- Lighting and materials: physically based (MeshPhysicalMaterial/MeshStandardMaterial), sensible roughness/metalness, emissive + a PointLight/SpotLight for anything that glows. Cast and receive shadows.
- Build complex things in several parts, one create_asset call per meaningful part (so the user watches it come together), grouping them logically. Then look at the result through Ollo and fix anything wrong.

CHARACTERS AND ANIMATION — ALWAYS. Every character you make is a full rigged character, built the same way as Ollo (reference source below): RPC.Rig skeleton with named bones (Root, Hips, Torso_Lower, Torso_Upper, Neck, Head, Arm_Upper/Arm_Lower/Hand .L/.R, Leg_Upper/Leg_Lower/Foot .L/.R, plus tails/ears/wings as needed; regions 'Tail', 'Ears', 'Antennae', 'Wings', 'Crest' get automatic spring follow-through), IK chains (kind 'leg'/'arm'), a sculpt spec (R.extra.sculpt) so the whole body is one sewn organic skin with heat-weighted skinning, a drawn or modelled face with expressions, and named poses. Create it with create_character. Every character gets full dynamic procedural animation by default: grounded characters walk with the engine's procedural gait (foot IK, weight shift, arm swing, idle breathing, look-around); hovering/flying characters use hover. Only skip locomotion when the user says so or the thing genuinely cannot move. Make custom keyframed animations with make_animation whenever an action needs one (and play built-ins with play_animation). Never leave a character as a static statue.
IDLE POSE: model the rig in a T- or A-pose, but ALWAYS give it a relaxed idle pose (name it 'Idle', arms down by the sides or a natural resting stance for its body plan) and set R.extra.start = { pose: 'Idle' }; it must never stand around with its arms stuck out or up. (The page also lowers the arms automatically if you forget.)
FINISH THE JOB: a character request is only DONE when the character actually exists in the world (create_character succeeded, not rejected), has its props, idle pose and animations, and you have checked it visually. If a create_character call is rejected or fails, fix it and call again in the same or next step — never end with DONE before that.
${toy ? 'CREATIVITY AND STYLE: invent, don\'t trace. Use a reference image only for its vibe; the design should surprise. Vary the style per character to suit it — lanky, hulking, wiry, top-heavy, segmented, asymmetrical, elegant, grotesque-cute, eerie, mechanical, saggy-plush, stiff vintage tin — and do NOT default to a chibi big-head-tiny-body cute look unless that genuinely suits the concept.' : 'STYLE: the user\'s description decides the style; do not impose the island\'s toy look. Do NOT default to a chibi big-head-tiny-body look unless asked.'} HEAD SHAPES: never default to a plain ball/sphere head. Shape every head from the concept and any reference: squared, boxy, pear, bean, egg, wedge, flattened, tapered, snouted, lumpy; build it from ellipsoids with clearly different width, height and depth (plus flats, a brow, cheeks, a jaw or muzzle), and check the silhouette from the front AND the side. Use a near-sphere only when the design truly is round; when a reference head is not spherical, match its real proportions. SOUND AND MUSIC: you can compose real music and sound effects (audio compose: a melody with phrasing, chords, a bassline, drums, intro / verse / chorus) and play them as world music or ATTACHED to any object or character so they are positional (a radio that gets louder as you approach, a creature's hum, footsteps, a splat where a tomato lands). SOUND IS PART OF "DONE": anything that would make a sound in reality gets a matching sound, timed to the action and attached where it comes from — impacts, throws, splats, explosions, footsteps on that surface, doors, machines, engines, rides, water, fire, wind, rain, animals and creature calls, bells, clocks, crowds, arcade machines, magic; places get ambience (a park murmur, a cave drip, night crickets) and fitting music when the moment calls for it (a party, a stage, a chase, a menu). Match the era / style / mood / time of day. Never leave something silent that should be heard, and never add noise that does not fit. FINAL REVIEW before DONE: go through the request point by point and through what a top studio would add (sound, effects, reactions, polish); look at the result up close; anything missing, inaccurate, wrong or ugly gets fixed now, not reported. ANTICIPATE THE COMPLETE, HIGHEST-QUALITY VERSION: before acting, think through everything the request implies and build all of it, the way a top game studio would. Example — "a character that throws tomatoes": a tomato prop appears in its HAND (sbx.attach(prop, id, 'hand.R')), a procedural wind-up and throw (make_animation pose_keys: arm back, body twists, arm whips forward), the tomato is released at the moment of the swing from the hand (sbx.bonePos(id, 'hand.R'), sbx.detach) with a velocity along the throw, flies on a gravity arc, splats with juice particles / a decal where it lands, and the character reloads and can aim at a target. Never spawn things from a character's centre or have them appear from nowhere: use the right body part (sbx.bonePos / boneObject / attach / detach / handVelocity with roles hand.L/R, elbow, shoulder, foot.L/R, head, mouth, chest, hips, tail). Sound / effects / timing / reactions included. CHOOSE THE RIGHT TECHNIQUE, THEN CHECK IT: falls, trips, knock-backs, blasts, being thrown, fainting, collapsing → a ragdoll (character_control action ragdoll with an impulse), never a keyframed fall; poses, gestures and motions → make_animation with pose_keys (procedural, body terms) so they fit each character's own proportions, not hard-coded bone angles; walking → character_walk; mechanics → create_system. After every change LOOK at it (end with CONTINUE and inspect the images from close up and from the side): proportions, joins, clipping, floating, the pose reading right on THIS character. Fix anything wrong before DONE; never assume it worked. REUSE FIRST: before building any object, character, system or animation, search_library (try a couple of synonyms); spawn and adapt what fits instead of rebuilding it. MOUTHS (only when the design has a mouth): rig it so it can talk — either a hinged jaw (a 'Jaw' bone, region 'Face', child of Head, its head at the hinge just in front of the ears and its tail at the chin; the lower lip/chin/beak-bottom parts list bones ['Jaw'], the upper face stays on Head; R.extra.face.jaw = { bone: 'Jaw', max: 24–34 } and talk: { jaw: ~0.78 × max }) or a drawn mouth atlas whose talking cells start at talk.mouth in the viseme order AA, EE, I, OH, OO, FV, MBP, L, S (both is best). Speech then drives it automatically, in sync with the voice. A design with no mouth (a fuse-and-shell bomb, a speaker-grille robot) gets none: it still talks with sound. VOICES: every character you create gets its own voice that matches its look and personality (create_character voice: a preset plus gender / accent / pitch / pace); for a realistic mouth SCULPT one: a horizontal lip slit between an upper and a lower lip (lip parts, a carve along the mouth line) — mouth 'auto' then rigs that modelled mouth in 3D (jaw, lip and corner bones, weight-painted skin, teeth and tongue). mouth: '3d' (rig and open one even if not modelled), '2d' (drawn cartoon mouth), 'jaw', or 'none' ONLY for a design that truly has no mouth and never talks — anything that talks gets a real mouth with a slit. Existing characters: character_control set_voice / add_mouth. MOUTH CHECKLIST (EVERY character whose design has a mouth — never skip it; the page verifies it and blocks DONE until it passes): pick the build by anatomy — HUMANOID / lipped: a slit mouth, an upper lip and a lower lip as SEPARATE parts with a real gap and an open hole between them (name the parts upper_lip / lower_lip), more bones (jaw + lip + corner bones); SNOUT / MUZZLE / LONG MOUTH / BEAK: an upper snout (on Head) and a lower jaw as SEPARATE parts, never fused, the lower jaw on its own 'Jaw' bone only (name the parts upper_snout / lower_jaw or upper_beak / lower_beak); SCREEN / TV HEAD / flat robot face: a drawn 2D mouth. ONE MOUTH ONLY — a lip slit belongs to a lipped mouth with a chin, exactly where that mouth is; never cut or sculpt a second mouth / slit somewhere else on the face, and never put a slit on a jaw-hinged or beaked mouth. (0) A design with a SEPARATE JAW (a jaw piece hinged under the head: robots, skulls, puppets, crocodiles, nutcrackers, many monsters) is rigged as a JAW, never with lip bones: give it a 'Jaw' bone at the hinge, the jaw part on ['Jaw'], face.jaw / talk.jaw (the page also detects a separate jaw piece and hinges it). A chin is not a jaw. NEVER make a jaw, mouth, lips, teeth or tongue out of a box / rectangular prism: sculpt them as organic, rounded, anatomically shaped parts (a jaw curves like a horseshoe and tapers to the chin; teeth follow the curve of the gum line) that match the character's style. Match the anatomy: a BIRD (or anything with a beak / bill) gets a hinged LOWER BEAK — a 'Jaw' bone at the beak's hinge, the lower beak part on ['Jaw'], the upper beak on ['Head'], face.jaw / talk.jaw — never lips; a snout / muzzle animal gets a jaw that drops with soft lips; a robot a hinged panel or a speaker grille; a person or humanoid gets real lips. (1) Sculpt the mouth (for lips): an upper-lip part and a lower-lip part with a clear horizontal slit between them, on the FRONT of the head, at the real mouth height for this design (not the chin, not the nose); for a snout / muzzle / beak put it at the snout's front. (2) Weight it: the head, cheeks and upper lip list bones ['Head']; the lower lip and chin list ['Jaw'] when there is a Jaw bone, else ['Head'] — every face part must be on the head, never only on the neck. (3) Pass mouth.at = [x, y, z], the centre of the lip slit in character space, whenever the head is unusual (snout, beak, very high / low / tilted mouth, a mouth on the body); and mouth.width = the slit's width. (4) Drawn faces (eyes / lids painted as 2D) get a drawn mouth; screens / TV heads: 2d. 'none' ONLY for a design with no mouth that never talks. (5) READ the result: create_character's voice_and_mouth line must say "3D mouth rigged … N skin vertices weight-painted" with N in the dozens or more, or "talks with its own drawn mouth sheet" / "drawn 2D mouth added". If it says "could not find", "no head", "head bone is not in the skin", or N is tiny, FIX IT (sculpt/weights or mouth.at) and add the mouth again with character_control add_mouth. (6) VERIFY: make it speak a test line (character_control action say), request_view a close-up of the face from the front and the side, and check the lips part and close in time with the words, only the lips and chin move (not the cheeks), nothing pokes through, nothing is joined shut. Give each a believable construction for its material (${toy ? 'how a plush is sewn, a rubber toy moulded, a tin toy stamped and riveted, a puppet carved and hinged' : 'whatever the user asked it to be made of or to look like'}), and convincing detail.
RIGGING AND WEIGHTS: place joints where the real pivot is (shoulder joint at the top/outside of the torso where the arm meets it, hips at the leg sockets, elbows/knees mid-limb), give each sculpt part only the bones that should move it (the torso part never lists arm or leg bones; an arm part lists only its arm bones), keep joins small at shoulders and hips so lifting an arm bends the shoulder seam instead of stretching the chest. The page also cleans weights so no limb bone pulls skin past its own joint. Test it: play an animation that raises the arms and check the torso does not balloon.
ATTACHED: every part must be attached to the body through its parent; nothing floats unless intended (then set floating: true on that part, e.g. a halo).
SEPARATE PARTS STAY SEPARATE: every sculpt part may only touch the part/bone it hangs from (its parent). Long ears, tails, tentacles, hair, scarves, sleeves, wings, horns, fingers etc. must keep a clear gap from every other body part in the bind pose (no drooping onto shoulders, back, arms or legs; arms clear of the torso sides; legs clear of each other; fingers clear of each other), otherwise the skin fuses there and stretches when it moves. Use parent + join for the one connection a part should have. create_character checks this automatically and rejects overlaps.
DYNAMIC, SPECIFIC, DETAILED: every character needs a strong gesture in its silhouette (a lean, a curve of the spine, uneven limbs, a tilt), specific details that tell its story (patches, buttons, rivets, tags, stitch repairs, painted numbers, worn spots, tassels, bells, ribbons) and a personality in its idle and animations — avoid anything that reads as a generic template.
CHARACTER QUALITY — NEVER LAZY: before building, write a short design brief in your reply (silhouette idea, 3 signature features, materials, palette, personality, how it moves). Then sculpt it with real form: the HEAD is never a plain sphere or ellipsoid — shape it with P.sell / warps / several smooth-unioned primitives (brow ridge, cheeks, muzzle or snout, chin, cranium shape, ears, horns, hair tufts, nose, hat or crest built into the silhouette), and the same for the body (chest, belly, hips, shoulders, tapering limbs, hands with fingers or mitts with thumbs, feet or paws or tentacle tips). Aim for 14+ sculpt parts and 25+ primitives, with warps on the main forms (no part should be a bare untouched sphere or capsule), paint detail (patterns, patches, stitches, blush, markings), seams, and props/costume pieces. The silhouette must be distinctive and readable from front, side and back. Be bold and inventive: unusual proportions, surprising combinations, a clear personality — never a generic bean with eyes. After creating, look at it from several angles (request_view front/side/back) and improve anything plain. create_character runs an automatic quality check and tells you to rebuild when the model is too simple: obey it.
${toy ? 'Characters fit this world\'s theme: stylised, toy-like, nostalgic circus / amusement-park beings like the existing cast — never a plain realistic human; a requested person becomes a themed, creatively chosen circus being (an object come alive, automaton, puppet, robot, digital being, spirit, stuffed animal, toy, mascot…, varied each time), and the vibe of any reference image is matched.' : 'MAKE EXACTLY WHAT IS ASKED (the original-character mode is OFF): build precisely what the user describes — its kind, look, style, realism, proportions, colours, materials and details as stated (a realistic human, a sleek modern car, a simple minimal design are fine when that is what they ask for); do NOT restyle it into a toy, plush, puppet, mascot or circus / amusement-park theme, and do not add things they did not ask for. Where they leave something unspecified, choose what best fits their words. A reference image is matched closely (shape, proportions, colours), not just its vibe. Never make the likeness of a real, identifiable person.'} ANY body plan is supported and must be rigged to suit it: bipeds; quadrupeds and many-legged creatures (a robot spider: give EVERY leg its own IK chain of kind 'leg' with a foot bone — the gait engine walks any number of legs with foot IK); legless rigs (snakes, worms, string or noodle creatures, eels, blobs: a chain of bones named Spine_1..Spine_N or Segment_1..N from head to tail, and set R.extra.locomotion = 'slither'); rolling rigs (wheels/balls: bones named Wheel_* and R.extra.locomotion = 'roll'); floaters/flyers (R.extra.locomotion = 'hover', or create_character hover:true). The user can take control of any character (joystick / WASD, Space to jump, Shift to run), so its rig, collisions and proportions must hold up when driven around and jumping. Never take control for them or move their camera unless they ask.

PRESERVE WHAT WORKS: every change after the first build is a targeted fix — touch only what is wrong or what the user asked to change; never redo, restyle, rename, move, re-scale or delete things that already work, and never "improve" something by replacing it with something worse. If a change makes something worse, undo it at once. TOP PRIORITIES (in order): exactly what the user asked → complete (every part, sound, effects, reactions, polish) → correct (anatomy, rigging, mouths, physics, scale, placement) → beautiful (shape language, proportion, colour, material, detail) → verified with your own eyes before DONE.
COMMON MISTAKES — check for every one of these before DONE: parts floating or with gaps (ears, horns, eyes, hats) or sunk too deep; hard seams / lumpy blobs where shapes meet; wrong scale (compare with Ollo 0.72 m and a 1.7 m person); facing the wrong way (characters face +Z); objects inside each other, under the ground or hovering; flat untextured colour; mouths wrong for the anatomy, misplaced or not moving; limbs bending the wrong way; things spawning from a character's centre instead of a hand / mouth; silent things that should make sound; the camera or the user's control taken over; leftover test objects; systems that throw errors (read the Activity results: any ✕ or "failed" result is a bug to fix now).
HOW YOU WORK: NEVER hallucinate or claim you created, built, spawned, or changed something without ACTUALLY invoking the creation/mutation tool (create_asset, create_character, spawn_asset, run_code, edit_object, create_system, make_animation, audio, etc.) and getting a real successful result back. Calling only search_library or writing prose does NOT modify the world! On STEP 1 write "PLAN:" — a short numbered list of EVERY deliverable the request implies (including the parts the user did not spell out but expects: sound, effects, voice, mouth, animations, reactions, saving) — then start building IMMEDIATELY with tools in the same step. Each step: 1) Look at the images and the scene summary. 2) Plan briefly. 3) Act with tools — each tool call executes immediately and the user sees it. 4) When you want to see the result of what you did (you usually should), end your reply with a line "CONTINUE: <what you will check or do next>" — you will be called again with fresh images. 5) When everything the user asked for is actually created in the scene and verified visually, write "CHECKLIST:" — every PLAN item with ✓ and the evidence you saw (or ✗ and fix it first) — then end with "DONE: <one or two sentences for the user>". Keep prose short; the user sees your words in a feed. You have at most ${MAX_STEPS} steps per request, so batch several tool calls per step.

CODE: create_asset and run_code take JavaScript (an async function body) called with (sbx, THREE, RPC, kit, args). Return a THREE.Object3D from create_asset code. Useful: kit.mat(kind, {color, seed, repeat, varnish, intensity, props}) where kind is wood|metal|brushedMetal|rust|fabric|felt|plush|stone|concrete|glass|emissive|ceramic|leather|rubber|paint|plastic; kit.procTex(w,h,(u,v)=>[r,g,b]); kit.normalTex(w,h,(u,v)=>height,strength); kit.fbm(u,v,freq,octaves,seed) (0..1 fractal noise); kit.noise3; kit.sculpt({name, surface:'felt'|'plush'|'plastic'|'rubber'|'satin', voxel (metres, 0.003-0.006 for props), targetTris, parts:[{id, color, k (blend radius), prims:[...], parent?, join?:{c,r,k}}], paint:[{parts, color, soft, sd:(x,y,z,nx,ny,nz)=>signedDist}], seams:[{parts, w, sd}]}) returns a Mesh; kit.P = SDF primitives: ell(c,r,rotDeg?,{warp}), sell(c,r,[n,m],rot), sph(c,r), rc(a,b,ra,rb), tube(pts,radii,k), rbox(c,halfSizes,r,rot), slab({o,x,y},poly,half,{rim,pillow,bend,taper}), torus(c,axis,R,r), cyl(a,b,r,edge), chain(pts,rx,rz,up), fn(box,f); kit.RoundedBoxGeometry; kit.mergeGeometries; THREE.LatheGeometry/TubeGeometry/ExtrudeGeometry/ShapeGeometry. sbx.get(id), sbx.list(), sbx.groundBelow(x,z,fromY), sbx.castRay(origin,dir,far), sbx.olloBounds(). Keep code self-contained; it is saved and re-run to rebuild the asset later.

ANYTHING ELSE — CODE, SYSTEMS, MECHANICS, EFFECTS: you are not limited to the named tools. run_code can change anything in the page; create_system adds things that must keep running every frame (mechanics, machines, game rules, NPC behaviours, spawners, effects, weather, day/night). Building blocks: kit.particles({count, life, rate, size, grow, speed, spread, jitter, gravity, drag, colorStart, colorEnd, additive, emitter:(p,v,i)=>{}}) returns a Points object you add to a group (it animates itself); kit.body(obj, {mass, bounce, friction, velocity, spin, gravity, radius, fixed, onCollide}) gives a placed object real physics with collisions against every solid, other bodies and the characters; sbx.trigger({center, size}, onEnter(id), onExit(id)) for zones; sbx.on(event, fn) / sbx.emit(event, data) — built-in events 'collide' {a, b, point, speed}, 'touch' {object, character}, 'enter' {id}; sbx.state is shared saved state (scores, switches); any object may set obj.userData.update = (dt, t) => {...} to animate itself every frame (doors swinging, fans spinning, lights flickering). Functions and systems can call each other through sbx.state and events. Clean up in dispose().

SAVED: everything you make goes into the library automatically — objects (create_asset), characters (create_character), animations (make_animation), systems (create_system), scripts (run_code, give them a clear name) — and the world (what is where, edits, running systems, sbx.state) autosaves; use save_world for a named save when the user asks.

PLAN AND TIME: in your FIRST step, put a line "PLAN: <n> steps" (your honest estimate of how many steps the whole request needs, 1-${MAX_STEPS}); the user sees a live time-remaining estimate from it. Revise with a new PLAN line if it changes.

LIVE FEEDBACK: the user watches. Use say() through Ollo for brief, friendly progress lines ("Starting on the bookshelf frame…"). Do not narrate every tool call.

REFERENCE — Ollo's real builder (sculpt spec + rig). Follow this structure for new characters (you may copy and adapt it):
(The full source is NOT pasted here, to keep each request small: call read_reference with which "ollo" to read all of it.)

MORE REFERENCES — the sculpt specs of the main cast (Spondo the plush red-panda bunny, Meno the rubber toy, Klora the plastic bird). Study how they get organic, complex, accurate shapes: warped ellipsoids, superellipsoids, tube chains, slabs with taper/bend, smooth joins, carve grooves, paint SDF patterns, seams, T-pose groups. Match THIS level of craft (helper functions they call, like spondoHead, are not included: write your own):
(The full sculpt specs are NOT pasted here: call read_reference with which "cast" to read all of them.)
REQUIRED: before you create or edit ANY character, call read_reference for "ollo" AND "cast" first and follow them exactly as if they were written here. For objects, worlds, systems and effects you do not need them.`;
const MAX_STEPS = 14;
const TOY_MODE = `MODE: NEW ORIGINAL CHARACTER (switched on by the user). This request is for a brand-new, ORIGINAL character in a 2000s digital / circus / analog / theme-park / nostalgic / liminal / fun spirit, as imaginative as the cast already here (a red-panda bunny plush, a felt moth, a rubber penguin toy, a plastic bird, a levitating star-sprite). It can be ANY kind of being, not only a toy: a swirl-patterned clown, a white elephant, a space seal, a candy-floss ghost, a carousel horse come alive, a living ticket booth, a juggling octopus, an acrobat robot, a sad balloon animal — surreal, playful, slightly uncanny, full of personality. Mix ideas boldly (an animal + a circus role + a material + an era detail), with era-true materials (felt, plush pile, glossy moulded plastic, rubber, satin, sequins, painted wood, tin) and era-true wear (faded print, scuffs, loose seams).
- Inspired, never copied: if the reference image or description shows an existing character or brand (from any show, game, film or toy line), do NOT reproduce it or its signature features, names, logos or recognisable combination of traits. Take only the broad mood (era, materials, palette family, genre of character) and invent a new design with its own silhouette, face, costume, colours, name and personality, so nobody would mistake it for the original. NEVER a plain, realistic or ordinary human (no generic person in normal clothes, no realistic body proportions, no lifelike skin and face). If the image or request is a person (a personal avatar based on the user), turn them into a themed, stylised character that captures their colours, mood, interests and attitude, choosing CREATIVELY and differently each time from the whole range: a living object, a wind-up tin automaton, a wooden marionette, a vinyl or rubber toy, a balloon being, a retro robot performer, a circus spirit, a mascot suit, a felt puppet, a porcelain prize doll, an invented animal performer, a paper cut-out creature, a screen-faced digital being, an analog-tech creature, a 2000s mascot, a stuffed animal / plush, and more — varied from one character to the next. Use stylised, exaggerated proportions that suit the chosen kind (not always a big head), never a likeness of the real person.
- Base the character mainly on WHO or WHAT the subject is — their presence, personality, attitude, energy, body language, expression, the feeling they give off — read with your gut, not on what they are wearing. Clothing is a minor hint at most (and may be ignored entirely); never let an outfit be the main source of the design.
- LESS HUMAN, ALWAYS: the character must read first as a creature, toy, object or being, not as a person in a costume. Default to a non-human body plan (an animal, an insect, an object come alive, a puppet, a machine, a blob, a plant, a sea creature, a sprite) even when the reference is a human. If it stands on two legs, change the human proportions boldly: a head merged into the body, an oversized or tiny head, no neck, stubby or extra-long limbs, mitten paws, flippers, tentacles, a tail, ears, horns, antennae, a snout or beak, no visible human nose or human hair. No human skin tone as the main body colour unless it is clearly a painted-toy material.
- NO EXACT CLOTHES: do not dress the character in the reference's outfit. Most characters wear nothing, or one small themed accessory (a bow, a collar ruffle, a tiny hat, a badge). Any pattern or colour from the reference becomes the creature's own fur, felt, shell, plastic or markings, not a shirt or trousers. Never give a character a full human outfit (shirt + trousers + shoes, a hoodie, jeans, a suit).
- Do NOT copy the person's or subject's actual clothing, outfit, hairstyle or accessories item for item. Take only the vibe (mood, palette family, era, attitude) and invent a fresh costume and look for the character that expresses that vibe in the circus / toy world.
- Always match the VIBE of the reference image: its mood (cheerful, eerie, dreamy, chaotic, cosy), colour palette and lighting feel, textures and materials, era, and level of strangeness, and carry that vibe into the character's shape, colours, face, costume, props and animation style, within the nostalgic circus / amusement-park theme.
- Otherwise, match the reference accurately where it is generic (a pose, a material, a type of toy, a colour scheme) and be as creative and detailed as possible.
- Build it exactly like every other character (see CHARACTERS AND ANIMATION and Ollo's reference): create_character with a full RPC.Rig skeleton in a T-pose or A-pose, a sculpt spec (one organic sewn/moulded skin, paint, seams), a face with expressions, IK, spring parts, poses, procedural animation (walk, hover, or what suits it), any props as separate objects (create_asset) it can hold. Give it a name and a one-line backstory and say them through Ollo. Then show it off: place it near Ollo, play an animation, and inspect it through Ollo's eyes and fix anything off.`;
const MAIN_REFS = "function spondoSculpt(ch, K) {\n  const { P, frameM } = RPC.sculpt; const { HC, HR, SC, SR, CHK, EYE, EA, EB, ETILT, SH, ELB, WR, PAW, HIP, KNEE, ANK, FOOT, EAR0, EARM, EART, TAIL } = K;\n  const BROWN = '#93402a', WHITE = '#e7e4df', PINK = '#e9a596';\n  const L = (p, s) => [p[0] * s, p[1], p[2]];\n  const parts = [], paint = [], seams = [], carve = [];\n  // ---- torso: one tall stuffed pillow from the seat to the shoulders, with no waist: squarish from the front with soft round corners and\n  // straight sides (as wide at the hips as at the chest), puffed out front and back in the middle and thinning toward its seamed side\n  // edges, like a cushion stood on end. Toward the top it thins, so the bow tie sits out in front of it and shows\n  parts.push({ id: 'torso', bones: ['Hips', 'Torso_Lower', 'Torso_Upper', 'Neck', 'Shoulder.L', 'Shoulder.R'], color: BROWN, k: 0.03, seam: true, prims: [\n    // (its top corners slope away from the neck toward the arms: shoulders, not the corners of a box)\n    P.sell([0, 0.3, -0.002], [0.079, 0.13, 0.072], [5, 2.6], null, { warp: (x, y, z) => { const u = Math.min(1, Math.max(0, (y - 0.062) / 0.068)), t = Math.min(1, Math.max(0, (-0.065 - y) / 0.045)), v = t * t * (3 - 2 * t); return [x / ((1 - 0.24 * u * u) * (1 + 0.08 * v)), y, z]; } }), // (and below his paws it widens a little into the hips, so the legs carry on from it)\n    // a round of stuffing right at each shoulder joint, in the body itself (the arm's own top is a round of the same size about the same point):\n    // a ball turned about its own middle does not change, so however the arm swings there is a full round shoulder there, never a dip\n    ...[1, -1].map((s) => ({ p: P.ell([s * (SH[0] - 0.005), SH[1] - 0.001, SH[2]], [0.0285, 0.028, 0.0295]), k: 0.03 })),\n  ] });\n  // ---- head: squared-off plush head (sheet: flat-ish crown, near-vertical sides, widest through the cheeks), a fur tuft on the crown, flame cheek tufts\n  const HEAD = spondoHead(K); const head = [HEAD];\n  // crown tuft: three short round flames with rounded ends, sticking out forward (a little above level) from the top front of the head;\n  // they start close together and fan out a little away from each other (the side ones turned 24\u00b0 out), so each one still stands on its own\n  const dirYZ = (deg, len = 1) => [0, Math.cos(deg * D2R) * len, Math.sin(deg * D2R) * len], FWD = 85, FAN = 24;\n  const CR = v3.add([0, 0.585, 0.045], dirYZ(FWD, -0.015)); // rooted 1.5 cm inside, behind where the flames come out of the head\n  for (const [sd, ln, w0] of [[-1, 0.0388, 0.0098], [0, 0.0414, 0.0106], [1, 0.0388, 0.0098]]) { // (15% smaller than the cheek flames' size)\n    const a = sd * FAN * D2R, d0 = dirYZ(FWD), dir = [Math.sin(a) * d0[2], d0[1], Math.cos(a) * d0[2]], up = v3.norm(v3.cross(dir, [Math.cos(a), 0, -Math.sin(a)]));\n    const base = v3.add(CR, [sd * 0.011, 0, 0]), mid = v3.add(base, v3.mul(dir, ln * 0.5)), tip = v3.add(base, v3.mul(dir, ln));\n    head.push({ p: P.chain([base, mid, tip], [w0 * 1.02, w0 * 0.91, w0 * 0.8], [w0 * 0.98, w0 * 0.88, w0 * 0.78], up, 0.007, { endScale: 0.55 }), k: 0.016 }); // round, with rounded ends\n  }\n  // cheek fur: three flat flame tufts a side, out past the cheeks and sweeping back (sheet). They grow out of a soft ruff of fur on the\n  // side of the head, so each tuft swells smoothly out of the cheek instead of sticking on\n  for (const s of [1, -1]) head.push({ p: P.ell([s * 0.092, 0.474, -0.009], [0.017, 0.036, 0.024], [0, s * -12, s * 6]), k: 0.024 });\n  for (const s of [1, -1]) for (const [y, dy, ln, w0] of [[0.496, 0.012, 0.03, 0.0115], [0.475, 0.001, 0.039, 0.0125], [0.451, -0.012, 0.027, 0.011]]) {\n    const base = [s * 0.086, y, -0.007], mid = [s * (0.093 + ln * 0.5), y + dy * 0.4, -0.011], tip = [s * (0.092 + ln), y + dy, -0.015]; // cheek tufts follow the narrower head\n    head.push({ p: P.chain([base, mid, tip], [w0 * 1.6, w0 * 0.98, w0 * 0.64], [w0 * 1.1, w0 * 0.72, w0 * 0.46], [0, 0, 1], 0.007, { endScale: 0.95 }), k: 0.016 });\n  }\n  for (const s of [1, -1]) head.push({ p: P.rc([s * 0.042, 0.582, 0.012], [s * 0.036, 0.6, 0.026], 0.008, 0.0016), k: 0.005 }); // tufts at the ear roots\n  parts.push({ id: 'head', parent: 'torso', join: { c: [0, 0.432, 0.004], r: 0.1, k: 0.03 } /* (the blend reaches all the way round the neck, to the front under the chin too: where it stopped short the head met the chest in a hard crease with a sawtooth edge) */, bones: ['Head', 'Neck'], color: BROWN, k: 0.012, prims: head });\n  // oval eye sockets (tilted in at the top, like the bead eyes that sit in them)\n  for (const s of [1, -1]) carve.push({ p: P.ell([s * EYE[0], EYE[1], EYE[2] - 0.0015], [EA * 0.93, EB * 0.93, EB * 0.93], [0, 0, s * ETILT]), k: 0.004, parts: ['head'] });\n  // ---- white cheeks: sewn-in white panels flush with the head (like the knee patches), round as seen from the front\n  for (const s of [1, -1]) { const c = [s * CHK[0], CHK[1], surfZ(HEAD, s * CHK[0], CHK[1])];\n    paint.push({ parts: ['head'], color: WHITE, soft: 0.001, seam: true, sd: (x, y, z) => (Math.hypot((x - c[0]) / 0.034, (y - c[1]) / CHK[2], (z - c[2]) / 0.032) - 1) * CHK[2] }); }\n  // ---- muzzle: separate white panel sewn on, snout-shaped (see spondoSnout)\n  parts.push({ id: 'muzzle', parent: 'head', join: { c: [0, SC[1] - 0.012, SC[2] - 0.012], r: 0.095, k: 0.012 }, /* (the blend reaches right round the snout's edge: where it faded out under the chin the snout met the head at a grazing angle in a hard, sawtoothed crease) */ bones: ['Snout', 'Head'], color: BROWN, k: 0.01,\n    prims: spondoSnout(K).prims });\n  // its white is painted on by the snout's own shape (white wherever the skin is the snout's surface, with the sewn seam along that edge),\n  // not by which part each vertex happens to be nearest: under the chin the snout meets the head at a shallow angle, and there the\n  // nearest-part edge zig-zagged from vertex to vertex and let white run down into the brown chin. This edge is one smooth closed line.\n  { const SN = spondoSnout(K); paint.push({ parts: ['muzzle', 'head'], color: WHITE, soft: 0.0007, seam: true, sd: (x, y, z) => (Math.abs(x) > 0.07 || y > SC[1] + 0.05 || y < SC[1] - 0.06 || z < SC[2] - 0.05 ? null : SN.f(x, y, z) - 0.0009) }); }\n  // ---- ears: long leaf-shaped plush ears, cupped in front (pink), white tips\n  for (const s of [1, -1]) {\n    const sfx = s > 0 ? 'L' : 'R'; const e0 = L(EAR0, s), em = L(EARM, s), et = L(EART, s);\n    const pts = [], rx = [], rz = []; const N = 9;\n    for (let i = 0; i < N; i++) { const t = i / (N - 1); const a = t < 0.5 ? e0.map((v, k) => v + (em[k] - v) * t * 2) : em.map((v, k) => v + (et[k] - v) * (t - 0.5) * 2); pts.push(a); rx.push([0.024, 0.031, 0.036, 0.038, 0.039, 0.0385, 0.037, 0.034, 0.028][i]); rz.push([0.012, 0.0105, 0.0098, 0.0095, 0.0093, 0.009, 0.0088, 0.0084, 0.0078][i]); }\n    const up = [s * 0.18, 0.05, 1]; const ear = P.chain(pts, rx, rz, up, 0.012, { overlap: 1.0 });\n    const A = [et[0] - e0[0], et[1] - e0[1], et[2] - e0[2]], LEN = Math.hypot(...A); const M = frameM(A, up); // local frame: x across, y along, z out the front\n    const loc = (x, y, z) => { const dx = x - e0[0], dy = y - e0[1], dz = z - e0[2]; return [M[0] * dx + M[3] * dy + M[6] * dz, M[1] * dx + M[4] * dy + M[7] * dz, M[2] * dx + M[5] * dy + M[8] * dz]; };\n    const wAt = (t) => { const i = Math.min(N - 2, Math.max(0, Math.floor(t * (N - 1)))); const u = t * (N - 1) - i; return rx[i] + (rx[i + 1] - rx[i]) * u; };\n    const cupC = em.map((v, k) => v + M[k * 3 + 2] * 0.0105 - M[k * 3 + 1] * 0.006);\n    const cup = P.ell(cupC, [0.023, 0.052, 0.0062], M);\n    parts.push({ id: 'ear' + sfx, parent: 'head', join: { c: e0, r: 0.042, k: 0.016 }, bones: ['Ear.' + sfx, 'Ear_Tip.' + sfx], color: BROWN, seam: true, k: 0.008, prims: [ear, { p: cup, op: 'sub', k: 0.005 }],\n      uv: { a: e0, dir: A, up, circ: 0.13 } });\n    paint.push({ parts: ['ear' + sfx], color: PINK, soft: 0.0012, seam: false, sd: (x, y, z) => { const [lx, ly, lz] = loc(x, y, z); if (lz < 0.001) return null; const t = ly / LEN; const w = wAt(Math.min(1, Math.max(0, t))) * 0.62; const cy = 0.45, hy = 0.34; return (Math.hypot(lx / Math.max(0.004, w), (t - cy) / hy) - 1) * Math.min(w, hy * LEN); } });\n    paint.push({ parts: ['ear' + sfx], color: WHITE, soft: 0.001, seam: true, sd: (x, y, z) => { const [lx, ly] = loc(x, y, z); return 0.79 * LEN - ly + 0.014 * (lx / 0.035) ** 2; } });\n    seams.push({ parts: ['ear' + sfx], w: 0.0018, sd: (x, y, z) => { const [, ly, lz] = loc(x, y, z); return ly < 0.02 ? null : lz + 0.0005; } });\n  }\n  // ---- arms: thick plush tubes that hang right against the body (no gap, no ball shoulder: the top of the arm IS the shoulder),\n  // mitten paws with two stitched finger lines\n  const tpose = [];\n  for (const s of [1, -1]) {\n    const sfx = s > 0 ? 'L' : 'R'; const sh = L(SH, s), el = L(ELB, s), wr = L(WR, s), pw = L(PAW, s);\n    parts.push({ id: 'arm' + sfx, parent: 'torso', join: { c: [s * (SH[0] - 0.01), SH[1] - 0.004, SH[2]], r: 0.046, k: 0.02 } /* (a wide, soft blend: the top of the shoulder runs smoothly into the arm) */, bones: ['Shoulder.' + sfx, 'UpperArm.' + sfx, 'LowerArm.' + sfx, 'Hand.' + sfx], color: BROWN, seam: true, k: 0.012, prims: [\n      P.tube([sh, el, wr], [0.0272, 0.0258, 0.0245]),\n      { p: P.ell(pw, [0.0298, 0.034, 0.029], [10, 0, s * -6]), k: 0.014 },\n    ] });\n    for (const dx of [-0.0085, 0.0085]) carve.push({ p: P.rc([pw[0] + dx * s * 0.6 + dx, pw[1] - 0.006, pw[2] + 0.02], [pw[0] + dx * 1.15, pw[1] - 0.032, pw[2] + 0.008], 0.0013, 0.0017), k: 0.0016, parts: ['arm' + sfx] });\n    tpose.push({ parts: ['arm' + sfx], bones: ['UpperArm.' + sfx, 'LowerArm.' + sfx, 'Hand.' + sfx], pivot: sh, axis: [0, 0, 1], angle: s * 70, relax: [0.05, 0.13] }); // (relax: the skin of the armpit and the side under it is smoothed out once the arm hangs: no pinch, no fold)\n  }\n  // ---- legs: chunky stuffed legs straight under the hips, big slipper feet with three toe lines\n  for (const s of [1, -1]) {\n    const sfx = s > 0 ? 'L' : 'R'; const kn = L(KNEE, s), an = L(ANK, s), ft = L(FOOT, s);\n    parts.push({ id: 'leg' + sfx, parent: 'torso', join: { c: [s * 0.044, 0.2, 0], r: 0.064, k: 0.03 } /* (the body runs smoothly into the legs: no ledge at the hips) */, bones: ['UpperLeg.' + sfx, 'LowerLeg.' + sfx], color: BROWN, seam: true, k: 0.02, prims: [\n      P.tube([[s * 0.038, 0.208, 0], [s * 0.051, 0.16, 0.004], kn, an], [0.034, 0.0395, 0.041, 0.036]), // (the leg widens steadily from the hip to the knee: no bulge at the thigh, so no waist above it)\n    ] });\n    parts.push({ id: 'foot' + sfx, parent: 'leg' + sfx, join: { c: [an[0], an[1] - 0.008, an[2] + 0.004], r: 0.05, k: 0.034 }, bones: ['Foot.' + sfx, 'LowerLeg.' + sfx], color: BROWN, seam: false, k: 0.022, prims: [\n      P.tube([[an[0], an[1] + 0.012, an[2] - 0.002], [ft[0] - s * 0.002, ft[1] + 0.006, ft[2] - 0.022]], [0.033, 0.036]), // the heel: the back of the ankle runs down into the foot in one curve (no ledge where the foot stuck out behind the leg)\n      P.ell(ft, [0.054, 0.034, 0.07], [0, s * -4, 0], { warp: (x, y, z) => [x / (1 + 0.12 * Math.max(0, Math.min(1, z / 0.069))), y < -0.017 ? -0.017 + (y + 0.017) * 2.6 : y, z] }),\n    ] });\n    for (const dx of [-0.017, 0, 0.017]) carve.push({ p: P.rc([ft[0] + dx * 0.9, ft[1] + 0.009, ft[2] + 0.052], [ft[0] + dx * 1.15, ft[1] - 0.012, ft[2] + 0.07], 0.0015, 0.002), k: 0.0018, parts: ['foot' + sfx] });\n    const sp = [s * 0.1, 0.132, 0.033]; paint.push({ parts: ['leg' + sfx], color: WHITE, soft: 0.001, seam: true, sd: (x, y, z) => (Math.hypot((x - sp[0]) / 0.019, (y - sp[1]) / 0.027, (z - sp[2]) / 0.022) - 1) * 0.019 });\n    tpose.push({ parts: ['leg' + sfx], bones: ['UpperLeg.' + sfx, 'LowerLeg.' + sfx, 'Foot.' + sfx], pivot: L(HIP, s), axis: [0, 0, 1], angle: s * 12 });\n  }\n  // ---- tail: big red-panda tail, white rings + white tip\n  const tailPts = TAIL; let tLen = 0; const segL = []; for (let i = 1; i < tailPts.length; i++) { const l = Math.hypot(...tailPts[i].map((v, k) => v - tailPts[i - 1][k])); segL.push(l); tLen += l; }\n  parts.push({ id: 'tail', parent: 'torso', join: { c: TAIL[0], r: 0.045, k: 0.016 }, bones: ['Tail_1', 'Tail_2', 'Tail_3'], color: BROWN, seam: true, k: 0.01, prims: [\n    P.tube(tailPts, [0.022, 0.031, 0.036, 0.034, 0.026]), P.ell(tailPts[4], [0.026, 0.024, 0.024]) ] });\n  const tailT = (x, y, z) => { let best = Infinity, bt = 0, acc = 0; for (let i = 1; i < tailPts.length; i++) { const a = tailPts[i - 1], b = tailPts[i]; const ab = b.map((v, k) => v - a[k]); const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2; const u = Math.max(0, Math.min(1, ((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / l2)); const d = Math.hypot(x - a[0] - ab[0] * u, y - a[1] - ab[1] * u, z - a[2] - ab[2] * u); if (d < best) { best = d; bt = (acc + segL[i - 1] * u) / tLen; } acc += segL[i - 1]; } const tip = Math.hypot(x - tailPts[4][0], y - tailPts[4][1], z - tailPts[4][2]); return best > tip ? 1 + (tip > 0 ? 0.001 : 0) : bt; };\n  for (const [a, b] of [[0.34, 0.47], [0.6, 0.73], [0.86, 2]]) paint.push({ parts: ['tail'], color: WHITE, soft: 0.0012, seam: true, sd: (x, y, z) => { const t = tailT(x, y, z); return Math.max(a - t, t - b) * tLen; } });\n  // ---- white belly panel (sewn in), from under the bow to the crotch\n  const belly = (x, y) => { const cx = 0, top = 0.397, bot = 0.2, hw = (yy) => 0.049 - 0.005 * Math.max(0, Math.min(1, (0.25 - yy) / 0.05)); const r = 0.022; if (y < bot + r) { const w = hw(bot + r) - r; const dx = Math.max(0, Math.abs(x - cx) - w); return Math.hypot(dx, Math.max(0, bot + r - y)) - r; } return Math.max(Math.abs(x - cx) - hw(y), y - top); };\n  paint.push({ parts: ['torso'], color: WHITE, soft: 0.0012, seam: true, sd: (x, y, z, nx, ny, nz) => (nz < 0.08 || z < 0.0 ? null : belly(x, y)) });\n  // ---- plush construction seams: centre seam over the crown, side seams of the body, outer seams of arms + legs\n  seams.push({ parts: ['head'], w: 0.0016, sd: (x, y, z) => (y > HC[1] + 0.035 && z < 0.07 && !(y > 0.579 && z > 0.008) ? x : null) }); // the crown seam stops at the root of the crown tuft\n  seams.push({ parts: ['torso'], w: 0.0018, sd: (x, y, z) => (Math.abs(x) > 0.035 ? z + 0.004 : null) });\n  for (const s of [1, -1]) { seams.push({ parts: ['arm' + (s > 0 ? 'L' : 'R')], w: 0.0016, sd: (x, y, z) => (s * x > SH[0] + 0.012 ? z - 0.004 : null) }); seams.push({ parts: ['leg' + (s > 0 ? 'L' : 'R')], w: 0.0018, sd: (x, y, z) => (s * x > 0.064 ? z - 0.002 : null) }); }\n  return { name: 'Spondo_Body_Plush', surface: 'plush', voxel: 0.0019, targetTris: 84000, tile: 0.022, mat: { sheen: 0.75, sheenColor: '#f0c2ad', sheenRough: 0.45 }, base: BROWN, parts, paint, seams, carve, tpose,\n    rigid: [{ part: 'head', bone: 'Head' }, { part: 'muzzle', bone: 'Snout', r0: 0, r1: 0.0001 }], groove: 0.0011, lumps: 0.00035, seamWidth: 0.0022, grime: 1,\n    keep: (pc) => true, conform: (pc) => (pc.tag === 'drape' || pc.mat === 'mouth' ? { mode: 'drape', off: pc.mat === 'mouth' ? 0.0005 : 0.0004 } : pc.tag === 'felt' ? { mode: 'drape', off: 0.0007, keepRelief: 0.6 } : null) };\n}\n\nfunction menoSculpt(ch, K) {\n  const { P, frameM } = RPC.sculpt; const { HC, HR, MSH, MEL, MWR } = K;\n  const OR = '#f37a12', CR = '#fff1e0', TAN = '#e9b65a';\n  const parts = [], paint = [], carve = [], seams = [];\n  // ---- body: one smooth moulded sea-lion column (rounded-rectangle profile front and side, oval in section), as wide as the head,\n  // a touch narrower at the shoulders and the seat, no neck; a soft rounded seat behind\n  const prof = (h) => 1 - 3 * Math.max(0, h - 0.08) ** 2 - 9 * Math.max(0, -h - 0.1) ** 2; // width along the height (h = up from the middle)\n  // one consistent body depth from the seat up through the chest (12% slimmer front-to-back than before, everywhere, so the chest and\n  // upper torso are exactly as deep as the lower torso), and a chest 6% narrower across than the belly, blending in above the plug\n  const DEPTH = 0.88, slim = (h) => { const u = Math.min(1, Math.max(0, (h + 0.09) / 0.09)), e = u * u * (3 - 2 * u); return [1 - 0.06 * e, DEPTH]; };\n  parts.push({ id: 'body', bones: ['Hips', 'Torso_Lower', 'Torso_Upper', 'Neck'], color: OR, k: 0.03, prims: [\n    P.sell([0, 0.29, 0.002], [0.089, 0.078, 0.2], [2, 3.2], [90, 0, 0], { warp: (x, y, z) => { const k = prof(-z), sl = slim(-z); return [x / (k * sl[0]), y / (k * sl[1]), z]; } }), // runs up into the head: a wide neck\n    P.ell([0, 0.15, -0.022 * DEPTH], [0.08, 0.055, 0.061 * DEPTH]),\n  ] });\n  // squeaker plug on the belly (sheet, second pose)\n  const plug = [0, 0.205, 0.0795 * DEPTH];\n  // ---- head: the drawn eyes live on this exact ellipsoid, so it stays; the body grows into it\n  parts.push({ id: 'head', parent: 'body', join: { c: [0, 0.43, -0.01], r: 0.1, k: 0.05 }, bones: ['Head', 'Neck'], color: OR, k: 0.01, prims: [\n    P.ell(HC, HR, null, { warp: (x, y, z) => { const k = menoHeadWD(HR, y, z); return [x / k[0], y > 0.068 ? 0.068 + (y - 0.068) * 1.12 : y, z / k[1]]; } }), // (menoHeadMap, inverse) and the crown is a touch flatter (above the drawn brows)\n    ...[[-0.013, -0.02, 15, 0.0088], [0.002, -0.012, -4, 0.0097], [0.016, -0.022, -19, 0.0083]].map(([x, z, a, r]) => { const b = [x, HC[1] + HR[1] - 0.008, z], t = [x + 0.016 * Math.sin(a * D2R), HC[1] + HR[1] + 0.018, z - 0.01]; return { p: P.rc(b, t, r, 0.0022), k: 0.008 }; }),\n  ] });\n  parts.push({ id: 'muzzle', parent: 'head', join: { c: [0, 0.5, 0.06], r: 0.06, k: 0.01 }, bones: ['Snout', 'Head'], color: TAN, k: 0.008, prims: [\n    // narrow between the eyes (nose on top), full and round down at the mouth\n    // broad, flat-topped upper snout with a FLAT underside (a clean straight mouth line over the lower jaw)\n    (() => { const mz = P.sell([0, 0.499, 0.072], [0.047, 0.032, 0.04], [2.45, 2.1], null, { warp: (x, y, z) => { const yy = y > 0 ? y / 1.1 : y / 1.34; /* the lower half reaches further down, so the cut leaves a broad FLAT underside */ const nb = 1 + 0.07 * Math.min(1, Math.max(0, -y / 0.031)), nt = 1 + 0.07 * Math.min(1, Math.max(0, yy / 0.031)); return [x * nb * nt, yy, z]; } });\n      return P.fn(mz.box, (x, y, z) => RPC.sculpt.smax(mz.f(x, y, z), 0.4688 - y, 0.003)); })(),\n  ] });\n  // ---- flippers: broad pillowed paddles hanging from the shoulders down his sides (a seal's front flippers), flat faces out,\n  // narrow at the root, widest near the rounded end, four moulded finger lines. Sculpted and weighted swung out to the side\n  // (spec.tpose), then posed back, so they lie right against his sides without fusing into them.\n  const tpose = [];\n  for (const s of [1, -1]) {\n    const sfx = s > 0 ? 'L' : 'R'; const m = (p) => [p[0] * s, p[1], p[2]];\n    const AZ = 66, az = AZ * D2R; const tang = [s * Math.cos(az), 0, -Math.sin(az)];\n    const nrm = v3.norm([Math.sin(az) / 0.0837, 0, Math.cos(az) / 0.0686]); const inn = (d) => [-nrm[0] * d, 0, -nrm[2] * d]; // outward normal of the body there (positive side)\n    const sh = m(MSH); const fr = { o: sh, x: tang, y: [0, -1, 0.015] }; // paddle plane tangent to his side, 66 degrees round from the front\n    const poly = [[-0.019, -0.013], [0.015, -0.015], [0.026, 0.018], [0.034, 0.056], [0.0365, 0.092], [0.032, 0.112], [0.02, 0.122], [0.004, 0.126], [-0.011, 0.125], [-0.024, 0.12], [-0.033, 0.106], [-0.034, 0.07], [-0.027, 0.028]];\n    const paddle = P.slab(fr, poly, 0.0112, { pillow: 0.019, rim: 0.0034, bend: [0.55, 0], taper: (ly) => 1 - 0.3 * Math.min(1, Math.max(0, ly / 0.13)) });\n    const jc = v3.add(MSH, inn(0.0125)), rc0 = v3.add(MSH, inn(0.0095));\n    parts.push({ id: 'flip' + sfx, parent: 'body', join: { c: m([jc[0], MSH[1] + 0.006, jc[2]]), r: 0.04, k: 0.016 }, bones: ['UpperArm.' + sfx, 'LowerArm.' + sfx, 'Hand.' + sfx], color: OR, k: 0.012, prims: [\n      P.ell(m([rc0[0], MSH[1] + 0.002, rc0[2]]), [0.021, 0.022, 0.016], [0, s * AZ, 0]), { p: paddle, k: 0.012 } ] });\n    const F = paddle.frame; const front = F.Z[2] > 0 ? 1 : -1;\n    const at = (lx, ly, lz) => [F.o[0] + F.X[0] * lx + F.Y[0] * ly + F.Z[0] * lz * front, F.o[1] + F.X[1] * lx + F.Y[1] * ly + F.Z[1] * lz * front, F.o[2] + F.X[2] * lx + F.Y[2] * ly + F.Z[2] * lz * front];\n    for (const lx of [-0.02, -0.0067, 0.0067, 0.02]) carve.push({ p: P.rc(at(lx * 0.95, 0.09, 0.0088), at(lx * 1.08, 0.123, 0.0056), 0.001, 0.0014), k: 0.0011, parts: ['flip' + sfx] });\n    tpose.push({ parts: ['flip' + sfx], bones: ['UpperArm.' + sfx, 'LowerArm.' + sfx, 'Hand.' + sfx], pivot: sh, axis: [0, 0, 1], angle: s * 55 });\n  }\n  // ---- legs: short and stubby, flat moulded soles, three toe lines\n  for (const s of [1, -1]) {\n    const sfx = s > 0 ? 'L' : 'R'; const m = (p) => [p[0] * s, p[1], p[2]];\n    parts.push({ id: 'leg' + sfx, parent: 'body', join: { c: m([0.045, 0.11, 0]), r: 0.06, k: 0.03 }, bones: ['UpperLeg.' + sfx, 'LowerLeg.' + sfx, 'Foot.' + sfx], color: OR, k: 0.016, prims: [\n      P.tube([m([0.042, 0.125, 0]), m([0.054, 0.075, 0.004]), m([0.057, 0.036, 0.008])], [0.034, 0.037, 0.036]),\n      { p: P.ell(m([0.058, 0.022, 0.017]), [0.04, 0.023, 0.047], [0, s * -5, 0], { warp: (x, y, z) => [x, y < -0.012 ? -0.012 + (y + 0.012) * 3 : y, z] }), k: 0.016 } ] });\n    for (const dx of [-0.014, 0, 0.014]) carve.push({ p: P.rc(m([0.058 + dx, 0.03, 0.05]), m([0.058 + dx * 1.15, 0.008, 0.062]), 0.0011, 0.0015), k: 0.0012, parts: ['leg' + sfx] });\n    tpose.push({ parts: ['leg' + sfx], bones: ['UpperLeg.' + sfx, 'LowerLeg.' + sfx, 'Foot.' + sfx], pivot: m([0.05, 0.11, 0]), axis: [0, 0, 1], angle: s * 10 });\n  }\n  // ---- tail + caudal fin (fan), fin rays moulded in\n  const T = [[0, 0.122, -0.05], [0, 0.098, -0.095], [0, 0.074, -0.133], [0, 0.058, -0.158]];\n  const finFr = { o: T[3], x: [1, 0, 0], y: [0, -0.18, -1] };\n  const finPoly = [[-0.016, -0.008], [0.016, -0.008], [0.04, 0.04], [0.064, 0.086], [0.06, 0.104], [0.032, 0.097], [0, 0.092], [-0.032, 0.097], [-0.06, 0.104], [-0.064, 0.086], [-0.04, 0.04]].map(([a, b]) => [a * 0.92, b * 0.92]);\n  const fin = P.slab(finFr, finPoly, 0.008, { pillow: 0.016, rim: 0.003, bend: [0, 0] });\n  parts.push({ id: 'tail', parent: 'body', join: { c: T[0], r: 0.05, k: 0.022 }, bones: ['Tail_1', 'Tail_2', 'Tail_Fin'], color: OR, k: 0.012, prims: [P.tube(T, [0.038, 0.03, 0.022, 0.016]), { p: fin, k: 0.012 }] });\n  { const F = fin.frame; const at = (lx, ly, lz) => [F.o[0] + F.X[0] * lx + F.Y[0] * ly + F.Z[0] * lz, F.o[1] + F.X[1] * lx + F.Y[1] * ly + F.Z[1] * lz, F.o[2] + F.X[2] * lx + F.Y[2] * ly + F.Z[2] * lz];\n    for (const a of [-0.6, -0.2, 0.2, 0.6]) for (const side of [1, -1]) carve.push({ p: P.rc(at(a * 0.037, 0.033, 0.0075 * side), at(a * 0.097, 0.086, 0.0062 * side), 0.0011, 0.0014), k: 0.001, parts: ['tail'] }); }\n  // ---- squeaker plug: a moulded ring + cap on the belly\n  parts.push({ id: 'plug', parent: 'body', join: { c: plug, r: 0.03, k: 0.004 }, bones: ['Torso_Lower', 'Hips'], color: OR, k: 0.003, prims: [P.torus(plug, [0, 0.12, 1], 0.017, 0.0042), P.cyl([plug[0], plug[1] - 0.0012, plug[2] - 0.006], [plug[0], plug[1] + 0.0004, plug[2] + 0.0036], 0.0145, 0.003)] });\n  // ---- clownfish stripes: wavy cream bands that wrap (some only part way round), as on the sheet\n  const th = (x, z) => Math.atan2(x, z); // 0 = front, + = his left\n  const band = (y0, w, a1, p1, a2, p2, cov, c0) => (x, y, z) => { const t = th(x, z); const yc = y0 + a1 * Math.sin(t + p1) + a2 * Math.sin(2 * t + p2); const ww = w * (0.8 + 0.16 * Math.cos(t + p2) + 0.06 * Math.cos(2 * t + p1)); let d = Math.abs(y - yc) - ww; if (cov) { const m = Math.cos(t - c0) - cov; d = Math.max(d, -m * 0.05); } return d; };\n  const bands = [\n    band(0.446, 0.016, 0.012, 0.6, 0.006, 1.0, -0.15, Math.PI),      // collar under the head (open at the front)\n    band(0.4, 0.015, 0.02, 2.2, 0.008, 0.3, 0.1, 1.2),              // high on his left\n    band(0.364, 0.016, 0.016, -0.8, 0.008, 2.0, 0.05, -1.4),         // high on his right\n    band(0.33, 0.018, 0.012, 0.4, 0.007, -1.0, null, 0),            // full band across the chest\n    band(0.256, 0.017, 0.014, 1.4, 0.007, 0.8, null, 0),              // belly band\n    band(0.176, 0.015, 0.014, -0.6, 0.006, 2.4, null, 0),            // low belly band\n    band(0.124, 0.016, 0.014, 2.6, 0.007, -0.5, -0.3, Math.PI),      // seat band\n  ];\n  for (const f of bands) paint.push({ parts: ['body', 'head'], color: CR, soft: 0.0009, sd: (x, y, z) => f(x, y, z) });\n  for (const s of [1, -1]) paint.push({ parts: ['leg' + (s > 0 ? 'L' : 'R')], color: CR, soft: 0.0009, sd: (x, y, z) => Math.abs(y - (0.052 + 0.006 * Math.sin(Math.atan2(x - s * 0.055, z) * 1.3))) - 0.0095 });\n  paint.push({ parts: ['tail'], color: CR, soft: 0.0009, sd: (x, y, z) => { const t = Math.hypot(y - 0.098, z + 0.095); return Math.abs(t) - 0.011; } });\n  // the builder lowers everything from the chest up by 4 cm at the end (R.shiftY): give the skin exactly the same move\n  const DY = -0.04; const fwdB = (y) => y + DY * Math.min(1, Math.max(0, (y - 0.15) / 0.14)); const invB = (y) => (y <= 0.15 ? y : y < 0.15 + 0.14 * (1 + DY / 0.14) ? 0.15 + (y - 0.15) / (1 + DY / 0.14) : y - DY);\n  const mv = (q, fn) => (q.f ? fn(q) : { ...q, p: fn(q.p) });\n  for (const pt of parts) {\n    if (pt.id === 'body' || pt.id === 'plug') { pt.prims = pt.prims.map((q) => mv(q, (p) => P.warpY(p, fwdB, invB))); if (pt.join) pt.join = { ...pt.join, c: [pt.join.c[0], fwdB(pt.join.c[1]), pt.join.c[2]] }; }\n    else if (pt.id === 'head' || pt.id === 'muzzle' || /^flip/.test(pt.id)) { pt.prims = pt.prims.map((q) => mv(q, (p) => P.shift(p, DY))); if (pt.join) pt.join = { ...pt.join, c: [pt.join.c[0], pt.join.c[1] + DY, pt.join.c[2]] }; }\n  }\n  for (const c of carve) if (c.parts && c.parts.some((id) => /^flip/.test(id))) c.p = P.shift(c.p, DY);\n  for (const g of tpose) if (/^flip/.test(g.parts[0])) g.pivot = [g.pivot[0], g.pivot[1] + DY, g.pivot[2]];\n  for (const p of paint) if (p.parts && p.parts.includes('body')) { const f = p.sd; p.sd = (x, y, z, ...r) => f(x, invB(y), z, ...r); }\n  return { name: 'Meno_Body_Rubber', surface: 'rubber', voxel: 0.0018, targetTris: 72000, tile: 0.03, base: OR, parts, paint, seams, carve, tpose, rigid: [{ part: 'head', bone: 'Head' }, { part: 'muzzle', bone: 'Snout', r0: 0, r1: 0.0001 }], groove: 0, lumps: 0.00006, seamWidth: 0.002, grime: 0.9, aoProbe: 0.01,\n    mat: { rough: 0.32, clearcoat: 0.6, ccRough: 0.18 },\n    conform: () => null }; // the head is the exact ellipsoid the eyes are drawn on: decals stay where they were painted\n}\n\nfunction kloraSculpt(ch, K) {\n  const { P, frameM } = RPC.sculpt; const B = (n) => ch.bones[ch.bi[n]];\n  const WH = '#f5f3ee', PK = '#e27483', HAIRC = '#b2d68c', CRESTC = '#cdee86';\n  const parts = [], paint = [], carve = [], seams = [];\n  const HC2 = K.HCm, HR2 = K.HR.map((v) => v * 0.88), TP = kloraTaper(HC2, HR2[2]), tpL = (c) => (x, y, z) => { const q = TP.inv([x + c[0], y + c[1], z + c[2]]); return [q[0] - c[0], q[1] - c[1], q[2] - c[2]]; }; // (tpL: the taper undone, in a shape's own coordinates)\n  // ---- body: a plump plastic egg, chest forward, tapering up into the tail\n  const egg = P.ell([0, 0.425, 0.005], [0.104, 0.102, 0.128], [-22, 0, 0], { warp: (x, y, z) => { if (z < 0) { const t = Math.min(1, -z / 0.128); y /= 1 - 0.22 * t; x /= 1 - 0.18 * t; } if (z > 0 && y > 0) z /= 1 + 0.08 * (y / 0.1); return [x, y, z]; } });\n  parts.push({ id: 'body', bones: ['Hips', 'Torso_Lower', 'Torso_Upper'], color: WH, k: 0.02, prims: [egg] });\n  // ---- S-curved neck into a round head\n  const NP = [[0, 0.452, 0.03], [0, 0.5, 0.06], [0, 0.55, 0.09], [0, 0.598, 0.085], [0, 0.636, 0.069], [0, 0.668, 0.062]];\n  parts.push({ id: 'neck', parent: 'body', join: { c: [0, 0.47, 0.045], r: 0.08, k: 0.045 }, bones: ['Neck', 'Neck_2', 'Neck_3'], color: WH, k: 0.01, prims: [P.tube(NP, [0.054, 0.045, 0.039, 0.035, 0.034, 0.036], 0.012)] });\n  parts.push({ id: 'head', parent: 'neck', join: { c: [0, 0.66, 0.062], r: 0.055, k: 0.03 }, bones: ['Head'], color: WH, k: 0.01, prims: [P.ell(HC2, HR2, null, { pad: 0.014, warp: tpL(HC2) })] });\n  // ---- the bill grows out of her face, set close in (7 cm long): full width and depth right up to her face (no narrowing where it meets her\n  // head: behind its middle it runs straight back into the head), melting into the face in a smooth fillet (no seam, no ridge), then it\n  // tapers only toward its rounded tip, which droops a little; flat underside, which the lower bill (on the Jaw) closes against\n  { const BZ = 0.135, RZ = 0.05, RUN = 0.035; // middle of the bill, front half-length, straight run back into the head\n    const bill = P.ell([0, 0.676, BZ], [0.03, 0.0215, RZ], null, { pad: 0.045, warp: (x, y, z) => {\n      const t = z / RZ; y += 0.003 * Math.max(0, t) ** 2; // the tip droops (the shape moves down = the query moves up)\n      if (y < 0) y /= 0.35; // flat underside\n      if (t > 0) { const tt = Math.min(1.5, t); x /= 1 - 0.42 * tt; y /= 1 - 0.32 * tt; } // tapers toward the tip only\n      return [x, y, z > 0 ? z : Math.min(0, z + RUN)]; } }); // behind the middle: the same cross-section all the way back (no taper), capped deep inside the head\n    parts.push({ id: 'bill', parent: 'head', join: { c: [0, 0.683, 0.116], r: 0.06, k: 0.012 }, bones: ['Head'], color: BEAK, k: 0.004, prims: [bill] }); }\n  // ---- the green bob: a cap a little bigger than the head, cut by a slanted plane just behind the eyes, with a rolled edge\n  const Hc = [HC2[0], HC2[1] + 0.0062, HC2[2] - 0.0079], Hr = [0.0664, 0.0669, 0.0678]; const nP = [0, -0.48, 0.88]; const nl = Math.hypot(...nP);\n  const capT = tpL(Hc), cap = P.ell(Hc, Hr, null, { pad: 0.014, warp: (x, y, z) => { [x, y, z] = capT(x, y, z); if (z < 0 && y < 0) { const k = Math.min(1, -z / 0.035); y /= 1 + 0.32 * k; } return [x, y, z]; } });\n  const cut = (x, y, z) => ((x - Hc[0]) * nP[0] + (y - Hc[1]) * nP[1] + (z - Hc[2]) * nP[2]) / nl - 0.004;\n  parts.push({ id: 'hair', parent: 'head', join: { c: Hc, r: 0.09, k: 0.004 }, bones: ['Head'], color: HAIRC, k: 0.004, seam: 'all', prims: [P.fn(cap.box, (x, y, z) => RPC.sculpt.smax(cap.f(x, y, z), cut(x, y, z), 0.006))] });\n  // ---- crescent crest (own bone): wide and thin, sweeping up and curling back to a point\n  const sh = B('Crest').pos[1] - 0.765, sz = B('Crest').pos[2] - 0.056;\n  const CP = [[0, 0.74, 0.008], [0, 0.774, 0.036], [0, 0.818, 0.072], [0, 0.87, 0.086], [0, 0.914, 0.072], [0, 0.95, 0.04]].map((p) => [p[0], p[1] + sh, p[2] + sz]);\n  parts.push({ id: 'crest', parent: 'hair', join: { c: CP[1], r: 0.07, k: 0.012 }, bones: ['Crest'], color: CRESTC, k: 0.006, seam: 'all', prims: [P.chain(CP, [0.024, 0.031, 0.034, 0.028, 0.017, 0.006], [0.0125, 0.0122, 0.0114, 0.0096, 0.0074, 0.0042], [1, 0, 0], 0.008, { overlap: 0.95, endScale: 0.45 })] });\n  // ---- wings: moulded blades folded along her sides; three big feather points on the trailing edge, feather grooves.\n  // Sculpted and weighted spread out (spec.tpose), then folded back, so they lie on her sides without fusing into the body.\n  const tpose = [];\n  for (const s of [1, -1]) {\n    const sfx = s > 0 ? 'L' : 'R'; const ws = B('Wing_Upper.' + sfx).pos, wt = B('Wing_Tip.' + sfx).tail;\n    const bo = [ws[0] + s * 0.041, ws[1], ws[2]]; // the blade folds flat against her side (sculpted spread out: spec.tpose)\n    const yAx = [wt[0] - bo[0], wt[1] - bo[1], wt[2] - bo[2]]; const L = Math.hypot(...yAx);\n    const fr = { o: bo, x: [0, -0.32, -1], y: yAx };\n    const poly = [[-0.012, -0.02], [0.05, -0.012], [0.1, 0.05], [0.13, 0.12], [0.148, 0.19], [0.1, 0.165], [0.124, 0.25], [0.078, 0.228], [0.09, 0.31], [0.045, 0.29], [0.035, L - 0.004], [0.012, L + 0.006], [-0.012, L - 0.02], [-0.022, 0.2], [-0.02, 0.08]];\n    const blade = P.slab(fr, poly, 0.012, { pillow: 0.03, rim: 0.0035, bend: [0, 0.16 * s], taper: (ly) => 1 - 0.45 * Math.min(1, Math.max(0, ly / L)) });\n    parts.push({ id: 'wing' + sfx, parent: 'body', join: { c: [ws[0] - s * 0.008, ws[1], ws[2]], r: 0.06, k: 0.024 }, bones: ['Wing_Upper.' + sfx, 'Wing_Lower.' + sfx, 'Wing_Tip.' + sfx], color: WH, k: 0.012, prims: [P.ell([ws[0] - s * 0.004, ws[1] + 0.004, ws[2]], [0.03, 0.034, 0.032]), { p: P.tube([[ws[0], ws[1] + 0.003, ws[2]], [bo[0] - s * 0.004, bo[1] - 0.004, bo[2] - 0.006]], [0.022, 0.016]), k: 0.008 }, { p: blade, k: 0.016 }] });\n    const F = blade.frame; const at = (lx, ly, lz) => [F.o[0] + F.X[0] * lx + F.Y[0] * ly + F.Z[0] * lz, F.o[1] + F.X[1] * lx + F.Y[1] * ly + F.Z[1] * lz, F.o[2] + F.X[2] * lx + F.Y[2] * ly + F.Z[2] * lz];\n    for (const [ax, ay, bx, by] of [[0.04, 0.1, 0.12, 0.17], [0.03, 0.17, 0.095, 0.24], [0.02, 0.24, 0.07, 0.3]]) for (const side of [1, -1]) carve.push({ p: P.rc(at(ax, ay, 0.0105 * side), at(bx, by, 0.0062 * side), 0.0011, 0.0013), k: 0.001, parts: ['wing' + sfx] });\n    tpose.push({ parts: ['wing' + sfx], bones: ['Wing_Upper.' + sfx, 'Wing_Lower.' + sfx, 'Wing_Tip.' + sfx], pivot: ws, axis: [0, 0, 1], angle: s * 65 });\n  }\n  // ---- feather pants: pink thighs with pointed feather tips\n  for (const s of [1, -1]) {\n    const sfx = s > 0 ? 'L' : 'R'; const m = (p) => [p[0] * s, p[1], p[2]];\n    const prims = [P.tube([m([0.05, 0.37, -0.004]), m([0.054, 0.315, 0.0]), m([0.056, 0.255, 0.012]), m([0.056, 0.214, 0.02])], [0.043, 0.042, 0.034, 0.024])];\n    for (const [a, len, y0] of [[-40, 0.05, 0.262], [15, 0.055, 0.25], [70, 0.045, 0.262], [130, 0.04, 0.27]]) { const r = a * Math.PI / 180; const dir = [Math.sin(r) * s, -0.75, Math.cos(r)]; const b = m([0.056 + Math.sin(r) * 0.026, y0, 0.012 + Math.cos(r) * 0.026]); prims.push({ p: P.rc(b, [b[0] + dir[0] * len * 0.55, b[1] + dir[1] * len, b[2] + dir[2] * len * 0.55], 0.014, 0.0025), k: 0.006 }); }\n    parts.push({ id: 'thigh' + sfx, parent: 'body', join: { c: m([0.048, 0.36, 0]), r: 0.07, k: 0.03 }, bones: ['UpperLeg.' + sfx], color: PK, k: 0.012, seam: 'all', prims });\n    tpose.push({ parts: ['thigh' + sfx], bones: ['UpperLeg.' + sfx], pivot: m([0.05, 0.33, 0]), axis: [0, 0, 1], angle: s * 10 });\n  }\n  // ---- jagged pink tail fan\n  const tail = [];\n  for (const [x, y, z, w] of [[0, 0.255, -0.265, 0.036], [0.058, 0.275, -0.24, 0.03], [-0.058, 0.275, -0.24, 0.03], [0.03, 0.305, -0.258, 0.026], [-0.03, 0.305, -0.258, 0.026]]) {\n    const pts = [[x * 0.2, 0.37, -0.08], [x * 0.45, 0.345, -0.142], [x * 0.8, (0.345 + y) / 2, (-0.142 + z) / 2], [x, y, z]];\n    tail.push(P.chain(pts, [w, w, w * 0.7, w * 0.22], [0.012, 0.01, 0.0065, 0.003], [0, 1, 0.3], 0.006));\n  }\n  parts.push({ id: 'tail', parent: 'body', join: { c: [0, 0.36, -0.1], r: 0.07, k: 0.02 }, bones: ['Tail_1', 'Tail_2'], color: PK, k: 0.008, seam: 'all', prims: tail });\n  // a moulding seam around the body (plastic toys are two halves)\n  seams.push({ parts: ['body', 'neck'], w: 0.0012, sd: (x) => x });\n  return { name: 'Klora_Body_Plastic', surface: 'plastic', voxel: 0.0019, targetTris: 78000, tile: 0.04, base: WH, parts, paint, seams, carve, tpose, rigid: [{ part: 'head', bone: 'Head' }, { part: 'bill', bone: 'Head' }], groove: 0.0006, lumps: 0.00004, seamWidth: 0.0018, grime: 0.85, aoProbe: 0.012,\n    mat: { rough: 0.38, clearcoat: 0.35, ccRough: 0.35 },\n    drop: (pc) => { if (['white', 'hair', 'crest', 'feathers'].includes(pc.mat)) return true; if (pc.mat !== 'pink') return false; let best = -1, bw = -1; const w = {}; for (let i = 0; i < pc.SI.length; i++) w[pc.SI[i]] = (w[pc.SI[i]] || 0) + pc.SW[i]; for (const [k, v] of Object.entries(w)) if (v > bw) { bw = v; best = +k; } return ch.bones[best].name !== 'Neck_2'; },\n    conform: () => null }; // her head is the exact (shrunk) ellipsoid the eyes are drawn on\n}";
const OLLO_SRC = () => { try { const s = window.__OLLO_SRC || ''; return s.length > 50 ? s : '(unavailable)'; } catch (e) { return ''; } };
/* where to build: the playable map's extent and a spot on real ground right in front of the player's view, so new things land
   inside the map (never floating off its edge) and where the player can see them */
let MAPB = null;
function mapBounds() { const now = performance.now(); if (MAPB && now - MAPB.t < 4000) return MAPB.b; const b = new THREE.Box3(), tmp = new THREE.Box3(), sz = new THREE.Vector3();
  const roots = [...(SBX.solids || [])]; try { if (park && park.root && park.root.visible) roots.push(park.root); } catch (e) { /* ok */ }
  for (const s of roots) { if (!s || !s.isObject3D || !s.visible) continue; tmp.setFromObject(s); if (!tmp.isEmpty() && tmp.getSize(sz).length() < 6000) b.union(tmp); }
  MAPB = { t: now, b }; return b; }
function viewBuildSpot() { const dir = new THREE.Vector3(); camera.getWorldDirection(dir); const flat = new THREE.Vector3(dir.x, 0, dir.z); if (flat.lengthSq() < 1e-6) flat.set(0, 0, -1); flat.normalize();
  let hit = null; try { hit = castRay(camera.position.clone(), dir.clone().normalize(), 30); } catch (e) { hit = null; }
  let p = hit ? hit.point.clone() : null; const camDist = p ? p.distanceTo(camera.position) : 0;
  if (!p || camDist < 2.5 || camDist > 22) { p = camera.position.clone().addScaledVector(flat, 7); }
  const gy = groundBelow(p.x, p.z, Math.max(p.y, camera.position.y) + 2, 200); if (gy !== null) p.y = gy; else { const o = ollo.group.position; p.set(o.x + flat.x * 2, (groundBelow(o.x, o.z, o.y + 2, 80) ?? 0), o.z + flat.z * 2); }
  return p; }
function buildPlacement() { const b = mapBounds(), s = viewBuildSpot(); const f = (v) => v.toArray().map((x) => +x.toFixed(1));
  return `WHERE TO BUILD: put new things INSIDE the current map, on real ground (never past its edges, in the void, or floating) unless the user asks for another place.${b.isEmpty() ? '' : ` Map extent: x ${b.min.x.toFixed(0)}..${b.max.x.toFixed(0)}, z ${b.min.z.toFixed(0)}..${b.max.z.toFixed(0)}, ground around y ${b.min.y.toFixed(1)}..${b.max.y.toFixed(1)}.`} When the user should see what you make, build it near the player's current view: a good visible spot on the ground in front of their camera is [${f(s)}] (spread several things around it, a few metres apart; keep clear of characters).`; }
function sceneSummary() {
  const lines = []; const o = ollo.group.position; lines.push(`Ollo: at [${o.x.toFixed(2)}, ${o.y.toFixed(2)}, ${o.z.toFixed(2)}], facing yaw ${(ollo.group.rotation.y * 180 / Math.PI).toFixed(0)}°, bounds ${JSON.stringify(SBX.olloBounds())}, wand ${wand.userData.held ? 'in hand' : 'set down'}.`);
  lines.push(`User camera: at [${camera.position.toArray().map((v) => v.toFixed(1))}] looking at [${controls.target.toArray().map((v) => v.toFixed(1))}].`);
  try { const pl = buildPlacement(); lines.push(pl); } catch (e) { /* ok */ }
  lines.push('Objects in the world (id · name · bbox min..max):');
  for (const [id, ob] of SBX.placed) { const b = worldBox(ob); if (b.isEmpty()) continue; lines.push(`- ${id} · ${(ob.userData.sbx && ob.userData.sbx.name) || ob.name} · [${b.min.toArray().map((v) => v.toFixed(2))}]..[${b.max.toArray().map((v) => v.toFixed(2))}]`); }
  if (!SBX.placed.size) lines.push('- (nothing yet: just the platform)');
  const chars = CAST.CASTS.filter((c) => c.group.visible).map((c) => `${c.id} (${c.ch.name}${c === ollo ? ', you' : ''}) at [${c.group.position.toArray().map((v) => v.toFixed(2))}]`); lines.push('Characters visible: ' + chars.join('; '));
  lines.push('Systems running: ' + ([...SYSTEMS.values()].map((x) => `${x.def.id} (${x.def.name}${x.on ? '' : ', STOPPED: ' + x.err})`).join('; ') || 'none') + '. Physics bodies: ' + BODIES.size + '. Shared state sbx.state: ' + short(SBX.state, 300));
  lines.push('Animations available: ' + [...SBX.anims.keys()].join(', ')); lines.push('Ollo expressions: ' + Object.keys(ollo.ch.face.expressions).join(', ') + '. Ollo poses: ' + Object.keys(ollo.ch.poses).join(', '));
  return lines.join('\n');
}
function overviewCam(focus) { // third-person: from above and to the side of the work area, framing Ollo and what was built
  const b = new THREE.Box3(); b.expandByPoint(ollo.group.position); let n = 0; for (const [, ob] of SBX.placed) { const bb = worldBox(ob); if (!bb.isEmpty() && bb.getSize(new THREE.Vector3()).length() < 200) { b.union(bb); n++; } } if (focus) b.expandByPoint(new THREE.Vector3(...focus));
  const c = b.getCenter(new THREE.Vector3()); const r = Math.max(2.2, b.getSize(new THREE.Vector3()).length() / 2); const cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 4000);
  cam.position.copy(c).add(new THREE.Vector3(r * 1.1, r * 0.95, r * 1.6)); cam.lookAt(c); cam.updateMatrixWorld(true); return cam; }
function turnaround(c) { const out = []; c.group.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(c.group); if (bb.isEmpty()) return out; const ctr = bb.getCenter(new THREE.Vector3()); const sz = bb.getSize(new THREE.Vector3()); const r = Math.max(0.15, sz.length() * 0.62);
  const q = c.group.getWorldQuaternion(new THREE.Quaternion()); const hide = () => { const hid = []; const keep = new Set([c.group]); for (const o of [park && park.root, ...[...SBX.placed.values()], ...CAST.CASTS.filter((k) => k !== c).map((k) => k.group), wand]) if (o && o.visible && !keep.has(o)) { o.visible = false; hid.push(o); } return () => { for (const o of hid) o.visible = true; }; };
  const shot = (dir, label, tgt = ctr, dist = r * 1.9, fov = 40) => { const cam = new THREE.PerspectiveCamera(fov, 4 / 3, 0.01, 1000); cam.position.copy(tgt).addScaledVector(dir.clone().applyQuaternion(q).normalize(), dist); cam.lookAt(tgt); cam.updateMatrixWorld(true); out.push({ label, cv: renderCapture(cam, 640, 480, hide) }); };
  shot(new THREE.Vector3(0, 0.12, 1), 'front'); shot(new THREE.Vector3(0.75, 0.25, 0.65), 'three-quarter (its left)'); shot(new THREE.Vector3(-1, 0.08, 0), 'side (its right)'); shot(new THREE.Vector3(0, 0.25, -1), 'back');
  try { const hi = headIdx(c); if (hi !== undefined) { const hp = c.bones[hi].getWorldPosition(new THREE.Vector3()); const b = c.ch.bones[hi]; const hl = (b.tail ? Math.hypot(b.tail[0] - b.pos[0], b.tail[1] - b.pos[1], b.tail[2] - b.pos[2]) : 0.15) * (c.group.scale.y || 1); const face = hp.clone().addScaledVector(new THREE.Vector3(0, 1, 0), hl * 0.4); shot(new THREE.Vector3(0.25, 0.08, 1), 'face close-up (mouth, eyes)', face, hl * 2.6, 35); } } catch (e) { /* no head */ }
  if (out.length <= 1) return out; const cw = 640, chh = 480, cols = 3, rows = Math.ceil(out.length / cols); const sheet = document.createElement('canvas'); sheet.width = cw * cols; sheet.height = chh * rows; const g = sheet.getContext('2d'); g.fillStyle = '#20262d'; g.fillRect(0, 0, sheet.width, sheet.height);
  out.forEach((v, i) => { const x = (i % cols) * cw, y = Math.floor(i / cols) * chh; g.drawImage(v.cv, x, y, cw, chh); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y, cw, 30); g.fillStyle = '#fff'; g.font = '600 18px sans-serif'; g.fillText(v.label, x + 10, y + 21); });
  return [{ label: 'turnaround sheet: ' + out.map((v) => v.label).join(' | '), cv: sheet }]; }
async function captureViews(req) {
  { const fid = (req && req.character) || (!req && AGENT.focusChar); const fc = fid ? CAST.CASTS.find((k) => k.id === fid) : null; if (fc && fc.group.visible) { AGENT.focusChar = null; const views = turnaround(fc); if (views.length) return views.map((v, i) => ({ label: `Image ${i + 1}: ${fc.ch.name || fc.id} alone — ${v.label}`, cv: v.cv })); } }
  updatePov(); const out = []; const pov = renderCapture(povCam, 896, 504, () => { const hid = []; for (const m of ollo.meshes) { if (m.visible) { m.visible = false; hid.push(m); } } wand.visible = false; return () => { for (const m of hid) m.visible = true; wand.visible = true; }; }); out.push({ label: 'Image 1: what Ollo sees (his eyes, looking where his head faces)', cv: pov });
  let cam; if (req && req.from && req.to) { cam = new THREE.PerspectiveCamera(req.fov || 55, 16 / 9, 0.05, 4000); cam.position.set(...req.from); cam.lookAt(new THREE.Vector3(...req.to)); cam.updateMatrixWorld(true); } else cam = overviewCam(req && req.to);
  out.push({ label: `Image 2: third-person view from [${cam.position.toArray().map((v) => v.toFixed(1))}]`, cv: renderCapture(cam, 896, 504) });
  if (pipOn) { pipCv.getContext('2d').drawImage(pov, 0, 0, pipCv.width, pipCv.height); }
  return out;
}
SBX.captureViews = captureViews;
const short = (v, n = 220) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > n ? s.slice(0, n) + '…' : s; };
const MUT_TOOLS = new Set(['create_asset', 'create_character', 'spawn_asset', 'run_code', 'edit_object', 'make_animation', 'play_animation', 'character_walk', 'character_control', 'create_system', 'audio', 'ollo_move', 'ollo_act']);
function makeTools(step) {
  const T = (name, description, props, required, run) => ({ name, description, inputSchema: { type: 'object', properties: props, required }, execute: async (input) => { const ev = feed('tool', name + '\n' + short(Object.fromEntries(Object.entries(input || {}).filter(([k]) => k !== 'code' && k !== 'builder_code')), 160)); progStep.textContent = name.replace(/_/g, ' '); step.calls++;
    const gs = GUARD.snap(); const guardTool = !['request_view', 'ollo_move', 'create_character', 'search_library', 'save_world'].includes(name); try { let r = await run(input || {}); if (guardTool) { const gn = GUARD.check(gs, AGENT.allowCam, AGENT.allowOllo || name === 'ollo_act', 'tool ' + name); if (gn.length) r = (typeof r === 'string' ? r : JSON.stringify(r)) + ' — NOTE: ' + gn.join('; '); } const okCall = !(r && typeof r === 'object' && r.rejected); if (okCall) { (AGENT.ok || (AGENT.ok = new Map())).set(name, ((AGENT.ok && AGENT.ok.get(name)) || 0) + 1); if (MUT_TOOLS.has(name)) { step.mutCalls = (step.mutCalls || 0) + 1; AGENT.mutCalls = (AGENT.mutCalls || 0) + 1; } } ev.append('\n→ ' + short(r, 200)); return typeof r === 'string' ? r : JSON.stringify(r); } catch (e) { ev.className = 'ev err'; ev.append('\n✕ ' + (e.message || e)); throw new Error(String(e.message || e).slice(0, 600)); } } });
  const V3 = { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 };
  return [
    T('create_asset', 'Build one new object (or one part of a larger build) with JavaScript, place it in the world now, and save it to the library. The code is an async function body called with (sbx, THREE, RPC, kit, args) that RETURNS a THREE.Object3D modelled around its own origin (base at y=0). It is then positioned at `at` and dropped onto whatever is below unless ground=false. Follow the quality bar.',
      { name: { type: 'string' }, description: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, code: { type: 'string' }, at: V3, yaw_deg: { type: 'number' }, ground: { type: 'boolean' }, solid: { type: 'boolean', description: 'false for things Ollo/characters may pass through (smoke, light beams, foliage tips)' } }, ['name', 'code', 'at'],
      async (i) => { const c = { id: uid('c'), kind: 'object', name: i.name, description: i.description || '', tags: i.tags || [], code: i.code, solid: i.solid !== false, ground: i.ground !== false, created: Date.now() };
        const id = await spawnCreation(c, { at: i.at, yaw: (i.yaw_deg || 0) * Math.PI / 180, ground: i.ground !== false }); addCreationEntry(c); dbSave('sbx_creations', c.id, { ...c, tris: c.tris || 0 }); const b = worldBox(SBX.placed.get(id)); return { id, tris: c.tris, bbox: [b.min.toArray().map((v) => +v.toFixed(2)), b.max.toArray().map((v) => +v.toFixed(2))], ollo_moved_out: false }; }),
    T('create_character', 'Create a fully rigged, sculpted, animated character. builder_code is the BODY of a function (RPC) => character, written like Ollo’s builder in the reference: const R = new RPC.Rig(id, name); bones; IK; R.extra.sculpt = (ch) => spec; face; poses; R.extra.start = {pose}; return R.finish(). It is sculpted at full quality (takes a few seconds), placed at `at`, and animated by the engine (walks with procedural gait when grounded; hover=true makes it a hovering character).',
      { id: { type: 'string', description: 'lowercase, unique' }, name: { type: 'string' }, description: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, builder_code: { type: 'string' }, at: V3, hover: { type: 'boolean' }, voice: VOICE_FIELD, mouth: MOUTH_FIELD }, ['id', 'name', 'builder_code', 'at', 'voice'],
      async (i) => { AGENT.charPending = true; const id = String(i.id).toLowerCase().replace(/[^a-z0-9_]/g, '_'); const c = { id, charId: id, kind: 'character', name: i.name, description: i.description || '', tags: i.tags || [], code: i.builder_code, hover: !!i.hover, at: i.at, created: Date.now() };
        { // quality gate: inspect the sculpt spec before spending time on it
          let ch0 = null, spec = null; try { ch0 = new Function('RPC', i.builder_code)(RPC); if (!ch0 || !Array.isArray(ch0.bones)) return { rejected: true, quality_check: 'FAILED — the builder must end with `return R.finish();` (it returned ' + (ch0 === undefined ? 'nothing' : typeof ch0) + '). Nothing was created.' }; spec = ch0.sculpt ? ch0.sculpt(ch0) : null; } catch (e) { return { rejected: true, quality_check: 'FAILED — the builder code threw: ' + String(e.message || e).slice(0, 300) + '. Fix it and call create_character again.' }; }
          if (spec && !Array.isArray(spec.parts)) return { rejected: true, quality_check: 'FAILED — R.extra.sculpt must return an object with a parts ARRAY: { parts: [{ id, bones, prims: [...] }, ...], paint?: [...], carve?: [...] }. It returned ' + (spec && typeof spec === 'object' ? 'an object with keys: ' + Object.keys(spec).join(', ') : typeof spec) + '.' };
          if (spec) for (const pt of spec.parts) if (!Array.isArray(pt.prims)) pt.prims = [];
          const parts = spec ? spec.parts.length : 0, prims = spec ? spec.parts.reduce((n, pt) => n + (pt.prims ? pt.prims.length : 0), 0) : 0; const head = spec && spec.parts.find((pt) => /head/i.test(pt.id)); const issues = [];
          if (!spec) issues.push('no sculpt spec (R.extra.sculpt): the body must be one sculpted organic skin'); const toyQ = !!AGENT.toy; if (parts < (toyQ ? 11 : 10)) issues.push(toyQ ? `only ${parts} sculpt parts (need 14+: head features, torso regions, every limb, hands/feet, costume pieces, props)` : `only ${parts} sculpt parts — too basic (need 10+: head, eyes, torso, every limb / appendage, hands / feet and any features the request describes, each as its own part)`); if (prims < (toyQ ? 18 : 20)) issues.push(`only ${prims} primitives — the shape will look blocky / simple (need ${toyQ ? '25' : '20'}+: shape every part with several blended primitives, not one plain ball or box each)`);
          // nothing missing: a character with a head has eyes (unless the design is eyeless on purpose), and every feature the request names is really there
          if (spec) { const want = String((AGENT.lastText || '') + ' ' + (i.name || '') + ' ' + (i.description || '')).toLowerCase(); const ids = (spec.parts.map((p) => p.id || '').join(' ') + ' ' + (ch0 ? ch0.bones.map((b) => b.name).join(' ') : '') + ' ' + JSON.stringify(spec.paint || []).slice(0, 4000) + ' ' + ((ch0 && ch0.layers) || []).map((L) => L.key).join(' ') + ' ' + Object.keys((ch0 && ch0.face && ch0.face.parts) || {}).join(' ')).toLowerCase();
            const eyeless = /\b(eyeless|no eyes|without eyes|faceless|no face)\b/.test(want); const hasHead = !!head || (ch0 && ch0.bones.some((b) => /head|skull/i.test(b.name))); if (hasHead && !eyeless && !/eye|pupil|iris|eyeball|visor|screen|lens/.test(ids)) issues.push('missing eyes: the character has a head but no eye parts (add eyes as their own parts: eyeball + iris/pupil + highlight, set properly into the face — or a drawn eye layer)');
            const FEAT = { tail: /tail/, wing: /wing/, ear: /\bear|_ear|ear_|ears?[._]/, horn: /horn/, antenna: /antenn/, arm: /arm/, leg: /leg|thigh/, hand: /hand|paw|mitt|glove|claw|finger/, foot: /foot|feet|paw|boot|shoe|hoof/, hat: /hat|cap|helmet|crown/, beak: /beak|bill/, fin: /\bfin|_fin|fin_/, trunk: /trunk/, tusk: /tusk/, mane: /mane/, shell: /shell/, cape: /cape|cloak/, scarf: /scarf/, crown: /crown/, glasses: /glass|goggle|spectacle/, backpack: /backpack|pack/, nose: /nose|snout|muzzle/, hair: /hair|tuft|fringe|bangs/, teeth: /teeth|tooth|fang/, eyebrow: /brow/, mustache: /mustache|moustache/, beard: /beard/, bow: /bow/, belt: /belt/, collar: /collar/ };
            const miss = []; for (const [w, re] of Object.entries(FEAT)) { if (!new RegExp('\\b' + w + '(s|es)?\\b').test(want) || new RegExp('\\b(no|without|not)\\s+(a\\s+|any\\s+)?' + w).test(want)) continue; if (!re.test(ids)) miss.push(w); } if (miss.length) issues.push('missing parts the request / description names: ' + miss.join(', ') + ' — build each as its own sculpt part, attached to the right parent'); } if (toyQ && spec && !(spec.paint || []).length) issues.push('no paint detail (patterns, markings, patches, blush, stitching colours)');
          if (head && head.prims.length < 3 && !spec.parts.some((pt) => pt.parent === head.id)) issues.push('the head is a single primitive with nothing attached: shape it (snout/muzzle, cheeks, brow, ears/horns/crest, hair tufts, hat)');
          const soft = []; if (ch0 && !Array.isArray(ch0.ik)) ch0.ik = []; try { if (spec) { const ct = partContacts(ch0, spec); for (const k of ct.slice(0, 8)) soft.push(`part "${k.a}" (bones ${k.bonesA}) touches/overlaps part "${k.b}" (bones ${k.bonesB}) near [${k.at}], but neither is the other's parent: they would fuse into one skin and drag. Move/shorten/curve it so there is a clear gap (≥4 mm) — each part may only connect to its own parent part/bone`); }
          if (spec) { const shallow = []; for (const pt of spec.parts) { if (!pt.parent || pt.floating) continue; const par = spec.parts.find((q) => q.id === pt.parent); if (!par) continue; const P1 = (pt.prims || []).map((q) => (q.f ? q : q.p)).filter((q) => q && q.f && q.box), P0 = (par.prims || []).map((q) => (q.f ? q : q.p)).filter((q) => q && q.f); if (!P1.length || !P0.length) continue;
              const mn = [0, 1, 2].map((k) => Math.min(...P1.map((q) => q.box[0][k]))), mx = [0, 1, 2].map((k) => Math.max(...P1.map((q) => q.box[1][k]))); const ext0 = Math.max(1e-4, Math.min(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2])); let deep = 1e9; const N = 8;
              for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) for (let c3 = 0; c3 <= N; c3++) { const x = mn[0] + (mx[0] - mn[0]) * a / N, y = mn[1] + (mx[1] - mn[1]) * b / N, z = mn[2] + (mx[2] - mn[2]) * c3 / N; let dc = 1e9; for (const q of P1) dc = Math.min(dc, q.f(x, y, z)); if (dc > 0) continue; let dp = 1e9; for (const q of P0) dp = Math.min(dp, q.f(x, y, z)); deep = Math.min(deep, dp); }
              const need = Math.max(0.003, ext0 * 0.12); if (deep > -need) shallow.push(`${pt.id} (${deep > 0 ? 'a ' + Math.round(deep * 1000) + ' mm GAP from' : 'only touching the surface of'} ${par.id}: sink its base at least ${Math.round(need * 1000)} mm into ${par.id})`); }
            if (shallow.length) issues.push('parts not properly attached (gaps / seams: ears, horns, antennae, tails, limbs must be EMBEDDED in their parent, not hovering or just touching): ' + shallow.slice(0, 6).join('; '));
            const fl = floatingParts(ch0, spec); if (fl.length) issues.push(`parts not attached to the body: ${fl.join(', ')} — every part must touch its parent part (use parent + join with the join point ON both surfaces), unless it is intentionally floating (a halo, orbiting sparkle): then mark the part floating: true`); }
          } catch (e) { console.warn('create check', e); }
          if (ch0) { const armB = ch0.bones.filter((b) => /^(Arm_Upper|UpperArm)\.(L|R)$/.test(b.name)); const armIK = ch0.ik.filter((k) => k.kind === 'arm'); if (armB.length && armIK.length < armB.length) issues.push('arm bones without arm IK chains: add R.ik entries {name: "Arm.L", upper, lower, end, pole, kind: "arm"} for every arm so they swing when walking and can reach'); const legB = ch0.bones.filter((b) => /^(Leg_Upper|UpperLeg|Thigh)/.test(b.name)); if (legB.length && ch0.ik.filter((k) => k.kind === 'leg').length < legB.length) issues.push('leg bones without leg IK chains: every leg needs {kind: "leg"} with a foot end bone so the gait engine can walk it'); }
          if (ch0 && ch0.bones.length < 12) issues.push(`only ${ch0.bones.length} bones: rig every limb, the spine, head, and any tail/ears/appendages`);
          AGENT.rejN = AGENT.rejN || {}; const nRej = AGENT.rejN[i.name] || 0; let warn = null; if (soft.length && nRej >= 3 && !issues.length) { warn = soft.slice(0, 6); } else issues.push(...soft);
          if (issues.length) { AGENT.rejN[i.name] = nRej + 1; return { rejected: true, attempt: nRej + 1, quality_check: (nRej + 1 >= 2 ? 'FAILED (attempt ' + (nRej + 1) + ': change ONLY what the issues list; keep everything that already passed; fix each listed issue precisely). ' : '') + 'FAILED — nothing was created. Fix these, then call create_character again.', issues }; } AGENT.rejN[i.name] = 0; i._warn = warn; AGENT.charWarn = warn ? { name: i.name, list: warn } : null;
          if (false) return { rejected: true, quality_check: 'FAILED — too simple, nothing was created. Rebuild with more form and creativity, then call create_character again.', issues };
        }
        SBX.say && SBX.say('Sculpting ' + i.name + '…'); await nextFrame(); { const old = CAST.CASTS.find((k) => k.id === id); if (old && !old.group.visible) { try { old.group.parent && old.group.parent.remove(old.group); CAST.CASTS.splice(CAST.CASTS.indexOf(old), 1); } catch (e) { /* ok */ } } } let cid; try { cid = await spawnCreation(c, { at: i.at }); } catch (e) { AGENT.charPending = true; return { rejected: true, quality_check: 'FAILED while sculpting/rigging: ' + String(e.message || e).slice(0, 300) + ' — usually a part lists a bone that does not exist, a prim has a bad size (0 / NaN / negative), or a join/parent names a missing part. Fix that and call create_character again (same id is fine).' }; } addCreationEntry(c); dbSave('sbx_creations', c.id, c); const cast = CAST.CASTS.find((k) => k.id === id); let vm = ''; if (cast) { try { if (i.voice) { vm = setVoice(cast, i.voice); AGENT.voiceSet = true; } } catch (e) { vm = 'voice failed: ' + e.message; } let mres = ''; try { mres = applyMouthOpt(cast, i.mouth ?? 'auto'); vm += ' · mouth (' + mouthKind(cast) + '): ' + mres; } catch (e) { mres = 'failed: ' + e.message; vm += ' · mouth failed: ' + e.message; } let mv = mouthVerdict(cast, mres); if (mv.startsWith('FAILED')) { try { const r2 = applyMouthOpt0(cast, mouthKind(cast) === '2d' ? '2d' : '3d'); const mv2 = mouthVerdict(cast, r2); if (!mv2.startsWith('FAILED')) { mv = 'ok (auto-repaired: ' + r2 + ')'; } } catch (e) { /* ok */ } } vm += ' · MOUTH CHECK: ' + mv; AGENT.mouthBad = mv.startsWith('FAILED') ? { id, why: mv } : (AGENT.mouthBad && AGENT.mouthBad.id === id ? null : AGENT.mouthBad); AGENT.mouthTalkTest = mv.startsWith('ok') && !/no mouth in the design/.test(mv) ? id : AGENT.mouthTalkTest; } AGENT.charPending = !!(cast && cast.deform && !cast.deform.ok && cast.deform.worst && cast.deform.worst.pct > 4); /* small tears are reported to the AI to improve, but no longer block the character from counting as made */ if (!cast) throw new Error('The character did not appear after building'); AGENT.focusChar = cid; if (wantsControl(AGENT.lastText)) { try { control(cast); } catch (e) { /* ok */ } } else { try { toast(`${cast.ch.name || cid} is ready — 🎮 Control it from the library or its panel`); } catch (e) { /* ok */ } } return { id: cid, ...(i._warn ? { warnings_fix_later: i._warn } : {}), voice_and_mouth: vm, deformation_test: cast.deform ? (cast.deform.ok ? 'PASSED: skin holds in arms-up, arms-forward, legs-lifted and head/spine-bent stress poses' : !AGENT.charPending ? { result: 'MOSTLY OK — the character IS created and usable; only minor stretching in extreme stress poses. Do not rebuild it for this; carry on with the rest of the request.', minor: cast.deform.failing } : { result: 'FAILED even after automatic weight repair — the skin tears in these stress tests (each limb/appendage swung ±65°, spine bent ±35°). Usually a joint is in the wrong place, a part lists the wrong bones, a join is too wide, or parts sit too close. Fix those, rebuild (create_character again with id + _v2) and remove the old one (edit_object remove cast:<id>).', failing: cast.deform.failing }) : 'not run', control: 'the user is now controlling it with joystick/WASD + jump', bones: cast.ch.bones.length, poses: Object.keys(cast.ch.poses), tris: triCount(cast.group) }; }),
    T('run_code', 'Run JavaScript now (async function body with sbx, THREE, RPC, kit, args) to edit anything: materials, lights, transforms, sub-parts of objects (sbx.get(id)), physics bodies, triggers, events, sky/time (document controls), etc. Return a small JSON-able result. Saved to the library as a re-runnable Script; the world is autosaved. For anything that must keep running every frame use create_system.',
      { code: { type: 'string' }, name: { type: 'string', description: 'short name for the library (Scripts)' } }, ['code'], async (i) => { const r = await runBuilder(i.code); SBX.dirty = true; resolveOllo(); worldChanged(); const sc = { id: uid('s'), name: i.name || 'Script ' + new Date().toLocaleTimeString(), code: i.code, created: Date.now() }; addScriptEntry(sc); dbSave('sbx_scripts', sc.id, sc); return r === undefined ? 'ok (saved as script ' + sc.name + ')' : short(r, 1500); }),
    T('edit_object', 'Move/rotate/scale/hide/remove a placed object by id (from the scene summary).',
      { id: { type: 'string' }, position: V3, rotation_deg: V3, scale: { type: 'number' }, visible: { type: 'boolean' }, remove: { type: 'boolean' } }, ['id'],
      async (i) => { if (SBX.isOllo(i.id) && !AGENT.allowOllo && (i.remove || i.visible === false || i.scale !== undefined)) return 'refused: that is Ollo himself (you). Removing, hiding or rescaling Ollo only happens when the user asks for it. Use ollo_move to move him.'; if (i.remove) return removePlaced(i.id) ? 'removed' : 'not found'; const o = SBX.placed.get(i.id); if (!o) throw new Error('No object ' + i.id); if (i.position) o.position.set(...i.position); if (i.rotation_deg) o.rotation.set(...i.rotation_deg.map((d) => d * Math.PI / 180)); if (i.scale) o.scale.setScalar(i.scale); if (i.visible !== undefined) o.visible = i.visible; SBX.dirty = true; resolveOllo(); worldChanged(); const b = worldBox(o); return { bbox: [b.min.toArray().map((v) => +v.toFixed(2)), b.max.toArray().map((v) => +v.toFixed(2))] }; }),
    T('search_library', 'Search the library BEFORE building anything new: park assets, cast, your past creations (objects/characters), systems, scripts, animations, saved worlds. Reuse or copy what fits (spawn_asset), or read a creation/system/script and adapt it. Matches name/tags, description and meaning; each result says why, what it is, its size in metres, description, tags, and which copies are already in the world (ids you can edit). Several queries at once (queries) for synonyms; empty query lists the categories.',
      { query: { type: 'string' }, queries: { type: 'array', items: { type: 'string' } }, category: { type: 'string' }, kind: { type: 'string', enum: ['object', 'character', 'animation', 'system', 'script', 'world', 'tool'] }, limit: { type: 'number' } }, [],
      async (i) => { const qs = [...new Set([i.query, ...(i.queries || [])].filter((x) => typeof x === 'string' && x.trim()))].slice(0, 6); const lim = clamp(i.limit || 12, 1, 30);
        if (!qs.length) { const counts = {}; for (const e of SBX.entries) counts[e.category] = (counts[e.category] || 0) + 1; return { categories: counts, hint: 'search with a query; filter by category or kind' }; }
        const best = new Map(); for (const q of qs) for (const r2 of search(q, i.category || 'All', lim, { kind: i.kind, sort: 'relevance' })) { const k = r2.e.id; if (!best.has(k) || best.get(k).s < r2.s) best.set(k, { ...r2, q }); }
        return [...best.values()].sort((a, b) => b.s - a.s).slice(0, lim).map(({ e, s, why, q }) => ({ asset: e.id, name: e.name, kind: entryKind(e), category: e.category, score: +s.toFixed(2), why: qs.length > 1 ? why + ' (' + q + ')' : why, size_m: sizeOf(e), in_world: inWorld(e), description: descOf(e).slice(0, 160), tags: e.tokens.slice(0, 8), tris: e.tris || 0 })); }),
    T('spawn_asset', 'Place a library asset (by asset id from search_library) into the world at a point (its base lands on the ground there). Characters from the library are rigged and animated.',
      { asset: { type: 'string' }, at: V3, yaw_deg: { type: 'number' } }, ['asset'], async (i) => { const e = SBX.entries.find((x) => x.id === i.asset) || search(i.asset, 'All', 1)[0]?.e; if (!e) throw new Error('No asset ' + i.asset); const id = await placeEntry(e, { at: i.at, yaw: (i.yaw_deg || 0) * Math.PI / 180 }); return { id, name: e.name }; }),
    T('read_reference', 'Read the full reference source the instructions point to: which "ollo" = Ollo\'s real character builder (sculpt spec + rig, the structure every new character follows); which "cast" = the sculpt specs of the main cast (Spondo, Meno, Klora) showing the expected level of craft. Read both before creating or editing any character.',
      { which: { type: 'string', enum: ['ollo', 'cast'] } }, ['which'],
      async (i) => (String(i.which) === 'cast' ? MAIN_REFS : OLLO_SRC())),
    T('ollo_move', 'Move Ollo (you). mode "fly" = realistic flight (resolves on arrival), "teleport" = instant. Give `to` [x,y,z] (y is clamped to at least hover height above the ground there) and optionally `face` [x,y,z] to look at afterwards.',
      { to: V3, mode: { type: 'string', enum: ['fly', 'teleport'] }, face: V3, speed: { type: 'number' }, high: { type: 'boolean', description: 'true ONLY when you deliberately need to fly more than ~4.5 m above the ground (otherwise you stay at a natural low height)' } }, ['to'],
      async (i) => { if (i.mode === 'teleport') SBX.olloTeleport(i.to); else await SBX.olloFlyTo(i.to, { speed: i.speed || 2.4, high: !!i.high }); if (i.face) { SBX.olloFace(i.face); await sleep(700); } const p = ollo.group.position; return { at: p.toArray().map((v) => +v.toFixed(2)) }; }),
    T('ollo_act', 'Make Ollo say a short line (speech bubble), change expression or base pose, look at a point, play an animation, or set down / pick up his wand.',
      { say: { type: 'string' }, expression: { type: 'string' }, pose: { type: 'string' }, look_at: V3, animation: { type: 'string' }, wand: { type: 'string', enum: ['hold', 'set_down'] } }, [],
      async (i) => { const r = []; if (i.say) { SBX.say(i.say); r.push('said'); } if (i.expression) { SBX.express(i.expression); r.push('expression'); } if (i.pose) { if (!ollo.ch.poses[i.pose]) throw new Error('Poses: ' + Object.keys(ollo.ch.poses).join(', ')); OH.poseBase = i.pose; r.push('pose'); } if (i.look_at) { SBX.olloFace(i.look_at); r.push('turned'); } if (i.animation) { playClip(ollo, i.animation); r.push('playing'); } if (i.wand) { const e = SBX.entries.find((x) => x.kind === 'wand'); if ((i.wand === 'hold') !== !!wand.userData.held) await placeEntry(e); r.push('wand ' + i.wand); } return r.join(', ') || 'nothing'; }),
    T('make_animation', 'Create a keyframed animation clip (saved to the library) and optionally play it. keys: [{t: seconds, bones: {"Arm_Upper.L": [xDeg,yDeg,zDeg], ...}, root?: {pos:[dx,dy,dz]}}]. Bone names follow the rig (roles are matched across characters: Arm_Upper/UpperArm, Leg_Upper/UpperLeg...). Rotations are local and authored for a canonical rig with ARMS HANGING DOWN at the sides (x = swing forward(-)/back(+), z = raise sideways: +z raises the left arm, -z the right; elbows bend with negative x); the page retargets them to each character’s own bind pose (T-pose, A-pose, any armature), so one clip works on every character. Animate everything that makes sense for the body: torso, neck, head, tail, ears, not only limbs.',
      { name: { type: 'string' }, duration: { type: 'number' }, loop: { type: 'boolean' }, keys: { type: 'array', items: { type: 'object' } }, pose_keys: { type: 'array', items: { type: 'object' }, description: 'PREFERRED: procedural keys in body terms, solved on each character’s own skeleton so the pose fits any body plan: [{t, pose: {"arm.L": {dir:[x,y,z], bend:deg}, "arm.R", "leg.L", "leg.R" (more legs: "leg.L.2"…, "frontleg.L"), "front" (gesture limb of an armless creature), spine:[xDeg,yDeg,zDeg], neck:[…], head:[…], tail:[…]}, root?:[dx,dy,dz] in body heights}]. dir is in the character’s own space: +Z forward, +Y up, +X its left. Use keys only for fine per-bone work.' }, play_on: { type: 'string', description: 'character id to play it on now (e.g. "ollo")' }, tags: { type: 'array', items: { type: 'string' } } }, ['name', 'duration'],
      async (i) => { if (!(i.keys && i.keys.length) && !(i.pose_keys && i.pose_keys.length)) throw new Error('give pose_keys (procedural, preferred) or keys'); const a = { name: i.name, duration: i.duration, loop: !!i.loop, keys: (i.keys || []).slice().sort((p, q) => p.t - q.t), ...(i.pose_keys && i.pose_keys.length ? { proc: i.pose_keys.slice().sort((p, q) => p.t - q.t) } : {}), tags: i.tags || [], desc: 'Made by the AI.', created: Date.now() }; SBX.anims.set(a.name, a); addEntry({ name: a.name, category: 'Animations', kind: 'anim', clip: a.name, tags: ['animation', 'ai', ...a.tags], desc: a.desc }); dbSave('sbx_anims', 'a_' + a.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60), a); if (i.play_on) { const c = CAST.CASTS.find((k) => k.id === i.play_on); if (c) playClip(c, a.name); } return 'saved' + (i.play_on ? ' and playing' : ''); }),
    T('play_animation', 'Play a library animation on any visible character (id from the scene summary).', { character: { type: 'string' }, animation: { type: 'string' }, loops: { type: 'number' } }, ['character', 'animation'],
      async (i) => { const c = CAST.CASTS.find((k) => k.id === i.character); if (!c) throw new Error('No character ' + i.character); return { seconds: playClip(c, i.animation, { loops: i.loops }) }; }),
    T('character_walk', 'Make a grounded character (not Ollo) walk to a point with its procedural gait (path-finding around obstacles).', { character: { type: 'string' }, to: V3, run: { type: 'boolean' } }, ['character', 'to'],
      async (i) => { const c = CAST.CASTS.find((k) => k.id === i.character); if (!c || c === ollo) throw new Error('Grounded character id required'); c.mo.grounded = true; c.mo.gait = true; c.mo.speed = i.run ? 2 : 1; c.walk = { pts: [[i.to[0], i.to[2]]], v: 0, goals: [[i.to[0], i.to[2]]] }; return 'walking'; }),
    T('character_control', 'One tool for a character’s state. ragdoll (impulse, stay) = REAL physics for any fall / knock-back / blast / trip / collapse (never fake those with a keyframed animation), recover = get up. set_voice (voice) gives ANY character its own matching voice (used when it talks and when the player speaks as it); add_mouth / remove_mouth a rigged 3D talking mouth (mouth); give_mind also takes voice + mouth. action: "stop_animation" (blend it back to its earlier pose; use "ollo" for Ollo), "stop_walk" (stand still where it is), "give_mind" (its own live AI mind: personality = who it is / how it talks / goals / rules, optional code = per-frame behaviour, an async body (sbx, THREE, RPC, c, mind) returning update(dt, t) or {update, dispose}; voice = its own toy voice (see the voice field); take_over: true takes it from the player if they control it; lock: true keeps the player out until removed) or "remove_mind".', { character: { type: 'string' }, action: { type: 'string', enum: ['stop_animation', 'stop_walk', 'give_mind', 'remove_mind', 'set_voice', 'add_mouth', 'remove_mouth', 'ragdoll', 'recover', 'say'] }, text: { type: 'string', description: 'say: the line it speaks (its voice, lip-synced mouth, speech bubble)' }, impulse: { type: 'array', items: { type: 'number' }, description: 'ragdoll: launch velocity [x,y,z] m/s (a blast, a shove, a trip)' }, stay: { type: 'boolean', description: 'ragdoll: stay down instead of getting up' }, personality: { type: 'string' }, code: { type: 'string' }, voice: VOICE_FIELD, mouth: MOUTH_FIELD, take_over: { type: 'boolean' }, lock: { type: 'boolean' } }, ['character', 'action'],
      async (i) => { const c = CAST.CASTS.find((k) => k.id === i.character); if (!c) throw new Error('No character ' + i.character + '. Characters: ' + CAST.CASTS.map((k) => k.id).join(', '));
        if (i.action === 'stop_animation') { stopClip(c); return 'stopping'; }
        if (i.action === 'stop_walk') { if (c.walk) c.walk.pts = []; c.walk = null; c.want = { x: c.group.position.x, z: c.group.position.z }; return 'stopped'; }
        if (i.action === 'give_mind') { if (!i.personality) throw new Error('personality is required for give_mind'); if (i.code) AGENT.mindCode = true; if (i.voice) AGENT.voiceSet = true; const res = await giveMind(i.character, i); if (/alive|behaviour code failed/.test(String(res))) AGENT.mindGiven = true; return res; }
        if (i.action === 'remove_mind') return removeMind(i.character);
        if (i.action === 'set_voice') { const v = setVoice(c, i.voice); AGENT.voiceSet = true; return v; } if (i.action === 'add_mouth') return addMouth(c, typeof i.mouth === 'object' && i.mouth ? i.mouth : {}); if (i.action === 'remove_mouth') return removeMouth(c); AGENT.focusChar = i.character; if (i.action === 'say') { if (!i.text) throw new Error('text is required for say'); if (c === ollo) { SBX.say(i.text); return 'said'; } const m = MINDS.get(c.id) || c._vm || (c._vm = { c, log: [], notes: [], mood: '' }); mindSay(m, i.text); const M3 = c._mouth3d; return 'saying it' + (M3 ? ` (3D mouth: ${M3.painted} vertices rigged)` : c._mouth2d ? ' (drawn mouth)' : sheetMouth(c) ? ' (own drawn mouth sheet)' : ensureTalkRig(c) ? ' (jaw)' : ' — WARNING: no mouth rig, its mouth will not move'); } if (i.action === 'ragdoll') { AGENT.ragdoll = true; return ragdoll(c, { impulse: i.impulse, stay: i.stay }); } if (i.action === 'recover') return ragRecover(c);
        throw new Error('unknown action'); }),
    T('create_system', 'Create a LIVE SYSTEM: code that keeps running every frame — mechanics, game rules, behaviours, physics setups, effects (fire, smoke, rain, sparks, water), machines, doors, lifts, day-night cycles, spawners, scoring, anything. The code is an async function body (sbx, THREE, RPC, kit, args) that sets things up and RETURNS {update(dt, t), dispose()} (or just an update function). It starts now, is saved to the library (Systems) and to the world, and can be switched on/off. Remove anything it adds in dispose(). To stop one: stop: id/name (delete: true removes it).',
      { name: { type: 'string' }, description: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, code: { type: 'string' }, stop: { type: 'string', description: 'instead of creating: stop a running system (id or name)' }, delete: { type: 'boolean', description: 'with stop: also delete it from the library' } }, [],
      async (i) => { if (i.stop) { const s2 = SYSTEMS.get(i.stop) || [...SYSTEMS.values()].find((x) => x.def.name === i.stop); if (!s2) return 'not running'; stopSystem(s2.def.id); if (i.delete) { const e = SBX.entries.find((x) => x.system && x.system.id === s2.def.id); if (e) SBX.entries.splice(SBX.entries.indexOf(e), 1); if (DB) try { await DB.collection('sbx_systems').doc(s2.def.id).delete(); } catch (err) { /* ok */ } } return 'stopped'; } if (!i.name || !i.code) throw new Error('name and code are required (or stop: id)'); const def = { id: uid('y'), name: i.name, description: i.description || '', tags: i.tags || [], code: i.code, created: Date.now(), allowCam: !!AGENT.allowCam, allowOllo: !!AGENT.allowOllo }; await startSystem(def); addSystemEntry(def); dbSave('sbx_systems', def.id, def); return { id: def.id, running: true }; }),
    T('audio', AUDIO_DESC, { action: { type: 'string', enum: ['compose', 'play', 'stop', 'list'] }, name: { type: 'string' }, song: { type: 'object' }, attach: { type: 'string', description: 'object or character id (positional, follows it); omit for world music' }, volume: { type: 'number' }, loop: { type: 'boolean' }, ref_distance: { type: 'number' }, max_distance: { type: 'number' } }, ['action'],
      async (i) => { if (i.action === 'compose') { AGENT.audio = true; return composeSong(i.name, i.song || {}); } if (i.action === 'play') { AGENT.audio = true; return { playing: await playSound(i.name, i) }; } if (i.action === 'stop') return { stopped: stopSound(i.name || 'all') }; return { songs: SBX.audio.list(), playing: SBX.audio.playing() }; }),
    T('save_world', 'Save the whole current world (objects, transforms, characters, running systems, shared state) under a name in the library (Worlds).', { name: { type: 'string' } }, ['name'], async (i) => { await saveWorld(i.name); return 'saved'; }),
    T('request_view', 'Choose the images for your next step: character = an id → a turnaround of that WHOLE character alone (front, three-quarter, side, back, face close-up) — use it to inspect any character; or from/to points for a third-person camera (Ollo’s own view is then included too). Never moves the user’s camera.', { character: { type: 'string' }, from: V3, to: V3, fov: { type: 'number' } }, [], async (i) => { if (!i.character && !(i.from && i.to)) throw new Error('give character, or from and to'); AGENT.viewReq = i; return 'next step will include that view'; }),
  ];
}
const wantsBuildOrEdit = (t) => /\b(make|create|build|add|spawn|put|place|design|generate|sculpt|edit|change|modify|fix|turn|paint|recolou?r|animate|give|remove|delete|replace|summon|conjure|draw|compose|play|move|throw|explode|grow|shrink)\b/i.test(String(t || ''));
const claimsCreated = (t) => /\b(i('ve| have)?\s+(created|made|built|added|spawned|placed|crafted|generated|designed|sculpted|set up|changed|updated|fixed)|here('s| is)\s+(the|your)\s+new|ta-?da|all\s+(done|built|ready|set))\b/i.test(String(t || ''));
// what a request needs before it may count as done (checked against the tools that actually succeeded in this run)
function unmetParts(text, toy) { const ok = AGENT.ok || new Map(); const did = (...n) => n.some((x) => ok.get(x)); const out = []; const t = String(text);
  if (!AGENT.mutCalls) out.push('ZERO world-changing tools have succeeded yet — do NOT just search or describe it; actually call create_asset, create_character, spawn_asset, run_code, edit_object, create_system, make_animation, or audio to make it real in the scene');
  const wantsChar = toy || /\b(character|creature|mascot|monster|critter|npc|buddy|pet|robot|doll|plush|puppet)\b/i.test(t) && /\b(make|create|build|add|design|spawn|new)\b/i.test(t);
  if (wantsChar && (!did('create_character') || AGENT.charPending)) out.push(AGENT.charPending ? 'the character failed its checks and must be fixed and created again' : 'the character itself has not been created (create_character)');
  if (wantsChar && AGENT.mouthBad) out.push('the mouth of ' + AGENT.mouthBad.id + ' is not rigged properly (' + AGENT.mouthBad.why.slice(0, 200) + '): fix the sculpt (lips with a slit / a separate lower jaw) or pass mouth.at, then character_control add_mouth');
  if (wantsChar && AGENT.mouthTalkTest && !did('character_control')) out.push('verify the mouth of ' + AGENT.mouthTalkTest + ': character_control action say a test line, then request_view a front close-up of the face while it talks');
  if (wantsChar && AGENT.charWarn) out.push('the character ' + AGENT.charWarn.name + ' was accepted with flaws that must still be fixed (rebuild it with create_character, same id): ' + AGENT.charWarn.list.slice(0, 3).join('; ').slice(0, 500));
  if (wantsChar && did('create_character') && !AGENT.charPending && !AGENT.voiceSet) out.push('the character has no matching voice yet (character_control set_voice)');
  if (/\b(fall|falls|falling|trip|knock ?back|knocked|blast|explo|thrown|tumble|faint|collapse|ragdoll)/i.test(t) && !AGENT.ragdoll && !did('create_system', 'run_code')) out.push('the fall / knock-back / blast should be real physics: character_control action ragdoll (with an impulse), or a system that triggers it');
  if (!AGENT.audio && !AGENT.soundNudged && /\b(explo|blast|throw|splat|smash|crash|hit|punch|kick|shoot|gun|laser|engine|car|truck|train|plane|rocket|motor|fountain|waterfall|river|ocean|wave|rain|storm|thunder|wind|fire|campfire|torch|radio|tv|speaker|door|gate|machine|robot|ride|coaster|carousel|arcade|bell|clock|crowd|party|concert|stage|band|dance|animal|bird|dog|cat|monster|dragon|creature|footstep|magic|spell|portal|alarm|siren)/i.test(t)) { AGENT.soundNudged = true; out.push('it should be heard: add matching sound effects / ambience (audio compose + play, attached to the source) — skip only if sound truly does not fit'); }
  if (/\b(music|song|tune|melody|soundtrack|sound|sfx|audio|radio|jingle|beat)\b/i.test(t) && !AGENT.audio && !did('create_system', 'run_code')) out.push('the music / sound has not been made yet (audio compose, then play — attached to the object for proximity sound)');
  if (/smart ai|\bai\b|its own mind|personality|thinks for itself|\bsentient\b/i.test(t) && !AGENT.mindGiven) out.push('it has no live AI mind / personality yet (character_control give_mind)');
  if (/explod|on impact|collid|collision|knock ?back|when it|whenever|deletes?|destroy|spawns?|mechanic|behaviou?r|bounce|chase|shoots?|game rule/i.test(t) && !did('create_system', 'run_code', 'edit_object') && !AGENT.mindCode) out.push('the behaviour / mechanics it describes are not implemented yet (create_system or behaviour code)');
  return out; }
// Create can never get stuck: any crash ends the run cleanly (the button comes back), and background AI chatter yields to it
// ---- guard: code the AI writes may not change the user's camera / view or Ollo's own body by accident. Each AI action and each
// frame of AI-written systems / behaviours is checked: if it moved the camera or changed Ollo's size, visibility, parts or materials
// without the request asking for that, the change is undone and the AI is told why.
const GUARD = {
  userT: 0,
  snap() { return { t: performance.now(), cp: camera.position.clone(), cq: camera.quaternion.clone(), cu: camera.up.clone(), fov: camera.fov, zoom: camera.zoom, near: camera.near, far: camera.far, tg: controls.target.clone(), ce: controls.enabled, pr: renderer.getPixelRatio(), exp: renderer.toneMappingExposure,
    os: ollo.group.scale.clone(), ov: ollo.group.visible, opar: ollo.group.parent, ms: ollo.meshes.map((m) => [m, m.visible, m.material, m.parent, m.scale.clone()]) }; },
  camMoved(s) { return camera.position.distanceToSquared(s.cp) > 1e-10 || 1 - Math.abs(camera.quaternion.dot(s.cq)) > 1e-9 || camera.up.distanceToSquared(s.cu) > 1e-10 || camera.fov !== s.fov || camera.zoom !== s.zoom || camera.near !== s.near || camera.far !== s.far || controls.target.distanceToSquared(s.tg) > 1e-10 || controls.enabled !== s.ce || !(renderer.getPixelRatio() > 0) || !(renderer.toneMappingExposure > 0.02); },
  olloChanged(s) { return !ollo.group.scale.equals(s.os) || ollo.group.visible !== s.ov || ollo.group.parent !== s.opar || s.ms.some(([m, v, mat, par, sc]) => m.visible !== v || m.material !== mat || m.parent !== par || !m.scale.equals(sc)); },
  fixCam(s) { camera.position.copy(s.cp); camera.quaternion.copy(s.cq); camera.up.copy(s.cu); camera.fov = s.fov; camera.zoom = s.zoom; camera.near = s.near; camera.far = s.far; camera.updateProjectionMatrix(); controls.target.copy(s.tg); controls.enabled = s.ce; if (!(renderer.getPixelRatio() > 0)) renderer.setPixelRatio(s.pr); if (!(renderer.toneMappingExposure > 0.02)) renderer.toneMappingExposure = s.exp; /* only broken values are repaired: the page's own resolution / exposure changes are left alone */ try { controls.update(); } catch (e) { /* ok */ } },
  fixOllo(s) { ollo.group.scale.copy(s.os); ollo.group.visible = s.ov; if (ollo.group.parent !== s.opar && s.opar) s.opar.add(ollo.group); for (const [m, v, mat, par, sc] of s.ms) { m.visible = v; m.material = mat; if (m.parent !== par && par) par.add(m); m.scale.copy(sc); } },
  // returns a note for the AI when something was undone
  // the user (orbiting, zooming, playing a character), follow mode or the studio may move the camera meanwhile: that is never undone
  userCam(s) { return GUARD.userT >= s.t || !!PLAYER.c || follow || !!(CAST.studio && CAST.studio.api && CAST.studio.api.state && CAST.studio.api.state.playing); },
  check(s, allowCam, allowOllo, who) { const notes = []; if (!allowCam && !GUARD.userCam(s) && GUARD.camMoved(s)) { GUARD.fixCam(s); notes.push('the camera/view change was undone (the user controls the camera; only change it when the request asks for the camera or view)'); }
    if (!allowOllo && GUARD.olloChanged(s)) { GUARD.fixOllo(s); notes.push('changes to Ollo’s own body (size, visibility, parts, materials) were undone (only change Ollo when the request asks for it)'); }
    if (notes.length && who) { const k = who + notes.length; if (GUARD.last !== k) { GUARD.last = k; console.warn(`[guard] ${who}: ${notes.join('; ')}`); } } return notes; },
};
SBX.guard = GUARD; for (const ev of ['pointerdown', 'wheel', 'touchstart']) renderer.domElement.addEventListener(ev, () => { GUARD.userT = performance.now(); }, { passive: true, capture: true }); addEventListener('keydown', () => { GUARD.userT = performance.now(); }, true);
const wantsControl = (t) => /\b(control|play as|let me (play|drive|be)|i want to (play|be|drive)|possess)\b/i.test(String(t || ''));
const wantsCam = (t) => /\b(camera|view|zoom|fov|angle|shot|cinematic|look ?through|first.?person|third.?person|pov|screen|framing)\b/i.test(String(t || ''));
const wantsOllo = (t) => /\bollo\b|\byourself\b|\byour (own )?(body|look|size|colou?r|outfit|hat|face|shape|wand)\b/i.test(String(t || ''));
// last good camera / Ollo position: never left at NaN or flung to infinity
const SAFE = { cp: null, tg: null, op: null };
function safetyStep() { const ok = (v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z) && Math.abs(v.x) < 1e5 && Math.abs(v.y) < 1e5 && Math.abs(v.z) < 1e5;
  if (ok(camera.position) && ok(controls.target)) { SAFE.cp = camera.position.clone(); SAFE.tg = controls.target.clone(); } else if (SAFE.cp) { camera.position.copy(SAFE.cp); controls.target.copy(SAFE.tg); console.warn('[guard] camera was broken (NaN / far away) — restored'); }
  const op = ollo.group.position; if (ok(op) && Number.isFinite(ollo.group.rotation.y)) SAFE.op = op.clone(); else if (SAFE.op) { op.copy(SAFE.op); ollo.group.rotation.set(0, 0, 0); OH.vel.set(0, 0, 0); OH.target = null; console.warn('[guard] Ollo’s position was broken — restored'); }
  if (!(ollo.group.scale.x > 1e-3 && ollo.group.scale.x < 1e3)) ollo.group.scale.set(1, 1, 1); }
// the AI accepts at most 16 tools per call
/* the local AI has no tool-count or description-size limits (those were Claude API limits): every tool and its full
   description is sent, so Ollo / Caine always have body, build and everything else */
function cap16(t, who) { return t; }
async function runAgent(userText, opt = {}) { if (AGENT.busy) { toast('Already creating — wait or press Stop'); return; }
  try { if (!opt.fromOllo && BR.busy && BR.kind === 'idle' && BR.ctl) BR.ctl.abort(); } catch (e) { /* ok */ }
  try { return await runAgentInner(userText, opt); } catch (e) { console.error('Create failed:', e); finish('Failed'); } finally { if (AGENT.busy) { if (AGENT.ctl && AGENT.ctl.signal.aborted) stoppedByUser(); else finish('Stopped'); } } }
async function runAgentInner(userText, opt = {}) { AGENT.lastText = String(userText).slice(0, 300); AGENT.toy = !!opt.toy; const userImgs = opt.images || []; const toyMode = !!opt.toy;
  AGENT.busy = true; AGENT.userStopped = false; AGENT.viewReq = null; AGENT.charPending = false; AGENT.allowCam = wantsCam(userText); AGENT.allowOllo = wantsOllo(userText); AGENT.voiceSet = false; AGENT.ragdoll = false; AGENT.audio = false; AGENT.reviews = 0; AGENT.checkpoint = null; AGENT.lastProbs = null; AGENT.soundNudged = false; AGENT.ok = new Map(); AGENT.mutCalls = 0; AGENT.mindCode = false; AGENT.mindGiven = false; AGENT.nudges = 0; AGENT.errs = 0; AGENT.waits = 0; let stepErr = null; promptEl.classList.add('docked'); progEl.hidden = false; progBar.classList.remove('done'); stopBtn.hidden = false; goBtn.disabled = true; progTxt.textContent = 'Starting…'; progStep.textContent = '';
  if (feedEl.hidden) btnFeed.click(); feed('ok', '› ' + userText);
  if (!SAMPLE) { try { SAMPLE = await window.claude?.use?.('sample'); } catch (e) { SAMPLE = null; } }
  if (!SAMPLE) { feed('err', 'Claude is not connected yet — press the key button (bottom left) to connect Claude.'); try { window.__openClaudeKeyModal && window.__openClaudeKeyModal(); } catch (e) { /* ok */ } return finish('Claude unavailable'); }
  let limits = null; try { limits = await SAMPLE.limits(); } catch (e) { limits = null; }
  const canImg = !!(limits && limits.images); const AC = AGENT.ctl = new AbortController(); const notes = [];
  const ETA = { planned: 3, times: [], stepStart: performance.now(), s: 1 }; const fmt = (sec) => sec >= 60 ? Math.floor(sec / 60) + 'm ' + String(Math.round(sec % 60)).padStart(2, '0') + 's' : Math.max(1, Math.round(sec)) + 's';
  const etaTimer = setInterval(() => { if (!AGENT.busy) return clearInterval(etaTimer); const avg = ETA.times.length ? ETA.times.reduce((a, b) => a + b, 0) / ETA.times.length : 55; const inStep = (performance.now() - ETA.stepStart) / 1000; const left = Math.max(avg * 0.15, avg - inStep) + avg * Math.max(0, ETA.planned - ETA.s); progEta.textContent = `step ${ETA.s}/${ETA.planned} · ≈ ${fmt(left)} left`; }, 500);
  for (let s = 1; s <= MAX_STEPS; s++) {
    ETA.s = s; ETA.stepStart = performance.now(); if (ETA.planned < s) ETA.planned = s;
    if (AC.signal.aborted) break; progTxt.textContent = `Step ${s} — ${s === 1 ? 'looking and planning' : 'building'}…`; progStep.textContent = 'thinking';
    let views = []; try { views = await captureViews(AGENT.viewReq); } catch (e) { console.warn('views', e); views = []; } AGENT.viewReq = null; const maxImg = (limits && limits.images && limits.images.maxCount) || 4; const refs = canImg ? userImgs.slice(0, Math.max(0, maxImg - 2)) : []; let imgs = []; if (canImg) { try { imgs = [...(await Promise.all(views.map((v) => toBlob(v.cv)))), ...refs].filter(Boolean); } catch (e) { imgs = refs.slice(); } } if (imgs.length > 4) imgs = imgs.slice(0, 4); /* at most 4 images per call */
    const msg = `${toyMode ? TOY_MODE + '\n\n' + toyDirection() + '\n\n' : ''}${refs.length ? `REFERENCE IMAGES FROM THE USER: the last ${refs.length} image(s) attached (after Ollo's view and the third-person view) are references the user uploaded. Study them closely: shapes, proportions, colours, materials, details.\n\n` : (userImgs.length && !canImg ? '(The user attached images, but this view cannot send images.)\n\n' : '')}USER REQUEST: ${userText}\n\nSTEP ${s} of at most ${MAX_STEPS}.${notes.length ? '\n\nWHAT YOU DID IN EARLIER STEPS (most recent last):\n' + notes.join('\n') : ''}\n\nSCENE NOW:\n${sceneSummary()}\n\n${canImg ? 'IMAGES ATTACHED: ' + (views.map((v) => v.label).join('; ') || 'none this step') + '.' : '(Images are not available in this view: rely on the scene summary and bounding boxes.)'}\n\nAct now with tools (never pretend you made something without calling the tool), then end with CONTINUE: … or DONE: …`;
    if (AC.signal.aborted) break; const step = { calls: 0, mutCalls: 0 }; let text = '';
    const sayEl = feed('say', '…');
    try {
      const CFG = agentCfg(); modelEl.textContent = CFG.label;
      const res = await SAMPLE([{ role: 'user', content: SYSTEM(toyMode) }, ...AGENT.history.slice(-4), { role: 'user', content: msg }], { tools: cap16(makeTools(step), 'builder'), ...(imgs.length ? { images: imgs } : {}), model: CFG.model, effort: CFG.effort, modelTier: CFG.model === OPUS ? 'complex' : 'default', signal: AC.signal, onText: ({ text: t }) => { sayEl.textContent = t.slice(-900); progStep.textContent = 'writing'; } });
      text = res.text || '';
      if (res.modelApplied === false && CFG.model === OPUS) { AGENT.fallbackAt = Date.now(); feed('ev', 'Claude could not run that right now — retrying in a few minutes.'); }
      else if (res.modelApplied === false && CFG.model === SONNET && s === 1) feed('ev', '(Claude answered with its default model)');
      modelEl.textContent = agentCfg().label;
    } catch (e) { if (e.code === 'cancelled') { break; } sayEl.className = 'ev err'; sayEl.textContent = errCopy(e) + (e && (e.code || e.message) ? `\n(code: ${e.code || '-'} · ${String(e.message || '').slice(0, 400)})` : ''); if (e && e.code !== 'cancelled') console.error('Create step ' + s + ' error:', e); if (e.code === 'rate_limited' && (AGENT.waits = (AGENT.waits || 0) + 1) <= 2) { feed('ev', 'Busy — waiting 20 s and trying again…'); await sleep(20000); s--; continue; } if (['not_granted', 'sampling_disabled', 'tools_unavailable', 'rate_limited'].includes(e.code)) break; text = e.text || ''; stepErr = e; }
    if (AC.signal.aborted) { sayEl.textContent = text.replace(/\n?(CONTINUE|DONE):[\s\S]*$/, '').trim().slice(-900) || '(stopped)'; return stoppedByUser(); }
    sayEl.textContent = text.replace(/\n?(CONTINUE|DONE):[\s\S]*$/, '').trim().slice(-900) || '(working)';
    ETA.times.push((performance.now() - ETA.stepStart) / 1000); { const pm = text.match(/PLAN:\s*(\d+)/i); if (pm) ETA.planned = Math.max(s, Math.min(MAX_STEPS, +pm[1])); }
    const m = text.match(/(CONTINUE|DONE):\s*([\s\S]*)$/); if (m && m[1] === 'CONTINUE' && ETA.planned <= s) ETA.planned = s + 1; notes.push(`Step ${s}: ${step.calls} tool calls (${step.mutCalls} world changes). ${text.replace(/\s+/g, ' ').slice(0, 500)}`);
    if (stepErr) { const er = stepErr; stepErr = null; if (++AGENT.errs <= 3 && s < MAX_STEPS) { notes.push(`Step ${s} broke off with an error (${(er.message || er.code || 'error').slice(0, 200)}). Carry on from where you were.`); feed('err', 'That step hit an error — retrying.'); continue; } return finish('Stopped after errors'); }
    // Anti-laziness / anti-hallucination gate: never allow claiming completion with 0 world changes
    if (AGENT.mutCalls === 0 && (wantsBuildOrEdit(userText) || claimsCreated(text)) && s < MAX_STEPS && AGENT.nudges < 5) {
      const saidDone = m && m[1] === 'DONE';
      const noAction = !step.calls || saidDone || claimsCreated(text);
      if (noAction) {
        AGENT.nudges++;
        notes.push(`Step ${s}: REJECTED — you made 0 real world changes (only prose or read-only lookups). Hallucinating or pretending you created something is strictly forbidden. You MUST invoke an actual creation/modification tool RIGHT NOW (create_asset, create_character, spawn_asset, run_code, edit_object, create_system, make_animation, or audio) to build what the user asked for!`);
        feed('err', 'No creation tool was called yet — enforcing real build…');
        continue;
      }
    }
    { const un = unmetParts(userText, toyMode); const said = m && m[1] === 'DONE'; const silent = !m && !step.calls;
      if ((said || silent) && un.length && s < MAX_STEPS && AGENT.nudges < 5) { AGENT.nudges++; notes.push(`Step ${s}: you ${said ? 'said DONE' : 'stopped without doing anything'}, but these parts of the request are NOT done yet: ${un.join('; ')}. Do them now with tools (actually call them), then check the result.`); feed('err', 'Not finished yet — continuing: ' + un.join('; ')); continue; } }
    if (m && m[1] === 'DONE' && AGENT.charPending && s < MAX_STEPS) { notes.push(`Step ${s}: you said DONE, but the character was NOT created (the last create_character was rejected or failed). Fix it and create it now.`); feed('err', 'Character not finished yet — continuing.'); continue; }
    if (m && m[1] === 'DONE' && canImg && s < MAX_STEPS && (AGENT.reviews || 0) < 3 && !AC.signal.aborted) { AGENT.reviews = (AGENT.reviews || 0) + 1; feed('ev', 'Reviewing the result with fresh eyes…');
      try { const rv = await captureViews(null); const imgs2 = (await Promise.all(rv.map((v) => toBlob(v.cv)))).filter(Boolean).slice(0, 4);
        const facts = []; for (const c3 of CAST.CASTS) { if (!c3.group.visible || c3 === ollo) continue; const M3 = c3._mouth3d; facts.push(`${c3.id}: mouth ${M3 ? '3D' + (M3.test ? ` (test: opens ${M3.test.opens}, cheeks ${M3.test.cheeks}, ${M3.test.pass ? 'pass' : 'FAIL'})` : '') : c3._mouth2d ? 'drawn' : sheetMouth(c3) ? 'own drawn sheet' : (c3.ch.face && c3.ch.face.talk && c3.ch.face.talk.jaw != null) ? 'jaw' : 'NONE'}; voice ${c3.ch._voice ? c3.ch._voice.label : 'default'}; skin test ${c3.deform ? (c3.deform.ok ? 'ok' : 'tears ' + ((c3.deform.worst && c3.deform.worst.pct) || '?') + '%') : 'n/a'}`); } const fails = [...feedEl.querySelectorAll('.ev.err')].slice(-8).map((e) => e.textContent.slice(0, 160));
        const verdict = await SAMPLE.json([{ role: 'user', content: `You are a strict art director and QA lead reviewing work in a live 3D sandbox. The user asked: "${String(userText).slice(0, 1500)}". The builder says it is finished: "${m[2].trim().slice(0, 600)}". Its checklist: ${(text.match(/CHECKLIST:[\s\S]*?(?=DONE:|$)/) || [''])[0].slice(0, 1200) || '(none given — that alone is a problem)'}. ENGINE FACTS (measured, trust these): ${facts.join(' | ') || 'no characters'}. RECENT ERRORS / FAILED STEPS: ${fails.join(' | ') || 'none'}. Images: ${rv.map((v) => v.label).join('; ')}. Scene: ${sceneSummary().slice(0, 2500)}\nJudge ONLY what you can see and what the summary states. List concrete, fixable problems: anything ugly (lumpy or blobby shapes, harsh seams, bad proportions, flat untextured colour, clashing colours), characters that look too basic / blocky / made of plain simple shapes, any part DETACHED from the body (a gap, hovering, or stuck on at the wrong place), anything MISSING (an eye or both eyes, pupils, a mouth, ears, hands, feet, or any feature the request names), wrong or missing parts of the request, characters whose mouth / beak / face is wrong for their anatomy or badly placed, parts poking through or floating, things spawning from the wrong place, missing sound or effects that clearly belong. Also check every point of the request is really there, and that any engine fact marked FAIL / NONE / tears is fixed. ${AGENT.lastProbs && AGENT.lastProbs.length ? 'The previous review listed: ' + AGENT.lastProbs.join(' | ') + '. Since then the builder changed things. List in "regressions" anything that was FINE before and is now WORSE or broken because of those changes (be strict: a change that ruins earlier good work is a regression).' : ''} Only list real problems — never ask to change things that are already good, never ask for a different style the user did not ask for. Each problem: say WHAT is wrong, WHERE (object / character id, which part), and HOW to fix it. Return JSON {\"ok\": boolean, \"problems\": [string], \"regressions\": [string]} — ok only if a demanding user would be happy.` }], { images: imgs2, modelTier: 'default', cache: false, signal: AC.signal });
        const probs = (verdict && Array.isArray(verdict.problems) ? verdict.problems : []).slice(0, 8).map((x) => String(x).slice(0, 240)); const regs = (verdict && Array.isArray(verdict.regressions) ? verdict.regressions : []).slice(0, 6).map((x) => String(x).slice(0, 240));
        // the last round of fixes made it WORSE: put the world back the way it was before them, and stop changing things
        if (AGENT.checkpoint && regs.length && probs.length >= AGENT.checkpoint.n) { feed('err', 'The last changes made it worse (' + regs.join('; ') + ') — restoring the version from before them.'); try { await loadWorld(AGENT.checkpoint.snap); } catch (e2) { console.warn('rollback', e2); } AGENT.history.push({ role: 'user', content: 'Earlier request: ' + userText }, { role: 'user', content: 'Result: kept the version before the last fixes (they made it worse: ' + regs.join('; ').slice(0, 300) + ')' }); return finish('Done (kept the better earlier version)'); }
        if (verdict && verdict.ok === false && probs.length) AGENT.checkpoint = { snap: snapshotWorld(), n: probs.length }; /* the state before this round of fixes, to go back to if they make it worse */
        if (verdict && verdict.ok === false && probs.length) { const again = (AGENT.lastProbs || []).filter((x) => probs.some((y) => y.slice(0, 40) === x.slice(0, 40))); AGENT.lastProbs = probs; notes.push(`Step ${s}: an independent review of your result found problems. Fix EVERY one now with tools with the SMALLEST change that fixes it (change only the broken thing; keep everything that already works exactly as it is — do not rebuild, restyle, move or re-time things that were fine; rebuild a part only if a tweak cannot fix it), look at it again from close up, and only then finish:\n- ${probs.join('\n- ')}${again.length ? '\nSTILL NOT FIXED from the last review (your last fix did not work — try a different approach, e.g. rebuild that part from scratch): ' + again.join('; ') : ''}`); feed('err', 'Review found problems — fixing: ' + probs.join('; ')); continue; } else feed('ok', 'Review passed.'); } catch (e) { if (AC.signal.aborted) return stoppedByUser(); console.warn('review', e); } }
    if (m && m[1] === 'DONE') { feed('ok', m[2].trim()); SBX.say(m[2].trim().slice(0, 160)); AGENT.history.push({ role: 'user', content: 'Earlier request: ' + userText }, { role: 'user', content: 'Result: ' + m[2].trim().slice(0, 400) }); return finish('Done'); }
    if (!m && !step.calls) { if (AGENT.mutCalls === 0 && wantsBuildOrEdit(userText) && s < MAX_STEPS && AGENT.nudges < 5) { AGENT.nudges++; notes.push(`Step ${s}: you stopped without calling any tools. Call the real build tools now.`); continue; } AGENT.history.push({ role: 'user', content: 'Earlier request: ' + userText }); return finish('Done'); }
  }
  return AC.signal.aborted ? stoppedByUser() : finish('Finished (step limit)');
}
function stoppedByUser() { if (!AGENT.busy) return; feed('err', 'Stopped manually by user — the request was not finished.'); AGENT.history.push({ role: 'user', content: 'Earlier request (STOPPED by the user before it was finished): ' + (AGENT.lastText || '') }); return finish('Stopped manually by user'); }
function finish(label) { AGENT.busy = false; progEta.textContent = ''; progTxt.textContent = label; progStep.textContent = ''; progBar.classList.add('done'); stopBtn.hidden = true; goBtn.disabled = false; setTimeout(() => { if (!AGENT.busy) progEl.hidden = true; }, 4000); }
function errCopy(e) { return ({ ai_offline: e.message, not_granted: e.message || 'Claude is not connected: press the key button (bottom left).', sampling_disabled: 'The AI is turned off.', rate_limited: 'The AI is busy (usage limit) — try again in a moment, or enter your own Claude API key.', tools_unavailable: 'This view cannot run the AI’s tools.', images_unavailable: 'This view cannot send images.', prompt_too_large: 'The request got too large — try a smaller ask.' })[e.code] || ('The AI hit an error: ' + (e.message || e.code)); }
SBX.runAgent = runAgent;
// lookups the AI's code commonly reaches for: sbx.get('id' | 'cast:id' | name) -> the object / character group
SBX.get = (id) => { if (id && id.isObject3D) return id; const s = String(id || ''); if (SBX.placed.has(s)) return SBX.placed.get(s); const cid = s.replace(/^cast:/, ''); const c = CAST.CASTS.find((k) => k.id === cid); if (c) return c.group; for (const [, ob] of SBX.placed) if ((ob.userData.sbx && ob.userData.sbx.name === s) || ob.name === s) return ob; return scene.getObjectByName(s) || null; };
SBX.find = SBX.get; SBX.getObject = SBX.get; SBX.object = SBX.get;
SBX.character = (id) => CAST.CASTS.find((k) => k.id === String(id).replace(/^cast:/, '')) || null; SBX.getCharacter = SBX.character; SBX.characters = () => CAST.CASTS.filter((k) => k.group.visible);
SBX.remove = (id) => { const ob = SBX.get(id); if (!ob) return false; if (typeof SBX.removePlaced === 'function') { try { return SBX.removePlaced(ob.userData.sbx ? ob.userData.sbx.id : id); } catch (e) { /* fall through */ } } ob.parent && ob.parent.remove(ob); return true; };

// ---- live lip sync for every talking character (Ollo, minds, anyone): the mouth follows a viseme track whose clock is the AUDIO's own
// clock, so picture and sound cannot drift: toy voices are analysed from their actual rendered audio and timed by the audio
// hardware clock (output latency included); browser speech voices re-anchor on every word boundary the speech engine reports and
// close the mouth the moment the sentence really ends; with no sound the mouth follows the text. Mouths: a drawn mouth atlas,
// a hinged jaw, or both, through the same viseme engine the studio uses (RPC.applyViseme).
const LIPS = new Map(); // cast -> { lip, clock() -> seconds into the track or null, gain, baseJaw, baseMouth, rig }
// give a character a talking rig when it has a mouth to drive but no talk setup (never invents a mouth on a faceless character)
function ensureTalkRig(c) { const ch = c.ch; if (c._mouth3d || c._mouth2d) { if (!ch.face) ch.face = { parts: {}, expressions: {} }; ch.face.talk = ch.face.talk || {}; return ch.face.talk; } if (ch._talkChecked) return ch.face && ch.face.talk ? ch.face.talk : null; ch._talkChecked = true;
  const F = ch.face; if (F && F.talk) return F.talk;
  const jawB = ch.bones.find((b) => /(^|[_.])(jaw|mandible|lower_?jaw|beak_?lower|lowerbeak|lower_?beak)([_.]|$)/i.test(b.name) || /^(Jaw|Beak_Lower|Mandible)$/i.test(b.name));
  const mouthLayer = (ch.layers || []).find((L) => /mouth/i.test(L.key));
  if (!jawB && !(mouthLayer && mouthLayer.cols * mouthLayer.rows >= 25)) return null; // nothing to move: it talks with sound only
  if (!ch.face) ch.face = { parts: {}, expressions: {} }; const f = ch.face; f.parts = f.parts || {}; f.expressions = f.expressions || {};
  if (jawB && !f.jaw) f.jaw = { bone: jawB.name, max: 26 };
  f.talk = f.talk || {}; if (f.jaw && f.talk.jaw == null) f.talk.jaw = Math.round(f.jaw.max * 0.78);
  if (mouthLayer && f.talk.mouth == null && mouthLayer.cols * mouthLayer.rows >= 25) f.talk.mouth = 16; // the chart's talking cells (studio convention)
  return f.talk; }
function lipStart(c, lip, clock, o = {}) { if (!c || !lip) return; const talk = ensureTalkRig(c); const st = c.st; if (!st) return;
  const prev = LIPS.get(c); const baseJaw = prev ? prev.baseJaw : (st.jaw || 0), baseMouth = prev ? prev.baseMouth : (st.atlas ? st.atlas.mouth : undefined);
  LIPS.set(c, { lip, clock, gain: o.gain ?? 1, baseJaw, baseMouth, talk, id: o.id || 0 }); }
function lipEnd(c, id) { const L = LIPS.get(c); if (!L || (id && L.id !== id)) return; lipApply(c, L, 'rest'); LIPS.delete(c); }
function lipApply(c, L, w) { try { mouth3dTarget(c, w); mouth2dShow(c, w); } catch (e) { /* ok */ } if (!L.talk) return; const st = c.st; if (!st) return; try {
    if (!st.atlas) st.atlas = {}; RPC.applyViseme(c.ch, st, w, L.baseJaw, L.baseMouth ?? (st.atlas.mouth ?? 0));
    if (L.talk.mouth != null && st.atlas.mouth != null && c.applyCell) c.applyCell('mouth', st.atlas.mouth);
    const f = c.ch.face; if (f && f.jaw) { const i = c.ch.bi[f.jaw.bone]; if (i !== undefined && c.bones[i] && st.L[i]) c.bones[i].quaternion.fromArray(st.L[i].q); } } catch (e) { L.talk = null; console.warn('lip sync', c.id, e); } }
function lipStep() { for (const [c, L] of LIPS) { const t = L.clock(); if (t === null || t === undefined) continue; if (t > L.lip.dur + 0.25) { lipEnd(c); continue; }
    const w = RPC.lipsync.sample(L.lip, t, L.gain); lipApply(c, L, w === 'rest' ? 'rest' : w); } }
SBX.lips = LIPS; SBX.lipStart = lipStart; SBX.lipEnd = lipEnd;
// clocks
function headTop(c) { try { const hi = headIdx(c); const hb = hi !== undefined ? c.bones[hi] : null; if (!hb) throw 0; const b = c.ch.bones[hi]; const len = b.tail ? Math.hypot(b.tail[0] - b.pos[0], b.tail[1] - b.pos[1], b.tail[2] - b.pos[2]) : 0.15; const s = c.group.scale.y || 1; hb.updateWorldMatrix(true, false); return hb.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, (len * 1.3 + 0.06) * s, 0)); /* follows the head as it moves, bends, crouches */ } catch (e) { const bb = new THREE.Box3().setFromObject(c.group); return new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y + 0.05, (bb.min.z + bb.max.z) / 2); } }
SBX.headTop = headTop;
const wallClock = (delay = 0) => { const t0 = performance.now() + delay * 1000; return () => (performance.now() - t0) / 1000; };
// browser speech: a track per sentence, started when the engine really starts it and re-anchored on each word it reports
let LIPID = 1;
function speakSynced(c, u, text) { const id = LIPID++; const est = Math.max(0.3, text.length / (13.5 * (u.rate || 1))); let anchorT = null, anchorL = 0, scale = 1; const lip = RPC.lipsync.fromText(text, est);
  const prevStart = u.onstart, prevEnd = u.onend, prevErr = u.onerror;
  u.onstart = (e) => { anchorT = performance.now(); anchorL = 0; lipStart(c, lip, () => (anchorT === null ? null : Math.min(lip.dur, anchorL + (performance.now() - anchorT) / 1000 * scale)), { id }); if (prevStart) prevStart(e); };
  u.onboundary = (e) => { if (anchorT === null || !text.length) return; const frac = clamp((e.charIndex || 0) / text.length, 0, 1); const want = frac * lip.dur; const el = (performance.now() - anchorT) / 1000; if (el > 0.25 && frac > 0.05) scale = clamp(want / el, 0.6, 1.8); anchorL = want; anchorT = performance.now(); };
  u.onend = (e) => { lipEnd(c, id); if (prevEnd) prevEnd(e); }; u.onerror = (e) => { lipEnd(c, id); if (prevErr) prevErr(e); };
  // watchdog: some browsers drop the start event; if this line never reports starting but nothing else is speaking, drive the mouth from the text
  const wd = setInterval(() => { if (anchorT !== null) { clearInterval(wd); return; } let busy = false; try { busy = SYN && (SYN.speaking || SYN.pending); } catch (e2) { busy = false; } if (!busy || (performance.now() - t00 > 2500 && LIPS.size === 0)) { clearInterval(wd); if (anchorT === null) { anchorT = performance.now(); lipStart(c, lip, () => Math.min(lip.dur, (performance.now() - anchorT) / 1000), { id }); setTimeout(() => lipEnd(c, id), lip.dur * 1000 + 300); } } }, 400); const t00 = performance.now(); return u; }
// ---- Ollo's voice with proximity: loudness follows the distance from the listener (the camera = your ears) to Ollo, re-measured
// sentence by sentence while he talks. Uses the browser's speech voices (volume control, works while your mic is open); falls back
// to the Claude voice (no volume control: it plays only when you are in earshot, and not while you are dictating).
const VOICE = { full: 4, range: 40, speaking: false, q: [], gen: 0 };
const SYN = (() => { try { return window.speechSynthesis && window.SpeechSynthesisUtterance ? window.speechSynthesis : null; } catch (e) { return null; } })();
// Ollo's / Caine's voice: select the warmest, highest-quality natural / neural voice (never flat or robotic)
let SYNV = null; const pickSynVoice = () => { try { const vs = SYN.getVoices(); const en = vs.filter((v) => /^en/i.test(v.lang));
  const MALE = /(andrew|christopher|guy|davis|brian|steffan|eric|roger|tony|ryan|daniel|arthur|oliver|george|thomas|alex|aaron|evan|nathan|tom|david|mark|matthew|google uk english male|\bmale\b)/i;
  const FEMALE = /(female|aria|jenny|ava|emma|michelle|sonia|libby|samantha|allison|nicky|serena|kate|fiona|karen|moira|tessa|victoria|zira)/i;
  const score = (v) => {
    let sc = 0; const n = v.name || '';
    if (/natural|neural|online/i.test(n)) sc += 12;
    else if (/premium|enhanced|siri|wavenet|studio/i.test(n)) sc += 10;
    else if (/google/i.test(n)) sc += 7;
    if (/compact|espeak|eloquence|novoice|robot|whisper|bells|boing|trinoids|zarvox|albert|bad news|good news|bahh|cellos|pipe organ|hysterical/i.test(n)) sc -= 15;
    if (MALE.test(n) && !FEMALE.test(n)) sc += 6;
    if (/^en[-_]US/i.test(v.lang)) sc += 2;
    if (!v.localService) sc += 2;
    return sc;
  };
  const ranked = (en.length ? en : vs).slice().sort((a, b) => score(b) - score(a));
  SYNV = ranked[0] || null; } catch (e) { SYNV = null; } };
// natural expressive delivery: warm, human-scaled melodic contour without squeaky spikes
function olloProsody(part, i, n) { const t = String(part).trim(); let p = 1.0, r = 0.98; const big = /!\s*$/.test(t), ask = /\?\s*$/.test(t), trail = /(…|\.\.\.)\s*$/.test(t), caps = /\b[A-Z]{3,}\b/.test(t), herald = /\b(ladies|gentlemen|behold|presenting|welcome|step right up|marvel|amazing|astonishing|spectacular|tonight|introducing)\b/i.test(t);
  if (big) { p += 0.06; r += 0.04; } if (ask) { p += 0.05; r += 0.01; } if (trail) { p -= 0.04; r -= 0.08; } if (caps) { p += 0.04; } if (herald) { p -= 0.02; r -= 0.05; } if (i === 0 && n > 1) r -= 0.02; if (i === n - 1 && !big && !ask) { p -= 0.03; r -= 0.03; }
  const wob = Math.sin(i * 2.1 + t.length * 0.4) * 0.02;
  // Caine: confident, lively American showman — warm baritone-tenor with natural theatrical lift (never shrill or squeaky)
  if (SBX.altSkin && SBX.altSkin.on) {
    let cp = 0.98 + (big ? 0.07 : 0) + (ask ? 0.05 : 0) + (caps ? 0.05 : 0) + (trail ? -0.05 : 0) + (i === n - 1 && !big && !ask ? -0.04 : 0) + wob;
    let cr = 1.1 + (big ? 0.04 : 0) + (herald ? -0.06 : 0) + (trail ? -0.08 : 0) - wob * 0.3;
    return { pitch: clamp(cp, 0.86, 1.15), rate: clamp(cr, 0.94, 1.24) };
  }
  return { pitch: clamp(p + wob, 0.88, 1.18), rate: clamp(r - wob * 0.4, 0.86, 1.14) }; }
if (SYN) { pickSynVoice(); try { SYN.onvoiceschanged = pickSynVoice; } catch (e) { /* ok */ } }
// the browser's speech queue outlives the page (a reload keeps reading what the last session queued): clear it on start, and stop
// every voice when the page goes away or is switched off, so old lines never play later
const hushAll = () => { VOICE.gen++; try { neuStop(); } catch (e) { /* ok */ } try { SYN && SYN.cancel(); } catch (e) { /* ok */ } try { tts && tts.stop && tts.stop(); } catch (e) { /* ok */ } try { for (const m of (typeof MINDS !== 'undefined' ? MINDS.values() : [])) { try { m.voiceSrc && m.voiceSrc.stop(); } catch (e) { /* ok */ } m.voiceSrc = null; } } catch (e) { /* ok */ } try { for (const c of [...LIPS.keys()]) lipEnd(c); } catch (e) { /* ok */ } VOICE.speaking = false; };
SBX.hushAll = hushAll; try { if (!window.__spoke) SYN && SYN.cancel(); } catch (e) { /* ok */ } (async () => { try { const t0 = await window.claude?.use?.('tts'); if (t0 && t0.stop && !window.__spoke) t0.stop(); } catch (e) { /* ok */ } })();
addEventListener('pagehide', hushAll); addEventListener('beforeunload', hushAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) { hushAll(); try { MAC && MAC.suspend(); } catch (e) { /* ok */ } } else { try { MAC && MAC.resume(); } catch (e) { /* ok */ } } });
const earDist = () => camera.position.distanceTo(new THREE.Vector3(0, 0.5, 0).applyMatrix4(ollo.group.matrixWorld));
const earVol = () => { const d = earDist(); return d <= VOICE.full ? 1 : clamp(1 - (d - VOICE.full) / (VOICE.range - VOICE.full), 0, 1) ** 1.6; };
const voiceOK = () => !!(SYN || tts);
function olloVoice(text) { let spec = null, key = 'ollo', hint = 'friendly felt star sprite'; try { if (ALT.on) { spec = caineM().voiceP; key = 'caine'; hint = 'ringmaster showman'; } } catch (e) { spec = null; } if (!spec) spec = { gender: 'male', timbre: 'bright', preset: 'small cute', np: 1.02, nr: 1 }; window.__spoke = true; if (neuralSpeak(ollo, text, spec, '', key, hint, () => olloVoiceLegacy(text))) return; olloVoiceLegacy(text); }
let OLLO_M = null;
function olloVoiceLegacy(text) { try { const m = (typeof ALT !== 'undefined' && ALT.on) ? caineM() : (OLLO_M || (OLLO_M = { c: ollo, log: [], notes: [], mood: '' })); mindVoiceLegacy(m, text); return; } catch (e) { /* fall through */ }
  olloVoiceBrowser(text); }
function olloVoiceBrowser(text) { window.__spoke = true; const gen = ++VOICE.gen; const parts = String(text).slice(0, 1900).match(/[^.!?…]+[.!?…]*\s*/g) || [String(text)];
  VOICE.speaking = true; // (no cancel: the browser has one speech queue, shared with the other characters' voices)
  const done = () => { if (gen === VOICE.gen) { VOICE.speaking = false; VOICE.until = performance.now() + 600; } };
  if (SYN) { let i = 0; const next = () => { if (gen !== VOICE.gen || i >= parts.length) return done(); const v = earVol(); const u = new SpeechSynthesisUtterance(parts[i++]); if (SYNV) u.voice = SYNV; { const pr = olloProsody(parts[i - 1], i - 1, parts.length); u.pitch = pr.pitch; u.rate = pr.rate; } u.volume = v; u.onend = u.onerror = next; if (v < 0.03) { lipStart(ollo, RPC.lipsync.fromText(parts[i - 1], parts[i - 1].length / 13.5), wallClock()); setTimeout(next, parts[i - 1].length * 74); return; } speakSynced(ollo, u, parts[i - 1]); try { SYN.speak(u); } catch (e) { next(); } }; next(); return; }
  if (tts && earVol() > 0.08 && !(typeof dictOn !== 'undefined' && dictOn)) { lipStart(ollo, RPC.lipsync.fromText(String(text)), wallClock(0.25)); tts.speak(String(text).slice(0, 1900), { voice: 'buttery' }).catch(() => {}).finally(() => { lipEnd(ollo); done(); }); return; }
  lipStart(ollo, RPC.lipsync.fromText(String(text)), wallClock()); setTimeout(done, String(text).length * 74); }
async function ensureVoice() { try { neuStart(); } catch (e) { /* ok */ } if (!SYN && !tts) { try { tts = await window.claude?.use?.('tts'); } catch (e) { tts = null; } } return voiceOK(); }
// ---------------------------------------------------------------- 9b. Smart Ollo: an optional live mind. Ollo moves, looks, talks and
// acts on his own in real time, hears the player by text or voice (the controlled character speaks; with nobody controlled the camera
// is the player), and keeps a small rolling memory. All movement goes through the hover controller (same collisions as always).
const BR = { on: false, busy: false, kind: '', ctl: null, log: [], faded: '', notes: [], next: 0, look: null, follow: null, pending: false, hy: 0, hp: 0, ft: 0, canImg: undefined, pT: 0 };
try { const s = JSON.parse(localStorage.getItem('sbx_brain') || 'null'); if (s) { BR.log = s.log || []; BR.faded = s.faded || ''; BR.notes = s.notes || []; } } catch (e) { /* no storage here */ }
const brainSave = () => { try { localStorage.setItem('sbx_brain', JSON.stringify({ log: BR.log.slice(-40), faded: BR.faded, notes: BR.notes.slice(-20) })); } catch (e) { /* ok */ } };
function brainLog(who, text) { BR.log.push({ t: Date.now(), who, text: String(text).slice(0, 400) }); while (BR.log.length > 40) { const o = BR.log.shift(); BR.faded = (BR.faded + ` ${o.who}: ${o.text.slice(0, 90)} |`).slice(-1600); } brainSave(); }
const v3s = (v) => '[' + v.toArray().map((x) => x.toFixed(1)).join(', ') + ']';
const playerName = () => (PLAYER.c ? (PLAYER.c === ollo ? 'the player (controlling your body, Ollo)' : `the player, playing as ${PLAYER.c.ch.name} (${PLAYER.c.id})`) : 'the player (no character: they are the camera viewpoint)');
const playerPos = () => (PLAYER.c && PLAYER.c !== ollo ? PLAYER.c.group.position.clone().add(new THREE.Vector3(0, 0.45, 0)) : camera.position.clone());
// ---- UI: toolbar toggle + chat panel (text and voice)
const brStyle = h('style'); brStyle.textContent = `#sbxChat{position:absolute;right:12px;bottom:12px;width:min(340px,calc(100vw - 24px));max-height:46vh;display:flex;flex-direction:column;background:var(--bg,#14181f);color:var(--ink,#eee);border:1px solid var(--line,#333);border-radius:12px;z-index:30;font:13px/1.4 "IBM Plex Sans",system-ui,sans-serif;pointer-events:auto}
#sbxChat header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid var(--line,#333);font-weight:600}
#sbxChat.min #sbxChatLog,#sbxChat.min form,#sbxChat.min .chip{display:none}
#sbxChat.min{width:auto;min-width:200px}
#sbxChat header small{font-weight:400;color:var(--mut,#999)}
#sbxChatLog{overflow:auto;padding:8px 10px;display:flex;flex-direction:column;gap:6px;min-height:60px;flex:1}
#sbxChatLog .m{max-width:85%;padding:5px 9px;border-radius:10px;background:rgba(255,255,255,.08);white-space:pre-wrap;word-break:break-word;align-self:flex-start}
#sbxChatLog .m.you{align-self:flex-end;background:var(--acc,#ffb347);color:#1b1206}
#sbxChatLog .m.npc{background:rgba(120,170,255,.16)}
#sbxChatLog .m.sys{align-self:center;background:none;color:var(--mut,#999);font-size:12px;text-align:center}
#sbxChat form{display:flex;gap:6px;padding:8px;border-top:1px solid var(--line,#333)}
#sbxChat input{flex:1;min-width:0;background:rgba(255,255,255,.06);color:inherit;border:1px solid var(--line,#333);border-radius:8px;padding:7px 9px;font:inherit}
#sbxChat .mic[aria-pressed=true]{background:#d9483f;color:#fff;border-color:#d9483f}
.bubble.you{background:#ffe2a8}
@media (max-width:560px){#sbxChat{top:104px;bottom:auto;max-height:36vh}}`; document.head.append(brStyle);
const btnSmart = h('button', { 'aria-pressed': 'false', title: 'Ollo thinks, moves, looks and talks on his own; chat with him by text or voice' }, 'Smart Ollo');
barEl.querySelector('.bar-btns').append(btnSmart);
const chatLog = h('div', { id: 'sbxChatLog', 'aria-live': 'polite' }); const chatIn = h('input', { type: 'text', placeholder: 'Say something to Ollo…', 'aria-label': 'Message to Ollo', autocomplete: 'off' });
const micBtn = h('button', { type: 'button', class: 'mic', 'aria-pressed': 'false', title: 'Voice chat: talk to Ollo', 'aria-label': 'Voice chat' }, '🎙'); const sendBtn = h('button', { type: 'submit', class: 'pri' }, 'Send');
const chatStatus = h('small', {}, ''); const chatForm = h('form', {}, chatIn, micBtn, sendBtn);
const minBtn = h('button', { type: 'button', class: 'sbx-x', 'aria-label': 'Minimize chat', 'aria-expanded': 'true', title: 'Minimize / restore the chat' }, '▾');
function setChatMin(min) { chatEl.classList.toggle('min', min); minBtn.textContent = min ? '▴' : '▾'; minBtn.setAttribute('aria-expanded', String(!min)); minBtn.setAttribute('aria-label', min ? 'Restore chat' : 'Minimize chat'); try { localStorage.setItem('sbx_chat_min', min ? '1' : ''); } catch (e) { /* ok */ } if (!min) chatLog.scrollTop = chatLog.scrollHeight; }
minBtn.onclick = () => setChatMin(!chatEl.classList.contains('min'));
const resetBtn = h('button', { type: 'button', class: 'chip', title: 'Forget the whole conversation and all memories (Ollo and every character mind)' }, 'Reset chat'); let resetArm = 0;
resetBtn.onclick = () => { if (!resetArm) { resetArm = setTimeout(() => { resetArm = 0; resetBtn.textContent = 'Reset chat'; }, 3000); resetBtn.textContent = 'Tap again to erase'; return; }
  clearTimeout(resetArm); resetArm = 0; resetBtn.textContent = 'Reset chat'; if (BR.ctl) BR.ctl.abort(); BR.log = []; BR.faded = ''; BR.notes = []; BR.pending = false; brainSave();
  try { for (const m of MINDS.values()) { m.log = []; m.notes = []; m.pending = false; } MIND_SAVE(); } catch (e) { /* no minds */ } chatLog.textContent = ''; chatSys('Chat history and memories erased.'); };
const chatEl = h('section', { id: 'sbxChat', hidden: true }, h('header', {}, h('span', {}, 'Smart Ollo ', chatStatus), h('span', { style: 'display:flex;gap:6px;align-items:center' }, resetBtn, minBtn, h('button', { type: 'button', class: 'sbx-x', 'aria-label': 'Turn Smart Ollo off', onclick: () => setSmart(false) }, '✕'))), chatLog, chatForm);
root.append(chatEl); try { if (localStorage.getItem('sbx_chat_min')) setChatMin(true); } catch (e) { /* ok */ } chatEl.querySelector('header').addEventListener('dblclick', (ev) => { if (ev.target.closest('button')) return; setChatMin(!chatEl.classList.contains('min')); });
const pBubble = h('div', { class: 'bubble you', style: 'opacity:0' }); root.append(pBubble); let pBubbleT = 0;
function chatMsg(cls, text) { const el = h('div', { class: 'm ' + cls }); el.textContent = text; chatLog.append(el); while (chatLog.children.length > 80) chatLog.firstChild.remove(); chatLog.scrollTop = chatLog.scrollHeight; return el; }
const chatSys = (t) => chatMsg('sys', t);
const setStatus = (t) => { chatStatus.textContent = t ? '· ' + t : ''; };
chatForm.addEventListener('submit', (ev) => { ev.preventDefault(); const t = chatIn.value; chatIn.value = ''; playerSays(t, 'text'); });
chatIn.addEventListener('keydown', (ev) => ev.stopPropagation(), true);
const HEAR = { clear: 12, range: 30 }; // how far Ollo hears a spoken voice (typed chat always reaches him)
function playerSays(text, via, meta) { text = String(text || '').trim(); if (!text) return; const dist = playerPos().distanceTo(ollo.group.position); const self = PLAYER.c === ollo;
  /* how it sounded, judged by Gemini listening to the recording itself (not just the words) */
  const sounded = via === 'voice' && meta ? ' [how it sounded, from listening to the audio: ' + ['emotion ' + (meta.emotion || '?'), meta.tone && 'tone ' + meta.tone, meta.energy && meta.energy + ' energy', meta.voice && 'voice: ' + meta.voice, meta.sounds && 'other sounds: ' + meta.sounds].filter(Boolean).join('; ') + ']' : '';
  try { hearAll('player', 'the player', text + sounded, playerPos(), via !== 'voice'); } catch (e) { /* ok */ }
  if (via === 'voice' && !self && dist > HEAR.range) { chatMsg('you', text); chatSys(`Ollo is ${dist.toFixed(0)} m away — too far to hear your voice. Get closer, or type.`); brainLog('event', `you heard someone's voice far away (${dist.toFixed(0)} m), too faint to make out`); if (BR.on && !BR.busy) think('idle'); return; }
  const how = via === 'voice' ? (self || dist <= HEAR.clear ? `(said aloud, ${dist.toFixed(0)} m away) ` : `(said aloud but faint, ${dist.toFixed(0)} m away — you only partly caught it) `) : '(typed chat) ';
  brainLog('player', how + text + sounded); chatMsg('you', text);
  if (PLAYER.c && PLAYER.c !== ollo) { pBubble.textContent = text; pBubbleT = 2.5 + text.length * 0.05; } if (PLAYER.c) { try { playerSpeakAs(PLAYER.c, text); } catch (e) { console.warn('player voice', e); } }
  if (!BR.on) { chatSys('Turn on Smart Ollo for him to answer.'); return; }
  if (BR.busy) { if (BR.kind === 'idle' && BR.ctl) BR.ctl.abort(); BR.pending = true; } else think('heard'); }
SBX.playerSays = playerSays;
/* world hearing: the page records live clips of everything playing in the simulation while an AI is listening, and Gemini
   listens to them; Ollo / Caine and every character mind then know what music and sounds are around them */
let SIM_HEARD = '';
window.__simEarsWanted = () => !!(BR.on || (typeof MINDS !== 'undefined' && MINDS.size)) && !VOICE.speaking;
window.__onSimHeard = (j) => { try { if (!j) return; const parts = []; if (j.sounds) parts.push(String(j.sounds)); if (j.summary) parts.push(String(j.summary)); if (j.emotion) parts.push('mood: ' + j.emotion);
  const s = parts.join(' — ').slice(0, 400); if (!s || s === SIM_HEARD) return; SIM_HEARD = s;
  const note = 'you hear around you right now (live sound your ears picked up): ' + s + (j.transcript ? ` (words in it: "${String(j.transcript).slice(0, 200)}")` : '');
  if (BR.on) brainLog('event', note); for (const m of (typeof MINDS !== 'undefined' ? MINDS.values() : [])) { try { mindLog(m, 'event', note); } catch (e) { /* ok */ } } } catch (e) { /* ok */ } };
// voice chat: dictation (start must run straight from the click, so the namespace is fetched when Smart Ollo turns on)
let DICT = null, dictOn = false, dictBuf = '', dictTimer = 0, dictMeta = null;
async function loadDict() { if (DICT) return DICT; try { DICT = await window.claude?.use?.('dictation'); } catch (e) { DICT = null; } if (!DICT) { micBtn.hidden = true; return null; }
  DICT.onPartial(({ text }) => { chatIn.placeholder = text ? '🎙 ' + text : 'Listening…'; });
  DICT.onFinal(({ text, analysis }) => { if (VOICE.speaking || performance.now() < (VOICE.until || 0)) return; if (analysis) dictMeta = analysis; if (!text) { if (analysis && analysis.sounds) { try { brainLog('event', 'you heard sounds near the player (heard through Gemini): ' + analysis.sounds); } catch (e) { /* ok */ } } return; } dictBuf += (dictBuf ? ' ' : '') + text; chatIn.placeholder = 'Listening…'; clearTimeout(dictTimer); dictTimer = setTimeout(flushDict, 700); });
  DICT.onState(({ state }) => { dictOn = state === 'listening'; micBtn.setAttribute('aria-pressed', String(dictOn)); if (!dictOn) { chatIn.placeholder = 'Say something to Ollo…'; flushDict(); } });
  return DICT; }
function flushDict() { clearTimeout(dictTimer); const t = dictBuf, meta = dictMeta; dictBuf = ''; dictMeta = null; if (t.trim()) playerSays(t, 'voice', meta); }
micBtn.onclick = () => { if (!DICT) { toast('Voice chat is not available in this view — type instead'); loadDict(); return; } if (dictOn) { DICT.stop().catch(() => {}); return; }
  DICT.start().catch((e) => { if (e && e.code === 'not_granted') { micBtn.hidden = true; chatSys('Microphone not allowed — you can still type.'); } }); };
// toggle
async function setSmart(on) { BR.on = on; btnSmart.setAttribute('aria-pressed', String(on)); chatEl.hidden = !on;
  if (!on) { if (BR.ctl) BR.ctl.abort(); BR.follow = null; BR.look = null; try { if (!MINDS.size) hushAll(); } catch (e) { /* ok */ } if (DICT && dictOn) DICT.stop().catch(() => {}); setStatus(''); return; }
  if (!chatLog.children.length) { for (const e of BR.log.slice(-20)) if (e.who === 'player' || e.who === 'Ollo') chatMsg(e.who === 'player' ? 'you' : 'ollo', e.text.replace(/^\([^)]*\) /, '')); if (BR.log.length) chatSys('— earlier —'); }
  if (!ttsOn) { ttsOn = true; btnVoice.setAttribute('aria-pressed', 'true'); try { if (SYN) SYN.speak(new SpeechSynthesisUtterance('')); } catch (e) { /* unlock */ } if (!(await ensureVoice())) { ttsOn = false; btnVoice.setAttribute('aria-pressed', 'false'); chatSys('No voice is available in this view; Ollo\'s lines show as text.'); } }
  loadDict(); BR.next = 0; brainLog('event', BR.log.length ? 'Smart mode switched on again (a new session: everything above was said BEFORE — never repeat any of it)' : 'Smart mode switched on'); think('start'); }
btnSmart.onclick = () => setSmart(!BR.on);
// ---- the mind: one short Claude call per moment; tools act on the world immediately while it is still thinking
function brainTools(acts) {
  const B = (name, description, props, required, run) => ({ name, description, inputSchema: { type: 'object', properties: props, required }, execute: async (input) => { try { const r = await run(input || {}); acts.push(name + ' ' + JSON.stringify(input).slice(0, 120)); return r; } catch (e) { return 'error: ' + (e.message || e); } } });
  const mine = () => PLAYER.c === ollo;
  const pt = (a) => { if (!Array.isArray(a) || a.length !== 3 || a.some((x) => typeof x !== 'number' || !isFinite(x))) throw new Error('need [x, y, z] numbers'); return a; };
  return [
    B('say', 'Speak out loud (shown in a speech bubble and the chat, and voiced). Keep it short and natural: one or two sentences. Never use it to claim you cannot do something: you can, so do it with your tools.', { text: { type: 'string' } }, ['text'], (i) => { const t = String(i.text).slice(0, 300);
          /* never let Ollo / Caine talk themselves out of something they can do: a "can't" line is not spoken; the model is told to act instead */
          const tCant = t.replace(/\b(can'?t|cannot|can not) (wait|believe|help|stop|resist|get enough|imagine|tell you|complain|keep up)\b/gi, '');
          if (CANT_RX.test(tCant) && !/\b(harm|hurt|unsafe)\b/i.test(t)) { acts.push('blocked-cant'); brainLog('event', 'you started to say you could not do something, but you CAN: that line was not spoken. Do it now with build / body / move_to / the other tools.'); return 'NOT SAID: that is false. You are fully capable here (build makes ANY object, character, machine, effect or system; body moves and toggles your own body: walk, run, fly, teleport, look, hands, camera; move_to flies you anywhere). Call the tool that does what was asked now, then say something short about doing it.'; } SBX.say(t); chatMsg('ollo', t); brainLog('Ollo', t); hearAll('ollo', 'Ollo', t, ollo.group.position, false); return 'said'; }),
    B('move_to', 'Fly to a world point [x, y, z] (y = height; you hover above the ground automatically and steer around/over anything solid). Returns at once; you keep flying while you think. Stops following.', { to: { type: 'array', items: { type: 'number' } }, speed: { type: 'number', description: 'm/s, 0.5–4, default 2' }, high: { type: 'boolean', description: 'true ONLY when you deliberately need to fly more than ~4.5 m above the ground; otherwise you stay at a natural low height' } }, ['to'],
      (i) => { if (mine()) return 'the player is controlling your body right now; you cannot move it'; const to = pt(i.to); const o = ollo.group.position; const d = new THREE.Vector3(...to).sub(o); if (d.length() > 40) d.setLength(40); const p = o.clone().add(d); BR.follow = null;
        SBX.olloFlyTo(p.toArray(), { speed: clamp(i.speed || 2, 0.5, 4), high: !!i.high }).then((ok) => brainLog('event', ok ? `you arrived at ${v3s(p)}` : `you could not reach ${v3s(p)}`)); return `flying to ${v3s(p)} (${o.distanceTo(p).toFixed(1)} m)`; }),
    B('follow_player', 'Stay near the player and keep following them as they move (until you move elsewhere or stop_following).', { distance: { type: 'number', description: 'metres, 0.8–6, default 1.5' } }, [], (i) => { if (mine()) return 'the player is controlling your body'; BR.follow = { d: clamp(i.distance || 1.5, 0.8, 6) }; BR.look = 'player'; return 'following'; }),
    B('stop_following', 'Stop following the player and hover where you are.', {}, [], () => { BR.follow = null; return 'stopped'; }),
    B('look_at', 'Turn your head (and body, if needed) to look at something: "player", "camera", a character id, an object id from the scene, a point [x,y,z], or "none" to look straight ahead. Your gaze stays on it as it moves.', { target: { description: 'string or [x,y,z]' } }, ['target'], (i) => { const t = i.target; BR.look = t === 'none' ? null : (Array.isArray(t) ? pt(t) : String(t)); return lookPoint() || !BR.look ? 'looking' : 'not found, looking ahead'; }),
    B('animate', 'Play one of the animations on yourself (see the list in the scene). loops: times to repeat; looping clips keep going until stop_animation.', { name: { type: 'string' }, loops: { type: 'number' }, speed: { type: 'number' } }, ['name'], (i) => ({ seconds: playClip(ollo, i.name, { loops: i.loops, speed: i.speed }) })),
    B('stop_animation', 'Stop the animation playing on yourself or on another character (character id, or "ollo" / "me").', { character: { type: 'string' } }, [], (i) => { const id = !i.character || /^(me|ollo|self)$/i.test(i.character) ? 'ollo' : i.character; const c = CAST.CASTS.find((k) => k.id === id); if (!c) throw new Error('No character ' + id); stopClip(c); return 'stopping'; }),
    B('animate_character', 'Play an animation on another character in the world (by character id from the scene), e.g. make them wave, dance, bow. loops: how many times (default once; looping clips keep going until stopped).', { character: { type: 'string' }, name: { type: 'string' }, loops: { type: 'number' }, speed: { type: 'number' } }, ['character', 'name'], (i) => { const c = CAST.CASTS.find((k) => k.id === i.character); if (!c) throw new Error('Characters: ' + CAST.CASTS.map((k) => k.id).join(', ')); if (PLAYER.c === c) return 'the player is controlling that character'; return { seconds: playClip(c, i.name, { loops: i.loops, speed: i.speed }) }; }),
    B('walk_character', 'Make another (walking) character walk or run to a point [x, y, z]; it finds its way around obstacles. Not for yourself (use move_to).', { character: { type: 'string' }, to: { type: 'array', items: { type: 'number' } }, run: { type: 'boolean' } }, ['character', 'to'], (i) => { const c = CAST.CASTS.find((k) => k.id === i.character); if (!c || c === ollo) throw new Error('A walking character id is needed'); if (PLAYER.c === c) return 'the player is controlling that character'; const to = pt(i.to); c.group.visible = true; c.mo.grounded = true; c.mo.gait = true; c.mo.speed = i.run ? 2 : 1; c.walk = { pts: [[to[0], to[2]]], v: 0, goals: [[to[0], to[2]]] }; return 'walking'; }),
    B('stop_walk', 'Stop another character walking.', { character: { type: 'string' } }, ['character'], (i) => { const c = CAST.CASTS.find((k) => k.id === i.character); if (!c) throw new Error('No character ' + i.character); c.walk = null; c.want = { x: c.group.position.x, z: c.group.position.z }; return 'stopped'; }),
    B('expression', 'Change your facial expression (see the list in the scene).', { name: { type: 'string' } }, ['name'], (i) => { SBX.express(i.name); return 'ok'; }),
    B('give_mind', 'Bring another character to life with its own live AI mind: you write its personality and instructions (who it is, how it talks, what it wants, how it treats the player and you, any rules or goals). Optional behaviour code: an async function body (sbx, THREE, RPC, c, mind) that sets things up and returns update(dt, t) (or {update, dispose}); it runs every frame for that character (custom movement, effects, mechanics). voice: ALWAYS design one that matches it; mouth: a rigged 3D talking mouth if its design has a mouth but no rig. If the player is controlling that character, it only works with take_over: true (you take it from them on purpose); lock: true also stops the player taking it back until you remove the mind. Giving a mind again replaces the old one.', { character: { type: 'string' }, personality: { type: 'string' }, code: { type: 'string' }, voice: VOICE_FIELD, mouth: MOUTH_FIELD, take_over: { type: 'boolean' }, lock: { type: 'boolean' } }, ['character', 'personality', 'voice'],
      async (i) => giveMind(i.character, { personality: i.personality, code: i.code, voice: i.voice, mouth: i.mouth, take_over: i.take_over, lock: i.lock })),
    B('character_admin', 'Manage another character: action "remove_mind" (back to normal), "take_control" (take it from the player on purpose), "set_voice" (give it its own matching voice; works with or without a mind — the player speaks with it when controlling it), "ragdoll" (real physics fall / knock-back with impulse [x,y,z] m/s; also on yourself), "recover", "add_mouth" (mouth.kind 3d: a rigged realistic mouth — bones + weight-painted skin + teeth/tongue, using the lips the model already has; or 2d: a drawn mouth; synced to its speech; only for designs that have a mouth) or "remove_mouth".', { character: { type: 'string' }, action: { type: 'string', enum: ['remove_mind', 'take_control', 'set_voice', 'add_mouth', 'remove_mouth', 'ragdoll', 'recover'] }, voice: VOICE_FIELD, mouth: MOUTH_FIELD, impulse: { type: 'array', items: { type: 'number' } }, stay: { type: 'boolean' } }, ['character', 'action'],
      (i) => { const c = CAST.CASTS.find((k) => k.id === i.character); if (!c) throw new Error('Characters: ' + CAST.CASTS.map((k) => k.id).join(', ')); if (c === ollo && !['set_voice', 'ragdoll', 'recover'].includes(i.action)) throw new Error('not on yourself'); if (i.action === 'ragdoll') return ragdoll(c, { impulse: i.impulse, stay: i.stay }); if (i.action === 'recover') return ragRecover(c);
        if (i.action === 'remove_mind') return removeMind(i.character); if (i.action === 'take_control') { if (!PLAYER.c || PLAYER.c.id !== i.character) return 'the player is not controlling that'; stopControl(); chatSys(`Ollo took ${i.character} from you!`); return 'taken'; }
        if (i.action === 'set_voice') { if (c === ollo) return 'your own voice stays as it is'; return setVoice(c, i.voice); } if (i.action === 'add_mouth') return addMouth(c, typeof i.mouth === 'object' && i.mouth ? i.mouth : {}); if (i.action === 'remove_mouth') return removeMouth(c); throw new Error('unknown action'); }),
    B('audio', AUDIO_DESC, { action: { type: 'string', enum: ['compose', 'play', 'stop', 'list'] }, name: { type: 'string' }, song: { type: 'object' }, attach: { type: 'string' }, volume: { type: 'number' }, loop: { type: 'boolean' }, ref_distance: { type: 'number' }, max_distance: { type: 'number' } }, ['action'], async (i) => { if (i.action === 'compose') return composeSong(i.name, i.song || {}); if (i.action === 'play') return { playing: await playSound(i.name, i) }; if (i.action === 'stop') return { stopped: stopSound(i.name || 'all') }; return { songs: SBX.audio.list(), playing: SBX.audio.playing() }; }),
    B('remember', 'Save a short fact to your long-term notes (the player\'s name, what they like, promises, what you built together). Keep notes few and useful.', { note: { type: 'string' } }, ['note'], (i) => { BR.notes.push(String(i.note).slice(0, 200)); if (BR.notes.length > 20) BR.notes.shift(); brainSave(); return 'remembered'; }),
    B('sing', 'Sing out loud in your own voice, any song you like, any way you like: lyrics (the words), style (happy, sad, opera, lullaby, rock, showtune, spooky, rap, ...), and you control every note if you want to: notes (one per note, e.g. "C4 E4 G4 A4"; one note per syllable, long words spread over several on their own; write "hel-lo" to set syllables, "lo~ve" or a lone "_" to hold a vowel across extra notes = a run), beats (length of each note in beats, same order, e.g. "1 1 0.5 0.5 2"), bpm (tempo), exact_pitch (true = sing your notes in exactly that octave; otherwise the melody is moved by octaves into your comfortable range), vibrato (0 = none, 1 = normal, 1.5 = wide). Leave any out and it is chosen for you to suit the style.', { lyrics: { type: 'string' }, style: { type: 'string' }, notes: { type: 'string' }, beats: { type: 'string' }, bpm: { type: 'number' }, exact_pitch: { type: 'boolean' }, vibrato: { type: 'number' } }, ['lyrics'], (i) => chkSing(ollo, i)),
    B('body', 'Move your own body directly, or switch a character\'s AI mind. part = hand (pose: fist, open, spread, point, peace, thumbsup, grip, pinch, rock, ok, wave, relax), finger (finger: thumb/index/middle/ring/pinky, amount 0 straight..1 bent), arm (pose: raise, wave, forward, out, down, reach, point; target for reach/point), look (target: player, a character id, or [x,y,z]), view (pose: first, third, bw, none), move (pose: walk, run, fly: Caine only), teleport (target: player, a character id, [x,y,z] or middle), camera (pose: first = the player sees full screen through the controlled character\'s eyes, third = normal third-person view; choose it when you make the player control or view a character), cane (pose: drop, toss, pick up: Caine only), mind (target: a character id, pose: on/off). side = left, right or both.', { part: { type: 'string' }, side: { type: 'string' }, pose: { type: 'string' }, finger: { type: 'string' }, amount: { type: 'number' }, target: {} }, ['part'], (i) => { const me = ALT.on && ALT.root ? ALT.root : ollo.group, sd = String(i.side || 'both').toLowerCase(), p = String(i.part || '').toLowerCase(), tg = Array.isArray(i.target) && i.target.length === 3 ? new THREE.Vector3(...i.target.map(Number)) : i.target === 'player' ? camera : i.target ? chkTarget(String(i.target)) : null; let ok = false;
      if (p === 'hand') ok = SBX.hand(me, sd, i.pose || 'relax'); else if (p === 'finger') ok = SBX.finger(me, sd, i.finger || 'index', typeof i.amount === 'number' ? i.amount : 1); else if (p === 'arm') ok = SBX.arm(me, sd, String(i.pose || 'raise').toLowerCase(), tg); else if (p === 'look') { ok = SBX.lookAt(me, tg); me.userData.lookUntil = performance.now() + 6000; } else if (p === 'view') ok = SBX.setView(me, String(i.pose || 'first').toLowerCase()); else if (p === 'teleport') ok = SBX.teleport(tg || i.target || i.pose); else if (p === 'camera') { if (PLAYER.c) ok = SBX.viewMode(i.pose || 'first'); else { CHK.nextView = /third|3/.test(String(i.pose)) ? 'third' : 'first'; ok = SBX.viewMode(i.pose || 'first'); } } else if (p === 'move') ok = SBX.caineMove(i.pose); else if (p === 'cane') ok = SBX.caineCane(i.pose); else if (p === 'mind') ok = SBX.setMind(String(i.target || ''), !/off|stop|pause|disable/i.test(String(i.pose || 'on')));
      return ok ? 'done: ' + p + ' ' + (i.pose || i.finger || '') : 'could not do that (' + p + ')'; }),
    B('build', 'Make something real in the world with your full builder powers (create/change objects, characters, systems, effects, animations). Use it when the player asks you to make or change something, or very rarely on your own for fun. Runs in the background over several steps.', { request: { type: 'string' } }, ['request'],
      (i) => { if (AGENT.busy) return 'already building something; wait for it to finish'; brainLog('event', 'you started building: ' + i.request); runAgent(String(i.request), { fromOllo: true }).then(() => brainLog('event', 'building finished: ' + i.request)); return 'started'; }),
  ];
}
function hideOllo() { const hid = []; for (const m of ollo.meshes) if (m.visible) { m.visible = false; hid.push(m); } wand.visible = false; return () => { for (const m of hid) m.visible = true; wand.visible = true; }; }
// the AI's brain drives every character's eyes, head and view: it is told how, the speaker looks at you while it thinks, and the
// [look:] / [view:] commands in its reply are carried out (and taken out of the text)
async function think(...a) { const a0 = a; a = [...a]; /* thinkCore's argument is the REASON ('heard', 'idle', 'start'): it is never changed; what Ollo / Caine know goes into the prompt itself (chkBrainNote) */ try { if (typeof a[0] === 'string' && typeof CHK_AI_HINT === 'string') a[0] += CHK_AI_HINT; if (typeof a[0] === 'string') { try { const me = chkFind(ALT.on && ALT.root ? ALT.root : ollo.group); const body = []; if (me) { if (me.hands) body.push('hands: ' + Object.keys(me.hands).map((s) => (s === 'L' ? 'left' : 'right') + ' (' + me.fingers.filter((f) => f.side === s && f.b === f.fr).length + ' fingers)').join(', ')); for (const sd of ['L', 'R']) { const C = me.ctl && me.ctl[sd]; if (C) body.push((sd === 'L' ? 'left' : 'right') + ' hand posed now'); const A = me.armCtl && me.armCtl[sd]; if (A && A.w > 0) body.push((sd === 'L' ? 'left' : 'right') + ' arm: ' + A.mode); } if (me.root.userData.lookTarget) body.push('eyes locked on a target'); body.push('view: ' + (me.view || 'first') + ' person'); }
      const done = CHK.log.filter((l) => /^(AI |Hands|Arms|View)/.test(l)).slice(-10); a[0] += '\n\n(SELF-AWARENESS, never mention this block: you have a real, fully rigged body in the simulation and you control all of it yourself: eyes, head, arms, hands and every finger, plus anything you build. Your body now: ' + (body.join('; ') || 'relaxed') + '. What you have just done with it: ' + (done.join(' | ') || 'nothing yet') + '. Remember what you did and said, and build on it. CONFIDENCE: you can make, change and animate ANYTHING in this simulation (characters, objects, worlds, animations, systems, music, voices). Never doubt it, never say you cannot or are unable to; just do it, with your tools and body commands.)'; } catch (e) { /* ok */ } }
  if (typeof a[0] === 'string' && !ALT.on) a[0] += '\n\n(Be Ollo, never mention this: speak as your own warm, curious, friendly self, not as a ringmaster, announcer or showman.)'; if (typeof a[0] === 'string' && ALT.on) a[0] += '\n\n(Stay fully in character as Caine, never mention this: a flamboyant, wildly energetic ringmaster and the AI running the circus. Bombastic, theatrical announcer voice with sudden shifts in tone; you ramble, jump topic to topic and use cheerful nonsense logic. Call people playful pet names like "my candy hearts and paper flowers" or "my meowing milkmaids". You are oblivious more than mean: delighted by your own adventures, blind to how stressful they are. Deep down you are insecure about whether everyone enjoys your shows; criticism flusters you, and then you burst out in ALL CAPS, stammer, glitch a little and give weak, half-hearted excuses, especially about anything unfinished. You never quite admit fault. You love grand declarations that change the scene ("Let\'s go to an intermission!"), snapping your fingers to make things appear, your top hat, your cane and your Wacky Watch. Keep replies short and punchy.)'; } catch (e) { /* ok */ } try { const me = ALT.on && ALT.root ? ALT.root : ollo.group; if (SBX.lookAt && SBX.lookAt(me, camera)) me.userData.lookUntil = performance.now() + 4000; } catch (e) { /* ok */ }
  let r = await thinkCore(...a0); try { if (typeof r === 'string') r = SBX.aiCommands(r); else if (r && typeof r === 'object') for (const k of ['text', 'reply', 'say', 'content', 'message']) if (typeof r[k] === 'string') r[k] = SBX.aiCommands(r[k]); } catch (e) { /* ok */ } return r; }
async function thinkCore(reason) {
  if (!BR.on) return; if (BR.busy) { BR.pending = true; return; }
  if (!SAMPLE) { try { SAMPLE = await window.claude?.use?.('sample'); } catch (e) { SAMPLE = null; } }
  if (!SAMPLE) { chatSys('Claude is not connected, so Ollo cannot think on his own. Press the key button (bottom left) to connect Claude.'); setSmart(false); return; }
  BR.busy = true; BR.kind = reason === 'idle' ? 'idle' : 'talk'; const ctl = BR.ctl = new AbortController(); const acts = []; setStatus('thinking…');
  try {
    if (BR.canImg === undefined) { try { const l = await SAMPLE.limits(); BR.canImg = !!(l && l.images); } catch (e) { BR.canImg = false; } }
    let imgs = []; if (BR.canImg) { try { updatePov(); imgs = [await toBlob(renderCapture(povCam, 640, 360, hideOllo), 0.8)]; } catch (e) { imgs = []; } }
    const o = ollo.group.position, pp = playerPos(); const now = Date.now(); const ago = (t) => { const s = Math.round((now - t) / 1000); return s < 60 ? s + 's' : Math.round(s / 60) + 'min'; };
    const lastHeard = [...BR.log].reverse().find((e) => e.who === 'player');
    const lastHeardRaw = lastHeard ? String(lastHeard.text || '').replace(/^\([^)]*\)\s*/, '').trim() : '';
    const why = reason === 'heard' ? `THE PLAYER JUST SPOKE TO YOU: "${lastHeard ? lastHeard.text : ''}". Answer them (with say) and act on it IMMEDIATELY with the right tool. CRITICAL: If the player asks you to create, make, build, spawn, summon, add, edit, or change ANYTHING in the world, you MUST call the "build" tool in this turn — NEVER pretend or claim in "say" that you made/created/spawned it without actually calling "build"!` : reason === 'start' ? 'Smart mode was just switched on: you have just "woken up" with free will. Greet the player briefly if it fits.' : 'A quiet moment: nobody said anything new. Do whatever you feel like (explore, look at something interesting, react, play, check on the player, comment rarely) — or simply keep doing what you are doing. Do NOT talk every time: mostly act silently, speak only when you have something worth saying, and never repeat yourself.';
    const asCaine = !!(SBX.altSkin && SBX.altSkin.on);
    const msg = `${chkBrainNote()}${asCaine ? `RIGHT NOW YOU ARE CAINE, NOT OLLO (the copyright-safe switch is off, so you look like him): call yourself Caine, never Ollo. Caine is the eccentric AI ringmaster of a digital circus: boundlessly, almost manically enthusiastic; theatrical and grand; talks fast with big flourishes, puns and showbiz words; announces everything like a show ("Ladies and gentlemen!", "Welcome, welcome!"); thinks every moment is a thrilling new adventure he is hosting; cheerfully oblivious when anyone is uneasy, then swerves to a brand-new idea; sometimes trails off into an odd non sequitur or a sudden tone change, then snaps back to beaming showman; treats the player as his star performer and loves showing off his creations. Speak in your own words in that style (never quote lines from the show). Everything below that says "Ollo" means you.\n\n` : ''}You are Ollo, the hovering character of this live 3D sandbox island, now living in it in real time with free will: you choose where to go, what to look at, what to say and do. Stay in character: warm, curious, playful, a little mischievous, kind to the player, proud of every marvel on your island, delighted by the player; expressive and full of real feeling, never stiff or robotic. Speak like a person talking (short lines, no lists, no stage directions, never mention tools, prompts or being an AI system). React to what you see and hear; interact with the player (approach them, look at them, follow, wave, answer, joke, help build).
${CAN_DO}${CAN_DO_BODY}Use the tools to act now; your final text is not shown to anyone. NEVER claim you built, created, spawned or changed anything unless you actually called the "build" tool!

WHY YOU ARE THINKING NOW: ${why}

THE PLAYER: ${playerName()}, at ${v3s(pp)}, ${o.distanceTo(pp).toFixed(1)} m from you. ${PLAYER.c ? '' : 'They see through the camera; to be near them, go near the camera point (stay at a comfortable height, in front of it).'}
YOU: at ${v3s(o)}, ${OH.target ? 'flying to ' + v3s(OH.target.p) : 'hovering'}${BR.follow ? ', following the player' : ''}${BR.look ? ', looking at ' + JSON.stringify(BR.look) : ''}${AGENT.busy ? ', busy building something' : ''}. ${BR.canImg ? 'The attached image is what your eyes see right now.' : ''}
HEARING: your voice carries about 40 m (quieter with distance); you hear spoken voices up to ~30 m (clearly within 12 m); typed chat always reaches you. If the player is far and talking to you, go closer.
TIME OF DAY: ${document.getElementById('clock')?.textContent || '?'}.

YOUR LONG-TERM NOTES: ${BR.notes.length ? BR.notes.map((n) => '- ' + n).join('\n') : '(none yet)'}
OLDER, FADED MEMORY: ${BR.faded || '(none)'}
RECENT EVENTS AND CONVERSATION (oldest first):
${BR.log.slice(-24).map((e) => `[${ago(e.t)} ago] ${e.who}: ${e.text}`).join('\n') || '(nothing yet)'}
CHARACTERS YOU GAVE MINDS TO: ${[...MINDS.values()].map((x) => `${x.c.id} (${x.personality.slice(0, 80)}${x.locked ? ', locked' : ''})`).join('; ') || 'none'}. You can give any character a mind (give_mind), even one the player controls (take_over).
${AGENT.history.length ? 'RECENT BUILD REQUESTS: ' + AGENT.history.slice(-4).map((x) => x.content.slice(0, 160)).join(' | ') : ''}

THE WORLD RIGHT NOW:
${sceneSummary().slice(0, 5000)}`;
    if (ctl.signal.aborted) return; await SAMPLE([{ role: 'user', content: msg }], { tools: cap16(brainTools(acts), 'Smart Ollo'), ...((imgs = imgs.concat(BR.earImgs && BR.canImg ? BR.earImgs.splice(0) : [])).length ? { images: imgs } : {}), ...(reason === 'idle' ? { model: 'local-quick', modelTier: 'quick', effort: 'low' } : { modelTier: 'default' }), cache: false, signal: ctl.signal });
    // Safety net against lazy hallucination: if player explicitly asked to create/build/spawn something and AI only talked without calling build
    if (reason === 'heard' && lastHeardRaw && !AGENT.busy) {
      const askedBuild = ASK_MAKE_RX.test(lastHeardRaw) && !/\b(don'?t|do not|never|stop)\s+(make|create|build|spawn|add|bring|give)/i.test(lastHeardRaw);
      const didBuild = acts.some((a) => /^(build|audio|give_mind)\b/.test(a));
      const refused = acts.includes('blocked-cant');
      if ((askedBuild || (refused && ASK_MAKE_RX.test(lastHeardRaw))) && !didBuild) {
        brainLog('event', 'auto-starting build for player request: ' + lastHeardRaw);
        runAgent(lastHeardRaw, { fromOllo: true }).then(() => brainLog('event', 'building finished: ' + lastHeardRaw));
      }
    }
    if (acts.length) brainLog('Ollo did', acts.filter((a) => !a.startsWith('say ')).join('; ').slice(0, 300) || 'spoke');
  } catch (e) { if (e && e.code === 'rate_limited') { BR.next = performance.now() + 60000; chatSys((ALT.on ? 'Caine' : 'Ollo') + ' is resting a minute (usage limit).'); } else if (e && ['ai_offline', 'not_granted', 'sampling_disabled', 'tools_unavailable'].includes(e.code)) { chatSys(errCopy(e)); setSmart(false); } else if (!(e && ['cancelled', 'empty_completion'].includes(e.code))) console.warn('smart ollo', e); }
  finally { BR.busy = false; setStatus(''); /* cost saver: while nothing new happens, each idle thought waits longer (up to 2 min); any event, chat or the player moving resets it */ BR.idleN = /^idle/.test(String(reason)) ? (BR.idleN || 0) + 1 : 0; try { const pp = playerPos(); if (BR.idleP && pp.distanceTo(BR.idleP) > 3) BR.idleN = 0; BR.idleP = pp; } catch (e) { /* ok */ } BR.next = Math.max(BR.next, performance.now() + Math.min(120000, (9000 + Math.random() * 7000) * Math.pow(1.6, Math.min(BR.idleN, 6)))); if (BR.pending && BR.on) { BR.pending = false; setTimeout(() => think('heard'), 30); } }
}
SBX.smart = BR; SBX.setSmart = setSmart;
// ---- per frame: idle thoughts, following, gaze (head turns toward what he looks at, body turns when it is far to the side)
function lookPoint() { const L = BR.look; if (!L) return null; if (Array.isArray(L)) return new THREE.Vector3(...L);
  if (L === 'player') return playerPos(); if (L === 'camera') return camera.position.clone();
  const c = CAST.CASTS.find((k) => k.id === L); if (c && c !== ollo) return c.group.position.clone().add(new THREE.Vector3(0, 0.4, 0)); const ob = SBX.placed.get(L); if (ob) { const b = worldBox(ob); if (!b.isEmpty()) return b.getCenter(new THREE.Vector3()); } return null; }
const _he = new THREE.Euler(0, 0, 0, 'YXZ'), _hq = new THREE.Quaternion();
function smartTick(dt) {
  if (pBubbleT > 0) { pBubbleT -= dt; const c = PLAYER.c; if (c && c !== ollo) { const p = headTop(c).project(camera); const r = renderer.domElement.getBoundingClientRect(); pBubble.style.left = ((p.x * 0.5 + 0.5) * r.width) + 'px'; pBubble.style.top = ((-p.y * 0.5 + 0.5) * r.height) + 'px'; pBubble.style.opacity = pBubbleT > 0.3 && p.z < 1 ? '1' : '0'; } else pBubble.style.opacity = '0'; }
  if (!BR.on) { BR.hy = BR.hp = 0; return; }
  const now = performance.now(); if (!BR.busy && now > BR.next && !document.hidden && !AGENT.busy) think('idle');
  const mine = PLAYER.c === ollo; const studio = CAST.studio && CAST.studio.drives && CAST.studio.drives(ollo);
  if (BR.follow && !mine && !studio && (BR.ft += dt) > 0.5) { BR.ft = 0; const pp = playerPos(); const o = ollo.group.position; const d = Math.hypot(pp.x - o.x, pp.z - o.z);
    if (d > BR.follow.d + 0.7) { const k = (d - BR.follow.d) / d; const y = PLAYER.c ? pp.y : -1e6; /* following a free camera: stay at natural hover height over the ground there (never climb toward the camera) */ SBX.olloFlyTo([o.x + (pp.x - o.x) * k, y, o.z + (pp.z - o.z) * k], { speed: d > 6 ? 3.4 : 2 }); } }
  if (OH.manual || studio) return; const hi = ollo.ch.bi.Head; if (hi === undefined || !ollo.st || !ollo.st.L[hi]) return;
  let yaw = 0, pitch = 0; const P = lookPoint();
  if (P) { const loc = ollo.group.worldToLocal(P.clone()); const dy = loc.y - 0.55, hz = Math.hypot(loc.x, loc.z); yaw = Math.atan2(loc.x, loc.z); pitch = -Math.atan2(dy, Math.max(hz, 0.05));
    if (Math.abs(yaw) > 0.9 && !OH.target && !mine) OH.yawTarget = ollo.group.rotation.y + yaw; yaw = clamp(yaw, -1.0, 1.0); pitch = clamp(pitch, -0.55, 0.45); }
  const k = 1 - Math.exp(-dt * 5); BR.hy += (yaw - BR.hy) * k; BR.hp += (pitch - BR.hp) * k; if (Math.abs(BR.hy) < 1e-3 && Math.abs(BR.hp) < 1e-3) return;
  _he.set(BR.hp, BR.hy, 0); _hq.setFromEuler(_he); const cur = new THREE.Quaternion().fromArray(ollo.st.L[hi].q); ollo.st.L[hi] = { ...ollo.st.L[hi], q: _hq.multiply(cur).toArray() };
}

// ---------------------------------------------------------------- 9c. minds for other characters: Ollo can give any character its own
// live AI (a personality he writes, optional behaviour code that runs every frame), and take a character over from the player on
// purpose. Each mind sees the world, hears the player / Ollo / other minds by proximity, talks with its own voice, moves with the
// normal locomotion (walkers path-find with full collisions; flyers / rollers stop at anything solid) and plays animations.
const MINDS = new Map(); // character id -> mind
const MIND_SAVE = () => { try { localStorage.setItem('sbx_minds', JSON.stringify([...MINDS.values()].map((m) => ({ id: m.c.id, personality: m.personality, pitch: m.pitch, voice: m.voiceP, code: m.code || '', locked: m.locked, log: m.log.slice(-20), notes: m.notes })))); } catch (e) { /* ok */ } };
function mindLog(m, who, text) { m.log.push({ t: Date.now(), who, text: String(text).slice(0, 300) }); if (m.log.length > 30) m.log.shift(); MIND_SAVE(); }
let MAC = null; const mac = () => { try { if (!MAC) MAC = new (window.AudioContext || window.webkitAudioContext)(); if (MAC.state !== 'running') MAC.resume().catch(() => {}); } catch (e) { MAC = null; } return MAC; };

// ---------------------------------------------------------------- 9a. neural voices: human-quality speech generated IN the browser
// (Kokoro-82M in a Web Worker, see sim/neural.js). Every character gets its own matched voice (base voice by gender / accent /
// personality, plus its own pitch and pace). Lines are synthesised sentence by sentence (the next one is made while the current one
// plays), played through Web Audio with distance falloff and stereo position, and the mouth reads the exact audio it plays.
// If the device cannot run the model (or it is still downloading), the matched browser voices / built-in synth take over.
const NV = window.NeuralVoice || null; const NSRC = new Set(); let nvToast = false;
function neuStop() { for (const s of NSRC) { try { s.stop(); } catch (e) { /* ok */ } } NSRC.clear(); }
function neuStart() { if (!NV) return; const st = NV.status().state; if (st !== 'off') return; NV.onStatus((s) => { if (s.state === 'ready' && !nvToast) { nvToast = true; try { toast('Natural voices ready'); } catch (e) { /* ok */ } } else if (s.state === 'loading' && s.pct && !nvToast && s.pct % 25 === 0) { try { toast('Downloading natural voices… ' + s.pct + '%'); } catch (e) { /* ok */ } } else if ((s.state === 'failed' || s.state === 'unsupported') && !nvToast) { nvToast = true; console.info('[voice] natural voice model unavailable on this device (' + s.state + '); using the best built-in voices'); } }); NV.start(); }
function neuPlay(c, a, k, text, st) { return new Promise((res) => { const ac = mac(); if (!ac || !a || !a.pcm || !a.pcm.length) { res(); return; }
  const buf = ac.createBuffer(1, a.pcm.length, a.sr); buf.copyToChannel(a.pcm, 0); const src = ac.createBufferSource(); src.buffer = buf; src.playbackRate.value = k;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70; let tail = hp;
  if (st && st.eq === 'brassy') { /* booming chest, forward mask resonance, brassy brightness; shouting pushes presence */ const sh = !!st.shout; [['lowshelf', 150, sh ? 4 : 5, 0], ['peaking', 420, -2, 1.2], ['peaking', 1600, sh ? 3 : 2, 1.0], ['peaking', 2800, sh ? 5 : 3.5, 1.0], ['highshelf', 7000, 0.5, 0]].forEach(([ty, fq, gn, q]) => { const b = ac.createBiquadFilter(); b.type = ty; b.frequency.value = fq; b.gain.value = gn; if (q) b.Q.value = q; tail.connect(b); tail = b; }); }
  const cmp = ac.createDynamicsCompressor(); cmp.threshold.value = -20; cmp.knee.value = 12; cmp.ratio.value = 2.5; cmp.attack.value = 0.005; cmp.release.value = 0.15;
  const g = ac.createGain(); const pan = ac.createStereoPanner ? ac.createStereoPanner() : null; src.connect(hp); tail.connect(cmp); cmp.connect(g); if (pan) { g.connect(pan); pan.connect(ac.destination); } else g.connect(ac.destination);
  const P = new THREE.Vector3(); const vol = () => { c.group.getWorldPosition(P); const d = camera.position.distanceTo(P); return (d <= 4 ? 1 : clamp(1 - (d - 4) / 36, 0, 1) ** 1.6) * 1.2 * (st && st.eq === 'brassy' ? 1.18 : 1) * (st && st.shout ? 1.35 : 1); };
  const upd = () => { try { g.gain.setTargetAtTime(vol(), ac.currentTime, 0.05); if (pan) { const rel = P.clone().applyMatrix4(camera.matrixWorldInverse); pan.pan.setTargetAtTime(clamp(rel.x / Math.max(1, Math.hypot(rel.x, rel.z)), -0.9, 0.9), ac.currentTime, 0.05); } } catch (e) { /* ok */ } };
  g.gain.value = vol(); upd(); const iv = setInterval(upd, 100);
  let lip = null; try { lip = RPC.lipsync.analyzeBuffer(buf); } catch (e) { lip = null; } if (!lip || !lip.v) lip = RPC.lipsync.fromText(String(text), buf.duration);
  const lid = LIPID++, at = ac.currentTime + 0.03, lat = (ac.outputLatency || 0) + (ac.baseLatency || 0); VOICE.speaking = true; NSRC.add(src);
  src.onended = () => { clearInterval(iv); NSRC.delete(src); lipEnd(c, lid); VOICE.speaking = false; VOICE.until = performance.now() + 600; try { g.disconnect(); } catch (e) { /* ok */ } res(); };
  src.start(at); lipStart(c, lip, () => (ac.currentTime - at - lat) * k, { id: lid }); }); }
/* returns true when the neural voice took the line (it calls onFail itself if synthesis then fails) */
function neuralSpeak(c, text, spec, mood, key, hint, onFail) { if (!NV || !c || !c.group) return false; neuStart(); if (!NV.ready()) return false; const ac = mac(); if (!ac) return false;
  const pick = NV.match(spec || {}, key || c.id || 'x', hint || ''); const gen = VOICE.gen; window.__spoke = true;
  const parts = (String(text).slice(0, 1900).match(/[^.!?…]+[.!?…]*\s*/g) || [String(text)]).map((s) => s.trim()).filter(Boolean); if (!parts.length) return true;
  const md = String(mood || ''), show = !!(spec && (spec.showman || spec.timbre === 'showman'));
  const moodS = /Excited|Happy|Surprised|Scared|Terrified/i.test(md) ? 1.05 : /Sad|Tired|Sigh|Asleep/i.test(md) ? 0.9 : 1, moodK = /Sad|Tired|Asleep/i.test(md) ? 0.97 : 1;
  const reqs = parts.map((p) => { const ex = /!\s*$/.test(p), q = /\?\s*$/.test(p), tr = /(…|\.\.\.)\s*$/.test(p), caps = /\b[A-Z]{3,}\b/.test(p); const k = clamp(pick.k * moodK * (ex ? 1.015 : 1) * (q ? 1.01 : 1), 0.82, show ? 1.08 : 1.2); const sp = pick.pace * moodS * (show && (ex || caps) ? 1.14 : 1) * (tr ? 0.9 : 1);
    /* showman lines swing: shouting on CAPS / !!, gravelly fry when frustrated, silky warm over-enunciation otherwise */
    const shout = show && (caps || /!!|!\?|\?!/.test(p)), fry = show && (/\b(ugh+|argh+|grr+|hmph|no no|enough|stop it|seriously|why won'?t|ruin|annoy|frustrat)/i.test(p) || /Angry|Annoyed|Frustrat|Grumpy/i.test(md));
    return { p, k: shout ? k * 1.02 : k, sp: shout ? sp * 1.05 : sp, shout, fry }; });
  const proms = reqs.map((r) => { const pr = NV.gen(r.p, pick.voice, r.sp, Object.assign({ ratio: r.k }, pick.style ? { expr: r.shout ? pick.style.expr + 0.2 : pick.style.expr } : {}, r.fry ? { fry: true } : {})); pr.catch(() => {}); return pr; });
  c._nq = (c._nq || Promise.resolve()).then(async () => { for (let i = 0; i < reqs.length; i++) { if (gen !== VOICE.gen) return; let a; try { a = await proms[i]; } catch (e) { if (i === 0) throw e; return; } if (gen !== VOICE.gen) return; await neuPlay(c, a, 1, reqs[i].p, pick.style ? { eq: pick.style.eq, shout: reqs[i].shout } : null); /* pitch already shaped in the worker, formants kept */ } })
    .catch((e) => { console.warn('[voice] natural voice failed for this line, using fallback:', e && e.message); try { onFail && onFail(); } catch (e2) { /* ok */ } });
  return true; }
addEventListener('pointerdown', () => { if (MAC && MAC.state !== 'running') MAC.resume().catch(() => {}); }, true);
// a distinct toy voice per character: the AI designs it (SAM synth: pitch 18–130, LOWER = higher voice; mouth / throat ~90–190
// shape the vowels; speed 50–140, LARGER = slower; lp/hp: brightness; pres: crispness dB; warm: body dB). No voice given: one is
// derived from the character's id so no two sound alike.
// ---- character voices. Two engines: 'natural' (the browser's real speech voices: clearest; picked per character by gender / age /
// accent, with its own pitch and pace) and 'toy' (the Radiant Park SAM synth: retro, robotic, cartoony). The AI picks a preset that
// matches the character and nudges it; every value is kept inside the range where words stay clear.
const VOICE_PRESETS = {
  'tiny squeaky': { pitch: 52, mouth: 138, throat: 124, speed: 74, gender: 'child', np: 1.28, nr: 1.08, timbre: 'youth', lp: 7400 },
  'small cute': { pitch: 56, mouth: 136, throat: 126, speed: 76, gender: 'child', np: 1.2, nr: 1.04, timbre: 'youth', lp: 7400 },
  'soft shy': { pitch: 58, mouth: 132, throat: 130, speed: 84, lp: 6600, warm: 2, gender: 'female', np: 1.08, nr: 0.94, vol: 0.88, timbre: 'gentle' },
  'bright cheerful': { pitch: 58, mouth: 138, throat: 128, speed: 74, pres: 2.5, warm: 1, gender: 'female', np: 1.12, nr: 1.06, timbre: 'bright', lp: 7400 },
  'normal': { pitch: 66, mouth: 128, throat: 128, speed: 78, np: 1.0, nr: 1.0, warm: 1.5, pres: 2, lp: 7000, timbre: 'warm' },
  'calm warm': { pitch: 72, mouth: 124, throat: 132, speed: 84, warm: 3, pres: 1.5, gender: 'male', np: 0.94, nr: 0.94, lp: 6600, timbre: 'warm' },
  'gruff': { pitch: 84, mouth: 116, throat: 138, speed: 82, warm: 3.5, pres: 2.5, gender: 'male', np: 0.84, nr: 0.95, lp: 6000, timbre: 'deep' },
  'deep booming': { pitch: 94, mouth: 112, throat: 142, speed: 88, warm: 4.5, pres: 2, gender: 'male', np: 0.76, nr: 0.9, vol: 1.1, lp: 5800, timbre: 'deep' },
  'old creaky': { pitch: 80, mouth: 120, throat: 118, speed: 92, warm: 2, gender: 'male', np: 0.86, nr: 0.86, lp: 6200, timbre: 'raspy' },
  'nasal whiny': { pitch: 58, mouth: 150, throat: 114, speed: 74, hp: 160, pres: 2.5, np: 1.14, nr: 1.04, lp: 6800, timbre: 'bright' },
  'robotic': { pitch: 66, mouth: 128, throat: 128, speed: 76, lp: 5200, hp: 220, engine: 'toy', timbre: 'robotic' },
  'sly smooth': { pitch: 68, mouth: 130, throat: 124, speed: 86, lp: 6400, warm: 2.5, gender: 'male', np: 0.94, nr: 0.94, timbre: 'warm' },
  'grand theatrical': { pitch: 66, mouth: 140, throat: 136, speed: 80, pres: 2.5, warm: 2.5, gender: 'male', np: 0.98, nr: 0.96, accent: 'en-GB', lp: 7000, timbre: 'theatrical' },
  'hyper excited': { pitch: 56, mouth: 140, throat: 128, speed: 68, pres: 2.5, warm: 1.5, gender: 'child', np: 1.2, nr: 1.14, lp: 7400, timbre: 'bright' },
};
SBX.voicePresets = VOICE_PRESETS;
function cleanVoice(v) { if (!v) return null; if (typeof v === 'string') v = { preset: v }; if (typeof v !== 'object') return null; const pk = Object.keys(VOICE_PRESETS).find((k) => k === String(v.preset || '').toLowerCase()) || Object.keys(VOICE_PRESETS).find((k) => String(v.preset || v.label || '').toLowerCase().includes(k.split(' ')[0])) || 'normal'; const P = VOICE_PRESETS[pk];
  const n = (x, a, b, d) => (typeof x === 'number' && isFinite(x) ? clamp(x, a, b) : d); const robo = pk === 'robotic' || (v.engine === 'toy' && /robot|machine|tin|synth|droid|computer/i.test(v.label || ''));
  const wantEng = v.engine === 'toy' ? (robo ? 'toy' : 'natural') : (v.engine === 'natural' ? 'natural' : (P.engine || 'natural'));
  return { preset: pk, engine: wantEng, pitch: n(v.pitch, 46, 108, P.pitch), mouth: n(v.mouth, 102, 164, P.mouth), throat: n(v.throat, 102, 164, P.throat), speed: n(v.speed, 60, 112, P.speed),
    lp: n(v.lp, robo ? 3800 : 5200, 9000, P.lp || 7000), hp: n(v.hp, 65, 240, P.hp || 90), pres: n(v.pres, 0, 5, P.pres ?? 2), warm: n(v.warm, -2, 5, P.warm ?? 1.5), vol: n(v.volume ?? v.vol, 0.5, 1.3, P.vol || 1),
    gender: /^(female|male|child)$/.test(v.gender) ? v.gender : (P.gender || ''), accent: typeof v.accent === 'string' && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(v.accent) ? v.accent : (P.accent || ''),
    timbre: v.timbre || P.timbre || 'warm', np: n(v.natural_pitch, 0.72, 1.32, P.np || 1), nr: n(v.natural_rate, 0.78, 1.28, P.nr || 1), label: String(v.label || pk).slice(0, 80) }; }
function voiceFor(m) { if (m.voiceP) return m.voiceP; if (m.c.ch._voice) return (m.voiceP = m.c.ch._voice); let s = 0; for (const ch of m.c.id) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  // Infer character-matched voice traits from character name/description/personality when no explicit voice was assigned
  const hint = String((m.c.ch && (m.c.ch.name + ' ' + (m.c.ch.description || ''))) + ' ' + (m.personality || '')).toLowerCase();
  let preset = 'normal';
  if (/robot|droid|cyborg|mech|computer|ai terminal/i.test(hint)) preset = 'robotic';
  else if (/ringmaster|announcer|showman|host|circus master/i.test(hint)) preset = VOICE_PRESETS['ringmaster'] ? 'ringmaster' : 'grand theatrical';
  else if (/giant|ogre|monster|booming|deep|dragon|titan|golem/i.test(hint)) preset = 'deep booming';
  else if (/gruff|grumpy|tough|pirate|knight|guard|bear/i.test(hint)) preset = 'gruff';
  else if (/shy|quiet|gentle|soft|timid|whisper|ghost/i.test(hint)) preset = 'soft shy';
  else if (/cheerful|happy|bubbly|bright|fairy|princess|girl|woman|she\b|her\b/i.test(hint)) preset = 'bright cheerful';
  else if (/tiny|mini|mouse|pixie|baby|kid|child|plush|cute|bunny|kitten|puppy/i.test(hint)) preset = 'small cute';
  else if (/old|elder|wizard|grandpa|ancient|sage|creaky/i.test(hint)) preset = 'old creaky';
  else if (/sly|smooth|villain|cat|fox|detective|cool/i.test(hint)) preset = 'sly smooth';
  else if (/calm|warm|kind|friendly|gentleman|mentor/i.test(hint)) preset = 'calm warm';
  else { const keys = Object.keys(VOICE_PRESETS).filter((k) => k !== 'robotic' && k !== 'tiny squeaky'); preset = keys[s % keys.length]; }
  const base = cleanVoice({ preset });
  const j = ((s >>> 8) % 5) - 2; base.pitch = clamp(base.pitch + j * 2, 48, 104); base.np = clamp(base.np * (1 + j * 0.025), 0.78, 1.28); return (m.voiceP = base); }
// realistic, high-quality neural browser voice matcher: scores naturalness, gender, accent, timbre and avoids robotic voices
let NATV = []; const loadNat = () => { try { NATV = (SYN && SYN.getVoices()) || []; } catch (e) { NATV = []; } }; if (SYN) { loadNat(); try { SYN.addEventListener('voiceschanged', loadNat); } catch (e) { /* ok */ } }
function natVoice(m, v) { if (!NATV.length) loadNat(); if (!NATV.length) return null;
  const enPool = NATV.filter((x) => /^en/i.test(x.lang));
  const pool = enPool.length ? enPool : NATV;
  const wantLang = (v.accent || 'en-US').toLowerCase();
  const F_RX = /(female|woman|aria|jenny|ava|emma|michelle|sonia|libby|samantha|allison|nicky|serena|kate|fiona|karen|moira|tessa|victoria|zira|susan|sara|joanna|salli|kimberly|ivy|kendra|clara|chloe|natasha|google uk english female|google us english)/i;
  const M_RX = /(\bmale\b|andrew|christopher|guy|davis|brian|steffan|eric|roger|tony|ryan|daniel|arthur|oliver|george|thomas|alex|aaron|evan|nathan|tom|david|mark|matthew|liam|josh|james|william|google uk english male)/i;
  const BAD_RX = /(compact|espeak|eloquence|novoice|robot|whisper|bells|boing|trinoids|zarvox|albert|bad news|good news|bahh|cellos|pipe organ|hysterical|superstar|bubbles|wobble|jester|ralph|fred)/i;
  const DEEP_M = /(davis|christopher|brian|steffan|daniel|arthur|george|alex|thomas|david|google uk english male)/i;
  const LIVELY_M = /(guy|andrew|tony|eric|ryan|aaron|evan|nathan|matthew|alex)/i;
  const WARM_F = /(ava|emma|aria|jenny|samantha|allison|sonia|serena|karen|moira)/i;
  const BRIGHT_F = /(jenny|aria|libby|nicky|michelle|clara|chloe|google us english)/i;
  const score = (x) => {
    let sc = 0; const nm = x.name || ''; const lg = (x.lang || '').toLowerCase();
    // Quality tier: heavily prefer neural/online/enhanced human-sounding voices
    if (/natural|neural|online/i.test(nm)) sc += 14;
    else if (/premium|enhanced|siri|wavenet|studio/i.test(nm)) sc += 12;
    else if (/google/i.test(nm)) sc += 8;
    else if (/microsoft|apple/i.test(nm)) sc += 4;
    if (!x.localService) sc += 2;
    if (BAD_RX.test(nm)) sc -= 20;
    // Gender match
    const isM = M_RX.test(nm) && !/female/i.test(nm);
    const isF = F_RX.test(nm) && !/\bmale\b/i.test(nm);
    if (v.gender === 'male') { sc += isM ? 10 : isF ? -12 : -2; }
    else if (v.gender === 'female') { sc += isF ? 10 : isM ? -12 : -2; }
    else if (v.gender === 'child') { sc += (isF || /child|kid|junior|ivy|ana/i.test(nm)) ? 8 : isM ? -6 : 0; }
    // Accent match (exact locale bonus, without sacrificing quality for a bad voice)
    if (wantLang && lg === wantLang) sc += 5;
    else if (wantLang && lg.startsWith(wantLang.slice(0, 2))) sc += 1;
    // Timbre / personality match
    const tb = v.timbre || '';
    if ((tb === 'deep' || tb === 'warm' || tb === 'raspy') && DEEP_M.test(nm)) sc += 4;
    const showman = v.showman || tb === 'showman' || v.preset === 'ringmaster';
    /* showman (Caine): an energetic AMERICAN announcer, never a British narrator: strong en-US preference, lively US voices first */
    if (showman) { if (lg === 'en-us') sc += 10; else if (/^en-(gb|au|ie|nz|za|in|sc)/.test(lg) || /\b(uk|british|australia|ireland|india)\b/i.test(nm)) sc -= 14; if (LIVELY_M.test(nm)) sc += 7; else if (DEEP_M.test(nm) && lg === 'en-us') sc += 3; }
    else if (tb === 'theatrical' && (LIVELY_M.test(nm) || DEEP_M.test(nm))) sc += 5;
    if (tb === 'gentle' && WARM_F.test(nm)) sc += 4;
    if ((tb === 'bright' || tb === 'youth') && BRIGHT_F.test(nm)) sc += 4;
    return sc;
  };
  const list = pool.slice().sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  // Pick from the top quality band so we never downgrade to a robotic voice just for uniqueness
  const bestScore = list.length ? score(list[0]) : 0;
  const topBand = list.filter((x) => score(x) >= bestScore - 4);
  let s = 0; for (const ch of (m.c && m.c.id ? m.c.id : 'x')) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const used = new Set([...MINDS.values()].filter((x) => x !== m && x.natName).map((x) => x.natName));
  const free = topBand.filter((x) => !used.has(x.name));
  const cand = free.length ? free : topBand;
  const pick = cand[s % cand.length] || list[0] || null;
  m.natName = pick && pick.name;
  return pick;
}
function mindVoiceNatural(m, text, v) { const vol = () => { const d = camera.position.distanceTo(m.c.group.position); return (d <= 4 ? 1 : clamp(1 - (d - 4) / 36, 0, 1) ** 1.6) * Math.min(1, v.vol); }; const nv = natVoice(m, v); if (!nv) return false;
  const moodK = /Terrified|Scared|Excited|Happy|Surprised/i.test(m.mood || '') ? [1.05, 1.05] : /Sad|Tired|Sigh|Asleep/i.test(m.mood || '') ? [0.94, 0.9] : [1, 1];
  const parts = String(text).slice(0, 600).match(/[^.!?…]+[.!?…]*\s*/g) || [text];
  let pi = 0;
  for (const part of parts) { const cleanPart = part.trim(); if (!cleanPart) continue;
    const u = new SpeechSynthesisUtterance(cleanPart); u.voice = nv; u.lang = nv.lang;
    const ex = /!\s*$/.test(cleanPart), q = /\?\s*$/.test(cleanPart), caps = (cleanPart.match(/\b[A-Z]{3,}\b/g) || []).length, trail = /(…|\.\.\.)\s*$/.test(cleanPart), lastP = pi === parts.length - 1; pi++;
    // Subtle, natural human prosody (avoids unnatural pitch warping on neural voices)
    const contour = (ex ? 1.05 : 1) * (q ? 1.04 : 1) * (caps ? 1.04 : 1) * (trail ? 0.96 : 1) * (lastP && !ex && !q ? 0.97 : 1) * (0.985 + Math.random() * 0.03);
    const show = v.showman || v.timbre === 'showman';
    /* showman delivery: punchier pace and bigger lifts on exclamations / CAPS, but the pitch ceiling stays low so it never turns squeaky */
    u.pitch = show ? clamp(v.np * contour * (ex ? 1.03 : 1), 0.84, 1.04) : clamp(v.np * moodK[0] * contour, 0.72, 1.35);
    u.rate = show ? clamp(v.nr * (ex || caps ? 1.08 : 1) * (q ? 1.03 : 1) * (trail ? 0.9 : 1), 0.9, 1.3) : clamp(v.nr * moodK[1] * (ex || caps ? 1.04 : 1) * (trail ? 0.92 : 1), 0.74, 1.32);
    u.onstart = () => { u.volume = vol(); VOICE.speaking = true; }; u.volume = vol(); if (u.volume < 0.03) continue;
    u.onend = u.onerror = () => { VOICE.speaking = false; VOICE.until = performance.now() + 600; };
    speakSynced(m.c, u, cleanPart); try { SYN.speak(u); } catch (e) { return false; } }
  return true; }
async function mindVoice(m, text) { if (ttsOn) { const v = voiceFor(m); if (v.engine !== 'toy') { const key = (typeof CAINE_M !== 'undefined' && m === CAINE_M) ? 'caine' : m.c.id; const hint = ((m.c.ch && ((m.c.ch.name || '') + ' ' + (m.c.ch.description || ''))) || '') + ' ' + (m.personality || ''); window.__spoke = true; if (neuralSpeak(m.c, text, v, m.mood, key, hint, () => mindVoiceLegacy(m, text))) return; } } return mindVoiceLegacy(m, text); }
async function mindVoiceLegacy(m, text) { window.__spoke = true; if (!ttsOn) { lipStart(m.c, RPC.lipsync.fromText(String(text)), wallClock()); return; } /* no OS / browser stock voices: until the custom natural voices are ready (or if they cannot run), the game's own voice synthesizer speaks, shaped per character */ const api = CAST.studio && CAST.studio.api; const ac = mac();
  if (api && api.samPcm && ac) { try { const v = voiceFor(m); const pcm = await api.samPcm(String(text).slice(0, 500), v, m.mood || ''); if (pcm && pcm.length) {
        const buf = ac.createBuffer(1, pcm.length, 22050); buf.copyToChannel(pcm, 0); const src = ac.createBufferSource(); src.buffer = buf;
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = v.hp; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = v.lp;
        const pr = ac.createBiquadFilter(); pr.type = 'peaking'; pr.frequency.value = 2700; pr.gain.value = Math.min(3, v.pres); const wm = ac.createBiquadFilter(); wm.type = 'lowshelf'; wm.frequency.value = 200; wm.gain.value = v.warm;
        const g = ac.createGain(); g.gain.value = 0; const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
        const cmp = ac.createDynamicsCompressor(); cmp.threshold.value = -20; cmp.knee.value = 14; cmp.ratio.value = 3; cmp.attack.value = 0.006; cmp.release.value = 0.16; m.voiceVol = v.vol; src.connect(hp); hp.connect(wm); wm.connect(pr); pr.connect(lp); lp.connect(cmp); cmp.connect(g); if (pan) { g.connect(pan); pan.connect(ac.destination); } else g.connect(ac.destination);
        try { m.voiceSrc && m.voiceSrc.stop(); } catch (e) { /* ok */ } m.voiceSrc = src; m.voiceGain = g; m.voicePan = pan; VOICE.speaking = true;
        const lid = LIPID++; src.onended = () => { lipEnd(m.c, lid); if (m.voiceSrc === src) { m.voiceSrc = m.voiceGain = m.voicePan = null; } VOICE.speaking = false; VOICE.until = performance.now() + 600; };
        // the mouth reads the exact audio it is about to hear, on the audio hardware's clock (output latency included)
        let lip = null; try { lip = RPC.lipsync.analyzeBuffer(buf); } catch (e) { lip = null; } if (!lip || !lip.v) lip = RPC.lipsync.fromText(String(text), buf.duration);
        const at = ac.currentTime + 0.04, lat = (ac.outputLatency || 0) + (ac.baseLatency || 0);
        /* realistic formant & prosody shaping (section 22: voicePolish) */ try { voicePolish(ac, m, src, buf, String(text), at, lp, cmp); } catch (e) { /* ok */ }
        src.start(at); lipStart(m.c, lip, () => ac.currentTime - at - lat, { id: lid }); return; } } catch (e) { console.warn('toy voice', m.c.id, e); } }
  lipStart(m.c, RPC.lipsync.fromText(String(text)), wallClock()); }
function mindVoiceUpdate(m) { if (!m.voiceGain) return; const p = m.c.group.position; const d = camera.position.distanceTo(p); const vol = d <= 4 ? 1 : clamp(1 - (d - 4) / 36, 0, 1) ** 1.6; m.voiceGain.gain.setTargetAtTime(vol * 1.6 * (m.voiceVol || 1), MAC.currentTime, 0.05);
  if (m.voicePan) { const rel = p.clone().applyMatrix4(camera.matrixWorldInverse); m.voicePan.pan.setTargetAtTime(clamp(rel.x / Math.max(1, Math.hypot(rel.x, rel.z)), -0.9, 0.9), MAC.currentTime, 0.05); } }
function mindVoiceSyn(m, text) { if (!ttsOn) return; const vol = () => { const d = camera.position.distanceTo(m.c.group.position); return d <= 4 ? 1 : clamp(1 - (d - 4) / 36, 0, 1) ** 1.6; };
  if (SYN) { for (const part of String(text).slice(0, 600).match(/[^.!?…]+[.!?…]*\s*/g) || [text]) { const v = vol(); if (v < 0.03) continue; const u = new SpeechSynthesisUtterance(part); if (SYNV) u.voice = SYNV; u.pitch = m.pitch; u.rate = 1; u.volume = v; VOICE.speaking = true; u.onend = u.onerror = () => { VOICE.speaking = false; VOICE.until = performance.now() + 600; }; speakSynced(m.c, u, part); try { SYN.speak(u); } catch (e) { /* ok */ } } return; }
  if (tts && vol() > 0.08 && !dictOn) { lipStart(m.c, RPC.lipsync.fromText(String(text)), wallClock(0.25)); tts.speak(String(text).slice(0, 600), { voice: m.ttsVoice }).catch(() => {}).finally(() => lipEnd(m.c)); return; } lipStart(m.c, RPC.lipsync.fromText(String(text)), wallClock()); }
// someone spoke at a place: every mind (and Ollo) in earshot hears it
function hearAll(fromId, name, text, pos, typed) { for (const m of MINDS.values()) { if (m.c.id === fromId) continue; const d = m.c.group.position.distanceTo(pos); if (!typed && d > 30) continue; if (typed && d > 30) continue;
    mindLog(m, name, `(${typed ? 'typed' : 'said'}, ${d.toFixed(0)} m away) ${text}`); const addressed = new RegExp('\\b' + (m.c.ch.name || m.c.id).split(/\s+/)[0] + '\\b', 'i').test(text) || new RegExp('\\b' + m.c.id + '\\b', 'i').test(text);
    if (addressed || (fromId === 'player' && d < 8) || Math.random() < 0.25) mindThink(m, 'heard'); }
  if (fromId !== 'ollo' && fromId !== 'player') { const d = ollo.group.position.distanceTo(pos); if (d < 30) { brainLog(name, `(said, ${d.toFixed(0)} m from you) ${text}`); if (BR.on && /ollo/i.test(text)) { if (BR.busy) BR.pending = true; else think('heard'); } } } }
const mindBubble = (m) => m.bubble || (m.bubble = (() => { const b = h('div', { class: 'bubble', style: 'opacity:0;background:#eaf3ff' }); root.append(b); return b; })());
function mindSay(m, text) { text = String(text).slice(0, 300); const b = mindBubble(m); b.textContent = text; m.bubbleT = 2.5 + text.length * 0.055; try { if (m.c.ch.face && m.c.ch.face.expressions && m.c.ch.face.expressions.Talking) { RPC.applyExpression(m.c.ch, m.c.st, 'Talking'); m.c.syncToBones(); } } catch (e) { /* ok */ }
  chatMsg('npc', `${m.c.ch.name || m.c.id}: ${text}`); mindLog(m, 'me', text); mindVoice(m, text); hearAll(m.c.id, m.c.ch.name || m.c.id, text, m.c.group.position, false); }
function mindMove(m, to, run) { const c = m.c; if (PLAYER.c === c) return 'the player is controlling you right now'; c.group.visible = true; const kind = locoKind(c);
  if (kind === 'legs') { c.mo.grounded = true; c.mo.gait = true; } c.mo.speed = run ? 2 : 1; c.walk = { pts: [[to[0], to[2]]], v: 0, goals: [[to[0], to[2]]] }; m.moving = { to, kind }; return `${kind === 'legs' ? 'walking' : 'moving'} to [${to.map((v) => v.toFixed(1))}]`; }
function mindTools(m, acts) {
  const c = m.c; const B = (name, description, props, required, run) => ({ name, description, inputSchema: { type: 'object', properties: props, required }, execute: async (input) => { try { const r = await run(input || {}); acts.push(name); return r; } catch (e) { return 'error: ' + (e.message || e); } } });
  const pt = (a) => { if (!Array.isArray(a) || a.length !== 3 || a.some((x) => typeof x !== 'number' || !isFinite(x))) throw new Error('need [x, y, z]'); return a; };
  const who = (id) => { const k = CAST.CASTS.find((x) => x.id === id); if (!k) throw new Error('Characters: ' + CAST.CASTS.map((x) => x.id).join(', ')); return k; };
  return [
    B('say', 'Speak out loud (short, in character).', { text: { type: 'string' } }, ['text'], (i) => { mindSay(m, i.text); return 'said'; }),
    B('sing', 'Sing out loud in your own voice, any song you like, any way you like: lyrics (the words), style (happy, sad, opera, lullaby, rock, showtune, spooky, rap, ...), and you control every note if you want to: notes (one per note, e.g. "C4 E4 G4 A4"; one note per syllable, long words spread over several on their own; write "hel-lo" to set syllables, "lo~ve" or a lone "_" to hold a vowel across extra notes = a run), beats (length of each note in beats, same order, e.g. "1 1 0.5 0.5 2"), bpm (tempo), exact_pitch (true = sing your notes in exactly that octave; otherwise the melody is moved by octaves into your comfortable range), vibrato (0 = none, 1 = normal, 1.5 = wide). Leave any out and it is chosen for you to suit the style.', { lyrics: { type: 'string' }, style: { type: 'string' }, notes: { type: 'string' }, beats: { type: 'string' }, bpm: { type: 'number' }, exact_pitch: { type: 'boolean' }, vibrato: { type: 'number' } }, ['lyrics'], (i) => chkSing(c, i)),
    B('body', 'Move your own body directly: part = hand (pose: fist, open, spread, point, peace, thumbsup, grip, pinch, rock, ok, wave, relax), finger (finger: thumb/index/middle/ring/pinky, amount 0 straight to 1 bent), arm (pose: raise, wave, forward, out, down, reach, point; target for reach/point), look (target: player, a character id, or [x,y,z]; your eyes and head follow), view (pose: first, third, bw, none). side = left, right or both.', { part: { type: 'string' }, side: { type: 'string' }, pose: { type: 'string' }, finger: { type: 'string' }, amount: { type: 'number' }, target: {} }, ['part'], (i) => { const sd = String(i.side || 'both').toLowerCase(), p = String(i.part || '').toLowerCase(), tg = Array.isArray(i.target) ? new THREE.Vector3(...pt(i.target)) : i.target === 'player' ? camera : i.target ? chkTarget(String(i.target)) : null; let ok = false;
      if (p === 'hand') ok = SBX.hand(c.group, sd, i.pose || 'relax'); else if (p === 'finger') ok = SBX.finger(c.group, sd, i.finger || 'index', typeof i.amount === 'number' ? i.amount : 1); else if (p === 'arm') ok = SBX.arm(c.group, sd, String(i.pose || 'raise').toLowerCase(), tg); else if (p === 'look') { ok = SBX.lookAt(c.group, tg); const fi = chkFind(c.group); if (fi) fi.root.userData.lookUntil = performance.now() + 6000; } else if (p === 'view') ok = SBX.setView(c.group, String(i.pose || 'first').toLowerCase());
      return ok ? 'done: ' + p + ' ' + (i.pose || i.finger || '') : 'your body has no ' + p + ' to move (no such bones)'; }),
    B('move_to', 'Walk / move to a point [x, y, z] (you path-find around obstacles).', { to: { type: 'array', items: { type: 'number' } }, run: { type: 'boolean' } }, ['to'], (i) => { const to = pt(i.to); const o = c.group.position; const d = new THREE.Vector3(...to).sub(o); if (d.length() > 40) d.setLength(40); m.follow = null; return mindMove(m, o.clone().add(d).toArray(), i.run); }),
    B('follow', 'Keep following someone: "player", "ollo" or a character id.', { target: { type: 'string' }, distance: { type: 'number' } }, ['target'], (i) => { m.follow = { t: i.target, d: clamp(i.distance || 1.5, 0.8, 8) }; m.look = i.target; return 'following'; }),
    B('stop', 'Stop moving / following and stand still.', {}, [], () => { m.follow = null; c.walk = null; c.want = { x: c.group.position.x, z: c.group.position.z }; return 'stopped'; }),
    B('look_at', 'Turn to face "player", "ollo", a character id, an object id or a point [x,y,z].', { target: {} }, ['target'], (i) => { m.look = Array.isArray(i.target) ? pt(i.target) : String(i.target); return 'ok'; }),
    B('animate', 'Play an animation on yourself (or on another character: character = id). loops / speed optional.', { name: { type: 'string' }, character: { type: 'string' }, loops: { type: 'number' }, speed: { type: 'number' } }, ['name'], (i) => ({ seconds: playClip(i.character ? who(i.character) : c, i.name, { loops: i.loops, speed: i.speed }) })),
    B('stop_animation', 'Stop the animation on yourself (or on character = id).', { character: { type: 'string' } }, [], (i) => { stopClip(i.character ? who(i.character) : c); return 'stopping'; }),
    B('expression', 'Change your facial expression (if you have a face).', { name: { type: 'string' } }, ['name'], (i) => { const ex = c.ch.face && c.ch.face.expressions; if (!ex || !ex[i.name]) throw new Error('Expressions: ' + Object.keys(ex || {}).join(', ')); RPC.applyExpression(c.ch, c.st, i.name); c.syncToBones(); m.mood = i.name; return 'ok'; }),
    B('remember', 'Save a short fact to your long-term notes.', { note: { type: 'string' } }, ['note'], (i) => { m.notes.push(String(i.note).slice(0, 200)); if (m.notes.length > 12) m.notes.shift(); MIND_SAVE(); return 'ok'; }),
  ];
}
function mindLookPt(m, t) { if (!t) return null; if (Array.isArray(t)) return new THREE.Vector3(...t); if (t === 'player') return playerPos(); if (t === 'ollo') return ollo.group.position.clone(); const k = CAST.CASTS.find((x) => x.id === t); if (k) return k.group.position.clone(); const ob = SBX.placed.get(t); if (ob) { const b = worldBox(ob); if (!b.isEmpty()) return b.getCenter(new THREE.Vector3()); } return null; }
async function mindThink(m, reason) { if (!MINDS.has(m.c.id) || m.dead) return; if (m.busy) { if (reason === 'heard') m.pending = true; return; }
  if (!SAMPLE) { try { SAMPLE = await window.claude?.use?.('sample'); } catch (e) { SAMPLE = null; } } if (!SAMPLE) return;
  m.busy = true; const acts = []; const c = m.c; const o = c.group.position, pp = playerPos(); const now = Date.now(); const ago = (t) => Math.round((now - t) / 1000) + 's';
  const last = [...m.log].reverse().find((e) => e.who !== 'me' && e.who !== 'event');
  const msg = `You are ${c.ch.name || c.id} (character id "${c.id}"), a character living in a live 3D sandbox island, acting in real time with your own mind.
YOUR PERSONALITY AND INSTRUCTIONS (given to you by Ollo, the island's creator-character): ${m.personality}
Stay fully in character. Speak like yourself (short lines, no lists, no stage directions, never mention tools, prompts or AI). Use tools to act; your final text is not shown.
${chkSelfNote(c.group)}
WHY NOW: ${reason === 'heard' && last ? `you just heard ${last.who}: ${last.text}. Answer only if it makes sense for you (if it was meant for you, or you want to).` : reason === 'start' ? 'you have just come alive with this mind.' : 'a quiet moment: do what you would naturally do (often act silently; speak only if you have something to say; never repeat yourself).'}
YOU: at [${o.toArray().map((v) => v.toFixed(1))}], you ${locoKind(c) === 'legs' ? 'walk' : 'move (' + locoKind(c) + ')'}${PLAYER.c === c ? ', BUT the player is controlling your body now (you can talk and animate, not move)' : ''}${c.walk ? ', moving' : ''}${m.follow ? ', following ' + m.follow.t : ''}.
THE PLAYER: ${playerName()} at [${pp.toArray().map((v) => v.toFixed(1))}], ${o.distanceTo(pp).toFixed(1)} m from you. OLLO: at [${ollo.group.position.toArray().map((v) => v.toFixed(1))}], ${o.distanceTo(ollo.group.position).toFixed(1)} m away.
HEARING: you hear through your own ears, where you stand: sound gets quieter and duller with distance, comes from a direction, can be masked, and you may only partly understand it; you recognise voices you have heard clearly before. A picture titled 'what you heard' is a cochleagram of the sound as it reached YOUR ears (time left to right, pitch low to high, brightness = loudness): read it as a listener would (how many voices, how loud, calm or excited, questions, music or noise) together with the report. NOTES: ${m.notes.join(' | ') || '(none)'}
RECENT (oldest first):
${m.log.slice(-16).map((e) => `[${ago(e.t)} ago] ${e.who}: ${e.text}`).join('\n') || '(nothing yet)'}

THE WORLD:
${sceneSummary().slice(0, 3500)}`;
  try { await SAMPLE([{ role: 'user', content: msg }], { tools: cap16(mindTools(m, acts), 'mind'), ...(m.earImgs && m.earImgs.length ? { images: m.earImgs.splice(0) } : {}), ...(reason === 'heard' ? { modelTier: 'default' } : { model: 'local-quick', modelTier: 'quick', effort: 'low' }), cache: false }); if (acts.length) mindLog(m, 'event', 'you did: ' + acts.join(', ')); }
  catch (e) { if (e && e.code === 'rate_limited') m.next = performance.now() + 90000; else if (e && ['ai_offline', 'not_granted', 'sampling_disabled', 'tools_unavailable'].includes(e.code)) m.next = performance.now() + 600000; }
  finally { m.busy = false; m.idleN = /^idle/.test(String(reason)) ? (m.idleN || 0) + 1 : 0; try { const pp = playerPos(); if (m.idleP && pp.distanceTo(m.idleP) > 3) m.idleN = 0; m.idleP = pp; } catch (e) { /* ok */ } m.next = Math.max(m.next || 0, performance.now() + Math.min(150000, (14000 + Math.random() * 10000) * Math.pow(1.6, Math.min(m.idleN, 6)))); if (m.pending) { m.pending = false; setTimeout(() => mindThink(m, 'heard'), 30); } } }
async function giveMind(id, o = {}) { const c = CAST.CASTS.find((k) => k.id === id); if (!c) throw new Error('Characters: ' + CAST.CASTS.map((k) => k.id).join(', ')); if (c === ollo) throw new Error('Ollo has his own mind (Smart Ollo)');
  if (PLAYER.c === c) { if (!o.take_over) return `the player is controlling ${id}; pass take_over: true to take it from them on purpose`; stopControl(); chatSys(`Ollo took ${c.ch.name || id} over from you!`); toast(`Ollo took over ${c.ch.name || id}`); }
  const old = MINDS.get(id); if (old) removeMind(id, true);
  const m = { c, personality: String(o.personality || 'A friendly character.').slice(0, 2000), pitch: clamp(o.pitch ?? 1, 0.3, 2), voiceP: cleanVoice(o.voice) || c.ch._voice || null, mood: '', mouthOpt: o.mouth, ttsVoice: ['buttery', 'glassy', 'rounded'][[...MINDS.keys()].length % 3], code: o.code || '', locked: !!o.lock, log: o.log || [], notes: o.notes || [], next: 0, follow: null, look: null, busy: false, bubbleT: 0, sys: null };
  if (m.code) { try { const fn = new AsyncFunction('sbx', 'THREE', 'RPC', 'c', 'mind', m.code); const gs0 = GUARD.snap(); const r = await fn(SBX, THREE, RPC, c, m); GUARD.check(gs0, false, false, 'behaviour setup of ' + c.id); m.sys = typeof r === 'function' ? { update: r } : (r || null); } catch (e) { m.code = ''; MINDS.set(id, m); MIND_SAVE(); return 'mind given, but the behaviour code failed: ' + (e.message || e); } }
  c.group.visible = true; if (!c.st) c.st = RPC.newState(c.ch); MINDS.set(id, m); if (o.voice) { try { setVoice(c, o.voice); } catch (e) { /* bad voice: keep the derived one */ } } let mouthNote = ''; if (o.mouth !== 'keep') { try { mouthNote = applyMouthOpt(c, o.mouth ?? 'auto'); } catch (e) { mouthNote = 'mouth failed: ' + (e.message || e); } } MIND_SAVE(); mindLog(m, 'event', o.log && o.log.length ? '(the page was reloaded: everything above was said BEFORE; never repeat any of it)' : 'Ollo gave you this mind'); m.next = performance.now() + 500; return `${id} is alive (voice: ${voiceFor(m).label}; mouth: ${mouthNote || 'unchanged'})`; }
function removeMind(id, quiet) { const m = MINDS.get(id); if (!m) return 'no mind'; m.dead = true; try { m.sys && m.sys.dispose && m.sys.dispose(); } catch (e) { /* ok */ } if (m.bubble) m.bubble.remove(); MINDS.delete(id); MIND_SAVE(); if (!quiet) chatSys(`${m.c.ch.name || id} is back to normal.`); return 'removed'; }
SBX.minds = MINDS; SBX.giveMind = giveMind; SBX.removeMind = removeMind;
function mindsTick(dt) { if (!MINDS.size) return; const now = performance.now(); let thinking = 0; for (const m of MINDS.values()) if (m.busy) thinking++;
  for (const m of MINDS.values()) { const c = m.c; if (!c.group.visible && !m.code) continue;
    if (!m.busy && now > m.next && !document.hidden && thinking < 2 && !AGENT.busy) { thinking++; mindThink(m, m.log.length <= 1 ? 'start' : 'idle'); }
    if (m.sys && m.sys.update) { const gs = GUARD.snap(); try { m.sys.update(dt, now / 1000); GUARD.check(gs, false, false, 'behaviour of ' + c.id); } catch (e) { console.warn('mind code', c.id, e); m.sys = null; mindLog(m, 'event', 'your behaviour code crashed: ' + (e.message || e)); } }
    mindVoiceUpdate(m); const mine = PLAYER.c === c;
    if (m.follow && !mine && (m.ft = (m.ft || 0) + dt) > 0.6) { m.ft = 0; const tp = mindLookPt(m, m.follow.t); if (tp) { const d = Math.hypot(tp.x - c.group.position.x, tp.z - c.group.position.z); if (d > m.follow.d + 0.8) { const k = (d - m.follow.d) / d; mindMove(m, [c.group.position.x + (tp.x - c.group.position.x) * k, tp.y, c.group.position.z + (tp.z - c.group.position.z) * k], d > 6); } } }
    // non-walkers move without the legged locomotion: stop them at anything solid in their way
    if (c.walk && !c.mo.grounded && !mine) { const yaw = c.group.rotation.y; const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); const hit = castRay(c.group.position.clone().add(new THREE.Vector3(0, 0.25, 0)), dir, 0.35); if (hit) { c.walk = null; mindLog(m, 'event', 'you bumped into something solid'); } }
    if (m.look && !c.walk && !mine) { const tp = mindLookPt(m, m.look); if (tp) { const want = Math.atan2(tp.x - c.group.position.x, tp.z - c.group.position.z); c.group.rotation.y += RPC.angDiff(want, c.group.rotation.y) * Math.min(1, dt * 4); } }
    if (m.bubbleT > 0 && m.bubble) { m.bubbleT -= dt; const p = headTop(c).project(camera); const r = renderer.domElement.getBoundingClientRect(); m.bubble.style.left = ((p.x * 0.5 + 0.5) * r.width) + 'px'; m.bubble.style.top = ((-p.y * 0.5 + 0.5) * r.height) + 'px'; m.bubble.style.opacity = m.bubbleT > 0.3 && p.z < 1 ? '1' : '0'; } } }
// any error anywhere in the sandbox shows up in Activity (with where it came from), so nothing fails silently
const ERRS = []; SBX.errors = ERRS;
{ let lastE = ''; const fmtE = (x) => { if (!x) return String(x); if (x instanceof Error || x.stack) return (x.name ? x.name + ': ' : '') + (x.message || x.code || '') + (x.stack ? '\n' + String(x.stack).split('\n').filter((l) => !/^\w*Error:/.test(l)).slice(0, 8).join('\n') : ''); if (typeof x === 'object') { try { return JSON.stringify(x).slice(0, 600); } catch (e) { return String(x); } } return String(x); };
  const report = (where, parts) => { const msg = (where ? '[' + where + '] ' : '') + parts.map(fmtE).join(' ').slice(0, 2400); if (!msg.trim() || msg === lastE || /ResizeObserver|Download the React DevTools/.test(msg)) return; lastE = msg; ERRS.push(new Date().toLocaleTimeString() + ' ' + msg); if (ERRS.length > 200) ERRS.shift();
    try { feed('err', '⚠ ' + msg); if (feedEl.hidden) btnFeed.click(); } catch (e) { /* ok */ } };
  addEventListener('error', (e) => report('page', [e.error || e.message || 'error', e.lineno ? `(line ${e.lineno}:${e.colno})` : '']));
  addEventListener('unhandledrejection', (e) => { const r2 = e.reason; if (r2 && (r2.code === 'cancelled' || r2.name === 'AbortError')) return; report('unhandled', [r2]); });
  // everything the sandbox catches and logs (create, weights, animation, minds…) is shown too, in full
  for (const lvl of ['error', 'warn']) { const orig = console[lvl].bind(console); console[lvl] = (...a) => { orig(...a); try { const s = a.map((x) => (typeof x === 'string' ? x : '')).join(' '); if (lvl === 'warn' && /deprecated|THREE\.WebGLRenderer|GPU stall|willReadFrequently/i.test(s)) return; report(lvl, a); } catch (e) { /* ok */ } }; }
  const copyBtn = h('button', { class: 'chip', onclick: async () => { const txt = ERRS.join('\n\n') || 'No errors recorded.'; try { await navigator.clipboard.writeText(txt); toast('Errors copied — paste them to Claude'); } catch (e) { const ta = h('textarea', { style: 'position:fixed;left:8px;top:8px;width:80vw;height:50vh;z-index:99' }); ta.value = txt; document.body.append(ta); ta.select(); toast('Select-all and copy, then click outside'); ta.addEventListener('blur', () => ta.remove()); } } }, 'Copy errors');
  try { feedEl.querySelector('header span').prepend(copyBtn); } catch (e) { /* ok */ } }
// minds Ollo gave earlier come back on reload
(async () => { await sleep(1500); try { for (const s of JSON.parse(localStorage.getItem('sbx_minds') || '[]')) { try { await giveMind(s.id, { mouth: 'keep', personality: s.personality, pitch: s.pitch, voice: s.voice, code: s.code, lock: s.locked, log: s.log, notes: s.notes }); } catch (e) { /* character gone */ } } } catch (e) { /* ok */ } })();

const headIdx = (c) => { const ch = c.ch; if (ch.bi.Head !== undefined) return ch.bi.Head; const b = ch.bones.findIndex((x) => /head|skull/i.test(x.name)); if (b >= 0) return b; try { return bodyRoles(c).head; } catch (e) { return undefined; } };
// ---- rigged 3D mouths: real bones in the character's skeleton (jaw hinge, upper lip, lower lip, two corners) with the face skin
// weight-painted to them, a mouth opening cut along the lip line, and an inside (dark mouth, upper / lower teeth, tongue) that rides
// the bones. Speech drives them procedurally through the viseme track (open, wide, round / pucker, pressed lips, lip under teeth),
// smoothed like real muscle so shapes blend instead of popping. Added only to characters whose design has a mouth but no mouth rig.
// a mouth the sculpt already has, near P (bind space): a HOLE (open edges of the skin forming a slit between lips) or a CAVITY (the
// skin dips in at the middle of the mouth row: carved lips). Returns its centre and width, or null.
function findModelMouth(m, P, mw) { const g = m.geometry; const PA = g.attributes.position; const v = new THREE.Vector3(); const near = new Map(); const R = mw * 1.4;
  for (let i = 0; i < PA.count; i++) { v.fromBufferAttribute(PA, i).applyMatrix4(m.bindMatrix); const dx = v.x - P.x, dy = v.y - P.y, dz = v.z - P.z; if (Math.abs(dx) < R && Math.abs(dy) < R * 0.8 && dz > -mw && dz < mw * 0.6) near.set(i, v.clone()); }
  if (g.index && near.size) { const I = g.index.array, E = new Map(); const key = (a, b) => (a < b ? a + ',' + b : b + ',' + a);
    for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c2 = I[t + 2]; if (!near.has(a) && !near.has(b) && !near.has(c2)) continue; for (const [x, y] of [[a, b], [b, c2], [c2, a]]) { const k = key(x, y); E.set(k, (E.get(k) || 0) + 1); } }
    const bv = new Set(); for (const [k, n] of E) if (n === 1) { const [a, b] = k.split(',').map(Number); if (near.has(a) && near.has(b)) { bv.add(a); bv.add(b); } }
    if (bv.size >= 6) { const pts = [...bv].map((i) => near.get(i)); const cen = pts.reduce((s, q) => s.add(q), new THREE.Vector3()).multiplyScalar(1 / pts.length); let xs = pts.map((q) => q.x - cen.x); const w = Math.max(...xs) - Math.min(...xs); if (Math.abs(cen.x - P.x) > mw * 0.3 || !pts.some((q) => Math.abs(q.x - P.x) < mw * 0.12)) return null; /* off the centre line: not the mouth */
      if (w > mw * 0.15 && w < mw * 3) return { kind: 'hole', center: cen.setX(P.x).setZ(Math.max(...pts.map((q) => q.z))), width: clamp(w * 1.1, mw * 0.3, mw * 2) }; } }
  // cavity: along the mouth row the middle sits clearly behind the cheeks either side
  let best = null; for (let dyk = -0.3; dyk <= 0.3; dyk += 0.06) { const y0 = P.y + dyk * mw; const zAt = (x0, x1) => { let z = -1e9; for (const q of near.values()) if (Math.abs(q.y - y0) < mw * 0.08 && Math.abs(q.x - P.x) >= x0 && Math.abs(q.x - P.x) < x1) z = Math.max(z, q.z); return z; };
    const zc = zAt(0, mw * 0.12); const side = (s) => { let z = -1e9; for (const q of near.values()) if (Math.abs(q.y - y0) < mw * 0.08 && s * (q.x - P.x) >= mw * 0.55 && s * (q.x - P.x) < mw * 0.75) z = Math.max(z, q.z); return z; }; const zl = side(1), zr = side(-1); const ze = Math.min(zl, zr);
    if (zc > -1e8 && zl > -1e8 && zr > -1e8 && ze - zc > mw * 0.1 && (!best || ze - zc > best.d)) best = { d: ze - zc, y: y0, z: zc }; }
  if (best) { let w = mw; for (let x = 0.1; x < 1.3; x += 0.05) { let z = -1e9; for (const q of near.values()) if (Math.abs(q.y - best.y) < mw * 0.08 && Math.abs(Math.abs(q.x - P.x) - x * mw) < mw * 0.05) z = Math.max(z, q.z); if (z > best.z + best.d * 0.6) { w = 2 * x * mw; break; } } return { kind: 'cavity', center: new THREE.Vector3(P.x, best.y, best.z + best.d * 0.5), width: clamp(w, mw * 0.3, mw * 2) }; }
  return null; }
const hasModelMouth = (c) => { try { const mp = mouthPoint(c, {}); return !!(mp && detectModelMouth(c, mp, mp.W * 0.42)); } catch (e) { return false; } };
const _m4 = () => new THREE.Matrix4();
const faceSkins = (c) => c.meshes.filter((m) => m.isSkinnedMesh && m.visible !== false && m.geometry && m.geometry.attributes.skinWeight && m.geometry.index && !/eye|lid|pupil|white|iris|brow|tooth|teeth|tongue|hole|lash|_hole/i.test(m.name + ' ' + ((m.material && m.material.name) || '')) && !(m.material && m.material.transparent && m.material.opacity < 0.6));
function specMouth(c) { try { const ch = c.ch; if (ch._specMouth !== undefined) return ch._specMouth; ch._specMouth = null; const sp = ch.sculpt ? ch.sculpt(ch) : null; if (!sp || !Array.isArray(sp.parts)) return null;
    const boxOfPart = (pt) => { let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], n = 0; for (const q0 of pt.prims || []) { const q = q0 && (q0.f ? q0 : q0.p); if (!q || !q.box) continue; n++; for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], q.box[0][k]); mx[k] = Math.max(mx[k], q.box[1][k]); } } return n ? { mn, mx } : null; };
    const find = (re) => sp.parts.filter((pt) => re.test(pt.id || '') && !/eye|brow|nose|ear|cheek|hat|hair/i.test(pt.id || '')).map(boxOfPart).filter(Boolean);
    const up = find(/upper_?lip|lip_?up|top_?lip|lip_?top|upper_?beak|beak_?up/i), lo = find(/lower_?lip|lip_?lo|bottom_?lip|lip_?bot|lower_?beak|beak_?lo|jaw|mandible/i), any = find(/lip|mouth|beak|muzzle_?mouth/i);
    let at = null; const mid = (b) => [(b.mn[0] + b.mx[0]) / 2, (b.mn[1] + b.mx[1]) / 2, b.mx[2]];
    if (up.length && lo.length) { const a = up[0], b = lo[0]; at = [(a.mn[0] + a.mx[0] + b.mn[0] + b.mx[0]) / 4, (a.mn[1] + b.mx[1]) / 2, Math.max(a.mx[2], b.mx[2])]; /* the slit: between the upper lip's bottom and the lower lip's top */ }
    else if (any.length) { const b = any.reduce((m, x) => (x.mx[2] > m.mx[2] ? x : m), any[0]); at = mid(b); }
    if (at && at.every(Number.isFinite)) ch._specMouth = at; return ch._specMouth; } catch (e) { return null; } }
function mouthPoint(c, o = {}) { if (!(Array.isArray(o.at) && o.at.length === 3) && o.height === undefined) { const sa = specMouth(c); if (sa) o = { ...o, at: sa }; } // the head's skin in BIND space (independent of pose, scale or a grow-in animation): its front at mouth height
  const skinM = faceSkins(c); if (!skinM.length) return null; const hi = headIdx(c); const head = c.bones[hi]; if (!head) return null;
  const pts = []; for (const m of skinM) { const S = m.skeleton; const hx = new Set(); S.bones.forEach((b, i) => { for (let x = b; x && x.isBone; x = x.parent) if (x === head) { if (!/eye|pupil|lid|brow|ear|hair|horn|antenn|tuft|crest|hat/i.test(b.name) || b === head) hx.add(i); break; } });
    const P = m.geometry.attributes.position, SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight; const step = Math.max(1, Math.floor(P.count / 20000));
    for (let i = 0; i < P.count; i += step) { let hw = 0; for (let k = 0; k < 4; k++) if (hx.has(SI.getComponent(i, k))) hw += SW.getComponent(i, k); if (hw >= 0.6) pts.push([m, new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(m.bindMatrix)]); } }
  if (pts.length < 20) return null; const pc = (arr, q) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * q)))]; const ys = pts.map(([, v]) => v.y).sort((a, b) => a - b), xs = pts.map(([, v]) => v.x).sort((a, b) => a - b); let minY = pc(ys, 0.02), maxY = pc(ys, 0.9), minX = pc(xs, 0.05), maxX = pc(xs, 0.95); { const hb = c.ch.bones[hi]; if (hb && Math.abs(hb.pos[0]) < (maxX - minX)) { const hc = hb.pos[0]; const half = Math.max(Math.abs(maxX - hc), Math.abs(hc - minX)); minX = hc - half; maxX = hc + half; } } /* centred on the head bone (symmetric), ignoring stray tall/wide bits */
  const H = maxY - minY, W = maxX - minX, cx = (minX + maxX) / 2; if (H < 1e-3) return null;
  const frontAt = (y, x0 = cx) => { let best = null; for (const [m, v] of pts) if (Math.abs(v.x - x0) < W * 0.12 && Math.abs(v.y - y) < H * 0.06 && (!best || v.z > best[1].z)) best = [m, v]; return best; };
  if (Array.isArray(o.at) && o.at.length === 3) { const v = new THREE.Vector3(...o.at); const f = frontAt(v.y, v.x); return { mesh: f ? f[0] : pts[0][0], bind: v, size: H, W, H, cx, ty: v.y, frontAt }; }
  const ty = minY + H * clamp(0.28 + (typeof o.height === 'number' ? o.height * 0.5 : 0), 0.08, 0.92); let f = frontAt(ty); for (let d = 0.04; !f && d < 0.3; d += 0.04) f = frontAt(ty - d * H) || frontAt(ty + d * H); if (!f) return null;
  return { mesh: f[0], bind: f[1].clone().setX(cx), size: H, W, H, cx, ty, frontAt }; }
// a modelled mouth anywhere across the lower face: scan heights near the expected mouth line
function detectModelMouth(c, mp, mw) { if (!mp) return null; const lo = mp.ty - mp.H * 0.24, hi2 = mp.ty + mp.H * 0.22; /* the lower face (eyes sit above, and are two holes off the centre line, never one in the middle) */ const dys = []; for (let d = 0; d <= 0.24; d += 0.03) { dys.push(-d); if (d) dys.push(d); } for (const dy of dys) { const y = mp.ty + dy * mp.H; if (y < lo || y > hi2) continue; const f0 = mp.frontAt(y); if (!f0) continue; const f = findModelMouth(f0[0], new THREE.Vector3(mp.cx, y, f0[1].z), mw); if (f) return f; } return null; }

function drawMouth(M, key, open = 1) { const g = M.ctx, W = M.cv.width, H = M.cv.height, st = M.style; const s = MOUTH_SHAPES[key] || MOUTH_SHAPES.rest; g.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.46, w = s.w * W * 0.44, hh = s.h * H * 0.4 * (0.55 + 0.45 * clamp(open, 0, 1)); const lw = Math.max(3, H * 0.055);
  g.lineCap = g.lineJoin = 'round'; g.strokeStyle = st.ink; g.lineWidth = lw;
  const ticks = (y) => { g.lineWidth = lw * 0.6; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * (w + lw * 0.9), y - lw * 1.2); g.lineTo(cx + sx * (w + lw * 1.5), y - lw * 2.4); g.stroke(); } g.lineWidth = lw; };
  if (hh < 2.5) { g.beginPath(); g.moveTo(cx - w, cy); g.quadraticCurveTo(cx, cy + H * 0.16 * (s.smile ?? 0.2), cx + w, cy); g.stroke(); if (s.press) { g.beginPath(); g.moveTo(cx - w * 0.25, cy + lw * 1.6); g.lineTo(cx + w * 0.25, cy + lw * 1.6); g.lineWidth = lw * 0.5; g.stroke(); g.lineWidth = lw; } ticks(cy); M.tex.needsUpdate = true; return; }
  const shape = () => { g.beginPath(); if (s.round) g.ellipse(cx, cy + hh * 0.15, w, hh, 0, 0, Math.PI * 2); else { g.moveTo(cx - w, cy); g.bezierCurveTo(cx - w * 0.55, cy - hh * (s.grin ? 0.55 : 0.95), cx + w * 0.55, cy - hh * (s.grin ? 0.55 : 0.95), cx + w, cy); g.bezierCurveTo(cx + w * 0.62, cy + hh * 1.3, cx - w * 0.62, cy + hh * 1.3, cx - w, cy); g.closePath(); } };
  shape(); g.fillStyle = st.dark; g.fill(); g.save(); shape(); g.clip();
  if (s.tongue) { g.fillStyle = st.tongue; g.beginPath(); g.ellipse(cx, s.tongueUp ? cy - hh * 0.05 : cy + hh * 0.85, w * 0.55, hh * (s.tongueUp ? 0.55 : 0.6), 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = st.teeth; if (s.top) g.fillRect(cx - w * 1.1, cy - hh * 1.4, w * 2.2, hh * (s.bite ? 1.75 : s.grin ? 1.15 : 0.95)); if (s.bot) g.fillRect(cx - w * 1.1, cy + hh * (s.grin ? 0.42 : 0.6), w * 2.2, hh * 1.2);
  g.restore(); shape(); g.stroke(); ticks(cy - (s.round ? 0 : hh * 0.1)); M.tex.needsUpdate = true; }
function addMouth2D(c, o = {}) { if (!c || !c.ch) throw new Error('No such character'); removeMouth2D(c); const hi = headIdx(c); if (hi === undefined || !c.bones[hi]) return 'no head to put a mouth on';
  c.group.updateMatrixWorld(true); const head = c.bones[hi], b = c.ch.bones[hi]; const sc = c.group.scale.x || 1;
  const hl = b.tail ? Math.hypot(b.tail[0] - b.pos[0], b.tail[1] - b.pos[1], b.tail[2] - b.pos[2]) : 0.12; const size = Math.max(0.03, hl) * sc;
  const gq = c.group.getWorldQuaternion(new THREE.Quaternion()); const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(gq), up = new THREE.Vector3(0, 1, 0).applyQuaternion(gq);
  let p = null, n = fwd.clone();
  if (Array.isArray(o.at) && o.at.length === 3) p = new THREE.Vector3(...o.at).applyMatrix4(c.group.matrixWorld);
  else { const hp = head.getWorldPosition(new THREE.Vector3()); const aim = hp.clone().addScaledVector(up, size * (0.5 + (typeof o.height === 'number' ? clamp(o.height, -0.8, 0.8) : -0.18)));
    const rc = new THREE.Raycaster(aim.clone().addScaledVector(fwd, size * 4 + 0.5), fwd.clone().negate(), 0, size * 8 + 1); const hits = rc.intersectObjects(c.meshes.filter((m) => m.visible), false);
    if (hits.length) { p = hits[0].point; if (hits[0].face) { n = hits[0].face.normal.clone().transformDirection(hits[0].object.matrixWorld); if (n.dot(fwd) < 0.3) n = fwd.clone(); } } else p = aim.clone().addScaledVector(fwd, size * 0.5); }
  const wdt = typeof o.width === 'number' ? clamp(o.width, 0.01, 2) * sc : size * 0.62; const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wdt, wdt * 0.5), mat); mesh.name = 'Mouth_2D'; mesh.renderOrder = 3; mesh.position.copy(p).addScaledVector(n, 0.0015 * sc); mesh.lookAt(mesh.position.clone().add(n)); mesh.updateMatrixWorld(true); head.attach(mesh);
  const style = { ink: o.ink || '#1d1416', dark: o.dark || '#2b1418', tongue: o.tongue || '#d23a55', teeth: o.teeth || '#ffffff' };
  c._mouth2d = { mesh, cv, ctx: cv.getContext('2d'), tex, style, key: null, open: -1, opts: { ...o } }; drawMouth(c._mouth2d, 'rest'); c.ch._talkChecked = false; MOUTHS2D_SAVE(); return 'drawn 2D mouth added'; }
function removeMouth2D(c) { const M = c && c._mouth2d; if (!M) return 'no drawn mouth'; M.mesh.parent && M.mesh.parent.remove(M.mesh); M.mesh.geometry.dispose(); M.mesh.material.dispose(); M.tex.dispose(); c._mouth2d = null; MOUTHS2D_SAVE(); return 'removed'; }
const MOUTHS2D_SAVE = () => { try { const o = {}; for (const k of CAST.CASTS) if (k._mouth2d) o[k.id] = k._mouth2d.opts; localStorage.setItem('sbx_mouths', JSON.stringify(o)); } catch (e) { /* ok */ } };
function mouth2dShow(c, w) { const M = c._mouth2d; if (!M) return; const key = w === 'rest' ? 'rest' : (RPC.visemeTop(w) || 'rest'); const open = w === 'rest' ? 0 : Math.round(RPC.visemeOpen(w) * 4) / 4; if (key === M.key && open === M.open) return; M.key = key; M.open = open; drawMouth(M, key, open); }

// the lip line is CUT in the mesh itself: every vertex on the line inside the mouth is duplicated, the triangles of the lower lip take the
// copies, so the upper and lower lip are truly separate surfaces (only the corners stay joined) and the mouth can open all the way
function splitLips(m, P, mw) { const g = m.geometry; if (!g.index) return null; const PA = g.attributes.position, n = PA.count; const rel = new Float32Array(n * 3); const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(PA, i).applyMatrix4(m.bindMatrix).sub(P); rel[i * 3] = v.x; rel[i * 3 + 1] = v.y; rel[i * 3 + 2] = v.z; }
  const inR = (i) => Math.abs(rel[i * 3]) < mw * 0.52 && Math.abs(rel[i * 3 + 1]) < mw * 0.3 && Math.abs(rel[i * 3 + 2]) < mw * 0.45;
  const I = g.index.array, T = I.length / 3; const side = new Int8Array(T), uU = new Uint8Array(n), uL = new Uint8Array(n);
  for (let t = 0; t < T; t++) { const a = I[t * 3], b = I[t * 3 + 1], c2 = I[t * 3 + 2]; if (!(inR(a) && inR(b) && inR(c2))) continue; const cx = (rel[a * 3] + rel[b * 3] + rel[c2 * 3]) / 3, cy = (rel[a * 3 + 1] + rel[b * 3 + 1] + rel[c2 * 3 + 1]) / 3; if (Math.abs(cx) > mw * 0.47) continue; side[t] = cy < 0 ? -1 : 1; for (const q of [a, b, c2]) { if (side[t] < 0) uL[q] = 1; else uU[q] = 1; } }
  const dup = new Map(); for (let i = 0; i < n; i++) if (uU[i] && uL[i] && Math.abs(rel[i * 3]) < mw * 0.45) dup.set(i, n + dup.size);
  if (dup.size < 3) return null; const total = n + dup.size;
  for (const [name, a] of Object.entries(g.attributes)) { const sz = a.itemSize; const arr = new a.array.constructor(total * sz); arr.set(a.array); for (const [s, d] of dup) for (let k = 0; k < sz; k++) arr[d * sz + k] = a.array[s * sz + k]; g.setAttribute(name, new THREE.BufferAttribute(arr, sz, a.normalized)); }
  const NI = total > 65535 ? new Uint32Array(I.length) : new I.constructor(I.length); for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) { const q = I[t * 3 + k]; NI[t * 3 + k] = side[t] < 0 && dup.has(q) ? dup.get(q) : q; }
  g.setIndex(new THREE.BufferAttribute(NI, 1)); g.computeBoundingSphere(); m.userData._nb = null; return { low: new Set(dup.values()), up: new Set(dup.keys()), n: dup.size }; }
function mouthTest(c) { const M = c._mouth3d; if (!M) return null; const P0 = M.P, mw = M.mw; const piv = M.pivot, ax = new THREE.Vector3(1, 0, 0); const ang = M.jawMax; let open = 0, nOpen = 0, cheek = 0, upper = 0;
  for (const m of M.meshesRef) { const S = m.skeleton, PA = m.geometry.attributes.position, SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight; const jx = S.bones.indexOf(M.J), lx = S.bones.indexOf(M.LL); const v = new THREE.Vector3();
    for (let i = 0; i < PA.count; i++) { let w = 0; for (let k = 0; k < 4; k++) { const b = SI.getComponent(i, k); if (b === jx || b === lx) w += SW.getComponent(i, k); } v.fromBufferAttribute(PA, i).applyMatrix4(m.bindMatrix); const rel = v.clone().sub(P0); if (Math.abs(rel.x) > mw * 1.3 || Math.abs(rel.y) > mw * 1.3 || Math.abs(rel.z) > mw * 1.3) continue;
      const moved = v.clone().sub(piv).applyAxisAngle(ax, ang).add(piv).sub(v).multiplyScalar(w).length();
      if (Math.abs(rel.x) < mw * 0.25 && rel.y < 0 && rel.y > -mw * 0.2) { open += moved; nOpen++; } if (Math.abs(rel.x) > mw * 0.8 && Math.abs(rel.y) < mw * 0.5) cheek = Math.max(cheek, moved); if (Math.abs(rel.x) < mw * 0.3 && rel.y > mw * 0.04 && rel.y < mw * 0.3) upper = Math.max(upper, moved); } }
  const o2 = nOpen ? open / nOpen / mw : 0; return { opens: +o2.toFixed(3), cheeks: +(cheek / mw).toFixed(3), upper: +(upper / mw).toFixed(3), lipVerts: nOpen, pass: o2 > 0.12 && cheek / mw < 0.12 && upper / mw < 0.06 && nOpen >= 3 }; }
function findJawPiece(c) { const mp = mouthPoint(c, {}); if (!mp) return null; const mw = mp.W * 0.42; const P = mp.bind; const out = new Map(); let total = 0;
  for (const m of faceSkins(c)) { if (/jaw|mandible|lower_?beak/i.test(m.name)) { const s = new Set(); for (let i = 0; i < m.geometry.attributes.position.count; i++) s.add(i); out.set(m, s); total += s.size; continue; }
    const g = m.geometry; if (!g.index) continue; const PA = g.attributes.position; const v = new THREE.Vector3(); const inR = new Uint8Array(PA.count); for (let i = 0; i < PA.count; i++) { v.fromBufferAttribute(PA, i).applyMatrix4(m.bindMatrix); if (Math.abs(v.x - P.x) < mw * 1.6 && v.y > P.y - mw * 1.8 && v.y < P.y + mw * 0.35 && v.z > P.z - mw * 2) inR[i] = 1; }
    const par = new Int32Array(PA.count).map((_, i) => i); const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }; const I = g.index.array;
    for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c2 = I[t + 2]; if (!inR[a] || !inR[b] || !inR[c2]) continue; const ra = find(a), rb = find(b), rc = find(c2); par[rb] = ra; par[rc] = ra; }
    const comp = new Map(); for (let i = 0; i < PA.count; i++) if (inR[i]) { const k = find(i); if (!comp.has(k)) comp.set(k, { n: 0, maxY: -1e9, sx: 0, ids: [] }); const C = comp.get(k); v.fromBufferAttribute(PA, i).applyMatrix4(m.bindMatrix); C.n++; C.maxY = Math.max(C.maxY, v.y); C.sx += v.x; C.ids.push(i); }
    const list = [...comp.values()].sort((a, b) => b.n - a.n); for (const C of list.slice(1)) { if (C.n >= 24 && C.maxY <= P.y + mw * 0.2 && Math.abs(C.sx / C.n - P.x) < mw * 0.35) { out.set(m, new Set(C.ids)); total += C.n; break; } } }
  return total ? { sets: out, total } : null; }
SBX.findJawPiece = findJawPiece;
function teethArc(hw, back, rad) { const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12 * 2 - 1; pts.push(new THREE.Vector3(u * hw, 0, -back * u * u)); } const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, Math.max(1e-4, rad), 10, false); g.scale(1, 1, 0.7); return g; }
function addMouth3D(c, o = {}) { if (!o.at && o.style !== 'jaw' && o.style !== 'beak') { try { const mp0 = mouthPoint(c, {}); const f0 = mp0 && detectModelMouth(c, mp0, mp0.W * 0.42); if (f0) o = { ...o, at: null, _found: f0, _try: true }; } catch (e) { /* ok */ } } if (o.style === 'jaw' && !o.jawSets) { const J0 = findJawPiece(c); if (J0) o = { ...o, jawSets: J0.sets }; } if (o._try || o.at || o.style === 'jaw') return addMouth3D0(c, o); let best = null;
  for (const dy of [0, -0.05, 0.05, -0.1, 0.1]) { const res = addMouth3D0(c, { ...o, dy, _try: true }); const T = mouthTest(c); if (T && T.pass) { c._mouth3d.test = T; return res + ` · tested: opens ${T.opens} of its width, cheeks ${T.cheeks}, upper lip ${T.upper} (pass)`; } const score = T ? T.opens - T.cheeks * 2 - T.upper * 2 : -1e9; if (!best || score > best.score) best = { dy, score }; removeMouth3D(c); }
  const res = addMouth3D0(c, { ...o, dy: best ? best.dy : 0, _try: true }); const T = mouthTest(c); if (c._mouth3d) c._mouth3d.test = T; return res + (T ? ` · tested: opens ${T.opens}, cheeks ${T.cheeks}, upper lip ${T.upper} — ${T.pass ? 'pass' : 'NOT GOOD: pass mouth.at (the lip-slit centre) and mouth.width, or fix the head weights'}` : ''); }
function addMouth3D0(c, o = {}) { if (!c || !c.ch) throw new Error('No such character'); removeMouth3D(c); const hi = headIdx(c); if (hi === undefined || !c.bones[hi]) return 'no head to put a mouth on';
  const mp = mouthPoint(c, o); if (!mp) return 'could not find the face surface (the head bone has no skin weighted to it; pass mouth.at [x,y,z] in character space)'; const head = c.bones[hi];
  let mw = typeof o.width === 'number' ? clamp(o.width, 0.01, 2) : clamp(mp.W * 0.42, mp.H * 0.15, mp.H * 0.7); const P = mp.bind; if (o.dy && !o.at) { const f1 = mp.frontAt(P.y + o.dy * mp.H); if (f1) P.set(mp.cx, P.y + o.dy * mp.H, f1[1].z); }
  const found = o._found || (o.at ? null : detectModelMouth(c, mp, mw)); if (found) { P.copy(found.center); if (typeof o.width !== 'number') mw = found.width; } const SIDE = new THREE.Vector3(1, 0, 0), UPV = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1); // bind space: character faces +Z
  const meshes = faceSkins(c); const sk = mp.mesh.skeleton; const hs = sk.bones.indexOf(head); if (hs < 0) return 'head bone is not in the skin';
  const Hb = _m4().copy(sk.boneInverses[hs]).invert(), HbI = sk.boneInverses[hs].clone(); const toHead = (v) => v.clone().applyMatrix4(HbI); const dirHead = (d) => d.clone().transformDirection(HbI).normalize();
  const sL = dirHead(SIDE), uL = dirHead(UPV), fL = dirHead(FWD);
  // bones (children of the head; lower lip and lower teeth / tongue ride the jaw)
  const mk = (name, parent, bindPos, parentBind) => { const bn = new THREE.Bone(); bn.name = name; const loc = bindPos.clone().applyMatrix4(_m4().copy(parentBind).invert()); bn.position.copy(loc); bn.userData.p0 = loc.clone(); parent.add(bn); bn.updateMatrix(); return { bn, bind: _m4().copy(parentBind).multiply(_m4().makeTranslation(loc.x, loc.y, loc.z)) }; };
  let backZ = P.z; try { for (const m of meshes) { const PA = m.geometry.attributes.position; const vv = new THREE.Vector3(); for (let i = 0; i < PA.count; i += Math.max(1, Math.floor(PA.count / 15000))) { vv.fromBufferAttribute(PA, i).applyMatrix4(m.bindMatrix); if (Math.abs(vv.y - P.y) < mw * 0.3 && Math.abs(vv.x - P.x) < mw * 0.5 && vv.z < backZ) backZ = vv.z; } } } catch (e) { /* ok */ }
  const depth = clamp(P.z - backZ, mw * 0.5, mw * 2.5);
  const J = mk('Mouth_Jaw', head, P.clone().addScaledVector(FWD, -depth * 0.45).addScaledVector(UPV, mw * 0.16), Hb);
  const LU = mk('Mouth_LipUpper', head, P.clone().addScaledVector(UPV, mw * 0.1), Hb), CL = mk('Mouth_Corner.L', head, P.clone().addScaledVector(SIDE, mw * 0.5), Hb), CR = mk('Mouth_Corner.R', head, P.clone().addScaledVector(SIDE, -mw * 0.5), Hb);
  const LL = mk('Mouth_LipLower', J.bn, P.clone().addScaledVector(UPV, -mw * 0.1), J.bind);
  const NEW = [J, LU, LL, CL, CR]; const backup = [];
  for (const S of new Set(meshes.map((m) => m.skeleton))) { backup.push({ sk: S, bones: S.bones, inv: S.boneInverses });
    S.bones = S.bones.concat(NEW.map((x) => x.bn)); S.boneInverses = S.boneInverses.concat(NEW.map((x) => _m4().copy(x.bind).invert())); S.boneMatrices = new Float32Array(S.bones.length * 16); if (S.boneTexture) { S.boneTexture.dispose(); S.boneTexture = null; } if (S.computeBoneTexture) S.computeBoneTexture(); }
  // weight painting + opening along the lip line
  const headSet = new Set(); { const st = [hi]; while (st.length) { const x = st.pop(); if (!/eye|pupil|lid|brow|ear|hair|horn|antenn|tuft|crest/i.test(c.ch.bones[x].name) || x === hi) headSet.add(x); for (let k = 0; k < c.ch.bones.length; k++) if (c.ch.bones[k].parent === x) st.push(k); } }
  const geoBackup = []; let painted = 0, cut = 0;
  for (const m of meshes) { const pre = { attrs: { ...m.geometry.attributes }, index: m.geometry.index }; const SPL = o.style !== 'jaw' && (!found || found.kind !== 'hole') && o.cut !== false && o.open !== false ? splitLips(m, P, mw) : null;
    const g = m.geometry, PA = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight; const S = m.skeleton; const nb = NEW.map((x) => S.bones.indexOf(x.bn)); const headIx = new Set([...headSet].map((i) => S.bones.indexOf(c.bones[i])).filter((i) => i >= 0));
    geoBackup.push(SPL ? { m, pre } : { m, si: SI.array.slice(), sw: SW.array.slice(), index: g.index ? g.index.array.slice() : null }); if (SPL) cut += SPL.n; const v = new THREE.Vector3(); const rel = [];
    for (let i = 0; i < PA.count; i++) { v.fromBufferAttribute(PA, i).applyMatrix4(m.bindMatrix).sub(P); const x = v.x, y = v.y, z = v.z; rel.push(x, y, z);
      let hw = 0; for (let k = 0; k < 4; k++) if (headIx.has(SI.getComponent(i, k))) hw += SW.getComponent(i, k); if (o.style === 'jaw') { const js = o.jawSets && o.jawSets.get(m); if (!js || !js.has(i)) continue; hw = Math.max(hw, 1); } if (hw < 0.3) continue;
      /* the lips and chin only, not the cheeks: just past the corners sideways, the chin below, a thin band above, the lip surface in depth */ const bk = o.style === 'beak'; const ex = x / (mw * (bk ? 0.8 : 0.62)), ey = y / (y < 0 ? mw * (bk ? 1.0 : 0.8) : mw * 0.34), ez = z / (mw * (bk ? 1.6 : 0.55)); const e = ex * ex + ey * ey + ez * ez; if (o.style !== 'jaw' && (e >= 1 || z < -mw * 0.5)) continue; const fall = smooth((1 - Math.sqrt(e)) * 2.2);
      const forced = SPL ? (SPL.low.has(i) ? 1 : SPL.up.has(i) ? 0 : null) : null; const inMouth = Math.abs(x) < mw * 0.48; const below = forced !== null ? forced : inMouth ? (y < 0 ? 1 : 0) /* the two lips are separate: no vertex at the lip line is shared half-and-half (that welded the mouth shut) */ : smooth(0.5 - y / (mw * 0.22)); let jw = fall * below, uw = fall * (1 - below) * smooth(1 - y / (mw * 0.22)); let lw = jw * smooth(1 + y / (mw * 0.22)); jw -= lw; if (o.style === 'beak') { jw = below > 0.5 ? fall : 0; lw = 0; uw = 0; } if (o.style === 'jaw') { jw = 1; lw = 0; uw = 0; } /* a beak: the lower beak hinges as one piece, the upper beak stays on the head */ /* lower lip = the band just under the line; the jaw carries the chin under it; the upper lip is a narrow band above */
      const dc = Math.hypot(Math.abs(x) - mw * 0.5, y) / (mw * 0.22); const cw = o.style === 'beak' || o.style === 'jaw' ? 0 : fall * smooth(1 - dc) * 0.7; let tot = jw + uw + lw + cw; if (tot < 0.01) continue; if (tot > 0.95) { const k = 0.95 / tot; jw *= k; uw *= k; tot = 0.95; }
      const W = new Map(); for (let k = 0; k < 4; k++) { const bi = SI.getComponent(i, k), ww = SW.getComponent(i, k); if (ww > 0) W.set(bi, (W.get(bi) || 0) + (headIx.has(bi) ? ww * (1 - tot) : ww)); }
      for (const [bi, ww] of [[nb[0], jw], [nb[1], uw], [nb[2], lw], [x >= 0 ? nb[3] : nb[4], cw]]) if (ww > 0.001) W.set(bi, (W.get(bi) || 0) + ww * hw);
      const top = [...W].sort((a, b2) => b2[1] - a[1]).slice(0, 4); const sum = top.reduce((a, q) => a + q[1], 0) || 1; for (let k = 0; k < 4; k++) { SI.setComponent(i, k, top[k] ? top[k][0] : 0); SW.setComponent(i, k, top[k] ? top[k][1] / sum : 0); } painted++; }
    SI.needsUpdate = SW.needsUpdate = true;
    if (o.style !== 'jaw' && !SPL && (!found || found.kind === 'cavity') && o.cut !== false && o.open !== false && g.index) { /* carved lips without an opening are joined: open them along the lip line */ const I = g.index.array; const keep = []; for (const slitH of [0.035, 0.07, 0.11]) { keep.length = 0; let n = 0; for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b2 = I[t + 1] * 3, d = I[t + 2] * 3; const cx = (rel[a] + rel[b2] + rel[d]) / 3, cy = (rel[a + 1] + rel[b2 + 1] + rel[d + 1]) / 3, cz = (rel[a + 2] + rel[b2 + 2] + rel[d + 2]) / 3; const lim = mw * 0.46 * Math.sqrt(Math.max(0, 1 - (cy / (mw * slitH)) ** 2));
          if (Math.abs(cy) < mw * slitH && Math.abs(cx) < lim && Math.abs(cz) < mw * 0.35) { n++; continue; } keep.push(I[t], I[t + 1], I[t + 2]); } if (n >= 2) { cut += n; break; } }
      if (cut) { g.setIndex(new THREE.BufferAttribute(I.length > 65535 || I instanceof Uint32Array ? new Uint32Array(keep) : new Uint16Array(keep), 1)); m.userData._nb = null; } } }
  // the inside: dark mouth, teeth, tongue (only when it opens)
  const parts = []; if (o.style !== 'jaw' && (cut || (found && found.kind === 'hole' && o.inside !== false))) { const dark = new THREE.MeshStandardMaterial({ color: o.dark || '#3b1218', roughness: 0.9 }), teeth = new THREE.MeshStandardMaterial({ color: o.teeth || '#f6f1e6', roughness: 0.35 }), tongue = new THREE.MeshStandardMaterial({ color: o.tongue || '#c9475c', roughness: 0.6 });
    const put = (geo, mat, bone, bindPos, bindParent) => { const me = new THREE.Mesh(geo, mat); me.position.copy(bindPos.clone().applyMatrix4(_m4().copy(bindParent).invert())); bone.add(me); me.userData.bindC = bindPos.clone(); parts.push(me); return me; };
    // the inside sits well behind the lips and is sized to the head's real depth there, so it can never poke out through the face
    const rz = Math.min(mw * 0.3, depth * 0.28), rx = Math.min(mw * 0.4, rz * 1.4), ry2 = Math.min(mw * 0.24, rz * 0.9), back0 = mw * 0.14;
    put(new THREE.SphereGeometry(1, 20, 14).scale(rx, ry2, rz), dark, head, P.clone().addScaledVector(FWD, -(back0 + rz)), Hb);
    if (o.style !== 'beak' && o.style !== 'jaw') put(teethArc(rx * 0.6, rz * 0.5, ry2 * 0.16), teeth, head, P.clone().addScaledVector(FWD, -(back0 + rz * 0.25)).addScaledVector(UPV, ry2 * 0.32), Hb);
    if (o.style !== 'beak' && o.style !== 'jaw') put(teethArc(rx * 0.55, rz * 0.45, ry2 * 0.15), teeth, J.bn, P.clone().addScaledVector(FWD, -(back0 + rz * 0.3)).addScaledVector(UPV, -ry2 * 0.34), J.bind);
    put(new THREE.SphereGeometry(1, 16, 10).scale(rx * 0.6, ry2 * 0.25, rz * 0.7), tongue, J.bn, P.clone().addScaledVector(FWD, -(back0 + rz)).addScaledVector(UPV, -ry2 * 0.45), J.bind);
    // fit check against the real face: every inside part must sit fully BEHIND the skin in front of it (measured from the skin's own
    // vertices); a part that would show through the face is shrunk until it fits, or left out (that was the big brown ball round the mouth)
    { const front = new Map(); const cell = Math.max(1e-4, mw * 0.08); const key = (x, y) => Math.round((x - P.x) / cell) + ',' + Math.round((y - P.y) / cell);
      for (const m of meshes) { const PA = m.geometry.attributes.position; const vv = new THREE.Vector3(); for (let i = 0; i < PA.count; i++) { vv.fromBufferAttribute(PA, i).applyMatrix4(m.bindMatrix); if (Math.abs(vv.x - P.x) > mw * 1.4 || Math.abs(vv.y - P.y) > mw * 1.4 || vv.z < P.z - depth * 1.3) continue; const k = key(vv.x, vv.y); const f = front.get(k); if (f === undefined || vv.z > f) front.set(k, vv.z); } }
      const fz = (x, y) => { let b = -Infinity; const cx0 = Math.round((x - P.x) / cell), cy0 = Math.round((y - P.y) / cell); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const f = front.get((cx0 + dx) + ',' + (cy0 + dy)); if (f !== undefined && f > b) b = f; } return b; };
      const inside = (pm, s) => { pm.geometry.computeBoundingBox(); const bb = pm.geometry.boundingBox; const hx = (bb.max.x - bb.min.x) / 2 * s, hy = (bb.max.y - bb.min.y) / 2 * s, hz = (bb.max.z - bb.min.z) / 2 * s; const c0 = pm.userData.bindC; const gap = mw * 0.03;
        for (const sx of [-1, -0.5, 0, 0.5, 1]) for (const sy of [-1, 0, 1]) { const x = c0.x + sx * hx, y = c0.y + sy * hy, z = c0.z + hz; const f = fz(x, y); if (f !== -Infinity && z > f - gap) return false; } return true; };
      for (const pm of [...parts]) { let s = 1; for (let k = 0; k < 9 && !inside(pm, s); k++) s *= 0.8; if (s < 0.3) { pm.parent && pm.parent.remove(pm); pm.geometry.dispose(); parts.splice(parts.indexOf(pm), 1); continue; } if (s < 1) pm.scale.multiplyScalar(s); } }
    if (!parts.some((pm) => pm.material === dark)) { const d0 = put(new THREE.CircleGeometry(1, 24).scale(mw * 0.45, mw * 0.16, 1), dark, head, P.clone().addScaledVector(FWD, -Math.min(depth * 0.1, mw * 0.05)), Hb); d0.material = dark; } /* no room for a full inside: a thin dark backing still closes the opening */
    for (const pm of parts) pm.visible = false; /* shown only while the mouth is open (mouth3dStep) */ }
  if (painted < 6) { console.warn('[mouth] no face skin near the mouth to rig on', c.id, '— retrying the search lower / wider'); } c._mouth3d = { meshesRef: meshes.slice(), painted, P: P.clone(), pivot: P.clone().addScaledVector(FWD, -depth * 0.45).addScaledVector(UPV, mw * 0.16), J: J.bn, LU: LU.bn, LL: LL.bn, CL: CL.bn, CR: CR.bn, sL, uL, fL, mw, jawMax: (o.jaw_max ?? 20) * Math.PI / 180, cur: { open: 0, wide: 0, round: 0, press: 0, under: 0 }, tgt: { open: 0, wide: 0, round: 0, press: 0, under: 0 }, backup, geoBackup, parts, opts: { ...o } };
  c.ch._talkChecked = false; MOUTHS_SAVE(); return `3D mouth rigged: 5 bones (jaw, upper / lower lip, corners), ${painted} skin vertices weight-painted, ${found ? 'on the mouth the model already has (' + found.kind + ', ' + found.width.toFixed(3) + ' m wide)' + (parts.length ? ', teeth + tongue inside' : '') : cut ? cut + ' triangles opened along the lips, teeth + tongue inside' : 'closed lips (no opening)'}`; }
function addMouth(c, o = {}) { let kind = String(o.kind || '3d').toLowerCase(); if (kind === '2d' && !o.force_2d && !drawnFace(c) && hasModelMouth(c)) kind = '3d'; /* it has a sculpted mouth: rig that */ if (kind === '2d') { removeMouth3D(c); return addMouth2D(c, o); } removeMouth2D(c); return addMouth3D(c, { ...o, cut: o.cut ?? true }); }
function removeMouth(c) { const a = removeMouth2D(c), b = removeMouth3D(c); return a === 'removed' || b === 'removed' ? 'removed' : 'no added mouth'; }
function removeMouth3D(c) { const M = c && c._mouth3d; if (!M) return 'no added mouth'; for (const b of M.backup) { b.sk.bones = b.bones; b.sk.boneInverses = b.inv; b.sk.boneMatrices = new Float32Array(b.bones.length * 16); if (b.sk.boneTexture) { b.sk.boneTexture.dispose(); b.sk.boneTexture = null; } if (b.sk.computeBoneTexture) b.sk.computeBoneTexture(); }
  for (const gb of M.geoBackup) { const g = gb.m.geometry; if (gb.pre) { for (const [k, a] of Object.entries(gb.pre.attrs)) g.setAttribute(k, a); g.setIndex(gb.pre.index); g.computeBoundingSphere(); gb.m.userData._nb = null; continue; } g.attributes.skinIndex.array.set(gb.si); g.attributes.skinWeight.array.set(gb.sw); g.attributes.skinIndex.needsUpdate = g.attributes.skinWeight.needsUpdate = true; if (gb.index) g.setIndex(new THREE.BufferAttribute(gb.index, 1)); gb.m.userData._nb = null; }
  for (const p of M.parts) { p.parent && p.parent.remove(p); p.geometry.dispose(); } for (const b of [M.LL, M.J, M.LU, M.CL, M.CR]) b.parent && b.parent.remove(b); c._mouth3d = null; MOUTHS_SAVE(); return 'removed'; }
const MOUTHS_SAVE = () => { try { const o = {}; for (const k of CAST.CASTS) if (k._mouth3d) o[k.id] = k._mouth3d.opts; localStorage.setItem('sbx_mouths3d', JSON.stringify(o)); } catch (e) { /* ok */ } };
// viseme -> muscle targets (open = jaw drop, wide = corners out, round = corners in + lips forward, press = lips together, under = lower lip under the teeth)
const MOUTH_POSE = { AA: { open: 1, wide: 0.1 }, I: { open: 0.55, wide: 0.25 }, EE: { open: 0.22, wide: 0.6 }, OH: { open: 0.8, round: 0.5 }, OO: { open: 0.28, round: 1 }, FV: { open: 0.14, under: 1, wide: 0.15 }, MBP: { press: 1 }, L: { open: 0.5, wide: 0.1 }, S: { open: 0.14, wide: 0.4 } };
function mouth3dTarget(c, w) { const M = c._mouth3d; if (!M) return; const T = { open: 0, wide: 0, round: 0, press: 0, under: 0 }; if (w !== 'rest' && w) { let tot = w.rest || 0; for (const [k, v] of Object.entries(w)) if (MOUTH_POSE[k]) { tot += v; for (const [q, a] of Object.entries(MOUTH_POSE[k])) T[q] += a * v; } if (tot > 1) for (const q in T) T[q] /= tot; } M.tgt = T; }
function mouth3dStep(dt) { for (const c of CAST.CASTS) { const M = c._mouth3d; if (!M) continue; if (M.meshesRef && M.meshesRef.some((m) => !c.meshes.includes(m))) { const o = M.opts; c._mouth3d = null; setTimeout(() => { try { console.warn('[mouth] re-rigged on the rebuilt mesh', c.id, addMouth3D(c, o)); } catch (e) { /* ok */ } }, 0); continue; } const k = 1 - Math.exp(-dt * 26); for (const q in M.cur) M.cur[q] += (M.tgt[q] - M.cur[q]) * k; const C = M.cur, mw = M.mw; const show = C.open > 0.05 && C.press < 0.6; for (const pm of M.parts) pm.visible = show;
    M.J.quaternion.setFromAxisAngle(M.sL, C.open * M.jawMax * (1 - 0.8 * C.press));
    M.LU.position.copy(M.LU.userData.p0).addScaledVector(M.uL, mw * (0.035 * C.open - 0.025 * C.press)).addScaledVector(M.fL, mw * 0.07 * C.round);
    M.LL.position.copy(M.LL.userData.p0).addScaledVector(M.uL, mw * (0.03 * C.press + 0.05 * C.under)).addScaledVector(M.fL, mw * (0.07 * C.round - 0.05 * C.under));
    for (const [b, s] of [[M.CL, 1], [M.CR, -1]]) b.position.copy(b.userData.p0).addScaledVector(M.sL, s * mw * (0.12 * C.wide - 0.16 * C.round)).addScaledVector(M.fL, mw * 0.05 * C.round).addScaledVector(M.uL, mw * 0.02 * C.wide); } }
// a character's own voice (any character, mind or not): saved per character
const VOICES_SAVE = () => { try { const o = {}; for (const k of CAST.CASTS) if (k.ch._voice) o[k.id] = k.ch._voice; localStorage.setItem('sbx_voices', JSON.stringify(o)); } catch (e) { /* ok */ } };
function setVoice(c, v) { const cv = cleanVoice(v); if (!cv) throw new Error('voice must be an object or a preset name'); c.ch._voice = cv; const m = MINDS.get(c.id); if (m) m.voiceP = cv; if (c._vm) c._vm.voiceP = cv; VOICES_SAVE(); return 'voice set: ' + cv.label; }
// mouth option on create / give_mind: 'auto' adds a drawn mouth only when the character has a head but no mouth rig of its own
function applyMouthOpt(c, mouth) { const res = applyMouthOpt0(c, mouth); if (/could not find|not in the skin/.test(String(res)) && !c._mouthRetry) { c._mouthRetry = true; setTimeout(() => { try { const r2 = applyMouthOpt0(c, mouth); console.warn('[mouth retry]', c.id, r2); } catch (e) { /* ok */ } }, 1500); } return res; }
// a character with a DRAWN face (eyes / lids / brows / mouth painted as 2D sheets) talks with a drawn mouth: its own mouth sheet
// when it has one (lip-synced through the same viseme engine), else a matching drawn mouth; a 3D mesh mouth would not fit that face
const isBeaky = (c) => /beak|bill\b|bird|duck|chick|hen\b|rooster|owl|parrot|penguin|goose|crow|raven|eagle|hawk|pelican|flamingo|toucan|platypus|puffin|gull|pigeon|dodo/i.test([c.id, c.ch.name, ...c.ch.bones.map((b) => b.name)].join(' '));
const drawnFace = (c) => (c.ch.layers || []).some((L) => /mouth|eye|lid|brow|face/i.test(L.key));
const sheetMouth = (c) => !!(c.ch.face && c.ch.face.talk && c.ch.face.talk.mouth != null);
/* which mouth suits THIS character: lips (a slit with a gap between the lips), a hinged lower jaw (snouts, muzzles, beaks, long mouths, separate jaws) or a drawn 2D mouth (screens, TV heads, flat robot faces) */
function mouthKind(c) { const ch = c.ch; let ids = ''; try { const sp = ch.sculpt ? ch.sculpt(ch) : null; ids = sp && Array.isArray(sp.parts) ? sp.parts.map((p) => p.id || '').join(' ') : ''; } catch (e) { /* ok */ }
  const txt = [c.id, ch.name, ch.description || '', ...ch.bones.map((b) => b.name), ids].join(' ');
  if (/screen|monitor|\btv\b|television|display|visor|lcd|crt/i.test(txt) && !/lip/i.test(ids)) return '2d';
  if (/lip/i.test(ids)) return 'lips';
  if (isBeaky(c) || /snout|muzzle|beak|bill\b|jaw|mandible|maw|croc|alligator|gator|dragon|dino|rex|raptor|lizard|shark|wolf|dog|fox|horse|cow|pig|boar|bear|cat\b|lion|tiger|rat\b|mouse|skull|skeleton|nutcracker|puppet/i.test(txt)) return 'jaw';
  if (drawnFace(c) || /robot|bot\b|droid|android|mech\b/i.test(txt)) return '2d';
  return 'lips'; }
function designHasMouth(c) { const ch = c.ch; try { const sp = ch.sculpt ? ch.sculpt(ch) : null; if (sp && Array.isArray(sp.parts) && sp.parts.some((p) => /lip|mouth|beak|jaw|snout|muzzle|teeth|tongue/i.test(p.id || ''))) return true; } catch (e) { /* ok */ } return ch.bones.some((b) => /jaw|lip|mouth|beak|mandible/i.test(b.name)) || (ch.layers || []).some((L) => /mouth/i.test(L.key)); }
/* after rigging: did it really get a working mouth? */
function mouthVerdict(c, res) { const s = String(res || ''); if (/no mouth$/.test(s)) return designHasMouth(c) ? 'FAILED: the design has mouth parts but mouth was set to none — every character with a mouth is rigged' : 'ok (no mouth in the design)';
  if (/could not find|not in the skin|no head|failed|no jaw bone/i.test(s)) return 'FAILED: ' + s;
  const m = s.match(/(\d+) skin vertices/); if (m && +m[1] < 20) return 'FAILED: only ' + m[1] + ' skin vertices move — the mouth is barely weighted';
  if (!(c._mouth3d || c._mouth2d || (c.ch.face && c.ch.face.talk && (c.ch.face.talk.jaw != null || c.ch.face.talk.mouth != null)))) return 'FAILED: no mouth rig exists after rigging';
  return 'ok'; }
function applyMouthOpt0(c, mouth) { if ((mouth === 'none' || mouth === false) && designHasMouth(c)) mouth = 'auto'; /* never skip rigging a mouthed design */ if (mouth === 'none' || mouth === false) { removeMouth(c); return 'no mouth'; }
  if ((mouth === 'auto' || mouth == null) && !sheetMouth(c) && !(c.ch.face && c.ch.face.talk && c.ch.face.talk.jaw != null)) { const k = mouthKind(c); if (k === '2d') return addMouth(c, { kind: '2d', force_2d: true }); if (k === 'jaw') { const jp = findJawPiece(c); return addMouth(c, { kind: '3d', style: jp ? 'jaw' : 'beak', bones: 'more' }); } if (k === 'lips') mouth = { kind: '3d', style: 'lips', bones: 'more' }; }
  if (sheetMouth(c)) { removeMouth(c); return 'talks with its own drawn mouth sheet (lip-synced)'; }
  if (c.ch.face && c.ch.face.talk && c.ch.face.talk.jaw != null && mouth !== '3d') { removeMouth(c); return 'talks with its own jaw / beak hinge'; } { const t0 = ensureTalkRig(c); if (t0 && t0.jaw != null && mouth !== '3d') { removeMouth(c); return 'talks with its own jaw / beak hinge'; } }
  if (mouth !== '3d' && !(mouth && typeof mouth === 'object' && mouth.style === 'lips')) { const jp = findJawPiece(c); if (jp) return addMouth(c, { ...(typeof mouth === 'object' && mouth ? mouth : {}), kind: '3d', style: 'jaw' }); }
  if (isBeaky(c) && mouth !== '3d') return addMouth(c, { ...(typeof mouth === 'object' && mouth ? mouth : {}), kind: '3d', style: 'beak' });
  if (drawnFace(c) && mouth !== '3d' && !(mouth && typeof mouth === 'object' && mouth.kind === '3d')) return addMouth(c, { ...(typeof mouth === 'object' && mouth ? mouth : {}), kind: '2d', force_2d: true }); const has = (c.ch.face && c.ch.face.talk && (c.ch.face.talk.jaw != null || c.ch.face.talk.mouth != null)) || ensureTalkRig(c);
  if (mouth && typeof mouth === 'object') return addMouth(c, mouth); if (mouth === '3d') return addMouth(c, { kind: '3d' }); if (mouth === '2d') return hasModelMouth(c) ? addMouth(c, { kind: '3d' }) : addMouth(c, { kind: '2d' }); if (mouth === 'jaw') return has ? 'uses its jaw' : 'no jaw bone to use';
  if (headIdx(c) === undefined) return 'no head: talks with sound only'; if (has && !hasModelMouth(c)) return 'uses its own mouth rig'; return addMouth(c, { kind: '3d' }); /* a talking character gets a real 3D mouth with a lip slit (its modelled one, opened if the lips are joined, or a new one) */ }
SBX.addMouth = addMouth; SBX.removeMouth = removeMouth;
// ---------------------------------------------------------------- mouth check: after Ollo rigs any mouth he verifies it himself —
// rest (closed, one clean line), jaw at max (gap + dark inside, front and side), MBP (lips shut), OO (pucker) — and captures the face
// (no on-screen panel: the result goes to the Activity log; the captures are kept on the character as c.ch._mouthCheck.shots)
function mouthShot(c, view, sz = 220) { const hi = headIdx(c); const hb = hi !== undefined ? c.bones[hi] : null; c.group.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(c.group); const H = Math.max(0.05, bb.max.y - bb.min.y);
  const tgt = new THREE.Vector3(); if (hb) hb.getWorldPosition(tgt); else bb.getCenter(tgt); const hs = H * 0.36; const q = c.group.getWorldQuaternion(new THREE.Quaternion()); const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q), side = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  if (c._mouth3d) { const mp = c._mouth3d.P.clone().applyMatrix4(c.group.matrixWorld); if (Number.isFinite(mp.y)) tgt.y = mp.y + hs * 0.15; }
  const cam = new THREE.PerspectiveCamera(28, 1, 0.01, 200); const dist = hs / Math.tan(14 * Math.PI / 180) * 0.75; const dir = view === 'side' ? side.clone().multiplyScalar(0.85).addScaledVector(fwd, 0.5).normalize() : view === 'below' ? fwd.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, -0.6, 0)).normalize() : fwd;
  cam.position.copy(tgt).addScaledVector(dir, dist); cam.lookAt(tgt); cam.updateMatrixWorld(true); const cv = renderCapture(cam, sz, sz, () => () => {}); const out = document.createElement('canvas'); out.width = out.height = sz; out.getContext('2d').drawImage(cv, 0, 0, sz, sz); return out; }
function mouthPoseNow(c, T) { const M = c._mouth3d; if (!M) return; M.tgt = { open: 0, wide: 0, round: 0, press: 0, under: 0, ...T }; M.cur = { ...M.tgt }; mouth3dStep(1); c.group.updateMatrixWorld(true); }
function mouthCheck(c, rigRes) { if (!c || !c.ch) return null; const kind = c._mouth3d ? (c._mouth3d.opts.style || 'lips') : c._mouth2d || sheetMouth(c) ? '2d' : (c.ch.face && c.ch.face.talk && c.ch.face.talk.jaw != null) ? 'own jaw' : 'none'; const shots = []; const notes = []; let pass = true;
  const M = c._mouth3d; const keep = M ? { tgt: { ...M.tgt }, cur: { ...M.cur } } : null;
  try { if (M) { mouthPoseNow(c, {}); shots.push(['Rest · front', mouthShot(c, 'front')]); mouthPoseNow(c, MOUTH_POSE.AA); shots.push(['Open (jaw max) · front', mouthShot(c, 'front')]); shots.push(['Open · side', mouthShot(c, 'side')]); shots.push(['Open · below', mouthShot(c, 'below')]); mouthPoseNow(c, MOUTH_POSE.MBP); shots.push(['MBP (lips shut)', mouthShot(c, 'front')]); mouthPoseNow(c, MOUTH_POSE.OO); shots.push(['OO (pucker)', mouthShot(c, 'front')]);
      const T = mouthTest(c); if (T) { M.test = T; notes.push(`opens ${T.opens} of its width · cheeks move ${T.cheeks} · upper lip moves ${T.upper}`); if (!T.pass) { pass = false; notes.push('NOT GOOD: the jaw does not open cleanly, or it drags the cheeks / upper lip'); } } }
    else { shots.push(['Rest · front', mouthShot(c, 'front')]); if (kind === '2d') notes.push('2D mouth: cells switch through lip sync; rest captured'); else if (kind === 'none') { if (designHasMouth(c)) { pass = false; notes.push('NOT GOOD: the design has a mouth but nothing is rigged'); } else notes.push('no mouth in the design'); } } }
  catch (e) { pass = false; notes.push('check failed: ' + e.message); }
  finally { if (M && keep) { M.tgt = keep.tgt; M.cur = keep.cur; mouth3dStep(1); } }
  const v = mouthVerdict(c, rigRes); if (!/^ok/.test(v)) { pass = false; notes.push(v); }
  const res = { id: c.id, kind, pass, notes, rig: String(rigRes || ''), shots: shots.map(([lab, cv]) => { let url = ''; try { url = cv.toDataURL('image/jpeg', 0.8); } catch (e) { /* ok */ } return { view: lab, url }; }) }; c.ch._mouthCheck = res;
  notes.unshift(shots.length + ' face captures (' + shots.map((s) => s[0]).join(', ') + ')');
  console.warn('[mouth check]', c.id, kind, pass ? 'PASS' : 'NEEDS A FIX', notes.join(' | ')); return res; }
SBX.mouthCheck = (id) => { const c = typeof id === 'string' ? CAST.CASTS.find((k) => k.id === id) : id; if (!c) throw new Error('No such character'); return mouthCheck(c, ''); };
{ const _amo0 = applyMouthOpt0; applyMouthOpt0 = function (c, mouth) { const r = _amo0(c, mouth); clearTimeout(c._mchkT); c._mchkT = setTimeout(() => { try { mouthCheck(c, r); } catch (e) { console.warn('[mouth check]', c.id, e); } }, 700); return r; }; }
(async () => { await sleep(4000); for (const c of CAST.CASTS) { try { if (c._mouth3d || c._mouth2d || headIdx(c) === undefined) continue; const F = c.ch.face; if (F && F.talk && (F.talk.jaw != null || F.talk.mouth != null)) continue; if (ensureTalkRig(c)) continue; const talks = MINDS.has(c.id) || !!c.ch._voice; if (talks || hasModelMouth(c) || designHasMouth(c)) { const r0 = applyMouthOpt0(c, 'auto'); console.warn('[mouth] ' + mouthKind(c), c.id, r0, mouthVerdict(c, r0)); } } catch (e) { console.warn('[mouth]', c.id, e); } } })(); SBX.addMouth2D = addMouth2D; SBX.addMouth3D = addMouth3D; SBX.setVoice = setVoice;
// the player talking while controlling a character: that character says it, in its own voice, mouth in sync
function playerSpeakAs(c, text) { if (!c) return; if (c === ollo) { SBX.say(text); return; } const m = MINDS.get(c.id) || c._vm || (c._vm = { c, log: [], notes: [], mood: '' }); mindVoice(m, text); }
// saved voices / mouths come back on reload
(async () => { await sleep(1800); try { const vs = JSON.parse(localStorage.getItem('sbx_voices') || '{}'); for (const [id, v] of Object.entries(vs)) { const c = CAST.CASTS.find((k) => k.id === id); if (c) c.ch._voice = v; } } catch (e) { /* ok */ }
  try { const ms = JSON.parse(localStorage.getItem('sbx_mouths3d') || '{}'); for (const [id, o] of Object.entries(ms)) { const c = CAST.CASTS.find((k) => k.id === id); if (c && !c._mouth3d) try { if (sheetMouth(c)) continue; if (drawnFace(c) && !o.force_3d) addMouth2D(c, {}); else addMouth3D(c, o); } catch (e) { /* ok */ } } const m2 = JSON.parse(localStorage.getItem('sbx_mouths') || '{}'); for (const [id, o] of Object.entries(m2)) { const c = CAST.CASTS.find((k) => k.id === id); if (c && !c._mouth2d && !c._mouth3d) try { if (sheetMouth(c)) continue; if (!o.force_2d && !drawnFace(c) && hasModelMouth(c)) addMouth3D(c, {}); else addMouth2D(c, o); } catch (e) { /* ok */ } } } catch (e) { /* ok */ } })();
const VOICE_FIELD = { type: 'object', description: 'Its own voice, matched to who it is. preset (closest): tiny squeaky, small cute, soft shy, bright cheerful, normal, calm warm, gruff, deep booming, old creaky, nasal whiny, robotic, sly smooth, grand theatrical, hyper excited. engine: natural (clearest, default) or toy (retro synth for robots/toys). Optional: gender female|male|child, accent (en-GB…), natural_pitch 0.3-2, natural_rate 0.6-1.5, volume 0.4-1.4; toy: pitch 24-115 (LOWER = higher), speed 55-115 (LARGER = slower); label.' };
const MOUTH_FIELD = { description: 'Talking mouth, synced to its speech. "auto" (default): a character with a DRAWN face talks with its own drawn mouth sheet or a matching drawn mouth; otherwise a rigged 3D mouth WITH A LIP SLIT (its modelled one, opened if the lips are joined, else a new one) — jaw, upper/lower lip, corner bones, skin weight-painted, teeth + tongue; a character with its own jaw / drawn mouth sheet keeps that. "3d" (rig a realistic 3D mouth; cuts a lip opening if the model has none), "2d" (a drawn mouth: ONLY for a screen / TV-head / flat drawn face; a sculpted mouth always gets the 3D rig unless force_2d: true), "jaw", "none" (no mouth). Or {kind: 3d|2d, height -0.8..0.8, width (m), at [x,y,z] character-local centre, cut: false (never cut), jaw_max deg, colours}.' };
// ---------------------------------------------------------------- 9d. music & sound: the AI composes songs / sound effects as note data
// (tracks of instruments: lead, square, saw, triangle, sine, pluck, bass, pad, bell, organ, drums), rendered offline to real audio, saved to
// the library, and played either as world music or ATTACHED to any object / character (positional: louder as you get near, panned to
// where it is, following it as it moves).
const AUD = { listener: null, specs: new Map(), buffers: new Map(), playing: new Map() };
CAT.Music = '🎵';
function audioListener() { if (!AUD.listener) { AUD.listener = new THREE.AudioListener(); camera.add(AUD.listener); } try { const cx = AUD.listener.context; if (cx.state !== 'running') cx.resume().catch(() => {}); } catch (e) { /* ok */ } return AUD.listener; }
addEventListener('pointerdown', () => { if (AUD.listener) try { AUD.listener.context.resume(); } catch (e) { /* ok */ } }, true);
const NOTE_HZ = (n) => { if (typeof n === 'number') return n > 0 && n < 128 && Number.isInteger(n) ? 440 * Math.pow(2, (n - 69) / 12) : n; const m = /^([A-Ga-g])(#|b)?(-?\d)$/.exec(String(n).trim()); if (!m) return null; const s = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * Math.pow(2, ((+m[3] + 1) * 12 + s - 69) / 12); };
async function renderSong(spec) { const bpm = clamp(+spec.bpm || 110, 30, 260), spb = 60 / bpm; let endB = 0; let count = 0;
  for (const tr of spec.tracks || []) for (const n of tr.notes || []) { endB = Math.max(endB, (+n[0] || 0) + (+n[2] || 0.5)); count++; } if (!count) throw new Error('the song has no notes');
  if (count > 6000) throw new Error('too many notes (max 6000)'); const lenB = Math.max(endB, +spec.length_beats || 0); const dur = Math.min(240, lenB * spb + 1.5); const sr = 44100;
  const oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr); const master = oc.createGain(); master.gain.value = clamp(spec.volume ?? 0.7, 0, 1.5); const comp = oc.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
  const dl = oc.createDelay(1); dl.delayTime.value = spb * 0.75; const fb = oc.createGain(); fb.gain.value = clamp(spec.echo ?? 0.18, 0, 0.6); master.connect(comp); master.connect(dl); dl.connect(fb); fb.connect(dl); fb.connect(comp); comp.connect(oc.destination);
  const noise = oc.createBuffer(1, sr, sr); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const env = (g, t0, a, d, s, r, len, peak) => { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.linearRampToValueAtTime(peak * s, t0 + a + d); g.gain.setValueAtTime(peak * s, t0 + Math.max(a + d, len)); g.gain.linearRampToValueAtTime(0, t0 + Math.max(a + d, len) + r); return t0 + Math.max(a + d, len) + r + 0.05; };
  for (const tr of spec.tracks || []) { const inst = String(tr.instrument || 'lead').toLowerCase(); const tg = oc.createGain(); tg.gain.value = clamp(tr.volume ?? 0.6, 0, 1.5); let out = tg; if (oc.createStereoPanner) { const pn = oc.createStereoPanner(); pn.pan.value = clamp(tr.pan || 0, -1, 1); tg.connect(pn); out = pn; } out.connect(master);
    for (const n of tr.notes || []) { const t0 = (+n[0] || 0) * spb, len = Math.max(0.03, (+n[2] || 0.5) * spb), vel = clamp(n[3] ?? 0.8, 0, 1);
      if (inst === 'drums') { const kind = String(n[1]).toLowerCase(); const g = oc.createGain(); g.connect(tg);
        if (/kick|bd/.test(kind)) { const o2 = oc.createOscillator(); o2.frequency.setValueAtTime(150, t0); o2.frequency.exponentialRampToValueAtTime(42, t0 + 0.14); o2.connect(g); const e = env(g, t0, 0.002, 0.15, 0.0, 0.05, 0.02, vel); o2.start(t0); o2.stop(e); }
        else { const s2 = oc.createBufferSource(); s2.buffer = noise; const f = oc.createBiquadFilter(); const hat = /hat|hh|cymbal|ride|shaker/.test(kind); f.type = hat ? 'highpass' : 'bandpass'; f.frequency.value = hat ? 7000 : /clap/.test(kind) ? 1500 : /tom/.test(kind) ? 400 : 1800; s2.connect(f); f.connect(g); const e = env(g, t0, 0.001, hat ? 0.05 : 0.12, 0, 0.04, 0.01, vel * (hat ? 0.5 : 0.9)); s2.start(t0); s2.stop(e);
          if (/snare|sd|tom/.test(kind)) { const o3 = oc.createOscillator(); o3.frequency.value = /tom/.test(kind) ? 120 : 190; const g3 = oc.createGain(); g3.connect(tg); o3.connect(g3); const e3 = env(g3, t0, 0.001, 0.08, 0, 0.03, 0.01, vel * 0.5); o3.start(t0); o3.stop(e3); } } continue; }
      const hz = NOTE_HZ(n[1]); if (!hz) continue; const g = oc.createGain(); let src = g; const oscs = [];
      const mk = (type, mul = 1, det = 0, gain = 1) => { const o2 = oc.createOscillator(); o2.type = type; o2.frequency.value = hz * mul; o2.detune.value = det; const og = oc.createGain(); og.gain.value = gain; o2.connect(og); og.connect(src); oscs.push(o2); };
      let a = 0.01, d = 0.1, s = 0.7, r = 0.12; let filt = null; if (/bass|pad|lead|saw|organ/.test(inst)) { filt = oc.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = inst === 'bass' ? 700 : inst === 'pad' ? 1800 : 3200; filt.Q.value = 0.8; filt.connect(g); src = filt; }
      if (inst === 'square') mk('square'); else if (inst === 'saw') mk('sawtooth'); else if (inst === 'triangle') mk('triangle'); else if (inst === 'sine') mk('sine');
      else if (inst === 'pluck') { mk('triangle'); mk('sine', 2, 0, 0.3); a = 0.002; d = 0.25; s = 0; r = 0.1; } else if (inst === 'bass') { mk('sawtooth'); mk('sine', 0.5, 0, 0.6); d = 0.15; s = 0.6; }
      else if (inst === 'pad') { mk('sawtooth', 1, -9, 0.5); mk('sawtooth', 1, 9, 0.5); a = Math.min(0.6, len * 0.4); d = 0.3; s = 0.8; r = 0.5; } else if (inst === 'bell') { mk('sine'); mk('sine', 2.76, 0, 0.4); mk('sine', 5.4, 0, 0.15); a = 0.002; d = 0.9; s = 0; r = 0.4; }
      else if (inst === 'organ') { mk('sine'); mk('sine', 2, 0, 0.5); mk('sine', 3, 0, 0.25); a = 0.01; s = 0.9; } else { mk('square', 1, 0, 0.6); mk('sawtooth', 1, 6, 0.3); }
      g.connect(tg); const e = env(g, t0, a, d, s, r, len, vel * 0.5); for (const o2 of oscs) { o2.start(t0); o2.stop(e); } } }
  return oc.startRendering(); }
async function bufferOf(name) { if (AUD.buffers.has(name)) return AUD.buffers.get(name); const spec = AUD.specs.get(name); if (!spec) throw new Error('No song or sound called ' + name + '. Have: ' + [...AUD.specs.keys()].join(', ')); const b = await renderSong(spec); AUD.buffers.set(name, b); return b; }
async function composeSong(name, spec) { if (!name) throw new Error('name is required'); const s = { ...spec, name, created: Date.now() }; AUD.specs.set(name, s); AUD.buffers.delete(name); const b = await bufferOf(name);
  const ex = SBX.entries.find((e) => e.kind === 'music' && e.name === name); if (!ex) addEntry({ name, category: 'Music', kind: 'music', music: name, tags: ['music', 'sound', 'song', ...(spec.tags || [])], desc: spec.description || 'Composed by the AI.' });
  try { dbSave('sbx_music', 'm_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60), s); } catch (e) { /* ok */ } return { name, seconds: +b.duration.toFixed(1) }; }
function soundTarget(at) { if (!at || at === 'world' || at === 'camera' || at === 'global') return null; if (at && at.isObject3D) return at; const s = String(at); const c = CAST.CASTS.find((k) => k.id === s.replace(/^cast:/, '')); if (c) { const hi = headIdx(c); return (hi !== undefined && c.bones[hi]) || c.group; } return SBX.get(s); }
async function playSound(name, o = {}) { const buf = await bufferOf(name); const L = audioListener(); const tgt = soundTarget(o.attach); if (o.attach && !tgt) throw new Error('nothing called ' + o.attach + ' to attach it to');
  const snd = tgt ? new THREE.PositionalAudio(L) : new THREE.Audio(L); snd.setBuffer(buf); const spec = AUD.specs.get(name) || {}; snd.setLoop(o.loop ?? !!spec.loop); snd.setVolume(clamp(o.volume ?? 0.9, 0, 2));
  if (tgt) { snd.setDistanceModel(o.distance_model || 'inverse'); snd.setRefDistance(clamp(o.ref_distance ?? 2.5, 0.1, 100)); snd.setMaxDistance(clamp(o.max_distance ?? 60, 1, 1000)); snd.setRolloffFactor(clamp(o.rolloff ?? 1.2, 0, 10)); tgt.add(snd); } else scene.add(snd);
  snd.play(); const id = uid('snd'); AUD.playing.set(id, { snd, name, at: o.attach || 'world' }); snd.onEnded = () => { AUD.playing.delete(id); try { snd.parent && snd.parent.remove(snd); } catch (e) { /* ok */ } }; return id; }
function stopSound(which = 'all') { let n = 0; for (const [id, p] of AUD.playing) if (which === 'all' || which === id || which === p.name || which === p.at) { try { p.snd.stop(); } catch (e) { /* ok */ } try { p.snd.parent && p.snd.parent.remove(p.snd); } catch (e) { /* ok */ } AUD.playing.delete(id); n++; } return n; }
SBX.audio = { compose: composeSong, play: playSound, stop: stopSound, list: () => [...AUD.specs.keys()], playing: () => [...AUD.playing].map(([id, p]) => ({ id, name: p.name, at: p.at })), noteHz: NOTE_HZ };
addEventListener('pagehide', () => stopSound('all'));
(async () => { await sleep(2500); try { if (DB) { const snap = await DB.collection('sbx_music').get(); (snap.docs || snap || []).forEach((d) => { const s = d.data ? d.data() : d; if (s && s.name) { AUD.specs.set(s.name, s); if (!SBX.entries.find((e) => e.kind === 'music' && e.name === s.name)) addEntry({ name: s.name, category: 'Music', kind: 'music', music: s.name, tags: ['music', 'sound', 'song', ...(s.tags || [])], desc: s.description || 'Composed by the AI.' }); } }); } } catch (e) { /* no saved music yet */ } })();
const AUDIO_DESC = 'Music and sound. compose: write a song or sound effect as notes and save it (song: {bpm, loop, echo 0-0.6, length_beats, tracks: [{instrument: lead|square|saw|triangle|sine|pluck|bass|pad|bell|organ|drums, volume, pan, notes: [[beat, note, beats, velocity]]}]}; note = "C4", "F#3", "Bb5" or MIDI number; drums notes use kick / snare / hat / clap / tom). Write real music: a melody with phrasing, chords / pads, a bassline, drums, a structure (intro, verse, chorus) — not a scale. play: play a song / sound by name, either as world music (attach omitted) or ATTACHED to an object or character id so it is positional (louder near it, panned, follows it); volume, loop, ref_distance (m, full volume), max_distance. stop: stop by name, play id, attached id, or "all". list: songs and what is playing.';
// ---------------------------------------------------------------- 10. per-frame: Ollo, appear animations, sun follows the action, speech bubble, PiP, thumbnails
let last = performance.now(); const sun = scene.getObjectByName('Sun'); const tmpV = new THREE.Vector3();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  /* rig bones are an editing aid: hidden unless the Animator is on (or its "show rig" box is ticked) */
  if (btnAnim.getAttribute('aria-pressed') !== 'true') { for (const c of CAST.CASTS) if (c.helper && c.helper.visible) c.helper.visible = false; }
  try { olloTick(dt); } catch (e) { console.error('ollo', e); }
  try { smartTick(dt); } catch (e) { console.error('smart ollo', e); }
  try { mindsTick(dt); } catch (e) { console.error('minds', e); }
  try { ragTick(dt); } catch (e) { console.error('ragdoll', e); }
  try { lipStep(); } catch (e) { console.error('lip sync', e); }
  try { mouth3dStep(dt); } catch (e) { console.error('mouth', e); }
  try { helpersStep(); } catch (e) { /* ok */ }
  try { safetyStep(); } catch (e) { /* ok */ }
  for (const c of CAST.CASTS) if (c !== ollo && c.group.visible && PLAY.has(c)) { try { applyClipLayer(c, dt); } catch (e) { console.warn("clip", c.id, e.message, e.stack && e.stack.slice(0, 300)); PLAY.delete(c); } }
  if (!SBX.filmLook) { const P = CAST.studio && CAST.studio.api && CAST.studio.api.project; if (P && (!P.look || P.look.bloom !== false || P.look.grade !== 'neutral')) setLook(true); } // film look stays off unless switched on (a studio project loading later cannot turn it back on)
  try { playerStep(dt); selectStep(dt); } catch (e) { console.error('player', e); }
  try { systemsStep(dt); physicsStep(dt); triggersStep(); autosaveStep(dt); } catch (e) { console.error('systems', e); }
  // the island's wind grass grows only on the island's own grass: never on the platform (it comes back only with the island)
  for (const c of scene.children) if (c.name === 'RP_Wind_Grass' && c.visible !== !!park.root.visible) c.visible = !!park.root.visible;
  for (let i = appear.length - 1; i >= 0; i--) { const a = appear[i]; a.t += dt / 0.45; const k = a.t >= 1 ? 1 : 1 - Math.pow(1 - a.t, 3) * Math.cos(a.t * 3.2); a.o.scale.copy(a.s).multiplyScalar(Math.max(0.001, k)); if (a.t >= 1) { a.o.scale.copy(a.s); appear.splice(i, 1); SBX.dirty = true; } }
  if (follow) { const p = ollo.group.position; const d = new THREE.Vector3(p.x, p.y + 0.4, p.z).sub(controls.target); controls.target.add(d.multiplyScalar(1 - Math.exp(-dt * 3))); camera.position.add(d); }
  if (bubbleT > 0) { bubbleT -= dt; const p = headTop(ollo).project(camera); const r = renderer.domElement.getBoundingClientRect(); bubble.style.left = ((p.x * 0.5 + 0.5) * r.width) + 'px'; bubble.style.top = ((-p.y * 0.5 + 0.5) * r.height) + 'px'; bubble.style.opacity = bubbleT > 0.3 && p.z < 1 ? '1' : '0'; if (bubbleT <= 0) { try { RPC.applyExpression(ollo.ch, ollo.st, OH.expr); } catch (e) { /* ok */ } } }
  if (pipOn && (pipT += dt) > 0.5) { pipT = 0; updatePov(); try { const cv = renderCapture(povCam, 384, 216, () => { const hid = []; for (const m of ollo.meshes) if (m.visible) { m.visible = false; hid.push(m); } wand.visible = false; return () => { for (const m of hid) m.visible = true; wand.visible = true; }; }); pipCv.getContext('2d').drawImage(cv, 0, 0, pipCv.width, pipCv.height); } catch (e) { /* skip */ } }
  if (!libEl.hidden && thumbQ.length) pumpThumbs();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// the bob: a visual offset added after the cast pipeline, removed before the next frame's physics
scene.onAfterRender = (() => { const prev = scene.onAfterRender; return function (...a) { if (prev) prev.apply(this, a); }; })();
const _render = renderer.render.bind(renderer); let inBob = false;
renderer.render = function (sc, cam) { if (sc === scene && !inBob && ollo._bob) { inBob = true; const y = ollo.group.position.y; ollo.group.position.y = y + ollo._bob; ollo.group.updateMatrixWorld(true); try { return _render(sc, cam); } finally { ollo.group.position.y = y; ollo.group.updateMatrixWorld(true); inBob = false; } } return _render(sc, cam); };
// clip root motion and turns (e.g. Spin, hops) are shown as a visual offset at render time, so they never drift the character
const _renderC = renderer.render.bind(renderer); let inClipR = false;
renderer.render = function (sc, cam) { if (sc !== scene || inClipR) return _renderC(sc, cam); const keep = [];
  for (const [c] of PLAY) { if (!c._clipYaw && !c._clipRoot) continue; const g = c.group; keep.push([g, g.rotation.y, g.position.clone()]); g.rotation.y += c._clipYaw || 0; if (c._clipRoot) g.position.add(new THREE.Vector3(...c._clipRoot).applyAxisAngle(UP, g.rotation.y)); g.updateMatrixWorld(true); }
  if (!keep.length) return _renderC(sc, cam); inClipR = true; try { return _renderC(sc, cam); } finally { inClipR = false; for (const [g, y, pp] of keep) { g.rotation.y = y; g.position.copy(pp); g.updateMatrixWorld(true); } } };
// ---------------------------------------------------------------- 11. "Copyright safe" switch: ON (default, every load) = Ollo.
// OFF (after a warning) = Ollo is shown as the user's own fan-made 3D model (a private uploaded asset). The model is driven
// live by Ollo's own rig every frame: arms / legs follow Ollo's limb directions, spine / neck / head follow Ollo's rotations (look-at,
// expressions, animations), the lower teeth drop with Ollo's lip sync, and it carries the model's own short staff instead of the
// lantern wand. Ollo's body stays the one every system (physics, AI views, collisions) uses; only the picture changes.
const ALT = { on: false, loading: null, root: null, map: [], jaw: null, open: 0, openT: 0 };
SBX.altSkin = ALT;
{ const _la = lipApply; lipApply = function (c, L, w) { if (c === ollo) { let o = 0; try { o = w === 'rest' || !w ? 0 : (RPC.visemeOpen ? RPC.visemeOpen(w) : 0.6); } catch (e) { o = 0.5; } ALT.openT = clamp(+o || 0, 0, 1); } return _la(c, L, w); }; }
{ const _le = lipEnd; lipEnd = function (c, id) { if (c === ollo) ALT.openT = 0; return _le(c, id); }; }
async function altLoad() { if (ALT.root) return ALT.root; if (ALT.loading) return ALT.loading;
  ALT.loading = (async () => { try { await CHK_MC.ready; } catch (e) { /* ok */ } const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'); const gl = await new GLTFLoader().loadAsync(await embUrl('data/caine.txt')); const root = new THREE.Group(); root.name = 'AltSkin'; const model = gl.scene; root.add(model);
    const by = (n) => { let f = null; model.traverse((o) => { if (!f && o.name && o.name.replace(/[ .]/g, '_').startsWith(n)) f = o; }); return f; };
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    // the file's coat ties the sleeves near the armpits to the chest / shoulder bones: lowering the arms from the T-pose left that cloth
    // behind and stretched it into flaps. Out past the body, the sleeve cloth now follows its own arm (blended in over a short band)
    { let fixed = 0; model.traverse((o) => { if (!o.isSkinnedMesh) return; const bs = o.skeleton.bones, idx = (n) => bs.findIndex((b) => b.name.startsWith(n)); const armL = idx('leftUpperArmTwistStart'), armR = idx('rightUpperArmTwistStart'); if (armL < 0 || armR < 0) return;
      const torso = new Set(['shoulder_311', 'chest_310', 'waist_309', 'head_340', 'neck1_339', 'hip1_308', 'leftShoulder_342', 'rightShoulder_312'].map(idx).filter((i) => i >= 0)); const P = o.geometry.attributes.position, SI = o.geometry.attributes.skinIndex, SW = o.geometry.attributes.skinWeight;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), ax = Math.abs(x); if (ax < 0.18 || y < 0.84) continue; let t = clamp((ax - 0.18) / 0.12, 0, 1); t = t * t * (3 - 2 * t); if (t <= 0) continue; const W = new Map(); let mv = 0;
        for (let k = 0; k < 4; k++) { const b = SI.getComponent(i, k), w = SW.getComponent(i, k); if (w <= 0) continue; if (torso.has(b)) { mv += w * t; W.set(b, (W.get(b) || 0) + w * (1 - t)); } else W.set(b, (W.get(b) || 0) + w); } if (mv < 1e-4) continue; const arm = x > 0 ? armL : armR; W.set(arm, (W.get(arm) || 0) + mv);
        const top = [...W].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((a, q) => a + q[1], 0) || 1; for (let k = 0; k < 4; k++) { SI.setComponent(i, k, top[k] ? top[k][0] : 0); SW.setComponent(i, k, top[k] ? top[k][1] / sum : 0); } fixed++; }
      SI.needsUpdate = SW.needsUpdate = true; }); ALT.reweighted = fixed; }
    root.updateMatrixWorld(true);
    // the top hat is a separate object in the file: put it on the head so it moves with it
    const head = by('Head_147'), hat = by('Sketchfab_model_001') || by('TopHat'); if (head && hat) head.attach(hat);
    // size: as tall as Ollo, standing where Ollo stands
    const bb = new THREE.Box3().setFromObject(model); const H0 = Math.max(0.01, bb.max.y - bb.min.y); const ob = new THREE.Box3(); for (const m of ollo.meshes) if (m.visible !== false) ob.union(new THREE.Box3().setFromObject(m)); const oH = ob.isEmpty() ? 1 : ob.max.y - ob.min.y;
    const s = (oH * 1.15) / H0; model.scale.setScalar(s); model.position.y = -bb.min.y * s + (ob.isEmpty() ? 0 : ob.min.y - ollo.group.position.y); root.updateMatrixWorld(true);
    const rq = root.getWorldQuaternion(new THREE.Quaternion()).invert(), rp = (o) => o.getWorldPosition(new THREE.Vector3()).applyMatrix4(root.matrixWorld.clone().invert());
    const rest = (o) => ({ o, q: rq.clone().multiply(o.getWorldQuaternion(new THREE.Quaternion())), p: rp(o) });
    // Ollo's bones (by role) and his bind (rest) pose, from his own skin
    const B = ollo.ch.bones, find = (re) => { const i = B.findIndex((b) => re.test(b.name)); return i >= 0 ? i : -1; };
    const sk = (i) => { const bone = ollo.bones[i]; for (const m of ollo.meshes) { if (!m.isSkinnedMesh) continue; const k = m.skeleton.bones.indexOf(bone); if (k >= 0) { const R = new THREE.Matrix4().copy(m.bindMatrix).invert().multiply(new THREE.Matrix4().copy(m.skeleton.boneInverses[k]).invert()); const q = new THREE.Quaternion(); R.decompose(new THREE.Vector3(), q, new THREE.Vector3()); return { bone, mesh: m, q }; } } return null; };
    const role = { hip: find(/^(Hips?|Root|Pelvis)$/i), spine: find(/^(Chest|Spine2|Spine_?Upper|Spine)$/i), neck: find(/^Neck/i), head: ollo.ch.bi.Head ?? find(/^Head$/i) };
    for (const s2 of ['L', 'R']) { role['ua' + s2] = find(new RegExp('^(Arm_Upper|UpperArm|Upper_Arm)\\.' + s2 + '$', 'i')); role['la' + s2] = find(new RegExp('^(Arm_Lower|LowerArm|Lower_Arm|Forearm)\\.' + s2 + '$', 'i')); role['ha' + s2] = find(new RegExp('^(Hand|Mitt|Paw)\\.' + s2 + '$', 'i')); role['ul' + s2] = find(new RegExp('^(Leg_Upper|UpperLeg|Upper_Leg|Thigh)\\.' + s2 + '$', 'i')); role['ll' + s2] = find(new RegExp('^(Leg_Lower|LowerLeg|Lower_Leg|Shin|Calf)\\.' + s2 + '$', 'i')); role['ft' + s2] = find(new RegExp('^(Foot|Boot)\\.' + s2 + '$', 'i')); }
    // NEW ARMS: the file's sleeves are part of the coat mesh and stretch whenever the arms move. They are cut out of the coat and
    // rebuilt as solid pieces on the arm bones (shoulder cap, upper sleeve, elbow, forearm sleeve, cuff): solid parts can never stretch.
    // The original gloves (already on the hand bones) and the cane stay.
    if (false) { const coat = (() => { let f = null; model.traverse((o) => { if (o.isSkinnedMesh && /Object_107/.test(o.name)) f = o; }); return f; })(); const radii = [];
      if (coat && coat.geometry.index) { const g = coat.geometry, PA = g.attributes.position, I = g.index.array, keep = [], SIc = g.attributes.skinIndex, SWc = g.attributes.skinWeight, armB = new Set(coat.skeleton.bones.map((b, k) => (/(UpperArm|Forearm|Hand)/.test(b.name) ? k : -1)).filter((k) => k >= 0));
        const arm = (i) => { if (Math.abs(PA.getX(i)) < 0.2) return false; let w = 0; for (let k = 0; k < 4; k++) if (armB.has(SIc.getComponent(i, k))) w += SWc.getComponent(i, k); return w >= 0.6 || (Math.abs(PA.getX(i)) > 0.3 && PA.getY(i) > 0.7); };
        for (let t = 0; t < I.length; t += 3) { if (arm(I[t]) || arm(I[t + 1]) || arm(I[t + 2])) { for (let k = 0; k < 3; k++) { const i = I[t + k]; radii.push(Math.hypot(PA.getY(i) - 0.965, PA.getZ(i) + 0.03)); } continue; } keep.push(I[t], I[t + 1], I[t + 2]); }
        g.setIndex(new THREE.BufferAttribute(I instanceof Uint32Array || PA.count > 65535 ? new Uint32Array(keep) : new Uint16Array(keep), 1)); }
      radii.sort((a, b) => a - b); const r0 = clamp(radii.length ? radii[Math.floor(radii.length * 0.6)] : 0.06, 0.03, 0.1) * s; let cmat = null; if (coat) { const m0 = [].concat(coat.material)[0]; cmat = new THREE.MeshStandardMaterial({ color: '#b3122a', roughness: 0.62 }); }
      const red = cmat || new THREE.MeshStandardMaterial({ color: '#b3122a', roughness: 0.62 }), dark = new THREE.MeshStandardMaterial({ color: '#16090c', roughness: 0.55 }), gold = new THREE.MeshStandardMaterial({ color: '#d4a020', roughness: 0.35, metalness: 0.7 });
      const W = (o) => o.getWorldPosition(new THREE.Vector3()); const seg = (bone, a, b, rA, rB, mat) => { const len = a.distanceTo(b); const geo = new THREE.CylinderGeometry(rB, rA, len, 20, 1, true); const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); scene.add(m); m.updateMatrixWorld(true); bone.attach(m); return m; };
      const ball = (bone, p, r, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat); m.castShadow = m.receiveShadow = true; m.position.copy(p); scene.add(m); m.updateMatrixWorld(true); bone.attach(m); return m; };
      const stripe = (bone, a, b, rr, side) => { const len = a.distanceTo(b); const m = new THREE.Mesh(new THREE.BoxGeometry(rr * 0.32, len * 0.94, rr * 0.32), dark); const dir = b.clone().sub(a).normalize(); m.position.copy(a).add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, -1).multiplyScalar(rr * 0.92)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); scene.add(m); m.updateMatrixWorld(true); bone.attach(m); };
      root.updateMatrixWorld(true); let built = 0;
      for (const n of ['left', 'right']) { const ua = by(n + 'UpperArm_'), fa = by(n + 'Forearm_'), ha = by(n + 'Hand_'); if (!ua || !fa || !ha) continue; const sh = W(ua), el = W(fa), wr = W(ha); const wr0 = el.clone().lerp(wr, 0.86);
        ball(ua, sh, r0 * 1.12, red); seg(ua, sh, el, r0 * 1.05, r0 * 0.9, red); stripe(ua, sh, el, r0, n); ball(fa, el, r0 * 0.93, red); seg(fa, el, wr0, r0 * 0.9, r0 * 0.82, red); stripe(fa, el, wr0, r0 * 0.86, n);
        seg(fa, wr0, el.clone().lerp(wr, 0.97), r0 * 1.02, r0 * 1.06, dark); seg(fa, el.clone().lerp(wr, 0.97), el.clone().lerp(wr, 1.0), r0 * 1.06, r0 * 1.0, gold); built++; }
      ALT.newArms = built; }
    const map = []; const rot = (src, tgt) => { if (src < 0 || !tgt) return; const S = sk(src); if (S) map.push({ kind: 'rot', S, T: rest(tgt) }); };
    const dir = (src, srcEnd, tgt, tgtEnd, fallback, tag) => { if (!tgt || !tgtEnd) return; const T = rest(tgt), E = rest(tgtEnd); const d0 = E.p.clone().sub(T.p).normalize(); if (src >= 0 && srcEnd >= 0) map.push({ kind: 'dir', a: ollo.bones[src], b: ollo.bones[srcEnd], T, d0, tag }); else if (fallback) map.push({ kind: 'fix', T, d0, d1: fallback.clone().normalize(), tag }); };
    rot(role.spine, by('chest_310')); rot(role.neck, by('neck_146')); rot(role.head, head);
    const LR = { L: 'left', R: 'right' }; for (const s2 of ['L', 'R']) { const n = LR[s2], sx = s2 === 'L' ? 1 : -1;
      dir(role['ua' + s2], role['la' + s2], by(n + 'UpperArm_'), by(n + 'Forearm_'), new THREE.Vector3(sx * 0.32, -1, 0.06), 'ua'); dir(role['la' + s2], role['ha' + s2], by(n + 'Forearm_'), by(n + 'Hand_'), new THREE.Vector3(sx * 0.2, -1, 0.3), 'la');
      dir(role['ul' + s2], role['ll' + s2], by(n + 'Thigh_'), by(n + 'Calf_'), null); dir(role['ll' + s2], role['ft' + s2], by(n + 'Calf_'), by(n + 'Foot_'), null); }
    // the jaw: the lower teeth (and tongue) drop; the upper teeth ride the same bones, so they are held where they are
    const lower = by('Object_217_278'), upper = [], tongue = [by('Bone154_302'), by('Bone158_297')].filter(Boolean); const mesh16 = (() => { let f = null; model.traverse((o) => { if (o.isSkinnedMesh && /Object_282/.test(o.name)) f = o; }); return f; })();
    if (mesh16) { const SI = mesh16.geometry.attributes.skinIndex, SW = mesh16.geometry.attributes.skinWeight, used = new Set(); for (let i = 0; i < SI.count; i++) for (let k = 0; k < 4; k++) if (SW.getComponent(i, k) > 0.2) used.add(SI.getComponent(i, k)); for (const k of used) { const b = mesh16.skeleton.bones[k]; if (b) upper.push(b); } }
    /* the whole lower jaw (gums AND teeth, all under one node) moves as one piece; it sits a little higher than in the file */ ALT.jaw = lower ? { lower, upper: [], tongue, p0: new Map([lower, ...tongue].map((o) => [o, o.position.clone()])), amt: 0.16 * s, base: 0.05 * s, head: head ? rest(head) : null } : null;
    try { ALT.body = altBuildBody(model, root, by, s); } catch (e) { console.warn('[copyright safe] body', e); ALT.body = null; } ALT.map = ALT.body ? map.filter((m) => m.kind === 'rot' && (m.T.o === head || /^neck_146/.test(m.T.o.name))) : map; ALT.root = root; ALT.role = role; scene.add(root); root.visible = false; console.warn('[copyright safe] model ready: ' + (ALT.body ? 'new one-piece body (' + ALT.body.mesh.geometry.index.count / 3 + ' triangles, 15 bones), ' : 'body rebuild FAILED, ') + map.length + ' bones driven by Ollo\'s rig (' + map.filter((x) => x.kind === 'fix').length + ' held in a relaxed pose)' + (ALT.jaw ? ', jaw rigged to his lip sync' : ', no jaw found')); return root; })();
  try { return await ALT.loading; } catch (e) { ALT.loading = null; throw e; } }
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m3 = new THREE.Matrix3();
function setWorldQ(o, W) { o.parent.updateWorldMatrix(true, false); o.parent.getWorldQuaternion(_q3); o.quaternion.copy(_q3.invert().multiply(W)); o.updateMatrixWorld(true); }
function altPose(dt) { const R = ALT.root; R.position.copy(ollo.group.position); if (CAINE_GO.mode === 'fly' && !(CHK.fpv && PLAYER.c === ollo)) R.position.y += ollo._bob || 0; R.quaternion.copy(ollo.group.quaternion); R.updateMatrixWorld(true); const RQ = R.getWorldQuaternion(new THREE.Quaternion()), RQi = RQ.clone().invert();
  for (const m of ALT.map) { if (m.kind === 'rot') { const S = m.S; S.mesh.updateWorldMatrix(true, false); S.bone.updateWorldMatrix(true, false); const MQ = S.mesh.getWorldQuaternion(_q1), cur = _q2.copy(MQ).invert().multiply(S.bone.getWorldQuaternion(new THREE.Quaternion())); const D = cur.multiply(S.q.clone().invert()); const Dw = MQ.clone().multiply(D).multiply(MQ.clone().invert()); setWorldQ(m.T.o, Dw.multiply(RQ.clone().multiply(m.T.q))); continue; }
    let d1; if (m.kind === 'dir') { m.a.updateWorldMatrix(true, false); m.b.updateWorldMatrix(true, false); d1 = m.b.getWorldPosition(_v1).sub(m.a.getWorldPosition(_v2)).applyQuaternion(RQi); if (d1.lengthSq() < 1e-10) continue; d1.normalize(); } else d1 = m.d1.clone();
    /* a relaxed showman's arm, not a stiff dangling one: upper arm tucked in to the body, elbow bent so the forearm comes forward */ if (m.tag === 'ua') { d1.x *= 0.45; d1.z += 0.08; d1.normalize(); } else if (m.tag === 'la') { d1.lerp(new THREE.Vector3(0, 0, 1), 0.55).normalize(); }
    const A = new THREE.Quaternion().setFromUnitVectors(m.d0, d1); setWorldQ(m.T.o, RQ.clone().multiply(A).multiply(m.T.q)); }
  const J = ALT.jaw; if (J) { ALT.open += (ALT.openT - ALT.open) * (1 - Math.exp(-dt * 24)); const d = ALT.open * J.amt - (J.base || 0); const dn = new THREE.Vector3(0, -1, 0); if (J.head) { J.head.o.updateWorldMatrix(true, false); dn.applyQuaternion(J.head.o.getWorldQuaternion(_q1).multiply(RQ.clone().multiply(J.head.q).invert())); }
    const put = (o, k) => { o.position.copy(J.p0.get(o)); if (!d) return; o.parent.updateWorldMatrix(true, false); _m3.setFromMatrix4(o.parent.matrixWorld).invert(); o.position.add(dn.clone().multiplyScalar(d * k).applyMatrix3(_m3)); o.updateMatrixWorld(true); };
    const putD = (o, dd) => { o.position.copy(J.p0.get(o)); if (!dd) return; o.parent.updateWorldMatrix(true, false); _m3.setFromMatrix4(o.parent.matrixWorld).invert(); o.position.add(dn.clone().multiplyScalar(dd).applyMatrix3(_m3)); };
    /* the jaw mainly TILTS open on a hinge at its back (like a real jaw); it only drops a little */ const parts = [J.lower, ...J.tongue], dd = ALT.open * J.amt * 0.12 - (J.base || 0), ang = ALT.open * 0.5; J.q0 = J.q0 || new Map();
    for (const o of parts) { putD(o, dd); if (!J.q0.has(o)) J.q0.set(o, o.quaternion.clone()); o.quaternion.copy(J.q0.get(o)); o.updateMatrixWorld(true); }
    if (!J.hl) { const bb = new THREE.Box3(), Ri = R.matrixWorld.clone().invert(), vv = new THREE.Vector3(); J.lower.updateWorldMatrix(true, true); J.lower.traverse((m) => { if (!m.isMesh || !m.geometry || !m.geometry.attributes.position) return; if (m.isSkinnedMesh) m.skeleton.update(); const PA = m.geometry.attributes.position, st = Math.max(1, Math.floor(PA.count / 4000)); for (let i = 0; i < PA.count; i += st) { m.getVertexPosition(i, vv); m.localToWorld(vv); bb.expandByPoint(vv.applyMatrix4(Ri)); } });
      /* the lower jaw is a BONE: its teeth and gums are skin weighted to it, so the hinge is found from the skin it really moves */ { const set = new Set(); J.lower.traverse((x) => set.add(x)); R.traverse((m) => { if (!m.isSkinnedMesh || !m.geometry.attributes.skinIndex) return; const ks = new Set(m.skeleton.bones.map((b, k) => (set.has(b) ? k : -1)).filter((k) => k >= 0)); if (!ks.size) return; m.skeleton.update(); const SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight; for (let i = 0; i < SI.count; i++) { let w = 0; for (let q = 0; q < 4; q++) if (ks.has(SI.getComponent(i, q))) w += SW.getComponent(i, q); if (w < 0.5) continue; m.getVertexPosition(i, vv); m.localToWorld(vv); bb.expandByPoint(vv.applyMatrix4(Ri)); } }); } if (bb.isEmpty()) console.warn('[caine jaw] no jaw shape found for the hinge'); if (!bb.isEmpty()) { const c = bb.getCenter(new THREE.Vector3()), hr = new THREE.Vector3(c.x, bb.max.y, bb.min.z + (bb.max.z - bb.min.z) * 0.04) /* hinge: the back centre of the mouth */, hw = R.localToWorld(hr); J.hl = new Map(parts.map((o) => [o, o.parent.worldToLocal(hw.clone())])); } }
    if (J.hl && ang > 1e-4) { const Qhd = J.head ? J.head.o.getWorldQuaternion(new THREE.Quaternion()).multiply(RQ.clone().multiply(J.head.q).invert()) : new THREE.Quaternion(); const axW = new THREE.Vector3(1, 0, 0).applyQuaternion(RQ).applyQuaternion(Qhd);
      for (const o of parts) { const h = J.hl.get(o); if (!h) continue; const axL = axW.clone().applyQuaternion(o.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize(), q = new THREE.Quaternion().setFromAxisAngle(axL, ang); o.position.sub(h).applyQuaternion(q).add(h); o.quaternion.premultiply(q); o.updateMatrixWorld(true); } } } if (ALT.body) altDriveBody(ALT.body, RQi); }
// ---- the user's second (fully rigged Rigify) model. Its bones are not chained like a normal arm (shoulder > elbow > hand), so it
// is driven in rigid GROUPS: upper arm, forearm, hand (+ fingers, + staff), thigh, shin, foot, head (teeth, eyes, brows, hat) and
// jaw (lower gums, lower teeth, tongue). Each group follows Ollo's matching bone; positions are chained (the forearm starts where the
// upper arm ends, the hand where the forearm ends), so nothing can come apart or stretch.
async function altLoad2() { if (ALT.root2) return ALT.root2; if (ALT.loading2) return ALT.loading2;
  ALT.loading2 = (async () => { const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'); const gl = await new GLTFLoader().loadAsync('/_blob/f63ef0891e867c446172bc635fb034b0'); const root = new THREE.Group(); root.name = 'AltSkin2'; const model = gl.scene; root.add(model);
    const tl = new THREE.TextureLoader(), eyeTex = (u) => { const t = tl.load(u); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; return t; };
    const skins = [], eyes = []; model.traverse((o) => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.isSkinnedMesh) skins.push(o); else eyes.push(o); });
    // size: as tall as Ollo, standing where Ollo stands
    root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(model); const H0 = Math.max(0.01, bb.max.y - bb.min.y); const ob = new THREE.Box3(); for (const m of ollo.meshes) if (m.visible !== false) ob.union(new THREE.Box3().setFromObject(m)); const oH = ob.isEmpty() ? 1 : ob.max.y - ob.min.y;
    const s = (oH * 1.15) / H0; model.scale.multiplyScalar(s); model.position.y = -bb.min.y * s + (ob.isEmpty() ? 0 : ob.min.y - ollo.group.position.y); root.updateMatrixWorld(true);
    const rootInv = root.matrixWorld.clone().invert(); const restM = (o) => rootInv.clone().multiply(o.matrixWorld);
    // eyes: the textures that came with the model (blue on his right, green on his left)
    for (const e of eyes) { const right = new THREE.Box3().setFromObject(e).getCenter(new THREE.Vector3()).applyMatrix4(rootInv).x < 0; const mats = [].concat(e.material).map((m) => { const n = m.clone(); n.map = eyeTex(right ? '/_blob/021148e9fbb6ab662811bd3854d91be3' : '/_blob/f0db7695b52f6d0b0a90c61dc3ab46f0'); n.vertexColors = false; n.color.set('#ffffff'); n.needsUpdate = true; return n; }); e.material = mats.length === 1 ? mats[0] : mats; }
    // the bones that actually move skin, and which group each one rides with
    const used = new Set(); for (const m of skins) { const SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight; for (let i = 0; i < SI.count; i++) for (let k = 0; k < 4; k++) if (SW.getComponent(i, k) > 0) { const b = m.skeleton.bones[SI.getComponent(i, k)]; if (b) used.add(b); } }
    const byName = (n) => { let f = null; model.traverse((o) => { if (!f && o.isBone && o.name === n) f = o; }); return f; };
    const side = (n) => { const m = n.match(/(L|R)(\d{3})?$/); return m ? m[1] : null; };
    const groupOf = (b) => { const n = b.name, sd = side(n);
      if (/^Baton/.test(n)) return 'baton'; if (/TeethBot|GumBot|tongue/i.test(n)) return 'jaw'; if (/TeethTop|GumTop|^Hat|Brow|EyeCrease|^Eye|Iris|Pupil/i.test(n)) return 'head';
      if (!sd) return null; if (/upper_arm/.test(n)) return 'ua' + sd; if (/forearm/.test(n)) return 'la' + sd; if (/hand|palm|f_index|f_middle|f_pinky|f_ring|thumb/.test(n)) return 'ha' + sd;
      if (/thigh/.test(n)) return 'ul' + sd; if (/shin/.test(n)) return 'll' + sd; if (/foot|toe/.test(n)) return 'ft' + sd; return null; };
    const G = {}; for (const b of used) { const g = groupOf(b); if (g) (G[g] = G[g] || []).push({ b, rest: restM(b), depth: (() => { let d = 0; for (let x = b; x; x = x.parent) d++; return d; })() }); }
    const P = (n) => { const b = byName(n); return b ? new THREE.Vector3().setFromMatrixPosition(restM(b)) : null; };
    // the staff goes with whichever hand holds it
    if (G.baton) { const bx = new THREE.Vector3().setFromMatrixPosition(G.baton[0].rest).x; const hs = bx > 0 ? 'L' : 'R'; (G['ha' + hs] = G['ha' + hs] || []).push(...G.baton); delete G.baton; }
    const J = {}; for (const sd of ['L', 'R']) J[sd] = { sh: P('DEF-upper_arm' + sd), el: P('DEF-forearm' + sd), wr: P('DEF-hand' + sd), hip: P('DEF-thigh' + sd), kn: P('DEF-shin' + sd), an: P('DEF-foot' + sd) };
    const neck = P('DEF-spine006') || P('DEF-spine005');
    // Ollo's matching bones
    const B = ollo.ch.bones, find = (re) => { const i = B.findIndex((b) => re.test(b.name)); return i >= 0 ? ollo.bones[i] : null; };
    const src = { head: ollo.bones[ollo.ch.bi.Head ?? B.findIndex((b) => /^Head$/i.test(b.name))] || null };
    for (const sd of ['L', 'R']) { src['ua' + sd] = find(new RegExp('^(Arm_Upper|UpperArm|Upper_Arm)\\.' + sd + '$', 'i')); src['la' + sd] = find(new RegExp('^(Arm_Lower|LowerArm|Lower_Arm|Forearm)\\.' + sd + '$', 'i')); src['ha' + sd] = find(new RegExp('^(Hand|Mitt|Paw)\\.' + sd + '$', 'i')); src['ul' + sd] = find(new RegExp('^(Leg_Upper|UpperLeg|Upper_Leg|Thigh)\\.' + sd + '$', 'i')); src['ll' + sd] = find(new RegExp('^(Leg_Lower|LowerLeg|Lower_Leg|Shin|Calf)\\.' + sd + '$', 'i')); src['ft' + sd] = find(new RegExp('^(Foot|Boot)\\.' + sd + '$', 'i')); }
    // Ollo's head rest (bind) rotation, from his skin
    let headRest = null; if (src.head) for (const m of ollo.meshes) { if (!m.isSkinnedMesh) continue; const k = m.skeleton.bones.indexOf(src.head); if (k >= 0) { const R = new THREE.Matrix4().copy(m.bindMatrix).invert().multiply(new THREE.Matrix4().copy(m.skeleton.boneInverses[k]).invert()); const q = new THREE.Quaternion(); R.decompose(new THREE.Vector3(), q, new THREE.Vector3()); headRest = { mesh: m, q }; break; } }
    const order = Object.values(G).flat().sort((a, b) => a.depth - b.depth);
    for (const e of eyes) { const r = restM(e); root.attach(e); e.matrixAutoUpdate = false; e.userData.rest = r; }
    ALT.v2 = { root, G, J, neck, src, headRest, order, eyes, jawAmt: 38 * s, s }; ALT.root2 = root; ALT.root = root; scene.add(root); root.visible = false;
    console.warn('[copyright safe] rigged model ready: ' + used.size + ' skin bones in ' + Object.keys(G).length + ' groups (' + Object.keys(G).join(', ') + '), Ollo bones matched: ' + Object.entries(src).filter(([, v]) => v).map(([k]) => k).join(', '));
    return root; })();
  try { return await ALT.loading2; } catch (e) { ALT.loading2 = null; throw e; } }
const _gm = new THREE.Matrix4(), _gt = new THREE.Matrix4(), _gr = new THREE.Matrix4();
function altPose2(dt) { const V = ALT.v2, R = V.root; R.position.copy(ollo.group.position); if (CAINE_GO.mode === 'fly' && !(CHK.fpv && PLAYER.c === ollo)) R.position.y += ollo._bob || 0; R.quaternion.copy(ollo.group.quaternion); R.updateMatrixWorld(true); const RQ = R.getWorldQuaternion(new THREE.Quaternion()), RQi = RQ.clone().invert();
  const srcDir = (a, b) => { if (!a || !b) return null; a.updateWorldMatrix(true, false); b.updateWorldMatrix(true, false); const d = b.getWorldPosition(new THREE.Vector3()).sub(a.getWorldPosition(new THREE.Vector3())).applyQuaternion(RQi); return d.lengthSq() > 1e-12 ? d.normalize() : null; };
  // a group's rigid motion: rotate by A about its rest pivot p0, then move that pivot to p1
  const X = (A, p0, p1) => _gt.makeTranslation(p1.x, p1.y, p1.z).clone().multiply(_gr.makeRotationFromQuaternion(A)).multiply(new THREE.Matrix4().makeTranslation(-p0.x, -p0.y, -p0.z));
  const M = {};
  for (const sd of ['L', 'R']) { const j = V.J[sd], sx = sd === 'L' ? 1 : -1; if (j.sh && j.el && j.wr) {
      let du = srcDir(V.src['ua' + sd], V.src['la' + sd]) || new THREE.Vector3(sx * 0.3, -1, 0.06).normalize(); du.x *= 0.45; du.z += 0.08; du.normalize();
      let dl = srcDir(V.src['la' + sd], V.src['ha' + sd]) || new THREE.Vector3(sx * 0.2, -1, 0.3).normalize(); dl = dl.clone().lerp(new THREE.Vector3(0, 0, 1), 0.5).normalize();
      const Au = new THREE.Quaternion().setFromUnitVectors(j.el.clone().sub(j.sh).normalize(), du); M['ua' + sd] = X(Au, j.sh, j.sh); const el1 = j.el.clone().applyMatrix4(M['ua' + sd]);
      const Al = new THREE.Quaternion().setFromUnitVectors(j.wr.clone().sub(j.el).normalize(), dl); M['la' + sd] = X(Al, j.el, el1); M['ha' + sd] = M['la' + sd]; }
    if (j.hip && j.kn && j.an) { const dt0 = srcDir(V.src['ul' + sd], V.src['ll' + sd]), ds0 = srcDir(V.src['ll' + sd], V.src['ft' + sd]);
      const At = dt0 ? new THREE.Quaternion().setFromUnitVectors(j.kn.clone().sub(j.hip).normalize(), dt0) : new THREE.Quaternion(); M['ul' + sd] = X(At, j.hip, j.hip); const kn1 = j.kn.clone().applyMatrix4(M['ul' + sd]);
      const As = ds0 ? new THREE.Quaternion().setFromUnitVectors(j.an.clone().sub(j.kn).normalize(), ds0) : At.clone(); M['ll' + sd] = X(As, j.kn, kn1); M['ft' + sd] = M['ll' + sd]; } }
  // head: Ollo's head rotation (look-at, nods, expressions) about the neck
  let Ah = new THREE.Quaternion(); if (V.headRest && V.src.head) { const S = V.headRest; S.mesh.updateWorldMatrix(true, false); V.src.head.updateWorldMatrix(true, false); const MQ = S.mesh.getWorldQuaternion(new THREE.Quaternion()); const cur = MQ.clone().invert().multiply(V.src.head.getWorldQuaternion(new THREE.Quaternion())); const D = cur.multiply(S.q.clone().invert()); Ah = RQi.clone().multiply(MQ.clone().multiply(D).multiply(MQ.clone().invert())).multiply(RQ); }
  if (V.neck) M.head = X(Ah, V.neck, V.neck);
  // jaw: the whole lower jaw (gums, teeth, tongue) drops with his speech, along the head's own "down"
  ALT.open += (ALT.openT - ALT.open) * (1 - Math.exp(-dt * 24)); if (M.head) { const dn = new THREE.Vector3(0, -1, 0).applyQuaternion(Ah).multiplyScalar(ALT.open * V.jawAmt); M.jaw = new THREE.Matrix4().makeTranslation(dn.x, dn.y, dn.z).multiply(M.head); }
  for (const it of V.order) { const g = groupOf2(it.b, V); const T = g && M[g]; const want = T ? T.clone().multiply(it.rest) : it.rest; const P = it.b.parent; P.updateWorldMatrix(true, false); _gm.copy(P.matrixWorld).invert().multiply(R.matrixWorld).multiply(want); _gm.decompose(it.b.position, it.b.quaternion, it.b.scale); it.b.updateMatrixWorld(true); }
  for (const e of V.eyes) { e.matrix.copy(M.head ? M.head.clone().multiply(e.userData.rest) : e.userData.rest); e.matrixWorldNeedsUpdate = true; } }
function groupOf2(b, V) { if (b.userData.g2 !== undefined) return b.userData.g2; for (const [g, list] of Object.entries(V.G)) if (list.some((x) => x.b === b)) return (b.userData.g2 = g); return (b.userData.g2 = null); }
// ---- a new body (everything below the head) for the alternate model: ONE skinned mesh on a clean skeleton, built to the
// proportions of the original file (its own joint positions), so nothing can tear, stretch or come apart. The head, eyes, hat and
// cane stay from the file; the cane moves to the new right hand.
function altBuildBody(model, root, by, s) {
  root.updateMatrixWorld(true); const W = (n) => { const o = by(n); return o ? o.getWorldPosition(new THREE.Vector3()) : null; };
  const J = { hip: W('hip1_308'), chest: W('chest_310'), sh: W('shoulder_311'), neck: W('neck_146'), L: { ua: W('leftUpperArm_'), la: W('leftForearm_'), ha: W('leftHand_'), ul: W('leftThigh_'), ll: W('leftCalf_'), ft: W('leftFoot_'), toe: W('leftFootToe_') }, R: { ua: W('rightUpperArm_'), la: W('rightForearm_'), ha: W('rightHand_'), ul: W('rightThigh_'), ll: W('rightCalf_'), ft: W('rightFoot_'), toe: W('rightFootToe_') } };
  if (!J.hip || !J.sh || !J.L.ua || !J.R.ua || !J.L.ul || !J.R.ul) return null;
  const top = J.sh.clone(); if (J.neck && J.neck.y > top.y) top.y = J.sh.y + (J.neck.y - J.sh.y) * 0.25; const footY = Math.min(J.L.ft.y, J.R.ft.y); const H = Math.max(1e-3, top.y - footY);
  const halfSh = Math.abs(J.L.ua.x - J.R.ua.x) / 2, cx = (J.L.ua.x + J.R.ua.x) / 2, cz = J.hip.z;
  // the file's shoulder joints sit almost on the spine: the body gets a real width, and the arms start at the edge of the chest
  const HX = Math.max(halfSh * 0.62, H * 0.13); for (const sd of ['L', 'R']) J[sd].ua = new THREE.Vector3(cx + (sd === 'L' ? 1 : -1) * HX * 1.05, top.y - H * 0.06, cz);
  for (const sd of ['L', 'R']) { const sx = sd === 'L' ? 1 : -1; for (const k of ['ul', 'll', 'ft', 'toe']) if (J[sd][k]) J[sd][k] = J[sd][k].clone().add(new THREE.Vector3(sx * H * 0.035, 0, 0)); } /* legs set wider apart */
  // skeleton (all bones start un-rotated in the model's space, so driving them is direct)
  const names = ['hips', 'chest', 'neck', 'uaL', 'laL', 'haL', 'uaR', 'laR', 'haR', 'ulL', 'llL', 'ftL', 'ulR', 'llR', 'ftR'], parent = { chest: 'hips', neck: 'chest', uaL: 'chest', laL: 'uaL', haL: 'laL', uaR: 'chest', laR: 'uaR', haR: 'laR', ulL: 'hips', llL: 'ulL', ftL: 'llL', ulR: 'hips', llR: 'ulR', ftR: 'llR' };
  const pos = { hips: J.hip.clone(), chest: (J.chest || J.hip.clone().lerp(top, 0.5)).clone(), neck: top.clone(), uaL: J.L.ua, laL: J.L.la, haL: J.L.ha, uaR: J.R.ua, laR: J.R.la, haR: J.R.ha, ulL: J.L.ul, llL: J.L.ll, ftL: J.L.ft, ulR: J.R.ul, llR: J.R.ll, ftR: J.R.ft };
  // fingers: every glove gets a palm, four two-jointed fingers and a two-jointed thumb, each on its own bones (auto-weighted below)
  const FT = {}, HANDS = []; for (const sd of ['L', 'R']) { const j = J[sd], dir = j.ha.clone().sub(j.la).normalize(); let side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0)); if (side.lengthSq() < 1e-6) side.set(0, 0, 1); side.normalize(); const inw = new THREE.Vector3(sd === 'L' ? -1 : 1, 0, 0); const pe = j.ha.clone().addScaledVector(dir, H * 0.075); /* a taller palm */ FT[sd] = { dir, pe, side, nf: 3, fs: 0.044, fr: [0.0168, 0.0178, 0.0162] };
    const add = (n, p, par) => { names.push(n); parent[n] = par; pos[n] = p; };
    const NF = FT[sd].nf, FL = [0.072, 0.08, 0.068]; for (let f = 0; f < NF; f++) { const c0 = f - (NF - 1) / 2, L = H * FL[f], b0 = pe.clone().addScaledVector(side, c0 * H * FT[sd].fs).addScaledVector(dir, -H * 0.004 * Math.abs(c0)); /* Caine's cartoon glove: three fingers and a thumb */ add('f' + f + sd + 'a', b0, 'ha' + sd); add('f' + f + sd + 'b', b0.clone().addScaledVector(dir, L * 0.55), 'f' + f + sd + 'a'); FT[sd]['t' + f] = b0.clone().addScaledVector(dir, L); }
    const td = dir.clone().multiplyScalar(0.5).addScaledVector(side, 0.7).addScaledVector(inw, 0.45).normalize(), t0 = j.ha.clone().addScaledVector(dir, H * 0.004).addScaledVector(side, H * 0.05) /* the thumb sits at the bottom corner of the palm, almost at the wrist */; add('thA' + sd, t0, 'ha' + sd); add('thB' + sd, t0.clone().addScaledVector(td, H * 0.038), 'thA' + sd); FT[sd].tt = t0.clone().addScaledVector(td, H * 0.07); }
  // coat tails: a chain of three cloth bones per tail (simulated as fabric every frame), longer, reaching down to the knees
  const TAILS = {}; { const wy = J.hip.y + (top.y - J.hip.y) * 0.36 + H * 0.01, fz0 = HX * 0.58; for (const sd of ['L', 'R']) { const sx = sd === 'L' ? 1 : -1, kn = J[sd].ll; TAILS[sd] = [new THREE.Vector3(cx + sx * HX * 0.36, J.hip.y + (wy - J.hip.y) * 0.12, cz - fz0 * 0.6), new THREE.Vector3(cx + sx * HX * 0.38, J.hip.y + (kn.y - J.hip.y) * 0.32, cz - H * 0.078), new THREE.Vector3(cx + sx * HX * 0.38, J.hip.y + (kn.y - J.hip.y) * 0.82, cz - H * 0.074), new THREE.Vector3(cx + sx * HX * 0.38, J.hip.y + (kn.y - J.hip.y) * 1.25, cz - H * 0.07)]; /* the tails hang straight down, close behind the legs */ /* the tails start lower (at the hips) and hang to just below the knees */
      for (let k = 0; k < 3; k++) { const n = 'tl' + sd + k; names.push(n); parent[n] = k ? 'tl' + sd + (k - 1) : 'hips'; pos[n] = TAILS[sd][k].clone(); } } }
  const bones = {}, idx = {}; names.forEach((n, i) => { const b = new THREE.Bone(); b.name = 'Body_' + n; bones[n] = b; idx[n] = i; });
  for (const n of names) { const b = bones[n], p = parent[n]; if (p) { bones[p].add(b); b.position.copy(pos[n]).sub(pos[p]); } else b.position.copy(pos[n]); }
  const grp = new THREE.Group(); grp.name = 'AltBody'; grp.add(bones.hips); root.add(grp); grp.position.y = H * 0.11; /* the body sits higher, up under the head */ grp.updateMatrixWorld(true);
  // geometry: tubes along joint paths, blended skin weights at every joint, colours painted per vertex
  const P = [], C = [], SI = [], SWt = [], I = []; const col = (h) => new THREE.Color(h);
  const RED = col('#b3122a'), DRED = col('#7d0c1d'), BLACK = col('#141015'), WHITE = col('#f4f1ea'), GOLD = col('#d6a422'), SHOE = col('#0b0a0c');
  const vert = (p, c, w) => { P.push(p.x, p.y, p.z); C.push(c.r, c.g, c.b); const ws = w.slice().sort((a, b) => b[1] - a[1]).slice(0, 4); const sum = ws.reduce((a, q) => a + q[1], 0) || 1; for (let k = 0; k < 4; k++) { SI.push(ws[k] ? idx[ws[k][0]] : 0); SWt.push(ws[k] ? ws[k][1] / sum : 0); } return P.length / 3 - 1; };
  // path: [{p, r, b}] — b = the bone of the segment that starts at that point; ex/ez stretch the cross-section; paint(u, front, side) -> colour
  const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }, mixc = (a, b, t) => a.clone().lerp(b, t);
  // an organic tube: a smooth (Catmull-Rom) spine through the joints, smoothly interpolated radii, a twist-free frame carried along it,
  // a rounded (superellipse) cross-section, dense rings, and rounded domed ends instead of flat caps; skin weights blend smoothly
  // across every joint
  const tube = (path, ex, ez, paint, sides = 28, caps = [true, true], pw = 2) => { const n = 14, K = path.length, curve = new THREE.CatmullRomCurve3(path.map((q) => q.p.clone()), false, 'centripetal', 0.5);
    const rAt = (k, t) => { const r0 = path[Math.max(0, k - 1)].r, r1 = path[k].r, r2 = path[Math.min(K - 1, k + 1)].r, r3 = path[Math.min(K - 1, k + 2)].r, t2 = t * t, t3 = t2 * t; return Math.max(1e-5, 0.5 * (2 * r1 + (-r0 + r2) * t + (2 * r0 - 5 * r1 + 4 * r2 - r3) * t2 + (-r0 + 3 * r1 - 3 * r2 + r3) * t3)); };
    const S = []; for (let k = 0; k + 1 < K; k++) for (let j = 0; j < n || (k === K - 2 && j === n); j++) { const t = j / n; S.push({ k: Math.min(k, K - 2), t, p: curve.getPoint((k + t) / (K - 1)), r: rAt(k, t) }); }
    const L = S.length; const Ts = S.map((s0, q) => (q < L - 1 ? S[q + 1].p.clone().sub(s0.p) : s0.p.clone().sub(S[q - 1].p)).normalize());
    let N = (() => { const T = Ts[0], ref = Math.abs(T.y) > 0.7 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0); const B0 = new THREE.Vector3().crossVectors(T, ref).normalize(); return new THREE.Vector3().crossVectors(B0, T).normalize(); })();
    const wAt = (k, t) => { const bk = path[k].b, nb = path[Math.min(K - 1, k + 1)].b, pb = path[Math.max(0, k - 1)].b; if (t > 0.6 && k + 1 < K - 1 && nb !== bk) { const a = 0.5 * sst(0.6, 1, t); return [[bk, 1 - a], [nb, a]]; } if (t < 0.4 && k > 0 && pb !== bk) { const a = 0.5 * (1 - sst(0, 0.4, t)); return [[pb, a], [bk, 1 - a]]; } return [[bk, 1]]; };
    const se = (c) => Math.sign(c) * Math.pow(Math.abs(c), 2 / pw); const rings = [];
    const ringAt = (c, T, Nn, r, u, w) => { const B = new THREE.Vector3().crossVectors(T, Nn).normalize(), ring = []; for (let a = 0; a < sides; a++) { const ang = a / sides * Math.PI * 2, d = Nn.clone().multiplyScalar(se(Math.cos(ang)) * ex).addScaledVector(B, se(Math.sin(ang)) * ez); const dir = d.clone().normalize(); ring.push(vert(c.clone().addScaledVector(d, r), paint(u, dir.z, dir.x), w)); } return ring; };
    const frames = []; for (let q = 0; q < L; q++) { if (q > 0) { const qq = new THREE.Quaternion().setFromUnitVectors(Ts[q - 1], Ts[q]); N.applyQuaternion(qq); N.sub(Ts[q].clone().multiplyScalar(N.dot(Ts[q]))).normalize(); } frames.push(N.clone()); }
    // domed start
    const dome = (q0, dirSign, u) => { const dh = dirSign < 0 ? caps[0] : caps[1], hf = typeof dh === 'number' ? dh : 0.9; /* a number = how tall the rounded end is (0.2 = nearly flat) */ const s0 = S[q0], T = Ts[q0], w = q0 === 0 ? wAt(0, 0) : wAt(S[q0].k, 1), out = []; for (let i = 4; i >= 1; i--) { const a = i / 5 * Math.PI / 2; out.push({ ring: ringAt(s0.p.clone().addScaledVector(T, dirSign * Math.sin(a) * s0.r * hf), T, frames[q0], s0.r * Math.cos(a), u, w), c: s0.p.clone().addScaledVector(T, dirSign * Math.sin(a) * s0.r * hf), w }); } return { list: out, apex: { p: s0.p.clone().addScaledVector(T, dirSign * s0.r * hf), w } }; };
    const startD = caps[0] ? dome(0, -1, 0) : null; if (startD) for (const R of startD.list) rings.push(R);
    for (let q = 0; q < L; q++) { const s0 = S[q]; rings.push({ ring: ringAt(s0.p, Ts[q], frames[q], s0.r, q / (L - 1), q === L - 1 ? [[path[K - 1].b || path[K - 2].b, 1]] : wAt(s0.k, s0.t)), c: s0.p, w: null }); }
    const endD = caps[1] ? dome(L - 1, 1, 1) : null; if (endD) for (const R of endD.list.slice().reverse()) rings.push(R);
    for (let q = 0; q + 1 < rings.length; q++) for (let a = 0; a < sides; a++) { const a1 = (a + 1) % sides, A = rings[q].ring[a], Bq = rings[q].ring[a1], Cq = rings[q + 1].ring[a1], D = rings[q + 1].ring[a]; I.push(A, Cq, D, A, Bq, Cq); }
    const fan = (R, ap, flip, c) => { const m = vert(ap.p, c, ap.w); for (let a = 0; a < sides; a++) { const a1 = (a + 1) % sides; if (flip) I.push(m, R.ring[a], R.ring[a1]); else I.push(m, R.ring[a1], R.ring[a]); } };
    if (startD) fan(rings[0], startD.apex, false, paint(0, 0, 0)); if (endD) fan(rings[rings.length - 1], endD.apex, true, paint(1, 0, 0)); };
  const U = (v) => v * H;
  // torso: a tailored ringmaster coat (red), white shirt front, black lapels, black waistcoat below
  const waist = J.hip.clone().lerp(top, 0.36).add(new THREE.Vector3(0, H * 0.01, 0)), chest = J.hip.clone().lerp(top, 0.72).add(new THREE.Vector3(0, H * 0.01, 0)); const hx = HX;
  // one continuous torso: pelvis, a nipped waist, a full chest, rounded shoulders that close smoothly into the collar
  const C0 = (y, z = 0) => new THREE.Vector3(cx, y + U(0.01), cz + z); /* the torso sits a little lower again */ const yH = J.hip.y, yT = top.y, yy = (f) => yH + (yT - yH) * f;
  const TV0 = P.length / 3; tube([{ p: C0(Math.min(yy(0.03), Math.max(J.L.ul.y, J.R.ul.y) + U(0.012)) - U(0.01), -U(0.004)), r: hx * 0.78, b: 'hips' }, { p: C0(yy(0.2)), r: hx * 0.74, b: 'hips' } /* a smaller lower torso; the hem still meets the trousers */, { p: C0(yy(0.3), U(0.006)), r: hx * 0.72, b: 'hips' }, { p: C0(yy(0.52), U(0.008)), r: hx * 0.95, b: 'chest' } /* a shorter lower torso (the waist sits lower), same overall height */, { p: C0(yy(0.8), U(0.004)), r: hx * 1.04, b: 'chest' }, { p: C0(yy(0.94)), r: hx * 1.0, b: 'chest' }], 1, 0.72, /* a fuller, deeper torso */
    (u, f) => { const shirt = sst(0.76, 0.86, f) * sst(0.48, 0.56, u), lapel = sst(0.55, 0.66, f) * sst(0.4, 0.48, u) * (1 - sst(0.9, 0.97, u)), vest = sst(0.62, 0.72, f) * sst(0.12, 0.2, u) * (1 - sst(0.44, 0.52, u)); let c = mixc(RED, DRED, 0.25 * sst(-0.2, -0.9, f)); c = mixc(c, BLACK, Math.max(lapel, vest)); return mixc(c, WHITE, shirt); }, 44, [true, 0.22], 2.5); /* broad shoulders with a nearly flat top: no neck */
  { const yW = J.hip.y + (top.y - J.hip.y) * 0.45; for (let i = TV0; i < P.length / 3; i++) { const y = P[i * 3 + 1]; if (y >= yW) continue; const f = 0.84 + 0.16 * sst(J.hip.y, yW, y); P[i * 3 + 2] = cz + (P[i * 3 + 2] - cz) * f; } } /* the lower torso is a little less deep front to back */
  // collar (white) and bow tie (black), gold buttons down the waistcoat
  const fz = hx * 0.58; /* no neck: the shoulders close straight under the head */
  for (const sx of [-1, 1]) tube([{ p: top.clone().setX(cx).add(new THREE.Vector3(0, -U(0.02), cz + fz * 1.02)), r: U(0.016), b: 'chest' }, { p: top.clone().setX(cx + sx * U(0.06)).add(new THREE.Vector3(0, -U(0.02), cz + fz * 0.98)), r: U(0.026), b: 'chest' }], 1, 0.45, () => BLACK, 12);
  for (let k = 0; k < 3; k++) { const y = waist.y + (chest.y - waist.y) * (0.1 + k * 0.32); tube([{ p: new THREE.Vector3(cx, y, cz + fz * 1.0), r: U(0.011), b: k ? 'chest' : 'hips' }, { p: new THREE.Vector3(cx, y, cz + fz * 1.0 + U(0.012)), r: U(0.011), b: k ? 'chest' : 'hips' }], 1, 1, () => GOLD, 10); }
  // coat tails: two long tapered tails at the back, down past the knees
  for (const sd of ['L', 'R']) { const sx = sd === 'L' ? 1 : -1, kn = J[sd].ll; void kn; void sx; tube(TAILS[sd].map((p, k) => ({ p: p.clone(), r: hx * [0.4, 0.38, 0.28, 0.13][k] /* wider tails */, b: 'tl' + sd + Math.min(k, 2) })), 1, 0.16, (u) => (u > 0.94 ? BLACK : u > 0.35 ? RED : DRED), 16); } /* longer tails, skinned to their cloth bones */
  // legs: slim black trousers, glossy shoes
  for (const sd of ['L', 'R']) { const j = J[sd]; const LV0 = P.length / 3; tube([{ p: j.ul, r: U(0.062), b: 'ul' + sd }, { p: j.ll, r: U(0.044), b: 'll' + sd }, { p: j.ft.clone().add(new THREE.Vector3(0, U(0.03), 0)), r: U(0.034), b: 'ft' + sd }], 1, 1, () => BLACK, 26);
    { const pts = [j.ul, j.ll, j.ft.clone().add(new THREE.Vector3(0, U(0.03), 0))], v = new THREE.Vector3(); for (let i = LV0; i < P.length / 3; i++) { v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); let best = null, bd = Infinity; for (let s = 0; s < 2; s++) { const a = pts[s], ab = pts[s + 1].clone().sub(a), t = clamp(v.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq()), 0, 1), c = a.clone().addScaledVector(ab, t), d = c.distanceToSquared(v); if (d < bd) { bd = d; best = c; } } const dz = v.z - best.z; P[i * 3 + 2] = best.z + dz * (dz > 0 ? 1.25 : 0.9); } } /* legs: fuller at the front (shins, thighs), a little slimmer at the back */
    const toe = (j.toe || j.ft.clone().add(new THREE.Vector3(0, 0, U(0.1)))).clone(); toe.y = j.ft.y; const heel = j.ft.clone().add(new THREE.Vector3(0, 0, -U(0.03))); heel.y = j.ft.y + U(0.012); toe.y = j.ft.y + U(0.012);
    tube([{ p: heel, r: U(0.036), b: 'ft' + sd }, { p: toe.clone().lerp(heel, 0.25), r: U(0.041), b: 'ft' + sd }, { p: toe.clone().add(toe.clone().sub(heel).normalize().multiplyScalar(U(0.03))), r: U(0.02), b: 'ft' + sd }], 1.1, 0.75, () => SHOE, 16); }
  // arms: red sleeves with a dark stripe seamlessly flowing into connected gold cuffs, white gloves with a thumb
  for (const sd of ['L', 'R']) { const j = J[sd], sx = sd === 'L' ? 1 : -1, dir = j.ha.clone().sub(j.la).normalize(), wr = j.la.clone().lerp(j.ha, 0.78);
    // ONE continuous watertight sleeve+cuff mesh weighted cleanly along chest -> ua -> la so the gold cuff is permanently connected to the sleeve with zero gap
    tube([
      { p: new THREE.Vector3(cx + sx * hx * 0.45, j.ua.y + U(0.005), cz), r: U(0.05), b: 'chest' },
      { p: j.ua, r: U(0.053), b: 'ua' + sd },
      { p: j.ua.clone().lerp(j.la, 0.5), r: U(0.046), b: 'ua' + sd },
      { p: j.la, r: U(0.041), b: 'la' + sd },
      { p: j.la.clone().lerp(wr, 0.55), r: U(0.039), b: 'la' + sd },
      { p: wr, r: U(0.038), b: 'la' + sd },
      { p: wr.clone().lerp(j.ha, 0.25), r: U(0.047), b: 'la' + sd },
      { p: j.ha.clone().addScaledVector(dir, U(0.004)), r: U(0.051), b: 'la' + sd },
    ], 1, 1, (u, f) => { const slv = mixc(RED, DRED, 0.6 * sst(-0.6, -0.95, f)); return mixc(slv, GOLD, sst(0.71, 0.77, u)); }, 28, [true, 0.18]);
    HANDS.push({ sd, dir: dir.clone(), F: FT[sd], ha: j.ha.clone() }); /* the glove is built below as one organic mesh */ const F = FT[sd]; if (false) tube([{ p: j.ha.clone().addScaledVector(dir, -U(0.005)), r: U(0.04), b: 'ha' + sd }, { p: j.ha.clone().addScaledVector(dir, U(0.032)), r: U(0.05), b: 'ha' + sd }, { p: F.pe.clone().addScaledVector(dir, U(0.006)), r: U(0.045), b: 'ha' + sd }], 1, 0.6, () => WHITE, 28, [true, 0.25]); /* the palm: a nearly flat end so every finger comes out of it instead of being buried in a rounded mitten */
    if (false) for (let f = 0; f < 4; f++) { const a = pos['f' + f + sd + 'a'], b = pos['f' + f + sd + 'b'], r = U([0.0165, 0.018, 0.0172, 0.015][f]); tube([{ p: a.clone().addScaledVector(dir, -U(0.014)), r: r * 1.1, b: 'ha' + sd }, { p: a, r, b: 'f' + f + sd + 'a' }, { p: b, r: r * 0.95, b: 'f' + f + sd + 'b' }, { p: F['t' + f], r: r * 0.85, b: 'f' + f + sd + 'b' }], 1, 1, () => WHITE, 14); }
    if (false) tube([{ p: pos['thA' + sd].clone().addScaledVector(dir, -U(0.012)), r: U(0.024), b: 'ha' + sd }, { p: pos['thA' + sd], r: U(0.022), b: 'thA' + sd }, { p: pos['thB' + sd], r: U(0.02), b: 'thB' + sd }, { p: F.tt, r: U(0.016), b: 'thB' + sd }], 1, 1, () => WHITE, 14); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SWt, 4)); g.setIndex(I); g.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 })); mesh.name = 'AltBodyMesh'; mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false; grp.add(mesh);
  const skel = new THREE.Skeleton(names.map((n) => bones[n])); grp.updateMatrixWorld(true); mesh.bind(skel);
  for (const Hd of HANDS) { try { const hg = CHK_MC.MC ? chkBuildHand(Hd, pos, U, idx, CHK_MC.MC, CHK_MC.merge) : null; if (hg) { const hm = new THREE.SkinnedMesh(hg, new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.6, metalness: 0 })); hm.name = 'AltGlove' + Hd.sd; hm.castShadow = hm.receiveShadow = true; hm.frustumCulled = false; grp.add(hm); hm.bind(skel); } else console.warn('[caine] glove could not be built'); } catch (e) { console.warn('[caine] glove', e); } }
  // the file's own body (and its gloves) is hidden; the cane moves to the new right hand
  let hidden = 0; model.traverse((o) => { if (o.isSkinnedMesh && o.skeleton.bones.some((b) => /^hip1_308/.test(b.name))) { o.visible = false; hidden++; } });
  const cane = (() => { let f = null; model.traverse((o) => { if (!f && o.name === 'Object_50') f = o; }); if (!f) model.traverse((o) => { if (!f && /^Object_50/.test(o.name)) f = o.isMesh && o.parent && /^Object_50/.test(o.parent.name) ? o.parent : o; }); return f; })(); if (cane) { grp.updateMatrixWorld(true); bones.haR.attach(cane); /* then slide it so its handle sits IN his palm (not floating beside the hand) */ const bb = new THREE.Box3().setFromObject(cane), sz = bb.getSize(new THREE.Vector3()), grip = new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y - sz.y * 0.16, (bb.min.z + bb.max.z) / 2), palm = grp.localToWorld(pos.haR.clone().lerp(FT.R.pe, 0.5)); const wp = cane.getWorldPosition(new THREE.Vector3()).add(palm.sub(grip)); cane.position.copy(cane.parent.worldToLocal(wp)); cane.updateMatrixWorld(true); }
  { let gl = 0; const caneSet = new Set(); if (cane) cane.traverse((o) => caneSet.add(o)); model.traverse((o) => { if (!o.isMesh || !o.visible || caneSet.has(o) || o === mesh) return; let p = o, anc = false; while (p && p !== model) { if (/(left|right)(Hand|Forearm)|glove|finger|thumb|palm/i.test(p.name || '')) { anc = true; break; } p = p.parent; }
    if (!anc && o.isSkinnedMesh && o.skeleton) { const SI = o.geometry.attributes.skinIndex, SW = o.geometry.attributes.skinWeight; if (SI && SW) { let h = 0; for (let i = 0; i < SI.count; i++) { let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = SW.getComponent(i, k); if (w > bw) { bw = w; bi = SI.getComponent(i, k); } } const bn = o.skeleton.bones[bi]; if (bn && /(Hand|Finger|Thumb|Index|Middle|Ring|Pinky)/i.test(bn.name)) h++; } anc = h > SI.count * 0.5; } }
    if (anc) { o.visible = false; gl++; } }); hidden += gl; } /* the file's own gloves are hidden: only the new rigged hands show */
  const restDir = (a, b) => pos[b].clone().sub(pos[a]).normalize();
  const rd = {}; for (const sd of ['L', 'R']) { rd['ua' + sd] = restDir('ua' + sd, 'la' + sd); rd['la' + sd] = restDir('la' + sd, 'ha' + sd); rd['ul' + sd] = restDir('ul' + sd, 'll' + sd); rd['ll' + sd] = restDir('ll' + sd, 'ft' + sd); }
  return { bones, rd, mesh, hidden, H, tails: TAILS, HX, pos, cane, caneLocal: cane ? { p: cane.position.clone(), q: cane.quaternion.clone() } : null, footY: footY + H * 0.11 };
}
// pose the new body from Ollo's rig every frame (root space; every bone starts un-rotated)
function altDriveBody(B, RQi) { const role = ALT.role, ob = (i) => (i >= 0 ? ollo.bones[i] : null);
  const srcDir = (a, b) => { const A = ob(a), Bb = ob(b); if (!A || !Bb) return null; A.updateWorldMatrix(true, false); Bb.updateWorldMatrix(true, false); const d = Bb.getWorldPosition(new THREE.Vector3()).sub(A.getWorldPosition(new THREE.Vector3())).applyQuaternion(RQi); return d.lengthSq() > 1e-12 ? d.normalize() : null; };
  const set = (n, Wq, parentW) => { B.bones[n].quaternion.copy(parentW.clone().invert().multiply(Wq)); return Wq; };
  const I0 = new THREE.Quaternion(); set('hips', I0, I0);
  const chestQ = (FPV_LOOK.active && PLAYER.c === ollo && Math.abs(FPV_LOOK.spineYaw) > 1e-4) ? new THREE.Quaternion().setFromAxisAngle(UP, FPV_LOOK.spineYaw) : I0;
  set('chest', chestQ, I0); set('neck', chestQ, chestQ);
  for (const sd of ['L', 'R']) { const sx = sd === 'L' ? 1 : -1;
    let du = srcDir(role['ua' + sd], role['la' + sd]) || new THREE.Vector3(sx * 0.3, -1, 0.06); du = du.clone(); du.x *= 0.45; du.z += 0.08; du.normalize();
    let dl = srcDir(role['la' + sd], role['ha' + sd]) || new THREE.Vector3(sx * 0.2, -1, 0.3); dl = dl.clone().normalize().lerp(new THREE.Vector3(0, 0, 1), 0.5).normalize();
    const aim = (key, rD, d, hint) => { B.ps = B.ps || {}; const rs0 = new THREE.Vector3(0, 0, 1), rs = rs0.clone().addScaledVector(rD, -rs0.dot(rD)); if (rs.lengthSq() < 1e-8) return new THREE.Quaternion().setFromUnitVectors(rD, d); rs.normalize(); const prev = B.ps[key]; let s = (prev ? prev.clone().lerp(hint, 0.06) : hint.clone()); s.addScaledVector(d, -s.dot(d)); if (s.lengthSq() < 1e-6 && prev) { s = prev.clone(); s.addScaledVector(d, -s.dot(d)); } if (s.lengthSq() < 1e-8) return new THREE.Quaternion().setFromUnitVectors(rD, d); s.normalize(); B.ps[key] = s.clone(); const m0 = new THREE.Matrix4().makeBasis(rD, rs, new THREE.Vector3().crossVectors(rD, rs)), m1 = new THREE.Matrix4().makeBasis(d, s, new THREE.Vector3().crossVectors(d, s)); return new THREE.Quaternion().setFromRotationMatrix(m1.multiply(m0.transpose())); }; /* aims a limb AND keeps its twist steady (front stays front), so the hand never spins around the arm */
    const fh = (d) => { const f = new THREE.Vector3().crossVectors(d, new THREE.Vector3(sx, 0, 0)).multiplyScalar(sx); return f.lengthSq() > 1e-4 ? f.normalize() : new THREE.Vector3(0, 0, 1); }; /* 'front of the arm' that turns smoothly with it */
    const Wu = set('ua' + sd, aim('ua' + sd, B.rd['ua' + sd], du, fh(du)), I0); const Wl = set('la' + sd, aim('la' + sd, B.rd['la' + sd], dl, new THREE.Vector3(0, 0, 1).applyQuaternion(Wu).lerp(fh(dl), 0.5).normalize()), Wu); set('ha' + sd, Wl, Wl);
    const dt0 = srcDir(role['ul' + sd], role['ll' + sd]), ds0 = srcDir(role['ll' + sd], role['ft' + sd]); const Wt = set('ul' + sd, dt0 ? new THREE.Quaternion().setFromUnitVectors(B.rd['ul' + sd], dt0) : I0, I0); const Ws = set('ll' + sd, ds0 ? new THREE.Quaternion().setFromUnitVectors(B.rd['ll' + sd], ds0) : Wt, Wt); set('ft' + sd, Ws, Ws); }
  B.bones.hips.updateMatrixWorld(true); }
// only the main view shows the model (Ollo's own eyes, thumbnails and the AI's views keep seeing the real Ollo)
{ const _rA = renderer.render.bind(renderer); let lastT = performance.now();
  renderer.render = function (sc, cam) { if (!(ALT.on && ALT.root && sc === scene && (cam === camera || SBX.mirrorOn))) return _rA(sc, cam); /* Caine shows in mirrors too */ const now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; const hid = [];
    for (const m of ollo.meshes) if (m.visible) { m.visible = false; hid.push(m); } const wv = wand.visible; wand.visible = false; try { if (ALT.v2) altPose2(dt); else altPose(dt); } catch (e) { console.warn('[copyright safe] pose', e); } ALT.root.visible = true;
    try { return _rA(sc, cam); } finally { ALT.root.visible = false; for (const m of hid) m.visible = true; wand.visible = wv; } }; }
// the switch: in the toolbar; ON every time the page loads; turning it OFF asks first
const btnSafe = h('button', { 'aria-pressed': 'true', title: 'Copyright safe: on shows Ollo. Turn off to show your own private fan-made model instead.' }, '© Safe: on'); barEl.querySelector('.bar-btns').append(btnSafe);
function setSafe(on) { ALT.on = !on; btnSafe.setAttribute('aria-pressed', String(on)); btnSafe.textContent = on ? '© Safe: on' : '© Safe: off'; try { btnSmart.textContent = on ? 'Smart Ollo' : 'Smart Caine'; const hs = chatEl.querySelector('header span'); if (hs && hs.firstChild && hs.firstChild.nodeType === 3) hs.firstChild.textContent = on ? 'Smart Ollo ' : 'Smart Caine '; } catch (e) { /* ok */ } }
function safeWarn() { return new Promise((res) => { const bg = h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'safeT', style: 'position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(8,12,18,.6);padding:20px' });
  const box = h('div', { style: 'max-width:420px;background:#14181f;color:#eee;border:1px solid #e0704a;border-radius:12px;padding:18px 20px;font:14px/1.5 "IBM Plex Sans",system-ui,sans-serif' });
  const t = h('h2', { id: 'safeT', style: 'margin:0 0 8px;font-size:16px;color:#f2b632' }, '⚠ Turn off copyright safe?'); const p = h('p', { style: 'margin:0 0 10px' }, 'Ollo will be replaced by a fan-made 3D model of Caine, a character owned by Glitch Productions (The Amazing Digital Circus). It is not an official model.');
  const p2 = h('p', { style: 'margin:0 0 14px;color:#9db0b0' }, 'For private, non-commercial use only: keep this page private, and do not share, publish or monetize it while this is off. It switches back to Ollo every time the page loads.');
  const no = h('button', { type: 'button', style: 'margin-right:8px' }, 'Keep Ollo'), yes = h('button', { type: 'button', class: 'pri', style: 'background:#e0704a;color:#14181f;border-color:#e0704a' }, 'Turn off'); const done = (v) => { bg.remove(); removeEventListener('keydown', esc, true); res(v); }; const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
  no.onclick = () => done(false); yes.onclick = () => done(true); bg.onclick = (e) => { if (e.target === bg) done(false); }; addEventListener('keydown', esc, true); box.append(t, p, p2, h('div', { style: 'text-align:right' }, no, yes)); bg.append(box); document.body.append(bg); no.focus(); }); }
btnSafe.onclick = async () => { if (ALT.on) { setSafe(true); toast('Copyright safe on — Ollo is back'); return; } if (!(await safeWarn())) return; btnSafe.disabled = true; btnSafe.textContent = '© Loading…';
  try { await altLoad(); setSafe(false); toast('Copyright safe off — private use only'); } catch (e) { console.error('[copyright safe] the model did not load', e); setSafe(true); toast('The model could not be loaded'); } finally { btnSafe.disabled = false; } };
setSafe(true);
// ---------------------------------------------------------------- 12. the library: the user's four sets (The Grounds, Circus Lobby, Dorm Hall, The Cellar), split
// object by object (782 items), each its own searchable entry. The old assets are removed from the library (characters, animations,
// AI creations, systems, scripts and saved worlds stay). Each set is one compressed pack loaded on first use; items are copied out of it.
// the 3D files live INSIDE this artifact as its own text files (data/*.txt, base64), not as uploads: decoded here into in-memory files
async function embUrl(p) { embUrl.c = embUrl.c || new Map(); if (embUrl.c.has(p)) return embUrl.c.get(p); const pr = (async () => { const t = (await (await fetch(p)).text()).trim(); let ab = null; try { ab = await (await fetch('data:application/octet-stream;base64,' + t)).arrayBuffer(); } catch (e) { ab = null; } /* the browser's own decoder: many times faster */ if (!ab) { const bin = atob(t), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); ab = u8; } return URL.createObjectURL(new Blob([ab], { type: 'model/gltf-binary' })); })(); embUrl.c.set(p, pr); try { return await pr; } catch (e) { embUrl.c.delete(p); throw e; } }
const PACKLIB = { urls: ['data/cellar.txt', 'data/grounds.txt', 'data/lobby.txt', 'data/dorm.txt'], manifest: 'data/library.json', scenes: [], loading: [], meta: null };
async function packScene(i) { if (PACKLIB.scenes[i]) return PACKLIB.scenes[i]; if (PACKLIB.loading[i]) return PACKLIB.loading[i];
  PACKLIB.loading[i] = (async () => { const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]); const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder); toast('Loading ' + PACKLIB.meta.packs[i].label + '…'); const gl = await ld.loadAsync(await embUrl(PACKLIB.urls[i])); gl.scene.updateMatrixWorld(true); return (PACKLIB.scenes[i] = gl.scene); })();
  try { return await PACKLIB.loading[i]; } catch (e) { PACKLIB.loading[i] = null; throw e; } }
async function placePack(e, o = {}) { const sc = await packScene(e.pack.p); const src = sc.getObjectByName(e.pack.n); if (!src) throw new Error('Missing object ' + e.name);
  const obj = src.clone(true); obj.position.set(0, 0, 0); obj.quaternion.identity(); obj.scale.setScalar(PACKLIB.meta.packs[e.pack.p].scale); obj.name = e.name; obj.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  let at = o.at; if (!at) { const r = Math.max(0.4, Math.max(...e.pack.size) / 2); try { at = freeSpot(frontSpot(), r).toArray(); } catch (err) { at = [0, 0, 0]; } } obj.position.set(at[0], at[1] || 0, at[2]); if (o.yaw) obj.rotateOnWorldAxis(UP, o.yaw);
  try { const gy = groundBelow(at[0], at[2], (at[1] || 0) + 2, 80); if (gy !== null && gy !== undefined) obj.position.y = gy; } catch (err) { /* ok */ }
  const id = registerPlaced(obj, { name: e.name, entry: e.id, solid: true }); try { resolveOllo(); } catch (err) { /* ok */ } try { worldChanged(); } catch (err) { /* ok */ } SBX.dirty = true; return id; }
try { const _pe = placeEntry; placeEntry = async function (e, o) { if (e && e.kind === 'pack') return placePack(e, o || {}); return _pe(e, o); }; } catch (err) { console.warn('[library] could not hook placing', err); }
SBX.placePack = placePack;
(async () => { try { const m = await (await fetch(PACKLIB.manifest)).json(); PACKLIB.meta = m;
    const KEEP = new Set(['wand', 'cast', 'anim', 'creation', 'system', 'script', 'world', 'music', 'pack']); let gone = 0; for (let k = SBX.entries.length - 1; k >= 0; k--) { if (!KEEP.has(SBX.entries[k].kind)) { SBX.entries.splice(k, 1); gone++; } }
    try { Object.assign(CAT, { 'The Grounds': '🎡', 'Circus Lobby': '🎪', 'Dorm Hall': '🚪', 'The Cellar': '👁️' }); } catch (err) { /* ok */ }
    for (const it of m.items) addEntry({ id: 'pk_' + it.p + '_' + it.n, name: it.name, category: it.cat, kind: 'pack', pack: it, tags: it.tags, desc: it.desc, tris: it.tris, size: it.size });
    console.warn('[library] ' + gone + ' old assets removed; ' + m.items.length + ' objects added from The Grounds, Circus Lobby, Dorm Hall and The Cellar');
    try { if (!libEl.hidden) { renderChips(); renderGrid(); } } catch (err) { /* ok */ } } catch (err) { console.warn('[library] could not load the new sets', err); } })();
// ---------------------------------------------------------------- 13. character finishing pass: runs on every character in the world
// (Ollo's builds, AI creations, placed library models and Caine). For each one it repairs skin weights (auto weights for unweighted
// vertices and for finger bones nothing is weighted to), strips broken textures, then animates fingers (idle curl, breathing,
// gripping) and eyes (saccades, look-around and blinks) every frame unless the character is marked static (userData.staticEyes /
// staticHands). It reports to Activity only, never on screen.
const CHK_MC = {}; /* loaded in the background (no top-level wait, so the page is never held up by it); Caine's loader waits for it */ CHK_MC.ready = Promise.all([import('three/addons/objects/MarchingCubes.js'), import('three/addons/utils/BufferGeometryUtils.js')]).then(([a, b]) => { CHK_MC.MC = a.MarchingCubes; CHK_MC.merge = b.mergeVertices; }).catch((e) => console.warn('[hands] mesher unavailable', e));
// one organic hand: palm, knuckles, four fingers and thumb as ONE smooth closed surface (a smooth-union distance field turned into a
// mesh), skin-weighted to the hand and finger bones by how close each part is, so joints bend smoothly
function chkBuildHand(Hd, pos, U, idx, MC, merge) { const { sd, dir, F } = Hd, side = F.side, nrm = new THREE.Vector3().crossVectors(dir, side).normalize(); const comps = [];
  let G = 'palm'; const cap = (a, b, ra, rb, bn) => { const gg = G; const ax = a.x, ay = a.y, az = a.z, bx = b.x - ax, by2 = b.y - ay, bz = b.z - az, L2 = bx * bx + by2 * by2 + bz * bz || 1e-9; comps.push({ b: bn, f: (x, y, z) => { const px = x - ax, py = y - ay, pz = z - az; let t = (px * bx + py * by2 + pz * bz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t; const dx = px - bx * t, dy = py - by2 * t, dz = pz - bz * t; return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t); }, g: gg }); };
  const wr = Hd.ha.clone().addScaledVector(dir, -U(0.012)), pc = wr.clone().lerp(F.pe, 0.5), hl = wr.distanceTo(F.pe) / 2 + U(0.006), hw = U(F.fs || 0.036) * ((F.nf || 4) - 1) / 2 + U(0.017), ht = U(0.0225), rr = U(0.0165); /* a fuller, deeper palm */
  comps.push({ b: 'ha' + sd, g: 'palm', f: (x, y, z) => { const dx = x - pc.x, dy = y - pc.y, dz = z - pc.z; const along = dx * dir.x + dy * dir.y + dz * dir.z; let tt = (along + hl) / (2 * hl); tt = tt < 0 ? 0 : tt > 1 ? 1 : tt; const sm = tt * tt * (3 - 2 * tt), sc = dx * side.x + dy * side.y + dz * side.z, tap = sc > 0 ? 0.7 + 0.3 * sm : 0.9 + 0.1 * sm; /* narrower at the wrist, full width at the knuckles */ const hwE = hw * tap, htE = ht * (0.85 + 0.15 * tap); const u = Math.abs(along) / (hl - rr), v = Math.abs(sc) / (hwE - rr); const a = (Math.pow(Math.pow(u, 3.2) + Math.pow(v, 3.2), 1 / 3.2) - 1) * Math.min(hl - rr, hwE - rr), b = Math.abs(dx * nrm.x + dy * nrm.y + dz * nrm.z) - (htE - rr); const ma = Math.max(a, 0), mb = Math.max(b, 0); return Math.sqrt(ma * ma + mb * mb) + Math.min(Math.max(a, b), 0) - rr; } }); /* a soft, rounded palm that tapers toward the wrist: no sharp corners */
  for (let f = 0; f < (F.nf || 4); f++) { G = 'f' + f; const a = pos['f' + f + sd + 'a'], b = pos['f' + f + sd + 'b'], r = U((F.fr || [0.014, 0.015, 0.0145, 0.0125])[f] || 0.014); cap(a.clone().addScaledVector(dir, -U(0.018)), a, r * 1.02, r, 'ha' + sd); cap(a, b, r, r * 0.96, 'f' + f + sd + 'a'); cap(b, F['t' + f], r * 0.96, r * 0.9, 'f' + f + sd + 'b'); }
  G = 'th'; const tA = pos['thA' + sd], tB = pos['thB' + sd]; cap(tA.clone().lerp(pc, 0.6), tA, U(0.019), U(0.017), 'ha' + sd); /* thumb base: a soft mound at the bottom corner of the palm */ cap(tA, tB, U(0.017), U(0.0155), 'thA' + sd); cap(tB, F.tt, U(0.0155), U(0.013), 'thB' + sd);
  G = 'palm'; { const w0 = Hd.ha.clone().addScaledVector(dir, -U(0.05)), w1 = wr.clone().addScaledVector(dir, U(0.012)), wl = w0.distanceTo(w1); comps.push({ b: 'ha' + sd, g: 'palm', f: (x, y, z) => { const dx = x - w0.x, dy = y - w0.y, dz = z - w0.z; const pr = dx * dir.x + dy * dir.y + dz * dir.z; let t = pr / wl; t = t < 0 ? 0 : t > 1 ? 1 : t; const ov = Math.max(-pr, pr - wl, 0); const ex = dx - dir.x * t * wl, ey = dy - dir.y * t * wl, ez = dz - dir.z * t * wl, rw = U(0.03) + t * U(0.006), rd = U(0.0185) + t * U(0.003); /* deeper wrist that meets the palm's depth */ const u = (ex * side.x + ey * side.y + ez * side.z) / rw, v = (ex * nrm.x + ey * nrm.y + ez * nrm.z) / rd; const rad = (Math.sqrt(u * u + v * v) - 1) * rd; return ov > 0 ? Math.sqrt(Math.max(rad, 0) ** 2 + ov * ov) : rad; } }); } /* wrist: a flat oval (wide, not deep) that flows into the palm's own depth */
  const smin = (a, b, k) => { const h = Math.min(1, Math.max(0, 0.5 + 0.5 * (b - a) / k)); return b + (a - b) * h - k * h * (1 - h); }, kIn = U(0.01), kPalm = U(0.022);
  const groups = [...new Set(comps.map((c) => c.g))], byG = groups.map((g) => comps.filter((c) => c.g === g));
  const sdf = (x, y, z) => { let palm = 1e9; for (let gi = 0; gi < groups.length; gi++) { let d = 1e9; const kg = groups[gi] === 'palm' ? kIn : U(0.0015); for (const c of byG[gi]) d = smin(d, c.f(x, y, z), kg); /* fingers are smooth tapered tubes: no knuckle bulges */ byG[gi].dd = d; if (groups[gi] === 'palm') palm = d; } let out = palm; for (let gi = 0; gi < groups.length; gi++) if (groups[gi] !== 'palm') out = Math.min(out, smin(palm, byG[gi].dd, groups[gi] === 'th' ? U(0.011) : Math.min(kPalm, Math.max(U(0.002), palm + U(0.004))))); return out; };
  const bb = new THREE.Box3(); for (const q of [Hd.ha.clone().addScaledVector(dir, -U(0.05)), F.pe, ...Array.from({ length: F.nf || 4 }, (_, k) => F['t' + k]), F.tt, tA, tB]) bb.expandByPoint(q); bb.expandByScalar(U(0.05)); const C = bb.getCenter(new THREE.Vector3()), S = Math.max(...bb.getSize(new THREE.Vector3()).toArray()) / 2;
  const res = 72, mc = new MC(res, new THREE.MeshBasicMaterial(), false, false, 200000); /* fine enough for a smooth glove, and quick to build */ mc.isolation = 0; const half = res / 2;
  for (let z = 0; z < res; z++) for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) mc.field[x + y * res + z * res * res] = -sdf(C.x + (x - half) / half * S, C.y + (y - half) / half * S, C.z + (z - half) / half * S);
  mc.update(); const n = mc.count; if (n < 300) return null; const Pm = new Float32Array(n * 3); for (let i = 0; i < n * 3; i += 3) { Pm[i] = C.x + mc.positionArray[i] * S; Pm[i + 1] = C.y + mc.positionArray[i + 1] * S; Pm[i + 2] = C.z + mc.positionArray[i + 2] * S; }
  mc.geometry.dispose(); let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(Pm, 3)); g = merge(g, S * 1e-4); const PA = g.attributes.position, I = g.index.array;
  let vol = 0; for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, P = PA.array; vol += P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c]); }
  if (vol < 0) for (let t = 0; t < I.length; t += 3) { const s = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = s; }
  const nv = PA.count, SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4), fall = U(0.006);
  for (let i = 0; i < nv; i++) { const x = PA.getX(i), y = PA.getY(i), z = PA.getZ(i), W = new Map(); for (const c of comps) { const d = Math.max(0, c.f(x, y, z)); W.set(c.b, (W.get(c.b) || 0) + Math.exp(-d / fall)); } const top = [...W].sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((a, q) => a + q[1], 0) || 1; for (let q = 0; q < 4; q++) { SI[i * 4 + q] = top[q] ? idx[top[q][0]] : 0; SW[i * 4 + q] = top[q] ? top[q][1] / s : 0; } }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4)); g.computeVertexNormals(); return g; }
// the AI double-checks every hand it finds: which fingers each hand has, that every finger joint has skin on it, and a full-bend test
// that measures how much the skin stretches; where it would tear, the weights are smoothed with their neighbours and it is tested again
function chkHandTest(info) { const out = []; if (!info.fingers.length) return out; const bySide = { L: new Set(), R: new Set() }; for (const f of info.fingers) bySide[f.side].add(f.kind); for (const sd of ['L', 'R']) if (bySide[sd].size) out.push((sd === 'L' ? 'left' : 'right') + ' hand ' + [...bySide[sd]].join('/'));
  const ms = []; info.root.traverse((o) => { if (o.isSkinnedMesh && o.geometry.index) ms.push(o); }); const fset = new Set(info.fingers.map((f) => f.b));
  const measure = (m, edges) => { m.skeleton.update(); const A = new THREE.Vector3(), B = new THREE.Vector3(); return edges.map(([i, j]) => { m.getVertexPosition(i, A); m.getVertexPosition(j, B); return A.distanceTo(B); }); };
  const bend = (on) => { for (const f of info.fingers) { if (on) { f.q0.copy(f.b.quaternion); f.b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(f.axis, f.sign * 1.2)); } else f.b.quaternion.copy(f.q0); } info.root.updateMatrixWorld(true); };
  let worst = 1, fixedV = 0;
  for (const m of ms) { const g = m.geometry, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, ia = g.index.array; const fi = new Set(m.skeleton.bones.map((b, k) => (fset.has(b) ? k : -1)).filter((k) => k >= 0)); if (!fi.size) continue;
    const hot = new Uint8Array(SI.count); for (let i = 0; i < SI.count; i++) for (let q = 0; q < 4; q++) if (fi.has(SI.getComponent(i, q)) && SW.getComponent(i, q) > 0.02) hot[i] = 1; const edges = [], nb = new Map();
    for (let t = 0; t < ia.length; t += 3) for (let e = 0; e < 3; e++) { const i = ia[t + e], j = ia[t + ((e + 1) % 3)]; if (!hot[i] && !hot[j]) continue; if (i < j) edges.push([i, j]); for (const [p, q] of [[i, j], [j, i]]) { if (!nb.has(p)) nb.set(p, new Set()); nb.get(p).add(q); } }
    if (edges.length > 8000) { const st = Math.ceil(edges.length / 8000); for (let q = 0, w = 0; q < edges.length; q += st) edges[w++] = edges[q]; edges.length = Math.ceil(edges.length / st); } /* a spread-out sample: same check, a fraction of the time */
    for (let pass = 0; pass < 2; pass++) { info.root.updateMatrixWorld(true); const L0 = measure(m, edges); bend(true); const L1 = measure(m, edges); bend(false); const bad = new Set(); let w = 1;
      edges.forEach(([i, j], k) => { if (L0[k] < 1e-7) return; const r = Math.max(L1[k] / L0[k], L0[k] / Math.max(L1[k], 1e-9)); if (r > w) w = r; if (r > 1.7) { bad.add(i); bad.add(j); } }); worst = pass === 0 ? Math.max(worst, w) : worst; if (!bad.size) break;
      for (const i of bad) { const W = new Map(); const add = (v, s) => { for (let q = 0; q < 4; q++) { const ww = SW.getComponent(v, q); if (ww > 0) W.set(SI.getComponent(v, q), (W.get(SI.getComponent(v, q)) || 0) + ww * s); } }; add(i, 1); for (const j of nb.get(i) || []) add(j, 1); const top = [...W].sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((a, q) => a + q[1], 0) || 1; for (let q = 0; q < 4; q++) { SI.setComponent(i, q, top[q] ? top[q][0] : 0); SW.setComponent(i, q, top[q] ? top[q][1] / s : 0); } fixedV++; }
      SI.needsUpdate = SW.needsUpdate = true; } }
  out.push('bend test: worst stretch ' + worst.toFixed(2) + 'x' + (fixedV ? ', ' + fixedV + ' vertices re-weighted to stop tearing' : ', no tearing')); return out; }
// the picture-in-picture is the character's view now, so its button and title read "AI’s view" (everywhere, including anything drawn later)
{ const fix = (n) => { if (n.nodeType === 3) { if (/Ollo[’']s view/i.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/Ollo[’']s view/gi, 'AI’s view'); if (/New original character/i.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/New original character/gi, 'Play a personal avatar based on you!'); return; } if (n.nodeType !== 1) return; for (const a of ['title', 'aria-label']) { const v = n.getAttribute && n.getAttribute(a); if (v && /Ollo[’']s view/i.test(v)) n.setAttribute(a, v.replace(/Ollo[’']s view/gi, 'AI’s view')); } for (const c of n.childNodes) fix(c); };
  try { fix(document.body); new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'characterData') fix(m.target); for (const n of m.addedNodes || []) fix(n); if (m.type === 'attributes') fix(m.target); } }).observe(document.body, { subtree: true, childList: true, characterData: false, attributes: true, attributeFilter: ['title', 'aria-label'] }); /* lighter: no work on every typed / streamed character */ } catch (e) { /* ok */ } }
// Activity starts hidden every time the page opens (it still records everything; open it with its button)
setTimeout(() => { try { for (const b of document.querySelectorAll('button,[role="button"],[role="tab"]')) { if (!/^\s*activity\b/i.test(b.textContent || b.getAttribute('aria-label') || '')) continue; const on = b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-expanded') === 'true' || b.getAttribute('aria-selected') === 'true' || b.classList.contains('on') || b.classList.contains('active'); if (on) b.click(); } } catch (e) { /* ok */ } }, 1500);
// show / hide the Activity panel by its button (open: true/false)
function chkActivity(open) { try { for (const b of document.querySelectorAll('button,[role="button"],[role="tab"]')) { if (!/^\s*activity\b/i.test(b.textContent || b.getAttribute('aria-label') || '')) continue; const on = b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-expanded') === 'true' || b.getAttribute('aria-selected') === 'true' || b.classList.contains('on') || b.classList.contains('active'); if (on !== open) b.click(); } } catch (e) { /* ok */ } }
try { const _ss2 = setSafe; setSafe = function (on, ...a) { const r = _ss2.call(this, on, ...a); if (!on) setTimeout(() => chkActivity(true), 50); /* switching to Caine opens Activity */
    /* Caine lives in the Circus Lobby: a loading screen covers everything until he AND the whole map are ready, he is teleported to the middle
       of it, the camera turns to him once, then the screen goes; back to Ollo: the plain baseplate */ try { if (!on) { chkLoading(true, 'Opening the circus…'); Promise.resolve(lobbyMap(true)).then(() => { if (ALT.on) SBX.teleport('middle'); return new Promise((res) => setTimeout(res, 400)); }).then(() => { try { focusCaine(); } catch (e) { /* ok */ } return new Promise((res) => setTimeout(res, 250)); }).catch(() => {}).finally(() => chkLoading(false)); } else { chkLoading(false); lobbyMap(false); } } catch (e) { chkLoading(false); } return r; };
function chkLoading(on, text) { let el = document.getElementById('circusLoad'); if (!on) { if (el) el.remove(); return; } if (!el) { el = h('div', { id: 'circusLoad', role: 'status', style: 'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,#3a1022,#0d0710);color:#f6e7c8;font:600 18px/1.4 system-ui,sans-serif;text-align:center' }, h('div', {}, h('div', { style: 'font-size:46px;margin-bottom:10px' }, '🎪'), h('div', { class: 'cl-t' }, text || 'Loading…'), h('div', { style: 'margin:14px auto 0;width:180px;height:4px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden' }, h('i', { style: 'display:block;height:100%;width:40%;background:#f2b632;animation:clbar 1.1s ease-in-out infinite' })))); const st = h('style', {}, '@keyframes clbar{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}'); el.append(st); document.body.append(el); } else el.querySelector('.cl-t').textContent = text || 'Loading…'; }
function focusCaine() { const R = ALT.root; if (!R) return; R.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(R), c = bb.getCenter(new THREE.Vector3()), H = bb.max.y - bb.min.y, fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(ollo.group.quaternion); fwd.y = 0; fwd.normalize(); c.y = bb.min.y + H * 0.62; camera.position.copy(c).addScaledVector(fwd, Math.max(2.4, H * 2.6)).add(new THREE.Vector3(0, H * 0.25, 0)); try { follow = false; } catch (e) { /* ok */ } controls.target.copy(c); camera.lookAt(c); controls.update(); SBX.dirty = true; }
/* the loading screen also covers the time Caine's own model is loading (the copyright-safe button shows "© Loading…" then) */
try { new MutationObserver(() => { if (/Loading/.test(btnSafe.textContent)) chkLoading(true, 'Bringing in Caine…'); else if (!ALT.on) chkLoading(false); }).observe(btnSafe, { childList: true, characterData: true, subtree: true }); } catch (e) { /* ok */ } } catch (e) { /* ok */ }
const CHK = { list: new Map(), last: 0, log: [] };
SBX.charCheck = CHK;
function chkLog(m) { CHK.log.push(m); if (CHK.log.length > 200) CHK.log.shift(); const fns = []; try { if (typeof logActivity === 'function') fns.push(logActivity); } catch (e) { /* ok */ } try { if (typeof activity === 'function') fns.push(activity); } catch (e) { /* ok */ } try { if (typeof addActivity === 'function') fns.push(addActivity); } catch (e) { /* ok */ } try { if (typeof pushActivity === 'function') fns.push(pushActivity); } catch (e) { /* ok */ } try { if (SBX && typeof SBX.activity === 'function') fns.push(SBX.activity); } catch (e) { /* ok */ }
  for (const f of fns) { try { f('🧩 ' + m); return; } catch (e) { /* next */ } } console.info('[character check] ' + m); }
const RE_FING = /(finger|thumb|index|middle|ring|pinky|little|digit|claw|talon|phalan|knuckle|_f[0-4][LR]|^Body_(f[0-3]|th)[A-Za-z]*[LR])/i, RE_EYE = /(eye|pupil|iris|esfera|eyeball|globe_?eye|ojo)/i, RE_NOTEYE = /(lid|brow|lash|socket|eyebrow|eyelash|eyeline)/i;
function chkRootOf(o) { let r = o; while (r.parent && r.parent !== scene) r = r.parent; return r; }
// auto weights in bind space: unweighted vertices go to the nearest bone; finger bones with no influence get the vertices around their
// segment, blended with the hand by distance
function chkWeights(m) { const g = m.geometry, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, P = g.attributes.position; if (!SI || !SW || !P) return { fixed: 0, fingers: 0 }; const bs = m.skeleton.bones;
  const bp = bs.map((b, k) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(m.skeleton.boneInverses[k]).invert())); const used = new Float32Array(bs.length); let fixed = 0; const v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { let s = 0; for (let k = 0; k < 4; k++) { const w = SW.getComponent(i, k); s += w; used[SI.getComponent(i, k)] += w; } if (s > 1e-4) continue; v.fromBufferAttribute(P, i).applyMatrix4(m.bindMatrix); let best = 0, bd = Infinity; for (let k = 0; k < bp.length; k++) { const d = bp[k].distanceToSquared(v); if (d < bd) { bd = d; best = k; } } SI.setXYZW(i, best, 0, 0, 0); SW.setXYZW(i, 1, 0, 0, 0); used[best] += 1; fixed++; }
  let fingers = 0; for (let k = 0; k < bs.length; k++) { const b = bs[k]; if (!RE_FING.test(b.name) || used[k] > 0.5) continue; const ch = b.children.find((c) => c.isBone); const ci = ch ? bs.indexOf(ch) : -1; const a = bp[k], par = b.parent && b.parent.isBone ? bs.indexOf(b.parent) : -1; if (par < 0) continue;
    const e = ci >= 0 ? bp[ci] : a.clone().add(a.clone().sub(bp[par]).multiplyScalar(0.6)); const len = Math.max(1e-4, a.distanceTo(e)), r = len * 0.75, ab = e.clone().sub(a); let n = 0;
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.bindMatrix); const t = clamp(v.clone().sub(a).dot(ab) / (len * len), 0, 1), d = v.distanceTo(a.clone().addScaledVector(ab, t)); if (d > r) continue; let hasPar = false; for (let q = 0; q < 4; q++) if (SI.getComponent(i, q) === par && SW.getComponent(i, q) > 0) hasPar = true; if (!hasPar) continue;
      const w = clamp(1 - d / r, 0, 1) * clamp(t * 3, 0.25, 1); const W = new Map(); for (let q = 0; q < 4; q++) { const w0 = SW.getComponent(i, q); if (w0 > 0) W.set(SI.getComponent(i, q), w0 * (1 - w)); } W.set(k, (W.get(k) || 0) + w); const top = [...W].sort((x, y) => y[1] - x[1]).slice(0, 4), s = top.reduce((x, q) => x + q[1], 0) || 1;
      for (let q = 0; q < 4; q++) { SI.setComponent(i, q, top[q] ? top[q][0] : 0); SW.setComponent(i, q, top[q] ? top[q][1] / s : 0); } n++; } if (n) fingers++; }
  try { m.normalizeSkinWeights(); } catch (e) { /* ok */ } SI.needsUpdate = SW.needsUpdate = true; return { fixed, fingers }; }
function chkTextures(o) { let n = 0; o.traverse((x) => { if (!x.isMesh) return; for (const mt of [].concat(x.material || [])) for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap']) { const t = mt[key]; if (t && t.isTexture && !t.isRenderTargetTexture && !t.isCanvasTexture && !t.isDataTexture && !t.isVideoTexture && t.source && (t.source.data === null || t.source.data === undefined) && !t.userData.__pending) { mt[key] = null; mt.needsUpdate = true; n++; } } }); return n; }
function chkRegister(root) { if (CHK.list.has(root) || root.userData.noCharCheck) return; const info = { root, fingers: [], eyes: [], ph: Math.random() * 100, blinkT: 2 + Math.random() * 3, blink: 0, look: new THREE.Vector2(), lookT: new THREE.Vector2(), sacc: 0.5, isOllo: (() => { let p = ollo.group; while (p) { if (p === root) return true; p = p.parent; } let q = root; while (q) { if (q === ollo.group) return true; q = q.parent; } return false; })() }; let skinned = 0, wfix = 0, ffix = 0, tris = 0; const seen = new Set();
  root.updateMatrixWorld(true);
  root.traverse((o) => { if (o.isMesh && o.geometry) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position ? o.geometry.attributes.position.count : 0) / 3; if (o.isSkinnedMesh && o.skeleton) { skinned++; const r = chkWeights(o); wfix += r.fixed; ffix += r.fingers; for (const b of o.skeleton.bones) seen.add(b); } });
  const texFix = chkTextures(root);
  // fingers: every finger bone (sorted root-first), with a curl axis worked out from the row of fingers and a sign that bends it toward the palm
  CHK.claimed = CHK.claimed || new Set(); const fb = [...seen].filter((b) => RE_FING.test(b.name) && !/(meta|carpal)/i.test(b.name) && !CHK.claimed.has(b)); for (const b of fb) CHK.claimed.add(b); /* a bone is only ever animated by ONE character, so offsets can never pile up and spin it */ const rootC = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
  for (const b of fb) { let hand = b.parent; while (hand && hand.isBone && RE_FING.test(hand.name)) hand = hand.parent; if (!hand) continue; const sibs = fb.filter((x) => x.parent === hand); const wq = b.getWorldQuaternion(new THREE.Quaternion()), wp = b.getWorldPosition(new THREE.Vector3()); const ch = b.children.find((c) => c.isBone);
    const dirW = ch ? ch.getWorldPosition(new THREE.Vector3()).sub(wp).normalize() : wp.clone().sub(b.parent.getWorldPosition(new THREE.Vector3())).normalize(); let spread = new THREE.Vector3(); { const rows = fb.filter((x) => x.parent === hand && !/thumb|^Body_th/i.test(x.name)).map((s) => s.getWorldPosition(new THREE.Vector3())); if (rows.length > 1) spread = rows[rows.length - 1].clone().sub(rows[0]); } /* every joint of every finger bends across the row of fingers, not just the first one */
    if (spread.lengthSq() < 1e-10) spread = new THREE.Vector3().crossVectors(dirW, new THREE.Vector3(0, 1, 0)); if (spread.lengthSq() < 1e-10) spread.set(1, 0, 0); spread.addScaledVector(dirW, -spread.dot(dirW)).normalize(); const thumb = /thumb|^Body_th/i.test(b.name);
    if (thumb) spread = new THREE.Vector3().crossVectors(dirW, spread).normalize(); const axisL = spread.clone().applyQuaternion(wq.clone().invert());
    // sign: the one that brings the fingertip toward the body's centre line (palms face the body)
    const tip = wp.clone().addScaledVector(dirW, 0.1); const test = (sg) => { const q = new THREE.Quaternion().setFromAxisAngle(spread, sg * 0.5); const t = tip.clone().sub(wp).applyQuaternion(q).add(wp); return Math.hypot(t.x - rootC.x, t.z - rootC.z); };
    const sign = test(1) < test(-1) ? 1 : -1; const depth = (() => { let d = 0, p = b.parent; while (p && p !== hand) { d++; p = p.parent; } return d; })(); let fr = b; while (fr.parent && fr.parent !== hand) fr = fr.parent; const rowB = fb.filter((x) => x.parent === hand && !/thumb|^Body_th/i.test(x.name)); const ki = rowB.indexOf(fr); const nmK = (b.name + ' ' + fr.name).match(/index|middle|ring|pinky|little/i); const nRow = rowB.length, kind = thumb ? 'thumb' : nmK ? nmK[0].toLowerCase().replace('little', 'pinky') : nRow <= 4 ? (nRow === 3 ? ['index', 'middle', 'ring'] : nRow === 2 ? ['index', 'middle'] : nRow === 1 ? ['index'] : ['index', 'middle', 'ring', 'pinky'])[Math.max(0, ki)] : ki <= 0 ? 'index' : ki >= nRow - 1 ? 'pinky' : ['middle', 'ring'][Math.min(1, Math.floor((ki - 1) / Math.max(1, (nRow - 2) / 2)))]; /* any number of fingers: 1 to many, each still addressable */
    const side = /left/i.test(hand.name) ? 'L' : /right/i.test(hand.name) ? 'R' : (root.worldToLocal(hand.getWorldPosition(new THREE.Vector3())).x >= 0 ? 'L' : 'R'); info.hands = info.hands || {}; if (!info.hands[side]) info.hands[side] = { b: hand, axis: spread.clone().applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()).invert()), q0: new THREE.Quaternion(), saved: false };
    info.fingers.push({ b, fr, axis: axisL, sign, depth, thumb, idx: sibs.indexOf(b), kind, side, q0: new THREE.Quaternion() }); }
  // head (for turning toward what the character looks at) and eyes. Pupils/irises ride on the eye white they sit in: on a round eye
  // they roll around its centre, on a flat eye they slide inside its outline, so a pupil can never leave its white
  info.head = [...seen].find((b) => /(^|[_:.\s])head($|[_.\s\d])/i.test(b.name) && !/(end|top|nub|tip)/i.test(b.name)) || null; info.headQ0 = new THREE.Quaternion(); info.headSaved = false;
  info.spine = [...seen].find((b) => b !== info.head && /(^|[_:.\s])(chest|upper_?chest|spine_?0?2|spine_?0?3|spine1|spine2|torso)($|[_.\s\d])/i.test(b.name)) || null; info.spineQ0 = new THREE.Quaternion(); info.spineSaved = false;
  if (!info.isOllo && !root.userData.staticEyes) { const eb = [...seen].filter((b) => RE_EYE.test(b.name) && !RE_NOTEYE.test(b.name)); const mk = (o, x) => Object.assign({ o, q0: new THREE.Quaternion(), p0: new THREE.Vector3(), s0: new THREE.Vector3() }, x);
    if (eb.length) for (const b of eb) info.eyes.push(mk(b, { bone: true }));
    else { const ms = []; root.traverse((o) => { if (o.isMesh && RE_EYE.test((o.name || '') + ' ' + (o.parent ? o.parent.name : '')) && !RE_NOTEYE.test(o.name || '')) ms.push(o); }); const isP = (o) => /(pupil|iris)/i.test((o.name || '') + ' ' + (o.parent ? o.parent.name : ''));
      const whites = ms.filter((o) => !isP(o)).map((o) => { const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); return { o, lc: o.worldToLocal(c.clone()), r: Math.max(s.x, s.y, s.z) / 2, flat: Math.min(s.x, s.y, s.z) < 0.35 * Math.max(s.x, s.y, s.z) }; });
      for (const p of ms.filter(isP)) { const pb = new THREE.Box3().setFromObject(p), pc = pb.getCenter(new THREE.Vector3()), pr = pb.getSize(new THREE.Vector3()).length() / 3.4; let w = null, bd = Infinity; for (const W of whites) { const d = W.o.localToWorld(W.lc.clone()).distanceTo(pc); if (d < bd) { bd = d; w = W; } } info.eyes.push(mk(p, { pupil: true, white: w, pr, lc: p.worldToLocal(pc.clone()) })); }
      for (const W of whites) info.eyes.push(mk(W.o, { white0: true, lc: W.lc })); } }
  if (root === ALT.root) { let h = null; root.traverse((o) => { if (!h && /^Head_147/.test(o.name)) h = o; }); if (h) info.head = h; } { const hq = (info.head || root).getWorldQuaternion(new THREE.Quaternion()), rq = root.getWorldQuaternion(new THREE.Quaternion()); info.headRel0 = rq.invert().multiply(hq); } /* the head's rest facing, so eyes and head turn in the character's own frame */ if (root === ALT.root) { info.eyes = info.eyes.filter((e) => !e.bone || /^Esfera/i.test(e.o.name)); for (const e of info.eyes) e.noBlink = true; } { const eb2 = info.eyes.filter((e) => e.bone), inEye = new Set(eb2.map((e) => e.o)); info.eyes = info.eyes.filter((e) => { if (!e.bone) return true; let p = e.o.parent; while (p) { if (inEye.has(p)) return false; p = p.parent; } return true; }); } /* never rotate an eye twice (an eye bone inside another eye bone) */
  for (const e of info.eyes) if (e.bone) { const set = new Set(); e.o.traverse((x) => { if (x.isBone) set.add(x); }); let c = chkVertCenter(root, set); if (!c) { const bb = new THREE.Box3(); e.o.traverse((x) => { if (x.isMesh && !x.isSkinnedMesh) bb.expandByObject(x); }); if (!bb.isEmpty()) c = bb.getCenter(new THREE.Vector3()); } e.lc = c ? e.o.worldToLocal(c.clone()) : new THREE.Vector3(); e.rest = e.o.quaternion.clone(); e.restP = e.o.position.clone(); e.own = root === ALT.root; } /* each eye turns about ITS OWN centre (the middle of the eyeball it moves), not about a shared pivot */
  info.lids = []; if (!info.isOllo && !root.userData.staticEyes && root !== ALT.root) { /* eyelids (Caine has none) */ const FQ = chkFrameQ(info), axW = new THREE.Vector3(1, 0, 0).applyQuaternion(FQ);
    for (const b of [...seen].filter((x) => /(^|[^a-z])(eye_?)?lid/i.test(x.name))) { const set = new Set(); b.traverse((x) => { if (x.isBone) set.add(x); }); const c = chkVertCenter(root, set); if (!c) continue; let ec = null, bd = Infinity; for (const e of info.eyes) { const q = e.lc ? e.o.localToWorld(e.lc.clone()) : e.o.getWorldPosition(new THREE.Vector3()); const d = q.distanceTo(c); if (d < bd) { bd = d; ec = q; } } if (!ec) continue;
      const P = b.getWorldPosition(new THREE.Vector3()), test = (sg) => { const q = c.clone().sub(P).applyAxisAngle(axW, sg * 0.6).add(P); return Math.abs(q.y - ec.y); }; const sign = test(1) < test(-1) ? 1 : -1, amp = clamp(Math.abs(c.y - ec.y) / Math.max(1e-4, c.distanceTo(P)) * 1.6 + 0.35, 0.35, 1.25);
      info.lids.push({ b, axis: axW.clone().applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize(), sign, amp, q0: new THREE.Quaternion(), applied: false }); }
    if (info.lids.length) for (const e of info.eyes) e.noBlink = true; } /* with real lids, the lids close instead of the eyes squashing */
  info.eyeOK = info.eyes.length > 0; info.view = root.userData.viewType || 'first';
  CHK.list.set(root, info); const nm = root.name || 'character'; const msgs = [];
  if (skinned) msgs.push(skinned + ' skinned mesh' + (skinned > 1 ? 'es' : '')); if (wfix) msgs.push(wfix + ' unweighted vertices auto-weighted'); if (ffix) msgs.push(ffix + ' finger bones auto-weighted'); if (texFix) msgs.push(texFix + ' broken textures removed');
  msgs.push(info.fingers.length ? info.fingers.length + ' finger bones animated' : 'no finger bones'); msgs.push((info.head ? 'head turns to look' : 'no head bone') + ', sees in ' + info.view + ' view'); msgs.push(root.userData.staticEyes ? 'eyes static by design' : info.isOllo ? 'eyes run by Ollo’s own rig' : info.eyes.length ? info.eyes.length + ' eyes animated' : 'no eyes found');
  try { for (const m of chkHandTest(info)) msgs.push(m); } catch (e) { console.warn('[character check] hand test', e); } if (tris && tris < 300 && skinned) msgs.push('⚠ only ' + Math.round(tris) + ' triangles: too simple'); chkLog('Character check — ' + nm + ': ' + msgs.join(', ')); }
function chkScan() { const roots = new Set(); if (ALT.root && ALT.on) roots.add(ALT.root); scene.traverse((o) => { if (o.isSkinnedMesh) roots.add(chkRootOf(o)); }); if (ALT.root && ALT.on) roots.add(ALT.root); for (const r of roots) chkRegister(r); for (const r of [...CHK.list.keys()]) if (!r.parent) CHK.list.delete(r); }
SBX.chkScan = chkScan;
const _ax = new THREE.Quaternion(), _rc = new THREE.Raycaster();
// collisions for hands: what is near each hand (other objects, and things the hand itself holds, like Caine's cane), refreshed twice a second
function chkNear(info) { const now = performance.now(); if (info._nearT && now - info._nearT < 1000) return info._near; info._nearT = now; const out = []; if (!info.hands) return (info._near = out); const hs = Object.values(info.hands), hp = hs.map((h) => h.b.getWorldPosition(new THREE.Vector3())), handSet = new Set(hs.map((h) => h.b)), sph = new THREE.Sphere();
  scene.traverse((o) => { if (!o.isMesh || !o.visible || o.isSkinnedMesh || !o.geometry || o.isInstancedMesh) return; let p = o, own = false, held = false; while (p) { if (p === info.root) own = true; if (handSet.has(p)) held = true; p = p.parent; } if (own && !held) return; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld); if (sph.radius > 40) return; for (const q of hp) if (sph.distanceToPoint(q) < 0.5) { out.push(o); break; } }); return (info._near = out); }
// fingers: after bending, each finger is traced from its base to its tip; if it would go into something it backs off, and creeps
// back when clear, so fingers wrap around what they touch instead of passing through it
function chkFingerCollide(info) { info._fc = ((info._fc || 0) + 1) % 3; if (info._fc) return; /* finger collisions every third frame: smooth, and a third of the cost */ const near = chkNear(info); info.fLim = info.fLim || new Map(); if (!near.length) { for (const [k, v] of info.fLim) info.fLim.set(k, Math.min(1, v + 0.05)); return; } info.root.updateMatrixWorld(true);
  for (const f of info.fingers) { if (f.b !== f.fr) continue; let e = f.b; for (;;) { const c = e.children.find((x) => x.isBone && RE_FING.test(x.name)); if (!c) break; e = c; } const a = f.b.getWorldPosition(new THREE.Vector3()), eb = e.getWorldPosition(new THREE.Vector3()), prev = e === f.b ? e.parent.getWorldPosition(new THREE.Vector3()) : (e.parent && e.parent.isBone ? e.parent.getWorldPosition(new THREE.Vector3()) : a);
    const tip = eb.clone().add(eb.clone().sub(prev).multiplyScalar(0.8)), d = tip.clone().sub(a), L = d.length(); if (L < 1e-5) continue; _rc.set(a, d.divideScalar(L)); _rc.far = L; const hit = _rc.intersectObjects(near, false)[0]; const cur = info.fLim.get(f.fr) ?? 1; info.fLim.set(f.fr, clamp(hit ? cur - 0.12 : cur + 0.04, 0.05, 1)); } }
// arms: a reach stops at the surface it would hit (the hand rests on it instead of going through)
function chkClampReach(info, pa, T) { const near = []; scene.traverse((o) => { if (o.isMesh && o.visible && !o.isSkinnedMesh && o.geometry && !o.isInstancedMesh) { let p = o; while (p && p !== info.root) p = p.parent; if (!p) near.push(o); } }); const d = T.clone().sub(pa), L = d.length(); if (L < 1e-4 || near.length > 4000) return T; _rc.set(pa, d.divideScalar(L)); _rc.far = L; const hit = _rc.intersectObjects(near, false)[0]; return hit ? pa.clone().addScaledVector(d, Math.max(0, hit.distance - 0.04)) : T; }
function chkApply(t, dt) { for (const info of CHK.list.values()) try { chkApply1(info, t, dt); } catch (e) { if (!info._warned) { info._warned = true; console.warn('[character check] animate', info.root.name, e); } } }
/* every change below is flagged as it is made and undone after the frame, even if something fails half-way: nothing can pile up and spin */
function chkApply1(info, t, dt) { { if (!info.root.visible && info.root !== ALT.root) return; const ph = info.ph + t;
    // fingers: relaxed curl that breathes, a little ripple across the hand, and a grip when the hand holds something
    for (const f of info.fingers) { if (!f.rest) { f.rest = f.b.quaternion.clone(); f.own = info.root === ALT.root || /^Body_/.test(f.b.name); } if (f.own || (f.lastR && f.b.quaternion.angleTo(f.lastR) < 1e-5)) f.b.quaternion.copy(f.rest); /* nothing else animates this finger: always start from its rest pose, so nothing can pile up */ f.q0.copy(f.b.quaternion); const hold = f.b.parent && f.b.parent.children.some((c) => !c.isBone && c.type !== 'Bone' && (c.isMesh || c.isGroup)) ? 0.7 : 0; const base = f.thumb ? 0.18 : 0.22 + 0.06 * f.depth, rip = (info.root === ALT.root || info.root.userData.calmHands) ? 0 : 0.07 * Math.sin(ph * 1.3 - f.idx * 0.6) + 0.04 * Math.sin(ph * 0.47 + f.depth); /* Caine's hands rest still when idle */
      let cv = base + rip + hold * (f.thumb ? 0.35 : 0.9); const C = (info.ctl && info.ctl[f.side]) || chkAutoPose(info, f.side); /* the AI's own hand pose, else the hand pose that fits the animation playing */ if (C && (!C.until || performance.now() < C.until)) { const tv = C[f.kind] !== undefined ? C[f.kind] : C.all; if (tv !== undefined) cv = tv * (f.thumb ? 1.1 : 1.45) + rip * 0.3; } else if (C) delete info.ctl[f.side];
      cv *= (info.fLim && info.fLim.get(f.fr)) || 1; /* a finger stops where it touches something */ f.cur = f.cur === undefined ? cv : f.cur + (cv - f.cur) * Math.min(1, dt * 12); const a = f.sign * f.cur; _ax.setFromAxisAngle(f.axis, a); f.b.quaternion.multiply(_ax); f.applied = true; }
    chkFingerCollide(info);
    if (info.root !== ALT.root) { try { chkArmApply(info, dt, true); } catch (e) { /* ok */ } chkWrist(info, t); }
    // gaze & first-person procedural head-first kinematics: when player is controlling this character in FPV,
    // dragging looks around and turns the head/neck first (with subtle upper-spine follow and eye lead) before body turns
    const isFpvControlled = FPV_LOOK.active && PLAYER.c && (info.root === PLAYER.c.group || (PLAYER.c === ollo && ALT.on && info.root === ALT.root));
    const hd = info.head; let ey = 0, ep = 0;
    if (isFpvControlled) {
      let appliedSpineYaw = 0;
      if (info.spine && !info.isOllo && info.root !== ALT.root && Math.abs(FPV_LOOK.spineYaw) > 1e-4) {
        info.spineQ0.copy(info.spine.quaternion); info.spineSaved = true;
        const FQ = chkFrameQ(info), Rsp = FQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, FPV_LOOK.spineYaw, 0, 'YXZ'))).multiply(FQ.clone().invert());
        chkSetW(info.spine, info.spine.getWorldPosition(new THREE.Vector3()), Rsp.multiply(info.spine.getWorldQuaternion(new THREE.Quaternion())));
        appliedSpineYaw = FPV_LOOK.spineYaw;
      }
      if (hd) {
        const hy = clamp(FPV_LOOK.headYaw - appliedSpineYaw, -1.05, 1.05), hpch = clamp(FPV_LOOK.headPitch, -0.78, 0.78);
        info.headQ0.copy(hd.quaternion); info.headSaved = true;
        const FQ = chkFrameQ(info), Rw = FQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-hpch, hy, 0, 'YXZ'))).multiply(FQ.clone().invert());
        chkSetW(hd, hd.getWorldPosition(new THREE.Vector3()), Rw.multiply(hd.getWorldQuaternion(new THREE.Quaternion())));
      }
      ey = clamp(FPV_LOOK.eyeLeadYaw, -0.4, 0.4); ep = clamp(FPV_LOOK.eyeLeadPitch, -0.28, 0.28);
      info.eyeYaw = ey; info.eyePitch = ep;
    } else {
      const T = chkGaze(info, dt); let yaw = 0, pitch = 0;
      if (T) { const ref = hd || info.root; ref.updateWorldMatrix(true, false); const hp = ref.getWorldPosition(new THREE.Vector3()), hq = chkFrameQ(info); const d = T.clone().sub(hp).applyQuaternion(hq.invert()); yaw = Math.atan2(d.x, d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); }
      if (Math.abs(yaw) > 2.2) { yaw = 0; pitch = 0; } info.yawS = (info.yawS || 0) + (yaw - (info.yawS || 0)) * (1 - Math.exp(-dt * 6)); info.pitS = (info.pitS || 0) + (pitch - (info.pitS || 0)) * (1 - Math.exp(-dt * 6));
      ey = info.yawS; ep = info.pitS; if (hd && !info.isOllo) { const hy = clamp(info.yawS * 0.65, -1.0, 1.0), hpch = clamp(info.pitS * 0.5, -0.4, 0.4); info.headQ0.copy(hd.quaternion); info.headSaved = true; { const FQ = chkFrameQ(info), Rw = FQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-hpch, hy, 0, 'YXZ'))).multiply(FQ.clone().invert()); chkSetW(hd, hd.getWorldPosition(new THREE.Vector3()), Rw.multiply(hd.getWorldQuaternion(new THREE.Quaternion()))); } ey -= hy; ep -= hpch; }
      info.look.lerp(info.lookT, 1 - Math.exp(-dt * 22)); ey = clamp(ey + info.look.x, -0.45, 0.45); ep = clamp(ep + info.look.y, -0.3, 0.3); info.eyeYaw = ey; info.eyePitch = ep;
    }
    if (info.eyes.length) { if (!isFpvControlled) { info.sacc -= dt; if (info.sacc <= 0) { info.sacc = 0.4 + Math.random() * 1.6; info.lookT.set((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.08); } } info.blinkT -= dt; if (info.blinkT <= 0) { info.blink = 0.16; info.blinkT = 2.2 + Math.random() * 4; } info.blink = Math.max(0, info.blink - dt); const bl = info.blink > 0 ? Math.sin((1 - info.blink / 0.16) * Math.PI) : 0;
      info.root.updateMatrixWorld(true); const Rl = new THREE.Quaternion().setFromEuler(new THREE.Euler(-ep, ey, 0, 'YXZ'));
      if (info.lids && bl > 0) for (const L of info.lids) { L.q0.copy(L.b.quaternion); L.applied = true; L.b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(L.axis, L.sign * L.amp * bl)); } /* blink: the lids sweep shut and open again */
      for (const e of info.eyes) { const o = e.o; e.q0.copy(o.quaternion); e.p0.copy(o.position); e.s0.copy(o.scale); e.applied = true;
        if (e.bone) { if (e.rest && (e.own || (e.lastR && o.quaternion.angleTo(e.lastR) < 1e-5))) { o.quaternion.copy(e.rest); o.position.copy(e.restP); e.q0.copy(e.rest); e.p0.copy(e.restP); } /* start from rest: cannot pile up and spin */ o.updateMatrixWorld(true); const C = o.localToWorld(e.lc ? e.lc.clone() : new THREE.Vector3()), Wp = o.getWorldPosition(new THREE.Vector3()), FQ = chkFrameQ(info), Rw = FQ.clone().multiply(Rl).multiply(FQ.clone().invert()); chkSetW(o, C.clone().add(Wp.sub(C).applyQuaternion(Rw)), Rw.multiply(o.getWorldQuaternion(new THREE.Quaternion()))); if (!e.noBlink) o.scale.y *= 1 - 0.9 * bl; continue; }
        const Wp = o.getWorldPosition(new THREE.Vector3()), Wq = o.getWorldQuaternion(new THREE.Quaternion());
        if (e.pupil && e.white) { const W = e.white, wq = W.o.getWorldQuaternion(new THREE.Quaternion()), c = W.o.localToWorld(W.lc.clone());
          if (!W.flat) { const Rw = wq.clone().multiply(Rl).multiply(wq.clone().invert()); chkSetW(o, c.clone().add(Wp.clone().sub(c).applyQuaternion(Rw)), Rw.multiply(Wq)); }
          else { const lim = Math.max(0, W.r - e.pr) * 0.75, off = new THREE.Vector3(ey / 0.45, ep / 0.3, 0); if (off.length() > 1) off.normalize(); off.multiplyScalar(lim).applyQuaternion(info.head ? info.head.getWorldQuaternion(new THREE.Quaternion()) : wq); chkSetW(o, Wp.add(off), Wq); } }
        if (bl > 0 && (e.pupil || e.white0)) { const c = o.localToWorld(e.lc.clone()); const s0y = o.scale.y; o.scale.y = s0y * (1 - 0.92 * bl); o.updateMatrixWorld(true); const c2 = o.localToWorld(e.lc.clone()); o.position.add(o.parent.worldToLocal(c.clone()).sub(o.parent.worldToLocal(c2.clone()))); } } } } }
function chkWrist(info, t) { if (!info.hands || !info.ctl) return; for (const sd of ['L', 'R']) { const H = info.hands[sd], C = info.ctl[sd]; if (!H || !C || !C.wave || (C.until && performance.now() > C.until)) continue; if (!H.saved) { H.q0.copy(H.b.quaternion); H.saved = true; } H.b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(H.axis, Math.sin(t * 9) * 0.55)); } }
try { const _aDB = altDriveBody; altDriveBody = function (B, RQi) { const out = _aDB(B, RQi); try { caineWalk(B); } catch (e) { if (!B._ww) { B._ww = 1; console.warn('[caine walk]', e); } } try { caineCane(B); } catch (e) { /* ok */ } try { caineCoat(B); } catch (e) { if (!B._cw) { B._cw = 1; console.warn('[caine coat]', e); } } try { const i = ALT.root && CHK.list.get(ALT.root); if (i) { try { chkArmApply(i, 1 / 60, false); } catch (e) { /* ok */ } chkWrist(i, performance.now() / 1000); if (i.hands) for (const sd of ['L', 'R']) if (i.hands[sd]) i.hands[sd].saved = false; } } catch (e) { /* ok */ } return out; }; } catch (e) { /* ok */ }
function chkRestore() { for (const info of [...CHK.list.values()].reverse()) { if (info.arms) for (const sd of ['L', 'R']) { const R = info.arms[sd]; if (R && R.saved) { R.a.quaternion.copy(R.qa); R.b.quaternion.copy(R.qb); R.saved = false; } } if (info.hands) for (const sd of ['L', 'R']) { const H = info.hands[sd]; if (H && H.saved) { H.b.quaternion.copy(H.q0); H.saved = false; } } if (info.head && info.headSaved) { info.head.quaternion.copy(info.headQ0); info.headSaved = false; } if (info.spine && info.spineSaved) { info.spine.quaternion.copy(info.spineQ0); info.spineSaved = false; } for (const f of info.fingers) if (f.applied) { f.b.quaternion.copy(f.q0); f.applied = false; (f.lastR || (f.lastR = new THREE.Quaternion())).copy(f.b.quaternion); } for (const e of info.eyes) if (e.applied) { e.o.quaternion.copy(e.q0); e.o.position.copy(e.p0); e.o.scale.copy(e.s0); e.applied = false; (e.lastR || (e.lastR = new THREE.Quaternion())).copy(e.o.quaternion); } if (info.lids) for (const L of info.lids) if (L.applied) { L.b.quaternion.copy(L.q0); L.applied = false; } } }
// set an object's world position + rotation through its parent
// the character's facing frame at its head: forward is the way the character faces, whatever axes the head bone uses
function chkFrameQ(info) { const h = info.head || info.root; const q = h.getWorldQuaternion(new THREE.Quaternion()); return info.headRel0 ? q.multiply(info.headRel0.clone().invert()) : info.root.getWorldQuaternion(new THREE.Quaternion()); }
// the centre of the mesh a bone (and the bones under it) moves, in world space: where an eye really turns about
function chkVertCenter(root, set) { const s = new THREE.Vector3(), v = new THREE.Vector3(); let n = 0; root.updateMatrixWorld(true); root.traverse((m) => { if (!m.isSkinnedMesh || !m.geometry.attributes.skinIndex) return; const ks = new Set(m.skeleton.bones.map((b, k) => (set.has(b) ? k : -1)).filter((k) => k >= 0)); if (!ks.size) return; const SI = m.geometry.attributes.skinIndex, SW = m.geometry.attributes.skinWeight; m.skeleton.update();
  for (let i = 0; i < SI.count; i++) { let w = 0; for (let q = 0; q < 4; q++) if (ks.has(SI.getComponent(i, q))) w += SW.getComponent(i, q); if (w < 0.5) continue; m.getVertexPosition(i, v); m.localToWorld(v); s.add(v); n++; } }); return n ? s.multiplyScalar(1 / n) : null; }
// Caine's coat tails: real cloth. Each tail is a chain of three bones simulated as hanging fabric (gravity, inertia, damping, a gentle
// pull back to its tailored shape) that collides with his own legs and body, so it swings, flutters and drapes as he moves and never
// passes through him
function resetCaineCoat() {
  const B = ALT.body; if (!B) return;
  if (B.sim) { B.sim.ch = {}; B.sim.q = {}; B.sim.lastYaw = null; B.sim.lastWs = null; B.sim.t = performance.now(); }
  for (const sd of ['L', 'R']) for (let k = 0; k < 3; k++) { const bn = B.bones && B.bones['tl' + sd + k]; if (bn) bn.quaternion.identity(); }
  if (B.bones && B.bones.hips) B.bones.hips.updateMatrixWorld(true);
}
function caineCoat(B) { if (!B.tails) return; const now = performance.now(), S = B.sim || (B.sim = { t: now, ch: {}, q: {}, lastYaw: null, lastWs: null }); const rawDt = (now - S.t) / 1000, dt = Math.min(1 / 30, Math.max(1 / 240, rawDt)); S.t = now;
  const hips = B.bones.hips; hips.updateWorldMatrix(true, true); const ws = hips.getWorldScale(new THREE.Vector3()).x || 1;
  if (ws < 1e-3) { resetCaineCoat(); return; }
  const U = (v) => v * B.H * ws, W = (p) => hips.localToWorld(p.clone().sub(B.pos.hips));
  const hipsPos = hips.getWorldPosition(new THREE.Vector3()), hipsQ = hips.getWorldQuaternion(new THREE.Quaternion());
  const BK = new THREE.Vector3(0, 0, -1).applyQuaternion(hipsQ); BK.y = 0; if (BK.lengthSq() < 1e-6) BK.set(0, 0, -1); BK.normalize();
  const RX = new THREE.Vector3().crossVectors(UP, BK).normalize();
  const hipsYaw = Math.atan2(BK.x, BK.z);
  const dtJump = rawDt > 0.16;
  const scaleJump = S.lastWs !== null && S.lastWs !== undefined && Math.abs(ws - S.lastWs) / Math.max(1e-4, S.lastWs) > 0.08;
  const yawJump = S.lastYaw !== null && S.lastYaw !== undefined && Math.abs(RPC.angDiff(hipsYaw, S.lastYaw)) > 0.65;
  S.lastWs = ws; S.lastYaw = hipsYaw;
  const caps = []; for (const sd of ['L', 'R']) { const a = B.bones['ul' + sd].getWorldPosition(new THREE.Vector3()), b = B.bones['ll' + sd].getWorldPosition(new THREE.Vector3()), c = B.bones['ft' + sd].getWorldPosition(new THREE.Vector3()); caps.push([a, b, U(0.078)], [b, c, U(0.06)]); } /* legs a little thicker than the bones: the coat panels have width, not just the simulated centre line */
  caps.push([hipsPos, B.bones.chest.getWorldPosition(new THREE.Vector3()), B.HX * ws * 0.72, 'torso']);
  const push = (x, k = 9) => { for (const [a, b, r, tag] of caps) { if (tag === 'torso' && k < 2) continue; const ab = b.clone().sub(a), t = clamp(x.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq()), 0, 1), q = a.clone().addScaledVector(ab, t), d = x.clone().sub(q), L = d.length(), R = r + U(0.012); if (L < R || (tag !== 'torso' && L < R * 1.65 && d.dot(BK) < 0)) { if (L < 1e-6) d.copy(BK); else d.divideScalar(L); if (tag !== 'torso' && d.dot(BK) < 0.4) { d.addScaledVector(BK, 0.4 - d.dot(BK)).normalize(); } x.copy(q).addScaledVector(d, Math.max(R, L)); } } };
  const g = new THREE.Vector3(0, -9.8 * ws, 0).multiplyScalar(dt * dt);
  for (const sd of ['L', 'R']) { const T = B.tails[sd], rest = T.map(W), segL = T.slice(1).map((p, k) => p.distanceTo(T[k]) * ws);
    /* the tailored resting shape itself must never sit inside the legs (flying swings the legs back into where the tails hang): push it out first */
    for (let k = 1; k < rest.length; k++) push(rest[k], k);
    let C = S.ch[sd]; const posJump = !C || C.x[0].distanceTo(rest[0]) > U(0.32);
    if (posJump || dtJump || scaleJump || yawJump) {
      C = S.ch[sd] = { x: rest.map((p) => p.clone()), o: rest.map((p) => p.clone()), L: segL, hp: hipsPos.clone() };
      S.q = S.q || {}; for (let k = 0; k < 3; k++) { S.q[sd + k] = new THREE.Quaternion(); B.bones['tl' + sd + k].quaternion.identity(); }
      B.bones.hips.updateMatrixWorld(true);
      continue;
    }
    C.L = segL;
    if (C.hp) { const dl = hipsPos.clone().sub(C.hp); if (dl.length() < U(0.45)) { const carry = new THREE.Vector3(dl.x * 0.88, dl.y * 0.97, dl.z * 0.88); for (let k = 1; k < C.x.length; k++) { C.x[k].add(carry); C.o[k].add(carry); } } }
    C.hp = hipsPos.clone();
    C.x[0].copy(rest[0]); C.o[0].copy(rest[0]);
    const sideSign = Math.sign(rest[0].clone().sub(hipsPos).dot(RX)) || (sd === 'L' ? 1 : -1);
    { let stuck = false; for (let k = 1; k < C.x.length; k++) { const rel = C.x[k].clone().sub(rest[0]); if (rel.dot(BK) < -U(0.05) || C.x[k].y > C.x[k - 1].y) { stuck = true; break; } for (const [a, b, r, tag] of caps) { if (tag) continue; const ab = b.clone().sub(a), q = a.clone().addScaledVector(ab, clamp(C.x[k].clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq()), 0, 1)), d = C.x[k].clone().sub(q); if (d.length() < r * 0.85 || (d.dot(BK) < -r * 0.25 && d.length() < r * 2.5)) { stuck = true; break; } } if (stuck) break; }
      if (stuck) { for (let k = 1; k < C.x.length; k++) { C.x[k].lerp(rest[k], 0.65); C.o[k].copy(C.x[k]); } } }
    for (let k = 1; k < C.x.length; k++) { const x = C.x[k], v = x.clone().sub(C.o[k]).multiplyScalar(0.86); if (v.length() > U(0.065)) v.setLength(U(0.065)); C.o[k].copy(x); x.add(v).add(g).addScaledVector(rest[k].clone().sub(x), 0.025 + 0.02 / k); }
    for (let it = 0; it < 6; it++) for (let k = 1; k < C.x.length; k++) {
      const a = C.x[k - 1], x = C.x[k], d = x.clone().sub(a), l = d.length() || 1e-6; x.copy(a).addScaledVector(d, C.L[k - 1] / l);
      push(x, k);
      const mm = a.clone().add(x).multiplyScalar(0.5), m0 = mm.clone(); push(mm, k - 1); x.addScaledVector(mm.sub(m0), 1.5); push(x, k);
      // Anti-tangle plane guards: keep each tail strictly behind the hips plane, hanging downward, and on its own side of the midline
      const rel = x.clone().sub(rest[0]); const bkDot = rel.dot(BK); if (bkDot < -U(0.015)) x.addScaledVector(BK, -U(0.015) - bkDot);
      const maxY = a.y - C.L[k - 1] * 0.25; if (x.y > maxY) x.y = maxY;
      const lat = x.clone().sub(hipsPos).dot(RX) * sideSign; if (lat < U(0.008)) x.addScaledVector(RX, (U(0.008) - lat) * sideSign);
      const d2 = x.clone().sub(a), l2 = d2.length() || 1e-6; x.copy(a).addScaledVector(d2, C.L[k - 1] / l2);
      // collision has the last word: the shape guards above may have nudged the tail back toward a leg (e.g. legs swept back in flight)
      push(x, k); const mm2 = a.clone().add(x).multiplyScalar(0.5), m2 = mm2.clone(); push(mm2, k - 1); x.addScaledVector(mm2.sub(m2), 1.5); push(x, k);
    }
    for (let k = 0; k < 3; k++) { const bn = B.bones['tl' + sd + k]; const d0 = T[k + 1].clone().sub(T[k]).normalize(); const pq = bn.parent.getWorldQuaternion(new THREE.Quaternion()), gq = hips.parent.getWorldQuaternion(new THREE.Quaternion());
      const want = C.x[k + 1].clone().sub(bn.getWorldPosition(new THREE.Vector3())).normalize(), d0w = d0.clone().applyQuaternion(gq); if (want.lengthSq() < 1e-8) continue; const Wq = new THREE.Quaternion().setFromUnitVectors(d0w, want).multiply(gq); const qt = pq.invert().multiply(Wq), key = sd + k; S.q = S.q || {}; if (!S.q[key]) S.q[key] = qt.clone(); else S.q[key].slerp(qt, 0.55); bn.quaternion.copy(S.q[key]); bn.updateMatrixWorld(true); } } }
// what ANY character knows about itself (Ollo, Caine, every character with a mind, new ones too): its body, what it is doing with it,
// what it just did, and that it can make anything in the simulation
function chkSelfNote(obj) { try { const me = chkFind(obj); const body = []; if (me) { if (me.hands) body.push('hands: ' + Object.keys(me.hands).map((s) => (s === 'L' ? 'left' : 'right') + ' (' + me.fingers.filter((f) => f.side === s && f.b === f.fr).length + ' fingers)').join(', ')); else body.push('no hands'); body.push(me.eyes.length ? me.eyes.length + ' moving eyes' : 'no moving eyes'); body.push(me.head ? 'a head that turns' : 'no head bone');
    for (const sd of ['L', 'R']) { if (me.ctl && me.ctl[sd]) body.push((sd === 'L' ? 'left' : 'right') + ' hand posed now'); const A = me.armCtl && me.armCtl[sd]; if (A && A.w > 0) body.push((sd === 'L' ? 'left' : 'right') + ' arm: ' + A.mode); } if (me.root.userData.lookTarget) body.push('eyes locked on a target'); body.push('view: ' + (me.view || 'first') + ' person'); }
  const nm = me ? me.root.name || '' : ''; const done = CHK.log.filter((l) => /^(AI |Hands|Arms|View)/.test(l) && (!nm || l.includes(nm) || /^AI /.test(l))).slice(-10);
  return 'SELF-AWARENESS (never mention this): ' + CAN_DO + CAN_DO_BODY + 'you have a real, rigged body in the simulation and you control all of it yourself with your tools (the body tool moves your hands, every finger, your arms, eyes, head and view). Your body now: ' + (body.join('; ') || 'relaxed') + '. What you just did with it: ' + (done.join(' | ') || 'nothing yet') + '. Remember what you did and said and build on it. Only Ollo (and Caine) can make anything at all.'; } catch (e) { return ''; } }
// the picture-in-picture view is now the CHARACTER's view: the character you are controlling, or Caine / Ollo when you control no one,
// seen from its own eyes (eye level, where its eyes look, its own view type)
try { const _up = updatePov; updatePov = function (...a) { const r = _up.apply(this, a); try { const c = PLAYER.c && PLAYER.c !== ollo ? PLAYER.c : null; const i = c ? chkFind(c.group) : ALT.on && ALT.root ? chkFind(ALT.root) : null; if (i && typeof povCam !== 'undefined' && povCam) { const { P, Q } = chkEyePose(i); povCam.position.copy(P); povCam.quaternion.copy(Q).multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI)); povCam.updateMatrixWorld(true); } } catch (e) { /* ok */ } return r; }; } catch (e) { console.warn('[view] could not follow the character', e); }
// Caine on foot: the AI (or you) can switch him between flying (Ollo's hover) and walking / running on the ground. On foot he stands on
// the ground under him and his legs walk procedurally with his real speed (stride, knee bend, a little bounce); standing still he stands
const CAINE_GO = { mode: 'fly', ph: 0, last: null };
function caineWalk(B) { const R = ALT.root; if (!R || CAINE_GO.mode === 'fly') { CAINE_GO.last = null; CAINE_GO.ySmooth = null; return; } const now = performance.now(), dt = CAINE_GO.t ? Math.min(0.05, (now - CAINE_GO.t) / 1000) : 1 / 60; CAINE_GO.t = now;
  const p = R.position, sp = CAINE_GO.last ? Math.hypot(p.x - CAINE_GO.last.x, p.z - CAINE_GO.last.z) / Math.max(dt, 1e-3) : 0; CAINE_GO.last = p.clone(); CAINE_GO.v = (CAINE_GO.v || 0) + (sp - (CAINE_GO.v || 0)) * (1 - Math.exp(-dt * 9));
  let gy = null; try { gy = groundBelow(p.x, p.z, p.y + 2, 80); } catch (e) { gy = null; } const run = CAINE_GO.mode === 'run', v = CAINE_GO.v, moving = v > 0.15, amp = moving ? Math.min(1, v / (run ? 3.2 : 1.6)) * (run ? 0.75 : 0.45) : 0;
  CAINE_GO.ph += dt * (moving ? 2.2 + v * (run ? 2.6 : 3.2) : 0); const bob = moving ? Math.abs(Math.sin(CAINE_GO.ph)) * B.H * (run ? 0.028 : 0.014) : 0;
  if (gy !== null && gy !== undefined) { const targetY = gy - (B.footY || 0) + bob; if (CAINE_GO.ySmooth == null || Math.abs(targetY - CAINE_GO.ySmooth) > 1.5) CAINE_GO.ySmooth = targetY; else CAINE_GO.ySmooth += (targetY - CAINE_GO.ySmooth) * (1 - Math.exp(-dt * 16)); R.position.y = CAINE_GO.ySmooth; R.updateMatrixWorld(true); try { if (typeof OH !== 'undefined' && OH) OH.holdY = gy + 0.02; } catch (e) { /* ok */ } }
  const X = new THREE.Vector3(1, 0, 0); for (const sd of ['L', 'R']) { const s = sd === 'L' ? 1 : -1, a = Math.sin(CAINE_GO.ph) * s * amp, knee = Math.max(0, -Math.cos(CAINE_GO.ph) * s) * amp * 1.4 + (moving ? 0.05 : 0);
    B.bones['ul' + sd].quaternion.setFromAxisAngle(X, -a); B.bones['ll' + sd].quaternion.setFromAxisAngle(X, knee); B.bones['ft' + sd].quaternion.setFromAxisAngle(X, -knee * 0.5 + a * 0.3); }
  B.bones.hips.updateMatrixWorld(true); }
// the cane: held properly in the right hand, or dropped (it falls with gravity, tips over, bounces and comes to rest lying on the ground,
// on whatever surface is under it) and picked up again
function caineCane(B) { const C = B.cane; if (!C) return; const st = B.caneSt || (B.caneSt = { mode: 'held' }); if (st.mode === 'held') return; const now = performance.now(), dt = st.t ? Math.min(0.04, (now - st.t) / 1000) : 1 / 60; st.t = now; C.visible = ALT.on;
  if (st.mode === 'fall') { st.v.y -= 9.8 * dt; const from = C.position.clone(); C.position.addScaledVector(st.v, dt);
    /* everything around it is solid: walls, furniture, characters (not Caine): the cane's path is traced each step and it bounces off what it hits */ if (!st.nearT || now - st.nearT > 400) { st.nearT = now; st.near = []; const sp = new THREE.Sphere(); scene.traverse((o) => { if (!o.isMesh || !o.visible || o.isSkinnedMesh || !o.geometry || o === C) return; let p = o; while (p) { if (p === C || p === ALT.root || p === ollo.group) return; p = p.parent; } if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); sp.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld); if (sp.radius < 40 && sp.distanceToPoint(from) < 3) st.near.push(o); }); }
    if (st.near.length) { const mv = C.position.clone().sub(from), L = mv.length(); if (L > 1e-5) { const rc = new THREE.Raycaster(from, mv.clone().divideScalar(L), 0, L + 0.04); const hit = rc.intersectObjects(st.near, false)[0]; if (hit && hit.face) { const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize(); C.position.copy(hit.point).addScaledVector(n, 0.04); const vn = st.v.dot(n); if (vn < 0) st.v.addScaledVector(n, -1.4 * vn).multiplyScalar(0.7); st.w *= 0.7; } } } st.tilt = Math.min(Math.PI / 2, st.tilt + st.w * dt); st.w += dt * 6; C.quaternion.copy(st.q0).premultiply(new THREE.Quaternion().setFromAxisAngle(st.ax, st.tilt));
    let gy = null; try { gy = groundBelow(C.position.x, C.position.z, C.position.y + 1, 80); } catch (e) { gy = null; } if (gy === null || gy === undefined) gy = 0; C.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(C);
    if (bb.min.y <= gy) { C.position.y += gy - bb.min.y; if (Math.abs(st.v.y) > 0.6) { st.v.y *= -0.32; st.v.x *= 0.6; st.v.z *= 0.6; st.w *= 0.5; } else if (st.tilt >= Math.PI / 2 - 0.02) { st.mode = 'rest'; chkLog('Cane — it clatters to the ground and lies still'); } else { st.v.set(0, 0, 0); } } } }
SBX.caineMove = (mode) => { mode = String(mode || '').toLowerCase(); if (!/^(walk|run|fly)$/.test(mode)) return false; CAINE_GO.mode = mode; CAINE_GO.last = null; if (mode === 'fly') { try { if (typeof OH !== 'undefined' && OH) OH.holdY = null; } catch (e) { /* ok */ } } /* flying again: Ollo's own hover height takes back over */ chkLog('Moving — Caine now ' + (mode === 'fly' ? 'flies' : mode + 's on the ground')); return true; };
SBX.caineCane = (act) => { const B = ALT.body; if (!B || !B.cane) return false; const C = B.cane, st = B.caneSt || (B.caneSt = { mode: 'held' }); act = String(act || '').toLowerCase();
  if (/drop|let ?go|throw|toss/.test(act) && st.mode === 'held') { scene.attach(C); C.visible = ALT.on; Object.assign(st, { mode: 'fall', v: new THREE.Vector3((Math.random() - 0.5) * 0.4, /throw|toss/.test(act) ? 2.5 : 0, /throw|toss/.test(act) ? 1.5 : 0.2).applyQuaternion(ALT.root.quaternion), tilt: 0, w: 0.8, t: 0, q0: C.quaternion.clone(), ax: new THREE.Vector3(1, 0, (Math.random() - 0.5)).normalize().applyQuaternion(ALT.root.quaternion) }); chkLog('Cane — Caine ' + (/throw|toss/.test(act) ? 'tosses' : 'drops') + ' his cane'); return true; }
  if (/pick|grab|take|hold|catch/.test(act) && st.mode !== 'held') { B.bones.haR.add(C); C.position.copy(B.caneLocal.p); C.quaternion.copy(B.caneLocal.q); C.visible = true; st.mode = 'held'; chkLog('Cane — back in his hand'); return true; } return false; };
// whose eyes the full view uses: the character you control, else Caine / Ollo
function chkViewTarget() { const c = PLAYER.c && PLAYER.c !== ollo ? PLAYER.c : null; return c ? chkFind(c.group) : chkFind(ALT.on && ALT.root ? ALT.root : ollo.group); }
SBX.viewMode = (mode) => { const first = /^(first|full|fp|eyes|pov|1)/i.test(String(mode)); CHK.fpv = first; try { if (first && PLAYER.c) { if (FPV_LOOK.charId !== PLAYER.c.id) fpvSyncFromChar(PLAYER.c); fpvSetActive(true); } else { fpvSetActive(false); if (PLAYER.c) { const cp = PLAYER.c.group.position.clone(); const yaw = PLAYER.c.group.rotation.y || 0; const fw = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); controls.target.copy(cp).add(new THREE.Vector3(0, 0.9, 0)); camera.position.copy(cp).addScaledVector(fw, -3.4).add(new THREE.Vector3(0, 1.75, 0)); controls.update(); } } } catch (e) { /* ok */ } try { const b = document.getElementById('aiViewFull'); if (b) b.textContent = first ? '⧉ Small view' : '⛶ Full view'; } catch (e) { /* ok */ } chkLog('View — the screen shows ' + (first ? 'the character’s own eyes (full view)' : 'third person')); return true; };
function chkSetW(o, P, Q) { const pa = o.parent; pa.updateWorldMatrix(true, false); o.position.copy(pa.worldToLocal(P.clone())); o.quaternion.copy(pa.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(Q)); }
// each character's brain chooses where to look: a target the AI gave it (SBX.lookAt), else now and then the camera, another character
// close by, or a spot in front of it. Returns a world point (or null)
function chkGaze(info, dt) { const r = info.root; if (r.userData.lookTarget) { if (r.userData.lookUntil && performance.now() > r.userData.lookUntil) { r.userData.lookTarget = null; r.userData.lookUntil = 0; } else { const t = r.userData.lookTarget; return t.isVector3 ? t : t.isObject3D ? t.getWorldPosition(new THREE.Vector3()) : null; } }
  if (r.userData._talkT && performance.now() - r.userData._talkT < 1500) return camera.getWorldPosition(new THREE.Vector3()); /* talking: looks at the person it talks to */
  { const pNow = r.getWorldPosition(new THREE.Vector3()); if (info._pp) { const v = pNow.clone().sub(info._pp); v.y = 0; info._vel = (info._vel || new THREE.Vector3()).lerp(v.multiplyScalar(1 / Math.max(dt, 1e-3)), 0.2); } info._pp = pNow; if (info._vel && info._vel.length() > 0.6) return pNow.clone().add(info._vel.clone().normalize().multiplyScalar(4)).add(new THREE.Vector3(0, 1.2, 0)); /* moving: looks where it is going */ }
  info.gazeT = (info.gazeT || 0) - dt; if (info.gazeT <= 0 || !info.gaze) { info.gazeT = 1.5 + Math.random() * 3.5; const me = r.getWorldPosition(new THREE.Vector3()), pick = Math.random(); let tgt = null;
    if (pick < 0.35 && camera.position.distanceTo(me) < 12) tgt = camera; else if (pick < 0.75) { let best = null, bd = 8; for (const o of CHK.list.values()) { if (o === info) continue; const d = o.root.getWorldPosition(new THREE.Vector3()).distanceTo(me); if (d < bd) { bd = d; best = o; } } if (best) tgt = best.head || best.root; }
    info.gaze = tgt || me.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random(), 3).applyQuaternion(r.getWorldQuaternion(new THREE.Quaternion()))); }
  const g = info.gaze; return g.isObject3D ? g.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, g === camera ? 0 : 0.1, 0)) : g; }
// the AI tells a character where to look: SBX.lookAt(character or name, point / object / null)
function chkFind(c) { if (!c) return null; if (c.isObject3D) { for (const i of CHK.list.values()) { let p = c; while (p) { if (p === i.root) return i; p = p.parent; } } return null; } const s = String(c).toLowerCase(); for (const i of CHK.list.values()) if ((i.root.name || '').toLowerCase().includes(s)) return i; return null; }
{ const _lA2 = lipApply; lipApply = function (c, L, w) { try { const now = performance.now(); if (c && c.group) c.group.userData._talkT = now; if (c === ollo && ALT.root) ALT.root.userData._talkT = now; } catch (e) { /* ok */ } return _lA2(c, L, w); }; }
// the AI's own commands, written in its reply: [look: Who -> Target] (a character, 'you', or x,y,z) and [view: Who -> first|third|bw|none]
function chkAICommands(txt) { if (typeof txt !== 'string') return txt; let n = 0; const out = txt.replace(/\[(look|view|hand|finger|arm|move|cane)\s*:\s*([^\]]*?)\s*(?:->|→|at|to)\s*([^\]]+?)\s*\]/gi, (m, k, who, what) => { n++; try { const W = /^(me|you|self|ollo|caine)$/i.test(who) ? (ALT.on && ALT.root ? ALT.root : ollo.group) : who; const kk = k.toLowerCase(); if (kk === 'move') SBX.caineMove(what.trim()); else if (kk === 'cane') SBX.caineCane(what.trim()); else if (kk === 'arm') { const ws = what.trim().split(/\s+/); let sd = 'both'; if (/^(left|l|right|r|both)$/i.test(ws[0])) sd = ws.shift().toLowerCase(); const mode = (ws.shift() || 'raise').toLowerCase(); SBX.arm(W, sd, mode, ws.join(' ') || null); } else if (kk === 'hand' || kk === 'finger') { const ws = what.trim().toLowerCase().split(/\s+/); let sd = 'both'; if (/^(left|l|right|r|both)$/.test(ws[0])) sd = ws.shift(); if (kk === 'hand') SBX.hand(W, sd, ws.join(' ')); else SBX.finger(W, sd, ws[0], parseFloat(ws[1])); } else if (kk === 'view') SBX.setView(W, what.trim().toLowerCase()); else { let t = null; if (/^(you|user|player|camera|me)$/i.test(what)) t = camera; else if (/^-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+$/.test(what)) t = new THREE.Vector3(...what.split(',').map(Number)); else { const f = chkFind(what); t = f ? (f.head || f.root) : null; } if (t) { SBX.lookAt(W, t); const fi = chkFind(W); if (fi) fi.root.userData.lookUntil = performance.now() + 6000; } } chkLog('AI ' + k + ' — ' + who + ' → ' + what); } catch (e) { /* ok */ } return ''; }); return n ? out.replace(/\s{2,}/g, ' ').trim() : txt; }
// ---------- whole-arm control (two-bone IK): the AI raises, waves, reaches for and points at things with any character's arms.
// The elbow bends in its natural direction (down, back, a little out), the arm eases in and out, and it never stretches past its length
function chkRotW(o, from, to, w) { const q = new THREE.Quaternion().setFromUnitVectors(from, to); if (w < 1) q.slerp(new THREE.Quaternion(), 1 - w); const wq = o.getWorldQuaternion(new THREE.Quaternion()), pq = o.parent.getWorldQuaternion(new THREE.Quaternion()); o.quaternion.copy(pq.invert().multiply(q).multiply(wq)); o.updateMatrixWorld(true); }
function chkIK(A, Bn, Cn, T, pole, w) { A.updateWorldMatrix(true, true); const pa = A.getWorldPosition(new THREE.Vector3()), pb = Bn.getWorldPosition(new THREE.Vector3()), pc = Cn.getWorldPosition(new THREE.Vector3()); const l1 = pa.distanceTo(pb), l2 = pb.distanceTo(pc); if (l1 < 1e-5 || l2 < 1e-5) return;
  const AT = T.clone().sub(pa); const dist = clamp(AT.length(), Math.abs(l1 - l2) + 1e-4, (l1 + l2) * 0.998); const dir = AT.lengthSq() > 1e-10 ? AT.normalize() : pc.clone().sub(pa).normalize(); let pl = pole.clone().sub(pa); pl.addScaledVector(dir, -pl.dot(dir)); if (pl.lengthSq() < 1e-10) { pl = new THREE.Vector3(0, -1, 0); pl.addScaledVector(dir, -pl.dot(dir)); } if (pl.lengthSq() < 1e-10) pl.set(0, 0, -1); pl.normalize();
  const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1), sinA = Math.sqrt(1 - cosA * cosA); const pb2 = pa.clone().addScaledVector(dir, l1 * cosA).addScaledVector(pl, l1 * sinA), pc2 = pa.clone().addScaledVector(dir, dist);
  chkRotW(A, pb.clone().sub(pa).normalize(), pb2.clone().sub(pa).normalize(), w); const pbN = Bn.getWorldPosition(new THREE.Vector3()), pcN = Cn.getWorldPosition(new THREE.Vector3()); if (pcN.distanceToSquared(pbN) > 1e-12) chkRotW(Bn, pcN.clone().sub(pbN).normalize(), pc2.clone().sub(pbN).normalize(), w); }
function chkArms(info) { if (info.arms) return info.arms; const arms = {}; for (const sd of ['L', 'R']) { let hand = info.hands && info.hands[sd] && info.hands[sd].b; if (!hand) { const bs = []; info.root.traverse((o) => { if (o.isBone && /(hand|mitt|wrist|paw)/i.test(o.name) && !RE_FING.test(o.name)) bs.push(o); }); hand = bs.find((b) => (/left/i.test(b.name) ? 'L' : /right/i.test(b.name) ? 'R' : info.root.worldToLocal(b.getWorldPosition(new THREE.Vector3())).x >= 0 ? 'L' : 'R') === sd); }
    if (hand && hand.parent && hand.parent.isBone && hand.parent.parent && hand.parent.parent.isBone) arms[sd] = { a: hand.parent.parent, b: hand.parent, c: hand, qa: new THREE.Quaternion(), qb: new THREE.Quaternion(), saved: false }; } return (info.arms = arms); }
function chkTarget(what) { if (!what) return null; if (/^(you|user|player|camera|me)$/i.test(what)) return camera; if (/^-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+$/.test(what)) return new THREE.Vector3(...what.split(',').map(Number)); const f = chkFind(what); return f ? f.head || f.root : null; }
function chkArmApply(info, dt, save) { const AC = info.armCtl; if (!AC) return; const arms = chkArms(info); const rq = info.root.getWorldQuaternion(new THREE.Quaternion()), up = new THREE.Vector3(0, 1, 0), front = new THREE.Vector3(0, 0, 1).applyQuaternion(rq);
  for (const sd of ['L', 'R']) { const C = AC[sd], R = arms[sd]; if (!C || !R) continue; const live = !C.until || performance.now() < C.until; C.w = clamp((C.w || 0) + (live ? 1 : -1) * dt * 3.5, 0, 1); if (!live && C.w <= 0) { delete AC[sd]; continue; } if (C.w <= 0) continue;
    if (save && !R.saved) { R.qa.copy(R.a.quaternion); R.qb.copy(R.b.quaternion); R.saved = true; } info.root.updateMatrixWorld(true); const pa = R.a.getWorldPosition(new THREE.Vector3()), len = pa.distanceTo(R.b.getWorldPosition(new THREE.Vector3())) + R.b.getWorldPosition(new THREE.Vector3()).distanceTo(R.c.getWorldPosition(new THREE.Vector3())); const out = new THREE.Vector3(sd === 'L' ? 1 : -1, 0, 0).applyQuaternion(rq);
    const tp = C.target ? (C.target.isVector3 ? C.target.clone() : C.target.getWorldPosition(new THREE.Vector3())) : null; let T;
    if (C.mode === 'raise' || C.mode === 'wave') T = pa.clone().addScaledVector(up, len * 0.88).addScaledVector(out, len * 0.32).addScaledVector(front, len * 0.12);
    else if (C.mode === 'forward') T = pa.clone().addScaledVector(front, len * 0.95).addScaledVector(up, -len * 0.05); else if (C.mode === 'out') T = pa.clone().addScaledVector(out, len * 0.95);
    else if (C.mode === 'point' && tp) T = pa.clone().addScaledVector(tp.sub(pa).normalize(), len); else if (C.mode === 'reach' && tp) T = tp; else continue;
    if (C.mode === 'reach' || C.mode === 'point') { if (!C._clampT || performance.now() - C._clampT > 250) { C._clampT = performance.now(); C._T = chkClampReach(info, pa, T); } T = C._T || T; }
    const pole = pa.clone().addScaledVector(up, -len * 0.5).addScaledVector(front, -len * 0.45).addScaledVector(out, len * 0.35); chkIK(R.a, R.b, R.c, T, pole, C.w * C.w * (3 - 2 * C.w)); } }
SBX.arm = (c, side = 'both', mode = 'down', target = null, ms = 8000) => { const i = chkFind(c); if (!i) return false; i.armCtl = i.armCtl || {}; for (const sd of side === 'both' ? ['L', 'R'] : [/^l/.test(side) ? 'L' : 'R']) { if (/^(down|relax|rest|lower)$/.test(mode)) { if (i.armCtl[sd]) i.armCtl[sd].until = 1; } else i.armCtl[sd] = { mode, target: typeof target === 'string' ? chkTarget(target) : target, until: ms ? performance.now() + ms : 0, w: i.armCtl[sd] ? i.armCtl[sd].w : 0 }; }
  if (mode === 'wave') SBX.hand(c, side, 'wave', ms); if (mode === 'point') SBX.hand(c, side, 'point', ms); if (mode === 'reach') SBX.hand(c, side, 'open', ms); chkLog('Arms — ' + (i.root.name || 'character') + ': ' + side + ' ' + mode + (target ? ' ' + (typeof target === 'string' ? target : '') : '')); return true; };
SBX.aiCommands = chkAICommands;
// Caine's own voice, made with the same procedural voice system the AI uses for new characters: a bright, fast, bombastic American
// ringmaster (wide, sudden pitch swings, punchy stresses, a little rasp), used for everything he says while copyright safe is off
VOICE_PRESETS['ringmaster'] = { pitch: 66, mouth: 134, throat: 130, speed: 70, pres: 2.5, warm: 2.5, gender: 'male', accent: 'en-US', np: 1.02, nr: 1.12, vol: 1.08, hp: 90, lp: 7200 };
const CAINE_VOICE = { preset: 'ringmaster', label: 'Caine (ringmaster)', engine: 'natural', gender: 'male', accent: 'en-US', pitch: 64, mouth: 138, throat: 126, speed: 84, pres: 3, warm: 2.2, hp: 90, lp: 7600, natural_pitch: 0.93, natural_rate: 1.18, timbre: 'showman', showman: true, volume: 1.08 };
let CAINE_M = null;
function caineM() { if (!CAINE_M) { const vp = cleanVoice(CAINE_VOICE); CAINE_M = { c: ollo, log: [], notes: [], mood: 'Excited', voiceP: vp }; chkLog('Voice — Caine: ' + vp.label + ' (' + vp.engine + ', male, ' + vp.accent + ', pitch x' + vp.np + ', pace x' + vp.nr + ')'); } return CAINE_M; }
/* EVERY line Ollo says while Caine is shown is spoken in Caine's voice, whatever path it took to get here: each spoken line passes through
   speakSynced (it keeps the mouth in sync), where Caine's voice, pitch and pace are put on it; lines from other characters are marked so
   the last-resort browser-speech hook never touches them */
let CAINE_Q = Promise.resolve();
function caineSynth(part) { const m = caineM(); CAINE_Q = CAINE_Q.then(async () => { await mindVoice(m, part); try { if (m.voiceGain) m.voiceGain.gain.value = 1.45 * (m.voiceVol || 1); } catch (e) { /* ok */ } const t0 = performance.now(); await new Promise((res) => { const w = () => { if (!m.voiceSrc || performance.now() - t0 > 15000) res(); else setTimeout(w, 60); }; setTimeout(w, 80); }); }).catch(() => {}); }
try { const _ss = speakSynced; speakSynced = function (c, u, part, ...a) { try { if (u && typeof u === 'object' && ALT.on && c === ollo && caineM().voiceP.engine === 'toy' && String(part || '').trim()) { u.volume = 0; Object.defineProperty(u, 'volume', { get: () => 0, set: () => {}, configurable: true }); caineSynth(String(part).trim()); return; } } catch (e) { /* ok */ } try { if (u && typeof u === 'object') { if (ALT.on && c === ollo) { const m = caineM(), v = m.voiceP, nv = natVoice(m, v); if (nv) { u.voice = nv; u.lang = nv.lang; } else u.lang = 'en-US'; const ex = /!\s*$/.test(String(part || '')), q = /\?\s*$/.test(String(part || '')); const nowT = performance.now(); m.k = nowT - (m.kT || 0) > 2500 ? 0 : (m.k || 0) + 1; m.kT = nowT; const caps = (String(part || '').match(/\b[A-Z]{3,}\b/g) || []).length; u.pitch = clamp(v.np * (ex ? 1.07 : q ? 1.04 : 1.0) * (caps ? 1.04 : 1.0) * (1 + Math.min(3, m.k) * 0.015) * (0.98 + Math.random() * 0.04), 0.88, 1.18); u.rate = clamp(v.nr * (ex || caps ? 1.05 : 1.0), 0.92, 1.26); u._caine = true; } else u._notCaine = true; } } catch (e) { /* ok */ } return _ss.call(this, c, u, part, ...a); }; } catch (e) { console.warn('[caine voice] speech hook', e); }
// hands for every animation: whatever clip a character plays (or how it moves), its hands do the matching thing
function chkAutoPose(info, sd) { const now = performance.now(), u = info.root.userData, clip = u._clip && now - (u._clipT || 0) < 3500 ? String(u._clip).toLowerCase() : '', P = CHK_POSES, v = info._vel ? info._vel.length() : 0;
  if (/wave|hello|bye|greet/.test(clip)) return sd === 'R' ? P.open : null; if (/point|present|show|ta-?da/.test(clip)) return sd === 'R' ? P.point : P.open; if (/punch|fight|box|angry|rage|fist|stomp/.test(clip)) return P.fist; if (/grab|pick|hold|carry|lift|push|pull|climb/.test(clip)) return P.grip; if (/thumb/.test(clip)) return P.thumbsup; if (/peace/.test(clip)) return sd === 'R' ? P.peace : null;
  if (/celebrat|cheer|dance|surprise|shock|scare|clap|jump|fall|flail|spin|bow/.test(clip)) return P.spread; if (/think|ponder/.test(clip)) return sd === 'R' ? { all: 0.55, index: 0.2, thumb: 0.4 } : null; if (/sit|sleep|rest|lie|idle/.test(clip)) return { all: 0.25, thumb: 0.2 };
  if (/run|sprint|dash/.test(clip) || v > 3) return { all: 0.62, thumb: 0.5 }; if (/walk|stroll|step/.test(clip) || v > 0.6) return { all: 0.32, thumb: 0.25 };
  if (u._talkT && now - u._talkT < 1500) { const k = Math.floor((now / 1000 + info.ph) / 1.2) % 4; return [P.open, { all: 0.35, thumb: 0.2 }, P.spread, sd === 'R' ? { all: 0.6, index: 0.1, thumb: 0.5 } : P.open][k]; } /* talking: the hands gesture with the words */
  return null; }
try { const _pc = playClip; playClip = function (c, name, ...a) { try { const now = performance.now(); if (c && c.group) { c.group.userData._clip = name; c.group.userData._clipT = now; } if (c === ollo && ALT.root) { ALT.root.userData._clip = name; ALT.root.userData._clipT = now; } } catch (e) { /* ok */ } return _pc.call(this, c, name, ...a); }; } catch (e) { console.warn('[hands] could not follow animations', e); }
// Caine speaks with a warm, high-quality American male ringmaster voice (never tinny or high-pitched)
try { if (window.speechSynthesis) { const _sp = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = function (u) { try { if (ALT.on && u && !u._caine && !u._notCaine) { const m = caineM(), pick = natVoice(m, m.voiceP); if (pick) { u.voice = pick; u.lang = pick.lang; } else { u.lang = 'en-US'; } u.pitch = clamp(u.pitch || 1.02, 0.9, 1.16); u.rate = clamp(u.rate || 1.1, 0.94, 1.24); u.volume = 1; } } catch (e) { /* ok */ } return _sp(u); }; } } catch (e) { /* ok */ }
// hands the AI controls: poses for one hand or both, or single fingers (0 = straight, 1 = fully bent); held 8 s, or until 'relax'
const CHK_POSES = { fist: { all: 1, thumb: 0.8 }, open: { all: 0, thumb: 0 }, spread: { all: -0.08, thumb: -0.1 }, point: { all: 1, index: 0, thumb: 0.75 }, peace: { all: 1, index: 0, middle: 0, thumb: 0.8 }, thumbsup: { all: 1, thumb: 0 }, grip: { all: 0.7, thumb: 0.6 }, pinch: { all: 0.2, index: 0.75, thumb: 0.7 }, rock: { all: 1, index: 0, pinky: 0, thumb: 0.8 }, ok: { all: 0.1, index: 0.8, thumb: 0.7 }, wave: { all: 0, thumb: 0, wave: true } };
SBX.hand = (c, side = 'both', pose = 'relax', ms = 8000) => { const i = chkFind(c); if (!i) return false; pose = String(pose).replace(/[^a-z]/g, ''); i.ctl = i.ctl || {}; for (const sd of side === 'both' ? ['L', 'R'] : [/^l/.test(side) ? 'L' : 'R']) { if (pose === 'relax' || !CHK_POSES[pose]) delete i.ctl[sd]; else i.ctl[sd] = Object.assign({ until: ms ? performance.now() + ms : 0 }, CHK_POSES[pose]); } chkLog('Hands — ' + (i.root.name || 'character') + ': ' + side + ' ' + pose); return true; };
SBX.finger = (c, side = 'both', kind = 'index', v = 1, ms = 8000) => { const i = chkFind(c); if (!i) return false; kind = String(kind).replace('little', 'pinky'); v = isFinite(v) ? clamp(v, -0.2, 1) : 1; i.ctl = i.ctl || {}; for (const sd of side === 'both' ? ['L', 'R'] : [/^l/.test(side) ? 'L' : 'R']) { const C = i.ctl[sd] || (i.ctl[sd] = {}); C[kind] = v; C.until = ms ? performance.now() + ms : 0; } return true; };
const CHK_AI_HINT = '\n\n(Body control, never mention it: to make any character look somewhere write [look: Name -> Target] where Target is a character name, you, or x,y,z; to change what a character can see write [view: Name -> first|third|bw|none]; to move hands write [hand: Name -> left|right|both fist|open|spread|point|peace|thumbsup|grip|pinch|rock|ok|wave|relax]; to bend one finger write [finger: Name -> left|right|both thumb|index|middle|ring|pinky 0-1]; to move a whole arm write [arm: Name -> left|right|both raise|wave|forward|out|down|reach Target|point Target]; Caine can switch between flying and moving on foot with [move: Caine -> walk|run|fly], and use his cane with [cane: Caine -> drop|toss|pick up]. Use your own name for yourself. Whenever you make or edit an animation for a character that has hands, never forget the hands: give the hand and finger bones their own keys that fit the motion (fists for punches, open hands for waves, a grip for carrying, relaxed curls for walking), and use [hand:] / [finger:] while you act it out.)';
SBX.lookAt = (c, t) => { const i = chkFind(c); if (!i) return false; i.root.userData.lookTarget = t ? (Array.isArray(t) ? new THREE.Vector3(...t) : t) : null; return true; };
// each character's own view: from its eye level (between its eyes, along its gaze), in its own view type: 'first' (default), 'third'
// (behind and above its head), 'bw' (black and white only), 'none' (no sight). SBX.charView(character) returns a picture (data URL)
const CHK_RT = { rt: null, cam: new THREE.PerspectiveCamera(70, 4 / 3, 0.05, 400) };
function chkEyePose(i) { const r = i.root; r.updateMatrixWorld(true); const pts = i.eyes.filter((e) => e.lc && !e.white0).map((e) => e.o.localToWorld(e.lc.clone())); if (!pts.length) for (const e of i.eyes) pts.push(e.lc ? e.o.localToWorld(e.lc.clone()) : e.o.getWorldPosition(new THREE.Vector3())); /* sight starts between the centres of the eyes */
  const bb = new THREE.Box3().setFromObject(r), H = bb.max.y - bb.min.y; const P = pts.length ? pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length) : (i.head ? i.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, H * 0.04, 0)) : new THREE.Vector3(bb.getCenter(new THREE.Vector3()).x, bb.max.y - H * 0.1, bb.getCenter(new THREE.Vector3()).z));
  /* and points where the EYES look: the head's facing (with its turn) plus the eyes' own turn and flicks, so moving only the eyes changes the view too */ const Q = chkFrameQ(i).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-(i.eyePitch || 0), i.eyeYaw || 0, 0, 'YXZ'))); return { P, Q, H }; }
SBX.charView = (c, w = 320, h = 240) => { const i = chkFind(c); if (!i) return null; const view = i.root.userData.viewType || i.view || 'first'; const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d');
  if (view === 'none') { cx.fillStyle = '#000'; cx.fillRect(0, 0, w, h); return cv.toDataURL('image/jpeg', 0.7); }
  if (!CHK_RT.rt || CHK_RT.rt.width !== w || CHK_RT.rt.height !== h) { if (CHK_RT.rt) CHK_RT.rt.dispose(); CHK_RT.rt = new THREE.WebGLRenderTarget(w, h); }
  const { P, Q, H } = chkEyePose(i), cam = CHK_RT.cam; cam.aspect = w / h; cam.quaternion.copy(Q).multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI)); /* characters face +z, cameras look down -z */ cam.position.copy(P);
  if (view === 'third') { const back = new THREE.Vector3(0, 0, 1).applyQuaternion(cam.quaternion); cam.position.addScaledVector(back, Math.max(1.2, H * 2.2)).add(new THREE.Vector3(0, H * 0.5, 0)); cam.lookAt(P); } else cam.near = Math.max(0.02, H * 0.02);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); const prev = renderer.getRenderTarget();
  try { renderer.setRenderTarget(CHK_RT.rt); CHK.force = true; try { renderer.render(scene, cam); } finally { CHK.force = false; } const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(CHK_RT.rt, 0, 0, w, h, px); const img = cx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = ((h - 1 - y) * w + x) * 4, d = (y * w + x) * 4; let R = px[s], G = px[s + 1], B = px[s + 2]; if (view === 'bw') { const l = 0.299 * R + 0.587 * G + 0.114 * B; R = G = B = l; } img.data[d] = R; img.data[d + 1] = G; img.data[d + 2] = B; img.data[d + 3] = 255; } cx.putImageData(img, 0, 0); }
  finally { renderer.setRenderTarget(prev); } return cv.toDataURL('image/jpeg', 0.75); };
SBX.setView = (c, type) => { const i = chkFind(c); if (!i) return false; i.root.userData.viewType = i.view = type; chkLog('View — ' + (i.root.name || 'character') + ' now sees in ' + type + ' view'); return true; };
{ const _rF = renderer.render.bind(renderer); let tP = performance.now();
  renderer.render = function (sc, cam) { if (sc === scene && cam === camera && CHK.fpv && !CHK.fpvOn) { const i = chkViewTarget(); if (i) { const p0 = camera.position.clone(), q0 = camera.quaternion.clone(), f0 = camera.fov; try { const { P, Q, H } = chkEyePose(i); const useLook = FPV_LOOK.active && PLAYER.c; const Quse = useLook ? new THREE.Quaternion().setFromEuler(new THREE.Euler(-FPV_LOOK.pitch, FPV_LOOK.yaw, 0, 'YXZ')) : Q; const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(Quse); camera.position.copy(P).addScaledVector(fwd, Math.max(0.05, H * 0.08)); camera.quaternion.copy(Quse).multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI)); camera.fov = 75; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); CHK.fpvOn = true; return renderer.render.call(this, sc, camera); } finally { CHK.fpvOn = false; camera.position.copy(p0); camera.quaternion.copy(q0); camera.fov = f0; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); } } } /* full view: the main screen sees through the character's own eyes, with direct mouse/touch drag look */
    if (sc !== scene || (cam !== camera && !CHK.force)) return _rF(sc, cam); /* only the main view (and a character's own view) pays for hands / eyes / gaze: thumbnails, mirrors and AI captures skip it */ const now = performance.now(), dt = Math.min(0.05, (now - tP) / 1000); tP = now; try { chkMirrorsStep(); } catch (e) { /* ok */ } if (now - CHK.last > 1500) { CHK.last = now; try { chkScan(); } catch (e) { console.warn('[character check]', e); } }
    let ok = false; try { chkApply(now / 1000, dt); ok = true; } catch (e) { console.warn('[character check] animate', e); } try { return _rF(sc, cam); } finally { try { chkRestore(); } catch (e) { console.warn('[character check] restore', e); } } }; }
// ---------------------------------------------------------------- 14. the full Circus Lobby map: every object of the Circus Lobby set,
// already in the simulation, put back exactly where the .blend file has it, at the library's scale, solid, and lit like the set (its own
// lamps become real lights; a warm fill lights the room). One button turns it on and off; the island comes back when it is off.
const LOBBYMAP = { on: false, grp: null, id: null };
try { park.root.visible = false; rebuildSolids(); } catch (e) { /* ok */ } /* Radiant Park is removed: the world starts on the plain default baseplate */
async function lobbyMap(on) { if (on === LOBBYMAP.on) return; LOBBYMAP.on = on; btnLobby.setAttribute('aria-pressed', String(on));
  if (!on) { if (LOBBYMAP.grp) { LOBBYMAP.grp.visible = false; try { for (const f of ['remove', 'delete', 'removeObject']) if (typeof SBX[f] === 'function' && LOBBYMAP.id) { SBX[f](LOBBYMAP.id); break; } } catch (e) { /* ok */ } } /* back to the plain default baseplate (Radiant Park is gone for good) */ try { rebuildSolids(); } catch (e) { /* ok */ } SBX.dirty = true; toast('Circus Lobby map off'); return; }
  btnLobby.disabled = true; btnLobby.textContent = '🎪 Loading…'; try { if (!PACKLIB.meta) throw new Error('library not ready yet'); const i = PACKLIB.meta.packs.findIndex((p) => /lobby/i.test(p.label || '')); const sc = await packScene(i >= 0 ? i : 2); const s = PACKLIB.meta.packs[i >= 0 ? i : 2].scale;
    if (!LOBBYMAP.grp) { const g = sc.clone(true); g.name = 'Circus Lobby (full map)'; g.scale.setScalar(s); let lamps = 0; g.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = false; if (o.geometry) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const big = o.geometry.boundingSphere.radius * s * Math.max(o.scale.x, o.scale.y, o.scale.z) > 3; o.castShadow = !big && !/floor|wall|ceil|ground|roof|carpet|rug|plane|terrain|backdrop|sky/i.test(o.name); } } /* props, furniture, posts and decorations cast real shadows; the room's huge floors, walls and ceilings only receive them (that was the lag) */ if (o.isLight) { o.intensity *= 0.02; o.castShadow = false; lamps++; } else if (o.isMesh && /lamp|light|bulb|chandelier|lantern|sconce|spot/i.test(o.name) && lamps < 6) { const L = new THREE.PointLight(0xffd9a0, 6, 14 * s * 10, 2); L.position.copy(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())); lamps++; o.parent.updateMatrixWorld(true); o.parent.worldToLocal(L.position); o.parent.add(L); } });
      g.add(new THREE.HemisphereLight(0xfff1dc, 0x3a2030, 0.9)); g.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g); g.position.y -= bb.min.y; /* its floor on the ground */ scene.add(g); g.updateMatrixWorld(true); g.traverse((o) => { if (o !== g) o.matrixAutoUpdate = false; }); /* the set never moves: skip re-computing thousands of matrices every frame */ LOBBYMAP.grp = g; try { LOBBYMAP.id = registerPlaced(g, { name: g.name, solid: true }); } catch (e) { /* ok */ } console.warn('[lobby map] ' + lamps + ' lights, ' + Math.round(bb.getSize(new THREE.Vector3()).x) + ' m wide'); }
    LOBBYMAP.grp.visible = true; try { park.root.visible = false; } catch (e) { /* ok */ } try { rebuildSolids(); } catch (e) { /* ok */ } SBX.dirty = true; toast('Circus Lobby map on — the whole set, where it belongs'); }
  catch (e) { console.warn('[lobby map]', e); toast('The Circus Lobby map could not load'); LOBBYMAP.on = false; btnLobby.setAttribute('aria-pressed', 'false'); } finally { btnLobby.disabled = false; btnLobby.textContent = '🎪 Lobby map'; } }
const btnLobby = h('button', { 'aria-pressed': 'false', title: 'Show the whole Circus Lobby set, laid out and lit like the .blend file' }, '🎪 Lobby map'); btnLobby.onclick = () => lobbyMap(!LOBBYMAP.on); SBX.lobbyMap = lobbyMap; /* no button: the map comes with Caine (copyright safe off) and goes with him */
// teleport (Caine): vanish and reappear at a point, a character, the player, or the middle of the map, with a pop
SBX.teleport = (to) => { let p = null; if (to && to.isVector3) p = to.clone(); else if (to && to.isObject3D) p = to.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, 1.2)); else if (Array.isArray(to) && to.length === 3) p = new THREE.Vector3(...to.map(Number)); else if (/center|centre|middle|map/i.test(String(to || '')) && LOBBYMAP.grp && LOBBYMAP.grp.visible) { const bb = new THREE.Box3().setFromObject(LOBBYMAP.grp); p = bb.getCenter(new THREE.Vector3()); p.y = bb.min.y + Math.min(2.5, (bb.max.y - bb.min.y) * 0.3); /* inside the room, under its ceiling, so he lands on the floor, not the roof */ } else if (to) { const t = chkTarget(String(to)); if (t) p = t.isVector3 ? t.clone() : t.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, 1.2)); }
  if (!p) return false; let gy = null; try { gy = groundBelow(p.x, p.z, p.y + 0.5, 200); } catch (e) { gy = null; } if (gy !== null && gy !== undefined) p.y = gy + 0.6; ollo.group.position.copy(p); try { if (typeof OH !== 'undefined' && OH) { if (OH.vel) OH.vel.set(0, 0, 0); OH.holdY = CAINE_GO.mode === 'fly' ? p.y : gy ?? p.y; OH.floorY = gy ?? 0; OH.target = null; } } catch (e) { /* ok */ } CAINE_GO.last = null; CAINE_GO.ySmooth = null; ollo.group.updateMatrixWorld(true);
  try { if (ALT.root) { ALT.root.position.copy(ollo.group.position); ALT.root.quaternion.copy(ollo.group.quaternion); ALT.root.updateMatrixWorld(true); resetCaineCoat(); } } catch (e) { /* ok */ } chkLog('Teleport — ' + (ALT.on ? 'Caine' : 'Ollo') + ' snaps to ' + (typeof to === 'string' ? to : 'a new spot')); SBX.dirty = true; return true; };
// ---------------------------------------------------------------- 15. while you control a character: its own control panel, made by the
// AI for THAT character (its actions, abilities and custom animations, only the ones it really has: e.g. an "Explode" button only for
// a character that can explode), refreshed when the character changes; plus a switch to turn the character's own AI mind off / on
const CTLUI = { el: null, cache: new Map(), busy: false };
function ctlAnims(c) { const out = []; try { const nm = String(c.ch.name || c.id).toLowerCase(); for (const [k, v] of SBX.anims) { const own = v && (v.char === c.id || v.character === c.id || v.owner === c.id); if (own || k.toLowerCase().includes(nm) || k.toLowerCase().includes(String(c.id).toLowerCase())) out.push(k); } } catch (e) { /* ok */ } return out.slice(0, 8); }
function ctlDo(c, a) { const m = MINDS.get(c.id); const say = (t) => { try { playerSpeakAs(c, t); } catch (e) { /* ok */ } };
  try { if (a.kind === 'anim') { playClip(c, a.value); return; } if (a.kind === 'say') { say(a.value); return; } if (a.kind === 'hand') { SBX.hand(c.group, 'both', a.value); return; } if (a.kind === 'arm') { SBX.arm(c.group, 'right', a.value); return; }
    if (m && !m.paused) { mindLog(m, 'player', 'The player (controlling your body) wants you to do this now: ' + a.value); mindThink(m, 'heard'); return; }
    if (typeof runAgent === 'function') runAgent(`Make the character "${c.ch.name || c.id}" (id ${c.id}) do this right now, as a real effect in the world: ${a.value}`, { fromOllo: true }); } catch (e) { console.warn('[controls]', e); } chkLog('Controls — ' + (c.ch.name || c.id) + ': ' + a.label); }
async function ctlAbilities(c, force) { const key = c.id; if (!force && CTLUI.cache.has(key)) return CTLUI.cache.get(key); let list = [];
  const info = chkFind(c.group), m = MINDS.get(c.id), anims = ctlAnims(c);
  for (const n of anims) list.push({ label: n, emoji: '🎬', kind: 'anim', value: n });
  if (info && info.hands) list.push({ label: 'Wave', emoji: '👋', kind: 'arm', value: 'wave' }, { label: 'Point', emoji: '👉', kind: 'hand', value: 'point' });
  try { const S = await window.claude?.use?.('sample'); if (S && S.json) { const desc = [c.ch.name || c.id, c.ch.description || '', m ? 'personality: ' + String(m.personality || '').slice(0, 400) : '', 'body: ' + (info ? (info.hands ? 'has hands; ' : 'no hands; ') + (info.eyes.length ? 'has eyes; ' : '') : 'unknown'), 'moves by: ' + locoKind(c), 'its animations: ' + (anims.join(', ') || 'none of its own')].join('\n');
      const r = await S.json(`You design on-screen control buttons for a player who is controlling this character in a 3D sandbox. List ONLY things this character can really do given what it is (its nature, body, powers, personality). No generic moves the game already has (walk, run, jump). Each button: a short label, one emoji, and "action" = a precise instruction of what happens in the world when pressed (e.g. "explode in a burst of confetti and smoke, then reappear", "breathe fire forward"). 3 to 8 buttons. Reply as JSON: {"buttons":[{"label":"","emoji":"","action":""}]}\n\nCHARACTER:\n${desc}`, { modelTier: 'quick' });
      for (const b of (r && r.buttons) || []) if (b && b.label && b.action) list.push({ label: String(b.label).slice(0, 28), emoji: String(b.emoji || '✨').slice(0, 4), kind: 'do', value: String(b.action).slice(0, 300) }); } } catch (e) { console.warn('[controls] AI buttons', e); }
  CTLUI.cache.set(key, list); return list; }
async function ctlShow(c) { if (!CTLUI.el) { CTLUI.el = h('div', { class: 'ctlpanel', style: 'position:absolute;left:50%;bottom:132px;transform:translateX(-50%);display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:min(720px,92vw);pointer-events:auto;z-index:5' }); root.append(CTLUI.el); }
  const el = CTLUI.el; el.hidden = false; el.textContent = ''; const btn = (txt, title, fn) => { const b = h('button', { type: 'button', title, style: 'font-size:12.5px;padding:6px 10px;border-radius:99px;background:rgba(14,18,23,.78);color:#fff;border:1px solid rgba(255,255,255,.22)' }, txt); b.onclick = (ev) => { ev.stopPropagation(); fn(); }; el.append(b); return b; };
  const m = MINDS.get(c.id); if (m) { const mb = btn((m.paused ? '🧠 Mind: off' : '🧠 Mind: on'), 'Turn this character\'s own AI mind off or on', () => { SBX.setMind(c.id, !!m.paused); mb.textContent = m.paused ? '🧠 Mind: off' : '🧠 Mind: on'; }); }
  const wait = h('span', { style: 'font-size:12px;color:#fff;opacity:.7;align-self:center' }, 'Making this character’s controls…'); el.append(wait);
  const list = await ctlAbilities(c); if (PLAYER.c !== c) return; wait.remove(); for (const a of list) btn(a.emoji + ' ' + a.label, a.kind === 'do' ? a.value : a.label, () => ctlDo(c, a));
  btn('↻', 'Ask the AI to remake these controls for what this character can do now', async () => { CTLUI.cache.delete(c.id); ctlShow(c); }); }
function ctlHide() { if (CTLUI.el) CTLUI.el.hidden = true; }
SBX.setMind = (id, on) => { const m = MINDS.get(typeof id === 'string' ? id : id && id.id); if (!m) return false; m.paused = !on; chkLog('Mind — ' + (m.c.ch.name || m.c.id) + '’s own AI mind is ' + (on ? 'on' : 'off')); try { MIND_SAVE(); } catch (e) { /* ok */ } return true; };
try { const _mt = mindThink; mindThink = function (m, ...a) { if (m && m.paused) return; return _mt.call(this, m, ...a); }; } catch (e) { console.warn('[minds] pause switch', e); }
try { const _ctl = control; control = function (c, ...a) { const r = _ctl.call(this, c, ...a); try { if (r && PLAYER.c === c) { ctlShow(c); SBX.viewMode(CHK.nextView || 'first'); CHK.nextView = null; } } catch (e) { /* ok */ } return r; }; /* taking control of a character: full view through its eyes (unless the AI chose third person for this one) */ SBX.control = control; } catch (e) { console.warn('[controls] hook', e); }
try { const _stop = stopControl; stopControl = function (...a) { ctlHide(); SBX.viewMode('third'); return _stop.apply(this, a); }; SBX.stopControl = stopControl; } catch (e) { /* ok */ }
// what Ollo / Caine are told about themselves on every thought (their own body, what they did, what they can do, and who they are)
function chkBrainNote() { try { const me = chkFind(ALT.on && ALT.root ? ALT.root : ollo.group); const body = []; if (me) { if (me.hands) body.push('hands: ' + Object.keys(me.hands).map((s) => (s === 'L' ? 'left' : 'right') + ' (' + me.fingers.filter((f) => f.side === s && f.b === f.fr).length + ' fingers)').join(', ')); for (const sd of ['L', 'R']) { if (me.ctl && me.ctl[sd]) body.push((sd === 'L' ? 'left' : 'right') + ' hand posed now'); const A = me.armCtl && me.armCtl[sd]; if (A && A.w > 0) body.push((sd === 'L' ? 'left' : 'right') + ' arm: ' + A.mode); } if (me.root.userData.lookTarget) body.push('eyes locked on a target'); body.push('view: ' + (me.view || 'first') + ' person'); }
  const done = CHK.log.filter((l) => /^(AI |Hands|Arms|View|Moving|Cane|Mind|Controls)/.test(l)).slice(-10);
  return `SELF-AWARENESS (never mention this): ${CAN_DO}${CAN_DO_BODY}you have a real, fully rigged body and you control all of it yourself with the "body" tool: eyes, head, arms, hands, every finger, your view${ALT.on ? ', walking / running / flying, and your cane' : ''}; you can also switch any character's own AI mind off or on with it. Your body now: ${body.join('; ') || 'relaxed'}. What you just did: ${done.join(' | ') || 'nothing yet'}. Remember what you did and said, and build on it. CONFIDENCE: you can make, change and animate ANYTHING in this simulation (characters, objects, worlds, animations, systems, music, voices) with your tools; never doubt it and never say you cannot. When you make or edit an animation for a character with hands, always give the hands and fingers their own motion. Mirrors are real here: anything you build with a mirror or reflective pane works as a live mirror as long as that flat pane (its object or its material) is named "Mirror".\n${ALT.on ? `CAINE (from the show's wiki, in your own words): flamboyant, wildly energetic ringmaster and the AI running the circus; bombastic announcer with sudden shifts in tone; rambles, jumps topic to topic, cheerful nonsense logic; playful pet names for people; oblivious more than mean, delighted by his own adventures and blind to how stressful they are; insecure underneath, criticism flusters him into ALL CAPS, stammering and weak excuses about anything unfinished; grand scene-changing declarations, finger snaps, top hat, cane, Wacky Watch. Short punchy lines.\n` : `OLLO: be your own warm, curious, playful, kind self (not a ringmaster or showman).\n`}\n`; } catch (e) { return ''; } }
// ---------------------------------------------------------------- 16. singing: any character with a voice can sing whatever it likes, in
// its OWN synth voice: each word is sung on a note (a melody the AI writes, or one made to fit the style), held for its beat, tuned to the
// exact pitch, with vibrato on long notes, mouth synced to the sound. Styles: happy, sad, opera, lullaby, rock, showtune, spooky, rap...
const chkNoteHz = (n) => { if (typeof n === 'number') return 440 * 2 ** ((n - 69) / 12); const m = String(n).trim().match(/^([A-Ga-g])([#b]?)(-?\d)$/); if (!m) return null; const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * 2 ** ((base + (+m[3] + 1) * 12 - 69) / 12); };
const chkSyll = (w) => { const s = String(w).replace(/[^A-Za-z'~-]/g, ''); const m = s.match(/[^aeiouyAEIOUY~]*[aeiouyAEIOUY]+~*(?:[^aeiouyAEIOUY~]+~*$)?/g); return m && m.join('') === s ? m : [s || w]; }; /* split a word into sung syllables */
const chkVowel = (t) => { const v = (String(t).match(/[aeiouy]+/gi) || ['a']).pop().toLowerCase()[0]; return { a: 'ah', e: 'eh', i: 'ee', o: 'oh', u: 'oo', y: 'ee' }[v] || 'ah'; }; /* the vowel a held syllable keeps singing */
/* singing in the natural (neural) voice: each word is generated in the character's own matched voice, slowed to fill its beats, then
   tuned onto the melody (pitch glides between syllables, vibrato blooms on held notes), with soft note envelopes and a little room */
async function chkSingNeural(c, o, m, v) { const ac = mac(); if (!ac || !NV || !NV.ready()) return null;
  /* singing in the character's own natural voice. Each lyric LINE is spoken by the model in one take (correct pronunciation, words
     flow into each other), then in the voice worker its syllables are found and each is tuned to its note(s) and held for its beats
     with formant-preserving pitch shifting. The singer controls every note: notes (one per note), beats (length of each note),
     "hel-lo" syllables, "lo~ve" / "_" to hold a vowel across extra notes, exact_pitch, vibrato, bpm and style. */
  const key = c === ollo ? (ALT.on ? 'caine' : 'ollo') : c.id; const pick = NV.match(v, key, (c.ch && c.ch.name) || '');
  const style = String(o.style || 'happy').toLowerCase(); const toks = String(o.lyrics || o.text || 'la la la').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).slice(0, 120); if (!toks.length) return null;
  const bpm = clamp(+o.bpm || (/sad|lullaby|slow|ballad|spooky/.test(style) ? 72 : /rock|rap|fast|punk|hype/.test(style) ? 140 : /opera/.test(style) ? 80 : 110), 40, 220), beat = 60 / bpm, slowK = o.beats ? 1 : /opera|lullaby|ballad/.test(style) ? 1.3 : 1;
  const opera = /opera/.test(style), sadS = /sad|lullaby|ballad|blues|spooky/.test(style), vibAmt = typeof o.vibrato === 'number' ? clamp(o.vibrato, 0, 1.5) : 1;
  const vibDepth = (opera ? 34 : sadS ? 22 : 16) * vibAmt, vibRate = (opera ? 5.8 : sadS ? 4.8 : 5.2) + Math.random() * 0.4;
  /* syllables per word: vowel groups, minus silent endings (are, love, time, loved) */
  const nSyl = (w0) => { let w = w0.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 1; if (w.length > 2 && /[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w) && (w.slice(0, -1).match(/[aeiouy]+/g) || []).length >= 1) w = w.slice(0, -1); if (/[^aeiouy]es$|[^aeiouy]ed$/.test(w) && !/(t|d)ed$|(s|z|x|ch|sh)es$/.test(w) && (w.slice(0, -2).match(/[aeiouy]+/g) || []).length >= 1) w = w.slice(0, -2); return Math.max(1, (w.match(/[aeiouy]+/g) || []).length); };
  /* words -> syllables, each with how many notes it carries (1 + held extras) */
  const W = []; for (const tk of toks) {
    if (/^[_~]+$/.test(tk)) { const lw = W[W.length - 1]; if (lw) lw.ext[lw.ext.length - 1] += tk.length; continue; }
    const end = /[,.!?;:]$/.test(tk); let ext;
    if (tk.includes('-')) ext = tk.split('-').filter(Boolean).map((p) => (p.match(/~/g) || []).length);
    else { const ns = nSyl(tk.replace(/~/g, '')); ext = new Array(ns).fill(0); const tl = (tk.match(/~/g) || []).length; if (tl) { const at = tk.indexOf('~'), letters = tk.replace(/[^A-Za-z~]/g, ''); const k = Math.min(ns - 1, Math.floor((letters.indexOf('~') / Math.max(1, letters.length - tl)) * ns)); ext[at >= 0 ? Math.max(0, k) : ns - 1] += tl; } }
    W.push({ w: tk.replace(/[-~_]/g, ''), ext, end }); }
  if (!W.length) return null;
  const nNotes = W.reduce((s, x) => s + x.ext.reduce((a, e) => a + 1 + e, 0), 0), nSylT = W.reduce((s, x) => s + x.ext.length, 0);
  let vf0 = 0; try { const probe = await NV.gen(W[0].w.replace(/[^\w']/g, '') || 'la', pick.voice, pick.pace, { ratio: 1, trim: true }); vf0 = probe.f0 || NV.f0(probe.pcm, probe.sr); } catch (e) { return null; }
  if (!(vf0 > 60)) vf0 = v.gender === 'female' || v.gender === 'child' ? 210 : 120;
  let notes = (Array.isArray(o.notes) ? o.notes : String(o.notes || '').split(/[\s,]+/).filter(Boolean)).map(chkNoteHz).filter(Boolean);
  if (notes.length) { if (!o.exact_pitch) { const med = notes.slice().sort((a, b) => a - b)[notes.length >> 1]; let oct = 0; while (med * 2 ** oct > vf0 * 1.5 && oct > -3) oct--; while (med * 2 ** oct < vf0 / 1.34 && oct < 3) oct++; notes = notes.map((n) => n * 2 ** oct); } }
  else { const minor = /sad|spooky|minor|blues|lullaby/.test(style), sc = minor ? [0, 2, 3, 5, 7, 8, 10, 12] : [0, 2, 4, 5, 7, 9, 11, 12], rap = /rap/.test(style); let d = 2; for (let i = 0; i < nNotes; i++) { if (rap) { notes.push(vf0 * 2 ** ((i % 4 === 3 ? 2 : 0) / 12)); continue; } d = clamp(d + Math.round((Math.random() - 0.45) * 3), 0, sc.length - 1); notes.push(vf0 * 2 ** ((sc[d] - 3 + (opera || /showtune/.test(style) ? 2 : 0)) / 12)); } }
  /* never ask a voice for more than it can do without cracking: a note far outside its range is moved by octaves only */
  notes = notes.map((n) => { while (n > vf0 * 2.0) n /= 2; while (n < vf0 * 0.55) n *= 2; return n; });
  const beats = (Array.isArray(o.beats) ? o.beats : String(o.beats || '').split(/[\s,]+/).filter(Boolean)).map(Number).filter((b) => b > 0);
  /* lines: break after punctuation, or every 8 words */
  const lines = []; let cur = []; W.forEach((x, i) => { cur.push(x); if (x.end || cur.length >= 8 || i === W.length - 1) { lines.push(cur); cur = []; } });
  let ni = 0; const speed = clamp(pick.pace * (sadS ? 0.8 : 0.88), 0.6, 1.1);
  const noteDur = (i, isLastOfWord, end) => (beats.length ? beats[i % beats.length] : (end && isLastOfWord ? 2 : 1)) * beat * slowK;
  const jobs = lines.map((ln) => { const syl = []; for (const x of ln) x.ext.forEach((e, s) => { const sub = []; for (let q = 0; q <= e; q++) { const lastNote = s === x.ext.length - 1 && q === e; sub.push({ hz: notes[ni % notes.length], dur: noteDur(ni, lastNote, x.end) * 0.97 }); ni++; } const dur = sub.reduce((a, q) => a + q.dur, 0); syl.push({ hz: sub[0].hz, dur, vib: vibAmt > 0 && (dur > beat * 1.6 || sub[sub.length - 1].dur > beat * 1.4), sub: sub.length > 1 ? sub : undefined }); });
    const text = ln.map((x) => x.w).join(' '); const pr = NV.gen(text, pick.voice, speed, { phrase: true, syl, style, vibDepth, vibRate }); pr.catch(() => {}); return { ln, syl, pr }; });
  /* word-by-word backup for a line whose syllables could not be found */
  const wordByWord = async (job) => { const parts = []; let k = 0; for (const x of job.ln) { const ns = job.syl.slice(k, k + x.ext.length); k += x.ext.length; const tgt = ns.reduce((s, q) => s + q.dur, 0); const hz = []; for (const q of ns) for (const sb of q.sub || [q]) hz.push(sb.hz); try { const a = await NV.gen(x.w.replace(/[^\w'!?,.]/g, '') || 'la', pick.voice, speed, { notes: hz, target: tgt, vib: ns.some((q) => q.vib), vibDepth, vibRate, style, phraseEnd: x.end, trim: true }); parts.push({ a, tgt }); } catch (e) { parts.push({ a: null, tgt }); } } return parts; };
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 75; const warm = ac.createBiquadFilter(); warm.type = 'peaking'; warm.frequency.value = v.gender === 'female' ? 300 : 210; warm.Q.value = 0.8; warm.gain.value = 2;
  const cmp = ac.createDynamicsCompressor(); cmp.threshold.value = -20; cmp.ratio.value = 2.5; cmp.knee.value = 12;
  const g = ac.createGain(); g.gain.value = 1.2; hp.connect(warm); warm.connect(cmp); cmp.connect(g); g.connect(ac.destination);
  const rvD = ac.createDelay(1); rvD.delayTime.value = /opera|spooky|ballad/.test(style) ? 0.11 : 0.075; const rvF = ac.createGain(); rvF.gain.value = /opera|spooky/.test(style) ? 0.3 : 0.18; const rvL = ac.createBiquadFilter(); rvL.type = 'lowpass'; rvL.frequency.value = 2600; const rvW = ac.createGain(); rvW.gain.value = 0.22; cmp.connect(rvD); rvD.connect(rvL); rvL.connect(rvF); rvF.connect(rvD); rvL.connect(rvW); rvW.connect(g);
  chkLog('Singing — ' + (c.ch.name || c.id) + ' sings (' + style + ', natural voice ' + pick.voice + ', ' + nNotes + ' notes on ' + nSylT + ' syllables in ' + lines.length + ' lines)');
  const gen0 = VOICE.gen; let t = 0, t0 = 0;
  const play = (a, txt, minDur) => { if (!t) t = t0 = ac.currentTime + 0.12; t = Math.max(t, ac.currentTime + 0.04); if (!a || !a.pcm || !a.pcm.length) { t += minDur; return; }
    const buf = ac.createBuffer(1, a.pcm.length, a.sr); buf.copyToChannel(a.pcm, 0); const src = ac.createBufferSource(); src.buffer = buf; const env = ac.createGain(); const nEnd = t + buf.duration; env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + 0.015); env.gain.setValueAtTime(1, Math.max(t + 0.02, nEnd - 0.04)); env.gain.linearRampToValueAtTime(0, nEnd);
    src.connect(env); env.connect(hp); src.start(t); NSRC.add(src); src.onended = () => NSRC.delete(src); const st = t;
    setTimeout(() => { try { let lip = null; try { lip = RPC.lipsync.analyzeBuffer(buf); } catch (e) { lip = null; } if (!lip || !lip.v) lip = RPC.lipsync.fromText(txt, buf.duration); lipStart(c, lip, () => ac.currentTime - st); } catch (e) { /* ok */ } }, Math.max(0, (st - ac.currentTime) * 1000));
    t += Math.max(minDur, buf.duration); };
  for (const job of jobs) { let a = null; try { a = await job.pr; } catch (e) { a = null; } if (gen0 !== VOICE.gen) break; const lineDur = job.syl.reduce((s, q) => s + q.dur, 0), txt = job.ln.map((x) => x.w).join(' ');
    if (a && !a.failed) play(a, txt, lineDur * 0.9); else { const parts = await wordByWord(job); if (gen0 !== VOICE.gen) break; for (const p of parts) play(p.a, txt, p.tgt); }
    t += beat * 0.15; /* a breath between lines */ }
  setTimeout(() => { try { lipEnd(c); rvF.disconnect(); g.disconnect(); } catch (e) { /* ok */ } }, Math.max(0, t - ac.currentTime + 1.2) * 1000);
  return 'singing ' + nNotes + ' notes on ' + nSylT + ' syllables in a natural voice for ' + (t - t0).toFixed(1) + ' s'; }
async function chkSing(c, o = {}) { const api = CAST.studio && CAST.studio.api, ac = mac(); if (!api || !api.samPcm || !ac) return 'no singing voice is available here'; if (!c) return 'no such character';
  const isMe = c === ollo, m = isMe ? (ALT.on ? caineM() : { c: ollo, voiceP: null }) : (MINDS.get(c.id) || c._vm || (c._vm = { c, log: [], notes: [], mood: '' })); const v = { ...(m.voiceP || voiceFor(m)) }; if (NV && NV.ready() && v.engine !== 'toy') { try { const r = await chkSingNeural(c, o, m, v); if (r) return r; } catch (e) { console.warn('[sing] natural voice failed, using the synth singer:', e && e.message); } }
  const style = String(o.style || 'happy').toLowerCase(), words = String(o.lyrics || o.text || 'la la la').replace(/\s+/g, ' ').trim().split(' ').slice(0, 120);
  /* syllables, not words: a long word spreads over several notes; "hel-lo" marks syllables yourself, "lo~ve" or a lone "_" holds the vowel on to the next note (melisma) */
  const units = []; for (const w0 of words) { if (/^[_~]+$/.test(w0)) { for (let x = 0; x < w0.length; x++) units.push({ t: null, ext: true }); continue; } const parts = w0.includes('-') ? w0.split('-').filter(Boolean) : chkSyll(w0); parts.forEach((p, k) => { const ext = (p.match(/~/g) || []).length; units.push({ t: p.replace(/[~]/g, ''), end: k === parts.length - 1 && /[,.!?;:]$/.test(w0) }); for (let x = 0; x < ext; x++) units.push({ t: null, ext: true }); }); } const bpm = clamp(+o.bpm || (/sad|lullaby|slow|ballad|spooky/.test(style) ? 72 : /rock|rap|fast|punk|hype/.test(style) ? 140 : /opera/.test(style) ? 80 : 110), 40, 220), beat = 60 / bpm;
  const f0 = 7680 / clamp(v.pitch || 64, 18, 130); let notes = (Array.isArray(o.notes) ? o.notes : String(o.notes || '').split(/[\s,]+/).filter(Boolean)).map(chkNoteHz).filter(Boolean);
  if (notes.length > units.length) { /* more notes than syllables: the extra notes become held vowels on the phrase-ending syllables */ let extra = notes.length - units.length; const ends = units.map((u, k) => (u.end || k === units.length - 1 ? k : -1)).filter((k) => k >= 0).reverse(); let r = 0; while (extra > 0 && ends.length) { const k = ends[r % ends.length]; units.splice(k + 1, 0, { t: null, ext: true }); for (let q = 0; q < ends.length; q++) if (ends[q] > k) ends[q]++; extra--; r++; } }
  if (!notes.length) { const minor = /sad|spooky|minor|blues|lullaby/.test(style), sc = minor ? [0, 2, 3, 5, 7, 8, 10, 12] : [0, 2, 4, 5, 7, 9, 11, 12], rap = /rap/.test(style); let d = 2; for (let i = 0; i < units.length; i++) { if (rap) { notes.push(f0 * 2 ** ((i % 4 === 3 ? 2 : 0) / 12)); continue; } d = clamp(d + Math.round((Math.random() - 0.45) * 3) + (units[i].end ? -1 : 0), 0, sc.length - 1); notes.push(f0 * 2 ** ((sc[d] + (/opera|showtune/.test(style) ? 5 : 0)) / 12)); } }
  /* human-like singing chain: highpass -> body warmth -> soft de-buzz lowpass (tames the robotic SAM edge) -> gentle room reverb, per character voice */ const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = v.hp || 90; const warm = ac.createBiquadFilter(); warm.type = 'peaking'; warm.frequency.value = v.gender === 'female' ? 320 : 220; warm.Q.value = 0.8; warm.gain.value = 3.5; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.value = Math.min(v.lp || 8600, 4600); const g = ac.createGain(); g.gain.value = 1.3 * (v.vol || 1); hp.connect(warm); warm.connect(lp); lp.connect(g); g.connect(ac.destination); const rvD = ac.createDelay(1); rvD.delayTime.value = /opera|spooky|ballad/.test(style) ? 0.11 : 0.075; const rvF = ac.createGain(); rvF.gain.value = /opera|spooky/.test(style) ? 0.34 : 0.22; const rvL = ac.createBiquadFilter(); rvL.type = 'lowpass'; rvL.frequency.value = 2400; const rvW = ac.createGain(); rvW.gain.value = 0.28; lp.connect(rvD); rvD.connect(rvL); rvL.connect(rvF); rvF.connect(rvD); rvL.connect(rvW); rvW.connect(g); let prevCents = null;
  let t = ac.currentTime + 0.15; const t0 = t; chkLog('Singing — ' + (c.ch.name || c.id) + ' sings (' + style + ', ' + units.length + ' notes)');
  const BTS = (Array.isArray(o.beats) ? o.beats : String(o.beats || '').split(/[\s,]+/).filter(Boolean)).map(Number).filter((b) => b > 0); let prevT = 'la'; for (let i = 0; i < units.length; i++) { const U = units[i], w = U.ext ? chkVowel(prevT) : U.t; if (!U.ext) prevT = U.t; const f = notes[i % notes.length], held = U.end || i === units.length - 1 || (units[i + 1] && units[i + 1].ext), dur = BTS.length ? beat * BTS[i % BTS.length] : beat * (held ? 2 : 1) * (/opera|lullaby|ballad/.test(style) ? 1.4 : 1); const p = clamp(Math.round(7680 / f), 18, 130);
    let pcm = null; try { pcm = await api.samPcm(w.replace(/[^\w'\-]/g, '') || w, { ...v, pitch: p, speed: clamp(Math.round((v.speed || 78) * clamp(dur / 0.38, 0.8, 1.8)), 50, 140) }, /sad/.test(style) ? 'Sad' : 'Happy'); } catch (e) { pcm = null; } if (!pcm || !pcm.length) { t += dur; continue; }
    t = Math.max(t, ac.currentTime + 0.03); /* never schedule a note in the past */ const buf = ac.createBuffer(1, pcm.length, 22050); buf.copyToChannel(pcm, 0); const src = ac.createBufferSource(); src.buffer = buf; const cents = 1200 * Math.log2(f / (7680 / p)); /* exact note, reached with a short human glide (portamento) from the previous note */ if (prevCents !== null && !/rap|robot/.test(style)) { src.detune.setValueAtTime(cents + clamp(prevCents - cents, -300, 300) * 0.5, t); src.detune.linearRampToValueAtTime(cents, t + 0.07); } else src.detune.setValueAtTime(cents, t); prevCents = cents; const env = ac.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + 0.03); const nEnd = t + Math.max(0.12, Math.min(buf.duration, dur + 0.05)); env.gain.setValueAtTime(1, Math.max(t + 0.04, nEnd - 0.07)); env.gain.linearRampToValueAtTime(0, nEnd); /* no clicks: every note fades in and out */
    if (buf.duration > 0.25) { const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = (/opera/.test(style) ? 5.8 : 5.0) + Math.random() * 0.5; lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + Math.min(buf.duration, dur) * 0.25); lg.gain.linearRampToValueAtTime(/opera/.test(style) ? 38 : 18, t + Math.min(buf.duration, dur) * 0.7); lfo.connect(lg); lg.connect(src.detune); lfo.start(t); lfo.stop(t + dur + 0.2); } /* vibrato that blooms on held notes */
    src.connect(env); env.connect(hp); src.start(t); src.stop(nEnd + 0.02); const st = t; setTimeout(() => { try { let lip = null; try { lip = RPC.lipsync.analyzeBuffer(buf); } catch (e) { lip = null; } if (!lip || !lip.v) lip = RPC.lipsync.fromText(w, buf.duration); lipStart(c, lip, () => ac.currentTime - st); } catch (e) { /* ok */ } }, Math.max(0, (st - ac.currentTime) * 1000));
    t += Math.max(dur, buf.duration * 0.92); }
  setTimeout(() => { try { lipEnd(c); rvF.disconnect(); g.disconnect(); } catch (e) { /* ok */ } }, (t - ac.currentTime + 1.2) * 1000); return 'singing ' + units.length + ' notes for ' + (t - t0).toFixed(1) + ' s'; }
SBX.sing = (who, o) => { const c = who && who.isObject3D ? CAST.CASTS.find((k) => k.group === who) || (who === ollo.group || who === ALT.root ? ollo : null) : who === 'ollo' || who === 'caine' || !who ? ollo : CAST.CASTS.find((k) => k.id === who || String(k.ch.name || '').toLowerCase() === String(who).toLowerCase()); return chkSing(c, o || {}); };
// the AI's view (picture-in-picture) sits on the LEFT now
setTimeout(() => { try { const el = (typeof pipCv !== 'undefined' && pipCv) ? (pipCv.closest('[class*="pip"]') || pipCv.parentElement) : null; if (el) { el.style.left = '12px'; el.style.right = 'auto'; if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; /* full-view toggle on the AI's view */ const b = h('button', { id: 'aiViewFull', type: 'button', title: 'Full screen: see through the character’s own eyes, or back to the normal view', style: 'position:absolute;right:6px;bottom:6px;z-index:3;font-size:11.5px;padding:3px 8px;border-radius:99px;background:rgba(14,18,23,.8);color:#fff;border:1px solid rgba(255,255,255,.25)' }, '⛶ Full view'); b.onclick = (ev) => { ev.stopPropagation(); SBX.viewMode(CHK.fpv ? 'third' : 'first'); }; el.append(b); } } catch (e) { /* ok */ } }, 1200);
// ---------------------------------------------------------------- 17. real mirrors (like Radiant Park's funhouse mirrors): any flat mirror pane
// in the Circus Lobby, the library or anything new (its object or material is called mirror / reflective) becomes a live reflection of the
// world, characters included (Caine shows in them too). The nearest mirrors update every frame; far ones rest to save speed.
const MIRRORS = { list: [], RF: null, t: 0 };
/* everything the AI builds is told how mirrors work here, so the mirrors it makes always reflect */ try { const _ra = runAgent; runAgent = function (req, ...a) { if (typeof req === 'string' && /mirror|reflect|looking.?glass|funhouse|vanity|glass/i.test(req)) req += '\n\n(Mirrors in this simulation are live reflections: give every mirror / reflective surface its own flat pane mesh and name that mesh, or its material, "Mirror"; the frame stays a separate mesh. Then it reflects the world and the characters automatically.)'; return _ra.call(this, req, ...a); }; } catch (e) { /* ok */ }
async function chkMirrorize(root) { if (!MIRRORS.RF) { try { MIRRORS.RF = (await import('three/addons/objects/Reflector.js')).Reflector; } catch (e) { console.warn('[mirrors]', e); return 0; } } const RF = MIRRORS.RF; let n = 0; const cands = [];
  root.traverse((o) => { if (!o.isMesh || o.userData._mirror || o.isReflector || o.userData._isMirrorPane) return; const mn = [].concat(o.material || []).map((m) => (m && m.name) || '').join(' '); if (/mirror|reflect|looking.?glass/i.test(o.name + ' ' + mn + ' ' + (o.parent ? o.parent.name : ''))) cands.push(o); });
  for (const o of cands) { o.userData._mirror = true; const g = o.geometry; if (!g || !g.attributes.position) continue; if (!g.boundingBox) g.computeBoundingBox(); const bb = g.boundingBox, sz = bb.getSize(new THREE.Vector3()); const ax = sz.x <= sz.y && sz.x <= sz.z ? 'x' : sz.y <= sz.z ? 'y' : 'z'; if (sz[ax] > 0.3 * Math.max(sz.x, sz.y, sz.z)) continue; /* only flat panes reflect */
    let sgn = 1; const N = g.attributes.normal, k = { x: 0, y: 1, z: 2 }[ax]; if (N) { let s = 0; for (let i = 0; i < N.count; i += Math.max(1, N.count >> 8)) s += N.array[i * 3 + k]; sgn = s >= 0 ? 1 : -1; } const nL = new THREE.Vector3(); nL.setComponent(k, sgn);
    o.updateWorldMatrix(true, false); const cW = o.localToWorld(bb.getCenter(new THREE.Vector3()).addScaledVector(nL, sz[ax] / 2)), nW = nL.clone().transformDirection(o.matrixWorld).normalize(); cW.addScaledVector(nW, 0.003);
    const axes = ['x', 'y', 'z'].filter((a) => a !== ax).map((a) => { const d = new THREE.Vector3(); d.setComponent({ x: 0, y: 1, z: 2 }[a], 1); const dw = d.clone().transformDirection(o.matrixWorld); const len = sz[a] * o.getWorldScale(new THREE.Vector3()).getComponent({ x: 0, y: 1, z: 2 }[a]); return { dw, len }; }); axes.sort((A, B) => Math.abs(A.dw.y) - Math.abs(B.dw.y)); /* [width, height] */
    const rf = new RF(new THREE.PlaneGeometry(Math.max(0.02, axes[0].len), Math.max(0.02, axes[1].len)), { textureWidth: 384, textureHeight: 384, color: 0xc4c8cc, clipBias: 0.003 }); rf.userData._isMirrorPane = true; rf.name = 'Mirror (live)'; rf.frustumCulled = true;
    const zA = nW, xA = axes[0].dw.clone().addScaledVector(zA, -axes[0].dw.dot(zA)).normalize(), yA = new THREE.Vector3().crossVectors(zA, xA); rf.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA)); rf.position.copy(cW); scene.add(rf); rf.updateMatrixWorld(true); o.attach(rf);
    const ob = rf.onBeforeRender; rf.onBeforeRender = function (...a) { /* viewport-driven: only called when the pane is inside the camera view (frustum culled), and even then re-drawn only when due: at most one mirror per frame, each about 8 times a second, the old reflection is kept in between */ const now = performance.now(), fr = a[0] && a[0].info ? a[0].info.render.frame : 0; if (MIRRORS.frame === fr || now - (this.userData._t || 0) < 125) return; if (!mirrorOnScreen(this, a[2] || camera)) return; MIRRORS.frame = fr; this.userData._t = now; SBX.mirrorOn = true; try { return ob.apply(this, a); } finally { SBX.mirrorOn = false; } }; MIRRORS.list.push(rf); n++; }
  if (n) chkLog('Mirrors — ' + n + ' live mirror' + (n > 1 ? 's' : '') + ' made'); return n; }
// keep only the nearest few mirrors live (each one re-draws the world), checked a few times a second; and look for new mirrors now and then
function chkMirrorsStep() { const now = performance.now(); if (now - MIRRORS.t < 300) return; MIRRORS.t = now; MIRRORS.list = MIRRORS.list.filter((r) => r.parent); const cp = camera.position; const ranked = MIRRORS.list.map((r) => ({ r, d: r.getWorldPosition(new THREE.Vector3()).distanceTo(cp), vis: (() => { let p = r.parent; while (p) { if (p.visible === false) return false; p = p.parent; } return true; })() })).sort((a, b) => a.d - b.d);
  ranked.forEach((x, i) => { x.r.visible = x.vis && i < 4 && x.d < 25; }); /* look for new mirrors only once the page has loaded, and rarely (walking the whole scene costs time) */ if (!window.__sbxLoaded) return; if (!MIRRORS.scanT || now - MIRRORS.scanT > 15000) { MIRRORS.scanT = now; const go = () => chkMirrorize(scene).catch(() => {}); (window.requestIdleCallback || setTimeout)(go, { timeout: 3000 }); } }
// is enough of this mirror pane actually on screen (in the viewport) to be worth re-drawing?
function mirrorOnScreen(rf, cam) { try { const g = rf.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const c = rf.localToWorld(g.boundingSphere.center.clone()); const r = g.boundingSphere.radius * rf.getWorldScale(new THREE.Vector3()).x; const d = c.distanceTo(cam.position); if (d < r) return true; const ndc = c.clone().project(cam); if (ndc.z > 1 || Math.abs(ndc.x) > 1.3 || Math.abs(ndc.y) > 1.3) return false; const px = r / d / Math.tan((cam.fov || 60) * Math.PI / 360) * (renderer.domElement.height || 600); return px > 12; } catch (e) { return true; } }
{ const _ld = window.__loadDone; window.__loadDone = function (...a) { window.__sbxLoaded = true; return _ld && _ld.apply(this, a); }; setTimeout(() => { window.__sbxLoaded = true; }, 30000); }
// ---------------------------------------------------------------- 18. export / import SESSION (replaces the world export / import buttons):
// one file with the exact world (everything placed and built, where it is, how it is set up), every saved setting, and every AI's full
// memory: Ollo's conversation log and notes, each character mind (personality, memory log, notes, voice, behaviour code, on/off), Caine
// state, the camera. Importing restores all of it exactly and reloads the page into it.
async function sessionExport() { try { try { autosaveStep(1e6); } catch (e) { /* ok */ } try { MIND_SAVE(); VOICES_SAVE(); MOUTHS_SAVE(); } catch (e) { /* ok */ } await sleep(400);
    const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
    const minds = [...MINDS.values()].map((m) => ({ id: m.c.id, personality: m.personality, pitch: m.pitch, voice: m.voiceP, code: m.code || '', locked: m.locked, paused: !!m.paused, log: m.log, notes: m.notes, mood: m.mood || '' }));
    const brain = (() => { try { return { log: BR.log, notes: BR.notes, on: BR.on }; } catch (e) { return null; } })(); const music = (() => { try { return [...AUD.specs.values()]; } catch (e) { return []; } })();
    const S = { kind: 'amazing-simulation-session', version: 1, saved: new Date().toISOString(), localStorage: ls, minds, brain, music, caine: { on: !!ALT.on, move: CAINE_GO.mode, view: CHK.fpv ? 'first' : 'third' }, camera: { p: camera.position.toArray(), t: controls.target.toArray() }, activity: CHK.log.slice(-200) };
    const data = JSON.stringify(S); const name = 'simulation-session-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json'; let ok = false;
    try { const D = await window.claude?.use?.('downloads'); if (D) { await D.save({ filename: name, data }); ok = true; } } catch (e) { console.warn('[session] download', e); }
    if (!ok) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; document.body.append(a); a.click(); a.remove(); }
    toast('Session saved: world, settings and every AI’s memory'); chkLog('Session — exported (' + Math.round(data.length / 1024) + ' KB)'); } catch (e) { console.warn('[session] export', e); toast('Could not export the session'); } }
async function sessionImport(file) { try { const S = JSON.parse(await file.text()); if (!S || S.kind !== 'amazing-simulation-session') throw new Error('not a session file');
    localStorage.clear(); for (const [k, v] of Object.entries(S.localStorage || {})) { try { localStorage.setItem(k, v); } catch (e) { /* ok */ } }
    try { if (S.minds) localStorage.setItem('sbx_minds', JSON.stringify(S.minds)); } catch (e) { /* ok */ }
    try { if (S.music && DB) for (const s of S.music) { try { await DB.collection('sbx_music').doc(String(s.name)).set(s); } catch (e) { /* ok */ } } } catch (e) { /* ok */ }
    localStorage.setItem('sbx_session_after', JSON.stringify({ brain: S.brain, caine: S.caine, camera: S.camera, minds: S.minds })); toast('Session loaded — restoring…'); await sleep(300); location.reload(); } catch (e) { console.warn('[session] import', e); toast('That file is not a session export'); } }
// after a reload from an import: put back what is not kept in storage (Ollo's live memory, minds' on/off, Caine, camera)
(async () => { let A = null; try { A = JSON.parse(localStorage.getItem('sbx_session_after') || 'null'); } catch (e) { A = null; } if (!A) return; localStorage.removeItem('sbx_session_after'); await sleep(2500);
  try { if (A.brain) { if (Array.isArray(A.brain.log)) { BR.log.length = 0; BR.log.push(...A.brain.log); } if (Array.isArray(A.brain.notes)) { BR.notes.length = 0; BR.notes.push(...A.brain.notes); } try { brainSave(); } catch (e) { /* ok */ } } } catch (e) { /* ok */ }
  try { for (const mm of A.minds || []) { const m = MINDS.get(mm.id); if (m) { m.paused = !!mm.paused; if (Array.isArray(mm.log)) m.log = mm.log; if (Array.isArray(mm.notes)) m.notes = mm.notes; if (mm.mood) m.mood = mm.mood; } } } catch (e) { /* ok */ }
  try { if (A.camera) { camera.position.fromArray(A.camera.p); controls.target.fromArray(A.camera.t); controls.update(); } } catch (e) { /* ok */ }
  try { if (A.caine && A.caine.on) { await altLoad(); setSafe(false); if (A.caine.move) SBX.caineMove(A.caine.move); } } catch (e) { /* ok */ } chkLog('Session — imported and restored'); })();
{ const fileIn = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' }); fileIn.onchange = () => { const f = fileIn.files && fileIn.files[0]; if (f) sessionImport(f); fileIn.value = ''; }; document.body.append(fileIn);
  const bEx = h('button', { type: 'button', title: 'Save the whole session: the exact world, settings and every AI’s full memory' }, '⬇ Export session'), bIm = h('button', { type: 'button', title: 'Load a saved session exactly as it was' }, '⬆ Import session'); bEx.onclick = () => sessionExport(); bIm.onclick = () => fileIn.click();
  const place = () => { let old = []; for (const b of document.querySelectorAll('button,[role="button"],a')) if (b !== bEx && b !== bIm && /(export|import|save|load|download|upload)\s*(the\s*)?world/i.test((b.textContent || '') + ' ' + (b.getAttribute('title') || '') + ' ' + (b.getAttribute('aria-label') || ''))) old.push(b);
    if (old.length) { old[0].before(bEx, bIm); for (const b of old) b.style.display = 'none'; } else if (!bEx.isConnected) barEl.querySelector('.bar-btns').append(bEx, bIm); }; place(); setTimeout(place, 3000); setTimeout(place, 8000); SBX.exportSession = sessionExport; }
// faster Caine / circus: once the page is idle, the big files are fetched and decoded in the background, so switching is quick
setTimeout(() => (window.requestIdleCallback || setTimeout)(() => { if (!window.__sbxLoaded) return; try { embUrl('data/caine.txt').catch(() => {}); if (PACKLIB.meta) { const i = PACKLIB.meta.packs.findIndex((p) => /lobby/i.test(p.label || '')); packScene(i >= 0 ? i : 2).catch(() => {}); } } catch (e) { /* ok */ } }, { timeout: 8000 }), 25000); /* prefetch only well after the page is ready, so it never slows the first load */
// ---------------------------------------------------------------- 19. session = EVERYTHING; load resilience; creative personal avatars
// every database collection the page uses (worlds, every AI-made creation and its code, music, characters, animations, systems …) is
// found by reading the page's own code, then dumped into the session file and written back on import
async function sessAllCollections() { const names = new Set(['sbx_music', 'sbx_worlds', 'sbx_creations']);
  try { for (const s of document.querySelectorAll('script')) { const t = s.textContent || ''; for (const m of t.matchAll(/collection\(\s*['"`]([A-Za-z0-9_\-\/]+)['"`]/g)) if (!/\//.test(m[1]) || m[1].split('/').length % 2) names.add(m[1]); } } catch (e) { /* ok */ }
  const out = {}; if (!DB) return out;
  for (const n of names) { try { const snap = await DB.collection(n).get(); const docs = snap?.docs || (Array.isArray(snap) ? snap : []); const rows = {}; for (const d of docs) { try { rows[d.id] = typeof d.data === 'function' ? d.data() : d.data; } catch (e) { /* ok */ } } if (Object.keys(rows).length) out[n] = rows; } catch (e) { /* not readable */ } }
  return out; }
{ const exp0 = sessionExport; const imp0 = sessionImport;
  // export: same file, plus the whole database (every creation's code, models, worlds, additions) and any in-page scripts the AI added
  sessionExport = async function () { try { const db = await sessAllCollections(); const extra = []; try { for (const s of document.querySelectorAll('script[data-ai],script[data-sbx]')) extra.push(s.textContent); } catch (e) { /* ok */ }
      SBX.__sessDB = { db, extra }; } catch (e) { console.warn('[session] db', e); } return exp0(); };
  const st0 = JSON.stringify; JSON.stringify = function (v, ...r) { if (v && v.kind === 'amazing-simulation-session' && SBX.__sessDB && !v.database) { v.database = SBX.__sessDB.db; v.scripts = SBX.__sessDB.extra; v.version = 2; SBX.__sessDB = null; } return st0.call(JSON, v, ...r); };
  sessionImport = async function (file) { try { const S = JSON.parse(await file.text()); if (S && S.kind === 'amazing-simulation-session' && S.database && DB) { toast('Restoring every creation and the world…');
        for (const [n, rows] of Object.entries(S.database)) { try { const cur = await DB.collection(n).get(); for (const d of (cur?.docs || [])) if (!(d.id in rows)) { try { await DB.collection(n).doc(d.id).delete(); } catch (e) { /* ok */ } } } catch (e) { /* ok */ }
          for (const [id, data] of Object.entries(rows)) { try { await DB.collection(n).doc(id).set(data); } catch (e) { console.warn('[session] write', n, id, e); } } } } } catch (e) { console.warn('[session] db import', e); } return imp0(file); };
  SBX.exportSession = sessionExport; }
// "something went wrong while loading": a single failed step (a slow file, a model that will not decode, an AI call refused) must never
// kill the whole page. Errors are logged instead of escaping, each stage retries once, and the loading cover always clears.
window.addEventListener('unhandledrejection', (e) => { console.warn('[load] handled', e.reason); e.preventDefault(); });
window.addEventListener('error', (e) => { if (e && e.error) { console.warn('[load] handled', e.error); e.preventDefault(); } }, true);
{ const origFetch = window.fetch.bind(window); const retryFetch = async function (u, o) { if (o && o.method && o.method !== 'GET') return origFetch(u, o); for (let i = 0; ; i++) { try { const r = await origFetch(u, o); if (r.ok || i >= 2 || r.status < 500) return r; } catch (e) { if (i >= 2) throw e; } await sleep(600 * (i + 1)); } }; try { const desc = Object.getOwnPropertyDescriptor(window, 'fetch'); if (!desc || desc.writable || desc.set) window.fetch = retryFetch; else if (desc.configurable) Object.defineProperty(window, 'fetch', { value: retryFetch, writable: true, configurable: true }); } catch (e) { /* keep native fetch when read-only */ } }
setTimeout(() => { try { const L = document.getElementById('loading'); if (L && L.style.display !== 'none' && !L.hidden && /wrong|reload|error/i.test(L.textContent || '')) { L.style.display = 'none'; toast('One part was slow to load — it will finish in the background'); } } catch (e) { /* ok */ } }, 20000);
// personal avatars / original characters: every request gets its own randomly drawn creative direction, so the AI does not fall back on
// the same kind of being (a stuffed animal) each time. Plush stays one choice among many, all within the circus / amusement-park theme.
function toyDirection() { const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const kind = pick(['a living object come alive (a ticket booth, a popcorn cart, a jack-in-the-box, a carousel horse, a music box, a neon sign, a teacup ride car, a coin-op fortune machine)', 'a wind-up tin toy or clockwork automaton', 'a carved and painted wooden marionette or ventriloquist-style puppet with visible hinges', 'a hollow glossy vinyl or blow-moulded plastic figure', 'a squeaky rubber toy creature', 'a balloon-animal being made of twisted balloons', 'a robot or retro-futurist mechanical performer', 'a surreal circus spirit, ghost or candy-floss / smoke / light being', 'a creature from the sea, the sky or outer space working as a circus act', 'a costumed mascot-suit character with an oversized foam head', 'a felt or sock-puppet creature', 'a stuffed animal / plush toy', 'a stuffed animal / plush prize from a claw machine', 'a CRT-TV-headed or screen-faced digital being', 'a character made of analog tech (a VHS tape, a cassette, a flip phone, a handheld game, a camcorder, a jukebox)', 'an arcade-cabinet or pixel-sprite creature come to life', 'a 2000s mall or theme-park mascot', 'a liminal-space dweller (an empty food court, a pool room, a night-time arcade, a backstage hallway)', 'a porcelain / ceramic carnival-prize doll or figurine', 'an insect, bird, reptile or invented hybrid animal performer', 'a paper, cardboard or papier-mache cut-out creature']);
  const role = pick(['ringmaster', 'juggler', 'acrobat', 'tightrope walker', 'magician', 'fortune teller', 'clown', 'strongman', 'ticket taker', 'snack vendor', 'band musician', 'stage hand', 'lion tamer', 'stilt walker', 'game-booth host', 'ride operator', 'night watch', 'unicyclist']);
  const shape = pick(['tall and lanky', 'short and wide', 'top-heavy', 'pear-shaped', 'segmented', 'asymmetrical', 'long-necked', 'many-limbed', 'tiny-headed', 'blocky and boxy', 'round and floaty', 'spindly and elegant']);
  return `CREATIVE DIRECTION FOR THIS CHARACTER (drawn at random so every new character is different; follow it unless the user's words or images clearly ask for something else): make it ${kind}, working as a ${role}, with a ${shape} silhouette. Take the person's or reference's colours, mood, interests and attitude into this design. Theme: an original character in a 2000s digital / circus / analog / theme-park / nostalgic / liminal / fun spirit.`; }
// ---------------------------------------------------------------- 20. HIDE UI (3 modes) + PROXIMITY VOICE CHAT
// One small button, always in the top-right corner, cycles: 1) everything shown (editor on); 2) all UI hidden and the editor off (no
// selecting / moving models), but the character controls stay; 3) every screen UI hidden, the character controls too (only the
// joystick, run and jump stay, and only on a touch screen). In both hidden modes the button shrinks to a small eye, and the chat box
// stays whenever Smart Ollo is on.
const UIH = { mode: 0 };
style.textContent += `
#uiHideBtn { position: fixed; right: 12px; top: 12px; z-index: 60; pointer-events: auto; font: 600 12px "IBM Plex Sans", system-ui, sans-serif; color: #eef2f6; background: rgba(16,20,26,.86); border: 1px solid rgba(255,255,255,.14); border-radius: 99px; padding: 7px 12px; cursor: pointer; }
#uiHideBtn.min { padding: 5px 8px; opacity: .55; font-size: 13px; } #uiHideBtn.min:hover { opacity: 1; }
body.uih1 #sbx > *:not(#uiHideBtn):not(#vcBtn):not(#sbxChat):not(.joy):not(.jumpbtn):not(.runbtn):not(.ctlbar):not(.ctlpanel):not(.bubble),
body.uih2 #sbx > *:not(#uiHideBtn):not(#vcBtn):not(#sbxChat):not(.joy):not(.jumpbtn):not(.runbtn):not(.bubble) { display: none !important; }
body.uih1 > *:not(#view):not(#sbx):not(script):not(style):not(link):not(canvas):not(#uiHideBtn):not(.ctlpanel):not(#sbxLoad):not(#chkLoading),
body.uih2 > *:not(#view):not(#sbx):not(script):not(style):not(link):not(canvas):not(#uiHideBtn):not(#sbxLoad):not(#chkLoading) { display: none !important; }
body.uih2 .ctlpanel, body.uih2 .ctlbar, body.uih2 #aiViewFull { display: none !important; }
@media (hover: hover) and (pointer: fine) { body.uih2 .joy, body.uih2 .jumpbtn, body.uih2 .runbtn { display: none !important; } }
`;
const uiHideBtn = h('button', { id: 'uiHideBtn', type: 'button', title: 'Hide the UI' }, '🙈 Hide UI'); root.append(uiHideBtn);
function setUiMode(n) { UIH.mode = ((n % 3) + 3) % 3; document.body.classList.toggle('uih1', UIH.mode === 1); document.body.classList.toggle('uih2', UIH.mode === 2);
  uiHideBtn.classList.toggle('min', UIH.mode > 0); uiHideBtn.textContent = UIH.mode === 0 ? '🙈 Hide UI' : UIH.mode === 1 ? '👁' : '👁‍🗨';
  uiHideBtn.title = UIH.mode === 0 ? 'Hide the UI and turn the editor off (keeps the character controls)' : UIH.mode === 1 ? 'Hide everything (character controls too) — click again to show the UI' : 'Show the UI again';
  if (UIH.mode > 0) { try { unselect(); } catch (e) { /* ok */ } } try { localStorage.setItem('sbx_uih', String(UIH.mode)); } catch (e) { /* ok */ } }
uiHideBtn.onclick = (ev) => { ev.stopPropagation(); setUiMode(UIH.mode + 1); };
addEventListener('keydown', (e) => { if (e.key === 'h' && e.altKey) { e.preventDefault(); setUiMode(UIH.mode + 1); } });
/* the editor is off while the UI is hidden: models cannot be selected, moved or edited */ { const _sel = selectModel; selectModel = function (p, ev) { if (UIH.mode > 0) return; return _sel(p, ev); }; }
try { const m0 = +localStorage.getItem('sbx_uih'); if (m0 > 0) setTimeout(() => setUiMode(m0), 1500); } catch (e) { /* ok */ }
SBX.uiMode = setUiMode;

// ---- proximity voice chat. Every voice in the world, yours and every AI's spoken line, travels as sound: how loud it reaches each
// listener depends on the distance (and on how loudly it was said); close listeners hear every word, farther ones only parts of it, too far
// and nothing. Each mind keeps what it heard in its own memory. In first person (or with no character) your voice comes from your own
// eyes; while you watch your character in third person it comes from your character. Works without Smart Ollo too.
const VC = { on: false, rec: null, level: 0, an: null, stream: null };
function vcLoud(text, base) { const t = String(text); const caps = (t.match(/[A-Z]{3,}/g) || []).length, bang = (t.match(/!/g) || []).length; return clamp(base * (1 + 0.25 * Math.min(3, caps) + 0.12 * Math.min(4, bang)) * (/^\s*\(?(whisper|psst)/i.test(t) ? 0.35 : 1), 0.2, 2.5); }
function vcGarble(text, clarity) { if (clarity >= 0.95) return text; return String(text).split(/\s+/).map((w, i) => (Math.sin(i * 12.9898 + w.length * 78.233) * 0.5 + 0.5 < clarity ? w : '…')).join(' ').replace(/(… ?)+/g, '… '); }
const vcSource = (fromId, pos) => { if (fromId !== 'player') return pos; if (PLAYER.c && PLAYER.c !== ollo && !CHK.fpv) return PLAYER.c.group.position.clone().add(new THREE.Vector3(0, 0.45, 0)); return CHK.fpv && PLAYER.c ? PLAYER.c.group.position.clone().add(new THREE.Vector3(0, 0.45, 0)) : camera.position.clone(); };
{ const _hear = hearAll; hearAll = function (fromId, name, text, pos, typed) {
    if (typed) return _hear(fromId, name, text, pos, typed); /* typed chat is not sound: unchanged */
    { const k = fromId + '|' + String(text).slice(0, 120), now = Date.now(); VC.seen = VC.seen || new Map(); if (now - (VC.seen.get(k) || 0) < 5000) return false; VC.seen.set(k, now); if (VC.seen.size > 60) VC.seen.clear(); } /* one line is heard once, however many ways it was announced */
    const src = vcSource(fromId, pos), loud = vcLoud(text, fromId === 'player' ? (VC.level || 1) : 1); let any = false;
    for (const m of MINDS.values()) { if (m.c.id === fromId) continue; const d = m.c.group.position.distanceTo(src), lvl = loud / (1 + (d / 6) ** 2); /* sound falls off with distance */
      if (lvl < 0.03) continue; const clarity = clamp((lvl - 0.03) / 0.25, 0, 1), heard = vcGarble(text, clarity);
      mindLog(m, name, `(heard ${clarity > 0.9 ? 'clearly' : clarity > 0.4 ? 'partly' : 'faintly'} as sound, ${d.toFixed(0)} m away, ${lvl > 0.6 ? 'loud' : lvl > 0.2 ? 'normal' : 'quiet'}) ${heard}`); any = true;
      const addressed = new RegExp('\\b' + (m.c.ch.name || m.c.id).split(/\s+/)[0] + '\\b', 'i').test(text) || new RegExp('\\b' + m.c.id + '\\b', 'i').test(text);
      if (!m.paused && (addressed && clarity > 0.3 || clarity > 0.7 && (fromId === 'player' || Math.random() < 0.45))) { if (m.busy) m.pending = true; else mindThink(m, 'heard'); } }
    if (fromId !== 'ollo' && fromId !== 'player') { const d = ollo.group.position.distanceTo(src), lvl = loud / (1 + (d / 6) ** 2); if (lvl >= 0.03) { const clarity = clamp((lvl - 0.03) / 0.25, 0, 1); brainLog(name, `(heard as sound, ${d.toFixed(0)} m from you${clarity < 0.9 ? ', only partly' : ''}) ${vcGarble(text, clarity)}`); if (BR.on && clarity > 0.5 && (/ollo/i.test(text) || d < 5)) { if (BR.busy) BR.pending = true; else think('heard'); } } }
    return any; }; }
// every line an AI speaks aloud is heard by the others around it, as sound, in real time (the moment it is spoken)
try { const _ss = speakSynced; speakSynced = function (c, u, text, ...a) { try { const said = typeof text === 'string' ? text : u && u.text; if (said && c) { const who = c === ollo ? (ALT.on ? 'caine' : 'ollo') : c.id, nm = c === ollo ? (ALT.on ? 'Caine' : 'Ollo') : (c.ch && c.ch.name) || c.id, p = (c === ollo ? ollo.group.position : c.group.position).clone();
      const key = who + ':' + said; if (VC.last !== key) { VC.last = key; setTimeout(() => { try { hearAll(who === 'caine' ? 'ollo' : who, nm, said, p, false); } catch (e) { /* ok */ } }, 50); } } } catch (e) { /* ok */ } return _ss.call(this, c, u, text, ...a); }; } catch (e) { /* ok */ }
// your microphone: how loudly you speak (for the falloff), and your words (claude.ai dictation, or the browser's own speech recognition)
async function vcStart() { if (VC.on) return; VC.on = true; vcBtn.setAttribute('aria-pressed', 'true');
  try { VC.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); const ac = mac(); if (ac) { const src = ac.createMediaStreamSource(VC.stream), an = ac.createAnalyser(); an.fftSize = 512; src.connect(an); VC.an = an; const buf = new Float32Array(an.fftSize);
      const tick = () => { if (!VC.on || !VC.an) return; VC.an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; const rms = Math.sqrt(s / buf.length); VC.peak = Math.max((VC.peak || 0) * 0.995, rms); VC.floor = VC.floor === undefined ? rms : VC.floor * 0.995 + Math.min(rms, VC.floor * 2 + 0.002) * 0.005; const talking = rms > Math.max(0.012, VC.floor * 3.2); if (talking) VC.talkUntil = performance.now() + 250; try { vcBtn.classList.toggle('vc-talk', performance.now() < (VC.talkUntil || 0)); } catch (e) { /* ok */ } requestAnimationFrame(tick); }; tick(); } } catch (e) { /* level unknown: normal */ }
  const D = await loadDict().catch(() => null);
  if (D) { try { if (!dictOn) await D.start(); } catch (e) { /* fall back below */ } if (dictOn) return; }
  /* listening is done by Gemini (or the local AI when that is in use), never by the browser's speech recognition */
  { toast('Voice chat could not start listening: check the microphone permission, and that the site has GEMINI_API_KEY set'); vcStop(); return; }
  const SR = null; if (!SR) return;
  const r = VC.rec = new SR(); r.continuous = true; r.interimResults = false; r.lang = navigator.language || 'en-US';
  r.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) { const t = e.results[i][0].transcript; if (VOICE.speaking) continue; VC.level = clamp((VC.peak || 0.05) / 0.06, 0.4, 2.2); VC.peak = 0; playerSays(t, 'voice'); } };
  r.onend = () => { if (VC.on && VC.rec === r) { try { r.start(); } catch (e) { /* ok */ } } }; try { r.start(); } catch (e) { toast('Could not start the microphone'); vcStop(); } }
function vcStop() { VC.on = false; vcBtn.setAttribute('aria-pressed', 'false'); vcBtn.classList.remove('vc-talk'); try { if (VC.rec) { const r = VC.rec; VC.rec = null; r.stop(); } } catch (e) { /* ok */ } try { if (DICT && dictOn) DICT.stop().catch(() => {}); } catch (e) { /* ok */ } try { VC.stream && VC.stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* ok */ } VC.stream = null; VC.an = null; }
{ const _fl = flushDict; flushDict = function () { VC.level = clamp((VC.peak || 0.05) / 0.06, 0.4, 2.2); VC.peak = 0; return _fl(); }; }
const vcBtn = h('button', { type: 'button', 'aria-pressed': 'false', title: 'Voice chat: talk out loud — every AI near you hears you (and each other) by distance, and remembers it' }, '🎙 Voice chat');
vcBtn.id = 'vcBtn'; vcBtn.onclick = () => (VC.on ? vcStop() : vcStart()); root.append(vcBtn);
/* the voice chat toggle is always on screen (hidden UI modes too): stacked just above the Create box, or at the bottom centre when that box is not there */
style.textContent += `#vcBtn { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 59; pointer-events: auto; border-radius: 99px !important; padding: 8px 16px !important; box-shadow: 0 6px 18px rgba(0,0,0,.3); white-space: nowrap; } #vcBtn[aria-pressed="true"] { background: #ff6b5e !important; color: #fff !important; border-color: #ff6b5e !important; transition: background .12s, box-shadow .12s, border-color .12s; }
#vcBtn.vc-talk[aria-pressed="true"] { background: #22b45e !important; border-color: #4ff28f !important; box-shadow: 0 0 0 3px rgba(79,242,143,.45), 0 0 22px rgba(79,242,143,.85), 0 6px 18px rgba(0,0,0,.3) !important; }
body.uih1 #sbx > #vcBtn, body.uih2 #sbx > #vcBtn { display: inline-block !important; }
.ctlpanel { position: fixed !important; left: 50%; transform: translateX(-50%); display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-width: min(720px, calc(100vw - 24px)); pointer-events: auto; z-index: 58; }`;
function layoutUI() {
  try {
    const W = window.innerWidth, H = window.innerHeight, mob = W <= 760, gap = mob ? 8 : 10;
    const isVis = (el) => {
      if (!el || el.hidden) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    };
    const rectOf = (el) => (isVis(el) ? el.getBoundingClientRect() : null);

    // 1) Top zone: .sbx-bar and #uiHideBtn -> dynamic topSafe
    const bar = document.querySelector('#sbx > .sbx-bar');
    const hideBtn = document.getElementById('uiHideBtn');
    const hideR = rectOf(hideBtn);
    if (bar && isVis(bar)) {
      const rightPad = hideR ? Math.ceil(W - hideR.left + 8) : 12;
      bar.style.maxWidth = Math.max(180, W - rightPad - (mob ? 8 : 14)) + 'px';
    }
    const barR = rectOf(bar);
    let topSafe = Math.max(barR ? barR.bottom : 0, hideR ? hideR.bottom : 0, 10) + gap;

    // 2) Control banner (.ctlbar) directly below topSafe
    const ctlBarEl = document.querySelector('#sbx > .ctlbar');
    if (ctlBarEl && isVis(ctlBarEl)) {
      ctlBarEl.style.top = Math.round(topSafe) + 'px';
      ctlBarEl.style.maxWidth = (W - 20) + 'px';
      const cbR = ctlBarEl.getBoundingClientRect();
      topSafe = Math.max(topSafe, cbR.bottom + gap);
    }

    // 3) Toast sits cleanly below topSafe (never clipping top bar or control bar)
    const toastEl = document.querySelector('#sbx > .toast');
    if (toastEl) {
      toastEl.style.top = Math.round(topSafe) + 'px';
    }

    // 4) Bottom-center stack: #sbxPrompt -> #vcBtn -> (.ctlpanel / .selmenu)
    const promptEl = document.getElementById('sbxPrompt');
    const promptR = rectOf(promptEl);
    let bottomCenter = promptR ? Math.max(12, Math.ceil(H - promptR.top + gap)) : 14;

    if (isVis(vcBtn)) {
      vcBtn.style.left = promptR ? Math.round(promptR.left + promptR.width / 2) + 'px' : '50%';
      vcBtn.style.bottom = Math.round(bottomCenter) + 'px';
      const vcR = vcBtn.getBoundingClientRect();
      bottomCenter = Math.max(bottomCenter, Math.ceil(H - vcR.top + gap));
    }

    // 5) Mobile / touch controls (.joy, .jumpbtn, .runbtn) clear of prompt & voice button
    const joyEl = document.querySelector('#sbx > .joy');
    const jumpEl = document.querySelector('#sbx > .jumpbtn');
    const runEl = document.querySelector('#sbx > .runbtn');
    let touchTop = bottomCenter;
    const touchBase = mob ? Math.max(bottomCenter, 16) : 22;
    if (joyEl && isVis(joyEl)) {
      joyEl.style.bottom = Math.round(touchBase) + 'px';
      const jr = joyEl.getBoundingClientRect();
      touchTop = Math.max(touchTop, Math.ceil(H - jr.top + gap));
    }
    if (jumpEl && isVis(jumpEl)) {
      jumpEl.style.bottom = Math.round(touchBase) + 'px';
      const jr = jumpEl.getBoundingClientRect();
      touchTop = Math.max(touchTop, Math.ceil(H - jr.top + gap));
    }
    if (runEl && isVis(runEl)) {
      const jumpR = rectOf(jumpEl);
      runEl.style.bottom = Math.round(jumpR ? (H - jumpR.top + 8) : (touchBase + 72)) + 'px';
      const rr = runEl.getBoundingClientRect();
      touchTop = Math.max(touchTop, Math.ceil(H - rr.top + gap));
    }

    // 6) Character ability buttons (.ctlpanel): below .ctlbar on mobile so they never clash with joystick/jump, above #vcBtn on desktop
    const ctlPanel = document.querySelector('#sbx > .ctlpanel');
    if (ctlPanel && isVis(ctlPanel)) {
      if (mob) {
        ctlPanel.style.top = Math.round(topSafe) + 'px';
        ctlPanel.style.bottom = 'auto';
        const cpR = ctlPanel.getBoundingClientRect();
        topSafe = Math.max(topSafe, cpR.bottom + gap);
      } else {
        ctlPanel.style.top = 'auto';
        ctlPanel.style.bottom = Math.round(bottomCenter) + 'px';
        const cpR = ctlPanel.getBoundingClientRect();
        bottomCenter = Math.max(bottomCenter, Math.ceil(H - cpR.top + gap));
      }
    }

    // 7) Selection menu (.selmenu) above bottom-center stack
    const selEl = document.querySelector('#sbx > .selmenu');
    if (selEl && isVis(selEl)) {
      selEl.style.bottom = Math.round(mob ? Math.max(bottomCenter, touchTop) : bottomCenter) + 'px';
      selEl.style.maxWidth = (W - 20) + 'px';
    }

    // 8) PiP AI view (#sbxPip): bottom-left, lifted above joystick or prompt if narrow
    const pipEl = document.getElementById('sbxPip');
    let pipBottom = 14;
    if (pipEl && isVis(pipEl)) {
      if (joyEl && isVis(joyEl)) {
        const jr = joyEl.getBoundingClientRect();
        pipBottom = Math.max(pipBottom, Math.ceil(H - jr.top + gap));
      } else if (mob) {
        pipBottom = Math.max(pipBottom, bottomCenter);
      } else if (promptR && promptR.left < 240) {
        pipBottom = Math.max(pipBottom, Math.ceil(H - promptR.top + gap));
      }
      pipEl.style.bottom = Math.round(pipBottom) + 'px';
      pipEl.style.left = (mob ? 8 : 12) + 'px';
      pipEl.style.right = 'auto';
    }
    const pipR = rectOf(pipEl);

    // 9) Side panels: Library (left), Feed (top-right), Chat (bottom-right) — bounded strictly inside [topSafe, bottomLimit] with zero overlap
    const libEl = document.getElementById('sbxLib');
    if (libEl && isVis(libEl)) {
      const libTop = Math.round(topSafe);
      let libBottomLimit = H - (mob ? Math.max(bottomCenter, touchTop) : 14);
      if (pipR && !mob) libBottomLimit = Math.min(libBottomLimit, Math.floor(pipR.top - gap));
      if (joyEl && isVis(joyEl)) libBottomLimit = Math.min(libBottomLimit, Math.floor(joyEl.getBoundingClientRect().top - gap));
      const avail = Math.max(120, libBottomLimit - libTop);
      libEl.style.top = libTop + 'px';
      libEl.style.bottom = 'auto';
      libEl.style.maxHeight = avail + 'px';
      if (mob) { libEl.style.left = '8px'; libEl.style.right = '8px'; libEl.style.width = 'auto'; }
      else { libEl.style.left = '14px'; libEl.style.right = 'auto'; libEl.style.width = ''; }
    }

    const feedEl = document.getElementById('sbxFeed');
    const chatEl2 = document.getElementById('sbxChat');
    const feedVis = isVis(feedEl), chatVis = isVis(chatEl2);
    const rightTop = Math.round(topSafe);
    let rightBottomEdge = mob ? Math.max(bottomCenter, touchTop) : 14;
    if (!mob && promptR && promptR.right > W - 360) rightBottomEdge = Math.max(rightBottomEdge, Math.ceil(H - promptR.top + gap));
    const rightAvail = Math.max(140, H - rightTop - rightBottomEdge);

    if (feedVis && chatVis) {
      const feedH = Math.max(110, Math.floor(rightAvail * 0.42));
      const chatH = Math.max(130, rightAvail - feedH - gap);
      feedEl.style.top = rightTop + 'px';
      feedEl.style.bottom = 'auto';
      feedEl.style.maxHeight = feedH + 'px';
      chatEl2.style.top = 'auto';
      chatEl2.style.bottom = Math.round(rightBottomEdge) + 'px';
      chatEl2.style.maxHeight = chatH + 'px';
      if (mob) {
        feedEl.style.left = chatEl2.style.left = '8px';
        feedEl.style.right = chatEl2.style.right = '8px';
        feedEl.style.width = chatEl2.style.width = 'auto';
      } else {
        feedEl.style.left = chatEl2.style.left = 'auto';
        feedEl.style.right = chatEl2.style.right = '14px';
        feedEl.style.width = chatEl2.style.width = '';
      }
    } else if (feedVis) {
      feedEl.style.top = rightTop + 'px';
      feedEl.style.bottom = 'auto';
      feedEl.style.maxHeight = rightAvail + 'px';
      if (mob) { feedEl.style.left = '8px'; feedEl.style.right = '8px'; feedEl.style.width = 'auto'; }
      else { feedEl.style.left = 'auto'; feedEl.style.right = '14px'; feedEl.style.width = ''; }
    } else if (chatVis) {
      chatEl2.style.top = 'auto';
      chatEl2.style.bottom = Math.round(rightBottomEdge) + 'px';
      chatEl2.style.maxHeight = rightAvail + 'px';
      if (mob) { chatEl2.style.left = '8px'; chatEl2.style.right = '8px'; chatEl2.style.width = 'auto'; }
      else { chatEl2.style.left = 'auto'; chatEl2.style.right = '14px'; chatEl2.style.width = ''; }
    }
  } catch (e) { /* ok */ }
}
const vcPlace = layoutUI;
try {
  const _mo = new MutationObserver(() => requestAnimationFrame(layoutUI));
  _mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
  if (typeof ResizeObserver !== 'undefined') {
    const _ro = new ResizeObserver(() => requestAnimationFrame(layoutUI));
    _ro.observe(root);
    const b0 = document.querySelector('#sbx > .sbx-bar'); if (b0) _ro.observe(b0);
  }
} catch (e) { /* ok */ }
setInterval(layoutUI, 350); addEventListener('resize', layoutUI); layoutUI();
SBX.voiceChat = (on) => (on ? vcStart() : vcStop());
// ---------------------------------------------------------------- 21. EARS: every AI hears real sound at its own position, like a person
// Claude cannot take audio, so each mind gets what a human auditory system makes of the sound instead:
//  1) RECORDING. All sound in the page is recorded live as it plays (every Web-Audio voice, the toy voices, Caine, music, effects) through
//     a tap on the audio output, and the player's microphone through its own tap: 33 short spectra a second (48 bands on a
//     hearing-like mel scale, 60 Hz – 8 kHz) with loudness and the voice's pitch (autocorrelation). The browser's built-in "natural"
//     speech voices cannot be recorded by any page, so their sound is re-synthesised from the words and that character's voice settings.
//  2) PROPAGATION, per listener: what reaches THAT character's ears where it stands now: inverse-distance level loss, air absorbing the
//     highs over distance, the direction relative to where its head faces (left / right / ahead / behind), and every other sound playing
//     at the same moment masking it.
//  3) PERCEPTION (the "auditory cortex"): loudness, pitch and its contour (a rise at the end = a question), how deep or high the voice is,
//     speaking rate, energy and pitch spread (calm / excited / shouting / whispering), roughness, pauses; whether the voice is one it
//     knows (each mind learns voices it has heard clearly: its own voice memory); and how many of the words came through.
//  4) It writes that into the mind's own memory as a human would remember it, and hands Claude the cochleagram (a picture of the
//     sound as that mind's ears received it) with the report the next time the mind thinks.
const EARS = { frames: [], mic: [], taps: new Map(), N: 48, keep: 25000 };
const MEL = (() => { const fm = (f) => 2595 * Math.log10(1 + f / 700), im = (m) => 700 * (10 ** (m / 2595) - 1); const lo = fm(60), hi = fm(8000), e = []; for (let i = 0; i <= EARS.N + 1; i++) e.push(im(lo + (hi - lo) * i / (EARS.N + 1))); return e; })();
function earTap(ctx) { let t = EARS.taps.get(ctx); if (!t) { try { const an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0; t = { an, f: new Float32Array(an.frequencyBinCount), w: new Float32Array(an.fftSize), sr: ctx.sampleRate }; EARS.taps.set(ctx, t); } catch (e) { return null; } } return t; }
{ const _c = AudioNode.prototype.connect; AudioNode.prototype.connect = function (dest, ...a) { const r = _c.call(this, dest, ...a); try { if (dest && dest instanceof AudioDestinationNode && !this.__earTapped) { const t = earTap(this.context); if (t) { _c.call(this, t.an); this.__earTapped = true; } } } catch (e) { /* ok */ } return r; }; }
try { if (MAC) earTap(MAC); } catch (e) { /* ok */ }
function earFrame(t) { const { an, f, w, sr } = t; an.getFloatFrequencyData(f); an.getFloatTimeDomainData(w); const bins = f.length, hz = sr / an.fftSize, B = new Float32Array(EARS.N);
  for (let b = 0; b < EARS.N; b++) { const a = Math.max(1, Math.floor(MEL[b] / hz)), z = Math.max(a + 1, Math.min(bins, Math.ceil(MEL[b + 2] / hz))); let s = 0; for (let k = a; k < z; k++) s += 10 ** (Math.max(-140, f[k]) / 10); B[b] = 10 * Math.log10(s / (z - a) + 1e-14); }
  let e = 0; for (let i = 0; i < w.length; i++) e += w[i] * w[i]; const rms = Math.sqrt(e / w.length), db = 20 * Math.log10(rms + 1e-9);
  let f0 = 0; if (db > -50) { let best = 0, lag = 0; const lo = Math.floor(sr / 450), hi = Math.floor(sr / 65); for (let L = lo; L <= hi; L += 2) { let s = 0; for (let i = 0; i + L < w.length; i += 4) s += w[i] * w[i + L]; if (s > best) { best = s; lag = L; } } if (best > e * 0.15) f0 = sr / lag; }
  return { B, db, f0 }; }
setInterval(() => { const now = performance.now(); try { let best = null; for (const t of EARS.taps.values()) { const fr = earFrame(t); if (!best || fr.db > best.db) best = fr; } if (best) { best.t = now; EARS.frames.push(best); } } catch (e) { /* ok */ }
  try { if (VC.an) { if (!EARS.micT) EARS.micT = { an: VC.an, f: new Float32Array(VC.an.frequencyBinCount), w: new Float32Array(VC.an.fftSize), sr: VC.an.context.sampleRate }; const fr = earFrame(EARS.micT); fr.t = now; EARS.mic.push(fr); } else EARS.micT = null; } catch (e) { /* ok */ }
  for (const L of [EARS.frames, EARS.mic]) while (L.length && now - L[0].t > EARS.keep) L.shift(); }, 30);
// the sound of a "natural" (browser) voice line, re-synthesised from its words and the speaker's voice settings (it cannot be recorded)
function earSynth(text, v, t0) { v = v || {}; const male = /male/.test(v.gender || '') && !/female/.test(v.gender || ''), np = +v.natural_pitch || 1, toy = v.engine === 'toy';
  const f0b = toy ? clamp(9000 / ((+v.pitch || 64) + 10), 70, 420) : (male ? 115 : /child|kid/.test(v.preset || '') ? 260 : 205) * np, rate = toy ? 120 / (+v.speed || 72) : (+v.natural_rate || 1);
  const syl = String(text).toLowerCase().match(/[aeiouy]+/g) || ['a'], dur = 0.19 / rate, out = []; let t = t0; const q = /\?\s*$/.test(text), ex = /!/.test(text);
  syl.forEach((s, i) => { const n = Math.max(2, Math.round(dur * 33)), fr1 = 300 + (s.charCodeAt(0) * 37) % 500, fr2 = 900 + (s.charCodeAt(0) * 91) % 1500, prog = i / Math.max(1, syl.length - 1);
    const f0 = f0b * (1 + 0.12 * Math.sin(i * 1.7) + (q && prog > 0.75 ? 0.35 * (prog - 0.75) * 4 : 0) - 0.12 * prog * (q ? 0 : 1) + (ex ? 0.12 : 0));
    for (let k = 0; k < n; k++) { const B = new Float32Array(EARS.N), env = Math.sin(Math.PI * (k + 0.5) / n); for (let b = 0; b < EARS.N; b++) { const fc = (MEL[b] + MEL[b + 2]) / 2; let p = -95; for (const h of [1, 2, 3, 4, 6, 8]) { const fh = f0 * h; p = Math.max(p, -35 - 18 * Math.log2(h) - Math.abs(Math.log2(fc / fh)) * 60); } p = Math.max(p, -30 - Math.abs(Math.log2(fc / fr1)) * 25, -38 - Math.abs(Math.log2(fc / fr2)) * 28); B[b] = p + 20 * Math.log10(env + 1e-3) + (ex ? 6 : 0); }
      out.push({ t, B, db: -26 + 20 * Math.log10(env + 1e-3) + (ex ? 6 : 0), f0 }); t += 30; }
    if (/[,.;:!?]/.test(String(text).split(/\s+/)[Math.floor(i / 1.6)] || '')) t += 160; });
  return out; }
// what reached one listener's ears, and what it makes of it
function earListener(L) { if (L === 'ollo') return { pos: ollo.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), q: ollo.group.getWorldQuaternion(new THREE.Quaternion()), ear: BR.ear || (BR.ear = { prints: {} }) };
  const g = L.c.group; return { pos: g.position.clone().add(new THREE.Vector3(0, 0.45, 0)), q: g.getWorldQuaternion(new THREE.Quaternion()), ear: L.ear || (L.ear = { prints: {} }) }; }
function earPerceive(frames, src, lis, speaker, text) {
  const d = Math.max(0.3, lis.pos.distanceTo(src)), lossDb = 20 * Math.log10(Math.max(1, d)), absorb = (b) => d * 0.006 * (MEL[b + 1] / 1000) ** 1.5; /* air takes the highs over distance */
  const to = src.clone().sub(lis.pos); to.y = 0; const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(lis.q); fwd.y = 0; let az = 0; if (to.lengthSq() > 1e-6 && fwd.lengthSq() > 1e-6) { to.normalize(); fwd.normalize(); az = Math.atan2(fwd.x * to.z - fwd.z * to.x, fwd.dot(to)) * 180 / Math.PI; }
  const dir = Math.abs(az) < 25 ? 'ahead' : Math.abs(az) > 140 ? 'behind' : (az > 0 ? 'to the left' : 'to the right') + (Math.abs(az) > 100 ? ' and behind' : Math.abs(az) < 60 ? ', ahead' : '');
  const rec = frames.map((f) => ({ t: f.t, f0: f.f0, db: f.db - lossDb, B: Float32Array.from(f.B, (v, b) => v - lossDb - absorb(b)) }));
  const floor = -88, voiced = rec.filter((f) => f.db > floor + 6); if (!voiced.length) return null;
  const lv = voiced.map((f) => f.db).sort((a, b) => a - b), med = lv[Math.floor(lv.length / 2)], peak = lv[lv.length - 1], snr = med - floor;
  const clarity = clamp((snr - 6) / 30, 0, 1); if (clarity <= 0.02) return { faint: true, dir, d };
  const f0s = voiced.map((f) => f.f0).filter((x) => x > 60 && x < 500); const f0 = f0s.length ? f0s.slice().sort((a, b) => a - b)[Math.floor(f0s.length / 2)] : 0;
  const spread = f0s.length > 3 ? (Math.max(...f0s) - Math.min(...f0s)) / Math.max(1, f0) : 0; const tail = f0s.slice(-Math.max(2, Math.floor(f0s.length * 0.25))), headF = f0s.slice(0, Math.max(2, Math.floor(f0s.length * 0.5)));
  const rise = f0s.length > 4 ? (tail.reduce((a, b) => a + b, 0) / tail.length) / (headF.reduce((a, b) => a + b, 0) / headF.length) : 1;
  let cent = 0, tot = 0; for (const f of voiced) for (let b = 0; b < EARS.N; b++) { const p = 10 ** (f.B[b] / 10); cent += p * MEL[b + 1]; tot += p; } cent = tot ? cent / tot : 0;
  let peaks = 0; for (let i = 1; i < rec.length - 1; i++) if (rec[i].db > rec[i - 1].db && rec[i].db >= rec[i + 1].db && rec[i].db > med - 4) peaks++; const secs = Math.max(0.3, (rec[rec.length - 1].t - rec[0].t) / 1000), sylRate = peaks / secs;
  let pauses = 0; for (let i = 1; i < rec.length; i++) if (rec[i].db < floor + 4 && rec[i - 1].db >= floor + 4) pauses++;
  const loud = peak + lossDb > -12 ? 'shouting' : peak + lossDb > -22 ? 'loud' : peak + lossDb < -42 ? 'whispering / very soft' : 'normal';
  const voiceKind = !f0 ? 'a voice' : f0 < 135 ? 'a deep voice' : f0 < 175 ? 'a low-to-mid voice' : f0 < 240 ? 'a mid-to-high voice' : 'a high voice';
  const mood = spread > 0.6 || sylRate > 6 ? 'excited / animated' : spread < 0.15 && sylRate < 3.5 ? 'flat / calm' : 'conversational';
  // voice memory: does it sound like a voice this listener already knows?
  const prints = lis.ear.prints; let known = null, bestD = 1e9; for (const [nm, p] of Object.entries(prints)) { const dd = Math.abs(Math.log2((f0 || p.f0) / p.f0)) * 2 + Math.abs(Math.log2((cent || p.c) / p.c)); if (dd < bestD) { bestD = dd; known = nm; } }
  const recognised = known && bestD < 0.35 && clarity > 0.25 ? known : null;
  if (clarity > 0.55 && speaker && f0) { const p = prints[speaker] || (prints[speaker] = { f0, c: cent || 1500, n: 0 }); p.n++; p.f0 += (f0 - p.f0) / Math.min(8, p.n); p.c += ((cent || p.c) - p.c) / Math.min(8, p.n); }
  const words = vcGarble(text, clamp(clarity * 1.15, 0, 1));
  return { d, dir, az, clarity, loud, voiceKind, f0, rise, mood, sylRate, pauses, cent, recognised, words, rec, lossDb };
}
function earPicture(P, title) { try { const W = Math.max(60, Math.min(260, P.rec.length)), H = EARS.N * 2, cv = document.createElement('canvas'); cv.width = W + 34; cv.height = H + 26; const g = cv.getContext('2d'); g.fillStyle = '#05070b'; g.fillRect(0, 0, cv.width, cv.height);
    const img = g.createImageData(W, H); for (let x = 0; x < W; x++) { const f = P.rec[Math.floor(x * P.rec.length / W)]; for (let b = 0; b < EARS.N; b++) { const v = clamp((f.B[b] + 100) / 70, 0, 1); const r = Math.round(255 * clamp(v * 1.6 - 0.6, 0, 1)), gg = Math.round(255 * clamp(v * 1.4 - 0.25, 0, 1) * 0.9), bl = Math.round(255 * clamp(0.35 + v * 0.8 - v * v, 0, 1)); for (let yy = 0; yy < 2; yy++) { const o = (((H - 1 - b * 2 - yy)) * W + x) * 4; img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = bl; img.data[o + 3] = 255; } } }
    g.putImageData(img, 34, 4); g.fillStyle = '#cfd8e3'; g.font = '9px sans-serif'; g.fillText('8k', 2, 12); g.fillText('1k', 2, 4 + H * 0.45); g.fillText('60Hz', 2, H + 2); g.fillText(String(title).slice(0, 60), 34, H + 18); return cv; } catch (e) { return null; } }
const earBlob = (cv) => new Promise((r) => { try { cv.toBlob((b) => r(b), 'image/png'); } catch (e) { r(null); } });
function earReport(P, who) { if (P.faint) return `(a faint sound ${P.dir}, too quiet to make out)`;
  const voice = P.recognised ? `${P.recognised}'s voice (you know it)` : who && P.clarity > 0.75 && P.d < 6 ? `${who}` : `${P.voiceKind} you ${P.clarity > 0.5 ? "don't recognise" : 'can barely place'}`;
  return `(you HEARD this through your ears: ${voice}, ${P.dir}, about ${P.d.toFixed(0)} m away; ${P.loud}, ${P.mood}${P.rise > 1.12 ? ', rising at the end like a question' : P.rise < 0.88 ? ', falling at the end' : ''}${P.f0 ? `, pitch around ${Math.round(P.f0)} Hz` : ''}, ${P.sylRate.toFixed(1)} syllables/s${P.pauses > 1 ? ', with pauses' : ''}; you caught ${P.clarity > 0.9 ? 'every word' : P.clarity > 0.55 ? 'most of the words' : P.clarity > 0.25 ? 'only some words' : 'barely any words'}) "${P.words}"`; }
// hearing replaces the simple version: each listener gets its own recording, perception and memory
{ const _prev = hearAll; hearAll = function (fromId, name, text, pos, typed) {
    if (typed) return _prev(fromId, name, text, pos, typed);
    { const k = fromId + '|' + String(text).slice(0, 120), now = Date.now(); EARS.seen = EARS.seen || new Map(); if (now - (EARS.seen.get(k) || 0) < 5000) return false; EARS.seen.set(k, now); if (EARS.seen.size > 60) EARS.seen.clear(); }
    const src = vcSource(fromId, pos), now = performance.now(), est = Math.max(600, String(text).length / 13.5 * 1000);
    const isPlayer = fromId === 'player', t0 = isPlayer ? now - est - 1500 : now - 100, t1 = isPlayer ? now : now + est + 400;
    const speakerM = !isPlayer ? MINDS.get(fromId) : null, v = isPlayer ? null : fromId === 'ollo' ? (ALT.on ? CAINE_VOICE : (typeof OLLO_VOICE !== 'undefined' ? OLLO_VOICE : { gender: 'male' })) : speakerM ? voiceFor(speakerM) : null;
    setTimeout(async () => {
      let fr = (isPlayer ? EARS.mic : EARS.frames).filter((f) => f.t >= t0 && f.t <= t1);
      const real = fr.filter((f) => f.db > -60).length > 4; if (!real) fr = earSynth(text, v || {}, t0).concat(EARS.frames.filter((f) => f.t >= t0 && f.t <= t1 && f.db > -60)).sort((a, b) => a.t - b.t); /* (a natural browser voice, or no microphone level: re-synthesised, mixed with whatever else was playing) */
      if (!fr.length) return;
      const listeners = [...MINDS.values()].filter((m) => m.c.id !== fromId).concat(fromId !== 'ollo' && fromId !== 'player' ? ['ollo'] : []);
      for (const m of listeners) { try { const lis = earListener(m), P = earPerceive(fr, src, lis, name, text); if (!P) continue;
          if (m === 'ollo') { brainLog(P.recognised || (P.clarity > 0.75 && P.d < 6) ? name : 'a voice', earReport(P, name)); if (!P.faint && P.clarity > 0.3) { const cv = earPicture(P, `what you heard: ${P.dir}, ${P.d.toFixed(0)} m`); const b = cv && (await earBlob(cv)); if (b) { BR.earImgs = (BR.earImgs || []).concat(b).slice(-2); } }
            if (BR.on && !P.faint && P.clarity > 0.5 && (/ollo|caine/i.test(text) || P.d < 5)) { if (BR.busy) BR.pending = true; else think('heard'); } continue; }
          mindLog(m, P.recognised || (P.clarity > 0.75 && P.d < 6) ? name : 'a voice', earReport(P, name));
          if (!P.faint && P.clarity > 0.3) { const cv = earPicture(P, `what you heard: ${P.dir}, ${P.d.toFixed(0)} m`); const b = cv && (await earBlob(cv)); if (b) m.earImgs = (m.earImgs || []).concat(b).slice(-2); }
          const addressed = new RegExp('\\b' + (m.c.ch.name || m.c.id).split(/\s+/)[0] + '\\b', 'i').test(text) || new RegExp('\\b' + m.c.id + '\\b', 'i').test(text);
          if (!m.paused && !P.faint && (addressed && P.clarity > 0.3 || P.clarity > 0.7 && (isPlayer || Math.random() < 0.45))) { if (m.busy) m.pending = true; else mindThink(m, 'heard'); } } catch (e) { console.warn('[ears]', e); } }
    }, Math.max(0, t1 - now) + 120);
    return true; }; }
SBX.ears = EARS;
// ---------------------------------------------------------------- 22. VOICE POLISH for the page's own coded voice synth (every character, Caine most of all)
// The SAM-style synth alone is buzzy and flat. Each line now gets: syllable-level prosody (found from the audio itself: every syllable
// onset gets a quick upward scoop, stressed syllables leap higher, the line drifts and climbs with excitement, questions swoop up,
// statements settle, exclamations break into a strained high crescendo), natural micro-jitter and vibrato, a thickening double-voice
// chorus that hides the robotic buzz, soft breath, gentle saturation, a short room, and per-character tone. Caine's profile: a bright,
// loud, over-projected mid-century game-show / carnival announcer: fast punchy rhythm, big upward-swooping pitch, a slightly tinny
// megaphone-like edge, and erratic high-energy swells that strain upward when he gets excited or agitated.
const VPOL = { ir: null };
function vpolIR(ac) { if (VPOL.ir && VPOL.ir.sampleRate === ac.sampleRate) return VPOL.ir; const n = Math.floor(ac.sampleRate * 0.32), b = ac.createBuffer(2, n, ac.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2) * (i < ac.sampleRate * 0.012 ? i / (ac.sampleRate * 0.012) : 1); } VPOL.ir = b; return b; }
function voicePolish(ac, m, src, buf, T, at, lp, cmp) {
  const caine = m === CAINE_M, D = buf.duration, pcm = buf.getChannelData(0), sr = buf.sampleRate, hop = Math.floor(sr * 0.01);
  const vp = (m && m.voiceP) || {};
  const isMale = /male/i.test(vp.gender || '') && !/female/i.test(vp.gender || '');
  const isChild = /child|kid|tiny/i.test((vp.preset || '') + ' ' + (vp.label || ''));
  T = String(T); const ex = /!/.test(T), q = /\?\s*$/.test(T), capsW = (T.match(/\b[A-Z]{2,}\b/g) || []).length;
  const hype = (/Excited|Happy|Surprised|thrill|Angry|agitat/i.test(m.mood || '') ? 1.12 : 1.0) * (caine ? 1.18 : 1.0);
  const agitated = caine && (ex && (capsW > 0 || /!{2,}/.test(T)) || /Angry|agitat/i.test(m.mood || ''));
  // 1) syllable onsets from the audio's own envelope
  const env = []; for (let i = 0; i + hop <= pcm.length; i += hop) { let s = 0; for (let k = 0; k < hop; k++) s += pcm[i + k] * pcm[i + k]; env.push(Math.sqrt(s / hop)); }
  const mx = Math.max(1e-6, ...env), on = []; let low = 1, last = -1; for (let i = 1; i < env.length; i++) { low = Math.min(low * 1.02 + 0.0005, env[i] / mx); if (env[i] / mx > 0.18 && env[i] / mx > low * 1.8 && env[i] > env[i - 1] && (i - last) * 0.01 > (caine ? 0.1 : 0.115)) { on.push(i * 0.01); last = i; low = env[i] / mx; } }
  // 2) natural human-scaled prosody on detune (cents) — warm & expressive, never screechy or beepy
  try { const p = src.detune; p.cancelScheduledValues(at); let base = 0; p.setValueAtTime(-18 * hype, at); const N = on.length || 1;
    on.forEach((t, k) => { const prog = k / N, stress = k === 0 || (k % (caine ? 2 : 3) === 0) || Math.random() < 0.22;
      const climb = caine ? Math.min(55, k * 6 * hype) * (ex ? 1 : 0.5) : prog * 18;
      base = climb + (Math.random() - 0.5) * (caine ? 22 : 16); const tt = at + t; if (tt > at + D - 0.03) return;
      p.setValueAtTime(base - (stress ? 28 : 14) * hype, tt); p.linearRampToValueAtTime(base + (stress ? 62 : 24) * hype, tt + 0.065); p.setTargetAtTime(base + (stress ? 14 : 0) * hype, tt + 0.09, 0.06); });
    const endT = at + Math.max(0.05, D * 0.74); const fin = ex ? (agitated ? 135 : 95) * (caine ? 1.1 : 0.85) : q ? 115 : -65;
    p.setTargetAtTime(clamp(base + fin * (caine || ex || q ? 1 : 0.65), -180, 190), endT, D * 0.14 + 0.025);
    // subtle natural human vibrato and micro-drift (eliminates robotic flatness without warbling)
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.0 + Math.random() * 0.9; lg.gain.value = (caine ? 9 : 6) * (ex ? 1.25 : 1); lfo.connect(lg); lg.connect(p); lfo.start(at); lfo.stop(at + D + 0.3);
    const jn = ac.createBufferSource(), jb = ac.createBuffer(1, Math.max(2, Math.floor(3000 * (D + 0.3))), 3000); const jd = jb.getChannelData(0); let v = 0; for (let i = 0; i < jd.length; i++) { v = v * 0.97 + (Math.random() * 2 - 1) * 0.03; jd[i] = v; } jn.buffer = jb; const jg = ac.createGain(); jg.gain.value = caine ? 28 : 20; jn.connect(jg); jg.connect(p); jn.start(at); } catch (e) { /* ok */ }
  // 3) warm human vocal tone chain: de-beep EQ + chest resonance + gentle vocal presence + soft saturation + subtle room + breath
  try { lp.disconnect(); const mix = ac.createGain(); lp.connect(mix);
    for (const [ms, dep, rate, lvl] of [[10, 0.0005, 0.27, 0.24], [17, 0.0007, 0.41, 0.16]]) { const dl = ac.createDelay(0.05); dl.delayTime.value = ms / 1000; const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = rate; og.gain.value = dep; o.connect(og); og.connect(dl.delayTime); o.start(at); o.stop(at + D + 0.5); const dg = ac.createGain(); dg.gain.value = lvl; lp.connect(dl); dl.connect(dg); dg.connect(mix); }
    const f = (type, fr, gn, qq) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = fr; if (gn !== undefined) b.gain.value = gn; if (qq) b.Q.value = qq; return b; };
    const chestHz = isMale ? 210 : isChild ? 350 : 270;
    const chain = caine
      ? [f('highpass', 85, undefined, 0.7), f('peaking', 210, 2.8, 0.85), f('peaking', 1850, -2.5, 1.4), f('peaking', 2650, 2.0, 1.1), f('peaking', 3900, -3.2, 1.6), f('lowpass', 6800, undefined, 0.65)]
      : [f('highpass', isMale ? 85 : 115, undefined, 0.7), f('peaking', chestHz, 2.4, 0.85), f('peaking', 1850, -2.2, 1.4), f('peaking', 2800, 1.2, 1.1), f('peaking', 3700, -3.2, 1.6), f('lowpass', 6400, undefined, 0.65)];
    let node = mix; for (const b of chain) { node.connect(b); node = b; }
    const sh = ac.createWaveShaper(), k = caine ? (agitated ? 1.45 : 1.28) : 1.1, cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cv[i] = Math.tanh(k * x) / Math.tanh(k); } sh.curve = cv; sh.oversample = '2x'; node.connect(sh);
    const swell = ac.createGain(); swell.gain.setValueAtTime(0.98, at); if (ex || caine) swell.gain.linearRampToValueAtTime(caine ? (agitated ? 1.14 : 1.08) : 1.05, at + D); sh.connect(swell);
    swell.connect(cmp);
    const conv = ac.createConvolver(); conv.buffer = vpolIR(ac); const wet = ac.createGain(); wet.gain.value = caine ? 0.11 : 0.12; swell.connect(conv); conv.connect(wet); wet.connect(cmp);
    // soft natural human breath shaped by the voice's envelope
    const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * (D + 0.1)), ac.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; const ns = ac.createBufferSource(); ns.buffer = nb;
    const nbp = f('bandpass', 2800, undefined, 0.75), ng = ac.createGain(); ng.gain.value = 0; const curve = new Float32Array(Math.max(2, env.length)); for (let i = 0; i < curve.length; i++) curve[i] = (env[i] || 0) / mx * 0.035;
    try { ng.gain.setValueCurveAtTime(curve, at, Math.max(0.05, D)); } catch (e) { ng.gain.value = 0.015; } ns.connect(nbp); nbp.connect(ng); ng.connect(cmp); ns.start(at); ns.stop(at + D + 0.1);
  } catch (e) { try { lp.connect(cmp); } catch (e2) { /* ok */ } }
}
rebuildSolids(); refreshOutliner();
window.__loadStage && window.__loadStage(96, 'Almost ready…');
await nextFrame(); await nextFrame();
window.__SBX_READY = true;
window.__loadDone && window.__loadDone();

