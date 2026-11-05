/* Fastlap's centripetal ribbon circuit, adapted to attended LeetCode rounds.
   World +Y is up; the original car's nose is local +Z. Distances are metres.
   Unlike the original parameter-index checkpoints, knots are mapped to arc
   distance, so HUD, landmarks, car and camera all use the same coordinate. */
import { THREE as T } from './vendor/fastlap-engine.mjs';
export const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const UP = new T.Vector3(0, 1, 0);
export function buildJourney(rows) {
  if (!rows.length) throw new Error('A journey requires actual attended contests');
  const points = [new T.Vector3(0, 0, 24), new T.Vector3(0, 0, 0)];
  let x = 0, z = 0, heading = 0;
  rows.forEach((row, i) => {
    const delta = i ? row.rating - rows[i - 1].rating : 0;
    // Bounded heading prevents self intersections and overlapping track edges.
    heading = clamp(heading * .82 + clamp(delta, -160, 160) * .002, -.85, .85);
    x += Math.sin(heading) * 26; z -= Math.cos(heading) * 26;
    points.push(new T.Vector3(x, 0, z));
  });
  for (let i = 0; i < 2; i++) {
    x += Math.sin(heading) * 26; z -= Math.cos(heading) * 26;
    points.push(new T.Vector3(x, 0, z));
  }
  const curve = new T.CatmullRomCurve3(points, false, 'centripetal', .5);
  curve.arcLengthDivisions = Math.max(2048, points.length * 64);
  const lengths = curve.getLengths(), length = lengths.at(-1);
  const knotDistance = i => {
    const k = i / (points.length - 1) * (lengths.length - 1), lo = Math.floor(k);
    return T.MathUtils.lerp(lengths[lo], lengths[Math.min(lo + 1, lengths.length - 1)], k - lo);
  };
  const checkpoints = rows.map((row, i) => ({ ...row, distance: knotDistance(i + 2),
    delta: i ? row.rating - rows[i - 1].rating : null, index: i }));
  const start = knotDistance(1), end = checkpoints.at(-1).distance + 13;
  const sample = distance => {
    const u = clamp(distance / length), position = curve.getPointAt(u), forward = curve.getTangentAt(u).normalize();
    const right = new T.Vector3().crossVectors(UP, forward).normalize();
    const up = new T.Vector3().crossVectors(forward, right).normalize();
    return { position, forward, right, up,
      rotation: new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right, up, forward)) };
  };
  return { curve, length, checkpoints, start, end, sample,
    distanceAt: progress => T.MathUtils.lerp(start, end, clamp(progress)) };
}
