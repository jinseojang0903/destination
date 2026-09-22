"use client";

import { useState } from "react";
import { useDrag } from "@use-gesture/react";
import { ANCHOR_BOTTOM_PX, MAX_PULL_PX } from "@/lib/throw/constants";

interface Props {
  disabled?: boolean;
  onRelease: (pull: { dx: number; dy: number; power: number }) => void;
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

  return (
    <div
      {...bind()}
      className="absolute inset-0 touch-none"
      style={{ cursor: disabled ? "default" : "grab" }}
    >
      {isPulling && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <line
            x1="50%"
            y1={`calc(100% - ${ANCHOR_BOTTOM_PX}px)`}
            x2={`calc(50% + ${pull.dx}px)`}
            y2={`calc(100% - ${ANCHOR_BOTTOM_PX}px + ${pull.dy}px)`}
            stroke="#f97316"
            strokeWidth={3}
            strokeDasharray="6 6"
          />
        </svg>
      )}

      <div
        className="pointer-events-none absolute flex flex-col items-center gap-2"
        style={{ left: "50%", bottom: ANCHOR_BOTTOM_PX, transform: "translate(-50%, 50%)" }}
      >
        <span className="text-4xl drop-shadow-lg">🎯</span>
      </div>

      <div className="pointer-events-none absolute inset-x-6 bottom-6">
        <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full bg-orange-500 transition-[width]"
            style={{ width: `${power * 100}%` }}
          />
        </div>
        <p className="mt-1 text-center text-xs text-neutral-400">
          {disabled ? "날아가는 중..." : "당겨서 조준하고 놓으면 던져져요"}
        </p>
      </div>
    </div>
  );
}
