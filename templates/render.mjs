// Renders a scene page (HTML with renderAt(t)) to an MP4 in 1920 x 1080 at 30 fps.
// Usage: node render.mjs <page.html> <seconds> <out.mp4> [music.mp3] [music-dB] [music-start-s]
// Sound effects on top: SFX="ready.mp3@1.0@-4,boss.mp3@12.5" (file@second@dB)
// Needs Google Chrome and ffmpeg. Set CHROME to your Chrome binary if it is not in the default place.
// The page must call window.renderAt(t) and set document.body.dataset.ready = "1" when it is ready.
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import net from 'node:net';

const [page, durArg, outArg, music, gainArg = '-12', startArg = '0'] = process.argv.slice(2);
if (!page || !durArg || !outArg) { console.error('Usage: see the top of this file'); process.exit(1); }
const DURATION = +durArg, FPS = 30, OUT = resolve(outArg);
const CHROME = process.env.CHROME || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'google-chrome');
const WORK = mkdtempSync(join(tmpdir(), 'render-'));
mkdirSync(join(WORK, 'frames'));

// Start a headless Chrome and talk to it over the DevTools protocol
const port = await new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(WORK, 'profile')}`,
  '--hide-scrollbars', '--window-size=1920,1080', '--force-device-scale-factor=1', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets = [];
for (let i = 0; i < 100; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.find(t => t.type === 'page')) break; } catch {}
  await sleep(200);
}
const target = targets.find(t => t.type === 'page');
if (!target) { chrome.kill(); throw new Error('Chrome did not start'); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const { r, j } = pending.get(m.id); pending.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result); } };
const send = (method, params = {}) => new Promise((r, j) => { const i = ++id; pending.set(i, { r, j }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails)); return res.result.value; };

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file://' + resolve(page) + '?render=1' });
for (let i = 0; ; i++) {
  let ok = false; try { ok = await ev('document.body && document.body.dataset.ready === "1"'); } catch {}
  if (ok) break; if (i > 150) throw new Error('Page not ready'); await sleep(100);
}

// One screenshot per frame
const frames = Math.round(DURATION * FPS);
for (let n = 0; n < frames; n++) {
  await ev(`renderAt(${n / FPS})`);
  await ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))');
  const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
  writeFileSync(join(WORK, 'frames', `f_${String(n).padStart(5, '0')}.png`), Buffer.from(data, 'base64'));
  if (n % 150 === 0) console.log(`frame ${n}/${frames}`);
}
try { await send('Browser.close'); } catch {}
ws.close(); await sleep(500); try { chrome.kill(); } catch {}

// ffmpeg: frames to video, music with fade in and out, sound effects on top
const video = ['-framerate', String(FPS), '-i', join(WORK, 'frames', 'f_%05d.png')];
const enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
let args;
if (!music) args = [...video, ...enc, OUT];
else {
  const musicFx = `volume=${gainArg}dB,afade=t=in:st=0:d=0.6,afade=t=out:st=${Math.max(0, DURATION - 0.8)}:d=0.8`;
  const sfx = (process.env.SFX || '').split(',').filter(Boolean).map(s => { const [f, at, db = '0'] = s.split('@'); return { f: resolve(f), at: +at, db: +db }; });
  const audio = sfx.length
    ? ['-filter_complex', `[1:a]${musicFx}[m];` + sfx.map((s, i) => `[${i + 2}:a]adelay=${Math.round(s.at * 1000)}:all=1,volume=${s.db}dB[s${i}];`).join('')
        + `[m]${sfx.map((_, i) => `[s${i}]`).join('')}amix=inputs=${sfx.length + 1}:normalize=0:duration=first[a]`, '-map', '0:v', '-map', '[a]']
    : ['-af', musicFx];
  args = [...video, '-ss', startArg, '-t', String(DURATION), '-i', music, ...sfx.flatMap(s => ['-i', s.f]), ...audio, ...enc, '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT];
}
const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
if (ff.status !== 0) process.exit(ff.status || 1);
console.log('done:', OUT);
