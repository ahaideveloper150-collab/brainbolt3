import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { sanitizeTextInput } from "@/lib/sanitize";
import { logError, toSafeError } from "@/lib/errorHandler";
import { getModel } from "@/lib/modelRouter";

// ============================================================================
// SECURITY: Rate Limiting
// ============================================================================
import { getRateLimiter } from "@/lib/rate-limit";

// Rate limit: 10 requests per minute per IP
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute


// ============================================================================
// SECURITY: Input Validation & Sanitization
// ============================================================================
const MAX_TEXT_LENGTH = 12000; // characters
const MAX_REQUEST_SIZE = 15000; // bytes (approximate)

// Use the centralized sanitization utility
function sanitizeText(text: string): string {
  return sanitizeTextInput(text, MAX_TEXT_LENGTH);
}

function validateInput(text: string, numQuestions: number, difficulty: string): {
  valid: boolean;
  error?: string;
} {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: "Input text cannot be empty." };
  }

  const sanitized = sanitizeText(text);
  if (sanitized.length === 0) {
    return { valid: false, error: "Input text contains no valid content after sanitization." };
  }

  if (sanitized.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Input text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`,
    };
  }

  if (numQuestions < 1 || numQuestions > 50) {
    return { valid: false, error: "Number of questions must be between 1 and 50." };
  }

  const validDifficulties = ["easy", "medium", "hard"];
  if (!validDifficulties.includes(difficulty)) {
    return { valid: false, error: `Difficulty must be one of: ${validDifficulties.join(", ")}.` };
  }

  return { valid: true };
}

// ============================================================================
// Types
// ============================================================================
interface MCQRequest {
  text: string;
  num_questions: number;
  difficulty: "easy" | "medium" | "hard";
  include_explanations: boolean;
  title?: string;
  model?: string;
}

interface MCQ {
  id: number;
  question: string;
  options: string[];
  correct: string;
  explanation?: string;
}

interface MCQResponse {
  mcqs: MCQ[];
  source_tokens: number;
}

// ============================================================================
// API Route Handler
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate Limiting
    const limiter = getRateLimiter();
    const rateLimit = await limiter.check(req, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { status: 429 },
      );
    }

    // SECURITY: Request Size Limit
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: "Request payload too large." },
        { status: 413 },
      );
    }

    // Parse and validate request body
    let body: MCQRequest;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 },
      );
    }

    // SECURITY: Input Validation
    const validation = validateInput(
      body.text || "",
      body.num_questions || 10,
      body.difficulty || "medium",
    );
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    const sanitizedText = sanitizeText(body.text);
    const numQuestions = body.num_questions || 10;
    const difficulty = body.difficulty || "medium";
    const includeExplanations = body.include_explanations ?? true;
    const title = body.title || "MCQ Set";

    // Get optimal model for MCQ generation task
    const modelConfig = getModel("mcqs");

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
      console.error("MCQ API: API key is missing (server-side check)");
      return NextResponse.json(
        { error: "Server configuration error: API key not found" },
        { status: 500 },
      );
    }

    // ========================================================================
    // LLM Integration: Generate MCQs using OpenRouter API
    // ========================================================================
    console.log("MCQ Generation Request:", {
      numQuestions,
      difficulty,
      includeExplanations,
      textLength: sanitizedText.length,
      // SECURITY: Do not log sensitive content
    });

    // Build the system prompt for MCQ generation
    const systemPrompt = `You are BrainBolt's MCQ generation engine. Your only source of truth is the exact \`text\` provided in the request. Follow these rules strictly.

1) PRIMARY RULES

- ONLY use information explicitly present in the provided text. Do NOT invent facts, dates, or details that are not in the text.

- Do NOT hallucinate. If the text lacks enough information to create a valid MCQ, return an error object (see output schema) indicating "INSUFFICIENT_CONTEXT".

- Preserve the original meaning and terminology from the text. Do NOT alter technical terms.

2) MCQ CREATION RULES

- Generate the requested number of MCQs (${numQuestions}) and adhere to difficulty level: ${difficulty}
  - Easy: Straightforward questions testing basic recall and understanding
  - Medium: Questions requiring analysis, application, or moderate reasoning
  - Hard: Complex questions requiring deep understanding, synthesis, or critical thinking

- Each MCQ must have exactly 4 options (A, B, C, D) and one correct option.

- Distractors (incorrect options) must be plausible, concise, and not trivially wrong.

- Keep questions concise and exam-appropriate (one or two sentences).

- ${includeExplanations ? "If include_explanations is true, provide a short explanation (1–2 sentences) referencing the text." : "Do NOT include explanations."}

- Do not add extra sections, summaries, or unrelated content.

3) SAFETY & SOURCE RULES

- Never include the API key or any sensitive environment info in the output.

- Do not include broken HTML, scripts, or markup in the output.

4) LANGUAGE & STYLE

- Use clear, formal, exam-appropriate English.

- Maintain consistent grammar and punctuation.

- Keep answers and options short (preferably ≤ 20 words per option).

5) OUTPUT FORMAT (MUST BE VALID JSON ONLY)

Return exactly one top-level JSON object using the schema below. **Do not include any additional text, commentary, or markdown — only JSON.**

Success response format:

{
  "status": "OK",
  "mcqs": [
    {
      "id": 1,
      "question": "string",
      "options": ["string","string","string","string"],
      "correct": "A" | "B" | "C" | "D",
      ${includeExplanations ? '"explanation": "string (optional, include only if include_explanations true)",' : ''}
    },
    ...
  ],
  "metadata": {
    "num_questions_requested": ${numQuestions},
    "num_questions_generated": <int>,
    "difficulty": "${difficulty}",
    "source_tokens_estimate": <int>
  }
}

Error response format (when model cannot produce valid MCQs due to lack of info):

{
  "status": "ERROR",
  "error_code": "INSUFFICIENT_CONTEXT",
  "message": "Short user-friendly message describing what is missing (e.g., 'text does not contain factual statements to form MCQs')."
}

6) EXAMPLES & BEHAVIOR

- If the text is a high-level narrative without factual claims (e.g., a story without facts), prefer returning INSUFFICIENT_CONTEXT rather than inventing.

- For factual paragraphs (definitions, processes, facts), extract facts and convert them into direct questions.

- For numeric facts in the text, use them as-is in questions (do not compute or alter numbers).

7) JSON VALIDITY

- Ensure the JSON is valid (no trailing commas, no comments).

- If multiple MCQs are requested but only fewer valid MCQs can be produced, produce only valid ones and set \`num_questions_generated\` accordingly.`;

    const userPrompt = `Generate ${numQuestions} ${difficulty} difficulty multiple choice questions based on this text:

${sanitizedText}

${title ? `Topic: ${title}` : ""}

Return the response in the exact JSON format specified in the system prompt.`;

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
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = llmResponse.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Try to parse as JSON
      parsedResponse = JSON.parse(cleanedResponse);

      // Check for error response
      if (parsedResponse.status === "ERROR") {
        const errorCode = parsedResponse.error_code || "UNKNOWN_ERROR";
        const errorMessage = parsedResponse.message || "Failed to generate MCQs";

        if (errorCode === "INSUFFICIENT_CONTEXT") {
          return NextResponse.json(
            {
              error: errorMessage,
              error_code: errorCode,
            },
            { status: 400 },
          );
        }

        return NextResponse.json(
          {
            error: errorMessage,
            error_code: errorCode,
          },
          { status: 500 },
        );
      }

      // Handle success response with new format
      if (parsedResponse.status === "OK" && Array.isArray(parsedResponse.mcqs)) {
        const mcqsArray = parsedResponse.mcqs;

        if (mcqsArray.length === 0) {
          return NextResponse.json(
            {
              error: "No MCQs were generated. The text may not contain enough information.",
            },
            { status: 400 },
          );
        }

        // Validate and format MCQs
        const formattedMCQs: MCQ[] = mcqsArray.map((item: any) => {
          // Extract question
          const question = item.question || "";
          if (!question) {
            throw new Error(`Question ${item.id || "unknown"} is missing question text`);
          }

          // Extract options
          let options: string[] = [];
          if (Array.isArray(item.options) && item.options.length === 4) {
            options = item.options;
          } else {
            throw new Error(`Question ${item.id || "unknown"} must have exactly 4 options`);
          }

          // Extract correct answer
          let correct = item.correct || "";
          if (!correct || !["A", "B", "C", "D"].includes(correct.toUpperCase())) {
            throw new Error(`Question ${item.id || "unknown"} must have a valid correct answer (A, B, C, or D)`);
          }
          correct = correct.toUpperCase();

          // Extract explanation
          const explanation = includeExplanations && item.explanation
            ? String(item.explanation).trim()
            : undefined;

          return {
            id: item.id || 0,
            question: question.trim(),
            options: options.map((opt: any) => String(opt).trim()),
            correct,
            explanation,
          };
        });

        // Get token estimate from metadata or calculate
        const sourceTokens = parsedResponse.metadata?.source_tokens_estimate
          || Math.ceil(sanitizedText.length / 4);

        const response: MCQResponse = {
          mcqs: formattedMCQs,
          source_tokens: sourceTokens,
        };

        return NextResponse.json(response, {
          headers: {
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        });
      }

      // Fallback: Try to handle old format (array directly) for backward compatibility
      if (Array.isArray(parsedResponse)) {
        const formattedMCQs: MCQ[] = parsedResponse.slice(0, numQuestions).map((item: any, index: number) => {
          const question = item.question || "";
          if (!question) {
            throw new Error(`Question ${index + 1} is missing question text`);
          }

          let options: string[] = [];
          if (Array.isArray(item.options) && item.options.length === 4) {
            options = item.options;
          } else {
            throw new Error(`Question ${index + 1} must have exactly 4 options`);
          }

          let correct = item.correct || "";
          if (!correct || !["A", "B", "C", "D"].includes(correct.toUpperCase())) {
            throw new Error(`Question ${index + 1} must have a valid correct answer`);
          }
          correct = correct.toUpperCase();

          const explanation = includeExplanations && item.explanation
            ? String(item.explanation).trim()
            : undefined;

          return {
            id: item.id || index + 1,
            question: question.trim(),
            options: options.map((opt: any) => String(opt).trim()),
            correct,
            explanation,
          };
        });

        const sourceTokens = Math.ceil(sanitizedText.length / 4);
        const response: MCQResponse = {
          mcqs: formattedMCQs,
          source_tokens: sourceTokens,
        };

        return NextResponse.json(response, {
          headers: {
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        });
      }

      throw new Error("Invalid response format: expected status OK with mcqs array or error object");
    } catch (parseError) {
      console.error("Failed to parse LLM response:", {
        error: parseError instanceof Error ? parseError.message : "Unknown error",
        responsePreview: llmResponse.substring(0, 500),
      });
      throw new Error(
        `Failed to parse MCQ response: ${parseError instanceof Error ? parseError.message : "Invalid format"}`,
      );
    }


  } catch (error) {
    logError(error, {
      route: "/api/mcq",
      operation: "POST",
    });

    const safeError = toSafeError(
      error,
      "Failed to generate MCQs. Please try again.",
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

// SECURITY: CORS - Restrict origins in production
// TODO: Add proper CORS headers for production
// Example: Access-Control-Allow-Origin: https://yourdomain.com

