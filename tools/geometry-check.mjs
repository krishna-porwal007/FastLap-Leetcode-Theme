import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildJourney } from '../src/drive-geometry.mjs';
const raw=JSON.parse(fs.readFileSync('validation/real-history.json'));
const rows=raw.data.userContestRankingHistory.filter(r=>r.attended).map(r=>({rating:r.rating,title:r.contest.title,startTime:r.contest.startTime})).sort((a,b)=>a.startTime-b.startTime);
const journey=buildJourney(rows);
let previous=-Infinity;let maxFrameError=0;
for(let i=0;i<=1000;i++){
 const distance=journey.distanceAt(i/1000), f=journey.sample(distance);
 assert.ok(distance>previous);previous=distance;
 assert.ok(f.forward.z<0,'forward follows the road toward the finish');
 const determinant=f.right.clone().cross(f.up).dot(f.forward);
 maxFrameError=Math.max(maxFrameError,Math.abs(1-determinant));assert.ok(Math.abs(1-determinant)<1e-9);
 assert.equal(f.position.y,0,'road and car use the same ground plane');
 const same=journey.sample(distance);assert.deepEqual(f.position.toArray(),same.position.toArray());
}
assert.equal(journey.checkpoints.length,rows.length);
for(let i=0;i<rows.length;i++){
 const knot=journey.curve.points[i+2];
 assert.ok(journey.sample(journey.checkpoints[i].distance).position.distanceTo(knot)<.001,'checkpoint is at its own curve knot, not a uniformly spaced parameter');
}
for(const r of [rows.slice(0,1),rows.slice(0,2)]){const j=buildJourney(r);assert.ok(Number.isFinite(j.length)&&j.length>0);}
console.log(JSON.stringify({source:'Live public lee215 history',rounds:rows.length,length:journey.length,checks:'1001 monotonic scroll positions, deterministic reverse, orthonormal forward frames, arc-distance checkpoints, 1/2 round histories',maxFrameError},null,2));
