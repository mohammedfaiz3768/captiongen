import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // seconds — Vercel Pro/hobby max for API routes

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file") as File | null;
    const language = formData.get("language") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const apiKey =
      req.headers.get("x-api-key") || process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key configured. Add your Groq API key in Settings." },
        { status: 401 }
      );
    }

    const groqForm = new FormData();
    groqForm.append("file", audioFile, "audio.wav");
    groqForm.append("model", "whisper-large-v3");
    groqForm.append("response_format", "verbose_json");
    groqForm.append("timestamp_granularities[]", "word");
    groqForm.append("timestamp_granularities[]", "segment");

    // Always force language=en so Whisper outputs Roman/Latin script.
    // For Hinglish audio, this phonetically romanizes Hindi words (sab, bolte,
    // hai) while keeping English words (sniper, shot, clutch) unchanged.
    groqForm.append("language", "en");

    // Hinglish-style prompt so Whisper follows the Roman-script style
    groqForm.append(
      "prompt",
      "sab bolte hai wo sniper hai lekin 90% log pressure me shot miss kardete hai. " +
      "gameplay experience bahut accha tha aaj. headshot mila bhai, clutch kiya. " +
      "zone me aa gaye squad ke saath. rank push kar rahe hain lobby mein. " +
      "yeh rotation galat tha, damage nahi hua."
    );

    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: groqForm,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Groq API error: ${response.status} — ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
