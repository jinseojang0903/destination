"use client";

import { useState } from "react";
import { useDrag } from "@use-gesture/react";
import { ANCHOR_BOTTOM_PX, MAX_PULL_PX } from "@/lib/throw/constants";

interface Props {
  disabled?: boolean;
  onRelease: (pull: { dx: number; dy: number; power: number }) => void;
}

/** Lerps from the orange brand color to a hot red as the gauge fills, so
 * charging up reads as "power" rather than a flat progress bar. */
function powerColor(power: number): string {
  const from = [249, 115, 22]; // orange-500
  const to = [220, 38, 38]; // red-600
  const [r, g, b] = from.map((c, i) => Math.round(c + (to[i] - c) * power));
  return `rgb(${r}, ${g}, ${b})`;
}

export function SlingshotControl({ disabled, onRelease }: Props) {
  const [pull, setPull] = useState({ dx: 0, dy: 0 });

  const bind = useDrag(
    ({ movement: [mx, my], last }) => {
      if (disabled) return;
      setPull({ dx: mx, dy: my });
      if (last) {
        const dist = Math.hypot(mx, my);
        const power = Math.min(dist / MAX_PULL_PX, 1);
        setPull({ dx: 0, dy: 0 });
        if (dist > 8) {
          onRelease({ dx: mx, dy: my, power });
        }
      }
    },
    { filterTaps: true }
  );

  const power = Math.min(Math.hypot(pull.dx, pull.dy) / MAX_PULL_PX, 1);
  const isPulling = pull.dx !== 0 || pull.dy !== 0;
  const charged = power > 0.85;
  const color = powerColor(power);
  // Aim the anchor icon to face the launch direction (opposite the pull) as feedback.
  const aimAngleDeg = isPulling ? (Math.atan2(-pull.dy, -pull.dx) * 180) / Math.PI + 90 : 0;

  return (
    <div
      {...bind()}
      className="absolute inset-0 touch-none select-none [-webkit-touch-callout:none]"
      style={{ cursor: disabled ? "default" : "grab" }}
    >
      {isPulling && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <line
            x1="50%"
            y1={`calc(100% - ${ANCHOR_BOTTOM_PX}px)`}
            x2={`calc(50% + ${pull.dx}px)`}
            y2={`calc(100% - ${ANCHOR_BOTTOM_PX}px + ${pull.dy}px)`}
            stroke={color}
            strokeWidth={2 + power * 4}
            strokeDasharray="6 6"
            style={{ filter: `drop-shadow(0 0 ${4 + power * 10}px ${color})` }}
          />
        </svg>
      )}

      <div
        className="pointer-events-none absolute flex flex-col items-center gap-2"
        style={{ left: "50%", bottom: ANCHOR_BOTTOM_PX, transform: "translate(-50%, 50%)" }}
      >
        <span
          className={`text-4xl transition-transform duration-75 ${charged ? "animate-pulse" : ""}`}
          style={{
            transform: `rotate(${aimAngleDeg}deg) scale(${1 + power * 0.4})`,
            filter: isPulling ? `drop-shadow(0 0 ${6 + power * 16}px ${color})` : "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          }}
        >
          🎯
        </span>
      </div>

      {/* Vertical power gauge, right edge — fills bottom-up and glows hotter as it charges. */}
      <div className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2">
        <span className="text-xs font-semibold text-neutral-300">{Math.round(power * 100)}%</span>
        <div className="relative h-56 w-5 overflow-hidden rounded-full border border-neutral-700 bg-neutral-900/80">
          <div
            className={`absolute bottom-0 left-0 w-full rounded-full transition-[height] ${charged ? "animate-pulse" : ""}`}
            style={{
              height: `${power * 100}%`,
              backgroundColor: color,
              boxShadow: power > 0 ? `0 0 ${6 + power * 18}px ${color}` : undefined,
            }}
          />
        </div>
        <span className="text-2xl">⚡</span>
      </div>

      <p className="pointer-events-none absolute inset-x-6 bottom-6 text-center text-xs text-neutral-400">
        {disabled ? "날아가는 중..." : "당겨서 조준하고 놓으면 던져져요"}
      </p>
    </div>
  );
}
