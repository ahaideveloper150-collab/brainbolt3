#!/usr/bin/env node

/**
 * Security Verification Script
 * 
 * This script verifies that API keys are never exposed to the client bundle.
 * Run this after building the application.
 * 
 * Usage: node scripts/verify-api-key-security.js
 */

const fs = require("fs");
const path = require("path");

const API_KEY_PATTERNS = [
  /GROQ_API_KEY/gi,
  /OPENROUTER_API_KEY/gi,
  /sk-or-v1-/gi,
  /sk-[a-zA-Z0-9]{32,}/gi,
  /Bearer\s+[a-zA-Z0-9_-]{20,}/gi,
];

const CLIENT_BUNDLE_PATHS = [
  ".next/static/chunks",
  ".next/static/js",
  ".next/server/app",
];

let foundIssues = [];

function searchInFile(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const issues = [];

    patterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          pattern: pattern.toString(),
          matches: matches.length,
        });
      }
    });

    return issues;
  } catch (error) {
    // File might not exist or be binary
    return [];
  }
}

function checkClientBundles() {
  console.log("🔍 Checking client bundles for API key exposure...\n");

  const buildDir = path.join(process.cwd(), ".next");

  if (!fs.existsSync(buildDir)) {
    console.log("⚠️  Build directory not found. Run 'npm run build' first.");
    return;
  }

  CLIENT_BUNDLE_PATHS.forEach((bundlePath) => {
    const fullPath = path.join(buildDir, bundlePath);
    if (!fs.existsSync(fullPath)) {
      return;
    }

    function walkDir(dir) {
      const files = fs.readdirSync(dir);

      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith(".js") || file.endsWith(".js.map")) {
          const issues = searchInFile(filePath, API_KEY_PATTERNS);
          if (issues.length > 0) {
            foundIssues.push({
              file: path.relative(process.cwd(), filePath),
              issues,
            });
          }
        }
      });
    }

    walkDir(fullPath);
  });
}

function checkSourceFiles() {
  console.log("🔍 Checking source files for potential client-side API key usage...\n");

  const srcDir = path.join(process.cwd(), "src");
  const clientComponents = [];

  function walkDir(dir) {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !filePath.includes("node_modules")) {
        walkDir(filePath);
      } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        // Check if it's a client component
        const content = fs.readFileSync(filePath, "utf8");
        const isClientComponent = content.includes('"use client"') || content.includes("'use client'");

        if (isClientComponent) {
          // Check for direct API key access
          if (content.includes("process.env.GROQ_API_KEY") || content.includes("process.env.OPENROUTER_API_KEY")) {
            clientComponents.push({
              file: path.relative(process.cwd(), filePath),
              issue: "Client component accessing server-only environment variables",
            });
          }

          // Check for direct imports of groq.ts
          if (content.includes('from "@/lib/groq"') || content.includes('from "../lib/groq"')) {
            clientComponents.push({
              file: path.relative(process.cwd(), filePath),
              issue: "Client component importing server-only groq module",
            });
          }
        }
      }
    });
  }

  walkDir(srcDir);

  if (clientComponents.length > 0) {
    foundIssues.push(...clientComponents.map((c) => ({ file: c.file, issues: [{ pattern: c.issue }] })));
  }
}

function checkEnvFiles() {
  console.log("🔍 Checking environment file configuration...\n");

  const envLocalPath = path.join(process.cwd(), ".env.local");
  const envExamplePath = path.join(process.cwd(), ".env.example");

  // Check if .env.local exists (it should, but shouldn't be committed)
  if (fs.existsSync(envLocalPath)) {
    console.log("✅ .env.local exists (should not be committed to git)");
  } else {
    console.log("⚠️  .env.local not found (create it with your API keys)");
  }

  // Check .gitignore
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, "utf8");
    if (gitignore.includes(".env") || gitignore.includes(".env.local")) {
      console.log("✅ .env files are in .gitignore");
    } else {
      foundIssues.push({
        file: ".gitignore",
        issues: [{ pattern: ".env files not in .gitignore" }],
      });
    }
  }
}

// Main execution
console.log("🔐 API Key Security Verification\n");
console.log("=" .repeat(50) + "\n");

checkEnvFiles();
checkSourceFiles();
checkClientBundles();

console.log("\n" + "=".repeat(50));
console.log("\n📊 Results:\n");

if (foundIssues.length === 0) {
  console.log("✅ SUCCESS: No API key exposure detected!");
  console.log("\n✅ All API keys are properly secured server-side only.");
  process.exit(0);
} else {
  console.log(`❌ FAILED: Found ${foundIssues.length} potential security issue(s):\n`);

  foundIssues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.file}`);
    issue.issues.forEach((i) => {
      console.log(`   - ${i.pattern}`);
    });
    console.log();
  });

  console.log("⚠️  Please review and fix these issues before deploying.");
  process.exit(1);
}

