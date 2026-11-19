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
    let best = 0, bl = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let s = 0, e1 = 0; for (let k = 0; k < W; k += 2) { s += x[c + k] * x[c + k + lag]; e1 += x[c + k + lag] * x[c + k + lag]; }
      const r = s / Math.sqrt((e0 / 2) * e1 + 1e-12); if (r > best) { best = r; bl = lag; }
    }
    if (best > 0.5 && bl) f[i] = sr / bl;
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
// shape = { ratio } (constant pitch factor, speech) or { notes:[Hz per syllable], target:seconds, vib:bool, trim:bool } (singing)
function shape(x, sr, sh) {
  if (sh.trim) x = trimSilence(x, sr);
  const hop = Math.round(sr * 0.005), f = pitchTrack(x, sr, hop), f0 = median(f) || 0;
  const sing = Array.isArray(sh.notes) && sh.notes.length;
  if (!sing && (!sh.ratio || Math.abs(sh.ratio - 1) < 0.004)) return { pcm: x, f0 };
  const N = x.length, stretch = sing && sh.target ? Math.max(0.5, Math.min(4, (sh.target * sr) / N)) : 1, L = Math.round(N * stretch);
  const per = (i) => { const v = f[Math.min(f.length - 1, Math.max(0, Math.round(i / hop)))]; return v > 0 ? sr / v : 0; };
  // analysis marks: one per pitch period in voiced parts (snapped to the local peak), every 5 ms elsewhere
  const marks = [], mper = [];
  for (let t = 0; t < N;) {
    const p = per(t);
    if (p) { let b = t, bv = -1; const r = Math.round(p * 0.4); for (let k = Math.max(0, t - r); k <= Math.min(N - 1, t + r); k++) if (Math.abs(x[k]) > bv) { bv = Math.abs(x[k]); b = k; } if (!marks.length || b > marks[marks.length - 1]) { marks.push(b); mper.push(p); } t = b + Math.max(16, Math.round(p)); }
    else { marks.push(t); mper.push(0); t += Math.round(sr * 0.005); }
  }
  // target pitch over output time
  const ns = sing ? sh.notes.length : 1, glide = 0.045 * sr;
  const targetHz = (ts) => {
    if (!sing) return 0;
    const pos = (ts / L) * ns, k = Math.min(ns - 1, Math.floor(pos)); let hz = sh.notes[k];
    const into = (pos - k) * (L / ns); if (k > 0 && into < glide) { const a = into / glide, prev = sh.notes[k - 1]; hz = prev * Math.pow(hz / prev, a * a * (3 - 2 * a)); }
    if (sh.vib) { const tt = ts / sr, held = Math.max(0, Math.min(1, (ts / L - 0.35) / 0.4)); hz *= Math.pow(2, (held * (sh.vibDepth || 22) * Math.sin(2 * Math.PI * (sh.vibRate || 5.3) * tt)) / 1200); }
    return hz;
  };
  const y = new Float32Array(L + 2048), wsum = new Float32Array(L + 2048);
  let mi = 0;
  for (let ts = 0; ts < L;) {
    const ta = ts / stretch; while (mi + 1 < marks.length && Math.abs(marks[mi + 1] - ta) <= Math.abs(marks[mi] - ta)) mi++;
    const m = marks[mi], pa = mper[mi];
    let step;
    if (pa) {
      let ratio = sing ? targetHz(ts) / (sr / pa) : sh.ratio; ratio = Math.max(0.5, Math.min(2.2, ratio || 1));
      step = pa / ratio; const half = Math.round(pa);
      for (let k = -half; k <= half; k++) { const si = m + k, di = Math.round(ts) + k; if (si < 0 || si >= N || di < 0 || di >= y.length) continue; const w = 0.5 + 0.5 * Math.cos((Math.PI * k) / (half + 1)); y[di] += x[si] * w; wsum[di] += w; }
    } else {
      // unvoiced (s, f, t...): copy short overlapping noise grains at the original rate
      const half = Math.round(sr * 0.005); step = half;
      for (let k = -half; k <= half; k++) { const si = Math.round(ta) + k, di = Math.round(ts) + k; if (si < 0 || si >= N || di < 0 || di >= y.length) continue; const w = 0.5 + 0.5 * Math.cos((Math.PI * k) / (half + 1)); y[di] += x[si] * w; wsum[di] += w; }
    }
    ts += Math.max(8, step);
  }
  const out = new Float32Array(L);
  for (let i = 0; i < L; i++) out[i] = wsum[i] > 0.15 ? y[i] / wsum[i] : y[i];
  // short fades so every clip starts and ends without a click
  const fd = Math.min(L >> 2, Math.round(sr * 0.008)); for (let i = 0; i < fd; i++) { const a = i / fd; out[i] *= a; out[L - 1 - i] *= a; }
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
