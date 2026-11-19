// In-browser neural text-to-speech (Kokoro-82M via kokoro-js / ONNX Runtime Web).
// Runs entirely on the visitor's device inside this worker, so the 3D scene never stalls while a line is synthesised.
// No server: the model is fetched once from the Hugging Face CDN and then cached by the browser.
import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let tts = null;
let loading = null;

async function load(device) {
  if (tts) return tts;
  if (!loading) {
    const progress = (p) => {
      if (p && p.status === 'progress' && p.total) postMessage({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total });
    };
    loading = (async () => {
      // WebGPU (fp32) is fastest on capable desktops; WASM q8 (~90 MB) everywhere else
      if (device === 'webgpu') {
        try { return await KokoroTTS.from_pretrained(MODEL, { dtype: 'fp32', device: 'webgpu', progress_callback: progress }); }
        catch (e) { postMessage({ type: 'log', text: 'webgpu failed, using wasm: ' + (e && e.message) }); }
      }
      return KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm', progress_callback: progress });
    })();
  }
  tts = await loading;
  return tts;
}

// ---------------------------------------------------------------- formant-preserving pitch / time shaping (TD-PSOLA)
// Speeding a recording up to raise its pitch also squeezes its formants (the "chipmunk" effect) and changes its length.
// PSOLA instead cuts the voice into grains one pitch period long (each grain keeps the vocal-tract shape = who it sounds
// like) and lays them back down closer together / further apart for a new pitch, repeating or skipping grains for a new
// length. So a character sings any note, holds it as long as needed, and still sounds like themselves.
function pitchTrack(x, sr, hop) {
  const minLag = Math.floor(sr / 420), maxLag = Math.floor(sr / 65), W = maxLag * 2;
  const n = Math.max(1, Math.ceil(x.length / hop)), f = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const c = i * hop - (W >> 1); if (c < 0 || c + W + maxLag >= x.length) continue;
    let e0 = 0; for (let k = 0; k < W; k++) e0 += x[c + k] * x[c + k];
    if (e0 / W < 2e-5) continue;
    let best = 0; const rr = new Float32Array(maxLag + 2);
    for (let lag = minLag; lag <= maxLag; lag++) {
      let s = 0, e1 = 0; for (let k = 0; k < W; k += 2) { s += x[c + k] * x[c + k + lag]; e1 += x[c + k + lag] * x[c + k + lag]; }
      rr[lag] = s / Math.sqrt((e0 / 2) * e1 + 1e-12); if (rr[lag] > best) best = rr[lag];
    }
    // the shortest lag nearly as periodic as the best is the true period (a longer one would be an octave-down error)
    if (best > 0.5) for (let lag = minLag + 1; lag < maxLag; lag++) if (rr[lag] >= best * 0.92 && rr[lag] >= rr[lag - 1] && rr[lag] >= rr[lag + 1]) { f[i] = sr / lag; break; }
  }
  // smooth: median of 5, drop octave jumps
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) { const w = []; for (let k = -2; k <= 2; k++) { const v = f[i + k]; if (v > 0) w.push(v); } if (f[i] > 0 && w.length >= 2) { w.sort((a, b) => a - b); g[i] = w[w.length >> 1]; } }
  return g;
}
function median(arr) { const a = Array.from(arr).filter((v) => v > 0).sort((p, q) => p - q); return a.length ? a[a.length >> 1] : 0; }
function trimSilence(x, sr) {
  let s = 0, e = x.length - 1; while (s < e && Math.abs(x[s]) < 0.012) s++; while (e > s && Math.abs(x[e]) < 0.012) e--;
  s = Math.max(0, s - Math.round(sr * 0.01)); e = Math.min(x.length - 1, e + Math.round(sr * 0.03)); return x.slice(s, e + 1);
}
// shape = { ratio } (constant pitch factor, speech)
//      or { notes:[Hz per syllable], target:seconds, vib, vibDepth, vibRate, style, phraseEnd, trim } (singing)
function shape(x, sr, sh) {
  if (sh.trim) x = trimSilence(x, sr);
  const hop = Math.round(sr * 0.005), f = pitchTrack(x, sr, hop), f0 = median(f) || 0;
  const sing = Array.isArray(sh.notes) && sh.notes.length;
  if (!sing && (!sh.ratio || Math.abs(sh.ratio - 1) < 0.004)) return { pcm: x, f0 };
  const N = x.length, nF = f.length;
  const voicedF = (i) => f[Math.min(nF - 1, Math.max(0, i))] > 0;
  const per = (i) => { const v = f[Math.min(nF - 1, Math.max(0, Math.round(i / hop)))]; return v > 0 ? sr / v : 0; };

  // ---- time map: consonants keep their natural length, only voiced sound (the vowels) is stretched to fill the note
  let L = N, aFrameStart = null, oFrameStart = null, vRate = 1;
  if (sing && sh.target) {
    const want = Math.round(sh.target * sr); let V = 0; for (let i = 0; i < nF; i++) if (voicedF(i)) V += hop; const U = Math.max(0, N - V);
    vRate = V > 0 ? Math.max(0.45, (want - U) / V) : 1; // output samples per input sample in voiced frames
    const uRate = V > 0 ? 1 : Math.max(0.5, want / Math.max(1, N));
    oFrameStart = new Float64Array(nF + 1); aFrameStart = new Float64Array(nF + 1);
    for (let i = 0; i < nF; i++) { aFrameStart[i] = i * hop; oFrameStart[i + 1] = oFrameStart[i] + hop * (voicedF(i) ? vRate : uRate); }
    aFrameStart[nF] = nF * hop; L = Math.max(1, Math.round(oFrameStart[nF]));
  } else if (sh.target) L = Math.round(sh.target * sr);
  let fi = 0;
  const A = (ts) => { // output sample -> analysis sample
    if (!oFrameStart) return ts * (N / L);
    while (fi + 1 < nF && oFrameStart[fi + 1] <= ts) fi++; while (fi > 0 && oFrameStart[fi] > ts) fi--;
    const span = oFrameStart[fi + 1] - oFrameStart[fi] || 1; return aFrameStart[fi] + ((ts - oFrameStart[fi]) / span) * hop;
  };

  // ---- pitch marks: one per glottal period, tracked period-to-period on a smoothed copy so they stay phase-consistent (no phasiness)
  const lp = new Float32Array(N); { let s = 0; const a = Math.exp((-2 * Math.PI * 900) / sr); for (let i = 0; i < N; i++) { s = a * s + (1 - a) * x[i]; lp[i] = s; } }
  const marks = [], mper = [];
  for (let t = 0; t < N;) {
    const p = per(t);
    if (p) {
      const guess = marks.length && mper[marks.length - 1] ? marks[marks.length - 1] + mper[marks.length - 1] : t;
      const c = Math.round(Math.max(t, guess)), r = Math.round(p * (marks.length && mper[marks.length - 1] ? 0.18 : 0.5));
      let b = c, bv = -Infinity; for (let k = Math.max(0, c - r); k <= Math.min(N - 1, c + r); k++) if (lp[k] > bv) { bv = lp[k]; b = k; }
      if (!marks.length || b > marks[marks.length - 1] + p * 0.5) { marks.push(b); mper.push(p); }
      t = b + Math.max(16, Math.round(p * 0.8));
    } else { marks.push(t); mper.push(0); t += Math.round(sr * 0.005); }
  }

  // ---- the sung pitch over time: notes with smooth glides, a small human scoop into each note, natural drift, vibrato that blooms
  const ns = sing ? sh.notes.length : 1, glide = 0.06 * sr, style = String(sh.style || '');
  const sad = /sad|lullaby|ballad|blues|spooky/.test(style), opera = /opera/.test(style), rock = /rock|punk|hype/.test(style);
  const scoopC = opera ? 25 : sad ? 45 : rock ? 60 : 35;
  let drift = 0, driftV = 0; const seed = (sh.notes[0] || 1) * 7.3;
  const rnd = (() => { let s = Math.floor(seed * 1000) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const targetHz = (ts) => {
    const pos = (ts / L) * ns, k = Math.min(ns - 1, Math.floor(pos)); let hz = sh.notes[k];
    const into = (pos - k) * (L / ns);
    if (k > 0 && into < glide) { const a = into / glide, prev = sh.notes[k - 1]; hz = prev * Math.pow(hz / prev, a * a * (3 - 2 * a)); }
    else if (k === 0 && into < glide) { const a = into / glide; hz *= Math.pow(2, (-scoopC * (1 - a * a * (3 - 2 * a))) / 1200); }
    const tt = ts / sr;
    if (sh.vib) { const held = Math.max(0, Math.min(1, (ts / L - 0.3) / 0.45)); const depth = (sh.vibDepth || 20) * held, rate = (sh.vibRate || 5.2) * (1 + 0.04 * Math.sin(tt * 1.7)); hz *= Math.pow(2, (depth * Math.sin(2 * Math.PI * rate * tt)) / 1200); }
    if (sh.phraseEnd && sad && ts > L * 0.8) hz *= Math.pow(2, (-35 * ((ts / L - 0.8) / 0.2)) / 1200); // a soft sigh down at a sad phrase end
    return hz * Math.pow(2, drift / 1200);
  };

  // ---- overlap-add resynthesis
  // Each output grain is a smooth blend of the two analysis periods around the current read position (aligned at their pitch
  // marks), so a held vowel evolves continuously instead of repeating or hopping between cycles: no buzz, ring, flutter or phasing.
  const y = new Float32Array(L + 4096);
  let mi = 0;
  for (let ts = 0; ts < L;) {
    const ta = A(ts);
    while (mi + 1 < marks.length && marks[mi + 1] <= ta) mi++;
    while (mi > 0 && marks[mi] > ta) mi--;
    const m0 = marks[mi], p0 = mper[mi], m1 = mi + 1 < marks.length ? marks[mi + 1] : m0, p1 = mi + 1 < marks.length ? mper[mi + 1] : p0;
    let step;
    if (p0 && p1) {
      const fr = m1 > m0 ? Math.max(0, Math.min(1, (ta - m0) / (m1 - m0))) : 0, pa = p0 + (p1 - p0) * fr;
      if (sing) { driftV += (rnd() - 0.5) * 0.8 - drift * 0.03; driftV *= 0.92; drift = Math.max(-7, Math.min(7, drift + driftV)); }
      let ratio = sing ? targetHz(ts) / (sr / pa) : sh.ratio; ratio = Math.max(0.5, Math.min(2.2, ratio || 1));
      /* real voices are never machine-perfect: ~0.5% cycle-to-cycle timing jitter and ~2% loudness shimmer while singing */
      step = (pa / ratio) * (sing ? 1 + (rnd() - 0.5) * 0.01 : 1); const half = Math.round(pa), w0 = Math.min(1, step / pa) * (sing ? 1 + (rnd() - 0.5) * 0.04 : 1), d0 = Math.round(ts);
      for (let k = -half; k <= half; k++) {
        const di = d0 + k; if (di < 0 || di >= y.length) continue;
        const a0 = m0 + k, a1 = m1 + k; const v0 = a0 >= 0 && a0 < N ? x[a0] : 0, v1 = a1 >= 0 && a1 < N ? x[a1] : 0;
        y[di] += (v0 * (1 - fr) + v1 * fr) * w0 * (0.5 + 0.5 * Math.cos((Math.PI * k) / half));
      }
    } else {
      const half = Math.round(sr * 0.005); step = half; // unvoiced (s, f, t...): copied at its own pace
      for (let k = -half; k <= half; k++) { const si = Math.round(ta) + k, di = Math.round(ts) + k; if (si < 0 || si >= N || di < 0 || di >= y.length) continue; y[di] += x[si] * (0.5 + 0.5 * Math.cos((Math.PI * k) / half)); }
    }
    ts += Math.max(8, step);
  }
  const out = y.slice(0, L);
  if (sing) {
    // phrasing: a gentle swell into held notes and a natural release at the end (emotion comes from dynamics as much as pitch)
    const sw = Math.round(L * 0.35);
    for (let i = 0; i < L; i++) { const a = i / L; let g = 1; if (sh.vib) g *= 0.9 + 0.1 * Math.min(1, i / Math.max(1, sw)); if (a > 0.82) g *= 1 - ((a - 0.82) / 0.18) * (sh.phraseEnd ? 0.55 : 0.25); out[i] *= g; }
    // a little air: very soft breath noise shaped by the voice itself keeps long notes from sounding synthetic
    let nb = 0; const br = sad ? 0.06 : 0.035; for (let i = 0; i < L; i++) { nb = 0.96 * nb + 0.04 * (rnd() * 2 - 1); out[i] += nb * Math.abs(out[i]) * br * 6; }
  }
  const fd = Math.min(L >> 2, Math.round(sr * 0.01)); for (let i = 0; i < fd; i++) { const a = i / fd; out[i] *= a; out[L - 1 - i] *= a; }
  return { pcm: out, f0 };
}

// one request at a time (the model is not re-entrant); requests queue in order
let chain = Promise.resolve();
self.onmessage = (ev) => {
  const msg = ev.data || {};
  if (msg.type === 'load') {
    load(msg.device).then(
      async (t) => {
        // warm-up: the first synthesis compiles GPU shaders / JIT paths and can take many seconds; do it before reporting ready,
        // and report how fast this device really is so slow devices can keep the fallback voices
        let rtf = 0;
        try { await t.generate('Hi.', { voice: 'af_heart' }); const t0 = performance.now(); const o = await t.generate('Hello there, this is a quick test.', { voice: 'am_michael' }); rtf = (performance.now() - t0) / 1000 / (o.audio.length / (o.sampling_rate || 24000)); } catch (e) { /* measured below on real lines */ }
        postMessage({ type: 'ready', voices: Object.keys(t.voices || {}), rtf });
      },
      (e) => postMessage({ type: 'error', id: -1, text: String((e && e.message) || e) })
    );
    return;
  }
  if (msg.type === 'gen') {
    chain = chain.then(async () => {
      try {
        const t = await load(msg.device);
        const out = await t.generate(String(msg.text || '').slice(0, 900), { voice: msg.voice || 'af_heart', speed: msg.speed || 1 });
        let pcm = out.audio instanceof Float32Array ? out.audio : new Float32Array(out.audio);
        const sr = out.sampling_rate || 24000;
        let f0 = 0;
        if (msg.shape) { const r = shape(pcm, sr, msg.shape); pcm = r.pcm; f0 = r.f0; }
        postMessage({ type: 'audio', id: msg.id, pcm, sr, f0 }, [pcm.buffer]);
      } catch (e) {
        postMessage({ type: 'error', id: msg.id, text: String((e && e.message) || e) });
      }
    });
  }
};
