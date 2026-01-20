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

    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const form = await req.formData();

    const prompt = (form.get("prompt") as string) || "";
    const model = (form.get("model") as string) || "veo-3.0-generate-001";
    const negativePrompt = (form.get("negativePrompt") as string) || undefined;
    const aspectRatio = (form.get("aspectRatio") as string) || undefined;
    const resolution = (form.get("resolution") as string) || undefined;
    const durationSecondsStr = (form.get("durationSeconds") as string) || undefined;

    const imageFile = form.get("imageFile");
    const imageBase64 = (form.get("imageBase64") as string) || undefined;
    const imageMimeType = (form.get("imageMimeType") as string) || undefined;
    const imageFilesRaw = form.getAll("imageFiles");

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Collect all images
    const images: { imageBytes: string; mimeType: string }[] = [];

    // 1. Process multiple files
    for (const f of imageFilesRaw) {
      if (f instanceof File) {
        const buf = await f.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        images.push({ imageBytes: b64, mimeType: f.type || "image/png" });
      }
    }

    // 2. Process legacy single inputs if no multiple files were found (or to be additive)
    // Avoid adding duplicates if the same file was passed in multiple ways
    if (images.length === 0) {
        if (imageFile && imageFile instanceof File) {
          const buf = await imageFile.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          images.push({ imageBytes: b64, mimeType: imageFile.type || "image/png" });
        } else if (imageBase64) {
          const cleaned = imageBase64.includes(",")
            ? imageBase64.split(",")[1]
            : imageBase64;
          images.push({ imageBytes: cleaned, mimeType: imageMimeType || "image/png" });
        }
    }

    // Construct SDK options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateOptions: any = {
      model,
      prompt,
      config: {
        ...(aspectRatio ? { aspectRatio } : {}),
        ...(resolution ? { resolution } : {}),
        ...(durationSecondsStr ? { durationSeconds: parseInt(durationSecondsStr) } : {}),
      }
    };

    if (negativePrompt) {
        generateOptions.config.negativePrompt = negativePrompt;
    }

    if (images.length === 1) {
        // Official example pattern for single image: direct 'image' property with 'imageBytes'
        // SDK handles conversion for this top-level field.
        generateOptions.image = {
            imageBytes: images[0].imageBytes,
            mimeType: images[0].mimeType
        };
    } else if (images.length > 1) {
        // Correct structure for Veo 3.1 multi-image input
        // Providing BOTH fields to satisfy potential SDK transformation logic (imageBytes) 
        // AND raw API requirements (bytesBase64Encoded) in case of pass-through.
        generateOptions.config.referenceImages = images.map(img => ({
            image: {
                imageBytes: img.imageBytes,
                bytesBase64Encoded: img.imageBytes,
                mimeType: img.mimeType
            },
            referenceType: "ASSET"
        }));
    }

    console.log("Starting Veo generation (SDK) with options:", JSON.stringify(generateOptions, (k, v) => (k === 'imageBytes' || k === 'bytesBase64Encoded') ? '[BASE64]' : v, 2));

    const operation = await ai.models.generateVideos(generateOptions);
    const name = (operation as unknown as { name?: string }).name;
    return NextResponse.json({ name });
  } catch (error: unknown) {
    console.error("Error starting Veo generation:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: errorMessage || "Failed to start generation" },
      { status: 500 }
    );
  }
}
