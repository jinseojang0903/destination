import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import distance from "@turf/distance";
import { resolveAim, clampToCanvas, applyJitter, resolveLanding } from "./computeLanding";
import { isPointInRegion, type RegionPolygon } from "@/lib/geo/pointInRegion";

function loadFixture(iso3: string): RegionPolygon {
  const raw = JSON.parse(
    readFileSync(join(__dirname, "../../../public/geo/countries", `${iso3}.geojson`), "utf8")
  );
  return { type: "FeatureCollection", features: [raw] };
}

describe("resolveAim", () => {
  const anchor = { x: 200, y: 400 };

  it("launches opposite the pull direction", () => {
    // pulled straight down from anchor -> should launch straight up
    const { targetPx, power } = resolveAim({
      anchor,
      release: { x: 200, y: 500 },
      maxPullPx: 150,
      throwRangePx: 300,
    });
    expect(targetPx.x).toBeCloseTo(anchor.x, 5);
    expect(targetPx.y).toBeLessThan(anchor.y);
    expect(power).toBeCloseTo(100 / 150, 5);
  });

  it("clamps power at 1 for pulls beyond maxPullPx", () => {
    const { power } = resolveAim({
      anchor,
      release: { x: 200, y: 1000 },
      maxPullPx: 150,
      throwRangePx: 300,
    });
    expect(power).toBe(1);
  });

  it("returns the anchor itself with zero power for a zero-length pull", () => {
    const { targetPx, power } = resolveAim({
      anchor,
      release: { x: 200, y: 400 },
      maxPullPx: 150,
      throwRangePx: 300,
    });
    expect(targetPx).toEqual(anchor);
    expect(power).toBe(0);
  });
});

describe("clampToCanvas", () => {
  it("leaves in-bounds points untouched", () => {
    expect(clampToCanvas({ x: 50, y: 50 }, 100, 100)).toEqual({ x: 50, y: 50 });
  });

  it("clamps out-of-bounds points to the canvas edge", () => {
    expect(clampToCanvas({ x: -10, y: 200 }, 100, 100)).toEqual({ x: 0, y: 100 });
  });
});

describe("applyJitter", () => {
  it("moves the point by roughly the configured distance range", () => {
    const origin = { lat: 35.0, lng: 135.0 };
    for (let i = 0; i < 50; i++) {
      const jittered = applyJitter(origin, { minKm: 5, maxKm: 80 });
      const d = distance([origin.lng, origin.lat], [jittered.lng, jittered.lat], { units: "kilometers" });
      expect(d).toBeGreaterThanOrEqual(4.9);
      expect(d).toBeLessThanOrEqual(80.1);
    }
  });

  it("produces different results across repeated calls (not deterministic)", () => {
    const origin = { lat: 35.0, lng: 135.0 };
    const results = new Set(Array.from({ length: 20 }, () => JSON.stringify(applyJitter(origin))));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("resolveLanding", () => {
  it("accepts the intended point when it's inside the region", () => {
    const japan = loadFixture("JPN");
    const intended = { lat: 35.6586, lng: 139.7454 }; // Tokyo Tower
    const result = resolveLanding(intended, japan);
    expect(result.fromAim).toBe(true);
    expect(result.lat).toBe(intended.lat);
    expect(result.lng).toBe(intended.lng);
  });

  it("falls back to a valid in-region point when the intended point is outside", () => {
    const japan = loadFixture("JPN");
    const intended = { lat: 10, lng: -160 }; // mid-Pacific, outside Japan
    const result = resolveLanding(intended, japan);
    expect(result.fromAim).toBe(false);
    expect(isPointInRegion(result, japan)).toBe(true);
  });
});
