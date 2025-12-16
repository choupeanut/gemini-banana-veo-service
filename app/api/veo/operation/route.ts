import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not set." },
        { status: 500 }
      );
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const body = await req.json();
    const name = body.name as string | undefined;

    if (!name) {
      return NextResponse.json(
        { error: "Missing operation name" },
        { status: 400 }
      );
    }

    // Some SDK versions accept just the name, others expect an operation object.
    // We'll pass the minimal required shape with a name.
    const fresh = await ai.operations.getVideosOperation({
      operation: { name } as unknown as never,
    });

    return NextResponse.json(fresh);
  } catch (error) {
    console.error("Error polling operation:", error);
    return NextResponse.json(
      { error: "Failed to poll operation" },
      { status: 500 }
    );
  }
}
