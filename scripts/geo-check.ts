// Self-check for the globe's coordinate conversion: `node scripts/geo-check.ts` (runs before every build).
import assert from 'node:assert/strict';
import { latLonToVec3, vec3ToLatLon, SOWETO } from '../src/geo.ts';

const s = latLonToVec3(...SOWETO);
assert.ok(Math.abs(Math.hypot(...s) - 1) < 1e-9, 'lands on the unit sphere');
assert.ok(s[1] < 0, 'Soweto is in the southern hemisphere');
const [lat, lon] = vec3ToLatLon(s);
assert.ok(Math.abs(lat - SOWETO[0]) < 1e-9 && Math.abs(lon - SOWETO[1]) < 1e-9, 'round trip');
assert.ok(lon > 0, 'Soweto is east of Greenwich');
assert.deepEqual(latLonToVec3(0, 0).map((v) => +v.toFixed(9)), [1, 0, 0], 'Greenwich on the equator is +x');
assert.ok(latLonToVec3(0, 90)[2] < 0 && latLonToVec3(90, 0)[1] > 0.999, 'east turns toward -z, north is +y');
console.log('geo check passed');
