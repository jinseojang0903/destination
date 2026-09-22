import { toPng } from "html-to-image";

/** Rasterizes a DOM node to a PNG and either opens the native share sheet
 * (mobile — this is what lets the user pick KakaoTalk, Messages, etc.) or
 * triggers a download (desktop fallback, or when the browser has no share
 * sheet support). Requires a secure context (https, or literal localhost) —
 * on a phone hitting a plain-http LAN address during dev, this silently
 * falls back to download since `navigator.share` won't exist there. */
export async function shareOrDownloadNode(node: HTMLElement, text: string, fileName = "destination-card.png") {
  const dataUrl = await toPng(node, { pixelRatio: 2 });

  if (navigator.share && navigator.canShare) {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "다음 여행지", text });
        return;
      } catch (err) {
        // User closed the share sheet without picking anything — don't
        // surprise them with a download on top of that. Any other failure
        // (unsupported target, etc.) does fall back to a manual download.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}
