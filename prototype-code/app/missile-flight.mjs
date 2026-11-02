/** @typedef {{x:number,y:number}} Pixel */
const clamp = (value) => Math.max(0, Math.min(1, value));
const noise = (seed) => { const value = Math.sin(seed * 12.9898) * 43758.5453; return value - Math.floor(value); };
const SMOKE_OPACITY = 0.4;

/** Place the carrier at the visible edge, independently of map zoom. The
 * control point stays inside the viewport so the carrier is visible before
 * a MIRV separates. */
export function viewportFlightRoute(width, height, aim, angle) {
  const inset = Math.min(14, width / 4, height / 4);
  const center = { x: width / 2, y: height / 2 };
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const tx = Math.abs(dx) < 1e-8 ? Infinity : (width / 2 - inset) / Math.abs(dx);
  const ty = Math.abs(dy) < 1e-8 ? Infinity : (height / 2 - inset) / Math.abs(dy);
  const distance = Math.min(tx, ty);
  const start = { x: center.x + dx * distance, y: center.y + dy * distance };
  const vx = aim.x - start.x, vy = aim.y - start.y;
  const length = Math.max(1, Math.hypot(vx, vy));
  const bend = Math.min(width, height) * 0.07;
  const limit = (value, max) => Math.max(inset, Math.min(max - inset, value));
  const control = {
    x: limit((start.x + aim.x) / 2 - vy / length * bend, width),
    y: limit((start.y + aim.y) / 2 + vx / length * bend, height),
  };
  return { start, control };
}

/** @param {Pixel} a @param {Pixel} control @param {Pixel} b @param {number} t */
function quadratic(a, control, b, t) {
  const inverse = 1 - t;
  return { x: inverse * inverse * a.x + 2 * inverse * t * control.x + t * t * b.x, y: inverse * inverse * a.y + 2 * inverse * t * control.y + t * t * b.y };
}

/** A visual flight path; all warheads share the carrier until separation.
 * @param {{start:Pixel,control:Pixel,aim:Pixel,target:Pixel,carrierMs:number,flightMs:number,splitMs:number}} path
 * @param {number} ageMs
 */
export function missilePosition(path, ageMs) {
  const split = path.splitMs;
  if (!split || ageMs <= split) {
    return quadratic(path.start, path.control, path.aim, Math.pow(clamp(ageMs / path.carrierMs), 1.16));
  }
  const splitT = Math.pow(split / path.carrierMs, 1.16);
  const start = quadratic(path.start, path.control, path.aim, splitT);
  const remaining = Math.max(1, path.flightMs - split);
  const t = clamp((ageMs - split) / remaining);
  const speed = 1.16 * Math.pow(split / path.carrierMs, 0.16) / path.carrierMs;
  // Match position and velocity at separation, then smoothly fan out.
  const vx = 2 * ((1 - splitT) * (path.control.x - path.start.x) + splitT * (path.aim.x - path.control.x)) * speed;
  const vy = 2 * ((1 - splitT) * (path.control.y - path.start.y) + splitT * (path.aim.y - path.control.y)) * speed;
  const c1 = { x: start.x + vx * remaining / 3, y: start.y + vy * remaining / 3 };
  const c2 = { x: path.target.x - (path.target.x - start.x) * 0.18, y: path.target.y - (path.target.y - start.y) * 0.18 };
  const inverse = 1 - t;
  return { x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * c1.x + 3 * inverse * t * t * c2.x + t ** 3 * path.target.x, y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * c1.y + 3 * inverse * t * t * c2.y + t ** 3 * path.target.y };
}

/** Exhaust hangs at its emission point. Drag rapidly damps its initial velocity;
 * diffusion, buoyancy and a weak steady wind disperse it in elapsed seconds.
 * @param {number} age @param {Pixel} initialVelocity @param {number} seed
 */
export function smokeMotion(age, initialVelocity, seed) {
  const dragTime = 0.22;
  const retainedMotion = dragTime * (1 - Math.exp(-age / dragTime));
  const diffusion = Math.sqrt(2 * 0.8 * age);
  const dissipation = clamp((3 - age) / 0.6);
  return {
    x: initialVelocity.x * retainedMotion * 0.025 + age * 0.7 + (noise(seed) - 0.5) * diffusion,
    y: initialVelocity.y * retainedMotion * 0.025 - age * 0.55 + (noise(seed + 7) - 0.5) * diffusion,
    radius: 0.9 + diffusion,
    opacity: SMOKE_OPACITY * Math.min(1, age / 0.08) * Math.exp(-age / 1.8) * dissipation * dissipation * (3 - 2 * dissipation),
  };
}

let smokeSprite;
function getSmokeSprite() {
  if (smokeSprite) return smokeSprite;
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  const context = sprite.getContext('2d');
  if (!context) return sprite;
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  const rgb = '235,239,230';
  gradient.addColorStop(0, `rgba(${rgb},.96)`);
  gradient.addColorStop(0.35, `rgba(${rgb},.78)`);
  gradient.addColorStop(0.72, `rgba(${rgb},.2)`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  smokeSprite = sprite;
  return sprite;
}

// Reuse small segment buckets across flights: two batched strokes per opacity
// level replace hundreds of shadow-blurred strokes and sprite copies.
const smokeBuckets = Array.from({ length: 8 }, () => /** @type {number[]} */ ([]));

/** A fixed work budget, independent of frame rate. @param {boolean} dense */
export function smokeSampling(dense) {
  return { stepMs: dense ? 100 : 60, lifetimeMs: 3000, puffEvery: dense ? 5 : 3 };
}

/** @param {CanvasRenderingContext2D} context @param {Parameters<typeof missilePosition>[0]} path
 * @param {number} ageMs @param {{lead:boolean,seed:number,reducedMotion:boolean,dense:boolean}} options
 */
export function drawMissileFlight(context, path, ageMs, options) {
  const split = path.splitMs;
  // One carrier glow before separation. Old carrier exhaust persists once,
  // while the separate reentry wakes start only at their shared split point.
  if (!options.lead && split && ageMs < split) return;
  if (!options.reducedMotion) {
    const { stepMs: step, lifetimeMs, puffEvery } = smokeSampling(options.dense);
    const firstEmission = options.lead ? 0 : Math.ceil(split / step) * step;
    const start = Math.max(firstEmission, Math.ceil((ageMs - lifetimeMs) / step) * step);
    for (const bucket of smokeBuckets) bucket.length = 0;
    context.save();
    context.globalCompositeOperation = 'source-over';
    for (let born = start; born < Math.min(ageMs, path.flightMs); born += step) {
      const smokeAge = (ageMs - born) / 1000;
      const at = missilePosition(path, born);
      const next = missilePosition(path, Math.min(path.flightMs, born + 20));
      const velocity = { x: (next.x - at.x) * 50, y: (next.y - at.y) * 50 };
      const motion = smokeMotion(smokeAge, velocity, options.seed + born);
      const opacity = motion.opacity * (split && born > split ? 0.7 : 1);
      if (opacity < 0.008) continue;
      const x = at.x + motion.x, y = at.y + motion.y;
      const nextBorn = Math.min(ageMs - 70, path.flightMs, born + step);
      if (nextBorn > born) {
        const end = missilePosition(path, nextBorn);
        const endMotion = smokeMotion((ageMs - nextBorn) / 1000, velocity, options.seed + nextBorn);
        const bucket = smokeBuckets[Math.min(7, Math.floor(opacity / SMOKE_OPACITY * 8))];
        bucket.push(x, y, end.x + endMotion.x, end.y + endMotion.y);
      }
      if (Math.round(born / step) % puffEvery === 0) {
        context.globalAlpha = opacity * 0.3;
        context.drawImage(getSmokeSprite(), x - motion.radius, y - motion.radius, motion.radius * 2, motion.radius * 2);
      }
    }
    context.lineCap = 'round';
    for (let index = 0; index < smokeBuckets.length; index++) {
      const segments = smokeBuckets[index];
      if (!segments.length) continue;
      const alpha = (index + 0.5) * SMOKE_OPACITY / smokeBuckets.length;
      context.beginPath();
      for (let point = 0; point < segments.length; point += 4) {
        context.moveTo(segments[point], segments[point + 1]);
        context.lineTo(segments[point + 2], segments[point + 3]);
      }
      context.globalAlpha = alpha * 0.28;
      context.strokeStyle = 'rgb(18,25,23)';
      context.lineWidth = 1.9;
      context.stroke();
      context.globalAlpha = alpha;
      context.strokeStyle = 'rgb(235,239,230)';
      context.lineWidth = 0.9;
      context.stroke();
    }
    context.restore();
  }
  if (ageMs < 0 || ageMs >= path.flightMs) return;
  const point = missilePosition(path, ageMs);
  const radius = split && ageMs >= split ? 8 : 12;
  context.save();
  context.globalCompositeOperation = 'screen';
  const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
  glow.addColorStop(0, 'rgba(255,255,250,1)');
  glow.addColorStop(0.12, 'rgba(255,250,213,1)');
  glow.addColorStop(0.32, 'rgba(255,188,73,.8)');
  glow.addColorStop(0.65, 'rgba(255,82,25,.22)');
  glow.addColorStop(1, 'rgba(190,33,0,0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#fffef2';
  context.beginPath();
  context.arc(point.x, point.y, split && ageMs >= split ? 1 : 1.45, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/** Retain a whole delivery group when leaving additive mode, including MIRVs.
 * @template {{flightGroup:{id:number}}} T @param {T[]} strikes @returns {T[]}
 */
export function latestLaunchGroup(strikes) {
  const latest = strikes.at(-1)?.flightGroup.id;
  return strikes.filter((strike) => strike.flightGroup.id === latest);
}
