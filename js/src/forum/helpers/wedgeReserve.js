/**
 * Keep the post's text out from under the club wedge.
 *
 * The wedge is drawn as a pseudo-element pinned to the bottom-right of
 * .Post-body, and the last line or two of a long post ran straight under it —
 * worst with `text-align: justify`, where every line but the last reaches the
 * right edge.
 *
 * 🚨 The text has to WRAP around the wedge, not be pushed below it. Bottom
 * padding the height of the wedge would clear it too, but it adds ~50px of
 * blank card to every post on the forum, and a one-line reply becomes mostly
 * empty space.
 *
 * So two floats go in at the very START of the body, because a float only
 * shortens the lines that come AFTER it:
 *
 *   - a zero-width "gap" float as tall as the content minus the wedge's band,
 *   - then (clear: right) a "curve" float exactly the wedge's footprint, with
 *     a shape-outside matching the wedge's own rounded edge.
 *
 * Together they reserve the bottom-right corner of the content box, and the
 * last lines wrap short around the curve. The zero-width gap narrows nothing,
 * so a code block or table higher up the post keeps its full width.
 *
 * 🚨 The gap's height depends on the content's height, which the reserve can
 * itself change (a line that wraps short can add a line). So the fit measures
 * the natural height with the floats out, places them, and grows until the
 * floats' bottom meets the last line. .Post-body is a flow root (see the LESS),
 * so the floats count towards its height and the fit only ever grows: it
 * settles in at most a few passes and cannot oscillate.
 *
 * 🚨 Every post is fitted in ONE batched frame, reads and writes in separate
 * phases. Fitting each post on its own forces a layout per post per pass, and
 * a page of twenty posts would stall the stream as it loads.
 */

const GAP = 'FavTeam-reserveGap';
const CURVE = 'FavTeam-reserveCurve';

const dirty = new Set();
let frame = null;

function ensureFloats(body) {
  let gap = body.firstElementChild;
  let curve = gap && gap.nextElementSibling;

  if (gap && gap.classList.contains(GAP) && curve && curve.classList.contains(CURVE)) {
    return { gap, curve };
  }

  // A stale pair (moved by a re-render) is removed before a fresh one goes in
  // at the very top, where a float has to be to affect the lines below it.
  removeFloats(body);

  gap = document.createElement('span');
  gap.className = GAP;
  gap.setAttribute('aria-hidden', 'true');
  curve = document.createElement('span');
  curve.className = CURVE;
  curve.setAttribute('aria-hidden', 'true');

  body.insertBefore(curve, body.firstChild);
  body.insertBefore(gap, curve);

  return { gap, curve };
}

export function removeFloats(body) {
  if (!body) return;
  body.querySelectorAll(':scope > .' + GAP + ', :scope > .' + CURVE).forEach((el) => el.remove());
}

function px(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function innerHeight(body, box) {
  return body.getBoundingClientRect().height - box.borderT - box.borderB - box.padT - box.padB;
}

// Breathing room between the last words and the wedge's edge.
const MARGIN = 8;

/**
 * The wedge's rounded edge as a polygon, in the curve float's margin box.
 *
 * 🚨 Not `ellipse()` + `shape-margin`. A shape-margin also widens the shape
 * at its very TOP, so a line box that dipped a fraction of a pixel into the
 * band was cut short by ~30px: a two-line reply wrapped to three, the fit grew
 * to make room, and the post kept a blank line it never needed. The polygon
 * widens the curve sideways only, and starts half a line's leading below the
 * band's top — the part of a line box that holds no glyphs.
 */
function curveShape(job, h) {
  const boxW = job.bandW + MARGIN; // the float's width plus its margin-left
  const cx = boxW + job.box.padR; // the wedge's corner: padding-box bottom-right
  const cy = h + job.box.padB;
  const rx = job.W + MARGIN;
  const ry = job.H;
  const top = Math.min(job.tol, h);
  const points = [boxW + 'px ' + top + 'px'];

  for (let i = 0; i <= 12; i++) {
    const y = top + ((h - top) * i) / 12;
    const t = Math.max(0, 1 - Math.pow((cy - y) / ry, 2));
    const x = Math.min(boxW, Math.max(0, cx - rx * Math.sqrt(t)));
    points.push(x.toFixed(1) + 'px ' + y.toFixed(1) + 'px');
  }

  points.push(boxW + 'px ' + h + 'px');

  return 'polygon(' + points.join(', ') + ')';
}

function run() {
  frame = null;

  const jobs = [];
  dirty.forEach((body) => {
    if (body.isConnected) jobs.push({ body });
  });
  dirty.clear();

  // Phase 1 (read): the wedge's size and the body's box.
  jobs.forEach((job) => {
    const cs = getComputedStyle(job.body);
    const wedge = getComputedStyle(job.body, '::after');
    const W = px(wedge.width);
    const H = px(wedge.height);

    job.box = {
      padT: px(cs.paddingTop),
      padB: px(cs.paddingBottom),
      padR: px(cs.paddingRight),
      borderT: px(cs.borderTopWidth),
      borderB: px(cs.borderBottomWidth),
    };

    // The part of the wedge that reaches into the content box.
    job.bandW = W - job.box.padR;
    job.bandH = H - job.box.padB;
    job.W = W;
    job.H = H;
    // Half the leading: how far a line box can dip into the band before any
    // GLYPH is actually near the wedge.
    const fontSize = px(cs.fontSize);
    const lineHeight = cs.lineHeight === 'normal' ? fontSize * 1.2 : px(cs.lineHeight);
    job.tol = Math.min(6, Math.max(0, (lineHeight - fontSize) / 2));
    job.on = wedge.content !== 'none' && wedge.display !== 'none' && job.bandW > 0 && job.bandH > 0;
  });

  // Phase 2 (write): take the floats out to measure the natural height.
  jobs.forEach((job) => {
    if (!job.on) {
      removeFloats(job.body);
      return;
    }
    const { gap, curve } = ensureFloats(job.body);
    job.gap = gap;
    job.curve = curve;
    gap.style.display = 'none';
    curve.style.display = 'none';
  });

  const live = jobs.filter((job) => job.on);

  // Phase 3 (read): the natural content height.
  live.forEach((job) => {
    job.n = innerHeight(job.body, job.box);
  });

  // Phase 4: place, re-measure, grow. Monotone, so a few passes settle it.
  for (let pass = 0; pass < 4 && live.length; pass++) {
    live.forEach((job) => {
      if (job.settled) return;
      // A post shorter than the band gets a curve only as tall as the post,
      // so the reserve never makes a short post taller on its own.
      const h = Math.max(0, Math.min(job.bandH, job.n));
      const { gap, curve, box } = job;

      gap.style.display = '';
      gap.style.height = Math.max(0, job.n - h) + 'px';

      curve.style.display = '';
      curve.style.width = job.bandW + 'px';
      curve.style.height = h + 'px';
      // The wedge's rounded edge, centred where the wedge's own corner is:
      // the bottom-right of the body's padding box.
      curve.style.shapeOutside = curveShape(job, h);
    });

    let grew = false;
    live.forEach((job) => {
      if (job.settled) return;
      const next = innerHeight(job.body, job.box);
      if (next > job.n + 0.5) {
        job.n = next;
        grew = true;
      } else {
        job.settled = true;
      }
    });

    if (!grew) break;
  }
}

/** Queue a post body for fitting on the next frame. */
export function scheduleFit(body) {
  if (!body) return;
  dirty.add(body);
  if (frame === null) frame = requestAnimationFrame(run);
}

const observers = new Map();

/*
 * 🚨 A web font swapping in can make the text SHORTER, and a shorter body is
 * invisible to the observer: the reserve's floats are what hold the body's
 * height, so it does not change. Measured on a phone: a two-line reply that
 * had been fitted against the fallback font kept a third line of blank card
 * after the real font arrived. Every watched post is refitted once the fonts
 * finish loading.
 */
if (typeof document !== 'undefined' && document.fonts && document.fonts.addEventListener) {
  document.fonts.addEventListener('loadingdone', () => {
    observers.forEach((ro, body) => scheduleFit(body));
  });
}

/**
 * Fit now and keep fitting: the width changes with the viewport, and the
 * height when an image or embed in the post finishes loading or fonts swap
 * in. The observer's own callback only queues a fit, so a fit that changes
 * the body's size is picked up next frame and settles to the same result.
 */
const keys = new WeakMap();

export function watch(body, key) {
  if (!body) return;

  // A reserve that is in place for this content needs nothing more; the
  // observer below catches every change of size.
  const placed = body.firstElementChild && body.firstElementChild.classList.contains(GAP);
  if (observers.has(body) && keys.get(body) === key && placed) return;
  keys.set(body, key);
  scheduleFit(body);

  if (observers.has(body) || typeof ResizeObserver === 'undefined') return;

  let lastW = null;
  let lastH = null;
  const ro = new ResizeObserver((entries) => {
    const r = entries[entries.length - 1].contentRect;
    if (r.width === lastW && r.height === lastH) return;
    lastW = r.width;
    lastH = r.height;
    scheduleFit(body);
  });
  ro.observe(body);
  observers.set(body, ro);
}

export function unwatch(body) {
  if (!body) return;
  const ro = observers.get(body);
  if (ro) {
    ro.disconnect();
    observers.delete(body);
  }
  keys.delete(body);
  dirty.delete(body);
}
