import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not set." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const uri: string | undefined = body?.uri || body?.file?.uri;

    if (!uri) {
      return NextResponse.json({ error: "Missing file uri" }, { status: 400 });
    }

    const resp = await fetch(uri, {
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY as string,
        Accept: "*/*",
      },
      redirect: "follow",
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Upstream download failed: ${resp.status} ${resp.statusText}`,
          details: text,
        },
        { status: 502 }
      );
    }

    if (resp.body) {
      return new Response(resp.body, {
        status: 200,
        headers: {
          "Content-Type": resp.headers.get("content-type") || "video/mp4",
          "Content-Disposition": `inline; filename="veo3_video.mp4"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const arrayBuffer = await resp.arrayBuffer();
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": resp.headers.get("content-type") || "video/mp4",
        "Content-Disposition": `inline; filename="veo3_video.mp4"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Error downloading video:", error);
    return NextResponse.json(
      { error: "Failed to download video" },
      { status: 500 }
    );
  }
}
