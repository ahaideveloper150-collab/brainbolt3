# Security Documentation

## API Key Protection

### ✅ Server-Side Only

All API keys are **NEVER** exposed to the client. This is enforced through:

1. **Server-Only Environment Variables**
   - `GROQ_API_KEY` and `OPENROUTER_API_KEY` are server-side only
   - These variables are NOT prefixed with `NEXT_PUBLIC_`, so Next.js excludes them from client bundles
   - They are only accessible in `/api` routes and server components

2. **API Routes Protection**
   - All AI API calls happen exclusively in `/api` routes:
     - `/api/format`
     - `/api/mcq`
     - `/api/concept-booster`
     - `/api/flashcards`
   - These routes run only on the server, never in the browser

3. **Client-Side Calls**
   - Frontend pages make requests to `/api/*` routes (relative URLs)
   - Frontend NEVER directly calls external AI APIs
   - Frontend NEVER has access to API keys

4. **Runtime Protection**
   - `getGroqClient()` includes runtime checks to prevent client-side execution
   - Throws error if accidentally called from browser code

### Environment Variables

**Server-Side Only (Safe):**
- `GROQ_API_KEY` - Never exposed to client
- `OPENROUTER_API_KEY` - Never exposed to client
- `BRAINBOLT_MODEL` - Never exposed to client

**Client-Side Safe (Public):**
- `NEXT_PUBLIC_APP_URL` - Safe to expose (just a URL)

### Verification Checklist

✅ All API routes are in `/app/api/` directory (server-side only)  
✅ No `NEXT_PUBLIC_` prefix on API key variables  
✅ `groq.ts` includes runtime client-side checks  
✅ `.env.local` is in `.gitignore`  
✅ Frontend only calls `/api/*` routes, never external APIs directly  
✅ No API keys in console.log statements  
✅ No API keys in error messages  
✅ No API keys in response bodies  

### How to Verify

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Check client bundle:**
   - Search for "GROQ_API_KEY" or "OPENROUTER_API_KEY" in `.next/static/`
   - Should find ZERO matches

3. **Check browser console:**
   - Open DevTools → Network tab
   - Make an API request
   - Verify no API keys appear in request headers from client
   - All AI API calls should be from server to OpenRouter

### Best Practices

1. **Never:**
   - Prefix API key env vars with `NEXT_PUBLIC_`
   - Import `groq.ts` in client components
   - Log API keys (even in development)
   - Include API keys in error messages
   - Store API keys in client-side state

2. **Always:**
   - Keep API keys in `.env.local` (not committed to git)
   - Use server-side API routes for all external API calls
   - Validate API key presence server-side only
   - Use relative URLs (`/api/*`) from frontend

