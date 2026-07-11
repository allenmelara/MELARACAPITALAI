import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SYSTEM_PROMPT,
  companyAnalysisPrompt,
  documentAnalysisPrompt
} from "@/lib/prompts";

export const runtime = "nodejs";

const bodySchema = z.object({
  mode: z.enum(["company", "document"]),
  payload: z.unknown()
});

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const prompt =
      parsed.data.mode === "company"
        ? companyAnalysisPrompt(parsed.data.payload)
        : documentAnalysisPrompt(String(parsed.data.payload ?? ""));

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const message = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
      max_tokens: 5000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }]
    });

    const report = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ report });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Analysis failed. Check the server logs and API configuration." },
      { status: 500 }
    );
  }
}
