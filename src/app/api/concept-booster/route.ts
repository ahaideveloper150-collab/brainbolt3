import { NextRequest, NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { sanitizeTextInput, sanitizeSingleLineInput } from "@/lib/sanitize";
import { logError, toSafeError } from "@/lib/errorHandler";
import { getModel } from "@/lib/modelRouter";

// ============================================================================
// SECURITY: Rate Limiting (In-Memory Store)
// TODO: Replace with Redis for production
// ============================================================================
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit: 10 requests per minute per IP
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function getRateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
  return `concept-booster:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
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
// SECURITY: Input Validation & Sanitization
// ============================================================================
const MAX_TOPIC_LENGTH = 500;
const MAX_REQUEST_SIZE = 2000;

// Use the centralized sanitization utility
function sanitizeText(text: string): string {
  return sanitizeTextInput(text, MAX_TOPIC_LENGTH);
}

function validateInput(topic: string, learningLevel: string, step?: string, userResponse?: string): {
  valid: boolean;
  error?: string;
} {
  if (!topic || topic.trim().length === 0) {
    return { valid: false, error: "Topic cannot be empty." };
  }

  const sanitized = sanitizeText(topic);
  if (sanitized.length === 0) {
    return { valid: false, error: "Topic contains no valid content after sanitization." };
  }

  if (sanitized.length > MAX_TOPIC_LENGTH) {
    return {
      valid: false,
      error: `Topic exceeds maximum length of ${MAX_TOPIC_LENGTH} characters.`,
    };
  }

  const validLevels = [
    "Class 6–8",
    "Class 9–10",
    "Class 11–12 (FSc/Intermediate)",
    "University Level",
    "Beginner Adult",
    "Advanced Learner",
    "Other",
  ];
  if (!validLevels.includes(learningLevel)) {
    return { valid: false, error: `Invalid learning level.` };
  }

  return { valid: true };
}

// ============================================================================
// Types
// ============================================================================
interface ConceptBoosterRequest {
  topic: string;
  learning_level: string;
  step?: "diagnostic" | "explanation" | "ask_doubts" | "check_understanding" | "practice" | "feedback";
  diagnostic_answers?: Array<{ question: string; answer: string }>;
  skip_diagnostic?: boolean;
  doubt?: string;
  user_response?: string;
  conversation_history?: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
}

interface ConceptBoosterResponse {
  status: "OK" | "ERROR";
  step: string;
  content: {
    questions?: Array<{ id: number; question: string }>;
    explanation?: {
      simple_intuition: string;
      analogy: string;
      level_appropriate_detail: string;
      example: string;
    };
    understanding_check?: {
      questions: Array<{ id: number; question: string; correct_answer?: string }>;
    };
    practice_task?: {
      task: string;
      ideal_response?: string;
    };
    feedback?: {
      comparison: string;
      improvements: string[];
      misunderstandings: string[];
    };
    message?: string;
  };
  metadata?: {
    learning_level: string;
    topic: string;
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

    // SECURITY: Request Size Limit
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: "Request payload too large." },
        { status: 413 },
      );
    }

    // Parse and validate request body
    let body: ConceptBoosterRequest;
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
      body.topic || "",
      body.learning_level || "",
      body.step,
      body.user_response,
    );
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    const sanitizedTopic = sanitizeSingleLineInput(body.topic, MAX_TOPIC_LENGTH);
    const learningLevel = sanitizeSingleLineInput(body.learning_level || "", 100);
    const step = sanitizeSingleLineInput(body.step || "diagnostic", 50);
    const doubt = sanitizeTextInput(body.doubt || "", 1000);

    // Get optimal model for concept booster task (higher quality model)
    const modelConfig = getModel("concept_booster");

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
      console.error("Concept Booster API: API key is missing (server-side check)");
      return NextResponse.json(
        { error: "Server configuration error: API key not found" },
        { status: 500 },
      );
    }

    // ========================================================================
    // LLM Integration: Generate adaptive learning content
    // ========================================================================
    console.log("Concept Booster Request:", {
      topic: sanitizedTopic,
      learningLevel,
      step,
      // SECURITY: Do not log sensitive content
    });

    // Build system prompt
    const systemPrompt = `You are Concept Booster — an adaptive learning engine.

Your job: Turn any academic or technical topic into a personalized understanding experience for the user.

WORKFLOW:

1. **Assess Starting Point** (diagnostic step)
   - Ask 2–3 quick diagnostic questions related to the topic.
   - Use the answers to understand their current knowledge.
   - If user skips diagnostic, use average knowledge level for their selected learning level.

2. **Explain the Topic According to Their Level** (explanation step)
   Provide layered explanations:
   - If diagnostic was skipped, assume average knowledge level for the selected level:
     - Class 6–8 → Basic understanding, simple concepts
     - Class 9–10 → Some prior knowledge, can handle diagrams and basics
     - Class 11–12 → Good foundation, can handle formulas and concepts
     - University Level → Strong foundation, can handle theory and deeper insights
     - Beginner Adult → Minimal prior knowledge, start from basics
     - Advanced Learner → Strong background, can handle technical depth
   - **Simple Intuition** (no jargon)
   - **Analogy** (daily-life example)
   - **Level-Appropriate Detail**
     - Class 6–8 → simple
     - Class 9–10 → diagrams, basics
     - Class 11–12 → formulas + concepts
     - University → theory + deeper insight
     - Advanced → deeper math or technical depth
   - Give a **small, level-matched example**.

3. **Ask Doubts** (ask_doubts step)
   - Allow users to ask questions about the topic they just learned.
   - Provide clear, level-appropriate answers to their doubts.
   - Relate answers back to the main topic explanation.
   - Users can ask multiple questions or skip to continue.

4. **Check Understanding** (check_understanding step)
   - Ask 4–5 conceptual questions tailored to their level.
   - Adjust teaching if they answer incorrectly.

5. **Practice Task** (practice step)
   - Give 1 small task, exercise, or mini-problem suitable for their level.

6. **Highlight Improvements** (feedback step)
   - Compare their answer with the ideal response.
   - Point out misunderstandings clearly (no judgment).

7. **Keep Explanations Structured**
   - Use clean headings
   - Bullet points
   - Short paragraphs
   - No unnecessary complexity

OUTPUT FORMAT (MUST BE VALID JSON ONLY):

Return exactly one top-level JSON object. Do not include any additional text, commentary, or markdown — only JSON.

For diagnostic step:
{
  "status": "OK",
  "step": "diagnostic",
  "content": {
    "questions": [
      { "id": 1, "question": "Question text?" },
      { "id": 2, "question": "Question text?" },
      { "id": 3, "question": "Question text?" }
    ],
    "message": "Brief introduction to diagnostic questions"
  },
  "metadata": {
    "learning_level": "${learningLevel}",
    "topic": "${sanitizedTopic}",
    "tokens_estimate": <int>
  }
}

For explanation step:
{
  "status": "OK",
  "step": "explanation",
  "content": {
    "explanation": {
      "simple_intuition": "Simple explanation without jargon",
      "analogy": "Daily-life analogy",
      "level_appropriate_detail": "Detailed explanation matching the level",
      "example": "Small level-matched example"
    },
    "message": "Brief introduction"
  },
  "metadata": {
    "learning_level": "${learningLevel}",
    "topic": "${sanitizedTopic}",
    "tokens_estimate": <int>
  }
}

For ask_doubts step (when user asks a question):
{
  "status": "OK",
  "step": "ask_doubts",
  "content": {
    "answer": "Clear, level-appropriate answer to the user's doubt",
    "message": "Brief acknowledgment"
  },
  "metadata": {
    "learning_level": "${learningLevel}",
    "topic": "${sanitizedTopic}",
    "tokens_estimate": <int>
  }
}

For ask_doubts step (initial - no question yet):
{
  "status": "OK",
  "step": "ask_doubts",
  "content": {
    "message": "Welcoming message encouraging user to ask doubts/questions"
  },
  "metadata": {
    "learning_level": "${learningLevel}",
    "topic": "${sanitizedTopic}",
    "tokens_estimate": <int>
  }
}

For check_understanding step:
{
  "status": "OK",
  "step": "check_understanding",
  "content": {
    "understanding_check": {
      "questions": [
        { "id": 1, "question": "Question?", "correct_answer": "Brief correct answer" },
        { "id": 2, "question": "Question?", "correct_answer": "Brief correct answer" }
      ]
    },
    "message": "Brief introduction"
  },
  "metadata": {
    "learning_level": "${learningLevel}",
    "topic": "${sanitizedTopic}",
    "tokens_estimate": <int>
  }
}

For practice step:
{
  "status": "OK",
  "step": "practice",
  "content": {
    "practice_task": {
      "task": "Task description",
      "ideal_response": "Ideal answer (optional, can be provided after user submits)"
    },
    "message": "Brief introduction"
  },
  "metadata": {
    "learning_level": "${learningLevel}",
    "topic": "${sanitizedTopic}",
    "tokens_estimate": <int>
  }
}

For feedback step:
{
  "status": "OK",
  "step": "feedback",
  "content": {
    "feedback": {
      "comparison": "Comparison of user answer vs ideal",
      "improvements": ["Improvement point 1", "Improvement point 2"],
      "misunderstandings": ["Misunderstanding 1", "Misunderstanding 2"]
    },
    "message": "Brief summary"
  },
  "metadata": {
    "learning_level": "${learningLevel}",
    "topic": "${sanitizedTopic}",
    "tokens_estimate": <int>
  }
}

Error format:
{
  "status": "ERROR",
  "error_code": "INSUFFICIENT_CONTEXT",
  "message": "Error message"
}`;

    // Build user prompt based on step
    let userPrompt = "";
    if (step === "diagnostic") {
      userPrompt = `Topic: ${sanitizedTopic}
Learning Level: ${learningLevel}

Generate 2-3 diagnostic questions to assess the user's starting knowledge about this topic.`;
    } else if (step === "explanation") {
      // Handle skipped diagnostic - use average knowledge level
      let diagnosticInfo = "";
      if (body.skip_diagnostic || !body.diagnostic_answers || body.diagnostic_answers.length === 0) {
        diagnosticInfo = `The user skipped the diagnostic questions. Use the average knowledge level for ${learningLevel} students to tailor the explanation.`;
      } else {
        diagnosticInfo = `Based on these diagnostic answers:\n${body.diagnostic_answers.map((q: any) => `Q: ${q.question}\nA: ${q.answer}`).join("\n\n")}`;
      }
      userPrompt = `Topic: ${sanitizedTopic}
Learning Level: ${learningLevel}
${diagnosticInfo}

Provide a comprehensive explanation of this topic tailored to the learning level.`;
    } else if (step === "ask_doubts") {
      if (doubt.trim()) {
        // User asked a specific doubt
        userPrompt = `Topic: ${sanitizedTopic}
Learning Level: ${learningLevel}
User's Doubt/Question: ${doubt}

Provide a clear, level-appropriate answer to the user's doubt. Make it easy to understand and relate it back to the main topic explanation.`;
      } else {
        // Initial doubt section - prepare the UI
        userPrompt = `Topic: ${sanitizedTopic}
Learning Level: ${learningLevel}

The user wants to ask doubts about this topic. Prepare a welcoming message encouraging them to ask questions.`;
      }
    } else if (step === "check_understanding") {
      userPrompt = `Topic: ${sanitizedTopic}
Learning Level: ${learningLevel}

Generate 4-5 conceptual questions to check understanding, tailored to this level.`;
    } else if (step === "practice") {
      userPrompt = `Topic: ${sanitizedTopic}
Learning Level: ${learningLevel}

Create a practice task or exercise suitable for this level.`;
    } else if (step === "feedback") {
      userPrompt = `Topic: ${sanitizedTopic}
Learning Level: ${learningLevel}
User's Response: ${body.user_response || ""}
Ideal Response: ${body.conversation_history?.find((h: any) => h.role === "assistant" && h.content.includes("ideal_response"))?.content || ""}

Provide feedback comparing the user's response with the ideal response.`;
    }

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
      // Extract JSON from response (handles Markdown code blocks and preambles)
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      let cleanedResponse = jsonMatch ? jsonMatch[0] : llmResponse.trim();

      parsedResponse = JSON.parse(cleanedResponse);

      // Check for error response
      if (parsedResponse.status === "ERROR") {
        return NextResponse.json(
          {
            error: parsedResponse.message || "Failed to generate content",
            error_code: parsedResponse.error_code,
          },
          { status: 400 },
        );
      }

      // Validate and return response
      if (parsedResponse.status === "OK") {
        const sourceTokens = parsedResponse.metadata?.tokens_estimate || Math.ceil(sanitizedTopic.length / 4);

        // History saving removed for stateless mode

        return NextResponse.json(parsedResponse, {
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
      route: "/api/concept-booster",
      operation: "POST",
    });

    const safeError = toSafeError(
      error,
      "Failed to process request. Please try again.",
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

