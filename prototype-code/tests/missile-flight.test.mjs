import assert from 'node:assert/strict';
import test from 'node:test';
import { missilePosition, smokeMotion, latestLaunchGroup, drawMissileFlight, smokeSampling, viewportFlightRoute } from '../app/missile-flight.mjs';

const carrier = { start: {x:0,y:0}, control:{x:400,y:80}, aim:{x:700,y:450}, carrierMs:6500, flightMs:6500, splitMs:3900 };

test('the carrier starts at the viewport edge and its shared path remains on screen', () => {
  for (const [width, height] of [[1440, 900], [390, 844], [800, 500]]) {
    for (const angle of [0, Math.PI / 3, Math.PI, 5 * Math.PI / 3]) {
      const aim = { x: width * 0.8, y: height * 0.65 };
      const route = viewportFlightRoute(width, height, aim, angle);
      const path = { ...carrier, ...route, aim, target: aim };
      const edgeDistance = Math.min(route.start.x, width - route.start.x, route.start.y, height - route.start.y);
      assert.ok(Math.abs(edgeDistance - 14) < 0.001);
      for (let age = 0; age <= path.splitMs; age += 100) {
        const point = missilePosition(path, age);
        assert.ok(point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height);
      }
    }
  }
});

test('MIRV warheads share exactly one carrier path before separation', () => {
  const left = {...carrier,target:{x:600,y:500}};
  const right = {...carrier,target:{x:850,y:380}};
  for (let age=0;age<=3900;age+=100) assert.deepEqual(missilePosition(left,age),missilePosition(right,age));
  const a=missilePosition(left,5000), b=missilePosition(right,5000);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>20);
  assert.deepEqual(missilePosition(left,6500),left.target);
  assert.deepEqual(missilePosition(right,6500),right.target);
});

test('separation has continuous position and velocity without teleporting', () => {
  const path={...carrier,target:{x:850,y:380}};
  const before=missilePosition(path,3899), at=missilePosition(path,3900), after=missilePosition(path,3901);
  assert.ok(Math.abs((at.x-before.x)-(after.x-at.x))<0.001);
  assert.ok(Math.abs((at.y-before.y)-(after.y-at.y))<0.001);
});

test('smoke uses elapsed age, slows its inherited velocity, expands and fades', () => {
  const velocity={x:200,y:0};
  const fresh=smokeMotion(0.2,velocity,12), old=smokeMotion(3,velocity,12);
  assert.ok(old.radius>fresh.radius);
  assert.ok(old.opacity<fresh.opacity);
  assert.ok(Math.abs(old.x)<10, 'exhaust must stay near its emission point rather than follow the missile');
  assert.deepEqual(old,smokeMotion(3,velocity,12));
});

test('disarming additive launches retains only the latest complete delivery group', () => {
  const strikes=[{id:1,flightGroup:{id:1}},{id:2,flightGroup:{id:2}},{id:3,flightGroup:{id:2}}];
  assert.deepEqual(latestLaunchGroup(strikes).map(s=>s.id),[2,3]);
  assert.deepEqual(latestLaunchGroup([]),[]);
});

test('smoke has a bounded draw budget without per-puff blur, including dense launches', () => {
  let images = 0, strokes = 0, blurs = 0;
  const context = {
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, fillRect() {},
    stroke() { strokes++; }, drawImage() { images++; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  Object.defineProperty(context, 'shadowBlur', { set(value) { if (value > 0) blurs++; } });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  const path = { ...carrier, splitMs: 0, target: carrier.aim };
  for (const dense of [false, true]) {
    images = strokes = blurs = 0;
    const quality = smokeSampling(dense);
    assert.ok(quality.lifetimeMs / quality.stepMs <= 50);
    drawMissileFlight(context, path, 5000, { lead: true, seed: 13, reducedMotion: false, dense });
    assert.ok(images <= (dense ? 8 : 18));
    assert.ok(strokes <= 16);
    assert.equal(blurs, 0);
  }
});
