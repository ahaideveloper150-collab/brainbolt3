/**
 * SECURITY: This file MUST only be imported in server-side API routes.
 * API keys are NEVER exposed to the client bundle.
 * 
 * This module uses server-only environment variables that are not available
 * in the browser. Next.js automatically excludes server-only code from client bundles.
 */

// SECURITY: Ensure this code only runs server-side
if (typeof window !== "undefined") {
  throw new Error(
    "getGroqClient() cannot be called from client-side code. API keys must remain server-side only.",
  );
}

// OpenRouter API client (OpenAI-compatible)
interface ChatCompletion {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ChatCompletions {
  create: (params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  }) => Promise<ChatCompletion>;
}

let openRouterClient: { chat: { completions: ChatCompletions } } | null = null;

export function getGroqClient() {
  // SECURITY: Double-check we're on the server
  if (typeof window !== "undefined") {
    throw new Error(
      "API keys cannot be accessed from client-side code. This function must only be called from server-side API routes.",
    );
  }

  if (!openRouterClient) {
    // SECURITY: Only access server-side environment variables
    // These are NOT available in the client bundle
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "API key is not set in the environment. Please create a .env.local file with your OpenRouter API key.",
      );
    }

    // Create OpenRouter client using fetch (OpenAI-compatible API)
    openRouterClient = {
      chat: {
        completions: {
          create: async (params: {
            model: string;
            messages: Array<{ role: string; content: string }>;
            temperature?: number;
          }) => {
            // SECURITY: API key is only used server-side in this fetch call
            // This fetch happens on the server, never in the browser
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "BrainBolt",
              },
              body: JSON.stringify({
                model: params.model,
                messages: params.messages,
                temperature: params.temperature || 0.2,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                `OpenRouter API error: ${response.status} ${JSON.stringify(errorData)}`,
              );
            }

            return await response.json();
          },
        },
      },
    };
  }
  return openRouterClient;
}

// Export for backward compatibility
export const groq = {
  get chat() {
    return getGroqClient().chat;
  },
};

