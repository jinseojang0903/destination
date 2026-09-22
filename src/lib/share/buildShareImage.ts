import { toPng } from "html-to-image";

/** Rasterizes a DOM node to a PNG and either opens the native share sheet
 * (mobile, when available) or triggers a download (desktop fallback). */
export async function shareOrDownloadNode(node: HTMLElement, fileName = "destination-card.png") {
  const dataUrl = await toPng(node, { pixelRatio: 2 });

  if (navigator.share && navigator.canShare) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "다음 여행지" });
        return;
      }
    } catch {
      // fall through to download if share was cancelled/unsupported
    }
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}
