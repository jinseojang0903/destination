import type { Continent } from "@/types/destination";

async function searchPhoto(q: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/photo?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}

export function placeholderFor(continent: Continent | null): string {
  return `/placeholders/${continent ?? "Asia"}.jpg`;
}

/** Tries city+country, then country alone, then a bundled per-continent
 * placeholder so the result card never shows a broken image. */
export async function getRepresentativePhoto(
  cityName: string | null,
  countryName: string | null,
  continent: Continent | null
): Promise<string> {
  if (cityName && countryName) {
    const byCity = await searchPhoto(`${cityName}, ${countryName}`);
    if (byCity) return byCity;
  }
  if (countryName) {
    const byCountry = await searchPhoto(countryName);
    if (byCountry) return byCountry;
  }
  return placeholderFor(continent);
}
