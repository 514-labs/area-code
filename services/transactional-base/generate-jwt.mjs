#!/usr/bin/env node

/**
 * JWT Generator for Supabase Self-Hosting
 *
 * This script generates:
 * 1. A secure 40-character JWT secret
 * 2. An 'anon' API key with minimal permissions
 * 3. A 'service_role' API key with full permissions
 *
 * Usage: node generate-jwt.js [--quiet] [-o <filename>]
 */

import crypto from "crypto";

// Simple JWT implementation for generating tokens
function base64URLEncode(str) {
  return str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function generateJWT(payload, secret) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = base64URLEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64URLEncode(Buffer.from(JSON.stringify(payload)));

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function generateSecureSecret(length = 40) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

function generateSecurePassword(length = 32) {
  // Exclude characters that can cause issues in Docker Compose or URLs:
  // - $ (environment variable substitution)
  // - ` (command substitution)
  // - ( ) { } (shell interpretation)
  // - & (background processes)
  // - : (URL delimiter)
  // - # (comment character in shell)
  // - @ (URL delimiter - though we include it for email-like complexity)
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@%^*+-=_";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('-o');
  let outputFile = null;
  
  if (outputIndex !== -1) {
    if (outputIndex + 1 >= args.length) {
      console.error("❌ Error: -o option requires a filename");
      process.exit(1);
    }
    outputFile = args[outputIndex + 1];
  }
  
  return {
    quiet: args.includes('--quiet'),
    outputFile
  };
}

async function main() {
  const { quiet, outputFile } = parseArgs();
  
  if (!quiet) {
    console.log("🔐 Generating Supabase JWT Secret and API Keys...\n");
  }

  // Generate JWT secret
  const jwtSecret = generateSecureSecret(40);
  if (!quiet) {
    console.log("✅ Generated JWT Secret");
  }

  // Generate anon key (public, limited permissions)
  const anonPayload = {
    iss: "supabase",
    ref: "localhost",
    role: "anon",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
  };
  const anonKey = generateJWT(anonPayload, jwtSecret);
  if (!quiet) {
    console.log("✅ Generated Anon Key");
  }

  // Generate service role key (private, full permissions)
  const servicePayload = {
    iss: "supabase",
    ref: "localhost",
    role: "service_role",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
  };
  const serviceKey = generateJWT(servicePayload, jwtSecret);
  if (!quiet) {
    console.log("✅ Generated Service Role Key");
  }

  // Generate additional secure values
  const secretKeyBase = generateSecureSecret(64);
  const vaultEncKey = generateSecureSecret(32);
  const postgresPassword = generateSecurePassword(32);
  const dashboardPassword = generateSecurePassword(16);

  // Prepare environment variables content
  const envContent = `# JWT Configuration
JWT_SECRET=${jwtSecret}
ANON_KEY=${anonKey}
SERVICE_ROLE_KEY=${serviceKey}

# Additional Secrets
SECRET_KEY_BASE=${secretKeyBase}
VAULT_ENC_KEY=${vaultEncKey}

# Database
POSTGRES_PASSWORD=${postgresPassword}

# Dashboard
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=${dashboardPassword}

# Pooler
POOLER_TENANT_ID=your-tenant-id
`;

  if (outputFile) {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(outputFile, envContent, 'utf8');
      if (!quiet) {
        console.log(`✅ Environment variables saved to: ${outputFile}`);
      }
    } catch (error) {
      console.error(`❌ Error writing to file ${outputFile}:`, error.message);
      process.exit(1);
    }
  } else {
    if (!quiet) {
      console.log("\n📋 Copy these values to your .env file:\n");
    }
    console.log(envContent);
  }
  
  if (!quiet) {
    console.log("");
    console.log("⚠️  IMPORTANT:");
    console.log(
      "1. Keep these values secure and never commit them to version control"
    );
    console.log("2. Use a secrets manager in production");
    console.log("3. Update SITE_URL and API_EXTERNAL_URL for your domain");
    console.log("4. Configure SMTP settings for email functionality");
    console.log("");
    console.log("🚀 After updating .env, restart your services:");
    console.log("   docker compose down && docker compose up -d");
    console.log("");
    console.log("💡 Usage examples:");
    console.log("   node generate-jwt.mjs                    # Output to console");
    console.log("   node generate-jwt.mjs --quiet            # Quiet mode");
    console.log("   node generate-jwt.mjs -o .env            # Save to .env file");
    console.log("   node generate-jwt.mjs -o .env --quiet    # Save to .env file (quiet)");
  }
}

// Validate Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);

if (majorVersion < 14) {
  console.error("❌ This script requires Node.js 14 or higher");
  console.error(`   Current version: ${nodeVersion}`);
  process.exit(1);
}

// Run the script
main();

export { generateJWT, generateSecureSecret, generateSecurePassword };
