import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { isPointInRegion, randomPointInRegion, type RegionPolygon } from "./pointInRegion";

function loadFixture(iso3: string): RegionPolygon {
  const raw = JSON.parse(
    readFileSync(join(__dirname, "../../../public/geo/countries", `${iso3}.geojson`), "utf8")
  );
  return { type: "FeatureCollection", features: [raw] };
}

describe("isPointInRegion", () => {
  it("recognizes a known point inside Japan (Tokyo Tower)", () => {
    const japan = loadFixture("JPN");
    expect(isPointInRegion({ lat: 35.6586, lng: 139.7454 }, japan)).toBe(true);
  });

  it("recognizes a mid-Pacific point as outside Japan", () => {
    const japan = loadFixture("JPN");
    expect(isPointInRegion({ lat: 10, lng: -160 }, japan)).toBe(false);
  });

  it("recognizes a point inside Indonesia (an archipelago / multipolygon)", () => {
    const indonesia = loadFixture("IDN");
    // Jakarta
    expect(isPointInRegion({ lat: -6.2, lng: 106.816666 }, indonesia)).toBe(true);
  });

  it("recognizes a point far outside Indonesia as outside", () => {
    const indonesia = loadFixture("IDN");
    // Central Australia
    expect(isPointInRegion({ lat: -25.3444, lng: 131.0369 }, indonesia)).toBe(false);
  });
});

describe("randomPointInRegion", () => {
  it("always returns points inside the region for a compact country", () => {
    const japan = loadFixture("JPN");
    for (let i = 0; i < 200; i++) {
      const p = randomPointInRegion(japan);
      expect(isPointInRegion(p, japan)).toBe(true);
    }
  });

  it("always returns points inside the region for an archipelago", () => {
    const indonesia = loadFixture("IDN");
    for (let i = 0; i < 200; i++) {
      const p = randomPointInRegion(indonesia);
      expect(isPointInRegion(p, indonesia)).toBe(true);
    }
  });
});
