// Latitude/longitude <-> 3D point on a sphere (y up; seen from outside, east is to the right of north).
export const D2R = Math.PI / 180;

export function latLonToVec3(lat: number, lon: number, r = 1): [number, number, number] {
  const phi = (90 - lat) * D2R, theta = (lon + 180) * D2R;
  return [-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
}

export function vec3ToLatLon([x, y, z]: [number, number, number]): [number, number] {
  const r = Math.hypot(x, y, z);
  const lat = 90 - Math.acos(y / r) / D2R;
  const lon = ((((Math.atan2(z, -x) / D2R - 180) % 360) + 540) % 360) - 180;
  return [lat, lon];
}

export const SOWETO: [number, number] = [-26.27, 27.86];
