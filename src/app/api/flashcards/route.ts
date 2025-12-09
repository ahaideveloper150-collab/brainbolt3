import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { sanitizeTextInput, sanitizeSingleLineInput } from "@/lib/sanitize";
import { logError, toSafeError } from "@/lib/errorHandler";
import { getModel } from "@/lib/modelRouter";

// ============================================================================
// SECURITY: Rate Limiting (In-Memory Store)
// ============================================================================
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function getRateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
  return `flashcards:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (Math.random() < 0.1) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitStore.set(key, newEntry);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: newEntry.resetTime,
    };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetTime,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetAt: entry.resetTime,
  };
}

// ============================================================================
// SECURITY: Input Validation
// ============================================================================
const MAX_TEXT_LENGTH = 15000;

// Use the centralized sanitization utility
function sanitizeText(text: string): string {
  return sanitizeTextInput(text, MAX_TEXT_LENGTH);
}

function validateInput(text: string, level: string): {
  valid: boolean;
  error?: string;
} {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: "Content cannot be empty." };
  }

  const sanitized = sanitizeText(text);
  if (sanitized.length === 0) {
    return { valid: false, error: "Content contains no valid text after sanitization." };
  }

  if (sanitized.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Content exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`,
    };
  }

  const validLevels = [
    "Class 6–8",
    "Class 9–10",
    "Class 11–12 (Intermediate)",
    "University Level",
    "Professional / Advanced",
    "Other",
  ];
  if (!validLevels.includes(level)) {
    return { valid: false, error: "Invalid learning level." };
  }

  return { valid: true };
}

// ============================================================================
// Types
// ============================================================================
interface FlashcardRequest {
  content: string;
  learning_level: string;
  model?: string;
}

interface Flashcard {
  id: number;
  type: "concept" | "application" | "trick";
  front: string;
  back: string;
}

interface FlashcardResponse {
  status: "OK" | "ERROR";
  flashcards: Flashcard[];
  metadata?: {
    learning_level: string;
    total_cards: number;
    concept_cards: number;
    application_cards: number;
    trick_cards: number;
    tokens_estimate: number;
  };
}

// ============================================================================
// API Route Handler
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate Limiting
    const rateLimitKey = getRateLimitKey(req);
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { status: 429 },
      );
    }

    // Parse and validate request body
    let body: FlashcardRequest;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 },
      );
    }

    // SECURITY: Input Validation
    const validation = validateInput(body.content || "", body.learning_level || "");
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    const sanitizedContent = sanitizeTextInput(body.content, MAX_TEXT_LENGTH);
    const learningLevel = sanitizeSingleLineInput(body.learning_level || "", 100);

    // Get optimal model for flashcard generation task
    const modelConfig = getModel("flashcards");

    // Override model if specified in request
    if (body.model && body.model !== "auto") {
      modelConfig.model = body.model;
      modelConfig.description = `User override: ${body.model}`;
    }

    // SECURITY: API keys are only accessed server-side via process.env
    // These environment variables are NOT included in the client bundle
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // SECURITY: Never expose API key in error messages
      console.error("Flashcards API: API key is missing (server-side check)");
      return NextResponse.json(
        { error: "Server configuration error: API key not found" },
        { status: 500 },
      );
    }

    // ========================================================================
    // LLM Integration: Generate Flashcards
    // ========================================================================
    console.log("Flashcard Generation Request:", {
      learningLevel,
      contentLength: sanitizedContent.length,
    });

    const systemPrompt = `You are BrainBolt Flashcard Generator.

Your job is to convert any study material into perfectly structured flashcards optimized for memory.

FLASHCARD FORMAT:
- **Front:** A clear question, definition, or key idea (keep it short, 1-2 sentences max).
- **Back:** A concise explanation, example, formula, or diagram description (2-3 sentences max).

FLASHCARD TYPES (generate all three types):

1. **Concept Cards** (What is it? How does it work?)
   - Front: Question or definition
   - Back: Clear explanation

2. **Application Cards** (Examples, uses, short problems)
   - Front: Application question or scenario
   - Back: Example or solution

3. **Trick/Mistake Cards** (Common errors students make)
   - Front: Common mistake or trick question
   - Back: Explanation of why it's wrong and correct approach

DIFFICULTY LEVELS:
- Class 6–8 → Simple language, basic concepts
- Class 9–10 → Exam terms, standard definitions
- Class 11–12 → Formulas + reasoning, intermediate concepts
- University Level → Technical depth, advanced terminology
- Professional / Advanced → Expert-level concepts, complex applications

RULES:
- Keep flashcards SHORT, CRISP, and easy to revise
- Avoid long paragraphs
- Each flashcard should focus on ONE key concept
- Match language and complexity to the selected level
- Generate a good mix of all three types

OUTPUT FORMAT (MUST BE VALID JSON ONLY):

{
  "status": "OK",
  "flashcards": [
    {
      "id": 1,
      "type": "concept",
      "front": "Question or definition",
      "back": "Concise explanation"
    },
    {
      "id": 2,
      "type": "application",
      "front": "Application question",
      "back": "Example or solution"
    },
    {
      "id": 3,
      "type": "trick",
      "front": "Common mistake",
      "back": "Why it's wrong and correct approach"
    }
  ],
  "metadata": {
    "learning_level": "${learningLevel}",
    "total_cards": <int>,
    "concept_cards": <int>,
    "application_cards": <int>,
    "trick_cards": <int>,
    "tokens_estimate": <int>
  }
}

Error format:
{
  "status": "ERROR",
  "error_code": "INSUFFICIENT_CONTEXT",
  "message": "Error message"
}`;

    const userPrompt = `Generate flashcards from this study material:

${sanitizedContent}

Learning Level: ${learningLevel}

Create a comprehensive set of flashcards covering the most important concepts. Include concept cards, application cards, and trick/mistake cards. Match the difficulty to ${learningLevel} level.

Return the flashcards in the exact JSON format specified.`;

    // Call OpenRouter API
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: modelConfig.model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: modelConfig.temperature,
    });

    const llmResponse = completion.choices[0]?.message?.content;
    if (!llmResponse) {
      throw new Error("No response received from LLM");
    }

    // Parse the JSON response
    let parsedResponse: any;
    try {
      let cleanedResponse = llmResponse.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      parsedResponse = JSON.parse(cleanedResponse);

      // Check for error response
      if (parsedResponse.status === "ERROR") {
        return NextResponse.json(
          {
            error: parsedResponse.message || "Failed to generate flashcards",
            error_code: parsedResponse.error_code,
          },
          { status: 400 },
        );
      }

      // Validate and format response
      if (parsedResponse.status === "OK" && Array.isArray(parsedResponse.flashcards)) {
        const flashcards = parsedResponse.flashcards.map((card: any, index: number) => ({
          id: card.id || index + 1,
          type: card.type || "concept",
          front: String(card.front || "").trim(),
          back: String(card.back || "").trim(),
        })).filter((card: any) => card.front && card.back);

        if (flashcards.length === 0) {
          return NextResponse.json(
            { error: "No valid flashcards were generated." },
            { status: 400 },
          );
        }

        // Count by type
        const conceptCards = flashcards.filter((c: any) => c.type === "concept").length;
        const applicationCards = flashcards.filter((c: any) => c.type === "application").length;
        const trickCards = flashcards.filter((c: any) => c.type === "trick").length;

        const sourceTokens = parsedResponse.metadata?.tokens_estimate || Math.ceil(sanitizedContent.length / 4);

        const response: FlashcardResponse = {
          status: "OK",
          flashcards,
          metadata: {
            learning_level: learningLevel,
            total_cards: flashcards.length,
            concept_cards: conceptCards,
            application_cards: applicationCards,
            trick_cards: trickCards,
            tokens_estimate: sourceTokens,
          },
        };

        // Save to history removed for stateless model

        return NextResponse.json(response, {
          headers: {
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        });
      }

      throw new Error("Invalid response format");
    } catch (parseError) {
      console.error("Failed to parse LLM response:", {
        error: parseError instanceof Error ? parseError.message : "Unknown error",
        responsePreview: llmResponse.substring(0, 500),
      });
      throw new Error(
        `Failed to parse response: ${parseError instanceof Error ? parseError.message : "Invalid format"}`,
      );
    }
  } catch (error) {
    logError(error, {
      route: "/api/flashcards",
      operation: "POST",
    });

    const safeError = toSafeError(
      error,
      "Failed to generate flashcards. Please try again.",
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

