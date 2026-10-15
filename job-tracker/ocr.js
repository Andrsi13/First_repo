/* Scan: on-device OCR (Tesseract.js) + work-order text parsing. */
(function (global) {
  'use strict';

  const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  const LOAD_TIMEOUT_MS = 120000;
  let workerPromise = null;
  let progressCb = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load the text reader. Check your internet connection (needed for the first scan only).'));
      document.head.appendChild(s);
    });
  }

  function withTimeout(promise, ms, msg) {
    let t;
    return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); })])
      .finally(() => clearTimeout(t));
  }

  function getWorker() {
    if (!workerPromise) {
      workerPromise = withTimeout((async () => {
        if (!global.Tesseract) await loadScript(TESSERACT_URL);
        return global.Tesseract.createWorker('eng', 1, { logger: m => progressCb && progressCb(m) });
      })(), LOAD_TIMEOUT_MS, 'Loading the text reader took too long. Check your connection and try again.')
        .catch(e => { workerPromise = null; throw e; });
    }
    return workerPromise;
  }

  // Black text on white from a screenshot or a photo of a screen.
  // Uses the red channel (white and black text both stand out from the app's
  // blue backgrounds), a global Otsu threshold, and treats the minority class
  // as ink — so dark-on-light (job card) and light-on-dark (blue End of Day
  // Summary) both come out as dark text.
  async function prepareImage(file) {
    const bmp = await createImageBitmap(file);
    const scale = Math.max(bmp.width, bmp.height) < 1200 ? 2 : 1;
    const w = bmp.width * scale, h = bmp.height * scale;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const n = w * h;

    const hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) hist[d[i * 4]]++;
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sB = 0, wB = 0, best = -1, thr = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (!wB) continue;
      const wF = n - wB;
      if (!wF) break;
      sB += t * hist[t];
      const mB = sB / wB, mF = (sum - sB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; thr = t; }
    }
    let above = 0;
    for (let t = thr + 1; t < 256; t++) above += hist[t];
    const lightText = above < n / 2;

    for (let i = 0; i < n; i++) {
      const r = d[i * 4];
      const ink = lightText ? r > thr : r <= thr;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = ink ? 0 : 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  const complete = j => j.type && j.jobId && ZIP_RE.test(j.address || '');

  // Read the image and return { jobs, text }. A quick pass first; if it misses
  // something (photos of screens are noisy), a slower "sparse text" pass whose
  // results are merged in.
  async function scan(file, settings, onProgress) {
    progressCb = onProgress;
    try {
      onProgress && onProgress({ status: 'loading text reader' });
      const worker = await getWorker();
      const canvas = await prepareImage(file);

      await worker.setParameters({ tessedit_pageseg_mode: '3' });
      const a = (await worker.recognize(canvas)).data.text || '';
      let jobs = parseWorkOrders(a, settings);
      let text = a;

      const expected = (a.match(/Jobs?\s+Completed\s*\((\d+)\)/i) || [])[1];
      const needMore = !jobs.length || jobs.some(j => !complete(j)) || (expected && jobs.length < +expected);
      if (needMore) {
        onProgress && onProgress({ status: 'second pass' });
        await worker.setParameters({ tessedit_pageseg_mode: '11' });
        const b = (await worker.recognize(canvas)).data.text || '';
        jobs = mergeJobs(jobs, parseWorkOrders(b, settings));
        text = a + '\n----- second pass -----\n' + b;
      }
      return { jobs, text };
    } finally {
      progressCb = null;
    }
  }

  const addrKey = a => (a || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);

  // Same job read twice? Same number, one number missing a digit ("73271" vs "173271"),
  // or the same street address.
  function sameJob(x, y) {
    if (x.jobId && x.jobId === y.jobId) return true;
    if (x.jobId && y.jobId && x.jobId.length >= 5 && y.jobId.length >= 5 &&
        (x.jobId.endsWith(y.jobId) || y.jobId.endsWith(x.jobId))) return true;
    const ka = addrKey(x.address), kb = addrKey(y.address);
    return ka.length >= 10 && ka === kb;
  }

  function mergeJobs(a, b) {
    const out = a.map(j => ({ ...j }));
    for (const j of b) {
      const m = out.find(x => sameJob(x, j) && (j.jobId || out.length === 1));
      if (!m) { out.push(j); continue; }
      if (j.jobId && j.jobId.length > (m.jobId || '').length) m.jobId = j.jobId;
      for (const k of ['type', 'level', 'timeWindow', 'woCode']) if (!m[k] && j[k]) m[k] = j[k];
      // prefer an address that ends with state + ZIP
      if (j.address && (!m.address || (!ZIP_RE.test(m.address) && ZIP_RE.test(j.address)))) m.address = j.address;
    }
    return out;
  }

  // ---------- auto-fixes for common misreads ----------

  const US_STATES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
  // valid first two ZIP digits for nearby states (extend as needed)
  const STATE_ZIP = {
    WI: ['53', '54'], IL: ['60', '61', '62'], MN: ['55', '56'], MI: ['48', '49'], IA: ['50', '51', '52'],
  };
  // digits OCR tends to confuse with each other
  const DIGIT_SWAPS = {
    0: '86', 1: '7', 3: '58', 4: '9', 5: '368', 6: '58', 7: '1', 8: '3560', 9: '4',
  };

  function fixState(st) {
    const up = st.toUpperCase();
    if (US_STATES.has(up)) return up;
    const alt = up.replace(/[1L|!]/g, 'I').replace(/0/g, 'O').replace(/5/g, 'S');
    return US_STATES.has(alt) ? alt : up;
  }

  function fixZip(zip, state) {
    const ok = STATE_ZIP[state];
    if (!ok || ok.includes(zip.slice(0, 2))) return zip;
    const tries = [];
    for (const a of DIGIT_SWAPS[zip[0]] || '') tries.push(a + zip.slice(1));
    for (const b of DIGIT_SWAPS[zip[1]] || '') tries.push(zip[0] + b + zip.slice(2));
    for (const a of DIGIT_SWAPS[zip[0]] || '') for (const b of DIGIT_SWAPS[zip[1]] || '') tries.push(a + b + zip.slice(2));
    return tries.find(z => ok.includes(z.slice(0, 2))) || zip;
  }

  function fixAddress(addr) {
    if (!addr) return addr;
    let a = addr.replace(/\s+/g, ' ').trim();
    // "4565S 23rd" -> "4565 S 23rd"
    a = a.replace(/^(\d{1,6})([NSEW])\s/, '$1 $2 ');
    // "3149 5 Howell" -> "3149 S Howell" (S read as 5)
    a = a.replace(/^(\d{1,6}) 5\.? (?=[A-Za-z0-9])/, '$1 S ');
    // "45655 23rd St" -> "4565 S 23rd St" (space lost and S read as 5, before a numbered street)
    a = a.replace(/^(\d{3,5})5 (\d{1,3}(?:st|nd|rd|th)\b)/i, '$1 S $2');
    // "WI153207" / "WI53207": stray character or missing space between state and ZIP
    a = a.replace(/\b([A-Za-z]{2})[1|l]?(\d{5})$/, '$1 $2');
    // state + ZIP at the end
    a = a.replace(/\b([A-Za-z0-9|!]{2})(\.?,?\s+)(\d{5})((?:-\d{4})?)$/, (all, st, sep, zip, plus4) => {
      const state = fixState(st);
      return state + sep + fixZip(zip, state) + plus4;
    });
    return a;
  }

  // ---------- parsing ----------

  const JOB_RE = /\bJ[o0]b\s*[#H*]?\s*:?\s*(\d{5,})/i;
  const TIME_RE = /(\d{1,2})(?::(\d{2}))?\s*[-–—~_.]\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp])\s*[pP]?\s*[Mm]/;
  // state + ZIP, e.g. "WI 53221" (a lone 5-digit number may be a misread house number)
  const ZIP_RE = /\b[A-Za-z][A-Za-z1|!]\.?,?\s+\d{5}(?:-\d{4})?\b/;
  const STREET_START_RE = /\b(\d{1,6})([NSEW])?\s+[A-Za-z0-9]/;

  function words(s) {
    return (s.toUpperCase().match(/[A-Z0-9]+/g) || []);
  }

  function matchType(tokens, settings) {
    for (const t of settings.jobTypes) {
      if (t.hidden) continue;
      const kws = (t.keywords || []).map(k => k.toUpperCase());
      if (tokens.some(w => kws.includes(w))) return t.code;
    }
    // OCR sometimes glues words together ("NCHSD"): fall back to prefix match
    for (const t of settings.jobTypes) {
      if (t.hidden) continue;
      const kws = (t.keywords || []).map(k => k.toUpperCase()).filter(k => k.length >= 2);
      if (tokens.some(w => /^[A-Z]+$/.test(w) && kws.some(k => w.startsWith(k)))) return t.code;
    }
    return null;
  }

  function matchLevel(tokens, settings) {
    for (const l of settings.levels) {
      const kws = (l.keywords || []).map(k => k.toUpperCase());
      if (tokens.some(w => kws.includes(w))) return l.name;
    }
    // glued words ("RESCUESISP"): match on the end of the last word
    const last = tokens[tokens.length - 1] || '';
    for (const l of settings.levels) {
      const kws = (l.keywords || []).map(k => k.toUpperCase()).filter(k => k.length >= 2);
      if (kws.some(k => last.length > k.length && last.endsWith(k))) return l.name;
    }
    return null;
  }

  function codeWords(s) {
    return words(s).filter(w => /^[A-Z]{2,}$/.test(w));
  }

  function parseBlock(jobId, lines, settings) {
    let timeWindow = '';
    let woCode = '';
    for (const line of lines) {
      const m = line.match(TIME_RE);
      if (m) {
        const t = (h, mm) => h + (mm ? ':' + mm : '');
        timeWindow = `${t(m[1], m[2])} - ${t(m[3], m[4])} ${m[5].toUpperCase()}M`;
        // the code follows the time window on the same line
        woCode = codeWords(line.slice(m.index + m[0].length)).join(' ');
        break;
      }
    }

    let tokens = words(woCode);
    let type = matchType(tokens, settings);
    if (!type) {
      // code on its own line, or the time was unreadable: look for a type word in the block
      for (const line of lines) {
        if (STREET_START_RE.test(line) && !TIME_RE.test(line)) continue; // skip address lines
        const tk = codeWords(line);
        const t = matchType(tk, settings);
        if (t) { type = t; woCode = tk.join(' '); tokens = tk; break; }
      }
    }
    const level = matchLevel(tokens, settings);

    // Address: a line starting with a house number, up to "ST 12345" (may wrap).
    // Prefer a candidate that reaches a ZIP; photos can produce junk like "4 gy".
    const candidates = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (TIME_RE.test(line) || JOB_RE.test(line)) continue;
      const m = line.match(STREET_START_RE);
      if (!m) continue;
      // "4565S 23rd" -> "4565 S 23rd"
      const parts = [line.slice(m.index).replace(/^(\d{1,6})([NSEW])\s/, '$1 $2 ').trim()];
      let j = i;
      while (!ZIP_RE.test(parts.join(' ')) && j + 1 < lines.length && j < i + 2) {
        j++;
        if (JOB_RE.test(lines[j]) || TIME_RE.test(lines[j])) break;
        const next = lines[j].trim();
        parts.push(next);
        if (/^\d{5}(-\d{4})?\b/.test(next)) break; // ZIP on its own line
      }
      let text = parts.join(' ').replace(/\s+/g, ' ').replace(/\s+,/g, ',');
      const z = text.match(ZIP_RE) || text.match(/,\s*\d{5}(?:-\d{4})?\b/);
      if (z) {
        text = text.slice(0, z.index + z[0].length)
          .replace(/\b([A-Za-z]{2})(\.?,?\s+\d{5}(?:-\d{4})?)$/, (all, st, rest) => st.toUpperCase() + rest);
      } else {
        text = parts[0];
      }
      text = text.replace(/[|]+\s*$/, '').trim();
      const plausible = (text.match(/[A-Za-z]{2,}/g) || []).length >= 2;
      if (plausible) candidates.push({ text, zip: !!z });
    }
    const pick = candidates.find(c => c.zip) || candidates[0];
    const address = pick ? fixAddress(pick.text) : '';

    return { jobId, woCode, type, level, address, timeWindow };
  }

  function parseWorkOrders(text, settings) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const starts = [];
    lines.forEach((l, i) => { const m = l.match(JOB_RE); if (m) starts.push({ i, id: m[1] }); });
    const out = [];
    starts.forEach((s, k) => {
      const end = k + 1 < starts.length ? starts[k + 1].i : lines.length;
      const first = lines[s.i];
      const rest = first.slice(first.match(JOB_RE).index).replace(JOB_RE, '');
      const block = (rest.trim() ? [rest] : []).concat(lines.slice(s.i + 1, end));
      out.push(parseBlock(s.id, block, settings));
    });
    // no "Job #" (e.g. only part of the screen was copied): treat it all as one job
    if (!starts.length && lines.length) {
      const j = parseBlock('', lines, settings);
      if (j.type || j.address) out.push(j);
    }
    // the same job can show up twice (e.g. a misread number): merge duplicates
    const merged = out.length ? mergeJobs([out[0]], out.slice(1)) : out;
    // de-duplicate by job id (same job read twice)
    const seen = new Set();
    return merged.filter(j => !j.jobId || (!seen.has(j.jobId) && seen.add(j.jobId)));
  }

  global.OCR = { scan, parseWorkOrders, fixAddress };
  if (typeof module !== 'undefined') module.exports = { parseWorkOrders, mergeJobs, fixAddress };
})(typeof window !== 'undefined' ? window : globalThis);
