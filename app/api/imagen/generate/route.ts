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
    const prompt = (body?.prompt as string) || "";
    const model = (body?.model as string) || "imagen-4.0-fast-generate-001";

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const resp = await ai.models.generateImages({
      model,
      prompt,
      config: {
        aspectRatio: "16:9",
      },
    });

    const image = resp.generatedImages?.[0]?.image;
    if (!image?.imageBytes) {
      return NextResponse.json({ error: "No image returned" }, { status: 500 });
    }

    return NextResponse.json({
      image: {
        imageBytes: image.imageBytes,
        mimeType: image.mimeType || "image/png",
      },
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
