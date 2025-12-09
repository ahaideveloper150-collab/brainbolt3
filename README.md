# BrainBolt ⚡

BrainBolt is a Next.js application that helps students transform their study materials into clean, exam-ready formats. It features two main tools:

1. **Answer Formatter** - Converts rough, unstructured answers into clean, presentation-ready academic format
2. **MCQ Generator** - Generates high-quality multiple choice questions from study materials

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- OpenRouter API key (or Groq API key for legacy support)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Create a `.env.local` file in the `brainbolt` directory:

```env
# OpenRouter API Key (recommended)
GROQ_API_KEY=sk-or-v1-your-openrouter-api-key-here

# Optional: Specify which model to use
# Default: x-ai/grok-4.1-fast
BRAINBOLT_MODEL=x-ai/grok-4.1-fast
```

**Getting an API Key:**
- Sign up at [OpenRouter](https://openrouter.ai/) and get your API key
- Add it to `.env.local` as shown above

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### Answer Formatter (`/`)
Transform rough student answers into clean, exam-ready formats with proper headings, bullet points, and formatting.

### MCQ Generator (`/mcq`)
Generate multiple choice questions from study materials:

- **Input**: Paste text or upload a text file (max 12,000 characters)
- **Options**: 
  - Number of questions (5, 10, 15, 20, or 25)
  - Difficulty level (Easy, Medium, Hard)
  - Include explanations (optional)
  - Topic title (optional)
- **Output**: 
  - Formatted MCQs with 4 options each
  - Correct answer indicators
  - Explanations (if requested)
  - Copy individual or all questions
  - Download as PDF (coming soon)

## API Endpoints

### POST `/api/format`
Formats raw text into clean academic format.

**Request:**
```json
{
  "text": "your raw text here"
}
```

**Response:**
```json
{
  "formatted": "formatted markdown text"
}
```

### POST `/api/mcq`
Generates multiple choice questions from input text.

**Request:**
```json
{
  "text": "chapter excerpt or study notes",
  "num_questions": 10,
  "difficulty": "medium",
  "include_explanations": true,
  "title": "Photosynthesis Chapter 1"
}
```

**Response:**
```json
{
  "mcqs": [
    {
      "id": 1,
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": "B",
      "explanation": "Explanation text..."
    }
  ],
  "source_tokens": 1234
}
```

## Security Features

The MCQ API endpoint includes:

- **Rate Limiting**: 10 requests per minute per IP (in-memory for dev, use Redis for production)
- **Input Validation**: Text length limits (12,000 chars), sanitization
- **Request Size Limits**: Maximum 15KB request payload
- **Server-Side Only**: API keys never exposed to client
- **Error Handling**: Structured error responses with appropriate status codes

**Note**: For production, replace the in-memory rate limiter with Redis or a similar distributed store.

## Testing the MCQ Endpoint Locally

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/mcq`
3. Paste some study material text
4. Configure options and click "Generate MCQs"

Or test via curl:

```bash
curl -X POST http://localhost:3000/api/mcq \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Photosynthesis is the process by which plants convert light energy into chemical energy.",
    "num_questions": 5,
    "difficulty": "medium",
    "include_explanations": true,
    "title": "Photosynthesis Basics"
  }'
```

## Project Structure

```
brainbolt/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── format/
│   │   │   │   └── route.ts      # Answer formatting API
│   │   │   └── mcq/
│   │   │       └── route.ts      # MCQ generation API
│   │   ├── mcq/
│   │   │   └── page.tsx          # MCQ Generator page
│   │   ├── page.tsx              # Home page (Answer Formatter)
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── MCQForm.tsx           # MCQ input form component
│   │   ├── MCQList.tsx           # MCQ results display component
│   │   └── MarkdownRenderer.tsx  # Markdown renderer
│   └── lib/
│       └── groq.ts               # OpenRouter/Groq client
├── .env.local                    # Environment variables (create this)
└── package.json
```

## Development Notes

- The MCQ API currently returns placeholder responses. Replace the stub in `/api/mcq/route.ts` with actual LLM calls.
- PDF download feature is stubbed - implement using `jspdf` or similar library.
- Rate limiting uses in-memory store for development - replace with Redis for production.
- CORS headers should be configured for production deployment.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
