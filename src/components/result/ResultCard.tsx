import { forwardRef } from "react";
import type { DestinationInfo } from "@/types/destination";
import { bilingualName } from "@/lib/format/place";

interface Props {
  info: DestinationInfo;
  practice?: boolean;
}

export const ResultCard = forwardRef<HTMLDivElement, Props>(function ResultCard({ info, practice }, ref) {
  const cityLabel = bilingualName(info.cityNameKo, info.cityName);
  const countryLabel = bilingualName(info.countryNameKo, info.countryName);
  const title = cityLabel ?? countryLabel ?? "알 수 없는 지역";
  const subtitle = cityLabel ? countryLabel : null;

  return (
    <div
      ref={ref}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-800"
      style={{
        backgroundImage: info.photoUrl ? `url(${info.photoUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />

      {practice && (
        <span className="absolute left-4 top-4 rounded-full bg-neutral-950/70 px-3 py-1 text-xs font-semibold text-orange-300">
          연습 결과
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-white">
        <p className="text-xs uppercase tracking-wide text-orange-300">다음 여행지</p>
        <h2 className="text-3xl font-bold leading-tight">{title}</h2>
        {subtitle && <p className="text-lg text-neutral-200">{subtitle}</p>}
        <p className="mt-1 text-xs text-neutral-400">
          {info.lat.toFixed(4)}, {info.lng.toFixed(4)}
        </p>
      </div>
    </div>
  );
});
