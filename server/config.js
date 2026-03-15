import 'dotenv/config';

export const POLYGON_API_KEY = process.env.POLYGON_API_KEY || ''; // no longer required
export const GEMINI_API_KEY  = process.env.GEMINI_API_KEY  || '';

if (!process.env.SCHWAB_CLIENT_ID)     console.warn('⚠️  SCHWAB_CLIENT_ID not set — run node schwab-auth.js to authenticate');
if (!process.env.SCHWAB_ACCESS_TOKEN)  console.warn('⚠️  SCHWAB_ACCESS_TOKEN not set — run node schwab-auth.js to authenticate');
if (!GEMINI_API_KEY)                   console.warn('⚠️  GEMINI_API_KEY not set  — pre-market report, earnings preview, and AI features will be unavailable');
