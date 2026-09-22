export type Continent = "Asia" | "Europe" | "Africa" | "Oceania" | "Americas";

export type RegionSelection =
  | { type: "continent"; continent: Continent }
  | { type: "country"; iso3: string; name: string };

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LandingResult extends LatLng {
  /** true when the aim+jitter point itself was valid; false when we had to
   * fall back to a uniformly random point inside the region. */
  fromAim: boolean;
}

export interface DestinationInfo {
  lat: number;
  lng: number;
  countryCode: string | null;
  countryName: string | null;
  cityName: string | null;
  photoUrl: string | null;
}

export interface HistoryEntry extends DestinationInfo {
  id: string;
  createdAt: number;
  dedupeKey: string;
  regionSelectionType: RegionSelection["type"];
  regionSelectionValue: string;
  throwPower: number;
  rerollCount: number;
}
