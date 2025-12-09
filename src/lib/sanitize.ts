/**
 * Comprehensive input sanitization utility
 * Removes harmful content, blocks suspicious patterns, and prevents injection attacks
 */

/**
 * Sanitizes user input to prevent security vulnerabilities
 * @param input - The input string to sanitize
 * @param options - Optional configuration
 * @returns Sanitized string safe for processing
 */
export function sanitizeInput(
  input: string,
  options: {
    allowHtml?: boolean;
    maxLength?: number;
    removeNewlines?: boolean;
  } = {},
): string {
  if (typeof input !== "string") {
    return "";
  }

  let sanitized = input;

  // 1. Remove null bytes and control characters (except newlines/tabs if allowed)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

  // 2. Remove or escape HTML tags (unless explicitly allowed)
  if (!options.allowHtml) {
    // Remove script tags and their content
    sanitized = sanitized.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );
    // Remove style tags and their content
    sanitized = sanitized.replace(
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      "",
    );
    // Remove all other HTML tags
    sanitized = sanitized.replace(/<[^>]+>/g, "");
    // Escape remaining HTML entities
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  // 3. Block SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /('|(\\')|(;)|(\\;)|(--)|(\\--)|(\/\*)|(\\\/\*)|(\*\/)|(\\\*\/))/g,
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
    /(\bUNION\b.*\bSELECT\b)/gi,
  ];
  for (const pattern of sqlPatterns) {
    sanitized = sanitized.replace(pattern, "[BLOCKED]");
  }

  // 4. Block command injection patterns
  const commandPatterns = [
    /[;&|`$(){}[\]]/g, // Shell metacharacters
    /(\b(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown)\b)/gi, // Common commands
    /(\|\s*(nc|netcat|curl|wget|bash|sh|python|perl|ruby)\b)/gi, // Piped commands
    /(>\s*\/dev\/(null|tcp|udp))/gi, // Output redirection
    /(\$\{.*\})/g, // Variable expansion
    /(`.*`)/g, // Command substitution
  ];
  for (const pattern of commandPatterns) {
    sanitized = sanitized.replace(pattern, "[BLOCKED]");
  }

  // 5. Block JavaScript injection patterns
  const jsPatterns = [
    /(javascript:)/gi,
    /(on\w+\s*=)/gi, // Event handlers (onclick, onload, etc.)
    /(eval\s*\()/gi,
    /(function\s*\()/gi,
    /(setTimeout|setInterval)\s*\(/gi,
    /(document\.(cookie|write|location))/gi,
    /(window\.(location|open))/gi,
    /(XMLHttpRequest|fetch)\s*\(/gi,
  ];
  for (const pattern of jsPatterns) {
    sanitized = sanitized.replace(pattern, "[BLOCKED]");
  }

  // 6. Remove suspicious URL patterns
  sanitized = sanitized.replace(
    /(https?:\/\/[^\s]+(javascript|data|vbscript):)/gi,
    "[BLOCKED_URL]",
  );

  // 7. Remove or normalize newlines if requested
  if (options.removeNewlines) {
    sanitized = sanitized.replace(/\r?\n/g, " ");
  } else {
    // Normalize line endings
    sanitized = sanitized.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  // 8. Remove excessive whitespace (more than 2 consecutive spaces)
  sanitized = sanitized.replace(/ {3,}/g, "  ");

  // 9. Remove zero-width characters and other invisible characters
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // 10. Block suspicious file path patterns
  sanitized = sanitized.replace(
    /(\.\.\/|\.\.\\|\.\.\/\.\.|\.\.\\\.\.)/g,
    "[BLOCKED_PATH]",
  );

  // 11. Remove potential API keys and tokens
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9_-]{20,}/gi, "[API_KEY_REMOVED]");
  sanitized = sanitized.replace(/sk-[A-Za-z0-9]{32,}/gi, "[API_KEY_REMOVED]");
  sanitized = sanitized.replace(
    /[A-Za-z0-9_-]{40,}/g,
    (match) => {
      // Check if it looks like an API key (long alphanumeric string)
      if (/^[A-Za-z0-9_-]+$/.test(match)) {
        return "[API_KEY_REMOVED]";
      }
      return match;
    },
  );

  // 12. Trim and apply max length
  sanitized = sanitized.trim();
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Validates if input contains suspicious patterns
 * @param input - The input string to validate
 * @returns true if input appears safe, false if suspicious patterns detected
 */
export function isInputSafe(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }

  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /[;&|`$(){}[\]]/,
    /\.\.\//,
    /\.\.\\/,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitizes input specifically for text content (allows newlines, preserves formatting)
 */
export function sanitizeTextInput(input: string, maxLength?: number): string {
  return sanitizeInput(input, {
    allowHtml: false,
    maxLength,
    removeNewlines: false,
  });
}

/**
 * Sanitizes input for single-line text fields (removes newlines)
 */
export function sanitizeSingleLineInput(input: string, maxLength?: number): string {
  return sanitizeInput(input, {
    allowHtml: false,
    maxLength,
    removeNewlines: true,
  });
}

