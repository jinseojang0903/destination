import type { DestinationInfo } from "@/types/destination";

/** "강남 (Gangnam)" when both scripts are available and differ, otherwise
 * whichever one exists. */
export function bilingualName(ko: string | null, en: string | null): string | null {
  if (ko && en && ko !== en) return `${ko} (${en})`;
  return ko ?? en;
}

/** Caption text for the share sheet (KakaoTalk/Messages show this next to the image). */
export function destinationShareText(info: DestinationInfo): string {
  const city = bilingualName(info.cityNameKo, info.cityName);
  const country = bilingualName(info.countryNameKo, info.countryName);
  const place = [city, country].filter(Boolean).join(", ") || "알 수 없는 지역";
  return `🎯 다트로 뽑은 다음 여행지: ${place}`;
}
