/** Shared between the CSS-positioned anchor icon and the JS landing-point
 * math, so both agree on where the slingshot "launches from" on screen. */
export const ANCHOR_BOTTOM_PX = 96;
export const MAX_PULL_PX = 130;

export function anchorPx(containerWidth: number, containerHeight: number) {
  return { x: containerWidth / 2, y: containerHeight - ANCHOR_BOTTOM_PX };
}

/** How far (px, at full power) the aim point can travel from the anchor —
 * scaled to the viewport so the whole visible map is reachable. */
export function throwRangePx(containerWidth: number, containerHeight: number) {
  return Math.max(containerWidth, containerHeight) * 0.95;
}
