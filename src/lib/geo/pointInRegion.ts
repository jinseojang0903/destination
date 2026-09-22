import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import bbox from "@turf/bbox";
import area from "@turf/area";
import pointOnFeature from "@turf/point-on-feature";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type { Continent, RegionSelection, LatLng } from "@/types/destination";

export type RegionPolygon = FeatureCollection<Polygon | MultiPolygon>;

/** Fetches the (already-simplified, statically bundled) polygon(s) for a
 * region selection. Country selections fetch a single country file;
 * continent selections fetch one pre-merged FeatureCollection. */
export async function loadRegionPolygon(selection: RegionSelection): Promise<RegionPolygon> {
  const url =
    selection.type === "country"
      ? `/geo/countries/${selection.iso3}.geojson`
      : `/geo/continents/${selection.continent}.geojson`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load region polygon from ${url}: ${res.status}`);
  }
  const data = await res.json();
  return data.type === "FeatureCollection" ? data : { type: "FeatureCollection", features: [data] };
}

/** True when the given lat/lng falls inside any polygon feature of the region. */
export function isPointInRegion(pt: LatLng, region: RegionPolygon): boolean {
  const p = turfPoint([pt.lng, pt.lat]);
  return region.features.some((feature) => {
    try {
      return booleanPointInPolygon(p, feature as Feature<Polygon | MultiPolygon>);
    } catch {
      return false;
    }
  });
}

function pickWeightedFeature(features: Feature<Polygon | MultiPolygon>[]): Feature<Polygon | MultiPolygon> {
  const weights = features.map((f) => Math.max(area(f), 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < features.length; i++) {
    r -= weights[i];
    if (r <= 0) return features[i];
  }
  return features[features.length - 1];
}

/**
 * Returns a uniformly random point inside the region's land area.
 *
 * A region can be many disjoint landmasses (an archipelago country, or a
 * whole continent's worth of countries) whose combined bounding box is
 * mostly ocean/empty space, so naive rejection sampling against the whole
 * collection's bbox converges too slowly. Instead: pick one feature
 * (weighted by its area, so bigger landmasses are proportionally more
 * likely), then rejection-sample within *that* feature's own tighter bbox.
 * If that still fails within maxAttempts (pathological shapes), fall back to
 * `pointOnFeature`, which is guaranteed to return a point that actually lies
 * on the feature (unlike a centroid/center-of-mass, which can land in the
 * water between islands).
 */
export function randomPointInRegion(region: RegionPolygon, maxAttempts = 30): LatLng {
  const features = region.features as Feature<Polygon | MultiPolygon>[];
  if (features.length === 0) {
    throw new Error("randomPointInRegion: region has no features");
  }

  const feature = pickWeightedFeature(features);
  const [minX, minY, maxX, maxY] = bbox(feature);

  for (let i = 0; i < maxAttempts; i++) {
    const candidate: LatLng = {
      lng: minX + Math.random() * (maxX - minX),
      lat: minY + Math.random() * (maxY - minY),
    };
    if (isPointInRegion(candidate, region)) {
      return candidate;
    }
  }

  const fallback = pointOnFeature(feature);
  const [lng, lat] = fallback.geometry.coordinates;
  return { lat, lng };
}

export function continentFileUrl(continent: Continent): string {
  return `/geo/continents/${continent}.geojson`;
}

export function countryFileUrl(iso3: string): string {
  return `/geo/countries/${iso3}.geojson`;
}
