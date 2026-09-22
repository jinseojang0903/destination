import { NextRequest, NextResponse } from "next/server";

/** Proxies a photo search to Unsplash so the access key stays server-side.
 * GET /api/photo?q=Tokyo,Japan -> { url: string | null } */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ url: null });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ url: null });
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", q);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "portrait");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json({ url: null });
    }
    const data = await res.json();
    const photoUrl: string | undefined = data.results?.[0]?.urls?.regular;
    return NextResponse.json({ url: photoUrl ?? null });
  } catch {
    return NextResponse.json({ url: null });
  }
}
