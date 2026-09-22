"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Marker, type MapRef } from "react-map-gl/mapbox";
import bbox from "@turf/bbox";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { subscribeUserProfile } from "@/lib/firebase/attempts";
import { MapCanvas } from "@/components/map/MapCanvas";
import { SlingshotControl } from "@/components/slingshot/SlingshotControl";
import { FlightCanvas, type FlightCanvasHandle } from "@/components/slingshot/FlightCanvas";
import { ResultCard } from "@/components/result/ResultCard";
import { loadRegionPolygon, randomPointInRegion, type RegionPolygon } from "@/lib/geo/pointInRegion";
import { resolveAim, applyJitter, resolveLanding, clampToCanvas } from "@/lib/throw/computeLanding";
import { anchorPx, throwRangePx, MAX_PULL_PX } from "@/lib/throw/constants";
import { reverseGeocode } from "@/lib/geocode/reverseGeocode";
import { getRepresentativePhoto } from "@/lib/photo/getPhoto";
import { getHistoryDedupeKeys, normalizeDedupeKey, commitOfficialThrow } from "@/lib/firebase/history";
import { shareOrDownloadNode } from "@/lib/share/buildShareImage";
import { destinationShareText } from "@/lib/format/place";
import { COUNTRY_TO_CONTINENT } from "@/lib/geo/continentMap";
import countryMeta from "@/data/countryMeta.json";
import type { RegionSelection, DestinationInfo, Continent, LatLng } from "@/types/destination";
import type { UserProfile } from "@/types/user";

type Phase = "loading" | "aiming" | "flying" | "result" | "error";

function parseRegion(searchParams: URLSearchParams): RegionSelection | null {
  const type = searchParams.get("regionType");
  const value = searchParams.get("regionValue");
  if (!type || !value) return null;
  if (type === "continent") {
    return { type: "continent", continent: value as Continent };
  }
  if (type === "country") {
    const meta = countryMeta.find((c) => c.iso3 === value);
    return { type: "country", iso3: value, name: meta?.name ?? value };
  }
  return null;
}

function continentOf(region: RegionSelection): Continent | null {
  if (region.type === "continent") return region.continent;
  return COUNTRY_TO_CONTINENT[region.iso3] ?? null;
}

/** Zooms the map into the landing spot so the player can see what
 * neighborhood/area it's actually in, and resolves once the animation
 * finishes (or after a timeout fallback so a stalled map never blocks the flow). */
function flyToAndReveal(map: MapRef, center: LatLng): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    map.once("moveend", finish);
    map.flyTo({ center: [center.lng, center.lat], zoom: 13.5, duration: 1200, essential: true });
    setTimeout(finish, 1600);
  });
}

function ThrowScreen() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const region = parseRegion(searchParams);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const flightRef = useRef<FlightCanvasHandle | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  // Own state (not just read from the URL) so "다시 연습하기" / "실제 기회로 도전하기"
  // can flip modes in place without re-navigating or re-fetching the region.
  const [practiceMode, setPracticeMode] = useState(() => searchParams.get("practice") === "1");
  const [regionPolygon, setRegionPolygon] = useState<RegionPolygon | null>(null);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<DestinationInfo | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [landingPoint, setLandingPoint] = useState<LatLng | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.phoneNumber) return;
    return subscribeUserProfile(user.phoneNumber, setProfile);
  }, [user]);

  useEffect(() => {
    if (!region) return;
    let cancelled = false;
    loadRegionPolygon(region)
      .then((poly) => {
        if (cancelled) return;
        setRegionPolygon(poly);
        setBounds(bbox(poly) as [number, number, number, number]);
        setPhase("aiming");
      })
      .catch((err) => {
        Sentry.captureException(err);
        if (!cancelled) {
          setErrorMsg("지도 데이터를 불러오지 못했어요.");
          setPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRelease = useCallback(
    async ({ dx, dy, power }: { dx: number; dy: number; power: number }) => {
      if (!regionPolygon || !mapRef.current || !containerRef.current || phase !== "aiming") return;
      if (!practiceMode && !user?.phoneNumber) return;

      setPhase("flying");
      setNote(null);

      const rect = containerRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const anchor = anchorPx(width, height);
      const release = { x: anchor.x + dx, y: anchor.y + dy };

      const aim = resolveAim({ anchor, release, maxPullPx: MAX_PULL_PX, throwRangePx: throwRangePx(width, height) });
      const targetPx = clampToCanvas(aim.targetPx, width, height);

      const unprojected = mapRef.current.unproject([targetPx.x, targetPx.y]);
      const intended: LatLng = { lat: unprojected.lat, lng: unprojected.lng };
      const jittered = applyJitter(intended);
      let landing = resolveLanding(jittered, regionPolygon);

      let geocode = await reverseGeocode(landing);
      let rerollCount = 0;
      let hadDuplicateReroll = false;

      if (!practiceMode && user?.phoneNumber) {
        try {
          const dedupeKeys = await getHistoryDedupeKeys(user.phoneNumber);
          while (
            dedupeKeys.has(normalizeDedupeKey(geocode.countryCode, geocode.cityName)) &&
            rerollCount < 15
          ) {
            hadDuplicateReroll = true;
            const resampled = randomPointInRegion(regionPolygon);
            landing = { ...resampled, fromAim: false };
            geocode = await reverseGeocode(landing);
            rerollCount += 1;
          }
        } catch {
          // if the dedupe lookup fails, proceed without it rather than blocking the throw
        }
      }

      const landingPx = mapRef.current.project([landing.lng, landing.lat]);
      flightRef.current?.playFlight(anchor, landingPx, power, async () => {
        // Drop the pin and let it sit for a beat before the camera moves, so
        // it reads as "it landed *here*" first, then "now let's zoom in" —
        // rather than the pin and the zoom happening at the same time.
        setLandingPoint(landing);
        await new Promise((resolve) => setTimeout(resolve, 600));

        const continent = continentOf(region!);
        const [photoUrl] = await Promise.all([
          getRepresentativePhoto(geocode.cityName, geocode.countryName, continent),
          mapRef.current ? flyToAndReveal(mapRef.current, landing) : Promise.resolve(),
        ]);

        const info: DestinationInfo = {
          lat: landing.lat,
          lng: landing.lng,
          countryCode: geocode.countryCode,
          countryName: geocode.countryName,
          countryNameKo: geocode.countryNameKo,
          cityName: geocode.cityName,
          cityNameKo: geocode.cityNameKo,
          photoUrl,
        };

        if (!practiceMode && user?.phoneNumber) {
          try {
            await commitOfficialThrow(user.phoneNumber, {
              ...info,
              regionSelection: region!,
              throwPower: power,
              rerollCount,
            });
          } catch (err) {
            if (err instanceof Error && err.message === "NO_ATTEMPTS_REMAINING") {
              setErrorMsg("공식 시도를 이미 모두 사용했어요.");
              setPhase("error");
              return;
            }
            Sentry.captureException(err);
            setErrorMsg("결과를 저장하지 못했어요. 네트워크를 확인해주세요.");
            setPhase("error");
            return;
          }
        }

        if (!landing.fromAim) {
          setNote("조준이 지역을 벗어나서, 지역 내 임의의 지점에 착지했어요.");
        } else if (hadDuplicateReroll) {
          setNote("이전에 뽑았던 곳과 겹쳐서, 새로운 곳으로 다시 던졌어요.");
        }

        setResult(info);
        setPhase("result");
      });
    },
    [regionPolygon, phase, practiceMode, user, region]
  );

  /** Throws again against the same already-loaded region, without
   * re-navigating — this is what lets practice mode loop freely instead of
   * forcing a trip back to the region picker for every attempt. */
  function throwAgain(nextPracticeMode: boolean) {
    setPracticeMode(nextPracticeMode);
    setResult(null);
    setNote(null);
    setLandingPoint(null);
    setPhase("aiming");
  }

  async function handleShare() {
    if (!cardRef.current || !result) return;
    setSharing(true);
    try {
      await shareOrDownloadNode(cardRef.current, destinationShareText(result));
    } finally {
      setSharing(false);
    }
  }

  if (!region || phase === "error") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-neutral-300">
          {region ? errorMsg : "지역 정보가 없어요. 처음부터 다시 시작해주세요."}
        </p>
        <Link href="/" className="rounded-lg bg-orange-500 px-5 py-3 font-semibold text-neutral-950">
          홈으로
        </Link>
      </main>
    );
  }

  const attemptsRemaining = profile?.attemptsRemaining ?? 0;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm text-neutral-400 underline">
          ← 홈으로
        </Link>
        <p className="text-sm text-neutral-400">
          {region?.type === "continent" ? region.continent : region?.name}
          {practiceMode && <span className="ml-2 text-orange-400">연습</span>}
        </p>
      </header>

      {phase === "result" && result ? (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-8">
          <ResultCard ref={cardRef} info={result} practice={practiceMode} />
          {note && <p className="text-center text-xs text-neutral-400">{note}</p>}

          {practiceMode ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => throwAgain(true)}
                className="rounded-lg bg-orange-500 px-4 py-4 text-lg font-bold text-neutral-950"
              >
                다시 연습하기
              </button>
              <button
                type="button"
                onClick={() => throwAgain(false)}
                disabled={attemptsRemaining <= 0}
                className="rounded-lg border border-orange-500 px-4 py-3 font-medium text-orange-400 disabled:opacity-40"
              >
                {attemptsRemaining > 0 ? `실제 기회로 도전하기 (${attemptsRemaining}회 남음)` : "실제 기회 없음"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => throwAgain(true)}
              className="rounded-lg bg-orange-500 px-4 py-4 text-lg font-bold text-neutral-950"
            >
              연습으로 계속 던지기
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 rounded-lg border border-neutral-700 px-4 py-3 font-medium disabled:opacity-50"
            >
              {sharing ? "저장 중..." : "공유하기"}
            </button>
            <Link
              href="/"
              className="flex-1 rounded-lg bg-neutral-800 px-4 py-3 text-center font-medium text-neutral-200"
            >
              지역/설정 변경
            </Link>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="relative flex-1">
          {phase === "loading" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/80">
              <p className="text-neutral-400">지도를 불러오는 중...</p>
            </div>
          )}
          {bounds && (
            <MapCanvas ref={mapRef} fitBounds={bounds}>
              {landingPoint && (
                <Marker longitude={landingPoint.lng} latitude={landingPoint.lat} anchor="center">
                  <span className="text-3xl drop-shadow-lg">📍</span>
                </Marker>
              )}
            </MapCanvas>
          )}
          <FlightCanvas ref={flightRef} />
          {phase !== "loading" && (
            <SlingshotControl disabled={phase !== "aiming"} onRelease={handleRelease} />
          )}
        </div>
      )}
    </main>
  );
}

export default function ThrowPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-neutral-400">불러오는 중...</p>
        </main>
      }
    >
      <ThrowScreen />
    </Suspense>
  );
}
