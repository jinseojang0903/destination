import destination from "@turf/destination";
import { isPointInRegion, randomPointInRegion, type RegionPolygon } from "@/lib/geo/pointInRegion";
import type { LandingResult, LatLng } from "@/types/destination";

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface AimInput {
  /** Anchor point in screen pixels (fixed slingshot position). */
  anchor: ScreenPoint;
  /** Where the pointer was released, in screen pixels. */
  release: ScreenPoint;
  /** Max drag distance in px used to normalize power to 0..1. */
  maxPullPx: number;
  /** How far (in px, at power=1) the projected aim point travels from the anchor. */
  throwRangePx: number;
}

export interface AimResult {
  /** Direction the projectile launches toward (opposite of the pull), in screen px offset from anchor. */
  targetPx: ScreenPoint;
  power: number; // 0..1
}

/** Turns a slingshot-style pull (anchor -> release) into a launch target in
 * screen space. The player pulls the projectile away from where they want it
 * to go; releasing launches it in the opposite direction, scaled by power. */
export function resolveAim({ anchor, release, maxPullPx, throwRangePx }: AimInput): AimResult {
  const pullX = release.x - anchor.x;
  const pullY = release.y - anchor.y;
  const pullDist = Math.hypot(pullX, pullY);
  const power = Math.min(pullDist / maxPullPx, 1);

  if (pullDist === 0) {
    return { targetPx: { x: anchor.x, y: anchor.y }, power: 0 };
  }

  const dirX = -pullX / pullDist;
  const dirY = -pullY / pullDist;
  const travel = power * throwRangePx;

  return {
    targetPx: { x: anchor.x + dirX * travel, y: anchor.y + dirY * travel },
    power,
  };
}

export function clampToCanvas(pt: ScreenPoint, width: number, height: number): ScreenPoint {
  return {
    x: Math.min(Math.max(pt.x, 0), width),
    y: Math.min(Math.max(pt.y, 0), height),
  };
}

export interface JitterOptions {
  minKm?: number;
  maxKm?: number;
}

/** Adds a random bearing/distance offset so repeated identical aims don't
 * produce identical results. */
export function applyJitter(point: LatLng, { minKm = 5, maxKm = 80 }: JitterOptions = {}): LatLng {
  const bearing = Math.random() * 360;
  const distanceKm = minKm + Math.random() * (maxKm - minKm);
  const jittered = destination([point.lng, point.lat], distanceKm, bearing, { units: "kilometers" });
  const [lng, lat] = jittered.geometry.coordinates;
  return { lat, lng };
}

/**
 * Given an intended (aim+jitter) lat/lng and the region polygon, returns a
 * valid landing point: the intended point if it's inside the region, or a
 * uniformly random in-region point otherwise (bad aim / overshoot into the
 * ocean still lands you somewhere valid in the chosen region).
 */
export function resolveLanding(intended: LatLng, region: RegionPolygon): LandingResult {
  if (isPointInRegion(intended, region)) {
    return { ...intended, fromAim: true };
  }
  const fallback = randomPointInRegion(region);
  return { ...fallback, fromAim: false };
}
