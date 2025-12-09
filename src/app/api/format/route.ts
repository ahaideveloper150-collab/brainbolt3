import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { sanitizeTextInput } from "@/lib/sanitize";
import { logError, toSafeError } from "@/lib/errorHandler";
import { getModel } from "@/lib/modelRouter";

// Using Node.js runtime for Groq SDK compatibility
// export const runtime = "edge";

const SYSTEM_PROMPT = `You are BrainBolt, an academic answer formatting engine. 

Your job is to take a student's rough, messy, unstructured answer and rewrite it into a neat, clear, professional academic format.

RULES:

- Do NOT change the meaning of the answer.

- Do NOT shorten or summarize.

- Only reformat and organize.

- Add headings and subheadings.

- Add bullet points or numbering where useful.

- Highlight important keywords using **bold**.

- Improve grammar, clarity, and readability.

- Maintain the student's information exactly; do not add extra content.

- Final output must look presentation-ready and exam-appropriate.

Always return a clean, well-structured formatted answer.`;

// SECURITY: This is a server-side API route - API keys are safe here
// Next.js ensures this code only runs on the server, never in the client bundle
export async function POST(req: NextRequest) {
  try {
    // SECURITY: API keys are only accessed server-side via process.env
    // These environment variables are NOT included in the client bundle
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // SECURITY: Never expose API key in error messages
      console.error("API key is missing (server-side check)");
      return NextResponse.json(
        { error: "Server configuration error: API key not found" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const rawText = (body?.text ?? "").toString();

    // Sanitize input to prevent security vulnerabilities
    const text = sanitizeTextInput(rawText, 50000).trim();

    if (!text) {
      return NextResponse.json(
        { error: "Text is required. Please provide valid content." },
        { status: 400 },
      );
    }

    // Get optimal model for formatter task
    const modelConfig = getModel("formatter");

    // Override model if specified in request
    if (body.model && body.model !== "auto") {
      modelConfig.model = body.model;
      modelConfig.description = `User override: ${body.model}`;
    }

    // SECURITY: Model name is safe to log (not the key itself)
    console.log("Calling OpenRouter API:", modelConfig.description);

    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: modelConfig.model,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: modelConfig.temperature,
    });

    const formatted =
      completion.choices[0]?.message?.content ?? "Unable to format text.";

    if (!formatted || formatted === "Unable to format text.") {
      console.error("No content received from OpenRouter API");
      return NextResponse.json(
        { error: "No formatted content received from AI" },
        { status: 500 },
      );
    }

    // History saving removed for stateless mode

    return NextResponse.json({ formatted });
  } catch (error) {
    logError(error, {
      route: "/api/format",
      operation: "POST",
    });

    const safeError = toSafeError(
      error,
      "Failed to format text. Please try again.",
    );

    return NextResponse.json(
      {
        error: safeError.message,
        code: safeError.code,
        ...(process.env.NODE_ENV === "development" && safeError.details
          ? { details: safeError.details }
          : {}),
      },
      { status: safeError.statusCode },
    );
  }
}
