#!/usr/bin/env node
/**
 * Schwab OAuth 2.0 one-time auth script.
 * Run: node schwab-auth.js
 * Then follow the prompts to get your access + refresh tokens.
 */
import 'dotenv/config';
import https from 'https';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLIENT_ID     = process.env.SCHWAB_CLIENT_ID;
const CLIENT_SECRET = process.env.SCHWAB_CLIENT_SECRET;
const REDIRECT_URI  = process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  SCHWAB_CLIENT_ID and SCHWAB_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

function exchangeCode(code) {
  return new Promise((resolve, reject) => {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const body = new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }).toString();

    const options = {
      hostname: 'api.schwabapi.com',
      path:     '/v1/oauth/token',
      method:   'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Bad response: ${data}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const authUrl =
    `https://api.schwabapi.com/v1/oauth/authorize` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code`;

  console.log('\n── Schwab OAuth Setup ──────────────────────────────────');
  console.log('\n1. Open this URL in your browser:\n');
  console.log(`   ${authUrl}\n`);
  console.log('2. Log in and approve access.');
  console.log('3. You\'ll be redirected to https://127.0.0.1?code=...  (may show a browser error — that\'s fine)');
  console.log('4. Copy the FULL redirect URL and paste it below.\n');

  const redirected = await ask('Paste the redirect URL here: ');
  rl.close();

  let code;
  try {
    const url = new URL(redirected.trim());
    code = url.searchParams.get('code');
    if (!code) throw new Error('no code param');
  } catch {
    console.error('❌  Could not parse code from URL. Make sure you pasted the full redirect URL.');
    process.exit(1);
  }

  console.log('\nExchanging code for tokens...');
  const tokens = await exchangeCode(code);

  if (tokens.error) {
    console.error('❌  Token exchange failed:', tokens.error, tokens.error_description);
    process.exit(1);
  }

  const expiresAt = Date.now() + (tokens.expires_in || 1800) * 1000;

  // Append to .env
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  const replace = (key, val) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${val}`);
    } else {
      envContent += `\n${key}=${val}`;
    }
  };

  replace('SCHWAB_ACCESS_TOKEN',  tokens.access_token);
  replace('SCHWAB_REFRESH_TOKEN', tokens.refresh_token);
  replace('SCHWAB_TOKEN_EXPIRES_AT', String(expiresAt));

  fs.writeFileSync(envPath, envContent);

  console.log('\n✅  Tokens saved to .env');
  console.log(`   Access token expires in ${tokens.expires_in}s (~30 min) — auto-refreshed by the server`);
  console.log(`   Refresh token expires in ${tokens.refresh_token_expires_in ?? '7 days'}`);
  console.log('\nYou\'re ready. Start the server and the Schwab integration will activate.\n');
}

main().catch(err => { console.error('❌ ', err.message); process.exit(1); });
