import 'dotenv/config';

export const POLYGON_API_KEY = process.env.POLYGON_API_KEY || ''; // no longer required

if (!process.env.SCHWAB_CLIENT_ID)    console.warn('⚠️  SCHWAB_CLIENT_ID not set — run node schwab-auth.js to authenticate');
if (!process.env.SCHWAB_ACCESS_TOKEN) console.warn('⚠️  SCHWAB_ACCESS_TOKEN not set — run node schwab-auth.js to authenticate');
