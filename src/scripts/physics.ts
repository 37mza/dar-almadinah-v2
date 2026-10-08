// Small motion toolkit for gesture-driven UI, after Apple's "Designing Fluid Interfaces" (WWDC 2018).
//  - spring():   starts from the current value AND the finger's velocity, so there is no seam
//                between dragging and animating (velocity handoff). Interruptible: call .stop().
//  - project():  where a flick would come to rest (scroll-style deceleration), used to choose
//                between "dismiss" and "snap back" from momentum, not from the release point.
//  - rubberband(): progressive resistance past a boundary instead of a hard stop.
//  - VelocityTracker: px/s from the last ~100 ms of pointer samples.

export interface SpringOpts {
  /** 1 = critically damped (no overshoot). < 1 overshoots; use ~0.8 only after a flick. */
  damping?: number;
  /** Seconds to (roughly) reach the target. Not a fixed duration. */
  response?: number;
}

export interface SpringHandle { done: Promise<void>; stop: () => void }

export function spring(
  from: number,
  to: number,
  velocity: number, // px/s, signed, in the same axis as from/to
  opts: SpringOpts,
  onUpdate: (value: number) => void,
): SpringHandle {
  const { damping = 1, response = 0.35 } = opts;
  const k = (2 * Math.PI / response) ** 2;       // stiffness (mass = 1)
  const c = (4 * Math.PI * damping) / response;  // damping coefficient
  let x = from, v = velocity, last = performance.now(), raf = 0, stopped = false;
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));

  const tick = (now: number) => {
    if (stopped) return;
    let dt = Math.min((now - last) / 1000, 1 / 30); // clamp long frames (tab switch)
    last = now;
    const h = 1 / 240; // fixed sub-steps keep the integration stable
    while (dt > 0) {
      const s = Math.min(h, dt);
      const a = -k * (x - to) - c * v;
      v += a * s; x += v * s; dt -= s;
    }
    if (Math.abs(v) < 2 && Math.abs(x - to) < 0.5) { onUpdate(to); resolve(); return; }
    onUpdate(x);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return { done, stop: () => { stopped = true; cancelAnimationFrame(raf); resolve(); } };
}

/** Distance a flick travels before stopping. decelerationRate 0.998 ≈ normal scroll feel. */
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** The further past the bound, the less the element follows. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export class VelocityTracker {
  private s: { t: number; v: number }[] = [];
  reset(t: number, v: number) { this.s = [{ t, v }]; }
  add(t: number, v: number) {
    this.s.push({ t, v });
    while (this.s.length > 2 && t - this.s[0].t > 100) this.s.shift();
  }
  /** px/s over the recent window; 0 if the finger paused before release. */
  velocity(now = performance.now()) {
    const a = this.s[0], b = this.s[this.s.length - 1];
    if (!a || !b || b.t === a.t || now - b.t > 80) return 0;
    return ((b.v - a.v) / (b.t - a.t)) * 1000;
  }
}
