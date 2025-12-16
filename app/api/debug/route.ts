import { NextResponse } from "next/server";
import { GoogleGenAI, HarmCategory } from "@google/genai";

export async function GET() {
  try {
    const key = process.env.GEMINI_API_KEY;
    const keyStatus = key ? `Present (${key.length} chars)` : "Missing";
    
    console.log("Debug route hit. Key:", keyStatus);
    console.log("HarmCategory:", HarmCategory);

    return NextResponse.json({ 
      status: "ok", 
      keyStatus, 
      harmCategoryType: typeof HarmCategory,
      harmCategoryValue: HarmCategory ? "defined" : "undefined"
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
