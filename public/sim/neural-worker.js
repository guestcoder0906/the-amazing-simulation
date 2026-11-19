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
        const pcm = out.audio instanceof Float32Array ? out.audio : new Float32Array(out.audio);
        postMessage({ type: 'audio', id: msg.id, pcm, sr: out.sampling_rate || 24000 }, [pcm.buffer]);
      } catch (e) {
        postMessage({ type: 'error', id: msg.id, text: String((e && e.message) || e) });
      }
    });
  }
};
