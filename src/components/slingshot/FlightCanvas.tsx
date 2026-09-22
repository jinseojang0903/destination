"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface FlightCanvasHandle {
  /** Animates the dart from `from` to `to` in screen-pixel space along a
   * parabolic arc, then calls onDone. Duration/arc height scale with power
   * (0..1) so a hard throw looks fast and far, a soft one short and lobbed. */
  playFlight(from: { x: number; y: number }, to: { x: number; y: number }, power: number, onDone: () => void): void;
  clear(): void;
}

export const FlightCanvas = forwardRef<FlightCanvasHandle, { className?: string }>(function FlightCanvas(
  { className },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    playFlight(from, to, power, onDone) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        onDone();
        return;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const duration = 400 + power * 700; // ms
      const arcHeight = 40 + power * dist * 0.35;
      const start = performance.now();

      function frame(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t - arcHeight * 4 * t * (1 - t);

        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

        // trailing line
        ctx!.strokeStyle = "rgba(249, 115, 22, 0.4)";
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        const steps = 12;
        for (let i = 0; i <= steps; i++) {
          const st = (t * i) / steps;
          const sx = from.x + (to.x - from.x) * st;
          const sy = from.y + (to.y - from.y) * st - arcHeight * 4 * st * (1 - st);
          if (i === 0) ctx!.moveTo(sx, sy);
          else ctx!.lineTo(sx, sy);
        }
        ctx!.stroke();

        // dart
        ctx!.font = "28px sans-serif";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText("📍", x, y);

        if (t < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          onDone();
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    />
  );
});
