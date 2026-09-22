import type { LatLng } from "@/types/destination";

export interface ReverseGeocodeResult {
  countryCode: string | null;
  countryName: string | null;
  cityName: string | null;
}

interface MapboxV6Context {
  country?: { name?: string; country_code?: string };
  place?: { name?: string };
  locality?: { name?: string };
}

interface MapboxV6Feature {
  properties?: {
    context?: MapboxV6Context;
  };
}

/** Reverse-geocodes a lat/lng into a country/city name via the Mapbox
 * Geocoding v6 API. Returns nulls (never throws) when the point is remote
 * (open ocean, uninhabited area) or the request fails, so callers can fall
 * back gracefully. */
export async function reverseGeocode({ lat, lng }: LatLng): Promise<ReverseGeocodeResult> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    console.warn("reverseGeocode: NEXT_PUBLIC_MAPBOX_TOKEN is not set");
    return { countryCode: null, countryName: null, cityName: null };
  }

  const url = new URL("https://api.mapbox.com/search/geocode/v6/reverse");
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("types", "place,country");
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return { countryCode: null, countryName: null, cityName: null };
    const data = await res.json();
    const features: MapboxV6Feature[] = data.features ?? [];

    let countryName: string | null = null;
    let countryCode: string | null = null;
    let cityName: string | null = null;

    for (const feature of features) {
      const context = feature.properties?.context;
      if (!context) continue;
      countryName ??= context.country?.name ?? null;
      countryCode ??= context.country?.country_code?.toUpperCase() ?? null;
      cityName ??= context.place?.name ?? context.locality?.name ?? null;
      if (countryName && cityName) break;
    }

    return { countryCode, countryName, cityName };
  } catch (err) {
    console.warn("reverseGeocode failed", err);
    return { countryCode: null, countryName: null, cityName: null };
  }
}
