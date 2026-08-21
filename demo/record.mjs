/**
 * Records the demo film as one continuous browser session.
 *
 * Nothing here is a still: the pipeline animates, the score counts up, the
 * page really scrolls, and every click is a real click driven through the
 * input pipeline. A synthetic cursor is drawn on top so the viewer can see
 * where the pointer goes, because a headless browser renders none.
 *
 * Beat lengths come from the narration, so the picture stays locked to the
 * voice no matter which voice is used.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "/Users/dhrumiljoshi96/Documents/Hackathons/Devnetwork/launchpilot/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME =
  "/Users/dhrumiljoshi96/.cache/puppeteer/chrome/mac_arm-151.0.7922.71/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const BASE = "http://localhost:3000";
const W = 1920;
const H = 1080;

const REPORT = process.argv[2];
const XREPORT = process.argv[3];
const OUT = process.argv[4] ?? path.join(HERE, "session.webm");
const timings = JSON.parse(fs.readFileSync(path.join(HERE, "timings.json"), "utf8"));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* A drawn cursor, since headless Chrome renders none                   */
/* ------------------------------------------------------------------ */
const CURSOR = `
(() => {
  if (window.__cursor) return;
  const el = document.createElement('div');
  el.id = '__cursor';
  el.style.cssText = [
    'position:fixed','z-index:2147483647','pointer-events:none','left:0','top:0',
    'width:22px','height:22px','margin:-2px 0 0 -2px','transition:none',
    'filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))'
  ].join(';');
  el.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22">' +
    '<path d="M5 2l14 8.4-6.1 1.2 3.2 6.6-2.7 1.3-3.2-6.6-4 3.6z" fill="#0F172A" stroke="#fff" stroke-width="1.3"/></svg>';
  document.body.appendChild(el);

  let x = window.innerWidth * 0.5, y = window.innerHeight * 0.62;
  const put = () => { el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  put();

  window.__cursor = {
    get pos() { return { x, y }; },
    set(nx, ny) { x = nx; y = ny; put(); },
    async glide(nx, ny, ms) {
      const sx = x, sy = y, t0 = performance.now();
      return new Promise((done) => {
        const step = (t) => {
          const p = Math.min(1, (t - t0) / ms);
          const e = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p + 2, 3) / 2;
          x = sx + (nx - sx) * e; y = sy + (ny - sy) * e; put();
          p < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      });
    },
    ripple() {
      const r = document.createElement('div');
      r.style.cssText = [
        'position:fixed','z-index:2147483646','pointer-events:none',
        'left:' + x + 'px','top:' + y + 'px','width:12px','height:12px',
        'margin:-6px 0 0 -6px','border-radius:999px',
        'border:2px solid rgba(12,59,42,.55)','opacity:1'
      ].join(';');
      document.body.appendChild(r);
      r.animate(
        [{ transform: 'scale(1)', opacity: .9 }, { transform: 'scale(4.2)', opacity: 0 }],
        { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' }
      ).onfinish = () => r.remove();
    }
  };
})();
`;

/**
 * A spotlight. Dims the page everywhere except a rounded window over whatever
 * the narrator is talking about, so the viewer's eye goes where the voice does.
 */
const SPOTLIGHT = `
(() => {
  if (window.__spot) return;
  const el = document.createElement('div');
  el.id = '__spot';
  el.style.cssText = [
    'position:fixed','z-index:2147483645','pointer-events:none','border-radius:14px',
    'opacity:0','transition:opacity .45s ease, all .55s cubic-bezier(.22,1,.36,1)',
    'box-shadow:0 0 0 9999px rgba(13,42,30,.34)','left:50%','top:50%','width:0','height:0'
  ].join(';');
  document.body.appendChild(el);

  window.__spot = {
    on(rect, pad = 16) {
      el.style.left = (rect.left - pad) + 'px';
      el.style.top = (rect.top - pad) + 'px';
      el.style.width = (rect.width + pad * 2) + 'px';
      el.style.height = (rect.height + pad * 2) + 'px';
      el.style.opacity = '1';
    },
    off() { el.style.opacity = '0'; }
  };

  // Finders, so Node can spotlight things without brittle class selectors.
  window.__find = {
    score: () => [...document.querySelectorAll('.lp-display')]
      .find((e) => /^\\d{1,3}$/.test(e.textContent.trim()) && e.getBoundingClientRect().height > 70),
    sensitivity: () => [...document.querySelectorAll('p')]
      .find((e) => /points from|strongest verdict/.test(e.textContent)),
    coverage: () => document.querySelector('#on-the-record dl'),
    citation: () => document.querySelector('#the-field .lp-margin-note')?.parentElement,
    ledger: () => document.querySelector('main dl.grid'),
  };
})();
`;

/** Eased programmatic scroll — reads like someone reading, not a jump. */
const SCROLLER = `
window.__scrollTo = (top, ms) => new Promise((done) => {
  const start = window.scrollY, delta = top - start, t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    const e = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2) / 2;
    window.scrollTo(0, start + delta * e);
    p < 1 ? requestAnimationFrame(step) : done();
  };
  requestAnimationFrame(step);
});
window.__chapterTop = (id, offset = 56) => {
  const el = document.getElementById(id);
  return el ? el.getBoundingClientRect().top + window.scrollY - offset : 0;
};
`;

async function dress(page) {
  await page.evaluate(CURSOR);
  await page.evaluate(SCROLLER);
  await page.evaluate(SPOTLIGHT);
}

/** Spotlights a named target for a while, then releases it. */
async function focusOn(page, name, ms, pad = 18) {
  const found = await page.evaluate((key, padding) => {
    const el = window.__find[key]?.();
    if (!el) return false;
    const r = el.getBoundingClientRect();
    window.__spot.on({ left: r.left, top: r.top, width: r.width, height: r.height }, padding);
    return true;
  }, name, pad);
  if (!found) return;
  await wait(ms);
  await page.evaluate(() => window.__spot.off());
  await wait(400);
}

async function clickAt(page, selectorOrPoint, { glide = 700 } = {}) {
  const point =
    typeof selectorOrPoint === "string"
      ? await page.evaluate((sel) => {
          const el = [...document.querySelectorAll("button, a")].find((n) =>
            n.textContent.trim().includes(sel),
          );
          if (!el) throw new Error("no element containing " + sel);
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }, selectorOrPoint)
      : selectorOrPoint;

  await page.evaluate((p, ms) => window.__cursor.glide(p.x, p.y, ms), point, glide);
  await wait(glide + 90);
  await page.mouse.move(point.x, point.y);
  await page.evaluate(() => window.__cursor.ripple());
  await page.mouse.click(point.x, point.y);
  await wait(140);
}

/** Waits until the page has actually stopped moving before measuring anything. */
async function settle(page, timeout = 3000) {
  const started = Date.now();
  let last = -1;
  let stableFor = 0;
  while (Date.now() - started < timeout) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    stableFor = y === last ? stableFor + 100 : 0;
    if (stableFor >= 300) return;
    last = y;
    await wait(100);
  }
}

async function scrollToChapter(page, id, ms) {
  await page.evaluate(
    (chapter, duration) => window.__scrollTo(window.__chapterTop(chapter), duration),
    id,
    ms,
  );
  await wait(ms + 120);
}

/* ------------------------------------------------------------------ */

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [`--window-size=${W},${H}`, "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

const card = (name) => `file://${HERE}/cards/${name}.html`;
await page.goto(card("card-hook"), { waitUntil: "networkidle0" });

const recorder = await page.screencast({ path: OUT, ffmpegPath: "/opt/homebrew/bin/ffmpeg" });
const t0 = Date.now();
const marks = {};

/**
 * Each beat owns a fixed slice of the timeline. Navigation, clicks and scrolls
 * all happen inside that slice, so overhead never pushes the picture out of
 * step with the voice.
 */
async function beat(id, label, action) {
  const startedAt = Date.now();
  marks[id] = (startedAt - t0) / 1000;
  console.log(`  ${marks[id].toFixed(1).padStart(6)}s  ${label}`);
  if (action) await action();
  const remaining = timings[id] * 1000 - (Date.now() - startedAt);
  if (remaining > 0) await wait(remaining);
}

try {
  await beat("01", "card-hook");

  await beat("02", "card-brand", async () => {
    await page.goto(card("card-brand"), { waitUntil: "networkidle0" });
  });

  // 03 · type the idea in, like a person would
  await beat("03", "typing", async () => {
    await page.goto(BASE, { waitUntil: "networkidle0" });
    await dress(page);
    await wait(700);
    const box = await page.evaluate(() => {
      const el = document.querySelector("textarea");
      const r = el.getBoundingClientRect();
      return { x: r.left + 260, y: r.top + 44 };
    });
    await page.evaluate((p, ms) => window.__cursor.glide(p.x, p.y, ms), box, 800);
    await wait(880);
    await page.mouse.click(box.x, box.y);
    await page.evaluate(() => window.__cursor.ripple());
    await page.keyboard.type(
      "An AI meal planner for Indian families that plans a week of home-cooked meals and builds the grocery list.",
      { delay: 26 },
    );
  });

  await beat("04", "click → pipeline", async () => {
    await clickAt(page, "Run the recorded demo", { glide: 900 });
  });

  await beat("05", "searches", async () => {
    await page.waitForSelector("section#the-idea", { timeout: 20000 });
    await dress(page);
  });

  // 06 · hold on the number, then put a light on it
  await beat("06", "verdict", async () => {
    await wait(1200);
    await focusOn(page, "score", 3400, 26);
  });

  // 07 · the ledger, then the line that explains it
  await beat("07", "sensitivity", async () => {
    await page.evaluate(() => window.__scrollTo(520, 1500));
    await wait(1700);
    await focusOn(page, "sensitivity", 5200, 16);
  });

  // 08 · the register, filtered live
  await beat("08", "exhibits", async () => {
    await scrollToChapter(page, "exhibits", 1700);
    await wait(600);
    await clickAt(page, "Customer pain", { glide: 700 });
    await wait(1400);
    await clickAt(page, "All", { glide: 500 });
  });

  // 09 · a competitor, and the exhibit it came from
  await beat("09", "the field", async () => {
    await scrollToChapter(page, "the-field", 1600);
    await wait(900);
    const chip = await page.evaluate(() => {
      const el = window.__find.citation();
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (chip) {
      await page.evaluate((p, ms) => window.__cursor.glide(p.x, p.y, ms), chip, 700);
      await page.mouse.move(chip.x, chip.y);
      await wait(300);
      await focusOn(page, "citation", 3200, 14);
    }
  });

  await beat("10", "orders", async () => {
    await scrollToChapter(page, "orders", 2400);
  });

  // 11 · it marks its own homework
  await beat("11", "on the record", async () => {
    await scrollToChapter(page, "on-the-record", 1700);
    await wait(700);
    await focusOn(page, "coverage", 4600, 20);
  });

  await beat("12", "cross-examined", async () => {
    await page.goto(`${BASE}/r/${XREPORT}`, { waitUntil: "networkidle0" });
    await dress(page);
    await wait(1400);
    await focusOn(page, "score", 3000, 26);
  });

  // 13 · the palette, then the document itself
  await beat("13", "palette → brief", async () => {
    await page.goto(`${BASE}/r/${REPORT}`, { waitUntil: "networkidle0" });
    await dress(page);
    await wait(400);
    await page.keyboard.down("Meta");
    await page.keyboard.press("k");
    await page.keyboard.up("Meta");
    await wait(500);
    await page.keyboard.type("record", { delay: 95 });
    await wait(500);
    await page.keyboard.press("Enter");
    // The palette scrolls smoothly; measuring mid-flight would miss the button.
    await settle(page);
    await clickAt(page, "Generate Launch Brief", { glide: 650 });

    // Belt and braces: if the modal did not open, aim once more.
    const opened = await page
      .waitForSelector('[aria-label="Launch brief"]', { timeout: 2500 })
      .then(() => true)
      .catch(() => false);
    if (!opened) {
      await clickAt(page, "Generate Launch Brief", { glide: 250 });
      await page.waitForSelector('[aria-label="Launch brief"]', { timeout: 4000 });
    }
    await wait(250);
  });

  await beat("14", "card-close", async () => {
    await page.goto(card("card-close"), { waitUntil: "networkidle0" });
  });

  await wait(500);
} finally {
  await recorder.stop();
  await browser.close();
  fs.writeFileSync(path.join(HERE, "beats.json"), JSON.stringify(marks, null, 1));
}
console.log(`\nrecorded ${((Date.now() - t0) / 1000).toFixed(1)}s → ${OUT}`);
