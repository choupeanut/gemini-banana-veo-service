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
    const name = body.name as string | undefined;

    if (!name) {
      return NextResponse.json(
        { error: "Missing operation name" },
        { status: 400 }
      );
    }

    // Direct REST API call to bypass SDK issues
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/${name}?key=${apiKey}`;

    const resp = await fetch(url);
    if (!resp.ok) {
        throw new Error(`Google API error: ${resp.status} ${resp.statusText}`);
    }
    
    const fresh = await resp.json();
    return NextResponse.json(fresh);
  } catch (error) {
    console.error("Error polling operation:", error);
    return NextResponse.json(
      { error: "Failed to poll operation" },
      { status: 500 }
    );
  }
}
