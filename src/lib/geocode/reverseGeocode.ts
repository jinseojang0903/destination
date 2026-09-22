import type { LatLng } from "@/types/destination";

export interface ReverseGeocodeResult {
  countryCode: string | null;
  countryName: string | null;
  countryNameKo: string | null;
  cityName: string | null;
  cityNameKo: string | null;
}

interface MapboxV6Context {
  country?: { name?: string; country_code?: string };
  place?: { name?: string };
  locality?: { name?: string };
  neighborhood?: { name?: string };
}

interface MapboxV6Feature {
  properties?: {
    context?: MapboxV6Context;
  };
}

interface OneLanguageResult {
  countryCode: string | null;
  countryName: string | null;
  cityName: string | null;
}

async function fetchOneLanguage(lat: number, lng: number, token: string, language: string): Promise<OneLanguageResult> {
  const url = new URL("https://api.mapbox.com/search/geocode/v6/reverse");
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("types", "neighborhood,place,country");
  url.searchParams.set("language", language);
  url.searchParams.set("access_token", token);

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
    // Prefer the finer-grained neighborhood name (e.g. "Gangnam") over the
    // whole city, falling back to place/locality when there's no neighborhood.
    cityName ??= context.neighborhood?.name ?? context.place?.name ?? context.locality?.name ?? null;
    if (countryName && cityName) break;
  }

  return { countryCode, countryName, cityName };
}

const EMPTY_RESULT: ReverseGeocodeResult = {
  countryCode: null,
  countryName: null,
  countryNameKo: null,
  cityName: null,
  cityNameKo: null,
};

/** Reverse-geocodes a lat/lng into a neighborhood/city + country name, in
 * both English and Korean, via the Mapbox Geocoding v6 API. Returns nulls
 * (never throws) when the point is remote or the request fails, so callers
 * can fall back gracefully. */
export async function reverseGeocode({ lat, lng }: LatLng): Promise<ReverseGeocodeResult> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    console.warn("reverseGeocode: NEXT_PUBLIC_MAPBOX_TOKEN is not set");
    return EMPTY_RESULT;
  }

  try {
    const [en, ko] = await Promise.all([
      fetchOneLanguage(lat, lng, token, "en"),
      fetchOneLanguage(lat, lng, token, "ko"),
    ]);

    return {
      countryCode: en.countryCode ?? ko.countryCode,
      countryName: en.countryName,
      countryNameKo: ko.countryName,
      cityName: en.cityName,
      cityNameKo: ko.cityName,
    };
  } catch (err) {
    console.warn("reverseGeocode failed", err);
    return EMPTY_RESULT;
  }
}
