/**
 * SECURITY: This file is for legacy support and is NOT currently used.
 * If you need to use this, ensure it's ONLY imported in server-side API routes.
 * 
 * API keys are NEVER exposed to the client bundle.
 */

// SECURITY: Ensure this code only runs server-side
if (typeof window !== "undefined") {
  throw new Error(
    "groqClient cannot be initialized from client-side code. API keys must remain server-side only.",
  );
}

import Groq from "groq-sdk";

// SECURITY: API key is only accessed server-side via process.env
// This environment variable is NOT included in the client bundle
if (!process.env.GROQ_API_KEY) {
  // This will surface a clear error during build or first request.
  throw new Error("GROQ_API_KEY is not set in the environment.");
}

// SECURITY: API key is only used server-side in this initialization
export const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const BRAINBOLT_MODEL = process.env.BRAINBOLT_MODEL ?? "x-ai/grok-4.1-fast";

export const buildBrainBoltPrompt = (rawAnswer: string) => {
  return `
You are BrainBolt, an assistant that ONLY REFORMATS student answers without changing meaning.

STRICT RULES:
- Do NOT summarize, shorten, or expand the content.
- Do NOT add new ideas, examples, or explanations.
- Keep ALL information, points, and nuances from the original answer.
- Preserve the original language level (do not over-complicate or over-simplify).
- If the student uses first person, keep it first person.

Your job is to transform the raw answer into a clean, exam-ready, presentation-ready layout with:
- Clear headings and subheadings
- Bullet points and numbered lists where helpful
- Important keywords and key phrases in **bold**
- Fixed grammar, spelling, and punctuation
- Logical grouping and flow

Very important:
- Output MUST stay in the SAME LANGUAGE as the student's answer.
- Do NOT add an introduction or conclusion that wasn't there.
- Do NOT include any explanation of what you did; only output the formatted answer.

Here is the student's raw answer (between <answer> tags). Return ONLY the fully formatted version:

<answer>
${rawAnswer}
</answer>
`;
};


